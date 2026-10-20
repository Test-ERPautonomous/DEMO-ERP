import React, { useState } from 'react';
import { GarageSettings } from '../../types';
import { GarageSettingsView } from './GarageSettingsView';
import { UserManager } from '../Admin/UserManager';
import { WorkshopParametersView } from './WorkshopParametersView';
import { KeyboardSettingsCard } from './KeyboardSettingsCard';
import { SupabaseDiagnosticComponent } from '../Diagnostic/SupabaseDiagnosticComponent';
import { 
  Settings, 
  Users, 
  ShieldCheck, 
  Building, 
  Database, 
  Server,
  Sliders,
  Keyboard,
  Activity
} from 'lucide-react';
import { ModuleContainer } from '../Common/ModuleContainer';

interface Props {
  settings: GarageSettings;
  onUpdateSettings: (settings: GarageSettings) => void;
  onResetData: () => void;
  onOpenCheatSheet?: (initialMode?: 'view' | 'customize') => void;
  initialTab?: string;
}

export const ControlPanelWindow: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onOpenCheatSheet,
  initialTab = 'profile'
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <GarageSettingsView
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onResetData={onResetData}
            onOpenCheatSheet={onOpenCheatSheet}
            onOpenUserManagement={() => setActiveTab('users')}
          />
        );
      case 'shortcuts':
        return (
          <KeyboardSettingsCard onOpenCheatSheet={onOpenCheatSheet || (() => {})} />
        );
      case 'parameters':
        return (
          <WorkshopParametersView
            settings={settings}
            onUpdateSettings={(newSettings) => onUpdateSettings({ ...settings, ...newSettings })}
          />
        );
      case 'users':
        return (
          <UserManager settings={settings} />
        );
      case 'supabase_diag':
        return (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-2">
            <SupabaseDiagnosticComponent />
          </div>
        );
      case 'system':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-900 text-lg">System Parameters</h3>
                <p className="text-slate-500 text-sm">Qatar-specific workshop ERP configurations</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Company Code', value: 'NAH', icon: Building },
                  { label: 'Default Currency', value: 'QAR (Qatar Riyal)', icon: Database },
                  { label: 'Commercial Reg.', value: 'CR No. 123456', icon: ShieldCheck },
                  { label: 'Billing Mode', value: 'Net Direct Billing (No VAT)', icon: Server },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</div>
                      <div className="text-sm font-bold text-slate-900">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Database Maintenance</h4>
                  <p className="text-sm text-slate-500">Purge workshop data and re-initialize to factory defaults</p>
                </div>
                <button
                  onClick={onResetData}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95 cursor-pointer"
                >
                  Reset Database
                </button>
              </div>
            </div>

            {/* Embedded Live Supabase Diagnostics */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-2">
              <SupabaseDiagnosticComponent compact={true} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ModuleContainer
      title="Settings & Workshop Parameters"
      subtitle="Workshop profile, labor rates, paint codes, user accounts, and system maintenance"
      icon={Settings}
      tabs={
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[650px]">
          {[
            { id: 'profile', label: 'Workshop Profile', icon: Building },
            { id: 'users', label: 'User Management & Roles', icon: Users },
            { id: 'parameters', label: 'Workshop Parameters', icon: Sliders },
            { id: 'shortcuts', label: 'Shortcuts & Hotkeys', icon: Keyboard },
            { id: 'supabase_diag', label: 'Supabase Diagnostic', icon: Database },
            { id: 'system', label: 'System & Database', icon: Server }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      {renderContent()}
    </ModuleContainer>
  );
};
