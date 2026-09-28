import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './config';

export interface CloudChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  modelUsed: string;
  timestamp: string;
}

export class FirestoreSyncService {
  private static instance: FirestoreSyncService;

  public static getInstance(): FirestoreSyncService {
    if (!FirestoreSyncService.instance) {
      FirestoreSyncService.instance = new FirestoreSyncService();
    }
    return FirestoreSyncService.instance;
  }

  /**
   * Save a snapshot of the POS data into Firestore cloud
   */
  public async backupToCloud(
    userId: string,
    data: Record<string, any> | string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payloadJson = typeof data === 'string' ? data : JSON.stringify(data);
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const syncRef = doc(db, 'users', userId, 'cloud_sync', 'latest_backup');
      await setDoc(syncRef, {
        userId,
        updatedAt: new Date().toISOString(),
        ordersCount: Array.isArray(parsed?.orders) ? parsed.orders.length : 0,
        payloadJson,
      });
      return { success: true };
    } catch (e: any) {
      console.error('Cloud backup to Firestore error:', e);
      return { success: false, error: e?.message || 'فشل الحفظ السحابي' };
    }
  }

  /**
   * Load the latest POS snapshot from Firestore cloud
   */
  public async loadFromCloud(
    userId: string
  ): Promise<{ success: boolean; data?: Record<string, any>; error?: string }> {
    try {
      const syncRef = doc(db, 'users', userId, 'cloud_sync', 'latest_backup');
      const snap = await getDoc(syncRef);
      if (snap.exists() && snap.data().payloadJson) {
        const parsed = JSON.parse(snap.data().payloadJson);
        return { success: true, data: parsed };
      }
      return { success: false, error: 'لا توجد بيانات سحابية محفوظة مسبقاً' };
    } catch (e: any) {
      console.error('Cloud load from Firestore error:', e);
      return { success: false, error: e?.message || 'فشل استرجاع البيانات السحابية' };
    }
  }

  /**
   * Save a chat message to Firestore under user subcollection
   */
  public async saveChatMessage(
    userId: string,
    message: Omit<CloudChatMessage, 'userId'>
  ): Promise<void> {
    try {
      const msgRef = doc(db, 'users', userId, 'chat_history', message.id);
      await setDoc(msgRef, {
        ...message,
        userId,
      });
    } catch (e) {
      console.warn('Failed to save chat message in Firestore:', e);
    }
  }

  /**
   * Load recent chat messages from Firestore
   */
  public async loadChatHistory(userId: string): Promise<CloudChatMessage[]> {
    try {
      const chatCol = collection(db, 'users', userId, 'chat_history');
      const q = query(chatCol, orderBy('timestamp', 'asc'), limit(50));
      const snaps = await getDocs(q);
      const messages: CloudChatMessage[] = [];
      snaps.forEach((docSnap) => {
        messages.push(docSnap.data() as CloudChatMessage);
      });
      return messages;
    } catch (e) {
      console.warn('Failed to load chat history from Firestore:', e);
      return [];
    }
  }
}

export const firestoreSyncService = FirestoreSyncService.getInstance();
