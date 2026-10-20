import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  User, 
  FileText, 
  CreditCard, 
  DollarSign, 
  History, 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Calendar,
  Building
} from 'lucide-react';
import { Invoice, PaymentRecord, GarageSettings } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { RecordAuditTrail } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { formatDate } from '../../utils/formatters';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';

export interface ReceiptRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId?: string | null;
  initialInvoiceId?: string | null;
  onOpenInvoice?: (invoiceId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
}

export interface ReceiptRecordItem {
  id: string;
  receiptNumber: string;
  date: string;
  time: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Cheque';
  transactionRef?: string;
  bankName?: string;
  status: 'Allocated' | 'Unallocated' | 'Reversed';
  notes?: string;
}

export const ReceiptRecordModal: React.FC<ReceiptRecordModalProps> = ({
  isOpen,
  onClose,
  receiptId,
  initialInvoiceId,
  onOpenInvoice,
  onOpenCustomer
}) => {
  const { 
    invoices, 
    customers, 
    settings, 
    auditLogs,
    recordPayment 
  } = useGarage();

  const [receiptsList, setReceiptsList] = useState<ReceiptRecordItem[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(receiptId || null);
  const [activeTab, setActiveTab] = useState<
    'info' | 'customer' | 'invoice' | 'payment' | 'allocation' | 'audit'
  >('info');

  // Form Fields
  const [receiptNumber, setReceiptNumber] = useState<string>('RC-0001');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('12:00 PM');
  const [status, setStatus] = useState<'Allocated' | 'Unallocated' | 'Reversed'>('Allocated');
  
  // Customer & Invoice
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string>(initialInvoiceId || '');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  // Payment Details
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit Card' | 'Bank Transfer' | 'Cheque'>('Credit Card');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [bankName, setBankName] = useState<string>('Qatar National Bank (QNB)');
  const [notes, setNotes] = useState<string>('');
  const [showPrintView, setShowPrintView] = useState<boolean>(false);

  // UI Lifecycle
  const [isEditing, setIsEditing] = useState(!receiptId);
  const [isNew, setIsNew] = useState(!receiptId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Derive receipts from invoice payment history
  useEffect(() => {
    const derived: ReceiptRecordItem[] = [];
    invoices.forEach(inv => {
      (inv.payments || []).forEach((p, idx) => {
        derived.push({
          id: p.id || `rec-${inv.id}-${idx}`,
          receiptNumber: p.transactionRef?.startsWith('RC-') ? p.transactionRef : `RC-000${derived.length + 1}`,
          date: p.date || inv.date,
          time: '12:00 PM',
          customerId: inv.customerId || '',
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: p.amount,
          paymentMethod: (p.method as any) || 'Credit Card',
          transactionRef: p.transactionRef,
          bankName: 'Qatar National Bank (QNB)',
          status: 'Allocated',
          notes: p.notes
        });
      });
    });
    setReceiptsList(derived);
  }, [invoices]);

  useEffect(() => {
    if (initialInvoiceId && !invoiceId) {
      setInvoiceId(initialInvoiceId);
      const inv = invoices.find(i => i.id === initialInvoiceId);
      if (inv) {
        setInvoiceNumber(inv.invoiceNumber);
        setCustomerId(inv.customerId || '');
        setCustomerName(inv.customerName);
        setCustomerPhone(inv.customerPhone || '');
        setAmount(inv.balanceAmount > 0 ? inv.balanceAmount : inv.grandTotal);
      }
    }
  }, [initialInvoiceId, invoices, invoiceId]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedReceiptId && receiptsList.length > 0) {
      const rec = receiptsList.find(r => r.id === selectedReceiptId);
      if (rec) {
        setReceiptNumber(rec.receiptNumber || 'RC-0001');
        setDate(rec.date);
        setTime(rec.time);
        setStatus(rec.status);
        setCustomerId(rec.customerId);
        setCustomerName(rec.customerName);
        setCustomerPhone(rec.customerPhone || '');
        setInvoiceId(rec.invoiceId || '');
        setInvoiceNumber(rec.invoiceNumber || '');
        setAmount(rec.amount);
        setPaymentMethod(rec.paymentMethod);
        setTransactionRef(rec.transactionRef || '');
        setBankName(rec.bankName || 'Qatar National Bank (QNB)');
        setNotes(rec.notes || '');

        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setValidationError(null);
        setApiError(null);
        return;
      }
    }

    if (!selectedReceiptId && isNew) {
      handleNewRecord();
    }
  }, [selectedReceiptId, receiptsList, isOpen]);

  const handleNewRecord = () => {
    setSelectedReceiptId(null);
    setIsNew(true);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    setDate(new Date().toISOString().split('T')[0]);
    setTime('12:00 PM');
    setStatus('Allocated');
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setInvoiceId(initialInvoiceId || '');
    setInvoiceNumber('');
    setAmount(0);
    setPaymentMethod('Credit Card');
    setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`);
    setBankName('Qatar National Bank (QNB)');
    setNotes('Payment receipt voucher for repair invoice.');
    setActiveTab('info');

    api.getNextDocumentNumber('RECEIPT')
      .then(res => {
        if (res?.code) setReceiptNumber(res.code);
      })
      .catch(() => {
        setReceiptNumber('RC-0001');
      });
  };

  const currentInvoice = useMemo(() => {
    return invoices.find(i => i.id === invoiceId);
  }, [invoices, invoiceId]);

  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return receiptsList.map(rec => ({
      id: rec.id,
      documentNumber: rec.receiptNumber,
      title: rec.customerName || 'Customer',
      subtitle: `Invoice: ${rec.invoiceNumber || 'Direct'} • Method: ${rec.paymentMethod}`,
      status: rec.status,
      date: `QAR ${Number(rec.amount || 0).toFixed(2)} (${formatDate(rec.date)})`
    }));
  }, [receiptsList]);

  const currentRecordIndex = useMemo(() => {
    if (!selectedReceiptId) return -1;
    return receiptsList.findIndex(r => r.id === selectedReceiptId);
  }, [receiptsList, selectedReceiptId]);

  const handleNavigate = (direction: 'first' | 'prev' | 'next' | 'last') => {
    if (receiptsList.length === 0) return;
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard and navigate?')) return;
    }
    let targetIndex = 0;
    if (direction === 'first') targetIndex = 0;
    else if (direction === 'prev') targetIndex = Math.max(0, (currentRecordIndex === -1 ? 0 : currentRecordIndex) - 1);
    else if (direction === 'next') targetIndex = Math.min(receiptsList.length - 1, (currentRecordIndex === -1 ? 0 : currentRecordIndex) + 1);
    else if (direction === 'last') targetIndex = receiptsList.length - 1;

    const target = receiptsList[targetIndex];
    if (target) {
      setSelectedReceiptId(target.id);
    }
  };

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setHasUnsavedChanges(true);
    setValidationError(null);
    setApiError(null);
  };

  const handleSelectInvoice = (invId: string) => {
    setInvoiceId(invId);
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setInvoiceNumber(inv.invoiceNumber);
      setCustomerId(inv.customerId || '');
      setCustomerName(inv.customerName);
      setCustomerPhone(inv.customerPhone || '');
      setAmount(inv.balanceAmount > 0 ? inv.balanceAmount : inv.grandTotal);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!customerName.trim()) {
      setValidationError('Customer Name is required for receipt issuance.');
      return;
    }
    if (amount <= 0) {
      setValidationError('Receipt amount must be greater than zero.');
      return;
    }

    if (currentInvoice && amount > currentInvoice.balanceAmount && isNew) {
      setValidationError(`Amount (QAR ${amount}) exceeds outstanding balance (QAR ${currentInvoice.balanceAmount}).`);
      return;
    }

    setIsSaving(true);
    try {
      if (invoiceId) {
        await recordPayment(invoiceId, {
          amount: Number(amount),
          method: paymentMethod,
          transactionRef: receiptNumber || transactionRef,
          notes: notes.trim()
        });
      }

      setIsNew(false);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setSuccessMessage(`Receipt ${receiptNumber} for QAR ${amount} persisted successfully.`);
    } catch (err: any) {
      setApiError(err.message || 'Failed to persist receipt voucher.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReversePayment = async () => {
    if (confirm(`Reverse payment receipt ${receiptNumber} of QAR ${amount}? This will restore the invoice balance.`)) {
      setStatus('Reversed');
      setHasUnsavedChanges(true);
      setSuccessMessage(`Receipt ${receiptNumber} reversed.`);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <RecordManagementShell
        isOpen={isOpen}
        onClose={onClose}
        onDelete={handleReversePayment}
        title={isNew ? 'New Payment Receipt' : `Receipt ${receiptNumber}`}
        subtitle="Customer settlement voucher, POS transaction, bank allocation & Qatar ledger entry"
        icon={Receipt}
        documentNumber={receiptNumber}
        status={status}
        statusVariant={status === 'Allocated' ? 'success' : status === 'Reversed' ? 'error' : 'neutral'}
        badgeIcon={status === 'Allocated' ? CheckCircle2 : RotateCcw}
        metaDetails={[
          { label: 'Customer', value: customerName || 'Direct' },
          { label: 'Invoice Ref', value: invoiceNumber || 'Unallocated' },
          { label: 'Method', value: paymentMethod },
          { label: 'Amount', value: `QAR ${Number(amount).toFixed(2)}` }
        ]}
        tabs={[
          { id: 'info', label: 'Receipt Info', icon: Receipt },
          { id: 'customer', label: 'Customer Details', icon: User },
          { id: 'invoice', label: 'Linked Invoice', icon: FileText },
          { id: 'payment', label: 'Payment Details', icon: CreditCard },
          { id: 'allocation', label: 'Allocation', icon: DollarSign },
          { id: 'audit', label: 'Audit Trail', icon: ShieldCheck }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
        isNew={isNew}
        isEditing={isEditing}
        isSaving={isSaving}
        isDeleting={isDeleting}
        hasSavedRecord={Boolean(selectedReceiptId && !isNew)}
        hasUnsavedChanges={hasUnsavedChanges}
        validationError={validationError}
        apiError={apiError}
        successMessage={successMessage}
        onNew={handleNewRecord}
        onSave={handleSave}
        onEdit={() => setIsEditing(true)}
        onCancel={() => {
          if (selectedReceiptId) {
            setIsEditing(false);
            setHasUnsavedChanges(false);
          } else {
            onClose();
          }
        }}
        onPrint={() => setShowPrintView(true)}
        currentIndex={currentRecordIndex}
        totalRecords={receiptsList.length}
        onFirst={() => handleNavigate('first')}
        onPrevious={() => handleNavigate('prev')}
        onNext={() => handleNavigate('next')}
        onLast={() => handleNavigate('last')}
        searchRecords={searchRecords}
        searchTitle="Find Payment Receipts"
        searchPlaceholder="Search by RC #, Customer, Invoice Ref..."
        onSelectSearchRecord={(item: any) => {
          const id = typeof item === 'string' ? item : item?.id;
          setSelectedReceiptId(id);
          setIsEditing(false);
        }}
        customActions={
          <div className="flex items-center gap-1.5">
            {status !== 'Reversed' && !isNew && (
              <button
                type="button"
                onClick={handleReversePayment}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reverse Payment</span>
              </button>
            )}
          </div>
        }
      >
        {/* TAB 1: RECEIPT INFO */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Receipt Voucher Header
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Receipt Number</label>
                  <input
                    type="text"
                    disabled
                    value={receiptNumber ?? ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-emerald-700 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Receipt Date</label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={date ?? ''}
                    onChange={(e) => handleFieldChange(setDate, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Receipt Amount (QAR) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    disabled={!isEditing}
                    value={amount ?? ''}
                    onChange={(e) => handleFieldChange(setAmount, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Allocation Status</label>
                  <input
                    type="text"
                    disabled
                    value={status ?? ''}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Receipt Notes / Narration</label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={notes ?? ''}
                  onChange={(e) => handleFieldChange(setNotes, e.target.value)}
                  placeholder="Settlement notes, bank branch, depositor name..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER */}
        {activeTab === 'customer' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                Customer Account Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={customerName ?? ''}
                    onChange={(e) => handleFieldChange(setCustomerName, e.target.value)}
                    placeholder="e.g. Sheikh Khalid Al-Thani"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={customerPhone ?? ''}
                    onChange={(e) => handleFieldChange(setCustomerPhone, e.target.value)}
                    placeholder="+974 55..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LINKED INVOICE */}
        {activeTab === 'invoice' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Target Invoice
                </h3>
                {isEditing && (
                  <select
                    value={invoiceId ?? ''}
                    onChange={(e) => handleSelectInvoice(e.target.value)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Unpaid Invoice --</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.customerName} (Due: QAR {Number(inv.balanceAmount || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {currentInvoice ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-600">{currentInvoice.invoiceNumber}</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{currentInvoice.customerName} ({currentInvoice.vehiclePlate})</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Grand Total: QAR {currentInvoice.grandTotal.toFixed(2)} • Due: QAR {currentInvoice.balanceAmount.toFixed(2)}</p>
                  </div>
                  {onOpenInvoice && (
                    <button
                      type="button"
                      onClick={() => onOpenInvoice(currentInvoice.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Invoice</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                  <p className="text-xs font-bold text-slate-600">No Invoice Linked</p>
                  <p className="text-[11px] text-slate-400 mt-1">Select an unpaid invoice to apply payment settlement.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENT DETAILS */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Payment Instrument Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method</label>
                  <select
                    disabled={!isEditing}
                    value={paymentMethod ?? ''}
                    onChange={(e) => handleFieldChange(setPaymentMethod, e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 cursor-pointer"
                  >
                    <option value="Credit Card">Credit / Debit Card (POS Terminal)</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Bank Transfer">Bank Wire (QNB / CBQ / QIIB)</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Transaction Ref / Slip #</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={transactionRef ?? ''}
                    onChange={(e) => handleFieldChange(setTransactionRef, e.target.value)}
                    placeholder="POS Authorization Code"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Settlement Bank</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={bankName ?? ''}
                    onChange={(e) => handleFieldChange(setBankName, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ALLOCATION */}
        {activeTab === 'allocation' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Ledger Settlement Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block mb-1">Receipt Amount</span>
                  <div className="text-xl font-black text-emerald-700">QAR {Number(amount).toFixed(2)}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block mb-1">Allocated to Invoice</span>
                  <div className="text-xl font-black text-indigo-700">{invoiceNumber || 'None'}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block mb-1">Payment Status</span>
                  <div className="text-xl font-black text-slate-800">{status}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <RecordAuditTrail
            recordId={selectedReceiptId || 'NEW'}
            moduleName="Receipt"
            entries={auditLogs}
          />
        )}
      </RecordManagementShell>

      {/* PRINT VIEW */}
      {showPrintView && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 flex flex-col items-center">
          <div className="max-w-3xl w-full space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <NajmAlHudaLogo subtitle="Official Payment Receipt Voucher" />
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Receipt Voucher #</span>
                <p className="text-xl font-black text-emerald-700">{receiptNumber}</p>
                <span className="text-[10px] text-slate-400">Date: {formatDate(date)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-500">Received From</p>
                <p className="text-base font-bold text-slate-900">{customerName}</p>
                <p className="text-xs text-slate-600 mt-1">Phone: {customerPhone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500">Amount Received</p>
                <p className="text-2xl font-black text-emerald-700">QAR {Number(amount).toFixed(2)}</p>
                <p className="text-xs text-slate-600 mt-1">Method: {paymentMethod} • Ref: {transactionRef}</p>
              </div>
            </div>

            <div className="border p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500">Settlement of Invoice</p>
              <p className="text-sm font-bold text-indigo-700 mt-0.5">{invoiceNumber ? `Invoice #${invoiceNumber}` : 'General Workshop Settlement'}</p>
              <p className="text-xs text-slate-500 mt-1">{notes}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 print:hidden">
              <button
                onClick={() => setShowPrintView(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Print View
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Print Receipt Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
