import React, { useState } from 'react';
import { JobCard, DviChecklistItem } from '../../types';
import { 
  FileText, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Camera, 
  Plus, 
  Save, 
  Upload,
  CheckSquare
} from 'lucide-react';
import { useToast } from '../Common/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobCard: JobCard | null;
  onSaveDvi: (jobCardId: string, checklist: DviChecklistItem[]) => void;
}

const DEFAULT_DVI_ITEMS: { category: DviChecklistItem['category']; title: string }[] = [
  { category: 'Tires & Wheels', title: 'Front Right Tire Pressure & Tread' },
  { category: 'Tires & Wheels', title: 'Front Left Tire Pressure & Tread' },
  { category: 'Tires & Wheels', title: 'Rear Right Tire Pressure & Tread' },
  { category: 'Tires & Wheels', title: 'Rear Left Tire Pressure & Tread' },
  { category: 'Brakes & Pads', title: 'Front Brake Pads Thickness' },
  { category: 'Brakes & Pads', title: 'Rear Brake Shoes / Pads Thickness' },
  { category: 'Brakes & Pads', title: 'Brake Disc Rotor Surface & Wear' },
  { category: 'Battery & Electrical', title: 'Battery State of Charge & Terminals' },
  { category: 'Battery & Electrical', title: 'Alternator Charging Voltage' },
  { category: 'Engine Fluids', title: 'Engine Oil Quality & Level' },
  { category: 'Engine Fluids', title: 'Radiator Coolant Level & Leakage' },
  { category: 'Engine Fluids', title: 'Brake Fluid Water Content' },
  { category: 'Suspension & Steering', title: 'Shock Absorber Oil Leaks' },
  { category: 'Suspension & Steering', title: 'Tie Rods & Ball Joints Play' },
  { category: 'Lights & Glass', title: 'Headlights & Taillights Operation' },
  { category: 'Lights & Glass', title: 'Windshield Crack & Wiper Blades' },
];

export const DviModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jobCard,
  onSaveDvi,
}) => {
  const { addToast } = useToast();
  if (!isOpen || !jobCard) return null;

  const [checklist, setChecklist] = useState<DviChecklistItem[]>(() => {
    if (jobCard.dviChecklist && jobCard.dviChecklist.length > 0) {
      return jobCard.dviChecklist;
    }
    return DEFAULT_DVI_ITEMS.map((item, idx) => ({
      id: `dvi-${idx}`,
      category: item.category,
      title: item.title,
      status: 'Pass' as const,
      notes: '',
    }));
  });

  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const categories = Array.from(new Set(DEFAULT_DVI_ITEMS.map(i => i.category)));

  const handleUpdateStatus = (title: string, status: DviChecklistItem['status']) => {
    setChecklist(prev =>
      prev.map(item => item.title === title ? { ...item, status } : item)
    );
  };

  const handleUpdateNotes = (title: string, notes: string) => {
    setChecklist(prev =>
      prev.map(item => item.title === title ? { ...item, notes } : item)
    );
  };

  const handleSave = () => {
    onSaveDvi(jobCard.id, checklist);
    addToast('Digital Vehicle Inspection checklist saved!');
    onClose();
  };

  const filteredItems = checklist.filter(item => {
    if (filterCategory === 'ALL') return true;
    return item.category === filterCategory;
  });

  const passCount = checklist.filter(i => i.status === 'Pass').length;
  const attentionCount = checklist.filter(i => i.status === 'Attention').length;
  const criticalCount = checklist.filter(i => i.status === 'Critical').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#1875bb] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Digital Vehicle Inspection (DVI)</h3>
              <p className="text-[11px] text-blue-100">
                {jobCard.jobNumber} — {jobCard.vehicle.make} {jobCard.vehicle.model} ({jobCard.vehicle.plateNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inspection Summary Stats Bar */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
          <div className="flex gap-4">
            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {passCount} Passed
            </span>
            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {attentionCount} Attention
            </span>
            <span className="text-red-700 dark:text-red-400 flex items-center gap-1">
              <XCircle className="w-4 h-4" /> {criticalCount} Critical
            </span>
          </div>

          <select
            value={filterCategory ?? ''}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs p-1.5 rounded-lg border dark:bg-slate-900 dark:border-slate-700 dark:text-white"
          >
            <option value="ALL">All Inspection Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Checklist Body */}
        <div className="p-4 space-y-3 overflow-y-auto text-xs flex-1">
          {filteredItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all ${
                item.status === 'Pass'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                  : item.status === 'Attention'
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                  : item.status === 'Critical'
                  ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {item.category}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {item.title}
                  </span>
                </div>

                {/* Status Toggle Buttons */}
                <div className="grid grid-cols-4 gap-1 sm:w-64">
                  {(['Pass', 'Attention', 'Critical', 'NA'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(item.title, st)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        item.status === st
                          ? st === 'Pass' ? 'bg-emerald-600 text-white border-emerald-600'
                          : st === 'Attention' ? 'bg-amber-500 text-white border-amber-500'
                          : st === 'Critical' ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-600 text-white border-slate-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks / Technician Note */}
              <input
                type="text"
                placeholder="Technician observation / measurement notes..."
                value={item.notes || ''}
                onChange={(e) => handleUpdateNotes(item.title, e.target.value)}
                className="w-full text-xs p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-white"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 transition-colors text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#1875bb] hover:bg-[#135d96] text-white font-bold rounded-xl flex items-center gap-2 text-xs shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Inspection</span>
          </button>
        </div>

      </div>
    </div>
  );
};
