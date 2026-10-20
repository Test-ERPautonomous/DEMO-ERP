import React, { useState } from 'react';
import { JobCardPartItem, InventoryItem } from '../../types';
import { Package, Plus, Trash2, AlertTriangle, Search, ShoppingBag } from 'lucide-react';
import { QuickAddPartModal } from '../Modals/QuickAddPartModal';
import { RequisitionPOModal } from '../Modals/RequisitionPOModal';
import { useGarage } from '../../context/GarageContext';

interface Props {
  parts: JobCardPartItem[];
  inventory: InventoryItem[];
  onChange: (parts: JobCardPartItem[]) => void;
  readOnly?: boolean;
}

export const JobCardPartsSelector: React.FC<Props> = ({
  parts,
  inventory,
  onChange,
  readOnly = false,
}) => {
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customName, setCustomName] = useState('');
  const [customSku, setCustomSku] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const { settings, issueMaterialToJobCard } = useGarage();
  const currencySymbol = settings?.currencySymbol || '$';
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);

  const handleIssueStockParts = () => {
    const stockItems = parts.filter(p => (!p.source || p.source === 'Inventory Stock') && p.status !== 'Issued');
    if (stockItems.length === 0) {
      alert('No pending inventory stock parts found to issue.');
      return;
    }

    stockItems.forEach(part => {
      const invMatch = inventory.find(i => i.id === part.inventoryId || i.sku === part.sku);
      if (invMatch) {
        issueMaterialToJobCard('work-order', invMatch, part.quantity, 'Technician');
      }
    });

    const updated = parts.map(p => {
      if ((!p.source || p.source === 'Inventory Stock') && p.status !== 'Issued') {
        return { ...p, source: 'Inventory Stock' as const, status: 'Issued' as const };
      }
      return p;
    });

    onChange(updated);
    alert(`Successfully issued ${stockItems.length} part(s) from inventory stock!`);
  };

  const filteredInventory = inventory.filter(
    item => {
      const q = (inventorySearch || '').toLowerCase();
      if (!q) return true;
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.brand || '').toLowerCase().includes(q)
      );
    }
  );

  const handleAddInventoryPart = () => {
    if (!selectedInventoryId || readOnly) return;
    const invItem = inventory.find(i => i.id === selectedInventoryId);
    if (!invItem) return;

    const existingPartIndex = parts.findIndex(p => p.inventoryId === invItem.id);
    if (existingPartIndex >= 0) {
      // Update quantity
      const updated = [...parts];
      updated[existingPartIndex].quantity += quantity;
      updated[existingPartIndex].total = updated[existingPartIndex].quantity * updated[existingPartIndex].unitPrice;
      onChange(updated);
    } else {
      const newPart: JobCardPartItem = {
        id: `part-${Date.now()}`,
        inventoryId: invItem.id,
        sku: invItem.sku,
        name: invItem.name,
        quantity,
        unitPrice: invItem.sellingPrice,
        total: quantity * invItem.sellingPrice,
      };
      onChange([...parts, newPart]);
    }

    setSelectedInventoryId('');
    setQuantity(1);
  };

  const handleAddCustomPart = () => {
    if (!customName.trim() || readOnly) return;
    const newPart: JobCardPartItem = {
      id: `part-${Date.now()}`,
      sku: customSku.trim() || `EXT-${Date.now().toString().slice(-4)}`,
      name: customName.trim(),
      quantity: Math.max(1, quantity),
      unitPrice: Number(customPrice) || 0,
      total: Math.max(1, quantity) * (Number(customPrice) || 0),
    };
    onChange([...parts, newPart]);
    setCustomName('');
    setCustomSku('');
    setCustomPrice(0);
    setQuantity(1);
    setIsCustomMode(false);
  };

  const handleRemovePart = (id: string) => {
    if (readOnly) return;
    onChange(parts.filter(p => p.id !== id));
  };

  const totalPartsCost = parts.reduce((sum, p) => sum + (p.total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            Spare Parts &amp; Paint Materials Consumed
          </h4>
          <p className="text-[11px] text-slate-500">
            Select parts from shop inventory to automatically track stock and billing.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">Total Parts &amp; Materials:</span>
          <span className="text-base font-bold text-slate-900">${totalPartsCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Part selector controls */}
      {!readOnly && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-700">
              {isCustomMode ? 'Add Special / External Order Part' : 'Add From Garage Stock'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowQuickAddModal(true)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="Create a new spare part in inventory directly"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Add Item to Inventory</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(!isCustomMode)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
              >
                {isCustomMode ? 'Switch to Inventory Stock' : '+ Add Non-Inventory / Custom Part'}
              </button>
            </div>
          </div>

          {!isCustomMode ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-8">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Item from Inventory
                </label>
                <div className="relative">
                  <select
                    value={selectedInventoryId ?? ''}
                    onChange={e => setSelectedInventoryId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="">-- Choose Stock Item ({inventory.length} available) --</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        [{item.category}] {item.name} ({item.sku}) - Qty: {item.quantityOnHand} {item.unit} (${item.sellingPrice.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity ?? ''}
                  onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddInventoryPart}
                  disabled={!selectedInventoryId}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to Job
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-slate-700 mb-1">Part Name</label>
                <input
                  type="text"
                  placeholder="e.g. Radiator Fan Motor OEM"
                  value={customName ?? ''}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">Part Number / SKU</label>
                <input
                  type="text"
                  placeholder="e.g. DENSO-168000"
                  value={customSku ?? ''}
                  onChange={e => setCustomSku(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  min="0"
                  value={customPrice ?? ''}
                  onChange={e => setCustomPrice(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-700 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={quantity ?? ''}
                  onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddCustomPart}
                  disabled={!customName.trim()}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Custom
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parts Table & Action Options */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
        {parts.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No spare parts or paint materials assigned to this job card yet.
          </div>
        ) : (
          <div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">SKU / Code</th>
                  <th className="py-2.5 px-3">Part Description</th>
                  <th className="py-2.5 px-3 w-32">Source</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center w-28">Status</th>
                  {!readOnly && <th className="py-2.5 px-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {parts.map((part, index) => {
                  const currentSource = part.source || 'Inventory Stock';
                  const currentStatus = part.status || 'Pending';

                  return (
                    <tr key={part.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 font-medium">{part.sku}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{part.name}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={currentSource ?? ''}
                          onChange={e => {
                            const updated = [...parts];
                            updated[index].source = e.target.value as any;
                            onChange(updated);
                          }}
                          disabled={readOnly || currentStatus === 'Issued'}
                          className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:bg-white focus:border-indigo-500 outline-none"
                        >
                          <option value="Inventory Stock">📦 Stock</option>
                          <option value="Outside Purchase / PO">🛒 Outside PO</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {readOnly || currentStatus === 'Issued' ? (
                          <span>{part.quantity}</span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={part.quantity}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              const updated = [...parts];
                              updated[index] = {
                                ...updated[index],
                                quantity: val,
                                total: val * (updated[index].unitPrice || 0),
                              };
                              onChange(updated);
                            }}
                            className="w-14 text-center font-mono bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            title="Edit quantity"
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {readOnly || currentStatus === 'Issued' ? (
                          <span>{currencySymbol}{part.unitPrice.toFixed(2)}</span>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-[11px] text-slate-400 font-mono">{currencySymbol}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={part.unitPrice}
                              onChange={e => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                const updated = [...parts];
                                updated[index] = {
                                  ...updated[index],
                                  unitPrice: val,
                                  total: (updated[index].quantity || 1) * val,
                                };
                                onChange(updated);
                              }}
                              className="w-20 text-right font-mono bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                              title="Edit unit price"
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-mono">
                        {currencySymbol}{part.total.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px]">
                        {currentStatus === 'Issued' ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">Issued</span>
                        ) : currentStatus === 'PO Created' ? (
                          <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-300">{part.poNumber || 'PO Created'}</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">Pending</span>
                        )}
                      </td>
                      {!readOnly && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(part.id)}
                            disabled={currentStatus === 'Issued'}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1 disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bottom Decision Options Bar */}
            {!readOnly && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block">Parts Sourcing &amp; Execution:</span>
                  <span className="text-[10px] text-slate-500">Select source above, then trigger PO generation or inventory stock issue.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPOModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    title="Create Purchase Order for outside parts"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Create Purchase Order (PO)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleIssueStockParts}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    title="Issue materials directly from inventory stock"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Issue Material (From Stock)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <QuickAddPartModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onPartCreated={(newPart) => {
          const newPartItem: JobCardPartItem = {
            id: `part-${Date.now()}`,
            inventoryId: newPart.id,
            sku: newPart.sku,
            name: newPart.name,
            quantity: 1,
            unitPrice: newPart.sellingPrice,
            total: newPart.sellingPrice,
          };
          onChange([...parts, newPartItem]);
        }}
      />

      <RequisitionPOModal
        isOpen={showPOModal}
        onClose={() => setShowPOModal(false)}
        parts={parts}
        onPOCreated={(poNo, updatedParts) => {
          onChange(updatedParts);
        }}
      />
    </div>
  );
};
