import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, WifiOff, ShieldAlert, Archive, Loader2, FileSpreadsheet } from 'lucide-react';
import { RecordToolbar, RecordToolbarProps } from './RecordToolbar';
import { RecordHeader, RecordHeaderProps } from './RecordHeader';
import { RecordTabs, TabItem } from './RecordTabs';
import { RecordSearchDialog, SearchRecordItem } from './RecordSearchDialog';
import { RecordDeleteDialog } from './RecordDeleteDialog';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';

export interface RecordManagementShellProps {
  // Module identification
  moduleTitle?: string;
  title?: string;
  moduleSubtitle?: string;
  subtitle?: string;
  moduleIcon?: LucideIcon | React.ComponentType<{ className?: string }> | any;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | any;
  recordLabel?: string; // e.g. "Job Card", "Customer", "Vehicle", "Supplier"
  documentNumber: string;
  documentDate?: string;
  status: string;
  statusType?: 'job_card' | 'customer' | 'vehicle' | 'supplier' | 'invoice' | 'estimate' | 'po' | 'general';
  statusVariant?: string;
  badgeIcon?: any;
  companyName?: string;
  headerBadges?: Array<{
    label: string;
    value: string | number;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple' | 'mono';
  }>;
  metaDetails?: Array<{
    label: string;
    value: string | number;
    highlight?: boolean;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple' | 'mono';
  }>;
  isOpen?: boolean;

  // Record States
  isNew: boolean;
  isEditing: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  isLoading?: boolean;
  hasSavedRecord: boolean;
  hasUnsavedChanges?: boolean;
  isArchived?: boolean;
  isOffline?: boolean;
  permissionDenied?: boolean;
  validationError?: string | null;
  apiError?: string | null;
  successMessage?: string | null;

  // Tabs
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;

  // Toolbar Actions
  onNew: () => void;
  onSave: () => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onCancel: () => void;
  onFind?: () => void;
  onPrint?: () => void;
  onClose: () => void;
  customActions?: React.ReactNode;

  // Search & Find records
  searchRecords?: SearchRecordItem[];
  onSelectSearchRecord?: ((record: SearchRecordItem) => void) | ((recordId: string) => void) | ((record: any, item?: any) => void);
  searchTitle?: string;
  searchPlaceholder?: string;

  // Navigation
  canNavigate?: boolean;
  currentIndex?: number;
  totalRecords?: number;
  onFirst?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onLast?: () => void;

  // Deletion guard & Archive
  deleteBlockReason?: string | null;
  onArchive?: () => void | Promise<void>;

  // Children Form Viewport
  children: React.ReactNode;
  
  // Custom print layout slot
  printLayout?: React.ReactNode;

  // Optional styling
  className?: string;
}

export const RecordManagementShell: React.FC<RecordManagementShellProps> = ({
  moduleTitle,
  title,
  moduleSubtitle,
  subtitle,
  moduleIcon,
  icon,
  recordLabel = 'Record',
  documentNumber,
  documentDate,
  status,
  statusType = 'general',
  companyName = 'Najm Al Huda Workshop',
  headerBadges = [],
  metaDetails = [],
  isOpen,
  isNew,
  isEditing,
  isSaving = false,
  isDeleting = false,
  isLoading = false,
  hasSavedRecord,
  hasUnsavedChanges = false,
  isArchived = false,
  isOffline = false,
  permissionDenied = false,
  validationError = null,
  apiError = null,
  successMessage = null,
  tabs,
  activeTab,
  onTabChange,
  onNew,
  onSave,
  onEdit,
  onDelete,
  onCancel,
  onFind,
  onPrint,
  onClose,
  customActions,
  searchRecords = [],
  onSelectSearchRecord,
  searchTitle,
  searchPlaceholder,
  canNavigate = false,
  currentIndex = -1,
  totalRecords = 0,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  deleteBlockReason = null,
  onArchive,
  children,
  printLayout,
  className = ''
}) => {
  const [internalShowSearch, setInternalShowSearch] = useState(false);

  if (isOpen === false) return null;

  const resolvedTitle = moduleTitle || title || recordLabel;
  const resolvedSubtitle = moduleSubtitle || subtitle;
  const resolvedIcon = moduleIcon || icon || FileSpreadsheet;
  const resolvedBadges = (headerBadges && headerBadges.length > 0)
    ? headerBadges
    : (metaDetails || []).map(m => ({
        label: m.label,
        value: m.value,
        variant: m.highlight ? ('warning' as const) : (m.variant || 'default')
      }));

  const handleOpenFind = () => {
    if (onFind) {
      onFind();
    } else if (searchRecords.length > 0) {
      setInternalShowSearch(true);
    }
  };

  const shellContent = (
    <div className={`erp-record-shell flex flex-col h-full bg-slate-100 font-sans ${className}`}>
      {/* 1. TOP STANDARDIZED TOOLBAR */}
      <RecordToolbar
        isNew={isNew}
        isEditing={isEditing}
        isSaving={isSaving}
        isDeleting={isDeleting}
        hasSavedRecord={hasSavedRecord}
        hasUnsavedChanges={hasUnsavedChanges}
        isArchived={isArchived}
        onNew={onNew}
        onSave={onSave}
        onEdit={onEdit}
        onDelete={onDelete}
        onCancel={onCancel}
        onFind={handleOpenFind}
        onPrint={onPrint}
        onClose={onClose}
        canNavigate={canNavigate}
        currentIndex={currentIndex}
        totalRecords={totalRecords}
        onFirst={onFirst}
        onPrevious={onPrevious}
        onNext={onNext}
        onLast={onLast}
        recordLabel={recordLabel}
        recordNumber={documentNumber}
        deleteBlockReason={deleteBlockReason}
        customActions={customActions}
      />

      {/* 2. RECORD HEADER */}
      <RecordHeader
        title={resolvedTitle}
        subtitle={resolvedSubtitle}
        icon={resolvedIcon}
        documentNumber={documentNumber}
        documentDate={documentDate}
        status={status}
        statusType={statusType}
        companyName={companyName}
        badges={resolvedBadges}
        isNew={isNew}
        isEditing={isEditing}
      />

      {/* 3. TABS NAVIGATION */}
      <RecordTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={onTabChange}
      />

      {/* 4. SYSTEM STATUS / ERROR / VALIDATION BANNERS */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center gap-2 border-b border-amber-600">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Offline / Database connection unavailable. Read-only mode is active until server reconnects.</span>
        </div>
      )}

      {isArchived && (
        <div className="bg-zinc-800 text-zinc-200 px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b border-zinc-900">
          <Archive className="w-4 h-4 text-amber-400 shrink-0" />
          <span>This {recordLabel.toLowerCase()} is archived. Modifications are restricted to preserve historical records.</span>
        </div>
      )}

      {permissionDenied && (
        <div className="bg-rose-100 text-rose-900 px-4 py-2 text-xs font-bold flex items-center gap-2 border-b border-rose-300">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Permission Denied: Your account role does not have authorization to modify this record.</span>
        </div>
      )}

      {validationError && (
        <div className="bg-rose-50 text-rose-800 px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b border-rose-200 shadow-inner animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Validation Error: {validationError}</span>
        </div>
      )}

      {apiError && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b border-rose-700 shadow-md animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
          <span>Server Error: {apiError}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 text-emerald-800 px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b border-emerald-200 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 5. MAIN CONTENT FORM VIEWPORT */}
      <div className="flex-1 overflow-y-auto bg-slate-100 relative">
        {isLoading ? (
          <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-8">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-800">Loading {recordLabel} record...</p>
            <p className="text-xs text-slate-500 mt-1">Retrieving synchronized data from server</p>
          </div>
        ) : null}

        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </div>

      {/* 6. BOTTOM STATUS FOOTER */}
      <div className="bg-slate-200/90 border-t border-slate-300 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-600 select-none">
        <div className="flex items-center space-x-3">
          <span className="font-medium">
            Status: <strong className="text-slate-800 font-bold">{status}</strong>
          </span>
          <span className="text-slate-400">|</span>
          <span>
            Document: <strong className="font-mono text-slate-800 font-bold">{documentNumber || 'UNSAVED'}</strong>
          </span>
          {isEditing && (
            <>
              <span className="text-slate-400">|</span>
              <span className="text-blue-700 font-semibold">Editing Mode Active</span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {canNavigate && totalRecords > 0 && (
            <span className="font-mono">
              Record {currentIndex + 1} of {totalRecords}
            </span>
          )}
          <span className="text-slate-400">|</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Server Synchronized
          </span>
        </div>
      </div>

      {/* 7. SEARCH DIALOG POPUP */}
      {internalShowSearch && (
        <RecordSearchDialog
          isOpen={internalShowSearch}
          onClose={() => setInternalShowSearch(false)}
          onSelect={item => {
            if (onSelectSearchRecord) {
              (onSelectSearchRecord as any)(item);
            }
          }}
          title={searchTitle || `Find ${recordLabel}`}
          placeholder={searchPlaceholder || `Search ${recordLabel.toLowerCase()}s by number, name, phone...`}
          records={searchRecords}
        />
      )}
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {shellContent}
        </div>
      </div>
    );
  }

  return shellContent;
};

export default RecordManagementShell;
