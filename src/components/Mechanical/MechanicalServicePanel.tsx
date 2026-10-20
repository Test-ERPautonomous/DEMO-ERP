import React, { useState } from 'react';
import { MechanicalTask } from '../../types';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface Props {
  tasks: MechanicalTask[];
  onChange: (tasks: MechanicalTask[]) => void;
  defaultLaborRate?: number;
  readOnly?: boolean;
}

const COMMON_PRESETS = [
  {
    category: 'Routine Maintenance',
    description: 'Full Synthetic Oil & Filter Service (24-point vehicle inspection & fluid top-off)',
    hours: 0.8,
  },
  {
    category: 'Brakes',
    description: 'Front Brake Pads Replacement & Rotor Inspection / Caliper Slide Pins Lubrication',
    hours: 1.8,
  },
  {
    category: 'Engine',
    description: 'Replace Spark Plugs & Ignition Diagnostic (Compression / Cylinder Misfire test)',
    hours: 1.5,
  },
  {
    category: 'Suspension',
    description: 'Lower Control Arm Assembly Replacement & 4-Wheel Computerized Alignment',
    hours: 2.8,
  },
  {
    category: 'Engine',
    description: 'Cooling System Flush, Vacuum Bleed & Radiator Pressure Test (1.5 bar)',
    hours: 1.5,
  },
  {
    category: 'Air Conditioning',
    description: 'A/C Refrigerant Recovery, Vacuum Leak Test & R134a/R1234yf Recharge',
    hours: 1.2,
  },
  {
    category: 'Transmission',
    description: 'Automatic Transmission Fluid (ATF) & Pan Filter Replacement',
    hours: 2.0,
  },
] as const;

export const MechanicalServicePanel: React.FC<Props> = ({
  tasks,
  onChange,
  defaultLaborRate = 85,
  readOnly = false,
}) => {
  const [category, setCategory] = useState<MechanicalTask['category']>('Routine Maintenance');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(1.0);
  const [hourlyRate, setHourlyRate] = useState(defaultLaborRate);
  const [technicianName, setTechnicianName] = useState('Mike Reynolds (Lead Mechanic)');

  const handleAddTask = () => {
    if (!description.trim() || readOnly) return;
    const newTask: MechanicalTask = {
      id: `mt-${Date.now()}`,
      category,
      description: description.trim(),
      estimatedHours: Number(estimatedHours) || 1,
      hourlyRate: Number(hourlyRate) || defaultLaborRate,
      status: 'Pending',
      technicianName: technicianName.trim() || undefined,
    };
    onChange([...tasks, newTask]);
    setDescription('');
    setEstimatedHours(1.0);
  };

  const handleApplyPreset = (preset: typeof COMMON_PRESETS[number]) => {
    if (readOnly) return;
    const newTask: MechanicalTask = {
      id: `mt-${Date.now()}`,
      category: preset.category as any,
      description: preset.description,
      estimatedHours: preset.hours,
      hourlyRate: defaultLaborRate,
      status: 'Pending',
      technicianName: technicianName.trim() || undefined,
    };
    onChange([...tasks, newTask]);
  };

  const handleToggleTaskStatus = (id: string) => {
    if (readOnly) return;
    onChange(
      tasks.map(t => {
        if (t.id === id) {
          const nextStatus: MechanicalTask['status'] =
            t.status === 'Pending' ? 'In Progress' : t.status === 'In Progress' ? 'Completed' : 'Pending';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const handleRemoveTask = (id: string) => {
    if (readOnly) return;
    onChange(tasks.filter(t => t.id !== id));
  };

  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalLaborCost = tasks.reduce((sum, t) => sum + (t.estimatedHours * t.hourlyRate), 0);
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  return (
    <div id="mechanical-service-panel" className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-base">
            <Wrench className="w-5 h-5 text-indigo-600" />
            Auto Mechanical Work Orders &amp; Labor
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Engine diagnostics, transmission, brakes, suspension and maintenance checklist.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-xs">
            <span className="text-slate-500 block">Total Est. Hours</span>
            <span className="font-bold text-slate-800 text-sm">{totalHours.toFixed(1)} hrs</span>
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-xs">
            <span className="text-slate-500 block">Progress</span>
            <span className="font-bold text-emerald-600 text-sm">{completedCount}/{tasks.length} Done</span>
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-xs">
            <span className="text-slate-500 block">Total Labor Cost</span>
            <span className="font-bold text-indigo-600 text-sm">${totalLaborCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Quick Service Presets */}
      {!readOnly && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Common Workshop Packages (Click to Add):
          </div>
          <div className="flex flex-wrap gap-2">
            {COMMON_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-left text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-slate-700"
              >
                <Plus className="w-3 h-3 text-slate-400" />
                <span className="font-medium">{preset.description.split('(')[0].trim()}</span>
                <span className="text-[11px] text-slate-500 font-mono">({preset.hours}h)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task Creation Form */}
      {!readOnly && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Add Custom Mechanical Task
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category ?? ''}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="Routine Maintenance">Routine Maintenance</option>
                <option value="Engine">Engine &amp; Diagnostic</option>
                <option value="Brakes">Brakes &amp; Hydraulics</option>
                <option value="Suspension">Suspension &amp; Steering</option>
                <option value="Transmission">Transmission / Drivetrain</option>
                <option value="Electrical">Electrical &amp; Battery</option>
                <option value="Air Conditioning">A/C &amp; Climate</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Task / Inspection Description</label>
              <input
                type="text"
                placeholder="e.g. Inspect drive belts and replace tensioner pully"
                value={description ?? ''}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Labor (Hours)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={estimatedHours ?? ''}
                onChange={e => setEstimatedHours(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Rate ($/hr)</label>
              <input
                type="number"
                value={hourlyRate ?? ''}
                onChange={e => setHourlyRate(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-mono"
              />
            </div>

            <div className="md:col-span-1">
              <button
                type="button"
                onClick={handleAddTask}
                disabled={!description.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium text-xs py-2 px-3 rounded-lg flex items-center justify-center transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
            Job Card Tasks ({tasks.length})
          </span>
          <span className="text-xs text-slate-500">
            Click task status badge to toggle Pending ➔ In Progress ➔ Completed
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No mechanical tasks added yet. Select a common preset or add a custom task above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-600 font-medium border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Hours</th>
                  <th className="py-2.5 px-4">Rate</th>
                  <th className="py-2.5 px-4 text-right">Labor Total</th>
                  {!readOnly && <th className="py-2.5 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tasks.map(task => {
                  const taskTotal = (task.estimatedHours || 0) * (task.hourlyRate || defaultLaborRate);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task.id)}
                          disabled={readOnly}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                            task.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : task.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {task.status === 'Completed' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : task.status === 'In Progress' ? (
                            <Clock className="w-3 h-3 text-blue-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                          )}
                          {task.status}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {task.category}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium">
                        {task.description}
                        {task.technicianName && (
                          <span className="block text-[11px] text-slate-500">Tech: {task.technicianName}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {readOnly ? (
                          <span>{task.estimatedHours}h</span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0.1"
                              step="0.5"
                              value={task.estimatedHours}
                              onChange={e => {
                                const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                                const updated = tasks.map(t => t.id === task.id ? { ...t, estimatedHours: val } : t);
                                onChange(updated);
                              }}
                              className="w-14 text-center font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 focus:border-indigo-500 outline-none"
                              title="Edit hours"
                            />
                            <span className="text-slate-500 text-xs">h</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {readOnly ? (
                          <span>${task.hourlyRate}/h</span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <span className="text-slate-400 text-xs">$</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={task.hourlyRate}
                              onChange={e => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                const updated = tasks.map(t => t.id === task.id ? { ...t, hourlyRate: val } : t);
                                onChange(updated);
                              }}
                              className="w-16 text-right font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 focus:border-indigo-500 outline-none font-medium"
                              title="Edit rate per hour"
                            />
                            <span className="text-slate-500 text-xs">/h</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-mono">
                        ${taskTotal.toFixed(2)}
                      </td>
                      {!readOnly && (
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(task.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
