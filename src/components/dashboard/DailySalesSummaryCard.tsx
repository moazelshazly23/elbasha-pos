import React, { useState } from 'react';
import {
  DollarSign,
  Receipt,
  FileSpreadsheet,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Store,
  Bike,
  UtensilsCrossed,
  ArrowUpRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { Order, Shift, RestaurantProfile } from '../../types';
import { printShiftXReport, ShiftReportData } from '../../utils/thermalPrinter';

interface DailySalesSummaryCardProps {
  activeShift: Shift | null;
  orders: Order[];
  profile: RestaurantProfile;
  branchName: string;
  onOpenShiftModal: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const DailySalesSummaryCard: React.FC<DailySalesSummaryCardProps> = ({
  activeShift,
  orders,
  profile,
  branchName,
  onOpenShiftModal,
  onNavigateToTab,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // If no shift is active
  if (!activeShift) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-dashed border-amber-300 bg-linear-to-br from-amber-50/50 to-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#231610]">
                  تقرير ملخص المبيعات اليومي (Daily Sales Summary)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                  الوردية مغلقة
                </span>
              </div>
              <p className="text-xs text-[#7A6455] mt-0.5">
                لا توجد وردية كاشير نشطة حالياً لحساب إجمالي المبيعات والضرائب الخاصة بها.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenShiftModal}
            className="px-5 py-2.5 rounded-xl bg-[#8B1E1E] hover:bg-[#721616] text-white text-xs font-black shadow-md transition-all flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>فتح وردية جديدة وبدء البيع</span>
          </button>
        </div>
      </div>
    );
  }

  // 1. Filter orders belonging to the current active shift
  const shiftStartTime = new Date(activeShift.startTime).getTime();
  const shiftEndTime = activeShift.endTime ? new Date(activeShift.endTime).getTime() : Infinity;

  const shiftOrders = orders.filter((o) => {
    if (o.status === 'cancelled') return false;
    const orderTime = new Date(o.createdAt).getTime();
    const inRange = orderTime >= shiftStartTime && orderTime <= shiftEndTime;
    const matchBranch = !o.branchId || !activeShift.branchId || o.branchId === activeShift.branchId;
    return inRange && matchBranch;
  });

  // 2. Calculations for Core Metrics
  const totalRevenue = shiftOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const taxCollected = shiftOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
  const orderCount = shiftOrders.length;

  // 3. Additional deep-dive calculations
  const netSales = shiftOrders.reduce(
    (sum, o) => sum + ((o.subtotal || 0) - (o.discountAmount || 0)),
    0
  );
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  // Payment Breakdown
  let cashSales = 0;
  let cardSales = 0;
  let otherSales = 0;

  shiftOrders.forEach((order) => {
    if (order.payments && order.payments.length > 0) {
      order.payments.forEach((p) => {
        if (p.method === 'cash') cashSales += p.amount;
        else if (p.method === 'card') cardSales += p.amount;
        else otherSales += p.amount;
      });
    } else {
      // Fallback
      cashSales += order.total;
    }
  });

  // Order Channels
  const dineInOrders = shiftOrders.filter((o) => o.type === 'dine_in');
  const takeawayOrders = shiftOrders.filter((o) => o.type === 'takeaway');
  const deliveryOrders = shiftOrders.filter((o) => o.type === 'delivery' || o.type === 'pickup');

  const dineInTotal = dineInOrders.reduce((sum, o) => sum + o.total, 0);
  const takeawayTotal = takeawayOrders.reduce((sum, o) => sum + o.total, 0);
  const deliveryTotal = deliveryOrders.reduce((sum, o) => sum + o.total, 0);

  // Shift Drawer Cash reconciliation
  const startingCash = activeShift.startingCash || 0;
  const drawerExpenses = activeShift.expenses || 0;
  const expectedCashInDrawer = Number((startingCash + cashSales - drawerExpenses).toFixed(2));

  // Time elapsed in shift
  const elapsedMs = Date.now() - shiftStartTime;
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

  // Handle thermal print
  const handlePrintReport = async () => {
    setIsPrinting(true);
    const reportData: ShiftReportData = {
      shift: activeShift,
      branchName,
      totalRevenue,
      taxCollected,
      orderCount,
      netSales,
      avgOrderValue,
      cashSales,
      cardSales,
      otherSales,
      expenses: drawerExpenses,
      startingCash,
      expectedCash: expectedCashInDrawer,
      dineInSales: { count: dineInOrders.length, total: dineInTotal },
      takeawaySales: { count: takeawayOrders.length, total: takeawayTotal },
      deliverySales: { count: deliveryOrders.length, total: deliveryTotal },
    };

    await printShiftXReport(reportData, profile);
    setIsPrinting(false);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E8DFD5] shadow-xs space-y-5 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#F0E8DD]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center shadow-2xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base text-[#231610]">
                ملخص المبيعات اليومي للوردية الحالية
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                وردية نشطة ومباشرة
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#7A6455] mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#8B1E1E]" />
                الكاشير: <strong className="text-[#231610]">{activeShift.userName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#8B1E1E]" />
                بدأت منذ: <strong className="text-[#231610]">{elapsedHours > 0 ? `${elapsedHours} ساعة و ` : ''}{elapsedMinutes} دقيقة</strong>
              </span>
              <span>•</span>
              <span>{branchName}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handlePrintReport}
            disabled={isPrinting}
            title="طباعة إيصال تقرير الوردية الحراري (X-Report 80mm)"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FBF9F6] hover:bg-[#F5EFE6] border border-[#E8DFD5] text-[#231610] text-xs font-bold transition-all shadow-2xs active:scale-95"
          >
            <Printer className="w-4 h-4 text-[#8B1E1E]" />
            <span>{isPrinting ? 'جارِ الطباعة...' : 'طباعة التقرير (80mm)'}</span>
          </button>

          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] hover:bg-[#721616] text-white text-xs font-black transition-all shadow-2xs active:scale-95"
          >
            <Clock className="w-4 h-4" />
            <span>إدارة الوردية</span>
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title={showDetails ? 'طي التفاصيل' : 'عرض التفاصيل'}
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3 Core Highlight KPI Cards (Total Revenue, Tax Collected, Number of Orders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Total Revenue */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#FFF8EF] to-white border-2 border-[#D7C3A5]/60 shadow-xs">
          <div className="flex items-center justify-between text-[#7A6455] mb-2">
            <span className="text-xs font-black tracking-wide">إجمالي الإيرادات (Total Revenue)</span>
            <div className="p-2 rounded-xl bg-[#8B1E1E]/10 text-[#8B1E1E]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="text-3xl font-black text-[#8B1E1E] tabular-nums tracking-tight">
            {totalRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-bold text-[#7A6455] mr-1.5">{profile.currency}</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#E8DFD5]/60 flex items-center justify-between text-[11px] text-[#7A6455]">
            <span>صافي المبيعات (قبل الضريبة):</span>
            <strong className="text-[#231610] font-black tabular-nums">
              {netSales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {profile.currency}
            </strong>
          </div>
        </div>

        {/* 2. Tax Collected */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#FFFBF2] to-white border-2 border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-900 mb-2">
            <span className="text-xs font-black tracking-wide">ضريبة القيمة المضافة (Tax Collected)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
              <Percent className="w-5 h-5" />
            </div>
          </div>

          <div className="text-3xl font-black text-amber-800 tabular-nums tracking-tight">
            {taxCollected.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-bold text-amber-700 mr-1.5">{profile.currency}</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-900">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>مطابق للفاتورة الإلكترونية ({profile.defaultTaxPercent || 14}%)</span>
            </span>
            <strong className="text-amber-950 font-black tabular-nums">
              {totalRevenue > 0 ? ((taxCollected / totalRevenue) * 100).toFixed(1) : '0.0'}%
            </strong>
          </div>
        </div>

        {/* 3. Number of Orders */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#F5F8F4] to-white border-2 border-[#3F532B]/30 shadow-xs">
          <div className="flex items-center justify-between text-[#3F532B] mb-2">
            <span className="text-xs font-black tracking-wide">عدد الطلبات (Number of Orders)</span>
            <div className="p-2 rounded-xl bg-[#3F532B]/10 text-[#3F532B]">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="text-3xl font-black text-[#2A3B1B] tabular-nums tracking-tight">
            {orderCount}
            <span className="text-xs font-bold text-[#3F532B] mr-1.5">طلب منجز</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#3F532B]/20 flex items-center justify-between text-[11px] text-[#3F532B]">
            <span>متوسط قيمة الفاتورة (AOV):</span>
            <strong className="text-[#2A3B1B] font-black tabular-nums">
              {avgOrderValue.toFixed(2)} {profile.currency}
            </strong>
          </div>
        </div>
      </div>

      {/* Deep-Dive Breakdown (Payment Methods, Cash Drawer, Channels) */}
      {showDetails && (
        <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#F0E8DD]">
          {/* Payment Methods */}
          <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-[#E8DFD5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#231610] flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#8B1E1E]" />
                <span>توزيع طرق الدفع</span>
              </span>
              <span className="text-[10px] text-gray-500 font-bold">الوردية الحالية</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-600">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>نقدي (Cash)</span>
                </span>
                <span className="font-extrabold text-[#231610] tabular-nums">
                  {cashSales.toFixed(2)} {profile.currency}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-600">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>بطاقة / شبكة (Card)</span>
                </span>
                <span className="font-extrabold text-[#231610] tabular-nums">
                  {cardSales.toFixed(2)} {profile.currency}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-600">
                  <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                  <span>انستاباي / أخرى</span>
                </span>
                <span className="font-extrabold text-[#231610] tabular-nums">
                  {otherSales.toFixed(2)} {profile.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Cash Drawer Status */}
          <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-[#E8DFD5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#231610] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span>حركة صندوق النقدية</span>
              </span>
              <span className="text-[10px] text-gray-500 font-bold">مطابقة الدرج</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>العهدة الافتتاحية:</span>
                <span className="font-bold text-[#231610] tabular-nums">
                  {startingCash.toFixed(2)} {profile.currency}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>المقبوضات النقدية:</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  +{cashSales.toFixed(2)} {profile.currency}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>مصروفات من الدرج:</span>
                <span className="font-bold text-red-600 tabular-nums">
                  -{drawerExpenses.toFixed(2)} {profile.currency}
                </span>
              </div>

              <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between font-black text-[#231610]">
                <span>النقد المتوقع بالدرج:</span>
                <span className="text-sm text-emerald-800 tabular-nums">
                  {expectedCashInDrawer.toFixed(2)} {profile.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Sales Channels */}
          <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-[#E8DFD5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#231610] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[#B8860B]" />
                <span>قنوات البيع بالوردية</span>
              </span>
              <button
                onClick={() => onNavigateToTab('orders')}
                className="text-[10px] text-[#8B1E1E] font-bold hover:underline flex items-center gap-0.5"
              >
                <span>سجل الطلبات</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-600">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#8B1E1E]" />
                  <span>صالات ({dineInOrders.length}):</span>
                </span>
                <span className="font-extrabold text-[#231610] tabular-nums">
                  {dineInTotal.toFixed(2)} {profile.currency}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-600">
                  <Store className="w-3.5 h-3.5 text-amber-700" />
                  <span>سفري ({takeawayOrders.length}):</span>
                </span>
                <span className="font-extrabold text-[#231610] tabular-nums">
                  {takeawayTotal.toFixed(2)} {profile.currency}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-600">
                  <Bike className="w-3.5 h-3.5 text-blue-700" />
                  <span>توصيل ({deliveryOrders.length}):</span>
                </span>
                <span className="font-extrabold text-[#231610] tabular-nums">
                  {deliveryTotal.toFixed(2)} {profile.currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
