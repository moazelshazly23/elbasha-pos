/**
 * Automated Database Backup Service
 * 
 * Runs a background schedule to generate full database JSON dumps and store
 * them locally inside a resilient IndexedDB local store, ensuring continuous
 * data redundancy and fast local recovery without reliance on internet connection.
 */

import { posDb } from './db';
import { windowsBridge } from './windowsBridge';

export interface BackupSnapshotMeta {
  id: string;
  timestamp: string;
  filename: string;
  sizeBytes: number;
  trigger: 'scheduled' | 'manual' | 'startup' | 'shift_close';
  restaurantName: string;
  ordersCount: number;
  productsCount: number;
  customersCount: number;
  status: 'success' | 'failed';
  error?: string;
}

export interface BackupSnapshotRecord extends BackupSnapshotMeta {
  dataJson: string;
}

export interface AutomatedBackupConfig {
  enabled: boolean;
  intervalHours: number; // e.g. 1, 3, 6, 12, 24
  maxSnapshotsToKeep: number;
  lastRunTimestamp: string | null;
  lastStatus: 'success' | 'failed' | 'idle';
  lastError: string | null;
}

const CONFIG_STORAGE_KEY = 'basha_pos_autobackup_config_v1';
const INDEXED_DB_NAME = 'AlbashaPOS_LocalRedundancy_DB';
const DB_VERSION = 1;
const STORE_NAME = 'database_snapshots';

class AutomatedBackupService {
  private config: AutomatedBackupConfig;
  private intervalTimerId: any = null;
  private subscribers: Set<() => void> = new Set();
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isRunningBackup: boolean = false;

  constructor() {
    this.config = this.loadConfig();
    this.initIndexedDb();
    this.startScheduler();
  }

  private loadConfig(): AutomatedBackupConfig {
    const defaults: AutomatedBackupConfig = {
      enabled: true,
      intervalHours: 6,
      maxSnapshotsToKeep: 15,
      lastRunTimestamp: null,
      lastStatus: 'idle',
      lastError: null,
    };

    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load autobackup config:', e);
    }
    return defaults;
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save autobackup config:', e);
    }
    this.notify();
  }

  private initIndexedDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(INDEXED_DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB open error for automated backups:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error notifying backup subscriber:', err);
      }
    });
  }

  public getConfig(): AutomatedBackupConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<AutomatedBackupConfig>): void {
    this.config = { ...this.config, ...partial };
    this.saveConfig();
    this.restartScheduler();
  }

  /**
   * Starts the background interval check.
   * Checks every 60 seconds if a backup is due.
   */
  public startScheduler(): void {
    if (this.intervalTimerId) {
      clearInterval(this.intervalTimerId);
    }

    // Check after 5 seconds on startup
    setTimeout(() => {
      this.checkAndRunBackup('startup');
    }, 5000);

    // Periodic check every 60 seconds
    this.intervalTimerId = setInterval(() => {
      this.checkAndRunBackup('scheduled');
    }, 60 * 1000);
  }

  public restartScheduler(): void {
    if (this.intervalTimerId) {
      clearInterval(this.intervalTimerId);
      this.intervalTimerId = null;
    }
    if (this.config.enabled) {
      this.startScheduler();
    }
  }

  public stopScheduler(): void {
    if (this.intervalTimerId) {
      clearInterval(this.intervalTimerId);
      this.intervalTimerId = null;
    }
  }

  /**
   * Checks if backup is due and runs it if required.
   */
  private async checkAndRunBackup(trigger: 'scheduled' | 'startup'): Promise<void> {
    if (!this.config.enabled) return;
    if (this.isRunningBackup) return;

    const lastTime = this.config.lastRunTimestamp
      ? new Date(this.config.lastRunTimestamp).getTime()
      : 0;

    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    const now = Date.now();

    // If never run, or elapsed interval has passed
    if (now - lastTime >= intervalMs) {
      await this.triggerBackupNow(trigger);
    }
  }

  /**
   * Generates a full database backup and saves it to local IndexedDB store.
   */
  public async triggerBackupNow(
    trigger: 'scheduled' | 'manual' | 'startup' | 'shift_close' = 'manual'
  ): Promise<{ success: boolean; snapshot?: BackupSnapshotMeta; error?: string }> {
    if (this.isRunningBackup) {
      return { success: false, error: 'عملية نسخ أخرى جارية بالفعل' };
    }

    this.isRunningBackup = true;
    this.notify();

    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
      
      const profile = posDb.getProfile();
      const restaurantName = profile?.name || 'مشويات الباشا';
      const cleanName = restaurantName.replace(/\s+/g, '_');
      const filename = `${cleanName}_AutoBackup_${timeStr}.json`;

      // 1. Export database snapshot
      const jsonStr = posDb.exportFullBackup();
      const sizeBytes = new Blob([jsonStr]).size;

      const orders = posDb.getOrders();
      const products = posDb.getProducts();
      const customers = posDb.getCustomers();

      const snapshotId = `autobak-${Date.now()}`;
      const record: BackupSnapshotRecord = {
        id: snapshotId,
        timestamp: now.toISOString(),
        filename,
        sizeBytes,
        trigger,
        restaurantName,
        ordersCount: orders.length,
        productsCount: products.length,
        customersCount: customers.length,
        status: 'success',
        dataJson: jsonStr,
      };

      // 2. Save into IndexedDB
      await this.storeSnapshotInIndexedDb(record);

      // 3. Update service config
      this.config.lastRunTimestamp = now.toISOString();
      this.config.lastStatus = 'success';
      this.config.lastError = null;
      this.saveConfig();

      // 4. Update posDb last backup timestamp & log in audit
      posDb.recordBackupSuccess('automated', filename);
      posDb.logAudit({
        userId: 'system',
        userName: 'النظام الآلي (Background Scheduler)',
        action: 'نسخ احتياطي محلي تلقائي مجدول',
        category: 'settings',
        details: `تم إنشاء وتخزين نسخة احتياطية محلية تلقائياً: ${filename} (حجم: ${(sizeBytes / 1024).toFixed(1)} KB - تكرار: ${trigger})`,
      });

      windowsBridge.log(
        'info',
        'DB',
        `تم حفظ نسخة احتياطية محلية في مستودع التكرار (Redundancy Store): ${filename}`
      );

      // 5. Clean up old snapshots exceeding max count
      await this.enforceRetentionLimit();

      this.isRunningBackup = false;
      this.notify();

      const { dataJson, ...meta } = record;
      return { success: true, snapshot: meta };
    } catch (err: any) {
      console.error('Automated backup failed:', err);
      this.config.lastStatus = 'failed';
      this.config.lastError = err?.message || 'خطأ أثناء النسخ الاحتياطي التلقائي';
      this.saveConfig();

      this.isRunningBackup = false;
      this.notify();
      return { success: false, error: this.config.lastError || undefined };
    }
  }

  private async storeSnapshotInIndexedDb(record: BackupSnapshotRecord): Promise<void> {
    const db = await this.initIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves metadata of all stored local snapshots sorted newest first.
   */
  public async listSnapshots(): Promise<BackupSnapshotMeta[]> {
    try {
      const db = await this.initIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const results = (req.result || []) as BackupSnapshotRecord[];
          // Strip out the large dataJson to keep memory clean
          const metas: BackupSnapshotMeta[] = results.map(({ dataJson, ...meta }) => meta);
          metas.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(metas);
        };

        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to list snapshots from IndexedDB:', e);
      return [];
    }
  }

  /**
   * Retrieves the full JSON dump string for a specific snapshot.
   */
  public async getSnapshotJson(id: string): Promise<string | null> {
    try {
      const db = await this.initIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          const result = req.result as BackupSnapshotRecord | undefined;
          resolve(result ? result.dataJson : null);
        };

        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to retrieve snapshot JSON:', e);
      return null;
    }
  }

  /**
   * Deletes a specific snapshot from local store.
   */
  public async deleteSnapshot(id: string): Promise<boolean> {
    try {
      const db = await this.initIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => {
          this.notify();
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to delete snapshot:', e);
      return false;
    }
  }

  /**
   * Downloads a stored snapshot as a .json file to the user's computer.
   */
  public async downloadSnapshot(id: string): Promise<boolean> {
    const jsonStr = await this.getSnapshotJson(id);
    if (!jsonStr) return false;

    const snapshots = await this.listSnapshots();
    const meta = snapshots.find((s) => s.id === id);
    const filename = meta?.filename || `albasha_autobackup_${id}.json`;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  /**
   * Retains only the most recent N snapshots according to configuration.
   */
  private async enforceRetentionLimit(): Promise<void> {
    try {
      const snapshots = await this.listSnapshots();
      const limit = Math.max(5, this.config.maxSnapshotsToKeep || 15);

      if (snapshots.length > limit) {
        const toDelete = snapshots.slice(limit);
        const db = await this.initIndexedDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const item of toDelete) {
          store.delete(item.id);
        }
      }
    } catch (e) {
      console.warn('Retention limit enforcement warning:', e);
    }
  }

  public getIsRunning(): boolean {
    return this.isRunningBackup;
  }

  public getNextScheduledTime(): Date | null {
    if (!this.config.enabled) return null;
    const last = this.config.lastRunTimestamp ? new Date(this.config.lastRunTimestamp) : new Date();
    return new Date(last.getTime() + this.config.intervalHours * 60 * 60 * 1000);
  }
}

export const automatedBackupService = new AutomatedBackupService();
