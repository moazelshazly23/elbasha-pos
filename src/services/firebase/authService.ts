import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './config';

export interface AppAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'manager' | 'cashier';
}

export class FirebaseAuthService {
  private static instance: FirebaseAuthService;
  private currentUser: AppAuthUser | null = null;
  private listeners: Array<(user: AppAuthUser | null) => void> = [];

  private constructor() {
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const appUser = await this.syncUserProfile(fbUser);
        this.currentUser = appUser;
      } else {
        this.currentUser = null;
      }
      this.notifyListeners();
    });
  }

  public static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  public async signInWithGoogle(): Promise<{ success: boolean; user?: AppAuthUser; error?: string }> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const appUser = await this.syncUserProfile(result.user);
      this.currentUser = appUser;
      this.notifyListeners();
      return { success: true, user: appUser };
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      return {
        success: false,
        error: error?.message || 'تعذر تسجيل الدخول بواسطة Google',
      };
    }
  }

  public async signOut(): Promise<void> {
    try {
      await fbSignOut(auth);
      this.currentUser = null;
      this.notifyListeners();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  public getCurrentUser(): AppAuthUser | null {
    return this.currentUser;
  }

  public subscribe(callback: (user: AppAuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  private async syncUserProfile(fbUser: FirebaseUser): Promise<AppAuthUser> {
    const userRef = doc(db, 'users', fbUser.uid);
    let role: 'admin' | 'manager' | 'cashier' = 'admin';

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.role) role = data.role;
      }

      const userData: Record<string, any> = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || 'مستخدم الباشا',
        photoURL: fbUser.photoURL || null,
        role,
        lastLoginAt: new Date().toISOString(),
      };

      if (!snap.exists()) {
        userData.createdAt = new Date().toISOString();
      }

      await setDoc(userRef, userData, { merge: true });
    } catch (e) {
      console.warn('Could not sync user profile to Firestore:', e);
    }

    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || 'مستخدم Google',
      photoURL: fbUser.photoURL,
      role,
    };
  }
}

export const firebaseAuthService = FirebaseAuthService.getInstance();
