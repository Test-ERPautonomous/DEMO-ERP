import React, { useState, useEffect } from 'react';
import { 
  FinancialAccount, 
  FinancialTransaction, 
  Invoice, 
  PurchaseOrder, 
  CustomerMasterItem, 
  SupplierMasterItem, 
  GarageSettings,
  FinancialPaymentMethod
} from '../../types';
import { 
  X, 
  DollarSign, 
  Check, 
  AlertCircle, 
  User, 
  Building2, 
  Calendar, 
  Landmark, 
  Wallet, 
  FileText, 
  ArrowRight,
  Plus,
  Receipt,
  CreditCard,
  Layers,
  Sparkles
} from 'lucide-react';

export type TransactionModalMode =
  | 'receive_customer_payment'
  | 'pay_supplier_bill'
  | 'customer_advance'
  | 'supplier_advance'
  | 'apply_advance'
  | 'refund_advance'
  | 'direct_money_in'
  | 'direct_money_out';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: TransactionModalMode;
  initialPartyId?: string;
  initialPartyName?: string;
  initialInvoiceId?: string;
  initialPoId?: string;
  initialAdvanceId?: string;
  accounts: FinancialAccount[];
  customers: CustomerMasterItem[];
  suppliers: SupplierMasterItem[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  advances: FinancialTransaction[];
  settings: GarageSettings;
  onSubmit: (txData: any) => Promise<any>;
  onApplyAdvance: (advanceId: string, targetType: 'invoice' | 'purchase_order', targetId: string, amount: number) => Promise<void>;
  onRefundAdvance: (advanceId: string, refundAmount: number, accountId: string, paymentMethod?: string, notes?: string) => Promise<void>;
  onSuccessVoucher?: (tx: FinancialTransaction) => void;
}

const FALLBACK_TREASURY_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'acc-cash-1010',
    code: '1010',
    name: 'Main Cash Drawer',
    type: 'Cash',
    currency: 'QAR',
    currentBalance: 12500,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  },
  {
    id: 'acc-bank-1020',
    code: '1020',
    name: 'QNB Operations Bank Account',
    type: 'Bank',
    currency: 'QAR',
    currentBalance: 45000,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  },
  {
    id: 'acc-bank-1030',
    code: '1030',
    name: 'CBQ Workshop Operating Account',
    type: 'Bank',
    currency: 'QAR',
    currentBalance: 28000,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  },
  {
    id: 'acc-petty-1040',
    code: '1040',
    name: 'Petty Cash Box',
    type: 'Cash',
    currency: 'QAR',
    currentBalance: 2500,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  }
];

const DEFAULT_FALLBACK_SUPPLIERS: SupplierMasterItem[] = [
  { id: 'supp-mannai', name: 'Mannai Automotive Spares', phone: '+974 4455 8899', category: 'OEM Parts' } as any,
  { id: 'supp-doha', name: 'Doha Spare Parts Trading Co', phone: '+974 4460 1122', category: 'Aftermarket Spares' } as any,
  { id: 'supp-muftah', name: 'Al Muftah Auto Parts', phone: '+974 4432 4455', category: 'Filters & Brakes' } as any,
  { id: 'supp-scrap', name: 'Industrial Area Scrap Yard & Metals', phone: '+974 5511 2233', category: 'Scrap & Used' } as any,
  { id: 'supp-oil', name: 'Qatar National Lubricants & Tyres', phone: '+974 4477 9900', category: 'Consumables' } as any,
];

const DEFAULT_FALLBACK_CUSTOMERS: CustomerMasterItem[] = [
  { id: 'cust-walkin', name: 'Walk-in Cash Customer', phone: '+974 5500 0001', address: 'Doha' } as any,
  { id: 'cust-fleet', name: 'Al Jaber Fleet Logistics', phone: '+974 4488 2211', address: 'Industrial Area' } as any,
  { id: 'cust-limo', name: 'Doha Oasis Limousine Services', phone: '+974 5533 7788', address: 'Al Sadd' } as any,
];

export const RecordTransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mode,
  initialPartyId,
  initialPartyName,
  initialInvoiceId,
  initialPoId,
  initialAdvanceId,
  accounts,
  customers,
  suppliers,
  invoices,
  purchaseOrders,
  advances,
  settings,
  onSubmit,
  onApplyAdvance,
  onRefundAdvance,
  onSuccessVoucher,
}) => {
  const currency = settings.currencySymbol || 'QAR';
  
  const effectiveAccounts = React.useMemo(() => {
    const active = (accounts || []).filter(a => a.isActive);
    if (active.length > 0) return active;
    if ((accounts || []).length > 0) return accounts;
    return FALLBACK_TREASURY_ACCOUNTS;
  }, [accounts]);

  const effectiveSuppliers = React.useMemo(() => {
    return (suppliers && suppliers.length > 0) ? suppliers : DEFAULT_FALLBACK_SUPPLIERS;
  }, [suppliers]);

  const effectiveCustomers = React.useMemo(() => {
    return (customers && customers.length > 0) ? customers : DEFAULT_FALLBACK_CUSTOMERS;
  }, [customers]);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccountId, setSelectedAccountId] = useState(effectiveAccounts[0]?.id || FALLBACK_TREASURY_ACCOUNTS[0].id);
  const [paymentMethod, setPaymentMethod] = useState<FinancialPaymentMethod>('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [customPayeeMode, setCustomPayeeMode] = useState(false);

  // Customer / Supplier selection
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyPhone, setCounterpartyPhone] = useState('');

  // Amount & Allocations
  const [totalPaymentAmount, setTotalPaymentAmount] = useState<number>(0);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [excessAsAdvance, setExcessAsAdvance] = useState(true);

  // Advance Mode states
  const [selectedAdvanceId, setSelectedAdvanceId] = useState(initialAdvanceId || '');
  const [advanceApplyTargetType, setAdvanceApplyTargetType] = useState<'invoice' | 'purchase_order'>('invoice');
  const [advanceApplyTargetId, setAdvanceApplyTargetId] = useState('');
  const [advanceApplyAmount, setAdvanceApplyAmount] = useState<number>(0);

  // Expense Category for direct money out
  const [expenseCategory, setExpenseCategory] = useState<'expense' | 'supplier_payment' | 'other'>('expense');
  const [expenseTitle, setExpenseTitle] = useState('Workshop Supplies / Consumables');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset or configure form upon open/mode change
  useEffect(() => {
    if (!isOpen) return;

    setDate(new Date().toISOString().split('T')[0]);
    setSelectedAccountId(prev => {
      if (prev && effectiveAccounts.some(a => a.id === prev)) return prev;
      return effectiveAccounts[0]?.id || FALLBACK_TREASURY_ACCOUNTS[0].id;
    });
    setPaymentMethod('Cash');
    setReferenceNumber('');
    setNotes('');
    setSaveAsDraft(false);
    setErrorMessage(null);
    setAllocations({});
    setCustomPayeeMode(false);

    if (mode === 'receive_customer_payment') {
      const cust = effectiveCustomers.find(c => c.id === initialPartyId || c.name === initialPartyName) || effectiveCustomers[0];
      if (cust) {
        setSelectedCustomerId(cust.id);
        setCounterpartyName(cust.name);
        setCounterpartyPhone(cust.phone || '');
      } else {
        setSelectedCustomerId('');
        setCounterpartyName(initialPartyName || '');
        setCounterpartyPhone('');
      }

      // If opening for specific invoice
      if (initialInvoiceId) {
        const inv = invoices.find(i => i.id === initialInvoiceId);
        if (inv) {
          const bal = inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
          setTotalPaymentAmount(bal);
          setAllocations({ [inv.id]: bal });
          setCounterpartyName(inv.customerName);
          setCounterpartyPhone(inv.customerPhone || '');
        }
      } else {
        setTotalPaymentAmount(0);
      }
    } else if (mode === 'pay_supplier_bill') {
      const supp = effectiveSuppliers.find(s => s.id === initialPartyId || s.name === initialPartyName) || effectiveSuppliers[0];
      if (supp) {
        setSelectedSupplierId(supp.id);
        setCounterpartyName(supp.name);
        setCounterpartyPhone(supp.phone || '');
      } else {
        setSelectedSupplierId('');
        setCounterpartyName(initialPartyName || '');
        setCounterpartyPhone('');
      }

      if (initialPoId) {
        const po = purchaseOrders.find(p => p.id === initialPoId);
        if (po) {
          setTotalPaymentAmount(po.totalAmount);
          setAllocations({ [po.id]: po.totalAmount });
          setCounterpartyName(po.supplierName);
        }
      } else {
        setTotalPaymentAmount(0);
      }
    } else if (mode === 'customer_advance') {
      const cust = effectiveCustomers.find(c => c.id === initialPartyId || c.name === initialPartyName) || effectiveCustomers[0];
      setSelectedCustomerId(cust?.id || '');
      setCounterpartyName(cust?.name || initialPartyName || '');
      setCounterpartyPhone(cust?.phone || '');
      setTotalPaymentAmount(1000);
      setNotes('Advance deposit received before job execution');
    } else if (mode === 'supplier_advance') {
      const supp = effectiveSuppliers.find(s => s.id === initialPartyId || s.name === initialPartyName) || effectiveSuppliers[0];
      setSelectedSupplierId(supp?.id || '');
      setCounterpartyName(supp?.name || initialPartyName || '');
      setCounterpartyPhone(supp?.phone || '');
      setTotalPaymentAmount(1500);
      setNotes('Prepayment / advance for ordered spare parts');
    } else if (mode === 'apply_advance') {
      const adv = advances.find(a => a.id === initialAdvanceId) || advances.find(a => a.unappliedAmount > 0) || advances[0];
      if (adv) {
        setSelectedAdvanceId(adv.id);
        setAdvanceApplyAmount(adv.unappliedAmount);
        setAdvanceApplyTargetType(adv.type === 'CUSTOMER_ADVANCE' ? 'invoice' : 'purchase_order');
      }
    } else if (mode === 'refund_advance') {
      const adv = advances.find(a => a.id === initialAdvanceId) || advances.find(a => a.unappliedAmount > 0) || advances[0];
      if (adv) {
        setSelectedAdvanceId(adv.id);
        setTotalPaymentAmount(adv.unappliedAmount);
        setNotes(`Refund / return of unutilized advance voucher ${adv.transactionNumber}`);
      }
    } else if (mode === 'direct_money_in') {
      setCounterpartyName('Walk-in Customer / Other Income');
      setTotalPaymentAmount(500);
      setNotes('Direct counter revenue / workshop receipt');
    } else if (mode === 'direct_money_out') {
      setCounterpartyName('Workshop Supplies / Vendor');
      setTotalPaymentAmount(350);
      setNotes('General workshop operational expense payment');
    }
  }, [isOpen, mode, initialPartyId, initialPartyName, initialInvoiceId, initialPoId, initialAdvanceId, effectiveAccounts, effectiveCustomers, effectiveSuppliers]);

  if (!isOpen) return null;

  // Filter invoices for selected customer that have remaining balances
  const openCustomerInvoices = invoices.filter(inv => {
    const custName = (inv.customerName || inv.customer?.name || '').toLowerCase();
    const targetName = (counterpartyName || '').toLowerCase();
    const isMatchingCust = 
      (selectedCustomerId && (inv.customer?.id === selectedCustomerId || (custName && targetName && custName === targetName))) ||
      (!selectedCustomerId && targetName && custName && custName.includes(targetName));
    const bal = inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
    return isMatchingCust && bal > 0.001;
  });

  // Filter purchase orders for selected supplier that are unpaid
  const openSupplierPOs = purchaseOrders.filter(po => {
    const suppName = (po.supplierName || '').toLowerCase();
    const targetName = (counterpartyName || '').toLowerCase();
    const isMatchingSupp =
      (selectedSupplierId && (po.supplierId === selectedSupplierId || (suppName && targetName && suppName === targetName))) ||
      (!selectedSupplierId && targetName && suppName && suppName.includes(targetName));
    return isMatchingSupp && po.paymentStatus !== 'Paid';
  });

  // Auto-allocate helper: distributes total payment amount to open invoices oldest-first
  const handleAutoAllocateInvoices = (amountToDistribute: number) => {
    let remaining = amountToDistribute;
    const newAlloc: Record<string, number> = {};
    for (const inv of openCustomerInvoices) {
      if (remaining <= 0) break;
      const bal = inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
      const allocAmt = Math.min(bal, remaining);
      newAlloc[inv.id] = allocAmt;
      remaining -= allocAmt;
    }
    setAllocations(newAlloc);
  };

  const handleAutoAllocatePOs = (amountToDistribute: number) => {
    let remaining = amountToDistribute;
    const newAlloc: Record<string, number> = {};
    for (const po of openSupplierPOs) {
      if (remaining <= 0) break;
      const bal = po.totalAmount;
      const allocAmt = Math.min(bal, remaining);
      newAlloc[po.id] = allocAmt;
      remaining -= allocAmt;
    }
    setAllocations(newAlloc);
  };

  const totalAllocated: number = Object.values(allocations).reduce<number>((sum, a) => sum + (Number(a) || 0), 0);
  const unallocatedDifference: number = Math.max(0, Number(totalPaymentAmount || 0) - totalAllocated);

  const selectedAdvance = advances.find(a => a.id === selectedAdvanceId);

  // Available open target documents for applying advance
  const advanceTargetInvoices = invoices.filter(inv => {
    if (!selectedAdvance) return false;
    const invCust = (inv.customerName || inv.customer?.name || '').toLowerCase();
    const advParty = (selectedAdvance.partyName || '').toLowerCase();
    const isMatch = !advParty || (invCust && invCust.includes(advParty));
    const bal = inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
    return isMatch && bal > 0.001;
  });

  const advanceTargetPOs = purchaseOrders.filter(po => {
    if (!selectedAdvance) return false;
    const poSupp = (po.supplierName || '').toLowerCase();
    const advParty = (selectedAdvance.partyName || '').toLowerCase();
    const isMatch = !advParty || (poSupp && poSupp.includes(advParty));
    return isMatch && po.paymentStatus !== 'Paid';
  });

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find(item => item.id === custId);
    if (c) {
      setCounterpartyName(c.name);
      setCounterpartyPhone(c.phone || '');
    }
    setAllocations({});
  };

  const handleSupplierSelect = (suppId: string) => {
    setSelectedSupplierId(suppId);
    const s = suppliers.find(item => item.id === suppId);
    if (s) {
      setCounterpartyName(s.name);
      setCounterpartyPhone(s.phone || '');
    }
    setAllocations({});
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const account = effectiveAccounts.find(a => a.id === selectedAccountId) || effectiveAccounts[0];
    if (!account) {
      setErrorMessage('Please select a valid cash or bank account');
      return;
    }

    try {
      setIsSubmitting(true);

      // Workflow: Advance Application
      if (mode === 'apply_advance') {
        if (!selectedAdvance) {
          setErrorMessage('Please select an unapplied advance record');
          return;
        }
        if (!advanceApplyTargetId) {
          setErrorMessage('Please select a target invoice or bill to apply the advance to');
          return;
        }
        if (advanceApplyAmount <= 0) {
          setErrorMessage('Please enter a positive amount to apply');
          return;
        }
        if (advanceApplyAmount > (selectedAdvance.unappliedAmount || 0) + 0.001) {
          setErrorMessage(`Applied amount (${advanceApplyAmount}) exceeds unapplied advance balance (${selectedAdvance.unappliedAmount})`);
          return;
        }

        await onApplyAdvance(selectedAdvance.id, advanceApplyTargetType, advanceApplyTargetId, advanceApplyAmount);
        onClose();
        return;
      }

      // Workflow: Advance Return / Refund
      if (mode === 'refund_advance') {
        if (!selectedAdvance) {
          setErrorMessage('Please select an unapplied advance record to refund');
          return;
        }
        if (totalPaymentAmount <= 0) {
          setErrorMessage('Please enter a positive refund amount');
          return;
        }
        if (totalPaymentAmount > (selectedAdvance.unappliedAmount || 0) + 0.001) {
          setErrorMessage(`Refund amount (${totalPaymentAmount}) cannot exceed unapplied advance balance (${selectedAdvance.unappliedAmount})`);
          return;
        }

        await onRefundAdvance(selectedAdvance.id, totalPaymentAmount, account.id, paymentMethod, notes);
        onClose();
        return;
      }

      // Standard Transactions: Money In, Money Out, Advances
      if (totalPaymentAmount <= 0) {
        setErrorMessage('Transaction amount must be greater than zero');
        return;
      }
      if (!counterpartyName.trim()) {
        setErrorMessage('Counterparty (customer or supplier) name is required');
        return;
      }

      // Over-allocation guard for Customer Payment
      if (mode === 'receive_customer_payment') {
        if (totalAllocated > totalPaymentAmount + 0.001) {
          setErrorMessage(`Over-allocation prevented: Total allocated to invoices (${totalAllocated.toFixed(2)}) exceeds payment amount (${totalPaymentAmount.toFixed(2)})`);
          return;
        }
      }

      // Over-allocation guard for Supplier Payment
      if (mode === 'pay_supplier_bill') {
        if (totalAllocated > totalPaymentAmount + 0.001) {
          setErrorMessage(`Over-allocation prevented: Total allocated to POs (${totalAllocated.toFixed(2)}) exceeds payment amount (${totalPaymentAmount.toFixed(2)})`);
          return;
        }
      }

      const formattedAllocations = Object.entries(allocations)
        .filter(([_, amt]) => Number(amt) > 0)
        .map(([targetId, amt]) => {
          if (mode === 'receive_customer_payment') {
            const inv = invoices.find(i => i.id === targetId);
            return {
              targetType: 'invoice',
              targetId,
              targetNumber: inv?.invoiceNumber || targetId,
              amount: Number(amt),
            };
          } else {
            const po = purchaseOrders.find(p => p.id === targetId);
            return {
              targetType: 'purchase_order',
              targetId,
              targetNumber: po?.poNumber || targetId,
              amount: Number(amt),
            };
          }
        });

      let txType: FinancialTransaction['type'] = 'MONEY_IN';
      let txCategory: FinancialTransaction['category'] = 'customer_payment';
      let partyType: FinancialTransaction['partyType'] = 'customer';

      if (mode === 'receive_customer_payment') {
        txType = 'MONEY_IN';
        txCategory = 'customer_payment';
        partyType = 'customer';
      } else if (mode === 'pay_supplier_bill') {
        txType = 'MONEY_OUT';
        txCategory = 'supplier_payment';
        partyType = 'supplier';
      } else if (mode === 'customer_advance') {
        txType = 'CUSTOMER_ADVANCE';
        txCategory = 'customer_advance';
        partyType = 'customer';
      } else if (mode === 'supplier_advance') {
        txType = 'SUPPLIER_ADVANCE';
        txCategory = 'supplier_advance';
        partyType = 'supplier';
      } else if (mode === 'direct_money_in') {
        txType = 'MONEY_IN';
        txCategory = 'other_income';
        partyType = 'other';
      } else if (mode === 'direct_money_out') {
        txType = 'MONEY_OUT';
        txCategory = 'expense';
        partyType = 'other';
      }

      const txPayload = {
        type: txType,
        category: txCategory,
        date,
        amount: totalPaymentAmount,
        accountId: account.id,
        paymentMethod,
        partyType,
        partyId: partyType === 'customer' ? selectedCustomerId : selectedSupplierId,
        partyName: counterpartyName.trim(),
        partyPhone: counterpartyPhone.trim(),
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        status: saveAsDraft ? 'draft' : 'posted',
        allocations: formattedAllocations,
        companyId: 'comp-1',
      };

      const result = await onSubmit(txPayload);
      onClose();

      if (result && onSuccessVoucher) {
        onSuccessVoucher(result);
      }
    } catch (err: any) {
      console.error('[RecordTransactionModal Error]', err);
      setErrorMessage(err?.message || 'Failed to process financial transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeTitles: Record<TransactionModalMode, { title: string; subtitle: string; icon: any; isMoneyIn: boolean }> = {
    receive_customer_payment: {
      title: 'Receive Customer Payment & Allocate',
      subtitle: 'Accounts Receivable - Credit customer account against open invoices',
      icon: Receipt,
      isMoneyIn: true,
    },
    pay_supplier_bill: {
      title: 'Disburse Supplier Payment & Allocate',
      subtitle: 'Accounts Payable - Debit vendor balance against purchase orders',
      icon: CreditCard,
      isMoneyIn: false,
    },
    customer_advance: {
      title: 'Record Customer Advance Deposit',
      subtitle: 'Unapplied Customer Credit - Advance deposit before job execution',
      icon: Wallet,
      isMoneyIn: true,
    },
    supplier_advance: {
      title: 'Record Supplier Prepayment / Advance',
      subtitle: 'Unapplied Supplier Advance - Outgoing prepayment for spare parts',
      icon: Building2,
      isMoneyIn: false,
    },
    apply_advance: {
      title: 'Apply Unapplied Advance to Invoice / Bill',
      subtitle: 'Traceable credit allocation from existing customer/supplier advance',
      icon: Layers,
      isMoneyIn: true,
    },
    refund_advance: {
      title: 'Refund / Return Unutilized Advance',
      subtitle: 'Traceable refund transaction linking to the original advance deposit',
      icon: ArrowRight,
      isMoneyIn: false,
    },
    direct_money_in: {
      title: 'Record Direct Money In (Receipt)',
      subtitle: 'Cashier deposit, counter cash, scrap sale or miscellaneous revenue',
      icon: DollarSign,
      isMoneyIn: true,
    },
    direct_money_out: {
      title: 'Record Direct Money Out (Voucher)',
      subtitle: 'Workshop supplies, rent, utility bills, or operational expenditures',
      icon: CreditCard,
      isMoneyIn: false,
    },
  };

  const currentModeInfo = modeTitles[mode];
  const IconComp = currentModeInfo.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 text-white shrink-0 ${
          currentModeInfo.isMoneyIn ? 'bg-slate-900' : 'bg-slate-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              currentModeInfo.isMoneyIn 
                ? 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-400' 
                : 'bg-rose-600/30 border border-rose-500/40 text-rose-400'
            }`}>
              <IconComp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white">
                {currentModeInfo.title}
              </h3>
              <p className="text-xs text-slate-400">
                {currentModeInfo.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Mode 1: Advance Application workflow */}
          {mode === 'apply_advance' ? (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Unapplied Advance Record *
                </label>
                <select
                  required
                  value={selectedAdvanceId ?? ''}
                  onChange={e => {
                    setSelectedAdvanceId(e.target.value);
                    const adv = advances.find(a => a.id === e.target.value);
                    if (adv) {
                      setAdvanceApplyAmount(adv.unappliedAmount);
                      setAdvanceApplyTargetType(adv.type === 'CUSTOMER_ADVANCE' ? 'invoice' : 'purchase_order');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">-- Choose unapplied advance --</option>
                  {advances.filter(a => a.unappliedAmount > 0).map(adv => (
                    <option key={adv.id} value={adv.id}>
                      {adv.transactionNumber} - {adv.partyName} ({adv.type.replace('_', ' ')}) | Unapplied: {currency} {adv.unappliedAmount.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAdvance && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg flex justify-between items-center text-sky-900">
                  <div>
                    <span className="font-bold">{selectedAdvance.partyName}</span>
                    <p className="text-[11px] text-sky-700">
                      Total Advance: {currency} {selectedAdvance.amount.toFixed(2)} | Date: {selectedAdvance.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-sky-600 block uppercase font-bold">Unapplied Balance</span>
                    <span className="text-base font-black font-mono text-sky-800">
                      {currency} {selectedAdvance.unappliedAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Document Type
                  </label>
                  <div className="p-2.5 bg-slate-100 rounded-lg font-semibold text-slate-700">
                    {selectedAdvance?.type === 'CUSTOMER_ADVANCE' ? 'Customer Invoice / Work Order' : 'Supplier Purchase Order / Bill'}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Amount to Apply ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedAdvance?.unappliedAmount || 0}
                    required
                    value={advanceApplyAmount ?? ''}
                    onChange={e => setAdvanceApplyAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Document (Open Balance) *
                </label>
                {selectedAdvance?.type === 'CUSTOMER_ADVANCE' ? (
                  <select
                    required
                    value={advanceApplyTargetId ?? ''}
                    onChange={e => setAdvanceApplyTargetId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="">-- Select open customer invoice --</option>
                    {advanceTargetInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customerName} | Balance Due: {currency} {(inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0))).toFixed(2)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={advanceApplyTargetId ?? ''}
                    onChange={e => setAdvanceApplyTargetId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="">-- Select open supplier purchase order --</option>
                    {advanceTargetPOs.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} - {po.supplierName} | Amount: {currency} {po.totalAmount.toFixed(2)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : mode === 'refund_advance' ? (
            /* Mode 2: Advance Refund / Return workflow */
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Advance Voucher to Refund / Return *
                </label>
                <select
                  required
                  value={selectedAdvanceId ?? ''}
                  onChange={e => {
                    setSelectedAdvanceId(e.target.value);
                    const adv = advances.find(a => a.id === e.target.value);
                    if (adv) {
                      setTotalPaymentAmount(adv.unappliedAmount);
                      setNotes(`Refund / return of unutilized advance voucher ${adv.transactionNumber}`);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">-- Choose unapplied advance --</option>
                  {advances.filter(a => a.unappliedAmount > 0).map(adv => (
                    <option key={adv.id} value={adv.id}>
                      {adv.transactionNumber} - {adv.partyName} ({adv.type.replace('_', ' ')}) | Unapplied: {currency} {adv.unappliedAmount.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAdvance && (
                <div className={`p-3 rounded-lg border flex justify-between items-center ${
                  selectedAdvance.type === 'CUSTOMER_ADVANCE' 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div>
                    <span className="font-bold">{selectedAdvance.partyName}</span>
                    <p className="text-[11px] opacity-80">
                      {selectedAdvance.type === 'CUSTOMER_ADVANCE' 
                        ? 'Customer Advance Returned by Garage (Money Out)' 
                        : 'Supplier Prepayment Returned by Supplier (Money In)'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] block uppercase font-bold opacity-75">Available Unapplied</span>
                    <span className="text-base font-black font-mono">
                      {currency} {selectedAdvance.unappliedAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Refund Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedAdvance?.unappliedAmount || 0}
                    required
                    value={totalPaymentAmount ?? ''}
                    onChange={e => setTotalPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cash / Bank Account *
                  </label>
                  <select
                    required
                    value={selectedAccountId || effectiveAccounts[0]?.id || ''}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    {effectiveAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({currency} {acc.currentBalance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod ?? ''}
                    onChange={e => setPaymentMethod(e.target.value as FinancialPaymentMethod)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Refund Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date ?? ''}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Narration / Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  value={notes ?? ''}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Reason for advance return..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          ) : (
            /* Mode 3, 4, 5, 6, 7: Standard Payment / Advance / Direct In/Out */
            <div className="space-y-4">
              {/* Counterparty selection */}
              <div className="grid grid-cols-2 gap-4">
                {mode === 'receive_customer_payment' || mode === 'customer_advance' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 uppercase tracking-wider">
                        Customer *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPayeeMode(!customPayeeMode);
                          if (!customPayeeMode && !counterpartyName) setCounterpartyName('Walk-in Customer');
                        }}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                      >
                        {customPayeeMode ? 'Select from Directory' : '+ Custom Name'}
                      </button>
                    </div>
                    {customPayeeMode ? (
                      <input
                        type="text"
                        required
                        value={counterpartyName}
                        onChange={e => {
                          setCounterpartyName(e.target.value);
                          setSelectedCustomerId('');
                        }}
                        placeholder="Enter customer name..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                      />
                    ) : (
                      <select
                        value={selectedCustomerId || ''}
                        onChange={e => {
                          if (e.target.value === '__custom__') {
                            setCustomPayeeMode(true);
                            setSelectedCustomerId('');
                          } else {
                            handleCustomerSelect(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                      >
                        <option value="">-- Select Customer from Directory --</option>
                        {effectiveCustomers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                          </option>
                        ))}
                        <option value="__custom__">+ Enter Custom / New Customer Name...</option>
                      </select>
                    )}
                  </div>
                ) : mode === 'pay_supplier_bill' || mode === 'supplier_advance' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 uppercase tracking-wider">
                        Supplier / Vendor *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPayeeMode(!customPayeeMode);
                          if (!customPayeeMode && !counterpartyName) setCounterpartyName('General Parts Vendor');
                        }}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                      >
                        {customPayeeMode ? 'Select from Directory' : '+ Custom Vendor'}
                      </button>
                    </div>
                    {customPayeeMode ? (
                      <input
                        type="text"
                        required
                        value={counterpartyName}
                        onChange={e => {
                          setCounterpartyName(e.target.value);
                          setSelectedSupplierId('');
                        }}
                        placeholder="Enter vendor / supplier name..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                      />
                    ) : (
                      <select
                        value={selectedSupplierId || ''}
                        onChange={e => {
                          if (e.target.value === '__custom__') {
                            setCustomPayeeMode(true);
                            setSelectedSupplierId('');
                          } else {
                            handleSupplierSelect(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                      >
                        <option value="">-- Select Supplier from Directory --</option>
                        {effectiveSuppliers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.phone ? `(${s.phone})` : ''}
                          </option>
                        ))}
                        <option value="__custom__">+ Enter Custom / New Vendor Name...</option>
                      </select>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Counterparty / Payee Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={counterpartyName ?? ''}
                      onChange={e => setCounterpartyName(e.target.value)}
                      placeholder="e.g. Al Attiya Property / Kahramaa"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={counterpartyPhone ?? ''}
                    onChange={e => setCounterpartyPhone(e.target.value)}
                    placeholder="+974 ..."
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Financial Account and Payment Method */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {currentModeInfo.isMoneyIn ? 'Deposit Into Account *' : 'Pay From Account *'}
                  </label>
                  <select
                    required
                    value={selectedAccountId || effectiveAccounts[0]?.id || ''}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white font-medium"
                  >
                    {effectiveAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({currency} {acc.currentBalance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod ?? ''}
                    onChange={e => setPaymentMethod(e.target.value as FinancialPaymentMethod)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date ?? ''}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Amount and Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Total Amount ({currency}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={totalPaymentAmount ?? ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setTotalPaymentAmount(val);
                        if (mode === 'receive_customer_payment' && openCustomerInvoices.length > 0) {
                          handleAutoAllocateInvoices(val);
                        } else if (mode === 'pay_supplier_bill' && openSupplierPOs.length > 0) {
                          handleAutoAllocatePOs(val);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm font-mono font-black border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reference / Cheque / Card Slip #
                  </label>
                  <input
                    type="text"
                    value={referenceNumber ?? ''}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="e.g. QNB-TRF-9821 / CHQ-10492"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Allocation Table for Customer Invoices */}
              {mode === 'receive_customer_payment' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                  <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Allocate Payment to Customer Invoices ({openCustomerInvoices.length} Open)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAutoAllocateInvoices(totalPaymentAmount)}
                      className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold cursor-pointer underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-sky-600" />
                      Auto-Allocate Oldest First
                    </button>
                  </div>

                  {openCustomerInvoices.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 italic">
                      No unpaid invoices found for this customer. Any unallocated amount will be credited as an unapplied Customer Advance.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Invoice #</th>
                          <th className="px-3 py-2">Due Date</th>
                          <th className="px-3 py-2 text-right">Invoice Total</th>
                          <th className="px-3 py-2 text-right">Already Paid</th>
                          <th className="px-3 py-2 text-right">Balance Due</th>
                          <th className="px-3 py-2 text-right w-36">Allocate ({currency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {openCustomerInvoices.map(inv => {
                          const bal = inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
                          const currentAlloc = allocations[inv.id] || 0;
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">
                                {inv.invoiceNumber}
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-mono">
                                {inv.dueDate || inv.date}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {currency} {(inv.grandTotal || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-600">
                                {currency} {(inv.paidAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-rose-600">
                                {currency} {bal.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={bal}
                                  value={currentAlloc || ''}
                                  placeholder="0.00"
                                  onChange={e => {
                                    const val = Math.min(bal, Math.max(0, parseFloat(e.target.value) || 0));
                                    setAllocations({ ...allocations, [inv.id]: val });
                                  }}
                                  className="w-full text-right px-2 py-1 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-sky-500 text-xs"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Allocation Summary Bar */}
                  <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
                    <div className="space-x-4">
                      <span>Total Allocated: <strong className="font-mono">{currency} {totalAllocated.toFixed(2)}</strong></span>
                      {unallocatedDifference > 0 && (
                        <span className="text-amber-800 font-medium">
                          Excess Recorded as Unapplied Credit: <strong className="font-mono font-bold">{currency} {unallocatedDifference.toFixed(2)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Allocation Table for Supplier POs */}
              {mode === 'pay_supplier_bill' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                  <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Allocate Payment to Supplier Bills ({openSupplierPOs.length} Open)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAutoAllocatePOs(totalPaymentAmount)}
                      className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold cursor-pointer underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-sky-600" />
                      Auto-Allocate
                    </button>
                  </div>

                  {openSupplierPOs.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 italic">
                      No open purchase orders found for this supplier. Excess payment will be preserved as an unapplied supplier prepayment.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">PO / Bill #</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-right">PO Total</th>
                          <th className="px-3 py-2 text-right w-36">Allocate ({currency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {openSupplierPOs.map(po => {
                          const bal = po.totalAmount;
                          const currentAlloc = allocations[po.id] || 0;
                          return (
                            <tr key={po.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">
                                {po.poNumber}
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-mono">
                                {po.expectedDate || po.date}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-rose-600">
                                {currency} {bal.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={bal}
                                  value={currentAlloc || ''}
                                  placeholder="0.00"
                                  onChange={e => {
                                    const val = Math.min(bal, Math.max(0, parseFloat(e.target.value) || 0));
                                    setAllocations({ ...allocations, [po.id]: val });
                                  }}
                                  className="w-full text-right px-2 py-1 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-sky-500 text-xs"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <span>Total Allocated: <strong className="font-mono">{currency} {totalAllocated.toFixed(2)}</strong></span>
                      {unallocatedDifference > 0 && (
                        <span className="text-amber-800 ml-4 font-medium">
                          Excess Recorded as Supplier Advance: <strong className="font-mono font-bold">{currency} {unallocatedDifference.toFixed(2)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Narration / Notes
                </label>
                <input
                  type="text"
                  value={notes ?? ''}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Payment details, check number, or invoice notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Draft vs Post Option */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveAsDraft"
                    checked={saveAsDraft}
                    onChange={e => setSaveAsDraft(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <label htmlFor="saveAsDraft" className="text-xs text-slate-600 select-none">
                    Save as <strong>Draft</strong> (will not impact ledger balance until explicitly confirmed & posted)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                currentModeInfo.isMoneyIn
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Check className="w-4 h-4" />
              {isSubmitting
                ? 'Processing...'
                : saveAsDraft
                ? 'Save Draft Entry'
                : mode === 'apply_advance'
                ? 'Apply Advance to Document'
                : mode === 'refund_advance'
                ? 'Post Refund Transaction'
                : currentModeInfo.isMoneyIn
                ? 'Post Payment Receipt'
                : 'Post Payment Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
