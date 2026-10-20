import React, { useState, useEffect } from 'react';
import { Invoice, PaymentRecord, GarageSettings, JobCard } from '../../types';
import { useToast } from '../Common/Toast';
import { exportInvoicesToCSV } from '../../utils/csvExport';
import { formatDate } from '../../utils/formatters';
import { ModuleContainer } from '../Common/ModuleContainer';
import { DataTable } from '../Common/DataTable';
import { Badge } from '../Common/Badge';
import { 
  Receipt, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Printer, 
  X, 
  CreditCard, 
  Plus,
  Calendar,
  FileText,
  Download,
  Trash2,
  Edit3,
  Eye,
  ArrowRight
} from 'lucide-react';
import { InvoiceRecordModal } from './InvoiceRecordModal';
import { ReceiptRecordModal } from './ReceiptRecordModal';
import { useGarage } from '../../context/GarageContext';

interface Props {
  invoices: Invoice[];
  jobCards?: JobCard[];
  settings: GarageSettings;
  onRecordPayment: (invoiceId: string, payment: Omit<PaymentRecord, 'id' | 'date'>) => void;
  selectedInvoiceId?: string | null;
  onClearSelectedInvoice?: () => void;
  onCreateInvoice?: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber'>) => Invoice;
  onUpdateInvoice?: (id: string, updates: Partial<Invoice>) => void;
  onDeleteInvoice?: (id: string) => void;
  onViewJobCard?: (jobCardId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  initialStatusFilter?: 'ALL' | 'Paid' | 'Partial' | 'Unpaid';
}

export const BillingManager: React.FC<Props> = ({
  invoices,
  jobCards = [],
  settings,
  onRecordPayment,
  selectedInvoiceId,
  onClearSelectedInvoice,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onViewJobCard,
  onOpenCustomer,
  initialStatusFilter = 'ALL',
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Paid' | 'Partial' | 'Unpaid'>(initialStatusFilter);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Shared Record Shell Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<string | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<string | null>(null);
  const [targetInvoiceForReceipt, setTargetInvoiceForReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (selectedInvoiceId) {
      setSelectedInvoiceForModal(selectedInvoiceId);
      setIsInvoiceModalOpen(true);
    }
  }, [selectedInvoiceId]);

  const filteredInvoices = (invoices || []).filter(inv => {
    if (!inv) return false;
    const term = (searchTerm || '').trim().toLowerCase();
    const invNum = (inv.invoiceNumber || '').toLowerCase();
    const custName = (inv.customerName || (inv.customer && inv.customer.name) || '').toLowerCase();
    const phone = inv.customerPhone || (inv.customer && inv.customer.phone) || '';
    const plate = (inv.vehiclePlate || (inv.vehicle && inv.vehicle.plateNumber) || '').toLowerCase();

    const matchesSearch = !term ||
      invNum.includes(term) ||
      custName.includes(term) ||
      phone.includes(term) ||
      plate.includes(term);

    const matchesStatus = statusFilter === 'ALL' || inv.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBilled = (invoices || []).reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalPaid = (invoices || []).reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const totalOutstanding = (invoices || []).reduce((acc, inv) => acc + (inv.balanceAmount || 0), 0);

  // Derived Receipts List
  const receiptsList = invoices.flatMap((inv) =>
    (inv.payments || []).map((p, idx) => ({
      id: p.id || `rec-${inv.id}-${idx}`,
      receiptNumber: p.transactionRef?.startsWith('RC-') ? p.transactionRef : `RC-000${idx + 1}`,
      date: p.date || inv.date,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      invoiceNumber: inv.invoiceNumber,
      invoiceId: inv.id,
      amount: p.amount,
      method: p.method,
      transactionRef: p.transactionRef,
      notes: p.notes
    }))
  );

  const handleOpenNewInvoice = () => {
    setSelectedInvoiceForModal(null);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenInvoiceRecord = (inv: Invoice) => {
    setSelectedInvoiceForModal(inv.id);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenNewReceipt = (invId?: string) => {
    setSelectedReceiptForModal(null);
    setTargetInvoiceForReceipt(invId || null);
    setIsReceiptModalOpen(true);
  };

  const columns = [
    {
      header: 'Invoice Info',
      accessor: (inv: Invoice) => (
        <div>
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenInvoiceRecord(inv); }}
            className="font-mono font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            {inv.invoiceNumber}
          </button>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <Calendar className="w-3 h-3" /> {formatDate(inv.date)}
          </div>
          {inv.jobCardNumber && <div className="text-[9px] text-slate-400 font-mono mt-0.5">Ref: {inv.jobCardNumber}</div>}
        </div>
      ),
      width: '18%'
    },
    {
      header: 'Customer & Vehicle',
      accessor: (inv: Invoice) => (
        <div>
          <div className="font-bold text-slate-900">{inv.customerName}</div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-700">{inv.vehiclePlate}</span>
            <span className="text-slate-400">•</span>
            <span>{inv.vehicleModel}</span>
          </div>
        </div>
      ),
      width: '28%'
    },
    {
      header: 'Status',
      accessor: (inv: Invoice) => (
        <div className="flex flex-col gap-1">
          <Badge 
            variant={inv.paymentStatus === 'Paid' ? 'success' : inv.paymentStatus === 'Partial' ? 'amber' : 'error'} 
            dot
          >
            {inv.paymentStatus}
          </Badge>
          {inv.balanceAmount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenNewReceipt(inv.id); }}
              className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 mt-0.5 cursor-pointer"
            >
              <CreditCard className="w-2.5 h-2.5" />
              <span>Receive</span>
            </button>
          )}
        </div>
      ),
      width: '14%'
    },
    {
      header: 'Total / Balance (QAR)',
      accessor: (inv: Invoice) => (
        <div className="text-right">
          <div className="font-mono font-bold text-slate-900">{Number(inv.grandTotal || 0).toFixed(2)} QAR</div>
          {inv.balanceAmount > 0 ? (
            <div className="text-[11px] font-bold text-rose-600 font-mono">Due: {Number(inv.balanceAmount).toFixed(2)}</div>
          ) : (
            <div className="text-[10px] text-emerald-600 font-bold">Settled</div>
          )}
        </div>
      ),
      headerClassName: 'text-right',
      width: '22%'
    },
    {
      header: 'Actions',
      accessor: (inv: Invoice) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenInvoiceRecord(inv); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            title="Open Record Management"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete Invoice ${inv.invoiceNumber}?`)) onDeleteInvoice?.(inv.id);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      headerClassName: 'text-right',
      width: '18%'
    }
  ];

  const receiptColumns = [
    {
      header: 'Receipt # & Date',
      accessor: (r: any) => (
        <div>
          <div className="font-mono font-bold text-emerald-700">{r.receiptNumber}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">{formatDate(r.date)}</div>
        </div>
      )
    },
    {
      header: 'Customer',
      accessor: (r: any) => (
        <div>
          <div className="font-bold text-slate-900">{r.customerName}</div>
          <div className="text-[10px] text-slate-500">{r.customerPhone}</div>
        </div>
      )
    },
    {
      header: 'Invoice Reference',
      accessor: (r: any) => (
        <div>
          <span className="font-mono font-bold text-indigo-600">{r.invoiceNumber}</span>
        </div>
      )
    },
    {
      header: 'Payment Method',
      accessor: (r: any) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
          {r.method}
        </span>
      )
    },
    {
      header: 'Amount Paid',
      accessor: (r: any) => (
        <div className="text-right font-black text-emerald-700 font-mono">
          QAR {Number(r.amount || 0).toFixed(2)}
        </div>
      ),
      headerClassName: 'text-right'
    },
    {
      header: 'Action',
      accessor: (r: any) => (
        <div className="flex items-center justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedReceiptForModal(r.id); setIsReceiptModalOpen(true); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Receipt</span>
          </button>
        </div>
      ),
      headerClassName: 'text-right'
    }
  ];

  return (
    <ModuleContainer
      title="Billing"
      subtitle="Create customer invoices, record payments, and track receivables"
      icon={Receipt}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => { exportInvoicesToCSV(filteredInvoices); addToast('Exporting invoices to CSV...', 'info'); }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          {activeTab === 'invoices' && (
            <button
              onClick={handleOpenNewInvoice}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </button>
          )}
          {activeTab === 'receipts' && (
            <button
              onClick={() => handleOpenNewReceipt()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      }
      stats={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Paid</span>
            <span className="text-xs font-bold text-emerald-600 font-mono">QAR {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Outstanding</span>
            <span className="text-xs font-bold text-rose-600 font-mono">QAR {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      }
      tabs={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'invoices' ? 'bg-white shadow-xs text-sky-600 font-extrabold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'receipts' ? 'bg-white shadow-xs text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Payments ({receiptsList.length})
          </button>
        </div>
      }
    >
      {activeTab === 'invoices' ? (
        <DataTable
          data={filteredInvoices}
          columns={columns}
          onRowClick={handleOpenInvoiceRecord}
          searchPlaceholder="Search Invoice #, Customer, Plate, JC Ref..."
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
              {(['ALL', 'Paid', 'Partial', 'Unpaid'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === st ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {st}
                </button>
              ))}
            </div>
          }
        />
      ) : (
        <DataTable
          data={receiptsList}
          columns={receiptColumns}
          onRowClick={(r) => { setSelectedReceiptForModal(r.id); setIsReceiptModalOpen(true); }}
          searchPlaceholder="Search Receipt #, Customer, Invoice Ref..."
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      )}

      {/* SHARED RECORD MODAL: INVOICE */}
      <InvoiceRecordModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoiceForModal(null);
          onClearSelectedInvoice?.();
        }}
        invoiceId={selectedInvoiceForModal}
        onOpenJobCard={onViewJobCard}
        onOpenCustomer={onOpenCustomer}
      />

      {/* SHARED RECORD MODAL: RECEIPT */}
      <ReceiptRecordModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceiptForModal(null);
          setTargetInvoiceForReceipt(null);
        }}
        receiptId={selectedReceiptForModal}
        initialInvoiceId={targetInvoiceForReceipt}
        onOpenInvoice={(invId) => {
          setIsReceiptModalOpen(false);
          setSelectedInvoiceForModal(invId);
          setIsInvoiceModalOpen(true);
        }}
        onOpenCustomer={onOpenCustomer}
      />
    </ModuleContainer>
  );
};
