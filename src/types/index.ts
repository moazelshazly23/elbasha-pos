export type UserRole = 'admin' | 'cashier' | 'kitchen' | 'manager';

export interface User {
  id: string;
  name: string;
  username: string;
  pin?: string;
  password?: string;
  role: UserRole;
  branchId: string;
  active: boolean;
  avatar?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  permissions?: string[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isMain: boolean;
  active: boolean;
  createdAt: string;
}

export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  id: string;
  shiftNumber?: string;
  userId: string;
  userName: string;
  cashierId?: string;
  cashierName?: string;
  branchId: string;
  branchName?: string;
  startTime: string;
  openedAt?: string;
  endTime?: string;
  closedAt?: string;
  startingCash: number;
  cashSales: number;
  cardSales: number;
  otherSales: number;
  totalSales?: number;
  ordersCount?: number;
  expenses: number;
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number;
  difference?: number;
  status: ShiftStatus;
  notes?: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color?: string;
  sortOrder?: number;
  order?: number;
  active?: boolean;
}

export interface ModifierOption {
  id: string;
  nameAr: string;
  nameEn: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  nameAr: string;
  nameEn: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  price: number;
  costPrice: number;
  image?: string;
  description?: string;
  available: boolean;
  prepTimeMinutes: number;
  kitchenStation: 'grill' | 'kitchen' | 'cold';
  recipeId?: string;
  modifierGroupIds?: string[];
  isPopular?: boolean;
  trackInventory?: boolean;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  isActive?: boolean;
  isArchived?: boolean;
  status?: 'active' | 'inactive' | 'archived';
  notes?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Ingredient {
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
  category?: string;
  itemType?: string;
  supplierId?: string;
  supplierName?: string;
  status?: 'active' | 'inactive' | 'archived';
  isActive?: boolean;
  isArchived?: boolean;
  notes?: string;
  updatedAt?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface RecipeItem {
  ingredientId: string;
  ingredientName?: string;
  quantity: number; // in base units
  unit?: string;
}

export interface Recipe {
  id?: string;
  productId: string;
  productName?: string;
  items: RecipeItem[];
  totalCost?: number;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface RestaurantTable {
  id: string;
  number: string;
  branchId: string;
  capacity: number;
  section: string;
  status: TableStatus;
  currentOrderId?: string;
  lastOccupiedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  area?: string;
  notes?: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'pickup';
export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface SelectedModifier {
  groupId: string;
  groupNameAr: string;
  optionId: string;
  nameAr: string;
  priceDelta: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameAr: string;
  productNameEn?: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  itemTotal: number;
  notes?: string;
  kitchenStation: 'grill' | 'kitchen' | 'cold';
  status: 'pending' | 'preparing' | 'ready' | 'completed';
}

export type PaymentMethodType = 'cash' | 'card' | 'instapay' | 'bank_transfer' | 'other';

export interface PaymentItem {
  method: PaymentMethodType;
  amount: number;
  reference?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  tableNumber?: string;
  tableId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryFee?: number;
  driverName?: string;
  items: OrderItem[];
  subtotal: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  total: number;
  payments: PaymentItem[];
  paidAmount: number;
  changeAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  prepStartedAt?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  company?: string;
  address?: string;
  category: string;
  balance: number;
  createdAt?: string;
}

export interface PurchaseOrderItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitPrice?: number;
  unitCost?: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  date?: string;
  items: PurchaseOrderItem[];
  total: number;
  totalAmount?: number;
  status?: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title?: string;
  category: string;
  amount: number;
  date?: string;
  branchId: string;
  branchName?: string;
  userId?: string;
  userName?: string;
  paidTo?: string;
  paidFromDrawer?: boolean;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  category: 'auth' | 'order' | 'inventory' | 'settings' | 'shift' | 'expense' | 'system';
  details: string;
  timestamp: string;
}

export interface ReceiptPhoneEntry {
  id: string;
  number: string;
  label?: string;
  showOnReceipt: boolean;
}

export interface ReceiptSettings {
  paperWidth: '80mm' | '58mm';
  showLogo: boolean;
  logoAlignment: 'left' | 'center' | 'right';
  logoWidth: number; // width in px (e.g. 120)
  showRestaurantName: boolean;
  restaurantNameArabic?: string;
  showEnglishName: boolean;
  restaurantNameEnglish?: string;
  showSlogan: boolean;
  sloganArabic?: string;
  sloganEnglish?: string;
  showAddress: boolean;
  addressDetails?: string;

  // Phone list
  phones: ReceiptPhoneEntry[];
  showPhone: boolean;
  showWhatsApp: boolean;
  whatsAppNumber?: string;
  showEmail: boolean;
  email?: string;
  showWebsite: boolean;
  website?: string;
  showFacebook: boolean;
  facebookUrl?: string;
  showInstagram: boolean;
  instagramUrl?: string;

  // Tax & Regulatory
  showTaxNumber: boolean;
  taxNumber?: string;
  showCrNumber: boolean;
  crNumber?: string;
  showVatNumber: boolean;
  vatNumber?: string;
  taxRate?: number;
  taxLabel?: string;

  // Order Info
  showOrderNumber: boolean;
  showDate: boolean;
  showTime: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showTable: boolean;
  showOrderType: boolean;
  showBranch: boolean;

  // Payment
  showPaymentMethod: boolean;
  showPaidAmount: boolean;
  showChange: boolean;
  showRemaining: boolean;

  // Financial
  showSubtotal: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showServiceCharge?: boolean;
  showDeliveryFee: boolean;
  showTotal: boolean;

  // QR Code
  enableQrCode: boolean;
  qrType: 'website' | 'google_maps' | 'whatsapp' | 'facebook' | 'instagram' | 'review' | 'custom' | 'tax_einvoice';
  qrUrl: string;
  qrLabel: string;
  qrAlignment: 'left' | 'center' | 'right';
  qrSize: number; // in px (e.g. 80, 110, 140)

  // Header Note & Footer
  showHeaderNote?: boolean;
  headerNote?: string;
  showFooter: boolean;
  footerMessage: string;
  footerMessageArabic?: string;
  footerMessageEnglish?: string;
}

export interface RestaurantProfile {
  name: string;
  englishName: string;
  slogan: string;
  sloganEnglish?: string;
  logoUrl?: string; // base64 or URL
  useOfficialLogo: boolean;
  phone: string;
  phone2?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  address: string;
  taxNumber: string;
  crNumber: string;
  vatNumber?: string;
  taxRate?: number;
  taxLabel?: string;
  currency: string;
  currencySymbol: string;
  defaultTaxPercent: number;
  defaultServicePercent: number;
  thermalPaperWidth: '80mm' | '58mm' | 'a4';
  autoPrintReceipt: boolean;
  receiptHeaderNote: string;
  receiptFooterNote: string;
  receiptSettings?: ReceiptSettings;
  primaryColor: string;
  accentColor: string;
  darkColor: string;
  bgColor: string;
  setupCompleted: boolean;
  // Windows Desktop & Hardware Configuration
  receiptPrinterName?: string;
  kitchenPrinterName?: string;
  barPrinterName?: string;
  kitchenAutoPrint?: boolean;
  directPrintingEnabled?: boolean;
  posFullscreenMode?: boolean;
  singleInstanceLock?: boolean;
  appVersion?: string;
  buildNumber?: string;
  dataStoragePath?: string;
  licenseStatus?: 'active' | 'trial' | 'commercial';
  licenseKey?: string;
  cloudSyncEnabled?: boolean;
  cloudSyncEndpoint?: string;
  lastCloudSyncAt?: string;
}

export interface HeldOrder {
  id: string;
  orderNumber: string;
  heldAt: string;
  orderType: OrderType;
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryFee: number;
  discountMode: 'percent' | 'fixed';
  discountValue: number;
  orderNotes: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  itemCount: number;
}
