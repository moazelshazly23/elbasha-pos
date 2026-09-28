import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Flame,
  Crown,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Order, Product } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { usePOS } from '../../context/POSContext';

interface POSTopSellingChartProps {
  onSelectProduct?: (product: Product) => void;
}

interface TopItemStat {
  id: string;
  name: string;
  shortName: string;
  quantity: number;
  revenue: number;
  unitPrice: number;
  percentage: number;
  color: string;
  product?: Product;
}

// Brand color palette for top 5 bars: Burgundy & Amber gold tones
const BAR_COLORS = [
  '#8B1E1E', // #1: Signature Burgundy
  '#C59A3F', // #2: Rich Warm Gold
  '#9E2A2B', // #3: Deep Ember
  '#D4A373', // #4: Toasted Wheat
  '#364B24', // #5: Forest Grill Olive
];

export const POSTopSellingChart: React.FC<POSTopSellingChartProps> = ({ onSelectProduct }) => {
  const { profile } = useBrand();
  const { addToCart, showToast } = usePOS();

  const [orders, setOrders] = useState<Order[]>(() => posDb.getOrders());
  const [products, setProducts] = useState<Product[]>(() => posDb.getProducts());
  const [metric, setMetric] = useState<'quantity' | 'revenue'>('quantity');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | string | null>(null);

  // Sync with live database
  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setOrders(posDb.getOrders());
      setProducts(posDb.getProducts());
    });
    return unsubscribe;
  }, []);

  // Filter today's completed/active orders (exclude cancelled)
  const { topItems, totalUnitsSoldToday, totalRevenueToday, todayOrdersCount } = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const todayOrders = orders.filter((o) => {
      if (o.status === 'cancelled') return false;
      const d = new Date(o.createdAt);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === todayStr;
    });

    const itemMap: { [id: string]: { id: string; name: string; quantity: number; revenue: number; unitPrice: number } } = {};
    let totalUnits = 0;
    let totalRev = 0;

    todayOrders.forEach((order) => {
      if (!order.items) return;
      order.items.forEach((item) => {
        const pId = item.productId || item.productNameAr;
        if (!itemMap[pId]) {
          itemMap[pId] = {
            id: item.productId,
            name: item.productNameAr || 'صنف',
            quantity: 0,
            revenue: 0,
            unitPrice: item.unitPrice || 0,
          };
        }
        itemMap[pId].quantity += item.quantity || 1;
        itemMap[pId].revenue += item.itemTotal || (item.unitPrice * (item.quantity || 1));
        totalUnits += item.quantity || 1;
        totalRev += item.itemTotal || 0;
      });
    });

    let rawList = Object.values(itemMap);
    const hasTodaySales = rawList.length > 0;

    // Sort by chosen metric descending
    const sorted = rawList
      .sort((a, b) => (metric === 'quantity' ? b.quantity - a.quantity : b.revenue - a.revenue))
      .slice(0, 5);

    const items: TopItemStat[] = sorted.map((item, idx) => {
      const prod = products.find((p) => p.id === item.id || p.nameAr === item.name);
      // Clean short name for X-axis display
      const shortName = item.name.length > 16 ? `${item.name.slice(0, 15)}..` : item.name;
      const baseTotal = metric === 'quantity' ? totalUnits : totalRev;
      const percentage = baseTotal > 0 ? Number(((item[metric] / baseTotal) * 100).toFixed(1)) : 0;

      return {
        id: item.id,
        name: item.name,
        shortName,
        quantity: item.quantity,
        revenue: Number(item.revenue.toFixed(2)),
        unitPrice: item.unitPrice,
        percentage,
        color: BAR_COLORS[idx % BAR_COLORS.length],
        product: prod,
      };
    });

    return {
      topItems: items,
      totalUnitsSoldToday: totalUnits,
      totalRevenueToday: totalRev,
      todayOrdersCount: todayOrders.length,
      hasRealData: hasTodaySales,
    };
  }, [orders, products, metric]);

  const handleBarClick = (data: any) => {
    if (!data) return;
    const clickedItem = topItems.find((t) => t.name === data.name || t.id === data.id);
    if (!clickedItem) return;

    if (clickedItem.product) {
      if (onSelectProduct) {
        onSelectProduct(clickedItem.product);
      } else {
        addToCart(clickedItem.product, 1, [], '');
        showToast(`⚡ تم إضافة [${clickedItem.name}] مباشرة للسلة`, 'success');
      }
    } else {
      showToast(`الصنف: ${clickedItem.name} (${clickedItem.quantity} قطعة مباعة اليوم)`, 'info');
    }
  };

  // Custom Interactive Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: TopItemStat = payload[0].payload;
      return (
        <div className="bg-[#140E0B] text-white p-3 rounded-xl border border-[#C59A3F]/50 shadow-2xl text-xs space-y-1.5 min-w-[200px] select-none" dir="rtl">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
            <span className="font-extrabold text-amber-200 truncate">{data.name}</span>
            <span className="bg-[#8B1E1E] text-white text-[10px] font-bold px-1.5 py-0.5 rounded font-num">
              #{topItems.findIndex((t) => t.id === data.id) + 1}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
            <div>
              <span className="text-gray-400 block text-[10px]">الكمية المباعة:</span>
              <strong className="text-white font-num text-sm">{data.quantity}</strong>{' '}
              <span className="text-gray-400 text-[10px]">وجبة/قطعة</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">إجمالي الإيراد:</span>
              <strong className="text-[#C59A3F] font-num text-sm">{data.revenue.toLocaleString('ar-EG')}</strong>{' '}
              <span className="text-gray-400 text-[10px]">{profile.currency}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-300 pt-1 border-t border-white/10">
            <span>نسبة المساهمة اليومية:</span>
            <span className="font-num font-bold text-amber-300">{data.percentage}%</span>
          </div>

          <div className="text-[10px] text-amber-300/80 bg-white/5 px-2 py-1 rounded flex items-center justify-center gap-1 font-semibold">
            <Plus className="w-3 h-3 text-[#C59A3F]" />
            <span>انقر لإضافة الصنف فورياً للسلة</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border-b border-[#E5DACB] transition-all">
      {/* Header bar of the Top Selling widget */}
      <div className="px-4 py-2 bg-[#FDFBF7] flex items-center justify-between gap-3 border-b border-[#EFE8DC]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#140E0B] text-amber-300 flex items-center justify-center shadow-2xs border border-[#C59A3F]/40">
            <Flame className="w-4 h-4 text-[#C59A3F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-[#1F1511] font-editorial tracking-wide">
                أكثر 5 أصناف مبيعاً اليوم
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>مباشر</span>
              </span>
            </div>
            <p className="text-[10px] text-[#7A6455] hidden sm:block">
              {todayOrdersCount > 0
                ? `بناءً على ${todayOrdersCount} طلب و ${totalUnitsSoldToday} صنف مباع اليوم`
                : 'الأصناف الأكثر رواجاً وطلباً على شواية الفحم'}
            </p>
          </div>
        </div>

        {/* Metric Selector & Collapse Toggle */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Quantity vs Revenue */}
          <div className="flex items-center p-0.5 bg-[#F7F4EE] rounded-lg border border-[#E5DACB] text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMetric('quantity')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                metric === 'quantity'
                  ? 'bg-[#140E0B] text-amber-200 shadow-2xs'
                  : 'text-[#5D4037] hover:text-[#1F1511]'
              }`}
            >
              الكمية (قطع)
            </button>
            <button
              type="button"
              onClick={() => setMetric('revenue')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                metric === 'revenue'
                  ? 'bg-[#140E0B] text-amber-200 shadow-2xs'
                  : 'text-[#5D4037] hover:text-[#1F1511]'
              }`}
            >
              الإيراد ({profile.currency})
            </button>
          </div>

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'تصغير الرسم البياني' : 'توسيع الرسم البياني'}
            className="p-1.5 rounded-lg bg-white hover:bg-[#F7F4EE] text-[#7A6455] border border-[#E5DACB] transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Chart Body */}
      {isExpanded && (
        topItems.length === 0 ? (
          <div className="p-4 py-5 text-center bg-white border-t border-[#F2ECE4]">
            <div className="w-8 h-8 rounded-full bg-[#F7F4EE] text-[#C59A3F] flex items-center justify-center mx-auto mb-1.5 border border-[#E5DACB]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-[#1F1511]">لا توجد مبيعات مسجلة لهذا اليوم بعد</p>
            <p className="text-[11px] text-[#7A6455] max-w-sm mx-auto mt-0.5">
              ستظهر الأصناف الأكثر مبيعاً ونسب مساهمتها البيانية هنا لحظياً فور تسجيل أول طلب اليوم.
            </p>
          </div>
        ) : (
        <div className="p-3 bg-gradient-to-b from-[#FFFDF9] to-white">
          {/* Mini Top-5 interactive cards row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2.5">
            {topItems.map((item, idx) => {
              const isLead = idx === 0;
              return (
                <div
                  key={item.id || idx}
                  onClick={() => handleBarClick(item)}
                  title="انقر للإضافة السريعة إلى الفاتورة"
                  className={`p-2 rounded-xl border transition-all cursor-pointer group relative overflow-hidden select-none ${
                    isLead
                      ? 'bg-[#FFF9EE] border-[#C59A3F] shadow-2xs hover:border-[#8B1E1E]'
                      : 'bg-white border-[#E5DACB] hover:border-[#8B1E1E] hover:shadow-2xs'
                  }`}
                >
                  {isLead && (
                    <div className="absolute top-1 left-1">
                      <Crown className="w-3.5 h-3.5 text-[#C59A3F]" />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-4 h-4 rounded-md text-[10px] font-black flex items-center justify-center text-white shrink-0 font-num"
                      style={{ backgroundColor: item.color }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-[#1F1511] truncate group-hover:text-[#8B1E1E] transition-colors">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F2ECE4]">
                    <span className="font-num font-extrabold text-[#8B1E1E]">
                      {metric === 'quantity' ? `${item.quantity} وجبة` : `${item.revenue} ${profile.currency}`}
                    </span>
                    <span className="text-[10px] text-[#7A6455] group-hover:text-[#8B1E1E] font-bold flex items-center gap-0.5">
                      <Plus className="w-3 h-3" />
                      <span>إضافة</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recharts Interactive Bar Chart Container */}
          <div className="w-full h-44 select-none" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topItems}
                margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                onMouseMove={(state) => {
                  if (state && state.activeTooltipIndex !== undefined) {
                    setHoveredBarIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DC" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  stroke="#7A6455"
                  tick={{ fill: '#4A3B32', fontSize: 11, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5DACB' }}
                />
                <YAxis
                  stroke="#7A6455"
                  tick={{ fill: '#7A6455', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (metric === 'quantity' ? `${val}` : `${val}`)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(197, 154, 63, 0.08)' }} />
                <Bar
                  dataKey={metric}
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                >
                  {topItems.map((entry, index) => {
                    const isHovered = hoveredBarIndex !== null && String(hoveredBarIndex) === String(index);
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={hoveredBarIndex === null || isHovered ? 1 : 0.65}
                        stroke={isHovered ? '#140E0B' : 'none'}
                        strokeWidth={1.5}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Footnote instruction */}
          <div className="mt-1 flex items-center justify-between text-[10px] text-[#7A6455] px-1 font-semibold">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#C59A3F]" />
              <span>نصيحة: انقر على أي عمود بالرسم البياني لإضافة الصنف فورياً لسلة الطلب النشط</span>
            </span>
            <span className="font-num text-[#8B1E1E]">
              إجمالي مبيعات التوب 5: {metric === 'quantity' ? `${totalUnitsSoldToday} قطعة` : `${totalRevenueToday.toLocaleString('ar-EG')} ${profile.currency}`}
            </span>
          </div>
        </div>
        )
      )}
    </div>
  );
};
