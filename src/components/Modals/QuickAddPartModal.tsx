import React, { useState } from 'react';
import { InventoryItem, InventoryCategory } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { Package, X, Check } from 'lucide-react';

interface QuickAddPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPartCreated?: (newPart: InventoryItem) => void;
}

const CATEGORIES: InventoryCategory[] = [
  'Mechanical Parts',
  'Body & Panels',
  'Paints & Primers',
  'Fluids & Lubricants',
  'Engine & Filters',
  'Brakes & Suspension',
  'Body & Paint Materials',
  'Consumables & Tools'
];

export const QuickAddPartModal: React.FC<QuickAddPartModalProps> = ({
  isOpen,
  onClose,
  onPartCreated,
}) => {
  const { addInventoryItem } = useGarage();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('Mechanical Parts');
  const [brand, setBrand] = useState('Generic / Genuine');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [quantityOnHand, setQuantityOnHand] = useState<number>(1);
  const [unit, setUnit] = useState('pcs');
  const [rackLocation, setRackLocation] = useState('A-01');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generatedSku = sku.trim() || `PART-${Date.now().toString().slice(-6)}`;
    
    const newItem = addInventoryItem({
      sku: generatedSku,
      name: name.trim(),
      category,
      brand: brand.trim() || 'Generic',
      quantityOnHand: Math.max(0, Number(quantityOnHand) || 0),
      minStockLevel: 2,
      unitCost: Math.max(0, Number(unitCost) || 0),
      sellingPrice: Math.max(0, Number(sellingPrice) || 0),
      unit: unit.trim() || 'pcs',
      rackLocation: rackLocation.trim() || 'A-01',
      lastRestockDate: new Date().toISOString().split('T')[0],
      compatibility: ['Universal'],
      supplier: 'Primary Supplier',
    });

    if (onPartCreated) {
      onPartCreated(newItem);
    }

    // Reset form
    setName('');
    setSku('');
    setSellingPrice(0);
    setUnitCost(0);
    setQuantityOnHand(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs font-sans text-xs">
      <div className="bg-white border border-slate-300 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Add Spare Part to Inventory</h3>
              <p className="text-[10px] text-slate-400">Directly add new item for Work Order / Requisition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Part Name / Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name ?? ''}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brake Pad Set Front - Toyota Corolla"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU / Part Number</label>
              <input
                type="text"
                value={sku ?? ''}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category ?? ''}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Selling Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice ?? ''}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost ?? ''}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stock Qty</label>
              <input
                type="number"
                min="0"
                value={quantityOnHand ?? ''}
                onChange={(e) => setQuantityOnHand(Number(e.target.value))}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                value={unit ?? ''}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs"
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rack / Loc</label>
              <input
                type="text"
                value={rackLocation ?? ''}
                onChange={(e) => setRackLocation(e.target.value)}
                placeholder="A-01"
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save &amp; Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
