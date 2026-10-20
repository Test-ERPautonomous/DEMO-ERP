import React, { useState, useEffect, useMemo } from 'react';
import { JobCard, JobStatus } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { useToast } from '../Common/Toast';
import { generateJobCardPDF } from '../../utils/pdfGenerator';
import { formatDate } from '../../utils/formatters';
import { JobCardKanban } from './JobCardKanban';
import { WhatsAppEstimateModal } from './WhatsAppEstimateModal';
import { DviModal } from './DviModal';
import { ModuleContainer } from '../Common/ModuleContainer';
import { Badge } from '../Common/Badge';
import { 
  Plus, 
  Wrench, 
  ArrowRight, 
  LayoutGrid, 
  List as ListIcon, 
  Receipt, 
  Edit3, 
  Trash2,
  Calendar,
  Printer,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Car,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban
} from 'lucide-react';

interface Props {
  jobCards: JobCard[];
  onOpenCreate: () => void;
  onEdit: (card: JobCard) => void;
  onDelete: (id: string) => void;
  onAdvanceStatus: (id: string, nextStatus: JobStatus) => void;
  onGenerateInvoice: (jobCardId: string) => void;
  onSelectVehicleHistory: (plate: string) => void;
  initialStatusFilter?: string;
}

export const WORK_ORDER_STATUSES: JobStatus[] = [
  'New',
  'Estimate',
  'Waiting for Approval',
  'Approved',
  'In Progress',
  'Waiting for Parts',
  'Ready for Pickup',
  'Invoiced',
  'Paid',
  'Closed',
  'Cancelled',
];

export const JobCardList: React.FC<Props> = ({
  jobCards,
  onOpenCreate,
  onEdit,
  onDelete,
  onAdvanceStatus,
  onGenerateInvoice,
  onSelectVehicleHistory,
  initialStatusFilter = 'ALL',
}) => {
  const { settings, updateJobCard } = useGarage();
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'kanban'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // React to initialStatusFilter changes from outside navigation
  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
      setCurrentPage(1);
    }
  }, [initialStatusFilter]);

  // Modals
  const [whatsAppCard, setWhatsAppCard] = useState<JobCard | null>(null);
  const [dviCard, setDviCard] = useState<JobCard | null>(null);

  const filteredCards = useMemo(() => {
    return jobCards.filter(card => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term ||
        (card.jobNumber || '').toLowerCase().includes(term) ||
        (card.vehicle?.plateNumber || '').toLowerCase().includes(term) ||
        (card.vehicle?.vin || '').toLowerCase().includes(term) ||
        (card.vehicle?.make || '').toLowerCase().includes(term) ||
        (card.vehicle?.model || '').toLowerCase().includes(term) ||
        (card.customer?.name || '').toLowerCase().includes(term) ||
        (card.customer?.phone || '').includes(term);

      let matchStatus = true;
      if (statusFilter === 'ALL') {
        matchStatus = true;
      } else if (statusFilter === 'WAITING') {
        matchStatus = card.status === 'New' || card.status === 'Draft' || card.status === 'Received';
      } else {
        matchStatus = card.status === statusFilter;
      }

      return matchSearch && matchStatus;
    });
  }, [jobCards, searchTerm, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCards.length / pageSize) || 1;
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCards.slice(start, start + pageSize);
  }, [filteredCards, currentPage, pageSize]);

  // Next Step Resolution
  const getNextAction = (card: JobCard): { label: string; action: () => void; variant: 'primary' | 'success' | 'amber' | 'neutral' } | null => {
    const current = card.status;
    switch (current) {
      case 'New':
      case 'Draft':
      case 'Received':
        return {
          label: 'Create Estimate',
          action: () => {
            onAdvanceStatus(card.id, 'Estimate');
            addToast('Moved to Estimate', 'info');
          },
          variant: 'primary'
        };
      case 'Estimate':
      case 'Diagnosing':
        return {
          label: 'Send for Approval',
          action: () => {
            onAdvanceStatus(card.id, 'Waiting for Approval');
            addToast('Sent for Customer Approval', 'info');
          },
          variant: 'amber'
        };
      case 'Waiting for Approval':
      case 'Awaiting Customer Approval':
        return {
          label: 'Approve Order',
          action: () => {
            onAdvanceStatus(card.id, 'Approved');
            addToast('Job Card Approved', 'success');
          },
          variant: 'success'
        };
      case 'Approved':
        return {
          label: 'Start Work',
          action: () => {
            onAdvanceStatus(card.id, 'In Progress');
            addToast('Work Started in Bay', 'info');
          },
          variant: 'primary'
        };
      case 'In Progress':
        return {
          label: 'Mark Ready',
          action: () => {
            onAdvanceStatus(card.id, 'Ready for Pickup');
            addToast('Vehicle Ready for Pickup', 'success');
          },
          variant: 'success'
        };
      case 'Waiting for Parts':
      case 'Awaiting Parts':
        return {
          label: 'Resume Work',
          action: () => {
            onAdvanceStatus(card.id, 'In Progress');
            addToast('Parts Received - Work Resumed', 'info');
          },
          variant: 'primary'
        };
      case 'Ready for Pickup':
        return {
          label: 'Generate Invoice',
          action: () => {
            onGenerateInvoice(card.id);
          },
          variant: 'success'
        };
      case 'Invoiced':
        return {
          label: 'Mark Paid',
          action: () => {
            onAdvanceStatus(card.id, 'Paid');
            addToast('Payment Recorded', 'success');
          },
          variant: 'success'
        };
      case 'Paid':
        return {
          label: 'Close & Deliver',
          action: () => {
            onAdvanceStatus(card.id, 'Closed');
            addToast('Job Card Closed Successfully', 'info');
          },
          variant: 'neutral'
        };
      case 'Closed':
      case 'Cancelled':
      default:
        return null;
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'New':
      case 'Received':
      case 'Draft':
        return <Badge variant="info">{status}</Badge>;
      case 'Estimate':
      case 'Diagnosing':
        return <Badge variant="purple">{status}</Badge>;
      case 'Waiting for Approval':
      case 'Awaiting Customer Approval':
        return <Badge variant="amber">{status}</Badge>;
      case 'Approved':
      case 'Ready for Pickup':
        return <Badge variant="success">{status}</Badge>;
      case 'In Progress':
        return <Badge variant="indigo">{status}</Badge>;
      case 'Waiting for Parts':
      case 'Awaiting Parts':
        return <Badge variant="error">{status}</Badge>;
      case 'Invoiced':
      case 'Paid':
        return <Badge variant="success">{status}</Badge>;
      case 'Closed':
        return <Badge variant="default">{status}</Badge>;
      case 'Cancelled':
        return <Badge variant="error">{status}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleDeletePrompt = (card: JobCard) => {
    const shouldVoid = window.confirm(
      `Do you want to permanently delete Job Card ${card.jobNumber}?\n\nTip: Press CANCEL to keep the history or mark it Cancelled instead.`
    );
    if (shouldVoid) {
      onDelete(card.id);
      addToast(`Job Card ${card.jobNumber} removed.`, 'info');
    }
  };

  return (
    <ModuleContainer
      title="Job Cards"
      subtitle="Standardized repair workflow: Customer → Vehicle → Diagnosis → Spares & Labor → Estimate/Invoice → Payment → Delivery"
      icon={FileText}
      actions={
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white shadow-xs text-sky-600' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white shadow-xs text-sky-600' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Technician Card View"
            >
              <Car className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white shadow-xs text-sky-600' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Job Card</span>
          </button>
        </div>
      }
      stats={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100">
            <span className="text-[10px] font-bold text-sky-800 uppercase">Active</span>
            <span className="text-xs font-bold text-sky-600 font-mono">
              {jobCards.filter(c => c.status !== 'Closed' && c.status !== 'Cancelled' && c.status !== 'Delivered').length}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Approval Due</span>
            <span className="text-xs font-bold text-amber-600 font-mono">
              {jobCards.filter(c => c.status === 'Waiting for Approval' || c.status === 'Awaiting Customer Approval').length}
            </span>
          </div>
        </div>
      }
    >
      {/* Top Filter and Search Bar */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Fast Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Plate #, Phone, Name, VIN, Job #..."
              value={searchTerm ?? ''}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium self-center">
            Showing <strong>{filteredCards.length}</strong> of {jobCards.length} Job Cards
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          <button
            onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl border font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({jobCards.length})
          </button>
          
          <button
            onClick={() => { setStatusFilter('WAITING'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl border font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'WAITING' ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Waiting in Queue ({jobCards.filter(c => c.status === 'New' || c.status === 'Draft' || c.status === 'Received').length})
          </button>

          {WORK_ORDER_STATUSES.map(status => {
            const count = jobCards.filter(c => c.status === status).length;
            if (count === 0 && status !== 'In Progress' && status !== 'Ready for Pickup') return null;
            return (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl border font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === status ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{status}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${statusFilter === status ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Port */}
      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-auto p-2 bg-slate-100/50 rounded-2xl">
          <JobCardKanban
            jobCards={filteredCards}
            onSelectJob={onEdit}
            onAdvanceStatus={onAdvanceStatus}
            onOpenWhatsAppModal={(card) => setWhatsAppCard(card)}
            onOpenDVIModal={(card) => setDviCard(card)}
          />
        </div>
      ) : viewMode === 'cards' ? (
        /* Technician Responsive Cards View (Mobile Optimized) */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedCards.map((card) => {
              const next = getNextAction(card);
              return (
                <div
                  key={card.id}
                  onClick={() => onEdit(card)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-sky-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sky-700 text-xs bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                          {card.jobNumber}
                        </span>
                        {card.priority === 'Urgent' && <Badge variant="error">Urgent</Badge>}
                      </div>
                      {getStatusBadge(card.status)}
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectVehicleHistory(card.vehicle.plateNumber); }}
                        className="font-mono font-extrabold text-sm text-slate-900 hover:text-sky-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                      >
                        {card.vehicle.plateNumber || 'No Plate'}
                      </button>
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {card.vehicle.make} {card.vehicle.model} ({card.vehicle.year || '2022'})
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{card.customer.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{card.customer.phone || 'No phone'}</span>
                      </div>
                    </div>

                    {card.customerComplaints && (
                      <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 line-clamp-2 italic">
                        "{card.customerComplaints}"
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-xs text-slate-900">
                      {(card.totalAmount || 0).toFixed(2)} QAR
                    </div>

                    {next ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          next.action();
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                          next.variant === 'primary' ? 'bg-sky-600 text-white hover:bg-sky-700' :
                          next.variant === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                          next.variant === 'amber' ? 'bg-amber-600 text-white hover:bg-amber-700' :
                          'bg-slate-700 text-white hover:bg-slate-800'
                        }`}
                      >
                        <span>{next.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium italic">Completed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCards.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Job Cards found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting a different status filter.</p>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Job Card #</th>
                  <th className="py-3 px-4">Plate & Vehicle</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Recommended Step</th>
                  <th className="py-3 px-4 text-right">Total (QAR)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCards.map((card) => {
                  const next = getNextAction(card);
                  return (
                    <tr
                      key={card.id}
                      onClick={() => onEdit(card)}
                      className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sky-700">{card.jobNumber}</span>
                          {card.priority === 'Urgent' && <Badge variant="error">Urgent</Badge>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" /> {card.dateIn ? formatDate(card.dateIn) : 'Today'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onSelectVehicleHistory(card.vehicle.plateNumber); }}
                            className="font-mono font-extrabold text-slate-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors"
                            title="View vehicle history"
                          >
                            {card.vehicle.plateNumber || 'No Plate'}
                          </button>
                          <span className="font-semibold text-slate-700">
                            {card.vehicle.make} {card.vehicle.model}
                          </span>
                        </div>
                        {card.vehicle.vin && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">VIN: {card.vehicle.vin}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{card.customer.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{card.customer.phone}</div>
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(card.status)}
                      </td>

                      <td className="py-3 px-4">
                        {next ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              next.action();
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                              next.variant === 'primary' ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' :
                              next.variant === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                              next.variant === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                              'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span>{next.label}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">Completed</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {(card.totalAmount || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Adv: {(card.accounting?.advanceReceived || 0).toFixed(2)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); generateJobCardPDF(card, settings); }}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Print PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Job Card"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onGenerateInvoice(card.id); }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Generate Invoice"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePrompt(card);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete / Cancel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredCards.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Job Cards found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing filters or search terms.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredCards.length)} of {filteredCards.length} records
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-3 py-1.5 font-bold font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <WhatsAppEstimateModal
        isOpen={!!whatsAppCard}
        onClose={() => setWhatsAppCard(null)}
        jobCard={whatsAppCard}
        settings={settings}
        onApprove={(id, method) => {
          updateJobCard(id, { approvalStatus: 'Approved', approvalMethod: method, status: 'Approved' });
          addToast('Job Card Approved!');
          setWhatsAppCard(null);
        }}
        onReject={(id) => {
          updateJobCard(id, { approvalStatus: 'Rejected', status: 'Cancelled' });
          addToast('Job Card Cancelled');
          setWhatsAppCard(null);
        }}
      />
      <DviModal
        isOpen={!!dviCard}
        onClose={() => setDviCard(null)}
        jobCard={dviCard}
        onSaveDvi={(id, checklist) => updateJobCard(id, { dviChecklist: checklist })}
      />
    </ModuleContainer>
  );
};
