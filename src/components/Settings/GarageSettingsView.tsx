import React, { useState } from 'react';
import { GarageSettings } from '../../types';
import { 
  Building2, 
  DollarSign, 
  Percent, 
  Check, 
  RotateCcw, 
  Paintbrush, 
  Wrench, 
  ShieldAlert,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { HeaderLogoBadge } from '../Common/HeaderLogoBadge';
import { KeyboardSettingsCard } from './KeyboardSettingsCard';
import { Users, Shield, ArrowRight } from 'lucide-react';

interface Props {
  settings: GarageSettings;
  onUpdateSettings: (newSettings: Partial<GarageSettings>) => void;
  onResetData: () => void;
  onOpenCheatSheet?: (initialMode?: 'view' | 'customize') => void;
  onOpenUserManagement?: () => void;
}

export const GarageSettingsView: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onOpenCheatSheet,
  onOpenUserManagement
}) => {
  const [formData, setFormData] = useState<GarageSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (settings) {
      setFormData({ ...settings });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Garage Profile &amp; Workshop Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure business details printed on invoices, default labor hourly rates, paint booth charges, and staff access.
          </p>
        </div>

        {onOpenUserManagement && (
          <button
            type="button"
            onClick={onOpenUserManagement}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users &amp; Roles</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* User Management Quick Banner */}
      {onOpenUserManagement && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-700/50">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0 border border-white/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Staff User Management &amp; Role Access</h3>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/40 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Customizable Roles
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Add staff login credentials, set permissions for Owner, Manager, Advisor, Technician, and customize access per user.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenUserManagement}
            className="px-4 py-2 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Configure Staff Accounts &rarr;
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Header Photo Logo & Executive Branding */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ImageIcon className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">Header Photo Logo &amp; Executive Branding</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <HeaderLogoBadge
              currentLogoUrl={formData.headerLogoUrl}
              onLogoChange={(url) => setFormData(prev => ({ ...prev, headerLogoUrl: url }))}
              size="lg"
              showText={false}
            />

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div>
                <p className="font-bold text-slate-800 text-xs">Active Header Photo Logo</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Click on the avatar circle to view, upload, or replace the photo displayed in the top navigation header and user profile icon.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-[10px] font-semibold border border-sky-200">
                  <Camera className="w-3 h-3" />
                  Supports PNG, JPG, WEBP, SVG
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                  Persists Across App &amp; Header
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Garage Business Profile (Printed on Invoices)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Garage Workshop Name (English) *</label>
              <input
                type="text"
                required
                value={formData.garageName || ''}
                onChange={e => setFormData({ ...formData, garageName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Workshop Arabic Name (اسم الورشة بالعربية)</label>
              <input
                type="text"
                dir="rtl"
                placeholder="مركز صيانة وهيكل السيارات"
                value={formData.garageNameAr || ''}
                onChange={e => setFormData({ ...formData, garageNameAr: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tagline / Specialization</label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.country || 'Qatar'}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Workshop Address (Qatar)</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Gate 14, Street 24, Industrial Area"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">City / Municipality</label>
              <input
                type="text"
                value={formData.cityStateZip || ''}
                onChange={e => setFormData({ ...formData, cityStateZip: e.target.value })}
                placeholder="e.g. Doha, State of Qatar"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Qatar Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+974 4450 8822"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Qatar C.R. Number *</label>
              <input
                type="text"
                value={formData.crNumber || ''}
                onChange={e => setFormData({ ...formData, crNumber: e.target.value })}
                placeholder="e.g. CR No. 164820/1"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Pricing Defaults */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Currency &amp; Standard Workshop Rates</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Currency Code / Symbol *
              </label>
              <input
                type="text"
                required
                value={formData.currencySymbol || 'QAR'}
                onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                placeholder="QAR"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Mechanical Labor Rate ({formData.currencySymbol || 'QAR'}/hr)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={formData.defaultLaborRate ?? ''}
                onChange={e => setFormData({ ...formData, defaultLaborRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Paint Booth Oven Rate ({formData.currencySymbol || 'QAR'}/hr)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={formData.paintBoothHourRate ?? ''}
                onChange={e => setFormData({ ...formData, paintBoothHourRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Save button & status */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-emerald-700 font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Garage settings updated successfully!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-xs transition-colors"
          >
            Save Garage Settings
          </button>
        </div>
      </form>

      {/* Global Keyboard Shortcuts Card */}
      <KeyboardSettingsCard onOpenCheatSheet={onOpenCheatSheet || (() => {})} />

      {/* Demo Reset Safety Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>Reset Demo Records</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Reset all job cards, inventory quantities, purchase orders, and invoices back to the initial sample dataset.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all garage records to initial demo state? This will overwrite recent local changes.')) {
              onResetData();
            }
          }}
          className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-700 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Demo Data
        </button>
      </div>
    </div>
  );
};
