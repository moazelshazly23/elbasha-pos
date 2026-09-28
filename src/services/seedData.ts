import {
  RestaurantProfile,
  ReceiptSettings,
  Branch,
  User,
  Category,
  Product,
  ModifierGroup,
  Ingredient,
  Recipe,
  RestaurantTable,
  Customer,
  Supplier,
  Order,
  Expense,
  Shift,
} from '../types';

export const defaultReceiptSettings: ReceiptSettings = {
  paperWidth: '80mm',
  showLogo: true,
  logoAlignment: 'center',
  logoWidth: 120,
  showRestaurantName: true,
  restaurantNameArabic: 'مشويات الباشا',
  showEnglishName: true,
  restaurantNameEnglish: 'El Basha Grill',
  showSlogan: true,
  sloganArabic: 'أصالة المشويات المصرية والشامية على الفحم',
  sloganEnglish: 'Authentic Charcoal Grilled Delights',
  showAddress: true,
  addressDetails: '',

  // Clean Phones list (zero demo data)
  phones: [],
  showPhone: true,
  showWhatsApp: false,
  whatsAppNumber: '',
  showEmail: false,
  email: '',
  showWebsite: false,
  website: '',
  showFacebook: false,
  facebookUrl: '',
  showInstagram: false,
  instagramUrl: '',

  // Tax & Regulatory (Clean for production setup)
  showTaxNumber: true,
  taxNumber: '',
  showCrNumber: true,
  crNumber: '',
  showVatNumber: true,
  vatNumber: '',
  taxRate: 14,
  taxLabel: 'ضريبة القيمة المضافة (VAT)',

  // Order Info
  showOrderNumber: true,
  showDate: true,
  showTime: true,
  showCashier: true,
  showCustomer: true,
  showTable: true,
  showOrderType: true,
  showBranch: true,

  // Payment
  showPaymentMethod: true,
  showPaidAmount: true,
  showChange: true,
  showRemaining: false,

  // Financial
  showSubtotal: true,
  showDiscount: true,
  showTax: true,
  showServiceCharge: true,
  showDeliveryFee: true,
  showTotal: true,

  // QR Code
  enableQrCode: true,
  qrType: 'tax_einvoice',
  qrUrl: '',
  qrLabel: 'الفاتورة الضريبية المبسطة',
  qrAlignment: 'center',
  qrSize: 110,

  // Header Note & Footer
  showHeaderNote: true,
  headerNote: 'أهلاً وسهلاً بكم - نسعد بخدمتكم دائماً',
  showFooter: true,
  footerMessage: 'شكراً لزيارتكم! نسعد بخدمتكم دائماً ونتمنى لكم وجبة هنيئة',
  footerMessageArabic: 'شكراً لزيارتكم! نسعد بخدمتكم دائماً ونتمنى لكم وجبة هنيئة',
  footerMessageEnglish: 'Thank You For Visiting Us',
};

export const initialProfile: RestaurantProfile = {
  name: 'مشويات الباشا',
  englishName: 'El Basha Grill',
  slogan: 'أصالة المشويات المصرية والشامية على الفحم',
  sloganEnglish: 'Authentic Charcoal Grilled Delights',
  useOfficialLogo: true,
  phone: '',
  phone2: '',
  whatsapp: '',
  email: '',
  website: '',
  address: '',
  taxNumber: '',
  crNumber: '',
  vatNumber: '',
  taxRate: 14,
  taxLabel: 'ضريبة القيمة المضافة (VAT)',
  currency: 'ج.م',
  currencySymbol: 'EGP',
  defaultTaxPercent: 14,
  defaultServicePercent: 12,
  thermalPaperWidth: '80mm',
  autoPrintReceipt: true,
  receiptHeaderNote: 'أهلاً وسهلاً بكم - نسعد بخدمتكم دائماً',
  receiptFooterNote: 'الأسعار تشمل ضريبة القيمة المضافة. شكراً لزيارتكم ونتمنى لكم وجبة شهية!',
  receiptSettings: defaultReceiptSettings,
  primaryColor: '#8B1E1E',
  accentColor: '#B8860B',
  darkColor: '#231610',
  bgColor: '#F8F5F0',
  setupCompleted: true,
  receiptPrinterName: '',
  kitchenPrinterName: '',
  barPrinterName: '',
  kitchenAutoPrint: false,
  directPrintingEnabled: true,
  posFullscreenMode: false,
  singleInstanceLock: true,
  appVersion: '1.0.0',
  buildNumber: '2026.03.WIN64',
  dataStoragePath: '%LOCALAPPDATA%\\MosawyatAlBashaPOS\\data',
  licenseStatus: 'commercial',
  licenseKey: 'COMMERCIAL-POS-PRODUCTION',
  cloudSyncEnabled: true,
  cloudSyncEndpoint: 'https://sync.basha-pos.local/v1',
  lastCloudSyncAt: new Date().toISOString(),
};

export const initialBranches: Branch[] = [
  {
    id: 'branch-1',
    name: 'الفرع الرئيسي',
    address: '',
    phone: '',
    isMain: true,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

// Single real admin account required to operate the system
export const initialUsers: User[] = [
  {
    id: 'user-admin',
    name: 'المدير العام',
    username: 'admin',
    pin: '1234',
    password: 'admin',
    role: 'admin',
    branchId: 'branch-1',
    active: true,
    createdAt: new Date().toISOString(),
    permissions: ['all'],
  },
];

// ZERO DEMO / TRAINING DATA - Clean Production Schema
export const initialCategories: Category[] = [];
export const initialModifierGroups: ModifierGroup[] = [];
export const initialIngredients: Ingredient[] = [];
export const initialRecipes: Recipe[] = [];
export const initialProducts: Product[] = [];
export const initialTables: RestaurantTable[] = [];
export const initialCustomers: Customer[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialOrders: Order[] = [];
export const initialExpenses: Expense[] = [];
export const initialActiveShift: Shift | null = null;
