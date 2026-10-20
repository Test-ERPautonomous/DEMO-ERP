import React, { useState, useEffect, useMemo } from 'react';
import { JobCardPartItem, InventoryItem } from '../../types';
import { 
  Package, 
  X, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  ArrowRight, 
  AlertTriangle,
  Layers,
  Wrench
} from 'lucide-react';
import { api } from '../../lib/api';

interface IssueItemRow {
  partId: string;
  sku: string;
  name: string;
  requestedQty: number;
  issueQty: number;
  unitPrice: number;
  currentStock: number;
  selected: boolean;
  source: string;
  alreadyIssued: boolean;
  inventoryId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobNumber: string;
  vehiclePlate?: string;
  requisitions: JobCardPartItem[];
  inventory: InventoryItem[];
  defaultTechnician?: string;
  onConfirmIssue: (
    issuedItems: Array<{
      partId: string;
      inventoryId?: string;
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }>,
    technicianName: string,
    issueNotes?: string
  ) => void;
}

export const RequisitionIssueModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jobNumber,
  vehiclePlate,
  requisitions,
  inventory,
  defaultTechnician = '',
  onConfirmIssue,
}) => {
  const [technicianName, setTechnicianName] = useState(defaultTechnician || 'Osman (Service Manager)');
  const [issueNotes, setIssueNotes] = useState('');
  const [techniciansList, setTechniciansList] = useState<string[]>([]);
  const [items, setItems] = useState<IssueItemRow[]>([]);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Initialize or fetch available technicians
  useEffect(() => {
    if (isOpen) {
      api.getTechnicians()
        .then(res => {
          const list = res?.technicians || res?.data || (Array.isArray(res) ? res : []);
          if (Array.isArray(list) && list.length > 0) {
            const names = list.map((t: any) => t.name || t.fullName).filter(Boolean);
            setTechniciansList(Array.from(new Set(names)));
          } else {
            setTechniciansList([
              'Tariq Al-Mansoor (Senior Mechanic)',
              'Bilal Khan (Denter & Panel Beater)',
              'Rashid Mahmood (Master Painter)',
              'Iqbal Hussain (Auto Electrician)',
              'Farhan Ahmad (Lube & Brake)'
            ]);
          }
        })
        .catch(() => {
          setTechniciansList([
            'Tariq Al-Mansoor (Senior Mechanic)',
            'Bilal Khan (Denter & Panel Beater)',
            'Rashid Mahmood (Master Painter)',
            'Iqbal Hussain (Auto Electrician)',
            'Farhan Ahmad (Lube & Brake)'
          ]);
        });
    }
  }, [isOpen]);

  // Sync rows from requisitions & inventory
  useEffect(() => {
    if (isOpen && requisitions) {
      const rows: IssueItemRow[] = requisitions.map((req, idx) => {
        // match inventory item by ID or SKU
        const invMatch = inventory.find(i => i.id === req.inventoryId || i.sku === req.sku);
        const stock = invMatch 
          ? Number(invMatch.quantityOnHand ?? invMatch.stockQuantity ?? 0)
          : 0;

        const reqQty = Number(req.quantity) || 1;
        const alreadyIssuedQty = Number(req.issuedQuantity ?? (req.status === 'Issued' ? Math.min(reqQty, 1) : 0));
        const remainingQty = Math.max(0, reqQty - alreadyIssuedQty);
        const isFullyIssued = (req.status === 'Issued' && remainingQty === 0) || (alreadyIssuedQty >= reqQty);

        return {
          partId: req.id || `part-${idx}`,
          sku: req.sku,
          name: req.name,
          requestedQty: reqQty,
          issueQty: remainingQty > 0 ? remainingQty : (reqQty > 0 ? reqQty : 1),
          unitPrice: Number(req.unitPrice) || 0,
          currentStock: stock,
          selected: !isFullyIssued, // select if still has remaining quantity
          source: req.source || 'Inventory Stock',
          alreadyIssued: isFullyIssued,
          inventoryId: invMatch?.id || req.inventoryId,
        };
      });

      setItems(rows);
      setFeedbackError(null);
      if (defaultTechnician) {
        setTechnicianName(defaultTechnician);
      }
    }
  }, [isOpen, requisitions, inventory, defaultTechnician]);

  if (!isOpen) return null;

  // Toggle single item selection
  const handleToggleSelect = (index: number) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  // Toggle select all
  const allSelectable = items.filter(i => !i.alreadyIssued);
  const isAllSelected = allSelectable.length > 0 && allSelectable.every(i => i.selected);

  const handleToggleSelectAll = () => {
    const targetState = !isAllSelected;
    setItems(prev => prev.map(i => i.alreadyIssued ? i : { ...i, selected: targetState }));
  };

  // Change issue quantity
  const handleQtyChange = (index: number, newQty: number) => {
    setItems(prev => {
      const next = [...prev];
      const validQty = Math.max(1, isNaN(newQty) ? 1 : newQty);
      next[index] = { ...next[index], issueQty: validQty };
      return next;
    });
  };

  // Validation
  const selectedItems = items.filter(i => i.selected);
  const hasInsufficientStock = selectedItems.some(i => i.issueQty > i.currentStock);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setFeedbackError('Please select at least one item from the requisition list to issue.');
      return;
    }

    if (!technicianName.trim()) {
      setFeedbackError('Please enter or select the technician name to whom the parts are issued.');
      return;
    }

    const payload = selectedItems.map(i => ({
      partId: i.partId,
      inventoryId: i.inventoryId,
      sku: i.sku,
      name: i.name,
      quantity: i.issueQty,
      unitPrice: i.unitPrice,
    }));

    onConfirmIssue(payload, technicianName.trim(), issueNotes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Issue Material from Stock</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/20 text-white">
                  {jobNumber}
                </span>
                {vehiclePlate && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-400 text-slate-900">
                    {vehiclePlate}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">
                Select parts to issue, assign to a technician, and review real-time remaining inventory stock.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOP CONFIGURATION BAR: TECHNICIAN & NOTES */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Technician Name Selector */}
          <div className="md:col-span-7">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Issued to Technician (Recipient Name) *</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                list="technicians-datalist"
                value={technicianName}
                onChange={e => setTechnicianName(e.target.value)}
                placeholder="Type or select technician name..."
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
              />
              <datalist id="technicians-datalist">
                {techniciansList.map((t, idx) => (
                  <option key={idx} value={t} />
                ))}
              </datalist>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 overflow-x-auto pb-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Quick Pick:</span>
              {techniciansList.slice(0, 4).map((tech, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTechnicianName(tech)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-700 text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
                >
                  {tech.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Note / Reference */}
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>Issue Notes / Bay Reference</span>
            </label>
            <input
              type="text"
              value={issueNotes}
              onChange={e => setIssueNotes(e.target.value)}
              placeholder="e.g. Issued for scheduled 40k service / Bay 3"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* FEEDBACK ERROR BANNER */}
        {feedbackError && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{feedbackError}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setFeedbackError(null)} 
              className="text-rose-600 hover:text-rose-800 text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STOCK INSUFFICIENT WARNING BANNER */}
        {hasInsufficientStock && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Stock Warning:</strong> One or more selected parts require more quantity than currently available in inventory.
            </span>
          </div>
        )}

        {/* REQUISITION ITEMS TABLE */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-400 cursor-pointer w-4 h-4"
                      title={isAllSelected ? "Deselect All" : "Select All"}
                    />
                  </th>
                  <th className="p-2.5">Item & SKU</th>
                  <th className="p-2.5 w-24">Req. Qty</th>
                  <th className="p-2.5 w-28">Issue Qty</th>
                  <th className="p-2.5 w-28 text-center">Stock on Hand</th>
                  <th className="p-2.5 w-32 text-center">Stock Remaining</th>
                  <th className="p-2.5 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      No requisition items found on this job card.
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => {
                    const remainingStock = row.currentStock - (row.selected ? row.issueQty : 0);
                    const isShort = row.selected && (row.issueQty > row.currentStock);

                    return (
                      <tr 
                        key={row.partId}
                        className={`transition-colors ${
                          row.alreadyIssued 
                            ? 'bg-slate-50/70 text-slate-400' 
                            : row.selected 
                              ? 'bg-blue-50/40 hover:bg-blue-50/60' 
                              : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={row.alreadyIssued}
                            onChange={() => handleToggleSelect(idx)}
                            className="rounded text-blue-600 focus:ring-blue-400 cursor-pointer w-4 h-4 disabled:opacity-40"
                          />
                        </td>

                        {/* Part Info */}
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{row.name}</span>
                            {row.alreadyIssued && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                Already Issued
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>SKU: {row.sku}</span>
                            <span>•</span>
                            <span>Source: {row.source}</span>
                            <span>•</span>
                            <span>Price: QAR {row.unitPrice.toFixed(2)}</span>
                          </div>
                        </td>

                        {/* Requisition Qty */}
                        <td className="p-2.5 font-mono font-bold text-slate-700">
                          {row.requestedQty}
                        </td>

                        {/* Issue Qty (Changeable) */}
                        <td className="p-2.5">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={row.issueQty}
                              disabled={!row.selected || row.alreadyIssued}
                              onChange={e => handleQtyChange(idx, parseInt(e.target.value, 10))}
                              className="w-16 px-2 py-1 text-center font-bold font-mono text-xs border border-slate-300 rounded bg-white text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-60"
                            />
                            <span className="text-[10px] text-slate-500 font-semibold">pcs</span>
                          </div>
                        </td>

                        {/* Stock on Hand */}
                        <td className="p-2.5 text-center font-mono">
                          <span className={`font-bold px-2 py-0.5 rounded text-xs inline-block ${
                            row.currentStock <= 0 
                              ? 'bg-rose-100 text-rose-800' 
                              : row.currentStock <= 5 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-slate-100 text-slate-800'
                          }`}>
                            {row.currentStock}
                          </span>
                        </td>

                        {/* Stock Remaining After Issue */}
                        <td className="p-2.5 text-center font-mono">
                          {row.alreadyIssued ? (
                            <span className="text-slate-400 text-xs">-</span>
                          ) : (
                            <span className={`font-bold px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 ${
                              remainingStock < 0 
                                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                : remainingStock === 0 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {remainingStock} left
                              {remainingStock < 0 && <AlertCircle className="w-3 h-3 text-rose-600" />}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-2.5 text-center">
                          {row.alreadyIssued ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              Issued
                            </span>
                          ) : isShort ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              Available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div>
              Selected: <strong className="text-blue-700 font-mono text-sm">{selectedItems.length}</strong> of {items.length} items
            </div>
            <span>•</span>
            <div>
              Total Units to Issue:{' '}
              <strong className="text-slate-900 font-mono text-sm">
                {selectedItems.reduce((acc, curr) => acc + curr.issueQty, 0)}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Issue Material ({selectedItems.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequisitionIssueModal;
