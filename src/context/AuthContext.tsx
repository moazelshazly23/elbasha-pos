import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Branch } from '../types';
import { posDb } from '../services/db';
import { initialBranches } from '../services/seedData';

const AUTH_STORAGE_KEYS = {
  SESSION: 'basha_pos_auth_session',
  CURRENT_USER: 'basha_pos_current_user',
  LOGGED_OUT: 'basha_pos_logged_out',
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
};

export interface UpdateProfilePayload {
  name: string;
  username: string;
  phone?: string;
  email?: string;
  avatar?: string;
  pin?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  currentBranch: Branch;
  allBranches: Branch[];
  setCurrentBranch: (branch: Branch) => void;
  switchUser: (user: User) => void;
  login: (credential: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
  lockTerminal: () => void;
  hasPermission: (permission: string) => boolean;
  updateUserPassword: (userId: string, newPass: string) => boolean;
  updateCurrentUserProfile: (payload: UpdateProfilePayload) => { success: boolean; message: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => posDb.getUsers());
  const [branches, setBranches] = useState<Branch[]>(() => {
    const list = posDb.getBranches();
    return list.length > 0 ? list : initialBranches;
  });

  const [currentBranch, setCurrentBranch] = useState<Branch>(() => {
    const bList = posDb.getBranches();
    const fallback = bList.length > 0 ? bList : initialBranches;
    return fallback.find((b) => b.isMain) || fallback[0];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const isLoggedOut = localStorage.getItem(AUTH_STORAGE_KEYS.LOGGED_OUT) === 'true';
      if (isLoggedOut) {
        return null;
      }

      const savedSession = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.userId) {
          const list = posDb.getUsers();
          const match = list.find((u) => u.id === parsed.userId && u.active);
          if (match) return match;
        }
      }

      // Default initial session: default active admin if not explicitly logged out
      const list = posDb.getUsers();
      return list.find((u) => u.role === 'admin') || list[0] || null;
    } catch (e) {
      console.warn('AuthContext initial user restore:', e);
      const list = posDb.getUsers();
      return list.find((u) => u.role === 'admin') || list[0] || null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const isLoggedOut = localStorage.getItem(AUTH_STORAGE_KEYS.LOGGED_OUT) === 'true';
      if (isLoggedOut) {
        return false;
      }
      return currentUser !== null;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      const updatedUsers = posDb.getUsers();
      setUsers(updatedUsers);

      const updatedBranches = posDb.getBranches();
      const validBranches = updatedBranches.length > 0 ? updatedBranches : initialBranches;
      setBranches(validBranches);

      // Ensure currentBranch is still valid
      setCurrentBranch((prev) => {
        if (!prev) return validBranches[0];
        const stillExists = validBranches.find((b) => b.id === prev.id);
        return stillExists || validBranches.find((b) => b.isMain) || validBranches[0];
      });

      // Ensure currentUser is synced if logged in
      if (currentUser?.id) {
        const freshUser = updatedUsers.find((u) => u.id === currentUser.id);
        if (freshUser) {
          if (!freshUser.active) {
            // User deactivated while logged in
            logout();
          } else {
            setCurrentUser(freshUser);
          }
        }
      }
    });
    return unsubscribe;
  }, [currentUser?.id]);

  const switchUser = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.LOGGED_OUT);
      const sessionData = JSON.stringify({
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        switchedAt: new Date().toISOString(),
      });
      localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, sessionData);
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, sessionData);
    } catch (e) {
      console.warn('Session switch write warning:', e);
    }

    try {
      posDb.logAudit({
        userId: user.id,
        userName: user.name,
        action: 'تبديل المستخدم النشط',
        category: 'auth',
        details: `تم التبديل إلى المستخدم: ${user.name} (${user.role})`,
      });
    } catch (e) {
      console.warn('Audit log warning:', e);
    }
  };

  const login = (credential: string, password?: string) => {
    let found: User | undefined;

    if (password !== undefined && password.trim() !== '') {
      // Username and Password flow
      found = users.find(
        (u) =>
          u.active &&
          u.username.toLowerCase() === credential.trim().toLowerCase() &&
          (u.password === password || u.pin === password)
      );
    } else {
      // Quick PIN or single credential flow
      found = users.find(
        (u) =>
          u.active &&
          (u.pin === credential ||
            u.username.toLowerCase() === credential.toLowerCase() ||
            u.password === credential)
      );
    }

    if (found) {
      setCurrentUser(found);
      setIsAuthenticated(true);

      // Persist user session safely
      try {
        localStorage.removeItem(AUTH_STORAGE_KEYS.LOGGED_OUT);
        const sessionData = JSON.stringify({
          userId: found.id,
          username: found.username,
          name: found.name,
          role: found.role,
          loggedInAt: new Date().toISOString(),
        });
        localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, sessionData);
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, sessionData);
      } catch (e) {
        console.warn('Session write warning:', e);
      }

      try {
        posDb.logAudit({
          userId: found.id,
          userName: found.name,
          action: 'تسجيل دخول ناجح',
          category: 'auth',
          details: `تسجيل الدخول للمستخدم ${found.name} (${found.role})`,
        });
      } catch (e) {
        console.warn('Audit log on login warning:', e);
      }

      return { success: true };
    }
    return { success: false, message: 'اسم المستخدم أو كلمة المرور أو رمز PIN غير صحيح' };
  };

  const logout = () => {
    // 1. Audit log before state removal
    if (currentUser) {
      try {
        posDb.logAudit({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'تسجيل خروج',
          category: 'auth',
          details: `تسجيل خروج المستخدم ${currentUser.name} (${currentUser.role})`,
        });
      } catch (e) {
        console.warn('Audit log on logout warning:', e);
      }
    }

    // 2. Clear Session & Auth specific keys only (Do NOT touch business or system data)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION);
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
      localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.setItem(AUTH_STORAGE_KEYS.LOGGED_OUT, 'true');

      sessionStorage.removeItem('basha_pos_auth_session');
      sessionStorage.removeItem('current_user');
      sessionStorage.removeItem('auth_token');
    } catch (e) {
      console.warn('Storage cleanup on logout warning:', e);
    }

    // 3. Reset React Auth State to unauthenticated & null user
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const lockTerminal = () => {
    if (currentUser) {
      try {
        posDb.logAudit({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'قفل نقطة البيع',
          category: 'auth',
          details: `تم قفل الشاشة بواسطة ${currentUser.name}`,
        });
      } catch (e) {
        console.warn('Audit log on lockTerminal warning:', e);
      }
    }
    setIsAuthenticated(false);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.permissions?.includes('all')) return true;
    if (currentUser.permissions?.includes(permission)) return true;
    return false;
  };

  const updateUserPassword = (userId: string, newPass: string): boolean => {
    const target = users.find((u) => u.id === userId);
    if (!target) return false;
    target.password = newPass;
    target.pin = newPass.length <= 4 && /^\d+$/.test(newPass) ? newPass : target.pin;
    posDb.saveUser(target, currentUser?.id || 'admin', currentUser?.name || 'المدير العام');
    return true;
  };

  const updateCurrentUserProfile = (payload: UpdateProfilePayload): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'عفواً، لا يوجد مستخدم مسجل الدخول حالياً' };
    }

    const trimmedName = payload.name.trim();
    const trimmedUsername = payload.username.trim();

    if (!trimmedName) {
      return { success: false, message: 'يرجى إدخال اسم المستخدم الكامل' };
    }
    if (!trimmedUsername) {
      return { success: false, message: 'يرجى إدخال اسم المستخدم للدخول (Username)' };
    }

    // Check if another user already has this username
    const existingUsers = posDb.getUsers();
    const isUsernameTaken = existingUsers.some(
      (u) => u.id !== currentUser.id && u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (isUsernameTaken) {
      return { success: false, message: 'اسم المستخدم هذا مستخدم بالفعل من قبل موظف آخر، يرجى اختيار اسم مختلف' };
    }

    // Check PIN validation if provided
    let cleanPin: string | undefined = currentUser.pin;
    if (payload.pin !== undefined && payload.pin !== '') {
      const pinStr = payload.pin.trim();
      if (!/^\d{4,6}$/.test(pinStr)) {
        return { success: false, message: 'رمز الدخول السريع (PIN) يجب أن يتكون من 4 إلى 6 أرقام فقط' };
      }
      const isPinTaken = existingUsers.some((u) => u.id !== currentUser.id && u.pin === pinStr);
      if (isPinTaken) {
        return { success: false, message: 'رمز الدخول السريع (PIN) هذا مستخدم بالفعل من قبل موظف آخر، يرجى اختيار رمز آخر' };
      }
      cleanPin = pinStr;
    }

    // Password change verification if new password requested
    let cleanPassword = currentUser.password;
    if (payload.newPassword && payload.newPassword.trim() !== '') {
      const newPass = payload.newPassword.trim();
      if (newPass.length < 4) {
        return { success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 4 خانات' };
      }

      // Check current password if one is already set
      if (currentUser.password) {
        if (!payload.currentPassword) {
          return { success: false, message: 'يرجى إدخال كلمة المرور الحالية لتأكيد التغيير' };
        }
        if (payload.currentPassword !== currentUser.password) {
          return { success: false, message: 'كلمة المرور الحالية غير صحيحة، يرجى التأكد وإعادة المحاولة' };
        }
      }
      cleanPassword = newPass;
    }

    const updatedUser: User = {
      ...currentUser,
      name: trimmedName,
      username: trimmedUsername,
      phone: payload.phone ? payload.phone.trim() : undefined,
      email: payload.email ? payload.email.trim() : undefined,
      avatar: payload.avatar || currentUser.avatar,
      pin: cleanPin,
      password: cleanPassword,
    };

    // Save to database
    posDb.saveUser(updatedUser, currentUser.id, currentUser.name);

    // Update context state immediately
    setCurrentUser(updatedUser);

    // Update active session in localStorage safely
    try {
      const sessionData = JSON.stringify({
        userId: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        updatedAt: new Date().toISOString(),
      });
      localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, sessionData);
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, sessionData);
    } catch (e) {
      console.warn('Session profile update warning:', e);
    }

    try {
      posDb.logAudit({
        userId: currentUser.id,
        userName: updatedUser.name,
        action: 'تحديث الملف الشخصي والأمان',
        category: 'auth',
        details: `تم تعديل البيانات الشخصية${payload.newPassword ? ' وتغيير كلمة المرور' : ''}${payload.pin ? ' وتحديث رمز PIN' : ''} للمستخدم ${updatedUser.name}`,
      });
    } catch (e) {
      console.warn('Audit log profile update warning:', e);
    }

    return { success: true, message: 'تم حفظ وتحديث بيانات حسابك بنجاح!' };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        currentBranch,
        allBranches: branches,
        setCurrentBranch,
        switchUser,
        login,
        logout,
        lockTerminal,
        hasPermission,
        updateUserPassword,
        updateCurrentUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
