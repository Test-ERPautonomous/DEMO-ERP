import React from 'react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DataStateView } from './DataStateView';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
  width?: string;
}

export interface DataTableError {
  type?: 'auth' | 'forbidden' | 'server' | 'network' | string;
  message?: string;
  status?: number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  error?: DataTableError | string | null;
  onRetry?: () => void;
  searchPlaceholder?: string;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  isLoading,
  error,
  onRetry,
  searchPlaceholder = 'Search...',
  searchTerm,
  onSearchChange,
  filters,
  actions,
  pagination,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters bar */}
      {(onSearchChange || filters || actions) && (
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {onSearchChange && (
              <div className="flex items-center gap-1.5 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm ?? ''}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-9 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all outline-hidden"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    const parent = (e.currentTarget as HTMLElement).parentElement;
                    const input = parent?.querySelector('input') as HTMLInputElement | null;
                    if (input) input.focus();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </div>
            )}
            
            {filters && (
              <div className="flex items-center gap-2">
                {filters}
              </div>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Table section */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider ${col.headerClassName || ''}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error ? (
              <tr>
                <td colSpan={columns.length} className="p-4">
                  <DataStateView
                    type={
                      typeof error === 'object' && error?.type === 'auth' ? 'auth' :
                      typeof error === 'object' && error?.type === 'forbidden' ? 'forbidden' :
                      'error'
                    }
                    title={typeof error === 'object' ? (error.type === 'auth' ? 'Authentication Required' : error.type === 'forbidden' ? 'Access Denied' : 'Database / Connection Error') : 'Unable to Load Records'}
                    message={typeof error === 'object' ? error.message : String(error)}
                    onRetry={onRetry}
                    actionLabel="Retry Loading Records"
                  />
                </td>
              </tr>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-slate-100 rounded-lg w-full"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-4">
                  <DataStateView
                    type="empty"
                    title={emptyMessage}
                    message="No records match your query or filters. You can create a new entry or adjust your search."
                  />
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={`group transition-colors ${onRowClick ? 'cursor-pointer hover:bg-sky-50/50' : ''}`}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-4 py-3 text-xs text-slate-700 ${col.className || ''}`}>
                      {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {pagination && (
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
