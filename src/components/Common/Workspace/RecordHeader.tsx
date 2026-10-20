import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Calendar, Clock, Hash, Tag, Building, ShieldCheck, FileText } from 'lucide-react';
import { RecordStatusBadge } from './RecordStatusBadge';

export interface RecordHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | any;
  documentNumber: string;
  documentDate?: string;
  status: string;
  statusType?: 'job_card' | 'customer' | 'vehicle' | 'supplier' | 'invoice' | 'estimate' | 'po' | 'general';
  companyName?: string;
  badges?: Array<{
    label: string;
    value: string | number;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple' | 'mono';
  }>;
  isNew?: boolean;
  isEditing?: boolean;
  className?: string;
}

export const RecordHeader: React.FC<RecordHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  documentNumber,
  documentDate,
  status,
  statusType = 'general',
  companyName = 'Najm Al Huda Workshop',
  badges = [],
  isNew = false,
  isEditing = false,
  className = ''
}) => {
  const renderIcon = () => {
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) {
      const Comp = Icon as React.ComponentType<{ className?: string }>;
      return <Comp className="w-6 h-6" />;
    }
    return <FileText className="w-6 h-6" />;
  };

  return (
    <div className={`erp-record-header bg-slate-900 text-white px-4 py-3 border-b border-slate-800 shadow-xs select-none ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Module Icon, Title, and Document Number */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-sky-400 shrink-0 shadow-inner">
            {renderIcon()}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{title}</span>
                {isNew && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    New Draft
                  </span>
                )}
                {isEditing && !isNew && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Editing
                  </span>
                )}
              </h2>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-xs sm:text-sm font-black text-sky-400 shadow-inner">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>{documentNumber || 'PENDING'}</span>
              </div>

              <RecordStatusBadge status={status} type={statusType} size="sm" />
            </div>

            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{subtitle}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-500" />
                  {companyName}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Document Date & Key Info Badges */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          {documentDate && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{documentDate}</span>
            </div>
          )}

          {badges.map((b, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                b.variant === 'primary'
                  ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                  : b.variant === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  : b.variant === 'warning'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                  : b.variant === 'purple'
                  ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                  : b.variant === 'mono'
                  ? 'bg-slate-800 text-slate-200 border-slate-700 font-mono'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700'
              }`}
            >
              <span className="text-slate-400 text-[11px] font-normal">{b.label}:</span>
              <span>{b.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecordHeader;
