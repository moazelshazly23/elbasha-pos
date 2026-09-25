import React from 'react';
import { X, Play, Trash2, Clock, ShoppingBag, Users, Grid, AlertCircle } from 'lucide-react';
import { HeldOrder } from '../../types';
import { useBrand } from '../../context/BrandContext';

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onResume: (order: HeldOrder) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({
  isOpen,
  onClose,
  heldOrders,
  onResume,
  onDelete,
  onClearAll,
}) => {
  const { profile } = useBrand();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-[#E8DFD5]">
        {/* Modal Header */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8B1E1E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {heldOrders.length}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#231610]">
                الطلبات المعلقة (Held Orders)
              </h3>
              <p className="text-[11px] text-[#7A6455]">
                اضغط على استرجاع لمتابعة الطلب في السلة أو اضغط F5 للتعليق
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {heldOrders.length === 0 ? (
            <div className="py-12 text-center text-[#7A6455]">
              <Clock className="w-12 h-12 text-[#D7C3A5] mx-auto mb-2 stroke-[1.5]" />
              <p className="font-bold text-xs text-[#231610]">لا توجد أي طلبات معلقة حالياً</p>
              <p className="text-[11px] text-[#8C7665] mt-1">
                عند وجود زبون غير جاهز للسداد، اضغط على مفتاح <span className="font-bold text-[#8B1E1E]">F5</span> لتعليق الطلب واستقبال زبون آخر.
              </p>
            </div>
          ) : (
            heldOrders.map((order, idx) => (
              <div
                key={order.id}
                className="p-3.5 rounded-xl border border-[#E8DFD5] bg-[#FBF9F6] hover:border-[#8B1E1E] transition-all space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-[#8B1E1E] bg-[#FFF0F0] px-2 py-0.5 rounded border border-[#FFD0D0]">
                        #{idx + 1} - {order.orderNumber}
                      </span>
                      <span className="text-[10px] text-[#7A6455] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#A67C52]" />
                        {new Date(order.heldAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#5C4033] pt-1">
                      {order.orderType === 'dine_in' && (
                        <span className="flex items-center gap-1 font-bold text-amber-900">
                          <Grid className="w-3 h-3 text-amber-700" />
                          طاولة: {order.tableNumber || 'غير محددة'}
                        </span>
                      )}
                      {order.customerName && (
                        <span className="flex items-center gap-1 font-bold text-blue-900">
                          <Users className="w-3 h-3 text-blue-700" />
                          {order.customerName}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500">
                        {order.itemCount} صنف ({order.items.reduce((s, i) => s + i.quantity, 0)} قطعة)
                      </span>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="text-sm font-extrabold text-[#8B1E1E] tabular-nums">
                      {order.total.toFixed(2)} {profile.currency}
                    </div>
                  </div>
                </div>

                {/* Items preview preview */}
                <div className="text-[11px] text-[#6F4E37] bg-white p-2 rounded-lg border border-[#EFE8DE] space-y-0.5">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="truncate max-w-[240px]">
                        {item.quantity}x {item.productNameAr}
                      </span>
                      <span className="font-bold tabular-nums">
                        {item.itemTotal.toFixed(2)} {profile.currency}
                      </span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-[10px] text-gray-400 font-bold italic">
                      + {order.items.length - 3} أصناف أخرى...
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onDelete(order.id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>

                  <button
                    onClick={() => onResume(order)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-colors shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>استرجاع الطلب للسلة</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-[#E8DFD5] flex items-center justify-between">
          {heldOrders.length > 0 ? (
            <button
              onClick={onClearAll}
              className="text-xs font-bold text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              حذف كافة المعلقات
            </button>
          ) : (
            <div></div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-[#231610] rounded-xl transition-colors"
          >
            إغلاق (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
