import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Product, ModifierGroup, SelectedModifier } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';

interface ModifierModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number, modifiers: SelectedModifier[], notes: string) => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { profile } = useBrand();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen || !product) return null;

  const allGroups = posDb.getModifierGroups();
  const activeGroups = allGroups.filter((g) => product.modifierGroupIds?.includes(g.id));

  const isOptionSelected = (groupId: string, optionId: string) => {
    return selectedModifiers.some((m) => m.groupId === groupId && m.optionId === optionId);
  };

  const handleToggleOption = (group: ModifierGroup, optionId: string) => {
    const opt = group.options.find((o) => o.id === optionId);
    if (!opt) return;

    if (group.maxSelections === 1) {
      // Single selection (radio style)
      setSelectedModifiers((prev) => {
        const filtered = prev.filter((m) => m.groupId !== group.id);
        return [
          ...filtered,
          {
            groupId: group.id,
            groupNameAr: group.nameAr,
            optionId: opt.id,
            nameAr: opt.nameAr,
            priceDelta: opt.priceDelta,
          },
        ];
      });
    } else {
      // Multi selection (checkbox style)
      setSelectedModifiers((prev) => {
        const exists = prev.some((m) => m.groupId === group.id && m.optionId === optionId);
        if (exists) {
          return prev.filter((m) => !(m.groupId === group.id && m.optionId === optionId));
        } else {
          return [
            ...prev,
            {
              groupId: group.id,
              groupNameAr: group.nameAr,
              optionId: opt.id,
              nameAr: opt.nameAr,
              priceDelta: opt.priceDelta,
            },
          ];
        }
      });
    }
  };

  const modifierTotal = selectedModifiers.reduce((acc, m) => acc + m.priceDelta, 0);
  const unitPrice = product.price + modifierTotal;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    onConfirm(product, quantity, selectedModifiers, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#E8DFD5]">
        {/* Header */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B1E1E]" />
            <h3 className="font-bold text-sm text-[#231610]">
              تخصيص الصنف: {product.nameAr}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F4E37] hover:bg-[#EAE0D2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Product Banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF8EF] border border-[#D7C3A5]/50">
            {product.image && (
              <img
                src={product.image}
                alt={product.nameAr}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div>
              <h4 className="font-bold text-xs text-[#231610]">{product.nameAr}</h4>
              <p className="text-[11px] text-[#7A6455] line-clamp-1">{product.description}</p>
              <div className="text-xs font-bold text-[#8B1E1E] mt-1 tabular-nums">
                السعر الأساسي: {product.price} {profile.currency}
              </div>
            </div>
          </div>

          {/* Modifier Groups */}
          {activeGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#231610]">{group.nameAr}</span>
                {group.required && (
                  <span className="text-[10px] text-[#8B1E1E] font-bold">مطلوب</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const selected = isOptionSelected(group.id, opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleToggleOption(group, opt.id)}
                      className={`p-2.5 rounded-xl border text-right text-xs transition-all flex items-center justify-between ${
                        selected
                          ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] font-bold shadow-xs'
                          : 'bg-[#FBF9F6] text-[#3E2723] border-[#E8DFD5] hover:border-[#B8860B]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                            selected ? 'bg-white border-white text-[#8B1E1E]' : 'border-[#D7C3A5]'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{opt.nameAr}</span>
                      </div>
                      {opt.priceDelta > 0 && (
                        <span className={`tabular-nums ${selected ? 'text-amber-200' : 'text-[#8B1E1E] font-bold'}`}>
                          +{opt.priceDelta} {profile.currency}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Custom Notes */}
          <div>
            <label className="block text-xs font-bold text-[#231610] mb-1">
              ملاحظات تحضير خاصة للمطبخ
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: قليل الملح، بصل محروق عالفحم، بدون طماطم..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
            />
          </div>

          {/* Quantity selector */}
          <div className="flex items-center justify-between p-3 bg-[#F5EFE6] rounded-xl border border-[#D7C3A5]/40">
            <span className="text-xs font-bold text-[#231610]">الكمية المطلوبة:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-[#D7C3A5] font-bold text-[#8B1E1E] flex items-center justify-center hover:bg-[#EAE0D2]"
              >
                -
              </button>
              <span className="font-extrabold text-sm tabular-nums w-6 text-center text-[#231610]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-[#D7C3A5] font-bold text-[#8B1E1E] flex items-center justify-center hover:bg-[#EAE0D2]"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#E8DFD5] flex items-center justify-between gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-[#7A6455]">الإجمالي للصنف:</span>
            <span className="font-extrabold text-base text-[#8B1E1E] tabular-nums">
              {totalPrice} {profile.currency}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#6F4E37] hover:bg-[#F5EFE6] rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة إلى الفاتورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
