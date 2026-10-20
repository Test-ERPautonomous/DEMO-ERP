import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  useEffect(() => {
    const handleCustomToast = (e: any) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || 'error');
      }
    };
    window.addEventListener('najm:toast', handleCustomToast);
    return () => window.removeEventListener('najm:toast', handleCustomToast);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, addToast: showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-xl border text-xs font-medium transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500/40 shadow-emerald-950/20'
                : toast.type === 'error'
                ? 'bg-red-950 text-red-100 border-red-700/50 shadow-red-950/30'
                : toast.type === 'warning'
                ? 'bg-amber-950 text-amber-100 border-amber-700/50 shadow-amber-950/30'
                : 'bg-slate-900 text-white border-blue-500/40'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 leading-snug">{toast.message}</div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg: string) => {
        console.log('[Toast]:', msg);
      },
      addToast: (msg: string) => {
        console.log('[Toast]:', msg);
      }
    };
  }
  return context;
};
