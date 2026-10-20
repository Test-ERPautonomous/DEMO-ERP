import React, { useState, useEffect } from 'react';
import { JobCard, JobStatus, GarageSettings } from '../../types';
import { JobCardList } from './JobCardList';
import { LaborWindow } from '../Labor/LaborWindow';
import { Wrench, Clock } from 'lucide-react';

interface Props {
  jobCards: JobCard[];
  settings: GarageSettings;
  onOpenCreate: () => void;
  onEdit: (card: JobCard) => void;
  onDelete: (id: string) => void;
  onAdvanceStatus: (id: string, nextStatus: JobStatus) => void;
  onGenerateInvoice: (jobCardId: string) => void;
  onSelectVehicleHistory: (plate: string) => void;
  initialStatusFilter?: string;
  initialSubTab?: 'jobs' | 'bays';
}

export const JobsView: React.FC<Props> = ({
  jobCards,
  settings,
  onOpenCreate,
  onEdit,
  onDelete,
  onAdvanceStatus,
  onGenerateInvoice,
  onSelectVehicleHistory,
  initialStatusFilter = 'ALL',
  initialSubTab = 'jobs',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'jobs' | 'bays'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const activeJobsCount = jobCards.filter(
    c => c.status !== 'Closed' && c.status !== 'Cancelled' && c.status !== 'Delivered'
  ).length;

  return (
    <div className="space-y-4">
      {/* Sub-navigation bar inside Jobs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveSubTab('jobs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'jobs'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>All Jobs</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              activeSubTab === 'jobs' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'
            }`}>
              {activeJobsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('bays')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'bays'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Technicians & Bays</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {activeSubTab === 'jobs' ? (
        <JobCardList
          jobCards={jobCards}
          onOpenCreate={onOpenCreate}
          onEdit={onEdit}
          onDelete={onDelete}
          onAdvanceStatus={onAdvanceStatus}
          onGenerateInvoice={onGenerateInvoice}
          onSelectVehicleHistory={onSelectVehicleHistory}
          initialStatusFilter={initialStatusFilter}
        />
      ) : (
        <LaborWindow
          jobCards={jobCards}
          settings={settings}
          onOpenJobCard={onEdit}
        />
      )}
    </div>
  );
};
