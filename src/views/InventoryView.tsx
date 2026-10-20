import React, { useState } from 'react';
import { Package, Plus, Search, AlertTriangle, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

interface InventoryViewProps {
  inventory: any[];
  onRefresh: () => void;
  currency?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onRefresh,
  currency = 'QAR'
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('Stock Receipt');

  // Add Part Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [oemNumber, setOemNumber] = useState('');
  const [category, setCategory] = useState('Engine & Filters');
  const [unitCost, setUnitCost] = useState(50);
  const [retailPrice, setRetailPrice] = useState(90);
  const [minReorderLevel, setMinReorderLevel] = useState(5);
  const [quantityOnHand, setQuantityOnHand] = useState(10);
  const [rackLocation, setRackLocation] = useState('RACK-A-01');

  const filtered = (inventory || []).filter(p => {
    if (!p) return false;
    const q = (search || '').trim().toLowerCase();
    return (
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.oemPartNumber || p.oemNumber || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;
    try {
      await api.createInventoryItem({
        name,
        sku,
        oemPartNumber: oemNumber,
        category,
        unitCost,
        retailPrice,
        minReorderLevel,
        quantityOnHand,
        rackLocation
      });
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add part');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    try {
      await api.adjustStock({
        itemId: selectedPart.id,
        changeQty: adjustQty,
        type: adjustQty > 0 ? 'Stock In' : 'Stock Out',
        reason: adjustReason
      });
      setShowAdjustModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search spare parts by name, SKU, OEM #..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Part</span>
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase">
            <tr>
              <th className="p-3.5">Part & SKU</th>
              <th className="p-3.5">OEM #</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Location</th>
              <th className="p-3.5 text-right">Cost</th>
              <th className="p-3.5 text-right">Selling Price</th>
              <th className="p-3.5 text-center">Stock</th>
              <th className="p-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(part => {
              const isLow = part.quantityOnHand <= (part.minReorderLevel || 5);
              return (
                <tr key={part.id} className="hover:bg-slate-800/50">
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{part.name}</div>
                    <div className="text-xs text-amber-400 font-mono mt-0.5">{part.sku}</div>
                  </td>
                  <td className="p-3.5 text-xs text-slate-400 font-mono">
                    {part.oemPartNumber || part.oemNumber || '—'}
                  </td>
                  <td className="p-3.5 text-xs text-slate-300">{part.category}</td>
                  <td className="p-3.5 text-xs font-mono text-slate-400">{part.rackLocation || part.location || 'SHELF-01'}</td>
                  <td className="p-3.5 text-right text-xs font-mono text-slate-400">
                    {currency} {(part.unitCost || 0).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-xs font-bold text-emerald-400 font-mono">
                    {currency} {(part.sellingPrice || part.retailPrice || part.unitCost || 0).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                        isLow
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {part.quantityOnHand} {part.unitOfMeasure || 'PCS'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => {
                        setSelectedPart(part);
                        setShowAdjustModal(true);
                      }}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span>Add Inventory Spare Part</span>
            </h3>
            <form onSubmit={handleCreatePart} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Part Description *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Brake Pads Front Set (Land Cruiser)"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="e.g. BRK-PAD-LC200"
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">OEM Part #</label>
                  <input
                    type="text"
                    value={oemNumber}
                    onChange={e => setOemNumber(e.target.value)}
                    placeholder="e.g. 04465-60280"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cost Price</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selling Price</label>
                  <input
                    type="number"
                    value={retailPrice}
                    onChange={e => setRetailPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={quantityOnHand}
                    onChange={e => setQuantityOnHand(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg"
                >
                  Save Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedPart && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-emerald-400" />
              <span>Adjust Stock for {selectedPart.name}</span>
            </h3>
            <p className="text-xs text-slate-400">Current Stock: {selectedPart.quantityOnHand} units</p>
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Quantity Adjustment (+/-)</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={e => setAdjustQty(parseInt(e.target.value) || 0)}
                  placeholder="e.g. +5 or -2"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Physical audit count, damaged part..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg"
                >
                  Apply Stock Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
