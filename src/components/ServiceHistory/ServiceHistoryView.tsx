import React, { useState } from 'react';
import { JobCard, Invoice, GarageSettings } from '../../types';
import { formatDate } from '../../utils/formatters';
import { 
  Search, 
  Car, 
  Clock, 
  Wrench, 
  Paintbrush, 
  Package, 
  Receipt, 
  CheckCircle2, 
  User, 
  Calendar, 
  AlertCircle,
  Plus,
  ShieldCheck,
  Fuel,
  TrendingUp
} from 'lucide-react';

interface Props {
  initialQuery?: string;
  getVehicleHistory: (query: string) => {
    vehicleSummary?: JobCard['vehicle'];
    customerSummary?: JobCard['customer'];
    jobCards: JobCard[];
    invoices: Invoice[];
    totalSpent: number;
    totalVisits: number;
  };
  onOpenNewJobForVehicle: (vehicle: JobCard['vehicle'], customer: JobCard['customer']) => void;
  onSelectJobCard: (card: JobCard) => void;
  onViewInvoice: (invoiceId: string) => void;
  settings: GarageSettings;
}

const PRESET_SEARCHES = ['8XYZ492', '6TRK819', '9MTR304', '7KWD155'];

export const ServiceHistoryView: React.FC<Props> = ({
  initialQuery = '8XYZ492',
  getVehicleHistory,
  onOpenNewJobForVehicle,
  onSelectJobCard,
  onViewInvoice,
  settings,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeSearch, setActiveSearch] = useState(initialQuery);

  const historyData = getVehicleHistory(activeSearch);
  const { vehicleSummary, customerSummary, jobCards, invoices, totalSpent, totalVisits } = historyData;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveSearch(query.trim());
    }
  };

  const handlePresetClick = (preset: string) => {
    setQuery(preset);
    setActiveSearch(preset);
  };

  // Find max odometer reading
  const latestOdo = (jobCards || []).reduce((max, jc) => Math.max(max, jc.vehicle?.odometer || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Vehicle Service History &amp; Dossier</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Lookup past mechanical repairs, denting-painting records, replaced parts, and odometer logs by license plate or VIN.
        </p>
      </div>

      {/* Search Bar & Quick Plate Presets */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter Vehicle License Plate Number, 17-digit VIN, or Customer Phone..."
              value={query || ''}
              onChange={e => setQuery(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-hidden uppercase"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Search className="w-3.5 h-3.5" /> Search Vehicle
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">Recent vehicles in shop:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SEARCHES.map(plate => (
              <button
                key={plate}
                type="button"
                onClick={() => handlePresetClick(plate)}
                className={`font-mono px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
                  activeSearch === plate
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {plate}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results View */}
      {jobCards.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Service Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No past job cards found for "{activeSearch}". Verify the license plate number or create a new job card for this vehicle.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Vehicle Profile Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
                  <Car className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl font-extrabold tracking-wider bg-white text-slate-900 px-2.5 py-0.5 rounded-md shadow-xs">
                      {vehicleSummary?.plateNumber}
                    </span>
                    <span className="text-sm font-medium text-slate-300">
                      {vehicleSummary?.year} {vehicleSummary?.make} {vehicleSummary?.model}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>VIN: <strong className="font-mono text-slate-300">{vehicleSummary?.vin || 'N/A'}</strong></span>
                    <span>Color: <strong className="text-slate-300">{vehicleSummary?.color}</strong></span>
                    <span>Owner: <strong className="text-slate-200">{customerSummary?.name}</strong> ({customerSummary?.phone})</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Service Visits</span>
                  <span className="text-lg font-bold font-mono text-white">{totalVisits}</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Latest Mileage</span>
                  <span className="text-lg font-bold font-mono text-white">{(latestOdo || 0).toLocaleString()} mi</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Billed</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">${totalSpent.toFixed(0)}</span>
                </div>

                {vehicleSummary && customerSummary && (
                  <button
                    type="button"
                    onClick={() => onOpenNewJobForVehicle(vehicleSummary, customerSummary)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Book New Service
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Timeline of Visits */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Service &amp; Repair History Timeline ({jobCards.length} Visits)
            </h3>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
              {jobCards.map((card, idx) => {
                const isDenting = card.dentingPaintingPanels.length > 0;
                const isMech = card.mechanicalTasks.length > 0;
                return (
                  <div key={card.id} className="relative pl-10">
                    {/* Timeline bullet dot */}
                    <div className="absolute left-2.5 top-5 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-white border-2 border-slate-900" />

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow">
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm border border-indigo-100">
                            {card.jobNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {card.jobType}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Date In: {formatDate(card.dateIn)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded-sm text-slate-700">
                            Odo: {(card.vehicle?.odometer ?? 0).toLocaleString()} mi
                          </span>
                          <span className="text-xs font-bold font-mono text-slate-900 bg-slate-50 px-2.5 py-0.5 rounded-sm border border-slate-200">
                            ${card.totalAmount.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectJobCard(card)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline ml-1"
                          >
                            Open Job Card ➔
                          </button>
                        </div>
                      </div>

                      {/* Complaint & Diagnosis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-700 block mb-1">Customer Complaint:</span>
                          <p className="text-slate-600">{card.customerComplaints || 'Routine checkup & scheduled maintenance.'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-700 block mb-1">Workshop Diagnosis &amp; Scope:</span>
                          <p className="text-slate-600">{card.diagnosisNotes || 'Service completed per factory specifications.'}</p>
                        </div>
                      </div>

                      {/* Mechanical Work Itemized */}
                      {isMech && (
                        <div className="mb-4">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                            <Wrench className="w-3.5 h-3.5 text-blue-600" />
                            Mechanical Repairs Completed ({card.mechanicalTasks.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {card.mechanicalTasks.map(task => (
                              <div key={task.id} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-slate-800">[{task.category}] {task.description}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {task.estimatedHours} hrs @ ${task.hourlyRate}/h • Status: <strong className="text-emerald-700">{task.status}</strong>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Denting & Painting Work Itemized */}
                      {isDenting && (
                        <div className="mb-4">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                            <Paintbrush className="w-3.5 h-3.5 text-purple-600" />
                            Collision Denting &amp; Paint Work ({card.dentingPaintingPanels.length} Panels):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            {card.dentingPaintingPanels.map(panel => (
                              <div key={panel.id} className="border border-purple-100 bg-purple-50/40 rounded-lg p-2.5">
                                <div className="font-bold text-slate-900">{panel.panelName}</div>
                                <div className="text-[11px] text-slate-600 mt-0.5">
                                  {panel.damageType} ➔ <span className="font-semibold text-purple-800">{panel.action}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-1">
                                  Paint: {panel.paintCode || 'OEM Match'} ({panel.coatType || 'Metallic'})
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Spare Parts Installed */}
                      {card.partsUsed.length > 0 && (
                        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-500 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-slate-400" /> Replaced Parts:
                          </span>
                          {card.partsUsed.map(part => (
                            <span
                              key={part.id}
                              className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200"
                            >
                              {part.name} <span className="font-mono text-slate-500">x{part.quantity}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Invoice Link */}
                      {card.invoiceId && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            Invoice Generated: <strong className="font-mono text-slate-700">#{card.jobNumber.replace('JC-', 'INV-')}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => onViewInvoice(card.invoiceId!)}
                            className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 hover:underline"
                          >
                            <Receipt className="w-3.5 h-3.5" /> View Invoice
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
