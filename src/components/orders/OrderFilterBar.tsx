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
  User,
  Hash,
  Filter,
  DollarSign,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom';

export interface OrderFilterBarProps {
  // 1. General search
  searchTerm: string;
  onSearchChange: (value: string) => void;

  // 2. Order ID search
  orderIdFilter: string;
  onOrderIdFilterChange: (value: string) => void;

  // 3. Customer Name / Phone search
  customerFilter: string;
  onCustomerFilterChange: (value: string) => void;

  // 4. Date Range
  startDate: string;
  endDate: string;
  datePreset: DatePreset;
  onSelectDatePreset: (preset: DatePreset) => void;
  onCustomDateChange: (start: string, end: string) => void;

  // 5. Status & Payment
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  paymentMethodFilter: 'all' | 'cash' | 'card' | 'other';
  onPaymentMethodFilterChange: (method: 'all' | 'cash' | 'card' | 'other') => void;

  // Actions & Summary
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
  orderIdFilter,
  onOrderIdFilterChange,
  customerFilter,
  onCustomerFilterChange,
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
  const avgTicket = filteredOrdersCount > 0 ? filteredRevenue / filteredOrdersCount : 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD5] p-3.5 sm:p-4 shadow-xs space-y-3.5">
      {/* SECTION 1: Primary Search Controls (Order ID, Customer Name, General Search) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* 1. Order ID Search */}
        <div className="relative">
          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[#8B1E1E] pointer-events-none">
            <Receipt className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="بحث برقم الطلب (Order ID)..."
            value={orderIdFilter}
            onChange={(e) => onOrderIdFilterChange(e.target.value)}
            className="w-full pr-9 pl-8 py-2 text-xs sm:text-sm rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] bg-[#FBF9F6] text-[#231610] font-medium placeholder:text-gray-400 transition-all"
          />
          {orderIdFilter && (
            <button
              type="button"
              onClick={() => onOrderIdFilterChange('')}
              className="absolute left-2.5 top-2.5 p-0.5 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
              title="إلغاء تصفية رقم الطلب"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Customer Name / Phone Search */}
        <div className="relative">
          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[#6F4E37] pointer-events-none">
            <User className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="بحث باسم العميل أو رقم هاتفه..."
            value={customerFilter}
            onChange={(e) => onCustomerFilterChange(e.target.value)}
            className="w-full pr-9 pl-8 py-2 text-xs sm:text-sm rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] bg-[#FBF9F6] text-[#231610] font-medium placeholder:text-gray-400 transition-all"
          />
          {customerFilter && (
            <button
              type="button"
              onClick={() => onCustomerFilterChange('')}
              className="absolute left-2.5 top-2.5 p-0.5 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
              title="إلغاء تصفية اسم العميل"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3. General Search (Items, Cashier, Table) */}
        <div className="relative">
          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-gray-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="بحث عام (الأصناف، الكاشير، الطاولة)..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-9 pl-8 py-2 text-xs sm:text-sm rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] bg-[#FBF9F6] text-[#231610] font-medium placeholder:text-gray-400 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute left-2.5 top-2.5 p-0.5 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
              title="مسح البحث العام"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SECTION 2: Date Range Filter Bar */}
      <div className="pt-2 border-t border-[#F0E8DD] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A6455] ml-1">
            <Calendar className="w-4 h-4 text-[#8B1E1E]" />
            <span>النطاق الزمني:</span>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl text-xs flex-wrap border border-[#E8DFD5]">
            <button
              type="button"
              onClick={() => onSelectDatePreset('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                datePreset === 'all'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              كل الفترات
            </button>
            <button
              type="button"
              onClick={() => onSelectDatePreset('today')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                datePreset === 'today'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => onSelectDatePreset('yesterday')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                datePreset === 'yesterday'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              أمس
            </button>
            <button
              type="button"
              onClick={() => onSelectDatePreset('last7')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                datePreset === 'last7'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => onSelectDatePreset('thisMonth')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                datePreset === 'thisMonth'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFD5] text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => onStatusFilterChange('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#8B1E1E] text-white shadow-2xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            كل الحالات
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange('completed')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-[#8B1E1E] text-white shadow-2xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            مكتملة
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange('preparing')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'preparing'
                ? 'bg-[#8B1E1E] text-white shadow-2xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            قيد التحضير
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange('ready')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'ready'
                ? 'bg-[#8B1E1E] text-white shadow-2xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            جاهزة
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange('cancelled')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'cancelled'
                ? 'bg-[#8B1E1E] text-white shadow-2xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            ملغية
          </button>
        </div>
      </div>

      {/* SECTION 3: Payment Methods & Active Badges Row */}
      <div className="pt-2 border-t border-[#F0E8DD] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Payment Methods */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-[#7A6455] text-xs">طريقة الدفع:</span>
          <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFD5]">
            <button
              type="button"
              onClick={() => onPaymentMethodFilterChange('all')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                paymentMethodFilter === 'all'
                  ? 'bg-white text-[#231610] shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => onPaymentMethodFilterChange('cash')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                paymentMethodFilter === 'cash'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              <Banknote className="w-3 h-3 text-emerald-600" />
              <span>نقدي</span>
            </button>
            <button
              type="button"
              onClick={() => onPaymentMethodFilterChange('card')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                paymentMethodFilter === 'card'
                  ? 'bg-white text-blue-800 shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              <CreditCard className="w-3 h-3 text-blue-600" />
              <span>بطاقة</span>
            </button>
            <button
              type="button"
              onClick={() => onPaymentMethodFilterChange('other')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                paymentMethodFilter === 'other'
                  ? 'bg-white text-purple-800 shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              <Smartphone className="w-3 h-3 text-purple-600" />
              <span>أخرى</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {isFiltered && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#7A6455]">الفلاتر النشطة:</span>

            {orderIdFilter && (
              <span className="inline-flex items-center gap-1 bg-[#FFF0E6] text-[#8B1E1E] border border-[#F2C4A7] px-2 py-0.5 rounded-lg text-[11px] font-bold">
                <span>طلب: {orderIdFilter}</span>
                <button
                  type="button"
                  onClick={() => onOrderIdFilterChange('')}
                  className="hover:text-red-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {customerFilter && (
              <span className="inline-flex items-center gap-1 bg-[#FFF8EF] text-[#6F4E37] border border-[#D7C3A5] px-2 py-0.5 rounded-lg text-[11px] font-bold">
                <span>عميل: {customerFilter}</span>
                <button
                  type="button"
                  onClick={() => onCustomerFilterChange('')}
                  className="hover:text-red-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 border border-gray-300 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                <span>بحث: {searchTerm}</span>
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="hover:text-red-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {datePreset !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                <span>
                  {datePreset === 'today'
                    ? 'اليوم'
                    : datePreset === 'yesterday'
                    ? 'أمس'
                    : datePreset === 'last7'
                    ? 'آخر 7 أيام'
                    : datePreset === 'thisMonth'
                    ? 'هذا الشهر'
                    : `${startDate} إلى ${endDate}`}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectDatePreset('all')}
                  className="hover:text-red-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                <span>الحالة: {statusFilter}</span>
                <button
                  type="button"
                  onClick={() => onStatusFilterChange('all')}
                  className="hover:text-red-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {paymentMethodFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                <span>الدفع: {paymentMethodFilter}</span>
                <button
                  type="button"
                  onClick={() => onPaymentMethodFilterChange('all')}
                  className="hover:text-red-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Reset All Button */}
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-black transition-colors border border-red-200 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط الكل</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 4: Summary KPIs (Orders Count, Total Filtered Revenue, Average Ticket) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#F0E8DD] text-xs bg-linear-to-r from-[#FFFBF5] to-white p-2.5 rounded-xl border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#7A6455]">
            <Receipt className="w-4 h-4 text-[#8B1E1E]" />
            <span>عدد الطلبات:</span>
            <strong className="text-[#231610] font-black tabular-nums text-sm">
              {filteredOrdersCount}
            </strong>
            <span className="text-[11px] text-gray-500">
              (من أصل {totalOrdersCount} في السجل)
            </span>
          </div>

          {filteredOrdersCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-[#7A6455] border-r border-[#E8DFD5] pr-4">
              <span>متوسط الفاتورة:</span>
              <strong className="text-[#6F4E37] font-black tabular-nums">
                {avgTicket.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                {currency}
              </strong>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#7A6455] font-semibold">إجمالي المبيعات المطابقة:</span>
          <span className="font-extrabold text-[#8B1E1E] text-base tabular-nums bg-white px-2.5 py-0.5 rounded-lg border border-[#E5DACB] shadow-2xs">
            {filteredRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-xs font-bold text-[#7A6455]">{currency}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
