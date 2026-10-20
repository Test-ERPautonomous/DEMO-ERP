import React, { useState, useMemo } from 'react';
import { useGarage } from '../../context/GarageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Common/Toast';
import { 
  FinancialAccount, 
  FinancialTransaction, 
  Invoice, 
  PurchaseOrder, 
  CustomerMasterItem, 
  SupplierMasterItem 
} from '../../types';
import { 
  DollarSign, 
  Receipt, 
  CreditCard, 
  Landmark, 
  Wallet, 
  Layers, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRight,
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Printer, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Eye, 
  FileText, 
  Building2, 
  User, 
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { PaymentVoucherModal } from './PaymentVoucherModal';
import { formatDate } from '../../utils/formatters';
import { RecordTransactionModal, TransactionModalMode } from './RecordTransactionModal';
import { ManageAccountModal } from './ManageAccountModal';
import { exportInvoicesToCSV } from '../../utils/csvExport';

export type FinancialSection = 
  | 'overview'
  | 'receivables'
  | 'payables'
  | 'advances'
  | 'money_in'
  | 'money_out'
  | 'accounts'
  | 'reports';

export const FinancialModule: React.FC = () => {
  const {
    settings,
    invoices,
    jobCards,
    purchaseOrders,
    customers,
    suppliers,
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
  } = useGarage();

  const { currentUser, userRole, hasPermission } = useAuth();
  const { addToast } = useToast();

  const currency = settings.currencySymbol || 'QAR';

  // Navigation
  const [activeSection, setActiveSection] = useState<FinancialSection>('overview');

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalMode, setTxModalMode] = useState<TransactionModalMode>('receive_customer_payment');
  const [txModalInitialPartyId, setTxModalInitialPartyId] = useState<string | undefined>();
  const [txModalInitialPartyName, setTxModalInitialPartyName] = useState<string | undefined>();
  const [txModalInitialInvoiceId, setTxModalInitialInvoiceId] = useState<string | undefined>();
  const [txModalInitialPoId, setTxModalInitialPoId] = useState<string | undefined>();
  const [txModalInitialAdvanceId, setTxModalInitialAdvanceId] = useState<string | undefined>();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);

  const [receiptModalTx, setReceiptModalTx] = useState<FinancialTransaction | null>(null);
  const [voucherModalTx, setVoucherModalTx] = useState<FinancialTransaction | null>(null);

  // Reversal dialog state
  const [reversingTx, setReversingTx] = useState<FinancialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  // Filters
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAccountIdFilter, setSelectedAccountIdFilter] = useState<string>('ALL');
  const [advancesSubTab, setAdvancesSubTab] = useState<'customer' | 'supplier'>('customer');
  const [accountsSubView, setAccountsSubView] = useState<'cards' | 'ledger' | 'journal'>('cards');
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>(financialAccounts[0]?.id || '');
  const [reportsSubView, setReportsSubView] = useState<'customer_aging' | 'supplier_aging' | 'advances_summary' | 'cash_ledger' | 'money_flow'>('customer_aging');

  // Permissions guard
  const canManage = hasPermission('canManageBilling') || userRole === 'owner' || userRole === 'manager' || userRole === 'Admin';

  // Date filtering logic
  const now = new Date();
  const filterByDateRange = (dateStr: string): boolean => {
    if (dateRangeFilter === 'all' || !dateStr) return true;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;

    if (dateRangeFilter === 'today') {
      return itemDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    }
    if (dateRangeFilter === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return itemDate >= startOfWeek;
    }
    if (dateRangeFilter === 'this_month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    if (dateRangeFilter === 'this_quarter') {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return itemDate.getMonth() >= qStartMonth && itemDate.getFullYear() === now.getFullYear();
    }
    if (dateRangeFilter === 'this_year') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // KPIs & Calculations
  const overviewMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Receivables from open invoices
    let totalReceivables = 0;
    let overdueReceivables = 0;
    for (const inv of invoices) {
      if (inv.status === 'Cancelled') continue;
      const bal = inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
      if (bal > 0.001) {
        totalReceivables += bal;
        if (inv.dueDate && inv.dueDate < todayStr) {
          overdueReceivables += bal;
        }
      }
    }

    // Payables from open POs
    let totalPayables = 0;
    let overduePayables = 0;
    for (const po of purchaseOrders) {
      if (po.status === 'Cancelled' || po.paymentStatus === 'Paid') continue;
      const amt = po.totalAmount || 0;
      totalPayables += amt;
      if (po.expectedDate && po.expectedDate < todayStr) {
        overduePayables += amt;
      }
    }

    // Unapplied advances
    const unappliedCustomerAdvances = financialTransactions
      .filter(t => t.type === 'CUSTOMER_ADVANCE' && t.status === 'posted')
      .reduce((sum, t) => sum + (t.unappliedAmount || 0), 0);

    const unappliedSupplierAdvances = financialTransactions
      .filter(t => t.type === 'SUPPLIER_ADVANCE' && t.status === 'posted')
      .reduce((sum, t) => sum + (t.unappliedAmount || 0), 0);

    // Cash / Bank total balances
    const totalCashBankBalances = financialAccounts
      .filter(a => a.isActive)
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    // Money In & Money Out
    const totalMoneyIn = financialTransactions
      .filter(t => (t.type === 'MONEY_IN' || t.type === 'CUSTOMER_ADVANCE' || t.type === 'SUPPLIER_ADVANCE_RETURN') && t.status === 'posted' && filterByDateRange(t.date))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalMoneyOut = financialTransactions
      .filter(t => (t.type === 'MONEY_OUT' || t.type === 'SUPPLIER_ADVANCE' || t.type === 'CUSTOMER_ADVANCE_REFUND') && t.status === 'posted' && filterByDateRange(t.date))
      .reduce((sum, t) => sum + t.amount, 0);

    const netCashFlow = totalMoneyIn - totalMoneyOut;

    return {
      totalReceivables,
      overdueReceivables,
      totalPayables,
      overduePayables,
      unappliedCustomerAdvances,
      unappliedSupplierAdvances,
      totalCashBankBalances,
      totalMoneyIn,
      totalMoneyOut,
      netCashFlow
    };
  }, [invoices, purchaseOrders, financialTransactions, financialAccounts, dateRangeFilter]);

  // Receivables list (enriched with customer phone, plate, open balance)
  const receivablesList = useMemo(() => {
    return invoices
      .filter(inv => inv.status !== 'Cancelled')
      .map(inv => {
        const bal = inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
        const isOverdue = inv.dueDate && inv.dueDate < new Date().toISOString().split('T')[0] && bal > 0.001;
        let derivedStatus: 'Unpaid' | 'Partial' | 'Paid' | 'Overdue' = 'Unpaid';
        if (bal <= 0.001) derivedStatus = 'Paid';
        else if (isOverdue) derivedStatus = 'Overdue';
        else if ((inv.paidAmount || 0) > 0) derivedStatus = 'Partial';

        return {
          ...inv,
          balance: bal,
          derivedStatus,
        };
      })
      .filter(item => {
        if (!filterByDateRange(item.date)) return false;
        if (statusFilter !== 'ALL' && item.derivedStatus !== statusFilter) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          return (
            item.invoiceNumber.toLowerCase().includes(s) ||
            item.customerName.toLowerCase().includes(s) ||
            (item.vehiclePlate && item.vehiclePlate.toLowerCase().includes(s))
          );
        }
        return true;
      });
  }, [invoices, dateRangeFilter, statusFilter, searchTerm]);

  // Payables list (enriched POs)
  const payablesList = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return purchaseOrders
      .filter(po => po.status !== 'Cancelled')
      .map(po => {
        const isPaid = po.paymentStatus === 'Paid';
        const isOverdue = !isPaid && po.expectedDate && po.expectedDate < todayStr;
        let derivedStatus: 'Unpaid' | 'Paid' | 'Overdue' = isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Unpaid';

        return {
          ...po,
          balance: isPaid ? 0 : po.totalAmount,
          derivedStatus,
        };
      })
      .filter(item => {
        if (!filterByDateRange(item.date)) return false;
        if (statusFilter !== 'ALL' && item.derivedStatus !== statusFilter) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          return (
            item.poNumber.toLowerCase().includes(s) ||
            item.supplierName.toLowerCase().includes(s)
          );
        }
        return true;
      });
  }, [purchaseOrders, dateRangeFilter, statusFilter, searchTerm]);

  // Advances list
  const filteredAdvances = useMemo(() => {
    return financialTransactions.filter(t => {
      const isTargetType = advancesSubTab === 'customer' 
        ? t.type === 'CUSTOMER_ADVANCE' 
        : t.type === 'SUPPLIER_ADVANCE';
      if (!isTargetType) return false;
      if (!filterByDateRange(t.date)) return false;
      if (statusFilter === 'UNAPPLIED_ONLY' && (t.unappliedAmount || 0) <= 0.001) return false;
      if (statusFilter === 'CLEARED' && (t.unappliedAmount || 0) > 0.001) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          t.transactionNumber.toLowerCase().includes(s) ||
          t.partyName.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [financialTransactions, advancesSubTab, dateRangeFilter, statusFilter, searchTerm]);

  // Money In Register
  const moneyInTransactions = useMemo(() => {
    return financialTransactions.filter(t => {
      const isMoneyIn = t.type === 'MONEY_IN' || t.type === 'CUSTOMER_ADVANCE' || t.type === 'SUPPLIER_ADVANCE_RETURN';
      if (!isMoneyIn) return false;
      if (!filterByDateRange(t.date)) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (selectedAccountIdFilter !== 'ALL' && t.accountId !== selectedAccountIdFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          t.transactionNumber.toLowerCase().includes(s) ||
          t.partyName.toLowerCase().includes(s) ||
          (t.referenceNumber && t.referenceNumber.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [financialTransactions, dateRangeFilter, statusFilter, selectedAccountIdFilter, searchTerm]);

  // Money Out Register
  const moneyOutTransactions = useMemo(() => {
    return financialTransactions.filter(t => {
      const isMoneyOut = t.type === 'MONEY_OUT' || t.type === 'SUPPLIER_ADVANCE' || t.type === 'CUSTOMER_ADVANCE_REFUND';
      if (!isMoneyOut) return false;
      if (!filterByDateRange(t.date)) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (selectedAccountIdFilter !== 'ALL' && t.accountId !== selectedAccountIdFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          t.transactionNumber.toLowerCase().includes(s) ||
          t.partyName.toLowerCase().includes(s) ||
          (t.referenceNumber && t.referenceNumber.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [financialTransactions, dateRangeFilter, statusFilter, selectedAccountIdFilter, searchTerm]);

  // Ledger for selected account
  const accountLedgerData = useMemo(() => {
    const acc = financialAccounts.find(a => a.id === selectedLedgerAccountId) || financialAccounts[0];
    if (!acc) return { account: null, ledger: [], totalDebit: 0, totalCredit: 0 };

    const txs = financialTransactions
      .filter(t => t.accountId === acc.id && t.status === 'posted')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = acc.openingBalance || 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const ledger = txs.map(t => {
      const isDebit = t.type === 'MONEY_IN' || t.type === 'CUSTOMER_ADVANCE' || t.type === 'SUPPLIER_ADVANCE_RETURN';
      const debit = isDebit ? t.amount : 0;
      const credit = !isDebit ? t.amount : 0;
      running += debit - credit;
      totalDebit += debit;
      totalCredit += credit;

      return {
        ...t,
        debit,
        credit,
        runningBalance: running,
      };
    });

    return {
      account: acc,
      ledger: ledger.reverse(), // most recent on top for display
      totalDebit,
      totalCredit,
      currentBalance: running,
    };
  }, [financialAccounts, selectedLedgerAccountId, financialTransactions]);

  // Aging reports computation
  const customerAgingData = useMemo(() => {
    const today = new Date();
    const map: Record<string, any> = {};

    for (const inv of invoices) {
      if (inv.status === 'Cancelled') continue;
      const bal = inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
      if (bal <= 0.001) continue;

      const custName = inv.customerName || 'Direct Customer';
      if (!map[custName]) {
        map[custName] = {
          customerName: custName,
          customerPhone: inv.customerPhone || '',
          current: 0,
          days1To30: 0,
          days31To60: 0,
          days61To90: 0,
          days90Plus: 0,
          totalDue: 0,
        };
      }

      const dueDate = new Date(inv.dueDate || inv.date);
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) map[custName].current += bal;
      else if (diffDays <= 30) map[custName].days1To30 += bal;
      else if (diffDays <= 60) map[custName].days31To60 += bal;
      else if (diffDays <= 90) map[custName].days61To90 += bal;
      else map[custName].days90Plus += bal;

      map[custName].totalDue += bal;
    }

    return Object.values(map);
  }, [invoices]);

  const supplierAgingData = useMemo(() => {
    const today = new Date();
    const map: Record<string, any> = {};

    for (const po of purchaseOrders) {
      if (po.status === 'Cancelled' || po.paymentStatus === 'Paid') continue;
      const bal = po.totalAmount || 0;
      if (bal <= 0.001) continue;

      const suppName = po.supplierName || 'Vendor';
      if (!map[suppName]) {
        map[suppName] = {
          supplierName: suppName,
          supplierContact: po.supplierContact || '',
          current: 0,
          days1To30: 0,
          days31To60: 0,
          days61To90: 0,
          days90Plus: 0,
          totalDue: 0,
        };
      }

      const poDate = new Date(po.expectedDate || po.date);
      const diffDays = Math.floor((today.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) map[suppName].current += bal;
      else if (diffDays <= 30) map[suppName].days1To30 += bal;
      else if (diffDays <= 60) map[suppName].days31To60 += bal;
      else if (diffDays <= 90) map[suppName].days61To90 += bal;
      else map[suppName].days90Plus += bal;

      map[suppName].totalDue += bal;
    }

    return Object.values(map);
  }, [purchaseOrders]);

  // Handlers for modal actions
  const handleOpenReceivePayment = (invoiceId?: string) => {
    setTxModalMode('receive_customer_payment');
    setTxModalInitialInvoiceId(invoiceId);
    setTxModalInitialPoId(undefined);
    setTxModalInitialAdvanceId(undefined);
    setIsTxModalOpen(true);
  };

  const handleOpenPaySupplier = (poId?: string) => {
    setTxModalMode('pay_supplier_bill');
    setTxModalInitialInvoiceId(undefined);
    setTxModalInitialPoId(poId);
    setTxModalInitialAdvanceId(undefined);
    setIsTxModalOpen(true);
  };

  const handleOpenCustomerAdvance = (custId?: string, custName?: string) => {
    setTxModalMode('customer_advance');
    setTxModalInitialPartyId(custId);
    setTxModalInitialPartyName(custName);
    setIsTxModalOpen(true);
  };

  const handleOpenSupplierAdvance = (suppId?: string, suppName?: string) => {
    setTxModalMode('supplier_advance');
    setTxModalInitialPartyId(suppId);
    setTxModalInitialPartyName(suppName);
    setIsTxModalOpen(true);
  };

  const handleOpenApplyAdvance = (advanceId: string) => {
    setTxModalMode('apply_advance');
    setTxModalInitialAdvanceId(advanceId);
    setIsTxModalOpen(true);
  };

  const handleOpenRefundAdvance = (advanceId: string) => {
    setTxModalMode('refund_advance');
    setTxModalInitialAdvanceId(advanceId);
    setIsTxModalOpen(true);
  };

  const handleOpenDirectMoneyIn = () => {
    setTxModalMode('direct_money_in');
    setIsTxModalOpen(true);
  };

  const handleOpenDirectMoneyOut = () => {
    setTxModalMode('direct_money_out');
    setIsTxModalOpen(true);
  };

  // Reversal Execution
  const handleExecuteReversal = async () => {
    if (!reversingTx || !reversalReason.trim()) return;
    try {
      setIsReversing(true);
      await reverseFinancialTransaction(reversingTx.id, reversalReason.trim());
      addToast(`Transaction ${reversingTx.transactionNumber} reversed successfully`, 'info');
      setReversingTx(null);
      setReversalReason('');
    } catch (err: any) {
      addToast(err?.message || 'Failed to reverse transaction', 'error');
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Overview Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Financial Management & Treasury
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                Live ERP Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cash flow tracking, Accounts Receivable, Accounts Payable, Advances, and Audited Ledgers
            </p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenReceivePayment()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Receive Customer Payment
          </button>
          <button
            onClick={() => handleOpenPaySupplier()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Pay Supplier Bill
          </button>
          <button
            onClick={() => handleOpenCustomerAdvance()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Customer Advance
          </button>
          <button
            onClick={() => handleOpenDirectMoneyOut()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Expense Voucher
          </button>
          <button
            onClick={() => refreshFinancials()}
            title="Refresh Financial State"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 8-Section Module Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-xl shadow-xs px-3 pt-2 flex items-center justify-between overflow-x-auto">
        <div className="flex gap-1 shrink-0">
          {[
            { id: 'overview' as FinancialSection, label: 'Overview', icon: BarChart3 },
            { id: 'receivables' as FinancialSection, label: 'Accounts Receivable', icon: Receipt, count: invoices.filter(i => (i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0))) > 0.001).length },
            { id: 'payables' as FinancialSection, label: 'Accounts Payable', icon: CreditCard, count: purchaseOrders.filter(p => p.paymentStatus !== 'Paid').length },
            { id: 'advances' as FinancialSection, label: 'Advances & Returns', icon: Layers, count: financialTransactions.filter(t => (t.type === 'CUSTOMER_ADVANCE' || t.type === 'SUPPLIER_ADVANCE') && t.unappliedAmount > 0).length },
            { id: 'money_in' as FinancialSection, label: 'Money In', icon: ArrowDownLeft },
            { id: 'money_out' as FinancialSection, label: 'Money Out', icon: ArrowUpRight },
            { id: 'accounts' as FinancialSection, label: 'Cash / Bank Accounts', icon: Landmark, count: financialAccounts.length },
            { id: 'reports' as FinancialSection, label: 'Reports & Aging', icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSection(tab.id);
                  setStatusFilter('ALL');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Date Filter selector */}
        <div className="flex items-center gap-2 py-2 pr-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={dateRangeFilter ?? ''}
            onChange={e => setDateRangeFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
      </div>

      {/* ========================================================== */}
      {/* SECTION 1: OVERVIEW DASHBOARD */}
      {/* ========================================================== */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Receivables */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Receivables (AR)
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black font-mono text-slate-900">
                  {currency} {(overviewMetrics?.totalReceivables ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{currency} {(overviewMetrics?.overdueReceivables ?? 0).toFixed(2)} overdue</span>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('receivables')}
                className="mt-3 text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                View Outstanding Invoices <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Card 2: Payables */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Payables (AP)
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black font-mono text-slate-900">
                  {currency} {(overviewMetrics?.totalPayables ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{currency} {(overviewMetrics?.overduePayables ?? 0).toFixed(2)} overdue</span>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('payables')}
                className="mt-3 text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                View Supplier Bills <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Card 3: Unapplied Advances */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Unapplied Advances
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Customer Credits:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {currency} {(overviewMetrics?.unappliedCustomerAdvances ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Supplier Prepayments:</span>
                  <span className="font-mono font-bold text-sky-700">
                    {currency} {(overviewMetrics?.unappliedSupplierAdvances ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('advances')}
                className="mt-3 text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                Manage Advances & Returns <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Card 4: Cash & Bank Balances */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cash & Bank Balances
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black font-mono text-emerald-700">
                  {currency} {(overviewMetrics?.totalCashBankBalances ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  {financialAccounts.length} Active Treasury Accounts
                </div>
              </div>
              <button
                onClick={() => setActiveSection('accounts')}
                className="mt-3 text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                Account Ledgers <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Flow Summary & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Money In Activity */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Recent Money Received
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  Total: {currency} {overviewMetrics.totalMoneyIn.toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {moneyInTransactions.slice(0, 6).map(tx => (
                  <div key={tx.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{tx.transactionNumber}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-800">{tx.partyName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {formatDate(tx.date)} • {tx.paymentMethod} • {tx.accountName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-emerald-600 text-sm">
                        +{currency} {tx.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setReceiptModalTx(tx)}
                        title="Print Receipt"
                        className="p-1 text-slate-400 hover:text-slate-800 rounded transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {moneyInTransactions.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No money received records found for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Money Out Activity */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Recent Money Disbursed
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-rose-700">
                  Total: {currency} {overviewMetrics.totalMoneyOut.toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {moneyOutTransactions.slice(0, 6).map(tx => (
                  <div key={tx.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{tx.transactionNumber}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-800">{tx.partyName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {formatDate(tx.date)} • {tx.paymentMethod} • {tx.accountName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-rose-600 text-sm">
                        -{currency} {tx.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setVoucherModalTx(tx)}
                        title="Print Voucher"
                        className="p-1 text-slate-400 hover:text-slate-800 rounded transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {moneyOutTransactions.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No money disbursed records found for this period.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SECTION 2: ACCOUNTS RECEIVABLE */}
      {/* ========================================================== */}
      {activeSection === 'receivables' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-0">
          {/* Subheader Toolbar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice #, customer name, plate..."
                  value={searchTerm ?? ''}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter ?? ''}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Unpaid">Unpaid Only</option>
                <option value="Partial">Partially Paid</option>
                <option value="Overdue">Overdue Only</option>
                <option value="Paid">Fully Paid</option>
              </select>

              <button
                onClick={() => handleOpenReceivePayment()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Receive Customer Payment
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Customer / Plate</th>
                  <th className="px-4 py-3 text-right">Invoice Total</th>
                  <th className="px-4 py-3 text-right">Amount Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivablesList.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                      {inv.jobNumber && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          JC: {inv.jobNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{inv.dueDate ? formatDate(inv.dueDate) : formatDate(inv.date)}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{inv.customerName}</span>
                      {inv.vehiclePlate && (
                        <span className="block text-[11px] text-slate-500 font-mono">
                          Plate: {inv.vehiclePlate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {currency} {(inv.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold">
                      {currency} {(inv.paidAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-rose-600">
                      {currency} {inv.balance.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.derivedStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.derivedStatus === 'Overdue'
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : inv.derivedStatus === 'Partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {inv.derivedStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.balance > 0.001 ? (
                        <button
                          onClick={() => handleOpenReceivePayment(inv.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded text-xs transition cursor-pointer border border-emerald-200"
                        >
                          Receive Payment
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold flex items-center justify-end gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {receivablesList.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                      No invoices found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SECTION 3: ACCOUNTS PAYABLE */}
      {/* ========================================================== */}
      {activeSection === 'payables' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PO #, supplier name..."
                  value={searchTerm ?? ''}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter ?? ''}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Unpaid">Unpaid Only</option>
                <option value="Overdue">Overdue Only</option>
                <option value="Paid">Paid</option>
              </select>

              <button
                onClick={() => handleOpenPaySupplier()}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Disburse Supplier Payment
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">PO / Bill #</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Expected / Due Date</th>
                  <th className="px-4 py-3">Supplier / Vendor</th>
                  <th className="px-4 py-3 text-right">Bill Total</th>
                  <th className="px-4 py-3 text-right">Remaining Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payablesList.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {po.poNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{formatDate(po.date)}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{po.expectedDate ? formatDate(po.expectedDate) : formatDate(po.date)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{po.supplierName}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {currency} {(po.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-rose-600">
                      {currency} {po.balance.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        po.derivedStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.derivedStatus === 'Overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {po.derivedStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {po.balance > 0.001 ? (
                        <button
                          onClick={() => handleOpenPaySupplier(po.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded text-xs transition cursor-pointer border border-rose-200"
                        >
                          Pay Bill
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold flex items-center justify-end gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {payablesList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      No supplier payables records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SECTION 4: ADVANCES AND ADVANCE RETURNS */}
      {/* ========================================================== */}
      {activeSection === 'advances' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            {/* Sub-tabs: Customer Advances vs Supplier Advances */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setAdvancesSubTab('customer')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  advancesSubTab === 'customer'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customer Advances (AR Credit)
              </button>
              <button
                onClick={() => setAdvancesSubTab('supplier')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  advancesSubTab === 'supplier'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Supplier Prepayments (AP Asset)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter ?? ''}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Advances</option>
                <option value="UNAPPLIED_ONLY">Unapplied Balance &gt; 0</option>
                <option value="CLEARED">Fully Applied / Returned</option>
              </select>

              {advancesSubTab === 'customer' ? (
                <button
                  onClick={() => handleOpenCustomerAdvance()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Customer Advance
                </button>
              ) : (
                <button
                  onClick={() => handleOpenSupplierAdvance()}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Supplier Prepayment
                </button>
              )}
            </div>
          </div>

          {/* Advances Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Voucher #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">{advancesSubTab === 'customer' ? 'Customer' : 'Supplier'}</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3 text-right">Original Amount</th>
                    <th className="px-4 py-3 text-right">Applied Amount</th>
                    <th className="px-4 py-3 text-right">Unapplied Balance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdvances.map(adv => (
                    <tr key={adv.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {adv.transactionNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{formatDate(adv.date)}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{adv.partyName}</span>
                        {adv.partyPhone && (
                          <span className="block text-[11px] text-slate-400 font-mono">{adv.partyPhone}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{adv.accountName}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {currency} {adv.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {currency} {(adv.amount - (adv.unappliedAmount || 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">
                        {currency} {(adv.unappliedAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {adv.unappliedAmount > 0.001 && (
                          <>
                            <button
                              onClick={() => handleOpenApplyAdvance(adv.id)}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold rounded text-xs transition cursor-pointer border border-sky-200"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => handleOpenRefundAdvance(adv.id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded text-xs transition cursor-pointer border border-rose-200"
                            >
                              {adv.type === 'CUSTOMER_ADVANCE' ? 'Refund' : 'Return'}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            if (adv.type === 'CUSTOMER_ADVANCE') setReceiptModalTx(adv);
                            else setVoucherModalTx(adv);
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs transition cursor-pointer border border-slate-200"
                        >
                          Voucher
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAdvances.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        No advances recorded for {advancesSubTab === 'customer' ? 'customers' : 'suppliers'}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SECTION 5: MONEY IN (ALL INFLOWS) */}
      {/* ========================================================== */}
      {activeSection === 'money_in' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search receipt #, payer, reference..."
                  value={searchTerm ?? ''}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedAccountIdFilter ?? ''}
                onChange={e => setSelectedAccountIdFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Accounts</option>
                {financialAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>

              <select
                value={statusFilter ?? ''}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="posted">Posted Only</option>
                <option value="draft">Drafts Only</option>
                <option value="reversed">Reversed</option>
              </select>

              <button
                onClick={handleOpenDirectMoneyIn}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Money In
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payer / Source</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moneyInTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {tx.transactionNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{tx.partyName}</span>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {tx.category.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{tx.accountName}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-emerald-600">
                      +{currency} {tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'posted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.status === 'reversed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {tx.status === 'draft' && canManage && (
                        <button
                          onClick={async () => {
                            await postFinancialTransaction(tx.id);
                            addToast(`Transaction ${tx.transactionNumber} posted`, 'success');
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition cursor-pointer"
                        >
                          Post
                        </button>
                      )}
                      <button
                        onClick={() => setReceiptModalTx(tx)}
                        className="px-2 py-1 text-slate-700 hover:bg-slate-100 rounded border border-slate-300 font-semibold text-xs transition cursor-pointer"
                      >
                        Receipt
                      </button>
                      {tx.status === 'posted' && canManage && (
                        <button
                          onClick={() => setReversingTx(tx)}
                          className="px-2 py-1 text-rose-700 hover:bg-rose-50 rounded border border-rose-200 font-bold text-xs transition cursor-pointer"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {moneyInTransactions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                      No incoming payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SECTION 6: MONEY OUT (ALL OUTFLOWS) */}
      {/* ========================================================== */}
      {activeSection === 'money_out' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search voucher #, payee, reference..."
                  value={searchTerm ?? ''}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedAccountIdFilter ?? ''}
                onChange={e => setSelectedAccountIdFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Accounts</option>
                {financialAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>

              <select
                value={statusFilter ?? ''}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="posted">Posted Only</option>
                <option value="draft">Drafts Only</option>
                <option value="reversed">Reversed</option>
              </select>

              <button
                onClick={handleOpenDirectMoneyOut}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Money Out
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payee / Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moneyOutTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {tx.transactionNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{tx.partyName}</span>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {tx.category.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{tx.accountName}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-rose-600">
                      -{currency} {tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'posted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.status === 'reversed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {tx.status === 'draft' && canManage && (
                        <button
                          onClick={async () => {
                            await postFinancialTransaction(tx.id);
                            addToast(`Transaction ${tx.transactionNumber} posted`, 'success');
                          }}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs transition cursor-pointer"
                        >
                          Post
                        </button>
                      )}
                      <button
                        onClick={() => setVoucherModalTx(tx)}
                        className="px-2 py-1 text-slate-700 hover:bg-slate-100 rounded border border-slate-300 font-semibold text-xs transition cursor-pointer"
                      >
                        Voucher
                      </button>
                      {tx.status === 'posted' && canManage && (
                        <button
                          onClick={() => setReversingTx(tx)}
                          className="px-2 py-1 text-rose-700 hover:bg-rose-50 rounded border border-rose-200 font-bold text-xs transition cursor-pointer"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {moneyOutTransactions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                      No disbursed payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SECTION 7: CASH & BANK ACCOUNTS & TRANSACTION LEDGER */}
      {/* ========================================================== */}
      {activeSection === 'accounts' && (
        <div className="space-y-6">
          {/* Subview Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setAccountsSubView('cards')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  accountsSubView === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Accounts Summary Cards
              </button>
              <button
                onClick={() => setAccountsSubView('ledger')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  accountsSubView === 'ledger'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Account Running Ledger
              </button>
              <button
                onClick={() => setAccountsSubView('journal')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  accountsSubView === 'journal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Double-Entry Journals
              </button>
            </div>

            {canManage && (
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setIsAccountModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Add Cash or Bank Account
              </button>
            )}
          </div>

          {/* Subview 1: Account Cards */}
          {accountsSubView === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {financialAccounts.map(acc => (
                <div
                  key={acc.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        GL {acc.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        acc.type === 'bank' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {acc.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mt-2">
                      {acc.name}
                    </h3>
                    {acc.bankName && (
                      <p className="text-xs text-slate-500 font-medium">{acc.bankName}</p>
                    )}
                    {acc.accountNumber && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{acc.accountNumber}</p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Balance</span>
                    <span className="text-xl font-black font-mono text-slate-900">
                      {acc.currency || currency} {(acc.currentBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                      <button
                        onClick={() => {
                          setSelectedLedgerAccountId(acc.id);
                          setAccountsSubView('ledger');
                        }}
                        className="text-xs text-sky-600 hover:text-sky-800 font-bold cursor-pointer"
                      >
                        View Ledger &rarr;
                      </button>
                      {canManage && (
                        <button
                          onClick={() => {
                            setEditingAccount(acc);
                            setIsAccountModalOpen(true);
                          }}
                          className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subview 2: Account Running Ledger */}
          {accountsSubView === 'ledger' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">Select Account:</span>
                  <select
                    value={selectedLedgerAccountId ?? ''}
                    onChange={e => setSelectedLedgerAccountId(e.target.value)}
                    className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-900"
                  >
                    {financialAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>

                {accountLedgerData.account && (
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span>Opening: <strong>{currency} {(accountLedgerData.account.openingBalance ?? 0).toFixed(2)}</strong></span>
                    <span>Total In: <strong className="text-emerald-600">+{currency} {(accountLedgerData.totalDebit ?? 0).toFixed(2)}</strong></span>
                    <span>Total Out: <strong className="text-rose-600">-{currency} {(accountLedgerData.totalCredit ?? 0).toFixed(2)}</strong></span>
                    <span className="px-2 py-1 bg-slate-900 text-white rounded font-bold">
                      Balance: {currency} {(accountLedgerData.currentBalance ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Voucher #</th>
                      <th className="px-4 py-3">Counterparty / Description</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Debit (In)</th>
                      <th className="px-4 py-3 text-right">Credit (Out)</th>
                      <th className="px-4 py-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accountLedgerData.ledger.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-600">{row.date}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                          {row.transactionNumber}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-slate-800">{row.partyName}</span>
                          {row.notes && (
                            <span className="block text-[11px] text-slate-400">{row.notes}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{row.paymentMethod}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600">
                          {row.debit > 0 ? `+${currency} ${row.debit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600">
                          {row.credit > 0 ? `-${currency} ${row.credit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900">
                          {currency} {(row.runningBalance ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {accountLedgerData.ledger.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          No transactions recorded for this account. Starting balance is {currency} {(accountLedgerData.account?.openingBalance ?? 0).toFixed(2)}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subview 3: Double-Entry Journal Entries */}
          {accountsSubView === 'journal' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Balanced Double-Entry General Journal
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    All posted transactions automatically maintain balanced debits and credits
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                  System Balanced: True (Debits = Credits)
                </span>
              </div>

              <div className="divide-y divide-slate-200">
                {journalEntries.map(jv => (
                  <div key={jv.id} className="p-4 hover:bg-slate-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono font-black text-slate-900">{jv.entryNumber}</span>
                        <span className="text-slate-400 mx-2">•</span>
                        <span className="font-semibold text-slate-800">{jv.description}</span>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <span className="text-slate-500">{jv.date}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg border border-slate-200/80 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/50 text-slate-500 border-b border-slate-200/60 font-semibold">
                          <tr>
                            <th className="px-3 py-1.5">Account Code & Title</th>
                            <th className="px-3 py-1.5">Narration</th>
                            <th className="px-3 py-1.5 text-right w-32">Debit ({currency})</th>
                            <th className="px-3 py-1.5 text-right w-32">Credit ({currency})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {jv.lines.map((l, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 font-medium text-slate-800">
                                {l.accountCode} - {l.accountName}
                              </td>
                              <td className="px-3 py-1.5 text-slate-500">{l.narration || '-'}</td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                                {l.debit > 0 ? l.debit.toFixed(2) : '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                                {l.credit > 0 ? l.credit.toFixed(2) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {journalEntries.length === 0 && (
                  <div className="p-8 text-center text-slate-400 italic text-xs">
                    No journal entries recorded.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* SECTION 8: FINANCIAL REPORTS & AGING */}
      {/* ========================================================== */}
      {activeSection === 'reports' && (
        <div className="space-y-6">
          {/* Reports Sub-nav */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setReportsSubView('customer_aging')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  reportsSubView === 'customer_aging'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customer Receivables Aging
              </button>
              <button
                onClick={() => setReportsSubView('supplier_aging')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  reportsSubView === 'supplier_aging'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Supplier Payables Aging
              </button>
              <button
                onClick={() => setReportsSubView('advances_summary')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  reportsSubView === 'advances_summary'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Advance Balances Summary
              </button>
              <button
                onClick={() => setReportsSubView('money_flow')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  reportsSubView === 'money_flow'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Money Received & Paid Breakdown
              </button>
            </div>
          </div>

          {/* Report 1: Customer Aging */}
          {reportsSubView === 'customer_aging' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Customer Accounts Receivable Aging Analysis
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Aged balances computed from invoice due dates (Current, 1-30, 31-60, 61-90, 90+ days)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 text-right">Current Due</th>
                      <th className="px-4 py-3 text-right">1 - 30 Days</th>
                      <th className="px-4 py-3 text-right">31 - 60 Days</th>
                      <th className="px-4 py-3 text-right">61 - 90 Days</th>
                      <th className="px-4 py-3 text-right">90+ Days</th>
                      <th className="px-4 py-3 text-right font-black">Total Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerAgingData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{row.customerName}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{row.customerPhone || '-'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                          {row.current > 0 ? `${currency} ${row.current.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-amber-700">
                          {row.days1To30 > 0 ? `${currency} ${row.days1To30.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-amber-800 font-semibold">
                          {row.days31To60 > 0 ? `${currency} ${row.days31To60.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-rose-600 font-semibold">
                          {row.days61To90 > 0 ? `${currency} ${row.days61To90.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-rose-700 font-black">
                          {row.days90Plus > 0 ? `${currency} ${row.days90Plus.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900">
                          {currency} {row.totalDue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {customerAgingData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          No outstanding customer receivables. All accounts current!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Report 2: Supplier Aging */}
          {reportsSubView === 'supplier_aging' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Supplier Accounts Payable Aging Analysis
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Aged balances owed to suppliers based on expected PO dates
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Supplier Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-right">Current Due</th>
                      <th className="px-4 py-3 text-right">1 - 30 Days</th>
                      <th className="px-4 py-3 text-right">31 - 60 Days</th>
                      <th className="px-4 py-3 text-right">61 - 90 Days</th>
                      <th className="px-4 py-3 text-right">90+ Days</th>
                      <th className="px-4 py-3 text-right font-black">Total Owed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierAgingData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{row.supplierName}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{row.supplierContact || '-'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                          {row.current > 0 ? `${currency} ${row.current.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-amber-700">
                          {row.days1To30 > 0 ? `${currency} ${row.days1To30.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-amber-800 font-semibold">
                          {row.days31To60 > 0 ? `${currency} ${row.days31To60.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-rose-600 font-semibold">
                          {row.days61To90 > 0 ? `${currency} ${row.days61To90.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-rose-700 font-black">
                          {row.days90Plus > 0 ? `${currency} ${row.days90Plus.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-rose-700">
                          {currency} {row.totalDue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {supplierAgingData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          No outstanding supplier payables. All accounts clear!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Report 3: Advances Summary */}
          {reportsSubView === 'advances_summary' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Customer & Supplier Advance Balances
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Voucher #</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Party Name</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Original Amount</th>
                      <th className="px-4 py-3 text-right">Applied</th>
                      <th className="px-4 py-3 text-right">Unapplied Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financialTransactions
                      .filter(t => t.type === 'CUSTOMER_ADVANCE' || t.type === 'SUPPLIER_ADVANCE')
                      .map(adv => (
                        <tr key={adv.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{adv.transactionNumber}</td>
                          <td className="px-4 py-2.5 capitalize text-slate-600">{adv.type.replace('_', ' ')}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800">{adv.partyName}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">{adv.date}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">
                            {currency} {adv.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                            {currency} {(adv.amount - (adv.unappliedAmount || 0)).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-700">
                            {currency} {(adv.unappliedAmount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Report 4: Money Flow by Method and Account */}
          {reportsSubView === 'money_flow' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Methods Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-4">
                  Collections & Payments by Payment Method
                </h3>
                <div className="space-y-3">
                  {['Cash', 'Bank Transfer', 'Card', 'Cheque', 'Other'].map(method => {
                    const inAmt = financialTransactions
                      .filter(t => (t.type === 'MONEY_IN' || t.type === 'CUSTOMER_ADVANCE') && t.status === 'posted' && t.paymentMethod === method)
                      .reduce((sum, t) => sum + t.amount, 0);
                    const outAmt = financialTransactions
                      .filter(t => (t.type === 'MONEY_OUT' || t.type === 'SUPPLIER_ADVANCE') && t.status === 'posted' && t.paymentMethod === method)
                      .reduce((sum, t) => sum + t.amount, 0);

                    return (
                      <div key={method} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{method}</span>
                        <div className="text-right font-mono space-x-3">
                          <span className="text-emerald-600 font-bold">In: {currency} {inAmt.toFixed(2)}</span>
                          <span className="text-rose-600 font-bold">Out: {currency} {outAmt.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By Account Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-4">
                  Activity by Financial Account
                </h3>
                <div className="space-y-3">
                  {financialAccounts.map(acc => (
                    <div key={acc.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono text-slate-400 font-bold">GL {acc.code}</span>
                        <h4 className="font-bold text-slate-900">{acc.name}</h4>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Balance</span>
                        <span className="text-sm font-black text-slate-900">
                          {currency} {acc.currentBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* MODALS */}
      {/* ========================================================== */}

      {/* Transaction Modal (Money In, Out, Advances, Refunds) */}
      <RecordTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        mode={txModalMode}
        initialPartyId={txModalInitialPartyId}
        initialPartyName={txModalInitialPartyName}
        initialInvoiceId={txModalInitialInvoiceId}
        initialPoId={txModalInitialPoId}
        initialAdvanceId={txModalInitialAdvanceId}
        accounts={financialAccounts}
        customers={customers}
        suppliers={suppliers}
        invoices={invoices}
        purchaseOrders={purchaseOrders}
        advances={financialTransactions}
        settings={settings}
        onSubmit={createFinancialTransaction}
        onApplyAdvance={applyAdvance}
        onRefundAdvance={refundAdvance}
        onSuccessVoucher={tx => {
          addToast(`Transaction ${tx.transactionNumber} recorded successfully`, 'success');
          if (tx.type === 'MONEY_IN' || tx.type === 'CUSTOMER_ADVANCE') {
            setReceiptModalTx(tx);
          } else {
            setVoucherModalTx(tx);
          }
        }}
      />

      {/* Manage Cash / Bank Account Modal */}
      <ManageAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        settings={settings}
        onSave={async accData => {
          if (editingAccount) {
            await updateFinancialAccount(editingAccount.id, accData);
            addToast(`Account ${accData.name} updated`, 'success');
          } else {
            await createFinancialAccount(accData);
            addToast(`Account ${accData.name} created`, 'success');
          }
        }}
      />

      {/* Printable Receipt Modal */}
      <PaymentReceiptModal
        isOpen={Boolean(receiptModalTx)}
        onClose={() => setReceiptModalTx(null)}
        transaction={receiptModalTx}
        settings={settings}
      />

      {/* Printable Payment Voucher Modal */}
      <PaymentVoucherModal
        isOpen={Boolean(voucherModalTx)}
        onClose={() => setVoucherModalTx(null)}
        transaction={voucherModalTx}
        settings={settings}
      />

      {/* Audited Reversal Confirmation Dialog */}
      {reversingTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">
                Reverse Financial Transaction
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              You are about to reverse posted transaction{' '}
              <strong className="font-mono text-slate-900">{reversingTx.transactionNumber}</strong>{' '}
              ({reversingTx.partyName}, {currency} {reversingTx.amount.toFixed(2)}).
              This action will reverse the account balance, restore open document balances, and create an auditable reversing journal entry.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Reversal *
              </label>
              <textarea
                required
                rows={2}
                value={reversalReason ?? ''}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="State the audit reason for cancelling this voucher..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setReversingTx(null);
                  setReversalReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reversalReason.trim() || isReversing}
                onClick={handleExecuteReversal}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isReversing ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
