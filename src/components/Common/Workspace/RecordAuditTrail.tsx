import React from 'react';
import { History, User, Clock, Shield, ArrowRight, FileEdit, CheckCircle, PlusCircle, Trash2 } from 'lucide-react';
import { SystemAuditLog } from '../../../types';

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: string;
  userName?: string;
  userRole?: string;
  details?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export interface RecordAuditTrailProps {
  entries: AuditTrailEntry[] | SystemAuditLog[];
  recordId?: string;
  recordNumber?: string;
  moduleName?: string;
  className?: string;
}

export const RecordAuditTrail: React.FC<RecordAuditTrailProps> = ({
  entries = [],
  recordId,
  recordNumber,
  moduleName = 'Record',
  className = ''
}) => {
  const getActionIcon = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('create') || act.includes('new') || act.includes('add')) {
      return <PlusCircle className="w-4 h-4 text-emerald-600" />;
    }
    if (act.includes('delete') || act.includes('remove') || act.includes('void')) {
      return <Trash2 className="w-4 h-4 text-rose-600" />;
    }
    if (act.includes('close') || act.includes('complete') || act.includes('approve')) {
      return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
    return <FileEdit className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className={`erp-record-audit-trail space-y-4 p-4 ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-900 text-sm">
            Activity & Audit History {recordNumber ? `for ${recordNumber}` : ''}
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {entries.length} recorded event(s)
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
          <p className="text-sm font-semibold text-slate-700">No previous audit records</p>
          <p className="text-xs text-slate-500 mt-0.5">Events and modifications will be recorded in this permanent immutable audit ledger.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {entries.map((entry: any, index) => {
            const actionText = entry.action || 'MODIFIED';
            const user = entry.userName || entry.user_name || entry.user || 'System';
            const role = entry.role || entry.userRole || 'User';
            const time = entry.timestamp || entry.created_at || new Date().toISOString();
            const details = entry.details || entry.notes || entry.reason || '';

            return (
              <div key={entry.id || index} className="relative group">
                <div className="absolute -left-6 mt-1 p-1 bg-white rounded-full border border-slate-300 shadow-2xs">
                  {getActionIcon(actionText)}
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{actionText.replace(/_/g, ' ')}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.2 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                        <User className="w-3 h-3 text-slate-400" />
                        {user} ({role})
                      </span>
                    </div>

                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(time).toLocaleString()}
                    </span>
                  </div>

                  {details && (
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">
                      {details}
                    </p>
                  )}

                  {(entry.previousValue || entry.newValue || entry.old_values || entry.new_values) && (
                    <div className="pt-2 mt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      {(entry.previousValue || entry.old_values) && (
                        <div className="p-2 rounded bg-rose-50/50 border border-rose-100 font-mono text-rose-900">
                          <span className="font-bold text-rose-700 block mb-0.5">Previous State:</span>
                          <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(entry.previousValue || entry.old_values, null, 2)}</pre>
                        </div>
                      )}
                      {(entry.newValue || entry.new_values) && (
                        <div className="p-2 rounded bg-emerald-50/50 border border-emerald-100 font-mono text-emerald-900">
                          <span className="font-bold text-emerald-700 block mb-0.5">Updated State:</span>
                          <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(entry.newValue || entry.new_values, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
