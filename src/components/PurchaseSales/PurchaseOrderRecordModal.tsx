import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Truck, 
  Package, 
  CreditCard, 
  Receipt, 
  Paperclip, 
  History, 
  Plus, 
  Trash2, 
  Send, 
  PackageCheck, 
  XCircle, 
  Printer, 
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem, SupplierMasterItem, InventoryItem, GarageSettings } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { RecordAuditTrail } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';

export interface PurchaseOrderRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  poId?: string | null;
  onOpenGRN?: (poId: string) => void;
  onOpenSupplier?: (supplierId: string) => void;
}

export const PurchaseOrderRecordModal: React.FC<PurchaseOrderRecordModalProps> = ({
  isOpen,
  onClose,
  poId,
  onOpenGRN,
  onOpenSupplier
}) => {
  const { 
    purchaseOrders, 
    createPurchaseOrder, 
    updatePurchaseOrderStatus, 
    suppliers, 
    inventory, 
    settings,
    auditLogs 
  } = useGarage();

  const [selectedPoId, setSelectedPoId] = useState<string | null>(poId || null);
  const [activeTab, setActiveTab] = useState<
    'general' | 'supplier' | 'items' | 'delivery' | 'grns' | 'documents' | 'audit'
  >('general');

  // Form States
  const [docNumber, setDocNumber] = useState<string>('Loading...');
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('General Supplier');
  const [supplierContact, setSupplierContact] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<PurchaseOrder['status']>('Draft');
  const [paymentStatus, setPaymentStatus] = useState<'Unpaid' | 'Partial' | 'Paid'>('Unpaid');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [showPrintView, setShowPrintView] = useState(false);

  // UI Lifecycle
  const [isEditing, setIsEditing] = useState(!poId);
  const [isNew, setIsNew] = useState(!poId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setSelectedPoId(poId || null);
  }, [poId]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedPoId) {
      const po = purchaseOrders.find(p => p.id === selectedPoId);
      if (po) {
        setDocNumber(po.poNumber || 'PO-0001');
        setSupplierId(po.supplierId || '');
        setSupplierName(po.supplierName || 'General Supplier');
        setSupplierContact(po.supplierContact || '');
        setDate(po.date || new Date().toISOString().split('T')[0]);
        setExpectedDate(po.expectedDate || po.date || new Date().toISOString().split('T')[0]);
        setStatus(po.status || 'Draft');
        setPaymentStatus((po.paymentStatus as any) || 'Unpaid');
        setItems(po.items || []);
        setNotes(po.notes || '');
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setValidationError(null);
        setApiError(null);
        return;
      }
    }

    handleNewRecord();
  }, [selectedPoId, purchaseOrders, isOpen]);

  const handleNewRecord = () => {
    setSelectedPoId(null);
    setIsNew(true);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    const defaultSupp = suppliers[0];
    setSupplierId(defaultSupp?.id || '');
    setSupplierName(defaultSupp?.name || 'General Supplier');
    setSupplierContact(defaultSupp?.phone || '');
    setDate(new Date().toISOString().split('T')[0]);
    setExpectedDate(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
    setStatus('Draft');
    setPaymentStatus('Unpaid');
    setItems([]);
    setNotes('');
    setActiveTab('general');

    setDocNumber('Fetching next PO...');
    api.getNextDocumentNumber('PURCHASE_ORDER')
      .then(res => {
        if (res?.code) setDocNumber(res.code);
      })
      .catch(() => {
        setDocNumber('PO-0001');
      });
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantityOrdered ?? item.quantity ?? 1);
      const cost = Number(item.unitCost ?? 0);
      return sum + (Number(item.totalCost) || (qty * cost));
    }, 0);
  }, [items]);

  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return purchaseOrders.map(po => ({
      id: po.id,
      documentNumber: po.poNumber,
      title: `${po.poNumber} — ${po.supplierName}`,
      subtitle: `${po.items?.length || 0} item(s) • ${po.date}`,
      category: po.supplierName,
      status: po.status,
      total: po.totalAmount
    }));
  }, [purchaseOrders]);

  const currentIndex = selectedPoId ? purchaseOrders.findIndex(p => p.id === selectedPoId) : -1;
  const handleFirst = () => { if (purchaseOrders.length > 0) setSelectedPoId(purchaseOrders[0].id); };
  const handleLast = () => { if (purchaseOrders.length > 0) setSelectedPoId(purchaseOrders[purchaseOrders.length - 1].id); };
  const handleNext = () => { if (currentIndex > -1 && currentIndex < purchaseOrders.length - 1) setSelectedPoId(purchaseOrders[currentIndex + 1].id); };
  const handlePrevious = () => { if (currentIndex > 0) setSelectedPoId(purchaseOrders[currentIndex - 1].id); };

  const handleAddItem = () => {
    const firstInv = inventory[0];
    setItems(prev => [
      ...prev,
      {
        partId: firstInv?.id || `item-${Date.now()}`,
        sku: firstInv?.sku || 'SKU-NEW',
        name: firstInv?.name || 'New Spare Part Item',
        quantityOrdered: 1,
        quantity: 1,
        unitCost: Number(firstInv?.unitCost || 100),
        totalCost: Number(firstInv?.unitCost || 100),
        quantityReceived: 0
      }
    ]);
    setHasUnsavedChanges(true);
  };

  const handleUpdateItem = (index: number, updates: Partial<PurchaseOrderItem>) => {
    setItems(prev => {
      const next = [...prev];
      const cur = { ...next[index], ...updates };
      const qty = Number(cur.quantityOrdered ?? cur.quantity ?? 1);
      const cost = Number(cur.unitCost ?? 0);
      cur.totalCost = qty * cost;
      next[index] = cur;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!supplierName.trim()) {
      setValidationError('Supplier selection is required.');
      setActiveTab('supplier');
      return;
    }
    if (items.length === 0) {
      setValidationError('Purchase Order must have at least one line item.');
      setActiveTab('items');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<PurchaseOrder, 'id' | 'poNumber'> & { id?: string; poNumber?: string } = {
        supplierId: supplierId || undefined,
        supplierName: supplierName.trim(),
        supplierContact: supplierContact.trim() || undefined,
        date,
        expectedDate,
        status,
        paymentStatus,
        items,
        totalAmount,
        notes
      };

      if (isNew) {
        const created = await createPurchaseOrder(payload);
        setSelectedPoId(created.id);
        setDocNumber(created.poNumber);
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Purchase Order ${created.poNumber} created successfully.`);
      } else if (selectedPoId) {
        await api.updatePurchaseOrder(selectedPoId, payload);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Purchase Order ${docNumber} updated successfully.`);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('[PO] Save error:', err);
      setApiError(err?.message || 'Failed to save Purchase Order.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPoId) return;
    setIsDeleting(true);
    setApiError(null);
    try {
      await api.deletePurchaseOrder(selectedPoId);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setApiError(err?.message || 'Failed to delete Purchase Order.');
    }
  };

  const deleteBlockReason = status === 'Received' || status === 'Partially Received'
    ? `Purchase Order ${docNumber} has received items under Goods Receipt Note. Deletion is blocked.`
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <RecordManagementShell
          moduleTitle="Purchase Order"
          moduleSubtitle="Vendor procurement, spare parts order requisition and delivery receiving"
          moduleIcon={FileText}
          recordLabel="Purchase Order"
          documentNumber={docNumber}
          documentDate={date}
          status={status}
          statusType="po"
          companyName={settings.garageName}
          headerBadges={[
            { label: 'Supplier', value: supplierName, variant: 'primary' },
            { label: 'Expected', value: expectedDate, variant: 'mono' },
            { label: 'Items', value: items.length, variant: 'mono' },
            { label: 'Total Value', value: `QAR ${totalAmount.toLocaleString()}`, variant: 'success' }
          ]}
          isNew={isNew}
          isEditing={isEditing}
          isSaving={isSaving}
          isDeleting={isDeleting}
          hasSavedRecord={Boolean(selectedPoId)}
          hasUnsavedChanges={hasUnsavedChanges}
          validationError={validationError}
          apiError={apiError}
          successMessage={successMessage}
          tabs={[
            { id: 'general', label: 'General Information', icon: FileText },
            { id: 'supplier', label: 'Supplier', icon: Truck },
            { id: 'items', label: 'Ordered Items', icon: Package, count: items.length },
            { id: 'delivery', label: 'Delivery and Payment', icon: CreditCard },
            { id: 'grns', label: 'Goods Receipts', icon: PackageCheck },
            { id: 'documents', label: 'Documents', icon: Paperclip },
            { id: 'audit', label: 'Audit Trail', icon: History }
          ]}
          activeTab={activeTab}
          onTabChange={(t: any) => setActiveTab(t)}
          onNew={handleNewRecord}
          onSave={handleSave}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDelete}
          onCancel={() => {
            if (selectedPoId) setIsEditing(false);
            else onClose();
            setHasUnsavedChanges(false);
          }}
          onPrint={() => window.print()}
          onClose={onClose}
          canNavigate={purchaseOrders.length > 0}
          currentIndex={currentIndex}
          totalRecords={purchaseOrders.length}
          onFirst={handleFirst}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onLast={handleLast}
          searchRecords={searchRecords}
          onSelectSearchRecord={item => setSelectedPoId(item.id)}
          deleteBlockReason={deleteBlockReason}
          customActions={
            selectedPoId && (
              <div className="flex items-center space-x-1">
                {status === 'Draft' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setStatus('Submitted');
                      await updatePurchaseOrderStatus(selectedPoId, 'Ordered');
                      setSuccessMessage(`PO ${docNumber} submitted to vendor.`);
                    }}
                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Submit PO to vendor"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit PO</span>
                  </button>
                )}

                {(status === 'Draft' || status === 'Ordered' || (status as any) === 'Submitted' || status === 'Partially Received') && (
                  <button
                    type="button"
                    onClick={() => onOpenGRN?.(selectedPoId)}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Inward Goods Receipt Note (GRN)"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Create GRN</span>
                  </button>
                )}

                {status !== 'Cancelled' && status !== 'Received' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Cancel Purchase Order ${docNumber}?`)) {
                        setStatus('Cancelled');
                        await updatePurchaseOrderStatus(selectedPoId, 'Cancelled');
                        setSuccessMessage(`PO ${docNumber} cancelled.`);
                      }
                    }}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-sm flex items-center gap-1 cursor-pointer"
                    title="Cancel PO"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel PO</span>
                  </button>
                )}
              </div>
            )
          }
        >
          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                  Purchase Order Header & Dates
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PO Number</label>
                    <input
                      type="text"
                      disabled
                      value={docNumber ?? ''}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-black bg-slate-100 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Order Date *</label>
                    <input
                      type="date"
                      disabled={!isEditing}
                      value={date ?? ''}
                      onChange={e => { setDate(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Expected Delivery *</label>
                    <input
                      type="date"
                      disabled={!isEditing}
                      value={expectedDate ?? ''}
                      onChange={e => { setExpectedDate(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Workflow Status</label>
                    <select
                      disabled={!isEditing}
                      value={status ?? ''}
                      onChange={e => { setStatus(e.target.value as any); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Ordered">Submitted to Vendor</option>
                      <option value="Partially Received">Partially Received</option>
                      <option value="Received">Fully Received</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Order Memo & Procurement Notes</label>
                  <textarea
                    rows={3}
                    disabled={!isEditing}
                    value={notes ?? ''}
                    onChange={e => { setNotes(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="Urgent stock requisition for Land Cruiser brake overhaul job cards..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPLIER */}
          {activeTab === 'supplier' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                Vendor / Supplier Selection
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Registered Supplier *</label>
                  <select
                    disabled={!isEditing}
                    value={supplierId ?? ''}
                    onChange={e => {
                      const sId = e.target.value;
                      setSupplierId(sId);
                      const match = suppliers.find(s => s.id === sId);
                      if (match) {
                        setSupplierName(match.name);
                        setSupplierContact(match.phone);
                      }
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Contact Phone</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={supplierContact ?? ''}
                    onChange={e => { setSupplierContact(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="+974 4450 1234"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {supplierId && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{supplierName}</div>
                    <div className="text-[11px] text-slate-500">Linked Supplier ID: {supplierId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenSupplier?.(supplierId)}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-blue-700 font-bold text-xs rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Supplier Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORDERED ITEMS */}
          {activeTab === 'items' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Purchase Order Line Items</h3>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Item</span>
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">No items added to this purchase order</p>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      + Add First Part
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                      <tr>
                        <th className="p-2.5">Item / SKU</th>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5 text-center w-24">Order Qty</th>
                        <th className="p-2.5 text-center w-24">Received Qty</th>
                        <th className="p-2.5 text-right w-28">Unit Cost (QAR)</th>
                        <th className="p-2.5 text-right w-28">Total (QAR)</th>
                        {isEditing && <th className="p-2.5 text-center w-12">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2">
                            {isEditing ? (
                              <select
                                value={item.partId || item.sku}
                                onChange={e => {
                                  const sel = inventory.find(i => i.id === e.target.value || i.sku === e.target.value);
                                  if (sel) {
                                    handleUpdateItem(idx, {
                                      partId: sel.id,
                                      sku: sel.sku,
                                      name: sel.name,
                                      unitCost: Number(sel.unitCost || 100)
                                    });
                                  }
                                }}
                                className="w-full p-1 border rounded text-xs font-mono bg-white"
                              >
                                {inventory.map(inv => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.sku} - {inv.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-mono font-bold text-slate-900">{item.sku}</span>
                            )}
                          </td>
                          <td className="p-2 font-medium">{item.name}</td>
                          <td className="p-2 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min="1"
                                value={item.quantityOrdered ?? item.quantity ?? 1}
                                onChange={e => handleUpdateItem(idx, { quantityOrdered: Number(e.target.value), quantity: Number(e.target.value) })}
                                className="w-16 p-1 border rounded text-center font-mono font-bold bg-white"
                              />
                            ) : (
                              <span className="font-mono font-bold">{item.quantityOrdered ?? item.quantity ?? 1}</span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-emerald-700 font-bold">
                            {item.quantityReceived || 0}
                          </td>
                          <td className="p-2 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={item.unitCost ?? 0}
                                onChange={e => handleUpdateItem(idx, { unitCost: Number(e.target.value) })}
                                className="w-20 p-1 border rounded text-right font-mono font-bold bg-white"
                              />
                            ) : (
                              <span className="font-mono">QAR {item.unitCost}</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            QAR {item.totalCost || ((item.quantityOrdered ?? item.quantity ?? 1) * (item.unitCost ?? 0))}
                          </td>
                          {isEditing && (
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t font-bold">
                        <td colSpan={5} className="p-2.5 text-right uppercase text-slate-600">Grand Total:</td>
                        <td className="p-2.5 text-right font-mono text-sm text-slate-900 font-black">
                          QAR {totalAmount.toLocaleString()}
                        </td>
                        {isEditing && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DELIVERY AND PAYMENT */}
          {activeTab === 'delivery' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                Delivery Schedule & Payment Terms
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    disabled={!isEditing}
                    value={paymentStatus ?? ''}
                    onChange={e => { setPaymentStatus(e.target.value as any); setHasUnsavedChanges(true); }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="Unpaid">Unpaid (Awaiting GRN / Supplier Invoice)</option>
                    <option value="Partial">Partially Paid</option>
                    <option value="Paid">Paid in Full</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={expectedDate ?? ''}
                    onChange={e => { setExpectedDate(e.target.value); setHasUnsavedChanges(true); }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GOODS RECEIPTS */}
          {activeTab === 'grns' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Goods Receipts for {docNumber}</h3>
                {selectedPoId && (
                  <button
                    type="button"
                    onClick={() => onOpenGRN?.(selectedPoId)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Receive Inward Items (GRN)</span>
                  </button>
                )}
              </div>
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Goods receipts directly update inventory quantities</p>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Vendor Invoices & LPO Copies</h3>
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">No documents attached</p>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <RecordAuditTrail
                entries={auditLogs.filter((a: any) => 
                  a.record_id === selectedPoId || 
                  a.record_number === docNumber ||
                  (a.details && a.details.includes(docNumber))
                )}
                recordId={selectedPoId || undefined}
                recordNumber={docNumber}
                moduleName="Purchase Order"
              />
            </div>
          )}
        </RecordManagementShell>
      </div>
    </div>
  );
};
