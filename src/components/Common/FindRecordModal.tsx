import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar, User, Car, Hash, ArrowRight } from 'lucide-react';

export interface FindResultItem {
  id: string;
  code: string; // e.g. "JC-2026-0001", "INV-2026-0001"
  date?: string;
  customerName?: string;
  customerPhone?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vin?: string;
  status?: string;
  amount?: number;
  currency?: string;
  rawRecord: any;
}

export interface FindRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (record: any) => void;
  title: string;
  placeholder?: string;
  items: FindResultItem[];
}

export const FindRecordModal: React.FC<FindRecordModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title,
  placeholder = 'Search by Doc No, customer name, phone, plate, VIN...',
  items,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;

    // Normalizing phone and plates
    const cleanQ = q.replace(/[^a-z0-9]/gi, '');

    return items.filter(item => {
      const codeMatch = item.code.toLowerCase().includes(q);
      const custMatch = (item.customerName || '').toLowerCase().includes(q);
      const phoneMatch = cleanQ && (item.customerPhone || '').replace(/[^a-z0-9]/gi, '').includes(cleanQ);
      const plateMatch = (item.vehiclePlate || '').toLowerCase().includes(q);
      const modelMatch = (item.vehicleModel || '').toLowerCase().includes(q);
      const vinMatch = (item.vin || '').toLowerCase().includes(q);
      const statusMatch = (item.status || '').toLowerCase().includes(q);

      return codeMatch || custMatch || phoneMatch || plateMatch || modelMatch || vinMatch || statusMatch;
    });
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onSelect(filteredItems[selectedIndex].rawRecord);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs font-sans text-slate-800">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-100 to-slate-200 border-b border-slate-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-300/50 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={query ?? ''}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 px-1">
            <span>
              Showing {filteredItems.length} of {items.length} records
            </span>
            <span>Use ↑ ↓ to navigate, Enter to select, Esc to close</span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
              <Search className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No matching records found</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Try searching with a different keyword or identifier.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item.rawRecord);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded flex items-center justify-between cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50/80 border border-blue-200 shadow-xs' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {item.code}
                      </span>
                      {item.status && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          item.status === 'Paid' || item.status === 'Completed' || item.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'Draft'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.status}
                        </span>
                      )}
                      {item.date && (
                        <span className="flex items-center text-[10px] text-slate-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {item.date}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
                      {item.customerName && (
                        <span className="flex items-center font-medium">
                          <User className="w-3 h-3 text-slate-400 mr-1" />
                          {item.customerName}
                          {item.customerPhone && (
                            <span className="text-[10px] text-slate-500 ml-1">({item.customerPhone})</span>
                          )}
                        </span>
                      )}

                      {(item.vehiclePlate || item.vehicleModel) && (
                        <span className="flex items-center text-slate-600">
                          <Car className="w-3 h-3 text-slate-400 mr-1" />
                          {item.vehiclePlate} {item.vehicleModel ? `• ${item.vehicleModel}` : ''}
                        </span>
                      )}

                      {item.vin && (
                        <span className="flex items-center text-[10px] text-slate-500">
                          <Hash className="w-2.5 h-2.5 mr-0.5" />
                          VIN: {item.vin}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center space-x-2">
                    {item.amount !== undefined && (
                      <div className="font-mono font-bold text-xs text-slate-900">
                        {item.amount.toFixed(2)} {item.currency || 'QAR'}
                      </div>
                    )}
                    <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-blue-600 translate-x-0.5' : 'text-slate-300'} transition-transform`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
