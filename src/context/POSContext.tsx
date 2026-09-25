import React, { createContext, useContext, useState } from 'react';
import {
  Product,
  OrderItem,
  SelectedModifier,
  OrderType,
  RestaurantTable,
  Customer,
  PaymentItem,
  Order,
  HeldOrder,
} from '../types';
import { useAuth } from './AuthContext';
import { useBrand } from './BrandContext';
import { posDb } from '../services/db';
import { printReceipt, printKitchenOrderDirect } from '../utils/thermalPrinter';
import { cashDrawer } from '../utils/cashDrawer';

interface POSToast {
  text: string;
  type: 'info' | 'success' | 'warning';
}

interface POSContextType {
  cartItems: OrderItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  selectedTable: RestaurantTable | null;
  setSelectedTable: (table: RestaurantTable | null) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  discountPercent: number;
  discountFixed: number;
  discountMode: 'percent' | 'fixed';
  setDiscount: (mode: 'percent' | 'fixed', value: number) => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  addToCart: (
    product: Product,
    quantity?: number,
    modifiers?: SelectedModifier[],
    notes?: string
  ) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  cancelCart: () => void;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  processCheckout: (payments: PaymentItem[]) => Promise<Order>;
  printOrderReceipt: (order: Order) => Promise<boolean>;
  lastCompletedOrder: Order | null;
  isReceiptModalOpen: boolean;
  setIsReceiptModalOpen: (open: boolean) => void;
  viewReceiptForOrder: (order: Order) => void;
  heldOrders: HeldOrder[];
  isHeldOrdersModalOpen: boolean;
  setIsHeldOrdersModalOpen: (open: boolean) => void;
  holdCurrentOrder: () => boolean;
  resumeHeldOrder: (order: HeldOrder) => void;
  deleteHeldOrder: (id: string) => void;
  clearAllHeldOrders: () => void;
  openCashDrawer: () => void;
  posToast: POSToast | null;
  showToast: (text: string, type?: 'info' | 'success' | 'warning') => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentBranch } = useAuth();
  const { profile } = useBrand();

  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState<string>('');

  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => posDb.getHeldOrders());
  const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState<boolean>(false);
  const [posToast, setPosToast] = useState<POSToast | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setPosToast({ text, type });
    setTimeout(() => {
      setPosToast((current) => (current?.text === text ? null : current));
    }, 3200);
  };

  const cancelCart = () => {
    if (cartItems.length === 0) {
      showToast('السلة فارغة بالفعل', 'info');
      return;
    }
    clearCart();
    showToast('تم إلغاء الطلب وتفريغ السلة (ESC)', 'warning');
    posDb.logAudit({
      userId: currentUser?.id || 'cashier',
      userName: currentUser?.name || 'كاشير',
      action: 'إلغاء الطلب (ESC)',
      category: 'order',
      details: 'تم تفريغ وإلغاء محتويات السلة عبر اختصار الكاشير ESC',
    });
  };

  const holdCurrentOrder = (): boolean => {
    if (cartItems.length === 0) {
      if (heldOrders.length > 0) {
        setIsHeldOrdersModalOpen(true);
      } else {
        showToast('لا توجد أصناف في السلة لتعليقها (F5)', 'info');
      }
      return false;
    }

    const heldOrder: HeldOrder = {
      id: `held-${Date.now()}`,
      orderNumber: `معلق-${heldOrders.length + 1}`,
      heldAt: new Date().toISOString(),
      orderType,
      tableNumber: selectedTable?.number,
      tableId: selectedTable?.id,
      customerName: selectedCustomer?.name,
      customerId: selectedCustomer?.id,
      customerPhone: selectedCustomer?.phone,
      deliveryAddress: selectedCustomer?.address,
      deliveryFee,
      discountMode,
      discountValue,
      orderNotes,
      items: cartItems,
      subtotal,
      total,
      itemCount: cartItems.length,
    };

    posDb.saveHeldOrder(heldOrder);
    setHeldOrders(posDb.getHeldOrders());
    clearCart();
    showToast(`تم تعليق الطلب (${heldOrder.orderNumber}) بنجاح (F5)`, 'success');
    posDb.logAudit({
      userId: currentUser?.id || 'cashier',
      userName: currentUser?.name || 'كاشير',
      action: 'تعليق الطلب (F5)',
      category: 'order',
      details: `تم تعليق الطلب ${heldOrder.orderNumber} بإجمالي ${total.toFixed(2)} ${profile.currency}`,
    });
    return true;
  };

  const resumeHeldOrder = (order: HeldOrder) => {
    // If current cart already has items, auto-hold it first
    if (cartItems.length > 0) {
      const autoHeld: HeldOrder = {
        id: `held-swap-${Date.now()}`,
        orderNumber: `معلق-${heldOrders.length + 1}`,
        heldAt: new Date().toISOString(),
        orderType,
        tableNumber: selectedTable?.number,
        tableId: selectedTable?.id,
        customerName: selectedCustomer?.name,
        customerId: selectedCustomer?.id,
        customerPhone: selectedCustomer?.phone,
        deliveryAddress: selectedCustomer?.address,
        deliveryFee,
        discountMode,
        discountValue,
        orderNotes,
        items: cartItems,
        subtotal,
        total,
        itemCount: cartItems.length,
      };
      posDb.saveHeldOrder(autoHeld);
    }

    setCartItems(order.items);
    setOrderType(order.orderType);
    setSelectedTable(
      order.tableId ? posDb.getTables().find((t) => t.id === order.tableId) || null : null
    );
    setSelectedCustomer(
      order.customerId ? posDb.getCustomers().find((c) => c.id === order.customerId) || null : null
    );
    setDeliveryFee(order.deliveryFee || 0);
    setDiscountMode(order.discountMode);
    setDiscountValue(order.discountValue);
    setOrderNotes(order.orderNotes || '');

    posDb.removeHeldOrder(order.id);
    setHeldOrders(posDb.getHeldOrders());
    setIsHeldOrdersModalOpen(false);
    showToast(`تم استرجاع الطلب ${order.orderNumber} إلى السلة`, 'success');
  };

  const deleteHeldOrder = (id: string) => {
    posDb.removeHeldOrder(id);
    setHeldOrders(posDb.getHeldOrders());
    showToast('تم حذف الطلب المعلق', 'info');
  };

  const clearAllHeldOrders = () => {
    posDb.clearAllHeldOrders();
    setHeldOrders([]);
    showToast('تم حذف كافة الطلبات المعلقة', 'info');
  };

  const openCashDrawer = () => {
    cashDrawer.triggerOpenDrawer('F9 Shortcut');
    posDb.logAudit({
      userId: currentUser?.id || 'cashier',
      userName: currentUser?.name || 'كاشير',
      action: 'فتح درج النقد (F9)',
      category: 'shift',
      details: 'تم فتح صندوق النقدية يدوياً عبر مفتاح الاختصار F9',
    });
    showToast('تم فتح صندوق النقدية (F9)', 'success');
  };

  const addToCart = (
    product: Product,
    quantity = 1,
    modifiers: SelectedModifier[] = [],
    notes = ''
  ) => {
    // Modifier price additions
    const modTotal = modifiers.reduce((acc, m) => acc + m.priceDelta, 0);
    const unitPrice = product.price + modTotal;

    // Check if an identical product with the exact same modifiers and notes already exists in cart
    const existingIndex = cartItems.findIndex(
      (item) =>
        item.productId === product.id &&
        item.notes === notes &&
        JSON.stringify(item.selectedModifiers) === JSON.stringify(modifiers)
    );

    if (existingIndex >= 0) {
      setCartItems((prev) => {
        const next = [...prev];
        next[existingIndex].quantity += quantity;
        next[existingIndex].itemTotal = next[existingIndex].quantity * next[existingIndex].unitPrice;
        return next;
      });
    } else {
      const newItem: OrderItem = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: product.id,
        productNameAr: product.nameAr,
        productNameEn: product.nameEn,
        unitPrice,
        costPrice: product.costPrice,
        quantity,
        selectedModifiers: modifiers,
        itemTotal: unitPrice * quantity,
        notes,
        kitchenStation: product.kitchenStation,
        status: 'pending',
      };
      setCartItems((prev) => [...prev, newItem]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              itemTotal: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedTable(null);
    setSelectedCustomer(null);
    setDiscountValue(0);
    setDeliveryFee(0);
    setOrderNotes('');
  };

  const setDiscount = (mode: 'percent' | 'fixed', value: number) => {
    setDiscountMode(mode);
    setDiscountValue(Math.max(0, value));
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.itemTotal, 0);

  let discountAmount = 0;
  if (discountMode === 'percent') {
    discountAmount = Number(((subtotal * discountValue) / 100).toFixed(2));
  } else {
    discountAmount = Math.min(subtotal, discountValue);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // Taxes
  const taxPercent = profile.defaultTaxPercent || 14;
  const taxAmount = Number(((taxableAmount * taxPercent) / 100).toFixed(2));

  // Service charge only for dine-in
  const serviceChargePercent = orderType === 'dine_in' ? profile.defaultServicePercent || 12 : 0;
  const serviceChargeAmount = Number(((taxableAmount * serviceChargePercent) / 100).toFixed(2));

  const total = Number(
    (taxableAmount + taxAmount + serviceChargeAmount + (orderType === 'delivery' ? deliveryFee : 0)).toFixed(2)
  );

  const processCheckout = async (payments: PaymentItem[]): Promise<Order> => {
    const paidAmount = payments.reduce((acc, p) => acc + p.amount, 0);
    const changeAmount = Math.max(0, Number((paidAmount - total).toFixed(2)));

    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      type: orderType,
      branchId: currentBranch?.id || 'branch-1',
      branchName: currentBranch?.name || 'الفرع الرئيسي',
      cashierId: currentUser?.id || 'cashier',
      cashierName: currentUser?.name || 'كاشير',
      tableNumber: selectedTable?.number,
      tableId: selectedTable?.id,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      deliveryAddress: selectedCustomer?.address,
      deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
      items: cartItems,
      subtotal,
      discountType: discountMode,
      discountValue,
      discountAmount,
      taxPercent,
      taxAmount,
      serviceChargePercent,
      serviceChargeAmount,
      total,
      payments,
      paidAmount,
      changeAmount,
      status: 'preparing',
      createdAt: new Date().toISOString(),
      prepStartedAt: new Date().toISOString(),
      notes: orderNotes,
    };

    const savedOrder = posDb.createOrder(newOrder);
    setLastCompletedOrder(savedOrder);
    setIsReceiptModalOpen(true);
    clearCart();

    // 1. Auto-print customer thermal receipt upon checkout completion
    if (profile.autoPrintReceipt !== false) {
      setTimeout(() => {
        printReceipt(savedOrder, profile);
      }, 120);
    }

    // 2. Auto-print kitchen order ticket if kitchenAutoPrint is enabled
    if (profile.kitchenAutoPrint !== false) {
      setTimeout(() => {
        printKitchenOrderDirect(savedOrder, profile);
      }, 300);
    }

    return savedOrder;
  };

  const printOrderReceipt = async (order: Order): Promise<boolean> => {
    return printReceipt(order, profile);
  };

  const viewReceiptForOrder = (order: Order) => {
    setLastCompletedOrder(order);
    setIsReceiptModalOpen(true);
  };

  return (
    <POSContext.Provider
      value={{
        cartItems,
        orderType,
        setOrderType,
        selectedTable,
        setSelectedTable,
        selectedCustomer,
        setSelectedCustomer,
        deliveryFee,
        setDeliveryFee,
        discountPercent: discountMode === 'percent' ? discountValue : 0,
        discountFixed: discountMode === 'fixed' ? discountValue : 0,
        discountMode,
        setDiscount,
        orderNotes,
        setOrderNotes,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        discountAmount,
        taxAmount,
        serviceChargeAmount,
        total,
        processCheckout,
        printOrderReceipt,
        lastCompletedOrder,
        isReceiptModalOpen,
        setIsReceiptModalOpen,
        viewReceiptForOrder,
        cancelCart,
        heldOrders,
        isHeldOrdersModalOpen,
        setIsHeldOrdersModalOpen,
        holdCurrentOrder,
        resumeHeldOrder,
        deleteHeldOrder,
        clearAllHeldOrders,
        openCashDrawer,
        posToast,
        showToast,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = (): POSContextType => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within POSProvider');
  }
  return context;
};
