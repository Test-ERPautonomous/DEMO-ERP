import React, { useState } from 'react';
import { GarageSettings } from '../../types';
import { X, DollarSign, Printer, CheckCircle, Search, User, Building2, Calendar, FileText } from 'lucide-react';

export type AdvanceMode = 'customer_advance' | 'advance_return' | 'supplier_advance' | 'supplier_payment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: AdvanceMode;
  settings: GarageSettings;
}

interface AdvanceRecord {
  id: string;
  voucherNo: string;
  entityName: string;
  phone?: string;
  date: string;
  amount: number;
  paymentMode: 'Cash' | 'Credit Card' | 'Cheque' | 'Bank Transfer';
  referenceNo: string;
  reason: string;
  jobCardPlate?: string;
}

export const AdvancesModal: React.FC<Props> = ({ isOpen, onClose, mode, settings }) => {
  const modeTitles: Record<AdvanceMode, { title: string; subtitle: string; entityLabel: string; isPayable: boolean }> = {
    customer_advance: {
      title: 'Customer Advance Receipt Voucher',
      subtitle: 'Accounts Receivable - Advance deposit before job execution',
      entityLabel: 'Customer Name',
      isPayable: false,
    },
    advance_return: {
      title: 'Customer Advance Return / Refund Voucher',
      subtitle: 'Accounts Receivable - Unutilized advance refund to customer',
      entityLabel: 'Customer Name',
      isPayable: false,
    },
    supplier_advance: {
      title: 'Supplier Advance Payment Voucher',
      subtitle: 'Accounts Payable - Advance payment for parts / import orders',
      entityLabel: 'Supplier / Vendor Name',
      isPayable: true,
    },
    supplier_payment: {
      title: 'Supplier Accounts Payable Payment Voucher',
      subtitle: 'Accounts Payable - Payment against approved vendor invoices',
      entityLabel: 'Supplier / Vendor Name',
      isPayable: true,
    },
  };

  const currentConfig = modeTitles[mode] || modeTitles.customer_advance;

  const [records, setRecords] = useState<AdvanceRecord[]>([]);

  const [voucherNo, setVoucherNo] = useState(`${mode.startsWith('customer') ? 'AR' : 'AP'}-${Date.now().toString().slice(-4)}`);
  const [entityName, setEntityName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [paymentMode, setPaymentMode] = useState<AdvanceRecord['paymentMode']>('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [reason, setReason] = useState('');
  const [jobCardPlate, setJobCardPlate] = useState('');
  const [printedRecord, setPrintedRecord] = useState<AdvanceRecord | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName.trim() || amount <= 0) return;

    const newRec: AdvanceRecord = {
      id: `adv-${Date.now()}`,
      voucherNo,
      entityName,
      phone,
      date: new Date().toISOString().split('T')[0],
      amount,
      paymentMode,
      referenceNo,
      reason: reason || `${currentConfig.title} entry`,
      jobCardPlate,
    };

    setRecords([newRec, ...records]);
    setPrintedRecord(newRec);

    // Reset form
    setEntityName('');
    setPhone('');
    setAmount(1000);
    setReferenceNo('');
    setReason('');
    setJobCardPlate('');
    const nextNum = String(records.length + 1).padStart(4, '0');
    setVoucherNo(`${mode.startsWith('customer') ? 'AR' : 'AP'}-${new Date().getFullYear()}-${nextNum}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs antialiased">
      <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Title Bar */}
        <div className="bg-[#1e4e79] text-white px-3 py-1.5 flex items-center justify-between font-bold select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>[{currentConfig.title}] - {settings.garageName}</span>
          </div>
          <button onClick={onClose} className="text-white hover:text-red-200 cursor-pointer p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable View if printed */}
        {printedRecord ? (
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="border border-slate-300 p-6 bg-slate-50/50 rounded space-y-4 text-xs font-sans">
              <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{settings.garageName}</h3>
                  <p className="text-slate-600 text-[11px]">{settings.address}, {settings.cityStateZip}</p>
                  <p className="text-slate-600 text-[11px]">CR No: {settings.crNumber} | Tel: {settings.phone}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="bg-[#1e4e79] text-white px-2 py-0.5 rounded text-xs font-bold block mb-1">
                    OFFICIAL VOUCHER
                  </span>
                  <span className="text-slate-700 text-xs block">Voucher #: <strong>{printedRecord.voucherNo}</strong></span>
                  <span className="text-slate-500 text-[11px]">Date: {printedRecord.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">{currentConfig.entityLabel.toUpperCase()}</span>
                  <span className="font-bold text-slate-900 text-sm">{printedRecord.entityName}</span>
                  {printedRecord.phone && <span className="text-slate-600 text-[11px] block">Tel: {printedRecord.phone}</span>}
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">PAYMENT DETAILS</span>
                  <span className="font-medium text-slate-800">Mode: {printedRecord.paymentMode}</span>
                  {printedRecord.referenceNo && <span className="text-slate-600 text-[11px] block">Ref: {printedRecord.referenceNo}</span>}
                  {printedRecord.jobCardPlate && <span className="text-slate-600 text-[11px] block">Plate #: {printedRecord.jobCardPlate}</span>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-3 rounded flex justify-between items-center">
                <div>
                  <span className="text-slate-500 text-[10px] block">PURPOSE / PARTICULARS</span>
                  <span className="text-slate-800 font-medium">{printedRecord.reason}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px] block">NET VOUCHER AMOUNT</span>
                  <span className="font-bold text-lg text-emerald-800 font-mono">
                    {printedRecord.amount.toLocaleString()} {settings.currencySymbol}
                  </span>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 text-center text-[11px] text-slate-600 border-t border-slate-200">
                <div>
                  <div className="h-10" />
                  <span className="border-t border-slate-400 pt-1 px-8 inline-block">Authorized Signatory</span>
                </div>
                <div>
                  <div className="h-10" />
                  <span className="border-t border-slate-400 pt-1 px-8 inline-block">Received By (Signature)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() => setPrintedRecord(null)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xs font-semibold cursor-pointer shadow-xs"
              >
                Done / New Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-slate-600 text-xs bg-slate-50 border border-slate-200 p-2 rounded">
              {currentConfig.subtitle}
            </p>

            {/* Entry Form */}
            <form onSubmit={handleSubmit} className="border border-slate-300 rounded p-3 bg-white space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 block mb-0.5 font-medium">Voucher Number</label>
                  <input
                    type="text"
                    value={voucherNo ?? ''}
                    onChange={e => setVoucherNo(e.target.value)}
                    className="w-full h-7 px-2 border border-slate-300 rounded-xs font-mono font-bold text-blue-900 bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 block mb-0.5 font-medium">{currentConfig.entityLabel} *</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={entityName ?? ''}
                    onChange={e => setEntityName(e.target.value)}
                    className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white text-slate-900 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 block mb-0.5 font-medium">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+974 55..."
                    value={phone ?? ''}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 block mb-0.5 font-medium">Amount ({settings.currencySymbol}) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount || ''}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white font-mono font-bold text-base text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 block mb-0.5 font-medium">Payment Mode</label>
                  <select
                    value={paymentMode ?? ''}
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit / Debit Card</option>
                    <option value="Cheque">Cheque (PDC/Current)</option>
                    <option value="Bank Transfer">Bank Transfer (QNB/CBQ)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 block mb-0.5 font-medium">Transaction Ref / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. QNB-49102"
                    value={referenceNo ?? ''}
                    onChange={e => setReferenceNo(e.target.value)}
                    className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 block mb-0.5 font-medium">Associated Vehicle Plate # (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9XYZ123"
                    value={jobCardPlate ?? ''}
                    onChange={e => setJobCardPlate(e.target.value.toUpperCase())}
                    className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 block mb-0.5 font-medium">Purpose / Remarks</label>
                  <input
                    type="text"
                    placeholder="Detailed reason for advance or disbursement"
                    value={reason ?? ''}
                    onChange={e => setReason(e.target.value)}
                    className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#1e4e79] hover:bg-[#153a5c] text-white rounded-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Post &amp; Print Voucher</span>
                </button>
              </div>
            </form>

            {/* Historical Register */}
            <div>
              <span className="font-bold text-slate-800 text-xs block mb-1">Recent Vouchers Register</span>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 text-[11px] font-semibold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300">Voucher #</th>
                    <th className="p-2 border-r border-slate-300">Party</th>
                    <th className="p-2 border-r border-slate-300">Date</th>
                    <th className="p-2 border-r border-slate-300">Mode</th>
                    <th className="p-2 border-r border-slate-300 text-right">Amount ({settings.currencySymbol})</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(rec => (
                    <tr key={rec.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-blue-800">{rec.voucherNo}</td>
                      <td className="p-2 border-r border-slate-200 font-medium">{rec.entityName}</td>
                      <td className="p-2 border-r border-slate-200 font-mono text-slate-600">{rec.date}</td>
                      <td className="p-2 border-r border-slate-200">{rec.paymentMode}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-right text-emerald-800">
                        {rec.amount.toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => setPrintedRecord(rec)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xs text-[10px] font-semibold cursor-pointer"
                        >
                          Reprint
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-100 px-4 py-2 border-t border-slate-300 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
