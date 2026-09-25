import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Calendar, Tag, Trash2, Edit2, X, AlertTriangle } from 'lucide-react';
import { Expense } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const ExpensesView: React.FC = () => {
  const { profile } = useBrand();
  const { currentUser, currentBranch } = useAuth();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>(() => posDb.getExpenses());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    category: 'مستلزمات تشغيل وفحم',
    amount: 100,
    paidFromDrawer: true,
    notes: '',
  });

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setExpenses(posDb.getExpenses());
    });
    return unsubscribe;
  }, []);

  const filtered = expenses.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    return true;
  });

  const totalExpenses = filtered.reduce((acc, e) => acc + e.amount, 0);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: 'مستلزمات تشغيل وفحم',
      amount: 100,
      paidFromDrawer: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title || '',
      category: exp.category,
      amount: exp.amount,
      paidFromDrawer: exp.paidFromDrawer ?? true,
      notes: exp.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingExpense) return;
    const title = deletingExpense.title;
    posDb.deleteExpense(deletingExpense.id);
    setDeletingExpense(null);
    showToast(`تم حذف مصروف "${title}" بنجاح من السجلات`, 'success');
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('يرجى إدخال بيان المصروف', 'warning');
      return;
    }
    if (formData.amount <= 0) {
      showToast('يرجى تحديد مبلغ مصروف صحيح أكبر من الصفر', 'warning');
      return;
    }

    const isEdit = !!editingExpense;

    if (editingExpense) {
      posDb.saveExpense({
        ...editingExpense,
        title: formData.title.trim(),
        category: formData.category,
        amount: Number(formData.amount),
        paidFromDrawer: formData.paidFromDrawer,
        notes: formData.notes.trim(),
      });
    } else {
      posDb.recordExpense({
        title: formData.title.trim(),
        category: formData.category,
        amount: Number(formData.amount),
        branchId: currentBranch?.id || 'branch-1',
        userId: currentUser?.id || 'cashier',
        userName: currentUser?.name || 'كاشير',
        paidFromDrawer: formData.paidFromDrawer,
        notes: formData.notes.trim(),
      });
    }

    setIsModalOpen(false);
    setEditingExpense(null);
    showToast(isEdit ? `تم تعديل مصروف "${formData.title}" بنجاح` : `تم تسجيل مصروف بقيمة ${formData.amount} ${profile.currency} بنجاح`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#8B1E1E]" />
            <div>
              <h2 className="text-base font-extrabold text-[#231610]">
                المصروفات التشغيلية والنثريات
              </h2>
              <span className="text-xs text-[#7A6455]">
                تسجيل نفقات الفحم، الغاز، الكهرباء، والنثريات وتأثيرها على درج الكاشير ({expenses.length} حركة)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#FFF8EF] px-3 py-1.5 rounded-xl border border-[#D7C3A5] text-xs">
              <span className="text-[#7A6455]">إجمالي المصروفات: </span>
              <span className="font-extrabold text-red-700 tabular-nums">
                {totalExpenses.toLocaleString('ar-EG')} {profile.currency}
              </span>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل مصروف جديد</span>
            </button>
          </div>
        </div>

        {/* Filter categories */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {['all', 'مستلزمات تشغيل وفحم', 'غاز وكهرباء ومياه', 'صيانة وأدوات', 'نثريات وضيافة', 'إيجار ورسوم', 'أجور يومية'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
                categoryFilter === cat ? 'bg-[#8B1E1E] text-white shadow-xs' : 'bg-gray-100 text-[#3E2723] hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? 'جميع البنود' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-[#D7C3A5] text-center space-y-3 max-w-md mx-auto my-12">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-[#231610]">لا توجد مصروفات مسجلة</h3>
            <p className="text-xs text-[#7A6455]">سجل المصروفات والنثريات اليومية لمتابعة حركة النقدية بدقة.</p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#8B1E1E] text-white rounded-xl text-xs font-bold hover:bg-[#721616]"
            >
              تسجيل مصروف جديد
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DFD5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F5EFE6] text-[#3E2723] font-bold border-b border-[#E8DFD5]">
                  <tr>
                    <th className="p-3">بيان المصروف</th>
                    <th className="p-3">بند النفقة</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">طريقة الخصم</th>
                    <th className="p-3">المسؤول</th>
                    <th className="p-3">التاريخ والوقت</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE6]">
                  {filtered.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#FFF8EF] transition-colors">
                      <td className="p-3">
                        <div className="font-extrabold text-[#231610]">{exp.title}</div>
                        {exp.notes && <div className="text-[10px] text-gray-500">{exp.notes}</div>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-[#6F4E37]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 font-extrabold text-red-700 tabular-nums text-sm">
                        {exp.amount.toLocaleString('ar-EG')} {profile.currency}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            exp.paidFromDrawer
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {exp.paidFromDrawer ? 'خصم من درج الكاشير' : 'خزينة رئيسية / عهدة'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-gray-700">{exp.userName || 'المسؤول'}</td>
                      <td className="p-3 text-gray-500 tabular-nums">
                        {new Date(exp.createdAt).toLocaleString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'numeric',
                        })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-[#8B1E1E] hover:text-white transition-colors active:scale-95"
                            title="تعديل بيان المصروف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(exp)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition-colors active:scale-95"
                            title="حذف المصروف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
                {editingExpense ? 'تعديل بيان المصروف' : 'تسجيل مصروف جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  بيان المصروف (السبب / الوصف) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: شراء شيكارتين فحم نباتي للشواية"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    بند المصروف *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  >
                    <option value="مستلزمات تشغيل وفحم">مستلزمات تشغيل وفحم</option>
                    <option value="غاز وكهرباء ومياه">غاز وكهرباء ومياه</option>
                    <option value="صيانة وأدوات">صيانة وأدوات</option>
                    <option value="نثريات وضيافة">نثريات وضيافة</option>
                    <option value="إيجار ورسوم">إيجار ورسوم</option>
                    <option value="أجور يومية">أجور يومية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    المبلغ ({profile.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="رقم الفاتورة الورقية أو اسم الشخص المستلم..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#8B1E1E]">
                  <input
                    type="checkbox"
                    checked={formData.paidFromDrawer}
                    onChange={(e) => setFormData({ ...formData, paidFromDrawer: e.target.checked })}
                    className="rounded text-[#8B1E1E]"
                  />
                  <span>خصم المبلغ مباشرة من نقدية درج الكاشير الحالي</span>
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
                  {editingExpense ? 'حفظ التعديلات' : 'تسجيل المصروف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingExpense}
        title="تأكيد حذف حركة المصروف"
        message="هل أنت متأكد من حذف حركة المصروف هذه نهائياً؟ ستتغير إحصائيات تقرير المصروفات بناءً على ذلك."
        itemName={deletingExpense ? `${deletingExpense.title} (${deletingExpense.amount} ${profile.currency})` : undefined}
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingExpense(null)}
      />
    </div>
  );
};
