import React from 'react';
import { FinancialTransaction, GarageSettings } from '../../types';
import { X, Printer, Download, CheckCircle, Receipt, Building2, User } from 'lucide-react';
import { printElement, downloadHtmlDocument } from '../../utils/printUtils';
import { formatDate } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: FinancialTransaction | null;
  settings: GarageSettings;
}

export const PaymentReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  transaction,
  settings,
}) => {
  if (!isOpen || !transaction) return null;

  const currency = settings.currencySymbol || 'QAR';
  const elementId = `payment-receipt-print-${transaction.id}`;

  const handlePrint = () => {
    printElement(elementId, { title: `Receipt_${transaction.transactionNumber}` });
  };

  const handleDownload = () => {
    const el = document.getElementById(elementId);
    if (el) {
      downloadHtmlDocument(el.innerHTML, `Receipt_${transaction.transactionNumber}.html`, {
        title: `Official Receipt - ${transaction.transactionNumber}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white">
                Official Payment Receipt
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {transaction.transactionNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              HTML
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800 ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            id={elementId}
            className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm w-full max-w-xl text-slate-800 font-sans"
          >
            {/* Top Garage Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-5 flex justify-between items-start">
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                  {settings.garageName || 'NAJM AL HUDA GARAGE'}
                </h1>
                {settings.garageNameAr && (
                  <p className="text-xs text-slate-600 font-medium" dir="rtl">
                    {settings.garageNameAr}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {settings.address}, {settings.cityStateZip}
                </p>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 space-x-3">
                  <span>CR: {settings.crNumber || 'CR-2026/001'}</span>
                  <span>Tel: {settings.phone}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1 rounded text-xs font-black tracking-wider uppercase">
                  Payment Receipt
                </div>
                <p className="text-xs font-mono font-bold text-slate-900 mt-2">
                  No: {transaction.transactionNumber}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  Date: {formatDate(transaction.date)}
                </p>
              </div>
            </div>

            {/* Receipt Summary Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Received From:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {transaction.partyName}
                </span>
              </div>
              {transaction.partyPhone && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Phone:</span>
                  <span className="font-mono text-slate-700">{transaction.partyPhone}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Payment Category:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {transaction.category.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Payment Method:</span>
                <span className="font-semibold text-slate-800">
                  {transaction.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Deposited Into Account:</span>
                <span className="font-medium text-slate-800">
                  {transaction.accountName}
                </span>
              </div>
              {transaction.referenceNumber && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Reference / Cheque #:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {transaction.referenceNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Total Amount Box */}
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl p-4 mb-5 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
                  Amount Received
                </span>
                <p className="text-[11px] text-slate-500 italic mt-0.5">
                  Full & final receipt for payment verified
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {currency} {(transaction.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Allocation details if any */}
            {transaction.allocations && transaction.allocations.length > 0 && (
              <div className="mb-5 border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Applied To Invoices / Work Orders
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-1.5">Document #</th>
                      <th className="px-3 py-1.5">Type</th>
                      <th className="px-3 py-1.5 text-right">Amount Allocated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaction.allocations.map((a, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 font-mono font-semibold text-slate-800">
                          {a.targetNumber}
                        </td>
                        <td className="px-3 py-1.5 capitalize text-slate-600">
                          {a.targetType.replace('_', ' ')}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                          {currency} {a.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {transaction.unappliedAmount > 0 && (
              <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs flex justify-between items-center text-amber-900">
                <span className="font-medium">Unapplied Customer Credit / Advance Balance:</span>
                <span className="font-mono font-bold">
                  {currency} {transaction.unappliedAmount.toFixed(2)}
                </span>
              </div>
            )}

            {transaction.notes && (
              <div className="mb-6 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-700">Remarks: </span>
                {transaction.notes}
              </div>
            )}

            {/* Signatures */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 h-12 mb-1.5"></div>
                <p className="font-semibold text-slate-800">Customer Signature</p>
                <p className="text-[10px] text-slate-400">Received By / Acknowledged</p>
              </div>
              <div>
                <div className="border-b border-slate-400 h-12 mb-1.5 flex items-end justify-center pb-1 text-slate-400 italic text-[11px]">
                  {transaction.postedBy || transaction.createdBy || 'Authorized Cashier'}
                </div>
                <p className="font-semibold text-slate-800">Authorized Cashier / Accounts</p>
                <p className="text-[10px] text-slate-400">Uniqon ERP Financial System</p>
              </div>
            </div>

            <div className="mt-6 text-center text-[10px] text-slate-400">
              This is a computer-generated voucher issued by {settings.garageName}. No signature alteration allowed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
