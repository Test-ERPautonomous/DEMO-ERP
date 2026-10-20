import React from 'react';
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast, Hash } from 'lucide-react';

export interface RecordNavigationProps {
  currentIndex: number;
  totalRecords: number;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  onJumpToIndex?: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

export const RecordNavigation: React.FC<RecordNavigationProps> = ({
  currentIndex,
  totalRecords,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  disabled = false,
  className = ''
}) => {
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= totalRecords - 1;
  const hasRecords = totalRecords > 0;

  return (
    <div className={`erp-record-navigation flex items-center space-x-1 select-none ${className}`}>
      <button
        type="button"
        onClick={onFirst}
        disabled={disabled || !hasRecords || isFirst}
        className="p-1 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-slate-300 transition-colors"
        title="First Record (Alt+Home)"
      >
        <ChevronFirst className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onPrevious}
        disabled={disabled || !hasRecords || isFirst}
        className="p-1 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-slate-300 transition-colors"
        title="Previous Record (Alt+Left)"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-xs font-mono font-bold text-slate-700 flex items-center gap-1 shadow-2xs">
        <span>{hasRecords ? currentIndex + 1 : 0}</span>
        <span className="text-slate-400 font-normal">of</span>
        <span>{totalRecords}</span>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={disabled || !hasRecords || isLast}
        className="p-1 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-slate-300 transition-colors"
        title="Next Record (Alt+Right)"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onLast}
        disabled={disabled || !hasRecords || isLast}
        className="p-1 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-slate-300 transition-colors"
        title="Last Record (Alt+End)"
      >
        <ChevronLast className="w-4 h-4" />
      </button>
    </div>
  );
};
