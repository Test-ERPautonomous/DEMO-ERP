import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Hash, User, Car, Phone, Calendar, ArrowRight, Loader2, Filter, AlertCircle } from 'lucide-react';
import { RecordStatusBadge } from './RecordStatusBadge';

export interface SearchRecordItem {
  id: string;
  documentNumber: string;
  title: string;
  subtitle?: string;
  phone?: string;
  plateNumber?: string;
  category?: string;
  status?: string;
  date?: string;
  balance?: number;
  total?: number;
  meta?: Record<string, any>;
  rawItem?: any;
}

export interface RecordSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SearchRecordItem) => void;
  title?: string;
  placeholder?: string;
  records: SearchRecordItem[];
  isLoading?: boolean;
}

export const RecordSearchDialog: React.FC<RecordSearchDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Find Record',
  placeholder = 'Search by number, name, phone, plate, VIN...',
  records,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredRecords = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return records.slice(0, 50);

    return records.filter(item => {
      const matchDoc = (item.documentNumber || '').toLowerCase().includes(q);
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchSub = (item.subtitle || '').toLowerCase().includes(q);
      const matchPhone = (item.phone || '').toLowerCase().includes(q);
      const matchPlate = (item.plateNumber || '').toLowerCase().includes(q);
      const matchCat = (item.category || '').toLowerCase().includes(q);
      return matchDoc || matchTitle || matchSub || matchPhone || matchPlate || matchCat;
    }).slice(0, 50);
  }, [records, searchTerm]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredRecords.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredRecords[selectedIndex]) {
        onSelect(filteredRecords[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[80vh]">
        {/* Header with Search Input */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              <span>{title}</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Press <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded-sm text-[10px]">Enter</kbd> to select, <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded-md text-[10px]">Esc</kbd> to close
            </span>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm ?? ''}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-2" />
              <p className="text-xs font-semibold">Searching database records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-sm font-bold text-slate-700">No matching records found</p>
              <p className="text-xs text-slate-500 mt-1">Try querying with a different name, plate, phone number or document sequence.</p>
            </div>
          ) : (
            filteredRecords.map((item, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/90 border border-blue-300 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-800 shrink-0">
                      {item.documentNumber}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">{item.title}</span>
                        {item.status && <RecordStatusBadge status={item.status} size="sm" />}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                        {item.subtitle && <span>{item.subtitle}</span>}
                        {item.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.phone}
                          </span>
                        )}
                        {item.plateNumber && (
                          <span className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            <Car className="w-3 h-3 text-slate-400" />
                            {item.plateNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.total !== undefined && (
                      <div className="text-right font-mono text-xs">
                        <div className="text-slate-400 text-[10px]">Total</div>
                        <div className="font-bold text-slate-900">QAR {item.total.toLocaleString()}</div>
                      </div>
                    )}
                    {item.balance !== undefined && item.balance > 0 && (
                      <div className="text-right font-mono text-xs">
                        <div className="text-rose-500 text-[10px]">Balance</div>
                        <div className="font-bold text-rose-700">QAR {item.balance.toLocaleString()}</div>
                      </div>
                    )}
                    <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-blue-600 translate-x-0.5' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Found {filteredRecords.length} record(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
