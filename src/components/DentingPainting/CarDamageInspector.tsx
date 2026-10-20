import React, { useState } from 'react';
import { 
  CarPanelKey, 
  DentingPaintingItem, 
  DamageType, 
  RepairAction 
} from '../../types';
import { 
  Paintbrush, 
  Wrench, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  Info,
  CheckCircle2
} from 'lucide-react';

interface Props {
  panels: DentingPaintingItem[];
  onChange: (panels: DentingPaintingItem[]) => void;
  paintBoothHourRate?: number;
  readOnly?: boolean;
}

const CAR_PANELS: { key: CarPanelKey; name: string; defaultDentingCost: number; defaultPaintCost: number }[] = [
  { key: 'front_bumper', name: 'Front Bumper', defaultDentingCost: 90, defaultPaintCost: 200 },
  { key: 'hood', name: 'Hood / Bonnet', defaultDentingCost: 150, defaultPaintCost: 250 },
  { key: 'roof', name: 'Roof', defaultDentingCost: 180, defaultPaintCost: 280 },
  { key: 'trunk', name: 'Trunk / Tailgate', defaultDentingCost: 140, defaultPaintCost: 220 },
  { key: 'rear_bumper', name: 'Rear Bumper', defaultDentingCost: 90, defaultPaintCost: 200 },
  { key: 'left_fender', name: 'Left Front Fender', defaultDentingCost: 110, defaultPaintCost: 180 },
  { key: 'right_fender', name: 'Right Front Fender', defaultDentingCost: 110, defaultPaintCost: 180 },
  { key: 'left_front_door', name: 'Left Front Door', defaultDentingCost: 130, defaultPaintCost: 190 },
  { key: 'right_front_door', name: 'Right Front Door', defaultDentingCost: 130, defaultPaintCost: 190 },
  { key: 'left_rear_door', name: 'Left Rear Door', defaultDentingCost: 130, defaultPaintCost: 190 },
  { key: 'right_rear_door', name: 'Right Rear Door', defaultDentingCost: 130, defaultPaintCost: 190 },
  { key: 'left_quarter_panel', name: 'Left Quarter Panel', defaultDentingCost: 160, defaultPaintCost: 240 },
  { key: 'right_quarter_panel', name: 'Right Quarter Panel', defaultDentingCost: 160, defaultPaintCost: 240 },
  { key: 'left_rocker', name: 'Left Rocker / Running Board', defaultDentingCost: 100, defaultPaintCost: 150 },
  { key: 'right_rocker', name: 'Right Rocker / Running Board', defaultDentingCost: 100, defaultPaintCost: 150 },
];

const DAMAGE_TYPES: DamageType[] = [
  'Minor Dent',
  'Heavy Dent',
  'Deep Scratch',
  'Paint Fade/Chipped',
  'Rust Spot',
  'Cracked/Torn',
];

const REPAIR_ACTIONS: RepairAction[] = [
  'Dent Removal (PDR)',
  'Pull & Fill',
  'Full Panel Repaint',
  'Spot Blend',
  'Replace Panel',
];

export const CarDamageInspector: React.FC<Props> = ({
  panels,
  onChange,
  readOnly = false,
}) => {
  const [selectedPanelKey, setSelectedPanelKey] = useState<CarPanelKey>('hood');

  const selectedPanelConfig = CAR_PANELS.find(p => p.key === selectedPanelKey)!;
  const existingItem = panels.find(p => p.panelKey === selectedPanelKey);

  // Form state for selected panel
  const [damageType, setDamageType] = useState<DamageType>('Minor Dent');
  const [action, setAction] = useState<RepairAction>('Pull & Fill');
  const [paintCode, setPaintCode] = useState<string>('');
  const [coatType, setCoatType] = useState<'Solid' | 'Metallic' | 'Pearl 3-Stage' | 'Matte'>('Metallic');
  const [dentingCost, setDentingCost] = useState<number>(120);
  const [paintingCost, setPaintingCost] = useState<number>(220);
  const [notes, setNotes] = useState<string>('');

  // Sync editor when selected panel changes
  const handleSelectPanel = (key: CarPanelKey) => {
    setSelectedPanelKey(key);
    const item = panels.find(p => p.panelKey === key);
    const cfg = CAR_PANELS.find(p => p.key === key);
    if (item) {
      setDamageType(item.damageType);
      setAction(item.action);
      setPaintCode(item.paintCode || '');
      setCoatType(item.coatType || 'Metallic');
      setDentingCost(item.dentingCost);
      setPaintingCost(item.paintingCost);
      setNotes(item.notes || '');
    } else if (cfg) {
      setDamageType('Minor Dent');
      setAction('Pull & Fill');
      setDentingCost(cfg.defaultDentingCost);
      setPaintingCost(cfg.defaultPaintCost);
      setNotes('');
    }
  };

  const handleSavePanelDamage = () => {
    if (readOnly) return;
    const cfg = CAR_PANELS.find(p => p.key === selectedPanelKey)!;
    const newItem: DentingPaintingItem = {
      id: existingItem ? existingItem.id : `dp-${Date.now()}`,
      panelKey: selectedPanelKey,
      panelName: cfg.name,
      damageType,
      action,
      paintCode: paintCode.trim() || undefined,
      coatType,
      dentingCost: Number(dentingCost) || 0,
      paintingCost: Number(paintingCost) || 0,
      notes: notes.trim() || undefined,
    };

    if (existingItem) {
      onChange(panels.map(p => (p.panelKey === selectedPanelKey ? newItem : p)));
    } else {
      onChange([...panels, newItem]);
    }
  };

  const handleRemovePanelDamage = (panelKey: CarPanelKey) => {
    if (readOnly) return;
    onChange(panels.filter(p => p.panelKey !== panelKey));
  };

  const totalDenting = panels.reduce((sum, p) => sum + (p.dentingCost || 0), 0);
  const totalPainting = panels.reduce((sum, p) => sum + (p.paintingCost || 0), 0);

  // SVG panel fill colors based on damage state
  const getPanelColor = (key: CarPanelKey) => {
    const item = panels.find(p => p.panelKey === key);
    const isSelected = key === selectedPanelKey;

    if (item) {
      if (item.action === 'Replace Panel') return isSelected ? '#ef4444' : '#f87171'; // red
      if (item.action === 'Full Panel Repaint') return isSelected ? '#8b5cf6' : '#a78bfa'; // purple
      if (item.damageType === 'Heavy Dent') return isSelected ? '#f97316' : '#fb923c'; // orange
      return isSelected ? '#eab308' : '#facc15'; // yellow/amber
    }
    return isSelected ? '#cbd5e1' : '#f1f5f9';
  };

  const getPanelStroke = (key: CarPanelKey) => {
    return key === selectedPanelKey ? '#0f172a' : '#94a3b8';
  };

  return (
    <div id="car-damage-inspector" className="space-y-6">
      {/* Header instructions & stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-base">
            <Paintbrush className="w-5 h-5 text-indigo-600" />
            Interactive Car Body &amp; Paint Inspector
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Click on any body panel on the blueprint to log dents, scratches, paint fade, or panel replacement.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-xs">
            <span className="text-slate-500 block">Damaged Panels</span>
            <span className="font-bold text-slate-800 text-sm">{panels.length}</span>
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-xs">
            <span className="text-slate-500 block">Est. Denting</span>
            <span className="font-bold text-amber-600 text-sm">QAR {(Number(totalDenting) || 0).toFixed(2)}</span>
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-xs">
            <span className="text-slate-500 block">Est. Painting</span>
            <span className="font-bold text-indigo-600 text-sm">QAR {(Number(totalPainting) || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Blueprint Canvas */}
        <div className="lg:col-span-7 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-between relative shadow-inner">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="uppercase tracking-wider font-mono text-[11px] text-slate-400">VEHICLE TOP &amp; SIDES OVERVIEW</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" /> Undamaged</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Dent/Scratch</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> Repaint</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Replace</span>
            </div>
          </div>

          {/* SVG Vehicle Blueprint */}
          <div className="w-full max-w-md my-auto py-2">
            <svg viewBox="0 0 340 520" className="w-full h-auto drop-shadow-2xl select-none cursor-pointer">
              {/* Car Body Outer Shell Outline */}
              <path
                d="M 100,50 C 100,20 240,20 240,50 L 255,140 L 265,260 L 260,400 L 245,470 C 245,490 95,490 95,470 L 80,400 L 75,260 L 85,140 Z"
                fill="#1e293b"
                stroke="#334155"
                strokeWidth="3"
              />

              {/* Front Bumper */}
              <path
                d="M 95,35 C 120,20 220,20 245,35 L 250,60 C 210,50 130,50 90,60 Z"
                fill={getPanelColor('front_bumper')}
                stroke={getPanelStroke('front_bumper')}
                strokeWidth={selectedPanelKey === 'front_bumper' ? 3 : 1.5}
                onClick={() => handleSelectPanel('front_bumper')}
                className="transition-colors hover:brightness-110"
              />
              <text x="170" y="47" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">
                Front Bumper
              </text>

              {/* Hood */}
              <path
                d="M 98,70 C 130,62 210,62 242,70 L 246,145 C 200,135 140,135 94,145 Z"
                fill={getPanelColor('hood')}
                stroke={getPanelStroke('hood')}
                strokeWidth={selectedPanelKey === 'hood' ? 3 : 1.5}
                onClick={() => handleSelectPanel('hood')}
                className="transition-colors hover:brightness-110"
              />
              <text x="170" y="112" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle" pointerEvents="none">
                Hood / Bonnet
              </text>

              {/* Windshield (decorative) */}
              <path
                d="M 100,150 L 240,150 L 230,195 L 110,195 Z"
                fill="#0ea5e9"
                fillOpacity="0.4"
                stroke="#38bdf8"
                strokeWidth="1.5"
                pointerEvents="none"
              />

              {/* Left Front Fender */}
              <path
                d="M 75,60 L 93,65 L 94,145 L 80,145 Z"
                fill={getPanelColor('left_fender')}
                stroke={getPanelStroke('left_fender')}
                strokeWidth={selectedPanelKey === 'left_fender' ? 3 : 1.5}
                onClick={() => handleSelectPanel('left_fender')}
                className="transition-colors hover:brightness-110"
              />
              <text x="60" y="105" fill="#e2e8f0" fontSize="9" fontWeight="600" textAnchor="end" pointerEvents="none">
                L Fender
              </text>

              {/* Right Front Fender */}
              <path
                d="M 247,65 L 265,60 L 260,145 L 246,145 Z"
                fill={getPanelColor('right_fender')}
                stroke={getPanelStroke('right_fender')}
                strokeWidth={selectedPanelKey === 'right_fender' ? 3 : 1.5}
                onClick={() => handleSelectPanel('right_fender')}
                className="transition-colors hover:brightness-110"
              />
              <text x="280" y="105" fill="#e2e8f0" fontSize="9" fontWeight="600" textAnchor="start" pointerEvents="none">
                R Fender
              </text>

              {/* Left Front Door */}
              <path
                d="M 75,152 L 105,152 L 108,245 L 73,245 Z"
                fill={getPanelColor('left_front_door')}
                stroke={getPanelStroke('left_front_door')}
                strokeWidth={selectedPanelKey === 'left_front_door' ? 3 : 1.5}
                onClick={() => handleSelectPanel('left_front_door')}
                className="transition-colors hover:brightness-110"
              />
              <text x="58" y="200" fill="#e2e8f0" fontSize="9" fontWeight="600" textAnchor="end" pointerEvents="none">
                L Fr Door
              </text>

              {/* Right Front Door */}
              <path
                d="M 235,152 L 265,152 L 267,245 L 232,245 Z"
                fill={getPanelColor('right_front_door')}
                stroke={getPanelStroke('right_front_door')}
                strokeWidth={selectedPanelKey === 'right_front_door' ? 3 : 1.5}
                onClick={() => handleSelectPanel('right_front_door')}
                className="transition-colors hover:brightness-110"
              />
              <text x="282" y="200" fill="#e2e8f0" fontSize="9" fontWeight="600" textAnchor="start" pointerEvents="none">
                R Fr Door
              </text>

              {/* Roof */}
              <path
                d="M 112,202 L 228,202 L 225,320 L 115,320 Z"
                fill={getPanelColor('roof')}
                stroke={getPanelStroke('roof')}
                strokeWidth={selectedPanelKey === 'roof' ? 3 : 1.5}
                onClick={() => handleSelectPanel('roof')}
                className="transition-colors hover:brightness-110"
              />
              <text x="170" y="265" fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle" pointerEvents="none">
                Roof
              </text>

              {/* Left Rear Door */}
              <path
                d="M 73,250 L 108,250 L 111,335 L 72,335 Z"
                fill={getPanelColor('left_rear_door')}
                stroke={getPanelStroke('left_rear_door')}
                strokeWidth={selectedPanelKey === 'left_rear_door' ? 3 : 1.5}
                onClick={() => handleSelectPanel('left_rear_door')}
                className="transition-colors hover:brightness-110"
              />
              <text x="58" y="295" fill="#e2e8f0" fontSize="9" fontWeight="600" textAnchor="end" pointerEvents="none">
                L Rr Door
              </text>

              {/* Right Rear Door */}
              <path
                d="M 232,250 L 267,250 L 268,335 L 229,335 Z"
                fill={getPanelColor('right_rear_door')}
                stroke={getPanelStroke('right_rear_door')}
                strokeWidth={selectedPanelKey === 'right_rear_door' ? 3 : 1.5}
                onClick={() => handleSelectPanel('right_rear_door')}
                className="transition-colors hover:brightness-110"
              />
              <text x="282" y="295" fill="#e2e8f0" fontSize="9" fontWeight="600" textAnchor="start" pointerEvents="none">
                R Rr Door
              </text>

              {/* Rear Windshield */}
              <path
                d="M 116,325 L 224,325 L 235,365 L 105,365 Z"
                fill="#0ea5e9"
                fillOpacity="0.3"
                stroke="#38bdf8"
                strokeWidth="1"
                pointerEvents="none"
              />

              {/* Left Quarter Panel */}
              <path
                d="M 72,340 L 102,340 L 96,440 L 76,420 Z"
                fill={getPanelColor('left_quarter_panel')}
                stroke={getPanelStroke('left_quarter_panel')}
                strokeWidth={selectedPanelKey === 'left_quarter_panel' ? 3 : 1.5}
                onClick={() => handleSelectPanel('left_quarter_panel')}
                className="transition-colors hover:brightness-110"
              />
              <text x="58" y="385" fill="#e2e8f0" fontSize="9" fontWeight="600" textAnchor="end" pointerEvents="none">
                L Quarter
              </text>

              {/* Right Quarter Panel */}
              <path
                d="M 238,340 L 268,340 L 264,420 L 244,440 Z"
                fill={getPanelColor('right_quarter_panel')}
                stroke={getPanelStroke('right_quarter_panel')}
                strokeWidth={selectedPanelKey === 'right_quarter_panel' ? 3 : 1.5}
                onClick={() => handleSelectPanel('right_quarter_panel')}
                className="transition-colors hover:brightness-110"
              />
              <text x="282" y="385" fill="#e2e8f0" fontSize="9" fontWeight="600" textAnchor="start" pointerEvents="none">
                R Quarter
              </text>

              {/* Trunk / Tailgate */}
              <path
                d="M 104,370 C 130,366 210,366 236,370 L 240,445 C 200,455 140,455 100,445 Z"
                fill={getPanelColor('trunk')}
                stroke={getPanelStroke('trunk')}
                strokeWidth={selectedPanelKey === 'trunk' ? 3 : 1.5}
                onClick={() => handleSelectPanel('trunk')}
                className="transition-colors hover:brightness-110"
              />
              <text x="170" y="415" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle" pointerEvents="none">
                Trunk / Tailgate
              </text>

              {/* Rear Bumper */}
              <path
                d="M 96,450 C 120,460 220,460 244,450 L 240,480 C 210,490 130,490 100,480 Z"
                fill={getPanelColor('rear_bumper')}
                stroke={getPanelStroke('rear_bumper')}
                strokeWidth={selectedPanelKey === 'rear_bumper' ? 3 : 1.5}
                onClick={() => handleSelectPanel('rear_bumper')}
                className="transition-colors hover:brightness-110"
              />
              <text x="170" y="470" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">
                Rear Bumper
              </text>
            </svg>
          </div>

          <div className="text-[11px] text-slate-400 text-center w-full pt-2 border-t border-slate-800">
            Selected: <span className="font-semibold text-white">{selectedPanelConfig.name}</span>{' '}
            {existingItem ? (
              <span className="text-amber-400">({existingItem.damageType} - {existingItem.action})</span>
            ) : (
              <span className="text-emerald-400">(Clean - No Damage Logged)</span>
            )}
          </div>
        </div>

        {/* Panel Inspection & Damage Details Editor */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Inspecting Panel</span>
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {selectedPanelConfig.name}
                </h4>
              </div>
              {existingItem && (
                <button
                  type="button"
                  onClick={() => handleRemovePanelDamage(selectedPanelKey)}
                  disabled={readOnly}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Damage
                </button>
              )}
            </div>

            {/* Panel Selector dropdown if user wants quick keyboard jump */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Switch Panel</label>
              <select
                value={selectedPanelKey ?? ''}
                onChange={e => handleSelectPanel(e.target.value as CarPanelKey)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              >
                {CAR_PANELS.map(p => {
                  const hasDamage = panels.some(item => item.panelKey === p.key);
                  return (
                    <option key={p.key} value={p.key}>
                      {p.name} {hasDamage ? '⚠️ (Damaged)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-4">
              {/* Damage Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Damage Classification</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DAMAGE_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setDamageType(t)}
                      className={`text-left text-xs px-2.5 py-2 rounded-lg border transition-all ${
                        damageType === t
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repair Action */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Recommended Body Action</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {REPAIR_ACTIONS.map(a => (
                    <button
                      key={a}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setAction(a)}
                      className={`text-left text-xs px-2.5 py-2 rounded-lg border transition-all ${
                        action === a
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paint Code & Coat Specification */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">OEM Paint Code</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    placeholder="e.g. 1G3, NH731P"
                    value={paintCode || ''}
                    onChange={e => setPaintCode(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Coat Finish Type</label>
                  <select
                    disabled={readOnly}
                    value={coatType || 'Solid'}
                    onChange={e => setCoatType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="Solid">Solid Single Stage</option>
                    <option value="Metallic">2-Stage Metallic</option>
                    <option value="Pearl 3-Stage">3-Stage Pearl Tri-coat</option>
                    <option value="Matte">Matte Clear Finish</option>
                  </select>
                </div>
              </div>

              {/* Cost Estimator */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Denting / Pull Labor ($)</label>
                  <input
                    type="number"
                    disabled={readOnly}
                    min={0}
                    value={dentingCost ?? 0}
                    onChange={e => setDentingCost(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Paint &amp; Prep Cost ($)</label>
                  <input
                    type="number"
                    disabled={readOnly}
                    min={0}
                    value={paintingCost ?? 0}
                    onChange={e => setPaintingCost(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Technician Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Technician / Painter Notes</label>
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="e.g. Feather-edge sand to primer, blend into B-pillar"
                  value={notes || ''}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 mt-5">
            {!readOnly ? (
              <button
                type="button"
                onClick={handleSavePanelDamage}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {existingItem ? 'Update Panel Specification' : 'Add Panel to Damage Log'}
              </button>
            ) : (
              <div className="text-xs text-slate-500 flex items-center gap-1.5 justify-center">
                <Info className="w-4 h-4" /> Inspection view only
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logged Panels Table */}
      {panels.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
              Recorded Body &amp; Paint Work Items ({panels.length})
            </span>
            <span className="text-xs text-slate-500">
              Total Denting + Painting: <strong className="text-slate-900">QAR {(Number(totalDenting || 0) + Number(totalPainting || 0)).toFixed(2)}</strong>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-600 font-medium border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Panel Name</th>
                  <th className="py-2.5 px-4">Damage</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Paint &amp; Finish</th>
                  <th className="py-2.5 px-4 text-right">Denting Labor</th>
                  <th className="py-2.5 px-4 text-right">Painting Cost</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {panels.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{item.panelName}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        {item.damageType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium">{item.action}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {item.paintCode ? <span className="font-mono">{item.paintCode}</span> : 'OEM Match'} ({item.coatType || 'Standard'})
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium">QAR {(Number(item.dentingCost) || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right font-medium">QAR {(Number(item.paintingCost) || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-center">
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemovePanelDamage(item.panelKey)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
