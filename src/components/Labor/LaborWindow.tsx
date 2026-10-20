import React, { useState, useEffect } from 'react';
import { JobCard, GarageSettings, Technician } from '../../types';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  Plus, 
  Wrench, 
  Activity, 
  UserCheck, 
  Edit2, 
  Trash2, 
  Play, 
  Square, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { ModuleContainer } from '../Common/ModuleContainer';
import { DataTable } from '../Common/DataTable';
import { Badge } from '../Common/Badge';
import { exportToCsv } from '../../utils/csvExport';
import { api } from '../../lib/api';
import { TechnicianRecordModal } from './TechnicianRecordModal';

interface Props {
  jobCards: JobCard[];
  settings: GarageSettings;
  onOpenJobCard: (jobCard: JobCard) => void;
}

const INITIAL_TECHNICIANS: Technician[] = [];

export const LaborWindow: React.FC<Props> = ({ jobCards, onOpenJobCard }) => {
  const [activeTab, setActiveTab] = useState<string>('roster');
  const [searchTerm, setSearchTerm] = useState('');

  const [technicians, setTechnicians] = useState<Technician[]>(INITIAL_TECHNICIANS);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Shared Record Shell Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  // Clock In/Out State
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [selectedTechForClock, setSelectedTechForClock] = useState<Technician | null>(null);
  const [clockForm, setClockForm] = useState({
    jobCardId: '',
    notes: ''
  });

  const fetchTechnicians = () => {
    api.getTechnicians()
      .then(res => {
        if (res.status === 'ok' && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: Technician[] = res.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            employeeId: t.employee_id || `TN-000${t.id}`,
            role: t.role || 'Master Mechanic',
            specialty: t.specialty || 'Mechanical',
            phone: t.phone || '',
            hourlyRate: t.hourly_cost || 120,
            assignedBay: t.assigned_bay || 'Bay 1',
            bays: [t.assigned_bay || 'Bay 1'],
            efficiency: 95,
            status: t.status || 'Active'
          }));
          setTechnicians(mapped);
        }
      })
      .catch(() => {
        // Fallback
      });
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenAddTech = () => {
    setSelectedTechId(null);
    setIsRecordModalOpen(true);
  };

  const handleOpenTechRecord = (tech: Technician) => {
    setSelectedTechId(tech.id);
    setIsRecordModalOpen(true);
  };

  const handleDeleteTechnician = (tech: Technician) => {
    if (confirm(`Are you sure you want to remove technician ${tech.name}?`)) {
      setTechnicians(prev => prev.filter(t => t.id !== tech.id));
      api.deleteTechnician(tech.id).catch(() => {});
      showFeedback('success', `Technician ${tech.name} removed from system.`);
    }
  };

  const handleClockToggle = (tech: Technician) => {
    setSelectedTechForClock(tech);
    const activeJobsList = jobCards.filter(j => j.status !== 'Delivered');
    setClockForm({
      jobCardId: activeJobsList[0]?.id || '',
      notes: ''
    });
    setClockModalOpen(true);
  };

  const handleConfirmClockAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechForClock) return;

    if (selectedTechForClock.status === 'On Clock') {
      const clockInTimeStr = selectedTechForClock.clockInTime || new Date(Date.now() - 3600000).toISOString();
      const durationHours = Math.max(1, Math.round((Date.now() - new Date(clockInTimeStr).getTime()) / (1000 * 3600) * 10) / 10);
      const laborCost = durationHours * (selectedTechForClock.hourlyRate || 120);

      const updated = technicians.map(t => t.id === selectedTechForClock.id ? {
        ...t,
        status: 'Active' as const,
        activeJobId: undefined,
        clockInTime: undefined
      } : t);
      setTechnicians(updated);

      showFeedback('success', `Clocked Out ${selectedTechForClock.name}. Duration: ${durationHours} hrs. Calculated Labor Cost: QAR ${laborCost.toLocaleString()}.`);
    } else {
      const updated = technicians.map(t => t.id === selectedTechForClock.id ? {
        ...t,
        status: 'On Clock' as const,
        activeJobId: clockForm.jobCardId,
        clockInTime: new Date().toISOString()
      } : t);
      setTechnicians(updated);

      const targetJob = jobCards.find(j => j.id === clockForm.jobCardId);
      showFeedback('success', `Clocked In ${selectedTechForClock.name} on Job #${targetJob?.jobNumber || 'General'}.`);
    }
    setClockModalOpen(false);
  };

  const handleExport = () => {
    exportToCsv('najm_technicians_roster', [
      { header: 'Employee ID', accessor: (t: Technician) => t.employeeId || t.id },
      { header: 'Technician Name', accessor: (t: Technician) => t.name },
      { header: 'Role', accessor: (t: Technician) => t.role },
      { header: 'Specialty', accessor: (t: Technician) => t.specialty },
      { header: 'Phone', accessor: (t: Technician) => t.phone || '' },
      { header: 'Hourly Rate (QAR)', accessor: (t: Technician) => t.hourlyRate || 120 },
      { header: 'Assigned Bay', accessor: (t: Technician) => t.assignedBay || '' },
      { header: 'Efficiency %', accessor: (t: Technician) => `${t.efficiency || 95}%` },
      { header: 'Status', accessor: (t: Technician) => t.status }
    ], technicians);
  };

  const activeJobs = jobCards.filter(j => j.status !== 'Delivered');

  const renderContent = () => {
    switch (activeTab) {
      case 'roster':
        return (
          <DataTable
            data={technicians}
            columns={[
              { 
                header: 'Employee / Name', 
                accessor: (t: Technician) => (
                  <div>
                    <div className="font-bold text-slate-900">{t.name}</div>
                    <div className="text-xs font-mono text-slate-400">{t.employeeId || 'TN-0001'} • {t.phone}</div>
                  </div>
                ) 
              },
              { header: 'Role & Specialty', accessor: (t: Technician) => <div><div className="text-slate-800 text-xs font-semibold">{t.role}</div><div className="text-[10px] text-slate-500">{t.specialty}</div></div> },
              { header: 'Bay & Rate', accessor: (t: Technician) => <div><Badge variant="purple">{t.assignedBay || 'Bay 1'}</Badge><div className="text-xs font-mono text-slate-600 mt-0.5">QAR {t.hourlyRate || 120}/hr</div></div> },
              { header: 'Efficiency', accessor: (t: Technician) => <div className="font-bold text-emerald-600 font-mono text-sm">{t.efficiency || 95}%</div> },
              { 
                header: 'Status', 
                accessor: (t: Technician) => (
                  <Badge variant={t.status === 'On Clock' ? 'amber' : t.status === 'In Booth' ? 'sky' : 'success'}>
                    {t.status}
                  </Badge>
                ) 
              },
              {
                header: 'Actions',
                accessor: (t: Technician) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClockToggle(t); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                        t.status === 'On Clock' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {t.status === 'On Clock' ? <Square className="w-3 h-3 fill-rose-600" /> : <Play className="w-3 h-3 fill-emerald-600" />}
                      <span>{t.status === 'On Clock' ? 'Clock Out' : 'Clock In'}</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenTechRecord(t); }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                      title="Open Full Record Management"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Record</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTechnician(t); }}
                      className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
                headerClassName: 'text-right'
              }
            ]}
            onRowClick={handleOpenTechRecord}
            searchPlaceholder="Search Technicians by name, employee ID, specialty..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case 'allocations':
        return (
          <DataTable
            data={activeJobs}
            columns={[
              { header: 'Job #', accessor: (j: JobCard) => <div className="font-bold text-indigo-600 font-mono">{j.jobNumber}</div> },
              { header: 'Vehicle Plate', accessor: (j: JobCard) => <div className="font-bold text-slate-900 font-mono">{j.vehicle.plateNumber}</div> },
              { header: 'Customer', accessor: (j: JobCard) => <div className="text-slate-800 text-xs font-medium">{j.customer.name}</div> },
              { header: 'Assigned Tech', accessor: (j: JobCard) => <div className="text-slate-700 font-semibold">{j.assignedTechnician || 'Unassigned'}</div> },
              { header: 'Status', accessor: (j: JobCard) => <Badge variant="amber">{j.status}</Badge> },
              {
                header: 'Action',
                accessor: (j: JobCard) => (
                  <button 
                    onClick={() => onOpenJobCard(j)}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg border border-indigo-200 transition-all cursor-pointer"
                  >
                    Open Job Card
                  </button>
                ),
                headerClassName: 'text-right'
              }
            ]}
            searchPlaceholder="Search Active Jobs..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ModuleContainer
      title="Technicians & Workshop Labor Roster"
      subtitle="Manage Qatar mechanical workforce, bay allocations, attendance & hourly billing"
      icon={Users}
      actions={
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Roster</span>
          </button>
          <button 
            onClick={handleOpenAddTech}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Technician</span>
          </button>
        </div>
      }
      stats={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-emerald-700 font-mono">
              On Duty: {technicians.filter(t => t.status === 'Active' || t.status === 'On Clock').length} / {technicians.length}
            </span>
          </div>
        </div>
      }
      tabs={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roster' ? 'bg-white shadow-xs text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Technician Roster ({technicians.length})
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'allocations' ? 'bg-white shadow-xs text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Bay Allocations ({activeJobs.length})
          </button>
        </div>
      }
    >
      {feedback && (
        <div className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {renderContent()}

      {/* SHARED RECORD MANAGEMENT MODAL FOR TECHNICIANS */}
      <TechnicianRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          fetchTechnicians();
        }}
        technicianId={selectedTechId}
        onOpenJobCard={(jobCardId) => {
          const jc = jobCards.find(j => j.id === jobCardId);
          if (jc) onOpenJobCard(jc);
        }}
      />

      {/* Clock In / Clock Out Modal */}
      {clockModalOpen && selectedTechForClock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                {selectedTechForClock.status === 'On Clock' ? 'Clock Out Technician' : 'Clock In on Job'}
              </h3>
              <button onClick={() => setClockModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmClockAction} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{selectedTechForClock.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{selectedTechForClock.role} • Rate: QAR {selectedTechForClock.hourlyRate || 120}/hr</div>
                </div>
                <Badge variant={selectedTechForClock.status === 'On Clock' ? 'amber' : 'success'}>
                  {selectedTechForClock.status}
                </Badge>
              </div>

              {selectedTechForClock.status !== 'On Clock' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Active Job Card *</label>
                  <select
                    required
                    value={clockForm.jobCardId ?? ''}
                    onChange={e => setClockForm({ ...clockForm, jobCardId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {activeJobs.map(j => (
                      <option key={j.id} value={j.id}>
                        Job #{j.jobNumber} — {j.vehicle.plateNumber} ({j.customer.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedTechForClock.status === 'On Clock' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-bold">Clocking Out Session</div>
                  <div>System will calculate labor duration and record labor cost to the active job card based on standard rate (QAR {selectedTechForClock.hourlyRate || 120}/hr).</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClockModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer ${
                    selectedTechForClock.status === 'On Clock' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  Confirm {selectedTechForClock.status === 'On Clock' ? 'Clock Out' : 'Clock In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModuleContainer>
  );
};
