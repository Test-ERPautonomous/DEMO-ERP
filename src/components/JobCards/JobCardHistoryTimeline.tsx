import React from 'react';
import { JobStatusHistoryEntry } from '../../types';
import { Clock, User, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  history?: JobStatusHistoryEntry[];
}

export const JobCardHistoryTimeline: React.FC<Props> = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        No workflow history logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-[#1875bb]" />
        Workflow & Status Audit Trail
      </h4>

      <div className="relative border-l-2 border-[#1875bb]/30 dark:border-[#1875bb]/20 ml-3 pl-4 space-y-3">
        {history.map((entry, idx) => (
          <div key={entry.id || idx} className="relative group">
            {/* Dot */}
            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#1875bb] border-2 border-white dark:border-slate-900" />

            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span className="text-[#1875bb]">{entry.status}</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">
                  {entry.timestamp}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  {entry.changedBy}
                </span>
                {entry.notes && (
                  <span className="italic text-slate-600 dark:text-slate-300">
                    — "{entry.notes}"
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
