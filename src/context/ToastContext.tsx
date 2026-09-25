import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((text: string, type: ToastType = 'success', duration = 3200) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { id, text, type, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Toast Notification Container */}
      <aside aria-label="Notifications" className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none" dir="rtl">
        {toasts.map((toast) => {
          let bgClass = 'bg-[#153423] text-emerald-100 border-emerald-500/50 shadow-emerald-950/20';
          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;

          if (toast.type === 'warning') {
            bgClass = 'bg-[#431B05] text-amber-100 border-amber-500/50 shadow-amber-950/20';
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
          } else if (toast.type === 'error') {
            bgClass = 'bg-[#450A0A] text-red-100 border-red-500/50 shadow-red-950/20';
            icon = <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
          } else if (toast.type === 'info') {
            bgClass = 'bg-[#1E293B] text-slate-100 border-slate-600 shadow-slate-950/20';
            icon = <Info className="w-4 h-4 text-cyan-400 shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xl text-xs font-bold pointer-events-auto transition-all animate-in slide-in-from-bottom-3 fade-in duration-200 ${bgClass}`}
            >
              <div className="flex items-center gap-2.5">
                {icon}
                <span className="tracking-wide">{toast.text}</span>
              </div>
              <button
                onClick={() => hideToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
                title="إغلاق"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
