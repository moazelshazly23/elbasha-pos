import React from 'react';
import { WifiOff, Database, ShieldCheck } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="تنبيه وضع أوفلاين"
      className="bg-amber-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-40 transition-all duration-300"
      dir="rtl"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-200"></span>
        </span>
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>وضع العمل دون إنترنت (Offline Mode نشط) — جميع الفواتير والمبيعات تحفظ فوراً في قاعدة بيانات SQLite المحلية</span>
      </div>

      <div className="hidden sm:flex items-center gap-2 bg-amber-700/60 px-2.5 py-0.5 rounded-lg text-[11px]">
        <Database className="w-3.5 h-3.5 text-amber-200" />
        <span>SQLite WAL: متاح محلياً %LOCALAPPDATA%</span>
        <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />
      </div>
    </aside>
  );
};
