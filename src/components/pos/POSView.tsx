import React, { useState, useEffect } from 'react';
import {
  Search,
  Flame,
  Crown,
  UtensilsCrossed,
  Soup,
  Salad,
  Coffee,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Tag,
  MessageSquare,
  Users,
  Grid,
  CheckCircle2,
  Clock,
  Bike,
  ShoppingBag,
  RotateCcw,
  Percent,
  PauseCircle,
  Ban,
  DollarSign,
  Keyboard,
  Package,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useBrand } from '../../context/BrandContext';
import { posDb } from '../../services/db';
import { Product, Category, OrderType, SelectedModifier } from '../../types';
import { ModifierModal } from './ModifierModal';
import { PaymentModal } from './PaymentModal';
import { TablePickerModal } from './TablePickerModal';
import { QuickCustomerModal } from './QuickCustomerModal';
import { HeldOrdersModal } from './HeldOrdersModal';
import { ShortcutsModal } from './ShortcutsModal';
import { QuickAddItemModal } from './QuickAddItemModal';

export const POSView: React.FC = () => {
  const { profile } = useBrand();
  const {
    cartItems,
    orderType,
    setOrderType,
    selectedTable,
    setSelectedTable,
    selectedCustomer,
    setSelectedCustomer,
    deliveryFee,
    setDeliveryFee,
    discountMode,
    discountPercent,
    discountFixed,
    setDiscount,
    orderNotes,
    setOrderNotes,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    cancelCart,
    subtotal,
    discountAmount,
    taxAmount,
    serviceChargeAmount,
    total,
    processCheckout,
    heldOrders,
    isHeldOrdersModalOpen,
    setIsHeldOrdersModalOpen,
    holdCurrentOrder,
    resumeHeldOrder,
    deleteHeldOrder,
    clearAllHeldOrders,
    openCashDrawer,
    showToast,
  } = usePOS();

  const [categories, setCategories] = useState<Category[]>(() => posDb.getCategories());
  const [products, setProducts] = useState<Product[]>(() => posDb.getProducts());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyPopular, setOnlyPopular] = useState<boolean>(false);

  // Modals state
  const [activeProductForModifier, setActiveProductForModifier] = useState<Product | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setCategories(posDb.getCategories());
      setProducts(posDb.getProducts());
    });
    return unsubscribe;
  }, []);

  // Keyboard Shortcuts for Cashier Acceleration (F5: Hold, ESC: Cancel, F9: Drawer, F10: Checkout, F1: Help)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5: تعليق الطلب (Hold Order)
      if (e.key === 'F5') {
        e.preventDefault();
        holdCurrentOrder();
        return;
      }

      // F6: إضافة صنف سريع مخصص (Quick Add)
      if (e.key === 'F6') {
        e.preventDefault();
        setIsQuickAddModalOpen((prev) => !prev);
        return;
      }

      // F9: فتح صندوق النقدية (Open Cash Drawer)
      if (e.key === 'F9') {
        e.preventDefault();
        openCashDrawer();
        return;
      }

      // F1: دليل اختصارات لوحة المفاتيح
      if (e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // F10: إنهاء الطلب والدفع
      if (e.key === 'F10') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setIsPaymentModalOpen(true);
        } else {
          showToast('السلة فارغة، أضف أصناف أولاً لإتمام الدفع', 'info');
        }
        return;
      }

      // Escape (ESC): إلغاء الطلب أو إغلاق النوافذ النشطة
      if (e.key === 'Escape') {
        if (isQuickAddModalOpen) {
          setIsQuickAddModalOpen(false);
          return;
        }
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (isHeldOrdersModalOpen) {
          setIsHeldOrdersModalOpen(false);
          return;
        }
        if (isDiscountModalOpen) {
          setIsDiscountModalOpen(false);
          return;
        }
        if (activeProductForModifier !== null) {
          setActiveProductForModifier(null);
          return;
        }
        if (isTableModalOpen) {
          setIsTableModalOpen(false);
          return;
        }
        if (isCustomerModalOpen) {
          setIsCustomerModalOpen(false);
          return;
        }
        if (isPaymentModalOpen) {
          setIsPaymentModalOpen(false);
          return;
        }

        // If no modals are open, clear / cancel the cart
        if (cartItems.length > 0) {
          e.preventDefault();
          cancelCart();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    holdCurrentOrder,
    openCashDrawer,
    cancelCart,
    cartItems.length,
    isShortcutsModalOpen,
    isHeldOrdersModalOpen,
    isDiscountModalOpen,
    activeProductForModifier,
    isTableModalOpen,
    isCustomerModalOpen,
    isPaymentModalOpen,
    isQuickAddModalOpen,
    showToast,
  ]);

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!p.available) return false;
    if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) return false;
    if (onlyPopular && !p.isPopular) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = p.nameAr.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  const handleProductClick = (product: Product) => {
    if (product.modifierGroupIds && product.modifierGroupIds.length > 0) {
      setActiveProductForModifier(product);
    } else {
      addToCart(product, 1, [], '');
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-3.5 h-3.5 text-[#8B1E1E]" />;
      case 'Crown':
        return <Crown className="w-3.5 h-3.5 text-[#B8860B]" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-3.5 h-3.5 text-[#3F532B]" />;
      case 'Soup':
        return <Soup className="w-3.5 h-3.5 text-[#A67C52]" />;
      case 'Salad':
        return <Salad className="w-3.5 h-3.5 text-emerald-700" />;
      case 'Coffee':
        return <Coffee className="w-3.5 h-3.5 text-[#5D4037]" />;
      default:
        return <UtensilsCrossed className="w-3.5 h-3.5 text-[#8B1E1E]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* ================= RIGHT (RTL): Products & Categories Catalog (65%) ================= */}
      <div className="flex-1 flex flex-col overflow-hidden border-l border-[#E8DFD5]">
        {/* Top Controls Bar: Search & Category tabs */}
        <div className="p-3 bg-white border-b border-[#E8DFD5] space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#7A6455]" />
              <input
                type="text"
                placeholder="ابحث عن صنف بالمسمى أو الكود (SKU / باركود)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E] bg-[#FBF9F6]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Popular items filter button */}
            <button
              onClick={() => setOnlyPopular(!onlyPopular)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
                onlyPopular
                  ? 'bg-[#B8860B] text-white border-[#B8860B] shadow-xs'
                  : 'bg-[#FFF8EF] text-[#B8860B] border-[#D7C3A5] hover:bg-[#F5EFE6]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>الأكثر طلباً</span>
            </button>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                selectedCategoryId === 'all'
                  ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-xs'
                  : 'bg-white text-[#3E2723] border-[#E8DFD5] hover:bg-[#F5EFE6]'
              }`}
            >
              <span>جميع الأصناف</span>
              <span className="text-[10px] opacity-80">({products.length})</span>
            </button>

            {categories.map((cat) => {
              const count = products.filter((p) => p.categoryId === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-xs'
                      : 'bg-white text-[#3E2723] border-[#E8DFD5] hover:bg-[#F5EFE6]'
                  }`}
                >
                  {getCategoryIcon(cat.icon)}
                  <span>{cat.nameAr}</span>
                  <span className="text-[10px] opacity-75 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const hasModifiers = product.modifierGroupIds && product.modifierGroupIds.length > 0;

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-2xl border border-[#E8DFD5] hover:border-[#B8860B] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
                >
                  {/* Product Image */}
                  <div className="relative h-28 w-full bg-[#EAE0D2] overflow-hidden flex items-center justify-center">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.nameAr}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector('.offline-placeholder')) {
                            const ph = document.createElement('div');
                            ph.className = 'offline-placeholder w-full h-full flex flex-col items-center justify-center bg-[#F5EFE6] text-[#8B1E1E] text-xs font-bold gap-1';
                            ph.innerHTML = '<span class="text-base">🔥</span><span>مشويات الباشا</span>';
                            parent.appendChild(ph);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F5EFE6] text-[#8B1E1E] text-xs font-bold">
                        <span className="text-base">🔥</span>
                        <span>مشويات الباشا</span>
                      </div>
                    )}

                    {product.isPopular && (
                      <div className="absolute top-2 right-2 bg-[#B8860B] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>مميز</span>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{product.prepTimeMinutes} د</span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#231610] line-clamp-1 leading-snug group-hover:text-[#8B1E1E] transition-colors">
                        {product.nameAr}
                      </h4>
                      <span className="text-[10px] text-[#7A6455] line-clamp-1 mt-0.5">
                        {product.nameEn}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#F5EFE6] flex items-center justify-between">
                      <div className="text-xs font-black text-[#8B1E1E] tabular-nums">
                        {product.price} {profile.currency}
                      </div>

                      <div className="w-7 h-7 rounded-lg bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center group-hover:bg-[#8B1E1E] group-hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] flex items-center justify-center text-[#8B1E1E] mx-auto shadow-2xs">
                <Package className="w-6 h-6" />
              </div>
              <div className="font-extrabold text-sm text-[#231610]">
                {products.length === 0
                  ? 'قائمة الطعام فارغة حالياً'
                  : 'لا توجد أصناف مطابقة للبحث أو التصنيف المحدد'}
              </div>
              <p className="text-xs text-[#7A6455] max-w-sm mx-auto">
                {products.length === 0
                  ? 'يمكنك إضافة أصناف المنيو وتصنيفاتها وأسعارها من تبويب "المنيو والأصناف" لبدء تسجيل طلبات البيع فوراً.'
                  : 'جرّب البحث باسم صنف آخر أو اختيار تصنيف مختلف.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================= LEFT (RTL): POS Cart & Order Details Panel (35%) ================= */}
      <div className="w-full lg:w-[420px] bg-white flex flex-col justify-between border-t lg:border-t-0 shadow-lg z-20">
        {/* Cashier Quick Shortcuts Action Bar */}
        <div className="p-2.5 bg-[#231610] text-white flex items-center justify-between gap-1.5 border-b border-[#3E2723]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Hold Order Button (F5) */}
            <button
              type="button"
              onClick={() => {
                if (cartItems.length > 0) {
                  holdCurrentOrder();
                } else if (heldOrders.length > 0) {
                  setIsHeldOrdersModalOpen(true);
                } else {
                  showToast('لا توجد أصناف في السلة لتعليقها (F5)', 'info');
                }
              }}
              title="تعليق الطلب الحالي لحين خدمة زبون آخر (اختصار F5)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3E2723] hover:bg-[#5D4037] text-amber-300 text-xs font-bold transition-all border border-[#6F4E37]/60 active:scale-95 shadow-2xs"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>تعليق</span>
              <kbd className="px-1.5 py-0.5 bg-black/40 text-[10px] text-amber-200 rounded font-mono border border-amber-500/30">
                F5
              </kbd>
              {heldOrders.length > 0 && (
                <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full mr-0.5">
                  {heldOrders.length}
                </span>
              )}
            </button>

            {/* Quick Add Custom Item Button (F6) */}
            <button
              type="button"
              onClick={() => setIsQuickAddModalOpen(true)}
              title="إضافة صنف مخصص أو طلب سريع للفاتورة (اختصار F6)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3E2723] hover:bg-[#5D4037] text-amber-300 text-xs font-bold transition-all border border-[#6F4E37]/60 active:scale-95 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>صنف سريع</span>
              <kbd className="px-1.5 py-0.5 bg-black/40 text-[10px] text-amber-200 rounded font-mono border border-amber-500/30">
                F6
              </kbd>
            </button>

            {/* Held Orders List button */}
            {heldOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHeldOrdersModalOpen(true)}
                title="عرض قائمة الطلبات المعلقة واسترجاعها"
                className="px-2 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold border border-amber-500/40 transition-colors flex items-center gap-1"
              >
                <span>المعلقات ({heldOrders.length})</span>
              </button>
            )}

            {/* Open Cash Drawer Button (F9) */}
            <button
              type="button"
              onClick={() => openCashDrawer()}
              title="فتح صندوق النقدية يدوياً وصوت الرنين وتسجيل الحركة (اختصار F9)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3E2723] hover:bg-[#5D4037] text-emerald-300 text-xs font-bold transition-all border border-[#6F4E37]/60 active:scale-95 shadow-2xs"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>فتح الدرج</span>
              <kbd className="px-1.5 py-0.5 bg-black/40 text-[10px] text-emerald-200 rounded font-mono border border-emerald-500/30">
                F9
              </kbd>
            </button>

            {/* Cancel Cart Button (ESC) */}
            <button
              type="button"
              onClick={() => cancelCart()}
              disabled={cartItems.length === 0}
              title="إلغاء الطلب وتفريغ السلة (اختصار ESC)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3E2723] hover:bg-red-950 text-red-300 text-xs font-bold transition-all border border-[#6F4E37]/60 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
            >
              <Ban className="w-3.5 h-3.5 text-red-400" />
              <span>إلغاء</span>
              <kbd className="px-1.5 py-0.5 bg-black/40 text-[10px] text-red-200 rounded font-mono border border-red-500/30">
                ESC
              </kbd>
            </button>
          </div>

          {/* Shortcuts Guide Button (F1) */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            title="دليل اختصارات لوحة المفاتيح للكاشير (F1)"
            className="p-1.5 text-[#D7C3A5] hover:text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px] font-bold"
          >
            <Keyboard className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">الاختصارات</span>
            <kbd className="text-[10px] bg-white/10 px-1 py-0.5 rounded font-mono">F1</kbd>
          </button>
        </div>

        {/* Order Setup Header: Type (Dine-in / Takeaway / Delivery), Table, Customer */}
        <div className="p-3 bg-[#FBF9F6] border-b border-[#E8DFD5] space-y-2">
          {/* Order Type Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-[#E8DFD5]">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                orderType === 'dine_in'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#5C4033] hover:bg-[#F5EFE6]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>صالات</span>
            </button>

            <button
              onClick={() => setOrderType('takeaway')}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                orderType === 'takeaway'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#5C4033] hover:bg-[#F5EFE6]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>سفري</span>
            </button>

            <button
              onClick={() => setOrderType('delivery')}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                orderType === 'delivery'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#5C4033] hover:bg-[#F5EFE6]'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>توصيل</span>
            </button>

            <button
              onClick={() => setOrderType('pickup')}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                orderType === 'pickup'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#5C4033] hover:bg-[#F5EFE6]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>استلام</span>
            </button>
          </div>

          {/* Conditional Sub-selectors: Table for Dine In, Customer for Delivery/Pickup */}
          <div className="flex items-center gap-2">
            {orderType === 'dine_in' && (
              <button
                onClick={() => setIsTableModalOpen(true)}
                className={`flex-1 py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                  selectedTable
                    ? 'bg-[#FFF8EF] border-[#8B1E1E] text-[#8B1E1E]'
                    : 'bg-white border-[#D7C3A5] text-[#3E2723] hover:bg-[#F5EFE6]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-[#8B1E1E]" />
                  <span>{selectedTable ? selectedTable.number : 'اختر رقم الطاولة *'}</span>
                </div>
                <span className="text-[10px] text-[#7A6455]">تغيير</span>
              </button>
            )}

            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className={`flex-1 py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                selectedCustomer
                  ? 'bg-[#FFF8EF] border-[#B8860B] text-[#B8860B]'
                  : 'bg-white border-[#D7C3A5] text-[#3E2723] hover:bg-[#F5EFE6]'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Users className="w-3.5 h-3.5 text-[#B8860B]" />
                <span className="truncate">
                  {selectedCustomer ? selectedCustomer.name : 'ربط عميل / هاتف'}
                </span>
              </div>
              <span className="text-[10px] text-[#7A6455] shrink-0">تحديد</span>
            </button>
          </div>

          {orderType === 'delivery' && (
            <div className="flex items-center gap-2 bg-amber-50/70 p-2 rounded-xl border border-amber-200 text-xs">
              <span className="text-amber-900 font-bold shrink-0">رسوم التوصيل:</span>
              <input
                type="number"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="w-20 bg-white border border-[#D7C3A5] rounded-lg px-2 py-1 text-center font-bold tabular-nums"
              />
              <span className="text-amber-900 text-[11px] font-bold">{profile.currency}</span>
              {selectedCustomer?.address && (
                <span className="text-[10px] text-[#7A6455] truncate max-w-[150px] mr-auto">
                  {selectedCustomer.address}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#7A6455]">
              <UtensilsCrossed className="w-12 h-12 text-[#D7C3A5] mb-2 stroke-[1.2]" />
              <div className="font-bold text-xs text-[#231610]">الفاتورة فارغة حالياً</div>
              <p className="text-[11px] text-[#8C7665] mt-1 max-w-[200px]">
                انقر على أي صنف من قائمة المشويات لإضافته للفاتورة مباشرة.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#FBF9F6] border border-[#E8DFD5] space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-bold text-xs text-[#231610] leading-snug">
                      {item.productNameAr}
                    </div>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="text-[10px] text-[#8B1E1E] mt-0.5 space-y-0.5">
                        {item.selectedModifiers.map((m, idx) => (
                          <span key={idx} className="inline-block ml-1">
                            • {m.nameAr} {m.priceDelta > 0 && `(+${m.priceDelta})`}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[10px] italic text-[#7A6455] mt-0.5">
                        ملاحظة: {item.notes}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                    title="حذف الصنف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#F0E6D8]">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-md bg-white border border-[#D7C3A5] font-bold text-[#8B1E1E] flex items-center justify-center hover:bg-[#EAE0D2]"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs tabular-nums w-5 text-center text-[#231610]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-md bg-white border border-[#D7C3A5] font-bold text-[#8B1E1E] flex items-center justify-center hover:bg-[#EAE0D2]"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-xs font-bold text-[#8B1E1E] tabular-nums">
                    {item.itemTotal.toFixed(2)} {profile.currency}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Totals Summary & Checkout Action */}
        <div className="p-3 bg-[#FBF9F6] border-t border-[#E8DFD5] space-y-2">
          {/* Notes & Discount trigger row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDiscountModalOpen(!isDiscountModalOpen)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#D7C3A5] bg-white text-[#6F4E37] hover:bg-[#F5EFE6]"
            >
              <Percent className="w-3 h-3 text-[#B8860B]" />
              <span>
                {discountAmount > 0
                  ? `خصم: ${discountAmount} ${profile.currency}`
                  : 'تطبيق خصم'}
              </span>
            </button>

            <input
              type="text"
              placeholder="ملاحظات على الفاتورة بالكامل..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="flex-1 px-2.5 py-1 text-[11px] rounded-lg border border-[#D7C3A5] bg-white focus:outline-none"
            />

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="p-1 text-gray-400 hover:text-red-700 transition-colors"
                title="تفريغ الفاتورة"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Discount Inline Control */}
          {isDiscountModalOpen && (
            <div className="p-2 bg-white rounded-xl border border-[#D7C3A5] space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-[#231610]">
                <span>تحديد الخصم المصرح به:</span>
                <div className="flex gap-1 text-[10px]">
                  <button
                    onClick={() => setDiscount('percent', discountPercent || 10)}
                    className={`px-2 py-0.5 rounded ${
                      discountMode === 'percent' ? 'bg-[#8B1E1E] text-white' : 'bg-gray-100'
                    }`}
                  >
                    نسبة مئوية %
                  </button>
                  <button
                    onClick={() => setDiscount('fixed', discountFixed || 50)}
                    className={`px-2 py-0.5 rounded ${
                      discountMode === 'fixed' ? 'bg-[#8B1E1E] text-white' : 'bg-gray-100'
                    }`}
                  >
                    مبلغ ثابت
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={discountMode === 'percent' ? discountPercent : discountFixed}
                  onChange={(e) => setDiscount(discountMode, parseFloat(e.target.value) || 0)}
                  className="flex-1 px-2 py-1 text-xs border border-[#D7C3A5] rounded-lg font-bold tabular-nums"
                  placeholder="القيمة..."
                />
                <button
                  onClick={() => {
                    setDiscount('percent', 0);
                    setIsDiscountModalOpen(false);
                  }}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                >
                  إلغاء الخصم
                </button>
              </div>
            </div>
          )}

          {/* Breakdown summary */}
          <div className="text-[11px] text-[#5C4033] space-y-1 pt-1 border-t border-[#E8DFD5]">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="tabular-nums font-bold">
                {subtotal.toFixed(2)} {profile.currency}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-red-700 font-bold">
                <span>الخصم المطبق:</span>
                <span className="tabular-nums">
                  -{discountAmount.toFixed(2)} {profile.currency}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span>ضريبة القيمة المضافة ({profile.defaultTaxPercent}%):</span>
              <span className="tabular-nums font-bold">
                {taxAmount.toFixed(2)} {profile.currency}
              </span>
            </div>

            {orderType === 'dine_in' && serviceChargeAmount > 0 && (
              <div className="flex justify-between">
                <span>خدمة الصالة ({profile.defaultServicePercent}%):</span>
                <span className="tabular-nums font-bold">
                  {serviceChargeAmount.toFixed(2)} {profile.currency}
                </span>
              </div>
            )}

            {orderType === 'delivery' && deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>خدمة التوصيل:</span>
                <span className="tabular-nums font-bold">
                  {deliveryFee.toFixed(2)} {profile.currency}
                </span>
              </div>
            )}

            <div className="flex justify-between text-base font-extrabold text-[#8B1E1E] pt-1.5 border-t border-[#E8DFD5]">
              <span>المجموع الكلي:</span>
              <span className="tabular-nums">
                {total.toFixed(2)} {profile.currency}
              </span>
            </div>
          </div>

          {/* Big Checkout Button */}
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={cartItems.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-[#8B1E1E] hover:bg-[#721616] text-white font-extrabold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>دفع وإنهاء الفاتورة</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono text-amber-200 border border-white/20">
                F10
              </kbd>
            </div>
            <span className="tabular-nums text-amber-200">
              {total.toFixed(2)} {profile.currency}
            </span>
          </button>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      <ModifierModal
        product={activeProductForModifier}
        isOpen={activeProductForModifier !== null}
        onClose={() => setActiveProductForModifier(null)}
        onConfirm={(product, quantity, modifiers, notes) => {
          addToCart(product, quantity, modifiers, notes);
          setActiveProductForModifier(null);
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        total={total}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={async (payments) => {
          setIsPaymentModalOpen(false);
          await processCheckout(payments);
        }}
      />

      <TablePickerModal
        isOpen={isTableModalOpen}
        selectedTable={selectedTable}
        onSelect={(tbl) => setSelectedTable(tbl)}
        onClose={() => setIsTableModalOpen(false)}
      />

      <QuickCustomerModal
        isOpen={isCustomerModalOpen}
        selectedCustomer={selectedCustomer}
        onSelect={(cust) => setSelectedCustomer(cust)}
        onClose={() => setIsCustomerModalOpen(false)}
      />

      {/* Held Orders Modal */}
      <HeldOrdersModal
        isOpen={isHeldOrdersModalOpen}
        onClose={() => setIsHeldOrdersModalOpen(false)}
        heldOrders={heldOrders}
        onResume={(order) => resumeHeldOrder(order)}
        onDelete={(id) => deleteHeldOrder(id)}
        onClearAll={() => clearAllHeldOrders()}
      />

      {/* Shortcuts Guide Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Quick Add Custom Item Modal */}
      <QuickAddItemModal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        onAdd={(product, quantity, notes) => {
          addToCart(product, quantity, [], notes);
          showToast(`تمت إضافة "${product.nameAr}" للفاتورة بنجاح`, 'success');
        }}
      />
    </div>
  );
};
