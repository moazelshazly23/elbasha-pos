import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Edit2, Flame, Crown, UtensilsCrossed, Soup, Salad, Coffee, X } from 'lucide-react';
import { Category } from '../../types';
import { posDb } from '../../services/db';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const CategoriesView: React.FC = () => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>(() => posDb.getCategories());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Flame');
  const [color, setColor] = useState('#8B1E1E');
  const [order, setOrder] = useState<number>(1);

  // Confirm delete state
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setCategories(posDb.getCategories());
    });
    return unsubscribe;
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setNameAr('');
    setNameEn('');
    setSelectedIcon('Flame');
    setColor('#8B1E1E');
    setOrder(categories.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setNameAr(category.nameAr);
    setNameEn(category.nameEn);
    setSelectedIcon(category.icon || 'Flame');
    setColor(category.color || '#8B1E1E');
    setOrder(category.order || 1);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      showToast('يرجى إدخال اسم التصنيف بالعربية', 'warning');
      return;
    }

    const isEdit = !!editingCategory;
    const targetId = editingCategory ? editingCategory.id : `cat-${Date.now()}`;

    posDb.saveCategory({
      id: targetId,
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      icon: selectedIcon,
      color,
      order: Number(order) || 1,
    });

    setIsModalOpen(false);
    setEditingCategory(null);
    showToast(isEdit ? `تم تعديل تصنيف "${nameAr}" بنجاح` : `تمت إضافة تصنيف "${nameAr}" بنجاح`, 'success');
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    const catName = deletingCategory.nameAr;
    posDb.deleteCategory(deletingCategory.id);
    setDeletingCategory(null);
    showToast(`تم حذف تصنيف "${catName}" نهائياً من قاعدة البيانات`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#8B1E1E]" />
          <div>
            <h2 className="text-base font-extrabold text-[#231610]">تصنيفات المنيو</h2>
            <span className="text-xs text-[#7A6455]">
              تنظيم وتبويب أكلات المنيو لتسهيل طلب الكاشير والعميل ({categories.length} تصنيف)
            </span>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تصنيف جديد</span>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {categories.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-[#D7C3A5] text-center space-y-3 max-w-md mx-auto my-12">
            <Layers className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-[#231610]">لا توجد تصنيفات حالياً</h3>
            <p className="text-xs text-[#7A6455]">ابدأ بإضافة أول تصنيف للمنيو لتنظيم وجبات المطعم.</p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#8B1E1E] text-white rounded-xl text-xs font-bold hover:bg-[#721616]"
            >
              إضافة أول تصنيف
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs flex items-center justify-between hover:border-[#B8860B] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: c.color || '#8B1E1E' }}
                  >
                    {c.icon === 'Crown' ? (
                      <Crown className="w-5 h-5" />
                    ) : c.icon === 'UtensilsCrossed' ? (
                      <UtensilsCrossed className="w-5 h-5" />
                    ) : c.icon === 'Soup' ? (
                      <Soup className="w-5 h-5" />
                    ) : c.icon === 'Salad' ? (
                      <Salad className="w-5 h-5" />
                    ) : c.icon === 'Coffee' ? (
                      <Coffee className="w-5 h-5" />
                    ) : (
                      <Flame className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#231610]">{c.nameAr}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{c.nameEn}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                        ترتيب: {c.order || 1}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-2 text-amber-800 hover:bg-amber-50 rounded-xl transition-colors active:scale-95"
                    title="تعديل بيانات التصنيف"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingCategory(c)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-95"
                    title="حذف التصنيف نهائياً"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-[#E8DFD5] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2">
              <h3 className="font-extrabold text-sm text-[#231610]">
                {editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">الاسم بالعربي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ركن الشوربات والطواجن"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-hidden focus:ring-2 focus:ring-[#8B1E1E]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">English Name</label>
                <input
                  type="text"
                  placeholder="e.g. Soups & Tagines"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left focus:outline-hidden focus:ring-2 focus:ring-[#8B1E1E]/20"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">الأيقونة</label>
                  <select
                    value={selectedIcon}
                    onChange={(e) => setSelectedIcon(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  >
                    <option value="Flame">لهب / شواية</option>
                    <option value="Crown">تاج ملكي</option>
                    <option value="UtensilsCrossed">أطباق رئيسية</option>
                    <option value="Soup">طواجن وشوربة</option>
                    <option value="Salad">مقبلات وسلطات</option>
                    <option value="Coffee">مشروبات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">ترتيب العرض</label>
                  <input
                    type="number"
                    min="1"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">لون التمييز</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-[#D7C3A5] p-0.5"
                  />
                  <span className="text-xs font-mono text-gray-600">{color}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] rounded-xl hover:bg-[#EAE0D2] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#8B1E1E] rounded-xl hover:bg-[#721616] transition-colors shadow-xs active:scale-95"
                >
                  {editingCategory ? 'حفظ التعديلات' : 'إضافة التصنيف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingCategory}
        title="تأكيد حذف تصنيف المنيو"
        message="هل أنت متأكد من حذف هذا التصنيف نهائياً؟ قد يؤثر ذلك على ظهور الأصناف التابعة له في شاشة الكاشير."
        itemName={deletingCategory ? `${deletingCategory.nameAr} (${deletingCategory.nameEn})` : undefined}
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
};
