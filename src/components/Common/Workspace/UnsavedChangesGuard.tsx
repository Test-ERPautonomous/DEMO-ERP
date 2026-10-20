import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface UnsavedChangesGuardProps {
  isOpen: boolean;
  onStay: () => void;
  onDiscard: () => void;
  recordLabel?: string;
  message?: string;
}

export const UnsavedChangesGuard: React.FC<UnsavedChangesGuardProps> = ({
  isOpen,
  onStay,
  onDiscard,
  recordLabel = 'Record',
  message
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-md w-full p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Discard Unsaved Changes?
              </h3>
              <button
                type="button"
                onClick={onStay}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {message || `You have unsaved changes in this ${recordLabel.toLowerCase()}. If you leave or reset without saving, your edits will be lost.`}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onStay}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer transition-colors"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
};
