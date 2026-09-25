/**
 * Preload Script for Mosawyat Al Basha Desktop Application
 * Exposes a secure, sandboxed `electronAPI` bridge to the React renderer process.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { PrintOptions, SQLitePathPayload, SQLiteSnapshotPayload } from './types.js';

const electronAPI = {
  // Printing Services
  printDirect: (payload: PrintOptions | { html: string; printerName?: string; paperWidth?: '80mm' | '58mm' | 'a4' }) =>
    ipcRenderer.invoke('print-direct', payload),
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  // System & Path Management
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // SQLite Persistence Bridge
  sqliteEnsurePath: (payload: SQLitePathPayload) => ipcRenderer.invoke('sqlite-ensure-path', payload),
  sqliteWriteSnapshot: (payload: SQLiteSnapshotPayload) => ipcRenderer.invoke('sqlite-write-snapshot', payload),
  saveAppData: (payload: { key: string; data: string }) => ipcRenderer.invoke('save-app-data', payload),

  // Backup & Restore
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: (payload: { backupContent: string }) => ipcRenderer.invoke('restore-database', payload),

  // Window Controls for POS Hardware Terminals
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  toggleKiosk: () => ipcRenderer.invoke('toggle-kiosk'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
