import React, { useState } from 'react';
import { GarageSettings } from '../../types';
import { Wrench, Paintbrush, DollarSign, Plus, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { safeStorage } from '../../lib/storage';

interface PaintCodeItem {
  id: string;
  code: string;
  name: string;
  brand: string;
  finishType: 'Metallic' | 'Pearl' | 'Solid' | 'Matte';
  costPerLiter: number;
}

const INITIAL_PAINT_CODES: PaintCodeItem[] = [
  { id: 'pc-1', code: '040', name: 'Super White II', brand: 'Toyota / Lexus', finishType: 'Solid', costPerLiter: 180 },
  { id: 'pc-2', code: '218', name: 'Attitude Black Metallic', brand: 'Toyota / Lexus', finishType: 'Metallic', costPerLiter: 220 },
  { id: 'pc-3', code: '1J7', name: 'Atomic Silver / Sonic Titanium', brand: 'Lexus', finishType: 'Metallic', costPerLiter: 260 },
  { id: 'pc-4', code: 'QAB', name: 'Pearl White 3-Coat', brand: 'Nissan / Infiniti', finishType: 'Pearl', costPerLiter: 280 },
  { id: 'pc-5', code: 'KH3', name: 'Super Black', brand: 'Nissan', finishType: 'Solid', costPerLiter: 190 },
  { id: 'pc-6', code: '197', name: 'Obsidian Black', brand: 'Mercedes-Benz', finishType: 'Metallic', costPerLiter: 320 },
  { id: 'pc-7', code: '300', name: 'Alpine White III', brand: 'BMW', finishType: 'Solid', costPerLiter: 210 },
];

interface Props {
  settings: GarageSettings;
  onUpdateSettings: (newSettings: Partial<GarageSettings>) => void;
}

export const WorkshopParametersView: React.FC<Props> = ({ settings, onUpdateSettings }) => {
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || 'QAR');
  const [defaultLaborRate, setDefaultLaborRate] = useState(settings.defaultLaborRate || 150);
  const [diagnosticLaborRate, setDiagnosticLaborRate] = useState(200);
  const [acElectricalRate, setAcElectricalRate] = useState(175);
  const [paintBoothHourRate, setPaintBoothHourRate] = useState(settings.paintBoothHourRate || 180);
  const [panelPaintRate, setPanelPaintRate] = useState(350);
  const [taxRatePercent, setTaxRatePercent] = useState(settings.taxRatePercent ?? 0);

  // Paint codes registry
  const [paintCodes, setPaintCodes] = useState<PaintCodeItem[]>(() => {
    return safeStorage.loadJSON<PaintCodeItem[]>('najm_paint_codes', INITIAL_PAINT_CODES);
  });

  // Modal / form for new paint code
  const [isAddingPaintCode, setIsAddingPaintCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('Toyota / Lexus');
  const [newFinish, setNewFinish] = useState<'Metallic' | 'Pearl' | 'Solid' | 'Matte'>('Metallic');
  const [newCost, setNewCost] = useState(200);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveParameters = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      currencySymbol,
      defaultLaborRate: Number(defaultLaborRate),
      paintBoothHourRate: Number(paintBoothHourRate),
      taxRatePercent: Number(taxRatePercent),
    });
    safeStorage.saveJSON('najm_paint_codes', paintCodes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddPaintCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const newItem: PaintCodeItem = {
      id: `pc-${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      brand: newBrand.trim(),
      finishType: newFinish,
      costPerLiter: Number(newCost) || 0,
    };

    const updated = [newItem, ...paintCodes];
    setPaintCodes(updated);
    safeStorage.saveJSON('najm_paint_codes', updated);
    setNewCode('');
    setNewName('');
    setIsAddingPaintCode(false);
  };

  const handleDeletePaintCode = (id: string) => {
    const updated = paintCodes.filter(p => p.id !== id);
    setPaintCodes(updated);
    safeStorage.saveJSON('najm_paint_codes', updated);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Workshop Parameters & Master Rates</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard labor hourly rates, paint booth charges, paint code recipes, and tax compliance formulas.
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Parameters Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveParameters} className="space-y-6 text-xs">
        {/* SECTION 1: LABOR RATES MATRIX */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Labor Rates Matrix</h3>
              <p className="text-[11px] text-slate-500">Hourly billing rates applied when adding labor tasks to Job Cards</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mechanical Routine Rate ({currencySymbol}/hr)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={defaultLaborRate ?? ''}
                onChange={e => setDefaultLaborRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:border-sky-500 outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default for periodic services & suspension</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Computer Diagnostic & Scan ({currencySymbol}/hr)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={diagnosticLaborRate ?? ''}
                onChange={e => setDiagnosticLaborRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:border-sky-500 outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">OBD-II scans and electrical troubleshooting</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                AC System & Electrical Rate ({currencySymbol}/hr)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={acElectricalRate ?? ''}
                onChange={e => setAcElectricalRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:border-sky-500 outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Compressor, evaporator, gas recharge</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Paint Booth Oven Rate ({currencySymbol}/hr)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={paintBoothHourRate ?? ''}
                onChange={e => setPaintBoothHourRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:border-sky-500 outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Heated bake cycle hourly cost</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Panel Denting & Painting Base Rate ({currencySymbol}/panel)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={panelPaintRate ?? ''}
                onChange={e => setPanelPaintRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:border-sky-500 outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standard fender, door, or bumper painting base</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: PAINT CODES MASTER REGISTRY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Paintbrush className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Paint Codes Master Directory</h3>
                <p className="text-[11px] text-slate-500">OEM factory color formulations, finish types, and cost rates</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingPaintCode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold border border-indigo-200 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Paint Code</span>
            </button>
          </div>

          {/* Add paint code inline drawer */}
          {isAddingPaintCode && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="font-bold text-indigo-950 text-xs flex items-center justify-between">
                <span>New Paint Code Entry</span>
                <button
                  type="button"
                  onClick={() => setIsAddingPaintCode(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Color Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 070"
                    value={newCode ?? ''}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Color Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. White Crystal Pearl"
                    value={newName ?? ''}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle OEM Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Lexus / Toyota"
                    value={newBrand ?? ''}
                    onChange={e => setNewBrand(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Finish Type</label>
                  <select
                    value={newFinish ?? ''}
                    onChange={e => setNewFinish(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Metallic">Metallic</option>
                    <option value="Pearl">Pearl (3-Coat)</option>
                    <option value="Solid">Solid</option>
                    <option value="Matte">Matte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Cost ({currencySymbol}/L)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCost ?? ''}
                    onChange={e => setNewCost(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingPaintCode(false)}
                  className="px-3 py-1 text-slate-600 hover:bg-slate-200/60 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPaintCode}
                  className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Code
                </button>
              </div>
            </div>
          )}

          {/* Paint codes list */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                <tr>
                  <th className="py-2 px-3">OEM Code</th>
                  <th className="py-2 px-3">Color Formulation Name</th>
                  <th className="py-2 px-3">Manufacturer Fitment</th>
                  <th className="py-2 px-3">Finish Type</th>
                  <th className="py-2 px-3 text-right">Cost ({currencySymbol}/L)</th>
                  <th className="py-2 px-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paintCodes.map(pc => (
                  <tr key={pc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                      <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {pc.code}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{pc.name}</td>
                    <td className="py-2 px-3 text-slate-600">{pc.brand}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        pc.finishType === 'Pearl' ? 'bg-amber-100 text-amber-800' :
                        pc.finishType === 'Metallic' ? 'bg-blue-100 text-blue-800' :
                        pc.finishType === 'Matte' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {pc.finishType}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {pc.costPerLiter.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeletePaintCode(pc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete code"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: CURRENCY & BILLING PARAMETERS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Currency &amp; Billing Parameters</h3>
              <p className="text-[11px] text-slate-500">Workshop billing currency standards and financial display formatting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Currency Code *</label>
              <input
                type="text"
                value={currencySymbol ?? ''}
                onChange={e => setCurrencySymbol(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:border-emerald-500 outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: QAR (Qatar Riyal)</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Billing Policy</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold">
                Direct Net Pricing (No VAT / Tax Applied)
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Net labor and replacement parts pricing</span>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Save Workshop Parameters
          </button>
        </div>
      </form>
    </div>
  );
};
