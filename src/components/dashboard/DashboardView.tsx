import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Receipt,
  Grid,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Flame,
  ArrowUpRight,
  Package,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { posDb } from '../../services/db';
import { Order, Ingredient, RestaurantTable } from '../../types';
import { DailySalesSummaryCard } from './DailySalesSummaryCard';
import { RevenueTrendChart } from './RevenueTrendChart';

interface DashboardViewProps {
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const { profile } = useBrand();
  const { currentUser, currentBranch } = useAuth();
  const { activeShift, setIsShiftModalOpen } = useShift();

  const [orders, setOrders] = useState<Order[]>(() => posDb.getOrders());
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => posDb.getIngredients());
  const [tables, setTables] = useState<RestaurantTable[]>(() => posDb.getTables());

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setOrders(posDb.getOrders());
      setIngredients(posDb.getIngredients());
      setTables(posDb.getTables());
    });
    return unsubscribe;
  }, []);

  const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
  const activeOrders = orders.filter((o) => o.status === 'preparing' || o.status === 'new');
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const lowStockItems = ingredients.filter((i) => i.currentStock <= i.minStock);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto bg-[#F8F5F0] p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-[#8B1E1E] to-[#4A1010] text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-amber-200 font-bold block mb-1">
            مرحباً بك، {currentUser?.name || 'المدير'} | {currentBranch?.name || 'الفرع الرئيسي'}
          </span>
          <h1 className="text-2xl font-black">
            نظام إدارة مطعم ومشويات {profile.name}
          </h1>
          <p className="text-xs text-gray-200 mt-1 max-w-xl">
            {profile.slogan} - لوحة متابعة العمليات اللحظية والمبيعات وحركة الصالة والمطبخ.
          </p>
        </div>

        {/* Quick launch buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigateToTab('pos')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#8B1E1E] text-xs font-black hover:bg-[#FFF8EF] transition-all shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>نقطة البيع (POS)</span>
          </button>
          <button
            onClick={() => onNavigateToTab('kitchen')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B8860B] text-white text-xs font-black hover:bg-[#996515] transition-all shadow-sm"
          >
            <ChefHat className="w-4 h-4" />
            <span>شاشة المطبخ (KDS)</span>
          </button>
        </div>
      </div>

      {/* Daily Sales Summary Report for Current Active Shift */}
      <DailySalesSummaryCard
        activeShift={activeShift}
        orders={orders}
        profile={profile}
        branchName={currentBranch.name}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onNavigateToTab={onNavigateToTab}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateToTab('reports')}
          className="bg-white p-5 rounded-2xl border border-[#E8DFD5] shadow-xs cursor-pointer hover:border-[#B8860B] transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold text-[#7A6455]">إجمالي مبيعات اليوم</span>
            <div className="p-2 rounded-xl bg-amber-50 text-[#8B1E1E]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#8B1E1E] tabular-nums">
            {totalSales.toLocaleString('ar-EG')} {profile.currency}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>محدث في الوقت الفعلي</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateToTab('kitchen')}
          className="bg-white p-5 rounded-2xl border border-[#E8DFD5] shadow-xs cursor-pointer hover:border-[#B8860B] transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold text-[#7A6455]">تذاكر قيد الشوي والتحضير</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-700">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-700 tabular-nums">
            {activeOrders.length} طلب
          </div>
          <span className="text-[11px] text-gray-500 mt-2 block">على شواية الفحم والمطبخ</span>
        </div>

        <div
          onClick={() => onNavigateToTab('tables')}
          className="bg-white p-5 rounded-2xl border border-[#E8DFD5] shadow-xs cursor-pointer hover:border-[#B8860B] transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold text-[#7A6455]">إشغال طاولات الصالة</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Grid className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900 tabular-nums">
            {occupiedTables} / {tables.length}
          </div>
          <span className="text-[11px] text-gray-500 mt-2 block">
            {((occupiedTables / (tables.length || 1)) * 100).toFixed(0)}% نسبة إشغال الصالة
          </span>
        </div>

        <div
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white p-5 rounded-2xl border border-[#E8DFD5] shadow-xs cursor-pointer hover:border-[#B8860B] transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold text-[#7A6455]">تنبيهات نقص المخزون</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-700 tabular-nums">
            {lowStockItems.length} صنف
          </div>
          <span className="text-[11px] text-red-700 font-bold mt-2 block">
            {lowStockItems.length > 0 ? 'بحاجة لتوريد فوري' : 'المخزون آمن ومستقر'}
          </span>
        </div>
      </div>

      {/* 7-Day Revenue Trend Analysis Recharts Chart */}
      <RevenueTrendChart
        orders={orders}
        currency={profile.currency}
        onNavigateToReports={() => onNavigateToTab('reports')}
      />

      {/* Lower Split: Recent Orders and Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DFD5] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#231610] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#8B1E1E]" />
              <span>أحدث الطلبات والفواتير</span>
            </h3>
            <button
              onClick={() => onNavigateToTab('orders')}
              className="text-xs text-[#8B1E1E] font-bold hover:underline"
            >
              عرض الكل
            </button>
          </div>

          <div className="space-y-2">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 space-y-1">
                <Receipt className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="font-bold text-gray-600">لا توجد طلبات مسجلة اليوم</p>
                <p className="text-[11px] text-gray-400">ستظهر الفواتير والطلبات اللحظية هنا فور تسجيلها في الكاشير.</p>
              </div>
            ) : (
              orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FBF9F6] border border-[#E8DFD5] text-xs"
                >
                  <div>
                    <div className="font-extrabold text-[#8B1E1E]">{order.orderNumber}</div>
                    <div className="text-[11px] text-gray-600">
                      {order.tableNumber ? `طاولة: ${order.tableNumber}` : order.customerName || 'عام'} • {order.items.length} أصناف
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="font-black text-[#231610] tabular-nums">
                      {order.total.toFixed(2)} {profile.currency}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Warning Feed */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DFD5] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#231610] flex items-center gap-2">
              <Package className="w-4 h-4 text-red-700" />
              <span>المواد الخام التي قاربت على النفاد</span>
            </h3>
            <button
              onClick={() => onNavigateToTab('inventory')}
              className="text-xs text-[#8B1E1E] font-bold hover:underline"
            >
              إدارة المخزون
            </button>
          </div>

          <div className="space-y-2">
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                لا توجد مواد تحت حد الأمان حالياً.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs"
                >
                  <div>
                    <div className="font-extrabold text-amber-950">{item.name}</div>
                    <div className="text-[11px] text-amber-800">
                      الحد الأدنى للطلب: {item.minStock} {item.unit}
                    </div>
                  </div>

                  <div className="text-left font-black text-red-700 tabular-nums">
                    {item.currentStock} {item.unit}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
