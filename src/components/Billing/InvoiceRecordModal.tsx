import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Receipt, 
  User, 
  Car, 
  Wrench, 
  DollarSign, 
  CreditCard, 
  Printer, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Send,
  RotateCcw,
  Calendar,
  Hash,
  Layers,
  Percent
} from 'lucide-react';
import { Invoice, InvoiceItem, JobCard, PaymentRecord, GarageSettings } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { RecordAuditTrail } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { formatDate } from '../../utils/formatters';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';

export interface InvoiceRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string | null;
  onOpenJobCard?: (jobCardId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  onOpenReceipt?: (receiptId: string) => void;
}

export const InvoiceRecordModal: React.FC<InvoiceRecordModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  onOpenJobCard,
  onOpenCustomer,
  onOpenReceipt
}) => {
  const { 
    invoices, 
    jobCards, 
    customers, 
    vehicles, 
    settings, 
    auditLogs,
    recordPayment
  } = useGarage();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(invoiceId || null);
  const [activeTab, setActiveTab] = useState<
    'info' | 'customer' | 'jobcard' | 'lines' | 'payments' | 'print' | 'audit'
  >('info');

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState<string>('IV-0001');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('12:00 PM');
  const [status, setStatus] = useState<'Unpaid' | 'Partial' | 'Paid' | 'Cancelled'>('Unpaid');
  const [paymentTerms, setPaymentTerms] = useState<string>('Due on Receipt');
  
  // Customer & Vehicle Fields
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleYear, setVehicleYear] = useState<string>('2024');

  // Job Card Reference
  const [jobCardId, setJobCardId] = useState<string>('');
  const [jobCardNumber, setJobCardNumber] = useState<string>('');

  // Invoice Lines
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);

  // Payments
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Payment Quick Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentRecord['method']>('Credit Card');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Print view
  const [showPrintView, setShowPrintView] = useState(false);

  // UI Lifecycle
  const [isEditing, setIsEditing] = useState(!invoiceId);
  const [isNew, setIsNew] = useState(!invoiceId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setSelectedInvoiceId(invoiceId || null);
  }, [invoiceId]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedInvoiceId) {
      const cleanTarget = selectedInvoiceId.trim().toLowerCase();
      const inv = invoices.find(
        i => (i.id && i.id.toLowerCase() === cleanTarget) ||
             (i.invoiceNumber && i.invoiceNumber.toLowerCase() === cleanTarget) ||
             (i.jobCardNumber && i.jobCardNumber.toLowerCase() === cleanTarget) ||
             (i.jobCardId && i.jobCardId.toLowerCase() === cleanTarget)
      );
      if (inv) {
        setInvoiceNumber(inv.invoiceNumber || 'IV-0001');
        setDate(inv.date || new Date().toISOString().split('T')[0]);
        setTime(inv.time || '12:00 PM');
        setStatus((inv.paymentStatus as any) || 'Unpaid');
        setPaymentTerms(inv.paymentTerm || 'Due on Receipt');
        
        setCustomerId(inv.customerId || '');
        setCustomerName(inv.customerName || '');
        setCustomerPhone(inv.customerPhone || '');
        setCustomerEmail(inv.customerEmail || '');
        setCustomerAddress(inv.customerAddress || '');
        setVehicleId(inv.vehicleId || '');
        setVehiclePlate(inv.vehiclePlate || '');
        setVehicleModel(inv.vehicleModel || '');
        setVehicleYear(String(inv.vehicleYear || '2024'));

        setJobCardId(inv.jobCardId || '');
        setJobCardNumber(inv.jobCardNumber || '');

        setItems(inv.items || []);
        setNotes(inv.narration || inv.notes || '');
        setDiscount(inv.discount || 0);
        setTaxRate(inv.taxRate || 0);
        setPayments(inv.payments || []);

        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setValidationError(null);
        setApiError(null);
        return;
      }
    }

    handleNewRecord();
  }, [selectedInvoiceId, invoices, isOpen]);

  const handleNewRecord = () => {
    setSelectedInvoiceId(null);
    setIsNew(true);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    setActiveTab('info');

    setDate(new Date().toISOString().split('T')[0]);
    setTime('12:00 PM');
    setStatus('Unpaid');
    setPaymentTerms('Due on Receipt');
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setVehicleId('');
    setVehiclePlate('');
    setVehicleModel('');
    setVehicleYear('2024');
    setJobCardId('');
    setJobCardNumber('');
    setItems([]);
    setNotes('Thank you for choosing Najm Al Huda Auto Maintenance Workshop.');
    setDiscount(0);
    setTaxRate(0);
    setPayments([]);

    api.getNextDocumentNumber('INVOICE')
      .then(res => {
        if (res?.code) setInvoiceNumber(res.code);
      })
      .catch(() => {
        setInvoiceNumber('IV-0001');
      });
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  const paidAmount = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const balanceAmount = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  // Update dynamic status based on payment
  useEffect(() => {
    if (paidAmount >= grandTotal && grandTotal > 0) {
      setStatus('Paid');
    } else if (paidAmount > 0) {
      setStatus('Partial');
    } else {
      setStatus('Unpaid');
    }
  }, [paidAmount, grandTotal]);

  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return invoices.map(inv => ({
      id: inv.id,
      documentNumber: inv.invoiceNumber,
      title: inv.customerName || 'Customer',
      subtitle: `${inv.vehiclePlate || 'No Plate'} • JC: ${inv.jobCardNumber || 'Direct Invoice'}`,
      status: inv.paymentStatus,
      date: `QAR ${Number(inv.grandTotal || 0).toFixed(2)} (Due: QAR ${Number(inv.balanceAmount || 0).toFixed(2)})`
    }));
  }, [invoices]);

  const currentRecordIndex = useMemo(() => {
    if (!selectedInvoiceId) return -1;
    return invoices.findIndex(i => i.id === selectedInvoiceId);
  }, [invoices, selectedInvoiceId]);

  const handleNavigate = (direction: 'first' | 'prev' | 'next' | 'last') => {
    if (invoices.length === 0) return;
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard and navigate?')) return;
    }
    let targetIndex = 0;
    if (direction === 'first') targetIndex = 0;
    else if (direction === 'prev') targetIndex = Math.max(0, (currentRecordIndex === -1 ? 0 : currentRecordIndex) - 1);
    else if (direction === 'next') targetIndex = Math.min(invoices.length - 1, (currentRecordIndex === -1 ? 0 : currentRecordIndex) + 1);
    else if (direction === 'last') targetIndex = invoices.length - 1;

    const target = invoices[targetIndex];
    if (target) {
      setSelectedInvoiceId(target.id);
    }
  };

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setHasUnsavedChanges(true);
    setValidationError(null);
    setApiError(null);
  };

  const handleAddItem = (type: 'Labor' | 'Part' = 'Labor') => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: type === 'Labor' ? 'Mechanical Labor Service' : 'Genuine Replacement Part',
      quantity: 1,
      unitPrice: type === 'Labor' ? 150 : 80,
      total: type === 'Labor' ? 150 : 80,
      type
    };
    setItems([...items, newItem]);
    setHasUnsavedChanges(true);
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = Number(field === 'quantity' ? value : item.quantity) || 0;
      const p = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
      item.total = q * p;
    }
    updated[index] = item;
    setItems(updated);
    setHasUnsavedChanges(true);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  // Populate from Job Card
  const handlePopulateFromJobCard = (cardId: string) => {
    const jc = jobCards.find(c => c.id === cardId || c.jobNumber === cardId);
    if (!jc) return;

    setJobCardId(jc.id);
    setJobCardNumber(jc.jobNumber);
    setCustomerId(jc.customerId || '');
    setCustomerName(jc.customerName || jc.customer?.name || '');
    setCustomerPhone(jc.customerPhone || jc.customer?.phone || '');
    setCustomerEmail(jc.customerEmail || jc.customer?.email || '');
    setCustomerAddress(jc.customerAddress || jc.customer?.address || '');
    setVehicleId(jc.vehicleId || '');
    setVehiclePlate(jc.vehiclePlate || jc.vehicle?.plateNumber || '');
    setVehicleModel(jc.vehicleModel || `${jc.vehicle?.make || ''} ${jc.vehicle?.model || ''}`.trim());
    setVehicleYear(String(jc.vehicle?.year || '2024'));

    const lineItems: InvoiceItem[] = [];

    const laborList = jc.mechanicalTasks || jc.laborItems || jc.labor || [];
    laborList.forEach((labor: any, idx: number) => {
      const hours = Number(labor.estimatedHours ?? labor.hours ?? 1);
      const rate = Number(labor.hourlyRate ?? labor.rate ?? labor.cost ?? 150);
      lineItems.push({
        id: `labor-${idx}-${Date.now()}`,
        description: labor.description || labor.operation || 'Mechanical Labor Task',
        quantity: hours,
        unitPrice: rate,
        total: hours * rate,
        type: 'Labor'
      });
    });

    const partsList = jc.partsUsed || jc.requisitions || jc.parts || [];
    partsList.forEach((part: any, idx: number) => {
      const qty = Number(part.quantity || part.qty || 1);
      const price = Number(part.unitPrice || part.sellingPrice || part.cost || 50);
      lineItems.push({
        id: `part-${idx}-${Date.now()}`,
        description: part.name || part.partName || part.description || 'Auto Spare Part',
        quantity: qty,
        unitPrice: price,
        total: qty * price,
        type: 'Part'
      });
    });

    if (lineItems.length > 0) {
      setItems(lineItems);
    }
    setDiscount(jc.discount || 0);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!customerName.trim()) {
      setValidationError('Customer Name is required to save an Invoice.');
      return;
    }
    if (items.length === 0) {
      setValidationError('Invoice must contain at least one line item.');
      return;
    }
    if (grandTotal <= 0) {
      setValidationError('Invoice grand total must be greater than zero.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        invoiceNumber,
        date,
        time,
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerAddress: customerAddress.trim(),
        vehicleId,
        vehiclePlate: vehiclePlate.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: Number(vehicleYear) || 2024,
        jobCardId,
        jobCardNumber,
        items,
        subtotal,
        discount,
        taxRate: 0,
        taxAmount: 0,
        grandTotal,
        paidAmount,
        balanceAmount,
        paymentStatus: status,
        paymentTerm: paymentTerms,
        narration: notes.trim(),
        payments
      };

      if (isNew || !selectedInvoiceId) {
        const res = await api.createInvoice(payload);
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        if (res?.data?.id || res?.id) {
          setSelectedInvoiceId(res?.data?.id || res?.id);
        }
        setSuccessMessage(`Invoice ${invoiceNumber} created successfully.`);
      } else {
        await api.updateInvoice(selectedInvoiceId, payload);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Invoice ${invoiceNumber} updated successfully.`);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to persist invoice to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoiceId) return;
    setIsDeleting(true);
    try {
      await api.deleteInvoice(selectedInvoiceId);
      setSuccessMessage(`Invoice ${invoiceNumber} deleted/cancelled.`);
      if (invoices.length > 1) {
        const next = invoices.find(i => i.id !== selectedInvoiceId);
        setSelectedInvoiceId(next ? next.id : null);
      } else {
        handleNewRecord();
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecordPayment = async () => {
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (payAmount > balanceAmount) {
      alert(`Payment amount (QAR ${payAmount}) cannot exceed outstanding balance (QAR ${balanceAmount}).`);
      return;
    }

    try {
      const newPayment: PaymentRecord = {
        id: `pay-${Date.now()}`,
        amount: Number(payAmount),
        date: new Date().toISOString().split('T')[0],
        method: payMethod,
        transactionRef: payRef.trim() || `TXN-${Date.now().toString().slice(-6)}`,
        notes: payNotes.trim()
      };

      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);

      if (selectedInvoiceId) {
        await recordPayment(selectedInvoiceId, {
          amount: Number(payAmount),
          method: payMethod,
          transactionRef: payRef.trim() || undefined,
          notes: payNotes.trim() || undefined
        });
      }

      setShowPaymentModal(false);
      setSuccessMessage(`Payment of QAR ${payAmount} recorded successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <RecordManagementShell
        isOpen={isOpen}
        onClose={onClose}
        title={isNew ? 'New Invoice' : `Invoice ${invoiceNumber}`}
        subtitle="Customer repair billing, job card line items, payment receipts & financial records"
        icon={FileText}
        documentNumber={invoiceNumber}
        status={status}
        statusVariant={status === 'Paid' ? 'success' : status === 'Partial' ? 'warning' : 'error'}
        badgeIcon={status === 'Paid' ? CheckCircle2 : DollarSign}
        metaDetails={[
          { label: 'Customer', value: customerName || 'Walk-in' },
          { label: 'Vehicle', value: vehiclePlate || 'No Plate' },
          { label: 'Total Value', value: `QAR ${grandTotal.toFixed(2)}` },
          { label: 'Balance Due', value: `QAR ${balanceAmount.toFixed(2)}`, highlight: balanceAmount > 0 }
        ]}
        tabs={[
          { id: 'info', label: 'Invoice Information', icon: FileText },
          { id: 'customer', label: 'Customer & Vehicle', icon: User },
          { id: 'jobcard', label: 'Job Card Reference', icon: Wrench },
          { id: 'lines', label: 'Invoice Lines', icon: Layers, count: items.length },
          { id: 'payments', label: 'Payments & Receipts', icon: CreditCard, count: payments.length },
          { id: 'print', label: 'Print Options', icon: Printer },
          { id: 'audit', label: 'Audit Trail', icon: ShieldCheck }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
        isNew={isNew}
        isEditing={isEditing}
        isSaving={isSaving}
        isDeleting={isDeleting}
        hasSavedRecord={Boolean(selectedInvoiceId && !isNew)}
        hasUnsavedChanges={hasUnsavedChanges}
        validationError={validationError}
        apiError={apiError}
        successMessage={successMessage}
        onNew={handleNewRecord}
        onSave={handleSave}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDelete}
        onCancel={() => {
          if (selectedInvoiceId) {
            const inv = invoices.find(i => i.id === selectedInvoiceId);
            if (inv) {
              setInvoiceNumber(inv.invoiceNumber);
              setIsEditing(false);
              setHasUnsavedChanges(false);
            }
          } else {
            onClose();
          }
        }}
        onPrint={() => setShowPrintView(true)}
        currentIndex={currentRecordIndex}
        totalRecords={invoices.length}
        onFirst={() => handleNavigate('first')}
        onPrevious={() => handleNavigate('prev')}
        onNext={() => handleNavigate('next')}
        onLast={() => handleNavigate('last')}
        searchRecords={searchRecords}
        searchTitle="Find Invoices"
        searchPlaceholder="Search by Invoice #, Customer, Plate, JC Ref..."
        onSelectSearchRecord={(item: any) => {
          const id = typeof item === 'string' ? item : item?.id;
          setSelectedInvoiceId(id);
          setIsEditing(false);
        }}
        customActions={
          <div className="flex items-center gap-1.5">
            {balanceAmount > 0 && !isNew && (
              <button
                type="button"
                onClick={() => {
                  setPayAmount(balanceAmount);
                  setPayRef(`TXN-${Date.now().toString().slice(-6)}`);
                  setShowPaymentModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Receive Payment</span>
              </button>
            )}
            {jobCardId && onOpenJobCard && (
              <button
                type="button"
                onClick={() => onOpenJobCard(jobCardId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>View JC</span>
              </button>
            )}
          </div>
        }
      >
        {/* TAB 1: INVOICE INFORMATION */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                General Invoice Header
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    disabled
                    value={invoiceNumber ?? ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-indigo-600 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={date ?? ''}
                    onChange={(e) => handleFieldChange(setDate, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Status</label>
                  <input
                    type="text"
                    disabled
                    value={status ?? ''}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-black ${
                      status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Terms</label>
                  <select
                    disabled={!isEditing}
                    value={paymentTerms ?? ''}
                    onChange={(e) => handleFieldChange(setPaymentTerms, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75 cursor-pointer"
                  >
                    <option value="Due on Receipt">Due on Receipt / Cash</option>
                    <option value="15 Days Net">15 Days Net</option>
                    <option value="30 Days Net">30 Days Net (Corporate)</option>
                    <option value="Insurance Claim Settlement">Insurance Claim Settlement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Narration / Customer Terms</label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={notes ?? ''}
                  onChange={(e) => handleFieldChange(setNotes, e.target.value)}
                  placeholder="Terms of payment, warranty on parts and mechanical work, bank accounts..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                />
              </div>
            </div>

            {/* FINANCIAL SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">Subtotal</span>
                <div className="text-xl font-black text-slate-900">QAR {subtotal.toFixed(2)}</div>
              </div>
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">Discount Allowed</span>
                <div className="text-xl font-black text-amber-600">QAR {Number(discount).toFixed(2)}</div>
              </div>
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">Grand Total</span>
                <div className="text-xl font-black text-indigo-600">QAR {grandTotal.toFixed(2)}</div>
              </div>
              <div className={`p-4 rounded-2xl border shadow-xs ${balanceAmount > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                <span className="text-xs font-bold text-slate-600 block mb-1">Outstanding Due</span>
                <div className={`text-xl font-black ${balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  QAR {balanceAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER AND VEHICLE */}
        {activeTab === 'customer' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Customer Contact Dossier
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={customerName ?? ''}
                    onChange={(e) => handleFieldChange(setCustomerName, e.target.value)}
                    placeholder="e.g. Sheikh Khalid Al-Thani"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mobile Phone (Qatar)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={customerPhone ?? ''}
                    onChange={(e) => handleFieldChange(setCustomerPhone, e.target.value)}
                    placeholder="+974 5512 3456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={customerEmail ?? ''}
                    onChange={(e) => handleFieldChange(setCustomerEmail, e.target.value)}
                    placeholder="customer@domain.qa"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Car className="w-4 h-4 text-indigo-600" />
                Vehicle Specification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">License Plate Number</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={vehiclePlate ?? ''}
                    onChange={(e) => handleFieldChange(setVehiclePlate, e.target.value)}
                    placeholder="e.g. 78192 QA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Make & Model</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={vehicleModel ?? ''}
                    onChange={(e) => handleFieldChange(setVehicleModel, e.target.value)}
                    placeholder="e.g. Toyota Land Cruiser 5.7L V8"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Model Year</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={vehicleYear ?? ''}
                    onChange={(e) => handleFieldChange(setVehicleYear, e.target.value)}
                    placeholder="2024"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: JOB CARD */}
        {activeTab === 'jobcard' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  Linked Workshop Job Card
                </h3>
                {isEditing && (
                  <select
                    onChange={(e) => handlePopulateFromJobCard(e.target.value)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <option value="">-- Copy from Job Card --</option>
                    {jobCards.map(jc => (
                      <option key={jc.id} value={jc.id}>
                        {jc.jobNumber} — {jc.customerName} ({jc.vehiclePlate})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {jobCardNumber ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-600">{jobCardNumber}</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">Linked Workshop Repair Card</p>
                  </div>
                  {jobCardId && onOpenJobCard && (
                    <button
                      type="button"
                      onClick={() => onOpenJobCard(jobCardId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Job Card Dossier</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                  <p className="text-xs font-bold text-slate-600">Direct Over-the-Counter / Manual Invoice</p>
                  <p className="text-[11px] text-slate-400 mt-1">This invoice is not tied to a workshop job card.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: INVOICE LINES */}
        {activeTab === 'lines' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Billable Items & Labor ({items.length})</h3>
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItem('Labor')}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Labor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem('Part')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Part</span>
                    </button>
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs font-bold text-slate-600">No line items added yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Click "+ Add Labor" or "+ Add Part" above to begin.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-center">Qty / Hrs</th>
                      <th className="py-2.5 px-4 text-right">Unit Rate (QAR)</th>
                      <th className="py-2.5 px-4 text-right">Total (QAR)</th>
                      {isEditing && <th className="py-2.5 px-4 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.type === 'Labor' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {item.type || 'Item'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">{item.description}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={item.quantity ?? 1}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center font-bold"
                            />
                          ) : (
                            <span className="font-bold text-slate-700">{item.quantity}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.unitPrice ?? 0}
                              onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-right font-bold"
                            />
                          ) : (
                            <span className="font-medium text-slate-700">{Number(item.unitPrice).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {Number(item.total).toFixed(2)}
                        </td>
                        {isEditing && (
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* TOTALS BAR */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Discount (QAR):</span>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={discount ?? ''}
                      onChange={(e) => handleFieldChange(setDiscount, Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-amber-600"
                    />
                  ) : (
                    <span className="font-bold text-amber-600">QAR {Number(discount).toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Total Payable: </span>
                <span className="text-lg font-black text-indigo-600 font-mono">QAR {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Recorded Receipts & Payments ({payments.length})</h3>
                {balanceAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPayAmount(balanceAmount);
                      setPayRef(`TXN-${Date.now().toString().slice(-6)}`);
                      setShowPaymentModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Receive Payment</span>
                  </button>
                )}
              </div>

              {payments.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">No payments recorded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Full amount QAR {grandTotal.toFixed(2)} is pending settlement.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {payments.map(p => (
                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700">QAR {Number(p.amount).toFixed(2)}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{p.method}</span>
                          {p.transactionRef && <span className="text-[10px] text-slate-400 font-mono">Ref: {p.transactionRef}</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Date: {formatDate(p.date)} {p.notes ? `• ${p.notes}` : ''}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Cleared
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PRINT OPTIONS */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                Invoice Layout & Printing
              </h3>
              <p className="text-xs text-slate-500">
                Generate an official workshop Invoice with company logo, C.R. number, customer details, and bilingual Arabic/English headers.
              </p>
              <button
                type="button"
                onClick={() => setShowPrintView(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Open Printable Invoice</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <RecordAuditTrail
            recordId={selectedInvoiceId || 'NEW'}
            moduleName="Invoice"
            entries={auditLogs}
          />
        )}
      </RecordManagementShell>

      {/* QUICK PAYMENT DIALOG */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Receive Payment — {invoiceNumber}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold">Outstanding Due: </span>
              <span className="font-bold text-rose-700">QAR {balanceAmount.toFixed(2)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Amount to Receive (QAR) *</label>
                <input
                  type="number"
                  min="1"
                  max={balanceAmount}
                  step="0.01"
                  value={payAmount ?? ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={payMethod ?? ''}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 cursor-pointer"
                >
                  <option value="Credit Card">Credit / Debit Card (POS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (QNB)</option>
                  <option value="Cheque">Corporate Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Transaction Ref / Receipt #</label>
                <input
                  type="text"
                  value={payRef ?? ''}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="POS Slip # or Bank Ref"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT VIEW */}
      {showPrintView && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 flex flex-col items-center">
          <div className="max-w-3xl w-full space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <NajmAlHudaLogo subtitle="Invoice / فاتورة" />
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Invoice Number</span>
                <p className="text-xl font-black text-slate-900">{invoiceNumber}</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">Date: {formatDate(date)}</span>
                  <span className="inline-flex items-center bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-mono">
                    Job Card: {jobCardNumber || 'Direct'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-500">Billed To</p>
                <p className="text-sm font-bold text-slate-900">{customerName}</p>
                <p className="text-xs text-slate-600 mt-1">{customerPhone} • {customerAddress}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500">Vehicle / Job Card</p>
                <p className="text-sm font-bold text-slate-900">{vehiclePlate} ({vehicleModel})</p>
                <p className="text-xs text-slate-600 mt-1">Job Card Ref: {jobCardNumber || 'Direct'}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Unit Price</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                    <td className="p-2.5 text-right">QAR {Number(it.unitPrice).toFixed(2)}</td>
                    <td className="p-2.5 text-right font-bold">QAR {Number(it.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs border p-3 rounded-xl">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold">QAR {subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Discount:</span>
                    <span>-QAR {Number(discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t pt-1.5">
                  <span>Grand Total:</span>
                  <span className="text-indigo-600">QAR {grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Paid to Date:</span>
                  <span>QAR {paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700 border-t pt-1">
                  <span>Balance Due:</span>
                  <span>QAR {balanceAmount.toFixed(2)}</span>
                </div>
              </div>
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
                className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
