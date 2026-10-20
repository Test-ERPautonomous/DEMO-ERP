import React, { useState } from 'react';
import { JobCardPartItem, SupplierMasterItem } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { ShoppingBag, X, Check, FileText, Calendar, Building2 } from 'lucide-react';

interface RequisitionPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardNumber?: string;
  parts: JobCardPartItem[];
  onPOCreated: (poNumber: string, updatedParts: JobCardPartItem[]) => void;
}

export const RequisitionPOModal: React.FC<RequisitionPOModalProps> = ({
  isOpen,
  onClose,
  jobCardNumber = 'JC-2026-0001',
  parts,
  onPOCreated,
}) => {
  const { createPurchaseOrder, suppliers } = useGarage();
  const outsideParts = parts.filter(p => !p.source || p.source === 'Outside Purchase / PO' || p.status !== 'Issued');

  const [supplierName, setSupplierName] = useState('');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(`Direct PO for Work Order Requisition ${jobCardNumber}`);
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      if (!supplierName) {
        setSupplierName(suppliers[0]?.name || 'Al Futtaim Auto Parts Distributor');
      }
      setSelectedPartIds(outsideParts.map(p => p.id));
      setNotes(`Direct PO for Work Order Requisition ${jobCardNumber}`);
    }
  }, [isOpen, suppliers, jobCardNumber]);

  if (!isOpen) return null;

  const toggleSelectPart = (id: string) => {
    if (selectedPartIds.includes(id)) {
      setSelectedPartIds(selectedPartIds.filter(i => i !== id));
    } else {
      setSelectedPartIds([...selectedPartIds, id]);
    }
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const partsToOrder = parts.filter(p => selectedPartIds.includes(p.id));
    if (partsToOrder.length === 0) {
      alert('Please select at least one part item to include in the Purchase Order.');
      return;
    }

    const totalPOAmount = partsToOrder.reduce((sum, p) => sum + (Number(p.total) || (Number(p.quantity) * Number(p.unitPrice))), 0);

    const newPO = createPurchaseOrder({
      supplierName: supplierName.trim() || 'External Auto Parts Supplier',
      date: new Date().toISOString().split('T')[0],
      expectedDate,
      status: 'Ordered',
      paymentStatus: 'Unpaid',
      totalAmount: totalPOAmount,
      notes: notes.trim(),
      items: partsToOrder.map(p => ({
        partId: p.inventoryId || p.id,
        sku: p.sku || 'PART-EXT',
        name: p.name,
        quantity: p.quantity,
        quantityOrdered: p.quantity,
        receivedQuantity: 0,
        quantityReceived: 0,
        unitCost: p.unitPrice,
        totalCost: p.total,
      })),
    });

    const updatedParts = parts.map(p => {
      if (selectedPartIds.includes(p.id)) {
        return {
          ...p,
          source: 'Outside Purchase / PO' as const,
          status: 'PO Created' as const,
          poNumber: newPO.poNumber,
          supplierName: newPO.supplierName,
        };
      }
      return p;
    });

    onPOCreated(newPO.poNumber, updatedParts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs font-sans text-xs">
      <div className="bg-white border border-slate-300 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Create Purchase Order (Outside Vendor)</h3>
              <p className="text-[10px] text-slate-400">Generate official PO for parts purchased outside for Job Card #{jobCardNumber}</p>
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

        <form onSubmit={handleCreatePO} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> External Supplier / Vendor
              </label>
              <input
                type="text"
                value={supplierName ?? ''}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Al Futtaim Spare Parts"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDate ?? ''}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Parts to Order Outside ({selectedPartIds.length} selected)
            </label>
            <div className="border border-slate-300 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-200 bg-slate-50">
              {outsideParts.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic">No requisition parts added yet.</div>
              ) : (
                outsideParts.map(p => {
                  const isChecked = selectedPartIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectPart(p.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-colors ${isChecked ? 'bg-indigo-50/70 font-semibold' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">SKU: {p.sku || 'N/A'} | Qty: {p.quantity}</div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-indigo-700 font-bold">
                        ${(Number(p.total) || (p.quantity * p.unitPrice)).toFixed(2)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">PO Remarks / Special Instructions</label>
            <input
              type="text"
              value={notes ?? ''}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deliver directly to Service Bay 3"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white"
            />
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
              disabled={selectedPartIds.length === 0}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" /> Generate Official PO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
