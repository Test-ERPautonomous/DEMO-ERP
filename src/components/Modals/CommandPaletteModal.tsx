import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Wrench, 
  Car, 
  Package, 
  Receipt, 
  Plus, 
  X, 
  Command, 
  User, 
  ChevronRight, 
  Phone, 
  FileText,
  ShoppingBag,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useGarage } from '../../context/GarageContext';
import { JobCard, Invoice, InventoryItem, CustomerMasterItem, VehicleMasterItem } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectJobCard?: (card: JobCard) => void;
  onSelectInvoice?: (invoiceId: string) => void;
  onNavigateTab?: (tab: string, subTab?: string) => void;
  onOpenCreateJob?: () => void;
}

export const CommandPaletteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectJobCard,
  onSelectInvoice,
  onNavigateTab,
  onOpenCreateJob,
}) => {
  const { jobCards, inventory, invoices, customers, vehicles } = useGarage();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open & clear state
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape listener (Ctrl+K opening handled in App.tsx)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = (query || '').trim().toLowerCase();
  const digitsOnlyQuery = trimmed.replace(/\D/g, '');
  const alphaNumQuery = trimmed.replace(/[^a-z0-9]/g, '');

  const phoneMatches = (phone?: string) => {
    if (!phone) return false;
    const phoneLower = phone.toLowerCase();
    if (phoneLower.includes(trimmed)) return true;
    if (digitsOnlyQuery.length >= 1) {
      const phoneDigits = phone.replace(/\D/g, '');
      return phoneDigits.includes(digitsOnlyQuery);
    }
    return false;
  };

  const vinMatches = (vin?: string, chassis?: string) => {
    const target = vin || chassis;
    if (!target) return false;
    const targetLower = target.toLowerCase();
    if (targetLower.includes(trimmed)) return true;
    if (alphaNumQuery.length >= 1) {
      const targetClean = targetLower.replace(/[^a-z0-9]/g, '');
      return targetClean.includes(alphaNumQuery);
    }
    return false;
  };

  // Search Results
  const matchedJobs = trimmed
    ? jobCards
        .filter(
          (j) =>
            j.jobNumber?.toLowerCase().includes(trimmed) ||
            j.customer?.name?.toLowerCase().includes(trimmed) ||
            phoneMatches(j.customer?.phone) ||
            phoneMatches((j as any).customerPhone) ||
            j.vehicle?.plateNumber?.toLowerCase().includes(trimmed) ||
            vinMatches(j.vehicle?.vin, (j.vehicle as any)?.chassisNumber || (j.vehicle as any)?.vinChassisNo) ||
            j.vehicle?.make?.toLowerCase().includes(trimmed) ||
            j.vehicle?.model?.toLowerCase().includes(trimmed) ||
            j.status?.toLowerCase().includes(trimmed)
        )
        .slice(0, 5)
    : jobCards.slice(0, 3); // show recent 3 when empty

  const matchedCustomers = trimmed
    ? customers
        .filter(
          (c) =>
            c.name?.toLowerCase().includes(trimmed) ||
            phoneMatches(c.phone) ||
            phoneMatches(c.contact) ||
            c.email?.toLowerCase().includes(trimmed) ||
            c.code?.toLowerCase().includes(trimmed) ||
            c.qid?.toLowerCase().includes(trimmed)
        )
        .slice(0, 4)
    : customers.slice(0, 3);

  const matchedVehicles = trimmed
    ? vehicles
        .filter(
          (v) =>
            v.plateNumber?.toLowerCase().includes(trimmed) ||
            vinMatches(v.vin, (v as any).chassisNumber) ||
            v.make?.toLowerCase().includes(trimmed) ||
            v.model?.toLowerCase().includes(trimmed) ||
            v.customerName?.toLowerCase().includes(trimmed) ||
            phoneMatches(v.customerPhone)
        )
        .slice(0, 4)
    : vehicles.slice(0, 3);

  const matchedInventory = trimmed
    ? inventory
        .filter(
          (item) =>
            item.name?.toLowerCase().includes(trimmed) ||
            item.sku?.toLowerCase().includes(trimmed) ||
            item.barcode?.toLowerCase().includes(trimmed) ||
            item.brand?.toLowerCase().includes(trimmed) ||
            item.category?.toLowerCase().includes(trimmed)
        )
        .slice(0, 5)
    : inventory.slice(0, 3);

  const matchedInvoices = trimmed
    ? invoices
        .filter(
          (inv) =>
            inv.invoiceNumber?.toLowerCase().includes(trimmed) ||
            inv.customerName?.toLowerCase().includes(trimmed) ||
            inv.vehiclePlate?.toLowerCase().includes(trimmed)
        )
        .slice(0, 4)
    : invoices.slice(0, 3);

  const totalResultsCount =
    matchedJobs.length +
    matchedCustomers.length +
    matchedVehicles.length +
    matchedInventory.length +
    matchedInvoices.length;

  const handleSelectJob = (job: JobCard) => {
    onClose();
    if (onSelectJobCard) {
      onSelectJobCard(job);
    } else if (onNavigateTab) {
      onNavigateTab('work_orders');
    }
  };

  const handleSelectCustomer = (_cust: CustomerMasterItem) => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab('customers_vehicles', 'customers');
    }
  };

  const handleSelectVehicle = (_veh: VehicleMasterItem) => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab('customers_vehicles', 'vehicles');
    }
  };

  const handleSelectPart = (_part: InventoryItem) => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab('inventory');
    }
  };

  const handleSelectInvoiceItem = (inv: Invoice) => {
    onClose();
    if (onSelectInvoice) {
      onSelectInvoice(inv.id);
    } else if (onNavigateTab) {
      onNavigateTab('invoices_payments');
    }
  };

  const statusColorMap: Record<string, string> = {
    'New': 'bg-sky-100 text-sky-800 border-sky-300',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
    'Waiting for Parts': 'bg-amber-100 text-amber-800 border-amber-300',
    'Ready for Pickup': 'bg-purple-100 text-purple-800 border-purple-300',
    'Invoiced': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Paid': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Closed': 'bg-slate-100 text-slate-800 border-slate-300',
    'Cancelled': 'bg-rose-100 text-rose-800 border-rose-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Palette Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-sky-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query ?? ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search work orders, customers, vehicles, parts, invoices... (Esc to close)"
            className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs">
            <Command className="w-3 h-3" /> K
          </div>
        </div>

        {/* Quick Actions Shortcuts (when query is empty) */}
        {!trimmed && (
          <div className="p-3 bg-indigo-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Quick Actions
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenCreateJob) onOpenCreateJob();
                }}
                className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 font-medium rounded-lg shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New Job Card
              </button>
              <button
                onClick={() => {
                  onClose();
                  if (onNavigateTab) onNavigateTab('customers_vehicles');
                }}
                className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 font-medium rounded-lg shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Car className="w-3 h-3" /> Add Customer/Vehicle
              </button>
              <button
                onClick={() => {
                  onClose();
                  if (onNavigateTab) onNavigateTab('inventory');
                }}
                className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 font-medium rounded-lg shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Package className="w-3 h-3" /> Add Part
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-4 divide-y divide-slate-100 max-h-[60vh]">
          {totalResultsCount === 0 && trimmed ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">No matching records found for "{query}"</p>
              <p className="text-xs text-slate-500">Try searching by job number (e.g. JC-2026-0001), plate number, phone, customer name, or part SKU.</p>
            </div>
          ) : null}

          {/* 1. Work Orders / Job Cards */}
          {matchedJobs.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-sky-600" /> Job Cards ({matchedJobs.length})
                </span>
                <span className="text-[10px] text-slate-600">Job Card # / Plate / Customer</span>
              </div>
              <div className="mt-1 space-y-1">
                {matchedJobs.map((job) => (
                  <button
                    key={job.id || job.jobNumber}
                    onClick={() => handleSelectJob(job)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 transition-colors flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-sky-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        JC
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-sky-900 group-hover:underline">
                            {job.jobNumber}
                          </span>
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {job.customer?.name || 'Customer'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-slate-700">
                            {job.vehicle?.plateNumber || 'No Plate'}
                          </span>
                          <span>•</span>
                          <span>{job.vehicle?.make} {job.vehicle?.model}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${statusColorMap[job.status] || 'bg-slate-100 text-slate-700'}`}>
                        {job.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Customers */}
          {matchedCustomers.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Customers ({matchedCustomers.length})
                </span>
                <span className="text-[10px] text-slate-600">Name / Phone</span>
              </div>
              <div className="mt-1 space-y-1">
                {matchedCustomers.map((cust) => (
                  <button
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-indigo-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {cust.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-indigo-900 block truncate">
                          {cust.name}
                        </span>
                        <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Vehicles */}
          {matchedVehicles.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-600" /> Vehicles ({matchedVehicles.length})
                </span>
                <span className="text-[10px] text-slate-600">Plate Number / VIN</span>
              </div>
              <div className="mt-1 space-y-1">
                {matchedVehicles.map((veh) => (
                  <button
                    key={veh.id || veh.plateNumber}
                    onClick={() => handleSelectVehicle(veh)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-emerald-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        🚘
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-900">
                            {veh.plateNumber}
                          </span>
                          <span className="font-semibold text-xs text-slate-800 truncate">
                            {veh.make} {veh.model} ({veh.year || new Date().getFullYear()})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Owner: <span className="font-medium text-slate-700">{veh.customerName || 'N/A'}</span>
                          {veh.vin ? ` • VIN: ${veh.vin}` : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Parts & Inventory */}
          {matchedInventory.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600" /> Spare Parts &amp; Stock ({matchedInventory.length})
                </span>
                <span className="text-[10px] text-slate-600">Part Name / SKU</span>
              </div>
              <div className="mt-1 space-y-1">
                {matchedInventory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectPart(item)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-amber-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        📦
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-amber-900 block truncate">
                          {item.name}
                        </span>
                        <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-700">SKU: {item.sku}</span>
                          <span>•</span>
                          <span className="font-medium text-amber-800">QAR {item.sellingPrice}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        item.quantityOnHand <= item.reorderPoint
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        Stock: {item.quantityOnHand} {item.unit || 'pcs'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Invoices */}
          {matchedInvoices.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-purple-600" /> Invoices ({matchedInvoices.length})
                </span>
                <span className="text-[10px] text-slate-600">Invoice # / Customer</span>
              </div>
              <div className="mt-1 space-y-1">
                {matchedInvoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => handleSelectInvoiceItem(inv)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-purple-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        INV
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-purple-900">
                            {inv.invoiceNumber}
                          </span>
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {inv.customerName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Plate: <span className="font-mono font-semibold text-slate-700">{inv.vehiclePlate}</span>
                          {' • '}
                          Amount: <span className="font-bold text-purple-900">QAR {inv.totalAmount}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : inv.status === 'Partially Paid'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-800 border border-slate-300'
                      }`}>
                        {inv.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold">Esc</kbd> to exit</span>
          </span>
          <span className="text-slate-400 font-mono">Global Command Palette</span>
        </div>
      </div>
    </div>
  );
};
