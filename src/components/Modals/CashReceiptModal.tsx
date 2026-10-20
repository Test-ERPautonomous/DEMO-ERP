import React, { useState, useEffect } from 'react';
import { Invoice, PaymentRecord, GarageSettings } from '../../types';
import { Receipt, X, Printer, Check, DollarSign, ExternalLink } from 'lucide-react';
import { printElement, openPrintInNewTab } from '../../utils/printUtils';
import { api } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  settings: GarageSettings;
  onRecordPayment: (invoiceId: string, payment: Omit<PaymentRecord, 'id' | 'date'>) => void;
}

export const CashReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invoices,
  settings,
  onRecordPayment,
}) => {
  const unpaidInvoices = invoices.filter(i => i.paymentStatus !== 'Paid');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(unpaidInvoices[0]?.id || invoices[0]?.id || '');
  const [amount, setAmount] = useState<number>(() => {
    const inv = unpaidInvoices[0] || invoices[0];
    return inv ? (inv.balanceAmount ?? inv.grandTotal ?? 0) : 0;
  });
  const [receiptNumber, setReceiptNumber] = useState('Loading...');
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['method']>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('Payment collected at workshop cashier counter');
  const [printedReceipt, setPrintedReceipt] = useState<{
    receiptNo: string;
    invoiceNo: string;
    customer: string;
    plate: string;
    amount: number;
    method: string;
    ref: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getNextDocumentNumber('RECEIPT')
        .then(res => {
          if (res?.code) setReceiptNumber(res.code);
        })
        .catch(() => {
          setReceiptNumber(`RC-0001`);
        });

      if (invoices.length > 0 && (!selectedInvoiceId || !invoices.some(i => i.id === selectedInvoiceId))) {
        setSelectedInvoiceId(invoices[0].id);
        const inv = invoices[0];
        const bal = inv.balanceDue ?? inv.balanceAmount ?? inv.grandTotal ?? 0;
        setAmount(bal > 0 ? bal : (inv.grandTotal || 0));
      }
    }
  }, [isOpen, invoices, selectedInvoiceId]);

  if (!isOpen) return null;

  const invoice = invoices.find(i => i.id === selectedInvoiceId);

  const handleInvoiceChange = (id: string) => {
    setSelectedInvoiceId(id);
    const inv = invoices.find(i => i.id === id);
    if (inv) setAmount(inv.balanceAmount > 0 ? inv.balanceAmount : (inv.grandTotal || 0));
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || amount <= 0) return;

    onRecordPayment(invoice.id, {
      amount,
      method: paymentMethod,
      reference: reference || receiptNumber,
      notes,
    });

    setPrintedReceipt({
      receiptNo: receiptNumber,
      invoiceNo: invoice.invoiceNumber,
      customer: invoice.customerName,
      plate: invoice.vehiclePlate || 'N/A',
      amount,
      method: paymentMethod,
      ref: reference || 'N/A',
      date: new Date().toLocaleString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-lg text-slate-800 text-xs font-sans overflow-hidden">
        <div className="bg-[#1e4e79] text-white px-4 py-2 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">Cash Receipts &amp; Payment Voucher (Official Receipt)</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {printedReceipt ? (
          <div className="p-5 space-y-4">
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Receipt Voucher Generated!</p>
                <p className="text-[11px]">Payment of {printedReceipt.amount} {settings.currencySymbol} credited to invoice {printedReceipt.invoiceNo}.</p>
              </div>
            </div>

            {/* Official Receipt Voucher Slip */}
            <div id="printable-cash-receipt-slip" className="border border-slate-300 rounded p-4 bg-slate-50 font-mono text-[11px] space-y-3">
              <div className="text-center border-b border-slate-300 pb-2">
                <p className="font-bold text-slate-900 text-sm">{settings.garageName}</p>
                <p className="text-[10px] text-slate-500 font-sans">OFFICIAL CASH RECEIPT VOUCHER • {printedReceipt.receiptNo}</p>
                <p className="text-[9px] text-slate-400">CR No: {settings.crNumber || '104928/2'} • Qatar GTA Tax: 0% Exempt</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500 font-sans">Received From:</span> <strong>{printedReceipt.customer}</strong></div>
                <div><span className="text-slate-500 font-sans">Vehicle Plate:</span> <strong>{printedReceipt.plate}</strong></div>
                <div><span className="text-slate-500 font-sans">For Invoice #:</span> <strong>{printedReceipt.invoiceNo}</strong></div>
                <div><span className="text-slate-500 font-sans">Payment Method:</span> <strong>{printedReceipt.method}</strong></div>
                <div><span className="text-slate-500 font-sans">Transaction Ref:</span> <strong>{printedReceipt.ref}</strong></div>
                <div><span className="text-slate-500 font-sans">Date:</span> <strong>{printedReceipt.date}</strong></div>
              </div>

              <div className="bg-white border border-slate-300 p-2 text-center rounded">
                <span className="text-slate-500 font-sans text-xs">Amount Received: </span>
                <span className="font-bold text-base text-blue-900 font-mono">{printedReceipt.amount.toFixed(2)} {settings.currencySymbol}</span>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200 text-[10px] font-sans text-slate-500">
                <div className="text-center">
                  <div className="border-b border-slate-400 w-24 mb-1 mx-auto"></div>
                  <span>Cashier / Collector</span>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-400 w-24 mb-1 mx-auto"></div>
                  <span>Customer Signature</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => printElement('printable-cash-receipt-slip', { title: `Receipt-${printedReceipt.receiptNo}` })}
                className="px-3 py-1.5 bg-[#1e4e79] hover:bg-blue-800 text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print Official Receipt
              </button>
              <button
                type="button"
                onClick={() => openPrintInNewTab('printable-cash-receipt-slip', `Receipt-${printedReceipt.receiptNo}`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs flex items-center gap-1 cursor-pointer border border-slate-300"
                title="Open in new tab to print without browser popup blocks"
              >
                <ExternalLink className="w-3.5 h-3.5" /> New Tab
              </button>
              <button
                onClick={() => setPrintedReceipt(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs cursor-pointer"
              >
                New Receipt
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveReceipt} className="p-5 space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Invoice / Customer Account</label>
              <select
                value={selectedInvoiceId ?? ''}
                onChange={e => handleInvoiceChange(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                required
              >
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.customerName} ({inv.vehiclePlate}) — Balance: {inv.balanceDue} {settings.currencySymbol} [{inv.paymentStatus}]
                  </option>
                ))}
              </select>
            </div>

            {invoice && (
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded font-mono text-[11px] grid grid-cols-3 gap-2">
                <div>Total: <strong>{invoice.totalAmount} {settings.currencySymbol}</strong></div>
                <div>Paid: <strong className="text-emerald-700">{invoice.paidAmount} {settings.currencySymbol}</strong></div>
                <div>Due: <strong className="text-red-700">{invoice.balanceDue} {settings.currencySymbol}</strong></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Receive ({settings.currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount ?? ''}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod ?? ''}
                  onChange={e => setPaymentMethod(e.target.value as PaymentRecord['method'])}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                >
                  <option value="Cash">Cash (Counter Till)</option>
                  <option value="Credit Card">Credit Card (POS Terminal)</option>
                  <option value="Bank Transfer">Bank Transfer (QNB/QIB)</option>
                  <option value="Cheque">Cheque / PDC</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / Cheque No / Card Auth #</label>
              <input
                type="text"
                placeholder="e.g. POS-AUTH-948192 or CHQ-002910"
                value={reference ?? ''}
                onChange={e => setReference(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes / Cashier Narration</label>
              <input
                type="text"
                value={notes ?? ''}
                onChange={e => setNotes(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
              />
            </div>

            <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs cursor-pointer shadow-xs"
              >
                Issue Cash Receipt Voucher
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
