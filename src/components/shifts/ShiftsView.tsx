import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Lock, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Shift } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { useShift } from '../../context/ShiftContext';

export const ShiftsView: React.FC = () => {
  const { profile } = useBrand();
  const { activeShift, setIsShiftModalOpen } = useShift();
  const [shifts, setShifts] = useState<Shift[]>(() => posDb.getShifts());

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setShifts(posDb.getShifts());
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#8B1E1E]" />
          <div>
            <h2 className="text-base font-extrabold text-[#231610]">
              سجل الورديات وإغلاق الخزينة والكاشير
            </h2>
            <span className="text-xs text-[#7A6455]">
              متابعة عهدة الدرج، العجز والزيادة، وإغلاق حسابات الكاشير اليومية
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsShiftModalOpen(true)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors shadow-xs ${
            activeShift?.status === 'open'
              ? 'bg-amber-700 hover:bg-amber-800'
              : 'bg-[#8B1E1E] hover:bg-[#721616]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{activeShift?.status === 'open' ? 'إغلاق الوردية الحالية' : 'فتح وردية جديدة'}</span>
        </button>
      </div>

      {/* Shifts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeShift && activeShift.status === 'open' && (
          <div className="bg-[#FFF8EF] p-4 rounded-2xl border-2 border-[#D7C3A5] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse" />
                <span className="font-extrabold text-sm text-[#8B1E1E]">
                  الوردية الحالية المفتوحة (نشطة الآن)
                </span>
              </div>
              <span className="text-xs font-bold text-[#6F4E37]">
                الكاشير: {activeShift.userName}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-[#D7C3A5]">
                <span className="text-[#7A6455] block">العهدة الافتتاحية:</span>
                <span className="font-black text-sm text-[#231610] tabular-nums">
                  {activeShift.startingCash} {profile.currency}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-[#D7C3A5]">
                <span className="text-emerald-800 block">المبيعات النقدية:</span>
                <span className="font-black text-sm text-emerald-800 tabular-nums">
                  +{activeShift.cashSales} {profile.currency}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-[#D7C3A5]">
                <span className="text-red-700 block">مصروفات الدرج:</span>
                <span className="font-black text-sm text-red-700 tabular-nums">
                  -{activeShift.expenses} {profile.currency}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-[#D7C3A5]">
                <span className="text-[#8B1E1E] font-bold block">المتوقع بالدرج الآن:</span>
                <span className="font-black text-sm text-[#8B1E1E] tabular-nums">
                  {activeShift.expectedCash} {profile.currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-[#E8DFD5] shadow-xs overflow-hidden">
          <div className="p-3 bg-[#F5EFE6] font-bold text-xs text-[#231610] border-b border-[#E8DFD5]">
            سجل الورديات السابقة والمغلقة
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#3E2723] font-bold border-b border-[#E8DFD5]">
                <tr>
                  <th className="p-3">الكاشير</th>
                  <th className="p-3">وقت البدء</th>
                  <th className="p-3">وقت الإغلاق</th>
                  <th className="p-3">العهدة الافتتاحية</th>
                  <th className="p-3">مبيعات نقدية</th>
                  <th className="p-3">مبيعات إلكترونية</th>
                  <th className="p-3">المتوقع</th>
                  <th className="p-3">المحصي الفعلي</th>
                  <th className="p-3">الفارق (عجز/زيادة)</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE6]">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-gray-500">
                      لا توجد ورديات مسجلة أو سابقة حتى الآن. يمكنك فتح وردية جديدة لبدء المبيعات وحركات الدرج.
                    </td>
                  </tr>
                ) : (
                  shifts.map((s) => {
                  const diff = s.difference ?? s.cashDifference ?? 0;
                  const isClosed = s.status === 'closed';

                  return (
                    <tr key={s.id} className="hover:bg-[#FFF8EF]">
                      <td className="p-3 font-extrabold text-[#231610]">{s.userName}</td>
                      <td className="p-3 text-gray-600 tabular-nums">
                        {new Date(s.startTime).toLocaleString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'numeric',
                        })}
                      </td>
                      <td className="p-3 text-gray-600 tabular-nums">
                        {s.endTime
                          ? new Date(s.endTime).toLocaleString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: 'numeric',
                              month: 'numeric',
                            })
                          : 'لا تزال مفتوحة'}
                      </td>
                      <td className="p-3 tabular-nums">{s.startingCash} {profile.currency}</td>
                      <td className="p-3 font-bold text-emerald-800 tabular-nums">
                        {s.cashSales} {profile.currency}
                      </td>
                      <td className="p-3 font-bold text-blue-800 tabular-nums">
                        {s.cardSales + s.otherSales} {profile.currency}
                      </td>
                      <td className="p-3 font-bold text-[#8B1E1E] tabular-nums">
                        {s.expectedCash} {profile.currency}
                      </td>
                      <td className="p-3 font-bold tabular-nums">
                        {isClosed ? `${s.actualCash} ${profile.currency}` : '-'}
                      </td>
                      <td className="p-3 tabular-nums">
                        {isClosed ? (
                          diff === 0 ? (
                            <span className="text-emerald-700 font-bold">مطابق تماماً (0)</span>
                          ) : diff > 0 ? (
                            <span className="text-blue-700 font-bold">+{diff} (زيادة)</span>
                          ) : (
                            <span className="text-red-700 font-bold">{diff} (عجز)</span>
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isClosed
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-emerald-100 text-emerald-800 animate-pulse'
                          }`}
                        >
                          {isClosed ? 'مغلقة' : 'مفتوحة'}
                        </span>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
