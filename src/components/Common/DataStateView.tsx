import React from 'react';
import { 
  AlertTriangle, 
  Lock, 
  ShieldAlert, 
  RefreshCw, 
  Inbox, 
  LogIn, 
  Loader2 
} from 'lucide-react';

export interface DataStateProps {
  type: 'loading' | 'empty' | 'auth' | 'forbidden' | 'error';
  title?: string;
  message?: string;
  onRetry?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export const DataStateView: React.FC<DataStateProps> = ({
  type,
  title,
  message,
  onRetry,
  onAction,
  actionLabel,
  className = '',
}) => {
  switch (type) {
    case 'loading':
      return (
        <div className={`p-10 flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-sky-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-sky-600 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-sm">{title || 'Loading Workshop Records...'}</h4>
            <p className="text-xs text-slate-500 max-w-sm">{message || 'Fetching real-time persistent data from server.'}</p>
          </div>
        </div>
      );

    case 'auth':
      return (
        <div className={`p-8 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
          <div className="p-3 bg-amber-100 rounded-full text-amber-700 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900 text-sm">{title || 'Authentication Required'}</h4>
            <p className="text-xs text-amber-700 max-w-md">
              {message || 'Your authenticated workshop session has expired or requires renewal. Please re-authenticate to view protected records.'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {onAction && (
              <button
                type="button"
                onClick={onAction}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{actionLabel || 'Sign In / Reconnect'}</span>
              </button>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-300 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      );

    case 'forbidden':
      return (
        <div className={`p-8 bg-rose-50/70 border border-rose-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
          <div className="p-3 bg-rose-100 rounded-full text-rose-700 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-rose-900 text-sm">{title || 'Access Restricted'}</h4>
            <p className="text-xs text-rose-700 max-w-md">
              {message || 'You do not have the required role permissions to perform this action or view these financial records.'}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Permission Check</span>
            </button>
          )}
        </div>
      );

    case 'error':
      return (
        <div className={`p-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
          <div className="p-3 bg-rose-100 text-rose-700 rounded-full shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-sm">{title || 'Unable to Load Records'}</h4>
            <p className="text-xs text-slate-600 max-w-md">
              {message || 'A database or connection error occurred while querying records. Data integrity has been preserved.'}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{actionLabel || 'Retry Request'}</span>
            </button>
          )}
        </div>
      );

    case 'empty':
    default:
      return (
        <div className={`p-10 flex flex-col items-center justify-center text-center space-y-2 ${className}`}>
          <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-1">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-700 text-sm">{title || 'No Records Found'}</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            {message || 'No records match the current criteria. You can create a new entry or adjust your filters.'}
          </p>
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>{actionLabel || 'Create New Entry'}</span>
            </button>
          )}
        </div>
      );
  }
};
