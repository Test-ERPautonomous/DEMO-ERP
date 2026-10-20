import React, { useState, useEffect } from 'react';
import { GarageSettings, PurchaseOrder, PurchaseOrderItem, InventoryItem } from '../../types';
import { X, Plus, Trash2, ShoppingCart, Truck, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GarageSettings;
  inventory: InventoryItem[];
  onCreatePurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'> & { poNumber?: string }) => void;
}

export const PurchaseOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  inventory,
  onCreatePurchaseOrder,
}) => {
  if (!isOpen) return null;

  const [poNumberPreview, setPoNumberPreview] = useState('Loading...');
  const [supplierName, setSupplierName] = useState('Metro Auto Supplies Co.');
  const [supplierContact, setSupplierContact] = useState('+974 4455 6677');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('Urgent stock replenishment for workshop floor.');

  useEffect(() => {
    api.getNextDocumentNumber('PURCHASE_ORDER')
      .then(res => {
        if (res?.code) setPoNumberPreview(res.code);
      })
      .catch(() => {
        setPoNumberPreview(`PO-0001`);
      });
  }, []);

  const [items, setItems] = useState<Array<{
    partId: string;
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
  }>>([
    { partId: 'inv-1', sku: 'BRK-PAD-F', name: 'Front Ceramic Brake Pads', quantity: 10, unitCost: 45 },
    { partId: 'inv-2', sku: 'OIL-FLT-01', name: 'Engine Oil Filter Cartridge', quantity: 20, unitCost: 8 }
  ]);

  const [selectedSku, setSelectedSku] = useState(inventory[0]?.sku || '');
  const [qty, setQty] = useState(5);
  const [cost, setCost] = useState(50);

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  const handleAddItem = () => {
    const invItem = inventory.find(i => i.sku === selectedSku);
    setItems(prev => [
      ...prev,
      {
        partId: invItem?.id || `part-${Date.now()}`,
        sku: selectedSku || 'PARTS-GEN',
        name: invItem?.name || 'Generic Spare Part',
        quantity: Number(qty),
        unitCost: Number(cost)
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || items.length === 0) {
      alert('Please enter supplier name and add at least one item.');
      return;
    }

    onCreatePurchaseOrder({
      ...(poNumberPreview && !poNumberPreview.includes('...') ? { poNumber: poNumberPreview } : {}),
      supplierName: supplierName.trim(),
      supplierContact: supplierContact.trim(),
      date: new Date().toISOString().split('T')[0],
      expectedDate,
      status: 'Sent',
      items: items.map(i => ({
        partId: i.partId,
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        quantityOrdered: i.quantity,
        receivedQuantity: 0,
        unitCost: i.unitCost,
        totalCost: i.quantity * i.unitCost
      })),
      totalAmount,
      paymentStatus: 'Unpaid',
      notes: notes.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-2xl w-full text-slate-900 font-sans overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Create New Purchase Order (PO)</h3>
              <p className="text-xs text-slate-300">Procure inventory items from verified suppliers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Document Number Banner */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">Sequential PO Document Number:</span>
              <span className="font-mono font-bold text-indigo-700 text-sm">{poNumberPreview}</span>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded uppercase">
              Backend Sequence
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier Name</label>
              <input
                type="text"
                value={supplierName ?? ''}
                onChange={e => setSupplierName(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl font-sans text-xs focus:outline-none focus:border-indigo-600"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier Contact / Phone</label>
              <input
                type="text"
                value={supplierContact ?? ''}
                onChange={e => setSupplierContact(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl font-sans text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDate ?? ''}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl font-sans text-xs focus:outline-none focus:border-indigo-600"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Notes / Terms</label>
              <input
                type="text"
                value={notes ?? ''}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl font-sans text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Add item section */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800">Add Order Items</h4>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Inventory SKU</label>
                <select
                  value={selectedSku ?? ''}
                  onChange={e => {
                    setSelectedSku(e.target.value);
                    const found = inventory.find(i => i.sku === e.target.value);
                    if (found) setCost(found.unitCost || (found as any).purchasePrice || 50);
                  }}
                  className="w-full h-9 px-2 border border-slate-200 rounded-xl bg-white text-xs"
                >
                  {inventory.map(inv => (
                    <option key={inv.id} value={inv.sku}>{inv.sku} - {inv.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={qty ?? ''}
                  onChange={e => setQty(Number(e.target.value))}
                  className="w-full h-9 px-2 border border-slate-200 rounded-xl font-mono text-xs bg-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Unit Cost (QAR)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={cost ?? ''}
                  onChange={e => setCost(Number(e.target.value))}
                  className="w-full h-9 px-2 border border-slate-200 rounded-xl font-mono text-xs bg-white"
                />
              </div>
              <div className="col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">SKU &amp; Part Name</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-sans">
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.sku}</span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="p-3 text-right text-slate-700">QAR {item.unitCost.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-indigo-700">QAR {(item.quantity * item.unitCost).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-700">Total Purchase Order Value:</span>
            <span className="text-lg font-black font-mono text-indigo-700">QAR {totalAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100 transition-all"
            >
              Save &amp; Submit PO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
