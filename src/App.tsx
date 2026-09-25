import React, { useState, useEffect } from 'react';
import { BrandProvider, useBrand } from './context/BrandContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { POSProvider, usePOS } from './context/POSContext';
import { ShiftProvider, useShift } from './context/ShiftContext';
import { ToastProvider } from './context/ToastContext';

// Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ReceiptModal } from './components/common/ReceiptModal';
import { ShiftModal } from './components/common/ShiftModal';
import { OfflineBanner } from './components/common/OfflineBanner';

// Views
import { POSView } from './components/pos/POSView';
import { KDSView } from './components/kitchen/KDSView';
import { OrdersView } from './components/orders/OrdersView';
import { TableManagement } from './components/tables/TableManagement';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/catalog/ProductsView';
import { CategoriesView } from './components/catalog/CategoriesView';
import { InventoryView } from './components/inventory/InventoryView';
import { RecipesView } from './components/inventory/RecipesView';
import { PurchasesView } from './components/inventory/PurchasesView';
import { CustomersView } from './components/customers/CustomersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { ShiftsView } from './components/shifts/ShiftsView';
import { BranchesView } from './components/branches/BranchesView';
import { UsersView } from './components/users/UsersView';
import { SettingsView } from './components/settings/SettingsView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { LoginScreen } from './components/common/LoginScreen';
import { FirstRunWizard } from './components/common/FirstRunWizard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { automatedBackupService } from './services/automatedBackupService';

const MainLayout: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const { profile } = useBrand();
  const {
    lastCompletedOrder,
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    openCashDrawer,
    posToast,
    clearCart,
  } = usePOS();
  const { setIsShiftModalOpen } = useShift();

  const [showWizard, setShowWizard] = useState<boolean>(() => !profile?.setupCompleted);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (currentUser?.role === 'kitchen') return 'kitchen';
    return 'pos';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // If user role switches and current tab is not allowed, route to suitable tab
  useEffect(() => {
    if (currentUser?.role === 'kitchen' && activeTab !== 'kitchen' && activeTab !== 'orders') {
      setActiveTab('kitchen');
    }
  }, [currentUser?.role, activeTab]);

  // Global Keyboard Shortcuts for professional cashier speed (Must run unconditionally at the top)
  useEffect(() => {
    if (!isAuthenticated || !currentUser || showWizard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('kitchen');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('tables');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsShiftModalOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        openCashDrawer();
      } else if (e.key === 'F5' && activeTab !== 'pos') {
        e.preventDefault();
        setActiveTab('pos');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, currentUser, showWizard, setIsShiftModalOpen, openCashDrawer, activeTab]);

  // If setup not completed, show wizard
  if (showWizard) {
    return <FirstRunWizard onComplete={() => setShowWizard(false)} />;
  }

  // If unauthenticated or no current user, immediately and cleanly render LoginScreen
  if (!isAuthenticated || !currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          clearCart();
          setIsReceiptModalOpen(false);
          setIsShiftModalOpen(false);
          setActiveTab('pos');
        }}
        onOpenWizard={() => setShowWizard(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#231610] flex flex-col font-sans select-none antialiased" dir="rtl">
      {/* Offline Mode Banner */}
      <OfflineBanner />

      {/* Top Application Header */}
      <Header
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Workspace: Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* View Container */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'pos' && <POSView />}
          {activeTab === 'kitchen' && <KDSView />}
          {activeTab === 'orders' && <OrdersView />}
          {activeTab === 'tables' && (
            <TableManagement onNavigateToPOS={() => setActiveTab('pos')} />
          )}
          {activeTab === 'dashboard' && (
            <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'categories' && <CategoriesView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'recipes' && <RecipesView />}
          {activeTab === 'purchases' && <PurchasesView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'expenses' && <ExpensesView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'shifts' && <ShiftsView />}
          {activeTab === 'branches' && <BranchesView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'audit' && <AuditLogsView />}
        </main>
      </div>

      {/* Global Modals */}
      <ReceiptModal
        order={lastCompletedOrder}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      <ShiftModal />

      {/* Cashier Operation Notification Toast */}
      {posToast && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200 pointer-events-none">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold ${
              posToast.type === 'success'
                ? 'bg-[#153423] text-emerald-100 border-emerald-500/50'
                : posToast.type === 'warning'
                ? 'bg-[#431B05] text-amber-100 border-amber-500/50'
                : 'bg-[#231610] text-[#F5EFE6] border-[#6F4E37]'
            }`}
          >
            <span
              className={`relative flex h-2.5 w-2.5 ${
                posToast.type === 'success'
                  ? 'bg-emerald-400'
                  : posToast.type === 'warning'
                  ? 'bg-amber-400'
                  : 'bg-blue-400'
              } rounded-full`}
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
            </span>
            <span className="tracking-wide">{posToast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrandProvider>
          <AuthProvider>
            <POSProvider>
              <ShiftProvider>
                <MainLayout />
              </ShiftProvider>
            </POSProvider>
          </AuthProvider>
        </BrandProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
