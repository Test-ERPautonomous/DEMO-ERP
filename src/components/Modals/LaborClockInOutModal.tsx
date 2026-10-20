import React, { useState } from 'react';
import { JobCard, GarageSettings } from '../../types';
import { Clock, Play, Square, Check, X, UserCheck, Calendar } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobCards: JobCard[];
  settings: GarageSettings;
}

interface ClockEntry {
  id: string;
  technicianName: string;
  jobNumber: string;
  bayName: string;
  clockInTime: string;
  clockOutTime?: string;
  elapsedMinutes: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export const LaborClockInOutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jobCards,
  settings,
}) => {
  const activeJobs = jobCards.filter(j => j.status !== 'DELIVERED');
  
  const [selectedTech, setSelectedTech] = useState('Osman (Service Manager)');
  const [selectedJobNo, setSelectedJobNo] = useState(activeJobs[0]?.jobNumber || '');
  const [selectedBay, setSelectedBay] = useState('Bay 1 (Mechanical)');

  const [activeLogs, setActiveLogs] = useState<ClockEntry[]>([]);

  if (!isOpen) return null;

  const handleClockIn = () => {
    const newEntry: ClockEntry = {
      id: `clk-${Date.now()}`,
      technicianName: selectedTech,
      jobNumber: selectedJobNo,
      bayName: selectedBay,
      clockInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      elapsedMinutes: 0,
      status: 'ACTIVE',
    };
    setActiveLogs([newEntry, ...activeLogs]);
  };

  const handleClockOut = (id: string) => {
    setActiveLogs(activeLogs.map(log => {
      if (log.id === id) {
        return {
          ...log,
          clockOutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'COMPLETED',
        };
      }
      return log;
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4e79] text-white px-4 py-2 flex items-center justify-between font-bold shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">Labor Clock-In / Clock-Out &amp; Job Time Tracking</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Clock-In Box */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Record New Labor Clock-In</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Technician</label>
                <select
                  value={selectedTech ?? ''}
                  onChange={e => setSelectedTech(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                >
                  <option value="Autonomous (Owner / Admin)">Autonomous (Owner / Admin)</option>
                  <option value="Osman (Service Manager)">Osman (Service Manager)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Job Card #</label>
                <select
                  value={selectedJobNo ?? ''}
                  onChange={e => setSelectedJobNo(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white font-mono"
                >
                  {activeJobs.map(j => (
                    <option key={j.id} value={j.jobNumber}>
                      {j.jobNumber} — {j.vehicle.plateNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Workshop Bay</label>
                <select
                  value={selectedBay ?? ''}
                  onChange={e => setSelectedBay(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                >
                  <option>Bay 1 (Mechanical Lift)</option>
                  <option>Bay 2 (Quick Service)</option>
                  <option>Denting Bay 1</option>
                  <option>Denting Bay 2</option>
                  <option>Oven Spray Booth A</option>
                  <option>Washing &amp; Detailing Bay</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleClockIn}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Timer &amp; Clock In Technician</span>
            </button>
          </div>

          {/* Active / Today's Sessions */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2">Today's Timesheet Activity</h4>
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[#e9edf2] text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-300">Technician</th>
                    <th className="py-2 px-3 border-r border-slate-300">Job #</th>
                    <th className="py-2 px-3 border-r border-slate-300">Bay</th>
                    <th className="py-2 px-3 border-r border-slate-300">Clock-In</th>
                    <th className="py-2 px-3 border-r border-slate-300">Clock-Out</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-center">Status</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {activeLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">{log.technicianName}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-bold text-blue-900">{log.jobNumber}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-600">{log.bayName}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-700">{log.clockInTime}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-700">{log.clockOutTime || '— In Progress —'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {log.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleClockOut(log.id)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-semibold cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Square className="w-2.5 h-2.5 fill-current" /> Stop
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
