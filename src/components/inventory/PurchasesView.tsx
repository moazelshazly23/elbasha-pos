import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, FileText, CheckCircle2, DollarSign, Calendar, X, Trash2, Edit2 } from 'lucide-react';
import { Supplier, PurchaseOrder, Ingredient } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const PurchasesView: React.FC = () => {
  const { profile } = useBrand();
  const { currentUser, currentBranch, hasPermission } = useAuth();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => posDb.getSuppliers());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => posDb.getPurchaseOrders());
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => posDb.getIngredients());

  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  // Deletion confirm states
  const [deletingSupplier, setDeletingSupplier] = useState<{ id: string; name: string } | null>(null);
  const [deletingPO, setDeletingPO] = useState<{ id: string; orderNumber: string } | null>(null);

  // New PO form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [poItems, setPoItems] = useState<{ ingredientId: string; quantity: number; unitPrice: number }[]>([]);
  const [poPaymentStatus, setPoPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [poNotes, setPoNotes] = useState('');

  // Supplier form state
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierCompany, setSupplierCompany] = useState('');
  const [supplierCategory, setSupplierCategory] = useState('لحوم');

  const filteredSuppliers = suppliers.filter((s) => {
    if (!supplierSearchQuery.trim()) return true;
    const q = supplierSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.company && s.company.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
  });

  const openAddSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierCompany('');
    setSupplierCategory('لحوم');
    setIsNewSupplierModalOpen(true);
  };

  const openEditSupplierModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierName(sup.name);
    setSupplierPhone(sup.phone);
    setSupplierCompany(sup.company || '');
    setSupplierCategory(sup.category);
    setIsNewSupplierModalOpen(true);
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    setDeletingSupplier({ id, name });
  };

  const handleConfirmDeleteSupplier = () => {
    if (!deletingSupplier) return;
    const { id, name } = deletingSupplier;
    posDb.deleteSupplier(id);
    setDeletingSupplier(null);
    showToast(`تم حذف المورد "${name}" نهائياً من قاعدة البيانات`, 'success');
  };

  const handleDeletePurchaseOrder = (id: string, orderNumber: string) => {
    setDeletingPO({ id, orderNumber });
  };

  const handleConfirmDeletePO = () => {
    if (!deletingPO) return;
    const { id, orderNumber } = deletingPO;
    posDb.deletePurchaseOrder(id);
    setDeletingPO(null);
    showToast(`تم حذف فاتورة التوريد "${orderNumber}" نهائياً من السجلات`, 'success');
  };

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setSuppliers(posDb.getSuppliers());
      setPurchaseOrders(posDb.getPurchaseOrders());
      setIngredients(posDb.getIngredients());
    });
    return unsubscribe;
  }, []);

  const handleAddPoItem = (ingId: string) => {
    const ing = ingredients.find((i) => i.id === ingId);
    if (!ing) return;
    setPoItems((prev) => [...prev, { ingredientId: ingId, quantity: 10, unitPrice: ing.costPerUnit }]);
  };

  const handleCreatePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) {
      showToast('يرجى اختيار المورد للفاتورة', 'warning');
      return;
    }
    if (poItems.length === 0) {
      showToast('يرجى إضافة صنف أو مادة خام واحدة على الأقل لفاتورة التوريد', 'warning');
      return;
    }

    const totalAmount = poItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

    const formattedItems = poItems.map((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      return {
        ingredientId: item.ingredientId,
        ingredientName: ing?.name || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      };
    });

    const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}`;

    posDb.createPurchaseOrder(
      {
        orderNumber: poNumber,
        supplierId: sup.id,
        supplierName: sup.name,
        branchId: currentBranch?.id || 'branch-1',
        items: formattedItems,
        totalAmount,
        paidAmount: poPaymentStatus === 'paid' ? totalAmount : 0,
        status: 'received', // Immediately restocks inventory!
        paymentStatus: poPaymentStatus,
        createdAt: new Date().toISOString(),
        notes: poNotes,
      },
      currentUser?.id || 'admin',
      currentUser?.name || 'المدير'
    );

    setIsNewOrderModalOpen(false);
    setPoItems([]);
    setPoNotes('');
    showToast(`تم حفظ فاتورة التوريد (${poNumber}) وإضافة الكميات تلقائياً إلى رصيد المخزون!`, 'success');
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showToast('يرجى كتابة اسم المورد', 'warning');
      return;
    }

    const isEdit = !!editingSupplier;

    if (editingSupplier) {
      posDb.saveSupplier({
        ...editingSupplier,
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        company: supplierCompany.trim(),
        category: supplierCategory,
      });
    } else {
      posDb.saveSupplier({
        id: `sup-${Date.now()}`,
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        company: supplierCompany.trim(),
        category: supplierCategory,
        balance: 0,
      });
    }

    setIsNewSupplierModalOpen(false);
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierPhone('');
    showToast(isEdit ? `تم تعديل بيانات المورد "${supplierName}" بنجاح` : `تم تسجيل المورد الجديد "${supplierName}" بنجاح`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#8B1E1E]" />
            <div>
              <h2 className="text-base font-extrabold text-[#231610]">
                المشتريات وإدارة الموردين
              </h2>
              <span className="text-xs text-[#7A6455]">
                تسجيل فواتير توريد اللحوم والبضائع وزيادة رصيد المستودع تلقائياً
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddSupplierModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D7C3A5] bg-[#FFF8EF] text-[#6F4E37] text-xs font-bold hover:bg-[#F5EFE6]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مورد</span>
            </button>
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل فاتورة توريد جديدة</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg font-bold ${
              activeTab === 'orders' ? 'bg-[#8B1E1E] text-white' : 'bg-gray-100 text-[#3E2723]'
            }`}
          >
            فواتير المشتريات ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 rounded-lg font-bold ${
              activeTab === 'suppliers' ? 'bg-[#8B1E1E] text-white' : 'bg-gray-100 text-[#3E2723]'
            }`}
          >
            قائمة الموردين المعتمدين ({suppliers.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'orders' ? (
          <div className="bg-white rounded-2xl border border-[#E8DFD5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F5EFE6] text-[#3E2723] font-bold border-b border-[#E8DFD5]">
                  <tr>
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">المورد</th>
                    <th className="p-3">الأصناف الموردة</th>
                    <th className="p-3">القيمة الإجمالية</th>
                    <th className="p-3">حالة السداد</th>
                    <th className="p-3">حالة الاستلام</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE6]">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-[#FFF8EF]">
                      <td className="p-3 font-extrabold text-[#8B1E1E]">{po.orderNumber}</td>
                      <td className="p-3 font-bold text-[#231610]">{po.supplierName}</td>
                      <td className="p-3 text-gray-600">
                        {po.items.map((i) => `${i.ingredientName} (${i.quantity})`).join('، ')}
                      </td>
                      <td className="p-3 font-extrabold text-[#8B1E1E] tabular-nums">
                        {(po.totalAmount ?? po.total).toLocaleString('ar-EG')} {profile.currency}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            po.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {po.paymentStatus === 'paid' ? 'مسددة بالكامل' : 'آجل / مستحق'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800"
                        >
                          تم استلامها بالمخزن
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 tabular-nums">
                        {new Date(po.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3 text-center">
                        {hasPermission('admin') && (
                          <button
                            onClick={() => handleDeletePurchaseOrder(po.id, po.orderNumber)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                            title="حذف فاتورة التوريد نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Suppliers Search & Controls */}
            {suppliers.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E8DFD5] shadow-xs">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#7A6455]" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، اسم الشركة، الهاتف، التصنيف..."
                    value={supplierSearchQuery}
                    onChange={(e) => setSupplierSearchQuery(e.target.value)}
                    className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
                  />
                </div>
                <button
                  onClick={openAddSupplierModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مورد</span>
                </button>
              </div>
            )}

            {suppliers.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#E8DFD5] text-center space-y-3 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center mx-auto shadow-2xs">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-base text-[#231610]">لا يوجد موردون حالياً</h3>
                <p className="text-xs text-[#7A6455] max-w-sm mx-auto">
                  لم يتم تسجيل أي موردين في النظام بعد. ابدأ بإضافة الموردين لربطهم بالمشتريات وتوريد المواد الخام.
                </p>
                <div className="pt-2">
                  <button
                    onClick={openAddSupplierModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مورد جديد</span>
                  </button>
                </div>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-[#E8DFD5] text-center space-y-2">
                <p className="font-bold text-sm text-[#231610]">لا توجد نتائج مطابقة لبحث الموردين</p>
                <p className="text-xs text-gray-500">جرب البحث بكلمات أخرى أو مسح نص البحث</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white p-4 rounded-2xl border border-[#E8DFD5] space-y-2 shadow-xs hover:border-[#D7C3A5] transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-sm text-[#231610]">{s.name}</h3>
                        <span className="text-xs text-[#7A6455]">{s.company || 'مورد فردي'}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 text-[#3E2723] rounded-md text-[10px] font-bold">
                        {s.category}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 font-mono">هاتف: {s.phone}</div>

                    <div className="pt-2 border-t border-[#F5EFE6] flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-500">رصيد الحساب: </span>
                        <span className="font-bold text-xs text-[#8B1E1E] tabular-nums">
                          {s.balance} {profile.currency}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditSupplierModal(s)}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                          title="تعديل بيانات المورد"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {hasPermission('admin') && (
                          <button
                            onClick={() => handleDeleteSupplier(s.id, s.name)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                            title="حذف المورد نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Purchase Invoice Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#E8DFD5]">
            <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#231610]">تسجيل فاتورة توريد جديدة</h3>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchaseOrder} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">المورد *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.company})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">حالة السداد *</label>
                  <select
                    value={poPaymentStatus}
                    onChange={(e) => setPoPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  >
                    <option value="paid">مدفوعة نقداً / كاش</option>
                    <option value="unpaid">آجل / دين على المطعم</option>
                  </select>
                </div>
              </div>

              {/* Add item to invoice */}
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  إضافة مواد خام للفاتورة
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddPoItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white text-[#8B1E1E] font-bold"
                >
                  <option value="">+ اختر مادة خام للإضافة بالفاتورة...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {poItems.map((item, idx) => {
                  const ing = ingredients.find((i) => i.id === item.ingredientId);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#FBF9F6] border border-[#E8DFD5] rounded-xl flex items-center justify-between text-xs gap-2"
                    >
                      <span className="font-bold flex-1">{ing?.name}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPoItems((prev) => {
                              const next = [...prev];
                              next[idx].quantity = val;
                              return next;
                            });
                          }}
                          className="w-16 bg-white border border-[#D7C3A5] rounded-lg px-2 py-1 text-center font-bold tabular-nums"
                        />
                        <span className="text-[11px] text-gray-500">{ing?.unit}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPoItems((prev) => {
                              const next = [...prev];
                              next[idx].unitPrice = val;
                              return next;
                            });
                          }}
                          className="w-20 bg-white border border-[#D7C3A5] rounded-lg px-2 py-1 text-center font-bold tabular-nums"
                        />
                        <span className="text-[10px] text-gray-500">{profile.currency}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">ملاحظات الفاتورة</label>
                <input
                  type="text"
                  placeholder="رقم سند القبض، اسم السائق..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E8DFD5]">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={poItems.length === 0}
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#8B1E1E] rounded-xl hover:bg-[#721616] disabled:opacity-50"
                >
                  تأكيد واستلام بالمستودع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New / Edit Supplier Modal */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl border border-[#E8DFD5]">
            <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2">
              <h3 className="font-bold text-sm text-[#231610]">
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد معتمد جديد'}
              </h3>
              <button
                onClick={() => {
                  setIsNewSupplierModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">اسم المورد *</label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">الهاتف</label>
                <input
                  type="tel"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">الشركة أو المزرعة</label>
                <input
                  type="text"
                  value={supplierCompany}
                  onChange={(e) => setSupplierCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewSupplierModalOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#8B1E1E] rounded-xl hover:bg-[#721616]"
                >
                  {editingSupplier ? 'حفظ التعديلات' : 'حفظ المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Supplier */}
      <ConfirmModal
        isOpen={!!deletingSupplier}
        title="تأكيد حذف المورد"
        message="هل أنت متأكد من حذف هذا المورد نهائياً من السيستم؟ لن يتم حذف فواتير التوريد السابقة المرتبطة به."
        itemName={deletingSupplier?.name}
        confirmText="حذف المورد نهائياً"
        onConfirm={handleConfirmDeleteSupplier}
        onClose={() => setDeletingSupplier(null)}
      />

      {/* Confirm Delete PO */}
      <ConfirmModal
        isOpen={!!deletingPO}
        title="تأكيد حذف فاتورة التوريد"
        message="هل أنت متأكد من حذف فاتورة التوريد هذه نهائياً؟ تنبيه: هذه العملية ستحذف سجل الفاتورة من النظام."
        itemName={deletingPO?.orderNumber}
        confirmText="حذف الفاتورة نهائياً"
        onConfirm={handleConfirmDeletePO}
        onClose={() => setDeletingPO(null)}
      />
    </div>
  );
};
