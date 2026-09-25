import React from 'react';
import { X, Keyboard, PauseCircle, Ban, DollarSign, CreditCard, LayoutGrid, UtensilsCrossed, Clock, HelpCircle } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'عمليات الكاشير والبيع المباشر',
      items: [
        { key: 'F5', label: 'تعليق الطلب الحالي', desc: 'حفظ السلة مؤقتاً لخدمة زبون آخر واسترجاعها بأي وقت', icon: <PauseCircle className="w-4 h-4 text-amber-600" /> },
        { key: 'F6', label: 'صنف حر وسريع (Quick Add)', desc: 'إضافة صنف أو طلب مخصص فورياً بدون الرجوع للمنيو', icon: <UtensilsCrossed className="w-4 h-4 text-orange-600" /> },
        { key: 'ESC', label: 'إلغاء الطلب / إغلاق النوافذ', desc: 'تفريغ السلة الحالية أو إغلاق النوافذ المنبثقة النشطة', icon: <Ban className="w-4 h-4 text-red-600" /> },
        { key: 'F9', label: 'فتح صندوق النقدية (Kick Drawer)', desc: 'إرسال إشارة الفتح الإلكتروني وصوت الجرس وتسجيل الحركة', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
        { key: 'F10', label: 'الدفع وإنهاء الفاتورة', desc: 'فتح نافذة السداد مباشرة عند وجود أصناف بالسلة', icon: <CreditCard className="w-4 h-4 text-[#8B1E1E]" /> },
      ],
    },
    {
      category: 'التنقل السريع بين الشاشات',
      items: [
        { key: 'F2', label: 'شاشة الكاشير ونقاط البيع', desc: 'العودة الفورية لشاشة المبيعات الرئيسية', icon: <LayoutGrid className="w-4 h-4 text-[#8B1E1E]" /> },
        { key: 'F3', label: 'شاشة شيف المطبخ (KDS)', desc: 'متابعة تجهيز وجبات المشويات والطلبات الحية', icon: <UtensilsCrossed className="w-4 h-4 text-[#3F532B]" /> },
        { key: 'F4', label: 'صالة المطعم والطاولات', desc: 'عرض المخطط وتعيين الطاولات المفتوحة والمشغولة', icon: <LayoutGrid className="w-4 h-4 text-[#B8860B]" /> },
        { key: 'F8', label: 'الوردية والخزينة النقدية', desc: 'إيداع/سحب نقدي، مراقبة العهدة، وإغلاق الوردية', icon: <Clock className="w-4 h-4 text-purple-600" /> },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#E8DFD5]">
        {/* Header */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#8B1E1E] text-white flex items-center justify-center shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#231610]">
                دليل مفاتيح الاختصار (Keyboard Shortcuts)
              </h3>
              <p className="text-[11px] text-[#7A6455]">
                مصممة لتسريع عمليات البيع دون الحاجة لاستخدام الفأرة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {shortcuts.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <h4 className="text-xs font-black text-[#8B1E1E] border-b border-[#E8DFD5] pb-1">
                {group.category}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="p-2.5 rounded-xl border border-[#E8DFD5] bg-[#FBF9F6] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-white border border-[#E8DFD5] shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#231610]">{item.label}</div>
                        <div className="text-[10px] text-[#7A6455] truncate">{item.desc}</div>
                      </div>
                    </div>

                    <kbd className="px-2.5 py-1 text-xs font-mono font-black text-[#8B1E1E] bg-white border-2 border-[#D7C3A5] rounded-lg shadow-2xs shrink-0">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#E8DFD5] flex items-center justify-between">
          <span className="text-[11px] text-[#7A6455]">
            يمكن الضغط على <kbd className="font-mono font-bold text-[#8B1E1E]">ESC</kbd> لإغلاق هذه النافذة
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#8B1E1E] text-white hover:bg-[#721616] transition-colors"
          >
            فهمت، عودة للبيع
          </button>
        </div>
      </div>
    </div>
  );
};
