import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Trash2 } from 'lucide-react';
import { pruneLocalStorage } from '../../lib/storage';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    try {
      pruneLocalStorage();
    } catch (e) {
      console.warn('Failed to prune storage:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      const isStorageError = this.state.error?.message?.toLowerCase().includes('quota') ||
        this.state.error?.message?.toLowerCase().includes('storage');

      return (
        <div className="min-h-[300px] flex items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl m-4 text-slate-800">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {this.props.fallbackTitle || (isStorageError ? 'Storage Quota Limit Handled' : 'A component error occurred')}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {this.state.error?.message || 'An unexpected error was encountered in this view.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1875bb] hover:bg-[#135d96] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Section</span>
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Prune Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
