import React, { useState, useEffect } from 'react';
import { FinancialAccount, GarageSettings } from '../../types';
import { X, Building2, Wallet, Landmark, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null; // null if adding new
  settings: GarageSettings;
  onSave: (accountData: any) => Promise<void>;
}

export const ManageAccountModal: React.FC<Props> = ({
  isOpen,
  onClose,
  account,
  settings,
  onSave,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'cash' | 'bank'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setCode(account.code);
      setName(account.name);
      setType(account.type);
      setBankName(account.bankName || '');
      setAccountNumber(account.accountNumber || '');
      setOpeningBalance(account.openingBalance || 0);
      setIsActive(account.isActive ?? true);
    } else {
      setCode(`10${Math.floor(50 + Math.random() * 40)}`);
      setName('');
      setType('bank');
      setBankName('');
      setAccountNumber('');
      setOpeningBalance(0);
      setIsActive(true);
    }
    setError(null);
  }, [account, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Account code and account title are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        code: code.trim(),
        name: name.trim(),
        type,
        bankName: type === 'bank' ? bankName.trim() : '',
        accountNumber: accountNumber.trim(),
        currency: settings.currencySymbol || 'QAR',
        openingBalance: Number(openingBalance) || 0,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              {type === 'bank' ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {account ? 'Edit Cash / Bank Account' : 'New Cash or Bank Account'}
              </h3>
              <p className="text-xs text-slate-400">
                Workshop Financial Ledger Account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('bank')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                  type === 'bank'
                    ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Landmark className="w-4 h-4 text-sky-600" />
                Bank Account
              </button>
              <button
                type="button"
                onClick={() => setType('cash')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                  type === 'cash'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                Cash in Hand / Drawer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                GL Code *
              </label>
              <input
                type="text"
                required
                disabled={Boolean(account)}
                value={code ?? ''}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. 1010"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Title / Name *
              </label>
              <input
                type="text"
                required
                value={name ?? ''}
                onChange={e => setName(e.target.value)}
                placeholder={type === 'bank' ? 'e.g. QNB Current Account' : 'e.g. Workshop Petty Cash'}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          {type === 'bank' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Bank Institution Name
              </label>
              <input
                type="text"
                value={bankName ?? ''}
                onChange={e => setBankName(e.target.value)}
                placeholder="e.g. Qatar National Bank (QNB) / CBQ"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {type === 'bank' ? 'Bank Account / IBAN Number' : 'Drawer / Fund Identifier'}
            </label>
            <input
              type="text"
              value={accountNumber ?? ''}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder={type === 'bank' ? 'QA82QNBA00000000...' : 'DRAWER-COUNTER-01'}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          {!account && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Opening Balance ({settings.currencySymbol || 'QAR'})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingBalance ?? ''}
                onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Opening balance establishes starting ledger position.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-slate-700 select-none">
              Account Active for receipts and payments
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : account ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
