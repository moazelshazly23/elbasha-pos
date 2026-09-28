import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Phone,
  UserPlus,
  UserCheck,
  X,
  MapPin,
  ChevronDown,
  Star,
  Check,
  Edit2,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react';
import { Customer, OrderType } from '../../types';
import { posDb } from '../../services/db';
import { usePOS } from '../../context/POSContext';
import { useBrand } from '../../context/BrandContext';

interface POSCustomerSearchProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  orderType: OrderType;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const POSCustomerSearch: React.FC<POSCustomerSearchProps> = ({
  selectedCustomer,
  onSelectCustomer,
  orderType,
  inputRef: externalInputRef,
}) => {
  const { profile } = useBrand();
  const { showToast } = usePOS();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>(() => posDb.getCustomers());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Quick Add / Edit fields
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newArea, setNewArea] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;

  // Keep customer list in sync with posDb
  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setCustomers(posDb.getCustomers());
    });
    return unsubscribe;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsQuickAddOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter customers based on name or phone
  const cleanQuery = query.trim().toLowerCase();
  const filteredCustomers = customers.filter((c) => {
    if (!cleanQuery) return true;
    const nameMatch = c.name.toLowerCase().includes(cleanQuery);
    const phoneMatch = c.phone.includes(cleanQuery);
    const areaMatch = c.area?.toLowerCase().includes(cleanQuery);
    return nameMatch || phoneMatch || areaMatch;
  });

  // Recent or frequent customers when no query is typed
  const displayList = cleanQuery
    ? filteredCustomers.slice(0, 7)
    : customers
        .slice()
        .sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0))
        .slice(0, 5);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setQuery('');
    setIsOpen(false);
    setIsQuickAddOpen(false);
    showToast(`تم ربط العميل: ${customer.name}`, 'success');
  };

  const handleDetach = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
    setQuery('');
    setIsOpen(false);
    showToast('تم إلغاء ربط العميل من الطلب', 'info');
  };

  const startQuickAdd = (prefill?: string) => {
    const val = prefill || query.trim();
    const isDigits = /^[0-9+]+$/.test(val);
    setNewName(isDigits ? '' : val);
    setNewPhone(isDigits ? val : '');
    setNewAddress('');
    setNewArea('');
    setIsEditing(false);
    setIsQuickAddOpen(true);
    setIsOpen(true);
  };

  const startEdit = (customer: Customer) => {
    setNewName(customer.name);
    setNewPhone(customer.phone);
    setNewAddress(customer.address || '');
    setNewArea(customer.area || '');
    setIsEditing(true);
    setIsQuickAddOpen(true);
    setIsOpen(true);
  };

  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      showToast('يرجى إدخال اسم العميل ورقم هاتفه', 'warning');
      return;
    }

    const customerData: Customer = {
      id: isEditing && selectedCustomer ? selectedCustomer.id : `cust-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim() || undefined,
      area: newArea.trim() || undefined,
      ordersCount: isEditing && selectedCustomer ? selectedCustomer.ordersCount : 0,
      totalSpent: isEditing && selectedCustomer ? selectedCustomer.totalSpent : 0,
      createdAt: isEditing && selectedCustomer ? selectedCustomer.createdAt : new Date().toISOString(),
    };

    const saved = posDb.saveCustomer(customerData);
    onSelectCustomer(saved);
    setIsQuickAddOpen(false);
    setIsOpen(false);
    setQuery('');
    showToast(isEditing ? 'تم تحديث بيانات العميل بنجاح' : 'تم تسجيل وربط العميل الجديد بنجاح', 'success');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 1. Attached Customer Card View */}
      {selectedCustomer ? (
        <div className="bg-[#FFFDF9] border border-[#C59A3F] rounded-xl p-2.5 shadow-2xs transition-all animate-in fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#140E0B] text-amber-300 flex items-center justify-center shrink-0 border border-[#C59A3F]/50 shadow-2xs">
                <UserCheck className="w-4 h-4 text-[#C59A3F]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-xs text-[#1F1511] truncate">
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.ordersCount > 2 && (
                    <span className="bg-[#F7F4EE] text-[#8B1E1E] text-[10px] font-bold px-1.5 py-0.2 rounded border border-[#E5DACB] flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-[#C59A3F] text-[#C59A3F]" />
                      <span>{selectedCustomer.ordersCount} طلبات</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#7A6455]">
                  <span className="font-num font-semibold text-[#8B1E1E] flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#7A6455]" />
                    {selectedCustomer.phone}
                  </span>
                  {selectedCustomer.area && (
                    <span className="truncate flex items-center gap-0.5 text-gray-500">
                      <MapPin className="w-3 h-3 text-[#7A6455] shrink-0" />
                      {selectedCustomer.area}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions for Attached Customer */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(selectedCustomer)}
                title="تعديل بيانات العميل أو العنوان"
                className="p-1.5 rounded-lg text-[#7A6455] hover:text-[#8B1E1E] hover:bg-[#F7F4EE] transition-colors border border-transparent hover:border-[#E5DACB] cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                title="تغيير العميل والبحث عن آخر"
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#8B1E1E] bg-[#F7F4EE] hover:bg-[#EFE8DC] border border-[#E5DACB] transition-colors cursor-pointer"
              >
                تغيير
              </button>
              <button
                type="button"
                onClick={handleDetach}
                title="إلغاء ربط العميل من الطلب"
                className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Detailed Address Line for Delivery/Pickup */}
          {selectedCustomer.address && (orderType === 'delivery' || orderType === 'takeaway') && (
            <div className="mt-2 pt-1.5 border-t border-[#F2ECE4] flex items-start gap-1.5 text-[11px] text-[#6A5A4E]">
              <MapPin className="w-3.5 h-3.5 text-[#C59A3F] shrink-0 mt-0.5" />
              <span className="line-clamp-1">{selectedCustomer.address}</span>
            </div>
          )}
        </div>
      ) : (
        /* 2. Direct Search Input Field */
        <div className="relative">
          <div className="relative flex items-center">
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#7A6455]">
              <Search className="w-3.5 h-3.5" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                  setIsQuickAddOpen(false);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (displayList.length > 0) {
                    handleSelect(displayList[0]);
                  } else if (query.trim()) {
                    startQuickAdd();
                  }
                }
              }}
              placeholder="ابحث عن عميل (رقم هاتف أو اسم) [F3]..."
              className="w-full pr-8 pl-16 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E5DACB] text-[#1F1511] placeholder:text-[#A8988B] focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] transition-all shadow-2xs"
            />

            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              <button
                type="button"
                onClick={() => startQuickAdd()}
                title="تسجيل عميل جديد فورياً"
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#140E0B] text-amber-300 hover:bg-[#2A1D16] border border-[#C59A3F]/40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3 h-3 text-[#C59A3F]" />
                <span className="hidden sm:inline">جديد</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Live Autocomplete & Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute top-full right-0 left-0 mt-1.5 bg-white border border-[#E5DACB] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in select-none">
          {/* If Quick Add Form is active */}
          {isQuickAddOpen ? (
            <form onSubmit={handleSaveQuickCustomer} className="p-3 bg-[#FAF7F2] space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#E5DACB]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F1511]">
                  <UserPlus className="w-4 h-4 text-[#8B1E1E]" />
                  <span>{isEditing ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد وربطه بالطلب'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[#7A6455] mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: محمد الشاذلي"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5DACB] rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8B1E1E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#7A6455] mb-1">رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5DACB] rounded-lg text-xs font-num font-semibold text-left focus:outline-none focus:ring-1 focus:ring-[#8B1E1E]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#7A6455] mb-1">العنوان التفصيلي</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="الشارع، رقم العمارة، الشقة..."
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5DACB] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#8B1E1E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#7A6455] mb-1">المنطقة / الحي</label>
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="المعادي، التجمع..."
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5DACB] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#8B1E1E]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#7A6455] hover:bg-gray-100 rounded-lg font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#8B1E1E] text-white text-xs font-bold rounded-lg hover:bg-[#731717] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'حفظ التعديلات' : 'حفظ وإرفاق بالطلب'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Results list */
            <div>
              {/* Header inside dropdown */}
              <div className="px-3 py-1.5 bg-[#F7F4EE] border-b border-[#E5DACB] flex items-center justify-between text-[11px] font-semibold text-[#7A6455]">
                <span>{query ? `نتائج البحث عن "${query}"` : 'العملاء الأكثر تسوقاً'}</span>
                <span className="font-num text-[10px]">{displayList.length} عميل</span>
              </div>

              {/* Items List */}
              <div className="max-h-56 overflow-y-auto divide-y divide-[#F2ECE4]">
                {displayList.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-[#7A6455] mb-2">لا يوجد عميل مسجل بهذا الرقم أو الاسم</p>
                    <button
                      type="button"
                      onClick={() => startQuickAdd()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8B1E1E] text-white text-xs font-bold rounded-lg hover:bg-[#731717] transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>إضافة عميل جديد: "{query}"</span>
                    </button>
                  </div>
                ) : (
                  displayList.map((customer) => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    return (
                      <div
                        key={customer.id}
                        onClick={() => handleSelect(customer)}
                        className={`p-2.5 px-3 flex items-center justify-between gap-2 hover:bg-[#FDFBF7] cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#FFF8EF]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#F7F4EE] border border-[#E5DACB] text-[#8B1E1E] flex items-center justify-center font-bold text-xs shrink-0">
                            {customer.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0 text-right">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#1F1511] truncate">
                                {customer.name}
                              </span>
                              {customer.ordersCount > 0 && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded font-num">
                                  {customer.ordersCount} طلب
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#7A6455]">
                              <span className="font-num font-semibold text-[#8B1E1E]">
                                {customer.phone}
                              </span>
                              {customer.area && (
                                <span className="truncate text-gray-500">· {customer.area}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            className="px-2 py-1 bg-[#140E0B] text-amber-200 hover:bg-[#2A1D16] text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-[#C59A3F]/30"
                          >
                            <Check className="w-3 h-3 text-[#C59A3F]" />
                            <span>إرفاق</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Quick Add Footer */}
              <div className="p-2 bg-[#F7F4EE] border-t border-[#E5DACB] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => startQuickAdd()}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-[#8B1E1E] hover:bg-[#EFE8DC] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ تسجيل عميل جديد بالهاتف أو العنوان</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
