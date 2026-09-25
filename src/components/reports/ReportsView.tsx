import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  FileSpreadsheet,
  Award,
  CreditCard,
  Banknote,
  Smartphone,
  PieChart,
  Calendar,
  Printer,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Order, Product, Expense } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { FinancialReportModal } from './FinancialReportModal';
import {
  triggerFinancialReportPrint,
  downloadFinancialReportHTML,
  FinancialReportData,
} from '../../utils/financialReportPDF';

type PeriodFilter = 'all' | 'today' | 'yesterday' | 'last7' | 'thisMonth';

export const ReportsView: React.FC = () => {
  const { profile } = useBrand();
  const [orders, setOrders] = useState<Order[]>(() => posDb.getOrders());
  const [products, setProducts] = useState<Product[]>(() => posDb.getProducts());
  const [expenses, setExpenses] = useState<Expense[]>(() => posDb.getExpenses());

  // Period Filter State
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDirectPrinting, setIsDirectPrinting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setOrders(posDb.getOrders());
      setProducts(posDb.getProducts());
      setExpenses(posDb.getExpenses());
    });
    return unsubscribe;
  }, []);

  // Filter orders by chosen period
  const { filteredOrders, periodLabel } = useMemo(() => {
    const now = new Date();

    const formatDateStr = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const todayStr = formatDateStr(now);

    if (selectedPeriod === 'all') {
      return { filteredOrders: orders, periodLabel: 'كافة الفترات المسجلة' };
    }

    if (selectedPeriod === 'today') {
      const filtered = orders.filter((o) => formatDateStr(new Date(o.createdAt)) === todayStr);
      return { filteredOrders: filtered, periodLabel: `اليوم (${todayStr})` };
    }

    if (selectedPeriod === 'yesterday') {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yStr = formatDateStr(yDate);
      const filtered = orders.filter((o) => formatDateStr(new Date(o.createdAt)) === yStr);
      return { filteredOrders: filtered, periodLabel: `أمس (${yStr})` };
    }

    if (selectedPeriod === 'last7') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      past.setHours(0, 0, 0, 0);
      const filtered = orders.filter((o) => new Date(o.createdAt).getTime() >= past.getTime());
      return { filteredOrders: filtered, periodLabel: 'آخر 7 أيام' };
    }

    if (selectedPeriod === 'thisMonth') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const filtered = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === y && d.getMonth() === m;
      });
      const monthName = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      return { filteredOrders: filtered, periodLabel: `شهر ${monthName}` };
    }

    return { filteredOrders: orders, periodLabel: 'كافة الفترات' };
  }, [orders, selectedPeriod]);

  // Financial aggregates on filtered orders
  const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
  const totalSubtotal = filteredOrders.reduce((acc, o) => acc + o.subtotal, 0);
  const totalTax = filteredOrders.reduce((acc, o) => acc + o.taxAmount, 0);
  const totalService = filteredOrders.reduce((acc, o) => acc + o.serviceChargeAmount, 0);
  const averageTicket =
    filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(2) : '0';

  // Cost & Profit estimate
  const totalCostEstimate = filteredOrders.reduce((acc, o) => {
    const orderCost = o.items.reduce(
      (itemAcc, item) => itemAcc + (item.costPrice || 0) * item.quantity,
      0
    );
    return acc + orderCost;
  }, 0);

  const grossProfitEstimate = totalSubtotal - totalCostEstimate;

  // Breakdown by Type
  const dineInCount = filteredOrders.filter((o) => o.type === 'dine_in').length;
  const takeawayCount = filteredOrders.filter((o) => o.type === 'takeaway').length;
  const deliveryCount = filteredOrders.filter((o) => o.type === 'delivery').length;
  const pickupCount = filteredOrders.filter((o) => o.type === 'pickup').length;

  // Breakdown by Payment
  let cashTotal = 0;
  let cardTotal = 0;
  let instapayTotal = 0;

  filteredOrders.forEach((o) => {
    o.payments.forEach((p) => {
      if (p.method === 'cash') cashTotal += p.amount;
      else if (p.method === 'card') cardTotal += p.amount;
      else if (p.method === 'instapay') instapayTotal += p.amount;
    });
  });

  // Top Selling Items
  const itemMap: Record<string, { name: string; count: number; revenue: number }> = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!itemMap[item.productId]) {
        itemMap[item.productId] = { name: item.productNameAr, count: 0, revenue: 0 };
      }
      itemMap[item.productId].count += item.quantity;
      itemMap[item.productId].revenue += item.itemTotal;
    });
  });

  const topItems = Object.values(itemMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Trigger Browser-Native Print for PDF Export
  const handleExportPDF = async () => {
    setIsDirectPrinting(true);
    setActionSuccessMsg(null);
    try {
      const reportData: FinancialReportData = {
        profile,
        orders: filteredOrders,
        expenses,
        periodLabel,
        generatedBy: 'مدير الفرع / المدير المالي',
      };
      await triggerFinancialReportPrint(reportData);
      setActionSuccessMsg('تم إطلاق أمر الطباعة/الحفظ كـ PDF للمستند بنجاح!');
      setTimeout(() => setActionSuccessMsg(null), 4500);
    } catch (err) {
      console.error('Failed to trigger PDF export:', err);
    } finally {
      setIsDirectPrinting(false);
    }
  };

  const exportSalesCSV = () => {
    const headers = [
      'رقم الطلب',
      'النوع',
      'الكاشير',
      'المجموع الفرعي',
      'الضريبة',
      'الخدمة',
      'الإجمالي',
      'التاريخ',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.type,
      o.cashierName,
      o.subtotal,
      o.taxAmount,
      o.serviceChargeAmount,
      o.total,
      o.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `sales_report_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.csv`
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
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#231610]">
                  مركز التقارير والتحليلات المالية
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] text-[10px] font-extrabold">
                  {periodLabel}
                </span>
              </div>
              <span className="text-xs text-[#7A6455]">
                مؤشرات المبيعات، تفصيل طرق الدفع، الأصناف الأكثر ربحية، وتصدير التقارير الرسمية
              </span>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Preview Modal Button */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D7C3A5] bg-[#FAF7F2] text-[#6F4E37] text-xs font-bold hover:bg-[#F0E8DD] transition-colors shadow-2xs"
              title="معاينة نموذج التقرير المالي الرسمي A4"
            >
              <Eye className="w-4 h-4 text-[#8B1E1E]" />
              <span>معاينة المستند</span>
            </button>

            {/* Export to PDF Button (Requested Feature) */}
            <button
              onClick={handleExportPDF}
              disabled={isDirectPrinting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-black hover:bg-[#721616] transition-all shadow-xs disabled:opacity-50"
              title="تصدير التقرير المالي وطباعته أو حفظه بتنسيق PDF"
            >
              <Printer className="w-4 h-4" />
              <span>{isDirectPrinting ? 'جاري التحضير...' : 'تصدير إلى PDF'}</span>
            </button>

            {/* CSV Export Button */}
            <button
              onClick={exportSalesCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D7C3A5] bg-[#FFF8EF] text-[#6F4E37] text-xs font-bold hover:bg-[#F5EFE6] transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Period Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0E8DD]">
          <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFD5] text-xs">
            <span className="px-2 text-[11px] font-bold text-[#7A6455] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#8B1E1E]" />
              <span>فترة التقرير:</span>
            </span>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedPeriod === 'all'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#3E2723] hover:bg-[#EAE0D2]'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setSelectedPeriod('today')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedPeriod === 'today'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#3E2723] hover:bg-[#EAE0D2]'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setSelectedPeriod('yesterday')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedPeriod === 'yesterday'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#3E2723] hover:bg-[#EAE0D2]'
              }`}
            >
              أمس
            </button>
            <button
              onClick={() => setSelectedPeriod('last7')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedPeriod === 'last7'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#3E2723] hover:bg-[#EAE0D2]'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => setSelectedPeriod('thisMonth')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedPeriod === 'thisMonth'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#3E2723] hover:bg-[#EAE0D2]'
              }`}
            >
              هذا الشهر
            </button>
          </div>

          <div className="text-xs text-[#7A6455]">
            عدد العمليات المحتسبة:{' '}
            <strong className="text-[#8B1E1E] font-black">{filteredOrders.length}</strong> طلب
          </div>
        </div>

        {/* Action feedback banner */}
        {actionSuccessMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button
              onClick={() => setActionSuccessMsg(null)}
              className="text-emerald-900 hover:text-emerald-950 font-black text-xs"
            >
              تم
            </button>
          </div>
        )}
      </div>

      {/* Analytics Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs">
            <span className="text-xs text-[#7A6455] font-semibold">إجمالي المبيعات المحققة</span>
            <div className="text-2xl font-black text-[#8B1E1E] tabular-nums mt-1">
              {totalRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {profile.currency}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">شامل الضريبة والخدمة</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs">
            <span className="text-xs text-[#7A6455] font-semibold">تقدير هامش الربح الإجمالي</span>
            <div className="text-2xl font-black text-emerald-700 tabular-nums mt-1">
              +{grossProfitEstimate.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
              {profile.currency}
            </div>
            <span className="text-[10px] text-emerald-800 mt-1 block font-bold">
              بعد خصم تكلفة المواد الخام
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs">
            <span className="text-xs text-[#7A6455] font-semibold">عدد الفواتير المنفذة</span>
            <div className="text-2xl font-black text-[#231610] tabular-nums mt-1">
              {filteredOrders.length} طلب
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">
              متوسط الفاتورة: {averageTicket} {profile.currency}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs">
            <span className="text-xs text-[#7A6455] font-semibold">
              ضريبة القيمة المضافة ({profile.defaultTaxPercent || 14}%)
            </span>
            <div className="text-2xl font-black text-[#B8860B] tabular-nums mt-1">
              {totalTax.toFixed(2)} {profile.currency}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">
              خدمة الصالة: {totalService.toFixed(2)} {profile.currency}
            </span>
          </div>
        </div>

        {/* Charts and Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payment Methods Breakdown */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-[#231610] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#8B1E1E]" />
              <span>تحصيل طرق الدفع (Cash & Digital)</span>
            </h3>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-700" />
                  <div>
                    <span className="font-bold text-xs text-emerald-950">
                      المدفوعات النقدية (Cash)
                    </span>
                    <span className="text-[10px] text-emerald-800 block">في درج الكاشير</span>
                  </div>
                </div>
                <span className="font-black text-sm text-emerald-900 tabular-nums">
                  {cashTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                  {profile.currency}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-700" />
                  <div>
                    <span className="font-bold text-xs text-blue-950">
                      بطاقات بنكية (Visa / POS)
                    </span>
                    <span className="text-[10px] text-blue-800 block">حساب البنك</span>
                  </div>
                </div>
                <span className="font-black text-sm text-blue-900 tabular-nums">
                  {cardTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                  {profile.currency}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-purple-700" />
                  <div>
                    <span className="font-bold text-xs text-purple-950">
                      إنستاباي ومحافظ إلكترونية (InstaPay)
                    </span>
                    <span className="text-[10px] text-purple-800 block">دفع لحظي</span>
                  </div>
                </div>
                <span className="font-black text-sm text-purple-900 tabular-nums">
                  {instapayTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                  {profile.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Top Selling Dishes */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-[#231610] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#B8860B]" />
              <span>الأصناف الأكثر مبيعاً وإيراداً</span>
            </h3>

            <div className="space-y-2 pt-1">
              {topItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-[#FBF9F6] border border-[#E8DFD5] rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#8B1E1E] text-white flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-extrabold text-[#231610]">{item.name}</span>
                      <span className="text-[10px] text-gray-500 block">
                        الكمية المباعة: <strong className="text-[#8B1E1E]">{item.count}</strong>
                      </span>
                    </div>
                  </div>

                  <span className="font-extrabold text-sm text-[#8B1E1E] tabular-nums">
                    {item.revenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                    {profile.currency}
                  </span>
                </div>
              ))}

              {topItems.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">
                  لا توجد مبيعات مسجلة في هذه الفترة لحساب الأكثر طلباً.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Types distribution */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs space-y-2">
          <h3 className="font-extrabold text-sm text-[#231610]">توزيع قنوات الطلبات</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D7C3A5]">
              <span className="text-xs text-[#7A6455]">صالات وداخلي</span>
              <div className="font-black text-lg text-[#8B1E1E] tabular-nums">{dineInCount}</div>
            </div>
            <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D7C3A5]">
              <span className="text-xs text-[#7A6455]">سفري وتيك أواي</span>
              <div className="font-black text-lg text-[#8B1E1E] tabular-nums">{takeawayCount}</div>
            </div>
            <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D7C3A5]">
              <span className="text-xs text-[#7A6455]">توصيل منازل</span>
              <div className="font-black text-lg text-[#8B1E1E] tabular-nums">{deliveryCount}</div>
            </div>
            <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D7C3A5]">
              <span className="text-xs text-[#7A6455]">استلام مسبق</span>
              <div className="font-black text-lg text-[#8B1E1E] tabular-nums">{pickupCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Export & Documentation Preview Modal */}
      <FinancialReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        orders={filteredOrders}
        expenses={expenses}
        profile={profile}
        periodLabel={periodLabel}
      />
    </div>
  );
};
