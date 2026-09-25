import React from 'react';
import {
  Search,
  Calendar,
  X,
  RotateCcw,
  CreditCard,
  Banknote,
  Receipt,
  Smartphone,
  SlidersHorizontal,
} from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom';

interface OrderFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  startDate: string;
  endDate: string;
  datePreset: DatePreset;
  onSelectDatePreset: (preset: DatePreset) => void;
  onCustomDateChange: (start: string, end: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  paymentMethodFilter: 'all' | 'cash' | 'card' | 'other';
  onPaymentMethodFilterChange: (method: 'all' | 'cash' | 'card' | 'other') => void;
  onResetFilters: () => void;
  isFiltered: boolean;
  totalOrdersCount: number;
  filteredOrdersCount: number;
  filteredRevenue: number;
  currency: string;
}

export const OrderFilterBar: React.FC<OrderFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  startDate,
  endDate,
  datePreset,
  onSelectDatePreset,
  onCustomDateChange,
  statusFilter,
  onStatusFilterChange,
  paymentMethodFilter,
  onPaymentMethodFilterChange,
  onResetFilters,
  isFiltered,
  totalOrdersCount,
  filteredOrdersCount,
  filteredRevenue,
  currency,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD5] p-3.5 sm:p-4 shadow-xs space-y-3.5">
      {/* Row 1: Search Input & Quick Status Filter */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input (Order ID, Customer Name, Phone, Table) */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-[#7A6455]" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة (ORD-...)، اسم العميل، رقم الهاتف، أو الطاولة..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-10 pl-9 py-2.5 text-xs sm:text-sm rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] bg-[#FBF9F6] text-[#231610] font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-3 top-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-md"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFD5] text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            الكل ({totalOrdersCount})
          </button>
          <button
            onClick={() => onStatusFilterChange('completed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            مكتملة ومسلمة
          </button>
          <button
            onClick={() => onStatusFilterChange('preparing')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              statusFilter === 'preparing'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            قيد التحضير
          </button>
          <button
            onClick={() => onStatusFilterChange('ready')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ready'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            جاهزة
          </button>
          <button
            onClick={() => onStatusFilterChange('cancelled')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              statusFilter === 'cancelled'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            ملغية
          </button>
        </div>
      </div>

      {/* Row 2: Date Range Filter Component & Payment Method */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-[#F0E8DD]">
        {/* Date Presets and Pickers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A6455] ml-1">
            <Calendar className="w-4 h-4 text-[#8B1E1E]" />
            <span>تاريخ السداد / الطلب:</span>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs flex-wrap">
            <button
              onClick={() => onSelectDatePreset('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                datePreset === 'all'
                  ? 'bg-white text-[#8B1E1E] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => onSelectDatePreset('today')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                datePreset === 'today'
                  ? 'bg-white text-[#8B1E1E] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => onSelectDatePreset('yesterday')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                datePreset === 'yesterday'
                  ? 'bg-white text-[#8B1E1E] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              أمس
            </button>
            <button
              onClick={() => onSelectDatePreset('last7')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                datePreset === 'last7'
                  ? 'bg-white text-[#8B1E1E] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => onSelectDatePreset('thisMonth')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                datePreset === 'thisMonth'
                  ? 'bg-white text-[#8B1E1E] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              هذا الشهر
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 bg-[#FBF9F6] border border-[#D7C3A5] px-2 py-1 rounded-xl">
              <span className="text-[10px] text-gray-500 font-bold">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onCustomDateChange(e.target.value, endDate)}
                className="bg-transparent text-xs font-semibold text-[#231610] focus:outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 bg-[#FBF9F6] border border-[#D7C3A5] px-2 py-1 rounded-xl">
              <span className="text-[10px] text-gray-500 font-bold">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onCustomDateChange(startDate, e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#231610] focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right side: Payment Method & Reset Button */}
        <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
          {/* Payment Method Selector */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => onPaymentMethodFilterChange('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                paymentMethodFilter === 'all'
                  ? 'bg-white text-[#231610] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="كافة طرق الدفع"
            >
              طرق الدفع: الكل
            </button>
            <button
              onClick={() => onPaymentMethodFilterChange('cash')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                paymentMethodFilter === 'cash'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Banknote className="w-3 h-3 text-emerald-600" />
              <span>نقدي</span>
            </button>
            <button
              onClick={() => onPaymentMethodFilterChange('card')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                paymentMethodFilter === 'card'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-3 h-3 text-blue-600" />
              <span>بطاقة</span>
            </button>
            <button
              onClick={() => onPaymentMethodFilterChange('other')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                paymentMethodFilter === 'other'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3 h-3 text-purple-600" />
              <span>أخرى</span>
            </button>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors border border-red-200"
              title="إلغاء كافة فلاتر البحث والتاريخ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 3: Active Filter Status & Financial Summary Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0E8DD] text-xs">
        <div className="flex items-center gap-2 text-[#7A6455]">
          <span>النتائج المطابقة:</span>
          <strong className="text-[#231610] font-black tabular-nums">
            {filteredOrdersCount} فاتورة
          </strong>
          {isFiltered && (
            <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
              (تصفية نشطة من أصل {totalOrdersCount})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#7A6455]">
            <span>إجمالي الإيرادات المطابقة:</span>
            <span className="font-extrabold text-[#8B1E1E] text-sm tabular-nums">
              {filteredRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              {currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
