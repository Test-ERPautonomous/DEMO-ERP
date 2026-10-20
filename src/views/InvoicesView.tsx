import React, { useState } from 'react';
import { Receipt, Plus, Search, DollarSign, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../api';

interface InvoicesViewProps {
  invoices: any[];
  onRefresh: () => void;
  currency?: string;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  onRefresh,
  currency = 'QAR'
}) => {
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const filtered = (invoices || []).filter(inv => {
    if (!inv) return false;
    const q = (search || '').trim().toLowerCase();
    return (
      !q ||
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.customerName || (inv.customer && inv.customer.name) || '').toLowerCase().includes(q) ||
      (inv.vehiclePlate || (inv.vehicle && inv.vehicle.plateNumber) || '').toLowerCase().includes(q)
    );
  });

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || paymentAmount <= 0) return;
    try {
      await api.recordPayment(selectedInvoice.id, {
        amount: paymentAmount,
        method: paymentMethod,
        date: new Date().toISOString().split('T')[0]
      });
      setShowPaymentModal(false);
      onRefresh();
      alert('Payment recorded successfully.');
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices by invoice #, customer, plate..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase">
            <tr>
              <th className="p-3.5">Invoice #</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Grand Total</th>
              <th className="p-3.5 text-right">Paid</th>
              <th className="p-3.5 text-right">Balance</th>
              <th className="p-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(inv => {
              const custName = inv.customerName || (inv.customer && inv.customer.name) || 'Walk-in';
              const isPaid = inv.status === 'Paid' || inv.balanceAmount <= 0;
              return (
                <tr key={inv.id} className="hover:bg-slate-800/50">
                  <td className="p-3.5 font-mono font-bold text-blue-400 flex items-center gap-1.5">
                    {inv.isLocked && (
                      <span title="Immutability Locked">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                    )}
                    <span>{inv.invoiceNumber}</span>
                  </td>
                  <td className="p-3.5 font-medium text-white">{custName}</td>
                  <td className="p-3.5 text-xs text-slate-400">{inv.date}</td>
                  <td className="p-3.5">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                        isPaid
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-white">
                    {currency} {(Number(inv.grandTotal) || 0).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-400">
                    {currency} {(Number(inv.paidAmount) || 0).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-rose-400">
                    {currency} {(Number(inv.balanceAmount) || 0).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-center">
                    {!isPaid && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setPaymentAmount(inv.balanceAmount || 0);
                          setShowPaymentModal(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                      >
                        Receive
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Receive Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Record Payment for {selectedInvoice.invoiceNumber}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Outstanding Balance: <span className="text-rose-400 font-bold">{currency} {selectedInvoice.balanceAmount}</span>
            </p>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount Paid ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.balanceAmount}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                >
                  <option value="Cash">Cash (كاش)</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer (تحويل)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
