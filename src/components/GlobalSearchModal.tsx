import React, { useState, useEffect } from 'react';
import { Search, X, Wrench, Car, User, Package, ArrowRight } from 'lucide-react';
import { api } from '../api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (type: string, id: string) => void;
}

export const GlobalSearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults(null);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query);
        setResults(data);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type vehicle plate, job #, customer phone, or part SKU..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-hidden text-base"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-800 rounded-md text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="px-2.5 py-1 text-xs bg-slate-800 text-slate-300 rounded border border-slate-700 hover:bg-slate-700">
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {loading && <div className="text-center py-8 text-sm text-slate-400">Searching database...</div>}

          {!loading && !results && query.length < 2 && (
            <div className="text-center py-8 text-sm text-slate-500">
              Enter at least 2 characters to search across all workshop records.
            </div>
          )}

          {!loading && results && (
            <div className="space-y-4">
              {/* Job Cards */}
              {results.jobCards?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-blue-400" />
                    Job Cards ({results.jobCards.length})
                  </div>
                  <div className="space-y-1">
                    {results.jobCards.map((j: any) => (
                      <div
                        key={j.id}
                        onClick={() => { onSelectResult('job', j.id); onClose(); }}
                        className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-sm text-white flex items-center gap-2">
                            <span>{j.job_number}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                              {j.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {j.customer_name} • {j.vehicle_plate} ({j.vehicle_make} {j.vehicle_model})
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles */}
              {results.vehicles?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Car className="w-3.5 h-3.5 text-emerald-400" />
                    Vehicles ({results.vehicles.length})
                  </div>
                  <div className="space-y-1">
                    {results.vehicles.map((v: any) => (
                      <div
                        key={v.id}
                        onClick={() => { onSelectResult('vehicle', v.id); onClose(); }}
                        className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-sm text-white">{v.plate_number}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{v.make} {v.model} ({v.year}) - VIN: {v.vin || 'N/A'}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {results.customers?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    Customers ({results.customers.length})
                  </div>
                  <div className="space-y-1">
                    {results.customers.map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() => { onSelectResult('customer', c.id); onClose(); }}
                        className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-sm text-white">{c.name} {c.name_ar ? `(${c.name_ar})` : ''}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{c.phone} • {c.email || 'No email'}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory */}
              {results.inventory?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    Parts Inventory ({results.inventory.length})
                  </div>
                  <div className="space-y-1">
                    {results.inventory.map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => { onSelectResult('part', p.id); onClose(); }}
                        className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-sm text-white flex items-center gap-2">
                            <span>{p.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-mono">
                              {p.sku}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Stock: {p.quantity_on_hand} {p.unit_of_measure || 'PCS'} • Price: QAR {p.retail_price}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
