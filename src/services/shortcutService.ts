export interface KeyCombination {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

export interface ShortcutDefinition {
  id: string;
  label: string;
  category: 'General & Navigation' | 'Work Orders & Operations' | 'Search & Tools' | 'Billing & Inventory';
  description: string;
  defaultCombo: KeyCombination;
  currentCombo: KeyCombination;
}

const STORAGE_KEY = 'najm_custom_keyboard_shortcuts';

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'cheat_sheet',
    label: 'Keyboard Cheat Sheet',
    category: 'Search & Tools',
    description: 'Display this keyboard shortcuts cheat sheet and customizer',
    defaultCombo: { key: '/', ctrlKey: true },
    currentCombo: { key: '/', ctrlKey: true },
  },
  {
    id: 'command_palette',
    label: 'Command Palette',
    category: 'Search & Tools',
    description: 'Open quick search for any vehicle, customer, job card, or action',
    defaultCombo: { key: 'k', ctrlKey: true },
    currentCombo: { key: 'k', ctrlKey: true },
  },
  {
    id: 'new_job_card',
    label: 'New Job Card',
    category: 'Work Orders & Operations',
    description: 'Open the job card creation wizard for a customer vehicle',
    defaultCombo: { key: 'n', altKey: true },
    currentCombo: { key: 'n', altKey: true },
  },
  {
    id: 'find_vehicle',
    label: 'Quick Find Vehicle',
    category: 'Search & Tools',
    description: 'Focus vehicle plate number lookup',
    defaultCombo: { key: 'v', altKey: true },
    currentCombo: { key: 'v', altKey: true },
  },
  {
    id: 'focus_search',
    label: 'Global Search Focus',
    category: 'Search & Tools',
    description: 'Focus the top header search bar',
    defaultCombo: { key: 'f', ctrlKey: true },
    currentCombo: { key: 'f', ctrlKey: true },
  },
  {
    id: 'toggle_sidebar',
    label: 'Toggle Sidebar Collapse',
    category: 'General & Navigation',
    description: 'Expand or collapse the left workshop navigation sidebar',
    defaultCombo: { key: 's', altKey: true },
    currentCombo: { key: 's', altKey: true },
  },
  {
    id: 'go_dashboard',
    label: 'Go to Dashboard',
    category: 'General & Navigation',
    description: 'Jump to Executive Workshop KPI Dashboard',
    defaultCombo: { key: '1', altKey: true },
    currentCombo: { key: '1', altKey: true },
  },
  {
    id: 'go_jobs',
    label: 'Go to Jobs & Work Orders',
    category: 'General & Navigation',
    description: 'Jump to active Job Cards & Bay Floor Operations',
    defaultCombo: { key: '2', altKey: true },
    currentCombo: { key: '2', altKey: true },
  },
  {
    id: 'go_customers',
    label: 'Go to Customers Directory',
    category: 'General & Navigation',
    description: 'Jump to Customers and Vehicle Profiles',
    defaultCombo: { key: '3', altKey: true },
    currentCombo: { key: '3', altKey: true },
  },
  {
    id: 'go_inventory',
    label: 'Go to Parts & Stock',
    category: 'General & Navigation',
    description: 'Jump to Spare Parts Inventory and Stock Management',
    defaultCombo: { key: '4', altKey: true },
    currentCombo: { key: '4', altKey: true },
  },
  {
    id: 'go_billing',
    label: 'Go to Invoices & Billing',
    category: 'General & Navigation',
    description: 'Jump to Invoices, Receipts, and Financials',
    defaultCombo: { key: '5', altKey: true },
    currentCombo: { key: '5', altKey: true },
  },
  {
    id: 'new_invoice',
    label: 'Create New Invoice',
    category: 'Billing & Inventory',
    description: 'Generate customer tax invoice for completed work',
    defaultCombo: { key: 'i', altKey: true },
    currentCombo: { key: 'i', altKey: true },
  },
  {
    id: 'new_estimate',
    label: 'Create Estimation / Quotation',
    category: 'Billing & Inventory',
    description: 'Draft proforma repair quote for customer approval',
    defaultCombo: { key: 'e', altKey: true },
    currentCombo: { key: 'e', altKey: true },
  },
  {
    id: 'easy_guide',
    label: 'Workshop User Manual & Easy Guide',
    category: 'Search & Tools',
    description: 'Open easy step-by-step guidance and workflows',
    defaultCombo: { key: 'F1' },
    currentCombo: { key: 'F1' },
  }
];

export function getShortcuts(): ShortcutDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(raw) as Record<string, KeyCombination>;
    return DEFAULT_SHORTCUTS.map(item => ({
      ...item,
      currentCombo: parsed[item.id] || item.defaultCombo
    }));
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcut(id: string, newCombo: KeyCombination): ShortcutDefinition[] {
  const current = getShortcuts();
  const updated = current.map(item => {
    if (item.id === id) {
      return { ...item, currentCombo: newCombo };
    }
    return item;
  });

  const storageMap: Record<string, KeyCombination> = {};
  updated.forEach(item => {
    storageMap[item.id] = item.currentCombo;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storageMap));
  window.dispatchEvent(new CustomEvent('najm_shortcuts_updated'));
  return updated;
}

export function resetShortcut(id: string): ShortcutDefinition[] {
  const target = DEFAULT_SHORTCUTS.find(d => d.id === id);
  if (target) {
    return saveShortcut(id, target.defaultCombo);
  }
  return getShortcuts();
}

export function resetAllShortcuts(): ShortcutDefinition[] {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('najm_shortcuts_updated'));
  return DEFAULT_SHORTCUTS;
}

export function areCombosEqual(a?: KeyCombination, b?: KeyCombination): boolean {
  if (!a || !b) return false;
  const keyA = a.key.toLowerCase();
  const keyB = b.key.toLowerCase();
  return (
    keyA === keyB &&
    Boolean(a.ctrlKey) === Boolean(b.ctrlKey) &&
    Boolean(a.altKey) === Boolean(b.altKey) &&
    Boolean(a.shiftKey) === Boolean(b.shiftKey) &&
    Boolean(a.metaKey) === Boolean(b.metaKey)
  );
}

export function detectConflict(
  id: string,
  combo: KeyCombination,
  shortcuts: ShortcutDefinition[]
): ShortcutDefinition | null {
  for (const item of shortcuts) {
    if (item.id !== id && areCombosEqual(item.currentCombo, combo)) {
      return item;
    }
  }
  return null;
}

export function matchesKeyEvent(e: KeyboardEvent, combo: KeyCombination): boolean {
  if (!combo || !combo.key) return false;

  // Handle Mac command key as ctrlKey fallback
  const isCtrl = Boolean(combo.ctrlKey) || Boolean(combo.metaKey);
  const eventHasCtrl = e.ctrlKey || e.metaKey;

  if (Boolean(isCtrl) !== Boolean(eventHasCtrl)) return false;
  if (Boolean(combo.altKey) !== Boolean(e.altKey)) return false;
  if (Boolean(combo.shiftKey) !== Boolean(e.shiftKey)) return false;

  const targetKey = combo.key.toLowerCase();
  const eventKey = e.key.toLowerCase();

  if (targetKey === eventKey) return true;

  // Key normalization for common symbols
  if (targetKey === '/' && (eventKey === '/' || eventKey === '?')) return true;
  if (targetKey === '?' && eventKey === '?') return true;

  return false;
}

export function formatKeyCombo(combo: KeyCombination): string {
  if (!combo) return '';
  const parts: string[] = [];
  if (combo.ctrlKey || combo.metaKey) parts.push('Ctrl');
  if (combo.altKey) parts.push('Alt');
  if (combo.shiftKey) parts.push('Shift');
  
  let keyLabel = combo.key.toUpperCase();
  if (combo.key === ' ') keyLabel = 'Space';
  else if (combo.key.toLowerCase() === 'escape') keyLabel = 'Esc';
  
  parts.push(keyLabel);
  return parts.join(' + ');
}

export function formatKeyComboBadges(combo: KeyCombination): string[] {
  if (!combo) return [];
  const parts: string[] = [];
  if (combo.ctrlKey || combo.metaKey) parts.push('Ctrl');
  if (combo.altKey) parts.push('Alt');
  if (combo.shiftKey) parts.push('Shift');

  let keyLabel = combo.key.toUpperCase();
  if (combo.key === ' ') keyLabel = 'Space';
  else if (combo.key.toLowerCase() === 'escape') keyLabel = 'Esc';

  parts.push(keyLabel);
  return parts;
}
