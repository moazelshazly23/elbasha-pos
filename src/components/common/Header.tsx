import React, { useState, useEffect } from 'react';
import {
  Store,
  Clock,
  Bell,
  User as UserIcon,
  ChevronDown,
  Wifi,
  WifiOff,
  AlertTriangle,
  LogOut,
  Maximize2,
  Lock,
  Layers,
  RefreshCw,
  UserCheck,
  Database,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { posDb } from '../../services/db';
import { syncQueue } from '../../services/syncQueue';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { ConfirmModal } from './ConfirmModal';
import { UserProfileModal } from './UserProfileModal';
import { User, Ingredient } from '../../types';

interface HeaderProps {
  onOpenShiftModal?: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenShiftModal, onNavigateToTab }) => {
  const { profile } = useBrand();
  const { currentUser, currentBranch, allBranches, setCurrentBranch, switchUser, logout, lockTerminal } = useAuth();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => syncQueue.getPendingCount());
  const [isBackupOverdue, setIsBackupOverdue] = useState<boolean>(() => posDb.isBackupOverdue(24));
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => posDb.getLastBackupTimestamp());
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });

  // Track sync queue updates
  useEffect(() => {
    const unsub = syncQueue.subscribe(() => {
      setPendingSyncCount(syncQueue.getPendingCount());
    });
    return unsub;
  }, []);

  // Track network connectivity via navigator.onLine
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const allUsers = posDb.getUsers();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkStatus = () => {
      const ings = posDb.getIngredients();
      const low = ings.filter((i) => i.currentStock <= i.minStock);
      setLowStockItems(low);
      setIsBackupOverdue(posDb.isBackupOverdue(24));
      setLastBackupTime(posDb.getLastBackupTimestamp());
    };
    checkStatus();
    return posDb.subscribe(checkStatus);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E8DFD5] px-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Right side (RTL Start): Brand Logo & Branch Info */}
      <div className="flex items-center gap-3">
        <BrandLogo
          variant="compact"
          size="sm"
          customName={profile.name}
          customLogoUrl={profile.useOfficialLogo ? undefined : profile.logoUrl}
        />

        <div className="h-6 w-px bg-[#E8DFD5] mx-1 hidden sm:block" />

        {/* Branch Selector */}
        <div className="relative">
          <button
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F5EFE6] text-[#3E2723] hover:bg-[#EAE0D2] transition-colors border border-[#D7C3A5]/50"
            title="تغيير الفرع"
          >
            <Store className="w-3.5 h-3.5 text-[#8B1E1E]" />
            <span className="max-w-[130px] truncate">{currentBranch.name}</span>
            <ChevronDown className="w-3 h-3 text-[#6F4E37]" />
          </button>

          {isBranchDropdownOpen && (
            <div className="absolute top-full mt-1.5 right-0 w-56 bg-white rounded-xl shadow-lg border border-[#E8DFD5] py-1 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-[#8B1E1E] border-b border-[#F0E6D8]">
                الفروع المتاحة
              </div>
              {allBranches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setCurrentBranch(b);
                    setIsBranchDropdownOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F8F5F0] transition-colors ${
                    b.id === currentBranch.id ? 'font-bold text-[#8B1E1E] bg-[#FFF8EF]' : 'text-[#3E2723]'
                  }`}
                >
                  <span>{b.name}</span>
                  {b.isMain && (
                    <span className="text-[10px] text-[#B8860B] font-bold">الرئيسي</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System Online / Offline Network Status Indicator */}
        <div
          title={
            isOnline
              ? 'التطبيق متصل بالخادم والشبكة وجاهز للمزامنة اللحظية'
              : 'التطبيق يعمل في وضع عدم الاتصال (Offline mode) - يتم حفظ كافة الفواتير والعمليات محلياً بأمان'
          }
          className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
            isOnline
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
              : 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse shadow-xs'
          }`}
        >
          {isOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">متصل بالخادم</span>
              <span className="sm:hidden">متصل</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
              </span>
              <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="hidden sm:inline">وضع عدم الاتصال (Offline mode)</span>
              <span className="sm:hidden">أوفلاين</span>
            </>
          )}
        </div>

        {/* Sync queue indicator */}
        {pendingSyncCount > 0 && (
          <button
            onClick={() => syncQueue.syncNow()}
            className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs active:scale-95"
            title="انقر لمزامنة العمليات المحفوظة محلياً أثناء انقطاع الشبكة"
          >
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span className="hidden sm:inline">بانتظار المزامنة:</span>
            <span>{pendingSyncCount}</span>
          </button>
        )}
      </div>

      {/* Center: Clock & Date */}
      <div className="hidden md:flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#231610] tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
          <span>{currentTime}</span>
        </div>
        <span className="text-[10px] text-[#7A6455]">{currentDate}</span>
      </div>

      {/* Left side (RTL End): Notifications, User switch, Fullscreen */}
      <div className="flex items-center gap-2">
        {/* PWA Direct Desktop Installation Button */}
        <PWAInstallButton />

        {/* Notifications & Low Stock Alert */}
        <div className="relative">
          <button
            onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
            className="relative p-2 rounded-lg text-[#5C4033] hover:bg-[#F5EFE6] transition-colors border border-transparent hover:border-[#D7C3A5]"
            title="الإشعارات والتنبيهات"
          >
            <Bell className="w-4 h-4" />
            {(lowStockItems.length > 0 || ((currentUser?.role === 'admin' || currentUser?.role === 'manager') && isBackupOverdue)) && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse ring-2 ring-white" />
            )}
          </button>

          {isNotifDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-xl shadow-xl border border-[#E8DFD5] py-2 z-50 animate-in fade-in slide-in-from-top-1 text-right">
              <div className="px-3 pb-2 border-b border-[#F0E6D8] flex items-center justify-between">
                <span className="text-xs font-bold text-[#8B1E1E]">مركز التنبيهات والإشعارات</span>
                <span className="text-[10px] text-[#8C7665]">
                  {lowStockItems.length + ((currentUser?.role === 'admin' || currentUser?.role === 'manager') && isBackupOverdue ? 1 : 0)} تنبيه نشط
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto p-2 space-y-2">
                {/* 1. ADMIN BACKUP REMINDER NOTIFICATION (IF NO BACKUP IN > 24 HOURS) */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && isBackupOverdue && (
                  <div
                    onClick={() => {
                      setIsNotifDropdownOpen(false);
                      onNavigateToTab('settings');
                    }}
                    className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-red-900 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span>تنبيه أمان: مطلوب عمل نسخة احتياطية</span>
                      </div>
                      <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                        24+ ساعة
                      </span>
                    </div>
                    <p className="text-[11px] text-red-800 leading-relaxed">
                      {lastBackupTime
                        ? `لم يتم إجراء نسخة احتياطية منذ أكثر من 24 ساعة (آخر نسخة: ${new Date(lastBackupTime).toLocaleDateString('ar-EG')}).`
                        : 'لم يتم إنشاء أي نسخة احتياطية حتى الآن لقاعدة البيانات.'}
                    </p>
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-red-200/60 text-[10px] font-extrabold text-red-700">
                      <span>احفظ نسخة على فلاشة أو محلياً</span>
                      <span className="underline">نسخ احتياطي الآن ⬅</span>
                    </div>
                  </div>
                )}

                {/* 2. LOW STOCK ITEMS */}
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setIsNotifDropdownOpen(false);
                      onNavigateToTab('inventory');
                    }}
                    className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>نقص مخزون: {item.name}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      المتبقي: <span className="font-bold tabular-nums">{item.currentStock} {item.unit}</span> (الحد الأدنى: {item.minStock})
                    </p>
                  </div>
                ))}

                {lowStockItems.length === 0 && !((currentUser?.role === 'admin' || currentUser?.role === 'manager') && isBackupOverdue) && (
                  <div className="text-center py-4 text-xs text-[#8C7665]">
                    لا توجد تنبيهات عاجلة، النظام والمخزون في حالة ممتازة
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lock Terminal Button */}
        <button
          onClick={lockTerminal}
          className="p-2 rounded-lg text-[#5C4033] hover:bg-[#F5EFE6] hover:text-[#8B1E1E] transition-colors"
          title="قفل الشاشة ونقطة البيع (Lock Terminal)"
        >
          <Lock className="w-4 h-4" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-[#5C4033] hover:bg-[#F5EFE6] transition-colors hidden sm:block"
          title="ملء الشاشة"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* User Profile & Quick Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 p-1.5 pr-2 rounded-lg text-xs font-semibold bg-[#F5EFE6] text-[#3E2723] hover:bg-[#EAE0D2] transition-colors border border-[#D7C3A5]/60"
          >
            <div className="w-7 h-7 rounded-full bg-[#8B1E1E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser?.avatar || (currentUser?.name || 'م').slice(0, 1)}
            </div>
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="font-bold text-[#231610]">{currentUser?.name || 'مستخدم النظام'}</span>
              <span className="text-[10px] text-[#8B1E1E] font-medium">
                {currentUser?.role === 'admin'
                  ? 'مدير عام (Admin)'
                  : currentUser?.role === 'cashier'
                  ? 'كاشير (Cashier)'
                  : currentUser?.role === 'kitchen'
                  ? 'شيف المطبخ (Kitchen)'
                  : 'مدير فرع'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#6F4E37]" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-[#E8DFD5] py-2 z-50 text-right animate-in fade-in slide-in-from-top-1">
              <div className="px-3 pb-2 border-b border-[#F0E6D8] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#231610]">{currentUser?.name || 'مستخدم النظام'}</div>
                  <div className="text-[11px] text-[#7A6455] font-mono">@{currentUser?.username || 'user'}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-base">
                  {currentUser?.avatar || '👤'}
                </div>
              </div>

              {/* Quick Role Switcher for seamless commercial testing */}
              <div className="p-2 bg-[#FBF9F6] border-b border-[#F0E6D8]">
                <div className="text-[10px] font-bold text-[#8B1E1E] mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>تبديل سريع للمستخدم (تجربة الأدوار)</span>
                </div>
                <div className="space-y-1">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u);
                        setIsUserDropdownOpen(false);
                      }}
                      className={`w-full text-right px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                        u.id === currentUser?.id
                          ? 'bg-[#8B1E1E] text-white font-bold'
                          : 'hover:bg-[#EAE0D2] text-[#3E2723]'
                      }`}
                    >
                      <span>{u.name}</span>
                      <span className="text-[9px] opacity-75 uppercase">{u.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full text-right px-3 py-2 text-xs text-[#231610] hover:bg-[#FFF8EF] hover:text-[#8B1E1E] flex items-center justify-between font-bold transition-colors cursor-pointer border-b border-[#F0E6D8]"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#8B1E1E]" />
                    <span>الملف الشخصي والبيانات</span>
                  </div>
                  <span className="text-[10px] text-[#B8860B] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">تعديل</span>
                </button>
                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full text-right px-3 py-1.5 text-xs text-[#3E2723] hover:bg-[#F8F5F0] flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-[#7A6455]" />
                  <span>تغيير كلمة المرور ورمز PIN</span>
                </button>
                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full text-right px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile & Password/PIN Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="تأكيد تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟ سيتم إنهاء جلسة العمل الحالية والعودة إلى شاشة تسجيل الدخول بأمان."
        confirmText="تسجيل الخروج"
        cancelText="البقاء في النظام"
        isDanger={true}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
};
