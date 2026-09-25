import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  Sparkles,
  Flame,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Package,
} from 'lucide-react';
import { Product, Category } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const ProductsView: React.FC = () => {
  const { profile } = useBrand();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>(() => posDb.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => posDb.getCategories());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Deletion confirm state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    sku: '',
    barcode: '',
    categoryId: '',
    price: 0,
    costPrice: 0,
    prepTimeMinutes: 15,
    kitchenStation: 'grill' as 'grill' | 'kitchen' | 'cold',
    image: '',
    description: '',
    available: true,
    isPopular: false,
    trackInventory: false,
    currentStock: 50,
    minStock: 10,
    unit: 'وجبة',
  });

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setProducts(posDb.getProducts());
      setCategories(posDb.getCategories());
    });
    return unsubscribe;
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      nameAr: '',
      nameEn: '',
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      barcode: '',
      categoryId: categories[0]?.id || '',
      price: 150,
      costPrice: 80,
      prepTimeMinutes: 15,
      kitchenStation: 'grill',
      image: '',
      description: '',
      available: true,
      isPopular: false,
      trackInventory: false,
      currentStock: 50,
      minStock: 10,
      unit: 'وجبة',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      sku: product.sku,
      barcode: product.barcode || '',
      categoryId: product.categoryId,
      price: product.price,
      costPrice: product.costPrice,
      prepTimeMinutes: product.prepTimeMinutes,
      kitchenStation: product.kitchenStation,
      image: product.image || '',
      description: product.description || '',
      available: product.available,
      isPopular: product.isPopular || false,
      trackInventory: product.trackInventory || false,
      currentStock: product.currentStock ?? 50,
      minStock: product.minStock ?? 10,
      unit: product.unit || 'وجبة',
    });
    setIsModalOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({ ...prev, image: dataUrl }));
      showToast('تم تحميل صورة الصنف بنجاح', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr.trim()) {
      showToast('يرجى إدخال اسم الصنف بالعربية', 'warning');
      return;
    }
    if (formData.price <= 0) {
      showToast('يرجى تحديد سعر بيع صحيح أكبر من الصفر', 'warning');
      return;
    }

    const isEdit = !!editingProduct;
    const targetId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;

    const saved: Product = {
      id: targetId,
      nameAr: formData.nameAr.trim(),
      nameEn: formData.nameEn.trim() || formData.nameAr.trim(),
      sku: formData.sku.trim(),
      barcode: formData.barcode.trim(),
      categoryId: formData.categoryId || (categories[0]?.id ?? 'cat-1'),
      price: Number(formData.price),
      costPrice: Number(formData.costPrice),
      prepTimeMinutes: Number(formData.prepTimeMinutes) || 15,
      kitchenStation: formData.kitchenStation,
      image: formData.image,
      description: formData.description.trim(),
      available: formData.available,
      isPopular: formData.isPopular,
      trackInventory: formData.trackInventory,
      currentStock: formData.trackInventory ? Number(formData.currentStock) : undefined,
      minStock: formData.trackInventory ? Number(formData.minStock) : undefined,
      unit: formData.unit || 'وجبة',
      modifierGroupIds: editingProduct?.modifierGroupIds || ['mod-spice', 'mod-sides'],
    };

    posDb.saveProduct(saved);
    setIsModalOpen(false);
    showToast(isEdit ? `تم تعديل بيانات صنف "${saved.nameAr}" بنجاح` : `تمت إضافة صنف "${saved.nameAr}" بنجاح`, 'success');
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    const pName = deletingProduct.nameAr;
    posDb.deleteProduct(deletingProduct.id);
    setDeletingProduct(null);
    showToast(`تم حذف صنف "${pName}" نهائياً من قاعدة البيانات`, 'success');
  };

  const toggleAvailability = (product: Product) => {
    const updated = { ...product, available: !product.available };
    posDb.saveProduct(updated);
    showToast(
      updated.available
        ? `صنف "${product.nameAr}" أصبح متاحاً للطلب الآن`
        : `صنف "${product.nameAr}" تم إيقافه مؤقتاً (غير متوفر)`,
      updated.available ? 'success' : 'warning'
    );
  };

  const filtered = products.filter((p) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!p.nameAr.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#8B1E1E]" />
            <div>
              <h2 className="text-base font-extrabold text-[#231610]">
                إدارة قائمة الأصناف والمنيو
              </h2>
              <span className="text-xs text-[#7A6455]">
                إضافة وتعديل أسعار وتكاليف الوجبات والمشويات والمشروبات ({products.length} صنف)
              </span>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#7A6455]" />
            <input
              type="text"
              placeholder="ابحث باسم الصنف أو كود SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-hidden focus:ring-2 focus:ring-[#8B1E1E] bg-[#FBF9F6]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedCategory === 'all' ? 'bg-[#8B1E1E] text-white shadow-xs' : 'bg-gray-100 text-[#3E2723] hover:bg-gray-200'
              }`}
            >
              الكل ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
                  selectedCategory === c.id ? 'bg-[#8B1E1E] text-white shadow-xs' : 'bg-gray-100 text-[#3E2723] hover:bg-gray-200'
                }`}
              >
                {c.nameAr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-[#D7C3A5] text-center space-y-3 max-w-md mx-auto my-12">
            <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-[#231610]">لا توجد أصناف مطابقة للبحث</h3>
            <p className="text-xs text-[#7A6455]">تأكد من كتابة الاسم أو كود الصنف بشكل صحيح، أو قم بإضافة صنف جديد.</p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#8B1E1E] text-white rounded-xl text-xs font-bold hover:bg-[#721616]"
            >
              إضافة صنف جديد
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DFD5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F5EFE6] text-[#3E2723] font-bold border-b border-[#E8DFD5]">
                  <tr>
                    <th className="p-3">الصورة</th>
                    <th className="p-3">اسم الصنف (عربي / English)</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3">سعر البيع</th>
                    <th className="p-3">تكلفة الصنف</th>
                    <th className="p-3">هامش الربح</th>
                    <th className="p-3">محطة الطهي</th>
                    <th className="p-3">وقت التحضير</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE6]">
                  {filtered.map((prod) => {
                    const cat = categories.find((c) => c.id === prod.categoryId);
                    const margin = prod.price - prod.costPrice;
                    const marginPercent = prod.price > 0 ? ((margin / prod.price) * 100).toFixed(0) : '0';

                    return (
                      <tr key={prod.id} className="hover:bg-[#FFF8EF] transition-colors">
                        <td className="p-3">
                          <img
                            src={prod.image || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=100'}
                            alt={prod.nameAr}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E8DFD5] shadow-2xs"
                          />
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-[#231610]">{prod.nameAr}</span>
                            {prod.isPopular && (
                              <span className="flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                <span>شهير</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500">{prod.nameEn}</div>
                          <span className="text-[9px] font-mono bg-gray-100 text-gray-700 px-1 rounded">
                            {prod.sku}
                          </span>
                        </td>

                        <td className="p-3 font-semibold text-[#8B1E1E]">
                          {cat?.nameAr || 'غير محدد'}
                        </td>

                        <td className="p-3 font-extrabold text-sm text-[#8B1E1E] tabular-nums">
                          {prod.price} {profile.currency}
                        </td>

                        <td className="p-3 font-bold text-gray-600 tabular-nums">
                          {prod.costPrice} {profile.currency}
                        </td>

                        <td className="p-3 tabular-nums">
                          <span className="font-bold text-emerald-700">+{margin} {profile.currency}</span>
                          <span className="text-[10px] text-gray-500 block">({marginPercent}%)</span>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            {prod.kitchenStation === 'grill'
                              ? 'شواية وفحم'
                              : prod.kitchenStation === 'kitchen'
                              ? 'مطبخ ساخن'
                              : 'سلطات وبارد'}
                          </span>
                        </td>

                        <td className="p-3 tabular-nums text-gray-600">
                          {prod.prepTimeMinutes} دقيقة
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => toggleAvailability(prod)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors shadow-2xs ${
                              prod.available
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                            }`}
                          >
                            {prod.available ? 'متاح للطلب' : 'غير متوفر'}
                          </button>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(prod)}
                              className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-[#8B1E1E] hover:text-white transition-colors active:scale-95"
                              title="تعديل بيانات الصنف"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingProduct(prod)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition-colors active:scale-95"
                              title="حذف الصنف نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#E8DFD5] shadow-2xl">
            <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#231610]">
                {editingProduct ? `تعديل الصنف: ${editingProduct.nameAr}` : 'إضافة صنف جديد للمنيو'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    اسم الصنف بالعربي *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                    placeholder="مثال: ريش ضاني مشوية"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    English Name
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                    dir="ltr"
                    placeholder="e.g. Grilled Lamb Chops"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    كود الصنف SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    التصنيف *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    سعر البيع ({profile.currency}) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    التكلفة ({profile.currency})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    محطة الطهي بالمطبخ
                  </label>
                  <select
                    value={formData.kitchenStation}
                    onChange={(e) =>
                      setFormData({ ...formData, kitchenStation: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  >
                    <option value="grill">شواية الفحم (Grill)</option>
                    <option value="kitchen">المطبخ الساخن والفرن (Kitchen)</option>
                    <option value="cold">السلطات والمقبلات الباردة (Cold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    وقت التحضير المتوقع (بالدقائق)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.prepTimeMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, prepTimeMinutes: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                  />
                </div>
              </div>

              {/* Inventory settings */}
              <div className="p-3 bg-[#FBF9F5] rounded-xl border border-[#D7C3A5] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#8B1E1E]">
                  <input
                    type="checkbox"
                    checked={formData.trackInventory}
                    onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                    className="rounded text-[#8B1E1E]"
                  />
                  <Package className="w-4 h-4" />
                  <span>تتبع رصيد هذا الصنف في المستودع والمخزن</span>
                </label>

                {formData.trackInventory && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-[#231610]">الرصيد الحالي</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.currentStock}
                        onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D7C3A5] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#231610]">الحد الأدنى للإنذار</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D7C3A5] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#231610]">وحدة القياس</label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D7C3A5]"
                        placeholder="قطعة / كجم / علبة"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  صورة الصنف (رفع ملف أو رابط URL)
                </label>
                <div className="flex items-center gap-3">
                  {formData.image ? (
                    <div className="relative w-14 h-14 rounded-xl border border-[#D7C3A5] overflow-hidden shrink-0 bg-gray-100">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                        title="إزالة الصورة"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-[#D7C3A5] flex items-center justify-center shrink-0 bg-[#FBF9F6] text-gray-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B1E1E] text-white text-[11px] font-bold cursor-pointer hover:bg-[#721616] transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>رفع صورة من الجهاز...</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      placeholder="أو رابط صورة مباشرة https://..."
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#D7C3A5] text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  الوصف والمكونات الظاهرة للعميل
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                  placeholder="مكونات الوجبة، طريقة الطهي، الإضافات المشمولة..."
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#231610]">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="rounded text-[#8B1E1E]"
                  />
                  <span>متاح للطلب الآن في نقطة البيع</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#B8860B]">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="rounded text-[#B8860B]"
                  />
                  <span>تمييز كـ صنف شهير (الأكثر طلباً)</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-[#E8DFD5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] rounded-xl hover:bg-[#EAE0D2] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#8B1E1E] rounded-xl hover:bg-[#721616] transition-colors shadow-xs active:scale-95"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        title="تأكيد حذف الصنف من المنيو"
        message="هل أنت متأكد من حذف هذا الصنف نهائياً من المنيو؟ لن يظهر هذا الصنف مجدداً في شاشة الكاشير."
        itemName={deletingProduct ? `${deletingProduct.nameAr} (${deletingProduct.sku})` : undefined}
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingProduct(null)}
      />
    </div>
  );
};
