import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Receipt,
  Grid,
  UtensilsCrossed,
  Layers,
  Package,
  Scroll,
  Truck,
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  CalendarCheck,
  Clock,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posDb } from '../../services/db';
import { UserProfileModal } from './UserProfileModal';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[]; // Roles that can see this
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const { currentUser } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [kitchenOrdersCount, setKitchenOrdersCount] = useState<number>(0);

  useEffect(() => {
    const updateCounters = () => {
      const orders = posDb.getOrders();
      const activeKitchen = orders.filter(
        (o) => o.status === 'preparing' || o.status === 'confirmed' || o.status === 'new'
      );
      setKitchenOrdersCount(activeKitchen.length);
    };

    updateCounters();
    return posDb.subscribe(updateCounters);
  }, []);

  const navItems: NavItem[] = [
    {
      id: 'pos',
      label: 'نقطة البيع (POS)',
      icon: ShoppingCart,
      roles: ['admin', 'cashier', 'manager'],
    },
    {
      id: 'kitchen',
      label: 'شاشة المطبخ (KDS)',
      icon: ChefHat,
      roles: ['admin', 'kitchen', 'manager'],
      badge: kitchenOrdersCount,
    },
    {
      id: 'orders',
      label: 'سجل الطلبات والفواتير',
      icon: Receipt,
      roles: ['admin', 'cashier', 'manager', 'kitchen'],
    },
    {
      id: 'tables',
      label: 'إدارة الطاولات والصالة',
      icon: Grid,
      roles: ['admin', 'cashier', 'manager'],
    },
    {
      id: 'dashboard',
      label: 'لوحة التحكم والمؤشرات',
      icon: LayoutDashboard,
      roles: ['admin', 'manager'],
    },
    {
      id: 'products',
      label: 'قائمة الأصناف والمنتجات',
      icon: UtensilsCrossed,
      roles: ['admin', 'manager'],
    },
    {
      id: 'categories',
      label: 'تصنيفات المنيو',
      icon: Layers,
      roles: ['admin', 'manager'],
    },
    {
      id: 'inventory',
      label: 'المخزون والمواد الخام',
      icon: Package,
      roles: ['admin', 'manager'],
    },
    {
      id: 'recipes',
      label: 'الوصفات والخصم الآلي',
      icon: Scroll,
      roles: ['admin', 'manager'],
    },
    {
      id: 'purchases',
      label: 'المشتريات والموردون',
      icon: Truck,
      roles: ['admin', 'manager'],
    },
    {
      id: 'customers',
      label: 'العملاء والتوصيل',
      icon: Users,
      roles: ['admin', 'cashier', 'manager'],
    },
    {
      id: 'expenses',
      label: 'المصروفات اليومية',
      icon: DollarSign,
      roles: ['admin', 'manager'],
    },
    {
      id: 'reports',
      label: 'التقارير والأرباح',
      icon: TrendingUp,
      roles: ['admin', 'manager'],
    },
    {
      id: 'shifts',
      label: 'الورديات والخزينة',
      icon: Clock,
      roles: ['admin', 'cashier', 'manager'],
    },
    {
      id: 'users',
      label: 'الموظفون والصلاحيات',
      icon: ShieldCheck,
      roles: ['admin'],
    },
    {
      id: 'branches',
      label: 'إدارة الفروع',
      icon: Building2,
      roles: ['admin'],
    },
    {
      id: 'settings',
      label: 'الهوية والإعدادات',
      icon: Settings,
      roles: ['admin'],
    },
    {
      id: 'audit',
      label: 'سجل العمليات (Audit)',
      icon: Database,
      roles: ['admin'],
    },
  ];

  // Filter items by role safely
  const visibleItems = navItems.filter((item) =>
    currentUser ? item.roles.includes(currentUser.role) : false
  );

  return (
    <aside
      className={`h-[calc(100vh-4rem)] bg-white border-l border-[#E8DFD5] flex flex-col justify-between transition-all duration-200 sticky top-16 z-30 select-none shadow-xs ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                isActive
                  ? 'bg-[#8B1E1E] text-white shadow-sm'
                  : 'text-[#3E2723] hover:bg-[#F5EFE6] hover:text-[#8B1E1E]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-[#8B1E1E]'
                }`}
              />

              {!collapsed && (
                <span className="truncate flex-1 text-right">{item.label}</span>
              )}

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full tabular-nums ${
                    isActive
                      ? 'bg-white text-[#8B1E1E]'
                      : 'bg-red-600 text-white animate-pulse'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Tooltip on collapsed hover */}
              {collapsed && (
                <div className="absolute right-full mr-2 px-2 py-1 bg-[#231610] text-white text-xs rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && ` (${item.badge})`}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile Quick Card */}
      <div className="p-2 border-t border-[#E8DFD5] bg-[#FFFBF7]">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white border border-[#E8DFD5] shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#8B1E1E] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {currentUser?.avatar || (currentUser?.name || 'م').slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1 text-right leading-tight">
                <div className="text-xs font-bold text-[#231610] truncate">
                  {currentUser?.name || 'مستخدم النظام'}
                </div>
                <div className="text-[10px] text-[#8B1E1E] font-medium truncate">
                  {currentUser?.role === 'admin'
                    ? 'مدير عام'
                    : currentUser?.role === 'cashier'
                    ? 'كاشير ومحاسب'
                    : currentUser?.role === 'kitchen'
                    ? 'شيف المطبخ'
                    : 'مدير فرع'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-1.5 rounded-lg text-[#5C4033] hover:text-[#8B1E1E] hover:bg-[#F5EFE6] transition-colors shrink-0 cursor-pointer"
              title="تعديل بياناتي وكلمة المرور ورمز PIN"
            >
              <UserCog className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center justify-center p-2 rounded-xl bg-white border border-[#E8DFD5] text-[#8B1E1E] hover:bg-[#FFF8EF] transition-colors cursor-pointer"
            title={`تعديل بياناتي: ${currentUser?.name || ''}`}
          >
            <span className="text-base leading-none">
              {currentUser?.avatar || '👤'}
            </span>
          </button>
        )}
      </div>

      {/* Footer Collapse Toggle */}
      <div className="p-2 border-t border-[#E8DFD5] bg-[#FBF9F6] flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#7A6455] font-medium pr-2">
            <span>نظام الباشا POS التجاري</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#5C4033] hover:bg-[#EAE0D2] transition-colors"
          title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {collapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </aside>
  );
};
