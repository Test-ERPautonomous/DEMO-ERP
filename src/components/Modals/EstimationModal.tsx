import React, { useState, useEffect } from 'react';
import { GarageSettings, JobCard } from '../../types';
import { 
  FileText, 
  X, 
  Plus, 
  Trash2, 
  Printer, 
  RotateCcw, 
  Save, 
  Search, 
  ChevronFirst, 
  ChevronLeft, 
  ChevronRight, 
  ChevronLast, 
  Edit3, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { PrintModalHeader } from '../Common/PrintModalHeader';
import { FormToolbar } from '../Common/FormToolbar';
import { FindRecordModal, FindResultItem } from '../Common/FindRecordModal';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GarageSettings;
  onConvertToJobCard: (cardData: Omit<JobCard, 'id' | 'jobNumber'>) => void;
}

interface EstimateItem {
  id: string;
  type: 'Labor' | 'Part' | 'Paint';
  description: string;
  qty: number;
  rate: number;
}

export const EstimationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onConvertToJobCard,
}) => {
  const { estimates, addEstimate, updateEstimate, deleteEstimate } = useGarage();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentEstimate = estimates[currentIndex] || null;

  // Form Mode & Persistence States
  const [isEditMode, setIsEditMode] = useState(!currentEstimate);
  const [isNewRecord, setIsNewRecord] = useState(!currentEstimate);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Header & Document Details
  const [currentId, setCurrentId] = useState(() => currentEstimate?.id || '');
  const [estimateNumber, setEstimateNumber] = useState(() => currentEstimate?.estimateNumber || 'Loading...');
  const [docDate, setDocDate] = useState(() => currentEstimate?.date || new Date().toISOString().split('T')[0]);
  const [docTime, setDocTime] = useState('10:00 AM');
  const [estimateType, setEstimateType] = useState('Standard Repair');
  const [reference, setReference] = useState('Customer Walk-in');
  const [refDocNo, setRefDocNo] = useState('');
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // Customer Details
  const [customerName, setCustomerName] = useState(() => currentEstimate?.customerName || 'Abdullah Al-Kuwari');
  const [customerPhone, setCustomerPhone] = useState(() => currentEstimate?.customerPhone || '+974 5588 4422');
  const [customerEmail, setCustomerEmail] = useState('abdullah.kuwari@outlook.com');
  const [customerAddress, setCustomerAddress] = useState('Al Waab Street, Zone 55, Doha');

  // Vehicle Details
  const [plateNumber, setPlateNumber] = useState(() => currentEstimate?.plateNumber || '78192');
  const [vehicleMake, setVehicleMake] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState(() => currentEstimate?.vehicleModel || 'Land Cruiser V8 5.7');
  const [vehicleYear, setVehicleYear] = useState(2022);
  const [vehicleColor, setVehicleColor] = useState('Pearl White');
  const [odometer, setOdometer] = useState(48500);

  // Items
  const [items, setItems] = useState<EstimateItem[]>([
    { id: '1', type: 'Labor', description: 'Front & Rear Brake Pad Replacement & Disc Rotor Skimming', qty: 1, rate: 350 },
    { id: '2', type: 'Part', description: 'Genuine Toyota Front Brake Pads (04465-60280)', qty: 1, rate: 420 },
    { id: '3', type: 'Part', description: 'Genuine Toyota Rear Brake Pads (04466-60140)', qty: 1, rate: 320 },
    { id: '4', type: 'Labor', description: 'Engine Diagnostics & Computer Reset (OBD-II Scan)', qty: 1, rate: 150 },
    { id: '5', type: 'Paint', description: 'Front Bumper Corner Spot Touchup & Oven Clear Coat', qty: 1, rate: 250 },
  ]);

  const [newItemType, setNewItemType] = useState<EstimateItem['type']>('Labor');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemRate, setNewItemRate] = useState(100);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [estimator, setEstimator] = useState('Osman (Service Advisor)');
  const [status, setStatus] = useState<'Draft' | 'Sent to Customer' | 'Approved' | 'Rejected'>('Draft');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchNextEstimateNumber = () => {
    api.getNextDocumentNumber('ESTIMATE')
      .then(res => {
        if (res?.code) setEstimateNumber(res.code);
      })
      .catch(() => {
        setEstimateNumber(`ES-0001`);
      });
  };

  const loadEstimateIntoState = (est: any) => {
    if (!est) return;
    setCurrentId(est.id || '');
    setEstimateNumber(est.estimateNumber || '');
    setDocDate(est.date || new Date().toISOString().split('T')[0]);
    setCustomerName(est.customerName || est.customer?.name || '');
    setCustomerPhone(est.customerPhone || est.customer?.phone || '');
    setPlateNumber(est.plateNumber || est.vehicle?.plateNumber || '');
    setVehicleModel(est.vehicleModel || est.vehicle?.model || '');
    if (est.items && Array.isArray(est.items) && est.items.length > 0) {
      setItems(est.items);
    } else {
      setItems([
        { id: '1', type: 'Labor', description: 'Mechanical Diagnostic & Repair Estimation', qty: 1, rate: est.estimatedLabor || 350 },
        { id: '2', type: 'Part', description: 'Replacement Spares & Consumables Estimation', qty: 1, rate: est.estimatedParts || 420 },
      ]);
    }
    setDiscountAmount(est.discountAmount || 0);
    setStatus(est.status === 'Approved' ? 'Approved' : 'Draft');
  };

  useEffect(() => {
    if (isOpen && currentEstimate && !isNewRecord) {
      loadEstimateIntoState(currentEstimate);
    } else if (isOpen && isNewRecord) {
      fetchNextEstimateNumber();
    }
  }, [isOpen, currentIndex]);

  const subtotal = (items || []).reduce((acc, curr) => acc + (curr.qty * curr.rate), 0);
  const taxRate = settings.taxRatePercent || 0;
  const taxAmount = Number(((Math.max(0, subtotal - discountAmount) * taxRate) / 100).toFixed(2));
  const grandTotal = Number((Math.max(0, subtotal - discountAmount) + taxAmount).toFixed(2));

  const addItem = () => {
    if (!newItemDesc.trim()) return;
    setItems([
      ...(items || []),
      {
        id: `est-${Date.now()}`,
        type: newItemType,
        description: newItemDesc.trim(),
        qty: newItemQty,
        rate: newItemRate,
      }
    ]);
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemRate(100);
    setHasUnsavedChanges(true);
  };

  const removeItem = (id: string) => {
    setItems((items || []).filter(i => i.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateItem = (id: string, updates: Partial<EstimateItem>) => {
    setItems(prev => (prev || []).map(i => (i.id === id ? { ...i, ...updates } : i)));
    setHasUnsavedChanges(true);
  };

  // Toolbar Handlers
  const handleNew = () => {
    fetchNextEstimateNumber();
    setCurrentId(`est-${Date.now()}`);
    setCustomerName('');
    setCustomerPhone('');
    setPlateNumber('');
    setVehicleModel('');
    setItems([]);
    setDiscountAmount(0);
    setIsNewRecord(true);
    setIsEditMode(true);
    setHasUnsavedChanges(false);
    showToast('New blank Estimate generated.');
  };

  const handleSave = async () => {
    if (!customerName.trim()) {
      showToast('Validation Error: Customer Name is required.');
      return;
    }
    if (!plateNumber.trim()) {
      showToast('Validation Error: Vehicle Plate Number is required.');
      return;
    }
    if (items.length === 0 && grandTotal <= 0) {
      showToast('Validation Error: Please add at least one estimate line item.');
      return;
    }

    setIsSaving(true);
    const laborTotal = items.filter(i => i.type === 'Labor').reduce((a, b) => a + b.qty * b.rate, 0);
    const partsTotal = items.filter(i => i.type === 'Part' || i.type === 'Paint').reduce((a, b) => a + b.qty * b.rate, 0);

    const estimatePayload = {
      id: currentId || `est-${Date.now()}`,
      estimateNumber,
      date: docDate,
      validUntil,
      status: status === 'Approved' ? 'Approved' as const : 'Awaiting Approval' as const,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      plateNumber: plateNumber.trim(),
      vehicleModel: vehicleModel.trim() || 'General Vehicle',
      estimatedLabor: laborTotal,
      estimatedParts: partsTotal,
      subtotal,
      discountAmount,
      taxRatePercent: taxRate,
      taxAmount,
      total: grandTotal,
      grandTotal,
      items,
      notes: `Quotation by ${estimator}`,
    };

    try {
      if (isNewRecord || !currentEstimate) {
        await api.createEstimate(estimatePayload);
        addEstimate(estimatePayload as any);
      } else {
        await api.updateEstimate(currentEstimate.id, estimatePayload);
        updateEstimate(currentEstimate.id, estimatePayload as any);
      }

      setIsSaving(false);
      setIsNewRecord(false);
      setIsEditMode(false);
      setHasUnsavedChanges(false);
      showToast(`Estimate ${estimateNumber} saved successfully to backend.`);
    } catch (err: any) {
      setIsSaving(false);
      showToast(err?.message || 'Failed to save Estimate to backend.');
    }
  };

  const handleDelete = async () => {
    if (!currentEstimate) return;
    setIsDeleting(true);
    try {
      await api.deleteEstimate(currentEstimate.id);
      deleteEstimate(currentEstimate.id);
      setIsDeleting(false);
      showToast(`Estimate ${currentEstimate.estimateNumber} deleted.`);
      if (estimates.length > 1) {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else {
        handleNew();
      }
    } catch (err: any) {
      setIsDeleting(false);
      showToast(err?.message || 'Failed to delete Estimate.');
    }
  };

  const handleCancel = () => {
    if (currentEstimate && !isNewRecord) {
      loadEstimateIntoState(currentEstimate);
      setIsEditMode(false);
      showToast('Changes reverted to saved estimate.');
    } else {
      handleNew();
    }
    setHasUnsavedChanges(false);
  };

  const findItems: FindResultItem[] = (estimates || []).map(est => ({
    id: est.id,
    code: est.estimateNumber,
    date: est.date,
    customerName: est.customerName,
    customerPhone: est.customerPhone,
    vehiclePlate: est.plateNumber,
    vehicleModel: est.vehicleModel,
    status: est.status,
    amount: est.total,
    currency: 'QAR',
    rawRecord: est,
  }));

  const handleConvertToJobCard = () => {
    const mechanicalTasks = (items || [])
      .filter(i => i.type === 'Labor')
      .map(i => ({
        id: `mech-${Date.now()}-${Math.random()}`,
        name: i.description,
        description: i.description,
        estimatedHours: 1,
        hourlyRate: i.rate * i.qty,
        status: 'Pending' as const,
      }));

    const partsUsed = (items || [])
      .filter(i => i.type === 'Part')
      .map(i => ({
        id: `part-${Date.now()}-${Math.random()}`,
        partId: `est-part-${Date.now()}`,
        sku: 'EST-PART',
        name: i.description,
        quantity: i.qty,
        unitPrice: i.rate,
        total: i.qty * i.rate,
      }));

    onConvertToJobCard({
      dateIn: docDate,
      promisedDate: validUntil,
      status: 'Approved',
      jobType: 'Mechanical',
      priority: 'Normal',
      customer: {
        id: `cust-${Date.now()}`,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress,
      },
      vehicle: {
        plateNumber: plateNumber,
        make: vehicleMake,
        model: vehicleModel,
        year: vehicleYear,
        color: vehicleColor,
        odometer: odometer,
        fuelLevel: 50,
      },
      assignedTechnician: 'Osman (Service Advisor)',
      customerComplaints: 'Derived from Estimate ' + estimateNumber,
      diagnosisNotes: 'Approved customer estimate quote.',
      mechanicalTasks,
      dentingPaintingPanels: [],
      partsUsed,
      mechanicalLaborCost: (items || []).filter(i => i.type === 'Labor').reduce((a, b) => a + b.qty * b.rate, 0),
      dentingLaborCost: 0,
      paintingCost: (items || []).filter(i => i.type === 'Paint').reduce((a, b) => a + b.qty * b.rate, 0),
      paintBoothCharge: 0,
      partsCost: (items || []).filter(i => i.type === 'Part').reduce((a, b) => a + b.qty * b.rate, 0),
      consumablesCost: 0,
      discount: discountAmount,
      taxRate,
      totalAmount: grandTotal,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 bg-slate-950/70 backdrop-blur-xs overflow-y-auto font-sans text-[11px]">
      <div 
        className="bg-[#f0f0f0] border-2 border-[#94a3b8] rounded-xs w-full max-w-[1180px] max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-800"
        onChangeCapture={() => setHasUnsavedChanges(true)}
      >
        
        {/* ROW 1: ENTERPRISE ACTION TOOLBAR */}
        <FormToolbar
          isNew={isNewRecord}
          isEditing={isEditMode}
          isSaving={isSaving}
          isDeleting={isDeleting}
          hasSavedRecord={Boolean(currentEstimate && !isNewRecord)}
          hasUnsavedChanges={hasUnsavedChanges}
          onNew={handleNew}
          onSave={handleSave}
          onEdit={() => {
            setIsEditMode(true);
            showToast('Edit mode enabled.');
          }}
          onDelete={handleDelete}
          onCancel={handleCancel}
          onFind={() => setShowFindModal(true)}
          onPrint={() => setShowPrintModal(true)}
          onClose={onClose}
          canNavigate={true}
          currentIndex={currentIndex}
          totalRecords={estimates.length}
          onFirst={() => { setCurrentIndex(0); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); }}
          onPrevious={() => { setCurrentIndex(prev => Math.max(0, prev - 1)); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); }}
          onNext={() => { setCurrentIndex(prev => Math.min(estimates.length - 1, prev + 1)); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); }}
          onLast={() => { setCurrentIndex(Math.max(0, estimates.length - 1)); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); }}
          recordLabel="Estimate"
          recordNumber={estimateNumber}
        />

        {/* Small Tooltip / Toast strip */}
        {toastMessage ? (
          <div className="bg-[#fef9c3] border-b border-[#fde047] px-3 py-1 text-[11px] text-amber-900 font-mono flex items-center justify-between animate-in fade-in">
            <span>{toastMessage}</span>
            <span className="font-semibold text-slate-700">{estimateNumber} | {customerName}</span>
          </div>
        ) : (
          <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-3 py-0.5 text-[10px] text-slate-600 font-mono flex items-center justify-between">
            <span>{isEditMode ? 'EDITING ESTIMATE RECORD' : 'VIEWING ESTIMATE RECORD'}</span>
            <span className="text-slate-400">STATUS: {status.toUpperCase()}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 2: VIBRANT ORANGE BANNER + DOCUMENT HEADER FIELDS                     */}
        {/* ========================================================================= */}
        <div className="p-2.5 bg-[#f0f0f0] border-b border-[#cbd5e1] space-y-2">
          <div className="flex items-center justify-between">
            <div className="bg-[#f26522] text-white font-bold text-sm px-4 py-1 rounded-xs tracking-wide shadow-xs flex items-center gap-2">
              <span>Estimate / Quotation</span>
            </div>
            <button
              type="button"
              className="w-7 h-7 bg-[#7ac142] hover:bg-[#68a835] text-white rounded-xs flex items-center justify-center cursor-pointer shadow-xs"
            >
              <Search className="w-4 h-4 font-bold" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-[#f8fafc] p-2 border border-[#cbd5e1] rounded-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Doc No.</label>
              <div className="flex items-center bg-white border border-[#94a3b8] rounded-xs overflow-hidden">
                <input
                  type="text"
                  readOnly
                  value={estimateNumber ?? ''}
                  className="w-full bg-slate-50 px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                />
                <span className="bg-[#e2e8f0] border-l border-[#94a3b8] px-1 py-0.5 text-slate-600 font-semibold text-[8px] uppercase shrink-0">
                  Auto Seq
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#c00000] mb-0.5">Estimate Type</label>
              <select
                value={estimateType ?? ''}
                onChange={e => setEstimateType(e.target.value)}
                className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs"
              >
                <option value="Standard Repair">Standard Repair</option>
                <option value="Accident Insurance">Accident Insurance</option>
                <option value="Periodic Maintenance">Periodic Maintenance</option>
                <option value="Major Overhaul">Major Overhaul</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Reference</label>
              <input
                type="text"
                value={reference ?? ''}
                onChange={e => setReference(e.target.value)}
                className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Ref. Doc No.</label>
              <input
                type="text"
                value={refDocNo ?? ''}
                onChange={e => setRefDocNo(e.target.value)}
                placeholder="REF-..."
                className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-slate-900 rounded-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Date</label>
              <input
                type="date"
                value={docDate ?? ''}
                onChange={e => setDocDate(e.target.value)}
                className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-slate-900 rounded-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Valid Until</label>
              <input
                type="date"
                value={validUntil ?? ''}
                onChange={e => setValidUntil(e.target.value)}
                className="w-full bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-slate-900 rounded-xs"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: CUSTOMER & VEHICLE DETAILS HEADER COLUMNS                          */}
        {/* ========================================================================= */}
        <div className="p-2.5 bg-[#f5f5f5] grid grid-cols-1 md:grid-cols-2 gap-2.5 border-b border-[#cbd5e1]">
          
          {/* Customer Details */}
          <div className="bg-white border border-[#b7c4d0] rounded-xs p-2 space-y-1.5">
            <div className="bg-gradient-to-r from-[#d9f2d0] via-[#eaf7e6] to-white border-b border-[#b7e2a9] -m-2 mb-1.5 px-2.5 py-1 font-bold text-[#1f5922] text-[11px]">
              Customer Details
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <label className="col-span-3 font-bold text-[#c00000]">Customer</label>
              <input
                type="text"
                value={customerName || ''}
                onChange={e => setCustomerName(e.target.value)}
                className="col-span-9 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs font-medium"
              />
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <label className="col-span-3 text-slate-700">Phone</label>
              <input
                type="text"
                value={customerPhone || ''}
                onChange={e => setCustomerPhone(e.target.value)}
                className="col-span-9 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-slate-900 rounded-xs"
              />
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <label className="col-span-3 text-slate-700">Email</label>
              <input
                type="text"
                value={customerEmail || ''}
                onChange={e => setCustomerEmail(e.target.value)}
                className="col-span-9 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs"
              />
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <label className="col-span-3 text-slate-700">Address</label>
              <input
                type="text"
                value={customerAddress || ''}
                onChange={e => setCustomerAddress(e.target.value)}
                className="col-span-9 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs"
              />
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="bg-white border border-[#b7c4d0] rounded-xs p-2 space-y-1.5">
            <div className="bg-gradient-to-r from-[#d9f2d0] via-[#eaf7e6] to-white border-b border-[#b7e2a9] -m-2 mb-1.5 px-2.5 py-1 font-bold text-[#1f5922] text-[11px]">
              Vehicle Details
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <label className="col-span-3 font-bold text-[#c00000]">Reg Plate</label>
              <input
                type="text"
                value={plateNumber || ''}
                onChange={e => setPlateNumber(e.target.value.toUpperCase())}
                className="col-span-9 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 rounded-xs uppercase"
              />
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <label className="col-span-3 font-bold text-[#c00000]">Make &amp; Model</label>
              <div className="col-span-9 flex gap-1">
                <input
                  type="text"
                  value={vehicleMake || ''}
                  onChange={e => setVehicleMake(e.target.value)}
                  className="w-1/3 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs"
                />
                <input
                  type="text"
                  value={vehicleModel || ''}
                  onChange={e => setVehicleModel(e.target.value)}
                  className="w-2/3 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <label className="col-span-3 text-slate-700">Year &amp; Color</label>
              <div className="col-span-9 flex gap-1">
                <input
                  type="number"
                  value={vehicleYear ?? ''}
                  onChange={e => setVehicleYear(Number(e.target.value))}
                  className="w-1/3 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-slate-900 rounded-xs"
                />
                <input
                  type="text"
                  value={vehicleColor || ''}
                  onChange={e => setVehicleColor(e.target.value)}
                  className="w-2/3 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs text-slate-900 rounded-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-center">
              <label className="col-span-3 text-slate-700">Odometer (Kms)</label>
              <input
                type="number"
                value={odometer ?? 0}
                onChange={e => setOdometer(Number(e.target.value))}
                className="col-span-9 bg-white border border-[#94a3b8] px-1.5 py-0.5 text-xs font-mono text-slate-900 rounded-xs"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 4: ESTIMATE LINE ITEMS GRID                                          */}
        {/* ========================================================================= */}
        <div className="p-2.5 overflow-y-auto flex-1 bg-[#f5f5f5] space-y-2">
          <div className="bg-white border border-[#b7c4d0] rounded-xs shadow-2xs overflow-hidden">
            <div className="bg-[#f1f5f9] border-b border-slate-300 p-2 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">Estimated Labor &amp; Spare Parts Quotation</span>
              
              {/* Add line item row */}
              <div className="flex items-center gap-1.5">
                <select
                  value={newItemType ?? ''}
                  onChange={e => setNewItemType(e.target.value as EstimateItem['type'])}
                  className="bg-white border border-slate-300 text-xs px-2 py-0.5 rounded-xs"
                >
                  <option value="Labor">Labor</option>
                  <option value="Part">Spare Part</option>
                  <option value="Paint">Paint &amp; Body</option>
                </select>

                <input
                  type="text"
                  placeholder="Task or item description..."
                  value={newItemDesc ?? ''}
                  onChange={e => setNewItemDesc(e.target.value)}
                  className="bg-white border border-slate-300 text-xs px-2 py-0.5 rounded-xs w-64"
                />

                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={newItemQty ?? ''}
                  onChange={e => setNewItemQty(Number(e.target.value))}
                  className="bg-white border border-slate-300 text-xs px-1.5 py-0.5 rounded-xs w-16 text-center font-mono"
                />

                <input
                  type="number"
                  placeholder="Rate (QAR)"
                  value={newItemRate ?? ''}
                  onChange={e => setNewItemRate(Number(e.target.value))}
                  className="bg-white border border-slate-300 text-xs px-1.5 py-0.5 rounded-xs w-20 text-right font-mono"
                />

                <button
                  type="button"
                  onClick={addItem}
                  className="px-2.5 py-1 bg-[#1e4e79] hover:bg-blue-800 text-white rounded-xs text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#1e4e79] text-white uppercase text-[10px] tracking-wider font-semibold">
                    <th className="p-2 border-r border-blue-900 w-12 text-center">#</th>
                    <th className="p-2 border-r border-blue-900 w-28">Type</th>
                    <th className="p-2 border-r border-blue-900">Description</th>
                    <th className="p-2 border-r border-blue-900 w-20 text-center">Qty</th>
                    <th className="p-2 border-r border-blue-900 w-28 text-right">Unit Rate (QAR)</th>
                    <th className="p-2 border-r border-blue-900 w-28 text-right">Total Amount (QAR)</th>
                    <th className="p-2 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-blue-50/50">
                      <td className="p-2 text-center font-mono text-slate-500">{index + 1}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${
                          item.type === 'Labor' ? 'bg-blue-100 text-blue-800' :
                          item.type === 'Part' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-1 font-medium text-slate-900">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => updateItem(item.id, { description: e.target.value })}
                          className="w-full bg-white border border-slate-200 hover:border-blue-400 focus:border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-900 outline-none"
                        />
                      </td>
                      <td className="p-1 text-center font-mono">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateItem(item.id, { qty: Number(e.target.value) || 1 })}
                          className="w-14 bg-white border border-slate-200 hover:border-blue-400 focus:border-blue-500 rounded text-center px-1 py-0.5 text-xs font-mono font-bold text-slate-900 outline-none"
                        />
                      </td>
                      <td className="p-1 text-right font-mono">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={e => updateItem(item.id, { rate: Number(e.target.value) || 0 })}
                          className="w-20 bg-white border border-slate-200 hover:border-blue-400 focus:border-blue-500 rounded text-right px-1 py-0.5 text-xs font-mono font-bold text-slate-900 outline-none"
                          title="Editable Rate / Item Price"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {(item.qty * item.rate).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td colSpan={5} className="p-2 text-right text-slate-800">Net Estimated Total:</td>
                    <td className="p-2 text-right font-mono text-[#1875bb] font-bold text-sm">
                      QAR {grandTotal.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 5: FOOTER CONTROLS MATCHING SCREENSHOT CONCEPT                        */}
        {/* ========================================================================= */}
        <div className="bg-[#2d3748] text-white px-3 py-1.5 flex flex-wrap items-center justify-between text-xs font-medium gap-3 border-t border-slate-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-300">Estimator:</span>
              <select
                value={estimator ?? ''}
                onChange={e => setEstimator(e.target.value)}
                className="bg-[#1a202c] border border-slate-600 text-white px-2 py-0.5 rounded-xs text-xs"
              >
                <option value="Autonomous (Owner / Admin)">Autonomous (Owner / Admin)</option>
                <option value="Osman (Service Advisor)">Osman (Service Advisor)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-300">Status:</span>
              <select
                value={status ?? ''}
                onChange={e => setStatus(e.target.value as typeof status)}
                className="bg-[#1a202c] border border-slate-600 text-white px-2 py-0.5 rounded-xs text-xs font-semibold"
              >
                <option value="Draft">Draft</option>
                <option value="Sent to Customer">Sent to Customer</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConvertToJobCard}
              className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xs font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Convert to Job Card</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Print modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-slate-400 rounded-xs w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <PrintModalHeader
              title="Official Estimate Quotation"
              documentId={estimateNumber}
              targetElementId="printable-estimate-preview"
              onClose={() => setShowPrintModal(false)}
              accentColor="#1e4e79"
            />

            <div id="printable-estimate-preview" className="p-6 text-xs space-y-4 bg-white overflow-y-auto flex-1">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h2 className="font-bold text-base text-slate-900">{settings.garageName}</h2>
                  <p className="text-slate-500 text-[11px]">{settings.address}, {settings.cityStateZip}</p>
                  <p className="text-slate-500 text-[11px]">Phone: {settings.phone} • CR No: {settings.crNumber || 'N/A'}</p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-base text-blue-900">{estimateNumber}</div>
                  <div className="text-slate-500 text-[11px]">Date: {docDate}</div>
                  <div className="text-slate-500 text-[11px]">Valid Until: {validUntil}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Info</div>
                  <strong>Customer:</strong> {customerName}<br />
                  <strong>Phone:</strong> {customerPhone}<br />
                  <strong>Email:</strong> {customerEmail}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle Info</div>
                  <strong>Plate:</strong> {plateNumber}<br />
                  <strong>Vehicle:</strong> {vehicleMake} {vehicleModel} ({vehicleYear})<br />
                  <strong>Color:</strong> {vehicleColor} | <strong>Odo:</strong> {odometer} km
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Rate (QAR)</th>
                      <th className="py-2 px-3 text-right">Amount (QAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-semibold text-slate-600">{item.type}</td>
                        <td className="py-2 px-3 text-slate-800">{item.description}</td>
                        <td className="py-2 px-3 text-center font-mono">{item.qty}</td>
                        <td className="py-2 px-3 text-right font-mono">{item.rate.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">{(item.qty * item.rate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <div className="w-56 space-y-1 text-right text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">QAR {subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span className="font-mono">-QAR {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({taxRate}%):</span>
                      <span className="font-mono">QAR {taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold font-mono text-slate-900 pt-2 border-t border-slate-300">
                    <span>Total Quotation:</span>
                    <span>QAR {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-500">
                <div className="border-t border-slate-300 pt-1">Client Signature</div>
                <div className="border-t border-slate-300 pt-1">Authorized Estimator</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Find Record Modal */}
      <FindRecordModal
        isOpen={showFindModal}
        onClose={() => setShowFindModal(false)}
        onSelect={(est) => {
          const idx = estimates.findIndex(e => e.id === est.id);
          if (idx >= 0) {
            setCurrentIndex(idx);
            loadEstimateIntoState(est);
          }
          setIsNewRecord(false);
          setIsEditMode(false);
          setHasUnsavedChanges(false);
        }}
        title="Find Estimation Record"
        placeholder="Search by Estimate No, Customer, Plate, Vehicle..."
        items={findItems}
      />
    </div>
  );
};
