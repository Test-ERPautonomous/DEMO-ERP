import React, { useState } from 'react';
import { useGarage } from '../../context/GarageContext';
import { 
  Building2, 
  Plus, 
  Check, 
  X, 
  RotateCcw, 
  Download, 
  AlertTriangle, 
  ShieldCheck, 
  Archive, 
  FolderPlus,
  ArrowRight,
  Trash2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { 
    companies, 
    activeCompanyId, 
    activeCompany, 
    switchCompany, 
    createCompany, 
    deleteCompany,
    resetCompanyData,
    jobCards,
    inventory,
    invoices,
    purchaseOrders,
    customers,
    settings
  } = useGarage();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'reset'>('list');

  // New Company form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newCr, setNewCr] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('Street 24, Industrial Area');
  const [formError, setFormError] = useState('');

  // Reset confirmation state
  const [confirmText, setConfirmText] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newCode.trim() || !newName.trim()) {
      setFormError('Company Code and Company Name are required.');
      return;
    }

    const cleanCode = newCode.trim().toUpperCase();
    if (companies.some(c => c.code.toUpperCase() === cleanCode)) {
      setFormError(`Company Code "${cleanCode}" already exists. Please pick a unique 3-4 character code.`);
      return;
    }

    const created = createCompany({
      code: cleanCode,
      name: newName.trim(),
      nameAr: newNameAr.trim() || undefined,
      crNumber: newCr.trim() || `CR-${cleanCode}-001`,
      phone: newPhone.trim() || '+974 4400 0000',
      email: newEmail.trim() || `admin@${cleanCode.toLowerCase()}.qa`,
      address: newAddress.trim() || 'Doha, State of Qatar',
      currencySymbol: 'QAR',
      tagline: 'Automotive Workshop Management System',
    });

    // Reset form
    setNewCode('');
    setNewName('');
    setNewNameAr('');
    setNewCr('');
    setNewPhone('');
    setNewEmail('');
    setActiveTab('list');
  };

  const handleResetCompany = () => {
    if (confirmText !== activeCompany.code) {
      return;
    }
    resetCompanyData(activeCompany.id);
    setResetSuccess(true);
    setConfirmText('');
    setTimeout(() => {
      setResetSuccess(false);
      setActiveTab('list');
    }, 2000);
  };

  const handleExportBackup = () => {
    const backupData = {
      company: activeCompany,
      settings,
      jobCards,
      inventory,
      invoices,
      purchaseOrders,
      customers,
      exportedAt: new Date().toISOString(),
      system: 'Automotive Workshop Management System ERP',
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCompany.code}_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs font-sans text-xs antialiased">
      <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[92vh]">
        {/* Title Bar */}
        <div className="bg-[#1e4e79] text-white px-3 py-1.5 flex items-center justify-between font-bold select-none">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-300" />
            <span>[Company Master &amp; Workspace Database Selector] - Co.Code: {activeCompany.code}</span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-200 cursor-pointer p-0.5"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1 rounded-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'list'
                  ? 'bg-[#1e4e79] text-white font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              Select / Switch Company ({companies.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1 rounded-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                activeTab === 'create'
                  ? 'bg-[#1e4e79] text-white font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> + New Company
            </button>
            <button
              onClick={() => setActiveTab('reset')}
              className={`px-3 py-1 rounded-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                activeTab === 'reset'
                  ? 'bg-rose-700 text-white font-semibold'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Data to Zero (0)
            </button>
          </div>

          <button
            onClick={handleExportBackup}
            className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xs flex items-center gap-1 text-[11px] cursor-pointer"
            title="Download JSON Database Backup"
          >
            <Download className="w-3 h-3 text-blue-600" /> Export Backup
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(92vh-100px)]">
          {/* TAB 1: Companies List */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xs text-[11px] text-emerald-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Enterprise Multi-Company Isolation:</strong> Each company operates with an isolated, secure database. All historical demo data and old company records have been permanently purged.
                </div>
              </div>

              <div className="space-y-2">
                {companies.map(comp => {
                  const isActive = comp.id === activeCompanyId;
                  return (
                    <div
                      key={comp.id}
                      className={`border rounded-sm p-3 transition-all flex items-center justify-between ${
                        isActive
                          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-sm flex items-center justify-center font-bold text-sm font-mono ${
                            isActive
                              ? 'bg-[#1875bb] text-white shadow-xs'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {comp.code}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{comp.name}</span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-semibold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> ACTIVE
                              </span>
                            )}
                          </div>

                          <div className="text-slate-500 text-[11px] mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>Code: <strong>{comp.code}</strong></span>
                            <span>•</span>
                            <span>CR: {comp.crNumber || 'N/A'}</span>
                            <span>•</span>
                            <span>Currency: {comp.currencySymbol}</span>
                            <span>•</span>
                            <span>Created: {comp.createdAt}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="text-[11px] font-semibold text-emerald-700 font-mono bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xs">
                            Current Active Database
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                switchCompany(comp.id);
                                onClose();
                              }}
                              className="px-3 py-1 bg-[#1e4e79] hover:bg-blue-800 text-white rounded-xs font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              Switch to this Company <ArrowRight className="w-3 h-3" />
                            </button>
                            {companies.length > 1 && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to permanently delete company "${comp.name}" (${comp.code}) and all its database records? This cannot be undone.`)) {
                                    deleteCompany(comp.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded cursor-pointer"
                                title={`Permanently delete company ${comp.code}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-between items-center text-slate-500 text-[11px] border-t border-slate-200">
                <span>Active Database: <strong>{activeCompany.name} ({activeCompany.code})</strong></span>
                <button
                  onClick={() => setActiveTab('create')}
                  className="text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                >
                  + Add another branch or company
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Create New Company */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateCompany} className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xs text-[11px] text-emerald-900 flex items-start gap-2">
                <FolderPlus className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Create Clean Company from Zero:</strong> This will register a new company profile with code and clean empty databases for Job Cards, Inventory, Invoices, Customers, Purchases, and Financials.
                </div>
              </div>

              {formError && (
                <div className="bg-rose-50 border border-rose-200 p-2 rounded-xs text-[11px] text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Code (e.g. AWS, NEW, BR1) *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newCode ?? ''}
                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AWS"
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Reg. (CR Number)</label>
                  <input
                    type="text"
                    value={newCr ?? ''}
                    onChange={e => setNewCr(e.target.value)}
                    placeholder="e.g. CR-2026/001"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Company Name (English) *</label>
                  <input
                    type="text"
                    value={newName ?? ''}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Automotive Workshop Management System W.L.L"
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Company Name (Arabic / Optional)</label>
                  <input
                    type="text"
                    value={newNameAr ?? ''}
                    onChange={e => setNewNameAr(e.target.value)}
                    placeholder="e.g. شركة ورشة صيانة السيارات ذ.م.م"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-hidden text-right"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone ?? ''}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+974 4400 0000"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newEmail ?? ''}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="info@workshop.qa"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Workshop Address &amp; Location</label>
                  <input
                    type="text"
                    value={newAddress ?? ''}
                    onChange={e => setNewAddress(e.target.value)}
                    placeholder="Street 24, Industrial Area, Doha, State of Qatar"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1e4e79] hover:bg-blue-800 text-white rounded-xs font-semibold cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" /> Initialize &amp; Start Company From Zero
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Reset Active Company to Zero */}
          {activeTab === 'reset' && (
            <div className="space-y-3">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xs text-[11px] text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-xs text-rose-800 block mb-1">Warning: Permanent Reset for Company "{activeCompany.name}" (Code: {activeCompany.code})</strong>
                  This action will clear all Job Cards, Customers, Vehicles, Inventory stock, Purchase Orders, and Invoices for <strong>{activeCompany.name} ({activeCompany.code})</strong> to completely zero (0).
                  <br />
                  Other companies will remain unaffected.
                </div>
              </div>

              {resetSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Success! Company {activeCompany.code} has been completely reset to zero (0).</span>
                </div>
              )}

              <div className="border border-slate-200 p-3 rounded bg-slate-50 space-y-2">
                <p className="text-slate-700 text-xs">
                  To confirm that you want to reset <strong>{activeCompany.name}</strong> to zero, type its Company Code <code className="bg-slate-200 px-1.5 py-0.5 rounded font-bold font-mono text-rose-700">{activeCompany.code}</code> below:
                </p>
                <input
                  type="text"
                  value={confirmText ?? ''}
                  onChange={e => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={`Type "${activeCompany.code}" to confirm`}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:border-rose-600 focus:outline-hidden bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirmText !== activeCompany.code}
                  onClick={handleResetCompany}
                  className={`px-4 py-1.5 rounded-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    confirmText === activeCompany.code
                      ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-2xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Wipe Transactions &amp; Start from Zero
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
