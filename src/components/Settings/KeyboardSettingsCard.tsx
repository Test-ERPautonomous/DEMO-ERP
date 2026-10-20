import React, { useState, useEffect } from 'react';
import { Keyboard, Sliders, RotateCcw, Check, Sparkles, BookOpen } from 'lucide-react';
import { 
  getShortcuts, 
  resetAllShortcuts, 
  formatKeyComboBadges,
  ShortcutDefinition 
} from '../../services/shortcutService';

interface Props {
  onOpenCheatSheet: (initialMode?: 'view' | 'customize') => void;
}

export const KeyboardSettingsCard: React.FC<Props> = ({ onOpenCheatSheet }) => {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);
  const [resetSuccess, setResetSuccess] = useState(false);

  const loadData = () => {
    setShortcuts(getShortcuts());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('najm_shortcuts_updated', handleUpdate);
    return () => window.removeEventListener('najm_shortcuts_updated', handleUpdate);
  }, []);

  const customizedCount = shortcuts.filter(
    s => JSON.stringify(s.currentCombo) !== JSON.stringify(s.defaultCombo)
  ).length;

  const handleResetAll = () => {
    if (window.confirm('Reset all keyboard combinations to default workshop settings?')) {
      resetAllShortcuts();
      loadData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Keyboard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Global Keyboard Shortcuts &amp; Productivity</h3>
            <p className="text-[11px] text-slate-500">
              Customize key combinations for quick job cards, plate lookup, navigation, and billing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenCheatSheet('view')}
            className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-sky-200 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>View Cheat Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCheatSheet('customize')}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Hotkeys</span>
          </button>
        </div>
      </div>

      {resetSuccess && (
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>All shortcuts have been reset to default workshop keybindings!</span>
        </div>
      )}

      {/* Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Active Hotkeys</span>
          <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{shortcuts.length} Shortcuts</span>
          <span className="text-[10px] text-slate-500">Global across all 10 windows</span>
        </div>

        <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-200/80">
          <span className="text-[10px] font-bold text-sky-700 block uppercase tracking-wider">Cheat Sheet Trigger</span>
          <span className="text-lg font-extrabold text-sky-900 mt-0.5 block">Ctrl + / &nbsp;or&nbsp; ?</span>
          <span className="text-[10px] text-sky-700">Instant on-screen help modal</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Customized Keys</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-extrabold text-slate-900 block">{customizedCount} Overridden</span>
            {customizedCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-[10px] text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-500">Saved to browser local storage</span>
        </div>
      </div>

      {/* Quick Overview of Key Shortcuts */}
      <div className="pt-2">
        <h4 className="text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
          Essential Workshop Hotkeys
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {shortcuts.slice(0, 6).map((sc) => {
            const badges = formatKeyComboBadges(sc.currentCombo);
            return (
              <div 
                key={sc.id}
                className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between bg-slate-50/50 hover:bg-slate-100/70 transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-800 block text-xs">{sc.label}</span>
                  <span className="text-[10px] text-slate-500 block">{sc.description}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {badges.map((b, i) => (
                    <kbd 
                      key={i} 
                      className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] font-bold text-slate-700 shadow-2xs"
                    >
                      {b}
                    </kbd>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
