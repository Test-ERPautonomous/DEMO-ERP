import React, { useState, useEffect, useRef } from 'react';
import { 
  Keyboard, 
  Search, 
  X, 
  RotateCcw, 
  Sliders, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Play, 
  Command,
  BookOpen
} from 'lucide-react';
import { 
  getShortcuts, 
  saveShortcut, 
  resetShortcut, 
  resetAllShortcuts, 
  formatKeyComboBadges,
  detectConflict,
  ShortcutDefinition,
  KeyCombination 
} from '../../services/shortcutService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction?: (actionId: string) => void;
  initialMode?: 'view' | 'customize';
}

export const KeyboardCheatSheetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onTriggerAction,
  initialMode = 'view'
}) => {
  const [mode, setMode] = useState<'view' | 'customize'>(initialMode);
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Recording state for customization
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordedCombo, setRecordedCombo] = useState<KeyCombination | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load shortcuts on mount or open
  useEffect(() => {
    if (isOpen) {
      setShortcuts(getShortcuts());
      setConflictError(null);
      setRecordingId(null);
      setRecordedCombo(null);
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Focus search input when modal opens in view mode
  useEffect(() => {
    if (isOpen && mode === 'view') {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mode]);

  // Key recording listener
  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Cancel on Escape without modifiers
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        setRecordingId(null);
        setRecordedCombo(null);
        setConflictError(null);
        return;
      }

      // Ignore bare modifier keydown events
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      const newCombo: KeyCombination = {
        key: e.key,
        ctrlKey: e.ctrlKey || e.metaKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
      };

      setRecordedCombo(newCombo);

      // Check conflict
      const conflict = detectConflict(recordingId, newCombo, shortcuts);
      if (conflict) {
        setConflictError(`Warning: This combination is already assigned to "${conflict.label}".`);
      } else {
        setConflictError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    return () => window.removeEventListener('keydown', handleKeyDownCapture, true);
  }, [recordingId, shortcuts]);

  if (!isOpen) return null;

  const categories = ['All', 'General & Navigation', 'Work Orders & Operations', 'Search & Tools', 'Billing & Inventory'];

  const filteredShortcuts = shortcuts.filter(sc => {
    const matchesCategory = selectedCategory === 'All' || sc.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const badges = formatKeyComboBadges(sc.currentCombo).join(' ').toLowerCase();
    const matchesSearch = 
      sc.label.toLowerCase().includes(q) ||
      sc.description.toLowerCase().includes(q) ||
      sc.category.toLowerCase().includes(q) ||
      badges.includes(q);

    return matchesCategory && matchesSearch;
  });

  const handleApplyRecordedKey = (id: string) => {
    if (!recordedCombo) return;
    const updated = saveShortcut(id, recordedCombo);
    setShortcuts(updated);
    setRecordingId(null);
    setRecordedCombo(null);
    setConflictError(null);
    setSaveSuccessMsg(`Shortcut for "${updated.find(s => s.id === id)?.label}" updated!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetSingle = (id: string) => {
    const updated = resetShortcut(id);
    setShortcuts(updated);
    setRecordingId(null);
    setRecordedCombo(null);
    setConflictError(null);
    setSaveSuccessMsg('Shortcut reset to default.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetAll = () => {
    if (window.confirm('Reset all keyboard shortcuts back to factory defaults?')) {
      const defs = resetAllShortcuts();
      setShortcuts(defs);
      setRecordingId(null);
      setRecordedCombo(null);
      setConflictError(null);
      setSaveSuccessMsg('All shortcuts restored to defaults.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const handleExecute = (actionId: string) => {
    onClose();
    if (onTriggerAction) {
      setTimeout(() => {
        onTriggerAction(actionId);
      }, 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheat-sheet-title"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="cheat-sheet-title" className="text-base font-bold text-slate-900">
                  Keyboard Shortcuts Cheat Sheet
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  Global Hotkeys
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Speed up workshop job cards, vehicle search, and navigation with instant key combinations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setMode('view'); setRecordingId(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'view'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Cheat Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('customize'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'customize'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Customize Keys</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications & Warning Alerts */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center gap-2 text-xs font-medium text-emerald-800 animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {conflictError && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-xs font-semibold text-amber-800 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{conflictError}</span>
          </div>
        )}

        {/* Controls Toolbar: Search & Category Filters */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter shortcuts by action name, key, or category..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {mode === 'view' ? (
            /* --- CHEAT SHEET CARD GRID VIEW --- */
            <div>
              {filteredShortcuts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Command className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-sm">No shortcuts matched "{searchQuery}"</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing the search filter or category selector.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredShortcuts.map((sc) => {
                    const badges = formatKeyComboBadges(sc.currentCombo);
                    const isCustomized = JSON.stringify(sc.currentCombo) !== JSON.stringify(sc.defaultCombo);

                    return (
                      <div
                        key={sc.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-md hover:shadow-sky-50 transition-all flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                                {sc.label}
                              </span>
                              {isCustomized && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {sc.description}
                            </p>
                          </div>

                          {/* Keycap Badge Display */}
                          <div className="flex items-center gap-1 shrink-0">
                            {badges.map((badge, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && <span className="text-[10px] text-slate-400 font-bold">+</span>}
                                <kbd className="min-w-6 h-6 px-1.5 flex items-center justify-center text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-md shadow-2xs uppercase">
                                  {badge}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* Bottom Action Footer */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-[10px] font-medium text-slate-400">
                            {sc.category}
                          </span>

                          <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {onTriggerAction && (
                              <button
                                type="button"
                                onClick={() => handleExecute(sc.id)}
                                className="px-2 py-0.5 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Run this action immediately"
                              >
                                <Play className="w-3 h-3" />
                                <span>Trigger</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setMode('customize');
                                setRecordingId(sc.id);
                                setRecordedCombo(sc.currentCombo);
                              }}
                              className="px-2 py-0.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold cursor-pointer transition-colors"
                            >
                              Edit Key
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* --- CUSTOMIZE SHORTCUTS STUDIO VIEW --- */
            <div className="space-y-4">
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Custom Keybindings Studio</h4>
                    <p className="text-[11px] text-slate-600">
                      Click any shortcut below to record a new key combination. Press any combination on your keyboard (e.g. <span className="font-mono font-bold text-slate-800">Alt+J</span>, <span className="font-mono font-bold text-slate-800">Ctrl+Shift+F</span>).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs"
                  title="Reset all shortcuts to defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All to Default</span>
                </button>
              </div>

              {/* Shortcuts Customization Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Current Keybinding</th>
                      <th className="py-2.5 px-4 text-right">Customize</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredShortcuts.map((sc) => {
                      const isRecording = recordingId === sc.id;
                      const activeBadges = isRecording && recordedCombo 
                        ? formatKeyComboBadges(recordedCombo)
                        : formatKeyComboBadges(sc.currentCombo);
                      const isCustomized = JSON.stringify(sc.currentCombo) !== JSON.stringify(sc.defaultCombo);

                      return (
                        <tr 
                          key={sc.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isRecording ? 'bg-sky-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{sc.label}</span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs">{sc.description}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                              {sc.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isRecording ? (
                              <div className="flex items-center gap-2">
                                <div className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-mono font-bold text-xs animate-pulse flex items-center gap-1.5 shadow-xs">
                                  <span>{recordedCombo ? activeBadges.join(' + ') : 'Press keys now...'}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">Esc to cancel</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1">
                                  {activeBadges.map((badge, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="text-[10px] text-slate-400 font-bold">+</span>}
                                      <kbd className="min-w-6 h-6 px-1.5 flex items-center justify-center text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded shadow-2xs">
                                        {badge}
                                      </kbd>
                                    </React.Fragment>
                                  ))}
                                </div>
                                {isCustomized && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                    Modified
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isRecording ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApplyRecordedKey(sc.id)}
                                  disabled={!recordedCombo}
                                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecordingId(null);
                                    setRecordedCombo(null);
                                    setConflictError(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecordingId(sc.id);
                                    setRecordedCombo(sc.currentCombo);
                                    setConflictError(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs cursor-pointer border border-sky-200 transition-colors"
                                >
                                  Record Key
                                </button>
                                {isCustomized && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetSingle(sc.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                                    title="Reset to default key"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Tips */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Pro Tip:</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700 shadow-2xs font-bold">Ctrl + /</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700 shadow-2xs font-bold">?</kbd> anywhere to open this Cheat Sheet.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
