import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'تأكيد الحذف النهائي',
  message = 'هل أنت متأكد من حذف هذا العنصر؟ هذه العملية قد تؤثر على البيانات المرتبطة به ولا يمكن التراجع عنها.',
  itemName,
  confirmText = 'تأكيد الحذف',
  cancelText = 'إلغاء',
  isDanger = true,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const dismiss = onCancel || onClose || (() => {});

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dismiss]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      dir="rtl"
      onClick={dismiss}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8DFD5] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#FFF8EF] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDanger ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 id="confirm-modal-title" className="font-extrabold text-sm text-[#231610]">{title}</h3>
              <span className="text-[11px] text-[#7A6455]">يرجى مراجعة الإجراء قبل التأكيد</span>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-right">
          <p className="text-xs text-[#3E2723] leading-relaxed font-semibold">
            {message}
          </p>

          {itemName && (
            <div className="p-3 bg-[#FBF9F5] rounded-xl border border-[#D7C3A5]/60 flex items-center gap-2">
              <span className="text-[11px] text-[#7A6455] font-bold">العنصر المستهدف:</span>
              <span className="font-extrabold text-xs text-[#8B1E1E] truncate">{itemName}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F5EFE6] border-t border-[#E8DFD5] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={dismiss}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#3E2723] bg-white hover:bg-gray-100 border border-[#D7C3A5] transition-colors shadow-2xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-xs ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 active:scale-95 shadow-red-200'
                : 'bg-[#8B1E1E] hover:bg-[#721616] active:scale-95'
            }`}
          >
            {isDanger && <Trash2 className="w-4 h-4" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
