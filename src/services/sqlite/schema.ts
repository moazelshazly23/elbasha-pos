/**
 * SQLite Schema Definition for Mosawyat Al Basha POS
 * 
 * Supports standard SQLite syntax with relational structures, indexes,
 * and PRAGMA settings for enterprise durability (WAL mode).
 */

export const SQLITE_PRAGMAS = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -64000;
`;

export const SQLITE_CREATE_TABLES = `
-- 1. Metadata & Migrations
CREATE TABLE IF NOT EXISTS sqlite_system_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Restaurant Profile & Brand Settings
CREATE TABLE IF NOT EXISTS restaurant_profile (
  id TEXT PRIMARY KEY DEFAULT 'profile_main',
  name TEXT NOT NULL,
  english_name TEXT,
  slogan TEXT,
  use_official_logo INTEGER DEFAULT 1,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  cr_number TEXT,
  currency TEXT NOT NULL DEFAULT 'ج.م',
  currency_symbol TEXT NOT NULL DEFAULT 'EGP',
  default_tax_percent REAL DEFAULT 14.0,
  default_service_percent REAL DEFAULT 12.0,
  thermal_paper_width TEXT DEFAULT '80mm',
  auto_print_receipt INTEGER DEFAULT 1,
  receipt_header_note TEXT,
  receipt_footer_note TEXT,
  primary_color TEXT DEFAULT '#8B1E1E',
  accent_color TEXT DEFAULT '#B8860B',
  dark_color TEXT DEFAULT '#231610',
  bg_color TEXT DEFAULT '#F8F5F0',
  setup_completed INTEGER DEFAULT 1,
  receipt_printer_name TEXT,
  kitchen_printer_name TEXT,
  bar_printer_name TEXT,
  kitchen_auto_print INTEGER DEFAULT 1,
  direct_printing_enabled INTEGER DEFAULT 1,
  pos_fullscreen_mode INTEGER DEFAULT 0,
  single_instance_lock INTEGER DEFAULT 1,
  app_version TEXT DEFAULT '1.0.0',
  build_number TEXT DEFAULT '2026.03.WIN64',
  data_storage_path TEXT,
  license_status TEXT DEFAULT 'commercial',
  license_key TEXT,
  cloud_sync_enabled INTEGER DEFAULT 1,
  cloud_sync_endpoint TEXT,
  last_cloud_sync_at TEXT,
  raw_json TEXT
);

-- 3. Branches
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  phone TEXT,
  is_main INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  tables_count INTEGER DEFAULT 0,
  raw_json TEXT
);

-- 4. Users & Staff
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT NOT NULL,
  branch_id TEXT,
  active INTEGER DEFAULT 1,
  phone TEXT,
  permissions TEXT,
  raw_json TEXT
);

-- 5. Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  raw_json TEXT
);

-- 6. Products / Menu Items
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  price REAL NOT NULL,
  cost REAL DEFAULT 0,
  sku TEXT,
  barcode TEXT,
  image TEXT,
  is_available INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'portion',
  display_order INTEGER DEFAULT 0,
  tax_percent REAL DEFAULT 14.0,
  preparation_time_minutes INTEGER DEFAULT 15,
  kitchen_station TEXT DEFAULT 'grill',
  is_active INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  is_archived INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  raw_json TEXT
);

-- 7. Modifier Groups & Addons
CREATE TABLE IF NOT EXISTS modifier_groups (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  required INTEGER DEFAULT 0,
  min_selection INTEGER DEFAULT 0,
  max_selection INTEGER DEFAULT 1,
  product_ids TEXT,
  raw_json TEXT
);

-- 8. Raw Ingredients (Inventory)
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  unit TEXT NOT NULL,
  current_stock REAL DEFAULT 0,
  min_stock_alert REAL DEFAULT 0,
  cost_per_unit REAL DEFAULT 0,
  category TEXT,
  supplier_id TEXT,
  is_active INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  is_archived INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  raw_json TEXT
);

-- 9. Product Recipes (Bill of Materials)
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  raw_json TEXT
);

-- 10. Dining Tables
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  zone TEXT DEFAULT 'indoor',
  status TEXT DEFAULT 'available',
  current_order_id TEXT,
  active INTEGER DEFAULT 1,
  raw_json TEXT
);

-- 11. Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  address TEXT,
  area TEXT,
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  raw_json TEXT
);

-- 12. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  contact_person TEXT,
  address TEXT,
  tax_number TEXT,
  balance REAL DEFAULT 0,
  active INTEGER DEFAULT 1,
  raw_json TEXT
);

-- 13. Orders & Transactions
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  table_id TEXT,
  table_number TEXT,
  subtotal REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  service_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  delivery_fee REAL DEFAULT 0,
  total REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  change_amount REAL DEFAULT 0,
  payment_method TEXT NOT NULL,
  shift_id TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  raw_json TEXT NOT NULL
);

-- 14. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  status TEXT NOT NULL,
  total_amount REAL NOT NULL,
  order_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  raw_json TEXT NOT NULL
);

-- 15. Operational Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  shift_id TEXT,
  branch_id TEXT,
  raw_json TEXT NOT NULL
);

-- 16. Work Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  shift_number TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT NOT NULL,
  starting_cash REAL NOT NULL,
  ending_cash REAL,
  expected_cash REAL,
  cash_difference REAL,
  total_sales REAL DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  raw_json TEXT NOT NULL
);

-- 17. Security & Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  details TEXT NOT NULL,
  raw_json TEXT NOT NULL
);

-- 18. Held Suspended Orders
CREATE TABLE IF NOT EXISTS held_orders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  held_at TEXT NOT NULL,
  held_by_name TEXT NOT NULL,
  total REAL NOT NULL,
  raw_json TEXT NOT NULL
);

-- Indexes for lightning fast lookups in POS
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON products(is_archived);
CREATE INDEX IF NOT EXISTS idx_ingredients_status ON ingredients(status);
CREATE INDEX IF NOT EXISTS idx_ingredients_is_active ON ingredients(is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_is_archived ON ingredients(is_archived);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
`;
