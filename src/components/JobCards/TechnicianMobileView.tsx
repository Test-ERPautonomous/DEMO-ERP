import React, { useState, useEffect } from 'react';
import { JobCard, JobStatus, DviChecklistItem, JobCardPhoto } from '../../types';
import { 
  Wrench, 
  Car, 
  User, 
  Clock, 
  CheckCircle2, 
  Camera, 
  FileText, 
  Plus, 
  Play, 
  CheckSquare, 
  AlertTriangle, 
  Upload, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { 
  cacheJobCards, 
  getCachedJobCards, 
  saveOfflineUpdate, 
  getOfflineUpdates, 
  deleteOfflineUpdate 
} from '../../utils/indexedDB';

interface Props {
  jobCards: JobCard[];
  onUpdateJobCard: (id: string, updates: Partial<JobCard>) => void;
  onAdvanceStatus: (id: string, nextStatus: JobStatus) => void;
}

const DEFAULT_DVI_TEMPLATES: { category: DviChecklistItem['category']; title: string }[] = [
  { category: 'Tires & Wheels', title: 'Tire Tread Depth & Pressure' },
  { category: 'Brakes & Pads', title: 'Brake Pads & Rotor Wear' },
  { category: 'Battery & Electrical', title: 'Battery Health & Terminal Cleanliness' },
  { category: 'Engine Fluids', title: 'Engine Oil Level & Coolant Condition' },
  { category: 'Suspension & Steering', title: 'Shock Absorbers & Steering Play' },
  { category: 'Lights & Glass', title: 'Headlights, Indicators & Windshield' },
];

export const TechnicianMobileView: React.FC<Props> = ({
  jobCards,
  onUpdateJobCard,
  onAdvanceStatus,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [localJobCards, setLocalJobCards] = useState<JobCard[]>(jobCards);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [techDiagnosis, setTechDiagnosis] = useState<{ [id: string]: string }>({});
  const [newLaborDesc, setNewLaborDesc] = useState('');
  const [newLaborHours, setNewLaborHours] = useState('1');
  const [photoType, setPhotoType] = useState<'before' | 'after' | 'dvi' | 'damage'>('before');

  // Load from IndexedDB or props
  useEffect(() => {
    if (isOnline) {
      setLocalJobCards(jobCards);
      cacheJobCards(jobCards);
    } else {
      const loadCached = async () => {
        const cached = await getCachedJobCards();
        if (cached && cached.length > 0) {
          setLocalJobCards(cached);
        }
      };
      loadCached();
    }
  }, [jobCards, isOnline]);

  // Set default expanded job card
  useEffect(() => {
    if (localJobCards.length > 0 && !expandedJobId) {
      setExpandedJobId(localJobCards[0].id);
    }
  }, [localJobCards]);

  // Monitor connectivity & offline updates count
  useEffect(() => {
    const updatePendingCount = async () => {
      const pending = await getOfflineUpdates();
      setPendingSyncCount(pending.length);
    };

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updatePendingCount();

    if (navigator.onLine) {
      syncOfflineChanges();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineChanges = async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const pending = await getOfflineUpdates();
      if (pending.length > 0) {
        console.log(`[Sync] Found ${pending.length} pending offline updates. Syncing...`);
        for (const update of pending) {
          try {
            if (update.type === 'update') {
              await onUpdateJobCard(update.jobCardId, update.data);
            } else if (update.type === 'status_change') {
              await onAdvanceStatus(update.jobCardId, update.data.nextStatus);
            }
            await deleteOfflineUpdate(update.id);
          } catch (err) {
            console.error(`[Sync] Failed to sync update ${update.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('[Sync] General sync error:', err);
    } finally {
      const remaining = await getOfflineUpdates();
      setPendingSyncCount(remaining.length);
      setIsSyncing(false);
    }
  };

  const applyJobCardUpdate = async (id: string, updates: Partial<JobCard>) => {
    // 1. Update local UI state instantly
    setLocalJobCards(prev => prev.map(jc => jc.id === id ? { ...jc, ...updates } as JobCard : jc));

    // 2. Persist safely
    if (isOnline) {
      onUpdateJobCard(id, updates);
    } else {
      await saveOfflineUpdate(id, 'update', updates);
      const pending = await getOfflineUpdates();
      setPendingSyncCount(pending.length);
    }
  };

  const applyStatusAdvance = async (id: string, nextStatus: JobStatus) => {
    // 1. Update local UI state instantly
    setLocalJobCards(prev => prev.map(jc => jc.id === id ? { ...jc, status: nextStatus } as JobCard : jc));

    // 2. Persist safely
    if (isOnline) {
      onAdvanceStatus(id, nextStatus);
    } else {
      await saveOfflineUpdate(id, 'status_change', { nextStatus });
      const pending = await getOfflineUpdates();
      setPendingSyncCount(pending.length);
    }
  };

  // Extract list of technicians
  const technicians = Array.from(
    new Set(localJobCards.map(c => c.assignedTechnician).filter(Boolean))
  ).sort();

  const filteredJobs = localJobCards.filter(c => {
    if (selectedTech === 'ALL') return true;
    return c.assignedTechnician === selectedTech;
  });

  const handleSaveDiagnosis = (job: JobCard) => {
    const text = techDiagnosis[job.id] ?? job.diagnosisNotes;
    applyJobCardUpdate(job.id, { diagnosisNotes: text });
  };

  const handleAddLabor = (job: JobCard) => {
    if (!newLaborDesc.trim()) return;
    const hours = parseFloat(newLaborHours) || 1;
    const rate = 120; // Default technician labor rate QAR/hr
    const updatedTasks = [
      ...job.mechanicalTasks,
      {
        id: `mech-${Date.now()}`,
        description: newLaborDesc,
        estimatedHours: hours,
        hours,
        hourlyRate: rate,
        rate,
        total: hours * rate,
        status: 'In Progress' as const,
        technicianName: job.assignedTechnician || 'Technician',
      }
    ];

    const mechanicalLaborTotal = updatedTasks.reduce((sum, t) => sum + (t.total || (t.hours || 1) * (t.hourlyRate || 120)), 0);
    const totalAmount = mechanicalLaborTotal + job.dentingLaborCost + job.paintingCost + job.paintBoothCharge + job.partsCost + job.consumablesCost;

    applyJobCardUpdate(job.id, {
      mechanicalTasks: updatedTasks,
      mechanicalLaborCost: mechanicalLaborTotal,
      mechanicalLaborTotal,
      totalAmount,
    });

    setNewLaborDesc('');
    setNewLaborHours('1');
  };

  const handleUpdateDviItem = (job: JobCard, title: string, status: 'Pass' | 'Attention' | 'Critical' | 'NA') => {
    const currentList = job.dviChecklist && job.dviChecklist.length > 0 ? job.dviChecklist : DEFAULT_DVI_TEMPLATES.map((t, idx) => ({
      id: `dvi-${idx}`,
      category: t.category,
      title: t.title,
      status: 'Pass' as const,
    }));

    const updated = currentList.map(item => item.title === title ? { ...item, status } : item);
    applyJobCardUpdate(job.id, { dviChecklist: updated });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, job: JobCard) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (Max 5MB for mobile performance)
    if (!file.type.startsWith('image/')) {
      alert('Security validation failure: Only image files are allowed for uploads.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Security validation failure: Maximum image size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const photoUrl = reader.result as string;
      const newPhoto: JobCardPhoto = {
        id: `photo-${Date.now()}`,
        url: photoUrl,
        type: photoType,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        uploadedBy: job.assignedTechnician || 'Technician',
      };

      const updatedPhotos = [...(job.photos || []), newPhoto];
      applyJobCardUpdate(job.id, { photos: updatedPhotos });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* Network Status & Sync Notification Banner */}
      <div className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all border ${
        isOnline 
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
          : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
      }`}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span>🟢 Online (Synced)</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>🟡 Offline Mode (Local Cache)</span>
            </>
          )}
        </div>
        {pendingSyncCount > 0 && (
          <button
            type="button"
            onClick={syncOfflineChanges}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-extrabold cursor-pointer ${
              isOnline 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync ({pendingSyncCount})</span>
          </button>
        )}
      </div>

      {/* Top Mobile Bar: Technician Switcher */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1875bb] flex items-center justify-center font-bold text-sm">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-200">Technician Workspace</h2>
              <p className="text-[10px] text-slate-400">Mobile Phone View & Diagnostics</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-cyan-400">
            {filteredJobs.length} Jobs
          </span>
        </div>

        <select
          value={selectedTech ?? ''}
          onChange={(e) => setSelectedTech(e.target.value)}
          className="w-full bg-slate-800 text-white text-xs rounded-lg p-2.5 border border-slate-700 font-medium focus:ring-2 focus:ring-[#1875bb] outline-hidden"
        >
          <option value="ALL">👷 All Technicians</option>
          {technicians.map(t => (
            <option key={t} value={t}>👤 {t}</option>
          ))}
        </select>
      </div>

      {/* Active Job Cards for Technician */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No active job cards assigned</p>
        </div>
      ) : (
        filteredJobs.map(job => {
          const isExpanded = expandedJobId === job.id;
          const dviItems = job.dviChecklist && job.dviChecklist.length > 0 ? job.dviChecklist : DEFAULT_DVI_TEMPLATES.map((t, idx) => ({
            id: `dvi-${idx}`,
            category: t.category,
            title: t.title,
            status: 'Pass' as const,
          }));

          return (
            <div
              key={job.id}
              className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all"
            >
              {/* Mobile Card Header */}
              <div
                onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between cursor-pointer border-b border-slate-200 dark:border-slate-800"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#1875bb]">
                      {job.jobNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1875bb]/10 text-[#1875bb]">
                      {job.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    <span>{job.vehicle.make} {job.vehicle.model} ({job.vehicle.plateNumber})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {/* Mobile Card Details Body */}
              {isExpanded && (
                <div className="p-3.5 space-y-4 text-xs">
                  {/* Customer Complaint */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-2.5 rounded-lg space-y-1">
                    <span className="font-bold text-amber-800 dark:text-amber-300 text-[11px] block">
                      🗣️ Customer Complaint:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium italic">
                      "{job.customerComplaints || 'Standard Inspection & Service'}"
                    </p>
                  </div>

                  {/* Technician Diagnosis Notes */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      🔍 Technician Diagnosis & Finding:
                    </label>
                    <textarea
                      rows={2}
                      value={techDiagnosis[job.id] ?? job.diagnosisNotes ?? ''}
                      onChange={(e) => setTechDiagnosis({ ...techDiagnosis, [job.id]: e.target.value })}
                      placeholder="Write findings, leak sources, codes or required actions..."
                      className="w-full text-xs p-2.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[#1875bb] outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveDiagnosis(job)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Save Diagnosis</span>
                    </button>
                  </div>

                  {/* Mobile DVI Checklist */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <CheckSquare className="w-4 h-4 text-[#1875bb]" />
                        Digital Vehicle Inspection (DVI)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dviItems.map((item, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                          </div>
                          
                          {/* DVI Status Toggle Buttons */}
                          <div className="grid grid-cols-4 gap-1">
                            {(['Pass', 'Attention', 'Critical', 'NA'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateDviItem(job, item.title, st)}
                                className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                                  item.status === st
                                    ? st === 'Pass' ? 'bg-emerald-600 text-white border-emerald-600'
                                    : st === 'Attention' ? 'bg-amber-500 text-white border-amber-500'
                                    : st === 'Critical' ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-slate-600 text-white border-slate-600'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Labor Hours Logger */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      ⏱️ Log Labor / Work Entry:
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Task (e.g. Brake Pads Replacement)"
                        value={newLaborDesc ?? ''}
                        onChange={(e) => setNewLaborDesc(e.target.value)}
                        className="flex-1 text-xs p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Hrs"
                        value={newLaborHours ?? ''}
                        onChange={(e) => setNewLaborHours(e.target.value)}
                        className="w-16 text-xs p-2 border rounded-lg text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddLabor(job)}
                        className="px-3 bg-[#1875bb] text-white font-bold rounded-lg text-xs hover:bg-[#135d96]"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mechanical Labor List */}
                    {job.mechanicalTasks && job.mechanicalTasks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {job.mechanicalTasks.map((t, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
                            <span className="truncate max-w-[180px] font-medium text-slate-700 dark:text-slate-300">{t.description}</span>
                            <span className="font-bold text-[#1875bb]">{t.hours || t.estimatedHours} hrs (QAR {(t.total || 120).toLocaleString()})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mobile Photos Uploader */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        Vehicle Photos ({job.photos?.length || 0})
                      </span>

                      <select
                        value={photoType ?? ''}
                        onChange={(e) => setPhotoType(e.target.value as any)}
                        className="text-[10px] font-bold p-1 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      >
                        <option value="before">📷 Before Repair</option>
                        <option value="after">✨ After Repair</option>
                        <option value="dvi">🔍 DVI Inspection</option>
                        <option value="damage">⚠️ Damage Detail</option>
                      </select>
                    </div>

                    <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[#1875bb]/40 rounded-lg bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 transition-colors">
                      <Upload className="w-4 h-4 text-[#1875bb]" />
                      <span className="text-xs font-bold text-[#1875bb]">Tap to Take Photo / Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoUpload(e, job)}
                        className="hidden"
                      />
                    </label>

                    {/* Photo Grid Preview */}
                    {job.photos && job.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {job.photos.map(p => (
                          <div key={p.id} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-black">
                            <img src={p.url} alt={p.type} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-bold text-center py-0.5 capitalize">
                              {p.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Advance Action Buttons */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                      Advance Workflow Stage
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => applyStatusAdvance(job.id, 'Diagnosing')}
                        className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                      >
                        🔍 Start Diagnosis
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStatusAdvance(job.id, 'Awaiting Customer Approval')}
                        className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                      >
                        💬 Request Approval
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStatusAdvance(job.id, 'In Progress')}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                      >
                        🔧 Start Repairs
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStatusAdvance(job.id, 'Ready for Pickup')}
                        className="py-2.5 bg-[#1875bb] hover:bg-[#135d96] text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                      >
                        ✨ Mark Ready
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
