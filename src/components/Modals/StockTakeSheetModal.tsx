import React, { useState } from 'react';
import { InventoryItem, GarageSettings } from '../../types';
import { ClipboardCheck, X, Printer, Download, Search } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  settings: GarageSettings;
}

export const StockTakeSheetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  inventory,
  settings,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  const categories = Array.from(new Set((inventory || []).map(i => i.category || 'General')));

  const filteredItems = (inventory || []).filter(item => {
    if (!item) return false;
    const matchesCat = filterCategory === 'ALL' || item.category === filterCategory;
    const term = (searchTerm || '').trim().toLowerCase();
    const nameStr = (item.name || '').toLowerCase();
    const skuStr = (item.sku || '').toLowerCase();
    const rackStr = (item.rackLocation || '').toLowerCase();

    const matchesSearch = !term ||
      nameStr.includes(term) ||
      skuStr.includes(term) ||
      rackStr.includes(term);

    return matchesCat && matchesSearch;
  });

  const exportCSV = () => {
    const headers = `Item Code,Part Number,Description,Category,Bin/Rack Location,System Stock,Physical Count,Variance,Unit,Cost (${settings?.currencySymbol || 'QAR'})\n`;
    const rows = filteredItems.map(i => 
      `"${i.id || ''}","${i.sku || ''}","${(i.name || '').replace(/"/g, '""')}","${i.category || ''}","${i.rackLocation || 'N/A'}","${i.quantityOnHand ?? 0}","","","${i.unit || 'pcs'}","${i.unitCost ?? 0}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Take_Sheet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col text-slate-800 text-xs font-sans overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4e79] text-white px-4 py-2.5 flex items-center justify-between font-bold shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">Physical Stock Take Sheet (Auditing &amp; Cycle Count Verification)</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
              <input
                type="text"
                placeholder="Search part # or description..."
                value={searchTerm ?? ''}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-7 pr-2 py-1 text-xs border border-slate-300 rounded w-48 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={filterCategory ?? ''}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
            >
              <option value="ALL">All Categories ({inventory.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export Sheet (CSV)
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1.5 cursor-pointer font-semibold shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print Audit Sheet
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#e9edf2] text-slate-700 border-b border-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300">#</th>
                  <th className="py-2 px-3 border-r border-slate-300">Part Number</th>
                  <th className="py-2 px-3 border-r border-slate-300">Description</th>
                  <th className="py-2 px-3 border-r border-slate-300">Category</th>
                  <th className="py-2 px-3 border-r border-slate-300">Bin / Rack</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-right">System Stock</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-28 text-center bg-amber-50 text-amber-900">Physical Count</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-20 text-center">Variance</th>
                  <th className="py-2 px-3">Auditor Sign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-400">{index + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-bold text-blue-900">{item.sku}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">{item.name}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-600">{item.category}</td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-700">{item.rackLocation || 'BIN-A1'}</td>
                    <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-slate-900">{item.quantityOnHand} {item.unit}</td>
                    <td className="py-2 px-3 border-r border-slate-200 bg-amber-50/50 text-center">
                      <div className="border-b border-dashed border-slate-400 h-5 w-full"></div>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-400">[ &plusmn; ]</td>
                    <td className="py-2 px-3 text-center">
                      <div className="border-b border-slate-300 h-5 w-20 mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-[11px] text-slate-600 font-sans">
            <div>
              <span>Total Cataloged Items: <strong>{filteredItems.length}</strong></span>
              <span className="mx-2">•</span>
              <span>Stock Location: <strong>Main Warehouse &amp; Scrap Yard (Street 24)</strong></span>
            </div>
            <div>
              <span>Supervised by: <strong>Storekeeper / Supervisor MAMMAR (ID: 2743)</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-xs cursor-pointer"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
