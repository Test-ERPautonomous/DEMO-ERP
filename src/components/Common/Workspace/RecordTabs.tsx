import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | any;
  count?: number;
  hasError?: boolean;
  disabled?: boolean;
}

export interface RecordTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const RecordTabs: React.FC<RecordTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = ''
}) => {
  return (
    <div className={`erp-record-tabs bg-slate-100 border-b border-slate-300 px-3 pt-1.5 flex items-center overflow-x-auto scrollbar-none select-none shrink-0 ${className}`}>
      <div className="flex items-center space-x-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => !tab.disabled && onChange(tab.id)}
              disabled={tab.disabled}
              className={`group flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer whitespace-nowrap border-t border-x ${
                isActive
                  ? 'bg-white text-blue-700 border-slate-300 border-b-white -mb-px shadow-xs relative z-10'
                  : 'bg-slate-200/70 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-transparent hover:border-slate-300'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {Icon && (
                React.isValidElement(Icon) ? (
                  Icon
                ) : (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) ? (
                  (() => {
                    const Comp = Icon as React.ComponentType<{ className?: string }>;
                    return (
                      <Comp
                        className={`w-3.5 h-3.5 transition-colors ${
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        } ${tab.hasError ? 'text-rose-500' : ''}`}
                      />
                    );
                  })()
                ) : null
              )}
              <span>{tab.label}</span>

              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-300/80 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}

              {tab.hasError && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-300 animate-ping"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecordTabs;
