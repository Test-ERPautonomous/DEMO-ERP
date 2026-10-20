import React, { useState } from 'react';
import { JobCard, GarageSettings } from '../../types';
import { Undo2, X, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobCards: JobCard[];
  settings: GarageSettings;
  onReturnMaterial: (jobCardId: string, partId: string, returnQty: number, reason: string) => void;
}

export const IssueReturnModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jobCards,
  settings,
  onReturnMaterial,
}) => {
  const jobsWithParts = jobCards.filter(j => (j.partsUsed && j.partsUsed.length > 0) || (j.parts && j.parts.length > 0) || ((j as any).requisitions && (j as any).requisitions.length > 0));
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [reason, setReason] = useState('Excess part issued - not required');
  const [successMessage, setSuccessMessage] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;

    if (!selectedJobId || !jobCards.some(j => j.id === selectedJobId)) {
      const fallbackJob = jobsWithParts[0]?.id || jobCards[0]?.id || '';
      if (fallbackJob) setSelectedJobId(fallbackJob);
    }
  }, [isOpen, jobCards, selectedJobId]);

  if (!isOpen) return null;

  const selectedJob = jobCards.find(j => j.id === selectedJobId);
  const availableParts = selectedJob?.partsUsed || selectedJob?.parts || (selectedJob as any)?.requisitions || [];

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !selectedPartId || returnQty <= 0) return;

    const part = availableParts.find(p => p.id === selectedPartId);
    if (!part) return;

    if (returnQty > part.quantity) {
      alert(`Cannot return more than issued quantity (${part.quantity})`);
      return;
    }

    onReturnMaterial(selectedJob.id, selectedPartId, returnQty, reason);
    setSuccessMessage(`Successfully returned ${returnQty}x ${part.name} back to warehouse inventory.`);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-lg text-slate-800 text-xs font-sans overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4e79] text-white px-4 py-2 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <Undo2 className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">Issue Return (Material Return to Store / Yard)</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMessage ? (
          <div className="p-6 text-center space-y-2">
            <Check className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="font-bold text-sm text-emerald-800">{successMessage}</p>
            <p className="text-slate-500">Warehouse stock updated automatically.</p>
          </div>
        ) : (
          <form onSubmit={handleReturn} className="p-5 space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Job Card</label>
              <select
                value={selectedJobId ?? ''}
                onChange={e => {
                  setSelectedJobId(e.target.value);
                  setSelectedPartId('');
                }}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                required
              >
                {jobCards.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.jobNumber} — {job.vehicle.plateNumber} ({job.partsUsed?.length || 0} parts issued)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Issued Part to Return</label>
              {availableParts.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[11px]">
                  No spare parts currently recorded on this Job Card.
                </div>
              ) : (
                <select
                  value={selectedPartId ?? ''}
                  onChange={e => setSelectedPartId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                  required
                >
                  <option value="">-- Choose part to return --</option>
                  {availableParts.map(part => (
                    <option key={part.id} value={part.id}>
                      [{part.sku}] {part.name} — Issued: {part.quantity} (Rate: {part.unitPrice} {settings.currencySymbol})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Return Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={returnQty ?? ''}
                  onChange={e => setReturnQty(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Return Condition</label>
                <select className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white">
                  <option>Unused / Brand New (Restock)</option>
                  <option>Defective / Vendor Warranty Return</option>
                  <option>Scrap / Damaged during test</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for Return</label>
              <input
                type="text"
                value={reason ?? ''}
                onChange={e => setReason(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                required
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
                disabled={!selectedPartId}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded text-xs cursor-pointer"
              >
                Process Issue Return
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
