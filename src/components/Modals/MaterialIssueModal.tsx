import React, { useState, useEffect } from 'react';
import { JobCard, InventoryItem, GarageSettings } from '../../types';
import { Package, X, Check, AlertCircle, Printer, ArrowRight, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { QuickAddPartModal } from './QuickAddPartModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobCards: JobCard[];
  inventory: InventoryItem[];
  settings: GarageSettings;
  onIssueMaterial: (jobCardId: string, item: InventoryItem, quantity: number, technicianName: string) => void;
}

export const MaterialIssueModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jobCards,
  inventory,
  settings,
  onIssueMaterial,
}) => {
  const activeJobs = jobCards.filter(j => j.status !== 'Delivered');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [technicianName, setTechnicianName] = useState('Osman (Service Manager)');
  const [issueNote, setIssueNote] = useState('');
  const [voucherNo, setVoucherNo] = useState('Loading...');
  const [issuedSuccessVoucher, setIssuedSuccessVoucher] = useState<{
    voucherNo: string;
    jobNo: string;
    plate: string;
    partName: string;
    partNo: string;
    qty: number;
    tech: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (!selectedJobId || !jobCards.some(j => j.id === selectedJobId)) {
        const fallbackJob = activeJobs[0]?.id || jobCards[0]?.id || '';
        if (fallbackJob) setSelectedJobId(fallbackJob);
      }

      if (!selectedItemId || !inventory.some(i => i.id === selectedItemId)) {
        const fallbackItem = inventory[0]?.id || '';
        if (fallbackItem) setSelectedItemId(fallbackItem);
      }

      const year = new Date().getFullYear();
      api.getNextDocumentNumber('COUNTER_SALE', year)
        .then(res => {
          if (res?.code) setVoucherNo(`MIS-${year}-${res.code.split('-').pop() || '0001'}`);
        })
        .catch(() => {
          setVoucherNo(`MIS-${year}-0001`);
        });
    }
  }, [isOpen, jobCards, inventory, selectedJobId, selectedItemId]);

  if (!isOpen) return null;

  const selectedJob = jobCards.find(j => j.id === selectedJobId) || activeJobs[0] || jobCards[0];
  const selectedItem = inventory.find(i => i.id === selectedItemId) || inventory[0];

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !selectedItem || quantity <= 0) return;

    if (quantity > selectedItem.quantityOnHand) {
      alert(`Insufficient stock! Available in stock: ${selectedItem.quantityOnHand} ${selectedItem.unit}`);
      return;
    }

    onIssueMaterial(selectedJob.id, selectedItem, quantity, technicianName);

    setIssuedSuccessVoucher({
      voucherNo,
      jobNo: selectedJob.jobNumber,
      plate: selectedJob.vehicle.plateNumber,
      partName: selectedItem.name,
      partNo: selectedItem.sku,
      qty: quantity,
      tech: technicianName,
      date: new Date().toLocaleString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-xl text-slate-800 text-xs font-sans overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4e79] text-white px-4 py-2 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">Material Issue Note (MIN / MIS) - Workshop Parts Issue</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {issuedSuccessVoucher ? (
          <div className="p-5 space-y-4">
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Material Issued Successfully!</p>
                <p className="text-[11px]">Deducted {issuedSuccessVoucher.qty} unit(s) from inventory and logged to Job Card {issuedSuccessVoucher.jobNo}.</p>
              </div>
            </div>

            {/* Printable Voucher Slip */}
            <div className="border border-slate-300 rounded p-4 bg-slate-50 font-mono text-[11px] space-y-2">
              <div className="text-center border-b border-slate-300 pb-2">
                <p className="font-bold text-slate-900">{settings.garageName}</p>
                <p className="text-[10px] text-slate-500">MATERIAL ISSUE SLIP • {issuedSuccessVoucher.voucherNo}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-500">Job Card:</span> <strong>{issuedSuccessVoucher.jobNo}</strong></div>
                <div><span className="text-slate-500">Vehicle Plate:</span> <strong>{issuedSuccessVoucher.plate}</strong></div>
                <div><span className="text-slate-500">Part No:</span> <strong>{issuedSuccessVoucher.partNo}</strong></div>
                <div><span className="text-slate-500">Issued Qty:</span> <strong>{issuedSuccessVoucher.qty}</strong></div>
                <div className="col-span-2"><span className="text-slate-500">Description:</span> <strong>{issuedSuccessVoucher.partName}</strong></div>
                <div className="col-span-2"><span className="text-slate-500">Issued To Technician:</span> <strong>{issuedSuccessVoucher.tech}</strong></div>
                <div className="col-span-2 text-[10px] text-slate-400">Timestamp: {issuedSuccessVoucher.date}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Issue Slip
              </button>
              <button
                onClick={() => setIssuedSuccessVoucher(null)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs cursor-pointer"
              >
                Issue Another Part
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleIssue} className="p-5 space-y-4">
            <div className="space-y-3">
              {/* Job Card Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Active Job Card</label>
                <select
                  value={selectedJobId ?? ''}
                  onChange={e => setSelectedJobId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                  required
                >
                  {jobCards.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.jobNumber} — {job.vehicle.plateNumber} ({job.vehicle.make} {job.vehicle.model}) — {job.customer.name}
                    </option>
                  ))}
                </select>
                {selectedJob && (
                  <div className="mt-1 text-[11px] text-slate-500 bg-slate-100 p-2 rounded flex justify-between">
                    <span>Status: <strong className="text-blue-700">{selectedJob.status}</strong></span>
                    <span>Advisor: <strong>{selectedJob.serviceAdviser || 'Service Desk'}</strong></span>
                  </div>
                )}
              </div>

              {/* Part Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Select Inventory Spare Part</label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddModal(true)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Item
                  </button>
                </div>
                <select
                  value={selectedItemId ?? ''}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                  required
                >
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.sku}] {item.name} — Stock: {item.quantityOnHand} {item.unit} (Rack: {item.rackLocation || 'A-01'}) - {item.sellingPrice} {settings.currencySymbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Issue Quantity {selectedItem && <span className="text-slate-400 font-normal">(Max: {selectedItem.quantityOnHand})</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem ? selectedItem.quantityOnHand : 999}
                    value={quantity ?? ''}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                {/* Technician */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issuing To Technician</label>
                  <select
                    value={technicianName ?? ''}
                    onChange={e => setTechnicianName(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Autonomous (Owner / Admin)">Autonomous (Owner / Admin)</option>
                    <option value="Osman (Service Manager)">Osman (Service Manager)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Requisition Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Approved replacement during 40,000 km periodic service"
                  value={issueNote ?? ''}
                  onChange={e => setIssueNote(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer Actions */}
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
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Authorize &amp; Issue Material</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>

      <QuickAddPartModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onPartCreated={(newPart) => {
          setSelectedItemId(newPart.id);
        }}
      />
    </div>
  );
};
