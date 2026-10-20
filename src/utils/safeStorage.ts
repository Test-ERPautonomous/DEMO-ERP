/**
 * Safe localStorage wrapper with QuotaExceededError protection,
 * automatic storage cleanup, payload sanitization, and fallback.
 */

import { cacheJobCards } from './indexedDB';

/**
 * Strips huge base64 strings (like uploaded photos or drawings) from an object tree
 * before saving to localStorage to stay well below the 5MB browser quota.
 */
function sanitizeForLocalStorage(obj: any, depth = 0): any {
  if (depth > 6) return obj;
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.length > 50000 && (obj.startsWith('data:image/') || obj.startsWith('data:audio/') || obj.startsWith('data:video/'))) {
      // Replace huge data URI with lightweight marker
      return `[base64_media_omitted_from_localstorage_${obj.substring(0, 30)}...]`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLocalStorage(item, depth + 1));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Keep heavy photos/drawings from bloating localStorage if they are data URLs
    if (typeof value === 'string' && value.length > 50000 && value.startsWith('data:')) {
      cleaned[key] = `[media_stored_in_backend_${value.slice(0, 30)}...]`;
    } else {
      cleaned[key] = sanitizeForLocalStorage(value, depth + 1);
    }
  }
  return cleaned;
}

/**
 * Clear non-critical or legacy storage items to free up space.
 */
export function cleanOldStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('apex_') ||
        key.startsWith('najm_') ||
        key.startsWith('v2_') ||
        key.includes('comp_meg') ||
        key.includes('demo') ||
        key.endsWith('_auditLogs') || // purge large audit logs from local storage first if needed
        key === 'najm_jobcard_draft'
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
  } catch (e) {
    console.warn('Storage purge error:', e);
  }
}

/**
 * Safely saves data to localStorage without throwing QuotaExceededError or crashing React.
 */
export function safeSetItem(key: string, value: any): boolean {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      (err?.message && err.message.toLowerCase().includes('quota'));

    console.warn(`[SafeStorage] localStorage write failed for key "${key}" (Quota error: ${isQuotaError}):`, err?.message);

    // Try cleaning old storage
    cleanOldStorage();

    // If it's a structured dataset, sanitize heavy base64 strings and try again
    try {
      const sanitized = sanitizeForLocalStorage(value);
      const sanitizedStr = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
      localStorage.setItem(key, sanitizedStr);
      console.info(`[SafeStorage] Successfully saved sanitized version for key "${key}".`);
      return true;
    } catch (secondErr: any) {
      console.warn(`[SafeStorage] Second write attempt after sanitization failed for "${key}":`, secondErr?.message);
    }

    // Try asynchronous IndexedDB cache for jobCards
    if (key.includes('jobCards') && Array.isArray(value)) {
      try {
        cacheJobCards(value).catch(e => console.warn('IndexedDB fallback notice:', e));
      } catch {
        // ignore
      }
    }

    // Return false without crashing
    return false;
  }
}

/**
 * Safely reads and parses data from localStorage with fallback.
 */
export function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch (err) {
    console.warn(`[SafeStorage] Error reading key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Error removing key "${key}":`, err);
  }
}
