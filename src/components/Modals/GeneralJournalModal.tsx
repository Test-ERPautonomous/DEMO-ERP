import React, { useState, useEffect } from 'react';
import { GarageSettings } from '../../types';
import { BookOpen, X, Plus, Trash2, Check, AlertCircle, Printer } from 'lucide-react';
import { api } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GarageSettings;
}

interface JournalLine {
  id: string;
  account: string;
  debit: number;
  credit: number;
  narration: string;
}

export const GeneralJournalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [voucherNumber, setVoucherNumber] = useState('Loading...');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      api.getNextDocumentNumber('RECEIPT', year)
        .then(res => {
          if (res?.code) setVoucherNumber(`JV-${year}-${res.code.split('-').pop() || '0001'}`);
        })
        .catch(() => {
          setVoucherNumber(`JV-${year}-0001`);
        });
    }
  }, [isOpen]);
  const [mainNarration, setMainNarration] = useState('Monthly adjustment for workshop shop supplies & lubricants');
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', account: '5100 - Workshop Operational Consumables', debit: 1250, credit: 0, narration: 'Washing chemicals and spray thinners' },
    { id: '2', account: '1010 - QNB Current Account (Main)', debit: 0, credit: 1250, narration: 'Direct bank transfer payment' },
  ]);
  const [isPosted, setIsPosted] = useState(false);

  if (!isOpen) return null;

  const totalDebit = lines.reduce((acc, c) => acc + (c.debit || 0), 0);
  const totalCredit = lines.reduce((acc, c) => acc + (c.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: `line-${Date.now()}`,
        account: '1020 - Cash in Hand / Workshop Cash Drawer',
        debit: 0,
        credit: 0,
        narration: '',
      }
    ]);
  };

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('Debit and Credit totals must match before posting!');
      return;
    }
    setIsPosted(true);
    setTimeout(() => {
      setIsPosted(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-3xl text-slate-800 text-xs font-sans overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4e79] text-white px-4 py-2 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">General Journal Entry (GL Voucher: {voucherNumber})</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isPosted ? (
          <div className="p-8 text-center space-y-2">
            <Check className="w-12 h-12 text-emerald-600 mx-auto" />
            <p className="font-bold text-base text-emerald-800">Journal Voucher Posted Successfully!</p>
            <p className="text-slate-500 font-mono text-xs">Voucher Ref: {voucherNumber} • General Ledger Updated</p>
          </div>
        ) : (
          <form onSubmit={handlePost} className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Voucher Number</label>
                <input
                  type="text"
                  value={voucherNumber ?? ''}
                  disabled
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-slate-100 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Voucher Date</label>
                <input
                  type="date"
                  value={date ?? ''}
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Cost Center</label>
                <select className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white">
                  <option>CC-01: Workshop Floor</option>
                  <option>CC-02: Paint &amp; Denting Booth</option>
                  <option>CC-03: Scrap Yard Salvage</option>
                  <option>CC-04: Admin &amp; Management</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Narration / Description</label>
                <input
                  type="text"
                  value={mainNarration ?? ''}
                  onChange={e => setMainNarration(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                  required
                />
              </div>
            </div>

            {/* Lines Table */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[#e9edf2] text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-300">Account (Chart of Accounts)</th>
                    <th className="py-2 px-3 border-r border-slate-300">Line Narration</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Debit (QAR)</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Credit (QAR)</th>
                    <th className="py-2 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {lines.map(line => (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td className="p-1 border-r border-slate-200">
                        <select
                          value={line.account ?? ''}
                          onChange={e => updateLine(line.id, 'account', e.target.value)}
                          className="w-full border border-slate-300 rounded px-1.5 py-1 text-[11px] bg-white font-sans"
                        >
                          <option value="1010 - QNB Current Account (Main)">1010 - QNB Current Account (Main)</option>
                          <option value="1020 - Cash in Hand / Workshop Cash Drawer">1020 - Cash in Hand / Workshop Cash Drawer</option>
                          <option value="1200 - Accounts Receivable (Customers)">1200 - Accounts Receivable (Customers)</option>
                          <option value="1300 - Spare Parts Inventory">1300 - Spare Parts Inventory</option>
                          <option value="2000 - Accounts Payable (Vendors)">2000 - Accounts Payable (Vendors)</option>
                          <option value="4000 - Workshop Repair Revenue">4000 - Workshop Repair Revenue</option>
                          <option value="4100 - Scrap Yard Sales Revenue">4100 - Scrap Yard Sales Revenue</option>
                          <option value="5100 - Workshop Operational Consumables">5100 - Workshop Operational Consumables</option>
                          <option value="5200 - Technician Labor Expense">5200 - Technician Labor Expense</option>
                        </select>
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={line.narration ?? ''}
                          onChange={e => updateLine(line.id, 'narration', e.target.value)}
                          placeholder="Line narration..."
                          className="w-full border border-slate-300 rounded px-1.5 py-1 text-[11px] font-sans"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.01"
                          value={line.debit || ''}
                          onChange={e => updateLine(line.id, 'debit', Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full border border-slate-300 rounded px-1.5 py-1 text-right text-[11px] font-mono"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.01"
                          value={line.credit || ''}
                          onChange={e => updateLine(line.id, 'credit', Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full border border-slate-300 rounded px-1.5 py-1 text-right text-[11px] font-mono"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={addLine}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-xs flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add GL Line
              </button>

              <div className="flex items-center gap-4 font-mono text-[11px]">
                <div>Debit Total: <strong className="text-slate-900">{totalDebit.toFixed(2)} QAR</strong></div>
                <div>Credit Total: <strong className="text-slate-900">{totalCredit.toFixed(2)} QAR</strong></div>
                <div className={`px-2 py-0.5 rounded font-bold ${isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {isBalanced ? 'Balanced' : `Diff: ${(totalDebit - totalCredit).toFixed(2)}`}
                </div>
              </div>
            </div>

            {/* Footer */}
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
                disabled={!isBalanced}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded text-xs cursor-pointer shadow-xs"
              >
                Post Journal Voucher
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
