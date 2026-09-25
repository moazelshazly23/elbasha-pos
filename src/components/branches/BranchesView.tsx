import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, MapPin, Check, Edit2, Trash2, X, Star } from 'lucide-react';
import { Branch } from '../../types';
import { posDb } from '../../services/db';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const BranchesView: React.FC = () => {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<Branch[]>(() => posDb.getBranches());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    isMain: false,
  });

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setBranches(posDb.getBranches());
    });
    return unsubscribe;
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      isMain: branches.length === 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isMain: branch.isMain,
    });
    setIsModalOpen(true);
  };

  const handleRequestDelete = (branch: Branch) => {
    if (branch.isMain) {
      showToast('لا يمكن حذف الفرع الرئيسي للمطعم! قم بتعيين فرع آخر كفرع رئيسي أولاً.', 'warning');
      return;
    }
    if (branches.length <= 1) {
      showToast('يجب أن يحتوي النظام على فرع نشط واحد على الأقل.', 'warning');
      return;
    }
    setDeletingBranch(branch);
  };

  const handleConfirmDelete = () => {
    if (!deletingBranch) return;
    const bName = deletingBranch.name;
    const success = posDb.deleteBranch(deletingBranch.id);
    setDeletingBranch(null);
    if (success) {
      showToast(`تم حذف فرع "${bName}" نهائياً من قاعدة البيانات`, 'success');
    } else {
      showToast('تعذر حذف الفرع، يرجى المحاولة لاحقاً', 'error');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('يرجى كتابة اسم الفرع', 'warning');
      return;
    }

    const isEdit = !!editingBranch;

    // If making this the main branch, update existing main branches
    if (formData.isMain) {
      branches.forEach((b) => {
        if (b.isMain && (!editingBranch || b.id !== editingBranch.id)) {
          posDb.saveBranch({ ...b, isMain: false });
        }
      });
    }

    if (editingBranch) {
      posDb.saveBranch({
        ...editingBranch,
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        isMain: formData.isMain,
      });
    } else {
      posDb.saveBranch({
        id: `branch-${Date.now()}`,
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        isMain: formData.isMain || branches.length === 0,
        active: true,
        createdAt: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
    setEditingBranch(null);
    showToast(isEdit ? `تم تعديل بيانات فرع "${formData.name}" بنجاح` : `تمت إضافة فرع "${formData.name}" بنجاح`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#8B1E1E]" />
          <div>
            <h2 className="text-base font-extrabold text-[#231610]">إدارة فروع المطعم</h2>
            <span className="text-xs text-[#7A6455]">
              إدارة سلسلة الفروع، الفروع الإقليمية، والمبيعات المنفصلة ({branches.length} فرع)
            </span>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-all shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فرع جديد</span>
        </button>
      </div>

      {/* Branches Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className={`bg-white p-5 rounded-2xl border transition-all space-y-3 shadow-xs hover:border-[#B8860B] ${
                b.isMain ? 'border-[#8B1E1E] bg-[#FFFBF7]' : 'border-[#E8DFD5]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-[#231610]">{b.name}</h3>
                    {b.isMain && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-[#FFF8EF] text-[#8B1E1E] border border-[#D7C3A5] rounded-md text-[10px] font-bold">
                        <Star className="w-3 h-3 text-[#B8860B] fill-[#B8860B]" />
                        <span>الفرع الرئيسي</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    كود: {b.id}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 text-gray-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors active:scale-95"
                    title="تعديل الفرع"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!b.isMain && (
                    <button
                      onClick={() => handleRequestDelete(b)}
                      className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                      title="حذف الفرع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600 pt-1 border-t border-[#E8DFD5]/60">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span className="font-mono text-[#231610] font-bold">{b.phone || 'غير مسجل'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#8B1E1E]" />
                  <span className="truncate">{b.address || 'لم يتم تحديد العنوان'}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-[#7A6455]">
                <span>الحالة: {b.active ? 'نشط ويعمل' : 'معطل'}</span>
                <span className="text-[10px] text-gray-400">
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString('ar-EG') : 'أساسي'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8DFD5] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#231610]">
                {editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">اسم الفرع *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: فرع التجمع الخامس"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01012345678"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">العنوان التفصيلي</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="الشارع، المنطقة، المعالم المميزة..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#8B1E1E]">
                  <input
                    type="checkbox"
                    checked={formData.isMain}
                    onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
                    className="rounded text-[#8B1E1E]"
                  />
                  <span>تعيين هذا الفرع كفرع رئيسي للمطعم</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-[#E8DFD5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] rounded-xl hover:bg-[#EAE0D2]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#8B1E1E] rounded-xl hover:bg-[#721616] shadow-xs active:scale-95"
                >
                  حفظ الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingBranch}
        title="تأكيد حذف الفرع"
        message="هل أنت متأكد من حذف هذا الفرع نهائياً؟ سيتم إلغاء ارتباطه بالطلبات المستقبلية."
        itemName={deletingBranch ? deletingBranch.name : undefined}
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingBranch(null)}
      />
    </div>
  );
};
