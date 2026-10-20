import React, { useState, useEffect } from 'react';
import { GarageSettings, CustomerMasterItem, VehicleMasterItem, SupplierMasterItem } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { 
  Users, 
  Car, 
  Truck, 
  Wrench, 
  Paintbrush, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  FileText
} from 'lucide-react';
import { ModuleContainer } from '../Common/ModuleContainer';
import { DataTable } from '../Common/DataTable';
import { Badge } from '../Common/Badge';
import { exportCustomersToCSV, exportVehiclesToCSV, exportToCsv } from '../../utils/csvExport';
import { CustomerRecordModal } from './CustomerRecordModal';
import { VehicleRecordModal } from './VehicleRecordModal';
import { SupplierRecordModal } from './SupplierRecordModal';

interface Props {
  settings: GarageSettings;
  onUpdateSettings?: (settings: GarageSettings) => void;
  onOpenNewJobForVehicle?: (plate: string, make: string, model: string) => void;
  onOpenJobCard?: (jobCardId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  initialTab?: string;
}

export const MastersWindow: React.FC<Props> = ({ 
  onOpenNewJobForVehicle, 
  onOpenJobCard,
  onOpenInvoice,
  initialTab 
}) => {
  const {
    customers,
    deleteCustomer,
    suppliers,
    deleteSupplier,
    vehicles,
    deleteVehicle,
  } = useGarage();

  const [activeTab, setActiveTab] = useState<string>(initialTab || 'customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Record Modals State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null | undefined>(undefined);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null | undefined>(undefined);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null | undefined>(undefined);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenAddModal = () => {
    if (activeTab === 'customers') {
      setSelectedCustomerId(null);
      setIsCustomerModalOpen(true);
    } else if (activeTab === 'vehicles') {
      setSelectedVehicleId(null);
      setIsVehicleModalOpen(true);
    } else if (activeTab === 'suppliers') {
      setSelectedSupplierId(null);
      setIsSupplierModalOpen(true);
    }
  };

  const handleEditCustomer = (c: CustomerMasterItem) => {
    setSelectedCustomerId(c.id);
    setIsCustomerModalOpen(true);
  };

  const handleEditVehicle = (v: VehicleMasterItem) => {
    setSelectedVehicleId(v.id);
    setIsVehicleModalOpen(true);
  };

  const handleEditSupplier = (s: SupplierMasterItem) => {
    setSelectedSupplierId(s.id);
    setIsSupplierModalOpen(true);
  };

  const handleExport = () => {
    if (activeTab === 'customers') {
      exportCustomersToCSV(customers);
    } else if (activeTab === 'vehicles') {
      exportVehiclesToCSV(vehicles);
    } else if (activeTab === 'suppliers') {
      exportToCsv('najm_suppliers', [
        { header: 'Supplier ID', accessor: (s: any) => s.supplierNumber || s.id },
        { header: 'Supplier Name', accessor: (s: SupplierMasterItem) => s.name },
        { header: 'Category', accessor: (s: SupplierMasterItem) => s.category },
        { header: 'Contact Person', accessor: (s: SupplierMasterItem) => (s as any).contactPerson || s.contact || '' },
        { header: 'Phone', accessor: (s: SupplierMasterItem) => s.phone || '' },
        { header: 'Location', accessor: (s: SupplierMasterItem) => s.location || '' },
        { header: 'Terms', accessor: (s: SupplierMasterItem) => s.terms || 'Net 30' },
        { header: 'Balance (QAR)', accessor: (s: SupplierMasterItem) => (s as any).currentBalance || 0 }
      ], suppliers);
    } else {
      alert('Export feature ready for ' + activeTab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'customers':
        return (
          <DataTable
            data={customers}
            columns={[
              {
                header: 'Customer ID',
                accessor: (c: CustomerMasterItem) => (
                  <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {c.id}
                  </span>
                )
              },
              { 
                header: 'Customer Name', 
                accessor: (c: CustomerMasterItem) => (
                  <div 
                    onClick={() => handleEditCustomer(c)}
                    className="cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    <div className="font-bold text-slate-900">{c.name}</div>
                    {c.nameAr && <div className="text-xs text-slate-400 font-arabic">{c.nameAr}</div>}
                  </div>
                ) 
              },
              { header: 'Contact Person', accessor: (c: CustomerMasterItem) => <div className="text-slate-600 text-xs">{c.contact || '-'}</div> },
              { header: 'Phone', accessor: (c: CustomerMasterItem) => <div className="font-mono text-slate-700 font-bold text-xs">{c.phone}</div> },
              { header: 'Account Type', accessor: (c: CustomerMasterItem) => <Badge variant={c.accountType === 'Credit' ? 'purple' : 'sky'}>{c.accountType}</Badge> },
              { header: 'Balance', accessor: (c: CustomerMasterItem) => <div className="text-right font-bold text-slate-900 font-mono text-xs">QAR {(c.balance || 0).toLocaleString()}</div>, headerClassName: 'text-right' },
              {
                header: 'Actions',
                accessor: (c: CustomerMasterItem) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => handleEditCustomer(c)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                      title="Open Customer Record"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete customer ${c.name}?`)) {
                          deleteCustomer(c.id);
                          showFeedback('success', `Customer ${c.name} deleted.`);
                        }
                      }}
                      className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
                headerClassName: 'text-right'
              }
            ]}
            searchPlaceholder="Search Customers by CU number, name, phone, QID..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case 'vehicles':
        return (
          <DataTable
            data={vehicles}
            columns={[
              {
                header: 'Vehicle ID',
                accessor: (v: any) => (
                  <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {v.vehicleNumber || v.id}
                  </span>
                )
              },
              { 
                header: 'Plate Number', 
                accessor: (v: VehicleMasterItem) => (
                  <div 
                    onClick={() => handleEditVehicle(v)}
                    className="font-black text-slate-900 font-mono bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-slate-300 inline-block shadow-2xs cursor-pointer"
                  >
                    {v.plateNumber}
                  </div>
                )
              },
              { 
                header: 'Make / Model', 
                accessor: (v: VehicleMasterItem) => (
                  <div>
                    <div className="font-bold text-slate-900">{v.make} {v.model}</div>
                    <div className="text-xs text-slate-500 font-mono">{v.yearFrom} • {v.color || 'Standard'}</div>
                  </div>
                )
              },
              { 
                header: 'Owner', 
                accessor: (v: VehicleMasterItem) => (
                  <div>
                    <div className="font-medium text-slate-800 text-xs">{v.customerName || 'Direct Customer'}</div>
                    <div className="text-[11px] font-mono text-slate-400">{v.customerPhone || '-'}</div>
                  </div>
                ) 
              },
              { header: 'Engine / VIN', accessor: (v: VehicleMasterItem) => <div className="text-xs font-mono text-slate-500">{v.vin || v.engine || '-'}</div> },
              {
                header: 'Actions',
                accessor: (v: VehicleMasterItem) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => onOpenNewJobForVehicle?.(v.plateNumber || '', v.make, v.model)}
                      className="px-2.5 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-lg border border-sky-200 hover:bg-sky-100 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-sky-600" />
                      <span>+ Job</span>
                    </button>
                    <button 
                      onClick={() => handleEditVehicle(v)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Delete vehicle ${v.plateNumber}?`)) {
                          deleteVehicle(v.id);
                          showFeedback('success', `Vehicle ${v.plateNumber} deleted.`);
                        }
                      }}
                      className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
                headerClassName: 'text-right'
              }
            ]}
            searchPlaceholder="Search Vehicles by VE number, plate, make, model, chassis..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case 'suppliers':
        return (
          <DataTable
            data={suppliers}
            columns={[
              {
                header: 'Supplier ID',
                accessor: (s: any) => (
                  <span className="font-mono font-bold text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {s.supplierNumber || s.id}
                  </span>
                )
              },
              { 
                header: 'Supplier Name', 
                accessor: (s: any) => (
                  <div 
                    onClick={() => handleEditSupplier(s)}
                    className="cursor-pointer hover:text-amber-700 transition-colors"
                  >
                    <div className="font-bold text-slate-900">{s.name}</div>
                    {s.nameAr && <div className="text-xs text-slate-400 font-arabic">{s.nameAr}</div>}
                  </div>
                ) 
              },
              { header: 'Category', accessor: (s: any) => <Badge variant="amber">{s.category}</Badge> },
              { header: 'Contact & Phone', accessor: (s: any) => <div><div className="text-slate-800 font-medium text-xs">{s.contactPerson || s.contact || '-'}</div><div className="text-[11px] font-mono text-slate-500">{s.phone}</div></div> },
              { header: 'Location', accessor: (s: any) => <div className="text-slate-600 text-xs">{s.location || s.address || '-'}</div> },
              { header: 'Terms', accessor: (s: any) => <div className="text-xs font-mono text-slate-500 font-bold">{s.terms || 'Net 30'}</div> },
              {
                header: 'Actions',
                accessor: (s: any) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => handleEditSupplier(s)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Delete supplier ${s.name}?`)) {
                          deleteSupplier(s.id);
                          showFeedback('success', `Supplier ${s.name} deleted.`);
                        }
                      }}
                      className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
                headerClassName: 'text-right'
              }
            ]}
            searchPlaceholder="Search Suppliers by SU number, name, contact, category..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      default:
        return (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Registry for {activeTab}</p>
            <p className="text-xs mt-1">Standard rates and specifications active.</p>
          </div>
        );
    }
  };

  const getIcon = () => {
    switch (activeTab) {
      case 'customers': return Users;
      case 'vehicles': return Car;
      case 'suppliers': return Truck;
      default: return Users;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'customers': return 'Customers';
      case 'vehicles': return 'Vehicles';
      case 'suppliers': return 'Suppliers';
      default: return 'Customers';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'customers': return 'Find or create customer profiles, view contact details and vehicle history';
      case 'vehicles': return 'Search by plate number, make, model, or VIN to view job history';
      case 'suppliers': return 'Registered parts and service vendors';
      default: return 'Customer profiles and registered vehicles';
    }
  };

  return (
    <ModuleContainer
      title={getTitle()}
      subtitle={getSubtitle()}
      icon={getIcon()}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New {activeTab === 'customers' ? 'Customer' : activeTab === 'vehicles' ? 'Vehicle' : 'Supplier'}</span>
          </button>
        </div>
      }
      tabs={
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[500px]">
          {[
            { id: 'customers', label: 'Customers' },
            { id: 'vehicles', label: 'Vehicles' },
            { id: 'suppliers', label: 'Suppliers' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id ? 'bg-white shadow-xs text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      {feedback && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {renderContent()}

      {/* 1. UNIFIED CUSTOMER RECORD MODAL */}
      {isCustomerModalOpen && (
        <CustomerRecordModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          customerId={selectedCustomerId}
          onOpenJobCard={onOpenJobCard}
          onOpenInvoice={onOpenInvoice}
          onOpenVehicle={vId => {
            setSelectedVehicleId(vId);
            setIsCustomerModalOpen(false);
            setIsVehicleModalOpen(true);
          }}
          onAddVehicleForCustomer={(cId, cName) => {
            setSelectedVehicleId(null);
            setIsCustomerModalOpen(false);
            setIsVehicleModalOpen(true);
          }}
          onCreateJobForCustomer={(cId, cName) => {
            setIsCustomerModalOpen(false);
            onOpenNewJobForVehicle?.('', '', '');
          }}
        />
      )}

      {/* 2. UNIFIED VEHICLE RECORD MODAL */}
      {isVehicleModalOpen && (
        <VehicleRecordModal
          isOpen={isVehicleModalOpen}
          onClose={() => setIsVehicleModalOpen(false)}
          vehicleId={selectedVehicleId}
          onOpenJobCard={onOpenJobCard}
          onOpenInvoice={onOpenInvoice}
          onOpenCustomer={cId => {
            setSelectedCustomerId(cId);
            setIsVehicleModalOpen(false);
            setIsCustomerModalOpen(true);
          }}
          onCreateJobForVehicle={(plate, make, model) => {
            setIsVehicleModalOpen(false);
            onOpenNewJobForVehicle?.(plate, make, model);
          }}
        />
      )}

      {/* 3. UNIFIED SUPPLIER RECORD MODAL */}
      {isSupplierModalOpen && (
        <SupplierRecordModal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          supplierId={selectedSupplierId}
        />
      )}
    </ModuleContainer>
  );
};
