import React, { useState } from 'react';
import { InventoryItem, GarageSettings } from '../../types';
import { SlidersHorizontal, X, Check, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  settings: GarageSettings;
  onAdjustStock: (itemId: string, deltaQty: number, reason: string) => void;
}

export const StockAdjustmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  inventory,
  settings,
  onAdjustStock,
}) => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [adjustQty, setAdjustQty] = useState(1);
  const [reason, setReason] = useState('Stock Count Variance (Cycle Count Audit)');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    if (!selectedItemId || !inventory.some(i => i.id === selectedItemId)) {
      if (inventory.length > 0) {
        setSelectedItemId(inventory[0].id);
      }
    }
  }, [isOpen, inventory, selectedItemId]);

  if (!isOpen) return null;

  const item = inventory.find(i => i.id === selectedItemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || adjustQty <= 0) return;

    const delta = adjustmentType === 'ADD' ? adjustQty : -adjustQty;
    if (adjustmentType === 'DEDUCT' && adjustQty > item.quantityOnHand) {
      alert(`Cannot deduct ${adjustQty} from current stock of ${item.quantityOnHand}`);
      return;
    }

    onAdjustStock(item.id, delta, `${reason}: ${notes}`);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-md text-slate-800 text-xs font-sans overflow-hidden">
        <div className="bg-[#1e4e79] text-white px-4 py-2 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">Inventory Stock Adjustment (Store Voucher)</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-2">
            <Check className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="font-bold text-sm text-emerald-800">Stock Adjusted Successfully!</p>
            <p className="text-slate-500">Warehouse balances updated in real-time.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Item to Adjust</label>
              <select
                value={selectedItemId ?? ''}
                onChange={e => setSelectedItemId(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                required
              >
                {inventory.map(i => (
                  <option key={i.id} value={i.id}>
                    [{i.sku}] {i.name} — Current: {i.quantityOnHand} {i.unit} (Rack: {i.rackLocation || 'A-01'})
                  </option>
                ))}
              </select>
            </div>

            {item && (
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded flex justify-between font-mono text-[11px]">
                <span>Current In-Stock: <strong>{item.quantityOnHand} {item.unit}</strong></span>
                <span>Unit Cost: <strong>{item.unitCost} {settings.currencySymbol}</strong></span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('ADD')}
                    className={`py-1.5 text-center font-bold rounded cursor-pointer ${
                      adjustmentType === 'ADD' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('DEDUCT')}
                    className={`py-1.5 text-center font-bold rounded cursor-pointer ${
                      adjustmentType === 'DEDUCT' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    - Deduct
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty ?? ''}
                  onChange={e => setAdjustQty(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adjustment Reason <span className="text-rose-500">*</span></label>
              <select
                value={reason ?? ''}
                onChange={e => setReason(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-medium text-slate-800"
                required
              >
                <option value="Manual Correction (Physical Stock Count Audit)">Manual Correction (Physical Stock Count Audit)</option>
                <option value="Purchase Receipt (Supplier Inward Delivery)">Purchase Receipt (Supplier Inward Delivery)</option>
                <option value="Usage on Job Card (Direct Workshop Consumption)">Usage on Job Card (Direct Workshop Consumption)</option>
                <option value="Sale (Over-The-Counter Spare Sale)">Sale (Over-The-Counter Spare Sale)</option>
                <option value="Return (Supplier Return / Defective Replacement)">Return (Supplier Return / Defective Replacement)</option>
                <option value="Damage (Workshop Damage / Scrap Yard Disposal)">Damage (Workshop Damage / Scrap Yard Disposal)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Internal Reference / Approval Note</label>
              <input
                type="text"
                placeholder="Supervisor Approval #2743"
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
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs cursor-pointer"
              >
                Confirm Stock Adjustment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
