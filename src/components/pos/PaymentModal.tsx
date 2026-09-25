import React, { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, Building, CheckCircle2, Plus, Trash2, Printer } from 'lucide-react';
import { PaymentItem, PaymentMethodType } from '../../types';
import { useBrand } from '../../context/BrandContext';

interface PaymentModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (payments: PaymentItem[]) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  total,
  onClose,
  onConfirm,
}) => {
  const { profile, updateProfile } = useBrand();
  const [payments, setPayments] = useState<PaymentItem[]>([
    { method: 'cash', amount: total },
  ]);
  const [customRef, setCustomRef] = useState<string>('');

  if (!isOpen) return null;

  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const remaining = Number((total - totalPaid).toFixed(2));
  const change = Math.max(0, Number((totalPaid - total).toFixed(2)));

  const handleSetQuickSingle = (method: PaymentMethodType) => {
    setPayments([{ method, amount: total, reference: method !== 'cash' ? customRef : undefined }]);
  };

  const handleUpdateAmount = (index: number, val: number) => {
    setPayments((prev) => {
      const next = [...prev];
      next[index].amount = Math.max(0, val);
      return next;
    });
  };

  const handleAddSplitPayment = (method: PaymentMethodType) => {
    const defaultAmount = remaining > 0 ? remaining : 0;
    setPayments((prev) => [...prev, { method, amount: defaultAmount }]);
  };

  const handleRemovePayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleQuickCash = (added: number) => {
    setPayments([{ method: 'cash', amount: Number((totalPaid + added).toFixed(2)) }]);
  };

  const isComplete = totalPaid >= total;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;
    onConfirm(payments);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-[#E8DFD5]">
        {/* Header */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[#8B1E1E]" />
            <h3 className="font-bold text-sm text-[#231610]">
              شاشة الدفع والتحصيل (Checkout)
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Order Total Display Card */}
          <div className="bg-[#FFF8EF] p-4 rounded-2xl border border-[#D7C3A5] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#7A6455] font-semibold">المبلغ المطلوب سداده:</span>
              <div className="text-2xl font-black text-[#8B1E1E] tabular-nums">
                {total.toFixed(2)} {profile.currency}
              </div>
            </div>

            <div className="text-left">
              {remaining > 0 ? (
                <div className="text-amber-800 text-xs font-bold bg-amber-100/70 px-3 py-1.5 rounded-lg border border-amber-300">
                  متبقي للتحصيل: <span className="tabular-nums font-black">{remaining.toFixed(2)}</span> {profile.currency}
                </div>
              ) : (
                <div className="text-emerald-800 text-xs font-bold bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-300">
                  الباقي للعميل (Change): <span className="tabular-nums font-black">{change.toFixed(2)}</span> {profile.currency}
                </div>
              )}
            </div>
          </div>

          {/* Quick Payment Buttons */}
          <div>
            <label className="block text-xs font-bold text-[#231610] mb-2">
              طريقة دفع سريعة كاملة:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSetQuickSingle('cash')}
                className="py-2.5 px-3 rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] hover:bg-[#F5EFE6] text-xs font-bold text-[#3E2723] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Banknote className="w-4 h-4 text-emerald-700" />
                <span>نقدي (Cash)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickSingle('card')}
                className="py-2.5 px-3 rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] hover:bg-[#F5EFE6] text-xs font-bold text-[#3E2723] flex items-center justify-center gap-1.5 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-blue-700" />
                <span>بطاقة فيزا/ماستر</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickSingle('instapay')}
                className="py-2.5 px-3 rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] hover:bg-[#F5EFE6] text-xs font-bold text-[#3E2723] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Smartphone className="w-4 h-4 text-purple-700" />
                <span>إنستاباي / محفظة</span>
              </button>
            </div>
          </div>

          {/* Mixed Payment Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#231610]">
                طرق الدفع المتعددة (Mixed Payments):
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAddSplitPayment('card')}
                  className="px-2 py-1 text-[10px] font-bold text-[#8B1E1E] bg-[#FFF8EF] border border-[#D7C3A5] rounded-md hover:bg-[#F5EFE6]"
                >
                  + إضافة بطاقة
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSplitPayment('instapay')}
                  className="px-2 py-1 text-[10px] font-bold text-[#8B1E1E] bg-[#FFF8EF] border border-[#D7C3A5] rounded-md hover:bg-[#F5EFE6]"
                >
                  + إضافة إنستاباي
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {payments.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-gray-50 rounded-xl border border-[#E8DFD5] flex items-center gap-2"
                >
                  <select
                    value={p.method}
                    onChange={(e) => {
                      const newMethod = e.target.value as PaymentMethodType;
                      setPayments((prev) => {
                        const next = [...prev];
                        next[idx].method = newMethod;
                        return next;
                      });
                    }}
                    className="text-xs font-bold bg-white border border-[#D7C3A5] rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="cash">نقدي (Cash)</option>
                    <option value="card">بطاقة بنكية (Card)</option>
                    <option value="instapay">إنستاباي (InstaPay)</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                  </select>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={p.amount}
                      onChange={(e) => handleUpdateAmount(idx, parseFloat(e.target.value) || 0)}
                      className="w-full text-left font-bold text-xs px-2.5 py-1.5 border border-[#D7C3A5] rounded-lg focus:outline-none bg-white tabular-nums"
                      dir="ltr"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-gray-500 pointer-events-none">
                      {profile.currency}
                    </span>
                  </div>

                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(idx)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف هذا الدفع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Cash Add Buttons */}
          <div>
            <span className="text-[11px] font-bold text-[#7A6455] block mb-1">
              مبالغ نقدية سريعة:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickCash(amt)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 text-[#3E2723] hover:bg-[#EAE0D2] border border-gray-200 tabular-nums"
                >
                  +{amt} {profile.currency}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPayments([{ method: 'cash', amount: total }])}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-[#8B1E1E] hover:bg-amber-100 border border-amber-200"
              >
                المبلغ الدقيق (Exact)
              </button>
            </div>
          </div>

          {/* Thermal Auto-Print Setting Bar */}
          <div className="bg-[#FBF9F6] p-2.5 rounded-xl border border-[#E8DFD5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#8B1E1E]" />
              <div className="text-xs">
                <span className="font-bold text-[#231610]">الطباعة التلقائية عبر المتصفح:</span>{' '}
                <span className={`text-[11px] font-bold ${profile.autoPrintReceipt ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {profile.autoPrintReceipt ? 'مفعلة (إرسال إيصال 80mm فور السداد)' : 'معطلة'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profile.autoPrintReceipt}
                onChange={(e) => updateProfile({ autoPrintReceipt: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#8B1E1E]"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E8DFD5]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] hover:bg-[#EAE0D2] rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isComplete}
              className="flex-2 py-2.5 text-xs font-bold text-white bg-[#8B1E1E] hover:bg-[#721616] rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {profile.autoPrintReceipt ? 'إتمام الطلب وطباعة الإيصال (80mm)' : 'إتمام الطلب وحفظ الفاتورة'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
