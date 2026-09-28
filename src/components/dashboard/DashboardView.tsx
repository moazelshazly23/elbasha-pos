import React, { useState, useEffect, useMemo } from 'react';
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
  BellRing,
  Plus,
  ShieldAlert,
  ArrowRight,
  Eye,
  CheckCircle2,
  X,
  Printer,
  Search,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { posDb } from '../../services/db';
import { Order, Product, Ingredient, RestaurantTable, User } from '../../types';
import { DailySalesSummaryCard } from './DailySalesSummaryCard';
import { RevenueTrendChart } from './RevenueTrendChart';
import { ReorderPointModal, ReorderItem } from './ReorderPointModal';
import { StaffPerformanceBoard } from './StaffPerformanceBoard';

interface DashboardViewProps {
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const { profile } = useBrand();
  const { currentUser, currentBranch } = useAuth();
  const { activeShift, setIsShiftModalOpen } = useShift();

  const [orders, setOrders] = useState<Order[]>(() => posDb.getOrders());
  const [products, setProducts] = useState<Product[]>(() => posDb.getProducts({ includeArchived: false }));
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => posDb.getIngredients({ includeArchived: false }));
  const [tables, setTables] = useState<RestaurantTable[]>(() => posDb.getTables());
  const [users, setUsers] = useState<User[]>(() => posDb.getUsers());

  // Alert State
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isAlertBannerDismissed, setIsAlertBannerDismissed] = useState(false);
  const [widgetFilter, setWidgetFilter] = useState<'all' | 'products' | 'ingredients'>('all');

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setOrders(posDb.getOrders());
      setProducts(posDb.getProducts({ includeArchived: false }));
      setIngredients(posDb.getIngredients({ includeArchived: false }));
      setTables(posDb.getTables());
      setUsers(posDb.getUsers());
    });
    return unsubscribe;
  }, []);

  const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
  const activeOrders = orders.filter((o) => o.status === 'preparing' || o.status === 'new');
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;

  // Real-Time Reorder Point Analysis (Products & Raw Ingredients)
  const reorderItems: ReorderItem[] = useMemo(() => {
    const list: ReorderItem[] = [];

    // 1. Finished Products with inventory tracking enabled
    products.forEach((p) => {
      if (p.trackInventory !== false && (p.currentStock !== undefined || p.minStock !== undefined)) {
        const current = p.currentStock ?? 0;
        const min = p.minStock ?? 5;
        if (current <= min) {
          const deficit = Math.max(0, min - current);
          const suggested = Math.max(min, (p.maxStock || min * 2) - current);
          list.push({
            id: p.id,
            name: p.nameAr,
            type: 'product',
            category: 'وجبة مشويات جاهزة',
            currentStock: current,
            minStock: min,
            maxStock: p.maxStock,
            unit: p.unit || 'وجبة',
            costPrice: p.costPrice || 0,
            suggestedReorderQty: Math.ceil(suggested),
            deficit,
            isOutOfStock: current <= 0,
          });
        }
      }
    });

    // 2. Raw Ingredients & Meat
    ingredients.forEach((ing) => {
      if (ing.currentStock <= ing.minStock) {
        const deficit = Math.max(0, ing.minStock - ing.currentStock);
        const suggested = Math.max(ing.minStock, ing.minStock * 2 - ing.currentStock);
        list.push({
          id: ing.id,
          name: ing.name,
          type: 'ingredient',
          category: ing.category || 'مادة خام ولحوم',
          currentStock: ing.currentStock,
          minStock: ing.minStock,
          unit: ing.unit,
          costPrice: ing.costPerUnit || 0,
          suggestedReorderQty: Math.ceil(suggested),
          deficit,
          isOutOfStock: ing.currentStock <= 0,
        });
      }
    });

    return list.sort((a, b) => {
      if (a.isOutOfStock && !b.isOutOfStock) return -1;
      if (!a.isOutOfStock && b.isOutOfStock) return 1;
      return b.deficit - a.deficit;
    });
  }, [products, ingredients]);

  const outOfStockCount = reorderItems.filter((i) => i.isOutOfStock).length;
  const criticalCount = reorderItems.length - outOfStockCount;

  // Filtered list for the dashboard widget
  const displayedWidgetItems = reorderItems.filter((item) => {
    if (widgetFilter === 'products') return item.type === 'product';
    if (widgetFilter === 'ingredients') return item.type === 'ingredient';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto bg-[#F7F4EE] p-4 sm:p-6 space-y-6">
      {/* 1. URGENT REORDER POINT INSTANT NOTIFICATION BANNER */}
      {reorderItems.length > 0 && !isAlertBannerDismissed && (
        <div className="bg-linear-to-l from-red-600 via-[#8B1E1E] to-[#551010] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-red-400/40 relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <BellRing className="w-5 h-5 text-amber-300 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                    <span>تنبيه فوري: وصول {reorderItems.length} صنف ومنتج في المخزون لحد إعادة الطلب</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-red-300 animate-ping" />
                  </span>
                  {outOfStockCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[11px] border border-white/30">
                      {outOfStockCount} صنف نفد تماماً (رصيد 0)
                    </span>
                  )}
                  {criticalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-extrabold text-[11px] border border-amber-300/30">
                      {criticalCount} صنف تحت حد الأمان
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/85 leading-relaxed">
                  هبط رصيد بعض المنتجات والمكونات الحيوية عن نقطة إعادة الطلب المحددة (Reorder Point)، مما يستدعي إجراء طلبية توريد عاجلة لتجنب توقف المطبخ أو شاشة الكاشير.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setIsReorderModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#8B1E1E] text-xs font-black hover:bg-amber-50 transition-all shadow-xs cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>عرض النواقص وإجراء توريد سريع</span>
              </button>

              <button
                onClick={() => onNavigateToTab('inventory')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/20 cursor-pointer"
              >
                <span>شاشة المخزون</span>
              </button>

              <button
                onClick={() => setIsAlertBannerDismissed(true)}
                className="p-2 rounded-xl hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="إخفاء التنبيه مؤقتاً لهذه الجلسة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Welcome Banner */}
      <div className="bg-[#140E0B] text-white p-6 rounded-2xl border border-[#C59A3F]/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="text-xs text-[#C59A3F] font-semibold flex items-center gap-1.5">
            <span>مرحباً بك، {currentUser?.name || 'المدير'}</span>
            <span aria-hidden="true" className="text-[#8B1E1E]">·</span>
            <span>{currentBranch?.name || 'الفرع الرئيسي'}</span>
          </div>
          <h1 className="text-2xl font-black font-editorial tracking-wide text-white">
            نظام إدارة مطعم ومشويات {profile.name}
          </h1>
          <p className="text-xs text-[#C5B7A8] max-w-xl font-normal leading-relaxed">
            {profile.slogan} - متابعة حية لمؤشرات المبيعات، خطوط الشواء على الفحم، والورديات.
          </p>
        </div>

        {/* Quick launch buttons */}
        <div className="flex flex-wrap gap-2.5 relative z-10">
          <button
            onClick={() => onNavigateToTab('pos')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#731717] transition-all shadow-xs cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>نقطة البيع (POS)</span>
          </button>
          <button
            onClick={() => onNavigateToTab('kitchen')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2A1D16] text-[#C59A3F] border border-[#C59A3F]/40 text-xs font-bold hover:bg-[#3D2B20] transition-all shadow-xs cursor-pointer"
          >
            <ChefHat className="w-4 h-4 text-[#C59A3F]" />
            <span>شاشة المطبخ (KDS)</span>
          </button>
        </div>
      </div>

      {/* 3. Daily Sales Summary Report for Current Active Shift */}
      <DailySalesSummaryCard
        activeShift={activeShift}
        orders={orders}
        profile={profile}
        branchName={currentBranch.name}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onNavigateToTab={onNavigateToTab}
      />

      {/* 4. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <div
          onClick={() => onNavigateToTab('reports')}
          className="bg-white p-5 rounded-xl border border-[#E5DACB] shadow-2xs cursor-pointer hover:border-[#8B1E1E] transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold text-[#7A6455]">إجمالي مبيعات اليوم</span>
            <div className="p-2 rounded-lg bg-[#F7F4EE] text-[#8B1E1E]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#8B1E1E] font-num">
            {totalSales.toLocaleString('ar-EG')} <span className="text-sm font-bold">{profile.currency}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>محدث في الوقت الفعلي</span>
          </div>
        </div>

        {/* Kitchen Card */}
        <div
          onClick={() => onNavigateToTab('kitchen')}
          className="bg-white p-5 rounded-xl border border-[#E5DACB] shadow-2xs cursor-pointer hover:border-[#C59A3F] transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold text-[#7A6455]">تذاكر قيد الشوي والتحضير</span>
            <div className="p-2 rounded-lg bg-[#F7F4EE] text-orange-700">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-700 font-num">
            {activeOrders.length} <span className="text-sm font-semibold">طلب</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-2 block font-normal">على شواية الفحم والمطبخ</span>
        </div>

        {/* Tables Card */}
        <div
          onClick={() => onNavigateToTab('tables')}
          className="bg-white p-5 rounded-xl border border-[#E5DACB] shadow-2xs cursor-pointer hover:border-[#C59A3F] transition-all"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold text-[#7A6455]">إشغال طاولات الصالة</span>
            <div className="p-2 rounded-lg bg-[#F7F4EE] text-blue-700">
              <Grid className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1F1511] font-num">
            {occupiedTables} / {tables.length}
          </div>
          <span className="text-[11px] text-gray-500 mt-2 block font-normal">
            {((occupiedTables / (tables.length || 1)) * 100).toFixed(0)}% نسبة إشغال الصالة
          </span>
        </div>

        {/* REORDER POINT ALERT KPI CARD */}
        <div
          onClick={() => setIsReorderModalOpen(true)}
          className={`bg-white p-5 rounded-xl border shadow-2xs cursor-pointer transition-all ${
            reorderItems.length > 0
              ? 'border-red-400 hover:border-red-600 bg-linear-to-b from-red-50/30 to-white'
              : 'border-[#E5DACB] hover:border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold text-[#7A6455]">تنبيهات حد إعادة الطلب</span>
            <div
              className={`p-2 rounded-lg ${
                reorderItems.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${reorderItems.length > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-num ${
              reorderItems.length > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {reorderItems.length} <span className="text-sm font-semibold">صنف حرج</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span
              className={`text-[11px] font-bold ${
                reorderItems.length > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {reorderItems.length > 0 ? 'بحاجة لتوريد فوري' : 'المخزون آمن ومستقر'}
            </span>
            <span className="text-[10px] text-[#8B1E1E] font-bold hover:underline flex items-center gap-0.5">
              <span>التفاصيل</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 5. 7-Day Revenue Trend Analysis Recharts Chart */}
      <RevenueTrendChart
        orders={orders}
        currency={profile.currency}
        onNavigateToReports={() => onNavigateToTab('reports')}
      />

      {/* 6. Staff & Cashier Performance Evaluation Scoreboard */}
      <StaffPerformanceBoard
        orders={orders}
        users={users}
        profile={profile}
        onNavigateToTab={onNavigateToTab}
      />

      {/* 7. Lower Split: Recent Orders and Reorder Point Live Monitor */}
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
              className="text-xs text-[#8B1E1E] font-bold hover:underline cursor-pointer"
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

        {/* REORDER POINT REAL-TIME LIVE MONITOR WIDGET */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DFD5] shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#231610]">
                  مراقبة حد إعادة الطلب والنواقص
                </h3>
                <span className="text-[10px] text-[#7A6455]">
                  المنتجات والمواد التي اقتربت من أو تجاوزت حد إعادة الطلب
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsReorderModalOpen(true)}
                className="text-xs text-[#8B1E1E] font-black hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>إدارة وتوريد النواقص</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 pt-1 border-t border-[#F0E8DD] text-xs">
            <button
              onClick={() => setWidgetFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                widgetFilter === 'all'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              الكل ({reorderItems.length})
            </button>
            <button
              onClick={() => setWidgetFilter('products')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                widgetFilter === 'products'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              المنتجات ({reorderItems.filter((i) => i.type === 'product').length})
            </button>
            <button
              onClick={() => setWidgetFilter('ingredients')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                widgetFilter === 'ingredients'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              المواد الخام ({reorderItems.filter((i) => i.type === 'ingredient').length})
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {displayedWidgetItems.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-[#231610]">كافة المواد والمنتجات في وضع آمن</p>
                <p className="text-[11px] text-gray-500">لا يوجد أي صنف هبط عن حد إعادة الطلب المحدد.</p>
              </div>
            ) : (
              displayedWidgetItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition-colors ${
                    item.isOutOfStock
                      ? 'bg-red-50/70 border-red-200'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#231610]">{item.name}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-sm text-[9px] font-bold ${
                          item.type === 'product'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.type === 'product' ? 'منتج جاهز' : 'مادة خام'}
                      </span>
                      {item.isOutOfStock && (
                        <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-black bg-red-600 text-white animate-pulse">
                          نفد الرصيد
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#7A6455]">
                      حد إعادة الطلب: <strong className="text-[#231610]">{item.minStock} {item.unit}</strong> • مطلوب توريد: <strong className="text-[#8B1E1E]">+{item.suggestedReorderQty} {item.unit}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <div
                        className={`font-black text-sm tabular-nums ${
                          item.isOutOfStock ? 'text-red-700' : 'text-amber-900'
                        }`}
                      >
                        {item.currentStock} {item.unit}
                      </div>
                      <span className="text-[10px] text-gray-500">الرصيد المتبقي</span>
                    </div>

                    <button
                      onClick={() => setIsReorderModalOpen(true)}
                      className="px-2 py-1 rounded-lg bg-[#8B1E1E] text-white text-[10px] font-bold hover:bg-[#721616] cursor-pointer shadow-2xs shrink-0"
                    >
                      توريد
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* REORDER POINT ALERT & RESTOCK MODAL */}
      <ReorderPointModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        reorderItems={reorderItems}
        profile={profile}
        onNavigateToTab={onNavigateToTab}
        onStockUpdated={() => {
          setProducts(posDb.getProducts({ includeArchived: false }));
          setIngredients(posDb.getIngredients({ includeArchived: false }));
        }}
      />
    </div>
  );
};
