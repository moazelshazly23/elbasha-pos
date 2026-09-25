import React, { useState } from 'react';
import { X, UserPlus, Search, Phone, MapPin, Check } from 'lucide-react';
import { Customer } from '../../types';
import { posDb } from '../../services/db';

interface QuickCustomerModalProps {
  isOpen: boolean;
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

export const QuickCustomerModal: React.FC<QuickCustomerModalProps> = ({
  isOpen,
  selectedCustomer,
  onSelect,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newArea, setNewArea] = useState('');

  if (!isOpen) return null;

  const customers = posDb.getCustomers();
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const created = posDb.saveCustomer({
      id: `cust-${Date.now()}`,
      name: newName,
      phone: newPhone,
      address: newAddress,
      area: newArea,
      ordersCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    });

    onSelect(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#E8DFD5]">
        {/* Header */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#8B1E1E]" />
            <h3 className="font-bold text-sm text-[#231610]">
              {showAddForm ? 'إضافة عميل جديد' : 'اختيار أو البحث عن عميل'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F4E37] hover:bg-[#EAE0D2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!showAddForm ? (
            <>
              {/* Search input & New Button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#7A6455]" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-2 bg-[#8B1E1E] text-white text-xs font-bold rounded-xl hover:bg-[#721616] transition-colors whitespace-nowrap"
                >
                  + عميل جديد
                </button>
              </div>

              {/* Customer List */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filtered.map((c) => {
                  const isSelected = selectedCustomer?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelect(c);
                        onClose();
                      }}
                      className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#FFF8EF] border-[#8B1E1E] ring-1 ring-[#8B1E1E]'
                          : 'bg-[#FBF9F6] border-[#E8DFD5] hover:border-[#B8860B]'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-[#231610]">{c.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-[#7A6455] mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-[#B8860B]" />
                            {c.phone}
                          </span>
                          {c.address && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 text-[#8B1E1E]" />
                              {c.address}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left text-[11px]">
                        <span className="text-[#8B1E1E] font-bold block tabular-nums">
                          {c.ordersCount} طلبات
                        </span>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-6 text-xs text-[#7A6455]">
                    لم يتم العثور على عميل بهذا الاسم أو الرقم.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Add Customer Form */
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. أحمد عبد العزيز"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="010XXXXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  عنوان التوصيل
                </label>
                <input
                  type="text"
                  placeholder="الشارع، رقم العمارة، الشقة، الدور..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  المنطقة / الحي
                </label>
                <input
                  type="text"
                  placeholder="المهندسين، الدقي، الزمالك..."
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] rounded-xl hover:bg-[#EAE0D2]"
                >
                  رجوع للبحث
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#8B1E1E] rounded-xl hover:bg-[#721616]"
                >
                  حفظ واختيار العميل
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
