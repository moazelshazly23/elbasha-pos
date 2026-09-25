import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Check,
  Printer,
  Soup,
  Salad,
  RotateCcw,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { posDb } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';

export const KDSView: React.FC = () => {
  const { currentUser } = useAuth();
  const { profile } = useBrand();

  const [orders, setOrders] = useState<Order[]>(() => posDb.getOrders());
  const [stationFilter, setStationFilter] = useState<'all' | 'grill' | 'kitchen' | 'cold'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setOrders(posDb.getOrders());
    });
    return unsubscribe;
  }, []);

  // Filter orders
  const displayOrders = orders.filter((o) => {
    if (statusFilter === 'active') {
      if (o.status === 'completed' || o.status === 'cancelled') return false;
    } else if (statusFilter === 'completed') {
      if (o.status !== 'completed') return false;
    }
    // Station filter
    if (stationFilter !== 'all') {
      const hasItemForStation = o.items.some((i) => i.kitchenStation === stationFilter);
      if (!hasItemForStation) return false;
    }
    return true;
  });

  const handleUpdateStatus = (orderId: string, nextStatus: OrderStatus) => {
    posDb.updateOrderStatus(orderId, nextStatus, currentUser?.id || 'kitchen', currentUser?.name || 'شيف المطبخ');
  };

  const toggleItemChecked = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const getElapsedMinutes = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diffMs / 60000);
  };

  const activeOrdersCount = orders.filter((o) => o.status === 'preparing' || o.status === 'new').length;
  const delayedOrdersCount = orders.filter(
    (o) => (o.status === 'preparing' || o.status === 'new') && getElapsedMinutes(o.createdAt) > 15
  ).length;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#1A120E] text-white overflow-hidden">
      {/* KDS Header Controls */}
      <div className="p-3 bg-[#241711] border-b border-[#3E2723] flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-[#E64A19]" />
            <div>
              <h2 className="font-extrabold text-sm text-white">
                شاشة عرض المطبخ والشواية (KDS)
              </h2>
              <span className="text-[10px] text-gray-400">
                متابعة وإعداد التذاكر في الوقت الحقيقي
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-[#3E2723] hidden sm:block" />

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-[#331E15] px-2.5 py-1 rounded-lg border border-[#4E2E20] flex items-center gap-1.5">
              <span className="text-gray-400">طلبات نشطة:</span>
              <span className="font-bold text-amber-400 tabular-nums">{activeOrdersCount}</span>
            </div>
            {delayedOrdersCount > 0 && (
              <div className="bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-800 text-red-300 flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>متأخر (&gt;15د):</span>
                <span className="font-bold tabular-nums">{delayedOrdersCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Station Filters */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 p-1 bg-[#140D0A] rounded-xl border border-[#3E2723] text-xs">
            <button
              onClick={() => setStationFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                stationFilter === 'all'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              جميع المحطات
            </button>
            <button
              onClick={() => setStationFilter('grill')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                stationFilter === 'grill'
                  ? 'bg-[#E64A19] text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>الشواية والفحم</span>
            </button>
            <button
              onClick={() => setStationFilter('kitchen')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                stationFilter === 'kitchen'
                  ? 'bg-[#A67C52] text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Soup className="w-3.5 h-3.5" />
              <span>الطواجن والأرز</span>
            </button>
            <button
              onClick={() => setStationFilter('cold')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                stationFilter === 'cold'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Salad className="w-3.5 h-3.5" />
              <span>السلطات والبارد</span>
            </button>
          </div>

          {/* Status View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#140D0A] rounded-xl border border-[#3E2723] text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1.5 rounded-lg font-bold ${
                statusFilter === 'active' ? 'bg-[#3E2723] text-white' : 'text-gray-400'
              }`}
            >
              النشطة
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1.5 rounded-lg font-bold ${
                statusFilter === 'completed' ? 'bg-[#3E2723] text-white' : 'text-gray-400'
              }`}
            >
              المكتملة مؤخراً
            </button>
          </div>
        </div>
      </div>

      {/* Orders Board */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayOrders.map((order) => {
            const elapsed = getElapsedMinutes(order.createdAt);
            const isDelayed = elapsed > 15;
            const isUrgent = elapsed > 20;

            const relevantItems =
              stationFilter === 'all'
                ? order.items
                : order.items.filter((i) => i.kitchenStation === stationFilter);

            return (
              <div
                key={order.id}
                className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                  isUrgent
                    ? 'bg-[#2A1111] border-red-600 ring-2 ring-red-500/50'
                    : isDelayed
                    ? 'bg-[#2E1E13] border-amber-600'
                    : 'bg-[#231710] border-[#3E2723]'
                }`}
              >
                {/* Ticket Header */}
                <div
                  className={`p-3 flex items-center justify-between text-xs font-bold border-b ${
                    isUrgent
                      ? 'bg-red-900/60 border-red-700 text-white'
                      : isDelayed
                      ? 'bg-amber-900/60 border-amber-700 text-amber-200'
                      : 'bg-[#2C1D15] border-[#3E2723] text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black tracking-wide text-white">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded">
                      {order.type === 'dine_in'
                        ? 'صالات'
                        : order.type === 'takeaway'
                        ? 'سفري'
                        : order.type === 'delivery'
                        ? 'توصيل'
                        : 'استلام'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-extrabold">{elapsed} دقيقة</span>
                  </div>
                </div>

                {/* Meta details: Table or Customer */}
                <div className="px-3 py-1.5 bg-black/20 text-[11px] flex items-center justify-between text-gray-300 border-b border-[#3E2723]">
                  {order.tableNumber ? (
                    <span className="font-bold text-amber-400">{order.tableNumber}</span>
                  ) : (
                    <span>طلب {order.customerName || 'بدون اسم'}</span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Items List */}
                <div className="p-3 flex-1 overflow-y-auto space-y-2.5 max-h-60">
                  {relevantItems.map((item) => {
                    const isChecked = checkedItems[item.id] || false;

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemChecked(item.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-emerald-950/40 border-emerald-800/60 text-gray-400 line-through opacity-70'
                            : 'bg-[#2C1D16] border-[#3E2723] text-white hover:border-[#A67C52]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-gray-500 bg-black/30'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs font-bold leading-snug">
                            <span>{item.productNameAr}</span>
                            <span className="text-amber-400 text-sm font-black tabular-nums mr-1">
                              x{item.quantity}
                            </span>
                          </div>

                          {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                            <div className="text-[10px] text-amber-300/90 mt-0.5 space-y-0.5">
                              {item.selectedModifiers.map((m, idx) => (
                                <div key={idx}>+ {m.nameAr}</div>
                              ))}
                            </div>
                          )}

                          {item.notes && (
                            <div className="text-[10px] text-yellow-300 italic mt-0.5 bg-yellow-950/40 px-1.5 py-0.5 rounded">
                              ملاحظة: {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Special Notes */}
                {order.notes && (
                  <div className="px-3 py-1.5 bg-red-950/40 text-[10px] text-red-200 border-t border-[#3E2723]">
                    ملاحظات عامة: {order.notes}
                  </div>
                )}

                {/* Bottom Actions based on status */}
                <div className="p-2.5 bg-[#1C120D] border-t border-[#3E2723] flex items-center gap-2">
                  {order.status === 'new' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      className="w-full py-2 bg-[#E64A19] hover:bg-[#D84315] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Flame className="w-4 h-4" />
                      <span>بدء التحضير والشوي</span>
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'ready')}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>جاهز للتسليم (Ready)</span>
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>تم تسليم الطلب للعميل</span>
                    </button>
                  )}

                  {order.status === 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة فتح الطلب</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {displayOrders.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 text-gray-400">
            <ChefHat className="w-16 h-16 text-[#3E2723] mb-3 stroke-[1.2]" />
            <h3 className="font-bold text-base text-gray-200">
              لا توجد طلبات معلقة في المطبخ حالياً
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              جميع التذاكر جاهزة ومسلمة. ستظهر التذاكر الجديدة هنا فور تأكيدها في نقطة البيع.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
