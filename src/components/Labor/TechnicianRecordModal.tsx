import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Award, 
  Wrench, 
  Clock, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  ExternalLink,
  ChevronRight,
  Activity,
  UserCheck,
  Star,
  Check
} from 'lucide-react';
import { Technician, JobCard, GarageSettings } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { RecordManagementShell } from '../Common/Workspace/RecordManagementShell';
import { RecordAuditTrail } from '../Common/Workspace/RecordAuditTrail';
import { SearchRecordItem } from '../Common/Workspace/RecordSearchDialog';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';

export interface TechnicianRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicianId?: string | null;
  onOpenJobCard?: (jobCardId: string) => void;
}

export const TechnicianRecordModal: React.FC<TechnicianRecordModalProps> = ({
  isOpen,
  onClose,
  technicianId,
  onOpenJobCard
}) => {
  const { 
    jobCards, 
    settings, 
    auditLogs 
  } = useGarage();

  const [techniciansList, setTechniciansList] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(technicianId || null);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'skills' | 'jobcards' | 'productivity' | 'commission' | 'schedule' | 'performance' | 'audit'
  >('profile');

  // Form States
  const [employeeCode, setEmployeeCode] = useState<string>('TN-0001');
  const [name, setName] = useState<string>('');
  const [nameArabic, setNameArabic] = useState<string>('');
  const [role, setRole] = useState<string>('Master Mechanic');
  const [specialty, setSpecialty] = useState<string>('Mechanical & Engine Diagnostics');
  const [phone, setPhone] = useState<string>('+974 ');
  const [email, setEmail] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<number>(120);
  const [assignedBay, setAssignedBay] = useState<string>('Bay 1');
  const [status, setStatus] = useState<'Active' | 'On Leave' | 'Inactive'>('Active');
  const [efficiency, setEfficiency] = useState<number>(95);
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [certifications, setCertifications] = useState<string[]>(['ASE Master Certified', 'Hybrid & EV Systems']);
  const [newCertInput, setNewCertInput] = useState('');
  const [skills, setSkills] = useState<string[]>(['Engine Overhaul', 'Transmission', 'OBD-II Diagnostics', 'Brake Systems']);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [notes, setNotes] = useState<string>('');
  const [showPrintView, setShowPrintView] = useState<boolean>(false);

  // UI Lifecycle
  const [isEditing, setIsEditing] = useState(!technicianId);
  const [isNew, setIsNew] = useState(!technicianId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch Technicians list from backend
  const fetchTechnicians = async () => {
    try {
      const res = await api.getTechnicians();
      if (res.status === 'ok' && Array.isArray(res.data)) {
        const mapped: Technician[] = res.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          employeeId: t.employee_id || t.code || `TN-000${t.id}`,
          role: t.role || 'Master Mechanic',
          specialty: t.specialty || 'Mechanical',
          phone: t.phone || '',
          hourlyRate: t.hourly_cost || 120,
          assignedBay: t.assigned_bay || 'Bay 1',
          bays: [t.assigned_bay || 'Bay 1'],
          efficiency: 95,
          status: t.status || 'Active'
        }));
        setTechniciansList(mapped);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedTechId(technicianId || null);
  }, [technicianId]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedTechId && techniciansList.length > 0) {
      const tech = techniciansList.find(t => t.id === selectedTechId);
      if (tech) {
        setEmployeeCode(tech.employeeId || 'TN-0001');
        setName(tech.name || '');
        setNameArabic((tech as any).nameArabic || '');
        setRole(tech.role || 'Master Mechanic');
        setSpecialty(tech.specialty || 'Mechanical Diagnostics');
        setPhone(tech.phone || '+974 ');
        setEmail((tech as any).email || '');
        setNationalId((tech as any).nationalId || '');
        setHourlyRate(tech.hourlyRate || 120);
        setAssignedBay(tech.assignedBay || 'Bay 1');
        setStatus((tech.status as any) || 'Active');
        setEfficiency(tech.efficiency || 95);
        setCommissionRate((tech as any).commissionRate || 5);
        setNotes((tech as any).notes || '');
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setValidationError(null);
        setApiError(null);
        return;
      }
    }

    if (!selectedTechId && isNew) {
      handleNewRecord();
    }
  }, [selectedTechId, techniciansList, isOpen]);

  const handleNewRecord = () => {
    setSelectedTechId(null);
    setIsNew(true);
    setIsEditing(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
    setName('');
    setNameArabic('');
    setRole('Master Mechanic');
    setSpecialty('Mechanical & Engine Diagnostics');
    setPhone('+974 ');
    setEmail('');
    setNationalId('');
    setHourlyRate(120);
    setAssignedBay('Bay 1');
    setStatus('Active');
    setEfficiency(95);
    setCommissionRate(5);
    setNotes('');
    setActiveTab('profile');

    api.getNextDocumentNumber('TECHNICIAN')
      .then(res => {
        if (res?.code) setEmployeeCode(res.code);
      })
      .catch(() => {
        setEmployeeCode(`TN-000${techniciansList.length + 1}`);
      });
  };

  // Assigned Job Cards for this technician
  const assignedJobCards = useMemo(() => {
    const cleanName = (name || '').trim().toLowerCase();
    if (!cleanName && !selectedTechId) return [];
    return jobCards.filter(jc => {
      const matchAdvisor = cleanName && jc.serviceAdvisor && jc.serviceAdvisor.toLowerCase() === cleanName;
      const matchAssigned = cleanName && jc.assignedTechnician && jc.assignedTechnician.toLowerCase().includes(cleanName);
      const matchLabor = cleanName && (jc.laborItems || []).some(l => l.technician && l.technician.toLowerCase().includes(cleanName));
      return matchAdvisor || matchAssigned || matchLabor;
    });
  }, [jobCards, name, selectedTechId]);

  // Search items
  const searchRecords: SearchRecordItem[] = useMemo(() => {
    return techniciansList.map(t => ({
      id: t.id,
      documentNumber: t.employeeId || 'TN-0001',
      title: t.name,
      subtitle: `${t.role} • ${t.specialty} • ${t.assignedBay}`,
      status: t.status || 'Active',
      date: `QAR ${t.hourlyRate}/hr • Eff: ${t.efficiency}%`
    }));
  }, [techniciansList]);

  const currentRecordIndex = useMemo(() => {
    if (!selectedTechId) return -1;
    return techniciansList.findIndex(t => t.id === selectedTechId);
  }, [techniciansList, selectedTechId]);

  const handleNavigate = (direction: 'first' | 'prev' | 'next' | 'last') => {
    if (techniciansList.length === 0) return;
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard and navigate?')) return;
    }
    let targetIndex = 0;
    if (direction === 'first') targetIndex = 0;
    else if (direction === 'prev') targetIndex = Math.max(0, (currentRecordIndex === -1 ? 0 : currentRecordIndex) - 1);
    else if (direction === 'next') targetIndex = Math.min(techniciansList.length - 1, (currentRecordIndex === -1 ? 0 : currentRecordIndex) + 1);
    else if (direction === 'last') targetIndex = techniciansList.length - 1;

    const target = techniciansList[targetIndex];
    if (target) {
      setSelectedTechId(target.id);
    }
  };

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setHasUnsavedChanges(true);
    setValidationError(null);
    setApiError(null);
  };

  const handleSave = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setValidationError('Technician Full Name is required.');
      return;
    }
    if (hourlyRate <= 0) {
      setValidationError('Technician hourly rate must be greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        employeeId: employeeCode,
        employee_id: employeeCode,
        role,
        specialty,
        phone: phone.trim(),
        email: email.trim(),
        hourlyRate: Number(hourlyRate),
        hourly_cost: Number(hourlyRate),
        assignedBay,
        assigned_bay: assignedBay,
        status,
        efficiency: Number(efficiency),
        commissionRate: Number(commissionRate),
        notes: notes.trim()
      };

      if (isNew || !selectedTechId) {
        const res = await api.createTechnician(payload);
        setIsNew(false);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        await fetchTechnicians();
        if (res?.data?.id) {
          setSelectedTechId(res.data.id);
        }
        setSuccessMessage(`Technician ${name} registered successfully with code ${employeeCode}.`);
      } else {
        await api.updateTechnician(selectedTechId, payload);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        await fetchTechnicians();
        setSuccessMessage(`Technician ${name} updated successfully.`);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to save technician record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTechId) return;
    setIsDeleting(true);
    try {
      await api.deleteTechnician(selectedTechId);
      setSuccessMessage(`Technician ${name} archived.`);
      await fetchTechnicians();
      if (techniciansList.length > 1) {
        const next = techniciansList.find(t => t.id !== selectedTechId);
        setSelectedTechId(next ? next.id : null);
      } else {
        handleNewRecord();
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to delete technician.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddCert = () => {
    if (newCertInput.trim() && !certifications.includes(newCertInput.trim())) {
      setCertifications([...certifications, newCertInput.trim()]);
      setNewCertInput('');
      setHasUnsavedChanges(true);
    }
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
      setNewSkillInput('');
      setHasUnsavedChanges(true);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <RecordManagementShell
        isOpen={isOpen}
        onClose={onClose}
        title={isNew ? 'New Technician Profile' : (name || 'Technician Record')}
        subtitle="Workshop mechanic roster, technical specialization, hourly rates & productivity"
        icon={Users}
        documentNumber={employeeCode}
        status={status}
        statusVariant={status === 'Active' ? 'success' : status === 'On Leave' ? 'warning' : 'neutral'}
        badgeIcon={status === 'Active' ? UserCheck : Activity}
        metaDetails={[
          { label: 'Role', value: role },
          { label: 'Assigned Bay', value: assignedBay },
          { label: 'Hourly Rate', value: `QAR ${hourlyRate}/hr` },
          { label: 'Active Jobs', value: assignedJobCards.length }
        ]}
        tabs={[
          { id: 'profile', label: 'Technician Profile', icon: Users },
          { id: 'skills', label: 'Skills & Certs', icon: Award },
          { id: 'jobcards', label: 'Assigned Job Cards', icon: Wrench, count: assignedJobCards.length },
          { id: 'productivity', label: 'Productivity & Hours', icon: Clock },
          { id: 'commission', label: 'Commission & Rates', icon: DollarSign },
          { id: 'schedule', label: 'Schedule & Shifts', icon: Calendar },
          { id: 'performance', label: 'Performance History', icon: TrendingUp },
          { id: 'audit', label: 'Audit Trail', icon: ShieldCheck }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
        isNew={isNew}
        isEditing={isEditing}
        isSaving={isSaving}
        isDeleting={isDeleting}
        hasSavedRecord={Boolean(selectedTechId && !isNew)}
        hasUnsavedChanges={hasUnsavedChanges}
        validationError={validationError}
        apiError={apiError}
        successMessage={successMessage}
        onNew={handleNewRecord}
        onSave={handleSave}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDelete}
        onCancel={() => {
          if (selectedTechId) {
            const t = techniciansList.find(tech => tech.id === selectedTechId);
            if (t) {
              setName(t.name);
              setIsEditing(false);
              setHasUnsavedChanges(false);
            }
          } else {
            onClose();
          }
        }}
        onPrint={() => setShowPrintView(true)}
        currentIndex={currentRecordIndex}
        totalRecords={techniciansList.length}
        onFirst={() => handleNavigate('first')}
        onPrevious={() => handleNavigate('prev')}
        onNext={() => handleNavigate('next')}
        onLast={() => handleNavigate('last')}
        searchRecords={searchRecords}
        searchTitle="Find Workshop Technicians"
        searchPlaceholder="Search by TN Code, Name, Role, Bay, Phone..."
        onSelectSearchRecord={(item: any) => {
          const id = typeof item === 'string' ? item : item?.id;
          setSelectedTechId(id);
          setIsEditing(false);
        }}
        customActions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const nextStatus = status === 'Active' ? 'On Leave' : 'Active';
                handleFieldChange(setStatus, nextStatus);
              }}
              disabled={!isEditing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Toggle Leave ({status})</span>
            </button>
          </div>
        }
      >
        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Personal Details & Role Classification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Employee / Tech Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={employeeCode ?? ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-indigo-600 uppercase"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Full Name (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={name ?? ''}
                    onChange={(e) => handleFieldChange(setName, e.target.value)}
                    placeholder="e.g. Tariq Al-Mansoor / Master Mechanic"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name (Arabic)</label>
                  <input
                    type="text"
                    dir="rtl"
                    disabled={!isEditing}
                    value={nameArabic ?? ''}
                    onChange={(e) => handleFieldChange(setNameArabic, e.target.value)}
                    placeholder="طارق المنصور"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Job Role / Title</label>
                  <select
                    disabled={!isEditing}
                    value={role ?? ''}
                    onChange={(e) => handleFieldChange(setRole, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75 cursor-pointer"
                  >
                    <option value="Master Mechanic">Master Mechanic</option>
                    <option value="Senior Technician">Senior Technician</option>
                    <option value="Auto Electrician">Auto Electrician</option>
                    <option value="AC & Diagnostic Specialist">AC & Diagnostic Specialist</option>
                    <option value="Body & Dent Specialist">Body & Dent Specialist</option>
                    <option value="Paint Specialist">Paint Specialist</option>
                    <option value="Apprentice / Helper">Apprentice / Helper</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Workshop Bay</label>
                  <select
                    disabled={!isEditing}
                    value={assignedBay ?? ''}
                    onChange={(e) => handleFieldChange(setAssignedBay, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75 cursor-pointer"
                  >
                    <option value="Bay 1">Bay 1 - Quick Service</option>
                    <option value="Bay 2">Bay 2 - Heavy Mechanical</option>
                    <option value="Bay 3">Bay 3 - Electrical & Diagnostics</option>
                    <option value="Bay 4">Bay 4 - Suspension & Brakes</option>
                    <option value="Denting Bay">Denting & Alignment Bay</option>
                    <option value="Paint Booth">Master Paint Booth</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mobile Phone (Qatar)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={phone ?? ''}
                    onChange={(e) => handleFieldChange(setPhone, e.target.value)}
                    placeholder="+974 5512 3456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={email ?? ''}
                    onChange={(e) => handleFieldChange(setEmail, e.target.value)}
                    placeholder="tariq@najmalhuda.qa"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">QID / Visa Number</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={nationalId ?? ''}
                    onChange={(e) => handleFieldChange(setNationalId, e.target.value)}
                    placeholder="28463401928"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SKILLS & CERTS */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                Technical Capabilities & Certifications
              </h3>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-2">Verified Professional Certifications</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {certifications.map(cert => (
                    <span key={cert} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      {cert}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="Add certification (e.g. Bosch Diagnostic Pro)..."
                      value={newCertInput ?? ''}
                      onChange={(e) => setNewCertInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddCert}
                      className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 cursor-pointer"
                    >
                      Add Cert
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-600 mb-2">Technical Skill Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map(skill => (
                    <span key={skill} className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      {skill}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="Add skill (e.g. ECU Tuning, Ceramic Coating)..."
                      value={newSkillInput ?? ''}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-3 py-1.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-black cursor-pointer"
                    >
                      Add Skill
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ASSIGNED JOB CARDS */}
        {activeTab === 'jobcards' && (
          <div className="space-y-4">
            {assignedJobCards.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-1">
                <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No Job Cards Assigned</p>
                <p className="text-[11px] text-slate-400">Technician is currently available for bay allocations.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800">Active & Historic Repairs ({assignedJobCards.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {assignedJobCards.map(jc => (
                    <div key={jc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600">{jc.jobNumber}</span>
                          <span className="text-xs font-semibold text-slate-800">{jc.customerName}</span>
                          <span className="text-[11px] text-slate-400">({jc.vehiclePlate})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Status: {jc.status} • Total: QAR {Number(jc.totalAmount || 0).toFixed(2)}</p>
                      </div>
                      {onOpenJobCard && (
                        <button
                          type="button"
                          onClick={() => onOpenJobCard(jc.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 cursor-pointer"
                        >
                          <span>Open JC</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PRODUCTIVITY & HOURS */}
        {activeTab === 'productivity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-600 block mb-1">Efficiency Rating</span>
                <div className="text-2xl font-black text-emerald-600">{efficiency}%</div>
                <p className="text-[11px] text-slate-400 mt-1">Billed vs Actual Hours ratio</p>
              </div>
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-600 block mb-1">Standard Billing Rate</span>
                <div className="text-2xl font-black text-indigo-600">QAR {hourlyRate}/hr</div>
                <p className="text-[11px] text-slate-400 mt-1">Chargeable labor rate to client</p>
              </div>
              <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-600 block mb-1">Commission Split</span>
                <div className="text-2xl font-black text-slate-800">{commissionRate}%</div>
                <p className="text-[11px] text-slate-400 mt-1">Labor fee bonus tier</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Hourly Rates & Efficiency Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Chargeable Labor Rate (QAR/Hour) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={!isEditing}
                    value={hourlyRate ?? ''}
                    onChange={(e) => handleFieldChange(setHourlyRate, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Efficiency Metric (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    disabled={!isEditing}
                    value={efficiency ?? ''}
                    onChange={(e) => handleFieldChange(setEfficiency, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COMMISSION & RATES */}
        {activeTab === 'commission' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                Labor Commission & Incentive Structure
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Labor Commission Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    disabled={!isEditing}
                    value={commissionRate ?? ''}
                    onChange={(e) => handleFieldChange(setCommissionRate, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payroll Settlement Mode</label>
                  <input
                    type="text"
                    disabled
                    value="Monthly WPS Bank Transfer (Qatar National Bank)"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SCHEDULE & LEAVE */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Shift Scheduling & Availability
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Work Shift</label>
                  <input
                    type="text"
                    disabled
                    value="Morning & Evening Split (08:00 AM - 01:00 PM & 04:00 PM - 08:00 PM)"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Current Roster Status</label>
                  <select
                    disabled={!isEditing}
                    value={status ?? ''}
                    onChange={(e) => handleFieldChange(setStatus, e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-75 cursor-pointer"
                  >
                    <option value="Active">Active On Duty</option>
                    <option value="On Leave">On Approved Annual / Sick Leave</option>
                    <option value="Inactive">Inactive / Transferred</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PERFORMANCE */}
        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Overall Workshop Rating</h3>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black text-slate-900 ml-1">4.9 / 5.0</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Consistently delivers zero-return quality on engine overhauls and electronic diagnostic repairs.
              </p>
            </div>
          </div>
        )}

        {/* TAB 8: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <RecordAuditTrail
            recordId={selectedTechId || 'NEW'}
            moduleName="Technician"
            entries={auditLogs}
          />
        )}
      </RecordManagementShell>

      {/* PRINT VIEW */}
      {showPrintView && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 flex flex-col items-center">
          <div className="max-w-3xl w-full space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <NajmAlHudaLogo subtitle="Technician Dossier & Skill Profile" />
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Tech Code</span>
                <p className="text-xl font-black text-slate-900">{employeeCode}</p>
                <span className="text-[10px] text-slate-400">Printed: {formatDate(new Date())}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-500">Technician Name</p>
                <p className="text-base font-bold text-slate-900">{name}</p>
                <p className="text-xs text-slate-600 mt-1">Role: {role} • Bay: {assignedBay}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500">Status & Phone</p>
                <p className="text-base font-bold text-emerald-600">{status}</p>
                <p className="text-xs text-slate-600 mt-1">{phone}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 print:hidden">
              <button
                onClick={() => setShowPrintView(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Print View
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Print Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
