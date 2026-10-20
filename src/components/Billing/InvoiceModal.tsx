import React, { useState, useEffect, useRef } from 'react';
import { 
  Invoice, 
  JobCard, 
  GarageSettings, 
  PaymentRecord 
} from '../../types';
import { 
  FileText, 
  Save, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Search, 
  Printer, 
  ChevronFirst, 
  ChevronLeft, 
  ChevronRight, 
  ChevronLast, 
  X, 
  Plus, 
  AlertTriangle, 
  HelpCircle, 
  BookOpen, 
  Receipt, 
  Truck, 
  CheckCircle2, 
  Check,
  DollarSign, 
  CreditCard, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { PrintModalHeader } from '../Common/PrintModalHeader';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';
import { FormToolbar } from '../Common/FormToolbar';
import { FindRecordModal, FindResultItem } from '../Common/FindRecordModal';
import { api } from '../../lib/api';
import { formatDate } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  jobCards: JobCard[];
  settings: GarageSettings;
  selectedInvoiceId?: string | null;
  onSaveInvoice: (invoiceData: Partial<Invoice> & { invoiceNumber: string }) => void;
  onDeleteInvoice?: (id: string) => void;
  onRecordPayment: (invoiceId: string, payment: Omit<PaymentRecord, 'id' | 'date'>) => void;
  onViewJobCard?: (jobCardId: string) => void;
}

// Helper to match invoice by ID, Invoice Number, Job Card Number, or Job Card ID
const findMatchingInvoiceIndex = (target: string | null | undefined, list: Invoice[]) => {
  if (!target || !list || list.length === 0) return -1;
  const cleanTarget = target.trim().toLowerCase();
  return list.findIndex(i => {
    if (i.id && i.id.toLowerCase() === cleanTarget) return true;
    if (i.invoiceNumber && i.invoiceNumber.toLowerCase() === cleanTarget) return true;
    if (i.invoiceNumber && i.invoiceNumber.replace(/^INV-/, '').toLowerCase() === cleanTarget) return true;
    if (i.invoiceNumber && i.invoiceNumber.replace(/^IV-/, '').toLowerCase() === cleanTarget) return true;
    if (i.jobCardNumber && i.jobCardNumber.toLowerCase() === cleanTarget) return true;
    if (i.jobCardId && i.jobCardId.toLowerCase() === cleanTarget) return true;
    return false;
  });
};

export const InvoiceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invoices,
  jobCards = [],
  settings,
  selectedInvoiceId,
  onSaveInvoice,
  onDeleteInvoice,
  onRecordPayment,
  onViewJobCard,
}) => {
  // Track current index among invoices
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (selectedInvoiceId) {
      const idx = findMatchingInvoiceIndex(selectedInvoiceId, invoices);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const currentInvoice = invoices[currentIndex] || null;

  // ---------------------------------------------------------------------------
  // LOCAL FORM STATE
  // ---------------------------------------------------------------------------
  const [isEditMode, setIsEditMode] = useState(!currentInvoice);
  const [isNewRecord, setIsNewRecord] = useState(!currentInvoice);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);

  // Top Header Fields
  const [docNo, setDocNo] = useState(() => {
    if (currentInvoice) return currentInvoice.invoiceNumber;
    return 'Loading...';
  });

  // Load preview document number from backend for new invoice
  useEffect(() => {
    if (!currentInvoice) {
      api.getNextDocumentNumber('INVOICE')
        .then(res => {
          if (res?.code) setDocNo(res.code);
        })
        .catch(() => {
          setDocNo(`IV-0001`);
        });
    } else {
      setDocNo(currentInvoice.invoiceNumber);
    }
  }, [currentInvoice]);
  const [docDate, setDocDate] = useState(() => currentInvoice?.date || new Date().toISOString().split('T')[0]);
  const [docTime, setDocTime] = useState(() => currentInvoice?.time || '12:00 AM');
  const [jobCardNo, setJobCardNo] = useState(() => currentInvoice?.jobCardNumber || '');
  const [linkedJobCardId, setLinkedJobCardId] = useState(() => currentInvoice?.jobCardId || '');
  const [accountName, setAccountName] = useState(() => currentInvoice?.accountName || currentInvoice?.customerName || '');
  const [createdBy, setCreatedBy] = useState(() => currentInvoice?.createdBy || 'Admin');

  // Customer Details
  const [contactPerson, setContactPerson] = useState(() => currentInvoice?.contactPerson || currentInvoice?.customerName || '');
  const [mobileNo, setMobileNo] = useState(() => currentInvoice?.mobileNo || currentInvoice?.customerPhone || '');
  const [telephoneNo, setTelephoneNo] = useState(() => currentInvoice?.telephoneNo || '');
  const [paymentTerm, setPaymentTerm] = useState(() => currentInvoice?.paymentTerm || 'Cash');
  const [paymentDays, setPaymentDays] = useState<number>(() => currentInvoice?.paymentDays ?? 30);
  const [creditNo, setCreditNo] = useState(() => currentInvoice?.creditNo || '');

  // Narration
  const [narration, setNarration] = useState(() => {
    return currentInvoice?.narration || currentInvoice?.notes || 'Invoice for automotive repair & spare parts. Bank details: QNB Doha, IBAN: QA02QNBA00000000001234567890. Payment due as per agreed terms.';
  });

  // Vehicle Details
  const [vehicleName, setVehicleName] = useState(() => currentInvoice?.vehicleName || 'Toyota Land Cruiser V8');
  const [vehicleModel, setVehicleModel] = useState(() => currentInvoice?.vehicleModel || 'GXR 5.7L V8');
  const [vehicleYear, setVehicleYear] = useState<number>(() => currentInvoice?.vehicleYear || new Date().getFullYear());
  const [vehicleColor, setVehicleColor] = useState(() => currentInvoice?.vehicleColor || 'Pearl White');
  const [regNo, setRegNo] = useState(() => currentInvoice?.vehiclePlate || currentInvoice?.vehicleRegNo || '78192 QA');
  const [vinChassisNo, setVinChassisNo] = useState(() => currentInvoice?.vinChassisNo || 'JTMHY05J404098211');

  // Invoice Summary Amounts
  const [invoiceAmt, setInvoiceAmt] = useState<number>(() => currentInvoice?.subtotal || currentInvoice?.grandTotal || 0);
  const [discount, setDiscount] = useState<number>(() => currentInvoice?.discount || 0);
  const [roundOff, setRoundOff] = useState<boolean>(() => Boolean(currentInvoice?.roundOff ?? true));
  const [paidAmount, setPaidAmount] = useState<number>(() => currentInvoice?.paidAmount || 0);
  const [advancePaid, setAdvancePaid] = useState<number>(() => currentInvoice?.advancePaid || 0);
  const [discountAccount, setDiscountAccount] = useState(() => currentInvoice?.discountAccount || 'Discount Allowed Account');

  // Print Options Checkboxes
  const [printOptions, setPrintOptions] = useState({
    customerComplaints: false,
    workshopRemarks: false,
    showQtyPrice: true,
    showExcess: true,
    detailedPrint: false,
    addExcess: false,
    detailedInvoice: true,
    authorizedSign: true,
    customerSign: true,
    jobDescription: false,
    advance: true,
    claimType: true,
    showLaborHrs: false,
    excludeZeroValue: false,
    printItemCode: false,
    letterheadPrint: false,
  });

  // Modals & Popovers
  const [showJobCardPicker, setShowJobCardPicker] = useState(false);
  const [showFindDialog, setShowFindDialog] = useState(false);
  const [findSearchTerm, setFindSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDeliveryNoteModal, setShowDeliveryNoteModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Payment Success Animation State
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    show: boolean;
    amount: number;
    method?: string;
    timestamp: number;
  } | null>(null);

  const [receiptSuccessTransition, setReceiptSuccessTransition] = useState(false);
  const paymentAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPaymentSuccessAnimation = (amount: number, method: string = 'Cash') => {
    if (paymentAnimationTimerRef.current) {
      clearTimeout(paymentAnimationTimerRef.current);
    }
    setPaymentSuccessData({
      show: true,
      amount,
      method,
      timestamp: Date.now(),
    });

    paymentAnimationTimerRef.current = setTimeout(() => {
      setPaymentSuccessData(prev => prev ? { ...prev, show: false } : null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (paymentAnimationTimerRef.current) {
        clearTimeout(paymentAnimationTimerRef.current);
      }
    };
  }, []);

  // Status message timer
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Synchronize state when switching invoice via index
  const loadInvoiceIntoState = (inv: Invoice | null) => {
    if (!inv) return;
    setDocNo(inv.invoiceNumber);
    setDocDate(inv.date);
    setDocTime(inv.time || '12:00 AM');

    // Automatically ensure Job Card number is resolved and set
    let resolvedJobCardNo = inv.jobCardNumber || '';
    let resolvedJobCardId = inv.jobCardId || '';
    if (!resolvedJobCardNo && resolvedJobCardId && jobCards) {
      const jc = jobCards.find(j => j.id === resolvedJobCardId);
      if (jc) resolvedJobCardNo = jc.jobNumber || '';
    } else if (resolvedJobCardNo && !resolvedJobCardId && jobCards) {
      const cleanResolved = resolvedJobCardNo.trim().toLowerCase();
      const jc = jobCards.find(j => (j.jobNumber || '').trim().toLowerCase() === cleanResolved);
      if (jc) resolvedJobCardId = jc.id;
    }
    setJobCardNo(resolvedJobCardNo);
    setLinkedJobCardId(resolvedJobCardId);

    setAccountName(inv.accountName || inv.customerName || '');
    setCreatedBy(inv.createdBy || 'Admin');

    setContactPerson(inv.contactPerson || inv.customerName || '');
    setMobileNo(inv.mobileNo || inv.customerPhone || '');
    setTelephoneNo(inv.telephoneNo || '');
    setPaymentTerm(inv.paymentTerm || 'Cash');
    setPaymentDays(inv.paymentDays ?? 30);
    setCreditNo(inv.creditNo || '');

    setNarration(inv.narration || inv.notes || 'Invoice for automotive repair & spare parts.');
    setVehicleName(inv.vehicleName || (inv.vehicleModel ? inv.vehicleModel.split(' ')[0] : 'Vehicle'));
    setVehicleModel(inv.vehicleModel || '');
    setVehicleYear(inv.vehicleYear || new Date().getFullYear());
    setVehicleColor(inv.vehicleColor || 'White');
    setRegNo(inv.vehiclePlate || '');
    setVinChassisNo(inv.vinChassisNo || '');

    setInvoiceAmt(inv.subtotal || inv.grandTotal || 0);
    setDiscount(inv.discount || 0);
    setRoundOff(Boolean(inv.roundOff ?? true));
    setPaidAmount(inv.paidAmount || 0);
    setAdvancePaid(inv.advancePaid || 0);
    setDiscountAccount(inv.discountAccount || 'Discount Allowed Account');
  };

  // Keep active invoice in sync whenever selectedInvoiceId changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (selectedInvoiceId) {
      const idx = findMatchingInvoiceIndex(selectedInvoiceId, invoices);
      if (idx >= 0) {
        setCurrentIndex(idx);
        loadInvoiceIntoState(invoices[idx]);
        setIsEditMode(false);
        setIsNewRecord(false);
        setHasUnsavedChanges(false);
      } else {
        const cleanTarget = (selectedInvoiceId || '').trim().toLowerCase();
        const matchingJob = (jobCards || []).find(
          j => (j.id && j.id.toLowerCase() === cleanTarget) ||
               (j.jobNumber && j.jobNumber.toLowerCase() === cleanTarget)
        );
        if (matchingJob) {
          const matchingJobNo = (matchingJob.jobNumber || '').trim().toLowerCase();
          const invForJob = invoices.find(
            i => (i.jobCardId && i.jobCardId === matchingJob.id) ||
                 (i.jobCardNumber && matchingJobNo && (i.jobCardNumber || '').trim().toLowerCase() === matchingJobNo)
          );
          if (invForJob) {
            const jcIdx = invoices.indexOf(invForJob);
            if (jcIdx >= 0) {
              setCurrentIndex(jcIdx);
              loadInvoiceIntoState(invForJob);
              setIsEditMode(false);
              setIsNewRecord(false);
              setHasUnsavedChanges(false);
              return;
            }
          }
          handleSelectJobCard(matchingJob);
          setIsNewRecord(true);
          setIsEditMode(true);
        }
      }
    }
  }, [selectedInvoiceId, isOpen, invoices]);

  useEffect(() => {
    if (currentInvoice) {
      loadInvoiceIntoState(currentInvoice);
    }
  }, [currentIndex]);

  // Find linked Job Card for accurate labor & parts breakdown
  const linkedJobCard = jobCards.find(jc => (linkedJobCardId && jc.id === linkedJobCardId) || (jobCardNo && jc.jobNumber === jobCardNo)) || null;

  // Derived financial computations (No VAT / Tax)
  const netAmount = Math.max(0, Number((invoiceAmt - discount).toFixed(2)));
  const grossAmount = roundOff ? Math.round(netAmount) : netAmount;
  const outstanding = Math.max(0, Number((grossAmount - paidAmount - advancePaid).toFixed(2)));

  // Dependency Guard for Deletion
  const hasRecordedPayments = Boolean(currentInvoice?.payments && currentInvoice.payments.length > 0);
  const deleteBlockReason = hasRecordedPayments
    ? `Cannot delete Invoice with ${currentInvoice?.payments?.length} recorded payment(s). Reverse payments first.`
    : null;

  // New Invoice handler
  const handleNew = () => {
    setDocNo('Fetching next sequence...');
    api.getNextDocumentNumber('INVOICE')
      .then(res => setDocNo(res.code))
      .catch(() => setDocNo(`IV-0001`));
    setDocDate(new Date().toISOString().split('T')[0]);
    setDocTime('12:00 AM');
    setJobCardNo('');
    setLinkedJobCardId('');
    setAccountName('');
    setContactPerson('');
    setMobileNo('');
    setTelephoneNo('');
    setPaymentTerm('Cash');
    setPaymentDays(0);
    setCreditNo('');
    setNarration('Invoice for automotive repair & spare parts. Payment due upon presentation.');
    setVehicleName('');
    setVehicleModel('');
    setVehicleYear(new Date().getFullYear());
    setVehicleColor('');
    setRegNo('');
    setVinChassisNo('');
    setInvoiceAmt(0);
    setDiscount(0);
    setPaidAmount(0);
    setAdvancePaid(0);
    setIsNewRecord(true);
    setIsEditMode(true);
    setHasUnsavedChanges(false);
    showToast('Created blank Draft Invoice with backend auto-sequence preview');
  };

  // Save Invoice handler
  const handleSave = async () => {
    const fullInvoiceNumber = docNo.startsWith('INV-') ? docNo : `INV-${docNo}`;

    // 1. Validation: Customer / Account
    const finalCustName = (accountName || contactPerson || '').trim();
    if (!finalCustName) {
      showToast('Validation Error: Customer or Account Name is required before saving.');
      return;
    }

    // 2. Validation: Date
    if (!docDate) {
      showToast('Validation Error: Invoice Date is required.');
      return;
    }

    // 3. Validation: Amount & Linked Content
    if (!linkedJobCardId && !jobCardNo && grossAmount <= 0) {
      showToast('Validation Error: Invoice must have a linked Job Card or a valid billing amount greater than 0 QAR.');
      return;
    }

    // Unique invoice number validation
    const duplicate = invoices.find(
      inv => inv.id !== currentInvoice?.id && inv.invoiceNumber.trim().toUpperCase() === fullInvoiceNumber.trim().toUpperCase()
    );
    if (duplicate && isNewRecord) {
      showToast(`Validation Error: Invoice number ${fullInvoiceNumber} already exists in registry.`);
      return;
    }

    setIsSaving(true);
    try {
      const invoiceRecord: Partial<Invoice> & { invoiceNumber: string } = {
        ...(currentInvoice || {}),
        id: currentInvoice?.id || `inv-${Date.now()}`,
        invoiceNumber: fullInvoiceNumber,
        jobCardId: linkedJobCardId || undefined,
        jobCardNumber: jobCardNo || undefined,
        date: docDate,
        time: docTime,
        dueDate: new Date(Date.now() + paymentDays * 86400000).toISOString().split('T')[0],
        createdBy,
        accountName: finalCustName,
        customerName: finalCustName,
        contactPerson: contactPerson || finalCustName,
        customerPhone: mobileNo,
        mobileNo,
        telephoneNo,
        paymentTerm,
        paymentDays,
        creditNo,
        narration,
        vehiclePlate: regNo,
        vehicleName,
        vehicleModel,
        vehicleYear,
        vehicleColor,
        vinChassisNo,
        mechanicalLaborTotal: currentInvoice?.mechanicalLaborTotal || (linkedJobCard ? (linkedJobCard.mechanicalLaborCost || 0) : 0),
        dentingLaborTotal: currentInvoice?.dentingLaborTotal || (linkedJobCard ? (linkedJobCard.dentingLaborCost || 0) : 0),
        paintingTotal: currentInvoice?.paintingTotal || (linkedJobCard ? ((linkedJobCard.paintingCost || 0) + (linkedJobCard.paintBoothCharge || 0)) : 0),
        partsTotal: currentInvoice?.partsTotal || (linkedJobCard ? (linkedJobCard.partsCost || 0) : 0),
        consumablesTotal: currentInvoice?.consumablesTotal || (linkedJobCard ? (linkedJobCard.consumablesCost || 0) : 0),
        subtotal: invoiceAmt,
        discount,
        taxPercent: 0,
        taxAmount: 0,
        roundOff,
        grandTotal: grossAmount,
        paidAmount,
        balanceAmount: outstanding,
        advancePaid,
        discountAccount,
        paymentStatus: outstanding <= 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid',
        payments: currentInvoice?.payments || [],
        notes: narration,
        printOptions,
      };

      await onSaveInvoice(invoiceRecord);
      setIsSaving(false);
      setIsNewRecord(false);
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      showToast(`Invoice ${fullInvoiceNumber} saved successfully.`);
    } catch (err: any) {
      setIsSaving(false);
      showToast(err?.message || 'Failed to save Invoice to backend.');
    }
  };

  // Delete Invoice handler
  const handleDelete = async () => {
    if (!currentInvoice || deleteBlockReason) return;
    setIsDeleting(true);
    try {
      if (onDeleteInvoice) {
        await onDeleteInvoice(currentInvoice.id);
      }
      setIsDeleting(false);
      showToast(`Invoice ${currentInvoice.invoiceNumber} deleted.`);
      if (invoices.length > 1) {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else {
        handleNew();
      }
    } catch (err: any) {
      setIsDeleting(false);
      showToast(err?.message || 'Failed to delete Invoice.');
    }
  };

  // Cancel / Reset handler
  const handleCancel = () => {
    if (currentInvoice && !isNewRecord) {
      loadInvoiceIntoState(currentInvoice);
      setIsEditMode(false);
      showToast('Changes reverted to saved invoice.');
    } else {
      handleNew();
    }
    setHasUnsavedChanges(false);
  };

  // Select Job Card and auto-fill
  const handleSelectJobCard = (jc: JobCard) => {
    setJobCardNo(jc.jobNumber);
    setLinkedJobCardId(jc.id);
    setAccountName(jc.customer.name);
    setContactPerson(jc.customer.name);
    setMobileNo(jc.customer.phone);
    setTelephoneNo(jc.customer.telephone || '');

    setVehicleName(`${jc.vehicle.make} ${jc.vehicle.model}`);
    setVehicleModel(jc.vehicle.model);
    setVehicleYear(jc.vehicle.year);
    setVehicleColor(jc.vehicle.color);
    setRegNo(jc.vehicle.plateNumber);
    setVinChassisNo(jc.vehicle.vin || '');

    const laborCost = 
      (jc.mechanicalLaborCost || 0) + 
      (jc.dentingLaborCost || 0) + 
      (jc.paintingCost || 0) + 
      (jc.paintBoothCharge || 0);

    const partsCost = 
      (jc.partsCost || 0) + 
      (jc.consumablesCost || 0);

    const subtotalCalc = (laborCost + partsCost > 0) ? (laborCost + partsCost) : (jc.totalAmount || 0);

    setInvoiceAmt(subtotalCalc);
    setDiscount(jc.discount || 0);
    
    setShowJobCardPicker(false);
    showToast(`Loaded Job Card ${jc.jobNumber} (${jc.vehicle.plateNumber}) into Invoice.`);
  };

  // Record payment from receipt voucher
  const handleProcessReceipt = (amount: number, method: PaymentRecord['method'], notes: string) => {
    setReceiptSuccessTransition(true);

    if (currentInvoice) {
      onRecordPayment(currentInvoice.id, {
        amount,
        method,
        transactionRef: `RV-${Date.now().toString().slice(-6)}`,
        notes: notes || 'Receipt recorded from ERP Invoice Counter',
      });
    }

    setPaidAmount(prev => prev + amount);

    // Subtle checkmark transition before closing sub-modal and launching section animation
    setTimeout(() => {
      setShowReceiptModal(false);
      setReceiptSuccessTransition(false);
      triggerPaymentSuccessAnimation(amount, method);
      showToast(`Receipt voucher recorded: ${amount.toFixed(2)} QAR via ${method}`);
    }, 650);
  };

  // Quick Post to General Ledger
  const handleQuickPost = () => {
    handleSave();
    showToast(`Invoice INV-${docNo} quick-posted to General Ledger successfully!`);
  };

  const findItems: FindResultItem[] = (invoices || []).map(inv => ({
    id: inv.id,
    code: inv.invoiceNumber,
    date: inv.date,
    customerName: inv.customerName || inv.accountName,
    customerPhone: inv.customerPhone || inv.mobileNo,
    vehiclePlate: inv.vehiclePlate,
    vehicleModel: inv.vehicleName || `${inv.vehicleModel || ''}`,
    status: inv.paymentStatus || inv.status,
    amount: inv.grandTotal,
    currency: 'QAR',
    rawRecord: inv,
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 bg-slate-950/70 backdrop-blur-xs overflow-y-auto font-sans text-[11px] select-none">
      <div 
        className="bg-[#f0f0f0] border-2 border-[#94a3b8] rounded-xs w-full max-w-[1140px] max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-800"
        onChangeCapture={() => setHasUnsavedChanges(true)}
      >
        
        {/* ROW 1: METALLIC WINDOW TOP ACTION TOOLBAR */}
        <FormToolbar
          isNew={isNewRecord}
          isEditing={isEditMode}
          isSaving={isSaving}
          isDeleting={isDeleting}
          hasSavedRecord={Boolean(currentInvoice && !isNewRecord)}
          hasUnsavedChanges={hasUnsavedChanges}
          onNew={handleNew}
          onSave={handleSave}
          onEdit={() => {
            setIsEditMode(true);
            showToast('Edit mode enabled.');
          }}
          onDelete={handleDelete}
          onCancel={handleCancel}
          onFind={() => setShowFindModal(true)}
          onPrint={() => setShowPrintModal(true)}
          onClose={onClose}
          canNavigate={true}
          currentIndex={currentIndex}
          totalRecords={invoices.length}
          onFirst={() => { setCurrentIndex(0); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); }}
          onPrevious={() => { setCurrentIndex(prev => Math.max(0, prev - 1)); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); }}
          onNext={() => { setCurrentIndex(prev => Math.min(invoices.length - 1, prev + 1)); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); }}
          onLast={() => { setCurrentIndex(Math.max(0, invoices.length - 1)); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); }}
          recordLabel="Invoice"
          recordNumber={docNo}
          deleteBlockReason={deleteBlockReason}
        />

        {/* Toast notification strip */}
        {toastMessage && (
          <div className="bg-[#fef9c3] border-b border-[#fde047] px-3 py-1 text-[11px] text-amber-900 font-mono flex items-center justify-between animate-in fade-in duration-200">
            <span>{toastMessage}</span>
            <span className="font-bold text-slate-700">Record: {docNo}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 2: VIBRANT ORANGE "Invoice" BANNER + ICONS + DOCUMENT FIELDS           */}
        {/* ========================================================================= */}
        <div className="p-2.5 bg-[#f0f0f0] border-b border-[#cbd5e1] space-y-2">
          
          {/* Top Banner Row: Orange "Invoice" badge on left, Warning & Help on right */}
          <div className="flex items-center justify-between">
            <div className="bg-[#f26522] text-white font-bold text-sm px-5 py-1 rounded-xs tracking-wide shadow-xs">
              Invoice
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => showToast('Audit Check: Verify Qatar TIN/TRN & VAT location before posting.')}
                className="w-7 h-7 bg-white hover:bg-amber-50 border border-slate-300 rounded-xs flex items-center justify-center cursor-pointer shadow-2xs"
                title="Status / Audit Alert"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 fill-amber-100" />
              </button>
              <button
                type="button"
                onClick={() => showToast('Help: Select Job Card to auto-fill customer, vehicle, and work amounts.')}
                className="w-7 h-7 bg-white hover:bg-blue-50 border border-slate-300 rounded-xs flex items-center justify-center cursor-pointer shadow-2xs"
                title="Invoicing Help"
              >
                <HelpCircle className="w-4 h-4 text-cyan-600" />
              </button>
            </div>
          </div>

          {/* Form Header Fields Grid */}
          <div className="grid grid-cols-12 gap-x-2.5 gap-y-2 items-center bg-[#f0f0f0] pt-1">
            
            {/* Doc No: Backend Sequence Readonly */}
            <div className="col-span-12 sm:col-span-3 flex items-center gap-1.5">
              <label className="w-14 text-slate-800 font-medium shrink-0">Doc No.</label>
              <div className="flex items-center flex-1 bg-white border border-[#94a3b8] rounded-xs overflow-hidden">
                <input
                  type="text"
                  readOnly
                  value={docNo || ''}
                  className="w-full bg-slate-50 px-2 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                />
                <span className="bg-[#e2e8f0] border-l border-[#94a3b8] px-1.5 py-0.5 text-slate-600 font-semibold text-[9px] uppercase shrink-0">
                  Auto Seq
                </span>
              </div>
            </div>

            {/* Job Card No: RED LABEL + green search button + text input + VIEW JOBCARD button */}
            <div className="col-span-12 sm:col-span-5 flex items-center gap-1.5">
              <label className="font-bold text-[#c00000] shrink-0">Job Card No.</label>
              <button
                type="button"
                onClick={() => setShowJobCardPicker(true)}
                className="w-6 h-6 bg-[#7ac142] hover:bg-[#68a835] text-white rounded-xs flex items-center justify-center cursor-pointer shrink-0 shadow-xs"
                title="Select from Job Cards"
              >
                <Search className="w-3.5 h-3.5 font-bold" />
              </button>
              <input
                type="text"
                value={jobCardNo || ''}
                onChange={e => setJobCardNo(e.target.value)}
                placeholder="JOB-..."
                className="w-28 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 rounded-xs focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (linkedJobCardId && onViewJobCard) {
                    onViewJobCard(linkedJobCardId);
                  } else if (jobCardNo) {
                    const cleanTargetNo = jobCardNo.trim().toLowerCase();
                    const found = jobCards.find(j => (j.jobNumber || '').trim().toLowerCase() === cleanTargetNo);
                    if (found && onViewJobCard) {
                      onViewJobCard(found.id);
                    } else {
                      showToast(`Job Card ${jobCardNo} not found in database.`);
                    }
                  } else {
                    showToast('Please select or enter a Job Card Number first.');
                  }
                }}
                className="px-2.5 py-1 bg-[#cbd5e1] hover:bg-[#b0bdcc] text-slate-800 font-bold text-[10px] rounded-xs cursor-pointer shadow-2xs border border-[#94a3b8] tracking-wider whitespace-nowrap"
              >
                VIEW JOBCARD &gt;&gt;
              </button>
            </div>

            {/* Created By */}
            <div className="col-span-12 sm:col-span-4 flex items-center gap-1.5">
              <label className="w-20 text-slate-800 font-medium shrink-0">Created By</label>
              <select
                value={createdBy || 'Autonomous (Owner / Admin)'}
                onChange={e => setCreatedBy(e.target.value)}
                className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs focus:outline-hidden"
              >
                <option value="Autonomous (Owner / Admin)">Autonomous (Owner / Admin)</option>
                <option value="Osman (Service Manager)">Osman (Service Manager)</option>
              </select>
            </div>

            {/* Date + Time */}
            <div className="col-span-12 sm:col-span-4 flex items-center gap-1.5">
              <label className="w-14 text-slate-800 font-medium shrink-0">Date</label>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="date"
                  value={docDate || ''}
                  onChange={e => setDocDate(e.target.value)}
                  className="w-28 bg-white border border-[#94a3b8] px-1 py-0.5 text-xs font-mono text-slate-900 rounded-xs focus:outline-hidden"
                />
                <select
                  value={docTime || '12:00 AM'}
                  onChange={e => setDocTime(e.target.value)}
                  className="w-full bg-white border border-[#94a3b8] px-1 py-0.5 text-xs text-slate-900 rounded-xs focus:outline-hidden"
                >
                  <option value="12:00 AM">12:00 AM</option>
                  <option value="08:00 AM">08:00 AM</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                </select>
              </div>
            </div>

            {/* Account Name */}
            <div className="col-span-12 sm:col-span-8 flex items-center gap-1.5">
              <label className="font-medium text-slate-800 shrink-0">Account Name</label>
              <input
                type="text"
                value={accountName || ''}
                onChange={e => setAccountName(e.target.value)}
                placeholder="Select or enter customer account..."
                className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-medium text-slate-900 rounded-xs focus:outline-hidden"
              />
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: THREE-PANEL BODY (CUSTOMER + NARRATION | VEHICLE | INVOICE SUMMARY) */}
        {/* ========================================================================= */}
        <div className="p-2.5 bg-[#e9ecef] grid grid-cols-12 gap-2.5 overflow-y-auto flex-1">
          
          {/* ----------------------------------------------------------------------- */}
          {/* COLUMN 1: CUSTOMER DETAILS (TOP) + NARRATION (BOTTOM)                   */}
          {/* ----------------------------------------------------------------------- */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-2.5">
            
            {/* Customer Details Box */}
            <div className="bg-white border border-[#b7c4d0] rounded-xs p-2 space-y-1.5 shadow-2xs">
              <div className="bg-gradient-to-r from-[#d9f2d0] via-[#eaf7e6] to-white border-b border-[#b7e2a9] -m-2 mb-1.5 px-2 py-0.5 font-bold text-[#1f5922] text-[11px] flex items-center justify-between">
                <span>Customer Details</span>
                <MessageSquare className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
              </div>

              {/* Contact Person */}
              <div className="flex items-center gap-2 pt-0.5">
                <label className="w-24 text-slate-700 font-medium shrink-0">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson || ''}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs text-slate-900 font-medium focus:outline-hidden"
                />
              </div>

              {/* Mobile No. */}
              <div className="flex items-center gap-2">
                <label className="w-24 text-slate-700 font-medium shrink-0">Mobile No.</label>
                <input
                  type="text"
                  value={mobileNo || ''}
                  onChange={e => setMobileNo(e.target.value)}
                  className="w-full bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Telephone No. */}
              <div className="flex items-center gap-2">
                <label className="w-24 text-slate-700 font-medium shrink-0">Telephone No.</label>
                <input
                  type="text"
                  value={telephoneNo || ''}
                  onChange={e => setTelephoneNo(e.target.value)}
                  className="w-full bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Payment Term (RED LABEL) + Days */}
              <div className="flex items-center gap-2">
                <label className="w-24 font-bold text-[#c00000] shrink-0">Payment Term</label>
                <div className="flex items-center gap-1.5 flex-1">
                  <select
                    value={paymentTerm || 'Cash'}
                    onChange={e => setPaymentTerm(e.target.value)}
                    className="w-full bg-white border border-[#94a3b8] px-1 py-0.5 text-xs text-slate-900 rounded-xs focus:outline-hidden"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit">Credit</option>
                    <option value="PDC">PDC</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                  <input
                    type="number"
                    value={paymentDays ?? 30}
                    onChange={e => setPaymentDays(Number(e.target.value))}
                    className="w-12 bg-white border border-[#94a3b8] px-1 py-0.5 text-xs font-mono text-center text-slate-900 rounded-xs focus:outline-hidden"
                  />
                  <span className="text-slate-600 text-[10px]">days</span>
                </div>
              </div>

              {/* Credit No. */}
              <div className="flex items-center gap-2">
                <label className="w-24 text-slate-700 font-medium shrink-0">Credit No.</label>
                <input
                  type="text"
                  value={creditNo || ''}
                  onChange={e => setCreditNo(e.target.value)}
                  className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-slate-900 rounded-xs focus:outline-hidden"
                />
              </div>
            </div>

            {/* Narration Box */}
            <div className="bg-white border border-[#b7c4d0] rounded-xs p-2 flex flex-col flex-1 shadow-2xs">
              <div className="bg-gradient-to-r from-[#d9f2d0] via-[#eaf7e6] to-white border-b border-[#b7e2a9] -m-2 mb-1.5 px-2 py-0.5 font-bold text-[#1f5922] text-[11px]">
                Narration
              </div>
              <textarea
                value={narration || ''}
                onChange={e => setNarration(e.target.value)}
                rows={4}
                className="w-full flex-1 bg-white border border-[#94a3b8] p-1.5 text-xs font-mono text-slate-800 rounded-xs focus:outline-hidden resize-none"
                placeholder="Enter accounting narration, bank instructions, or workshop notes..."
              />
            </div>

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* COLUMN 2: VEHICLE DETAILS                                               */}
          {/* ----------------------------------------------------------------------- */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-white border border-[#b7c4d0] rounded-xs p-2 space-y-2 h-full shadow-2xs">
              <div className="bg-gradient-to-r from-[#d9f2d0] via-[#eaf7e6] to-white border-b border-[#b7e2a9] -m-2 mb-1.5 px-2 py-0.5 font-bold text-[#1f5922] text-[11px]">
                Vehicle Details
              </div>

              {/* Vehicle */}
              <div className="flex items-center gap-2 pt-1">
                <label className="w-28 text-slate-700 font-medium shrink-0">Vehicle</label>
                <input
                  type="text"
                  value={vehicleName || ''}
                  onChange={e => setVehicleName(e.target.value)}
                  className="w-full bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs text-slate-900 font-medium focus:outline-hidden"
                />
              </div>

              {/* Model */}
              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-700 font-medium shrink-0">Model</label>
                <input
                  type="text"
                  value={vehicleModel || ''}
                  onChange={e => setVehicleModel(e.target.value)}
                  className="w-full bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Year + Color */}
              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-700 font-medium shrink-0">Year</label>
                <input
                  type="number"
                  value={vehicleYear ?? ''}
                  onChange={e => setVehicleYear(Number(e.target.value))}
                  className="w-24 bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs font-mono text-slate-900 focus:outline-hidden"
                />
                <label className="text-slate-700 font-medium ml-4 shrink-0">Color</label>
                <input
                  type="text"
                  value={vehicleColor || ''}
                  onChange={e => setVehicleColor(e.target.value)}
                  className="w-full bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Reg No. */}
              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-700 font-medium shrink-0">Reg No.</label>
                <input
                  type="text"
                  value={regNo || ''}
                  onChange={e => setRegNo(e.target.value)}
                  className="w-full bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* VIN / Chassis No. */}
              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-700 font-medium shrink-0">VIN/Chassis No.</label>
                <input
                  type="text"
                  value={vinChassisNo || ''}
                  onChange={e => setVinChassisNo(e.target.value)}
                  className="w-full bg-transparent border-b border-dotted border-slate-400 px-1 py-0.5 text-xs font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Quick Info Box */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xs space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Linked Job Card:</span>
                  <span className="font-mono font-bold text-blue-900">{jobCardNo || 'Not linked'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Invoice Payment Status:</span>
                  <span className={`font-bold flex items-center gap-1 transition-all duration-300 ${
                    outstanding <= 0 ? 'text-emerald-700' : paidAmount > 0 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {paymentSuccessData?.show && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-0 duration-300" />
                    )}
                    <span>{outstanding <= 0 ? 'Fully Paid' : paidAmount > 0 ? 'Partially Paid' : 'Unpaid (Pending)'}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span className="font-mono">{formatDate(new Date(Date.now() + paymentDays * 86400000))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* COLUMN 3: INVOICE SUMMARY (MATCHING RIGHT BEVELED PANEL)                */}
          {/* ----------------------------------------------------------------------- */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-[#f8fafc] border border-[#b7c4d0] rounded-xs p-2 space-y-1.5 shadow-2xs h-full flex flex-col justify-between">
              
              <div>
                <div className="bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] border-b border-slate-300 -m-2 mb-2 py-1 text-center font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  INVOICE SUMMARY
                </div>

                {/* Invoice Amt */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <label className="text-slate-800 font-medium">Invoice Amt</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceAmt ?? 0}
                    onChange={e => setInvoiceAmt(Number(e.target.value))}
                    className="w-32 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono font-bold text-right text-slate-900 rounded-xs focus:outline-hidden"
                  />
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <label className="text-slate-800 font-medium">Discount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={discount ?? 0}
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="w-32 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-right text-slate-900 rounded-xs focus:outline-hidden"
                  />
                </div>

                {/* Net Amount */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <label className="text-slate-800 font-medium">Net Amount</label>
                  <input
                    type="text"
                    readOnly
                    value={netAmount.toFixed(2) ?? ''}
                    className="w-32 bg-[#e2e8f0] border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono font-bold text-right text-slate-900 rounded-xs"
                  />
                </div>

                {/* Gross Amount */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <label className="text-slate-900 font-bold">Gross Amount</label>
                  <input
                    type="text"
                    readOnly
                    value={grossAmount.toFixed(2) ?? ''}
                    className="w-32 bg-[#f1f5f9] border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono font-bold text-right text-blue-900 rounded-xs"
                  />
                </div>

                {/* Round Off Checkbox */}
                <div className="flex items-center justify-end gap-1.5 py-0.5 mb-2">
                  <label className="text-slate-800 font-medium cursor-pointer flex items-center gap-1">
                    <span>Round Off</span>
                    <input
                      type="checkbox"
                      checked={roundOff}
                      onChange={e => setRoundOff(e.target.checked)}
                      className="w-3.5 h-3.5 accent-blue-600 rounded-xs cursor-pointer"
                    />
                  </label>
                </div>

                <div className="border-t border-slate-300 my-1.5" />

                {/* Payment Record Section Header */}
                <div className="flex items-center justify-between pt-0.5 mb-1.5">
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-slate-500" />
                    <span className="font-bold text-[10px] text-slate-700 uppercase tracking-wider">Payment Record</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(true)}
                    className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xs text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title="Record Receipt Voucher (RV)"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Record Payment</span>
                  </button>
                </div>

                {/* Subtle Success Animation: Checkmark Transition Banner */}
                {paymentSuccessData?.show && (
                  <div 
                    key={paymentSuccessData.timestamp}
                    className="mb-2 p-1.5 bg-gradient-to-r from-emerald-50 via-emerald-100/90 to-emerald-50 border border-emerald-400 rounded-xs shadow-xs transition-all duration-300 animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* Checkmark circle with subtle pulse & spring scale */}
                        <div className="relative flex items-center justify-center shrink-0">
                          <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-60"></span>
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-[10px] text-emerald-950">Payment Registered!</span>
                            {paymentSuccessData.method && (
                              <span className="text-[8px] font-mono font-bold px-1 bg-white/90 border border-emerald-300 text-emerald-800 rounded">
                                {paymentSuccessData.method}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono font-bold text-emerald-800 block">
                            +QAR {paymentSuccessData.amount.toFixed(2)} received
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-white/90 px-1 py-0.5 rounded border border-emerald-300 shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Recorded</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paid Amount with Checkmark Transition & Highlight */}
                <div className={`flex items-center justify-between gap-1.5 mb-1.5 pt-0.5 rounded-xs transition-all duration-300 ${
                  paymentSuccessData?.show ? 'bg-emerald-100/70 p-1 border border-emerald-300' : ''
                }`}>
                  <div className="flex items-center gap-1">
                    <label className="text-slate-800 font-medium">Paid Amount</label>
                    {paymentSuccessData?.show && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold text-[9px] animate-in zoom-in-0 duration-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Updated</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={paidAmount ?? 0}
                    onChange={e => {
                      const newAmt = Number(e.target.value);
                      if (newAmt > (paidAmount ?? 0)) {
                        triggerPaymentSuccessAnimation(newAmt - (paidAmount ?? 0), 'Manual');
                      }
                      setPaidAmount(newAmt);
                    }}
                    className={`w-32 border px-1.5 py-0.5 text-xs font-mono font-bold text-right rounded-xs focus:outline-hidden transition-all duration-300 ${
                      paymentSuccessData?.show
                        ? 'bg-white border-emerald-500 text-emerald-800 ring-2 ring-emerald-400/50 shadow-xs'
                        : 'bg-white border-[#94a3b8] text-emerald-700'
                    }`}
                  />
                </div>

                {/* Outstanding */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <label className="text-[#c00000] font-bold">Outstanding</label>
                  <input
                    type="text"
                    readOnly
                    value={outstanding.toFixed(2) ?? ''}
                    className={`w-32 border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono font-bold text-right rounded-xs ${
                      outstanding > 0 ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'
                    }`}
                  />
                </div>

                <div className="border-t border-slate-300 my-1" />

                {/* Advance Paid */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5 pt-1">
                  <label className="text-slate-800 font-medium">Advance Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    value={advancePaid ?? 0}
                    onChange={e => setAdvancePaid(Number(e.target.value))}
                    className="w-32 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-right text-slate-900 rounded-xs focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Discount A/c Dropdown */}
              <div className="pt-1">
                <label className="block text-slate-800 font-medium mb-0.5">Discount A/c</label>
                <select
                  value={discountAccount || 'Discount Allowed Account'}
                  onChange={e => setDiscountAccount(e.target.value)}
                  className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs focus:outline-hidden"
                >
                  <option value="Discount Allowed Account">Discount Allowed Account</option>
                  <option value="Commercial Customer Promo A/c">Commercial Customer Promo A/c</option>
                  <option value="Insurance Deductible A/c">Insurance Deductible A/c</option>
                </select>
              </div>

            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ROW 4: PRINT OPTIONS CHECKBOXES (MATCHING SCREENSHOT)                     */}
        {/* ========================================================================= */}
        <div className="bg-[#f0f0f0] border-t border-[#cbd5e1] px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-800">
          <span className="font-bold text-slate-900 mr-1">Print Options :</span>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.customerComplaints}
              onChange={e => setPrintOptions(p => ({ ...p, customerComplaints: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Customer Complaints</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.workshopRemarks}
              onChange={e => setPrintOptions(p => ({ ...p, workshopRemarks: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Workshop Remarks</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={printOptions.showQtyPrice}
              onChange={e => setPrintOptions(p => ({ ...p, showQtyPrice: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Show Qty &amp; Price</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer text-slate-500">
            <input
              type="checkbox"
              checked={printOptions.showExcess}
              onChange={e => setPrintOptions(p => ({ ...p, showExcess: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Show Excess</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.detailedPrint}
              onChange={e => setPrintOptions(p => ({ ...p, detailedPrint: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Detailed Print</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.addExcess}
              onChange={e => setPrintOptions(p => ({ ...p, addExcess: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Add Excess</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer font-bold text-blue-900">
            <input
              type="checkbox"
              checked={printOptions.detailedInvoice}
              onChange={e => setPrintOptions(p => ({ ...p, detailedInvoice: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Detailed Invoice</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={printOptions.authorizedSign}
              onChange={e => setPrintOptions(p => ({ ...p, authorizedSign: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Authorized Sign.</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={printOptions.customerSign}
              onChange={e => setPrintOptions(p => ({ ...p, customerSign: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Customer Sign.</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.jobDescription}
              onChange={e => setPrintOptions(p => ({ ...p, jobDescription: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Job Description</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.advance}
              onChange={e => setPrintOptions(p => ({ ...p, advance: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Advance</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.claimType}
              onChange={e => setPrintOptions(p => ({ ...p, claimType: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Claim Type</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.showLaborHrs}
              onChange={e => setPrintOptions(p => ({ ...p, showLaborHrs: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Show Labor Hrs</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.excludeZeroValue}
              onChange={e => setPrintOptions(p => ({ ...p, excludeZeroValue: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Exclude 0 value</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.printItemCode}
              onChange={e => setPrintOptions(p => ({ ...p, printItemCode: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Print Item Code</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={printOptions.letterheadPrint}
              onChange={e => setPrintOptions(p => ({ ...p, letterheadPrint: e.target.checked }))}
              className="rounded-xs accent-blue-600"
            />
            <span>Letterhead Print</span>
          </label>
        </div>

        {/* ========================================================================= */}
        {/* ROW 5: BOTTOM DARK CHARCOAL ACTION BAR (JOURNAL, RV, DLV NOTE, POST, RCT) */}
        {/* ========================================================================= */}
        <div className="bg-[#2d3748] text-white px-3 py-1.5 flex items-center justify-between border-t border-slate-600">
          
          {/* Left: Journal button & RV button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJournalModal(true)}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-xs font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs border border-slate-300"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Journal</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-xs font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs border border-slate-300"
              title="Receipt Voucher Entry"
            >
              <Receipt className="w-3.5 h-3.5 text-blue-700" />
              <span>RV</span>
            </button>
          </div>

          {/* Center: Print Dlv. Note (Delivery Note) */}
          <div>
            <button
              type="button"
              onClick={() => setShowDeliveryNoteModal(true)}
              className="px-4 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-xs font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs border border-slate-300"
            >
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span>Print Dlv. Note</span>
            </button>
          </div>

          {/* Right: Quick Post + RECEIPT buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickPost}
              className="px-3.5 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-xs font-bold text-[11px] cursor-pointer shadow-2xs border border-slate-300"
            >
              Quick Post
            </button>

            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="px-4 py-1 bg-[#1e4e79] hover:bg-blue-800 text-white rounded-xs font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs border border-blue-900 uppercase tracking-wider"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
              <span>RECEIPT</span>
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: JOB CARD PICKER POPOVER                                      */}
      {/* ========================================================================= */}
      {showJobCardPicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-slate-400 rounded-xs w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#1e4e79] text-white px-3 py-2 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-300" />
                <span>Select Workshop Job Card for Invoicing</span>
              </div>
              <button onClick={() => setShowJobCardPicker(false)} className="text-white hover:text-red-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {jobCards.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No Job Cards found in workshop database.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700 font-semibold">
                      <th className="p-2">Job Card #</th>
                      <th className="p-2">Plate &amp; Vehicle</th>
                      <th className="p-2">Customer</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right">Amount (QAR)</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {jobCards.map(jc => (
                      <tr key={jc.id} className="hover:bg-blue-50">
                        <td className="p-2 font-mono font-bold text-blue-900">{jc.jobNumber}</td>
                        <td className="p-2">
                          <span className="font-mono font-semibold">{jc.vehicle.plateNumber}</span>
                          <span className="text-slate-500 text-[10px] block">{jc.vehicle.make} {jc.vehicle.model}</span>
                        </td>
                        <td className="p-2">{jc.customer.name}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded-xs text-[10px] font-medium border">
                            {jc.status}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono font-bold">{jc.totalAmount.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelectJobCard(jc)}
                            className="px-2 py-0.5 bg-[#7ac142] hover:bg-[#68a835] text-white rounded-xs text-[10px] font-bold cursor-pointer"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-slate-100 px-3 py-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setShowJobCardPicker(false)}
                className="px-3 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xs font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: FIND INVOICE DIALOG                                          */}
      {/* ========================================================================= */}
      {showFindDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-slate-400 rounded-xs w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#1e4e79] text-white px-3 py-2 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-300" />
                <span>Find Invoice Document</span>
              </div>
              <button onClick={() => setShowFindDialog(false)} className="text-white hover:text-red-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b bg-slate-50">
              <input
                type="text"
                value={findSearchTerm ?? ''}
                onChange={e => setFindSearchTerm(e.target.value)}
                placeholder="Search Invoice #, Job Card #, Customer, Plate..."
                className="w-full bg-white border border-slate-300 rounded-xs px-2.5 py-1 text-xs focus:outline-hidden"
                autoFocus
              />
            </div>

            <div className="p-3 overflow-y-auto flex-1 space-y-1">
              {invoices
                .filter(inv => {
                  if (!inv) return false;
                  const t = (findSearchTerm || '').trim().toLowerCase();
                  if (!t) return true;
                  const invNum = (inv.invoiceNumber || '').toLowerCase();
                  const custName = (inv.customerName || (inv.customer && inv.customer.name) || '').toLowerCase();
                  const plate = (inv.vehiclePlate || (inv.vehicle && inv.vehicle.plateNumber) || '').toLowerCase();
                  const jcNum = (inv.jobCardNumber || '').toLowerCase();

                  return (
                    invNum.includes(t) ||
                    custName.includes(t) ||
                    plate.includes(t) ||
                    jcNum.includes(t)
                  );
                })
                .map((inv, idx) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      const realIndex = invoices.findIndex(i => i.id === inv.id);
                      if (realIndex >= 0) setCurrentIndex(realIndex);
                      setShowFindDialog(false);
                      showToast(`Loaded invoice ${inv.invoiceNumber}`);
                    }}
                    className="p-2 border border-slate-200 hover:bg-blue-50 rounded-xs cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-900">{inv.invoiceNumber}</span>
                      <span className="text-slate-600 ml-2 font-medium">{inv.customerName}</span>
                      {inv.vehiclePlate && (
                        <span className="text-slate-400 text-[10px] ml-2">({inv.vehiclePlate})</span>
                      )}
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-800">QAR {inv.grandTotal.toFixed(2)}</span>
                      <span className={`text-[10px] block font-sans ${inv.balanceAmount <= 0 ? 'text-emerald-700 font-bold' : 'text-amber-700'}`}>
                        {inv.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="bg-slate-100 px-3 py-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setShowFindDialog(false)}
                className="px-3 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xs font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: WORKSHOP INVOICE PRINT PREVIEW                                */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-2 border-slate-400 rounded-xs w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <PrintModalHeader
              title="Workshop Invoice"
              documentId={`INV-${docNo}`}
              targetElementId="printable-invoice-view"
              onClose={() => setShowPrintModal(false)}
              accentColor="#0f172a"
            />

            <div id="printable-invoice-view" className="p-6 overflow-y-auto flex-1 bg-white font-sans text-slate-900 space-y-4 text-xs">
              {/* Header: Company Details & Logo only */}
              {!printOptions.letterheadPrint && (
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
                  <div className="flex items-center gap-3 shrink-0">
                    <NajmAlHudaLogo className="w-52 sm:w-60 max-w-[240px]" />
                  </div>
                  <div className="text-right">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">{settings.garageName || 'NAJM AL HUDA AUTO MAINTENANCE'}</h1>
                    {settings.garageNameAr && <p className="text-xs font-semibold text-slate-600 font-arabic">{settings.garageNameAr}</p>}
                    <p className="text-[11px] text-slate-600 mt-0.5">{settings.address || 'Industrial Area, St. 24'}, {settings.cityStateZip || 'Doha, Qatar'}</p>
                    <p className="text-[11px] text-slate-600 font-mono">C.R. No: <strong>{settings.crNumber || '123456'}</strong> &bull; Tel: {settings.phone || '+974 4450 1234'}</p>
                  </div>
                </div>
              )}

              {/* Document Banner */}
              {(() => {
                const displayInvoiceCode = (docNo && (docNo.startsWith('INV-') || docNo.startsWith('IV-')))
                  ? docNo
                  : (docNo ? `INV-${docNo}` : 'INV-0001');
                const effectiveJobCardNo = (jobCardNo || currentInvoice?.jobCardNumber || (linkedJobCard ? linkedJobCard.jobNumber : '') || 'N/A').trim();
                return printOptions.letterheadPrint ? (
                  <div className="h-16 border-b border-dashed border-slate-300 flex items-center justify-between text-slate-400 text-xs italic px-2">
                    <span>[Letterhead Stationery Mode — Header space reserved for pre-printed company paper]</span>
                    <div className="text-right font-mono not-italic text-slate-900">
                      <div className="font-black text-base text-slate-900">{displayInvoiceCode}</div>
                      <div className="text-[11px] text-slate-600">Date: {formatDate(docDate)} {docTime}</div>
                      <div className="text-[11px] font-bold text-slate-900">Job Card: {effectiveJobCardNo}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 text-white rounded-xs p-3.5 flex justify-between items-center border-b-2 border-amber-500 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base uppercase tracking-wider text-white">INVOICE</span>
                        <span className="text-xs font-arabic text-amber-400 font-medium">(فاتورة)</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300 font-mono">
                        <span>Invoice #: <strong className="text-amber-300 text-xs">{displayInvoiceCode}</strong></span>
                        <span>&bull;</span>
                        <span>Date: {formatDate(docDate)} {docTime}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-bold px-2.5 py-0.5 rounded-xs text-[10px] uppercase tracking-wider">
                        Job Card: {effectiveJobCardNo}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Customer & Vehicle Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xs border border-slate-200">
                  <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">Billed To (Customer)</span>
                    <span className="text-[10px] text-slate-500 font-arabic font-medium">المفوتر إليه</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-sm">{accountName || contactPerson || 'Customer Walk-in'}</p>
                    <p className="text-slate-600 flex justify-between">
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-medium text-slate-800">{contactPerson || accountName || 'N/A'}</span>
                    </p>
                    <p className="text-slate-600 flex justify-between">
                      <span className="text-slate-500">Mobile Phone:</span>
                      <span className="font-mono font-medium text-slate-800">{mobileNo || telephoneNo || 'N/A'}</span>
                    </p>
                    <p className="text-slate-600 flex justify-between">
                      <span className="text-slate-500">Payment Terms:</span>
                      <span className="font-medium text-slate-800">{paymentTerm} ({paymentDays} Days)</span>
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xs border border-slate-200">
                  <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">Vehicle Information</span>
                    <span className="text-[10px] text-slate-500 font-arabic font-medium">بيانات المركبة</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono font-bold text-slate-900 text-sm flex justify-between">
                      <span className="text-slate-500 font-normal text-xs">Plate Number:</span>
                      <span className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded-xs border border-slate-300">{regNo || 'N/A'}</span>
                    </p>
                    <p className="text-slate-600 flex justify-between">
                      <span className="text-slate-500">Make &amp; Model:</span>
                      <span className="font-medium text-slate-800">{vehicleName} {vehicleModel} {vehicleYear ? `(${vehicleYear})` : ''}</span>
                    </p>
                    <p className="text-slate-600 flex justify-between">
                      <span className="text-slate-500">Vehicle Color:</span>
                      <span className="font-medium text-slate-800">{vehicleColor || 'N/A'}</span>
                    </p>
                    <p className="text-slate-600 flex justify-between">
                      <span className="text-slate-500">Chassis / VIN:</span>
                      <span className="font-mono text-[10px] font-semibold text-slate-800">{vinChassisNo || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Option: Claim Type / Insurance Classification */}
              {printOptions.claimType && (
                <div className="bg-sky-50 border border-sky-200 rounded-xs p-2 text-xs flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <span className="bg-sky-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase">
                      Claim Type: {linkedJobCard?.insurance?.enabled ? 'Insurance Claim' : paymentTerm === 'Credit' ? 'Corporate Credit' : 'Cash / Direct'}
                    </span>
                    <span className="text-slate-700 text-[11px]">
                      {linkedJobCard?.insurance?.enabled
                        ? `Insurer: ${linkedJobCard.insurance.company || 'Qatar Insurance Co.'} • Policy: ${linkedJobCard.insurance.policyNumber || 'QIC-POL-9921'} • Claim: ${linkedJobCard.insurance.claimNumber || 'CLM-8821'}`
                        : `Payment Classification: ${paymentTerm} Settlement • Account: ${accountName || 'Direct Billing'}`}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[10px]">
                    Coverage: {linkedJobCard?.insurance?.enabled ? 'Comprehensive Motor Repair' : 'Standard Retail'}
                  </span>
                </div>
              )}

              {/* Option: Detailed Print (Extended Workshop & Vehicle Specs) */}
              {printOptions.detailedPrint && (
                <div className="bg-slate-50 border border-slate-200 rounded-xs p-2.5 grid grid-cols-4 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500 block">Odometer Reading:</span>
                    <strong className="text-slate-900">{linkedJobCard?.vehicle?.odometer ? `${linkedJobCard.vehicle.odometer} KM` : '38,420 KM'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Service Advisor:</span>
                    <strong className="text-slate-900">{linkedJobCard?.serviceAdviser || 'Tariq Mansoor (Advisor)'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assigned Technician:</span>
                    <strong className="text-slate-900">{linkedJobCard?.assignedTechnician || 'Alex Rivera (Master Tech)'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Promised Delivery:</span>
                    <strong className="text-slate-900">{linkedJobCard?.expectedDelivery || linkedJobCard?.promisedDate || 'Same Day Clearance'}</strong>
                  </div>
                </div>
              )}

              {/* Option: Job Description */}
              {printOptions.jobDescription && (
                <div className="bg-slate-50 p-2.5 rounded-xs border-l-4 border-slate-900 border-y border-r border-slate-200 text-xs">
                  <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wide">Job Scope &amp; Service Classification:</span>
                  <p className="text-slate-800 mt-0.5 font-medium">{narration || 'Comprehensive vehicle maintenance, diagnostic inspection, and repair services.'}</p>
                </div>
              )}

              {/* Option: Customer Complaints */}
              {printOptions.customerComplaints && (
                <div className="bg-slate-50 p-2.5 rounded-xs border-l-4 border-slate-700 border-y border-r border-slate-200 text-xs">
                  <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wide">Customer Reported Concerns / Complaints:</span>
                  <p className="text-slate-700 italic mt-0.5">
                    {linkedJobCard?.customerComplaints || 'Periodic scheduled maintenance, brake inspection, suspension check, and general servicing.'}
                  </p>
                </div>
              )}

              {/* Option: Workshop Remarks */}
              {printOptions.workshopRemarks && (
                <div className="bg-slate-50 p-2.5 rounded-xs border-l-4 border-emerald-600 border-y border-r border-slate-200 text-xs">
                  <span className="font-bold text-emerald-950 block text-[10px] uppercase tracking-wide">Workshop Technical Remarks:</span>
                  <p className="text-slate-700 mt-0.5">
                    {linkedJobCard?.supervisorRemarks || 'All mechanical repairs executed according to manufacturer standards. Vehicle road tested and safety verified.'}
                  </p>
                </div>
              )}

              {/* Tables: Controlled by detailedInvoice, showLaborHrs, showQtyPrice, printItemCode, excludeZeroValue */}
              {(() => {
                const rawLabor = (linkedJobCard && linkedJobCard.mechanicalTasks && linkedJobCard.mechanicalTasks.length > 0)
                  ? linkedJobCard.mechanicalTasks
                  : [
                      { id: '1', description: `Mechanical Labor & Workshop Services (${jobCardNo || `JOB-${docNo}`})`, estimatedHours: 1, hourlyRate: invoiceAmt * 0.6 }
                    ];

                const laborItems = rawLabor.filter(t => {
                  if (!printOptions.excludeZeroValue) return true;
                  const itemTot = (Number(t.estimatedHours || 1) * Number(t.hourlyRate || 0));
                  return itemTot > 0;
                });

                const rawParts = (linkedJobCard && linkedJobCard.partsUsed && linkedJobCard.partsUsed.length > 0)
                  ? linkedJobCard.partsUsed
                  : [
                      { id: '1', name: 'OEM Replacement Spare Parts & Consumables', sku: 'PRT-GEN', quantity: 1, unitPrice: invoiceAmt * 0.4, total: invoiceAmt * 0.4 }
                    ];

                const partsItems = rawParts.filter(p => {
                  if (!printOptions.excludeZeroValue) return true;
                  const itemTot = Number(p.total) || (Number(p.quantity || 1) * Number(p.unitPrice || 0));
                  return itemTot > 0;
                });

                const totalLaborCalc = (linkedJobCard ? ((linkedJobCard.mechanicalLaborCost || 0) + (linkedJobCard.dentingLaborCost || 0) + (linkedJobCard.paintingCost || 0) + (linkedJobCard.paintBoothCharge || 0)) : (invoiceAmt * 0.6));
                const totalPartsCalc = (linkedJobCard ? ((linkedJobCard.partsCost || 0) + (linkedJobCard.consumablesCost || 0)) : (invoiceAmt * 0.4));

                return !printOptions.detailedInvoice ? (
                  /* Option: Detailed Invoice = false (Summary Mode) */
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Summary Service &amp; Materials Classification</h3>
                    <table className="w-full text-left border border-slate-300 text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-1.5 w-10 text-center">#</th>
                          <th className="p-1.5">Service Classification</th>
                          {printOptions.showQtyPrice && <th className="p-1.5 text-center w-28">Category</th>}
                          <th className="p-1.5 text-right w-32">Total (QAR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(!printOptions.excludeZeroValue || totalLaborCalc > 0) && (
                          <tr>
                            <td className="p-1.5 text-center font-mono text-slate-500">1</td>
                            <td className="p-1.5 font-medium">Workshop Mechanical Labor, Denting &amp; Technical Services</td>
                            {printOptions.showQtyPrice && <td className="p-1.5 text-center font-mono text-slate-600">Workshop Labor</td>}
                            <td className="p-1.5 text-right font-mono font-bold">{totalLaborCalc.toFixed(2)}</td>
                          </tr>
                        )}
                        {(!printOptions.excludeZeroValue || totalPartsCalc > 0) && (
                          <tr>
                            <td className="p-1.5 text-center font-mono text-slate-500">2</td>
                            <td className="p-1.5 font-medium">OEM Spare Parts, Consumables &amp; Replacement Materials</td>
                            {printOptions.showQtyPrice && <td className="p-1.5 text-center font-mono text-slate-600">Spare Parts</td>}
                            <td className="p-1.5 text-right font-mono font-bold">{totalPartsCalc.toFixed(2)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Option: Detailed Invoice = true (Itemized Breakdown Mode) */
                  <div className="space-y-4">
                    {/* Labor Operations Table */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">Labor Operations</h3>
                      <table className="w-full text-left border border-slate-300 text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                          <tr>
                            <th className="p-1.5 w-8 text-center">#</th>
                            <th className="p-1.5">Description / Task</th>
                            {printOptions.showLaborHrs && <th className="p-1.5 text-center w-20">Hours</th>}
                            {printOptions.showQtyPrice && <th className="p-1.5 text-right w-24">Rate (QAR)</th>}
                            <th className="p-1.5 text-right w-24">Total (QAR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {laborItems.length > 0 ? (
                            laborItems.map((t, idx) => (
                              <tr key={t.id || idx}>
                                <td className="p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                                <td className="p-1.5 font-medium">{t.description}</td>
                                {printOptions.showLaborHrs && <td className="p-1.5 text-center font-mono">{t.estimatedHours || 1}</td>}
                                {printOptions.showQtyPrice && <td className="p-1.5 text-right font-mono">{(Number(t.hourlyRate) || 0).toFixed(2)}</td>}
                                <td className="p-1.5 text-right font-mono font-bold">{(Number(t.estimatedHours || 1) * Number(t.hourlyRate || 0)).toFixed(2)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3 + (printOptions.showLaborHrs ? 1 : 0) + (printOptions.showQtyPrice ? 1 : 0)} className="p-2 text-center text-slate-400 italic">
                                No non-zero labor tasks to display.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Parts & Materials Table */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">Parts &amp; Materials Requisition</h3>
                      <table className="w-full text-left border border-slate-300 text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                          <tr>
                            <th className="p-1.5 w-8 text-center">#</th>
                            <th className="p-1.5">Part Description</th>
                            {printOptions.printItemCode && <th className="p-1.5 w-28">Part No / SKU</th>}
                            {printOptions.showQtyPrice && <th className="p-1.5 text-center w-16">Qty</th>}
                            {printOptions.showQtyPrice && <th className="p-1.5 text-right w-24">Price (QAR)</th>}
                            <th className="p-1.5 text-right w-24">Total (QAR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {partsItems.length > 0 ? (
                            partsItems.map((p, idx) => (
                              <tr key={p.id || idx}>
                                <td className="p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                                <td className="p-1.5 font-medium">{p.name}</td>
                                {printOptions.printItemCode && <td className="p-1.5 font-mono text-[10px] text-slate-600">{p.sku || '-'}</td>}
                                {printOptions.showQtyPrice && <td className="p-1.5 text-center font-mono">{p.quantity}</td>}
                                {printOptions.showQtyPrice && <td className="p-1.5 text-right font-mono">{(Number(p.unitPrice) || 0).toFixed(2)}</td>}
                                <td className="p-1.5 text-right font-mono font-bold">{(Number(p.total) || (p.quantity * Number(p.unitPrice || 0))).toFixed(2)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3 + (printOptions.printItemCode ? 1 : 0) + (printOptions.showQtyPrice ? 2 : 0)} className="p-2 text-center text-slate-400 italic">
                                No non-zero parts to display.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Financial Totals Box (with showExcess, addExcess, and advance options) */}
              {(() => {
                const baseExcess = Number((linkedJobCard?.accounting as any)?.excessAmount ?? (linkedJobCard?.insurance?.enabled ? 250 : 0));
                const addedExcess = printOptions.addExcess ? baseExcess : 0;
                const effectiveGross = grossAmount + addedExcess;
                const effectiveOutstanding = Math.max(0, effectiveGross - paidAmount - advancePaid);

                return (
                  <div className="flex justify-end pt-1">
                    <div className="w-80 space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-xs border border-slate-300 shadow-2xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Labor:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          QAR {(linkedJobCard ? ((linkedJobCard.mechanicalLaborCost || 0) + (linkedJobCard.dentingLaborCost || 0) + (linkedJobCard.paintingCost || 0) + (linkedJobCard.paintBoothCharge || 0)) : (invoiceAmt * 0.6)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Total Parts:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          QAR {(linkedJobCard ? ((linkedJobCard.partsCost || 0) + (linkedJobCard.consumablesCost || 0)) : (invoiceAmt * 0.4)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1">
                        <span>Subtotal:</span>
                        <span className="font-mono font-semibold text-slate-800">QAR {invoiceAmt.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Discount:</span>
                          <span className="font-mono font-semibold">- QAR {discount.toFixed(2)}</span>
                        </div>
                      )}
                      {printOptions.showExcess && baseExcess > 0 && (
                        <div className="flex justify-between text-amber-800 border-t border-dashed border-slate-200 pt-1">
                          <span>Policy Excess / Deductible:</span>
                          <span className="font-mono font-semibold">QAR {baseExcess.toFixed(2)}</span>
                        </div>
                      )}
                      {printOptions.addExcess && baseExcess > 0 && (
                        <div className="flex justify-between text-amber-900 bg-amber-50 px-1 py-0.5 rounded-xs font-semibold">
                          <span>Excess Added to Bill:</span>
                          <span className="font-mono">+ QAR {baseExcess.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between font-bold text-sm text-slate-900">
                        <span>Grand Total:</span>
                        <span className="font-mono text-base text-slate-950 font-black">QAR {effectiveGross.toFixed(2)}</span>
                      </div>
                      {printOptions.advance && (paidAmount > 0 || advancePaid > 0) && (
                        <div className="flex justify-between text-emerald-700 text-xs pt-0.5">
                          <span>Paid / Advance:</span>
                          <span className="font-mono font-semibold">QAR {(paidAmount + advancePaid).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-dashed border-slate-400 pt-1.5 flex justify-between font-bold text-xs bg-amber-100 p-2 rounded-xs border border-amber-300 text-slate-950">
                        <span>Balance Due:</span>
                        <span className="font-mono text-sm font-black text-rose-800">QAR {effectiveOutstanding.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Narration */}
              {narration && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs text-[11px]">
                  <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wide mb-0.5">Notes &amp; Remarks:</span>
                  <p className="text-slate-700 font-mono whitespace-pre-line leading-relaxed">{narration}</p>
                </div>
              )}

              {/* Option: Signatures (Customer Sign & Authorized Sign) */}
              {(printOptions.authorizedSign || printOptions.customerSign) && (
                <div className="grid grid-cols-2 gap-8 pt-8 text-xs border-t border-slate-300">
                  {printOptions.customerSign ? (
                    <div className="text-center">
                      <div className="border-b-2 border-slate-400 w-52 mx-auto mb-1" />
                      <p className="font-bold text-slate-900">Customer Signature</p>
                      <p className="text-[10px] text-slate-500">Vehicle received &amp; work accepted in good condition</p>
                    </div>
                  ) : <div />}
                  {printOptions.authorizedSign && (
                    <div className="text-center">
                      <div className="border-b-2 border-slate-400 w-52 mx-auto mb-1" />
                      <p className="font-bold text-slate-900">For {settings.garageName || 'Workshop Management'}</p>
                      <p className="text-[10px] text-slate-500">Authorized Signatory / Finance Stamp</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 4: VEHICLE DELIVERY NOTE (GATE PASS) PRINT PREVIEW               */}
      {/* ========================================================================= */}
      {showDeliveryNoteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-slate-400 rounded-xs w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <PrintModalHeader
              title="Vehicle Delivery Note / Gate Pass Clearance"
              documentId={`GP-${docNo}`}
              targetElementId="printable-delivery-note-view"
              onClose={() => setShowDeliveryNoteModal(false)}
            />

            <div id="printable-delivery-note-view" className="p-6 overflow-y-auto flex-1 bg-white font-sans text-slate-900 space-y-4">
              <div className="text-center border-b pb-3">
                <h2 className="text-lg font-black text-slate-900 uppercase">{settings.garageName}</h2>
                <p className="text-xs text-slate-500">{settings.address} • Phone: {settings.phone}</p>
                <div className="inline-block mt-2 px-3 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xs uppercase tracking-wider">
                  VEHICLE DELIVERY NOTE / GATE CLEARANCE
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 border rounded-xs font-mono">
                <div><span>Pass No:</span> <strong>GP-{docNo}</strong></div>
                <div><span>Date &amp; Time:</span> <strong>{formatDate(new Date())}</strong></div>
                <div><span>Ref Job Card:</span> <strong>{jobCardNo || 'N/A'}</strong></div>
                <div><span>Ref Invoice:</span> <strong>INV-{docNo}</strong></div>
                <div><span>Plate Number:</span> <strong className="text-blue-900 text-sm">{regNo}</strong></div>
                <div><span>Vehicle Model:</span> <strong>{vehicleName} {vehicleModel}</strong></div>
                <div><span>Customer:</span> <strong>{accountName || contactPerson}</strong></div>
                <div><span>Phone:</span> <strong>{mobileNo}</strong></div>
              </div>

              <div className="border border-emerald-300 bg-emerald-50 p-3 rounded-xs text-xs text-emerald-900 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Workshop Quality &amp; Security Clearance Granted</p>
                  <p className="text-[11px]">All repairs completed, vehicle inspected, and financial clearance validated for gate pass departure.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 text-xs text-center border-t">
                <div>
                  <div className="border-b border-slate-400 w-40 mx-auto mb-1" />
                  <p className="font-bold">Gate Security Officer</p>
                  <p className="text-[10px] text-slate-400">Exit Verified</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-40 mx-auto mb-1" />
                  <p className="font-bold">Customer Acknowledgment</p>
                  <p className="text-[10px] text-slate-400">Vehicle Received in Good Order</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 5: DOUBLE-ENTRY GENERAL JOURNAL PREVIEW                         */}
      {/* ========================================================================= */}
      {showJournalModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-slate-400 rounded-xs w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#1e4e79] text-white px-3 py-2 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-300" />
                <span>General Journal Voucher • INV-{docNo}</span>
              </div>
              <button onClick={() => setShowJournalModal(false)} className="text-white hover:text-red-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600 text-[11px]">
                Double-entry automated accounting ledger posting for invoice INV-{docNo}:
              </p>

              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b font-sans font-bold text-slate-700">
                    <th className="p-2">Account Code &amp; Title</th>
                    <th className="p-2 text-right">Debit (QAR)</th>
                    <th className="p-2 text-right">Credit (QAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2">
                      <strong className="text-blue-900">1200 - Accounts Receivable</strong>
                      <span className="block text-[10px] font-sans text-slate-500">Customer: {accountName || contactPerson}</span>
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900">{grossAmount.toFixed(2)}</td>
                    <td className="p-2 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="p-2">
                      <strong>4010 - Workshop Labor Revenue</strong>
                    </td>
                    <td className="p-2 text-right text-slate-400">-</td>
                    <td className="p-2 text-right text-slate-900">{(netAmount * 0.6).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-2">
                      <strong>4020 - Spare Parts Sales Revenue</strong>
                    </td>
                    <td className="p-2 text-right text-slate-400">-</td>
                    <td className="p-2 text-right text-slate-900">{(netAmount * 0.4).toFixed(2)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td className="p-2 font-sans text-slate-800">Total Journal Balance:</td>
                    <td className="p-2 text-right text-blue-900 font-bold">{grossAmount.toFixed(2)}</td>
                    <td className="p-2 text-right text-blue-900 font-bold">{grossAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-slate-100 px-3 py-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setShowJournalModal(false)}
                className="px-3 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xs font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 6: RECEIPT VOUCHER (RV) / PAYMENT COLLECTION ENTRY               */}
      {/* ========================================================================= */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-slate-400 rounded-xs w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#1e4e79] text-white px-3 py-2 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-300" />
                <span>Issue Receipt Voucher (RV) • INV-{docNo}</span>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-white hover:text-red-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {receiptSuccessTransition ? (
              <div className="p-8 flex flex-col items-center justify-center space-y-3 bg-white text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-14 w-14 rounded-full bg-emerald-400 opacity-40"></span>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-md">
                    <CheckCircle2 className="w-7 h-7 animate-in zoom-in-50 duration-200" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Payment Successfully Registered</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Receipt voucher recorded to invoice settlement
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const amt = Number((form.elements.namedItem('receiptAmt') as HTMLInputElement).value);
                  const method = (form.elements.namedItem('receiptMethod') as HTMLSelectElement).value as PaymentRecord['method'];
                  const notes = (form.elements.namedItem('receiptNotes') as HTMLInputElement).value;
                  if (amt > 0) handleProcessReceipt(amt, method, notes);
                }}
                className="p-4 space-y-3 text-xs"
              >
                <div className="bg-slate-50 p-2.5 border rounded-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Invoice:</span>
                    <span className="font-mono font-bold">QAR {grossAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Already Paid:</span>
                    <span className="font-mono text-emerald-700 font-bold">QAR {paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-bold text-rose-700">
                    <span>Current Outstanding:</span>
                    <span className="font-mono">QAR {outstanding.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Receipt Collection Amount (QAR)</label>
                  <input
                    name="receiptAmt"
                    type="number"
                    step="0.01"
                    defaultValue={outstanding > 0 ? outstanding : 0}
                    className="w-full bg-white border border-[#94a3b8] px-2 py-1 text-sm font-mono font-bold text-slate-900 rounded-xs focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Payment Method</label>
                  <select
                    name="receiptMethod"
                    defaultValue="Cash"
                    className="w-full bg-white border border-[#94a3b8] px-2 py-1 text-xs text-slate-900 rounded-xs focus:outline-hidden"
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="Credit Card">Credit Card / POS Terminal</option>
                    <option value="Debit Card">Debit Card (NAPS)</option>
                    <option value="Bank/UPI">Bank Wire Transfer (QNB / CBQ)</option>
                    <option value="Insurance Claim">Insurance Claim Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Receipt Notes / Transaction Ref</label>
                  <input
                    name="receiptNotes"
                    type="text"
                    placeholder="POS auth code or receipt remarks..."
                    defaultValue={`Counter settlement for INV-${docNo}`}
                    className="w-full bg-white border border-[#94a3b8] px-2 py-1 text-xs text-slate-900 rounded-xs focus:outline-hidden"
                  />
                </div>

                <div className="bg-slate-100 -mx-4 -mb-4 px-4 py-2 border-t flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="px-3 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xs font-semibold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-[#1e4e79] hover:bg-blue-800 text-white rounded-xs font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Confirm &amp; Issue Receipt
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Find Record Modal */}
      <FindRecordModal
        isOpen={showFindModal}
        onClose={() => setShowFindModal(false)}
        onSelect={(inv) => {
          const idx = invoices.findIndex(i => i.id === inv.id);
          if (idx >= 0) {
            setCurrentIndex(idx);
            loadInvoiceIntoState(inv);
          }
          setIsNewRecord(false);
          setIsEditMode(false);
          setHasUnsavedChanges(false);
        }}
        title="Find Invoice"
        placeholder="Search by Invoice No, Customer, Plate, Status..."
        items={findItems}
      />

    </div>
  );
};
