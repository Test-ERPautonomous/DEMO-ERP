/**
 * Safe local storage utility with automatic QuotaExceededError recovery,
 * key cleanup, payload compression/sanitization, and in-memory fallback.
 */

const memoryStore: Record<string, string> = {};

/**
 * Remove heavy base64 strings if storage quota is tight
 */
function sanitizeForStorage(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // If it's a huge base64 data URL (e.g. over 50KB)
    if (data.startsWith('data:image/') && data.length > 50000) {
      return ''; // Strip huge base64 to save storage quota
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForStorage(item));
  }
  if (typeof data === 'object') {
    const copy: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      copy[key] = sanitizeForStorage(data[key]);
    }
    return copy;
  }
  return data;
}

/**
 * Try to free space in localStorage by removing legacy, draft, or non-essential keys
 */
function cleanupOldStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (
          key.startsWith('apex_') ||
          key.startsWith('najm_') && !key.includes('auth') ||
          key.startsWith('v2_') ||
          key.includes('draft') ||
          key.includes('auditLogs') ||
          key.includes('comp_meg') ||
          key.includes('demo')
        ) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[Storage] Cleanup attempt warning:', e);
  }
}

/**
 * Safely saves data to localStorage without throwing QuotaExceededError or crashing React
 */
export function safeStorageSet<T>(key: string, value: T): boolean {
  let serialized: string;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (e) {
    console.warn(`[Storage] Failed to serialize key "${key}":`, e);
    return false;
  }

  // Update in-memory fallback
  memoryStore[key] = serialized;

  try {
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    const isQuotaError = 
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.message?.includes('quota') ||
      err?.message?.includes('exceeded');

    if (isQuotaError) {
      console.warn(`[Storage] Storage quota exceeded for "${key}". Attempting recovery...`);
      
      // Step 1: Clean up old and transient items
      cleanupOldStorage();

      try {
        localStorage.setItem(key, serialized);
        return true;
      } catch (retryErr) {
        // Step 2: Strip heavy base64 images / photos and retry
        try {
          const sanitized = sanitizeForStorage(value);
          const sanitizedStr = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
          localStorage.setItem(key, sanitizedStr);
          return true;
        } catch (finalErr) {
          console.warn(`[Storage] Could not persist "${key}" to localStorage. Retaining in memory store.`);
          return false;
        }
      }
    } else {
      console.warn(`[Storage] Error setting key "${key}":`, err);
      return false;
    }
  }
}

/**
 * Safely retrieves data from localStorage or in-memory fallback
 */
export function safeStorageGet<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // If parse fails or localStorage is inaccessible
    console.warn(`[Storage] Failed to parse key "${key}" from localStorage:`, e);
  }

  if (memoryStore[key]) {
    try {
      return JSON.parse(memoryStore[key]);
    } catch {
      // Return fallback
    }
  }

  return fallback;
}

/**
 * Safely remove an item
 */
export function safeStorageRemove(key: string): void {
  delete memoryStore[key];
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Storage] Error removing key "${key}":`, e);
  }
}
