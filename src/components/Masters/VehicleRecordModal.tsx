import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  User, 
  History, 
  FileText, 
  Receipt, 
  Package, 
  Paperclip, 
  Plus, 
  Wrench, 
  Gauge, 
  Calendar, 
  Hash, 
  Printer, 
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { VehicleMasterItem, CustomerMasterItem, JobCard, Invoice } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { formatDate } from '../../utils/formatters';
import { RecordAuditTrail } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';
import { 
  getAllVehicleBrands, 
  getVehicleModelsForBrand, 
  addCustomVehicleBrand, 
  addCustomVehicleModel 
} from '../../data/vehiclePresets';

export interface VehicleRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId?: string | null;
  onOpenJobCard?: (jobCardId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  onCreateJobForVehicle?: (plate: string, make: string, model: string, customerId?: string) => void;
}

export const VehicleRecordModal: React.FC<VehicleRecordModalProps> = ({
  isOpen,
  onClose,
  vehicleId,
  onOpenJobCard,
  onOpenInvoice,
  onOpenCustomer,
  onCreateJobForVehicle
}) => {
  const { 
    vehicles, 
    addVehicle, 
    updateVehicle, 
    deleteVehicle, 
    customers, 
    jobCards, 
    invoices, 
    settings,
    auditLogs
  } = useGarage();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(vehicleId || null);
  const [activeTab, setActiveTab] = useState<
    'info' | 'owner' | 'history' | 'jobs' | 'invoices' | 'parts' | 'attachments' | 'audit'
  >('info');

  // Form States (Canonical Vehicle Fields)
  const [docNumber, setDocNumber] = useState<string>('Loading...');
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('Land Cruiser');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [color, setColor] = useState('Pearl White');
  const [vin, setVin] = useState('');
  const [engine, setEngine] = useState('');
  const [mileage, setMileage] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Active');

  // UI Lifecycle States
  const [isEditing, setIsEditing] = useState(!vehicleId);
  const [isNew, setIsNew] = useState(!vehicleId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  // Vehicle Brand & Model Presets State
  const [presetsVersion, setPresetsVersion] = useState(0);
  const availableBrands = useMemo(() => getAllVehicleBrands(), [presetsVersion]);
  const availableModels = useMemo(() => getVehicleModelsForBrand(make), [make, presetsVersion]);

  // Inline Add Brand State
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandInput, setNewBrandInput] = useState('');

  // Inline Add Model State
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModelInput, setNewModelInput] = useState('');

  const handleSaveNewBrand = () => {
    if (!newBrandInput.trim()) return;
    const name = newBrandInput.trim();
    addCustomVehicleBrand(name);
    setMake(name);
    setPresetsVersion(v => v + 1);
    setNewBrandInput('');
    setIsAddingBrand(false);
    setHasUnsavedChanges(true);
  };

  const handleSaveNewModel = () => {
    if (!newModelInput.trim()) return;
    const name = newModelInput.trim();
    addCustomVehicleModel(make, name);
    setModel(name);
    setPresetsVersion(v => v + 1);
    setNewModelInput('');
    setIsAddingModel(false);
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    setSelectedVehicleId(vehicleId || null);
  }, [vehicleId]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedVehicleId) {
      const v = vehicles.find(item => item.id === selectedVehicleId);
      if (v) {
        setDocNumber((v as any).vehicleNumber || (v as any).vehicle_number || v.id || 'VE-0001');
        setPlateNumber(v.plateNumber || '');
        setMake(v.make || 'Toyota');
        setModel(v.model || 'Land Cruiser');
        setYear(v.yearFrom || (v as any).year || new Date().getFullYear());
        setColor(v.color || 'White');
        setVin(v.vin || '');
        setEngine(v.engine || '');
        setMileage(v.mileage != null ? v.mileage : null);
        setCustomerId(v.customerId || '');
        setCustomerName(v.customerName || '');
        setCustomerPhone(v.customerPhone || '');
        setNotes((v as any).notes || '');
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
  }, [selectedVehicleId, vehicles, isOpen]);

  const handleNewRecord = () => {
    setSelectedVehicleId(null);
    setIsNew(true);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    setPlateNumber('');
    setMake('Toyota');
    setModel('Land Cruiser');
    setYear(new Date().getFullYear());
    setColor('Pearl White');
    setVin('');
    setEngine('');
    setMileage(null);
    const defaultCust = customers[0];
    setCustomerId(defaultCust?.id || '');
    setCustomerName(defaultCust?.name || '');
    setCustomerPhone(defaultCust?.phone || '');
    setNotes('');
    setStatus('Active');
    setActiveTab('info');

    setDocNumber('Fetching next VE...');
    api.getNextDocumentNumber('VEHICLE')
      .then(res => {
        if (res?.code) setDocNumber(res.code);
      })
      .catch(() => {
        setDocNumber('VE-0001');
      });
  };

  // Associated Data
  const currentVehicle = selectedVehicleId ? vehicles.find(v => v.id === selectedVehicleId) : null;
  const cleanPlate = (plateNumber || '').trim().toUpperCase();

  const vehicleJobCards = useMemo(() => {
    if (!cleanPlate) return [];
    return jobCards.filter(j => 
      (j.vehicle?.plateNumber && j.vehicle.plateNumber.toUpperCase() === cleanPlate) ||
      (j.vehicle?.vin && vin && j.vehicle.vin.toUpperCase() === vin.toUpperCase())
    );
  }, [jobCards, cleanPlate, vin]);

  const vehicleInvoices = useMemo(() => {
    if (!cleanPlate) return [];
    return invoices.filter(inv => 
      inv.vehiclePlate && inv.vehiclePlate.toUpperCase() === cleanPlate
    );
  }, [invoices, cleanPlate]);

  // Consolidated parts used across all job cards
  const consolidatedParts = useMemo(() => {
    const parts: any[] = [];
    vehicleJobCards.forEach(jc => {
      const items = jc.partsUsed || (jc as any).parts || [];
      items.forEach((p: any) => {
        parts.push({
          ...p,
          jobCardNumber: jc.jobNumber,
          date: jc.dateIn
        });
      });
    });
    return parts;
  }, [vehicleJobCards]);

  // Search items for Find modal
  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return vehicles.map(v => ({
      id: v.id,
      documentNumber: (v as any).vehicleNumber || v.id,
      title: `${v.make} ${v.model} (${v.plateNumber || 'No Plate'})`,
      subtitle: `Owner: ${v.customerName || 'Direct'}`,
      plateNumber: v.plateNumber,
      category: v.make,
      status: 'Active'
    }));
  }, [vehicles]);

  // Navigation logic
  const currentIndex = selectedVehicleId ? vehicles.findIndex(v => v.id === selectedVehicleId) : -1;
  const handleFirst = () => { if (vehicles.length > 0) setSelectedVehicleId(vehicles[0].id); };
  const handleLast = () => { if (vehicles.length > 0) setSelectedVehicleId(vehicles[vehicles.length - 1].id); };
  const handleNext = () => { if (currentIndex > -1 && currentIndex < vehicles.length - 1) setSelectedVehicleId(vehicles[currentIndex + 1].id); };
  const handlePrevious = () => { if (currentIndex > 0) setSelectedVehicleId(vehicles[currentIndex - 1].id); };

  // Save handler
  const handleSave = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!plateNumber.trim()) {
      setValidationError('Qatar Plate Number is required.');
      setActiveTab('info');
      return;
    }
    if (!make.trim() || !model.trim()) {
      setValidationError('Vehicle Make and Model are required.');
      setActiveTab('info');
      return;
    }

    // Check duplicate plate
    const duplicate = vehicles.find(
      v => v.plateNumber?.toUpperCase() === cleanPlate && (!selectedVehicleId || v.id !== selectedVehicleId)
    );
    if (duplicate) {
      setValidationError(`Vehicle with plate number ${cleanPlate} is already registered.`);
      return;
    }

    const linkedCust = customers.find(c => c.id === customerId);

    setIsSaving(true);
    try {
      const payload: Omit<VehicleMasterItem, 'id'> & { id?: string; vehicleNumber?: string } = {
        plateNumber: cleanPlate,
        make: make.trim(),
        model: model.trim(),
        yearFrom: Number(year) || new Date().getFullYear(),
        yearTo: Number(year) || new Date().getFullYear(),
        color: color.trim() || 'White',
        vin: vin.trim().toUpperCase() || undefined,
        engine: engine.trim() || undefined,
        mileage: mileage !== null && mileage !== undefined ? Number(mileage) : undefined,
        bodyType: 'SUV',
        category: make.trim(),
        customerId: customerId || undefined,
        customerName: linkedCust ? linkedCust.name : (customerName || 'Direct Customer'),
        customerPhone: linkedCust ? linkedCust.phone : (customerPhone || '')
      };

      if (isNew) {
        const created = await addVehicle(payload);
        setSelectedVehicleId(created.id);
        setDocNumber((created as any).vehicleNumber || created.id);
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Vehicle ${cleanPlate} registered and saved successfully.`);
      } else if (selectedVehicleId) {
        await updateVehicle(selectedVehicleId, payload);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Vehicle ${cleanPlate} updated successfully.`);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('[VehicleRecordModal] Save error:', err);
      setApiError(err?.message || 'Failed to save vehicle record.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!selectedVehicleId) return;
    setIsDeleting(true);
    setApiError(null);
    try {
      await deleteVehicle(selectedVehicleId);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setApiError(err?.message || 'Failed to delete vehicle.');
    }
  };

  // Dependency Guard for Deletion
  const deleteBlockReason = vehicleJobCards.length > 0
    ? `This vehicle has ${vehicleJobCards.length} associated Job Card(s) in workshop records. Deletion is blocked to prevent orphaned service history.`
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <RecordManagementShell
          moduleTitle="Vehicle Registry"
          moduleSubtitle="Automotive master specifications, owner link, odometer and service logs"
          moduleIcon={Car}
          recordLabel="Vehicle"
          documentNumber={docNumber}
          documentDate={currentVehicle?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]}
          status={status}
          statusType="vehicle"
          companyName={settings.garageName}
          headerBadges={[
            { label: 'Plate', value: plateNumber || 'NO PLATE', variant: 'mono' },
            { label: 'Model', value: `${make} ${model} (${year})`, variant: 'primary' },
            { label: 'Owner', value: customerName || 'Direct', variant: 'purple' },
            { label: 'Jobs', value: vehicleJobCards.length, variant: 'mono' }
          ]}
          isNew={isNew}
          isEditing={isEditing}
          isSaving={isSaving}
          isDeleting={isDeleting}
          hasSavedRecord={Boolean(selectedVehicleId)}
          hasUnsavedChanges={hasUnsavedChanges}
          validationError={validationError}
          apiError={apiError}
          successMessage={successMessage}
          tabs={[
            { id: 'info', label: 'Vehicle Information', icon: Car },
            { id: 'owner', label: 'Owner Details', icon: User },
            { id: 'history', label: 'Service History', icon: History, count: vehicleJobCards.length },
            { id: 'jobs', label: 'Job Cards', icon: FileText, count: vehicleJobCards.length },
            { id: 'invoices', label: 'Invoices', icon: Receipt, count: vehicleInvoices.length },
            { id: 'parts', label: 'Parts Used', icon: Package, count: consolidatedParts.length },
            { id: 'attachments', label: 'Attachments', icon: Paperclip },
            { id: 'audit', label: 'Audit Trail', icon: History }
          ]}
          activeTab={activeTab}
          onTabChange={(t: any) => setActiveTab(t)}
          onNew={handleNewRecord}
          onSave={handleSave}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDelete}
          onCancel={() => {
            if (selectedVehicleId) {
              setIsEditing(false);
            } else {
              onClose();
            }
            setHasUnsavedChanges(false);
          }}
          onPrint={() => window.print()}
          onClose={onClose}
          canNavigate={vehicles.length > 0}
          currentIndex={currentIndex}
          totalRecords={vehicles.length}
          onFirst={handleFirst}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onLast={handleLast}
          searchRecords={searchRecords}
          onSelectSearchRecord={item => setSelectedVehicleId(item.id)}
          deleteBlockReason={deleteBlockReason}
          customActions={
            selectedVehicleId && (
              <button
                type="button"
                onClick={() => onCreateJobForVehicle?.(plateNumber, make, model, customerId)}
                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Create new Job Card for this vehicle"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>+ Create Job</span>
              </button>
            )
          }
        >
          {/* TAB 1: VEHICLE INFORMATION */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                  License & Body Identification
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Qatar Plate Number *
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={plateNumber ?? ''}
                      onChange={e => { setPlateNumber(e.target.value.toUpperCase()); setHasUnsavedChanges(true); }}
                      placeholder="QAT-5029"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-blue-500 uppercase disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      VIN / Chassis Number
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={vin ?? ''}
                      onChange={e => { setVin(e.target.value.toUpperCase()); setHasUnsavedChanges(true); }}
                      placeholder="JTMHV05J4301928"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Engine Number / Code
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={engine ?? ''}
                      onChange={e => { setEngine(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="V6 3.5L Twin Turbo (V35A)"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Make / Brand Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Make *</label>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => { setIsAddingBrand(true); setIsAddingModel(false); }}
                          className="text-[10px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5 cursor-pointer bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded"
                          title="Add custom vehicle brand"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Brand</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        list="vehicle-makes-list"
                        disabled={!isEditing}
                        value={make || ''}
                        onChange={e => { setMake(e.target.value); setHasUnsavedChanges(true); }}
                        placeholder="e.g. Toyota"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                      <datalist id="vehicle-makes-list">
                        {availableBrands.map(b => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>

                    {/* Inline Add Brand Form */}
                    {isAddingBrand && (
                      <div className="mt-1.5 p-2 bg-sky-50 border border-sky-200 rounded-xl shadow-xs animate-in fade-in">
                        <label className="text-[10px] font-bold text-sky-900 block mb-1">Add Brand Name:</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newBrandInput}
                            onChange={e => setNewBrandInput(e.target.value)}
                            placeholder="e.g. BYD, Haval..."
                            className="flex-1 px-2 py-1 text-xs bg-white border border-sky-300 rounded-lg focus:outline-hidden"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveNewBrand(); } }}
                          />
                          <button
                            type="button"
                            onClick={handleSaveNewBrand}
                            className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsAddingBrand(false); setNewBrandInput(''); }}
                            className="px-1.5 py-1 text-slate-500 hover:text-slate-700 text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick Select Brand Dropdown */}
                    {isEditing && (
                      <div className="mt-1.5">
                        <select
                          disabled={!isEditing}
                          value={availableBrands.some(b => b.toLowerCase() === (make || '').toLowerCase()) ? availableBrands.find(b => b.toLowerCase() === (make || '').toLowerCase()) : ''}
                          onChange={e => {
                            if (e.target.value) {
                              setMake(e.target.value);
                              setHasUnsavedChanges(true);
                              const defaultModels = getVehicleModelsForBrand(e.target.value);
                              if (defaultModels.length > 0) {
                                setModel(defaultModels[0]);
                              }
                            }
                          }}
                          className="w-full px-2 py-1 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer focus:bg-white"
                        >
                          <option value="">▼ Select Brand ({availableBrands.length})...</option>
                          {availableBrands.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Model Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Model *</label>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => { setIsAddingModel(true); setIsAddingBrand(false); }}
                          className="text-[10px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5 cursor-pointer bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded"
                          title="Add custom model for this brand"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Model</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        list="vehicle-models-list"
                        disabled={!isEditing}
                        value={model || ''}
                        onChange={e => { setModel(e.target.value); setHasUnsavedChanges(true); }}
                        placeholder={make ? `e.g. ${availableModels[0] || 'Land Cruiser'}` : 'Model'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                      <datalist id="vehicle-models-list">
                        {availableModels.map(m => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>

                    {/* Inline Add Model Form */}
                    {isAddingModel && (
                      <div className="mt-1.5 p-2 bg-sky-50 border border-sky-200 rounded-xl shadow-xs animate-in fade-in">
                        <label className="text-[10px] font-bold text-sky-900 block mb-1">Add Model for {make || 'Brand'}:</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newModelInput}
                            onChange={e => setNewModelInput(e.target.value)}
                            placeholder="e.g. Prado TX-L, Raptor..."
                            className="flex-1 px-2 py-1 text-xs bg-white border border-sky-300 rounded-lg focus:outline-hidden"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveNewModel(); } }}
                          />
                          <button
                            type="button"
                            onClick={handleSaveNewModel}
                            className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsAddingModel(false); setNewModelInput(''); }}
                            className="px-1.5 py-1 text-slate-500 hover:text-slate-700 text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick Select Model Dropdown */}
                    {isEditing && (
                      <div className="mt-1.5">
                        <select
                          disabled={!isEditing}
                          value={availableModels.some(m => m.toLowerCase() === (model || '').toLowerCase()) ? availableModels.find(m => m.toLowerCase() === (model || '').toLowerCase()) : ''}
                          onChange={e => {
                            if (e.target.value) {
                              setModel(e.target.value);
                              setHasUnsavedChanges(true);
                            }
                          }}
                          className="w-full px-2 py-1 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer focus:bg-white"
                        >
                          <option value="">▼ Select Model ({availableModels.length})...</option>
                          {availableModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Year (Canonical)</label>
                    <input
                      type="number"
                      disabled={!isEditing}
                      value={year ?? new Date().getFullYear()}
                      onChange={e => { setYear(Number(e.target.value)); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={color || ''}
                      onChange={e => { setColor(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Pearl White"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Popular Brand & Model Quick Pick Chips Bar */}
                {isEditing && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span>⚡ Popular Vehicle Brands:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setIsAddingBrand(true); setIsAddingModel(false); }}
                        className="text-[10px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Add Brand</span>
                      </button>
                    </div>

                    {/* Brands List */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        'Toyota',
                        'Kia',
                        'Nissan',
                        'GMC',
                        'Chevrolet',
                        'Ford',
                        'BMW',
                        'Mercedes',
                        'Jeep',
                        'Volkswagen',
                        'Audi',
                        'Suzuki',
                        'Lexus'
                      ].map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setMake(b);
                            setHasUnsavedChanges(true);
                            const topModels = getVehicleModelsForBrand(b);
                            if (topModels.length > 0) {
                              setModel(topModels[0]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            make?.toLowerCase() === b.toLowerCase()
                              ? 'bg-sky-600 text-white shadow-xs scale-105'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>

                    {/* Common Models for Selected Brand */}
                    {availableModels.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Common {make} Models:
                          </span>
                          <button
                            type="button"
                            onClick={() => { setIsAddingModel(true); setIsAddingBrand(false); }}
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Add Model</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {availableModels.slice(0, 10).map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setModel(m);
                                setHasUnsavedChanges(true);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                model?.toLowerCase() === m.toLowerCase()
                                  ? 'bg-emerald-600 text-white font-bold shadow-xs scale-105'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Odometer (Last Recorded KM)
                    </label>
                    <div className="relative">
                      <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        disabled={!isEditing}
                        value={mileage !== null && mileage !== undefined ? mileage : ''}
                        onChange={e => { 
                          const val = e.target.value;
                          setMileage(val === '' ? null : Number(val)); 
                          setHasUnsavedChanges(true); 
                        }}
                        placeholder="e.g. 45000"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notes & Service Reminders
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={notes || ''}
                      onChange={e => { setNotes(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Air suspension warranty, custom brake pads..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OWNER */}
          {activeTab === 'owner' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                Registered Vehicle Owner
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Customer Account
                  </label>
                  <select
                    disabled={!isEditing}
                    value={customerId || ''}
                    onChange={e => {
                      const cId = e.target.value;
                      setCustomerId(cId);
                      const match = customers.find(c => c.id === cId);
                      if (match) {
                        setCustomerName(match.name);
                        setCustomerPhone(match.phone);
                      }
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">Direct / Walk-in Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - {c.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    disabled
                    value={customerPhone || ''}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-slate-100 text-slate-700"
                  />
                </div>
              </div>

              {customerId && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{customerName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Linked ID: {customerId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCustomer?.(customerId)}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-blue-700 font-bold text-xs rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Customer Record</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICE HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Chronological Service History</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">{vehicleJobCards.length} visit(s)</span>
              </div>

              {vehicleJobCards.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">No previous service history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicleJobCards.map(jc => (
                    <div
                      key={jc.id}
                      onClick={() => onOpenJobCard?.(jc.id)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/30 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            {jc.jobNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{formatDate(jc.dateIn)}</span>
                          <span className="text-xs px-2 py-0.2 rounded-full bg-slate-200 text-slate-700 font-semibold">{jc.status}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Complaints: {jc.customerComplaints || 'Routine Maintenance'}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-xs font-black text-slate-900">QAR {(jc.totalAmount || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">{jc.assignedTechnician}</div>
                      </div>
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
                <h3 className="font-bold text-slate-900 text-sm">Job Cards ({vehicleJobCards.length})</h3>
                {selectedVehicleId && (
                  <button
                    type="button"
                    onClick={() => onCreateJobForVehicle?.(plateNumber, make, model, customerId)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Job Card</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {vehicleJobCards.map(j => (
                  <div key={j.id} onClick={() => onOpenJobCard?.(j.id)} className="p-3 rounded-xl border bg-slate-50 flex justify-between cursor-pointer">
                    <div>
                      <span className="font-mono font-bold text-blue-700">{j.jobNumber}</span>
                      <span className="text-xs text-slate-600 ml-2">{formatDate(j.dateIn)}</span>
                    </div>
                    <span className="font-mono font-bold text-xs">QAR {(j.totalAmount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Invoices ({vehicleInvoices.length})</h3>
              <div className="space-y-2">
                {vehicleInvoices.map(inv => (
                  <div key={inv.id} onClick={() => onOpenInvoice?.(inv.id)} className="p-3 rounded-xl border bg-slate-50 flex justify-between cursor-pointer">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <span className="text-xs text-slate-500 ml-2">{formatDate(inv.date)}</span>
                    </div>
                    <span className="font-mono font-bold text-xs">QAR {(inv.grandTotal || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PARTS USED */}
          {activeTab === 'parts' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Consolidated Parts Replaced ({consolidatedParts.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Job Card</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Part Name / SKU</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {consolidatedParts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-blue-700 font-bold">{p.jobCardNumber}</td>
                        <td className="p-2 text-slate-600">{formatDate(p.date)}</td>
                        <td className="p-2 font-sans font-medium text-slate-900">{p.name || p.sku}</td>
                        <td className="p-2 text-center font-bold">{p.quantity}</td>
                        <td className="p-2 text-right">QAR {p.unitPrice}</td>
                        <td className="p-2 text-right font-bold">QAR {p.total || (p.quantity * p.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Inspection Photos & Registration Docs</h3>
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">No attachments uploaded</p>
                <p className="text-xs text-slate-500 mt-1">Estimates, insurance claims and DVI photo captures will appear here.</p>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <RecordAuditTrail
                entries={auditLogs.filter((a: any) => 
                  a.record_id === selectedVehicleId || 
                  a.record_number === docNumber ||
                  (a.details && a.details.includes(plateNumber))
                )}
                recordId={selectedVehicleId || undefined}
                recordNumber={docNumber}
                moduleName="Vehicle"
              />
            </div>
          )}
        </RecordManagementShell>
      </div>
    </div>
  );
};
