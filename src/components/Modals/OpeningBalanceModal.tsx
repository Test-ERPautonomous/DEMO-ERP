import React, { useState } from 'react';
import { GarageSettings } from '../../types';
import { X, CheckCircle, DollarSign, BookOpen, AlertCircle, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GarageSettings;
}

interface AccountOpening {
  code: string;
  accountName: string;
  type: 'Asset' | 'Liability' | 'Equity';
  debit: number;
  credit: number;
}

export const OpeningBalanceModal: React.FC<Props> = ({ isOpen, onClose, settings }) => {
  const [fiscalYear, setFiscalYear] = useState('2026');
  const [accounts, setAccounts] = useState<AccountOpening[]>([
    { code: '1010', accountName: 'Cash on Hand (Main Cashier)', type: 'Asset', debit: 25000, credit: 0 },
    { code: '1020', accountName: 'Qatar National Bank (QNB Operating Account)', type: 'Asset', debit: 185000, credit: 0 },
    { code: '1030', accountName: 'Commercial Bank of Qatar (CBQ Payroll)', type: 'Asset', debit: 45000, credit: 0 },
    { code: '1200', accountName: 'Opening Accounts Receivable (Customers Ledger)', type: 'Asset', debit: 38400, credit: 0 },
    { code: '1300', accountName: 'Spare Parts & Consumables Opening Stock', type: 'Asset', debit: 94500, credit: 0 },
    { code: '1500', accountName: 'Workshop Machinery (Lifts, Paint Booth, Compressors)', type: 'Asset', debit: 320000, credit: 0 },
    { code: '2010', accountName: 'Opening Accounts Payable (Suppliers Ledger)', type: 'Liability', debit: 0, credit: 42900 },
    { code: '2050', accountName: 'Customer Security Deposits', type: 'Liability', debit: 0, credit: 15000 },
    { code: '3010', accountName: "Owner's Capital / Retained Earnings", type: 'Equity', debit: 0, credit: 650000 },
  ]);

  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const totalDebit = accounts.reduce((s, a) => s + (a.debit || 0), 0);
  const totalCredit = accounts.reduce((s, a) => s + (a.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleUpdate = (index: number, field: 'debit' | 'credit', val: number) => {
    const updated = [...accounts];
    updated[index][field] = val;
    setAccounts(updated);
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs antialiased">
      <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Title Bar */}
        <div className="bg-[#1e4e79] text-white px-3 py-1.5 flex items-center justify-between font-bold select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>[Opening Balances &amp; Fiscal Year Initializer] - Fiscal Year {fiscalYear}</span>
          </div>
          <button onClick={onClose} className="text-white hover:text-red-200 cursor-pointer p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-slate-100 border-b border-slate-300 p-3 flex justify-between items-center text-xs">
          <div>
            <span className="font-semibold text-slate-800 block">General Ledger Opening Balance Migration</span>
            <p className="text-slate-600 text-[11px]">
              Enter beginning asset, liability, and equity balances. Total Debits must equal Total Credits.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-xs">Fiscal Year:</span>
            <select
              value={fiscalYear ?? ''}
              onChange={e => setFiscalYear(e.target.value)}
              className="h-7 px-2 border border-slate-300 rounded-xs bg-white font-mono font-bold"
            >
              <option value="2026">2026 (Active)</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="flex-1 overflow-y-auto p-3">
          <table className="w-full text-left border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-200 text-slate-800 text-[11px] font-semibold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 w-16">GL Code</th>
                <th className="p-2 border-r border-slate-300">Account Description</th>
                <th className="p-2 border-r border-slate-300 w-24">Type</th>
                <th className="p-2 border-r border-slate-300 text-right w-36">Debit ({settings.currencySymbol})</th>
                <th className="p-2 text-right w-36">Credit ({settings.currencySymbol})</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, idx) => (
                <tr key={acc.code} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-blue-900">{acc.code}</td>
                  <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{acc.accountName}</td>
                  <td className="p-2 border-r border-slate-200 text-slate-600">{acc.type}</td>
                  <td className="p-1 border-r border-slate-200 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={acc.debit || ''}
                      onChange={e => handleUpdate(idx, 'debit', parseFloat(e.target.value) || 0)}
                      className="w-full h-6 px-1.5 text-right font-mono font-semibold border border-slate-200 focus:border-blue-600 rounded-xs"
                    />
                  </td>
                  <td className="p-1 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={acc.credit || ''}
                      onChange={e => handleUpdate(idx, 'credit', parseFloat(e.target.value) || 0)}
                      className="w-full h-6 px-1.5 text-right font-mono font-semibold border border-slate-200 focus:border-blue-600 rounded-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                <td colSpan={3} className="p-2 text-right border-r border-slate-300">TOTAL TRIAL BALANCE:</td>
                <td className="p-2 text-right border-r border-slate-300 font-mono text-emerald-800">
                  {totalDebit.toLocaleString()} {settings.currencySymbol}
                </td>
                <td className="p-2 text-right font-mono text-emerald-800">
                  {totalCredit.toLocaleString()} {settings.currencySymbol}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Validation Banner */}
          <div className={`mt-3 p-2 rounded text-xs flex items-center justify-between ${
            isBalanced ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {isBalanced ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span className="font-semibold">
                {isBalanced ? 'Trial Balance is Balanced (Debits = Credits)' : `Out of balance by ${Math.abs(totalDebit - totalCredit).toLocaleString()} ${settings.currencySymbol}`}
              </span>
            </div>
            {isSaved && <span className="font-bold text-emerald-700">✓ Opening Balances Successfully Committed!</span>}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 py-2 border-t border-slate-300 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-white border border-slate-300 hover:bg-slate-200 text-slate-800 font-medium rounded-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isBalanced}
            className={`px-5 py-1 text-white font-semibold rounded-xs flex items-center gap-1.5 shadow-xs cursor-pointer ${
              isBalanced ? 'bg-[#1e4e79] hover:bg-[#163a5c]' : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Post Opening Balances</span>
          </button>
        </div>
      </div>
    </div>
  );
};
