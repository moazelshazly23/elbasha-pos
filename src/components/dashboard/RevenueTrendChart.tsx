import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShoppingBag,
  Award,
} from 'lucide-react';
import { Order } from '../../types';

interface RevenueTrendChartProps {
  orders: Order[];
  currency: string;
  onNavigateToReports?: () => void;
}

interface DayData {
  dateStr: string;
  dayName: string;
  shortDate: string;
  dayLabel: string;
  fullDate: string;
  revenue: number;
  ordersCount: number;
  averageTicket: number;
  isToday: boolean;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  orders,
  currency,
  onNavigateToReports,
}) => {
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'orders'>('revenue');

  // Compute 7 days data series
  const { chartData, totalRevenue7d, totalOrders7d, avgDailyRevenue, peakDay, trendPercentage } =
    useMemo(() => {
      const days: DayData[] = [];
      const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

      // Today midnight anchor
      const now = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const shortDate = `${d.getDate()}/${d.getMonth() + 1}`;
        const dayName = i === 0 ? 'اليوم' : i === 1 ? 'أمس' : arabicDays[d.getDay()];

        // Filter orders for this calendar date (exclude cancelled)
        const dayOrders = orders.filter((o) => {
          if (o.status === 'cancelled') return false;
          const orderDate = new Date(o.createdAt);
          const oY = orderDate.getFullYear();
          const oM = String(orderDate.getMonth() + 1).padStart(2, '0');
          const oD = String(orderDate.getDate()).padStart(2, '0');
          return `${oY}-${oM}-${oD}` === dateStr;
        });

        const revenue = Number(dayOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2));
        const ordersCount = dayOrders.length;
        const averageTicket = ordersCount > 0 ? Number((revenue / ordersCount).toFixed(2)) : 0;

        days.push({
          dateStr,
          dayName,
          shortDate,
          dayLabel: `${dayName} (${shortDate})`,
          fullDate: d.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          revenue,
          ordersCount,
          averageTicket,
          isToday: i === 0,
        });
      }

      const totalRevenue7d = days.reduce((sum, d) => sum + d.revenue, 0);
      const totalOrders7d = days.reduce((sum, d) => sum + d.ordersCount, 0);
      const avgDailyRevenue = totalRevenue7d / 7;

      // Peak Day
      const peakDay = days.reduce(
        (max, curr) => (curr.revenue > max.revenue ? curr : max),
        days[0]
      );

      // Trend calculation: compare last 3 days vs previous 3 days
      const firstHalfRev = days.slice(0, 3).reduce((sum, d) => sum + d.revenue, 0);
      const secondHalfRev = days.slice(4, 7).reduce((sum, d) => sum + d.revenue, 0);
      const trendPercentage =
        firstHalfRev > 0 ? ((secondHalfRev - firstHalfRev) / firstHalfRev) * 100 : 0;

      return {
        chartData: days,
        totalRevenue7d,
        totalOrders7d,
        avgDailyRevenue,
        peakDay,
        trendPercentage,
      };
    }, [orders]);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayData = payload[0].payload;
      return (
        <div className="bg-[#231610] text-white p-3 rounded-2xl shadow-xl border border-[#D7C3A5]/40 text-xs min-w-[210px] space-y-1.5 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-extrabold text-amber-300">{data.fullDate}</span>
            {data.isToday && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black">
                اليوم
              </span>
            )}
          </div>

          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">إجمالي الإيرادات:</span>
              <span className="font-black text-white text-sm tabular-nums">
                {data.revenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                <span className="text-amber-300 text-[10px]">{currency}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-300">
              <span>عدد الطلبات:</span>
              <span className="font-bold text-white tabular-nums">{data.ordersCount} طلب</span>
            </div>

            {data.ordersCount > 0 && (
              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/10">
                <span>متوسط الفاتورة:</span>
                <span className="font-semibold text-amber-200 tabular-nums">
                  {data.averageTicket.toFixed(1)} {currency}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8DFD5] p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header & Metric Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center shadow-2xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-[#231610]">
                حركة الإيرادات والمبيعات (آخر 7 أيام)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-extrabold">
                <Sparkles className="w-3 h-3 text-[#B8860B]" />
                <span>تحليل اتجاه فوري</span>
              </span>
            </div>
            <p className="text-xs text-[#7A6455] mt-0.5">
              متابعة نمو المبيعات اليومية، ذروة الإيرادات، ومتوسط التحصيل المالي للكاشير والإدارة
            </p>
          </div>
        </div>

        {/* Metric Toggles */}
        <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFD5] text-xs self-stretch sm:self-auto">
          <button
            onClick={() => setActiveMetric('revenue')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-black transition-all ${
              activeMetric === 'revenue'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            الإيراد المالي ({currency})
          </button>
          <button
            onClick={() => setActiveMetric('orders')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-black transition-all ${
              activeMetric === 'orders'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            عدد الطلبات
          </button>
        </div>
      </div>

      {/* KPI Trend Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#FBF9F6] p-3.5 rounded-2xl border border-[#E8DFD5]">
        {/* Total 7d Revenue */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[#7A6455] flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#8B1E1E]" />
            <span>إجمالي إيراد 7 أيام</span>
          </span>
          <div className="text-base sm:text-lg font-black text-[#8B1E1E] tabular-nums">
            {totalRevenue7d.toLocaleString('ar-EG', { maximumFractionDigits: 1 })}{' '}
            <span className="text-xs font-bold text-gray-500">{currency}</span>
          </div>
        </div>

        {/* Daily Average */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[#7A6455] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>متوسط الإيراد اليومي</span>
          </span>
          <div className="text-base sm:text-lg font-black text-[#231610] tabular-nums">
            {avgDailyRevenue.toLocaleString('ar-EG', { maximumFractionDigits: 1 })}{' '}
            <span className="text-xs font-bold text-gray-500">{currency}</span>
          </div>
        </div>

        {/* Peak Day */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[#7A6455] flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>يوم ذروة المبيعات</span>
          </span>
          <div className="text-xs sm:text-sm font-extrabold text-[#231610] truncate">
            {peakDay ? `${peakDay.dayName} (${peakDay.shortDate})` : '---'}
          </div>
          <div className="text-[11px] font-bold text-emerald-700 tabular-nums">
            {peakDay ? `${peakDay.revenue.toLocaleString('ar-EG')} ${currency}` : ''}
          </div>
        </div>

        {/* Trend Growth % */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[#7A6455]">مؤشر الاتجاه العام</span>
          <div className="flex items-center gap-1.5">
            {trendPercentage >= 0 ? (
              <div className="inline-flex items-center gap-1 text-emerald-700 font-black text-xs sm:text-sm">
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                <span dir="ltr">+{trendPercentage.toFixed(1)}%</span>
                <span className="text-[10px] text-emerald-800 font-bold">صعود</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 text-red-600 font-black text-xs sm:text-sm">
                <ArrowDownRight className="w-4 h-4 stroke-[3]" />
                <span dir="ltr">{trendPercentage.toFixed(1)}%</span>
                <span className="text-[10px] text-red-700 font-bold">هبوط</span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400 block">مقارنة بأول الأسبوع</span>
        </div>
      </div>

      {/* Recharts Area / Line Chart */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B1E1E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8B1E1E" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B8860B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#B8860B" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#EFE7DD" vertical={false} />
            <XAxis
              dataKey="dayName"
              stroke="#7A6455"
              fontSize={11}
              fontWeight={700}
              tickLine={false}
              axisLine={{ stroke: '#E8DFD5' }}
              dy={10}
            />
            <YAxis
              stroke="#7A6455"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => {
                if (activeMetric === 'orders') return `${val}`;
                if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                return `${val}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {activeMetric === 'revenue' ? (
              <Area
                type="monotone"
                dataKey="revenue"
                name="الإيراد"
                stroke="#8B1E1E"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#revenueFill)"
                dot={{
                  r: 4.5,
                  fill: '#8B1E1E',
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: '#B8860B',
                  stroke: '#8B1E1E',
                  strokeWidth: 2.5,
                }}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="ordersCount"
                name="الطلبات"
                stroke="#B8860B"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#ordersFill)"
                dot={{
                  r: 4.5,
                  fill: '#B8860B',
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: '#8B1E1E',
                  stroke: '#B8860B',
                  strokeWidth: 2.5,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer with Trend Breakdown and Quick Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0E8DD] text-xs">
        <div className="flex items-center gap-2 text-[#7A6455]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>تحديث فوري وتفاعلي مع كل معاملة بيع أو إلغاء في نقطة البيع</span>
        </div>

        {onNavigateToReports && (
          <button
            onClick={onNavigateToReports}
            className="font-extrabold text-[#8B1E1E] hover:underline flex items-center gap-1"
          >
            <span>عرض التقارير المالية والتحليلات المتقدمة</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
