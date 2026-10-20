import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Receipt, 
  RotateCcw, 
  FileSpreadsheet, 
  History, 
  Plus, 
  Building, 
  CreditCard, 
  Printer, 
  ExternalLink,
  PackageCheck
} from 'lucide-react';
import { SupplierMasterItem, PurchaseOrder, SupplierLedgerEntry } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { RecordAuditTrail } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';
import { formatDate } from '../../utils/formatters';

export interface SupplierRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId?: string | null;
  onOpenPurchaseOrder?: (poId: string) => void;
  onCreatePOForSupplier?: (supplierId: string, supplierName: string) => void;
}

export const SupplierRecordModal: React.FC<SupplierRecordModalProps> = ({
  isOpen,
  onClose,
  supplierId,
  onOpenPurchaseOrder,
  onCreatePOForSupplier
}) => {
  const { 
    suppliers, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier, 
    purchaseOrders, 
    settings,
    auditLogs
  } = useGarage();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(supplierId || null);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'contact' | 'orders' | 'grns' | 'returns' | 'statement' | 'audit'
  >('profile');

  // Form States
  const [docNumber, setDocNumber] = useState<string>('Loading...');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState('OEM Parts');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [trn, setTrn] = useState('');
  const [location, setLocation] = useState('Industrial Area, St 24, Doha');
  const [terms, setTerms] = useState('Net 30');
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState('Active');

  // UI Lifecycle States
  const [isEditing, setIsEditing] = useState(!supplierId);
  const [isNew, setIsNew] = useState(!supplierId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    setSelectedSupplierId(supplierId || null);
  }, [supplierId]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedSupplierId) {
      const s = suppliers.find(item => item.id === selectedSupplierId);
      if (s) {
        setDocNumber((s as any).supplierNumber || (s as any).supplier_number || s.id || 'SU-0001');
        setName(s.name || '');
        setNameAr((s as any).nameAr || '');
        setCategory(s.category || 'OEM Parts');
        setContactPerson(s.contact || (s as any).contactPerson || '');
        setPhone(s.phone || '');
        setEmail(s.email || '');
        setCrNumber((s as any).crNumber || '');
        setTrn(s.taxId || (s as any).trn || '');
        setLocation(s.location || '');
        setTerms(s.terms || 'Net 30');
        setBalance(s.currentBalance || (s as any).balance || 0);
        setStatus('Active');
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setValidationError(null);
        setApiError(null);
        return;
      }
    }

    handleNewRecord();
  }, [selectedSupplierId, suppliers, isOpen]);

  const handleNewRecord = () => {
    setSelectedSupplierId(null);
    setIsNew(true);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    setName('');
    setNameAr('');
    setCategory('OEM Parts');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setCrNumber('');
    setTrn('');
    setLocation('Industrial Area, St 24, Doha');
    setTerms('Net 30');
    setBalance(0);
    setStatus('Active');
    setActiveTab('profile');

    setDocNumber('Fetching next SU...');
    api.getNextDocumentNumber('SUPPLIER')
      .then(res => {
        if (res?.code) setDocNumber(res.code);
      })
      .catch(() => {
        setDocNumber('SU-0001');
      });
  };

  // Associated Data
  const currentSupplier = selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId) : null;
  const currentSupplierName = (currentSupplier?.name || '').toLowerCase();
  const supplierPOs = useMemo(() => {
    if (!currentSupplier) return [];
    return purchaseOrders.filter(po => 
      po.supplierId === currentSupplier.id || 
      (po.supplierName && currentSupplierName && po.supplierName.toLowerCase() === currentSupplierName)
    );
  }, [purchaseOrders, currentSupplier, currentSupplierName]);

  const totalOrdered = supplierPOs.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const totalPaid = supplierPOs.filter(po => po.paymentStatus === 'Paid').reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const currentPayableBalance = totalOrdered - totalPaid;

  // Search items for Find modal
  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return suppliers.map(s => ({
      id: s.id,
      documentNumber: (s as any).supplierNumber || s.id,
      title: s.name,
      subtitle: s.category || s.location,
      phone: s.phone,
      category: s.category,
      status: 'Active',
      balance: s.currentBalance
    }));
  }, [suppliers]);

  // Navigation logic
  const currentIndex = selectedSupplierId ? suppliers.findIndex(s => s.id === selectedSupplierId) : -1;
  const handleFirst = () => { if (suppliers.length > 0) setSelectedSupplierId(suppliers[0].id); };
  const handleLast = () => { if (suppliers.length > 0) setSelectedSupplierId(suppliers[suppliers.length - 1].id); };
  const handleNext = () => { if (currentIndex > -1 && currentIndex < suppliers.length - 1) setSelectedSupplierId(suppliers[currentIndex + 1].id); };
  const handlePrevious = () => { if (currentIndex > 0) setSelectedSupplierId(suppliers[currentIndex - 1].id); };

  // Save handler
  const handleSave = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setValidationError('Supplier Name is required.');
      setActiveTab('profile');
      return;
    }
    if (!phone.trim()) {
      setValidationError('Supplier Phone number is required.');
      setActiveTab('contact');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<SupplierMasterItem, 'id'> & { id?: string; supplierNumber?: string; nameAr?: string; crNumber?: string } = {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
        category: category.trim() || 'OEM Parts',
        contact: contactPerson.trim() || name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        location: location.trim() || 'Doha',
        terms: terms.trim() || 'Net 30',
        crNumber: crNumber.trim() || undefined,
        taxId: trn.trim() || undefined,
        currentBalance: currentPayableBalance
      };

      if (isNew) {
        const created = await addSupplier(payload);
        setSelectedSupplierId(created.id);
        setDocNumber((created as any).supplierNumber || created.id);
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Supplier ${created.name} added successfully.`);
      } else if (selectedSupplierId) {
        await updateSupplier(selectedSupplierId, payload);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Supplier ${name} updated successfully.`);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('[SupplierRecordModal] Save error:', err);
      setApiError(err?.message || 'Failed to save supplier record.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!selectedSupplierId) return;
    setIsDeleting(true);
    setApiError(null);
    try {
      await deleteSupplier(selectedSupplierId);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setApiError(err?.message || 'Failed to delete supplier.');
    }
  };

  // Dependency Guard for Deletion
  const deleteBlockReason = supplierPOs.length > 0
    ? `This supplier is referenced by ${supplierPOs.length} Purchase Order(s). Deletion is blocked to preserve purchasing history.`
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <RecordManagementShell
          moduleTitle="Supplier Master"
          moduleSubtitle="Vendor catalog, OEM procurement accounts, credit terms and purchase ledger"
          moduleIcon={Truck}
          recordLabel="Supplier"
          documentNumber={docNumber}
          documentDate={new Date().toISOString().split('T')[0]}
          status={status}
          statusType="supplier"
          companyName={settings.garageName}
          headerBadges={[
            { label: 'Category', value: category, variant: 'primary' },
            { label: 'Terms', value: terms, variant: 'mono' },
            { label: 'POs', value: supplierPOs.length, variant: 'mono' },
            { label: 'Payable Balance', value: `QAR ${currentPayableBalance.toLocaleString()}`, variant: currentPayableBalance > 0 ? 'warning' : 'success' }
          ]}
          isNew={isNew}
          isEditing={isEditing}
          isSaving={isSaving}
          isDeleting={isDeleting}
          hasSavedRecord={Boolean(selectedSupplierId)}
          hasUnsavedChanges={hasUnsavedChanges}
          validationError={validationError}
          apiError={apiError}
          successMessage={successMessage}
          tabs={[
            { id: 'profile', label: 'Supplier Profile', icon: Truck },
            { id: 'contact', label: 'Contact Details', icon: Phone },
            { id: 'orders', label: 'Purchase Orders', icon: FileText, count: supplierPOs.length },
            { id: 'grns', label: 'Goods Receipts (GRN)', icon: PackageCheck },
            { id: 'returns', label: 'Returns & Credit', icon: RotateCcw },
            { id: 'statement', label: 'Account Statement', icon: FileSpreadsheet },
            { id: 'audit', label: 'Audit Trail', icon: History }
          ]}
          activeTab={activeTab}
          onTabChange={(t: any) => setActiveTab(t)}
          onNew={handleNewRecord}
          onSave={handleSave}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDelete}
          onCancel={() => {
            if (selectedSupplierId) {
              setIsEditing(false);
            } else {
              onClose();
            }
            setHasUnsavedChanges(false);
          }}
          onPrint={() => window.print()}
          onClose={onClose}
          canNavigate={suppliers.length > 0}
          currentIndex={currentIndex}
          totalRecords={suppliers.length}
          onFirst={handleFirst}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onLast={handleLast}
          searchRecords={searchRecords}
          onSelectSearchRecord={item => setSelectedSupplierId(item.id)}
          deleteBlockReason={deleteBlockReason}
          customActions={
            selectedSupplierId && (
              <button
                type="button"
                onClick={() => onCreatePOForSupplier?.(selectedSupplierId, name)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Create new Purchase Order for this supplier"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New PO</span>
              </button>
            )
          }
        >
          {/* TAB 1: SUPPLIER PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                  Vendor Details & Trade Terms
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier / Company Name *
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={name ?? ''}
                      onChange={e => { setName(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="e.g. Doha Auto Spare Parts W.L.L."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Arabic Name
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={nameAr ?? ''}
                      onChange={e => { setNameAr(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="شركة الدوحة لقطع الغيار"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-arabic text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Part Category / Specialty
                    </label>
                    <select
                      disabled={!isEditing}
                      value={category ?? ''}
                      onChange={e => { setCategory(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    >
                      <option value="OEM Parts">OEM Genuine Parts (Toyota/Nissan)</option>
                      <option value="Aftermarket">Aftermarket & OEM Replacement</option>
                      <option value="Body & Paints">Body Collision & Paint Booth Supplies</option>
                      <option value="Lubricants & Fluids">Lubricants, Oils & Filters</option>
                      <option value="Tires & Batteries">Tires, Batteries & Electrical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Terms
                    </label>
                    <select
                      disabled={!isEditing}
                      value={terms ?? ''}
                      onChange={e => { setTerms(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    >
                      <option value="Immediate Cash">Immediate Cash (COD)</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Commercial Registration (CR No.)
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={crNumber ?? ''}
                      onChange={e => { setCrNumber(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="CR: 84920"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT DETAILS */}
          {activeTab === 'contact' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                Supplier Representative & Warehouse
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sales Contact Person
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={contactPerson ?? ''}
                    onChange={e => { setContactPerson(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="e.g. Tariq Mahmoud (Sales Rep)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={phone ?? ''}
                    onChange={e => { setPhone(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="+974 4450 1234"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={email ?? ''}
                    onChange={e => { setEmail(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="orders@dohaautoparts.qa"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Warehouse / Store Location
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={location ?? ''}
                    onChange={e => { setLocation(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="Industrial Area, Street 24, Doha"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PURCHASE ORDERS */}
          {activeTab === 'orders' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Purchase Orders ({supplierPOs.length})</h3>
                {selectedSupplierId && (
                  <button
                    type="button"
                    onClick={() => onCreatePOForSupplier?.(selectedSupplierId, name)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Purchase Order</span>
                  </button>
                )}
              </div>

              {supplierPOs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">No purchase orders placed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supplierPOs.map(po => (
                    <div
                      key={po.id}
                      onClick={() => onOpenPurchaseOrder?.(po.id)}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/40 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-amber-700">{po.poNumber}</span>
                        <span className="text-xs text-slate-500 ml-2">{formatDate(po.date)} • {po.items?.length || 0} item(s)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs">QAR {(po.totalAmount || 0).toLocaleString()}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 font-semibold">{po.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GRNs */}
          {activeTab === 'grns' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Goods Receipt Notes (GRN)</h3>
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Receipt notes recorded upon warehouse delivery</p>
              </div>
            </div>
          )}

          {/* TAB 5: RETURNS */}
          {activeTab === 'returns' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Part Returns & Debit Memos</h3>
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">No active return credits</p>
              </div>
            </div>
          )}

          {/* TAB 6: STATEMENT */}
          {activeTab === 'statement' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Vendor Account Statement</h3>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>View Statement</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Total Orders</div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">QAR {totalOrdered.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs text-emerald-700 font-semibold">Total Paid to Vendor</div>
                  <div className="text-lg font-black font-mono text-emerald-800 mt-1">QAR {totalPaid.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-xs text-amber-800 font-semibold">Current Payable Balance</div>
                  <div className="text-lg font-black font-mono text-amber-900 mt-1">QAR {currentPayableBalance.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <RecordAuditTrail
                entries={auditLogs.filter((a: any) => 
                  a.record_id === selectedSupplierId || 
                  a.record_number === docNumber ||
                  (a.details && a.details.includes(name))
                )}
                recordId={selectedSupplierId || undefined}
                recordNumber={docNumber}
                moduleName="Supplier"
              />
            </div>
          )}
        </RecordManagementShell>
      </div>
    </div>
  );
};
