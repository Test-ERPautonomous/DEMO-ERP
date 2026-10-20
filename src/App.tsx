import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GarageProvider, useGarage } from './context/GarageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { RegisterPage } from './components/Auth/RegisterPage';
import { ForgotPasswordPage } from './components/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/Auth/ResetPasswordPage';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LandingPage } from './components/Public/LandingPage';
import { updateDocumentDirection } from './i18n';
import { UserManager } from './components/Admin/UserManager';
import { UserNavDropdown } from './components/Auth/UserNavDropdown';
import { GarageDashboard } from './components/Dashboard/GarageDashboard';
import { JobCardList } from './components/JobCards/JobCardList';
import { JobsView } from './components/JobCards/JobsView';
import { JobCardModal } from './components/JobCards/JobCardModal';
import { InventoryManager } from './components/Inventory/InventoryManager';
import { PartsAndStockView } from './components/Inventory/PartsAndStockView';
import { PurchaseSalesManager } from './components/PurchaseSales/PurchaseSalesManager';
import { ServiceHistoryView } from './components/ServiceHistory/ServiceHistoryView';
import { BillingManager } from './components/Billing/BillingManager';
import { BillingView } from './components/Billing/BillingView';
import { FinancialModule } from './components/Financial/FinancialModule';
import { GarageSettingsView } from './components/Settings/GarageSettingsView';
import { MastersWindow } from './components/Masters/MastersWindow';
import { LaborWindow } from './components/Labor/LaborWindow';
import { ReportsWindow } from './components/Reports/ReportsWindow';
import { ControlPanelWindow } from './components/Settings/ControlPanelWindow';
import { UtilitiesWindow } from './components/Utilities/UtilitiesWindow';
import { WorkshopSidebar } from './components/Navigation/WorkshopSidebar';
import { WorkshopHeader } from './components/Navigation/WorkshopHeader';
import { MaterialIssueModal } from './components/Modals/MaterialIssueModal';
import { IssueReturnModal } from './components/Modals/IssueReturnModal';
import { StockTakeSheetModal } from './components/Modals/StockTakeSheetModal';
import { StockAdjustmentModal } from './components/Modals/StockAdjustmentModal';
import { CashReceiptModal } from './components/Modals/CashReceiptModal';
import { EstimationModal } from './components/Modals/EstimationModal';
import { DeliveryScheduleModal } from './components/Modals/DeliveryScheduleModal';
import { LaborClockInOutModal } from './components/Modals/LaborClockInOutModal';
import { PdcManagementModal } from './components/Modals/PdcManagementModal';
import { GeneralJournalModal } from './components/Modals/GeneralJournalModal';
import { GoodsReceiptNoteModal } from './components/Modals/GoodsReceiptNoteModal';
import { BillsRegistrationModal } from './components/Modals/BillsRegistrationModal';
import { AdvancesModal } from './components/Modals/AdvancesModal';
import { OpeningBalanceModal } from './components/Modals/OpeningBalanceModal';
import { AboutUniqonModal } from './components/Modals/AboutUniqonModal';
import { CompanyManagerModal } from './components/Modals/CompanyManagerModal';
import { InvoiceModal } from './components/Billing/InvoiceModal';
import { CounterSaleRecordModal } from './components/PurchaseSales/CounterSaleRecordModal';
import { EasyGuideModal } from './components/Modals/EasyGuideModal';
import { CommandPaletteModal } from './components/Modals/CommandPaletteModal';
import { KeyboardCheatSheetModal } from './components/Modals/KeyboardCheatSheetModal';
import { SupabaseDiagnosticModal } from './components/Diagnostic/SupabaseDiagnosticModal';
import { getShortcuts, matchesKeyEvent } from './services/shortcutService';
import { ToastProvider } from './components/Common/Toast';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { JobCard, JobStatus, UserPermissions } from './types';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Package, 
  Truck, 
  History, 
  Receipt, 
  Settings, 
  Wrench, 
  Paintbrush, 
  Plus, 
  AlertTriangle,
  Database,
  Menu,
  X,
  Car,
  Users,
  Lock,
  ShieldCheck,
  Search,
  FileText,
  Globe,
  RefreshCw
} from 'lucide-react';

export type TabKey = 
  | 'dashboard' 
  | 'jobs'
  | 'customers'
  | 'inventory'
  | 'parts_stock'
  | 'billing'
  | 'reports' 
  | 'settings'
  | 'work_orders'
  | 'customers_vehicles'
  | 'purchasing'
  | 'technicians_bays'
  | 'invoices_payments'
  | 'financial'
  | 'financials'
  | 'masters' 
  | 'operations' 
  | 'labor' 
  | 'purchases' 
  | 'control_panel' 
  | 'utilities'
  | 'history' 
  | 'users';

const AppContent: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const { currentUser, isAuthenticated, hasPermission, isAdmin, logout, userRole } = useAuth();
  const { t, i18n } = useTranslation();
  const {
    settings,
    updateSettings,
    jobCards,
    createJobCard,
    updateJobCard,
    deleteJobCard,
    advanceJobCardStatus,
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock,
    issueMaterialToJobCard,
    returnMaterialFromJobCard,
    purchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    counterSales,
    createCounterSale,
    invoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    generateInvoiceFromJobCard,
    recordPayment,
    lowStockItemsCount,
    vehiclesInShopCount,
    getVehicleHistory,
    resetToDefaults,
    activeCompany,
    activeCompanyId,
    backendStatus,
    backendError,
    backendStatusCode,
    envConfigError,
    missingEnvVars,
    retryBackendConnection,
    companies,
    customers,
    switchCompany,
    createCompany,
    resetCompanyData,
  } = useGarage();

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [quickPlateInput, setQuickPlateInput] = useState('');
  const [mastersSubTab, setMastersSubTab] = useState<string>('customers');
  const [isCompanyManagerOpen, setIsCompanyManagerOpen] = useState(false);

  // Active module filter propagation from Dashboard
  const [jobCardFilter, setJobCardFilter] = useState<string>('ALL');
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState<boolean>(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'Paid' | 'Partial' | 'Unpaid'>('ALL');

  // Job card modal states
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobCard, setEditingJobCard] = useState<JobCard | null>(null);

  // Operational & Accounting Modals
  const [isMaterialIssueOpen, setIsMaterialIssueOpen] = useState(false);
  const [isIssueReturnOpen, setIsIssueReturnOpen] = useState(false);
  const [isStockTakeOpen, setIsStockTakeOpen] = useState(false);
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [isCashReceiptOpen, setIsCashReceiptOpen] = useState(false);
  const [isEstimationOpen, setIsEstimationOpen] = useState(false);
  const [isDeliveryScheduleOpen, setIsDeliveryScheduleOpen] = useState(false);
  const [isLaborClockOpen, setIsLaborClockOpen] = useState(false);
  const [isPdcOpen, setIsPdcOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isGrnOpen, setIsGrnOpen] = useState(false);
  const [isBillsRegistrationOpen, setIsBillsRegistrationOpen] = useState(false);
  const [advancesModalConfig, setAdvancesModalConfig] = useState<{
    isOpen: boolean;
    mode: 'customer_advance' | 'advance_return' | 'supplier_advance' | 'supplier_payment';
  }>({
    isOpen: false,
    mode: 'customer_advance',
  });
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false);
  const [isAboutUniqonOpen, setIsAboutUniqonOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEasyGuideOpen, setIsEasyGuideOpen] = useState(false);
  const [isCounterSaleModalOpen, setIsCounterSaleModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedReportKey, setSelectedReportKey] = useState<string>('operational');
  const [purchasesSubTab, setPurchasesSubTab] = useState<'purchases' | 'grn' | 'sales' | 'suppliers' | 'returns'>('purchases');
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [cheatSheetInitialMode, setCheatSheetInitialMode] = useState<'view' | 'customize'>('view');
  const [isSupabaseDiagModalOpen, setIsSupabaseDiagModalOpen] = useState(false);

  const handleOpenCheatSheet = (initialMode: 'view' | 'customize' = 'view') => {
    setCheatSheetInitialMode(initialMode);
    setIsCheatSheetOpen(true);
  };

  const executeShortcutAction = (actionId: string) => {
    switch (actionId) {
      case 'cheat_sheet':
        handleOpenCheatSheet('view');
        break;
      case 'command_palette':
        setIsCommandPaletteOpen(prev => !prev);
        break;
      case 'new_job_card':
        handleOpenCreateJob();
        break;
      case 'find_vehicle':
        setActiveTab('customers_vehicles');
        setMastersSubTab('vehicles');
        break;
      case 'focus_search':
        setIsCommandPaletteOpen(true);
        break;
      case 'toggle_sidebar':
        setIsSidebarCollapsed(prev => !prev);
        break;
      case 'go_dashboard':
        setActiveTab('dashboard');
        break;
      case 'go_jobs':
        setActiveTab('jobs');
        break;
      case 'go_customers':
        setActiveTab('customers_vehicles');
        setMastersSubTab('customers');
        break;
      case 'go_inventory':
        setActiveTab('inventory');
        break;
      case 'go_billing':
        setActiveTab('financials');
        break;
      case 'new_invoice':
        setIsInvoiceModalOpen(true);
        break;
      case 'new_estimate':
        setIsEstimationOpen(true);
        break;
      case 'easy_guide':
        setIsEasyGuideOpen(true);
        break;
      default:
        break;
    }
  };

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Do not capture bare keypresses when user is typing in text inputs
      const target = e.target as HTMLElement | null;
      const isInputField = Boolean(
        target && (
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' || 
          target.isContentEditable
        )
      );

      // Instant shortcut '?' (Shift + /) anywhere when not in an input field
      if (e.key === '?' && !isInputField) {
        e.preventDefault();
        handleOpenCheatSheet('view');
        return;
      }

      const activeShortcuts = getShortcuts();
      for (const sc of activeShortcuts) {
        if (matchesKeyEvent(e, sc.currentCombo)) {
          // If user is inside an input field, only allow shortcuts with modifier keys (Ctrl/Alt/Meta) or function keys
          const hasModifier = Boolean(sc.currentCombo.ctrlKey || sc.currentCombo.altKey || sc.currentCombo.metaKey);
          const isFunctionKey = /^F\d+$/i.test(sc.currentCombo.key);
          if (isInputField && !hasModifier && !isFunctionKey) {
            continue;
          }

          e.preventDefault();
          executeShortcutAction(sc.id);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Cross-module states
  const [selectedVehicleHistoryPlate, setSelectedVehicleHistoryPlate] = useState<string>('8XYZ492');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Permission mapping for all 10 ERP windows
  useEffect(() => {
    if (!currentUser) return;
    const tabPermissionMap: Record<TabKey, keyof UserPermissions> = {
      dashboard: 'canViewDashboard',
      masters: 'canManageSettings',
      operations: 'canManageJobCards',
      labor: 'canManageJobCards',
      purchases: 'canManagePurchasesAndSales',
      inventory: 'canManageInventory',
      financial: 'canManageBilling',
      financials: 'canManageBilling',
      reports: 'canViewDashboard',
      control_panel: 'canManageSettings',
      utilities: 'canViewServiceHistory',
      // Legacy Aliases
      jobs: 'canManageJobCards',
      inventory_alias: 'canManageInventory',
      history: 'canViewServiceHistory',
      billing: 'canManageBilling',
      settings: 'canManageSettings',
      users: 'canManageUsers',
    } as any;

    const requiredPerm = tabPermissionMap[activeTab];
    if (requiredPerm && !hasPermission(requiredPerm)) {
      const availableTabs: TabKey[] = ['dashboard', 'operations', 'inventory', 'purchases', 'utilities', 'financial', 'financials', 'control_panel'];
      const firstAllowed = availableTabs.find(t => {
        const perm = tabPermissionMap[t];
        return perm ? hasPermission(perm) : true;
      });
      if (firstAllowed && firstAllowed !== activeTab) {
        setActiveTab(firstAllowed);
      }
    }
  }, [currentUser, activeTab, hasPermission]);


  const handleOpenCreateJob = () => {
    setEditingJobCard(null);
    setIsJobModalOpen(true);
  };

  const handleOpenEditJob = (cardOrId: JobCard | string) => {
    if (typeof cardOrId === 'string') {
      const found = jobCards.find(jc => jc.id === cardOrId || jc.jobNumber === cardOrId);
      if (found) {
        setEditingJobCard(found);
      }
    } else {
      setEditingJobCard(cardOrId);
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJobCard = async (cardData: Omit<JobCard, 'id' | 'jobNumber'>) => {
    if (editingJobCard) {
      await updateJobCard(editingJobCard.id, cardData);
      const updated = { ...editingJobCard, ...cardData };
      setEditingJobCard(updated);
      return updated;
    } else {
      const created = await createJobCard(cardData);
      if (created) {
        setEditingJobCard(created);
      }
      return created;
    }
  };

  const handleGenerateInvoice = (jobCardId: string) => {
    const card = jobCards.find(jc => jc.id === jobCardId || jc.jobNumber === jobCardId);
    const cardJobNo = (card?.jobNumber || '').trim().toLowerCase();
    const existing = invoices.find(
      inv => inv.jobCardId === jobCardId ||
             (card?.id && inv.jobCardId === card.id) ||
             (cardJobNo && (inv.jobCardNumber || '').trim().toLowerCase() === cardJobNo) ||
             (card?.invoiceId && inv.id === card.invoiceId)
    );
    if (existing) {
      setSelectedInvoiceId(existing.id);
      setIsInvoiceModalOpen(true);
      setActiveTab('billing');
      return;
    }

    const inv = generateInvoiceFromJobCard(jobCardId);
    if (inv) {
      setSelectedInvoiceId(inv.id);
      setIsInvoiceModalOpen(true);
      setActiveTab('billing');
    }
  };

  const handleSelectVehicleHistory = (plate: string) => {
    setSelectedVehicleHistoryPlate(plate);
    setActiveTab('history');
  };

  const handleOpenNewJobForVehicle = (vehicle: JobCard['vehicle'], customer: JobCard['customer']) => {
    // Generate empty template with vehicle and customer prefilled
    const prefilled: JobCard = {
      id: '',
      jobNumber: '',
      customer,
      vehicle,
      dateIn: new Date().toISOString().split('T')[0],
      promisedDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'Draft',
      priority: 'Normal',
      jobType: 'Full Overhaul',
      customerComplaints: '',
      diagnosisNotes: '',
      assignedTechnician: 'Alex Rivera (Master Tech)',
      mechanicalTasks: [],
      dentingPaintingPanels: [],
      partsUsed: [],
      mechanicalLaborCost: 0,
      dentingLaborCost: 0,
      paintingCost: 0,
      paintBoothCharge: 0,
      partsCost: 0,
      consumablesCost: 35,
      discount: 0,
      taxRate: settings.taxRatePercent,
      totalAmount: 35,
    };
    setEditingJobCard(prefilled);
    setIsJobModalOpen(true);
  };

  if (!isAuthenticated) {
    onNavigate('/login');
    return null;
  }

  return (
    <div className="h-screen w-screen bg-sky-50 flex antialiased text-slate-900 font-sans overflow-hidden">
      {/* Modern Workshop Sidebar */}
      <WorkshopSidebar
        activeTab={activeTab}
        onSelectTab={(tab, subTab) => {
          setActiveTab(tab);
          if (tab === 'customers' || tab === 'customers_vehicles' || tab === 'masters') {
            setMastersSubTab(subTab || 'customers');
          }
          if (tab === 'purchases' && subTab) setPurchasesSubTab(subTab as any);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenNewJob={handleOpenCreateJob}
        onOpenEstimation={() => setIsEstimationOpen(true)}
        onOpenMaterialIssue={() => setIsMaterialIssueOpen(true)}
        onOpenCashReceipt={() => setIsCashReceiptOpen(true)}
        onOpenCompanyManager={() => setIsCompanyManagerOpen(true)}
        onOpenEasyGuide={() => setIsEasyGuideOpen(true)}
        onOpenCheatSheet={() => handleOpenCheatSheet('view')}
        activeJobsCount={jobCards.filter(j => j.status !== 'Delivered' && j.status !== 'Closed').length}
        pendingInvoicesCount={invoices.filter(i => i.status !== 'Paid').length}
        lowStockCount={inventory.filter(i => (i.quantityOnHand ?? i.stockQuantity) <= (i.minReorderLevel ?? i.minStockLevel)).length}
        activeCompanyName={activeCompany.name}
        activeCompanyCode={activeCompany.code}
        userRole={currentUser?.role}
        userName={currentUser?.fullName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-sky-50">
        {/* Top Header Bar */}
        <WorkshopHeader
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          activeTab={activeTab}
          onSelectTab={(tab, subTab) => {
            setActiveTab(tab);
            if (tab === 'customers' || tab === 'customers_vehicles' || tab === 'masters') {
              setMastersSubTab(subTab || 'customers');
            }
          }}
          onOpenNewJob={handleOpenCreateJob}
          onOpenPartsSell={() => setIsCounterSaleModalOpen(true)}
          onOpenFindVehicle={() => {
            setActiveTab('customers_vehicles');
            setMastersSubTab('vehicles');
          }}
          onOpenCheatSheet={handleOpenCheatSheet}
          onOpenSupabaseDiagnostic={() => setIsSupabaseDiagModalOpen(true)}
          onOpenNewInvoice={() => setIsInvoiceModalOpen(true)}
          onOpenEstimation={() => setIsEstimationOpen(true)}
          onOpenMaterialIssue={() => setIsMaterialIssueOpen(true)}
          onOpenIssueReturn={() => setIsIssueReturnOpen(true)}
          onOpenStockAdjustment={() => setIsStockAdjustOpen(true)}
          onOpenStockTakeSheet={() => setIsStockTakeOpen(true)}
          onOpenGoodsReceiptNote={() => setIsGrnOpen(true)}
          onOpenCashReceipt={() => setIsCashReceiptOpen(true)}
          onOpenAdvances={(mode) => setAdvancesModalConfig({ isOpen: true, mode })}
          onOpenLaborClock={() => setIsLaborClockOpen(true)}
          onOpenGeneralJournal={() => setIsJournalOpen(true)}
          onOpenCompanyManager={() => setIsCompanyManagerOpen(true)}
          onOpenEasyGuide={() => setIsEasyGuideOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onQuickPlateSearch={(plate) => {
            setSelectedVehicleHistoryPlate(plate.toUpperCase());
            setActiveTab('utilities');
          }}
          onSelectJobCard={(card) => handleOpenEditJob(card)}
          onSelectInvoice={(invId) => {
            setSelectedInvoiceId(invId);
            setActiveTab('financials');
          }}
          onLogout={logout}
          activeJobsCount={jobCards.filter(j => j.status !== 'Delivered' && j.status !== 'Closed').length}
          pendingInvoicesCount={invoices.filter(i => i.status !== 'Paid').length}
          lowStockCount={inventory.filter(i => (i.quantityOnHand ?? i.stockQuantity) <= (i.minReorderLevel ?? i.minStockLevel)).length}
          jobCards={jobCards}
          invoices={invoices}
          inventory={inventory}
          currentUser={currentUser}
        />

        {/* Actionable Configuration Error Banner for Missing Environment Variables */}
        {backendStatus === 'config_error' && (
          <div className="bg-amber-600 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md text-xs font-medium z-30 shrink-0 border-b border-amber-700 animate-in fade-in">
            <div className="flex items-center gap-2 max-w-4xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
              <span>
                <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-amber-800 text-amber-100 font-mono text-[11px] font-bold border border-amber-500">
                  ENV CONFIG ERROR
                </span>
                <strong>Missing Variables:</strong> {missingEnvVars && missingEnvVars.length > 0 ? missingEnvVars.join(', ') : 'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'} — {backendError || envConfigError || 'Please configure your Supabase credentials in your .env or deployment settings.'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsSupabaseDiagModalOpen(true)}
                className="bg-amber-900/80 hover:bg-amber-950 text-white border border-amber-400 px-3 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Database className="w-3.5 h-3.5 text-amber-300" />
                <span>Diagnostic Utility</span>
              </button>
              <button
                onClick={() => retryBackendConnection()}
                className="bg-white text-amber-800 hover:bg-amber-50 px-3 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Validation
              </button>
            </div>
          </div>
        )}

        {/* Actionable Backend Connection Error Banner */}
        {backendStatus === 'error' && backendStatusCode !== 401 && (
          <div className="bg-rose-600 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md text-xs font-medium z-30 shrink-0 border-b border-rose-700 animate-in fade-in">
            <div className="flex items-center gap-2 max-w-4xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
              <span>
                {backendStatusCode && (
                  <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-rose-800 text-rose-100 font-mono text-[11px] font-bold border border-rose-500">
                    HTTP {backendStatusCode}
                  </span>
                )}
                <strong>Backend Error:</strong> {backendError || 'Cannot connect to persistent ERP backend server.'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsSupabaseDiagModalOpen(true)}
                className="bg-rose-900/80 hover:bg-rose-950 text-white border border-rose-400 px-3 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Database className="w-3.5 h-3.5 text-rose-300" />
                <span>Diagnostic Utility</span>
              </button>
              <button
                onClick={() => retryBackendConnection()}
                className="bg-white text-rose-700 hover:bg-rose-50 px-3 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Viewport for Active Module */}
        <main className="flex-1 w-full bg-sky-50 overflow-y-auto overflow-x-hidden pb-20 lg:pb-8">
          <div className="w-full max-w-[1680px] mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col min-h-0">
            {/* WINDOW 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <GarageDashboard
                jobCards={jobCards}
                inventory={inventory}
                invoices={invoices}
                settings={settings}
                onOpenCreateJobCard={handleOpenCreateJob}
                onOpenPartsSell={() => setIsCounterSaleModalOpen(true)}
                onNavigateToTab={(tab, filter) => {
                  setActiveTab(tab as TabKey);
                  if (tab === 'work_orders' && filter) {
                    setJobCardFilter(filter);
                  } else if (tab === 'inventory' && filter === 'LOW_STOCK') {
                    setInventoryLowStockOnly(true);
                  } else if (tab === 'invoices_payments' && filter) {
                    setInvoiceStatusFilter(filter as any);
                  }
                }}
                onSelectJobCard={handleOpenEditJob}
                onSelectVehicleHistory={handleSelectVehicleHistory}
              />
            )}

            {/* WINDOW 2: CUSTOMERS & VEHICLES */}
            {(activeTab === 'customers' || activeTab === 'customers_vehicles' || activeTab === 'masters') && (
              <MastersWindow
                settings={settings}
                initialTab={mastersSubTab}
                onUpdateSettings={updateSettings}
                onOpenJobCard={handleOpenEditJob}
                onOpenInvoice={invoiceId => {
                  setSelectedInvoiceId(invoiceId);
                  setActiveTab('billing');
                }}
                onOpenNewJobForVehicle={(plate, make, model) => {
                  handleOpenNewJobForVehicle(
                    {
                      plateNumber: plate,
                      make,
                      model,
                      year: 2022,
                      color: 'White',
                      odometer: 45000,
                      fuelLevel: 75,
                    },
                    {
                      id: `cust-${Date.now()}`,
                      name: 'Direct Customer',
                      phone: '+974 5500 0000',
                    }
                  );
                }}
              />
            )}

            {/* WINDOW 3: JOBS (Includes Technicians & Bays) */}
            {(activeTab === 'jobs' || activeTab === 'work_orders' || activeTab === 'operations' || activeTab === 'technicians_bays' || activeTab === 'labor') && (
              <JobsView
                jobCards={jobCards}
                settings={settings}
                onOpenCreate={handleOpenCreateJob}
                onEdit={handleOpenEditJob}
                onDelete={deleteJobCard}
                onAdvanceStatus={advanceJobCardStatus}
                onGenerateInvoice={handleGenerateInvoice}
                onSelectVehicleHistory={handleSelectVehicleHistory}
                initialStatusFilter={jobCardFilter}
                initialSubTab={activeTab === 'technicians_bays' || activeTab === 'labor' ? 'bays' : 'jobs'}
              />
            )}

            {/* WINDOW 4: PARTS & STOCK (Includes Inventory, Orders, Suppliers, GRN, Sales & Returns) */}
            {(activeTab === 'inventory' || activeTab === 'parts_stock' || activeTab === 'purchasing' || activeTab === 'purchases') && (
              <PartsAndStockView
                inventory={inventory}
                purchaseOrders={purchaseOrders}
                counterSales={counterSales}
                settings={settings}
                onAddItem={addInventoryItem}
                onUpdateItem={updateInventoryItem}
                onDeleteItem={deleteInventoryItem}
                onAdjustStock={adjustStock}
                onCreatePurchaseOrder={createPurchaseOrder}
                onUpdatePOStatus={updatePurchaseOrderStatus}
                onCreateCounterSale={createCounterSale}
                onReceiveGoods={(poId, itemsReceived) => {
                  updatePurchaseOrderStatus(poId, 'Received');
                  itemsReceived.forEach(i => {
                    adjustStock(i.itemId, i.qty, 'Received under PO GRN');
                  });
                }}
                initialTab={activeTab === 'purchasing' || activeTab === 'purchases' ? (purchasesSubTab as any) : 'parts'}
                initialLowStockOnly={inventoryLowStockOnly}
              />
            )}

            {/* WINDOW 5: BILLING (Includes Invoices, Payments, and Accounting Ledger) */}
            {(activeTab === 'billing' || activeTab === 'invoices_payments' || activeTab === 'financial' || activeTab === 'financials') && (
              <BillingView
                invoices={invoices}
                jobCards={jobCards}
                settings={settings}
                onRecordPayment={recordPayment}
                selectedInvoiceId={selectedInvoiceId}
                onClearSelectedInvoice={() => setSelectedInvoiceId(null)}
                onCreateInvoice={createInvoice}
                onUpdateInvoice={updateInvoice}
                onDeleteInvoice={deleteInvoice}
                onViewJobCard={handleOpenEditJob}
                initialStatusFilter={invoiceStatusFilter}
                initialTab={activeTab === 'financial' || activeTab === 'financials' ? 'financial' : 'billing'}
              />
            )}

            {/* WINDOW 6: REPORTS */}
            {activeTab === 'reports' && (
              <ReportsWindow
                jobCards={jobCards}
                inventory={inventory}
                invoices={invoices}
                settings={settings}
                selectedReportKey={selectedReportKey}
                onSelectJobCard={handleOpenEditJob}
              />
            )}

            {/* WINDOW 7: SETTINGS & USER MANAGEMENT */}
            {(activeTab === 'settings' || activeTab === 'control_panel' || activeTab === 'users') && (
              <ControlPanelWindow
                settings={settings}
                onUpdateSettings={updateSettings}
                onResetData={resetToDefaults}
                onOpenCheatSheet={handleOpenCheatSheet}
                initialTab={activeTab === 'users' ? 'users' : 'profile'}
              />
            )}

            {/* UTILITIES / VEHICLE HISTORY */}
            {(activeTab === 'utilities' || activeTab === 'history') && (
              <UtilitiesWindow
                initialQuery={selectedVehicleHistoryPlate}
                getVehicleHistory={getVehicleHistory}
                onOpenNewJobForVehicle={handleOpenNewJobForVehicle}
                onSelectJobCard={handleOpenEditJob}
                onViewInvoice={invoiceId => {
                  setSelectedInvoiceId(invoiceId);
                  setIsInvoiceModalOpen(true);
                  setActiveTab('billing');
                }}
                settings={settings}
                fullDataBackup={{
                  jobCards,
                  inventory,
                  invoices,
                  settings
                }}
              />
            )}
          </div>
        </main>
      </div>


      {/* Global Job Card Creation / Editing Modal */}
      {isJobModalOpen && (
        <JobCardModal
          isOpen={isJobModalOpen}
          onClose={() => {
            setIsJobModalOpen(false);
            setEditingJobCard(null);
          }}
          onSave={handleSaveJobCard}
          inventory={inventory}
          settings={settings}
          customers={customers}
          initialData={editingJobCard}
          onGenerateInvoice={handleGenerateInvoice}
          onOpenInvoice={(invIdOrJobNumber) => {
            setIsJobModalOpen(false);
            const target = (invIdOrJobNumber || '').trim().toLowerCase();
            const matchedInvoice = invoices.find(
              i => (i.id && i.id.toLowerCase() === target) ||
                   (i.invoiceNumber && i.invoiceNumber.toLowerCase() === target) ||
                   (i.jobCardNumber && i.jobCardNumber.toLowerCase() === target) ||
                   (i.jobCardId && i.jobCardId.toLowerCase() === target)
            );

            if (matchedInvoice) {
              setSelectedInvoiceId(matchedInvoice.id);
            } else {
              const matchedJob = jobCards.find(
                j => (j.id && j.id.toLowerCase() === target) ||
                     (j.jobNumber && j.jobNumber.toLowerCase() === target)
              );
              if (matchedJob) {
                const newInv = generateInvoiceFromJobCard(matchedJob.id);
                if (newInv) {
                  setSelectedInvoiceId(newInv.id);
                } else {
                  setSelectedInvoiceId(matchedJob.jobNumber);
                }
              } else {
                setSelectedInvoiceId(invIdOrJobNumber);
              }
            }
            setIsInvoiceModalOpen(true);
            setActiveTab('billing');
          }}
          allJobCards={jobCards}
          invoices={invoices}
          onSelectJobCard={setEditingJobCard}
          onDeleteJobCard={(id) => {
            deleteJobCard(id);
            setIsJobModalOpen(false);
            setEditingJobCard(null);
          }}
        />
      )}

      {/* 1. Material Issue Voucher Modal */}
      {isMaterialIssueOpen && (
        <MaterialIssueModal
          isOpen={isMaterialIssueOpen}
          onClose={() => setIsMaterialIssueOpen(false)}
          inventory={inventory}
          jobCards={jobCards}
          settings={settings}
          onIssueMaterial={(jobCardId, item, quantity, technicianName) => {
            issueMaterialToJobCard(jobCardId, item, quantity, technicianName);
          }}
        />
      )}

      {/* 2. Issue Return Voucher Modal */}
      {isIssueReturnOpen && (
        <IssueReturnModal
          isOpen={isIssueReturnOpen}
          onClose={() => setIsIssueReturnOpen(false)}
          jobCards={jobCards}
          settings={settings}
          onReturnMaterial={(jobCardId, partId, returnQty, reason) => {
            returnMaterialFromJobCard(jobCardId, partId, returnQty, reason);
          }}
        />
      )}

      {/* 3. Physical Stock Take Sheet Modal */}
      {isStockTakeOpen && (
        <StockTakeSheetModal
          isOpen={isStockTakeOpen}
          onClose={() => setIsStockTakeOpen(false)}
          inventory={inventory}
          settings={settings}
        />
      )}

      {/* 4. Stock Adjustment Modal */}
      {isStockAdjustOpen && (
        <StockAdjustmentModal
          isOpen={isStockAdjustOpen}
          onClose={() => setIsStockAdjustOpen(false)}
          inventory={inventory}
          settings={settings}
          onAdjustStock={(itemId, delta, reason) => {
            adjustStock(itemId, delta, reason);
          }}
        />
      )}

      {/* 5. Official Cash Receipt Voucher Modal */}
      {isCashReceiptOpen && (
        <CashReceiptModal
          isOpen={isCashReceiptOpen}
          onClose={() => setIsCashReceiptOpen(false)}
          invoices={invoices}
          settings={settings}
          onRecordPayment={(invoiceId, paymentData) => {
            recordPayment(invoiceId, paymentData);
          }}
        />
      )}

      {/* 6. Workshop Estimation & Quotation Modal */}
      {isEstimationOpen && (
        <EstimationModal
          isOpen={isEstimationOpen}
          onClose={() => setIsEstimationOpen(false)}
          settings={settings}
          onConvertToJobCard={(cardData) => {
            createJobCard(cardData);
            setActiveTab('operations');
          }}
        />
      )}

      {/* 7. Vehicle Delivery Commitment Schedule Modal */}
      {isDeliveryScheduleOpen && (
        <DeliveryScheduleModal
          isOpen={isDeliveryScheduleOpen}
          onClose={() => setIsDeliveryScheduleOpen(false)}
          jobCards={jobCards}
          settings={settings}
          onAdvanceJobStatus={(id, status) => {
            advanceJobCardStatus(id, status);
          }}
        />
      )}

      {/* 8. Labor Clock In / Out & Timesheet Modal */}
      {isLaborClockOpen && (
        <LaborClockInOutModal
          isOpen={isLaborClockOpen}
          onClose={() => setIsLaborClockOpen(false)}
          jobCards={jobCards}
          settings={settings}
        />
      )}

      {/* 9. Post-Dated Cheques (PDC) Management Modal */}
      {isPdcOpen && (
        <PdcManagementModal
          isOpen={isPdcOpen}
          onClose={() => setIsPdcOpen(false)}
          settings={settings}
        />
      )}

      {/* 10. General Journal Entry (GL Voucher) Modal */}
      {isJournalOpen && (
        <GeneralJournalModal
          isOpen={isJournalOpen}
          onClose={() => setIsJournalOpen(false)}
          settings={settings}
        />
      )}

      {/* 11. Goods Receipt Note (GRN) Inward Modal */}
      {isGrnOpen && (
        <GoodsReceiptNoteModal
          isOpen={isGrnOpen}
          onClose={() => setIsGrnOpen(false)}
          purchaseOrders={purchaseOrders}
          inventory={inventory}
          settings={settings}
          onReceiveGoods={(poId, items) => {
            updatePurchaseOrderStatus(poId, 'Received');
            items.forEach(i => {
              adjustStock(i.itemId, i.qty, 'Received under PO GRN');
            });
          }}
        />
      )}

      {/* 12. Bills Registration / Inward Vouchers Modal */}
      {isBillsRegistrationOpen && (
        <BillsRegistrationModal
          isOpen={isBillsRegistrationOpen}
          onClose={() => setIsBillsRegistrationOpen(false)}
          settings={settings}
        />
      )}

      {/* 13. Advances & Return Vouchers Modal (Customer & Supplier) */}
      {advancesModalConfig.isOpen && (
        <AdvancesModal
          isOpen={advancesModalConfig.isOpen}
          onClose={() => setAdvancesModalConfig(prev => ({ ...prev, isOpen: false }))}
          mode={advancesModalConfig.mode}
          settings={settings}
        />
      )}

      {/* 14. Opening Balance Ledger Setup Modal */}
      {isOpeningBalanceOpen && (
        <OpeningBalanceModal
          isOpen={isOpeningBalanceOpen}
          onClose={() => setIsOpeningBalanceOpen(false)}
          settings={settings}
        />
      )}

      {/* 15. About UniQon Auto Modal */}
      {isAboutUniqonOpen && (
        <AboutUniqonModal
          isOpen={isAboutUniqonOpen}
          onClose={() => setIsAboutUniqonOpen(false)}
          settings={settings}
        />
      )}

      {/* 16. Multi-Company & Zero-State Database Manager Modal */}
      {isCompanyManagerOpen && (
        <CompanyManagerModal
          isOpen={isCompanyManagerOpen}
          onClose={() => setIsCompanyManagerOpen(false)}
        />
      )}

      {/* 17. Dedicated Enterprise ERP Invoice Window Modal */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoiceId(null);
          }}
          invoices={invoices}
          jobCards={jobCards}
          settings={settings}
          selectedInvoiceId={selectedInvoiceId}
          onSaveInvoice={(data) => {
            const existing = invoices.find(i => i.invoiceNumber === data.invoiceNumber || (data.id && i.id === data.id));
            if (existing) {
              updateInvoice(existing.id, data);
            } else {
              createInvoice(data as any);
            }
          }}
          onDeleteInvoice={deleteInvoice}
          onRecordPayment={recordPayment}
          onViewJobCard={(id) => {
            setIsInvoiceModalOpen(false);
            handleOpenEditJob(id);
          }}
        />
      )}

      {/* 18. User-Friendly Easy Workshop Guide Modal */}
      {isEasyGuideOpen && (
        <EasyGuideModal
          isOpen={isEasyGuideOpen}
          onClose={() => setIsEasyGuideOpen(false)}
          onOpenNewJob={handleOpenCreateJob}
          onOpenCustomerMaster={() => {
            setActiveTab('masters');
            setMastersSubTab('customers');
          }}
          onOpenInventory={() => setActiveTab('inventory')}
        />
      )}

      {/* Counter Sale / Parts Sell Modal */}
      {isCounterSaleModalOpen && (
        <CounterSaleRecordModal
          isOpen={isCounterSaleModalOpen}
          onClose={() => setIsCounterSaleModalOpen(false)}
        />
      )}

      {/* 19. Global Command Palette Search Modal (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectJobCard={(card) => {
          handleOpenEditJob(card);
        }}
        onSelectInvoice={(invId) => {
          setSelectedInvoiceId(invId);
          setIsInvoiceModalOpen(true);
        }}
        onNavigateTab={(tab, subTab) => {
          setActiveTab(tab as TabKey);
          if (subTab && tab === 'masters') setMastersSubTab(subTab);
        }}
        onOpenCreateJob={handleOpenCreateJob}
      />

      {/* 20. Global Keyboard Shortcuts Cheat Sheet & Customizer Modal */}
      <KeyboardCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        initialMode={cheatSheetInitialMode}
        onTriggerAction={executeShortcutAction}
      />

      {/* 21. Supabase Database Diagnostic Utility Modal */}
      <SupabaseDiagnosticModal
        isOpen={isSupabaseDiagModalOpen}
        onClose={() => setIsSupabaseDiagModalOpen(false)}
      />

      {/* Mobile Sticky Quick Navigation Bar (< lg screens) */}
      <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 flex items-center justify-around px-2 shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
            activeTab === 'dashboard' ? 'text-sky-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors relative ${
            activeTab === 'jobs' || activeTab === 'work_orders' || activeTab === 'operations' ? 'text-sky-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Jobs</span>
        </button>

        <button
          onClick={handleOpenCreateJob}
          className="flex flex-col items-center justify-center w-11 h-11 -mt-4 bg-sky-600 hover:bg-sky-700 text-white rounded-full shadow-lg cursor-pointer transition-transform active:scale-95"
          title="New Job"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
            activeTab === 'inventory' || activeTab === 'parts_stock' ? 'text-sky-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Parts</span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center justify-center p-1 cursor-pointer text-slate-500 hover:text-sky-600"
          title="Open Menu"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </nav>
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { isAuthenticated, currentUser, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return <AppContent onNavigate={navigate} />;
};

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <GarageProvider>
            <AppRouter />
          </GarageProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
