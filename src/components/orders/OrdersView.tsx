import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Calendar,
  User,
  Phone,
  Store,
  DollarSign,
  Percent,
  X,
  CreditCard,
  Banknote,
  UtensilsCrossed,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Order } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { usePOS } from '../../context/POSContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { OrderFilterBar, DatePreset } from './OrderFilterBar';

export const OrdersView: React.FC = () => {
  const { profile } = useBrand();
  const { viewReceiptForOrder } = usePOS();
  const { hasPermission, currentUser } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>(() => posDb.getOrders());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'card' | 'other'>('all');
  const [deletingOrder, setDeletingOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  // Date range filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Detailed View Modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setOrders(posDb.getOrders());
    });
    return unsubscribe;
  }, []);

  // Helper date formatting YYYY-MM-DD
  const formatDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Handle Preset selection
  const handleSelectDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = formatDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yStr = formatDateStr(yDate);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'last7') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      setStartDate(formatDateStr(past));
      setEndDate(formatDateStr(now));
    } else if (preset === 'thisMonth') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDateStr(first));
      setEndDate(formatDateStr(now));
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setDatePreset('custom');
    setStartDate(start);
    setEndDate(end);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentMethodFilter('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const handleDeleteOrder = (orderId: string, orderNumber: string) => {
    setDeletingOrder({ id: orderId, orderNumber });
  };

  const handleConfirmDeleteOrder = () => {
    if (!deletingOrder) return;
    const { id, orderNumber } = deletingOrder;
    posDb.deleteOrder(id, currentUser?.id, currentUser?.name);
    if (selectedOrderDetails?.id === id) {
      setSelectedOrderDetails(null);
    }
    setDeletingOrder(null);
    showToast(`تم حذف الطلب رقم "${orderNumber}" نهائياً من قاعدة البيانات`, 'success');
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    posDb.updateOrderStatus(orderId, newStatus, currentUser?.id, currentUser?.name);
    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      setSelectedOrderDetails((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    const statusLabels: Record<Order['status'], string> = {
      new: 'جديد',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز للتسليم',
      completed: 'مكتمل ومسلم',
      cancelled: 'ملغي',
    };
    showToast(`تم تغيير حالة الطلب إلى: ${statusLabels[newStatus]}`, 'success');
  };

  // Determine if any filter is active
  const isFiltered =
    searchTerm.trim() !== '' ||
    statusFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    datePreset !== 'all';

  // Filtered orders calculation
  const filteredOrders = orders.filter((o) => {
    // 1. Status Filter
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;

    // 2. Search Query (Order Number, ID, Customer Name, Phone, Table, Cashier, Item Names)
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchNum = o.orderNumber?.toLowerCase().includes(q);
      const matchId = o.id?.toLowerCase().includes(q);
      const matchCust = o.customerName?.toLowerCase().includes(q);
      const matchPhone = o.customerPhone?.includes(q);
      const matchTable = o.tableNumber?.toLowerCase().includes(q);
      const matchCashier = o.cashierName?.toLowerCase().includes(q);
      const matchItem = o.items?.some(
        (i) =>
          i.productNameAr?.toLowerCase().includes(q) ||
          (i.productNameEn && i.productNameEn.toLowerCase().includes(q))
      );

      if (!matchNum && !matchId && !matchCust && !matchPhone && !matchTable && !matchCashier && !matchItem) {
        return false;
      }
    }

    // 3. Payment Method Filter
    if (paymentMethodFilter !== 'all') {
      const hasMatchingPayment = o.payments?.some((p) => {
        if (paymentMethodFilter === 'cash') return p.method === 'cash';
        if (paymentMethodFilter === 'card') return p.method === 'card';
        if (paymentMethodFilter === 'other') return p.method !== 'cash' && p.method !== 'card';
        return true;
      });
      if (!hasMatchingPayment) return false;
    }

    // 4. Date Range Filter (Payment Date / Order Creation Date)
    if (startDate || endDate) {
      const orderDate = new Date(o.createdAt).getTime();

      if (startDate) {
        const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
        if (orderDate < startTimestamp) return false;
      }

      if (endDate) {
        const endTimestamp = new Date(`${endDate}T23:59:59.999`).getTime();
        if (orderDate > endTimestamp) return false;
      }
    }

    return true;
  });

  // Calculate filtered revenue
  const filteredRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            جديد
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            مؤكد
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            قيد التحضير
          </span>
        );
      case 'ready':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            جاهز للتسليم
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
            مكتمل ومسلم
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
            ملغي
          </span>
        );
    }
  };

  const getOrderTypeName = (type: Order['type']) => {
    switch (type) {
      case 'dine_in':
        return 'صالات';
      case 'takeaway':
        return 'سفري';
      case 'delivery':
        return 'توصيل';
      case 'pickup':
        return 'استلام';
    }
  };

  const exportCSV = () => {
    const headers = [
      'رقم الطلب',
      'النوع',
      'الطاولة / العميل',
      'رقم هاتف العميل',
      'الكاشير',
      'الإجمالي',
      'الضريبة',
      'طرق الدفع',
      'الحالة',
      'تاريخ المعاملة',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      getOrderTypeName(o.type),
      o.tableNumber || o.customerName || 'عام',
      o.customerPhone || '---',
      o.cashierName || '---',
      o.total,
      o.taxAmount,
      o.payments.map((p) => p.method).join(' + '),
      o.status,
      new Date(o.createdAt).toLocaleString('ar-EG'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `orders_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Top Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#231610]">
                سجل الطلبات والفواتير السابقة
              </h2>
              <span className="text-xs text-[#7A6455]">
                البحث المتقدم برقم المعاملة، اسم العميل، وتصفية التواريخ وطرق الدفع
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D7C3A5] bg-[#FFF8EF] text-[#6F4E37] text-xs font-bold hover:bg-[#F5EFE6] transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>تصدير النتائج (Excel / CSV)</span>
            </button>
          </div>
        </div>

        {/* Enhanced Search and Date-Range Filter Component */}
        <OrderFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          startDate={startDate}
          endDate={endDate}
          datePreset={datePreset}
          onSelectDatePreset={handleSelectDatePreset}
          onCustomDateChange={handleCustomDateChange}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          paymentMethodFilter={paymentMethodFilter}
          onPaymentMethodFilterChange={setPaymentMethodFilter}
          onResetFilters={handleResetFilters}
          isFiltered={isFiltered}
          totalOrdersCount={orders.length}
          filteredOrdersCount={filteredOrders.length}
          filteredRevenue={filteredRevenue}
          currency={profile.currency}
        />
      </div>

      {/* Orders Table Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-2xl border border-[#E8DFD5] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5EFE6] text-[#3E2723] font-bold border-b border-[#E8DFD5] sticky top-0 z-10">
                <tr>
                  <th className="p-3">رقم الطلب (Order ID)</th>
                  <th className="p-3">نوع الطلب</th>
                  <th className="p-3">العميل / الطاولة</th>
                  <th className="p-3">الأصناف المطلوبة</th>
                  <th className="p-3">الكاشير</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">الإجمالي والضريبة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">تاريخ ووقت المعاملة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE6]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] flex items-center justify-center text-[#8B1E1E]">
                          <Search className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-sm text-[#231610]">
                          لا توجد معاملات مطابقة لمعايير البحث والتاريخ المحددة
                        </p>
                        <p className="text-xs text-gray-500 max-w-md">
                          جرب تغيير نطاق التاريخ، أو مسح نص البحث برقم الفاتورة واسم العميل للعثور على المعاملات.
                        </p>
                        {isFiltered && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 px-4 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-black shadow-xs hover:bg-[#721616] transition-colors"
                          >
                            إلغاء كافة الفلاتر وعرض الكل
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const itemCount = order.items.reduce((acc, i) => acc + i.quantity, 0);

                    return (
                      <tr key={order.id} className="hover:bg-[#FFF8EF] transition-colors">
                        {/* 1. Order ID */}
                        <td className="p-3">
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="font-extrabold text-[#8B1E1E] hover:underline flex items-center gap-1 text-xs sm:text-sm"
                          >
                            <span>{order.orderNumber}</span>
                          </button>
                          <div className="text-[10px] text-gray-400 font-mono truncate max-w-[100px]">
                            {order.id}
                          </div>
                        </td>

                        {/* 2. Type */}
                        <td className="p-3">
                          <span className="font-bold text-[#3E2723] px-2 py-0.5 rounded-lg bg-gray-100 text-[11px]">
                            {getOrderTypeName(order.type)}
                          </span>
                        </td>

                        {/* 3. Customer / Table */}
                        <td className="p-3 font-semibold text-[#231610]">
                          {order.tableNumber ? (
                            <span className="font-extrabold text-[#8B1E1E]">
                              {order.tableNumber}
                            </span>
                          ) : order.customerName ? (
                            <div>
                              <div className="font-bold">{order.customerName}</div>
                              {order.customerPhone && (
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {order.customerPhone}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">زبون عام</span>
                          )}
                        </td>

                        {/* 4. Items summary */}
                        <td className="p-3 text-[#5C4033]">
                          <span className="font-extrabold text-[#231610] tabular-nums">
                            {itemCount}
                          </span>{' '}
                          عنصر
                          <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                            {order.items.map((i) => i.productNameAr).join('، ')}
                          </div>
                        </td>

                        {/* 5. Cashier */}
                        <td className="p-3 text-gray-700 font-medium">
                          {order.cashierName || 'الكاشير'}
                        </td>

                        {/* 6. Payment methods */}
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {order.payments && order.payments.length > 0 ? (
                              order.payments.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-700"
                                >
                                  {p.method === 'cash' ? (
                                    <Banknote className="w-3 h-3 text-emerald-600" />
                                  ) : p.method === 'card' ? (
                                    <CreditCard className="w-3 h-3 text-blue-600" />
                                  ) : null}
                                  <span>{p.method === 'cash' ? 'نقدي' : p.method === 'card' ? 'بطاقة' : 'إلكتروني'}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-[10px]">نقدي</span>
                            )}
                          </div>
                        </td>

                        {/* 7. Total & Tax */}
                        <td className="p-3">
                          <div className="font-black text-[#8B1E1E] text-xs sm:text-sm tabular-nums">
                            {order.total.toFixed(2)} {profile.currency}
                          </div>
                          {order.taxAmount > 0 && (
                            <div className="text-[10px] text-gray-500">
                              ضريبة: {order.taxAmount.toFixed(2)} {profile.currency}
                            </div>
                          )}
                        </td>

                        {/* 8. Status */}
                        <td className="p-3">{getStatusBadge(order.status)}</td>

                        {/* 9. Date & Time */}
                        <td className="p-3 text-gray-600 text-[11px] tabular-nums whitespace-nowrap">
                          <div className="font-bold text-[#231610]">
                            {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </div>
                        </td>

                        {/* 10. Actions */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedOrderDetails(order)}
                              className="p-1.5 rounded-lg bg-[#F5EFE6] text-[#6F4E37] hover:bg-[#8B1E1E] hover:text-white transition-colors"
                              title="عرض تفاصيل الطلب كاملة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => viewReceiptForOrder(order)}
                              className="p-1.5 rounded-lg bg-[#F5EFE6] text-[#8B1E1E] hover:bg-[#8B1E1E] hover:text-white transition-colors"
                              title="طباعة الفاتورة الحرارية (80mm)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {hasPermission('admin') && (
                              <button
                                onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                title="حذف الطلب نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl border border-[#E8DFD5] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E8DD]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#231610]">
                    تفاصيل المعاملة: {selectedOrderDetails.orderNumber}
                  </h3>
                  <div className="text-xs text-gray-500">
                    {new Date(selectedOrderDetails.createdAt).toLocaleString('ar-EG')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-[#FBF9F6] p-3 rounded-2xl border border-[#E8DFD5]">
              <div>
                <span className="text-gray-500">نوع الطلب: </span>
                <span className="font-extrabold text-[#231610]">
                  {getOrderTypeName(selectedOrderDetails.type)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">الكاشير: </span>
                <span className="font-bold text-[#231610]">
                  {selectedOrderDetails.cashierName || 'غير محدد'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">العميل / الطاولة: </span>
                <span className="font-bold text-[#8B1E1E]">
                  {selectedOrderDetails.tableNumber || selectedOrderDetails.customerName || 'عام'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">الحالة: </span>
                <span>{getStatusBadge(selectedOrderDetails.status)}</span>
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[#231610] flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-[#8B1E1E]" />
                <span>قائمة الوجبات والأصناف المطلوبة</span>
              </h4>
              <div className="border border-[#E8DFD5] rounded-2xl overflow-hidden divide-y divide-[#F5EFE6] text-xs">
                {selectedOrderDetails.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-[#231610]">
                        {item.quantity} × {item.productNameAr}
                      </div>
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <div className="text-[11px] text-[#7A6455]">
                          {item.selectedModifiers.map((m) => m.nameAr).join('، ')}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] text-amber-800 italic">
                          ملاحظة: {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="font-black text-[#8B1E1E] tabular-nums">
                      {item.itemTotal.toFixed(2)} {profile.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#D7C3A5] space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span className="font-bold tabular-nums">
                  {selectedOrderDetails.subtotal.toFixed(2)} {profile.currency}
                </span>
              </div>
              {selectedOrderDetails.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>الخصم الممنوح:</span>
                  <span className="font-bold tabular-nums">
                    -{selectedOrderDetails.discountAmount.toFixed(2)} {profile.currency}
                  </span>
                </div>
              )}
              {selectedOrderDetails.taxAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>ضريبة القيمة المضافة ({selectedOrderDetails.taxPercent || 14}%):</span>
                  <span className="font-bold tabular-nums">
                    +{selectedOrderDetails.taxAmount.toFixed(2)} {profile.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-[#8B1E1E] pt-1.5 border-t border-[#D7C3A5]/60">
                <span>الإجمالي النهائي:</span>
                <span className="tabular-nums">
                  {selectedOrderDetails.total.toFixed(2)} {profile.currency}
                </span>
              </div>
            </div>

            {/* Status quick actions */}
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>تحديث حالة الطلب:</span>
                <span className="text-[11px] text-gray-500">حفظ تلقائي وفوري</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as Order['status'][]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleUpdateOrderStatus(selectedOrderDetails.id, st)}
                    className={`py-1.5 px-2 rounded-xl text-center font-bold text-[11px] transition-all border ${
                      selectedOrderDetails.status === st
                        ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#8B1E1E]'
                    }`}
                  >
                    {st === 'confirmed'
                      ? 'مؤكد'
                      : st === 'preparing'
                      ? 'قيد التحضير'
                      : st === 'ready'
                      ? 'جاهز'
                      : st === 'completed'
                      ? 'مكتمل'
                      : 'ملغي'}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {hasPermission('admin') && (
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteOrder(selectedOrderDetails.id, selectedOrderDetails.orderNumber)
                  }
                  className="px-3 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  title="حذف هذا الطلب"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#D7C3A5] text-[#6F4E37] text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  viewReceiptForOrder(selectedOrderDetails);
                  setSelectedOrderDetails(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-black hover:bg-[#721616] transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Order Modal */}
      <ConfirmModal
        isOpen={!!deletingOrder}
        title="تأكيد حذف الطلب"
        message="هل أنت متأكد من حذف هذا الطلب نهائياً من قاعدة البيانات؟ تنبيه: هذه العملية ستلغي المعاملة من سجل المبيعات."
        itemName={deletingOrder ? `طلب رقم: ${deletingOrder.orderNumber}` : undefined}
        confirmText="حذف الطلب نهائياً"
        onConfirm={handleConfirmDeleteOrder}
        onClose={() => setDeletingOrder(null)}
      />
    </div>
  );
};
