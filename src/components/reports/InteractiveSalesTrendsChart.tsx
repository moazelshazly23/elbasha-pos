import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  AreaChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Award,
  Layers,
  ChevronDown,
  Sparkles,
  BarChart3,
  Flame,
  ArrowUpRight,
  PieChart as PieIcon,
  Info,
} from 'lucide-react';
import { Order, RestaurantProfile, User } from '../../types';
import { posDb } from '../../services/db';

interface InteractiveSalesTrendsChartProps {
  orders: Order[];
  profile: RestaurantProfile;
  users?: User[];
}

export type TrendViewMode = 'daily' | 'monthly' | 'staff_comparison';
export type MetricType = 'revenue' | 'orders' | 'combined';

// Consistent and distinct color palette for staff members
const STAFF_COLORS = [
  '#8B1E1E', // El Basha Maroon
  '#C59A3F', // Gold
  '#2563EB', // Blue
  '#059669', // Emerald
  '#7C3AED', // Purple
  '#EA580C', // Orange
  '#0891B2', // Cyan
  '#DB2777', // Pink
];

const ARABIC_MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const ARABIC_DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const InteractiveSalesTrendsChart: React.FC<InteractiveSalesTrendsChartProps> = ({
  orders,
  profile,
  users: propUsers,
}) => {
  const users = useMemo(() => propUsers || posDb.getUsers(), [propUsers]);

  const [viewMode, setViewMode] = useState<TrendViewMode>('daily');
  const [metricType, setMetricType] = useState<MetricType>('combined');
  const [showStaffOverlay, setShowStaffOverlay] = useState<boolean>(true);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');

  // 1. Map of Staff Members
  const staffList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();

    // Add registered active users
    users
      .filter((u) => u.active)
      .forEach((u, idx) => {
        map.set(u.id, {
          id: u.id,
          name: u.name,
          color: STAFF_COLORS[idx % STAFF_COLORS.length],
        });
      });

    // Also include any cashier from orders if not in users
    orders.forEach((o) => {
      if (o.cashierId && !map.has(o.cashierId)) {
        const nextColor = STAFF_COLORS[map.size % STAFF_COLORS.length];
        map.set(o.cashierId, {
          id: o.cashierId,
          name: o.cashierName || 'كاشير',
          color: nextColor,
        });
      }
    });

    return Array.from(map.values());
  }, [users, orders]);

  // Filter orders by selected staff if any
  const filteredOrders = useMemo(() => {
    if (selectedStaffFilter === 'all') return orders;
    return orders.filter(
      (o) => o.cashierId === selectedStaffFilter || o.cashierName === selectedStaffFilter
    );
  }, [orders, selectedStaffFilter]);

  // 2. DAILY TRENDS DATA (Past 14 days)
  const dailyData = useMemo(() => {
    const days: any[] = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = ARABIC_DAY_NAMES[d.getDay()];
      const shortDate = `${d.getDate()}/${d.getMonth() + 1}`;

      const daysOrders = filteredOrders.filter(
        (o) => o.createdAt && o.createdAt.startsWith(dateStr)
      );

      const totalRevenue = daysOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const ordersCount = daysOrders.length;
      const averageTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

      const row: any = {
        key: dateStr,
        label: `${dayName} (${shortDate})`,
        shortLabel: shortDate,
        dayName,
        dateStr,
        totalRevenue: Math.round(totalRevenue),
        ordersCount,
        averageTicket: Math.round(averageTicket),
      };

      // Add breakdown by each staff member
      staffList.forEach((staff) => {
        const staffOrders = daysOrders.filter(
          (o) => o.cashierId === staff.id || o.cashierName === staff.name
        );
        const staffRev = staffOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        row[`staff_${staff.id}_rev`] = Math.round(staffRev);
        row[`staff_${staff.id}_orders`] = staffOrders.length;
      });

      days.push(row);
    }
    return days;
  }, [filteredOrders, staffList]);

  // 3. MONTHLY TRENDS DATA (Past 6 Months)
  const monthlyData = useMemo(() => {
    const months: any[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const monthLabel = `${ARABIC_MONTH_NAMES[monthIndex]} ${year}`;

      const monthsOrders = filteredOrders.filter(
        (o) => o.createdAt && o.createdAt.startsWith(monthPrefix)
      );

      const totalRevenue = monthsOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const ordersCount = monthsOrders.length;
      const averageTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

      const row: any = {
        key: monthPrefix,
        label: monthLabel,
        monthName: ARABIC_MONTH_NAMES[monthIndex],
        year,
        totalRevenue: Math.round(totalRevenue),
        ordersCount,
        averageTicket: Math.round(averageTicket),
      };

      staffList.forEach((staff) => {
        const staffOrders = monthsOrders.filter(
          (o) => o.cashierId === staff.id || o.cashierName === staff.name
        );
        const staffRev = staffOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        row[`staff_${staff.id}_rev`] = Math.round(staffRev);
        row[`staff_${staff.id}_orders`] = staffOrders.length;
      });

      months.push(row);
    }
    return months;
  }, [filteredOrders, staffList]);

  // 4. STAFF PERFORMANCE COMPARISON DATA
  const staffComparisonData = useMemo(() => {
    const totalRestaurantRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalRestaurantOrders = orders.length;

    return staffList.map((staff) => {
      const staffOrders = orders.filter(
        (o) => o.cashierId === staff.id || o.cashierName === staff.name
      );
      const revenue = staffOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const count = staffOrders.length;
      const avgTicket = count > 0 ? revenue / count : 0;
      const revenueShare =
        totalRestaurantRevenue > 0 ? (revenue / totalRestaurantRevenue) * 100 : 0;
      const ordersShare =
        totalRestaurantOrders > 0 ? (count / totalRestaurantOrders) * 100 : 0;

      return {
        id: staff.id,
        name: staff.name,
        color: staff.color,
        revenue: Math.round(revenue),
        ordersCount: count,
        avgTicket: Math.round(avgTicket),
        revenueShare: Number(revenueShare.toFixed(1)),
        ordersShare: Number(ordersShare.toFixed(1)),
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [orders, staffList]);

  // Summary Metrics
  const activeDataset = viewMode === 'daily' ? dailyData : monthlyData;
  const highestPeriod = useMemo(() => {
    if (activeDataset.length === 0) return null;
    return [...activeDataset].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
  }, [activeDataset]);

  const topStaffMember = staffComparisonData[0];

  // Custom Rich Tooltip
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = payload[0]?.payload;
    if (!dataItem) return null;

    return (
      <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-[#D7C3A5] text-xs text-[#231610] space-y-2 min-w-[210px] text-right font-sans">
        <div className="border-b border-[#F0E8DD] pb-1.5 flex items-center justify-between">
          <strong className="text-sm font-black text-[#8B1E1E]">
            {dataItem.label || dataItem.name}
          </strong>
          {dataItem.dateStr && (
            <span className="text-[10px] text-[#7A6455] font-mono">{dataItem.dateStr}</span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[#7A6455]">إجمالي المبيعات:</span>
            <strong className="text-sm font-black text-[#231610] tabular-nums">
              {(dataItem.totalRevenue ?? dataItem.revenue ?? 0).toLocaleString('ar-EG')}{' '}
              {profile.currency}
            </strong>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#7A6455]">عدد الطلبات:</span>
            <strong className="font-bold text-[#8B1E1E] tabular-nums">
              {dataItem.ordersCount ?? 0} طلب
            </strong>
          </div>

          {(dataItem.averageTicket ?? dataItem.avgTicket) !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-[#7A6455]">متوسط الفاتورة:</span>
              <strong className="font-bold text-[#6F4E37] tabular-nums">
                {(dataItem.averageTicket ?? dataItem.avgTicket ?? 0).toLocaleString('ar-EG')}{' '}
                {profile.currency}
              </strong>
            </div>
          )}
        </div>

        {/* Staff Breakdown in daily/monthly views */}
        {showStaffOverlay && viewMode !== 'staff_comparison' && staffList.length > 0 && (
          <div className="pt-2 border-t border-[#F0E8DD] space-y-1.5">
            <span className="text-[11px] font-extrabold text-[#7A6455] block">
              مساهمة الكاشير والموظفين:
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
              {staffList.map((staff) => {
                const staffRev = dataItem[`staff_${staff.id}_rev`] || 0;
                const staffOrders = dataItem[`staff_${staff.id}_orders`] || 0;
                if (staffRev === 0 && staffOrders === 0) return null;

                return (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between text-[11px] bg-[#FAF7F2] px-2 py-1 rounded-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: staff.color }}
                      />
                      <span className="font-bold text-[#231610] truncate max-w-[90px]">
                        {staff.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#8B1E1E] tabular-nums">
                      {staffRev.toLocaleString('ar-EG')} {profile.currency}{' '}
                      <span className="text-[10px] text-gray-500">({staffOrders})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8DFD5] shadow-xs space-y-5">
      {/* Top Header & View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8DFD5] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center shadow-2xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-[#231610]">
                الرسم البياني التفاعلي للمبيعات ومقارنة أداء الموظفين
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] text-[10px] font-black">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-[#7A6455] mt-0.5">
              تحليل اتجاهات المبيعات اليومية والشهرية وربطها بإنتاجية كل كاشير وموظف
            </p>
          </div>
        </div>

        {/* View Switchers & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E8DFD5] text-xs">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              يومي (14 يوم)
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              شهري (6 شهور)
            </button>
            <button
              onClick={() => setViewMode('staff_comparison')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'staff_comparison'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              مقارنة الموظفين
            </button>
          </div>

          {/* Metric Selector (Only in daily/monthly) */}
          {viewMode !== 'staff_comparison' && (
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E8DFD5] text-xs">
              <button
                onClick={() => setMetricType('combined')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricType === 'combined'
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : 'text-[#7A6455]'
                }`}
              >
                مزدوج (مبيعات + طلبات)
              </button>
              <button
                onClick={() => setMetricType('revenue')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricType === 'revenue'
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : 'text-[#7A6455]'
                }`}
              >
                المبيعات
              </button>
              <button
                onClick={() => setMetricType('orders')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricType === 'orders'
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : 'text-[#7A6455]'
                }`}
              >
                الطلبات
              </button>
            </div>
          )}

          {/* Staff Filter Selector */}
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl border border-[#E8DFD5] text-xs">
            <Users className="w-3.5 h-3.5 text-[#8B1E1E]" />
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="bg-transparent font-bold text-[#8B1E1E] outline-hidden cursor-pointer"
            >
              <option value="all">كافة الموظفين</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD5]">
          <div className="flex items-center justify-between text-[#7A6455] mb-1">
            <span className="font-bold">أعلى فترة مبيعاً</span>
            <Flame className="w-4 h-4 text-[#8B1E1E]" />
          </div>
          <div className="text-base font-black text-[#8B1E1E] truncate">
            {highestPeriod ? highestPeriod.label : '—'}
          </div>
          <span className="text-[10px] text-[#7A6455] block mt-0.5">
            {highestPeriod
              ? `${highestPeriod.totalRevenue.toLocaleString('ar-EG')} ${profile.currency}`
              : '—'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD5]">
          <div className="flex items-center justify-between text-[#7A6455] mb-1">
            <span className="font-bold">الموظف الأكثر إيراداً</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base font-black text-[#231610] truncate">
            {topStaffMember ? topStaffMember.name : '—'}
          </div>
          <span className="text-[10px] text-emerald-800 font-bold block mt-0.5">
            {topStaffMember
              ? `${topStaffMember.revenue.toLocaleString('ar-EG')} ${profile.currency} (${topStaffMember.revenueShare}%)`
              : '—'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD5]">
          <div className="flex items-center justify-between text-[#7A6455] mb-1">
            <span className="font-bold">متوسط الفاتورة</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-black text-[#231610] tabular-nums">
            {(orders.length > 0
              ? orders.reduce((s, o) => s + (o.total || 0), 0) / orders.length
              : 0
            ).toFixed(1)}{' '}
            {profile.currency}
          </div>
          <span className="text-[10px] text-[#7A6455] block mt-0.5">
            على إجمالي {orders.length} طلب
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD5] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7A6455]">
            <span className="font-bold">مساهمة الكاشير</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={showStaffOverlay}
              onChange={(e) => setShowStaffOverlay(e.target.checked)}
              className="w-4 h-4 accent-[#8B1E1E] cursor-pointer"
            />
            <span className="text-xs font-bold text-[#231610]">إظهار أعمدة الموظفين</span>
          </label>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-[#FCFAF7] p-3 sm:p-4 rounded-2xl border border-[#E8DFD5] space-y-3">
        {/* Chart Header & Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#231610]">
              {viewMode === 'daily'
                ? 'مخطط حركة المبيعات اليومية ومساهمات الطاقم'
                : viewMode === 'monthly'
                ? 'مخطط اتجاهات المبيعات الشهرية المقارنة'
                : 'مقارنة إنتاجية الموظفين والكاشير التراكمية'}
            </span>
            <span className="text-[11px] text-[#7A6455]">({profile.currency})</span>
          </div>

          {/* Dynamic Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-[#8B1E1E]" />
              <span className="font-bold text-[#231610]">إجمالي المبيعات</span>
            </div>
            {metricType === 'combined' && viewMode !== 'staff_comparison' && (
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 bg-[#C59A3F] rounded-full" />
                <span className="font-bold text-[#C59A3F]">عدد الطلبات</span>
              </div>
            )}
            {showStaffOverlay &&
              viewMode !== 'staff_comparison' &&
              staffList.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-[#6F4E37]">{s.name}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'staff_comparison' ? (
              // 1. STAFF COMPARISON BAR CHART
              <BarChart
                data={staffComparisonData}
                margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DFD5" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#7A6455"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#7A6455"
                  fontSize={11}
                  tickFormatter={(val) => `${val}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#C59A3F"
                  fontSize={11}
                  tickFormatter={(val) => `${val} ط`}
                />
                <Tooltip content={renderCustomTooltip} />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="المبيعات"
                  radius={[8, 8, 0, 0]}
                  fill="#8B1E1E"
                />
                <Bar
                  yAxisId="right"
                  dataKey="ordersCount"
                  name="الطلبات"
                  radius={[8, 8, 0, 0]}
                  fill="#C59A3F"
                />
              </BarChart>
            ) : (
              // 2. DAILY OR MONTHLY COMPOSED/AREA CHART
              <ComposedChart
                data={activeDataset}
                margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B1E1E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8B1E1E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DFD5" vertical={false} />
                <XAxis
                  dataKey={viewMode === 'daily' ? 'shortLabel' : 'monthName'}
                  stroke="#7A6455"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  stroke="#7A6455"
                  fontSize={11}
                  tickFormatter={(val) => `${val}`}
                />
                {metricType === 'combined' && (
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    stroke="#C59A3F"
                    fontSize={11}
                    tickFormatter={(val) => `${val} ط`}
                  />
                )}
                <Tooltip content={renderCustomTooltip} />

                {/* Primary Revenue Area */}
                {(metricType === 'revenue' || metricType === 'combined') && (
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="totalRevenue"
                    name="إجمالي المبيعات"
                    stroke="#8B1E1E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                )}

                {/* Staff overlay stacked bars */}
                {showStaffOverlay &&
                  staffList.map((staff) => (
                    <Bar
                      key={staff.id}
                      yAxisId="revenue"
                      dataKey={`staff_${staff.id}_rev`}
                      name={staff.name}
                      stackId="staffRevenue"
                      fill={staff.color}
                      opacity={0.85}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}

                {/* Secondary Orders Line */}
                {(metricType === 'orders' || metricType === 'combined') && (
                  <Line
                    yAxisId={metricType === 'combined' ? 'orders' : 'revenue'}
                    type="monotone"
                    dataKey="ordersCount"
                    name="عدد الطلبات"
                    stroke="#C59A3F"
                    strokeWidth={2.5}
                    dot={{ fill: '#C59A3F', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff Comparative Performance Summary Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#231610]">
            كشف مقارنة ومساهمة الموظفين في المبيعات ({staffComparisonData.length})
          </span>
          <span className="text-[#7A6455]">
            النسبة المئوية من إجمالي مبيعات المطعم
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8DFD5]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E8DFD5] text-[#6F4E37] font-bold">
              <tr>
                <th className="p-3">اسم الموظف / الكاشير</th>
                <th className="p-3 text-center">الطلبات المنجزة</th>
                <th className="p-3 text-center">حصة الطلبات</th>
                <th className="p-3 text-left">إجمالي المبيعات</th>
                <th className="p-3 text-center">حصة الإيراد</th>
                <th className="p-3 text-left">متوسط الفاتورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E8DD]">
              {staffComparisonData.map((staff, idx) => (
                <tr key={staff.id} className="hover:bg-[#FFF8EF]/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: staff.color }}
                      />
                      <span className="font-extrabold text-[#231610]">{staff.name}</span>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.2 rounded-sm bg-amber-100 text-amber-900 text-[10px] font-bold">
                          المتصدر 🥇
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center font-bold text-[#8B1E1E] tabular-nums">
                    {staff.ordersCount} طلب
                  </td>
                  <td className="p-3 text-center text-[#7A6455] tabular-nums">
                    {staff.ordersShare}%
                  </td>
                  <td className="p-3 text-left font-black text-[#231610] tabular-nums">
                    {staff.revenue.toLocaleString('ar-EG')} {profile.currency}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${staff.revenueShare}%`,
                            backgroundColor: staff.color,
                          }}
                        />
                      </div>
                      <span className="font-bold text-[#6F4E37] tabular-nums text-[11px]">
                        {staff.revenueShare}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-left font-mono font-bold text-[#7A6455] tabular-nums">
                    {staff.avgTicket.toLocaleString('ar-EG')} {profile.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
