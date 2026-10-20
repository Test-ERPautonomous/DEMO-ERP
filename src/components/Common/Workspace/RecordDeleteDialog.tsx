import React from 'react';
import { AlertTriangle, Trash2, Archive, X } from 'lucide-react';

export interface RecordDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  recordLabel?: string;
  recordNumber?: string;
  recordName?: string;
  deleteBlockReason?: string | null;
  onArchive?: () => void | Promise<void>;
  isProcessing?: boolean;
}

export const RecordDeleteDialog: React.FC<RecordDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recordLabel = 'Record',
  recordNumber = '',
  recordName = '',
  deleteBlockReason = null,
  onArchive,
  isProcessing = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-md w-full p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Delete {recordLabel}?
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900 font-bold">
                {recordLabel} {recordNumber} {recordName ? `(${recordName})` : ''}
              </strong>?
            </p>

            {deleteBlockReason ? (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Archive className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-0.5">Reference Constraint:</div>
                  <p className="text-amber-800">{deleteBlockReason}</p>
                  {onArchive && (
                    <p className="mt-1.5 font-medium text-amber-900">
                      Recommendation: Deactivate or Archive this record instead of hard deleting to preserve transaction integrity.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer transition-colors"
          >
            Cancel
          </button>

          {onArchive && deleteBlockReason && (
            <button
              type="button"
              onClick={async () => {
                await onArchive();
                onClose();
              }}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl cursor-pointer transition-colors"
            >
              Archive Record
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            disabled={Boolean(deleteBlockReason) || isProcessing}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};
