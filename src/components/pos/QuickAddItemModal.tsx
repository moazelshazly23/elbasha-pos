import React, { useState } from 'react';
import { X, Plus, Sparkles, ChefHat, Flame, Coffee, Tag } from 'lucide-react';
import { Product } from '../../types';
import { useBrand } from '../../context/BrandContext';

interface QuickAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product, quantity: number, notes?: string) => void;
}

export const QuickAddItemModal: React.FC<QuickAddItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const { profile } = useBrand();
  const [nameAr, setNameAr] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [kitchenStation, setKitchenStation] = useState<'grill' | 'kitchen' | 'cold'>('kitchen');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const quickPresets = [
    { name: 'طلب خاص وتعديل مخصص', price: 50, station: 'kitchen' as const },
    { name: 'سلطة طحينة ومقبلات إضافية', price: 15, station: 'cold' as const },
    { name: 'توصيل إضافي (مسافة بعيدة)', price: 30, station: 'kitchen' as const },
    { name: 'صوص وخضار مشوي إضافي', price: 20, station: 'grill' as const },
    { name: 'تغليف فويل حراري خاص', price: 10, station: 'kitchen' as const },
    { name: 'مشروب غازي إضافي خاص', price: 25, station: 'cold' as const },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !price || Number(price) <= 0) return;

    const numPrice = Number(price);
    const customProduct: Product = {
      id: `quick-${Date.now()}`,
      nameAr: nameAr.trim(),
      nameEn: 'Quick Item',
      sku: `Q-${Date.now().toString().slice(-4)}`,
      categoryId: 'cat-custom',
      price: numPrice,
      costPrice: Number((numPrice * 0.5).toFixed(2)),
      available: true,
      prepTimeMinutes: 5,
      kitchenStation,
      trackInventory: false,
    };

    onAdd(customProduct, Math.max(1, quantity), notes.trim() || undefined);
    // Reset and close
    setNameAr('');
    setPrice('');
    setQuantity(1);
    setNotes('');
    onClose();
  };

  const handleSelectPreset = (p: { name: string; price: number; station: 'grill' | 'kitchen' | 'cold' }) => {
    setNameAr(p.name);
    setPrice(p.price);
    setKitchenStation(p.station);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#E8DFD5] overflow-hidden text-[#231610] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-[#8B1E1E] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-extrabold text-sm">إضافة صنف حر وسريع (Quick Add)</h3>
              <p className="text-[11px] text-amber-200">إضافة طلب خاص أو صنف مباشر دون الرجوع للمنيو</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-bold text-[#7A6455] mb-1.5">
              مقترحات سريعة شائعة:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#D7C3A5] bg-[#FFF8EF] hover:bg-[#F5EFE6] text-[#6F4E37] transition-colors"
                >
                  {p.name} ({p.price} {profile.currency})
                </button>
              ))}
            </div>
          </div>

          {/* Name & Price */}
          <div>
            <label className="block text-xs font-bold text-[#231610] mb-1">
              اسم الصنف / البيان *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="مثال: رغيف حواوشي خلطة إضافية، طلب خاص..."
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#231610] mb-1">
                السعر ({profile.currency}) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                required
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#231610] mb-1">
                الكمية
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
              />
            </div>
          </div>

          {/* Kitchen Station */}
          <div>
            <label className="block text-xs font-bold text-[#231610] mb-1">
              محطة التجهيز في المطبخ (KDS Station)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setKitchenStation('grill')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  kitchenStation === 'grill'
                    ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-xs'
                    : 'bg-white border-[#D7C3A5] text-[#3E2723] hover:bg-[#F5EFE6]'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>شواية الفحم</span>
              </button>

              <button
                type="button"
                onClick={() => setKitchenStation('kitchen')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  kitchenStation === 'kitchen'
                    ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-xs'
                    : 'bg-white border-[#D7C3A5] text-[#3E2723] hover:bg-[#F5EFE6]'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5 text-amber-200" />
                <span>المطبخ الرئيسي</span>
              </button>

              <button
                type="button"
                onClick={() => setKitchenStation('cold')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  kitchenStation === 'cold'
                    ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-xs'
                    : 'bg-white border-[#D7C3A5] text-[#3E2723] hover:bg-[#F5EFE6]'
                }`}
              >
                <Coffee className="w-3.5 h-3.5 text-amber-300" />
                <span>المقبلات والبار</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#231610] mb-1">
              ملاحظات تجهيز خاصة (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: بدون بصل، مشوي زيادة، بون مستقل..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DFD5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!nameAr.trim() || !price || Number(price) <= 0}
              className="px-5 py-2 text-xs font-bold bg-[#8B1E1E] text-white rounded-xl hover:bg-[#721616] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة للفاتورة الآن</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
