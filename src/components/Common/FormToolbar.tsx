import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Save,
  Edit3,
  Trash2,
  RotateCcw,
  Search,
  Printer,
  X,
  Loader2,
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  AlertTriangle
} from 'lucide-react';

export interface FormToolbarProps {
  // Mode & State
  isNew: boolean;
  isEditing: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  hasSavedRecord: boolean;
  hasUnsavedChanges?: boolean;

  // Actions
  onNew: () => void;
  onSave: () => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onCancel: () => void;
  onFind?: () => void;
  onPrint?: () => void;
  onClose: () => void;

  // Navigation (optional)
  canNavigate?: boolean;
  currentIndex?: number;
  totalRecords?: number;
  onFirst?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onLast?: () => void;

  // Record details for confirmations and display
  recordLabel?: string; // e.g. "Job Card", "Invoice", "Estimate"
  recordNumber?: string; // e.g. "JC-2026-0001"
  deleteBlockReason?: string | null; // e.g. "Referenced by Invoice INV-2026-0001"
  customActions?: React.ReactNode;
}

export const FormToolbar: React.FC<FormToolbarProps> = ({
  isNew,
  isEditing,
  isSaving = false,
  isDeleting = false,
  hasSavedRecord,
  hasUnsavedChanges = false,
  onNew,
  onSave,
  onEdit,
  onDelete,
  onCancel,
  onFind,
  onPrint,
  onClose,
  canNavigate = false,
  currentIndex = -1,
  totalRecords = 0,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  recordLabel = 'Record',
  recordNumber = '',
  deleteBlockReason = null,
  customActions,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardAction, setDiscardAction] = useState<'cancel' | 'close' | 'new' | null>(null);

  // Button rules as specified in requirements:
  // 1. New: enabled when screen is open
  const canNew = !isSaving && !isDeleting;

  // 2. Save: enabled only when form is editable and not currently saving
  const canSave = isEditing && !isSaving && !isDeleting;

  // 3. Edit: enabled only when a saved record is loaded
  const canEdit = hasSavedRecord && !isSaving && !isDeleting;

  // 4. Delete: enabled only when a saved record is loaded
  const canDelete = hasSavedRecord && !isSaving && !isDeleting;

  // 5. Cancel: enabled when creating or editing
  const canCancel = (isNew || isEditing) && !isSaving && !isDeleting;

  // 6. Find: always available when record lookup is supported
  const canFind = Boolean(onFind) && !isSaving && !isDeleting;

  // 7. Print: enabled only for a saved record
  const canPrint = Boolean(onPrint) && hasSavedRecord && !isSaving && !isDeleting;

  // 8. Close: always available
  const canClose = !isSaving && !isDeleting;

  // Handle New click
  const handleNewClick = () => {
    if (hasUnsavedChanges) {
      setDiscardAction('new');
      setShowDiscardConfirm(true);
    } else {
      onNew();
    }
  };

  // Handle Cancel click
  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setDiscardAction('cancel');
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  };

  // Handle Close click
  const handleCloseClick = () => {
    if (hasUnsavedChanges) {
      setDiscardAction('close');
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Confirm discard
  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    if (discardAction === 'cancel') {
      onCancel();
    } else if (discardAction === 'close') {
      onClose();
    } else if (discardAction === 'new') {
      onNew();
    }
    setDiscardAction(null);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    await onDelete();
  };

  return (
    <>
      <div className="bg-gradient-to-b from-[#ffffff] via-[#f4f5f7] to-[#e4e7eb] border-b border-[#c8ccd0] px-2 py-0.5 sm:py-1 flex items-center justify-between shrink-0 select-none shadow-xs">
        <div className="flex items-center space-x-0.5 sm:space-x-1 overflow-x-auto py-0.5">
          {/* 1. NEW BUTTON */}
          <button
            type="button"
            onClick={handleNewClick}
            disabled={!canNew}
            className={`px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center rounded-xs cursor-pointer border transition-all min-w-[42px] ${
              isNew
                ? 'bg-amber-100/80 border-amber-300 text-amber-900 shadow-xs ring-1 ring-amber-400'
                : 'text-slate-800 hover:bg-[#e2e8f0] border-transparent hover:border-[#cbd5e1]'
            } disabled:opacity-35 disabled:cursor-not-allowed`}
            title="New Record (F2)"
          >
            <div className="relative">
              <FileText className="w-4.5 h-4.5 text-[#ca8a04]" />
              <Plus className="w-2.5 h-2.5 text-emerald-700 absolute -top-1 -right-1 font-bold" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
              {isNew ? 'New *' : 'New'}
            </span>
          </button>

          {/* 2. SAVE BUTTON */}
          <button
            type="button"
            onClick={() => onSave()}
            disabled={!canSave}
            className={`px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center rounded-xs cursor-pointer border transition-all min-w-[42px] ${
              canSave
                ? 'text-slate-800 hover:bg-blue-50 border-blue-200 hover:border-blue-400 bg-blue-50/50'
                : 'text-slate-400 border-transparent disabled:opacity-35 disabled:cursor-not-allowed'
            }`}
            title="Save Record (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin" />
            ) : (
              <Save className="w-4.5 h-4.5 text-[#2563eb]" />
            )}
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
              {isSaving ? 'Saving...' : 'Save'}
            </span>
          </button>

          {/* 3. EDIT BUTTON */}
          <button
            type="button"
            onClick={onEdit}
            disabled={!canEdit}
            className={`px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center rounded-xs cursor-pointer border transition-all min-w-[42px] ${
              isEditing && hasSavedRecord
                ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-400'
                : 'text-slate-800 hover:bg-[#e2e8f0] border-transparent hover:border-[#cbd5e1]'
            } disabled:opacity-35 disabled:cursor-not-allowed`}
            title="Edit Record (F4)"
          >
            <Edit3 className="w-4.5 h-4.5 text-[#475569]" />
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
              {isEditing && hasSavedRecord ? 'Editing' : 'Edit'}
            </span>
          </button>

          {/* 4. DELETE BUTTON */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!canDelete}
            className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xs cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-w-[42px] transition-all"
            title="Delete Record"
          >
            {isDeleting ? (
              <Loader2 className="w-4.5 h-4.5 text-rose-600 animate-spin" />
            ) : (
              <Trash2 className="w-4.5 h-4.5 text-[#dc2626]" />
            )}
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </span>
          </button>

          {/* 5. CANCEL BUTTON */}
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={!canCancel}
            className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-xs cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-w-[42px] transition-all"
            title="Cancel Changes (Esc)"
          >
            <RotateCcw className="w-4.5 h-4.5 text-[#16a34a]" />
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
              Cancel
            </span>
          </button>

          {/* 6. FIND BUTTON */}
          {onFind && (
            <button
              type="button"
              onClick={onFind}
              disabled={!canFind}
              className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-xs cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-w-[42px] transition-all"
              title="Find Record (F3 / Ctrl+F)"
            >
              <Search className="w-4.5 h-4.5 text-[#0284c7]" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
                Find
              </span>
            </button>
          )}

          {/* 7. PRINT BUTTON */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              disabled={!canPrint}
              className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-xs cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-w-[42px] transition-all"
              title={hasSavedRecord ? "Print Record (Ctrl+P)" : "Save record first to print"}
            >
              <Printer className="w-4.5 h-4.5 text-[#334155]" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
                Print
              </span>
            </button>
          )}

          {customActions && (
            <>
              <div className="h-7 w-px bg-[#cbd5e1] mx-1 shrink-0" />
              {customActions}
            </>
          )}

          {/* NAVIGATION BUTTONS (IF SUPPORTED) */}
          {canNavigate && (
            <>
              <div className="h-7 w-px bg-[#cbd5e1] mx-1 shrink-0" />
              <button
                type="button"
                onClick={onFirst}
                disabled={totalRecords === 0 || currentIndex <= 0 || isSaving}
                className="px-1.5 py-1 flex flex-col items-center justify-center text-slate-700 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-xs cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed min-w-[34px]"
                title="First Record"
              >
                <ChevronFirst className="w-4 h-4 text-slate-700" />
                <span className="text-[9px] font-medium text-slate-600">First</span>
              </button>
              <button
                type="button"
                onClick={onPrevious}
                disabled={totalRecords === 0 || currentIndex <= 0 || isSaving}
                className="px-1.5 py-1 flex flex-col items-center justify-center text-slate-700 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-xs cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed min-w-[34px]"
                title="Previous Record"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
                <span className="text-[9px] font-medium text-slate-600">Prev</span>
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={totalRecords === 0 || currentIndex >= totalRecords - 1 || isSaving}
                className="px-1.5 py-1 flex flex-col items-center justify-center text-slate-700 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-xs cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed min-w-[34px]"
                title="Next Record"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
                <span className="text-[9px] font-medium text-slate-600">Next</span>
              </button>
              <button
                type="button"
                onClick={onLast}
                disabled={totalRecords === 0 || currentIndex >= totalRecords - 1 || isSaving}
                className="px-1.5 py-1 flex flex-col items-center justify-center text-slate-700 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-xs cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed min-w-[34px]"
                title="Last Record"
              >
                <ChevronLast className="w-4 h-4 text-slate-700" />
                <span className="text-[9px] font-medium text-slate-600">Last</span>
              </button>
            </>
          )}
        </div>

        {/* 8. CLOSE BUTTON */}
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={handleCloseClick}
            disabled={!canClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-[#e2e8f0] rounded-xs transition-colors cursor-pointer"
            title="Close Form (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL: DELETE RECORD */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 max-w-md w-full p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete {recordLabel}?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900 font-semibold">{recordLabel} {recordNumber || ''}</strong>?
                  This action cannot be undone.
                </p>

                {deleteBlockReason ? (
                  <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    <strong>Reference Warning:</strong> {deleteBlockReason}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded cursor-pointer transition-colors"
              >
                Keep {recordLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deleteBlockReason)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DISCARD UNSAVED CHANGES */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 max-w-md w-full p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Discard Unsaved Changes?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You have unsaved edits in this {recordLabel.toLowerCase()}. If you continue, your changes will be discarded.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  setDiscardAction(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded cursor-pointer transition-colors"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-xs cursor-pointer transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
