import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ModuleContainerProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | any;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ModuleContainer: React.FC<ModuleContainerProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  stats,
  tabs,
  children,
  className = '',
}) => {
  const renderHeaderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) {
      const Comp = Icon as React.ComponentType<{ className?: string }>;
      return <Comp className="w-5 h-5" />;
    }
    return null;
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden ${className}`}>
      {/* Header section */}
      <div className="px-4 py-4 sm:px-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                {renderHeaderIcon()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 mt-1.5 font-medium">{subtitle}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {actions}
          </div>
        </div>

        {tabs && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            {tabs}
          </div>
        )}
        
        {stats && (
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
            {stats}
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
        {children}
      </div>
    </div>
  );
};

export default ModuleContainer;
