import React, { createContext, useContext, useEffect, useState } from 'react';
import { Shift } from '../types';
import { posDb } from '../services/db';
import { useAuth } from './AuthContext';

interface ShiftContextType {
  activeShift: Shift | null;
  openShift: (startingCash: number, notes?: string) => Shift;
  closeShift: (actualCash: number, notes?: string) => Shift | null;
  isShiftModalOpen: boolean;
  setIsShiftModalOpen: (open: boolean) => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentBranch } = useAuth();
  const [activeShift, setActiveShift] = useState<Shift | null>(() => posDb.getActiveShift());
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setActiveShift(posDb.getActiveShift());
    });
    return unsubscribe;
  }, []);

  const openShift = (startingCash: number, notes = ''): Shift => {
    const shift = posDb.openShift({
      userId: currentUser?.id || 'cashier',
      userName: currentUser?.name || 'كاشير الوردية',
      branchId: currentBranch?.id || 'branch-1',
      startTime: new Date().toISOString(),
      startingCash,
      notes,
    });
    setActiveShift(shift);
    return shift;
  };

  const closeShift = (actualCash: number, notes?: string): Shift | null => {
    const closed = posDb.closeShift(actualCash, notes);
    setActiveShift(closed);
    // Asynchronously create a redundant backup snapshot upon closing the shift
    import('../services/automatedBackupService').then(({ automatedBackupService }) => {
      automatedBackupService.triggerBackupNow('shift_close').catch(() => {});
    });
    return closed;
  };

  return (
    <ShiftContext.Provider
      value={{
        activeShift,
        openShift,
        closeShift,
        isShiftModalOpen,
        setIsShiftModalOpen,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = (): ShiftContextType => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within ShiftProvider');
  }
  return context;
};
