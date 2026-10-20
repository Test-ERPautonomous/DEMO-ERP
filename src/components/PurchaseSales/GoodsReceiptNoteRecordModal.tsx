import React, { useState, useEffect, useMemo } from 'react';
import { 
  PackageCheck, 
  FileText, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  History, 
  ArrowRight, 
  Printer, 
  ExternalLink,
  Plus,
  Boxes
} from 'lucide-react';
import { PurchaseOrder, InventoryItem, GarageSettings } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { formatDate } from '../../utils/formatters';
import { RecordAuditTrail } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';

export interface GoodsReceiptNoteRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPoId?: string | null;
  onOpenPO?: (poId: string) => void;
}

export const GoodsReceiptNoteRecordModal: React.FC<GoodsReceiptNoteRecordModalProps> = ({
  isOpen,
  onClose,
  initialPoId,
  onOpenPO
}) => {
  const { 
    purchaseOrders, 
    inventory, 
    receivePOItems, 
    settings,
    auditLogs 
  } = useGarage();

  const [activeTab, setActiveTab] = useState<
    'info' | 'po' | 'items' | 'diff' | 'stock' | 'audit'
  >('info');

  // Form States
  const [docNumber, setDocNumber] = useState<string>('Loading...');
  const [selectedPoId, setSelectedPoId] = useState<string>(initialPoId || '');
  const [deliveryNoteNumber, setVendorDeliveryNote] = useState('DN-84920');
  const [receiverName, setReceiverName] = useState('Store Supervisor');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Posted' | 'Cancelled'>('Draft');
  
  // Received line quantities & unit costs maps: { [partId]: qtyReceivedNow / cost }
  const [receivedQtyMap, setReceivedQtyMap] = useState<Record<string, number>>({});
  const [unitCostMap, setUnitCostMap] = useState<Record<string, number>>({});
  
  // UI Lifecycle
  const [isEditing, setIsEditing] = useState(true);
  const [isNew, setIsNew] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  // Eligible POs for GRN
  const eligiblePOs = useMemo(() => {
    return purchaseOrders.filter(po => po.status !== 'Received' && po.status !== 'Cancelled');
  }, [purchaseOrders]);

  useEffect(() => {
    if (initialPoId) {
      setSelectedPoId(initialPoId);
    } else if (eligiblePOs.length > 0 && !selectedPoId) {
      setSelectedPoId(eligiblePOs[0].id);
    }
  }, [initialPoId, eligiblePOs, selectedPoId]);

  const currentPO = useMemo(() => {
    return purchaseOrders.find(p => p.id === selectedPoId);
  }, [purchaseOrders, selectedPoId]);

  // Reset or populate received quantities when selected PO changes
  useEffect(() => {
    if (!isOpen) return;

    if (currentPO) {
      const qMap: Record<string, number> = {};
      const cMap: Record<string, number> = {};
      (currentPO.items || []).forEach(item => {
        const key = item.partId || (item as any).id || item.sku;
        const ordered = Number(item.quantityOrdered ?? item.quantity ?? 0);
        const prev = Number(item.quantityReceived ?? 0);
        const remaining = Math.max(0, ordered - prev);
        qMap[key] = remaining; // default to receiving remaining quantity
        cMap[key] = Number(item.unitCost || 0);
      });
      setReceivedQtyMap(qMap);
      setUnitCostMap(cMap);
    }

    setDocNumber('Fetching next GRN...');
    api.getNextDocumentNumber('GRN')
      .then(res => {
        if (res?.code) setDocNumber(res.code);
      })
      .catch(() => {
        setDocNumber('GRN-0001');
      });
  }, [selectedPoId, currentPO, isOpen]);

  const totalReceivedValue = useMemo(() => {
    if (!currentPO) return 0;
    return (currentPO.items || []).reduce((sum, item) => {
      const key = item.partId || (item as any).id || item.sku;
      const qtyNow = Number(receivedQtyMap[key] || 0);
      const cost = unitCostMap[key] !== undefined ? unitCostMap[key] : Number(item.unitCost || 0);
      return sum + (qtyNow * cost);
    }, 0);
  }, [currentPO, receivedQtyMap, unitCostMap]);

  const handleNewRecord = () => {
    setIsNew(true);
    setIsEditing(true);
    setStatus('Draft');
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    setHasUnsavedChanges(false);
    if (eligiblePOs.length > 0) setSelectedPoId(eligiblePOs[0].id);
    setVendorDeliveryNote(`DN-${Math.floor(10000 + Math.random() * 90000)}`);
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setNotes('');

    api.getNextDocumentNumber('GRN')
      .then(res => {
        if (res?.code) setDocNumber(res.code);
      })
      .catch(() => {
        setDocNumber('GRN-0001');
      });
  };

  const handlePostGRN = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!currentPO) {
      setValidationError('A valid Purchase Order must be selected.');
      setActiveTab('po');
      return;
    }

    if (status === 'Posted') {
      setValidationError('This Goods Receipt Note has already been posted to inventory.');
      return;
    }

    // Validate quantities
    let totalQtyToReceive = 0;
    for (const item of currentPO.items || []) {
      const key = item.partId || (item as any).id || item.sku;
      const qtyNow = Number(receivedQtyMap[key] || 0);
      const ordered = Number(item.quantityOrdered ?? item.quantity ?? 0);
      const prev = Number(item.quantityReceived ?? 0);
      const remaining = Math.max(0, ordered - prev);

      if (qtyNow < 0) {
        setValidationError(`Received quantity cannot be negative for ${item.name || item.sku}.`);
        setActiveTab('items');
        return;
      }
      if (qtyNow > remaining) {
        setValidationError(
          `Over-receiving rejected: Cannot receive ${qtyNow} units of ${item.name || item.sku}. Only ${remaining} units remaining on PO ${currentPO.poNumber}.`
        );
        setActiveTab('items');
        return;
      }
      totalQtyToReceive += qtyNow;
    }

    if (totalQtyToReceive <= 0) {
      setValidationError('At least one item must have a receive quantity greater than 0.');
      setActiveTab('items');
      return;
    }

    setIsPosting(true);
    try {
      const receivedItemsPayload = (currentPO.items || []).map(item => {
        const key = item.partId || (item as any).id || item.sku;
        const cost = unitCostMap[key] !== undefined ? unitCostMap[key] : Number(item.unitCost || 0);
        return {
          partId: item.partId || item.sku,
          sku: item.sku,
          partName: item.name,
          qtyReceivedNow: Number(receivedQtyMap[key] || 0),
          quantity: Number(receivedQtyMap[key] || 0),
          unitCost: cost
        };
      }).filter(p => p.qtyReceivedNow > 0);

      const res = await api.receivePO(currentPO.id, receivedItemsPayload, deliveryNoteNumber, notes);

      // Also update local GarageContext
      receivePOItems(
        currentPO.id,
        receivedItemsPayload.map(p => ({
          partId: p.partId,
          qtyReceivedNow: p.qtyReceivedNow
        })),
        res?.poStatus === 'Received',
        notes
      );

      setStatus('Posted');
      setIsEditing(false);
      setIsNew(false);
      setHasUnsavedChanges(false);
      if (res?.grnNumber) setDocNumber(res.grnNumber);
      setSuccessMessage(
        `GRN ${res?.grnNumber || docNumber} posted successfully! Inventory stock increased and PO ${currentPO.poNumber} updated.`
      );
    } catch (err: any) {
      console.error('[GRN] Post error:', err);
      setApiError(err?.message || 'Failed to post Goods Receipt Note to backend.');
    } finally {
      setIsPosting(false);
    }
  };

  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return purchaseOrders.map(po => ({
      id: po.id,
      documentNumber: po.poNumber,
      title: `GRN for PO ${po.poNumber} (${po.supplierName})`,
      subtitle: `${po.items?.length || 0} items • Status: ${po.status}`,
      category: po.supplierName,
      status: po.status
    }));
  }, [purchaseOrders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <RecordManagementShell
          moduleTitle="Goods Receipt Note (GRN)"
          moduleSubtitle="Inward warehouse physical stock intake, inspection check and purchase reconciliation"
          moduleIcon={PackageCheck}
          recordLabel="Goods Receipt"
          documentNumber={docNumber}
          documentDate={receiptDate}
          status={status}
          statusType="general"
          companyName={settings.garageName}
          headerBadges={[
            { label: 'PO', value: currentPO ? currentPO.poNumber : 'None', variant: 'primary' },
            { label: 'Vendor', value: currentPO ? currentPO.supplierName : 'Direct', variant: 'purple' },
            { label: 'Received Value', value: `QAR ${totalReceivedValue.toLocaleString()}`, variant: 'success' }
          ]}
          isNew={isNew}
          isEditing={isEditing && status !== 'Posted'}
          isSaving={isPosting}
          hasSavedRecord={status === 'Posted'}
          hasUnsavedChanges={hasUnsavedChanges}
          validationError={validationError}
          apiError={apiError}
          successMessage={successMessage}
          tabs={[
            { id: 'info', label: 'GRN Information', icon: PackageCheck },
            { id: 'po', label: 'Linked Purchase Order', icon: FileText },
            { id: 'items', label: 'Received Items', icon: Boxes },
            { id: 'diff', label: 'Quantity Differences', icon: Layers },
            { id: 'stock', label: 'Stock Update', icon: CheckCircle2 },
            { id: 'audit', label: 'Audit Trail', icon: History }
          ]}
          activeTab={activeTab}
          onTabChange={(t: any) => setActiveTab(t)}
          onNew={handleNewRecord}
          onSave={handlePostGRN}
          onEdit={() => { if (status !== 'Posted') setIsEditing(true); }}
          onDelete={() => { onClose(); }}
          onCancel={() => { onClose(); }}
          onPrint={() => window.print()}
          onClose={onClose}
          searchRecords={searchRecords}
          onSelectSearchRecord={item => setSelectedPoId(item.id)}
          customActions={
            status === 'Draft' && (
              <button
                type="button"
                onClick={handlePostGRN}
                disabled={isPosting}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                title="Post GRN and increase inventory stock"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{isPosting ? 'Posting...' : 'Post GRN to Stock'}</span>
              </button>
            )
          }
        >
          {/* TAB 1: GRN INFORMATION */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                  Receipt Document Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">GRN Number</label>
                    <input
                      type="text"
                      disabled
                      value={docNumber ?? ''}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-black bg-slate-100 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Date *</label>
                    <input
                      type="date"
                      disabled={status === 'Posted'}
                      value={receiptDate ?? ''}
                      onChange={e => { setReceiptDate(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Delivery Note #</label>
                    <input
                      type="text"
                      disabled={status === 'Posted'}
                      value={deliveryNoteNumber ?? ''}
                      onChange={e => { setVendorDeliveryNote(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="DN-84920"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Received &amp; Inspected By</label>
                    <input
                      type="text"
                      disabled={status === 'Posted'}
                      value={receiverName ?? ''}
                      onChange={e => { setReceiverName(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse Inspection Notes</label>
                    <input
                      type="text"
                      disabled={status === 'Posted'}
                      value={notes ?? ''}
                      onChange={e => { setNotes(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="All packages received in pristine OEM packaging..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LINKED PURCHASE ORDER */}
          {activeTab === 'po' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                Purchase Order Matching
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Purchase Order *</label>
                  <select
                    disabled={status === 'Posted'}
                    value={selectedPoId ?? ''}
                    onChange={e => {
                      setSelectedPoId(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    {purchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} — {po.supplierName} ({po.totalAmount} QAR) [{po.status}]
                      </option>
                    ))}
                  </select>
                </div>

                {currentPO && (
                  <div className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{currentPO.supplierName}</div>
                      <div className="text-[11px] text-slate-500">Order Date: {formatDate(currentPO.date)} • Total: QAR {currentPO.totalAmount}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPO?.(currentPO.id)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-blue-700 font-bold text-xs rounded-lg border flex items-center gap-1 cursor-pointer"
                    >
                      <span>View PO</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RECEIVED ITEMS */}
          {activeTab === 'items' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Physical Item Quantity Inward Verification</h3>
                <span className="text-xs text-slate-500 font-mono">
                  Total Value: QAR {totalReceivedValue.toLocaleString()}
                </span>
              </div>

              {!currentPO || (currentPO.items || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border">
                  <p className="text-sm font-semibold text-slate-700">No items available on selected PO</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                      <tr>
                        <th className="p-2.5">SKU / Code</th>
                        <th className="p-2.5">Part Name</th>
                        <th className="p-2.5 text-center w-24">Ordered</th>
                        <th className="p-2.5 text-center w-24">Prior Rcvd</th>
                        <th className="p-2.5 text-center w-24">Remaining</th>
                        <th className="p-2.5 text-center w-28 bg-emerald-50 text-emerald-900">Receive Now</th>
                        <th className="p-2.5 text-right w-28">Unit Cost</th>
                        <th className="p-2.5 text-right w-28">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {(currentPO.items || []).map((item, idx) => {
                        const key = item.partId || (item as any).id || item.sku;
                        const ordered = Number(item.quantityOrdered ?? item.quantity ?? 0);
                        const prev = Number(item.quantityReceived ?? 0);
                        const remaining = Math.max(0, ordered - prev);
                        const qtyNow = receivedQtyMap[key] !== undefined ? receivedQtyMap[key] : remaining;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-slate-900">{item.sku}</td>
                            <td className="p-2 font-medium">{item.name}</td>
                            <td className="p-2 text-center font-mono font-bold">{ordered}</td>
                            <td className="p-2 text-center font-mono text-slate-500">{prev}</td>
                            <td className="p-2 text-center font-mono font-bold text-amber-700">{remaining}</td>
                            <td className="p-2 text-center bg-emerald-50/50">
                              {status === 'Draft' ? (
                                <input
                                  type="number"
                                  min="0"
                                  max={remaining}
                                  value={qtyNow ?? ''}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setReceivedQtyMap(prevMap => ({ ...prevMap, [key]: val }));
                                    setHasUnsavedChanges(true);
                                  }}
                                  className="w-20 p-1 border border-emerald-300 rounded text-center font-mono font-black text-emerald-900 bg-white shadow-2xs"
                                />
                              ) : (
                                <span className="font-mono font-black text-emerald-800">{qtyNow}</span>
                              )}
                            </td>
                            <td className="p-2 text-right font-mono">
                              {status === 'Draft' ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-slate-400 text-[10px]">QAR</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={unitCostMap[key] !== undefined ? unitCostMap[key] : (item.unitCost || 0)}
                                    onChange={e => {
                                      const val = Number(e.target.value);
                                      setUnitCostMap(prevMap => ({ ...prevMap, [key]: val }));
                                      setHasUnsavedChanges(true);
                                    }}
                                    className="w-20 p-1 border border-slate-300 rounded text-right font-mono font-bold text-slate-900 bg-white"
                                    title="Editable Unit Cost"
                                  />
                                </div>
                              ) : (
                                <span className="font-mono">QAR {unitCostMap[key] ?? item.unitCost}</span>
                              )}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              QAR {(qtyNow * (unitCostMap[key] !== undefined ? unitCostMap[key] : (item.unitCost || 0))).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUANTITY DIFFERENCES */}
          {activeTab === 'diff' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Discrepancy & Variance Analysis</h3>
              <div className="p-4 bg-slate-50 rounded-xl border text-xs text-slate-700 space-y-2">
                <p><strong>Over-receiving Protection:</strong> The system enforces hard ceilings preventing storekeepers from receiving more than PO quantities.</p>
                <p><strong>Partial Receipts:</strong> If only part of the shipment arrived, the PO automatically shifts to <em>Partially Received</em> status until final fulfillment.</p>
              </div>
            </div>
          )}

          {/* TAB 5: STOCK UPDATE */}
          {activeTab === 'stock' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Inventory Ledger Synchronization</h3>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Exact Stock Update Protocol
                </p>
                <p>Posting this GRN increases warehouse stock counts by exact received quantities and creates permanent stock movement audit trails.</p>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <RecordAuditTrail
                entries={auditLogs.filter((a: any) => 
                  a.record_number === docNumber ||
                  (currentPO && a.record_number === currentPO.poNumber) ||
                  (a.details && a.details.includes('GRN'))
                )}
                recordNumber={docNumber}
                moduleName="GRN"
              />
            </div>
          )}
        </RecordManagementShell>
      </div>
    </div>
  );
};
