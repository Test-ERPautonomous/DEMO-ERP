import React, { useState } from 'react';
import { X, ShoppingCart, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

interface CounterSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: any[];
  onSuccess: () => void;
}

export const CounterSaleModal: React.FC<CounterSaleModalProps> = ({ isOpen, onClose, inventory, onSuccess }) => {
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [items, setItems] = useState<any[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!selectedPartId) return;
    const part = inventory.find(p => p.id === selectedPartId || p.sku === selectedPartId);
    if (!part) return;

    const existingIndex = items.findIndex(it => it.partId === part.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += selectedQty;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setItems(updated);
    } else {
      setItems([...items, {
        partId: part.id,
        sku: part.sku,
        name: part.name,
        unitPrice: part.sellingPrice || part.retailPrice || part.unitCost,
        quantity: selectedQty,
        total: (part.sellingPrice || part.retailPrice || part.unitCost) * selectedQty
      }]);
    }
    setSelectedPartId('');
    setSelectedQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const subtotal = items.reduce((sum, it) => sum + it.total, 0);
  const vatAmount = subtotal * 0; // 0% tax for Qatar standard workshop or configurable
  const totalAmount = subtotal + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one spare part to the sale.');
      return;
    }

    setLoading(true);
    try {
      await api.createCounterSale({
        customerName,
        customerPhone,
        paymentMethod,
        items,
        subtotal,
        vatAmount,
        totalAmount,
        paidAmount: totalAmount,
        balanceAmount: 0
      });
      setSuccessMsg('Counter sale completed successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Counter sale failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
            <ShoppingCart className="w-5 h-5" />
            <span>Fast Counter Sale (Spare Parts POS)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-md text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3 animate-bounce" />
            <h3 className="text-xl font-bold text-white">{successMsg}</h3>
            <p className="text-slate-400 text-sm mt-1">Stock updated and payment receipt generated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+974 ..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                >
                  <option value="Cash">Cash (كاش)</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer (تحويل)</option>
                </select>
              </div>
            </div>

            {/* Add Part Section */}
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Select Spare Part</div>
              <div className="flex gap-2">
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                >
                  <option value="">-- Choose item from inventory --</option>
                  {inventory.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.quantityOnHand <= 0}>
                      {p.name} ({p.sku}) - QAR {p.sellingPrice || p.retailPrice || p.unitCost} (Stock: {p.quantityOnHand})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center"
                />

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Selected Items Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
                  <tr>
                    <th className="p-3">Part Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Price (QAR)</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No parts added to the sale yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-3 font-medium text-white">
                          {it.name} <span className="text-xs text-slate-400 font-mono">({it.sku})</span>
                        </td>
                        <td className="p-3 text-center">{it.quantity}</td>
                        <td className="p-3 text-right">{it.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-white">{it.total.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 hover:text-red-400 text-slate-500 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <span className="text-slate-400 font-medium">Grand Total Payable:</span>
              <span className="text-2xl font-black text-emerald-400">QAR {totalAmount.toFixed(2)}</span>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
              >
                {loading ? 'Processing Sale...' : `Complete Sale (QAR ${totalAmount.toFixed(2)})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
