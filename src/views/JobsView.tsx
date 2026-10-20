import React, { useState } from 'react';
import { Wrench, Plus, Search, Filter, CheckCircle, Clock, FileText, ChevronRight } from 'lucide-react';
import { api } from '../api';

interface JobsViewProps {
  jobCards: any[];
  onOpenJobCardModal: () => void;
  onRefresh: () => void;
  currency?: string;
}

export const JobsView: React.FC<JobsViewProps> = ({
  jobCards,
  onOpenJobCardModal,
  onRefresh,
  currency = 'QAR'
}) => {
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [advancing, setAdvancing] = useState(false);

  const statuses = ['All', 'Draft', 'Pending Approval', 'In Progress', 'QC & Testing', 'Ready for Delivery', 'Invoiced', 'Closed'];

  const filtered = (jobCards || []).filter(j => {
    if (!j) return false;
    const matchStatus = filterStatus === 'All' || j.status === filterStatus;
    const q = (search || '').trim().toLowerCase();
    const matchSearch =
      !q ||
      (j.jobNumber || j.job_number || '').toLowerCase().includes(q) ||
      (j.customerName || j.customer_name || '').toLowerCase().includes(q) ||
      (j.vehiclePlate || j.vehicle_plate || '').toLowerCase().includes(q) ||
      (j.serviceType || j.service_type || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const nextStatusMap: Record<string, string> = {
    'Draft': 'Pending Approval',
    'Pending Approval': 'In Progress',
    'In Progress': 'QC & Testing',
    'QC & Testing': 'Ready for Delivery',
    'Ready for Delivery': 'Invoiced',
    'Invoiced': 'Closed'
  };

  const handleAdvanceStatus = async (job: any) => {
    const nextStatus = nextStatusMap[job.status];
    if (!nextStatus) return;

    setAdvancing(true);
    try {
      await api.updateJobStatus(job.id, nextStatus, `Advanced stage to ${nextStatus}`);
      onRefresh();
      if (selectedJob && selectedJob.id === job.id) {
        setSelectedJob({ ...selectedJob, status: nextStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to advance status');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by plate, job #..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
            />
          </div>
          <button
            onClick={onOpenJobCardModal}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Job</span>
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase">
              <tr>
                <th className="p-3.5">Job Card</th>
                <th className="p-3.5">Customer & Phone</th>
                <th className="p-3.5">Vehicle Details</th>
                <th className="p-3.5">Stage</th>
                <th className="p-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500">
                    No job cards found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(job => (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer transition-colors ${
                      selectedJob?.id === job.id ? 'bg-blue-950/40 border-l-4 border-l-blue-500' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="p-3.5 font-mono font-bold text-blue-400">
                      {job.jobNumber || job.job_number}
                      <div className="text-[10px] text-slate-500 font-sans">{job.serviceType || job.service_type}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{job.customerName || job.customer_name}</div>
                      <div className="text-xs text-slate-400">{job.customerPhone || job.customer_phone || 'No phone'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-white uppercase">{job.vehiclePlate || job.vehicle_plate}</div>
                      <div className="text-xs text-slate-400">
                        {job.vehicleMake || job.vehicle_make} {job.vehicleModel || job.vehicle_model} ({job.vehicleYear || job.vehicle_year || 2023})
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-blue-950 text-blue-300 border border-blue-800/60 font-semibold">
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-white">
                      {currency} {(job.grandTotal || job.grand_total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Job Card Preview Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          {selectedJob ? (
            <div>
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-400">{selectedJob.jobNumber || selectedJob.job_number}</span>
                  <h3 className="text-xl font-black text-white mt-0.5">{selectedJob.vehiclePlate || selectedJob.vehicle_plate}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedJob.vehicleMake || selectedJob.vehicle_make} {selectedJob.vehicleModel || selectedJob.vehicle_model}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold">
                  {selectedJob.status}
                </span>
              </div>

              {/* Advance Action Button */}
              {nextStatusMap[selectedJob.status] && (
                <button
                  onClick={() => handleAdvanceStatus(selectedJob)}
                  disabled={advancing}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Advance Stage to "{nextStatusMap[selectedJob.status]}"</span>
                </button>
              )}

              {/* Customer Info */}
              <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer Details</div>
                <div className="text-sm font-semibold text-white">{selectedJob.customerName || selectedJob.customer_name}</div>
                <div className="text-xs text-slate-400">{selectedJob.customerPhone || selectedJob.customer_phone || 'No phone'}</div>
              </div>

              {/* Complaints & Notes */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer Complaints</div>
                <div className="text-xs text-slate-200 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 leading-relaxed">
                  {selectedJob.complaints || 'No specific complaints recorded.'}
                </div>
              </div>

              {/* Summary Financials */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Labor Subtotal:</span>
                  <span className="text-white font-mono">{currency} {(selectedJob.subtotal || selectedJob.grand_total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-700">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400 font-mono">{currency} {(selectedJob.grandTotal || selectedJob.grand_total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a job card from the table to inspect details and advance operations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
