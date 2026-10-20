import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Layers, 
  DollarSign, 
  MapPin, 
  Truck, 
  ArrowUpDown, 
  Wrench, 
  History, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Tag,
  Boxes,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { InventoryItem, InventoryCategory, JobCard, PurchaseOrder, GarageSettings } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { RecordAuditTrail, AuditTrailEntry } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { formatDate } from '../../utils/formatters';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';

export interface InventoryRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItemId?: string | null;
  onOpenJobCard?: (jobCardId: string) => void;
  onOpenPO?: (poId: string) => void;
  onOpenSupplier?: (supplierId: string) => void;
}

const CATEGORIES: InventoryCategory[] = [
  'Mechanical Parts',
  'Body & Panels',
  'Paints & Primers',
  'Fluids & Lubricants',
  'Consumables & Tools',
];

export const InventoryRecordModal: React.FC<InventoryRecordModalProps> = ({
  isOpen,
  onClose,
  initialItemId,
  onOpenJobCard,
  onOpenPO,
  onOpenSupplier
}) => {
  const { 
    inventory, 
    addInventoryItem, 
    updateInventoryItem, 
    deleteInventoryItem, 
    adjustStockWithLog,
    jobCards,
    purchaseOrders,
    suppliers,
    settings,
    auditLogs 
  } = useGarage();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId || null);
  const [activeTab, setActiveTab] = useState<
    'info' | 'stock' | 'pricing' | 'location' | 'suppliers' | 'movements' | 'usage' | 'purchases' | 'audit'
  >('info');

  // Form Fields
  const [sku, setSku] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('Mechanical Parts');
  const [brand, setBrand] = useState('');
  const [fitment, setFitment] = useState('');
  const [unit, setUnit] = useState<InventoryItem['unit']>('pcs');
  const [unitCost, setUnitCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [quantityOnHand, setQuantityOnHand] = useState<number>(0);
  const [minReorderLevel, setMinReorderLevel] = useState<number>(5);
  const [maxStockLevel, setMaxStockLevel] = useState<number>(50);
  const [rackLocation, setRackLocation] = useState('Shelf A-01');
  const [supplierName, setSupplierName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Discontinued'>('Active');
  const [description, setDescription] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);

  // Stock Adjustment Sub-Modal State
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustReason, setAdjustReason] = useState('Physical stock count adjustment');

  // UI Lifecycle
  const [isEditing, setIsEditing] = useState(!initialItemId);
  const [isNew, setIsNew] = useState(!initialItemId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setSelectedItemId(initialItemId || null);
  }, [initialItemId]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedItemId) {
      const item = inventory.find(i => i.id === selectedItemId);
      if (item) {
        setSku(item.sku || '');
        setPartNumber(item.partNumber || item.sku || '');
        setName(item.name || '');
        setCategory(item.category || 'Mechanical Parts');
        setBrand(item.brand || '');
        setFitment(item.fitment || '');
        setUnit(item.unit || 'pcs');
        setUnitCost(item.unitCost ?? item.costPrice ?? 0);
        setSellingPrice(item.sellingPrice ?? 0);
        setQuantityOnHand(item.quantityOnHand ?? 0);
        setMinReorderLevel(item.minReorderLevel ?? 5);
        setMaxStockLevel(item.maxStockLevel ?? 50);
        setRackLocation(item.rackLocation || 'Shelf A-01');
        setSupplierName(item.supplier || '');
        setSupplierId(item.supplierId || '');
        setBarcode(item.barcode || item.sku || '');
        setStatus((item.status as any) || 'Active');
        setDescription(item.description || '');

        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setValidationError(null);
        setApiError(null);
        return;
      }
    }

    handleNewRecord();
  }, [selectedItemId, inventory, isOpen]);

  const handleNewRecord = () => {
    setSelectedItemId(null);
    setIsNew(true);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    setActiveTab('info');

    const nextId = Date.now().toString().slice(-4);
    setSku(`SKU-${nextId}`);
    setPartNumber(`PRT-${nextId}`);
    setName('');
    setCategory('Mechanical Parts');
    setBrand('');
    setFitment('Universal');
    setUnit('pcs');
    setUnitCost(25);
    setSellingPrice(45);
    setQuantityOnHand(10);
    setMinReorderLevel(5);
    setMaxStockLevel(50);
    setRackLocation('Shelf A-01');
    const firstSupp = suppliers[0];
    setSupplierName(firstSupp?.name || 'General Auto Parts');
    setSupplierId(firstSupp?.id || '');
    setBarcode(`890123456${nextId}`);
    setStatus('Active');
    setDescription('');
  };

  // Find Job Cards where this part was used
  const linkedJobCards = useMemo(() => {
    if (!sku && !selectedItemId) return [];
    const cleanName = (name || '').trim().toLowerCase();
    return (jobCards || []).filter(jc => {
      const matchRequisition = (jc.requisitions || []).some(
        req => req.partId === selectedItemId || (cleanName && req.partName && req.partName.toLowerCase().includes(cleanName))
      );
      const matchParts = (jc.parts || []).some(
        p => p.sku === sku || (cleanName && p.name && p.name.toLowerCase().includes(cleanName))
      );
      return matchRequisition || matchParts;
    });
  }, [jobCards, selectedItemId, sku, name]);

  // Find Purchase Orders containing this item
  const linkedPOs = useMemo(() => {
    if (!sku && !selectedItemId) return [];
    const cleanName = (name || '').trim().toLowerCase();
    return (purchaseOrders || []).filter(po => {
      return (po.items || []).some(
        item => item.partId === selectedItemId || item.sku === sku || (cleanName && item.name && item.name.toLowerCase().includes(cleanName))
      );
    });
  }, [purchaseOrders, selectedItemId, sku, name]);

  // Search items for standard Search Dialog
  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return inventory.map(item => ({
      id: item.id,
      documentNumber: item.sku,
      title: item.name,
      subtitle: `${item.category} • Brand: ${item.brand || 'N/A'} • Loc: ${item.rackLocation}`,
      status: item.quantityOnHand <= (item.minReorderLevel || 0) ? 'Low Stock' : 'In Stock',
      date: `Qty: ${item.quantityOnHand} ${item.unit} | QAR ${(item.sellingPrice || 0).toFixed(2)}`
    }));
  }, [inventory]);

  // Navigation indexes
  const currentRecordIndex = useMemo(() => {
    if (!selectedItemId) return -1;
    return inventory.findIndex(i => i.id === selectedItemId);
  }, [inventory, selectedItemId]);

  const handleNavigate = (direction: 'first' | 'prev' | 'next' | 'last') => {
    if (inventory.length === 0) return;
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard and navigate?')) return;
    }
    let targetIndex = 0;
    if (direction === 'first') targetIndex = 0;
    else if (direction === 'prev') targetIndex = Math.max(0, (currentRecordIndex === -1 ? 0 : currentRecordIndex) - 1);
    else if (direction === 'next') targetIndex = Math.min(inventory.length - 1, (currentRecordIndex === -1 ? 0 : currentRecordIndex) + 1);
    else if (direction === 'last') targetIndex = inventory.length - 1;

    const target = inventory[targetIndex];
    if (target) {
      setSelectedItemId(target.id);
    }
  };

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setHasUnsavedChanges(true);
    setValidationError(null);
    setApiError(null);
  };

  const handleSave = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!sku.trim()) {
      setValidationError('Part SKU code is required.');
      return;
    }
    if (!name.trim()) {
      setValidationError('Part Description/Name is required.');
      return;
    }
    if (unitCost < 0) {
      setValidationError('Purchase cost cannot be negative.');
      return;
    }
    if (sellingPrice < 0) {
      setValidationError('Selling price cannot be negative.');
      return;
    }

    setIsSaving(true);
    try {
      const itemPayload = {
        sku: sku.trim().toUpperCase(),
        partNumber: partNumber.trim() || sku.trim().toUpperCase(),
        name: name.trim(),
        category,
        brand: brand.trim(),
        fitment: fitment.trim() || 'Universal',
        unit,
        unitCost: Number(unitCost),
        costPrice: Number(unitCost),
        sellingPrice: Number(sellingPrice),
        quantityOnHand: Number(quantityOnHand),
        minReorderLevel: Number(minReorderLevel),
        maxStockLevel: Number(maxStockLevel),
        rackLocation: rackLocation.trim(),
        supplier: supplierName.trim(),
        supplierId: supplierId || undefined,
        barcode: barcode.trim() || sku.trim().toUpperCase(),
        status,
        description: description.trim()
      };

      if (isNew || !selectedItemId) {
        const created = await addInventoryItem(itemPayload);
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        if (created && created.id) {
          setSelectedItemId(created.id);
        }
        setSuccessMessage(`Inventory Part ${sku} created successfully.`);
      } else {
        await updateInventoryItem(selectedItemId, itemPayload);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Inventory Part ${sku} updated successfully.`);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to save inventory part to backend database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItemId) return;
    setIsDeleting(true);
    try {
      await deleteInventoryItem(selectedItemId);
      setSuccessMessage(`Inventory Part ${sku} deleted.`);
      if (inventory.length > 1) {
        const next = inventory.find(i => i.id !== selectedItemId);
        setSelectedItemId(next ? next.id : null);
      } else {
        handleNewRecord();
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to delete inventory part.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmAdjustStock = async () => {
    if (!selectedItemId) return;
    if (adjustQty <= 0 && adjustType !== 'set') {
      alert('Please enter a quantity greater than 0.');
      return;
    }
    if (!adjustReason.trim()) {
      alert('Please enter a valid reason for this stock adjustment.');
      return;
    }

    let delta = 0;
    if (adjustType === 'add') delta = Number(adjustQty);
    else if (adjustType === 'subtract') {
      if (quantityOnHand - Number(adjustQty) < 0) {
        alert('Cannot reduce stock below zero.');
        return;
      }
      delta = -Number(adjustQty);
    } else if (adjustType === 'set') {
      if (Number(adjustQty) < 0) {
        alert('Stock cannot be set to negative.');
        return;
      }
      delta = Number(adjustQty) - quantityOnHand;
    }

    try {
      adjustStockWithLog(selectedItemId, Math.abs(delta), delta >= 0 ? 'in' : 'out', adjustReason, 'Manager');
      setQuantityOnHand(prev => prev + delta);
      setShowAdjustDialog(false);
      setSuccessMessage(`Stock adjusted successfully. New Balance: ${quantityOnHand + delta} ${unit}`);
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock.');
    }
  };

  const isLowStock = quantityOnHand <= minReorderLevel;
  const marginPercentage = sellingPrice > 0 ? (((sellingPrice - unitCost) / sellingPrice) * 100).toFixed(1) : '0';
  const totalStockValuation = (quantityOnHand * unitCost).toFixed(2);

  if (!isOpen) return null;

  return (
    <>
      <RecordManagementShell
        isOpen={isOpen}
        onClose={onClose}
        title={isNew ? 'New Inventory Part' : (name || 'Inventory Item')}
        subtitle="Catalog, warehouse storage, replenishment & Qatar garage movements"
        icon={Package}
        documentNumber={sku || 'NEW-SKU'}
        status={isLowStock ? 'Low Stock' : 'In Stock'}
        statusVariant={isLowStock ? 'warning' : 'success'}
        badgeIcon={isLowStock ? AlertTriangle : CheckCircle2}
        metaDetails={[
          { label: 'Category', value: category },
          { label: 'On Hand', value: `${quantityOnHand} ${unit}`, highlight: isLowStock },
          { label: 'Selling Price', value: `QAR ${Number(sellingPrice).toFixed(2)}` },
          { label: 'Rack Loc', value: rackLocation }
        ]}
        tabs={[
          { id: 'info', label: 'Part Information', icon: Package },
          { id: 'stock', label: 'Stock Levels', icon: Layers, count: quantityOnHand },
          { id: 'pricing', label: 'Pricing & Cost', icon: DollarSign },
          { id: 'location', label: 'Locations', icon: MapPin },
          { id: 'suppliers', label: 'Suppliers', icon: Truck },
          { id: 'movements', label: 'Stock Movements', icon: ArrowUpDown },
          { id: 'usage', label: 'Job Card Usage', icon: Wrench, count: linkedJobCards.length },
          { id: 'purchases', label: 'Purchase History', icon: History, count: linkedPOs.length },
          { id: 'audit', label: 'Audit Trail', icon: ShieldCheck }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
        isNew={isNew}
        isEditing={isEditing}
        isSaving={isSaving}
        isDeleting={isDeleting}
        hasSavedRecord={Boolean(selectedItemId && !isNew)}
        hasUnsavedChanges={hasUnsavedChanges}
        validationError={validationError}
        apiError={apiError}
        successMessage={successMessage}
        onNew={handleNewRecord}
        onSave={handleSave}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDelete}
        onCancel={() => {
          if (selectedItemId) {
            const item = inventory.find(i => i.id === selectedItemId);
            if (item) {
              setSku(item.sku);
              setName(item.name);
              setIsEditing(false);
              setHasUnsavedChanges(false);
            }
          } else {
            onClose();
          }
        }}
        onPrint={() => setShowPrintView(true)}
        currentIndex={currentRecordIndex}
        totalRecords={inventory.length}
        onFirst={() => handleNavigate('first')}
        onPrevious={() => handleNavigate('prev')}
        onNext={() => handleNavigate('next')}
        onLast={() => handleNavigate('last')}
        searchRecords={searchRecords}
        searchTitle="Find Inventory Parts"
        searchPlaceholder="Search by SKU, Part Name, Category, Rack..."
        onSelectSearchRecord={(item: any) => {
          const id = typeof item === 'string' ? item : item?.id;
          setSelectedItemId(id);
          setIsEditing(false);
        }}
        customActions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAdjustQty(1);
                setAdjustType('add');
                setAdjustReason('Physical stock count adjustment');
                setShowAdjustDialog(true);
              }}
              disabled={isNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Adjust Stock</span>
            </button>
          </div>
        }
      >
        {/* TAB 1: PART INFORMATION */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                Primary Identification & Specification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Part SKU Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={sku ?? ''}
                    onChange={(e) => handleFieldChange(setSku, e.target.value)}
                    placeholder="e.g. BRK-PAD-01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">OEM / Manufacturer Part #</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={partNumber ?? ''}
                    onChange={(e) => handleFieldChange(setPartNumber, e.target.value)}
                    placeholder="e.g. 04465-33450"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Barcode / EAN</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={barcode ?? ''}
                    onChange={(e) => handleFieldChange(setBarcode, e.target.value)}
                    placeholder="e.g. 6291002348512"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Part Description / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={name ?? ''}
                  onChange={(e) => handleFieldChange(setName, e.target.value)}
                  placeholder="e.g. Front Ceramic Brake Pads (Toyota Land Cruiser / Lexus LX570)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
                  <select
                    disabled={!isEditing}
                    value={category ?? ''}
                    onChange={(e) => handleFieldChange(setCategory, e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75 cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Brand / Manufacturer</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={brand ?? ''}
                    onChange={(e) => handleFieldChange(setBrand, e.target.value)}
                    placeholder="e.g. Denso, Brembo, Genuine Toyota"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Vehicle Fitment / Compatibility</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={fitment ?? ''}
                    onChange={(e) => handleFieldChange(setFitment, e.target.value)}
                    placeholder="e.g. Land Cruiser 2016-2023, Patrol V8"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Technical Notes / Specs</label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={description ?? ''}
                  onChange={(e) => handleFieldChange(setDescription, e.target.value)}
                  placeholder="Additional workshop notes, storage temperature, warranty terms..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STOCK LEVELS & ALERTS */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border ${isLowStock ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'} shadow-xs`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600">Current On Hand</span>
                  <Package className={`w-5 h-5 ${isLowStock ? 'text-amber-600' : 'text-emerald-600'}`} />
                </div>
                <div className="text-2xl font-black text-slate-900">{quantityOnHand} <span className="text-xs text-slate-500 font-normal">{unit}</span></div>
                {isLowStock && (
                  <p className="text-[11px] text-amber-700 font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Reorder required (Below {minReorderLevel})
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600">Min Reorder Threshold</span>
                  <TrendingDown className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{minReorderLevel} <span className="text-xs text-slate-500 font-normal">{unit}</span></div>
                <p className="text-[11px] text-slate-400 mt-1">Triggers low stock PO requisition</p>
              </div>

              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600">Total Stock Value</span>
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">QAR {totalStockValuation}</div>
                <p className="text-[11px] text-slate-400 mt-1">At purchase cost of QAR {Number(unitCost).toFixed(2)}/unit</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                Unit & Threshold Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit of Measure</label>
                  <select
                    disabled={!isEditing}
                    value={unit ?? ''}
                    onChange={(e) => handleFieldChange(setUnit, e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75 cursor-pointer"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="liters">Liters (L)</option>
                    <option value="meters">Meters (m)</option>
                    <option value="sets">Sets (set)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="cans">Cans (can)</option>
                    <option value="boxes">Boxes (box)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Minimum Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!isEditing}
                    value={minReorderLevel ?? ''}
                    onChange={(e) => handleFieldChange(setMinReorderLevel, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Maximum Warehouse Capacity</label>
                  <input
                    type="number"
                    min="1"
                    disabled={!isEditing}
                    value={maxStockLevel ?? ''}
                    onChange={(e) => handleFieldChange(setMaxStockLevel, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRICING & MARGIN */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-600 block mb-1">Purchase / Cost Price</span>
                <div className="text-2xl font-black text-slate-900">QAR {Number(unitCost).toFixed(2)}</div>
                <p className="text-[11px] text-slate-400 mt-1">Weighted average supplier cost</p>
              </div>
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-600 block mb-1">Workshop Retail Selling Price</span>
                <div className="text-2xl font-black text-indigo-600">QAR {Number(sellingPrice).toFixed(2)}</div>
                <p className="text-[11px] text-slate-400 mt-1">Standard invoice customer rate</p>
              </div>
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-600 block mb-1">Gross Profit Margin</span>
                <div className="text-2xl font-black text-emerald-600">{marginPercentage}%</div>
                <p className="text-[11px] text-slate-400 mt-1">Profit: QAR {(sellingPrice - unitCost).toFixed(2)} per {unit}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                Price Matrix Adjustments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Purchase Unit Cost (QAR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!isEditing}
                    value={unitCost ?? ''}
                    onChange={(e) => handleFieldChange(setUnitCost, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Customer Selling Price (QAR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!isEditing}
                    value={sellingPrice ?? ''}
                    onChange={(e) => handleFieldChange(setSellingPrice, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LOCATIONS */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Workshop Storage Bin & Rack Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Warehouse / Shelf Location</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={rackLocation ?? ''}
                    onChange={(e) => handleFieldChange(setRackLocation, e.target.value)}
                    placeholder="e.g. Rack B-04 / Shelf 2 / Bin 12"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Workshop Branch / Facility</label>
                  <input
                    type="text"
                    disabled
                    value={settings.garageName || 'Najm Al Huda Auto Maintenance - Main Workshop'}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUPPLIERS */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                Preferred Vendor / Distributor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Registered Supplier</label>
                  <select
                    disabled={!isEditing}
                    value={supplierId ?? ''}
                    onChange={(e) => {
                      const supp = suppliers.find(s => s.id === e.target.value);
                      handleFieldChange(setSupplierId, e.target.value);
                      if (supp) handleFieldChange(setSupplierName, supp.name);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75 cursor-pointer"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category || 'Vendor'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Supplier Name (Display)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={supplierName ?? ''}
                    onChange={(e) => handleFieldChange(setSupplierName, e.target.value)}
                    placeholder="e.g. Metro Auto Supplies Co."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>

              {supplierId && onOpenSupplier && (
                <button
                  type="button"
                  onClick={() => onOpenSupplier(supplierId)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Supplier Record ({supplierName})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: STOCK MOVEMENTS */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Inventory Movement Log</h3>
                <span className="text-[11px] text-slate-400">Chronological stock entries</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="p-4 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                      +
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Current Stock Balance</p>
                      <p className="text-[11px] text-slate-400">Warehouse location: {rackLocation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-700">{quantityOnHand} {unit}</p>
                    <p className="text-[10px] text-slate-400">Available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: JOB CARD USAGE */}
        {activeTab === 'usage' && (
          <div className="space-y-4">
            {linkedJobCards.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-1">
                <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No Job Card Issues Yet</p>
                <p className="text-[11px] text-slate-400">This part has not been allocated to any active repair orders.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800">Allocated Repair Orders ({linkedJobCards.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {linkedJobCards.map(jc => (
                    <div key={jc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600">{jc.jobNumber}</span>
                          <span className="text-xs font-semibold text-slate-800">{jc.customerName}</span>
                          <span className="text-[11px] text-slate-400">({jc.vehiclePlate})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{jc.serviceAdvisor || 'Advisor'} • {jc.status}</p>
                      </div>
                      {onOpenJobCard && (
                        <button
                          type="button"
                          onClick={() => onOpenJobCard(jc.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 cursor-pointer"
                        >
                          <span>Open JC</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: PURCHASE HISTORY */}
        {activeTab === 'purchases' && (
          <div className="space-y-4">
            {linkedPOs.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-1">
                <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No Purchase Orders Found</p>
                <p className="text-[11px] text-slate-400">No vendor purchase orders have been placed for this SKU.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800">Purchase Order Records ({linkedPOs.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {linkedPOs.map(po => (
                    <div key={po.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600">{po.poNumber || 'PO-0001'}</span>
                          <span className="text-xs font-semibold text-slate-800">{po.supplierName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{po.status}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Date: {formatDate(po.date)} • Expected: {po.expectedDate ? formatDate(po.expectedDate) : formatDate(po.date)}</p>
                      </div>
                      {onOpenPO && (
                        <button
                          type="button"
                          onClick={() => onOpenPO(po.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 cursor-pointer"
                        >
                          <span>View PO</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 9: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <RecordAuditTrail
            recordId={selectedItemId || 'NEW'}
            moduleName="Inventory"
            entries={auditLogs}
          />
        )}
      </RecordManagementShell>

      {/* STOCK ADJUSTMENT DIALOG */}
      {showAdjustDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-indigo-600" />
                Adjust Stock — {sku}
              </h3>
              <button
                onClick={() => setShowAdjustDialog(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold">Current Balance: </span>
              <span className="font-bold text-slate-800">{quantityOnHand} {unit}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                      adjustType === 'add' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    + Add Inward
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('subtract')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                      adjustType === 'subtract' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    - Deduct Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('set')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                      adjustType === 'set' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Set Exact Qty
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Quantity ({unit})</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty ?? ''}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Reason for Adjustment</label>
                <select
                  value={adjustReason ?? ''}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 cursor-pointer"
                >
                  <option value="Physical stock count adjustment">Physical stock count audit</option>
                  <option value="Damaged / expired goods write-off">Damaged / defective part write-off</option>
                  <option value="Supplier warranty replacement">Supplier warranty replacement</option>
                  <option value="Opening balance correction">Opening balance adjustment</option>
                  <option value="Direct workshop requisition">Direct workshop manual issue</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjustStock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT VIEW */}
      {showPrintView && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 flex flex-col items-center">
          <div className="max-w-3xl w-full space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <NajmAlHudaLogo subtitle="Inventory Stock Specification Sheet" />
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">SKU Code</span>
                <p className="text-xl font-black text-slate-900">{sku}</p>
                <span className="text-[10px] text-slate-400">Date: {formatDate(new Date())}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-500">Part Description</p>
                <p className="text-sm font-bold text-slate-900">{name}</p>
                <p className="text-xs text-slate-600 mt-1">Category: {category} | Brand: {brand}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500">Current Stock Level</p>
                <p className="text-xl font-black text-emerald-600">{quantityOnHand} {unit}</p>
                <p className="text-xs text-slate-600 mt-1">Rack Location: {rackLocation}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border p-4 rounded-xl text-center">
              <div>
                <span className="text-xs text-slate-500">Cost Price</span>
                <p className="text-base font-bold text-slate-900">QAR {Number(unitCost).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Selling Price</span>
                <p className="text-base font-bold text-indigo-600">QAR {Number(sellingPrice).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Gross Margin</span>
                <p className="text-base font-bold text-emerald-600">{marginPercentage}%</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 print:hidden">
              <button
                onClick={() => setShowPrintView(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Print View
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Print Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
