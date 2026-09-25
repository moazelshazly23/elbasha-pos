import React, { useState, useEffect } from 'react';
import { Users, Phone, MapPin, Search, Plus, Bike, CheckCircle2, Clock, Trash2, Edit2, X, Navigation } from 'lucide-react';
import { Customer, Order } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const CustomersView: React.FC = () => {
  const { profile } = useBrand();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>(() => posDb.getCustomers());
  const [orders, setOrders] = useState<Order[]>(() => posDb.getOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'directory' | 'delivery'>('directory');

  // Customer modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    area: '',
    notes: '',
  });

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setCustomers(posDb.getCustomers());
      setOrders(posDb.getOrders());
    });
    return unsubscribe;
  }, []);

  const deliveryOrders = orders.filter((o) => o.type === 'delivery');

  const filteredCustomers = customers.filter((c) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false;
    }
    return true;
  });

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', area: '', notes: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || '',
      area: customer.area || '',
      notes: customer.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingCustomer) return;
    const name = deletingCustomer.name;
    posDb.deleteCustomer(deletingCustomer.id);
    setDeletingCustomer(null);
    showToast(`تم حذف العميل "${name}" نهائياً من السجلات`, 'success');
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('يرجى إدخال اسم العميل ورقم الهاتف', 'warning');
      return;
    }

    const isEdit = !!editingCustomer;

    if (editingCustomer) {
      posDb.saveCustomer({
        ...editingCustomer,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        area: formData.area.trim(),
        notes: formData.notes.trim(),
      });
    } else {
      posDb.saveCustomer({
        id: `cust-${Date.now()}`,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        area: formData.area.trim(),
        notes: formData.notes.trim(),
        ordersCount: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
    setEditingCustomer(null);
    showToast(isEdit ? `تم تعديل بيانات العميل "${formData.name}" بنجاح` : `تمت إضافة العميل "${formData.name}" بنجاح`, 'success');
  };

  const handleUpdateOrderStatus = (orderId: string, status: any) => {
    posDb.updateOrderStatus(orderId, status, currentUser?.id || 'admin', currentUser?.name || 'المدير');
    showToast(`تم تحديث حالة طلب التوصيل إلى: ${status === 'completed' ? 'مكتمل ومُسلَّم' : status}`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8B1E1E]" />
            <div>
              <h2 className="text-base font-extrabold text-[#231610]">
                العملاء ومتابعة الدليفري
              </h2>
              <span className="text-xs text-[#7A6455]">
                سجل بيانات العملاء وعناوين التوصيل وحركة أوردرات الدليفري ({customers.length} عميل)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'directory' ? 'bg-[#8B1E1E] text-white shadow-xs' : 'bg-gray-100 text-[#3E2723] hover:bg-gray-200'
            }`}
          >
            دليل العملاء ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'delivery' ? 'bg-[#8B1E1E] text-white shadow-xs' : 'bg-gray-100 text-[#3E2723] hover:bg-gray-200'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>طلبات التوصيل النشطة ({deliveryOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'directory' ? (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#7A6455]" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-hidden focus:ring-2 focus:ring-[#8B1E1E] bg-white"
              />
            </div>

            {/* Customers Grid */}
            {filteredCustomers.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-[#D7C3A5] text-center space-y-3 max-w-md mx-auto my-12">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="font-extrabold text-sm text-[#231610]">لا يوجد عملاء مطابقون للبحث</h3>
                <p className="text-xs text-[#7A6455]">أضف بيانات العملاء وعناوينهم لتسهيل طلبات الدليفري السريعة.</p>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-[#8B1E1E] text-white rounded-xl text-xs font-bold hover:bg-[#721616]"
                >
                  إضافة عميل جديد
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs space-y-3 hover:border-[#B8860B] transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-sm text-[#231610]">{c.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-[#8B1E1E]" />
                          <span className="font-mono font-bold text-[#231610]">{c.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-800 hover:bg-amber-50 transition-colors active:scale-95"
                          title="تعديل بيانات العميل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCustomer(c)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors active:scale-95"
                          title="حذف العميل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1 pt-1 border-t border-[#E8DFD5]/60">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#B8860B] shrink-0 mt-0.5" />
                        <span className="truncate">{c.address || 'العنوان غير مسجل'}</span>
                      </div>
                      {c.area && (
                        <div className="text-[11px] text-gray-500 pr-5">المنطقة: {c.area}</div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] bg-[#FAF7F2] p-2 rounded-xl">
                      <span className="text-[#7A6455]">
                        الطلبات: <b className="text-[#231610]">{c.ordersCount || 0}</b>
                      </span>
                      <span className="text-[#7A6455]">
                        المجموع: <b className="text-[#8B1E1E]">{(c.totalSpent || 0).toLocaleString('ar-EG')} {profile.currency}</b>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Delivery Orders Tab */
          <div className="space-y-3">
            {deliveryOrders.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-[#D7C3A5] text-center space-y-2 max-w-md mx-auto my-12">
                <Bike className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="font-extrabold text-sm text-[#231610]">لا توجد طلبات توصيل مسجلة</h3>
                <p className="text-xs text-[#7A6455]">عند اختيار نوع الطلب "توصيل / Delivery" في شاشة الكاشير، سيظهر هنا للمتابعة.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deliveryOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#8B1E1E]">{o.orderNumber}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                          {o.status === 'completed'
                            ? 'تم التوصيل'
                            : o.status === 'ready'
                            ? 'جاهز للتوصيل'
                            : o.status === 'preparing'
                            ? 'قيد التحضير'
                            : 'جديد'}
                        </span>
                      </div>
                      <span className="font-extrabold text-sm text-[#231610]">
                        {o.total} {profile.currency}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-gray-700">
                      <div><b>العميل:</b> {o.customerName || 'عميل نقدي'} - <span className="font-mono font-bold">{o.customerPhone}</span></div>
                      <div><b>العنوان:</b> {o.deliveryAddress || 'لم يحدد'}</div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DFD5]">
                      {o.status !== 'completed' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(o.id, 'completed')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors shadow-2xs active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تأكيد استلام العميل (تم التوصيل)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Add / Edit Customer */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8DFD5] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#231610]">
                {editingCustomer ? `تعديل بيانات العميل: ${editingCustomer.name}` : 'إضافة عميل جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: م. طارق العوضي"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01012345678"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">المنطقة / الحي</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="مثال: المعادي - دجلة"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">العنوان التفصيلي</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="اسم الشارع، رقم العمارة، رقم الشقة، علامة مميزة..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">ملاحظات العميل المفضلة</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="مثال: يفضل خبز بلدي زيادة، الاتصال قبل الوصول..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
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
                  {editingCustomer ? 'حفظ التعديلات' : 'إضافة العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingCustomer}
        title="تأكيد حذف بيانات العميل"
        message="هل أنت متأكد من حذف بيانات هذا العميل نهائياً من السيستم؟ لن تتأثر فواتير المبيعات السابقة المحفوظة."
        itemName={deletingCustomer ? `${deletingCustomer.name} (${deletingCustomer.phone})` : undefined}
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCustomer(null)}
      />
    </div>
  );
};
