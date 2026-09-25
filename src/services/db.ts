import {
  RestaurantProfile,
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
  PurchaseOrder,
  Expense,
  Shift,
  AuditLog,
  HeldOrder,
} from '../types';
import {
  initialProfile,
  initialBranches,
  initialUsers,
  initialCategories,
  initialProducts,
  initialModifierGroups,
  initialIngredients,
  initialRecipes,
  initialTables,
  initialCustomers,
  initialSuppliers,
  initialOrders,
  initialExpenses,
  initialActiveShift,
} from './seedData';
import { windowsBridge } from './windowsBridge';
import {
  bashaSqlite,
  ensureBashaLocalAppDataSQLitePath,
  SQLitePathStatus,
} from './sqlite/bashaSqliteEngine';
import { syncQueue } from './syncQueue';

const STORAGE_KEYS = {
  PROFILE: 'basha_pos_profile_v1',
  BRANCHES: 'basha_pos_branches_v1',
  USERS: 'basha_pos_users_v1',
  CATEGORIES: 'basha_pos_categories_v1',
  PRODUCTS: 'basha_pos_products_v1',
  MODIFIERS: 'basha_pos_modifiers_v1',
  INGREDIENTS: 'basha_pos_ingredients_v1',
  RECIPES: 'basha_pos_recipes_v1',
  TABLES: 'basha_pos_tables_v1',
  CUSTOMERS: 'basha_pos_customers_v1',
  SUPPLIERS: 'basha_pos_suppliers_v1',
  ORDERS: 'basha_pos_orders_v1',
  PURCHASES: 'basha_pos_purchases_v1',
  EXPENSES: 'basha_pos_expenses_v1',
  SHIFTS: 'basha_pos_shifts_v1',
  SHIFTS_HISTORY: 'basha_pos_shifts_history_v1',
  AUDIT_LOGS: 'basha_pos_audit_logs_v1',
  HELD_ORDERS: 'basha_pos_held_orders_v1',
};

const DB_INITIALIZED_KEY = 'basha_pos_clean_prod_v5';

const TABLE_MAP: Record<string, string> = {
  [STORAGE_KEYS.PROFILE]: 'restaurant_profile',
  [STORAGE_KEYS.BRANCHES]: 'branches',
  [STORAGE_KEYS.USERS]: 'users',
  [STORAGE_KEYS.CATEGORIES]: 'categories',
  [STORAGE_KEYS.PRODUCTS]: 'products',
  [STORAGE_KEYS.MODIFIERS]: 'modifier_groups',
  [STORAGE_KEYS.INGREDIENTS]: 'ingredients',
  [STORAGE_KEYS.RECIPES]: 'recipes',
  [STORAGE_KEYS.TABLES]: 'restaurant_tables',
  [STORAGE_KEYS.CUSTOMERS]: 'customers',
  [STORAGE_KEYS.SUPPLIERS]: 'suppliers',
  [STORAGE_KEYS.ORDERS]: 'orders',
  [STORAGE_KEYS.PURCHASES]: 'purchase_orders',
  [STORAGE_KEYS.EXPENSES]: 'expenses',
  [STORAGE_KEYS.SHIFTS]: 'shifts',
  [STORAGE_KEYS.SHIFTS_HISTORY]: 'shifts_history',
  [STORAGE_KEYS.AUDIT_LOGS]: 'audit_logs',
  [STORAGE_KEYS.HELD_ORDERS]: 'held_orders',
};

type Listener = () => void;

class POSDatabase {
  private listeners: Set<Listener> = new Set();
  private sqliteEngine = bashaSqlite;

  constructor() {
    this.initSQLiteDatabase();
    // Subscribe to SQLite engine updates
    this.sqliteEngine.subscribe(() => {
      this.notify();
    });
  }

  /**
   * Guarantees and verifies the SQLite database within %LOCALAPPDATA%
   */
  public ensureLocalAppDataSQLitePath(): SQLitePathStatus {
    const status = ensureBashaLocalAppDataSQLitePath();
    windowsBridge.log('info', 'DB', `تأكيد تشغيل SQLite داخل: ${status.resolvedPath}`);
    return status;
  }

  public getSqliteStats() {
    return this.sqliteEngine.getStats();
  }

  public getSqliteEngine() {
    return this.sqliteEngine;
  }

  private initSQLiteDatabase(): void {
    // 1. Ensure SQLite path in %LOCALAPPDATA%\MosawyatAlBashaPOS\data
    this.ensureLocalAppDataSQLitePath();

    // 2. Check if database has already been initialized
    const isInitialized = localStorage.getItem(DB_INITIALIZED_KEY);
    const currentProfile = this.sqliteEngine.selectById('restaurant_profile', 'profile_main');

    if (!isInitialized || !currentProfile) {
      windowsBridge.log('info', 'DB', 'تهيئة جداول النظام للإنتاج وتصفير البيانات التجريبية بالكامل');
      this.seedInitialDataToSQLite();
      localStorage.setItem(DB_INITIALIZED_KEY, 'true');
    }

    // Automatically purge all legacy demo data across tables
    this.purgeAllLegacyDemoData();
  }

  /**
   * Purges any legacy demo data from persistent storage to ensure clean production state
   */
  private purgeAllLegacyDemoData(): void {
    try {
      const CLEAN_FLAG = 'basha_pos_demo_purge_v5';
      const hasCleaned = localStorage.getItem(CLEAN_FLAG);

      const orders = this.load<Order[]>(STORAGE_KEYS.ORDERS, []);
      const products = this.load<Product[]>(STORAGE_KEYS.PRODUCTS, []);
      const users = this.load<User[]>(STORAGE_KEYS.USERS, []);
      const tables = this.load<RestaurantTable[]>(STORAGE_KEYS.TABLES, []);
      const branches = this.load<Branch[]>(STORAGE_KEYS.BRANCHES, []);
      const customers = this.load<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);

      const hasDemoOrders = orders.some((o) => o.id?.startsWith('ord-sample') || o.id?.startsWith('ord-hist'));
      const hasDemoProducts = products.some((p) => p.id?.startsWith('prod-') && ['GRL-001', 'GRL-002', 'MEL-001'].includes(p.sku || ''));
      const hasDemoUsers = users.some((u) => u.id === 'user-cashier' || u.name.includes('أحمد مصطفى'));
      const hasDemoTables = tables.some((t) => t.id === 'tbl-1' || t.currentOrderId);
      const hasDemoBranches = branches.some((b) => b.id === 'branch-2');
      const hasDemoCustomers = customers.some((c) => c.id === 'cust-1');

      if (!hasCleaned || hasDemoOrders || hasDemoProducts || hasDemoUsers || hasDemoTables || hasDemoBranches || hasDemoCustomers) {
        windowsBridge.log('info', 'DB', 'تنظيف وتصفير شامل لجميع السجلات التجريبية لضمان نسخة إنتاجية جاهزة للعميل');

        // Reset tables in local storage and SQLite
        this.save(STORAGE_KEYS.ORDERS, []);
        this.save(STORAGE_KEYS.HELD_ORDERS, []);
        this.sqliteEngine.clearTable('orders');
        this.sqliteEngine.clearTable('held_orders');

        this.save(STORAGE_KEYS.PRODUCTS, []);
        this.save(STORAGE_KEYS.CATEGORIES, []);
        this.save(STORAGE_KEYS.MODIFIERS, []);
        this.save(STORAGE_KEYS.RECIPES, []);
        this.save(STORAGE_KEYS.INGREDIENTS, []);
        this.sqliteEngine.clearTable('products');
        this.sqliteEngine.clearTable('categories');
        this.sqliteEngine.clearTable('modifier_groups');
        this.sqliteEngine.clearTable('recipes');
        this.sqliteEngine.clearTable('ingredients');

        this.save(STORAGE_KEYS.TABLES, []);
        this.sqliteEngine.clearTable('restaurant_tables');

        this.save(STORAGE_KEYS.CUSTOMERS, []);
        this.save(STORAGE_KEYS.SUPPLIERS, []);
        this.sqliteEngine.clearTable('customers');
        this.sqliteEngine.clearTable('suppliers');

        this.save(STORAGE_KEYS.PURCHASES, []);
        this.save(STORAGE_KEYS.EXPENSES, []);
        this.sqliteEngine.clearTable('purchase_orders');
        this.sqliteEngine.clearTable('expenses');

        this.save(STORAGE_KEYS.SHIFTS, null);
        this.save(STORAGE_KEYS.SHIFTS_HISTORY, []);
        this.sqliteEngine.clearTable('shifts');
        this.sqliteEngine.clearTable('shifts_history');

        this.save(STORAGE_KEYS.AUDIT_LOGS, []);
        this.sqliteEngine.clearTable('audit_logs');

        // Ensure single real main branch
        this.save(STORAGE_KEYS.BRANCHES, initialBranches);
        this.sqliteEngine.clearTable('branches');
        this.sqliteEngine.bulkInsertOrReplace('branches', initialBranches);

        // Ensure single primary admin user
        this.save(STORAGE_KEYS.USERS, initialUsers);
        this.sqliteEngine.clearTable('users');
        this.sqliteEngine.bulkInsertOrReplace('users', initialUsers);

        localStorage.setItem(CLEAN_FLAG, 'true');
        localStorage.setItem(DB_INITIALIZED_KEY, 'true');
      }
    } catch (e) {
      console.warn('Error purging legacy demo data:', e);
    }
  }

  private cleanLegacyDemoSuppliers(): void {
    // Handled by purgeAllLegacyDemoData
  }

  private seedInitialDataToSQLite(): void {
    this.sqliteEngine.transaction(() => {
      this.sqliteEngine.insertOrReplace('restaurant_profile', { ...initialProfile, id: 'profile_main' });
      this.sqliteEngine.bulkInsertOrReplace('branches', initialBranches);
      this.sqliteEngine.bulkInsertOrReplace('users', initialUsers);
      this.sqliteEngine.bulkInsertOrReplace('categories', initialCategories);
      this.sqliteEngine.bulkInsertOrReplace('products', initialProducts);
      this.sqliteEngine.bulkInsertOrReplace('modifier_groups', initialModifierGroups);
      this.sqliteEngine.bulkInsertOrReplace('ingredients', initialIngredients);
      this.sqliteEngine.bulkInsertOrReplace('recipes', initialRecipes);
      this.sqliteEngine.bulkInsertOrReplace('restaurant_tables', initialTables);
      this.sqliteEngine.bulkInsertOrReplace('customers', initialCustomers);
      this.sqliteEngine.bulkInsertOrReplace('suppliers', initialSuppliers);
      this.sqliteEngine.bulkInsertOrReplace('orders', initialOrders);
      this.sqliteEngine.bulkInsertOrReplace('expenses', initialExpenses);
      if (initialActiveShift) {
        this.sqliteEngine.insertOrReplace('shifts', { ...initialActiveShift, id: initialActiveShift.id || 'active_shift' });
      }
    });

    // Mirror to standard local storage keys for instantaneous sync
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(initialProfile));
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(initialBranches));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(initialCategories));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
    localStorage.setItem(STORAGE_KEYS.MODIFIERS, JSON.stringify(initialModifierGroups));
    localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(initialIngredients));
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(initialRecipes));
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(initialTables));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(initialSuppliers));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(initialOrders));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(initialExpenses));
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(initialActiveShift));
    localStorage.setItem(DB_INITIALIZED_KEY, 'true');
  }

  private load<T>(key: string, defaultValue: T): T {
    try {
      // 1. First priority: Check local storage for exact state (preserves empty [] and live edits)
      const data = localStorage.getItem(key);
      if (data !== null) {
        try {
          const parsed = JSON.parse(data);
          return parsed as T;
        } catch (parseErr) {
          console.warn(`JSON parse error loading ${key}:`, parseErr);
        }
      }

      // 2. Second priority: Query relational SQLite engine
      const tableName = TABLE_MAP[key];
      if (tableName) {
        if (key === STORAGE_KEYS.PROFILE) {
          const rec = this.sqliteEngine.selectById<any>(tableName, 'profile_main');
          if (rec) return rec as T;
        } else if (key === STORAGE_KEYS.SHIFTS) {
          const all = this.sqliteEngine.selectAll<any>(tableName);
          const active = all.find((s) => s.status === 'open') || all[0];
          if (active) return active as T;
        } else {
          const all = this.sqliteEngine.selectAll<any>(tableName);
          if (all !== null && all !== undefined) {
            return all as T;
          }
        }
      }

      // 3. Fallback: defaultValue (only on very first pristine launch)
      return defaultValue;
    } catch (e) {
      console.error(`Failed to load ${key} from SQLite storage:`, e);
      return defaultValue;
    }
  }

  private save<T>(key: string, value: T): void {
    try {
      // 1. Serialize and write to primary LocalStorage
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);

      // Mark initialized to prevent re-seeding
      localStorage.setItem(DB_INITIALIZED_KEY, 'true');

      // 2. Synchronize to SQLite engine
      const tableName = TABLE_MAP[key];
      if (tableName) {
        if (key === STORAGE_KEYS.PROFILE) {
          this.sqliteEngine.insertOrReplace(tableName, { ...(value as any), id: 'profile_main' });
        } else if (key === STORAGE_KEYS.SHIFTS) {
          if (value && typeof value === 'object') {
            const shiftObj = value as any;
            this.sqliteEngine.insertOrReplace(tableName, { ...shiftObj, id: shiftObj.id || 'active_shift' });
          }
        } else if (Array.isArray(value)) {
          this.sqliteEngine.clearTable(tableName);
          this.sqliteEngine.bulkInsertOrReplace(tableName, value);
        } else if (value && typeof value === 'object') {
          this.sqliteEngine.insertOrReplace(tableName, value as any);
        }
      }

      // 3. Sync to Desktop Local File / Electron bridge inside %LOCALAPPDATA%
      windowsBridge.saveData(key, serialized);

      // 4. Notify all UI subscribers
      this.notify();
    } catch (e) {
      console.error(`Failed to save ${key} to SQLite storage:`, e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // --- Profile / Branding ---
  public getProfile(): RestaurantProfile {
    return this.load<RestaurantProfile>(STORAGE_KEYS.PROFILE, initialProfile);
  }

  public updateProfile(updated: Partial<RestaurantProfile>, userId = 'admin', userName = 'المدير'): RestaurantProfile {
    const current = this.getProfile();
    const next = { ...current, ...updated };
    this.save(STORAGE_KEYS.PROFILE, next);
    this.logAudit({
      userId,
      userName,
      action: 'تحديث الهوية والإعدادات',
      category: 'settings',
      details: `تم تعديل بيانات وهوية المطعم: ${next.name}`,
    });
    return next;
  }

  // --- Branches ---
  public getBranches(): Branch[] {
    return this.load<Branch[]>(STORAGE_KEYS.BRANCHES, initialBranches);
  }

  public saveBranch(branch: Branch, userId = 'admin', userName = 'المدير'): void {
    const branches = this.getBranches();
    const idx = branches.findIndex((b) => b.id === branch.id);
    if (idx >= 0) {
      branches[idx] = branch;
    } else {
      branches.push(branch);
    }
    this.save(STORAGE_KEYS.BRANCHES, branches);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'branches', branch.id, branch);
    this.logAudit({
      userId,
      userName,
      action: idx >= 0 ? 'تعديل فرع' : 'إضافة فرع جديد',
      category: 'settings',
      details: `الفرع: ${branch.name}`,
    });
  }

  public deleteBranch(branchId: string, userId = 'admin', userName = 'المدير'): boolean {
    const branches = this.getBranches();
    if (branches.length <= 1) {
      return false; // لا يمكن حذف الفرع الوحيد المتبقي
    }
    const filtered = branches.filter((b) => b.id !== branchId);
    this.save(STORAGE_KEYS.BRANCHES, filtered);
    syncQueue.enqueue('delete', 'branches', branchId, { id: branchId });
    this.logAudit({
      userId,
      userName,
      action: 'حذف فرع',
      category: 'settings',
      details: `معرف الفرع المحذوف: ${branchId}`,
    });
    return true;
  }

  // --- Users & RBAC ---
  public getUsers(): User[] {
    return this.load<User[]>(STORAGE_KEYS.USERS, initialUsers);
  }

  public saveUser(user: User, adminId = 'admin', adminName = 'المدير'): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.save(STORAGE_KEYS.USERS, users);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'users', user.id, user);
    this.logAudit({
      userId: adminId,
      userName: adminName,
      action: idx >= 0 ? 'تعديل مستخدم' : 'إضافة مستخدم جديد',
      category: 'auth',
      details: `المستخدم: ${user.name} (${user.role})`,
    });
  }

  public deleteUser(userId: string, adminId = 'admin', adminName = 'المدير'): void {
    const users = this.getUsers().filter((u) => u.id !== userId);
    this.save(STORAGE_KEYS.USERS, users);
    syncQueue.enqueue('delete', 'users', userId, { id: userId });
    this.logAudit({
      userId: adminId,
      userName: adminName,
      action: 'حذف مستخدم',
      category: 'auth',
      details: `معرف المستخدم: ${userId}`,
    });
  }

  // --- Categories ---
  public getCategories(): Category[] {
    return this.load<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
  }

  public saveCategory(category: Category): void {
    const cats = this.getCategories();
    const idx = cats.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      cats[idx] = category;
    } else {
      cats.push(category);
    }
    this.save(STORAGE_KEYS.CATEGORIES, cats);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'categories', category.id, category);
  }

  public deleteCategory(categoryId: string): void {
    const cats = this.getCategories().filter((c) => c.id !== categoryId);
    this.save(STORAGE_KEYS.CATEGORIES, cats);
    syncQueue.enqueue('delete', 'categories', categoryId, { id: categoryId });
  }

  // --- Products ---
  public getProducts(options?: { includeArchived?: boolean }): Product[] {
    const prods = this.load<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
    if (options?.includeArchived) return prods;
    return prods.filter(
      (p) => p.isActive !== false && p.status !== 'archived' && !p.deletedAt && !p.isArchived
    );
  }

  public getArchivedProducts(): Product[] {
    const prods = this.getProducts({ includeArchived: true });
    return prods.filter(
      (p) => p.isActive === false || p.status === 'archived' || !!p.deletedAt || !!p.isArchived
    );
  }

  public getProductById(id: string): Product | undefined {
    const prods = this.getProducts({ includeArchived: true });
    return prods.find((p) => p.id === id);
  }

  public isProductInUse(productId: string): { inUse: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const orders = this.getOrders();
    const usingOrders = orders.filter((o) => o.items?.some((it) => it.productId === productId));
    if (usingOrders.length > 0) {
      reasons.push(`مرتبط بـ ${usingOrders.length} طلب بيع`);
    }
    const recipes = this.getRecipes();
    const recipe = recipes.find((r) => r.productId === productId);
    if (recipe) {
      reasons.push('مرتبط ببطاقة وصفة تحضير');
    }
    return { inUse: reasons.length > 0, reasons };
  }

  public saveProduct(product: Product, userId = 'admin', userName = 'المدير العام'): void {
    const prods = this.getProducts({ includeArchived: true });
    const idx = prods.findIndex((p) => p.id === product.id);
    let oldProduct: Product | null = null;

    if (idx >= 0) {
      oldProduct = { ...prods[idx] };
      prods[idx] = {
        ...prods[idx],
        ...product,
      };
    } else {
      prods.push({
        ...product,
        isActive: product.isActive ?? true,
      });
    }
    this.save(STORAGE_KEYS.PRODUCTS, prods);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'products', product.id, product);

    if (oldProduct) {
      this.logAudit({
        userId,
        userName,
        action: 'UPDATE_INVENTORY_ITEM',
        category: 'inventory',
        details: `تعديل منتج [${product.nameAr}] (ID: ${product.id}): التكلفة: ${oldProduct.costPrice} -> ${product.costPrice} | السعر: ${oldProduct.price} -> ${product.price} | الرصيد: ${oldProduct.currentStock ?? 0} -> ${product.currentStock ?? 0}`,
      });
    } else {
      this.logAudit({
        userId,
        userName,
        action: 'CREATE_INVENTORY_ITEM',
        category: 'inventory',
        details: `إضافة منتج جديد: [${product.nameAr}] (ID: ${product.id}) بسعر ${product.price} ج.م`,
      });
    }
  }

  public deleteProduct(
    productId: string,
    userId = 'admin',
    userName = 'المدير العام',
    reason?: string
  ): { archived: boolean } {
    const prods = this.getProducts({ includeArchived: true });
    const target = prods.find((p) => p.id === productId);
    if (!target) return { archived: false };

    const usage = this.isProductInUse(productId);
    const now = new Date().toISOString();

    // Strict soft-delete (archiving) instead of hard delete:
    // Never remove records from DB to maintain relational and reporting data integrity.
    target.isActive = false;
    target.available = false;
    target.status = 'archived';
    target.isArchived = true;
    target.deletedAt = now;
    target.deletedBy = userId;

    this.save(STORAGE_KEYS.PRODUCTS, prods);
    this.sqliteEngine.softDelete('products', productId, { deletedBy: userId, reason });

    syncQueue.enqueue('delete', 'products', productId, {
      id: productId,
      name: target.nameAr,
      archived: true,
      deletedAt: now,
      deletedBy: userId,
      reason: reason || 'أرشفة من شاشة المخزون للحفاظ على سلامة التاريخ والمبيعات',
    });

    this.logAudit({
      userId,
      userName,
      action: 'ARCHIVE_INVENTORY_ITEM',
      category: 'inventory',
      details: `أرشفة المنتج وحجبه عن المخزون النشط: [${target.nameAr}] (ID: ${productId}) مع صيانة السجلات التاريخية للطلبات والتقارير ${usage.inUse ? `(${usage.reasons.join(', ')})` : ''}. السبب: ${reason || 'أرشفة بواسطة المسؤول'}`,
    });

    return { archived: true };
  }

  public restoreProduct(
    productId: string,
    userId = 'admin',
    userName = 'المدير العام'
  ): boolean {
    const prods = this.getProducts({ includeArchived: true });
    const target = prods.find((p) => p.id === productId);
    if (!target) return false;

    target.isActive = true;
    target.available = true;
    target.status = 'active';
    target.isArchived = false;
    target.deletedAt = undefined;
    target.deletedBy = undefined;

    this.save(STORAGE_KEYS.PRODUCTS, prods);
    this.sqliteEngine.restoreRecord('products', productId);

    syncQueue.enqueue('update', 'products', productId, target);

    this.logAudit({
      userId,
      userName,
      action: 'RESTORE_INVENTORY_ITEM',
      category: 'inventory',
      details: `إلغاء أرشفة واستعادة المنتج إلى المخزون النشط: [${target.nameAr}] (ID: ${productId})`,
    });

    return true;
  }

  // --- Modifier Groups ---
  public getModifierGroups(): ModifierGroup[] {
    return this.load<ModifierGroup[]>(STORAGE_KEYS.MODIFIERS, initialModifierGroups);
  }

  public saveModifierGroup(group: ModifierGroup): void {
    const groups = this.getModifierGroups();
    const idx = groups.findIndex((g) => g.id === group.id);
    if (idx >= 0) {
      groups[idx] = group;
    } else {
      groups.push(group);
    }
    this.save(STORAGE_KEYS.MODIFIERS, groups);
  }

  // --- Ingredients & Inventory ---
  public getIngredients(options?: { includeArchived?: boolean }): Ingredient[] {
    const ings = this.load<Ingredient[]>(STORAGE_KEYS.INGREDIENTS, initialIngredients);
    if (options?.includeArchived) return ings;
    return ings.filter(
      (i) => i.isActive !== false && i.status !== 'archived' && !i.deletedAt && !i.isArchived
    );
  }

  public getArchivedIngredients(): Ingredient[] {
    const ings = this.getIngredients({ includeArchived: true });
    return ings.filter(
      (i) => i.isActive === false || i.status === 'archived' || !!i.deletedAt || !!i.isArchived
    );
  }

  public getIngredientById(id: string): Ingredient | undefined {
    const ings = this.getIngredients({ includeArchived: true });
    return ings.find((i) => i.id === id);
  }

  public isIngredientInUse(ingredientId: string): { inUse: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check recipes
    const recipes = this.getRecipes();
    const usingRecipes = recipes.filter((r) => r.items?.some((it) => it.ingredientId === ingredientId));
    if (usingRecipes.length > 0) {
      reasons.push(`مرتبط بـ ${usingRecipes.length} وصفة`);
    }

    // Check purchases
    const purchases = this.getPurchases();
    const usingPurchases = purchases.filter((p) => p.items?.some((it) => it.ingredientId === ingredientId));
    if (usingPurchases.length > 0) {
      reasons.push(`مرتبط بـ ${usingPurchases.length} أمر شراء`);
    }

    return {
      inUse: reasons.length > 0,
      reasons,
    };
  }

  public saveIngredient(ingredient: Ingredient, userId = 'admin', userName = 'المدير العام'): void {
    const ings = this.getIngredients({ includeArchived: true });
    const idx = ings.findIndex((i) => i.id === ingredient.id);
    let oldIngredient: Ingredient | null = null;

    if (idx >= 0) {
      oldIngredient = { ...ings[idx] };
      ings[idx] = {
        ...ings[idx],
        ...ingredient,
        updatedAt: new Date().toISOString(),
      };
    } else {
      ings.push({
        ...ingredient,
        isActive: ingredient.isActive ?? true,
        status: ingredient.status ?? 'active',
        updatedAt: new Date().toISOString(),
      });
    }

    this.save(STORAGE_KEYS.INGREDIENTS, ings);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'ingredients', ingredient.id, ingredient);

    if (oldIngredient) {
      this.logAudit({
        userId,
        userName,
        action: 'UPDATE_INVENTORY_ITEM',
        category: 'inventory',
        details: `تعديل المادة الخام [${ingredient.name}] (ID: ${ingredient.id}): التكلفة: ${oldIngredient.costPerUnit} -> ${ingredient.costPerUnit} ج.م | الحد الأدنى: ${oldIngredient.minStock} -> ${ingredient.minStock} ${ingredient.unit} | الرصيد: ${oldIngredient.currentStock} -> ${ingredient.currentStock} ${ingredient.unit}`,
      });
    } else {
      this.logAudit({
        userId,
        userName,
        action: 'CREATE_INVENTORY_ITEM',
        category: 'inventory',
        details: `إضافة مادة خام جديدة: [${ingredient.name}] (ID: ${ingredient.id}) برصيد ${ingredient.currentStock} ${ingredient.unit} وتكلفة ${ingredient.costPerUnit} ج.م`,
      });
    }
  }

  public deleteIngredient(
    ingredientId: string,
    userId = 'admin',
    userName = 'المدير العام',
    reason?: string
  ): { archived: boolean } {
    const ings = this.getIngredients({ includeArchived: true });
    const target = ings.find((i) => i.id === ingredientId);
    if (!target) return { archived: false };

    const usage = this.isIngredientInUse(ingredientId);
    const now = new Date().toISOString();

    // Strict soft-delete (archiving) instead of hard delete:
    // Never remove records from DB to maintain relational and reporting data integrity.
    target.isActive = false;
    target.status = 'archived';
    target.isArchived = true;
    target.deletedAt = now;
    target.deletedBy = userId;

    this.save(STORAGE_KEYS.INGREDIENTS, ings);
    this.sqliteEngine.softDelete('ingredients', ingredientId, { deletedBy: userId, reason });

    syncQueue.enqueue('delete', 'ingredients', ingredientId, {
      id: ingredientId,
      name: target.name,
      archived: true,
      deletedAt: now,
      deletedBy: userId,
      reason: reason || 'أرشفة من شاشة المخزون للحفاظ على سلامة التاريخ والمشتريات',
    });

    this.logAudit({
      userId,
      userName,
      action: 'ARCHIVE_INVENTORY_ITEM',
      category: 'inventory',
      details: `أرشفة المادة الخام وحجبها عن المخزون النشط: [${target.name}] (ID: ${ingredientId}) مع صيانة السجلات التاريخية للوصفات والمشتريات ${usage.inUse ? `(${usage.reasons.join(', ')})` : ''}. السبب: ${reason || 'أرشفة بواسطة المسؤول'}`,
    });

    return { archived: true };
  }

  public restoreIngredient(
    ingredientId: string,
    userId = 'admin',
    userName = 'المدير العام'
  ): boolean {
    const ings = this.getIngredients({ includeArchived: true });
    const target = ings.find((i) => i.id === ingredientId);
    if (!target) return false;

    target.isActive = true;
    target.status = 'active';
    target.isArchived = false;
    target.deletedAt = undefined;
    target.deletedBy = undefined;

    this.save(STORAGE_KEYS.INGREDIENTS, ings);
    this.sqliteEngine.restoreRecord('ingredients', ingredientId);

    syncQueue.enqueue('update', 'ingredients', ingredientId, target);

    this.logAudit({
      userId,
      userName,
      action: 'RESTORE_INVENTORY_ITEM',
      category: 'inventory',
      details: `إلغاء أرشفة واستعادة المادة الخام إلى المخزون النشط: [${target.name}] (ID: ${ingredientId})`,
    });

    return true;
  }

  public adjustStock(
    ingredientId: string,
    quantityDelta: number,
    reasonOrType: string,
    reason?: string,
    userId = 'system',
    userName = 'النظام'
  ): void {
    const ings = this.getIngredients({ includeArchived: true });
    const target = ings.find((i) => i.id === ingredientId);
    if (!target) return;
    target.currentStock = Math.max(0, Number((target.currentStock + quantityDelta).toFixed(2)));
    this.save(STORAGE_KEYS.INGREDIENTS, ings);
    syncQueue.enqueue('update', 'ingredients', ingredientId, target);
    const effectiveReason = reason || reasonOrType;
    this.logAudit({
      userId,
      userName,
      action: 'تسوية مخزون',
      category: 'inventory',
      details: `${target.name}: تعديل بمقدار ${quantityDelta > 0 ? '+' : ''}${quantityDelta} ${target.unit} (${effectiveReason})`,
    });
  }

  public adjustProductStock(
    productId: string,
    quantityDelta: number,
    reasonOrType: string,
    reason?: string,
    userId = 'system',
    userName = 'النظام'
  ): void {
    const prods = this.getProducts({ includeArchived: true });
    const target = prods.find((p) => p.id === productId);
    if (!target) return;
    target.currentStock = Math.max(0, Number(((target.currentStock || 0) + quantityDelta).toFixed(2)));
    this.save(STORAGE_KEYS.PRODUCTS, prods);
    syncQueue.enqueue('update', 'products', productId, target);
    const effectiveReason = reason || reasonOrType;
    this.logAudit({
      userId,
      userName,
      action: 'تسوية مخزون منتج',
      category: 'inventory',
      details: `${target.nameAr}: تعديل بمقدار ${quantityDelta > 0 ? '+' : ''}${quantityDelta} (${effectiveReason})`,
    });
  }

  // --- Recipes ---
  public getRecipes(): Recipe[] {
    return this.load<Recipe[]>(STORAGE_KEYS.RECIPES, initialRecipes);
  }

  public saveRecipe(recipe: Recipe): void {
    const recipes = this.getRecipes();
    const idx = recipes.findIndex((r) => r.id === recipe.id || r.productId === recipe.productId);
    if (idx >= 0) {
      recipes[idx] = recipe;
    } else {
      recipes.push(recipe);
    }
    this.save(STORAGE_KEYS.RECIPES, recipes);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'recipes', recipe.productId, recipe);
  }

  public deleteRecipe(productId: string): void {
    const recipes = this.getRecipes().filter((r) => r.productId !== productId);
    this.save(STORAGE_KEYS.RECIPES, recipes);
    syncQueue.enqueue('delete', 'recipes', productId, { productId });
  }

  // --- Automatic Recipe Deduction ---
  public deductInventoryForOrder(order: Order): void {
    const recipes = this.getRecipes();
    const ings = this.getIngredients({ includeArchived: true });
    let deductionsCount = 0;

    order.items.forEach((item) => {
      const recipe = recipes.find((r) => r.productId === item.productId);
      if (!recipe) return;

      recipe.items.forEach((recItem) => {
        const targetIng = ings.find((i) => i.id === recItem.ingredientId);
        if (targetIng) {
          const totalDeduction = recItem.quantity * item.quantity;
          targetIng.currentStock = Math.max(0, Number((targetIng.currentStock - totalDeduction).toFixed(2)));
          deductionsCount++;
        }
      });
    });

    if (deductionsCount > 0) {
      this.save(STORAGE_KEYS.INGREDIENTS, ings);
      this.logAudit({
        userId: order.cashierId,
        userName: order.cashierName,
        action: 'خصم تلقائي للمخزون (وصفات)',
        category: 'inventory',
        details: `تم خصم مكونات الطلب ${order.orderNumber} تلقائياً من المستودع`,
      });
    }
  }

  // --- Tables ---
  public getTables(): RestaurantTable[] {
    return this.load<RestaurantTable[]>(STORAGE_KEYS.TABLES, initialTables);
  }

  public saveTable(table: RestaurantTable): void {
    const tables = this.getTables();
    const idx = tables.findIndex((t) => t.id === table.id);
    if (idx >= 0) {
      tables[idx] = table;
    } else {
      tables.push(table);
    }
    this.save(STORAGE_KEYS.TABLES, tables);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'tables', table.id, table);
  }

  public updateTableStatus(tableId: string, status: RestaurantTable['status'], currentOrderId?: string): void {
    const tables = this.getTables();
    const target = tables.find((t) => t.id === tableId);
    if (target) {
      target.status = status;
      target.currentOrderId = currentOrderId;
      if (status === 'occupied') {
        target.lastOccupiedAt = new Date().toISOString();
      }
      this.save(STORAGE_KEYS.TABLES, tables);
      syncQueue.enqueue('update', 'tables', tableId, target);
    }
  }

  public deleteTable(tableId: string): void {
    const tables = this.getTables().filter((t) => t.id !== tableId);
    this.save(STORAGE_KEYS.TABLES, tables);
    syncQueue.enqueue('delete', 'tables', tableId, { id: tableId });
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return this.load<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  }

  public saveCustomer(customer: Customer): Customer {
    const customers = this.getCustomers();
    const idx = customers.findIndex((c) => c.id === customer.id || (c.phone && c.phone === customer.phone));
    if (idx >= 0) {
      customers[idx] = { ...customers[idx], ...customer };
      this.save(STORAGE_KEYS.CUSTOMERS, customers);
      syncQueue.enqueue('update', 'customers', customers[idx].id, customers[idx]);
      return customers[idx];
    } else {
      customers.push(customer);
      this.save(STORAGE_KEYS.CUSTOMERS, customers);
      syncQueue.enqueue('create', 'customers', customer.id, customer);
      return customer;
    }
  }

  public deleteCustomer(customerId: string): void {
    const customers = this.getCustomers().filter((c) => c.id !== customerId);
    this.save(STORAGE_KEYS.CUSTOMERS, customers);
    syncQueue.enqueue('delete', 'customers', customerId, { id: customerId });
  }

  public recordCustomerOrder(customerId: string, orderTotal: number): void {
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      cust.ordersCount = (cust.ordersCount || 0) + 1;
      cust.totalSpent = Number(((cust.totalSpent || 0) + orderTotal).toFixed(2));
      this.save(STORAGE_KEYS.CUSTOMERS, customers);
      syncQueue.enqueue('update', 'customers', customerId, cust);
    }
  }

  // --- Suppliers ---
  public getSuppliers(): Supplier[] {
    return this.load<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  }

  public saveSupplier(supplier: Supplier, userId = 'admin', userName = 'المدير العام'): void {
    const sups = this.getSuppliers();
    const idx = sups.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) {
      sups[idx] = supplier;
    } else {
      sups.push(supplier);
    }
    this.save(STORAGE_KEYS.SUPPLIERS, sups);
    this.sqliteEngine.insertOrReplace('suppliers', supplier);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'suppliers', supplier.id, supplier);

    this.logAudit({
      userId,
      userName,
      action: idx >= 0 ? 'UPDATE_SUPPLIER' : 'CREATE_SUPPLIER',
      category: 'inventory',
      details: `${idx >= 0 ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}: [${supplier.name}] (${supplier.phone || ''})`,
    });
  }

  public deleteSupplier(supplierId: string, userId = 'admin', userName = 'المدير العام'): void {
    const sups = this.getSuppliers();
    const target = sups.find((s) => s.id === supplierId);
    const filtered = sups.filter((s) => s.id !== supplierId);
    this.save(STORAGE_KEYS.SUPPLIERS, filtered);
    this.sqliteEngine.delete('suppliers', supplierId);
    syncQueue.enqueue('delete', 'suppliers', supplierId, { id: supplierId, name: target?.name });

    if (target) {
      this.logAudit({
        userId,
        userName,
        action: 'DELETE_SUPPLIER',
        category: 'inventory',
        details: `حذف المورد: [${target.name}] (ID: ${supplierId})`,
      });
    }
  }

  // --- Orders ---
  public getOrders(): Order[] {
    return this.load<Order[]>(STORAGE_KEYS.ORDERS, initialOrders);
  }

  public createOrder(order: Order): Order {
    const orders = this.getOrders();
    orders.unshift(order);
    this.save(STORAGE_KEYS.ORDERS, orders);
    syncQueue.enqueue('create', 'orders', order.id, order);

    // If linked to a table, update table status
    if (order.tableId) {
      this.updateTableStatus(order.tableId, 'occupied', order.id);
    }

    // Auto deduct inventory via recipes
    this.deductInventoryForOrder(order);

    // Update customer stats if linked
    if (order.customerId) {
      this.recordCustomerOrder(order.customerId, order.total);
    }

    // Update active shift sales
    this.addSalesToActiveShift(order);

    // Log audit
    this.logAudit({
      userId: order.cashierId,
      userName: order.cashierName,
      action: 'إنشاء طلب جديد',
      category: 'order',
      details: `طلب رقم ${order.orderNumber} - إجمالي ${order.total} ج.م (${order.type})`,
    });

    return order;
  }

  public updateOrderStatus(orderId: string, status: Order['status'], userId = 'kitchen', userName = 'المطبخ'): void {
    const orders = this.getOrders();
    const target = orders.find((o) => o.id === orderId);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
      if (status === 'preparing' && !target.prepStartedAt) {
        target.prepStartedAt = new Date().toISOString();
      }
      if (status === 'completed') {
        target.completedAt = new Date().toISOString();
        if (target.tableId) {
          this.updateTableStatus(target.tableId, 'cleaning', undefined);
        }
      }
      this.save(STORAGE_KEYS.ORDERS, orders);
      syncQueue.enqueue('update', 'orders', orderId, target);
      this.logAudit({
        userId,
        userName,
        action: 'تحديث حالة الطلب',
        category: 'order',
        details: `الطلب ${target.orderNumber} أصبح ${status}`,
      });
    }
  }

  public deleteOrder(orderId: string, adminId = 'admin', adminName = 'المدير العام'): void {
    const orders = this.getOrders();
    const target = orders.find((o) => o.id === orderId);
    const filtered = orders.filter((o) => o.id !== orderId);
    this.save(STORAGE_KEYS.ORDERS, filtered);
    syncQueue.enqueue('delete', 'orders', orderId, { id: orderId });

    if (target?.tableId) {
      this.updateTableStatus(target.tableId, 'available', undefined);
    }

    this.logAudit({
      userId: adminId,
      userName: adminName,
      action: 'حذف طلب نهائياً',
      category: 'order',
      details: target ? `تم حذف الطلب رقم ${target.orderNumber} (بقيمة ${target.total} ج.م) نهائياً` : `حذف الطلب ${orderId}`,
    });
  }

  // --- Held Orders (تعليق الطلبات) ---
  public getHeldOrders(): HeldOrder[] {
    return this.load<HeldOrder[]>(STORAGE_KEYS.HELD_ORDERS, []);
  }

  public saveHeldOrder(heldOrder: HeldOrder): void {
    const list = this.getHeldOrders();
    const existingIdx = list.findIndex((h) => h.id === heldOrder.id);
    if (existingIdx >= 0) {
      list[existingIdx] = heldOrder;
    } else {
      list.unshift(heldOrder);
    }
    this.save(STORAGE_KEYS.HELD_ORDERS, list);
  }

  public removeHeldOrder(id: string): void {
    const list = this.getHeldOrders().filter((h) => h.id !== id);
    this.save(STORAGE_KEYS.HELD_ORDERS, list);
  }

  public clearAllHeldOrders(): void {
    this.save(STORAGE_KEYS.HELD_ORDERS, []);
  }

  // --- Purchases ---
  public getPurchases(): PurchaseOrder[] {
    return this.load<PurchaseOrder[]>(STORAGE_KEYS.PURCHASES, []);
  }

  public getPurchaseOrders(): PurchaseOrder[] {
    return this.getPurchases();
  }

  public createPurchase(po: any, userId = 'admin', userName = 'المدير'): void {
    const purchases = this.getPurchases();
    const normalized: PurchaseOrder = {
      id: po.id || `po-${Date.now()}`,
      orderNumber: po.orderNumber || `PO-${Date.now()}`,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      branchId: po.branchId,
      items: po.items.map((i: any) => ({
        ingredientId: i.ingredientId,
        ingredientName: i.ingredientName,
        quantity: i.quantity,
        unitCost: i.unitCost || i.unitPrice || 0,
        total: i.total || i.quantity * (i.unitCost || i.unitPrice || 0),
      })),
      total: po.total || po.totalAmount || 0,
      totalAmount: po.totalAmount || po.total || 0,
      paymentStatus: po.paymentStatus || 'paid',
      paidAmount: po.paidAmount || po.total || 0,
      notes: po.notes,
      createdAt: po.createdAt || new Date().toISOString(),
      status: po.status || 'received',
    };

    purchases.unshift(normalized);
    this.save(STORAGE_KEYS.PURCHASES, purchases);
    syncQueue.enqueue('create', 'purchases', normalized.id, normalized);

    // Restock ingredients
    const ings = this.getIngredients({ includeArchived: true });
    normalized.items.forEach((item) => {
      const ing = ings.find((i) => i.id === item.ingredientId);
      if (ing) {
        ing.currentStock = Number((ing.currentStock + item.quantity).toFixed(2));
        if (item.unitCost) ing.costPerUnit = item.unitCost;
      }
    });
    this.save(STORAGE_KEYS.INGREDIENTS, ings);

    this.logAudit({
      userId,
      userName,
      action: 'فاتورة شراء وتوريد',
      category: 'inventory',
      details: `فاتورة شراء ${normalized.orderNumber} من المورد ${normalized.supplierName} بإجمالي ${normalized.total} ج.م`,
    });
  }

  public createPurchaseOrder(po: any, userId = 'admin', userName = 'المدير'): void {
    this.createPurchase(po, userId, userName);
  }

  public deletePurchaseOrder(id: string): void {
    const purchases = this.getPurchases().filter((p) => p.id !== id);
    this.save(STORAGE_KEYS.PURCHASES, purchases);
    syncQueue.enqueue('delete', 'purchases', id, { id });
  }

  public deletePurchase(id: string): void {
    this.deletePurchaseOrder(id);
  }

  // --- Expenses ---
  public getExpenses(): Expense[] {
    return this.load<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
  }

  public saveExpense(expense: Expense): void {
    const exps = this.getExpenses();
    const idx = exps.findIndex((e) => e.id === expense.id);
    if (idx >= 0) {
      exps[idx] = expense;
    } else {
      exps.unshift(expense);
    }
    this.save(STORAGE_KEYS.EXPENSES, exps);
    syncQueue.enqueue(idx >= 0 ? 'update' : 'create', 'expenses', expense.id, expense);
  }

  public deleteExpense(expenseId: string): void {
    const exps = this.getExpenses().filter((e) => e.id !== expenseId);
    this.save(STORAGE_KEYS.EXPENSES, exps);
    syncQueue.enqueue('delete', 'expenses', expenseId, { id: expenseId });
  }

  public recordExpense(expense: any): void {
    const exps = this.getExpenses();
    const normalized: Expense = {
      id: expense.id || `exp-${Date.now()}`,
      title: expense.title || expense.category,
      category: expense.category,
      amount: expense.amount,
      branchId: expense.branchId || 'branch-1',
      branchName: expense.branchName || 'الفرع الرئيسي',
      userId: expense.userId || 'admin',
      userName: expense.userName || 'الكاشير',
      paidTo: expense.paidTo || expense.title || 'مصروف عام',
      paidFromDrawer: expense.paidFromDrawer !== false,
      notes: expense.notes,
      recordedBy: expense.userName || expense.recordedBy || 'المسؤول',
      createdAt: expense.createdAt || new Date().toISOString(),
    };

    exps.unshift(normalized);
    this.save(STORAGE_KEYS.EXPENSES, exps);
    syncQueue.enqueue('create', 'expenses', normalized.id, normalized);

    // Deduct from active shift if recorded during shift and paidFromDrawer is true
    const shift = this.getActiveShift();
    if (shift && shift.status === 'open' && normalized.paidFromDrawer) {
      shift.expenses = Number((shift.expenses + normalized.amount).toFixed(2));
      shift.expectedCash = Number((shift.startingCash + shift.cashSales - shift.expenses).toFixed(2));
      this.saveActiveShift(shift);
    }

    this.logAudit({
      userId: normalized.userId || 'system',
      userName: normalized.userName || 'النظام',
      action: 'تسجيل مصروف',
      category: 'expense',
      details: `بند: ${normalized.category} (${normalized.title}) - مبلغ: ${normalized.amount} ج.م`,
    });
  }

  // --- Shifts ---
  public getActiveShift(): Shift | null {
    return this.load<Shift | null>(STORAGE_KEYS.SHIFTS, initialActiveShift);
  }

  public getShifts(): Shift[] {
    const active = this.getActiveShift();
    const history = this.load<Shift[]>('elbasha_shifts_history', []);
    if (active) {
      return [active, ...history.filter((s) => s.id !== active.id)];
    }
    return history;
  }

  public saveActiveShift(shift: Shift): void {
    this.save(STORAGE_KEYS.SHIFTS, shift);
  }

  public openShift(shiftData: Omit<Shift, 'id' | 'cashSales' | 'cardSales' | 'otherSales' | 'expenses' | 'expectedCash' | 'status'>): Shift {
    const newShift: Shift = {
      ...shiftData,
      id: `shift-${Date.now()}`,
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      expenses: 0,
      expectedCash: shiftData.startingCash,
      status: 'open',
    };
    this.saveActiveShift(newShift);
    this.logAudit({
      userId: newShift.userId,
      userName: newShift.userName,
      action: 'فتح وردية جديدة',
      category: 'shift',
      details: `عهدة افتتاحية: ${newShift.startingCash} ج.م`,
    });
    return newShift;
  }

  public closeShift(actualCash: number, notes?: string): Shift | null {
    const shift = this.getActiveShift();
    if (!shift) return null;
    shift.status = 'closed';
    shift.endTime = new Date().toISOString();
    shift.closedAt = shift.endTime;
    shift.actualCash = actualCash;
    shift.cashDifference = Number((actualCash - shift.expectedCash).toFixed(2));
    shift.difference = shift.cashDifference;
    shift.notes = notes || shift.notes;
    this.saveActiveShift(shift);

    // Save to history so it shows up in closed shifts table
    const history = this.load<Shift[]>('elbasha_shifts_history', []);
    const existingIdx = history.findIndex((s) => s.id === shift.id);
    if (existingIdx >= 0) {
      history[existingIdx] = { ...shift };
    } else {
      history.unshift({ ...shift });
    }
    this.save('elbasha_shifts_history', history);

    this.logAudit({
      userId: shift.userId,
      userName: shift.userName,
      action: 'إغلاق الوردية والتقفيل',
      category: 'shift',
      details: `نقد متوقع: ${shift.expectedCash} ج.م | نقد فعلي: ${actualCash} ج.م | فرق: ${shift.cashDifference} ج.م`,
    });
    return shift;
  }

  private addSalesToActiveShift(order: Order): void {
    const shift = this.getActiveShift();
    if (!shift || shift.status !== 'open') return;

    order.payments.forEach((p) => {
      if (p.method === 'cash') {
        shift.cashSales = Number((shift.cashSales + p.amount).toFixed(2));
      } else if (p.method === 'card') {
        shift.cardSales = Number((shift.cardSales + p.amount).toFixed(2));
      } else {
        shift.otherSales = Number((shift.otherSales + p.amount).toFixed(2));
      }
    });

    shift.ordersCount = (shift.ordersCount || 0) + 1;
    shift.totalSales = Number(((shift.totalSales || 0) + order.total).toFixed(2));
    shift.expectedCash = Number((shift.startingCash + shift.cashSales - shift.expenses).toFixed(2));
    this.saveActiveShift(shift);
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return this.load<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const item: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(item);
    // Keep last 500 logs
    if (logs.length > 500) logs.pop();
    this.save(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- Full Backup & Restore ---
  public exportFullBackup(): string {
    const dump = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      profile: this.getProfile(),
      branches: this.getBranches(),
      users: this.getUsers(),
      categories: this.getCategories(),
      products: this.getProducts(),
      modifiers: this.getModifierGroups(),
      ingredients: this.getIngredients(),
      recipes: this.getRecipes(),
      tables: this.getTables(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      orders: this.getOrders(),
      purchases: this.getPurchases(),
      expenses: this.getExpenses(),
      shift: this.getActiveShift(),
      auditLogs: this.getAuditLogs(),
    };
    this.recordBackupSuccess('export');
    return JSON.stringify(dump, null, 2);
  }

  public getLastBackupTimestamp(): string | null {
    try {
      const ts = localStorage.getItem('basha_pos_last_backup_timestamp');
      if (ts) return ts;
      const historyStr = localStorage.getItem('basha_pos_backup_history_records');
      if (historyStr) {
        const history = JSON.parse(historyStr);
        if (Array.isArray(history) && history.length > 0 && history[0].timestamp) {
          return history[0].timestamp;
        }
      }
    } catch (e) {
      console.warn('Error reading last backup timestamp:', e);
    }
    return null;
  }

  public recordBackupSuccess(type: string = 'local', filename?: string): void {
    const now = new Date().toISOString();
    try {
      localStorage.setItem('basha_pos_last_backup_timestamp', now);
    } catch (e) {
      console.warn('Error storing last backup timestamp:', e);
    }
    this.notify();
  }

  public isBackupOverdue(thresholdHours = 24): boolean {
    const last = this.getLastBackupTimestamp();
    if (!last) return true; // Never backed up
    const diffMs = Date.now() - new Date(last).getTime();
    return diffMs > thresholdHours * 60 * 60 * 1000;
  }

  public importBackup(jsonString: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (data.profile) this.save(STORAGE_KEYS.PROFILE, data.profile);
      if (data.branches) this.save(STORAGE_KEYS.BRANCHES, data.branches);
      if (data.users) this.save(STORAGE_KEYS.USERS, data.users);
      if (data.categories) this.save(STORAGE_KEYS.CATEGORIES, data.categories);
      if (data.products) this.save(STORAGE_KEYS.PRODUCTS, data.products);
      if (data.modifiers) this.save(STORAGE_KEYS.MODIFIERS, data.modifiers);
      if (data.ingredients) this.save(STORAGE_KEYS.INGREDIENTS, data.ingredients);
      if (data.recipes) this.save(STORAGE_KEYS.RECIPES, data.recipes);
      if (data.tables) this.save(STORAGE_KEYS.TABLES, data.tables);
      if (data.customers) this.save(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.suppliers) this.save(STORAGE_KEYS.SUPPLIERS, data.suppliers);
      if (data.orders) this.save(STORAGE_KEYS.ORDERS, data.orders);
      if (data.purchases) this.save(STORAGE_KEYS.PURCHASES, data.purchases);
      if (data.expenses) this.save(STORAGE_KEYS.EXPENSES, data.expenses);
      if (data.shift) this.save(STORAGE_KEYS.SHIFTS, data.shift);
      if (data.auditLogs) this.save(STORAGE_KEYS.AUDIT_LOGS, data.auditLogs);

      this.logAudit({
        userId: 'admin',
        userName: 'المدير العام',
        action: 'استعادة نسخة احتياطية',
        category: 'settings',
        details: 'تم استعادة قاعدة البيانات بالكامل بنجاح',
      });
      return { success: true };
    } catch (e: any) {
      console.error('Error importing backup:', e);
      return { success: false, error: e?.message || 'تنسيق الملف غير صالح' };
    }
  }

  /**
   * مسح وتصفير شامل لكل البيانات التجريبية
   * يحذف جميع الطلبات والمبيعات والمصروفات والمشتريات والعملاء والموردين والمنيو والمخزون والطاولات
   * ويبقي فقط على حساب المدير الرئيسي النشط وإعدادات المطعم والفرع الأساسي للبدء الفعلي
   */
  public wipeAllDemoData(options?: { keepMenu?: boolean; keepAdminUser?: boolean }): void {
    const keepMenu = options?.keepMenu ?? false;
    const keepAdminUser = options?.keepAdminUser ?? true;

    // 1. مسح جميع العمليات والحركات المالية
    this.save(STORAGE_KEYS.ORDERS, []);
    this.save(STORAGE_KEYS.HELD_ORDERS, []);
    this.save(STORAGE_KEYS.PURCHASES, []);
    this.save(STORAGE_KEYS.EXPENSES, []);

    // 2. تصفير الوردية الحالية وبدء وردية نظيفة برصيد 0
    const cleanShift: Shift = {
      id: `shift-${Date.now()}`,
      shiftNumber: '1',
      userId: 'usr-1',
      userName: 'أحمد الإداري (مدير النظام)',
      cashierId: 'usr-1',
      cashierName: 'أحمد الإداري (مدير النظام)',
      branchId: 'branch-1',
      branchName: 'الفرع الرئيسي',
      startTime: new Date().toISOString(),
      openedAt: new Date().toISOString(),
      startingCash: 0,
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      totalSales: 0,
      ordersCount: 0,
      expenses: 0,
      expectedCash: 0,
      status: 'open',
    };
    this.save(STORAGE_KEYS.SHIFTS, cleanShift);
    this.save('elbasha_shifts_history', []);

    // 3. مسح العملاء والموردين
    this.save(STORAGE_KEYS.CUSTOMERS, []);
    this.save(STORAGE_KEYS.SUPPLIERS, []);

    // 4. مسح أو الإبقاء على قائمة الطعام والمخزون والطاولات
    if (!keepMenu) {
      this.save(STORAGE_KEYS.PRODUCTS, []);
      this.save(STORAGE_KEYS.CATEGORIES, []);
      this.save(STORAGE_KEYS.MODIFIERS, []);
      this.save(STORAGE_KEYS.INGREDIENTS, []);
      this.save(STORAGE_KEYS.RECIPES, []);
      this.save(STORAGE_KEYS.TABLES, []);
    } else {
      const tables = this.getTables().map((t) => ({ ...t, status: 'available' as const, currentOrderId: undefined }));
      this.save(STORAGE_KEYS.TABLES, tables);
    }

    // 5. الإبقاء على حسابات المديرين فقط
    if (keepAdminUser) {
      const users = this.getUsers();
      const adminUsers = users.filter((u) => u.role === 'admin');
      if (adminUsers.length > 0) {
        this.save(STORAGE_KEYS.USERS, adminUsers);
      } else {
        this.save(STORAGE_KEYS.USERS, [initialUsers[0]]);
      }
    }

    // 6. تسجيل قيد تدقيق افتتاحي للتشغيل الفعلي
    const inauguralAudit: AuditLog[] = [
      {
        id: `audit-${Date.now()}`,
        userId: 'admin',
        userName: 'المدير العام',
        action: 'تصفير شامل للبيانات التجريبية',
        category: 'system',
        details: 'تم مسح وتصفير كافة البيانات التجريبية بنجاح للبدء في التشغيل الفعلي للمطعم',
        timestamp: new Date().toISOString(),
      },
    ];
    this.save(STORAGE_KEYS.AUDIT_LOGS, inauguralAudit);

    this.notify();
  }

  /**
   * مسح حركات البيع والعمليات التجريبية فقط (Orders, Expenses, Shifts)
   * مع الإبقاء الكامل على المنيو والتصنيفات والمخزون والطاولات والعملاء
   */
  public wipeDemoTransactionsOnly(adminId = 'admin', adminName = 'المدير العام'): void {
    this.save(STORAGE_KEYS.ORDERS, []);
    this.save(STORAGE_KEYS.HELD_ORDERS, []);
    this.save(STORAGE_KEYS.PURCHASES, []);
    this.save(STORAGE_KEYS.EXPENSES, []);

    // تصفير إحصائيات مشتريات العملاء
    const customers = this.getCustomers().map((c) => ({
      ...c,
      ordersCount: 0,
      totalSpent: 0,
    }));
    this.save(STORAGE_KEYS.CUSTOMERS, customers);

    // تحرير كافة الطاولات وتجهيزها
    const tables = this.getTables().map((t) => ({
      ...t,
      status: 'available' as const,
      currentOrderId: undefined,
    }));
    this.save(STORAGE_KEYS.TABLES, tables);

    // تصفير الوردية الحالية
    const currentShift = this.getActiveShift();
    const cleanShift: Shift = {
      id: `shift-${Date.now()}`,
      shiftNumber: '1',
      userId: currentShift?.userId || currentShift?.cashierId || adminId,
      userName: currentShift?.userName || currentShift?.cashierName || adminName,
      cashierId: currentShift?.cashierId || currentShift?.userId || adminId,
      cashierName: currentShift?.cashierName || currentShift?.userName || adminName,
      branchId: currentShift?.branchId || 'branch-1',
      branchName: currentShift?.branchName || 'الفرع الرئيسي',
      startTime: new Date().toISOString(),
      openedAt: new Date().toISOString(),
      startingCash: 0,
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      totalSales: 0,
      ordersCount: 0,
      expenses: 0,
      expectedCash: 0,
      status: 'open',
    };
    this.save(STORAGE_KEYS.SHIFTS, cleanShift);
    this.save('elbasha_shifts_history', []);

    this.logAudit({
      userId: adminId,
      userName: adminName,
      action: 'تصفير مبيعات وفواتير التجربة',
      category: 'system',
      details: 'تم مسح كافة الفواتير والطلبات والمصروفات التجريبية وتصفير الوردية مع الاحتفاظ بقائمة المنيو والطاولات',
    });

    this.notify();
  }

  // --- تصفير مخصص حسب القطاع ---
  public clearAllOrders(): void {
    this.save(STORAGE_KEYS.ORDERS, []);
    this.save(STORAGE_KEYS.HELD_ORDERS, []);
    const tables = this.getTables().map((t) => ({ ...t, status: 'available' as const, currentOrderId: undefined }));
    this.save(STORAGE_KEYS.TABLES, tables);
    this.notify();
  }

  public clearAllExpenses(): void {
    this.save(STORAGE_KEYS.EXPENSES, []);
    this.notify();
  }

  public clearAllPurchases(): void {
    this.save(STORAGE_KEYS.PURCHASES, []);
    this.notify();
  }

  public clearAllCustomers(): void {
    this.save(STORAGE_KEYS.CUSTOMERS, []);
    this.notify();
  }

  public clearAllSuppliers(): void {
    this.save(STORAGE_KEYS.SUPPLIERS, []);
    this.notify();
  }

  public clearAllMenu(): void {
    this.save(STORAGE_KEYS.PRODUCTS, []);
    this.save(STORAGE_KEYS.CATEGORIES, []);
    this.save(STORAGE_KEYS.MODIFIERS, []);
    this.save(STORAGE_KEYS.RECIPES, []);
    this.save(STORAGE_KEYS.INGREDIENTS, []);
    this.notify();
  }

  public clearAllTables(): void {
    this.save(STORAGE_KEYS.TABLES, []);
    this.notify();
  }

  public getDatabaseStats() {
    return {
      ordersCount: this.getOrders().length,
      productsCount: this.getProducts().length,
      categoriesCount: this.getCategories().length,
      ingredientsCount: this.getIngredients().length,
      customersCount: this.getCustomers().length,
      suppliersCount: this.getSuppliers().length,
      expensesCount: this.getExpenses().length,
      purchasesCount: this.getPurchases().length,
      tablesCount: this.getTables().length,
      usersCount: this.getUsers().length,
    };
  }

  public resetToCleanState(): void {
    this.save(STORAGE_KEYS.PROFILE, initialProfile);
    this.save(STORAGE_KEYS.BRANCHES, initialBranches);
    this.save(STORAGE_KEYS.USERS, initialUsers);
    this.save(STORAGE_KEYS.CATEGORIES, []);
    this.save(STORAGE_KEYS.PRODUCTS, []);
    this.save(STORAGE_KEYS.MODIFIERS, []);
    this.save(STORAGE_KEYS.INGREDIENTS, []);
    this.save(STORAGE_KEYS.RECIPES, []);
    this.save(STORAGE_KEYS.TABLES, []);
    this.save(STORAGE_KEYS.CUSTOMERS, []);
    this.save(STORAGE_KEYS.SUPPLIERS, []);
    this.save(STORAGE_KEYS.ORDERS, []);
    this.save(STORAGE_KEYS.PURCHASES, []);
    this.save(STORAGE_KEYS.EXPENSES, []);
    this.save(STORAGE_KEYS.SHIFTS, null);
    this.save(STORAGE_KEYS.SHIFTS_HISTORY, []);
    this.save(STORAGE_KEYS.AUDIT_LOGS, []);
    this.save(STORAGE_KEYS.HELD_ORDERS, []);

    this.sqliteEngine.clearTable('orders');
    this.sqliteEngine.clearTable('held_orders');
    this.sqliteEngine.clearTable('products');
    this.sqliteEngine.clearTable('categories');
    this.sqliteEngine.clearTable('modifier_groups');
    this.sqliteEngine.clearTable('recipes');
    this.sqliteEngine.clearTable('ingredients');
    this.sqliteEngine.clearTable('restaurant_tables');
    this.sqliteEngine.clearTable('customers');
    this.sqliteEngine.clearTable('suppliers');
    this.sqliteEngine.clearTable('purchase_orders');
    this.sqliteEngine.clearTable('expenses');
    this.sqliteEngine.clearTable('shifts');
    this.sqliteEngine.clearTable('shifts_history');
    this.sqliteEngine.clearTable('audit_logs');
    this.sqliteEngine.clearTable('branches');
    this.sqliteEngine.clearTable('users');
    this.sqliteEngine.bulkInsertOrReplace('branches', initialBranches);
    this.sqliteEngine.bulkInsertOrReplace('users', initialUsers);

    this.notify();
  }

  public resetToDefaultDemo(): void {
    this.resetToCleanState();
  }
}

export const posDb = new POSDatabase();

export { bashaSqlite, ensureBashaLocalAppDataSQLitePath };
export type { SQLitePathStatus } from './sqlite/bashaSqliteEngine';
