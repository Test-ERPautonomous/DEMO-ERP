import React, { useState, useEffect } from 'react';
import { Invoice, PaymentRecord, GarageSettings, JobCard } from '../../types';
import { BillingManager } from './BillingManager';
import { FinancialModule } from '../Financial/FinancialModule';
import { Receipt, Landmark, Plus } from 'lucide-react';

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
  initialTab?: 'billing' | 'financial';
}

export const BillingView: React.FC<Props> = ({
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
  initialTab = 'billing',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'billing' | 'financial'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  const unpaidInvoicesCount = invoices.filter(
    i => i.paymentStatus === 'Unpaid' || i.paymentStatus === 'Partial'
  ).length;

  return (
    <div className="space-y-4">
      {/* Sub-navigation bar inside Billing */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveSubTab('billing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'billing'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoices & Payments</span>
            {unpaidInvoicesCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                activeSubTab === 'billing' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {unpaidInvoicesCount} Due
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('financial')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'financial'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Accounting & Ledger</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {activeSubTab === 'billing' ? (
        <BillingManager
          invoices={invoices}
          jobCards={jobCards}
          settings={settings}
          onRecordPayment={onRecordPayment}
          selectedInvoiceId={selectedInvoiceId}
          onClearSelectedInvoice={onClearSelectedInvoice}
          onCreateInvoice={onCreateInvoice}
          onUpdateInvoice={onUpdateInvoice}
          onDeleteInvoice={onDeleteInvoice}
          onViewJobCard={onViewJobCard}
          onOpenCustomer={onOpenCustomer}
          initialStatusFilter={initialStatusFilter}
        />
      ) : (
        <FinancialModule />
      )}
    </div>
  );
};
