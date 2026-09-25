import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, User, Key, Lock, CheckCircle2, X, Edit2, Trash2, Power } from 'lucide-react';
import { User as UserType, UserRole } from '../../types';
import { posDb } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const UsersView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserType[]>(() => posDb.getUsers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserType | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    pin: '',
    role: 'cashier' as UserRole,
  });

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setUsers(posDb.getUsers());
    });
    return unsubscribe;
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', password: '', pin: '', role: 'cashier' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '',
      pin: user.pin || '',
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleRequestDelete = (user: UserType) => {
    if (user.id === currentUser?.id) {
      showToast('لا يمكنك حذف الحساب الخاص بك وأنت مسجل الدخول به حالياً!', 'warning');
      return;
    }
    const adminCount = users.filter((u) => u.role === 'admin').length;
    if (user.role === 'admin' && adminCount <= 1) {
      showToast('يجب الاحتفاظ بمدير نظام نشط واحد على الأقل.', 'warning');
      return;
    }
    setDeletingUser(user);
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    const uName = deletingUser.name;
    posDb.deleteUser(deletingUser.id, currentUser?.id || 'admin', currentUser?.name || 'المدير العام');
    setDeletingUser(null);
    showToast(`تم حذف حساب الموظف "${uName}" نهائياً من قاعدة البيانات`, 'success');
  };

  const toggleUserActive = (user: UserType) => {
    if (user.id === currentUser?.id) {
      showToast('لا يمكنك تعطيل حسابك الحالي المسجل به الآن!', 'warning');
      return;
    }
    const updated = { ...user, active: !user.active };
    posDb.saveUser(updated, currentUser?.id || 'admin', currentUser?.name || 'المدير العام');
    showToast(
      updated.active
        ? `تم تفعيل حساب الموظف "${user.name}" بنجاح`
        : `تم تعطيل حساب الموظف "${user.name}" مؤقتاً`,
      updated.active ? 'success' : 'warning'
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      showToast('يرجى إدخال اسم الموظف واسم المستخدم', 'warning');
      return;
    }

    const isEdit = !!editingUser;

    if (editingUser) {
      posDb.saveUser(
        {
          ...editingUser,
          name: formData.name.trim(),
          username: formData.username.trim(),
          password: formData.password ? formData.password : editingUser.password,
          pin: formData.pin ? formData.pin.trim() : editingUser.pin || '1234',
          role: formData.role,
          permissions:
            formData.role === 'admin'
              ? ['all']
              : formData.role === 'manager'
              ? ['pos', 'reports', 'inventory', 'tables']
              : formData.role === 'kitchen'
              ? ['kds']
              : ['pos', 'tables'],
        },
        currentUser?.id || 'admin',
        currentUser?.name || 'المدير العام'
      );
    } else {
      posDb.saveUser(
        {
          id: `usr-${Date.now()}`,
          name: formData.name.trim(),
          username: formData.username.trim(),
          password: formData.password || '123456',
          pin: formData.pin ? formData.pin.trim() : '1234',
          role: formData.role,
          branchId: 'branch-1',
          active: true,
          permissions:
            formData.role === 'admin'
              ? ['all']
              : formData.role === 'manager'
              ? ['pos', 'reports', 'inventory', 'tables']
              : formData.role === 'kitchen'
              ? ['kds']
              : ['pos', 'tables'],
          createdAt: new Date().toISOString(),
        },
        currentUser?.id || 'admin',
        currentUser?.name || 'المدير العام'
      );
    }

    setIsModalOpen(false);
    setEditingUser(null);
    showToast(isEdit ? `تم تعديل بيانات حساب "${formData.name}" بنجاح` : `تمت إضافة الموظف "${formData.name}" بنجاح`, 'success');
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'مدير النظام (Admin)';
      case 'manager':
        return 'مدير فرع / تشغيل (Manager)';
      case 'cashier':
        return 'كاشير ومبيعات (Cashier)';
      case 'kitchen':
        return 'طاهي المطبخ والشواية (Kitchen)';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#8B1E1E]" />
          <div>
            <h2 className="text-base font-extrabold text-[#231610]">
              الموظفون والصلاحيات (Staff & RBAC)
            </h2>
            <span className="text-xs text-[#7A6455]">
              إدارة وتعديل وإضافة حسابات الكاشير والشيف والمديرين مع رموز PIN للدخول السريع ({users.length} موظف)
            </span>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div
              key={u.id}
              className={`bg-white p-5 rounded-2xl border transition-all space-y-3 shadow-xs hover:border-[#B8860B] ${
                !u.active ? 'opacity-65 border-dashed border-gray-300' : 'border-[#E8DFD5]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-[#231610]">{u.name}</h3>
                    {u.id === currentUser?.id && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        أنت الآن
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#8B1E1E] font-bold block mt-0.5">
                    {getRoleLabel(u.role)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleUserActive(u)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      u.active
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={u.active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-1.5 text-gray-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors active:scale-95"
                    title="تعديل الموظف"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleRequestDelete(u)}
                      className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                      title="حذف الموظف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-[#E8DFD5]/60">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">اسم الدخول:</span>
                  <span className="font-mono font-bold text-[#231610]">{u.username}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">رمز الدخول السريع PIN:</span>
                  <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {u.pin || '1234'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">حالة الحساب:</span>
                  <span className={`font-bold ${u.active ? 'text-emerald-700' : 'text-gray-400'}`}>
                    {u.active ? 'مفعل ويعمل' : 'معطل مؤقتاً'}
                  </span>
                </div>
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
                {editingUser ? `تعديل بيانات: ${editingUser.name}` : 'إضافة موظف جديد'}
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
                <label className="block text-xs font-bold text-[#231610] mb-1">اسم الموظف الثلاثي *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: محمد السيد أحمد"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">اسم الدخول (Username) *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="مثال: mohamed.cashier"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    {editingUser ? 'كلمة المرور (اتركه فارغاً للإبقاء)' : 'كلمة المرور *'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">رمز PIN السريع (4 أرقام) *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="1234"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">الدور والصلاحيات *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                >
                  <option value="cashier">كاشير ومبيعات (نقطة البيع + الطاولات)</option>
                  <option value="kitchen">طاهي وشيف مطبخ (شاشة المطبخ KDS فقط)</option>
                  <option value="manager">مدير تشغيل (مبيعات + تقارير + مخزون)</option>
                  <option value="admin">مدير نظام كامل (كافة الصلاحيات والإعدادات)</option>
                </select>
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
                  {editingUser ? 'حفظ التعديلات' : 'إضافة الموظف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingUser}
        title="تأكيد حذف حساب الموظف"
        message="هل أنت متأكد من حذف حساب هذا الموظف نهائياً؟ لن يتمكن من تسجيل الدخول إلى النظام مجدداً."
        itemName={deletingUser ? `${deletingUser.name} (${deletingUser.username})` : undefined}
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
};
