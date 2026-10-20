import React from 'react';
import { UniqonLogo } from '../Navigation/UniqonLogo';
import { X, CheckCircle, Shield, Award, Cpu, HardDrive, Globe, Phone } from 'lucide-react';
import { GarageSettings } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GarageSettings;
}

export const AboutUniqonModal: React.FC<Props> = ({ isOpen, onClose, settings }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs antialiased">
      <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Title Bar */}
        <div className="bg-[#1e4e79] text-white px-3 py-1.5 flex items-center justify-between font-bold select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>About Automotive Workshop Management System</span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-200 cursor-pointer p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Logo & Headline */}
          <div className="flex items-center justify-center pb-4 border-b border-slate-200">
            <UniqonLogo size="lg" />
          </div>

          {/* System Specs */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2 text-slate-700 text-xs">
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="font-semibold text-slate-900">Application Edition:</span>
              <span className="font-mono text-blue-700 font-bold">UniQon Enterprise v8.4.2 (GCC Edition)</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="font-semibold text-slate-900">Licensed Entity:</span>
              <span className="font-medium text-slate-800">{settings.garageName} (CR: {settings.crNumber})</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="font-semibold text-slate-900">Tax Jurisdiction:</span>
              <span>State of Qatar (GTA Tax Card: {settings.taxId}, Rate: {settings.taxRatePercent}%)</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200/60">
              <span className="font-semibold text-slate-900">Database Engine:</span>
              <span className="font-mono text-emerald-700">Supabase PostgreSQL (Permanent Cloud Architecture)</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="font-semibold text-slate-900">Build Timestamp:</span>
              <span className="font-mono text-slate-500">2026-09-08 Enterprise Release</span>
            </div>
          </div>

          {/* Module Capabilities */}
          <div>
            <span className="font-bold text-slate-900 block mb-1.5">Registered Modules:</span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Vehicle Intake &amp; Inspection
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Job Cards &amp; Estimations
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Denting &amp; Paint Booth Ledger
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Parts Inventory &amp; Stock Take
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Purchases &amp; Goods Receipt (GRN)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> General Ledger &amp; Cash Receipts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Post-Dated Cheques (PDC)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Labor Timesheet &amp; Clock-In/Out
              </span>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 flex flex-col items-center gap-1">
            <span>© 2026 UniQon Systems &amp; Software Solutions. All rights reserved.</span>
            <span>Support: support@uniqonauto.com | Hotline: +974 4499 8811</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="bg-slate-100 px-4 py-2 border-t border-slate-300 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#1e4e79] hover:bg-[#163a5c] text-white font-semibold rounded-xs shadow-xs cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
