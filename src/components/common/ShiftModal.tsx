import React, { useState } from 'react';
import { X, DollarSign, Clock, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useShift } from '../../context/ShiftContext';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';

export const ShiftModal: React.FC = () => {
  const { activeShift, openShift, closeShift, isShiftModalOpen, setIsShiftModalOpen } = useShift();
  const { profile } = useBrand();
  const { currentUser, currentBranch } = useAuth();

  const [startingCashInput, setStartingCashInput] = useState<string>('1000');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [shiftNotes, setShiftNotes] = useState<string>('');

  if (!isShiftModalOpen) return null;

  const isOpen = activeShift?.status === 'open';

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(startingCashInput) || 0;
    openShift(amount, shiftNotes);
    setIsShiftModalOpen(false);
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseFloat(actualCashInput) || 0;
    closeShift(actual, shiftNotes);
    setIsShiftModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#E8DFD5]">
        {/* Header */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#8B1E1E]" />
            <h3 className="font-bold text-sm text-[#231610]">
              {isOpen ? 'تقفيل وإغلاق الوردية الحالية' : 'فتح وردية كاشير جديدة'}
            </h3>
          </div>
          <button
            onClick={() => setIsShiftModalOpen(false)}
            className="p-1 rounded-lg text-[#6F4E37] hover:bg-[#EAE0D2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isOpen && activeShift ? (
            <form onSubmit={handleCloseShift} className="space-y-4">
              {/* Shift info summary */}
              <div className="bg-[#FFF8EF] p-4 rounded-xl border border-[#D7C3A5] space-y-2 text-xs">
                <div className="flex justify-between font-bold text-[#8B1E1E]">
                  <span>الكاشير المسؤول:</span>
                  <span>{activeShift.userName}</span>
                </div>
                <div className="flex justify-between text-[#3E2723]">
                  <span>وقت البدء:</span>
                  <span className="tabular-nums">
                    {new Date(activeShift.startTime).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-[#3E2723]">
                  <span>العهدة الافتتاحية:</span>
                  <span className="font-bold tabular-nums">
                    {activeShift.startingCash.toLocaleString('ar-EG')} {profile.currency}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>مبيعات نقدية (Cash):</span>
                  <span className="font-bold tabular-nums">
                    +{activeShift.cashSales.toLocaleString('ar-EG')} {profile.currency}
                  </span>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>مبيعات بطاقات (Card):</span>
                  <span className="font-bold tabular-nums">
                    {activeShift.cardSales.toLocaleString('ar-EG')} {profile.currency}
                  </span>
                </div>
                <div className="flex justify-between text-purple-800">
                  <span>مبيعات أخرى (InstaPay):</span>
                  <span className="font-bold tabular-nums">
                    {activeShift.otherSales.toLocaleString('ar-EG')} {profile.currency}
                  </span>
                </div>
                {activeShift.expenses > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>مصروفات من الدرج:</span>
                    <span className="font-bold tabular-nums">
                      -{activeShift.expenses.toLocaleString('ar-EG')} {profile.currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm border-t border-[#D7C3A5] pt-2 text-[#231610]">
                  <span>النقد المتوقع بالدرج (Expected Cash):</span>
                  <span className="tabular-nums text-[#8B1E1E]">
                    {activeShift.expectedCash.toLocaleString('ar-EG')} {profile.currency}
                  </span>
                </div>
              </div>

              {/* Counted Cash Input */}
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  النقدية الفعلية المحصية بالدرج ({profile.currency}) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="ادخل المبلغ الفعلي بعد العد..."
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] text-sm font-bold tabular-nums text-left"
                    dir="ltr"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[#7A6455] pointer-events-none">
                    {profile.currency}
                  </span>
                </div>
                {actualCashInput !== '' && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center justify-between ${
                      parseFloat(actualCashInput) - activeShift.expectedCash === 0
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : parseFloat(actualCashInput) - activeShift.expectedCash > 0
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    <span>فارق النقدية (العجز / الزيادة):</span>
                    <span className="tabular-nums" dir="ltr">
                      {(parseFloat(actualCashInput) - activeShift.expectedCash).toFixed(2)} {profile.currency}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  ملاحظات الإغلاق
                </label>
                <textarea
                  rows={2}
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="أي ملاحظات حول التقفيل أو الفروقات..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] hover:bg-[#EAE0D2] rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!actualCashInput}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>تأكيد إغلاق الوردية</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-[#B8860B] flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-[#231610]">
                  بدء وردية كاشير جديدة
                </h4>
                <p className="text-xs text-[#7A6455] mt-1">
                  الكاشير: <span className="font-bold text-[#8B1E1E]">{currentUser?.name || 'كاشير'}</span> | الفرع: {currentBranch?.name || 'الفرع الرئيسي'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  العهدة النقدية الافتتاحية في الدرج ({profile.currency}) *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={startingCashInput}
                  onChange={(e) => setStartingCashInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] text-sm font-bold tabular-nums text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  ملاحظات البداية
                </label>
                <textarea
                  rows={2}
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="مثال: وردية مسائية، تم استلام العهدة فكة كاملة..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] hover:bg-[#EAE0D2] rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#8B1E1E] hover:bg-[#721616] rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>فتح الوردية الآن</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
