import React from 'react';

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'sky' | 'purple' | 'indigo' | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  dot = false,
}) => {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    secondary: 'bg-slate-100 text-slate-600 border-slate-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    sky: 'bg-sky-50 text-sky-800 border-sky-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
  };

  const dots: Record<BadgeVariant, string> = {
    default: 'bg-slate-400',
    secondary: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    sky: 'bg-sky-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-600',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${variants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[variant]}`} />}
      {children}
    </span>
  );
};
