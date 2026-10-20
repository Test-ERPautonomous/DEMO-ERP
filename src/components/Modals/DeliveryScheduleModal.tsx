import React, { useState } from 'react';
import { JobCard, GarageSettings } from '../../types';
import { Calendar, Clock, X, CheckCircle2, Car, AlertTriangle, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobCards: JobCard[];
  settings: GarageSettings;
  onAdvanceJobStatus: (id: string, newStatus: any) => void;
}

export const DeliveryScheduleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jobCards,
  settings,
  onAdvanceJobStatus,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'OVERDUE'>('ALL');

  if (!isOpen) return null;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const filteredJobs = jobCards.filter(job => {
    if (job.status === 'DELIVERED') return false;
    const estDate = job.estimatedCompletionDate ? job.estimatedCompletionDate.slice(0, 10) : '';
    
    if (filterPeriod === 'TODAY') return estDate === todayStr;
    if (filterPeriod === 'TOMORROW') return estDate === tomorrowStr;
    if (filterPeriod === 'OVERDUE') return estDate && estDate < todayStr;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4e79] text-white px-4 py-2.5 flex items-center justify-between font-bold shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">Vehicle Delivery Schedule &amp; Customer Commitments</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterPeriod('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                filterPeriod === 'ALL' ? 'bg-[#1e4e79] text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              All Active Deliveries ({jobCards.filter(j => j.status !== 'DELIVERED').length})
            </button>
            <button
              onClick={() => setFilterPeriod('TODAY')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                filterPeriod === 'TODAY' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              Scheduled Today
            </button>
            <button
              onClick={() => setFilterPeriod('TOMORROW')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                filterPeriod === 'TOMORROW' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => setFilterPeriod('OVERDUE')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                filterPeriod === 'OVERDUE' ? 'bg-red-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              Attention Overdue
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs flex items-center gap-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Schedule
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#e9edf2] text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300">Job #</th>
                  <th className="py-2 px-3 border-r border-slate-300">Vehicle / Plate</th>
                  <th className="py-2 px-3 border-r border-slate-300">Customer &amp; Mobile</th>
                  <th className="py-2 px-3 border-r border-slate-300">Assigned Bay</th>
                  <th className="py-2 px-3 border-r border-slate-300">Current Status</th>
                  <th className="py-2 px-3 border-r border-slate-300">Target Delivery</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400 font-sans">
                      No vehicles scheduled for delivery in this period.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map(job => {
                    const estDate = job.estimatedCompletionDate ? job.estimatedCompletionDate.slice(0, 10) : 'N/A';
                    const isOverdue = estDate !== 'N/A' && estDate < todayStr;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-blue-900">{job.jobNumber}</td>
                        <td className="py-2 px-3 border-r border-slate-200">
                          <span className="font-bold text-slate-900">{job.vehicle.plateNumber}</span>
                          <span className="block text-[10px] text-slate-500 font-sans">{job.vehicle.make} {job.vehicle.model} ({job.vehicle.year})</span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-sans">
                          <span className="font-medium text-slate-800">{job.customer.name}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">{job.customer.phone}</span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-700">{job.assignedBay || 'Bay 1'}</td>
                        <td className="py-2 px-3 border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            job.status === 'READY_FOR_DELIVERY' ? 'bg-emerald-100 text-emerald-800' :
                            job.status === 'QUALITY_CHECK' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200">
                          <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}>{estDate}</span>
                          {isOverdue && <span className="block text-[10px] text-red-500 font-sans">Delayed</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {job.status !== 'DELIVERED' ? (
                            <button
                              onClick={() => onAdvanceJobStatus(job.id, 'DELIVERED')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Mark Delivered
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Delivered</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
