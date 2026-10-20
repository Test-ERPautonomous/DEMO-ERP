import React, { useState } from 'react';
import { GarageSettings } from '../../types';
import { CreditCard, X, Plus, Check, AlertTriangle, Search, Filter } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GarageSettings;
}

interface PDCRecord {
  id: string;
  chequeNumber: string;
  bankName: string;
  draweeName: string;
  dueDate: string;
  amount: number;
  type: 'RECEIVABLE' | 'PAYABLE';
  status: 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
  jobOrInvoiceRef: string;
}

export const PdcManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const currentYear = new Date().getFullYear();
  const [pdcs, setPdcs] = useState<PDCRecord[]>([
    {
      id: 'pdc-1',
      chequeNumber: 'CHQ-008921',
      bankName: 'Qatar National Bank (QNB)',
      draweeName: 'Al Sulaiti Transport Co.',
      dueDate: `${currentYear}-10-15`,
      amount: 14200,
      type: 'RECEIVABLE',
      status: 'PENDING',
      jobOrInvoiceRef: `INV-${currentYear}-0001`,
    },
    {
      id: 'pdc-2',
      chequeNumber: 'CHQ-004519',
      bankName: 'Commercial Bank of Qatar (CBQ)',
      draweeName: 'Doha Express Limousine W.L.L',
      dueDate: `${currentYear}-10-01`,
      amount: 8500,
      type: 'RECEIVABLE',
      status: 'DEPOSITED',
      jobOrInvoiceRef: `INV-${currentYear}-0003`,
    },
    {
      id: 'pdc-3',
      chequeNumber: 'CHQ-009102',
      bankName: 'Qatar Islamic Bank (QIB)',
      draweeName: 'Al Muftah Auto Spare Parts (Supplier)',
      dueDate: `${currentYear}-10-20`,
      amount: 6800,
      type: 'PAYABLE',
      status: 'PENDING',
      jobOrInvoiceRef: `PO-${currentYear}-0001`,
    },
    {
      id: 'pdc-4',
      chequeNumber: 'CHQ-001290',
      bankName: 'Doha Bank',
      draweeName: 'Nasser Al-Kuwari',
      dueDate: `${currentYear}-09-10`,
      amount: 2450,
      type: 'RECEIVABLE',
      status: 'CLEARED',
      jobOrInvoiceRef: `INV-${currentYear}-0002`,
    },
  ]);

  const [filterType, setFilterType] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New PDC form
  const [newChequeNumber, setNewChequeNumber] = useState('');
  const [newBank, setNewBank] = useState('Qatar National Bank (QNB)');
  const [newDrawee, setNewDrawee] = useState('');
  const [newDueDate, setNewDueDate] = useState(`${currentYear}-11-01`);
  const [newAmount, setNewAmount] = useState(5000);
  const [newType, setNewType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [newRef, setNewRef] = useState(`INV-${currentYear}-NEW`);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChequeNumber || !newDrawee || newAmount <= 0) return;

    setPdcs([
      ...pdcs,
      {
        id: `pdc-${Date.now()}`,
        chequeNumber: newChequeNumber,
        bankName: newBank,
        draweeName: newDrawee,
        dueDate: newDueDate,
        amount: newAmount,
        type: newType,
        status: 'PENDING',
        jobOrInvoiceRef: newRef,
      }
    ]);
    setShowAddForm(false);
    setNewChequeNumber('');
    setNewDrawee('');
  };

  const updateStatus = (id: string, status: PDCRecord['status']) => {
    setPdcs(pdcs.map(p => p.id === id ? { ...p, status } : p));
  };

  const filteredPdcs = pdcs.filter(p => filterType === 'ALL' || p.type === filterType);
  const totalReceivable = pdcs.filter(p => p.type === 'RECEIVABLE' && p.status !== 'BOUNCED').reduce((acc, c) => acc + c.amount, 0);
  const totalPayable = pdcs.filter(p => p.type === 'PAYABLE' && p.status !== 'BOUNCED').reduce((acc, c) => acc + c.amount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4e79] text-white px-4 py-2 flex items-center justify-between font-bold shrink-0">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">PDC Management (Post-Dated Cheques Register &amp; Clearance)</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action / KPI bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                filterType === 'ALL' ? 'bg-[#1e4e79] text-white' : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              All Cheques ({pdcs.length})
            </button>
            <button
              onClick={() => setFilterType('RECEIVABLE')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                filterType === 'RECEIVABLE' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              Customer Receivables
            </button>
            <button
              onClick={() => setFilterType('PAYABLE')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                filterType === 'PAYABLE' ? 'bg-amber-700 text-white' : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              Vendor Payables
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[11px] font-mono">
              <span className="text-slate-500">PDC Rec:</span> <strong className="text-emerald-700">{totalReceivable.toFixed(2)} QAR</strong>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-500">PDC Pay:</span> <strong className="text-amber-700">{totalPayable.toFixed(2)} QAR</strong>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {showAddForm ? 'Close Form' : '+ Record PDC'}
            </button>
          </div>
        </div>

        {/* Add Cheque Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="bg-blue-50/70 border-b border-blue-200 p-4 space-y-3 shrink-0">
            <h4 className="font-bold text-blue-900">Record New Post-Dated Cheque</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Cheque Number</label>
                <input
                  type="text"
                  placeholder="CHQ-001234"
                  value={newChequeNumber ?? ''}
                  onChange={e => setNewChequeNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Bank</label>
                <select
                  value={newBank ?? ''}
                  onChange={e => setNewBank(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                >
                  <option>Qatar National Bank (QNB)</option>
                  <option>Qatar Islamic Bank (QIB)</option>
                  <option>Commercial Bank of Qatar (CBQ)</option>
                  <option>Doha Bank</option>
                  <option>Masraf Al Rayan</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Party / Drawee</label>
                <input
                  type="text"
                  placeholder="Customer or Supplier Name"
                  value={newDrawee ?? ''}
                  onChange={e => setNewDrawee(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Due / Maturity Date</label>
                <input
                  type="date"
                  value={newDueDate ?? ''}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Amount (QAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAmount ?? ''}
                  onChange={e => setNewAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Direction</label>
                <select
                  value={newType ?? ''}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                >
                  <option value="RECEIVABLE">Receivable (From Customer)</option>
                  <option value="PAYABLE">Payable (To Supplier)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Invoice / PO Reference</label>
                <input
                  type="text"
                  value={newRef ?? ''}
                  onChange={e => setNewRef(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs"
              >
                Save PDC
              </button>
            </div>
          </form>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#e9edf2] text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300">Cheque #</th>
                  <th className="py-2 px-3 border-r border-slate-300">Bank</th>
                  <th className="py-2 px-3 border-r border-slate-300">Party / Drawee</th>
                  <th className="py-2 px-3 border-r border-slate-300">Due Date</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-right">Amount (QAR)</th>
                  <th className="py-2 px-3 border-r border-slate-300">Type</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center">Status</th>
                  <th className="py-2 px-3 text-center">Change Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {filteredPdcs.map(pdc => (
                  <tr key={pdc.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-200 font-bold text-blue-900">{pdc.chequeNumber}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-700">{pdc.bankName}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">{pdc.draweeName}</td>
                    <td className="py-2 px-3 border-r border-slate-200">{pdc.dueDate}</td>
                    <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-slate-900">{pdc.amount.toFixed(2)}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        pdc.type === 'RECEIVABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pdc.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pdc.status === 'CLEARED' ? 'bg-emerald-100 text-emerald-800' :
                        pdc.status === 'DEPOSITED' ? 'bg-blue-100 text-blue-800' :
                        pdc.status === 'BOUNCED' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {pdc.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      <select
                        value={pdc.status ?? ''}
                        onChange={e => updateStatus(pdc.id, e.target.value as any)}
                        className="text-[10px] border border-slate-300 rounded px-1.5 py-0.5 bg-white cursor-pointer"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="DEPOSITED">Deposited</option>
                        <option value="CLEARED">Cleared</option>
                        <option value="BOUNCED">Bounced</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
