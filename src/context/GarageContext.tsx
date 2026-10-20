import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  JobCard, 
  InventoryItem, 
  PurchaseOrder, 
  CounterSale, 
  Invoice, 
  GarageSettings,
  JobStatus,
  JobStatusHistoryEntry,
  PaymentRecord,
  CompanyProfile,
  CustomerMasterItem,
  SupplierMasterItem,
  VehicleMasterItem,
  EstimationItem,
  StockMovement,
  SupplierLedgerEntry,
  ScrapMaterialType,
  ScrapPriceRate,
  ScrapIntake,
  ScrapSale,
  ExpenseRecord,
  WarrantyRecord,
  InsuranceClaimRecord,
  SystemAuditLog,
  FinancialAccount,
  FinancialTransaction,
  FinancialAllocation,
  FinancialJournalEntry,
  FinancialOverviewSummary
} from '../types';
import { 
  INITIAL_SETTINGS, 
  INITIAL_INVENTORY, 
  INITIAL_JOB_CARDS, 
  INITIAL_PURCHASE_ORDERS, 
  INITIAL_COUNTER_SALES, 
  INITIAL_INVOICES,
  INITIAL_COMPANIES,
  NEW_COMPANY_SETTINGS,
  INITIAL_CUSTOMERS_LEGACY,
  INITIAL_SUPPLIERS_LEGACY,
  INITIAL_VEHICLES_LEGACY,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SCRAP_RATES,
  INITIAL_SCRAP_INTAKES,
  INITIAL_SCRAP_SALES,
  INITIAL_EXPENSES,
  INITIAL_WARRANTIES,
  INITIAL_INSURANCE_CLAIMS,
  INITIAL_AUDIT_LOGS
} from '../data/initialData';
import { isSupabaseConfigured, validateSupabaseEnv, type SupabaseEnvValidation } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import {
  fetchCustomersFromSupabase,
  upsertCustomerToSupabase,
  deleteCustomerFromSupabase,
  fetchVehiclesFromSupabase,
  upsertVehicleToSupabase,
  deleteVehicleFromSupabase,
  fetchSuppliersFromSupabase,
  upsertSupplierToSupabase,
  deleteSupplierFromSupabase,
  fetchInventoryFromSupabase,
  upsertInventoryToSupabase,
  deleteInventoryFromSupabase,
  fetchJobCardsFromSupabase,
  upsertJobCardToSupabase,
  deleteJobCardFromSupabase,
  fetchInvoicesFromSupabase,
  upsertInvoiceToSupabase,
  deleteInvoiceFromSupabase,
  syncAllFromSupabase,
} from '../lib/supabaseSync';

interface GarageContextType {
  // Supabase Backend Sync Status
  isSupabaseConnected: boolean;

  // Company management
  companies: CompanyProfile[];
  activeCompanyId: string;
  activeCompany: CompanyProfile;
  switchCompany: (companyId: string) => void;
  createCompany: (companyData: Omit<CompanyProfile, 'id' | 'createdAt'>) => CompanyProfile;
  deleteCompany: (companyId: string) => void;
  resetCompanyData: (companyId?: string) => void;

  settings: GarageSettings;
  updateSettings: (updates: Partial<GarageSettings>) => void;
  
  jobCards: JobCard[];
  createJobCard: (card: Omit<JobCard, 'id' | 'jobNumber'>) => Promise<JobCard> | JobCard;
  updateJobCard: (id: string, updates: Partial<JobCard>) => Promise<void> | void;
  deleteJobCard: (id: string) => void;
  advanceJobCardStatus: (id: string, status: JobStatus) => void;
  refreshJobCards: () => Promise<void>;
  
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  adjustStock: (id: string, deltaQuantity: number, reason?: string) => void;
  adjustStockWithLog: (itemId: string, changeQty: number, type: StockMovement['type'], reason: string, user: string, refNo?: string) => void;
  issueMaterialToJobCard: (jobCardId: string, item: InventoryItem, quantity: number, technicianName?: string) => void;
  returnMaterialFromJobCard: (jobCardId: string, partIdOrSku: string, returnQty: number, reason?: string) => void;
  
  stockMovements: StockMovement[];
  addStockMovement: (mov: Omit<StockMovement, 'id' | 'timestamp'>) => void;

  purchaseOrders: PurchaseOrder[];
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => PurchaseOrder;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrder['status']) => void;
  receivePOItems: (poId: string, receivedItems: { partId: string; qtyReceivedNow: number }[], isCompleted?: boolean, notes?: string) => void;

  // Supplier Ledger
  suppliers: SupplierMasterItem[];
  addSupplier: (supplier: Omit<SupplierMasterItem, 'id'>) => SupplierMasterItem;
  updateSupplier: (id: string, updates: Partial<SupplierMasterItem>) => void;
  deleteSupplier: (id: string) => void;
  addSupplierLedgerEntry: (supplierId: string, entry: Omit<SupplierLedgerEntry, 'id' | 'supplierId' | 'balanceAfter'>) => void;

  // Scrap Module (Najm Al Huda Scrap Trading)
  scrapRates: ScrapPriceRate[];
  updateScrapRate: (material: ScrapMaterialType, buyingRate: number, sellingRate: number) => void;
  scrapIntakes: ScrapIntake[];
  addScrapIntake: (intake: Omit<ScrapIntake, 'id' | 'receiptNo'>) => ScrapIntake;
  scrapSales: ScrapSale[];
  addScrapSale: (sale: Omit<ScrapSale, 'id' | 'invoiceNo' | 'profitMargin' | 'marginPercent'>) => ScrapSale;
  
  counterSales: CounterSale[];
  createCounterSale: (sale: Omit<CounterSale, 'id' | 'saleNumber'>) => CounterSale;
  
  invoices: Invoice[];
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  generateInvoiceFromJobCard: (jobCardId: string) => Invoice | null;
  closeAndInvoiceJobCard: (jobCardId: string, cardData?: any) => Promise<{ success: boolean; invoice?: Invoice; invoiceId?: string; invoiceNumber?: string; message?: string }>;
  recordPayment: (invoiceId: string, payment: Omit<PaymentRecord, 'id' | 'date'>) => void;
  
  // Master Catalogs
  customers: CustomerMasterItem[];
  addCustomer: (customer: Omit<CustomerMasterItem, 'id'>) => CustomerMasterItem;
  updateCustomer: (id: string, updates: Partial<CustomerMasterItem>) => void;
  deleteCustomer: (id: string) => void;

  vehicles: VehicleMasterItem[];
  addVehicle: (vehicle: Omit<VehicleMasterItem, 'id'>) => VehicleMasterItem;
  updateVehicle: (id: string, updates: Partial<VehicleMasterItem>) => void;
  deleteVehicle: (id: string) => void;

  estimates: EstimationItem[];
  addEstimate: (estimate: Omit<EstimationItem, 'id' | 'estimateNumber'>) => EstimationItem;
  updateEstimate: (id: string, updates: Partial<EstimationItem>) => void;
  deleteEstimate: (id: string) => void;

  // Phase 5: Finance & Operations additions
  expenses: ExpenseRecord[];
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => ExpenseRecord;
  updateExpense: (id: string, updates: Partial<ExpenseRecord>) => void;
  deleteExpense: (id: string) => void;

  warranties: WarrantyRecord[];
  addWarranty: (warranty: Omit<WarrantyRecord, 'id'>) => WarrantyRecord;
  updateWarranty: (id: string, updates: Partial<WarrantyRecord>) => void;

  insuranceClaims: InsuranceClaimRecord[];
  addInsuranceClaim: (claim: Omit<InsuranceClaimRecord, 'id'>) => InsuranceClaimRecord;
  updateInsuranceClaim: (id: string, updates: Partial<InsuranceClaimRecord>) => void;

  auditLogs: SystemAuditLog[];
  addAuditLog: (action: string, module: SystemAuditLog['module'], details?: string, referenceId?: string) => void;

  // Backend persistence state & configuration validation
  backendStatus: 'loading' | 'connected' | 'error' | 'config_error';
  backendError: string | null;
  backendStatusCode: number | null;
  envConfigError: string | null;
  missingEnvVars: string[];
  envValidation: SupabaseEnvValidation | null;
  retryBackendConnection: () => Promise<void>;

  // Workshop Masters
  technicians: any[];
  laborRates: any[];
  paintCodes: any[];

  // Financial Module State & Operations
  financialAccounts: FinancialAccount[];
  financialTransactions: FinancialTransaction[];
  financialAllocations: FinancialAllocation[];
  journalEntries: FinancialJournalEntry[];
  createFinancialAccount: (accountData: Omit<FinancialAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FinancialAccount>;
  updateFinancialAccount: (id: string, updates: Partial<FinancialAccount>) => Promise<void>;
  createFinancialTransaction: (txData: any) => Promise<FinancialTransaction>;
  postFinancialTransaction: (id: string) => Promise<void>;
  reverseFinancialTransaction: (id: string, reason: string) => Promise<void>;
  applyAdvance: (advanceId: string, targetType: 'invoice' | 'purchase_order', targetId: string, amount: number) => Promise<void>;
  refundAdvance: (advanceId: string, refundAmount: number, accountId: string, paymentMethod?: string, notes?: string) => Promise<void>;
  refreshFinancials: () => Promise<void>;

  // Quick stats
  lowStockItemsCount: number;
  activeJobsCount: number;
  vehiclesInShopCount: number;
  totalPendingInvoicesBalance: number;
  
  // Helpers
  getVehicleHistory: (query: string) => {
    vehicleSummary?: JobCard['vehicle'];
    customerSummary?: JobCard['customer'];
    jobCards: JobCard[];
    invoices: Invoice[];
    totalSpent: number;
    totalVisits: number;
  };
  
  resetToDefaults: () => void;
}

const GarageContext = createContext<GarageContextType | undefined>(undefined);

const LS_BASE = 'v3_clean_garage_erp_';

export const GarageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, currentUser, isLoading: isAuthLoading } = useAuth();

  // Check build-time variable injection upon application load
  if (typeof (import.meta as any)?.env?.VITE_SUPABASE_URL === 'undefined') {
    console.error(
      '[GarageProvider] CRITICAL: import.meta.env.VITE_SUPABASE_URL is undefined upon application load! Build-time variable injection is not succeeding or VITE_SUPABASE_URL is not set in the build environment.'
    );
  }

  // Companies List
  const [companies, setCompanies] = useState<CompanyProfile[]>(() => {
    const saved = localStorage.getItem(`${LS_BASE}companies_list`);
    if (saved) {
      try {
        const parsed: CompanyProfile[] = JSON.parse(saved);
        const filtered = parsed.filter(c => c.id !== 'comp_meg' && c.code !== 'MEG');
        if (filtered.length > 0) return filtered;
      } catch {
        // fallback
      }
    }
    return INITIAL_COMPANIES;
  });

  // Active Company ID
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    const saved = localStorage.getItem(`${LS_BASE}active_company_id`);
    if (saved && saved !== 'comp_meg') {
      return saved;
    }
    return 'comp_new';
  });

  // Permanently purge any old company data and legacy demo records from localStorage
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      const preservedAuthKeys = new Set([
        'najm_auth_token',
        'najm_active_uid',
        'najm_remember_me',
        'najm_users_list'
      ]);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preservedAuthKeys.has(key) && (
          key.startsWith('apex_') ||
          (key.startsWith('najm_') && (key.includes('demo') || key.includes('job') || key.includes('inv') || key.includes('cust') || key.includes('comp'))) ||
          key.startsWith('v2_') ||
          key.includes('comp_meg') ||
          key.includes('demo')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Storage purge error:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}companies_list`, JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}active_company_id`, activeCompanyId);
  }, [activeCompanyId]);

  const activeCompany = useMemo(() => {
    return companies.find(c => c.id === activeCompanyId) || companies[0] || INITIAL_COMPANIES[0];
  }, [companies, activeCompanyId]);

  // Loader helper for scoped state
  const loadScopedData = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(`${LS_BASE}${activeCompanyId}_${key}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading from storage', e);
    }
    return fallback;
  };

  // State instances for active company
  const [settings, setSettings] = useState<GarageSettings>(() => {
    return loadScopedData('settings', activeCompanyId === 'comp_new' ? NEW_COMPANY_SETTINGS : INITIAL_SETTINGS);
  });

  const [jobCards, setJobCards] = useState<JobCard[]>(() => {
    return loadScopedData('jobCards', activeCompanyId === 'comp_new' ? [] : INITIAL_JOB_CARDS);
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    return loadScopedData('inventory', INITIAL_INVENTORY);
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    return loadScopedData('stockMovements', INITIAL_STOCK_MOVEMENTS);
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    return loadScopedData('purchaseOrders', INITIAL_PURCHASE_ORDERS);
  });

  const [counterSales, setCounterSales] = useState<CounterSale[]>(() => {
    return loadScopedData('counterSales', INITIAL_COUNTER_SALES);
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    return loadScopedData('invoices', INITIAL_INVOICES);
  });

  const [customers, setCustomers] = useState<CustomerMasterItem[]>(() => {
    return loadScopedData('customers', INITIAL_CUSTOMERS_LEGACY);
  });

  const [suppliers, setSuppliers] = useState<SupplierMasterItem[]>(() => {
    return loadScopedData('suppliers', INITIAL_SUPPLIERS_LEGACY);
  });

  const [vehicles, setVehicles] = useState<VehicleMasterItem[]>(() => {
    return loadScopedData('vehicles', INITIAL_VEHICLES_LEGACY);
  });

  const [estimates, setEstimates] = useState<EstimationItem[]>(() => {
    return loadScopedData('estimates', []);
  });

  const [scrapRates, setScrapRates] = useState<ScrapPriceRate[]>(() => {
    return loadScopedData('scrapRates', INITIAL_SCRAP_RATES);
  });

  const [scrapIntakes, setScrapIntakes] = useState<ScrapIntake[]>(() => {
    return loadScopedData('scrapIntakes', INITIAL_SCRAP_INTAKES);
  });

  const [scrapSales, setScrapSales] = useState<ScrapSale[]>(() => {
    return loadScopedData('scrapSales', INITIAL_SCRAP_SALES);
  });

  // Phase 5 States
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    return loadScopedData('expenses', INITIAL_EXPENSES);
  });

  const [warranties, setWarranties] = useState<WarrantyRecord[]>(() => {
    return loadScopedData('warranties', INITIAL_WARRANTIES);
  });

  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaimRecord[]>(() => {
    return loadScopedData('insuranceClaims', INITIAL_INSURANCE_CLAIMS);
  });

  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    return loadScopedData('auditLogs', INITIAL_AUDIT_LOGS);
  });

  const DEFAULT_FINANCIAL_ACCOUNTS: FinancialAccount[] = [
    {
      id: 'acc-cash-1',
      code: '1010',
      name: 'Workshop Cash Drawer (Main Counter)',
      type: 'cash',
      bankName: '',
      accountNumber: 'CASH-DRAWER-01',
      currency: 'QAR',
      openingBalance: 5000,
      currentBalance: 5000,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    },
    {
      id: 'acc-bank-1',
      code: '1020',
      name: 'Qatar National Bank (QNB Operating A/C)',
      type: 'bank',
      bankName: 'Qatar National Bank',
      accountNumber: 'QA82QNBA0000000012345678',
      currency: 'QAR',
      openingBalance: 85000,
      currentBalance: 85000,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    },
    {
      id: 'acc-bank-2',
      code: '1030',
      name: 'Commercial Bank of Qatar (CBQ Business)',
      type: 'bank',
      bankName: 'Commercial Bank of Qatar',
      accountNumber: 'QA44CBQA0000000087654321',
      currency: 'QAR',
      openingBalance: 45000,
      currentBalance: 45000,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    },
    {
      id: 'acc-cash-2',
      code: '1040',
      name: 'Workshop Petty Cash Fund',
      type: 'cash',
      bankName: '',
      accountNumber: 'PETTY-CASH-01',
      currency: 'QAR',
      openingBalance: 2500,
      currentBalance: 2500,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    }
  ];

  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>(() => {
    return loadScopedData('financialAccounts', DEFAULT_FINANCIAL_ACCOUNTS);
  });
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>(() => {
    return loadScopedData('financialTransactions', []);
  });
  const [financialAllocations, setFinancialAllocations] = useState<FinancialAllocation[]>(() => {
    return loadScopedData('financialAllocations', []);
  });
  const [journalEntries, setJournalEntries] = useState<FinancialJournalEntry[]>(() => {
    return loadScopedData('journalEntries', []);
  });

  // Backend persistence state & workshop masters
  const [backendStatus, setBackendStatus] = useState<'loading' | 'connected' | 'error' | 'config_error'>('loading');
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendStatusCode, setBackendStatusCode] = useState<number | null>(null);
  const [envConfigError, setEnvConfigError] = useState<string | null>(() => {
    const initialValidation = validateSupabaseEnv();
    if (!initialValidation.isConfigured && initialValidation.missingVariables.length > 0) {
      return `Configuration Error: Missing environment variables [${initialValidation.missingVariables.join(', ')}]. Please check your .env settings.`;
    }
    return null;
  });
  const [missingEnvVars, setMissingEnvVars] = useState<string[]>(() => {
    return validateSupabaseEnv().missingVariables;
  });
  const [envValidation, setEnvValidation] = useState<SupabaseEnvValidation | null>(() => {
    return validateSupabaseEnv();
  });
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [laborRates, setLaborRates] = useState<any[]>([]);
  const [paintCodes, setPaintCodes] = useState<any[]>([]);

  // Explicit runtime detection and logging for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  useEffect(() => {
    const rawViteUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL;
    const rawViteKey = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY;
    const urlStatus = rawViteUrl ? '✅ Detected (Injected)' : (typeof rawViteUrl === 'undefined' ? '❌ Undefined' : '⚠️ Empty String');
    const keyStatus = rawViteKey ? '✅ Detected (Injected)' : (typeof rawViteKey === 'undefined' ? '❌ Undefined' : '⚠️ Empty String');

    console.log(
      `%c[Deployment Env Check] VITE_SUPABASE_URL: ${urlStatus} | VITE_SUPABASE_ANON_KEY: ${keyStatus}`,
      'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
    );

    if (!rawViteUrl || !rawViteKey) {
      console.warn(
        '[Deployment Env Diagnostics] Environment variable injection status:',
        {
          VITE_SUPABASE_URL: {
            status: urlStatus,
            value: rawViteUrl ? `${rawViteUrl.slice(0, 15)}...` : rawViteUrl,
          },
          VITE_SUPABASE_ANON_KEY: {
            status: keyStatus,
            isSet: Boolean(rawViteKey),
          },
          allDetectedViteKeys: (import.meta as any)?.env ? Object.keys((import.meta as any).env).filter(k => k.startsWith('VITE_')) : [],
        }
      );
    }
  }, []);

  // Startup robust environment variable validation & developer logging
  useEffect(() => {
    const validation = validateSupabaseEnv();
    setEnvValidation(validation);
    setMissingEnvVars(validation.missingVariables);

    if (typeof console !== 'undefined') {
      const groupFn = console.groupCollapsed || console.log;
      groupFn('[Najm Al Huda ERP] Startup Environment & Cloud Configuration Audit');
      console.log('• import.meta.env.VITE_SUPABASE_URL:', (import.meta as any)?.env?.VITE_SUPABASE_URL !== undefined ? 'Accessible' : 'UNDEFINED');
      console.log('• import.meta.env.VITE_SUPABASE_ANON_KEY:', (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY !== undefined ? 'Accessible' : 'UNDEFINED');
      console.log('• Effective Endpoint:', validation.effectiveUrl);
      console.log('• Cloud Sync Status:', validation.isConfigured ? '✅ Active (Connected to Supabase)' : '⚠️ Unconfigured (Missing Required Keys)');

      if (!validation.isConfigured) {
        console.warn(
          '[Developer Alert] Missing required Supabase environment variables:',
          validation.missingVariables
        );
        console.warn(
          '[Configuration Instructions] To enable cloud synchronization, add these to your .env file or deployment platform:\n' +
          '  VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co\n' +
          '  VITE_SUPABASE_ANON_KEY=<your-anon-public-key>'
        );
      }
      if (console.groupEnd) {
        console.groupEnd();
      }
    }
  }, []);

  // Whenever activeCompanyId changes, reload that company's isolated dataset
  useEffect(() => {
    const defaultSettings = activeCompanyId === 'comp_new' ? NEW_COMPANY_SETTINGS : INITIAL_SETTINGS;
    const defaultJobs = INITIAL_JOB_CARDS;
    const defaultInv = INITIAL_INVENTORY;
    const defaultPo = INITIAL_PURCHASE_ORDERS;
    const defaultCs = INITIAL_COUNTER_SALES;
    const defaultInvcs = INITIAL_INVOICES;
    const defaultCust = INITIAL_CUSTOMERS_LEGACY;
    const defaultSupp = INITIAL_SUPPLIERS_LEGACY;
    const defaultVeh = INITIAL_VEHICLES_LEGACY;

    setSettings(loadScopedData('settings', defaultSettings));
    setJobCards(loadScopedData('jobCards', defaultJobs));
    setInventory(loadScopedData('inventory', defaultInv));
    setPurchaseOrders(loadScopedData('purchaseOrders', defaultPo));
    setCounterSales(loadScopedData('counterSales', defaultCs));
    setInvoices(loadScopedData('invoices', defaultInvcs));
    setCustomers(loadScopedData('customers', defaultCust));
    setSuppliers(loadScopedData('suppliers', defaultSupp));
    setVehicles(loadScopedData('vehicles', defaultVeh));
    setEstimates(loadScopedData('estimates', []));
    setStockMovements(loadScopedData('stockMovements', INITIAL_STOCK_MOVEMENTS));
    setScrapRates(loadScopedData('scrapRates', INITIAL_SCRAP_RATES));
    setScrapIntakes(loadScopedData('scrapIntakes', INITIAL_SCRAP_INTAKES));
    setScrapSales(loadScopedData('scrapSales', INITIAL_SCRAP_SALES));
    setExpenses(loadScopedData('expenses', INITIAL_EXPENSES));
    setWarranties(loadScopedData('warranties', INITIAL_WARRANTIES));
    setInsuranceClaims(loadScopedData('insuranceClaims', INITIAL_INSURANCE_CLAIMS));
    setAuditLogs(loadScopedData('auditLogs', INITIAL_AUDIT_LOGS));
    setFinancialAccounts(loadScopedData('financialAccounts', DEFAULT_FINANCIAL_ACCOUNTS));
    setFinancialTransactions(loadScopedData('financialTransactions', []));
    setFinancialAllocations(loadScopedData('financialAllocations', []));
    setJournalEntries(loadScopedData('journalEntries', []));
  }, [activeCompanyId]);

  const [isSupabaseConnectedState, setIsSupabaseConnectedState] = useState<boolean>(isSupabaseConfigured);

  const retryBackendConnection = useCallback(async () => {
    // 0. Only request protected ERP data if user is authenticated and verified
    if (!isAuthenticated || !currentUser) {
      setBackendStatus('connected');
      setBackendError(null);
      setBackendStatusCode(null);
      return;
    }

    setBackendStatus('loading');
    setBackendError(null);
    setBackendStatusCode(null);

    // Re-validate environment variables during connection attempt
    const validation = validateSupabaseEnv();
    setEnvValidation(validation);
    setMissingEnvVars(validation.missingVariables);

    let backendSuccess = false;
    let backendErrorObj: any = null;

    // 1. Primary backend persistence bootstrap (Supabase PostgreSQL via Backend API)
    try {
      const bootstrap = await api.getBootstrap(activeCompanyId);
      if (bootstrap) {
        backendSuccess = true;

        if (Array.isArray(bootstrap.customers)) {
          setCustomers(bootstrap.customers);
        }
        if (Array.isArray(bootstrap.vehicles)) {
          setVehicles(bootstrap.vehicles);
        }
        if (Array.isArray(bootstrap.inventory)) {
          setInventory(bootstrap.inventory);
        }
        if (Array.isArray(bootstrap.suppliers)) {
          setSuppliers(bootstrap.suppliers);
        }
        if (Array.isArray(bootstrap.jobCards)) {
          setJobCards(bootstrap.jobCards);
        }
        if (Array.isArray(bootstrap.invoices)) {
          setInvoices(bootstrap.invoices);
        }
        if (Array.isArray(bootstrap.estimates)) setEstimates(bootstrap.estimates);
        if (Array.isArray(bootstrap.purchaseOrders)) setPurchaseOrders(bootstrap.purchaseOrders);
        if (Array.isArray(bootstrap.counterSales)) setCounterSales(bootstrap.counterSales);
        if (Array.isArray(bootstrap.scrapRates)) setScrapRates(bootstrap.scrapRates);
        if (Array.isArray(bootstrap.scrapIntakes)) setScrapIntakes(bootstrap.scrapIntakes);
        if (Array.isArray(bootstrap.scrapSales)) setScrapSales(bootstrap.scrapSales);
        if (Array.isArray(bootstrap.stockMovements)) setStockMovements(bootstrap.stockMovements);
        if (Array.isArray(bootstrap.auditLogs)) setAuditLogs(bootstrap.auditLogs);
        if (Array.isArray(bootstrap.technicians)) setTechnicians(bootstrap.technicians);
        if (Array.isArray(bootstrap.laborRates)) setLaborRates(bootstrap.laborRates);
        if (Array.isArray(bootstrap.paintCodes)) setPaintCodes(bootstrap.paintCodes);
        if (Array.isArray(bootstrap.financialAccounts) && bootstrap.financialAccounts.length > 0) {
          setFinancialAccounts(bootstrap.financialAccounts);
        }
        if (Array.isArray(bootstrap.financialTransactions)) {
          setFinancialTransactions(bootstrap.financialTransactions);
        }
        if (Array.isArray(bootstrap.financialAllocations)) {
          setFinancialAllocations(bootstrap.financialAllocations);
        }
        if (Array.isArray(bootstrap.journalEntries)) {
          setJournalEntries(bootstrap.journalEntries);
        }
        if (bootstrap.settings) setSettings(bootstrap.settings);
      }
    } catch (err: any) {
      backendErrorObj = err;
      console.warn('[GarageContext] Primary backend bootstrap notice:', err?.message || err);
      if (err?.status === 401 || err?.statusCode === 401) {
        // Protected route session expired or unauthenticated
        setBackendStatus('connected');
        setBackendError(null);
        setBackendStatusCode(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('najm:auth-expired', { detail: { endpoint: '/bootstrap', status: 401 } }));
        }
        return;
      }
    }

    // 2. Synchronize with Supabase if configured (merge non-destructively so backend records are never erased)
    let supabaseSuccess = false;
    if (validation.isConfigured) {
      try {
        const syncResult = await syncAllFromSupabase();
        if (syncResult.success) {
          supabaseSuccess = true;
          setIsSupabaseConnectedState(true);
          if (syncResult.customers && syncResult.customers.length > 0) {
            setCustomers(prev => {
              const map = new Map<string, any>();
              prev.forEach(item => map.set(item.id, item));
              syncResult.customers!.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
              return Array.from(map.values());
            });
          }
          if (syncResult.vehicles && syncResult.vehicles.length > 0) {
            setVehicles(prev => {
              const map = new Map<string, any>();
              prev.forEach(item => map.set(item.id, item));
              syncResult.vehicles!.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
              return Array.from(map.values());
            });
          }
          if (syncResult.suppliers && syncResult.suppliers.length > 0) {
            setSuppliers(prev => {
              const map = new Map<string, any>();
              prev.forEach(item => map.set(item.id, item));
              syncResult.suppliers!.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
              return Array.from(map.values());
            });
          }
          if (syncResult.inventory && syncResult.inventory.length > 0) {
            setInventory(prev => {
              const map = new Map<string, any>();
              prev.forEach(item => map.set(item.id, item));
              syncResult.inventory!.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
              return Array.from(map.values());
            });
          }
          if (syncResult.jobCards && syncResult.jobCards.length > 0) {
            setJobCards(prev => {
              const map = new Map<string, any>();
              prev.forEach(item => map.set(item.id, item));
              syncResult.jobCards!.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
              return Array.from(map.values());
            });
          }
          if (syncResult.invoices && syncResult.invoices.length > 0) {
            setInvoices(prev => {
              const map = new Map<string, any>();
              prev.forEach(item => map.set(item.id, item));
              syncResult.invoices!.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
              return Array.from(map.values());
            });
          }
        } else {
          setIsSupabaseConnectedState(false);
          console.log('[GarageContext] Supabase sync status:', syncResult.error || 'offline');
        }
      } catch (sbErr: any) {
        setIsSupabaseConnectedState(false);
        console.log('[GarageContext] Supabase remote sync notice:', sbErr?.message || sbErr);
      }
    }

    // 3. Update status: Determine if backend, Supabase, or missing environment variables
    if (backendSuccess || supabaseSuccess) {
      setBackendStatus('connected');
      setBackendError(null);
      setBackendStatusCode(200);
      if (!validation.isConfigured && validation.missingVariables.length > 0) {
        setEnvConfigError(
          `Configuration Notice: Missing ${validation.missingVariables.join(', ')}. Configure SUPABASE_URL and SUPABASE_ANON_KEY in your environment.`
        );
      } else {
        setEnvConfigError(null);
      }
    } else {
      const statusCode = typeof backendErrorObj?.status === 'number'
        ? backendErrorObj.status
        : (backendErrorObj?.statusCode || null);

      if (!validation.isConfigured && validation.missingVariables.length > 0) {
        // Explicitly inform the developer of missing required Supabase environment keys
        const configErrorMsg = `Configuration Error: Missing required environment variables [${validation.missingVariables.join(', ')}]. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment configuration to enable cloud synchronization.`;
        setBackendStatus('config_error');
        setBackendStatusCode(statusCode);
        setBackendError(configErrorMsg);
        setEnvConfigError(configErrorMsg);
      } else {
        const specificError = backendErrorObj?.message || (typeof backendErrorObj === 'string' ? backendErrorObj : 'Cannot reach backend ERP persistence server');
        setBackendStatus('error');
        setBackendStatusCode(statusCode);
        setBackendError(specificError);
      }
    }
  }, [isAuthenticated, currentUser]);

  const refreshJobCards = useCallback(async () => {
    if (!isAuthenticated || !currentUser) return;
    try {
      const res = await api.getJobCards(activeCompanyId);
      if (res?.success && Array.isArray(res.jobCards)) {
        setJobCards(prev => {
          const map = new Map<string, JobCard>();
          // 1. Authoritative backend rows
          res.jobCards.forEach(card => map.set(card.id, card));
          // 2. Keep recent optimistic cards that may be in-flight
          prev.forEach(card => {
            if (!map.has(card.id) && card.id.startsWith('jc-')) {
              const cardTimestamp = parseInt(card.id.replace('jc-', ''), 10);
              if (!isNaN(cardTimestamp) && Date.now() - cardTimestamp < 20000) {
                map.set(card.id, card);
              }
            }
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(`${LS_BASE}${activeCompanyId}_jobCards`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (err: any) {
      console.warn('[GarageContext] refreshJobCards notice:', err?.message || err);
    }
  }, [isAuthenticated, currentUser, activeCompanyId]);

  // Real-time Multi-Device Sync: Periodic poll & re-sync on tab focus/visibility
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    // Periodic poll for updates created on other devices (every 12 seconds)
    const syncTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshJobCards();
      }
    }, 12000);

    // Instant sync on tab focus or visibility
    const handleFocus = () => {
      refreshJobCards();
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshJobCards();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(syncTimer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, currentUser, refreshJobCards]);

  // Only synchronize protected ERP data when the user is verified and authenticated
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && currentUser) {
      retryBackendConnection();
    } else if (!isAuthenticated || !currentUser) {
      setBackendStatus('connected');
      setBackendError(null);
      setBackendStatusCode(null);
    }
  }, [isAuthLoading, isAuthenticated, currentUser, retryBackendConnection]);

  // Persist each collection to its own company namespace
  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_settings`, JSON.stringify(settings));
  }, [settings, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_jobCards`, JSON.stringify(jobCards));
  }, [jobCards, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_inventory`, JSON.stringify(inventory));
  }, [inventory, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_stockMovements`, JSON.stringify(stockMovements));
  }, [stockMovements, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_purchaseOrders`, JSON.stringify(purchaseOrders));
  }, [purchaseOrders, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_scrapRates`, JSON.stringify(scrapRates));
  }, [scrapRates, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_scrapIntakes`, JSON.stringify(scrapIntakes));
  }, [scrapIntakes, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_scrapSales`, JSON.stringify(scrapSales));
  }, [scrapSales, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_counterSales`, JSON.stringify(counterSales));
  }, [counterSales, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_invoices`, JSON.stringify(invoices));
  }, [invoices, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_customers`, JSON.stringify(customers));
  }, [customers, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_suppliers`, JSON.stringify(suppliers));
  }, [suppliers, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_vehicles`, JSON.stringify(vehicles));
  }, [vehicles, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_estimates`, JSON.stringify(estimates));
  }, [estimates, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_expenses`, JSON.stringify(expenses));
  }, [expenses, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_warranties`, JSON.stringify(warranties));
  }, [warranties, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_insuranceClaims`, JSON.stringify(insuranceClaims));
  }, [insuranceClaims, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`${LS_BASE}${activeCompanyId}_auditLogs`, JSON.stringify(auditLogs));
  }, [auditLogs, activeCompanyId]);

  // Switch company function
  const switchCompany = (companyId: string) => {
    if (companies.some(c => c.id === companyId)) {
      setActiveCompanyId(companyId);
    }
  };

  // Create new company from zero
  const createCompany = (companyData: Omit<CompanyProfile, 'id' | 'createdAt'>): CompanyProfile => {
    const id = `comp_${Date.now()}`;
    const newComp: CompanyProfile = {
      ...companyData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      isArchive: false,
    };

    // Initialize blank data in localStorage
    const freshSettings: GarageSettings = {
      garageName: newComp.name,
      garageNameAr: newComp.nameAr || '',
      tagline: newComp.tagline || 'Automotive Workshop ERP',
      address: newComp.address || 'Street 24, Industrial Area',
      cityStateZip: newComp.cityStateZip || 'Doha, State of Qatar',
      country: newComp.country || 'Qatar',
      crNumber: newComp.crNumber || 'CR No. 2026/001',
      phone: newComp.phone || '+974 4400 0000',
      email: newComp.email || 'info@workshop.qa',
      taxId: newComp.taxId || 'GTA Tax Card: 2026-QA-001',
      currencySymbol: newComp.currencySymbol || 'QAR',
      taxRatePercent: 0,
      defaultLaborRate: 150,
      paintBoothHourRate: 200,
    };

    localStorage.setItem(`${LS_BASE}${id}_settings`, JSON.stringify(freshSettings));
    localStorage.setItem(`${LS_BASE}${id}_jobCards`, JSON.stringify([]));
    localStorage.setItem(`${LS_BASE}${id}_inventory`, JSON.stringify([]));
    localStorage.setItem(`${LS_BASE}${id}_purchaseOrders`, JSON.stringify([]));
    localStorage.setItem(`${LS_BASE}${id}_counterSales`, JSON.stringify([]));
    localStorage.setItem(`${LS_BASE}${id}_invoices`, JSON.stringify([]));
    localStorage.setItem(`${LS_BASE}${id}_customers`, JSON.stringify([]));
    localStorage.setItem(`${LS_BASE}${id}_suppliers`, JSON.stringify([]));
    localStorage.setItem(`${LS_BASE}${id}_vehicles`, JSON.stringify([]));
    localStorage.setItem(`${LS_BASE}${id}_estimates`, JSON.stringify([]));

    setCompanies(prev => [...prev, newComp]);
    setActiveCompanyId(id);
    return newComp;
  };

  // Permanently delete a company and its entire dataset
  const deleteCompany = (companyId: string) => {
    if (companies.length <= 1) {
      alert('Cannot delete the only remaining active company.');
      return;
    }

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${LS_BASE}${companyId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Error removing company keys:', e);
    }

    const updatedCompanies = companies.filter(c => c.id !== companyId);
    setCompanies(updatedCompanies);
    localStorage.setItem(`${LS_BASE}companies_list`, JSON.stringify(updatedCompanies));

    if (activeCompanyId === companyId) {
      const nextComp = updatedCompanies[0];
      setActiveCompanyId(nextComp.id);
    }
  };
  const resetCompanyData = async (_targetCompanyId?: string) => {
    try {
      await api.resetDemoData('RESET_NAJM_DEMO_DATA');
      const bootstrap = await api.getBootstrap();
      if (bootstrap) {
        if (bootstrap.customers) setCustomers(bootstrap.customers);
        if (bootstrap.vehicles) setVehicles(bootstrap.vehicles);
        if (bootstrap.inventory) setInventory(bootstrap.inventory);
        if (bootstrap.suppliers) setSuppliers(bootstrap.suppliers);
        if (bootstrap.jobCards) setJobCards(bootstrap.jobCards);
        if (bootstrap.invoices) setInvoices(bootstrap.invoices);
        if (bootstrap.estimates) setEstimates(bootstrap.estimates);
        if (bootstrap.purchaseOrders) setPurchaseOrders(bootstrap.purchaseOrders);
        if (bootstrap.scrapRates) setScrapRates(bootstrap.scrapRates);
        if (bootstrap.settings) setSettings(bootstrap.settings);
        if (bootstrap.stockMovements) setStockMovements(bootstrap.stockMovements);
        if (bootstrap.auditLogs) setAuditLogs(bootstrap.auditLogs);
      }
    } catch (err) {
      console.error('Failed to reset demo data safely:', err);
    }
  };

  const resetToDefaults = () => {
    resetCompanyData(activeCompanyId);
  };

  const updateSettings = (updates: Partial<GarageSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const createJobCard = async (cardData: Omit<JobCard, 'id' | 'jobNumber'> & { jobNumber?: string; companyId?: string }): Promise<JobCard> => {
    // If jobNumber is passed from caller / backend preview, use it, else calculate compliant fallback sequence
    let jobNumber = cardData.jobNumber;
    if (!jobNumber) {
      const existingMax = jobCards.reduce((max, jc) => {
        const m = jc.jobNumber?.match(/^JC-?(\d+)$/i) || jc.jobNumber?.match(/^JC-\d{4}-(\d+)$/i);
        if (m) {
          const num = parseInt(m[m.length - 1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      jobNumber = `JC-${String(existingMax + 1).padStart(4, '0')}`;
    }

    const resolvedParts = Array.isArray(cardData.partsUsed) && cardData.partsUsed.length > 0
      ? cardData.partsUsed
      : (Array.isArray((cardData as any).parts) && (cardData as any).parts.length > 0
        ? (cardData as any).parts
        : (Array.isArray((cardData as any).requisitions) ? (cardData as any).requisitions : []));

    const resolvedLabor = Array.isArray(cardData.mechanicalTasks) && cardData.mechanicalTasks.length > 0
      ? cardData.mechanicalTasks
      : (Array.isArray((cardData as any).labor) && (cardData as any).labor.length > 0
        ? (cardData as any).labor
        : (Array.isArray((cardData as any).tasks) ? (cardData as any).tasks : []));

    let newCard: JobCard = {
      status: 'Draft',
      ...cardData,
      id: `jc-${Date.now()}`,
      jobNumber,
      companyId: (cardData as any).companyId || activeCompanyId || 'comp-1',
      partsUsed: resolvedParts,
      parts: resolvedParts,
      requisitions: resolvedParts,
      mechanicalTasks: resolvedLabor,
      labor: resolvedLabor,
    } as JobCard;

    // Deduct parts used from inventory
    if (newCard.partsUsed && newCard.partsUsed.length > 0) {
      setInventory(prevInv => {
        return prevInv.map(invItem => {
          const used = newCard.partsUsed.find(p => p.inventoryId === invItem.id || p.sku === invItem.sku);
          if (used) {
            return {
              ...invItem,
              quantityOnHand: Math.max(0, invItem.quantityOnHand - used.quantity),
            };
          }
          return invItem;
        });
      });
    }

    // Persist to backend database first
    try {
      const res = await api.createJobCard(newCard);
      if (res?.jobCard) {
        newCard = { ...newCard, ...res.jobCard };
      }
      if (res?.jobNumber && res.jobNumber !== newCard.jobNumber) {
        newCard = { ...newCard, jobNumber: res.jobNumber };
      }
    } catch (e: any) {
      console.warn('Backend createJobCard notice:', e?.message || e);
      if (e?.status === 401 || e?.status === 403) {
        throw new Error(e?.message || 'Authentication error: please ensure you are logged in to save job cards.');
      }
    }

    // Update local state with the confirmed card
    setJobCards(prev => [newCard, ...prev.filter(c => c.id !== newCard.id && c.jobNumber !== newCard.jobNumber)]);

    // Synchronize to Supabase if configured
    upsertJobCardToSupabase(newCard).catch(e => console.warn('Supabase job card sync notice:', e));

    return newCard;
  };

  const updateJobCard = async (id: string, updates: Partial<JobCard>) => {
    let targetCard: JobCard | undefined;
    setJobCards(prev => {
      const updated = prev.map(jc => {
        if (jc.id !== id) return jc;

        const mergedParts = updates.partsUsed !== undefined
          ? updates.partsUsed
          : (updates.parts !== undefined
            ? updates.parts
            : ((updates as any).requisitions !== undefined
              ? (updates as any).requisitions
              : jc.partsUsed || (jc as any).parts || (jc as any).requisitions || []));

        const mergedLabor = updates.mechanicalTasks !== undefined
          ? updates.mechanicalTasks
          : (updates.labor !== undefined
            ? updates.labor
            : ((updates as any).tasks !== undefined
              ? (updates as any).tasks
              : jc.mechanicalTasks || (jc as any).labor || (jc as any).tasks || []));

        return {
          ...jc,
          ...updates,
          partsUsed: mergedParts,
          parts: mergedParts,
          requisitions: mergedParts,
          mechanicalTasks: mergedLabor,
          labor: mergedLabor,
        };
      });
      targetCard = updated.find(jc => jc.id === id);
      return updated;
    });

    if (targetCard) {
      try {
        const res = await api.updateJobCard(id, targetCard);
        if (res?.jobCard) {
          setJobCards(p => p.map(c => c.id === id ? { ...c, ...res.jobCard } : c));
        }
      } catch (e: any) {
        console.warn('Backend updateJobCard notice:', e?.message || e);
        if (e?.status === 401 || e?.status === 403) {
          throw new Error(e?.message || 'Authentication error: please ensure you are logged in to update job cards.');
        }
      }
      upsertJobCardToSupabase(targetCard).catch(e => console.warn('Supabase job card sync notice:', e));

      // If job card has a linked invoice and amounts changed, keep invoice in sync
      if (targetCard.invoiceId || targetCard.jobNumber) {
        setInvoices(invs => invs.map(inv => {
          if ((inv.jobCardId === targetCard!.id || inv.jobCardNumber === targetCard!.jobNumber || (targetCard!.invoiceId && inv.id === targetCard!.invoiceId)) && inv.paymentStatus !== 'Paid') {
            const newGrandTotal = targetCard!.totalAmount;
            const newBalance = Math.max(0, newGrandTotal - (inv.paidAmount || 0));
            const synced = {
              ...inv,
              partsTotal: targetCard!.partsCost,
              mechanicalLaborTotal: targetCard!.mechanicalLaborCost,
              grandTotal: newGrandTotal,
              balanceAmount: newBalance,
            };
            api.updateInvoice(inv.id, synced).catch(() => {});
            return synced;
          }
          return inv;
        }));
      }
    }
  };

  const deleteJobCard = (id: string) => {
    setJobCards(prev => prev.filter(jc => jc.id !== id));
    api.deleteJobCard(id).catch(e => console.warn('Backend deleteJobCard notice:', e));
    deleteJobCardFromSupabase(id);
  };

  const advanceJobCardStatus = (id: string, status: JobStatus, notes?: string) => {
    setJobCards(prev => {
      const updated = prev.map(jc => {
        if (jc.id === id) {
          const newHistoryEntry: JobStatusHistoryEntry = {
            id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            status,
            changedBy: 'Supervisor / Staff',
            timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
            notes: notes || `Moved to ${status}`,
          };

          const updates: Partial<JobCard> = { 
            status,
            statusHistory: [...(jc.statusHistory || []), newHistoryEntry]
          };

          if (status === 'Delivered' || status === 'Ready' || status === 'Ready for Pickup' || status === 'Closed') {
            updates.completedDate = new Date().toISOString().split('T')[0];
          }

          return { ...jc, ...updates };
        }
        return jc;
      });
      const target = updated.find(jc => jc.id === id);
      if (target) {
        api.advanceJobStatus(id, status, notes).catch(e => console.warn('Backend advanceJobStatus notice:', e));
        upsertJobCardToSupabase(target);
      }
      return updated;
    });
  };

  const addInventoryItem = (itemData: Omit<InventoryItem, 'id'>): InventoryItem => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`,
    } as InventoryItem;
    setInventory(prev => [newItem, ...prev]);
    api.createInventoryItem(newItem).catch(e => console.warn('Backend createInventoryItem notice:', e));
    upsertInventoryToSupabase(newItem);
    return newItem;
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => {
      const updated = prev.map(item => (item.id === id ? { ...item, ...updates } : item));
      const target = updated.find(item => item.id === id);
      if (target) upsertInventoryToSupabase(target);
      return updated;
    });
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
    deleteInventoryFromSupabase(id);
  };

  const adjustStock = (id: string, deltaQuantity: number, _reason?: string) => {
    api.adjustStock(id, deltaQuantity, undefined, _reason).catch(e => console.warn('Backend adjustStock notice:', e));
    setInventory(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            quantityOnHand: Math.max(0, item.quantityOnHand + deltaQuantity),
            lastRestockedDate: deltaQuantity > 0 ? new Date().toISOString().split('T')[0] : item.lastRestockedDate,
          };
        }
        return item;
      });
      const target = updated.find(item => item.id === id);
      if (target) upsertInventoryToSupabase(target);
      return updated;
    });
  };

  const issueMaterialToJobCard = (
    jobCardId: string,
    item: InventoryItem,
    quantity: number,
    _technicianName?: string
  ) => {
    // 1. Deduct stock from inventory
    setInventory(prev =>
      prev.map(inv =>
        inv.id === item.id
          ? {
              ...inv,
              quantityOnHand: Math.max(0, inv.quantityOnHand - quantity),
            }
          : inv
      )
    );

    // 2. Add to JobCard partsUsed and recalculate total
    setJobCards(prev =>
      prev.map(jc => {
        if (jc.id !== jobCardId) return jc;

        const existingPartIndex = (jc.partsUsed || []).findIndex(
          p => p.inventoryId === item.id || p.sku === item.sku
        );

        let updatedParts = [...(jc.partsUsed || [])];
        if (existingPartIndex >= 0) {
          const existing = updatedParts[existingPartIndex];
          const newQty = existing.quantity + quantity;
          updatedParts[existingPartIndex] = {
            ...existing,
            quantity: newQty,
            total: newQty * existing.unitPrice,
          };
        } else {
          updatedParts.push({
            id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            partId: item.id,
            inventoryId: item.id,
            sku: item.sku,
            name: item.name,
            quantity,
            unitPrice: item.sellingPrice,
            total: quantity * item.sellingPrice,
          });
        }

        const newPartsCost = updatedParts.reduce((sum, p) => sum + (p.total || 0), 0);
        const subtotal =
          (jc.mechanicalLaborCost || 0) +
          (jc.dentingLaborCost || 0) +
          (jc.paintingCost || 0) +
          (jc.paintBoothCharge || 0) +
          newPartsCost +
          (jc.consumablesCost || 0) -
          (jc.discount || 0);

        const totalAmount = Number(Math.max(0, subtotal).toFixed(2));

        return {
          ...jc,
          partsUsed: updatedParts,
          partsCost: newPartsCost,
          totalAmount,
        };
      })
    );

    api.issuePartsToJob(jobCardId, item.id, quantity, _technicianName).catch(e => console.warn('Backend issueParts notice:', e));
  };

  const returnMaterialFromJobCard = (
    jobCardId: string,
    partIdOrSku: string,
    returnQty: number,
    _reason?: string
  ) => {
    // 1. Find the target job card and part
    const jc = jobCards.find(c => c.id === jobCardId);
    if (!jc) return;

    const part = (jc.partsUsed || []).find(p => p.id === partIdOrSku || p.sku === partIdOrSku);
    if (!part) return;

    api.returnPartsFromJob(jobCardId, part.id, returnQty, _reason).catch(e => console.warn('Backend returnParts notice:', e));

    // 2. Restock inventory
    setInventory(prev =>
      prev.map(inv => {
        if (inv.id === part.inventoryId || inv.sku === part.sku) {
          return {
            ...inv,
            quantityOnHand: inv.quantityOnHand + returnQty,
          };
        }
        return inv;
      })
    );

    // 3. Update job card partsUsed
    setJobCards(prev =>
      prev.map(c => {
        if (c.id !== jobCardId) return c;

        const updatedParts = (c.partsUsed || [])
          .map(p => {
            if (p.id === partIdOrSku || p.sku === partIdOrSku) {
              const remainingQty = Math.max(0, p.quantity - returnQty);
              return {
                ...p,
                quantity: remainingQty,
                total: remainingQty * p.unitPrice,
              };
            }
            return p;
          })
          .filter(p => p.quantity > 0);

        const newPartsCost = updatedParts.reduce((sum, p) => sum + (p.total || 0), 0);
        const subtotal =
          (c.mechanicalLaborCost || 0) +
          (c.dentingLaborCost || 0) +
          (c.paintingCost || 0) +
          (c.paintBoothCharge || 0) +
          newPartsCost +
          (c.consumablesCost || 0) -
          (c.discount || 0);

        const taxRate = 0;
        const totalAmount = Number(Math.max(0, subtotal).toFixed(2));

        return {
          ...c,
          partsUsed: updatedParts,
          partsCost: newPartsCost,
          totalAmount,
        };
      })
    );
  };

  const createPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'poNumber'> & { poNumber?: string }): PurchaseOrder => {
    let poNumber = poData.poNumber;
    if (!poNumber) {
      const existingMax = purchaseOrders.reduce((max, po) => {
        const m = po.poNumber?.match(/^PO-?(\d+)$/i) || po.poNumber?.match(/^PO-\d{4}-(\d+)$/i);
        if (m) {
          const num = parseInt(m[m.length - 1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      poNumber = `PO-${String(existingMax + 1).padStart(4, '0')}`;
    }

    const newPo: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber,
    };
    setPurchaseOrders(prev => [newPo, ...prev]);
    api.createPurchaseOrder(newPo).then(res => {
      if (res?.poNumber && res.poNumber !== newPo.poNumber) {
        setPurchaseOrders(prev => prev.map(p => p.id === newPo.id ? { ...p, poNumber: res.poNumber } : p));
      }
    }).catch(e => console.warn('Backend createPurchaseOrder notice:', e));
    return newPo;
  };

  const updatePurchaseOrderStatus = (id: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders(prev =>
      prev.map(po => {
        if (po.id === id) {
          if (status === 'Received' && po.status !== 'Received') {
            api.receivePO(id).catch(e => console.warn('Backend receivePO notice:', e));
            setInventory(prevInv => {
              return prevInv.map(invItem => {
                const poItem = po.items.find(i => i.partId === invItem.id || i.sku === invItem.sku);
                if (poItem) {
                  return {
                    ...invItem,
                    quantityOnHand: invItem.quantityOnHand + poItem.quantity,
                    lastRestockedDate: new Date().toISOString().split('T')[0],
                  };
                }
                return invItem;
              });
            });
          }
          return { ...po, status };
        }
        return po;
      })
    );
  };

  const createCounterSale = (saleData: Omit<CounterSale, 'id' | 'saleNumber'> & { saleNumber?: string }): CounterSale => {
    let saleNumber = saleData.saleNumber;
    if (!saleNumber) {
      const existingMax = counterSales.reduce((max, cs) => {
        const m = cs.saleNumber?.match(/^CS-?(\d+)$/i) || cs.saleNumber?.match(/^CS-\d{4}-(\d+)$/i);
        if (m) {
          const num = parseInt(m[m.length - 1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      saleNumber = `CS-${String(existingMax + 1).padStart(4, '0')}`;
    }

    const newSale: CounterSale = {
      ...saleData,
      id: `cs-${Date.now()}`,
      saleNumber,
    };

    setInventory(prevInv => {
      return prevInv.map(invItem => {
        const soldItem = newSale.items.find(i => i.partId === invItem.id || i.sku === invItem.sku);
        if (soldItem) {
          return {
            ...invItem,
            quantityOnHand: Math.max(0, invItem.quantityOnHand - soldItem.quantity),
          };
        }
        return invItem;
      });
    });

    setCounterSales(prev => [newSale, ...prev]);
    api.createCounterSale(newSale).then(res => {
      if (res?.saleNumber && res.saleNumber !== newSale.saleNumber) {
        setCounterSales(prev => prev.map(cs => cs.id === newSale.id ? { ...cs, saleNumber: res.saleNumber } : cs));
      }
    }).catch(e => console.warn('Backend createCounterSale notice:', e));
    return newSale;
  };

  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber'> & { invoiceNumber?: string }): Invoice => {
    let invoiceNumber = invoiceData.invoiceNumber;
    if (!invoiceNumber) {
      const year = new Date().getFullYear();
      const existingMax = invoices.reduce((max, inv) => {
        const m = inv.invoiceNumber?.match(/^INV-(\d{4})-(\d+)$/);
        if (m && parseInt(m[1], 10) === year) {
          const num = parseInt(m[2], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      invoiceNumber = `INV-${year}-${String(existingMax + 1).padStart(4, '0')}`;
    }

    const newInvoice: Invoice = {
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      subtotal: 0,
      grandTotal: 0,
      paidAmount: 0,
      balanceAmount: 0,
      ...invoiceData,
      id: `inv-${Date.now()}`,
      invoiceNumber,
    } as Invoice;
    setInvoices(prev => [newInvoice, ...prev]);
    api.createInvoice(newInvoice).then(res => {
      if (res?.invoiceNumber && res.invoiceNumber !== newInvoice.invoiceNumber) {
        setInvoices(prev => prev.map(inv => inv.id === newInvoice.id ? { ...inv, invoiceNumber: res.invoiceNumber } : inv));
      }
    }).catch(e => console.warn('Backend createInvoice notice:', e));
    upsertInvoiceToSupabase(newInvoice);
    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => {
      const updated = prev.map(inv => (inv.id === id ? { ...inv, ...updates } : inv));
      const target = updated.find(inv => inv.id === id);
      if (target) {
        upsertInvoiceToSupabase(target);
        api.updateInvoice(id, target).catch(e => console.warn('Backend updateInvoice notice:', e));
      }
      return updated;
    });
  };

  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    deleteInvoiceFromSupabase(id);
    api.deleteInvoice(id).catch(err => console.warn('[GarageContext] Invoice API delete notice:', err));
  };

  const generateInvoiceFromJobCard = (jobCardId: string): Invoice | null => {
    const card = jobCards.find(jc => jc.id === jobCardId || jc.jobNumber === jobCardId);
    if (!card) return null;

    const cardJobNo = (card.jobNumber || '').trim().toLowerCase();
    const existing = invoices.find(
      inv => inv.jobCardId === card.id || 
             (cardJobNo && (inv.jobCardNumber || '').trim().toLowerCase() === cardJobNo) ||
             (card.invoiceId && inv.id === card.invoiceId)
    );
    if (existing) {
      return existing;
    }

    const grandTotal = card.totalAmount;
    const balanceAmount = grandTotal;
    const year = new Date().getFullYear();
    const existingMax = invoices.reduce((max, inv) => {
      const m = inv.invoiceNumber?.match(/^INV-(\d{4})-(\d+)$/);
      if (m && parseInt(m[1], 10) === year) {
        const num = parseInt(m[2], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const invoiceNumber = `INV-${year}-${String(existingMax + 1).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      jobCardId: card.id,
      jobCardNumber: card.jobNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      
      customerName: card.customer.name,
      customerPhone: card.customer.phone,
      customerEmail: card.customer.email,
      customerAddress: card.customer.address,
      
      vehiclePlate: card.vehicle.plateNumber,
      vehicleModel: `${card.vehicle.year} ${card.vehicle.make} ${card.vehicle.model}`,
      odometer: card.vehicle.odometer,
      
      mechanicalLaborTotal: card.mechanicalLaborCost,
      dentingLaborTotal: card.dentingLaborCost,
      paintingTotal: card.paintingCost + card.paintBoothCharge,
      partsTotal: card.partsCost,
      consumablesTotal: card.consumablesCost,
      
      subtotal: card.mechanicalLaborCost + card.dentingLaborCost + card.paintingCost + card.paintBoothCharge + card.partsCost + card.consumablesCost,
      discount: card.discount,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal,
      
      paidAmount: 0,
      balanceAmount,
      paymentStatus: 'Unpaid',
      payments: [],
      notes: `Generated from Work Order ${card.jobNumber}. Vehicle: ${card.vehicle.plateNumber}`,
    };

    setInvoices(prev => [newInvoice, ...prev]);
    api.createInvoice(newInvoice).then(res => {
      if (res?.invoiceNumber && res.invoiceNumber !== newInvoice.invoiceNumber) {
        setInvoices(prev => prev.map(inv => inv.id === newInvoice.id ? { ...inv, invoiceNumber: res.invoiceNumber } : inv));
      }
    }).catch(e => console.warn('Backend createInvoice notice:', e));
    updateJobCard(card.id, { invoiceId: newInvoice.id });
    upsertInvoiceToSupabase(newInvoice);
    return newInvoice;
  };

  const closeAndInvoiceJobCard = async (jobCardId: string, cardData?: any): Promise<{ success: boolean; invoice?: Invoice; invoiceId?: string; invoiceNumber?: string; message?: string }> => {
    try {
      const card = jobCards.find(jc => jc.id === jobCardId || jc.jobNumber === jobCardId);
      const payload = cardData || card || {};

      try {
        const res = await api.closeAndInvoiceJobCard(jobCardId, payload);
        if (res && res.success && res.invoice) {
          const inv = res.invoice;

          setInvoices(prev => {
            const exists = prev.some(i => i.id === inv.id || i.invoiceNumber === inv.invoiceNumber);
            if (exists) {
              return prev.map(i => (i.id === inv.id || i.invoiceNumber === inv.invoiceNumber) ? inv : i);
            }
            return [inv, ...prev];
          });

          setJobCards(prev => prev.map(jc => (jc.id === jobCardId || jc.jobNumber === jobCardId) ? {
            ...jc,
            ...(cardData || {}),
            status: 'Closed',
            invoiceId: inv.id
          } : jc));

          upsertInvoiceToSupabase(inv);
          return {
            success: true,
            invoice: inv,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            message: res.message || `Job Card ${card?.jobNumber || ''} closed and Invoice ${inv.invoiceNumber} created.`
          };
        }
      } catch (apiErr) {
        console.warn('[GarageContext] Backend closeAndInvoiceJobCard request notice, executing client fallback:', apiErr);
      }

      // Fallback: If backend is unreachable or returned non-success, proceed with client state update & Supabase sync
      const targetCard = card || (cardData as JobCard);
      if (!targetCard) {
        throw new Error('Job Card not found to close and invoice');
      }

      let inv = targetCard.invoiceId ? invoices.find(i => i.id === targetCard.invoiceId) : undefined;
      if (!inv) {
        inv = generateInvoiceFromJobCard(targetCard.id) || undefined;
      }

      setJobCards(prev => prev.map(jc => (jc.id === targetCard.id || jc.jobNumber === targetCard.jobNumber) ? {
        ...jc,
        ...(cardData || {}),
        status: 'Closed',
        invoiceId: inv?.id || jc.invoiceId
      } : jc));

      return {
        success: true,
        invoice: inv,
        invoiceId: inv?.id,
        invoiceNumber: inv?.invoiceNumber,
        message: `Job Card ${targetCard.jobNumber || targetCard.id} closed and Invoice ${inv?.invoiceNumber || ''} created.`
      };
    } catch (err: any) {
      console.error('[GarageContext] closeAndInvoiceJobCard error:', err);
      throw err;
    }
  };

  const recordPayment = (invoiceId: string, payment: Omit<PaymentRecord, 'id' | 'date'>) => {
    api.recordPayment(invoiceId, payment.amount, payment.method, payment.reference).catch(e => console.warn('Backend recordPayment notice:', e));
    setInvoices(prev => {
      const updated = prev.map(inv => {
        if (inv.id === invoiceId) {
          const newPayment: PaymentRecord = {
            ...payment,
            id: `pay-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
          };
          const newPaidAmount = (inv.paidAmount || 0) + payment.amount;
          const newBalance = Math.max(0, inv.grandTotal - newPaidAmount);
          const paymentStatus = newBalance === 0 ? 'Paid' : newPaidAmount > 0 ? 'Partial' : 'Unpaid';

          return {
            ...inv,
            paidAmount: newPaidAmount,
            balanceAmount: newBalance,
            paymentStatus,
            payments: [...(inv.payments || []), newPayment],
          };
        }
        return inv;
      });
      const target = updated.find(inv => inv.id === invoiceId);
      if (target) upsertInvoiceToSupabase(target);
      return updated;
    });
  };

  // Master Catalogs CRUD
  const addCustomer = (customerData: Omit<CustomerMasterItem, 'id'>): CustomerMasterItem => {
    const existingMax = customers.reduce((max, c) => {
      const m = c.id?.match(/^(?:CU|CUST)-?(\d+)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const generatedId = `CU-${String(existingMax + 1).padStart(4, '0')}`;

    const newCust: CustomerMasterItem = {
      ...customerData,
      id: generatedId,
    };
    setCustomers(prev => [newCust, ...prev]);
    upsertCustomerToSupabase(newCust);
    api.createCustomer({ ...newCust, customerId: generatedId, customerNumber: generatedId }).then(res => {
      if (res?.customerId || res?.customerNumber || res?.id) {
        const finalId = res.customerId || res.customerNumber || res.id;
        setCustomers(prev => prev.map(c => c.id === newCust.id ? { ...c, id: finalId } : c));
      }
    }).catch(err => console.warn('[GarageContext] Customer API sync notice:', err));
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<CustomerMasterItem>) => {
    setCustomers(prev => {
      const updated = prev.map(c => (c.id === id ? { ...c, ...updates } : c));
      const target = updated.find(c => c.id === id);
      if (target) {
        upsertCustomerToSupabase(target);
        api.updateCustomer(id, target).catch(err => console.warn('[GarageContext] Customer API sync notice:', err));
      }
      return updated;
    });
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    deleteCustomerFromSupabase(id);
    api.deleteCustomer(id).catch(err => console.warn('[GarageContext] Customer API delete notice:', err));
  };

  const addSupplier = (supplierData: Omit<SupplierMasterItem, 'id'>): SupplierMasterItem => {
    const existingMax = suppliers.reduce((max, s) => {
      const m = s.id?.match(/^(?:SU|SUP)-?(\d+)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const generatedId = `SU-${String(existingMax + 1).padStart(4, '0')}`;

    const newSupp: SupplierMasterItem = {
      ...supplierData,
      id: generatedId,
    };
    setSuppliers(prev => [newSupp, ...prev]);
    upsertSupplierToSupabase(newSupp);
    api.createSupplier({ ...newSupp, supplierId: generatedId, supplierNumber: generatedId }).then(res => {
      if (res?.supplierId || res?.supplierNumber || res?.id) {
        const finalId = res.supplierId || res.supplierNumber || res.id;
        setSuppliers(prev => prev.map(s => s.id === newSupp.id ? { ...s, id: finalId } : s));
      }
    }).catch(err => console.warn('[GarageContext] Supplier API sync notice:', err));
    return newSupp;
  };

  const updateSupplier = (id: string, updates: Partial<SupplierMasterItem>) => {
    setSuppliers(prev => {
      const updated = prev.map(s => (s.id === id ? { ...s, ...updates } : s));
      const target = updated.find(s => s.id === id);
      if (target) {
        upsertSupplierToSupabase(target);
        api.updateSupplier(id, target).catch(err => console.warn('[GarageContext] Supplier API sync notice:', err));
      }
      return updated;
    });
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    deleteSupplierFromSupabase(id);
    api.deleteSupplier(id).catch(err => console.warn('[GarageContext] Supplier API delete notice:', err));
  };

  const addVehicle = (vehicleData: Omit<VehicleMasterItem, 'id'>): VehicleMasterItem => {
    const existingMax = vehicles.reduce((max, v) => {
      const m = v.id?.match(/^(?:VE|VEH)-?(\d+)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const generatedId = `VE-${String(existingMax + 1).padStart(4, '0')}`;

    const newVeh: VehicleMasterItem = {
      ...vehicleData,
      id: generatedId,
    };
    setVehicles(prev => [newVeh, ...prev]);
    upsertVehicleToSupabase(newVeh);
    api.createVehicle({ ...newVeh, vehicleNumber: generatedId }).then(res => {
      if (res?.vehicleNumber || res?.id) {
        const finalId = res.vehicleNumber || res.id;
        setVehicles(prev => prev.map(v => v.id === newVeh.id ? { ...v, id: finalId, vehicleNumber: finalId } as any : v));
      }
    }).catch(err => console.warn('[GarageContext] Vehicle API sync notice:', err));
    return newVeh;
  };

  const updateVehicle = (id: string, updates: Partial<VehicleMasterItem>) => {
    setVehicles(prev => {
      const updated = prev.map(v => (v.id === id ? { ...v, ...updates } : v));
      const target = updated.find(v => v.id === id);
      if (target) {
        upsertVehicleToSupabase(target);
        api.updateVehicle(id, target).catch(err => console.warn('[GarageContext] Vehicle API sync notice:', err));
      }
      return updated;
    });
  };

  const deleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    deleteVehicleFromSupabase(id);
    api.deleteVehicle(id).catch(err => console.warn('[GarageContext] Vehicle API delete notice:', err));
  };

  const addEstimate = (estimateData: Omit<EstimationItem, 'id' | 'estimateNumber'> & { estimateNumber?: string }): EstimationItem => {
    let estimateNumber = estimateData.estimateNumber;
    if (!estimateNumber) {
      const year = new Date().getFullYear();
      const existingMax = estimates.reduce((max, est) => {
        const m = est.estimateNumber?.match(/^EST-(\d{4})-(\d+)$/);
        if (m && parseInt(m[1], 10) === year) {
          const num = parseInt(m[2], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      estimateNumber = `EST-${year}-${String(existingMax + 1).padStart(4, '0')}`;
    }

    const newEst: EstimationItem = {
      type: 'Estimation',
      description: 'General Quote',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      ...estimateData,
      id: `est-${Date.now()}`,
      estimateNumber,
    } as EstimationItem;
    setEstimates(prev => [newEst, ...prev]);
    api.createEstimate(newEst).catch(err => console.warn('[GarageContext] Estimate API sync notice:', err));
    return newEst;
  };

  const updateEstimate = (id: string, updates: Partial<EstimationItem>) => {
    setEstimates(prev => {
      const updated = prev.map(e => (e.id === id ? { ...e, ...updates } : e));
      const target = updated.find(e => e.id === id);
      if (target) {
        api.updateEstimate(id, target).catch(err => console.warn('[GarageContext] Estimate API update notice:', err));
      }
      return updated;
    });
  };

  const deleteEstimate = (id: string) => {
    setEstimates(prev => prev.filter(e => e.id !== id));
    api.deleteEstimate(id).catch(err => console.warn('[GarageContext] Estimate API delete notice:', err));
  };

  const lowStockItemsCount = useMemo(() => {
    return inventory.filter(item => item.quantityOnHand <= item.minReorderLevel).length;
  }, [inventory]);

  const activeJobsCount = useMemo(() => {
    return jobCards.filter(jc => jc.status !== 'Delivered').length;
  }, [jobCards]);

  const vehiclesInShopCount = useMemo(() => {
    return jobCards.filter(jc => jc.status !== 'Delivered' && jc.status !== 'Draft').length;
  }, [jobCards]);

  const totalPendingInvoicesBalance = useMemo(() => {
    return invoices.reduce((acc, inv) => acc + (inv.balanceAmount || 0), 0);
  }, [invoices]);

  const getVehicleHistory = (query: string) => {
    const cleanQuery = (query || '').toLowerCase().trim();
    if (!cleanQuery) {
      return { jobCards: [], invoices: [], totalSpent: 0, totalVisits: 0 };
    }

    const matchedCards = (jobCards || []).filter(
      jc =>
        (jc.vehicle?.plateNumber || '').toLowerCase().includes(cleanQuery) ||
        (jc.vehicle?.vin && jc.vehicle.vin.toLowerCase().includes(cleanQuery)) ||
        (jc.customer?.phone || '').toLowerCase().includes(cleanQuery) ||
        (jc.customer?.name || '').toLowerCase().includes(cleanQuery)
    );

    const matchedInvoices = (invoices || []).filter(
      inv =>
        (inv.vehiclePlate && inv.vehiclePlate.toLowerCase().includes(cleanQuery)) ||
        (inv.customerPhone || '').toLowerCase().includes(cleanQuery) ||
        (inv.customerName || '').toLowerCase().includes(cleanQuery)
    );

    const totalSpent = matchedInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);

    return {
      vehicleSummary: matchedCards[0]?.vehicle,
      customerSummary: matchedCards[0]?.customer,
      jobCards: matchedCards,
      invoices: matchedInvoices,
      totalSpent,
      totalVisits: matchedCards.length,
    };
  };

  const addStockMovement = (mov: Omit<StockMovement, 'id' | 'timestamp'>) => {
    const newMov: StockMovement = {
      ...mov,
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    };
    setStockMovements(prev => [newMov, ...prev]);
  };

  const adjustStockWithLog = (
    itemId: string,
    changeQty: number,
    type: StockMovement['type'],
    reason: string,
    user: string,
    refNo?: string
  ) => {
    setInventory(prevInv => {
      let targetItem: InventoryItem | undefined;
      const updatedInv = prevInv.map(item => {
        if (item.id === itemId || item.sku === itemId) {
          targetItem = item;
          const currentQty = item.quantityOnHand ?? item.quantity ?? item.stockQuantity ?? 0;
          const newQty = Math.max(0, currentQty + changeQty);
          return {
            ...item,
            quantityOnHand: newQty,
            quantity: newQty,
            stockQuantity: newQty,
            lastRestockedDate: changeQty > 0 ? new Date().toISOString().split('T')[0] : item.lastRestockedDate,
          };
        }
        return item;
      });

      if (targetItem) {
        const currentQty = targetItem.quantityOnHand ?? targetItem.quantity ?? 0;
        const newQty = Math.max(0, currentQty + changeQty);
        addStockMovement({
          itemId: targetItem.id,
          sku: targetItem.sku,
          itemName: targetItem.name,
          type,
          quantity: Math.abs(changeQty),
          previousQty: currentQty,
          newQty,
          reason,
          user,
          referenceNo: refNo,
        });
        const updatedTarget = updatedInv.find(i => i.id === targetItem!.id);
        if (updatedTarget) upsertInventoryToSupabase(updatedTarget);
      }
      return updatedInv;
    });
  };

  const addSupplierLedgerEntry = (
    supplierId: string,
    entry: Omit<SupplierLedgerEntry, 'id' | 'supplierId' | 'balanceAfter'>
  ) => {
    setSuppliers(prev => {
      return prev.map(supp => {
        if (supp.id === supplierId || supp.name === supplierId) {
          const currentBal = supp.currentBalance || 0;
          const newBal = currentBal + entry.amount;
          const newEntry: SupplierLedgerEntry = {
            ...entry,
            id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            supplierId: supp.id,
            balanceAfter: newBal,
          };
          const updatedLedger = [newEntry, ...(supp.ledger || [])];
          const updatedSupp = {
            ...supp,
            currentBalance: newBal,
            ledger: updatedLedger,
          };
          upsertSupplierToSupabase(updatedSupp);
          return updatedSupp;
        }
        return supp;
      });
    });
  };

  const receivePOItems = (
    poId: string,
    receivedItems: { partId: string; qtyReceivedNow: number }[],
    isCompleted?: boolean,
    notes?: string
  ) => {
    setPurchaseOrders(prev =>
      prev.map(po => {
        if (po.id !== poId) return po;

        let allFullyReceived = true;
        let totalValueReceivedNow = 0;

        const updatedItems = po.items.map(item => {
          const rec = receivedItems.find(r => r.partId === item.partId || r.partId === item.sku);
          if (rec && rec.qtyReceivedNow > 0) {
            const prevReceived = item.quantityReceived || 0;
            const newReceived = prevReceived + rec.qtyReceivedNow;
            const qtyOrdered = item.quantityOrdered || item.quantity || 0;

            adjustStockWithLog(
              item.partId,
              rec.qtyReceivedNow,
              'in',
              `PO Goods Received (${po.poNumber})`,
              'Purchase Manager',
              po.poNumber
            );

            totalValueReceivedNow += rec.qtyReceivedNow * item.unitCost;

            if (newReceived < qtyOrdered) {
              allFullyReceived = false;
            }

            return {
              ...item,
              quantityReceived: newReceived,
            };
          }

          const qtyOrdered = item.quantityOrdered || item.quantity || 0;
          const qtyReceived = item.quantityReceived || 0;
          if (qtyReceived < qtyOrdered) {
            allFullyReceived = false;
          }
          return item;
        });

        const newStatus = (isCompleted || allFullyReceived) ? 'Received' : 'Partially Received';

        if (po.supplierId && totalValueReceivedNow > 0) {
          addSupplierLedgerEntry(po.supplierId, {
            date: new Date().toISOString().split('T')[0],
            type: 'Purchase Order',
            referenceNo: po.poNumber,
            description: `Received items worth QAR ${totalValueReceivedNow.toFixed(2)}`,
            amount: totalValueReceivedNow,
          });
        }

        return {
          ...po,
          items: updatedItems,
          status: newStatus,
          receivedDate: new Date().toISOString().split('T')[0],
          notes: notes ? `${po.notes ? po.notes + ' | ' : ''}${notes}` : po.notes,
        };
      })
    );
  };

  const updateScrapRate = (material: ScrapMaterialType, buyingRate: number, sellingRate: number) => {
    setScrapRates(prev =>
      prev.map(r =>
        ((r as any).material === material || r.materialType === material)
          ? {
              ...r,
              buyingRate: buyingRate,
              sellingRate: sellingRate,
              updatedAt: new Date().toISOString().split('T')[0],
            }
          : r
      )
    );
  };

  const addScrapIntake = (intakeData: Omit<ScrapIntake, 'id' | 'receiptNo'>): ScrapIntake => {
    const receiptNo = `SCRAP-IN-${100 + scrapIntakes.length + 1}`;
    const newIntake: ScrapIntake = {
      ...intakeData,
      id: `sc-in-${Date.now()}`,
      receiptNo,
    };
    setScrapIntakes(prev => [newIntake, ...prev]);
    api.createScrapIntake({
      sellerName: (intakeData as any).sellerName || (intakeData as any).source || 'Direct Supplier',
      sellerPhone: (intakeData as any).sellerPhone || null,
      sellerQid: (intakeData as any).sellerQid || null,
      materialType: intakeData.material,
      weightKg: intakeData.weightKg,
      pricePerKg: intakeData.ratePerKg,
      totalAmount: intakeData.totalAmount,
      date: intakeData.date,
      notes: intakeData.notes
    }).catch(err => console.warn('[GarageContext] Scrap Intake API sync notice:', err));
    return newIntake;
  };

  const addScrapSale = (saleData: Omit<ScrapSale, 'id' | 'invoiceNo' | 'profitMargin' | 'marginPercent'>): ScrapSale => {
    const invoiceNo = `SCRAP-OUT-${500 + scrapSales.length + 1}`;
    const totalRevenue = saleData.weightKg * saleData.saleRatePerKg;
    const costTotal = saleData.weightKg * saleData.avgCostPerKg;
    const profitMargin = totalRevenue - costTotal;
    const marginPercent = totalRevenue > 0 ? Number(((profitMargin / totalRevenue) * 100).toFixed(2)) : 0;

    const newSale: ScrapSale = {
      ...saleData,
      id: `sc-out-${Date.now()}`,
      invoiceNo,
      totalRevenue,
      profitMargin,
      marginPercent,
    };

    setScrapSales(prev => [newSale, ...prev]);
    api.createScrapSale({
      buyerCompany: saleData.buyerName,
      materialType: saleData.material,
      weightKg: saleData.weightKg,
      ratePerKg: saleData.saleRatePerKg,
      totalAmount: totalRevenue,
      costPerKg: saleData.avgCostPerKg,
      costAmount: costTotal,
      profitMargin,
      marginPercent,
      date: saleData.date,
      paymentStatus: saleData.paymentStatus || 'Paid',
      notes: saleData.notes
    }).catch(err => console.warn('[GarageContext] Scrap Sale API sync notice:', err));
    return newSale;
  };

  // Phase 5 Implementations
  const addExpense = (expenseData: Omit<ExpenseRecord, 'id'>): ExpenseRecord => {
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
    addAuditLog(`Recorded expense QAR ${expenseData.totalAmount} for [${expenseData.category}]`, 'Finance', `Payee: ${expenseData.payee}`);
    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<ExpenseRecord>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addWarranty = (warrantyData: Omit<WarrantyRecord, 'id'>): WarrantyRecord => {
    const newWarranty: WarrantyRecord = {
      ...warrantyData,
      id: `war-${Date.now()}`,
    };
    setWarranties(prev => [newWarranty, ...prev]);
    addAuditLog(`Registered warranty for [${warrantyData.itemName}]`, 'Operations', `Duration: ${warrantyData.durationMonths} months`);
    return newWarranty;
  };

  const updateWarranty = (id: string, updates: Partial<WarrantyRecord>) => {
    setWarranties(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const addInsuranceClaim = (claimData: Omit<InsuranceClaimRecord, 'id'>): InsuranceClaimRecord => {
    const newClaim: InsuranceClaimRecord = {
      ...claimData,
      id: `ic-${Date.now()}`,
    };
    setInsuranceClaims(prev => [newClaim, ...prev]);
    addAuditLog(`Registered insurance claim for Job ${claimData.jobCardNumber}`, 'Operations', `Insurer: ${claimData.insuranceCompany}`);
    return newClaim;
  };

  const updateInsuranceClaim = (id: string, updates: Partial<InsuranceClaimRecord>) => {
    setInsuranceClaims(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addAuditLog = (action: string, module: SystemAuditLog['module'], details?: string, referenceId?: string) => {
    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      username: 'Autonomous',
      action,
      module,
      details,
      referenceId,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Financial Module Actions
  const refreshFinancials = async () => {
    try {
      const bootstrap = await api.getBootstrap();
      if (Array.isArray(bootstrap.financialAccounts)) setFinancialAccounts(bootstrap.financialAccounts);
      if (Array.isArray(bootstrap.financialTransactions)) setFinancialTransactions(bootstrap.financialTransactions);
      if (Array.isArray(bootstrap.financialAllocations)) setFinancialAllocations(bootstrap.financialAllocations);
      if (Array.isArray(bootstrap.journalEntries)) setJournalEntries(bootstrap.journalEntries);
      if (Array.isArray(bootstrap.invoices)) setInvoices(bootstrap.invoices);
      if (Array.isArray(bootstrap.purchaseOrders)) setPurchaseOrders(bootstrap.purchaseOrders);
    } catch (e) {
      console.warn('[GarageContext] Failed to refresh financials:', e);
    }
  };

  const createFinancialAccount = async (accountData: Omit<FinancialAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialAccount> => {
    try {
      const res = await api.createFinancialAccount(accountData);
      if (res?.account) {
        setFinancialAccounts(prev => [...prev, res.account]);
        return res.account;
      }
    } catch (e) {
      console.warn('[GarageContext] Backend account create notice:', e);
    }
    const newAcc: FinancialAccount = {
      ...accountData,
      id: `acc-${Date.now()}`,
      currentBalance: accountData.openingBalance || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFinancialAccounts(prev => [...prev, newAcc]);
    return newAcc;
  };

  const updateFinancialAccount = async (id: string, updates: Partial<FinancialAccount>) => {
    try {
      await api.updateFinancialAccount(id, updates);
    } catch (e) {
      console.warn('[GarageContext] Backend account update notice:', e);
    }
    setFinancialAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a));
  };

  const createFinancialTransaction = async (txData: any): Promise<FinancialTransaction> => {
    try {
      const res = await api.createFinancialTransaction(txData);
      if (res?.transaction) {
        setFinancialTransactions(prev => [res.transaction, ...prev]);
        await refreshFinancials();
        return res.transaction;
      }
    } catch (e) {
      console.warn('[GarageContext] Backend transaction create notice:', e);
    }
    const id = `tx-${Date.now()}`;
    const prefix = txData.type === 'MONEY_IN' ? 'MI' : txData.type === 'MONEY_OUT' ? 'MO' : txData.type === 'CUSTOMER_ADVANCE' ? 'CAD' : 'SAD';
    const fallbackTx: FinancialTransaction = {
      ...txData,
      id,
      transactionNumber: `${prefix}-00${financialTransactions.length + 1}`,
      unappliedAmount: txData.type.includes('ADVANCE') ? txData.amount : 0,
      allocations: txData.allocations || [],
      createdBy: 'Staff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFinancialTransactions(prev => [fallbackTx, ...prev]);
    return fallbackTx;
  };

  const postFinancialTransaction = async (id: string) => {
    await api.postFinancialTransaction(id);
    await refreshFinancials();
  };

  const reverseFinancialTransaction = async (id: string, reason: string) => {
    await api.reverseFinancialTransaction(id, reason);
    await refreshFinancials();
  };

  const applyAdvance = async (advanceId: string, targetType: 'invoice' | 'purchase_order', targetId: string, amount: number) => {
    await api.applyAdvance(advanceId, targetType, targetId, amount);
    await refreshFinancials();
  };

  const refundAdvance = async (advanceId: string, refundAmount: number, accountId: string, paymentMethod?: string, notes?: string) => {
    await api.refundAdvance(advanceId, refundAmount, accountId, paymentMethod || 'Cash', notes);
    await refreshFinancials();
  };

  return (
    <GarageContext.Provider
      value={{
        isSupabaseConnected: isSupabaseConfigured && isSupabaseConnectedState,
        companies,
        activeCompanyId,
        activeCompany,
        switchCompany,
        createCompany,
        deleteCompany,
        resetCompanyData,
        settings,
        updateSettings,
        jobCards,
        createJobCard,
        updateJobCard,
        deleteJobCard,
        advanceJobCardStatus,
        refreshJobCards,
        inventory,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        adjustStock,
        adjustStockWithLog,
        issueMaterialToJobCard,
        returnMaterialFromJobCard,
        stockMovements,
        addStockMovement,
        purchaseOrders,
        createPurchaseOrder,
        updatePurchaseOrderStatus,
        receivePOItems,
        counterSales,
        createCounterSale,
        invoices,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        generateInvoiceFromJobCard,
        closeAndInvoiceJobCard,
        recordPayment,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierLedgerEntry,
        scrapRates,
        updateScrapRate,
        scrapIntakes,
        addScrapIntake,
        scrapSales,
        addScrapSale,
        vehicles,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        estimates,
        addEstimate,
        updateEstimate,
        deleteEstimate,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        warranties,
        addWarranty,
        updateWarranty,
        insuranceClaims,
        addInsuranceClaim,
        updateInsuranceClaim,
        auditLogs,
        addAuditLog,
        backendStatus,
        backendError,
        backendStatusCode,
        envConfigError,
        missingEnvVars,
        envValidation,
        retryBackendConnection,
        technicians,
        laborRates,
        paintCodes,
        financialAccounts,
        financialTransactions,
        financialAllocations,
        journalEntries,
        createFinancialAccount,
        updateFinancialAccount,
        createFinancialTransaction,
        postFinancialTransaction,
        reverseFinancialTransaction,
        applyAdvance,
        refundAdvance,
        refreshFinancials,
        lowStockItemsCount,
        activeJobsCount,
        vehiclesInShopCount,
        totalPendingInvoicesBalance,
        getVehicleHistory,
        resetToDefaults,
      }}
    >
      {children}
    </GarageContext.Provider>
  );
};

export const useGarage = () => {
  const context = useContext(GarageContext);
  if (!context) {
    throw new Error('useGarage must be used within a GarageProvider');
  }
  return context;
};
