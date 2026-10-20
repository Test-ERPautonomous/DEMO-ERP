import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Save,
  Edit3,
  Trash2,
  RotateCcw,
  Search,
  Printer,
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  X,
  Loader2,
  AlertTriangle,
  Archive
} from 'lucide-react';

export interface RecordToolbarProps {
  // Record status & lifecycle flags
  isNew: boolean;
  isEditing: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  hasSavedRecord: boolean;
  hasUnsavedChanges?: boolean;
  isArchived?: boolean;

  // Primary Action Callbacks
  onNew: () => void;
  onSave: () => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onCancel: () => void;
  onFind?: () => void;
  onPrint?: () => void;
  onClose: () => void;

  // Optional Navigation Callbacks
  canNavigate?: boolean;
  currentIndex?: number;
  totalRecords?: number;
  onFirst?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onLast?: () => void;

  // Record Context & Safety Guard Info
  recordLabel?: string; // e.g. "Customer", "Vehicle", "Supplier", "Job Card"
  recordNumber?: string; // e.g. "CU-0001", "VE-0001", "JC-0001"
  recordName?: string; // e.g. "Nasser Al-Kuwari"
  deleteBlockReason?: string | null;
  customActions?: React.ReactNode;
  
  // Guard callbacks if handled internally or delegated
  onConfirmDelete?: () => void | Promise<void>;
}

export const RecordToolbar: React.FC<RecordToolbarProps> = ({
  isNew,
  isEditing,
  isSaving = false,
  isDeleting = false,
  hasSavedRecord,
  hasUnsavedChanges = false,
  isArchived = false,
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
  recordName = '',
  deleteBlockReason = null,
  customActions
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'cancel' | 'close' | null>(null);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is being typed and shortcut conflicts with standard editing unless Ctrl is pressed
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';

      // F2 -> New
      if (e.key === 'F2') {
        e.preventDefault();
        handleNewClick();
        return;
      }

      // F3 -> Find
      if (e.key === 'F3') {
        e.preventDefault();
        if (onFind && !isSaving && !isDeleting) onFind();
        return;
      }

      // F4 -> Edit
      if (e.key === 'F4') {
        e.preventDefault();
        if (hasSavedRecord && !isSaving && !isDeleting) onEdit();
        return;
      }

      // Ctrl+S -> Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isEditing && !isSaving && !isDeleting) {
          onSave();
        }
        return;
      }

      // Ctrl+P -> Print
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        if (hasSavedRecord && onPrint && !isSaving && !isDeleting) {
          e.preventDefault();
          onPrint();
        }
        return;
      }

      // Ctrl+F -> Find
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !isInput) {
        if (onFind && !isSaving && !isDeleting) {
          e.preventDefault();
          onFind();
        }
        return;
      }

      // Escape -> Cancel or Close
      if (e.key === 'Escape') {
        if (isEditing || isNew) {
          handleCancelClick();
        } else {
          handleCloseClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, isNew, isSaving, isDeleting, hasSavedRecord, hasUnsavedChanges, onFind, onPrint, onSave, onEdit]);

  // Disabled states calculations
  const canNew = !isSaving && !isDeleting;
  const canSave = isEditing && !isSaving && !isDeleting;
  const canEdit = hasSavedRecord && !isEditing && !isSaving && !isDeleting && !isArchived;
  const canDelete = hasSavedRecord && !isSaving && !isDeleting;
  const canCancel = (isNew || isEditing) && !isSaving && !isDeleting;
  const canFind = Boolean(onFind) && !isSaving && !isDeleting;
  const canPrint = Boolean(onPrint) && hasSavedRecord && !isSaving && !isDeleting;
  const canClose = !isSaving && !isDeleting;

  const canNavFirst = canNavigate && totalRecords > 0 && currentIndex > 0 && !isSaving && !isDeleting;
  const canNavPrev = canNavigate && totalRecords > 0 && currentIndex > 0 && !isSaving && !isDeleting;
  const canNavNext = canNavigate && totalRecords > 0 && currentIndex < totalRecords - 1 && !isSaving && !isDeleting;
  const canNavLast = canNavigate && totalRecords > 0 && currentIndex < totalRecords - 1 && !isSaving && !isDeleting;

  const handleNewClick = () => {
    if (!canNew) return;
    if (hasUnsavedChanges) {
      setPendingAction('new');
      setShowDiscardModal(true);
    } else {
      onNew();
    }
  };

  const handleCancelClick = () => {
    if (!canCancel) return;
    if (hasUnsavedChanges) {
      setPendingAction('cancel');
      setShowDiscardModal(true);
    } else {
      onCancel();
    }
  };

  const handleCloseClick = () => {
    if (!canClose) return;
    if (hasUnsavedChanges) {
      setPendingAction('close');
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardModal(false);
    if (pendingAction === 'new') onNew();
    else if (pendingAction === 'cancel') onCancel();
    else if (pendingAction === 'close') onClose();
    setPendingAction(null);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    await onDelete();
  };

  return (
    <>
      <div 
        className="erp-record-toolbar bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#e2e8f0] border-b border-[#cbd5e1] px-2 py-1 flex items-center justify-between shrink-0 select-none shadow-2xs z-20"
        role="toolbar"
        aria-label={`${recordLabel} Management Toolbar`}
      >
        {/* Left Action Buttons Container */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 overflow-x-auto py-0.5 scrollbar-none">
          {/* 1. NEW */}
          <button
            type="button"
            onClick={handleNewClick}
            disabled={!canNew}
            className={`px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center rounded-sm cursor-pointer border transition-all min-w-[42px] ${
              isNew
                ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs ring-1 ring-amber-400 font-bold'
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

          {/* 2. SAVE */}
          <button
            type="button"
            onClick={() => onSave()}
            disabled={!canSave}
            className={`px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center rounded-sm cursor-pointer border transition-all min-w-[42px] ${
              canSave
                ? 'text-blue-900 bg-blue-50/90 hover:bg-blue-100 border-blue-300 hover:border-blue-400 shadow-2xs'
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

          {/* 3. EDIT */}
          <button
            type="button"
            onClick={onEdit}
            disabled={!canEdit}
            className={`px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center rounded-sm cursor-pointer border transition-all min-w-[42px] ${
              isEditing && hasSavedRecord
                ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-2xs ring-1 ring-blue-400'
                : 'text-slate-800 hover:bg-[#e2e8f0] border-transparent hover:border-[#cbd5e1]'
            } disabled:opacity-35 disabled:cursor-not-allowed`}
            title="Edit Record (F4)"
          >
            <Edit3 className="w-4.5 h-4.5 text-[#475569]" />
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
              {isEditing && hasSavedRecord ? 'Editing' : 'Edit'}
            </span>
          </button>

          {/* 4. DELETE */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={!canDelete}
            className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-rose-50 border border-transparent hover:border-rose-300 rounded-sm cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-w-[42px] transition-all"
            title="Delete / Archive Record"
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

          {/* 5. CANCEL */}
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={!canCancel}
            className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-sm cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-w-[42px] transition-all"
            title="Cancel Changes (Esc)"
          >
            <RotateCcw className="w-4.5 h-4.5 text-[#16a34a]" />
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
              Cancel
            </span>
          </button>

          {/* 6. FIND */}
          {onFind && (
            <button
              type="button"
              onClick={onFind}
              disabled={!canFind}
              className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-sm cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-w-[42px] transition-all"
              title="Find Record (F3 / Ctrl+F)"
            >
              <Search className="w-4.5 h-4.5 text-[#0284c7]" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
                Find
              </span>
            </button>
          )}

          {/* 7. PRINT */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              disabled={!canPrint}
              className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-sm cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-w-[42px] transition-all"
              title={hasSavedRecord ? "Print Record (Ctrl+P)" : "Save record first to print"}
            >
              <Printer className="w-4.5 h-4.5 text-[#334155]" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">
                Print
              </span>
            </button>
          )}

          {/* CUSTOM WORKFLOW ACTIONS */}
          {customActions && (
            <>
              <div className="h-6 w-px bg-[#cbd5e1] mx-1 shrink-0" />
              {customActions}
            </>
          )}

          {/* NAVIGATION BUTTONS (FIRST, PREVIOUS, NEXT, LAST) */}
          {canNavigate && (
            <>
              <div className="h-6 w-px bg-[#cbd5e1] mx-1 shrink-0" />
              <button
                type="button"
                onClick={onFirst}
                disabled={!canNavFirst}
                className="px-1.5 py-1 flex flex-col items-center justify-center text-slate-700 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-sm cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed min-w-[34px]"
                title="First Record (Alt+Home)"
              >
                <ChevronFirst className="w-4 h-4 text-slate-700" />
                <span className="text-[9px] font-medium text-slate-600">First</span>
              </button>
              <button
                type="button"
                onClick={onPrevious}
                disabled={!canNavPrev}
                className="px-1.5 py-1 flex flex-col items-center justify-center text-slate-700 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-sm cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed min-w-[34px]"
                title="Previous Record (Alt+Left)"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
                <span className="text-[9px] font-medium text-slate-600">Prev</span>
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!canNavNext}
                className="px-1.5 py-1 flex flex-col items-center justify-center text-slate-700 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-sm cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed min-w-[34px]"
                title="Next Record (Alt+Right)"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
                <span className="text-[9px] font-medium text-slate-600">Next</span>
              </button>
              <button
                type="button"
                onClick={onLast}
                disabled={!canNavLast}
                className="px-1.5 py-1 flex flex-col items-center justify-center text-slate-700 hover:bg-[#e2e8f0] border border-transparent hover:border-[#cbd5e1] rounded-sm cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed min-w-[34px]"
                title="Last Record (Alt+End)"
              >
                <ChevronLast className="w-4 h-4 text-slate-700" />
                <span className="text-[9px] font-medium text-slate-600">Last</span>
              </button>
            </>
          )}
        </div>

        {/* Right Section: Unsaved Badge + Close Button */}
        <div className="flex items-center space-x-2 shrink-0">
          {hasUnsavedChanges && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Unsaved changes
            </span>
          )}

          {/* 12. CLOSE */}
          <button
            type="button"
            onClick={handleCloseClick}
            disabled={!canClose}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-sm transition-colors cursor-pointer"
            title="Close Record Form (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL: DELETE RECORD */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-md w-full p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete {recordLabel}?
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900 font-semibold">{recordLabel} {recordNumber} {recordName ? `(${recordName})` : ''}</strong>?
                </p>

                {deleteBlockReason ? (
                  <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                    <Archive className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Reference Notice:</strong> {deleteBlockReason}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-md cursor-pointer transition-colors"
              >
                Keep {recordLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deleteBlockReason)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DISCARD UNSAVED CHANGES */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-md w-full p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Discard Unsaved Changes?
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  You have unsaved edits in this {recordLabel.toLowerCase()}. If you continue without saving, your modifications will be permanently lost.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowDiscardModal(false);
                  setPendingAction(null);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-md cursor-pointer transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs cursor-pointer transition-colors"
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
