import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  RotateCcw,
  Edit2,
  TrendingDown,
  TrendingUp,
  X,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Coffee,
  UtensilsCrossed,
  SlidersHorizontal,
  Trash2,
  Loader2,
  Save,
  Barcode,
  Hash,
  DollarSign,
  Boxes,
  Building,
  FileText,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { Ingredient, Product, Supplier } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export interface InventoryRowItem {
  id: string;
  name: string;
  nameEn?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  costPerUnit: number;
  category: string;
  itemType: 'ingredient' | 'product';
  rawIngredient?: Ingredient;
  rawProduct?: Product;
  isArchived?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface InventoryFormState {
  id: string;
  name: string;
  nameEn: string;
  sku: string;
  barcode: string;
  category: string;
  itemType: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  supplierId: string;
  status: 'active' | 'inactive' | 'archived';
  notes: string;
  itemCategory: 'ingredient' | 'product';
}

/**
 * Core function that determines if an inventory product or ingredient
 * is falling below its defined minimum stock level.
 */
export function isBelowMinimumStock(currentStock: number, minStock: number): boolean {
  return currentStock <= minStock;
}

/**
 * Returns CSS classes to highlight products falling below their defined minimum stock level in red.
 */
export function getStockHighlightClass(currentStock: number, minStock: number): string {
  if (isBelowMinimumStock(currentStock, minStock)) {
    return 'bg-red-50/90 hover:bg-red-100/90 border-r-4 border-r-red-600 transition-all text-red-950 font-medium shadow-2xs';
  }
  return 'hover:bg-[#FFF8EF] transition-colors';
}

/**
 * Renders a prominent warning icon and badge for products falling below their defined minimum stock level.
 */
export function renderStockWarningBadge(currentStock: number, minStock: number, unit = '') {
  const isLow = isBelowMinimumStock(currentStock, minStock);

  if (isLow) {
    const deficit = Math.max(0, minStock - currentStock);
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-100 text-red-800 border-2 border-red-300 font-extrabold text-xs shadow-2xs animate-pulse">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
        <span className="flex items-center gap-1">
          <span>تحت الحد الأدنى!</span>
          {deficit > 0 && (
            <span className="text-[10px] bg-red-200/90 text-red-900 px-1 py-0.5 rounded font-black tabular-nums">
              عجز: {deficit.toFixed(1)} {unit}
            </span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span>متوفر ومستقر</span>
    </div>
  );
}

export const InventoryView: React.FC = () => {
  const { profile } = useBrand();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => posDb.getIngredients());
  const [products, setProducts] = useState<Product[]>(() => posDb.getProducts());
  const [archivedIngredients, setArchivedIngredients] = useState<Ingredient[]>(() =>
    posDb.getArchivedIngredients()
  );
  const [archivedProducts, setArchivedProducts] = useState<Product[]>(() =>
    posDb.getArchivedProducts()
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => posDb.getSuppliers());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low_stock'>('all');
  const [scopeTab, setScopeTab] = useState<'all' | 'ingredients' | 'products' | 'archived'>('all');

  // Permissions
  const canEdit =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'manager' ||
    hasPermission('inventory_edit') ||
    hasPermission('inventory');
  const canDelete = currentUser?.role === 'admin' || hasPermission('inventory_delete');
  const canAdjust =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'manager' ||
    hasPermission('inventory_adjust') ||
    hasPermission('inventory');

  // Deletion confirm state
  const [deletingTarget, setDeletingTarget] = useState<{
    item: InventoryRowItem;
    usage: { inUse: boolean; reasons: string[] };
  } | null>(null);

  // Stock Adjustment modal
  const [selectedItem, setSelectedItem] = useState<InventoryRowItem | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'waste' | 'reconciliation'>('add');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Add / Edit Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryRowItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [formState, setFormState] = useState<InventoryFormState>({
    id: '',
    name: '',
    nameEn: '',
    sku: '',
    barcode: '',
    category: 'لحوم بلدية',
    itemType: 'مادة خام',
    unit: 'كجم',
    costPerUnit: 340,
    currentStock: 50,
    minStock: 15,
    maxStock: 100,
    supplierId: '',
    status: 'active',
    notes: '',
    itemCategory: 'ingredient',
  });

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setIngredients(posDb.getIngredients());
      setProducts(posDb.getProducts());
      setArchivedIngredients(posDb.getArchivedIngredients());
      setArchivedProducts(posDb.getArchivedProducts());
      setSuppliers(posDb.getSuppliers());
    });
    return unsubscribe;
  }, []);

  // Map active ingredients into inventory list
  const ingredientItems: InventoryRowItem[] = ingredients.map((ing) => ({
    id: ing.id,
    name: ing.name,
    nameEn: ing.nameEn,
    sku: ing.sku,
    barcode: ing.barcode,
    unit: ing.unit || 'كجم',
    currentStock: ing.currentStock,
    minStock: ing.minStock,
    maxStock: ing.maxStock,
    costPerUnit: ing.costPerUnit || 0,
    category: ing.category || 'مواد خام',
    itemType: 'ingredient',
    rawIngredient: ing,
    isArchived: false,
  }));

  // Map active products into inventory list
  const productItems: InventoryRowItem[] = products
    .filter((p) => p.trackInventory !== false && (p.currentStock !== undefined || p.minStock !== undefined))
    .map((prod) => ({
      id: prod.id,
      name: prod.nameAr,
      nameEn: prod.nameEn,
      sku: prod.sku,
      barcode: prod.barcode,
      unit: prod.unit || 'قطعة',
      currentStock: prod.currentStock ?? 0,
      minStock: prod.minStock ?? 5,
      maxStock: prod.maxStock,
      costPerUnit: prod.costPrice || 0,
      category: 'منتجات ومشروبات',
      itemType: 'product',
      rawProduct: prod,
      isArchived: false,
    }));

  // Map archived/soft-deleted items into archived list
  const archivedItems: InventoryRowItem[] = [
    ...archivedIngredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      nameEn: ing.nameEn,
      sku: ing.sku,
      barcode: ing.barcode,
      unit: ing.unit || 'كجم',
      currentStock: ing.currentStock,
      minStock: ing.minStock,
      maxStock: ing.maxStock,
      costPerUnit: ing.costPerUnit || 0,
      category: ing.category || 'مواد خام',
      itemType: 'ingredient' as const,
      rawIngredient: ing,
      isArchived: true,
      deletedAt: ing.deletedAt,
      deletedBy: ing.deletedBy,
    })),
    ...archivedProducts.map((prod) => ({
      id: prod.id,
      name: prod.nameAr,
      nameEn: prod.nameEn,
      sku: prod.sku,
      barcode: prod.barcode,
      unit: prod.unit || 'قطعة',
      currentStock: prod.currentStock ?? 0,
      minStock: prod.minStock ?? 5,
      maxStock: prod.maxStock,
      costPerUnit: prod.costPrice || 0,
      category: 'منتجات ومشروبات',
      itemType: 'product' as const,
      rawProduct: prod,
      isArchived: true,
      deletedAt: prod.deletedAt,
      deletedBy: prod.deletedBy,
    })),
  ];

  // Active items: strictly exclude any archived records
  const activeItems: InventoryRowItem[] = [
    ...(scopeTab === 'products' ? [] : ingredientItems),
    ...(scopeTab === 'ingredients' ? [] : productItems),
  ];

  const combinedItems: InventoryRowItem[] =
    scopeTab === 'archived' ? archivedItems : activeItems;

  // Calculate items falling below minimum stock
  const lowStockItems = combinedItems.filter((item) =>
    isBelowMinimumStock(item.currentStock, item.minStock)
  );
  const lowStockCount = lowStockItems.length;

  const filtered = combinedItems.filter((item) => {
    if (filterType === 'low_stock' && !isBelowMinimumStock(item.currentStock, item.minStock)) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchEn = item.nameEn && item.nameEn.toLowerCase().includes(q);
      const matchSku = item.sku && item.sku.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchName && !matchEn && !matchSku && !matchCat) return false;
    }
    return true;
  });

  // Open Edit Modal
  const openEditModal = (item: InventoryRowItem) => {
    if (!canEdit) {
      showToast('عفواً، لا تملك الصلاحية الكافية لتعديل بيانات المخزون', 'error');
      return;
    }

    setEditingItem(item);
    setFormErrors({});

    if (item.itemType === 'ingredient') {
      const fresh = posDb.getIngredientById(item.id) || item.rawIngredient;
      setFormState({
        id: item.id,
        name: fresh?.name || item.name,
        nameEn: fresh?.nameEn || item.nameEn || '',
        sku: fresh?.sku || item.sku || '',
        barcode: fresh?.barcode || item.barcode || '',
        category: fresh?.category || item.category || 'لحوم بلدية',
        itemType: fresh?.itemType || 'مادة خام',
        unit: fresh?.unit || item.unit || 'كجم',
        costPerUnit: fresh?.costPerUnit ?? item.costPerUnit,
        currentStock: fresh?.currentStock ?? item.currentStock,
        minStock: fresh?.minStock ?? item.minStock,
        maxStock: fresh?.maxStock ?? (fresh?.minStock ? fresh.minStock * 4 : 100),
        supplierId: fresh?.supplierId || '',
        status: fresh?.status || (fresh?.isActive === false ? 'archived' : 'active'),
        notes: fresh?.notes || '',
        itemCategory: 'ingredient',
      });
    } else {
      const fresh = posDb.getProductById(item.id) || item.rawProduct;
      setFormState({
        id: item.id,
        name: fresh?.nameAr || item.name,
        nameEn: fresh?.nameEn || item.nameEn || '',
        sku: fresh?.sku || item.sku || '',
        barcode: fresh?.barcode || item.barcode || '',
        category: 'منتجات ومشروبات',
        itemType: fresh?.kitchenStation === 'grill' ? 'مشويات عالفحم' : 'منتجات ومشروبات',
        unit: fresh?.unit || item.unit || 'قطعة',
        costPerUnit: fresh?.costPrice ?? item.costPerUnit,
        currentStock: fresh?.currentStock ?? item.currentStock,
        minStock: fresh?.minStock ?? item.minStock,
        maxStock: fresh?.maxStock ?? 100,
        supplierId: '',
        status: fresh?.available === false ? 'inactive' : 'active',
        notes: fresh?.description || '',
        itemCategory: 'product',
      });
    }

    setIsFormModalOpen(true);
  };

  // Open Add Ingredient Modal
  const openAddIngredientModal = () => {
    if (!canEdit) {
      showToast('عفواً، لا تملك الصلاحية الكافية لإضافة مواد خام جديدة', 'error');
      return;
    }

    setEditingItem(null);
    setFormErrors({});
    setFormState({
      id: `ing-${Date.now()}`,
      name: '',
      nameEn: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: '',
      category: 'لحوم بلدية',
      itemType: 'مادة خام',
      unit: 'كجم',
      costPerUnit: 100,
      currentStock: 20,
      minStock: 10,
      maxStock: 50,
      supplierId: suppliers[0]?.id || '',
      status: 'active',
      notes: '',
      itemCategory: 'ingredient',
    });
    setIsFormModalOpen(true);
  };

  // Handle Form Submit
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    const errors: { [key: string]: string } = {};
    if (!formState.name.trim()) {
      errors.name = 'اسم المادة / الصنف بالعربي مطلوب';
    }
    if (isNaN(Number(formState.costPerUnit)) || Number(formState.costPerUnit) < 0) {
      errors.costPerUnit = 'تكلفة الوحدة يجب أن تكون رقماً أكبر أو يساوي صفر';
    }
    if (isNaN(Number(formState.currentStock)) || Number(formState.currentStock) < 0) {
      errors.currentStock = 'الرصيد الحالي يجب أن يكون رقماً أكبر أو يساوي صفر';
    }
    if (isNaN(Number(formState.minStock)) || Number(formState.minStock) < 0) {
      errors.minStock = 'الحد الأدنى يجب أن يكون رقماً أكبر أو يساوي صفر';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('يرجى تصحيح الأخطاء الموضحة في النموذج', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (formState.itemCategory === 'ingredient') {
        const targetSupplier = suppliers.find((s) => s.id === formState.supplierId);
        const ingredientData: Ingredient = {
          id: formState.id || `ing-${Date.now()}`,
          name: formState.name.trim(),
          nameEn: formState.nameEn.trim() || undefined,
          sku: formState.sku.trim() || undefined,
          barcode: formState.barcode.trim() || undefined,
          category: formState.category.trim() || 'عام',
          itemType: formState.itemType.trim() || 'مادة خام',
          unit: formState.unit,
          costPerUnit: Number(formState.costPerUnit),
          currentStock: Number(formState.currentStock),
          minStock: Number(formState.minStock),
          maxStock: Number(formState.maxStock) || undefined,
          supplierId: formState.supplierId || undefined,
          supplierName: targetSupplier ? targetSupplier.name : undefined,
          status: formState.status,
          isActive: formState.status !== 'archived',
          notes: formState.notes.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };

        posDb.saveIngredient(ingredientData, currentUser?.id || 'admin', currentUser?.name || 'المدير');
      } else {
        const existingProd = posDb.getProductById(formState.id);
        if (existingProd) {
          const productData: Product = {
            ...existingProd,
            nameAr: formState.name.trim(),
            nameEn: formState.nameEn.trim() || existingProd.nameEn,
            sku: formState.sku.trim() || existingProd.sku,
            barcode: formState.barcode.trim() || existingProd.barcode,
            costPrice: Number(formState.costPerUnit),
            currentStock: Number(formState.currentStock),
            minStock: Number(formState.minStock),
            maxStock: Number(formState.maxStock) || undefined,
            unit: formState.unit,
            available: formState.status === 'active',
            description: formState.notes.trim() || existingProd.description,
          };
          posDb.saveProduct(productData, currentUser?.id || 'admin', currentUser?.name || 'المدير');
        }
      }

      // Explicitly reload data from posDb
      setIngredients(posDb.getIngredients());
      setProducts(posDb.getProducts());

      showToast(
        editingItem
          ? `تم تحديث وحفظ بيانات "${formState.name}" في قاعدة البيانات بنجاح`
          : `تم إضافة المادة الخام "${formState.name}" إلى المستودع بنجاح`,
        'success'
      );

      setIsFormModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Save inventory error:', err);
      showToast('حدث خطأ أثناء حفظ البيانات في قاعدة البيانات', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Modal with relation check
  const handleDeleteClick = (item: InventoryRowItem) => {
    if (!canDelete) {
      showToast('عفواً، يتطلب حذف أو أرشفة المواد صلاحية مدير النظام (Admin) حصراً', 'error');
      return;
    }

    const usage =
      item.itemType === 'ingredient'
        ? posDb.isIngredientInUse(item.id)
        : posDb.isProductInUse(item.id);

    setDeletingTarget({ item, usage });
  };

  // Confirm Delete / Archive
  const handleConfirmDelete = () => {
    if (!deletingTarget) return;
    const { item } = deletingTarget;

    try {
      if (item.itemType === 'ingredient') {
        posDb.deleteIngredient(item.id, currentUser?.id || 'admin', currentUser?.name || 'المدير', 'أرشفة من شاشة المخزون');
      } else {
        posDb.deleteProduct(item.id, currentUser?.id || 'admin', currentUser?.name || 'المدير', 'أرشفة من شاشة المخزون');
      }

      setIngredients(posDb.getIngredients());
      setProducts(posDb.getProducts());
      setArchivedIngredients(posDb.getArchivedIngredients());
      setArchivedProducts(posDb.getArchivedProducts());

      showToast(
        `تم أرشفة "${item.name}" وإخفاؤها من المخزون النشط بنجاح مع صيانة البيانات والتقارير التاريخية`,
        'success'
      );
    } catch (err) {
      console.error('Delete inventory error:', err);
      showToast('حدث خطأ أثناء أرشفة الصنف من قاعدة البيانات', 'error');
    } finally {
      setDeletingTarget(null);
    }
  };

  // Restore Archived Item back to Active Inventory
  const handleRestoreItem = (item: InventoryRowItem) => {
    if (!canEdit) {
      showToast('عفواً، يتطلب استعادة الأصناف صلاحية تعديل المخزون', 'error');
      return;
    }

    try {
      if (item.itemType === 'ingredient') {
        posDb.restoreIngredient(item.id, currentUser?.id || 'admin', currentUser?.name || 'المدير');
      } else {
        posDb.restoreProduct(item.id, currentUser?.id || 'admin', currentUser?.name || 'المدير');
      }

      setIngredients(posDb.getIngredients());
      setProducts(posDb.getProducts());
      setArchivedIngredients(posDb.getArchivedIngredients());
      setArchivedProducts(posDb.getArchivedProducts());

      showToast(`تم إلغاء أرشفة "${item.name}" وإعادتها إلى المخزون النشط بنجاح`, 'success');
    } catch (err) {
      console.error('Restore inventory item error:', err);
      showToast('حدث خطأ أثناء استعادة الصنف', 'error');
    }
  };

  // Handle Stock Adjustment
  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || adjustQuantity <= 0) return;

    if (!canAdjust) {
      showToast('عفواً، لا تملك الصلاحية لتسوية أرصدة المخزون', 'error');
      return;
    }

    let delta = adjustQuantity;
    if (adjustType === 'remove' || adjustType === 'waste') {
      delta = -adjustQuantity;
    } else if (adjustType === 'reconciliation') {
      delta = adjustQuantity - selectedItem.currentStock;
    }

    if (selectedItem.itemType === 'ingredient' && selectedItem.rawIngredient) {
      posDb.adjustStock(
        selectedItem.rawIngredient.id,
        delta,
        adjustType,
        adjustReason || 'تسوية يدوية من شاشة المخزون',
        currentUser?.id || 'admin',
        currentUser?.name || 'المدير'
      );
    } else if (selectedItem.itemType === 'product' && selectedItem.rawProduct) {
      posDb.adjustProductStock(
        selectedItem.rawProduct.id,
        delta,
        adjustType,
        adjustReason || 'تسوية يدوية لمخزون المنتج',
        currentUser?.id || 'admin',
        currentUser?.name || 'المدير'
      );
    }

    setIngredients(posDb.getIngredients());
    setProducts(posDb.getProducts());
    showToast(`تمت تسوية رصيد "${selectedItem.name}" بنجاح`, 'success');

    setSelectedItem(null);
    setAdjustReason('');
  };

  const totalInventoryValue = combinedItems.reduce(
    (acc, item) => acc + item.currentStock * item.costPerUnit,
    0
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Top Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center shadow-2xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#231610]">
                  إدارة المخزون والمواد الخام والمنتجات
                </h2>
                {lowStockCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-black border border-red-300 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    <span>{lowStockCount} نواقص حرجة</span>
                  </span>
                )}
              </div>
              <span className="text-xs text-[#7A6455]">
                تتبع الأرصدة، التكلفة الفعلية، وتسوية وحذف وتعديل المواد في قاعدة البيانات مباشرة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#FFF8EF] px-3.5 py-1.5 rounded-xl border border-[#D7C3A5] text-xs">
              <span className="text-[#7A6455]">إجمالي قيمة المخزون: </span>
              <span className="font-extrabold text-[#8B1E1E] tabular-nums">
                {totalInventoryValue.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} {profile.currency}
              </span>
            </div>

            {canEdit && (
              <button
                onClick={openAddIngredientModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مادة خام</span>
              </button>
            )}
          </div>
        </div>

        {/* Prominent Critical Low Stock Banner */}
        {lowStockCount > 0 && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white shadow-md flex items-center justify-between gap-3 flex-wrap border-2 border-red-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                  <span>تنبيه نواقص المخزون: يوجد</span>
                  <span className="px-2 py-0.5 rounded-md bg-white text-red-800 font-black tabular-nums">
                    {lowStockCount} صنف
                  </span>
                  <span>تحت الحد الأدنى للطلب (محددة باللون الأحمر أدناه)</span>
                </h4>
                <p className="text-[11px] text-red-100 mt-0.5">
                  يرجى تسوية الأرصدة أو إصدار أوامر شراء عاجلة لتجنب توقف تحضير الوجبات والمشروبات.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType(filterType === 'low_stock' ? 'all' : 'low_stock')}
                className="px-3.5 py-1.5 rounded-xl bg-white text-red-800 text-xs font-black hover:bg-red-50 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                <span>
                  {filterType === 'low_stock' ? 'عرض كافة الأصناف' : `تصفية النواقص فقط (${lowStockCount})`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Filter & Scope Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#7A6455]" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الكود SKU، التصنيف، اللحوم، المشروبات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] bg-[#FBF9F6]"
            />
          </div>

          {/* Scope Tabs (All, Ingredients, Products, Archived) */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setScopeTab('all')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                scopeTab === 'all' ? 'bg-white text-[#231610] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>الكل ({activeItems.length})</span>
            </button>
            <button
              onClick={() => setScopeTab('ingredients')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                scopeTab === 'ingredients' ? 'bg-white text-[#231610] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>المواد الخام ({ingredientItems.length})</span>
            </button>
            <button
              onClick={() => setScopeTab('products')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                scopeTab === 'products' ? 'bg-white text-[#231610] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>منتجات البيع ({productItems.length})</span>
            </button>
            <button
              onClick={() => setScopeTab('archived')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                scopeTab === 'archived'
                  ? 'bg-amber-100 text-amber-900 shadow-xs ring-1 ring-amber-300'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-700" />
              <span>الأرشيف ({archivedItems.length})</span>
            </button>
          </div>

          {/* Stock Level Filter Buttons */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterType === 'all' ? 'bg-[#8B1E1E] text-white shadow-xs' : 'bg-white text-[#3E2723] border border-[#E8DFD5]'
              }`}
            >
              كافة الأرصدة
            </button>
            <button
              onClick={() => setFilterType('low_stock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black transition-all ${
                filterType === 'low_stock'
                  ? 'bg-red-700 text-white shadow-xs ring-2 ring-red-400'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>نواقص المخزون ({lowStockCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-2xl border border-[#E8DFD5] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5EFE6] text-[#3E2723] font-bold border-b border-[#E8DFD5] sticky top-0 z-10">
                <tr>
                  <th className="p-3">الصنف / المنتج</th>
                  <th className="p-3">التصنيف والنوع</th>
                  <th className="p-3">الرصيد الحالي</th>
                  <th className="p-3">الحد الأدنى للطلب</th>
                  <th className="p-3">تكلفة الوحدة</th>
                  <th className="p-3">القيمة الإجمالية</th>
                  <th className="p-3">حالة الرصيد</th>
                  <th className="p-3 text-center">إجراءات الجرد والتسوية والتعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE6]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        {scopeTab === 'archived' ? (
                          <>
                            <Archive className="w-8 h-8 text-gray-400" />
                            <p className="font-bold text-sm text-[#231610]">لا توجد أصناف مؤرشفة حالياً</p>
                            <p className="text-xs text-gray-500">
                              جميع المواد الخام ومنتجات البيع نشطة وتظهر في قوائم العمليات الحالية.
                            </p>
                          </>
                        ) : (
                          <>
                            <Package className="w-8 h-8 text-gray-400" />
                            <p className="font-bold text-sm text-[#231610]">لا توجد مواد مخزنة أو أصناف مطابقة للبحث</p>
                            {filterType === 'low_stock' && (
                              <p className="text-xs text-emerald-700 font-semibold">
                                ممتاز! لا توجد أصناف تحت الحد الأدنى في هذا القسم حالياً.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const isLow = isBelowMinimumStock(item.currentStock, item.minStock);
                    const itemValue = item.currentStock * item.costPerUnit;
                    const stockPercent = item.minStock > 0 ? Math.min(100, (item.currentStock / item.minStock) * 100) : 100;

                    return (
                      <tr
                        key={`${item.itemType}-${item.id}`}
                        className={getStockHighlightClass(item.currentStock, item.minStock)}
                      >
                        {/* 1. Item Name with Prominent Warning Icon if below minimum */}
                        <td className="p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-[#231610] text-xs sm:text-sm">
                              {item.name}
                            </span>

                            {/* Prominent Red Warning Tag when below min stock */}
                            {isLow && (
                              <span
                                title={`تحذير عاجل: رصيد هذا المنتج (${item.currentStock} ${item.unit}) سقط تحت الحد الأدنى للطلب (${item.minStock} ${item.unit})`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600 text-white text-[10px] font-black shrink-0 animate-bounce shadow-xs"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                <span>نقص مخزون</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                            {item.nameEn && <span>{item.nameEn}</span>}
                            {item.sku && (
                              <span className="font-mono bg-gray-100 px-1 rounded text-gray-700">
                                {item.sku}
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.2 rounded font-semibold ${
                                item.itemType === 'product'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {item.itemType === 'product' ? 'منتج جاهز' : 'مادة خام'}
                            </span>
                          </div>
                        </td>

                        {/* 2. Category */}
                        <td className="p-3 text-gray-600 font-semibold">{item.category}</td>

                        {/* 3. Current Stock with Highlight & Depletion Bar */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {isLow && (
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
                            )}
                            <span
                              className={`font-black text-sm tabular-nums ${
                                isLow ? 'text-red-700' : 'text-[#8B1E1E]'
                              }`}
                            >
                              {item.currentStock.toFixed(1)}
                            </span>
                            <span className="text-[11px] text-gray-600 font-semibold">{item.unit}</span>
                          </div>

                          {/* Stock Health Progress Bar */}
                          <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isLow ? 'bg-red-600' : stockPercent < 150 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </td>

                        {/* 4. Minimum Stock Threshold */}
                        <td className="p-3 text-gray-600 tabular-nums font-semibold">
                          {item.minStock} {item.unit}
                        </td>

                        {/* 5. Cost Per Unit */}
                        <td className="p-3 font-semibold text-[#231610] tabular-nums">
                          {item.costPerUnit} {profile.currency}
                        </td>

                        {/* 6. Total Value */}
                        <td className="p-3 font-bold text-[#8B1E1E] tabular-nums">
                          {itemValue.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} {profile.currency}
                        </td>

                        {/* 7. Stock Status with Prominent Warning Icon / Archive Badge */}
                        <td className="p-3">
                          {item.isArchived ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs shadow-2xs">
                                <Archive className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>مؤرشف (Soft-Deleted)</span>
                              </span>
                              {item.deletedAt && (
                                <span className="text-[10px] text-gray-500 tabular-nums">
                                  بتاريخ: {new Date(item.deletedAt).toLocaleDateString('ar-EG')}
                                </span>
                              )}
                            </div>
                          ) : (
                            renderStockWarningBadge(item.currentStock, item.minStock, item.unit)
                          )}
                        </td>

                        {/* 8. Action Controls */}
                        <td className="p-3 text-center">
                          {item.isArchived ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {canEdit && (
                                <button
                                  onClick={() => handleRestoreItem(item)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all text-xs font-bold shadow-2xs"
                                  title="استعادة الصنف وإعادته إلى قائمة المخزون النشط"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>استعادة للمخزون النشط</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Stock Adjustment button */}
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setAdjustQuantity(10);
                                }}
                                className={`px-2.5 py-1.5 rounded-xl transition-all text-xs font-bold shadow-2xs ${
                                  isLow
                                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                                    : 'bg-[#F5EFE6] text-[#8B1E1E] hover:bg-[#8B1E1E] hover:text-white'
                                }`}
                                title="تسوية رصيد الصنف يدوياً"
                              >
                                تسوية رصيد
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-200 transition-colors border border-amber-200 shadow-2xs"
                                title={`تعديل بيانات ${item.itemType === 'ingredient' ? 'المادة الخام' : 'المنتج'}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete / Archive Button */}
                              <button
                                onClick={() => handleDeleteClick(item)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors border border-red-200 shadow-2xs"
                                title={`أرشفة وحجب ${item.itemType === 'ingredient' ? 'المادة الخام' : 'المنتج'}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl border border-[#E8DFD5]">
            <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2">
              <div className="flex items-center gap-2">
                {isBelowMinimumStock(selectedItem.currentStock, selectedItem.minStock) && (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <h3 className="font-bold text-sm text-[#231610]">
                  تسوية رصيد: {selectedItem.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              {/* Status Header inside Modal */}
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  isBelowMinimumStock(selectedItem.currentStock, selectedItem.minStock)
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-[#FFF8EF] border-[#D7C3A5] text-[#231610]'
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>الرصيد الحالي:</span>
                  <span className="tabular-nums">
                    {selectedItem.currentStock} {selectedItem.unit}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>الحد الأدنى للطلب:</span>
                  <span className="tabular-nums">
                    {selectedItem.minStock} {selectedItem.unit}
                  </span>
                </div>
                {isBelowMinimumStock(selectedItem.currentStock, selectedItem.minStock) && (
                  <div className="text-[11px] font-black text-red-700 flex items-center gap-1 pt-1 border-t border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      عجز المخزون الحالي: {(selectedItem.minStock - selectedItem.currentStock).toFixed(1)} {selectedItem.unit}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">نوع حركة الجرد</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                >
                  <option value="add">إضافة كمية جديدة (توريد / شراء +)</option>
                  <option value="remove">صرف كمية للاستخدام (-)</option>
                  <option value="waste">تسجيل هالك / تالف (-)</option>
                  <option value="reconciliation">تسوية جرد فعلي (تعديل الرصيد للرقم الجديد)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  {adjustType === 'reconciliation' ? 'الرصيد الفعلي الجديد' : 'الكمية المراد حركتها'} ({selectedItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0.1"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">السبب / الملاحظة</label>
                <input
                  type="text"
                  placeholder="مثال: فاتورة توريد رقم 55، إعادة تعبئة المخزون المنخفض..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-2 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] rounded-xl hover:bg-[#E8DFD5]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#8B1E1E] rounded-xl hover:bg-[#721616]"
                >
                  تأكيد الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Add / Edit Modal */}
      {isFormModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#E8DFD5] overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FFF8EF] to-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#8B1E1E] text-white flex items-center justify-center shadow-xs">
                  {editingItem ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#231610] flex items-center gap-2">
                    <span>
                      {editingItem
                        ? `تعديل بيانات ${formState.itemCategory === 'ingredient' ? 'المادة الخام' : 'المنتج'}`
                        : 'إضافة مادة خام جديدة'}
                    </span>
                    {editingItem && (
                      <span className="font-mono text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200">
                        {formState.id}
                      </span>
                    )}
                  </h3>
                  <span className="text-[11px] text-[#7A6455]">
                    {editingItem
                      ? 'يتم تحديث وحفظ كافة التعديلات في قاعدة البيانات مباشرة مع تسجيل سجل تدقيق Audit Log'
                      : 'إضافة صنف جديد وحفظه في المستودع المحلي وSQLite'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveForm} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#231610] mb-1">
                    اسم المادة / الصنف (بالعربي) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: لحم ضاني مفروم بلدي"
                    value={formState.name}
                    onChange={(e) => {
                      setFormState({ ...formState, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                    }}
                    className={`w-full px-3 py-2 rounded-xl border bg-white font-bold text-[#231610] focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none ${
                      formErrors.name ? 'border-red-500 bg-red-50' : 'border-[#D7C3A5]'
                    }`}
                  />
                  {formErrors.name && (
                    <span className="text-[11px] text-red-600 font-semibold mt-0.5 block">
                      {formErrors.name}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-[#231610] mb-1">
                    الاسم بالإنجليزية (English Name)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="e.g. Fresh Lamb Mince"
                    value={formState.nameEn}
                    onChange={(e) => setFormState({ ...formState, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white text-[#231610] focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                  />
                </div>
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#231610] mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-[#7A6455]" />
                    <span>رمز الصنف SKU</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ING-LMB-01"
                    value={formState.sku}
                    onChange={(e) => setFormState({ ...formState, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white font-mono focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#231610] mb-1 flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-[#7A6455]" />
                    <span>الباركود Barcode</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 622100998877"
                    value={formState.barcode}
                    onChange={(e) => setFormState({ ...formState, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white font-mono focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category, Item Type, and Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#231610] mb-1">التصنيف</label>
                  <input
                    type="text"
                    placeholder="مثال: لحوم بلدية، دواجن..."
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#231610] mb-1">نوع المادة</label>
                  <select
                    value={formState.itemType}
                    onChange={(e) => setFormState({ ...formState, itemType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white font-semibold focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                  >
                    <option value="لحوم طازجة">لحوم طازجة</option>
                    <option value="دواجن طازجة">دواجن طازجة</option>
                    <option value="بقوليات وحبوب">بقوليات وحبوب</option>
                    <option value="صلصات وتوابل">صلصات وتوابل</option>
                    <option value="خضروات طازجة">خضروات طازجة</option>
                    <option value="مخبوزات">مخبوزات</option>
                    <option value="وقود ومستهلكات">وقود ومستهلكات</option>
                    <option value="تعبئة وتغليف">تعبئة وتغليف</option>
                    <option value="مشروبات وعصائر">مشروبات وعصائر</option>
                    <option value="مادة خام">مادة خام عامة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#231610] mb-1">وحدة القياس *</label>
                  <select
                    value={formState.unit}
                    onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white font-bold text-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                  >
                    <option value="كجم">كيلوجرام (كجم)</option>
                    <option value="جرام">جرام (جم)</option>
                    <option value="لتر">لتر (L)</option>
                    <option value="مل">مليلتر (مل)</option>
                    <option value="قطعة">قطعة</option>
                    <option value="علبة">علبة / عبوة</option>
                    <option value="كرتونة">كرتونة</option>
                    <option value="رغيف">رغيف</option>
                  </select>
                </div>
              </div>

              {/* Financials & Stock Quantities */}
              <div className="p-3.5 bg-[#FFF8EF] rounded-2xl border border-[#D7C3A5] space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-[#8B1E1E]">
                  <DollarSign className="w-4 h-4" />
                  <span>البيانات المالية والأرصدة ونقاط التنبيه</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#231610] mb-1">
                      تكلفة الوحدة ({profile.currency}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0"
                      value={formState.costPerUnit}
                      onChange={(e) => {
                        setFormState({ ...formState, costPerUnit: parseFloat(e.target.value) || 0 });
                        if (formErrors.costPerUnit) setFormErrors({ ...formErrors, costPerUnit: '' });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#D7C3A5] bg-white font-black text-sm text-[#8B1E1E] tabular-nums focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                    />
                    {formErrors.costPerUnit && (
                      <span className="text-[10px] text-red-600 font-semibold">{formErrors.costPerUnit}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#231610] mb-1">
                      الرصيد الفعلي الحالي ({formState.unit}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0"
                      value={formState.currentStock}
                      onChange={(e) => {
                        setFormState({ ...formState, currentStock: parseFloat(e.target.value) || 0 });
                        if (formErrors.currentStock) setFormErrors({ ...formErrors, currentStock: '' });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#D7C3A5] bg-white font-black text-sm text-[#231610] tabular-nums focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                    />
                    {formErrors.currentStock && (
                      <span className="text-[10px] text-red-600 font-semibold">{formErrors.currentStock}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#231610] mb-1">
                      الحد الأدنى للطلب ({formState.unit}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0"
                      value={formState.minStock}
                      onChange={(e) => {
                        setFormState({ ...formState, minStock: parseFloat(e.target.value) || 0 });
                        if (formErrors.minStock) setFormErrors({ ...formErrors, minStock: '' });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#D7C3A5] bg-white font-bold text-sm text-red-700 tabular-nums focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                    />
                    {formErrors.minStock && (
                      <span className="text-[10px] text-red-600 font-semibold">{formErrors.minStock}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#231610] mb-1">
                      الحد الأقصى للمخزون
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formState.maxStock}
                      onChange={(e) => setFormState({ ...formState, maxStock: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#D7C3A5] bg-white font-bold text-sm text-emerald-800 tabular-nums focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#231610] mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-[#7A6455]" />
                    <span>المورد المعتمد</span>
                  </label>
                  <select
                    value={formState.supplierId}
                    onChange={(e) => setFormState({ ...formState, supplierId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white font-semibold focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                  >
                    <option value="">بدون مورد محدد</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.company || s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#231610] mb-1">حالة الصنف</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white font-bold focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                  >
                    <option value="active">نشط ومتاح في العمليات اليومية</option>
                    <option value="inactive">غير نشط مؤقتاً</option>
                    <option value="archived">مؤرشف (مخفي من القوائم الجديدة)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-[#231610] mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#7A6455]" />
                  <span>الملاحظات وتفاصيل التخزين والجرد</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="أي مواصفات خاصة، شروط التبريد أو التخزين، المورد البديل..."
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D7C3A5] bg-white resize-none focus:ring-2 focus:ring-[#8B1E1E] focus:outline-none"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-[#E8DFD5] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-[#3E2723] bg-white hover:bg-gray-100 border border-[#D7C3A5] transition-colors shadow-2xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-white bg-[#8B1E1E] hover:bg-[#721616] active:scale-95 disabled:opacity-50 transition-all shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ البيانات...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingItem ? 'حفظ التعديلات في Database' : 'إضافة المادة واعتمادها'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmModal
        isOpen={!!deletingTarget}
        title="أرشفة الصنف وحمايته من الحذف النهائي"
        message="تأكيد الأرشفة (Soft Delete): سيتم إخفاء هذا الصنف فوراً من قائمة المخزون النشط وعمليات البيع والشراء الجديدة، مع صيانة والاحتفاظ بكافة بياناته وحركاته التاريخية في التقارير والطلبات السابقة لضمان سلامة وتكامل البيانات المالية والمحاسبية."
        itemName={
          deletingTarget
            ? `${deletingTarget.item.name} (${deletingTarget.item.itemType === 'ingredient' ? 'مادة خام' : 'منتج بيع'}) - الرصيد الحالي: ${deletingTarget.item.currentStock} ${deletingTarget.item.unit}`
            : undefined
        }
        confirmText="تأكيد الأرشفة والإخفاء"
        cancelText="إلغاء"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTarget(null)}
      />
    </div>
  );
};
