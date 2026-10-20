import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Car, 
  FileText, 
  Receipt, 
  CreditCard, 
  Calculator, 
  History, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  ExternalLink,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { CustomerMasterItem, JobCard, Invoice, VehicleMasterItem, EstimationItem } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { formatDate } from '../../utils/formatters';
import { RecordAuditTrail } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';

export interface CustomerRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string | null;
  onOpenJobCard?: (jobCardId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onOpenVehicle?: (vehicleId: string) => void;
  onCreateJobForCustomer?: (customerId: string, customerName: string) => void;
  onCreateInvoiceForCustomer?: (customerId: string, customerName: string) => void;
  onAddVehicleForCustomer?: (customerId: string, customerName: string) => void;
}

export const CustomerRecordModal: React.FC<CustomerRecordModalProps> = ({
  isOpen,
  onClose,
  customerId,
  onOpenJobCard,
  onOpenInvoice,
  onOpenVehicle,
  onCreateJobForCustomer,
  onCreateInvoiceForCustomer,
  onAddVehicleForCustomer
}) => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    vehicles, 
    jobCards, 
    invoices, 
    estimates,
    settings,
    auditLogs
  } = useGarage();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customerId || null);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'contact' | 'vehicles' | 'jobs' | 'estimates' | 'invoices' | 'payments' | 'statement' | 'audit'
  >('profile');

  // Form States
  const [docNumber, setDocNumber] = useState<string>('Loading...');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [fax, setFax] = useState('');
  const [qid, setQid] = useState('');
  const [trn, setTrn] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Doha');
  const [accountType, setAccountType] = useState<'Cash' | 'Credit'>('Cash');
  const [creditLimit, setCreditLimit] = useState(5000);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Active');

  // UI Lifecycle
  const [isEditing, setIsEditing] = useState(!customerId);
  const [isNew, setIsNew] = useState(!customerId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  // Sync selectedCustomerId when prop changes
  useEffect(() => {
    setSelectedCustomerId(customerId || null);
  }, [customerId]);

  // Load record data when selectedCustomerId changes
  useEffect(() => {
    if (!isOpen) return;

    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        setDocNumber(cust.id || 'CU-0001');
        setName(cust.name || '');
        setNameAr(cust.nameAr || '');
        setContactPerson(cust.contact || '');
        setPhone(cust.phone || '');
        setTelephone(cust.telephone || '');
        setEmail(cust.email || '');
        setFax(cust.fax || '');
        setQid(cust.qid || '');
        setAddress(cust.address || cust.city || '');
        setCity(cust.city || 'Doha');
        setAccountType((cust.accountType as any) || 'Cash');
        setCreditLimit(cust.creditLimit || 5000);
        setNotes(cust.notes || '');
        setStatus('Active');
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setValidationError(null);
        setApiError(null);
        return;
      }
    }

    // New blank record
    handleNewRecord();
  }, [selectedCustomerId, customers, isOpen]);

  const handleNewRecord = () => {
    setSelectedCustomerId(null);
    setIsNew(true);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    setName('');
    setNameAr('');
    setContactPerson('');
    setPhone('');
    setTelephone('');
    setEmail('');
    setFax('');
    setQid('');
    setTrn('');
    setAddress('');
    setCity('Doha');
    setAccountType('Cash');
    setCreditLimit(5000);
    setNotes('');
    setStatus('Active');
    setActiveTab('profile');

    setDocNumber('Fetching next CU...');
    api.getNextDocumentNumber('CUSTOMER')
      .then(res => {
        if (res?.code) setDocNumber(res.code);
      })
      .catch(() => {
        setDocNumber('CU-0001');
      });
  };

  // Associated Data
  const currentCustomer = selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) : null;
  const currentCustomerName = (currentCustomer?.name || '').toLowerCase();

  const customerVehicles = useMemo(() => {
    if (!currentCustomer) return [];
    return vehicles.filter(v => 
      v.customerId === currentCustomer.id || 
      (v.customerName && currentCustomerName && v.customerName.toLowerCase() === currentCustomerName) ||
      (v.customerPhone && currentCustomer.phone && v.customerPhone === currentCustomer.phone)
    );
  }, [vehicles, currentCustomer, currentCustomerName]);

  const customerJobCards = useMemo(() => {
    if (!currentCustomer) return [];
    return jobCards.filter(j => 
      j.customer?.id === currentCustomer.id || 
      (j.customer?.name && currentCustomerName && j.customer.name.toLowerCase() === currentCustomerName) ||
      (j.customerName && currentCustomerName && j.customerName.toLowerCase() === currentCustomerName) ||
      ((j.customer?.phone || j.customerPhone) && currentCustomer.phone && (j.customer?.phone || j.customerPhone) === currentCustomer.phone)
    );
  }, [jobCards, currentCustomer, currentCustomerName]);

  const customerInvoices = useMemo(() => {
    if (!currentCustomer) return [];
    return invoices.filter(inv => 
      (inv.customerName && currentCustomerName && inv.customerName.toLowerCase() === currentCustomerName) ||
      (inv.customerPhone && currentCustomer.phone && inv.customerPhone === currentCustomer.phone)
    );
  }, [invoices, currentCustomer, currentCustomerName]);

  const customerEstimates = useMemo(() => {
    if (!currentCustomer) return [];
    return estimates.filter(est => 
      (est.customerName && currentCustomerName && est.customerName.toLowerCase() === currentCustomerName) ||
      (est.customerPhone && currentCustomer.phone && est.customerPhone === currentCustomer.phone)
    );
  }, [estimates, currentCustomer, currentCustomerName]);

  // Financial aggregates
  const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0);
  const totalPaid = customerInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const currentBalance = totalInvoiced - totalPaid;

  // Search items for Find modal
  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return customers.map(c => ({
      id: c.id,
      documentNumber: c.id,
      title: c.name,
      subtitle: c.contact || c.city,
      phone: c.phone,
      category: c.accountType,
      status: 'Active',
      balance: c.balance
    }));
  }, [customers]);

  // Navigation logic
  const currentIndex = selectedCustomerId ? customers.findIndex(c => c.id === selectedCustomerId) : -1;
  const handleFirst = () => { if (customers.length > 0) setSelectedCustomerId(customers[0].id); };
  const handleLast = () => { if (customers.length > 0) setSelectedCustomerId(customers[customers.length - 1].id); };
  const handleNext = () => { if (currentIndex > -1 && currentIndex < customers.length - 1) setSelectedCustomerId(customers[currentIndex + 1].id); };
  const handlePrevious = () => { if (currentIndex > 0) setSelectedCustomerId(customers[currentIndex - 1].id); };

  // Save handler
  const handleSave = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setValidationError('Customer Name is required.');
      setActiveTab('profile');
      return;
    }
    if (!phone.trim()) {
      setValidationError('Customer Phone / Mobile number is required.');
      setActiveTab('profile');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<CustomerMasterItem, 'id'> & { id?: string; customerId?: string; customerNumber?: string } = {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
        contact: contactPerson.trim() || name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        qid: qid.trim() || '',
        accountType,
        creditLimit: Number(creditLimit) || 5000,
        balance: currentBalance,
        city: city.trim() || 'Doha',
      };

      if (isNew) {
        const created = await addCustomer(payload);
        setSelectedCustomerId(created.id);
        setDocNumber(created.id);
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Customer ${created.name} (${created.id}) created and saved successfully.`);
      } else if (selectedCustomerId) {
        await updateCustomer(selectedCustomerId, payload);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Customer ${name} updated successfully.`);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('[CustomerRecordModal] Save error:', err);
      setApiError(err?.message || 'Failed to save customer record to backend.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!selectedCustomerId) return;
    setIsDeleting(true);
    setApiError(null);
    try {
      await deleteCustomer(selectedCustomerId);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setApiError(err?.message || 'Failed to delete customer.');
    }
  };

  // Dependency Guard for Deletion
  const hasTransactions = customerJobCards.length > 0 || customerInvoices.length > 0;
  const deleteBlockReason = hasTransactions
    ? `This customer is referenced by ${customerJobCards.length} Job Card(s) and ${customerInvoices.length} Invoice(s). Deletion is blocked to preserve audit trail.`
    : null;

  if (!isOpen) return null;

  // Print layout view
  if (showPrintView && currentCustomer) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <NajmAlHudaLogo />
              <div>
                <h1 className="text-xl font-black text-slate-900">{settings.garageName}</h1>
                <p className="text-xs text-slate-500">Customer Account Statement & Profile</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-slate-900">{docNumber}</div>
              <div className="text-xs text-slate-500">{formatDate(new Date())}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-xl border">
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Customer Details</h3>
              <p><strong>Name:</strong> {currentCustomer.name} {currentCustomer.nameAr && `(${currentCustomer.nameAr})`}</p>
              <p><strong>Phone:</strong> {currentCustomer.phone}</p>
              <p><strong>Email:</strong> {currentCustomer.email || '-'}</p>
              <p><strong>Address:</strong> {currentCustomer.address || currentCustomer.city || '-'}</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Account Status</h3>
              <p><strong>Account Type:</strong> {currentCustomer.accountType}</p>
              <p><strong>Credit Limit:</strong> QAR {(currentCustomer.creditLimit || 0).toLocaleString()}</p>
              <p><strong>Total Invoiced:</strong> QAR {totalInvoiced.toLocaleString()}</p>
              <p className="text-sm font-bold text-rose-700 mt-1"><strong>Outstanding Balance:</strong> QAR {currentBalance.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Invoices & Transactions</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-2 text-left">Invoice No</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">Paid</th>
                  <th className="p-2 text-right">Balance</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {customerInvoices.map(inv => (
                  <tr key={inv.id} className="border-b">
                    <td className="p-2 font-mono font-bold">{inv.invoiceNumber}</td>
                    <td className="p-2">{formatDate(inv.date)}</td>
                    <td className="p-2 text-right font-mono">QAR {(inv.grandTotal || 0).toLocaleString()}</td>
                    <td className="p-2 text-right font-mono text-emerald-700">QAR {(inv.paidAmount || 0).toLocaleString()}</td>
                    <td className="p-2 text-right font-mono text-rose-700">QAR {(inv.balanceAmount || 0).toLocaleString()}</td>
                    <td className="p-2 text-center">{inv.paymentStatus || 'Unpaid'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-6 print:hidden">
            <button
              onClick={() => setShowPrintView(false)}
              className="px-4 py-2 border rounded-xl font-bold text-xs"
            >
              Back to Form
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-xs"
            >
              Print Statement
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <RecordManagementShell
          moduleTitle="Customer Master"
          moduleSubtitle="Automotive customer profile, credit terms, vehicles and account history"
          moduleIcon={Users}
          recordLabel="Customer"
          documentNumber={docNumber}
          documentDate={currentCustomer?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]}
          status={status}
          statusType="customer"
          companyName={settings.garageName}
          headerBadges={[
            { label: 'Account', value: accountType, variant: accountType === 'Credit' ? 'purple' : 'primary' },
            { label: 'Vehicles', value: customerVehicles.length, variant: 'mono' },
            { label: 'Job Cards', value: customerJobCards.length, variant: 'mono' },
            { label: 'Balance', value: `QAR ${currentBalance.toLocaleString()}`, variant: currentBalance > 0 ? 'warning' : 'success' }
          ]}
          isNew={isNew}
          isEditing={isEditing}
          isSaving={isSaving}
          isDeleting={isDeleting}
          hasSavedRecord={Boolean(selectedCustomerId)}
          hasUnsavedChanges={hasUnsavedChanges}
          validationError={validationError}
          apiError={apiError}
          successMessage={successMessage}
          tabs={[
            { id: 'profile', label: 'Customer Profile', icon: Users },
            { id: 'contact', label: 'Contact Details', icon: Phone },
            { id: 'vehicles', label: 'Vehicles', icon: Car, count: customerVehicles.length },
            { id: 'jobs', label: 'Job Cards', icon: FileText, count: customerJobCards.length },
            { id: 'estimates', label: 'Estimates', icon: Calculator, count: customerEstimates.length },
            { id: 'invoices', label: 'Invoices', icon: Receipt, count: customerInvoices.length },
            { id: 'payments', label: 'Payments', icon: DollarSign },
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
            if (selectedCustomerId) {
              const cust = customers.find(c => c.id === selectedCustomerId);
              if (cust) {
                setName(cust.name);
                setPhone(cust.phone);
              }
              setIsEditing(false);
            } else {
              onClose();
            }
            setHasUnsavedChanges(false);
          }}
          onPrint={() => setShowPrintView(true)}
          onClose={onClose}
          canNavigate={customers.length > 0}
          currentIndex={currentIndex}
          totalRecords={customers.length}
          onFirst={handleFirst}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onLast={handleLast}
          searchRecords={searchRecords}
          onSelectSearchRecord={item => setSelectedCustomerId(item.id)}
          deleteBlockReason={deleteBlockReason}
          customActions={
            selectedCustomerId && (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => onAddVehicleForCustomer?.(selectedCustomerId, name)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-sm border border-slate-300 flex items-center gap-1 cursor-pointer"
                  title="Register new vehicle for this customer"
                >
                  <Car className="w-3.5 h-3.5 text-slate-600" />
                  <span>+ Vehicle</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCreateJobForCustomer?.(selectedCustomerId, name)}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-sm border border-blue-200 flex items-center gap-1 cursor-pointer"
                  title="Create new Job Card"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Job Card</span>
                </button>
              </div>
            )
          }
        >
          {/* TAB 1: CUSTOMER PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                  Core Customer Identification
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer Name (English) *
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={name || ''}
                      onChange={e => { setName(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="e.g. Nasser Al-Kuwari"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer Name (Arabic)
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={nameAr || ''}
                      onChange={e => { setNameAr(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="ناصر الكواري"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-arabic text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer ID / Number
                    </label>
                    <input
                      type="text"
                      disabled
                      value={docNumber || ''}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-slate-100 text-slate-700"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Qatar ID (QID) / CR No.
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={qid || ''}
                      onChange={e => { setQid(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="28463400192"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Account & Credit Terms */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                  Billing & Credit Facility
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Type
                    </label>
                    <select
                      disabled={!isEditing}
                      value={accountType || 'Cash'}
                      onChange={e => { setAccountType(e.target.value as any); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    >
                      <option value="Cash">Cash Customer (Immediate Payment)</option>
                      <option value="Credit">Credit / Corporate Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Credit Limit (QAR)
                    </label>
                    <input
                      type="number"
                      disabled={!isEditing || accountType === 'Cash'}
                      value={creditLimit ?? 5000}
                      onChange={e => { setCreditLimit(Number(e.target.value)); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Current Outstanding Balance
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-black text-slate-800">
                      QAR {currentBalance.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Special Terms / Internal Customer Notes
                  </label>
                  <textarea
                    rows={3}
                    disabled={!isEditing}
                    value={notes || ''}
                    onChange={e => { setNotes(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="VIP Customer, requires synthetic oil only, fleet account terms..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT DETAILS */}
          {activeTab === 'contact' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                Contact Numbers & Address
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile / Phone Number *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={phone || ''}
                    onChange={e => { setPhone(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="+974 5512 3456"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telephone (Landline)
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={telephone || ''}
                    onChange={e => { setTelephone(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="+974 4450 1234"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
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
                    value={email || ''}
                    onChange={e => { setEmail(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="nasser@alkuwari.qa"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Person / Representative
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={contactPerson || ''}
                    onChange={e => { setContactPerson(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="e.g. Tariq Mahmoud (Fleet Mgr)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Street Address / Villa / Building
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={address || ''}
                    onChange={e => { setAddress(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="Building 42, Street 810, Zone 66"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City / Zone
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={city || ''}
                    onChange={e => { setCity(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="West Bay, Doha"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VEHICLES */}
          {activeTab === 'vehicles' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span>Customer Vehicles ({customerVehicles.length})</span>
                </h3>
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => onAddVehicleForCustomer?.(selectedCustomerId, name)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Vehicle</span>
                  </button>
                )}
              </div>

              {customerVehicles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <Car className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">No vehicles registered</p>
                  <p className="text-xs text-slate-500 mt-1">Register vehicle with Qatar plate number and VIN.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customerVehicles.map(v => (
                    <div
                      key={v.id}
                      onClick={() => onOpenVehicle?.(v.id)}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-200 border border-slate-300 inline-block text-slate-900">
                          {v.plateNumber || 'NO PLATE'}
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {v.make} {v.model}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {v.yearFrom} • {v.color || 'Standard'} • VIN: {v.vin || '-'}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: JOB CARDS */}
          {activeTab === 'jobs' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Job Cards History ({customerJobCards.length})</span>
                </h3>
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => onCreateJobForCustomer?.(selectedCustomerId, name)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Job Card</span>
                  </button>
                )}
              </div>

              {customerJobCards.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">No Job Cards found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerJobCards.map(j => (
                    <div
                      key={j.id}
                      onClick={() => onOpenJobCard?.(j.id)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                          {j.jobNumber}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{j.vehicle?.plateNumber} • {j.vehicle?.make} {j.vehicle?.model}</div>
                          <div className="text-[11px] text-slate-500">{formatDate(j.dateIn)} • Tech: {j.assignedTechnician}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs text-slate-900">QAR {(j.totalAmount || 0).toLocaleString()}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">{j.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ESTIMATES */}
          {activeTab === 'estimates' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Customer Estimates ({customerEstimates.length})</h3>
              {customerEstimates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">No estimates found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerEstimates.map(e => (
                    <div key={e.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-mono font-bold text-xs text-slate-900">{e.estimateNumber}</div>
                        <div className="text-[11px] text-slate-500">{formatDate(e.date)} • {e.vehicleModel} ({e.plateNumber})</div>
                      </div>
                      <div className="font-mono font-bold text-xs text-slate-900">QAR {e.total.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>Customer Invoices ({customerInvoices.length})</span>
                </h3>
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => onCreateInvoiceForCustomer?.(selectedCustomerId, name)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Invoice</span>
                  </button>
                )}
              </div>

              {customerInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">No invoices issued</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerInvoices.map(inv => (
                    <div
                      key={inv.id}
                      onClick={() => onOpenInvoice?.(inv.id)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono font-bold text-xs text-slate-900">{inv.invoiceNumber}</div>
                        <div className="text-[11px] text-slate-500">{formatDate(inv.date)} • Vehicle: {inv.vehiclePlate || '-'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono text-xs">
                          <div className="font-bold text-slate-900">QAR {(inv.grandTotal || 0).toLocaleString()}</div>
                          <div className="text-[10px] text-emerald-700">Paid: {(inv.paidAmount || 0).toLocaleString()}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.paymentStatus || 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Payment Receipts & Credits</h3>
              <div className="p-4 bg-slate-50 rounded-xl border text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b">
                  <span>Total Payments Settled</span>
                  <strong className="font-mono text-emerald-700 font-bold">QAR {totalPaid.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Pending Invoice Receivables</span>
                  <strong className="font-mono text-rose-700 font-bold">QAR {currentBalance.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ACCOUNT STATEMENT */}
          {activeTab === 'statement' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Financial Statement of Account</h3>
                <button
                  type="button"
                  onClick={() => setShowPrintView(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>View Statement</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Total Invoiced</div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">QAR {totalInvoiced.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs text-emerald-700 font-semibold">Total Paid</div>
                  <div className="text-lg font-black font-mono text-emerald-800 mt-1">QAR {totalPaid.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-xs text-rose-700 font-semibold">Current Balance Due</div>
                  <div className="text-lg font-black font-mono text-rose-800 mt-1">QAR {currentBalance.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <RecordAuditTrail
                entries={auditLogs.filter((a: any) => 
                  a.record_id === selectedCustomerId || 
                  a.record_number === docNumber ||
                  (a.details && a.details.includes(name))
                )}
                recordId={selectedCustomerId || undefined}
                recordNumber={docNumber}
                moduleName="Customer"
              />
            </div>
          )}
        </RecordManagementShell>
      </div>
    </div>
  );
};
