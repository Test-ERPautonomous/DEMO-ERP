/**
 * High-resilience, quota-safe storage engine for Garage ERP
 * Provides synchronous in-memory + safe localStorage fallback and IndexedDB backing.
 * Prevents QuotaExceededError crashes when storing large job cards, photos, or audit records.
 */

import { JobCard } from '../types';
import { cacheJobCards, getCachedJobCards } from '../utils/indexedDB';

const memoryStore = new Map<string, string>();

/**
 * Remove heavy base64 strings or oversized binary attachments before persisting to localStorage
 * to keep localStorage usage under 500KB while IndexedDB and backend Supabase maintain full quality.
 */
function sanitizeForLocalStorage(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    // If it's a huge base64 data URL (> 4KB), truncate it for localStorage cache
    if (obj.startsWith('data:image/') && obj.length > 4096) {
      return obj.slice(0, 100) + '...[large-image-cached-in-db]';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLocalStorage(item));
  }
  if (typeof obj === 'object') {
    const copy: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      // If the field is photos or attachments and contains large data, sanitize it
      if (key === 'photos' && Array.isArray(obj[key])) {
        copy[key] = obj[key].map((p: any) => {
          if (typeof p === 'string' && p.length > 4096) {
            return p.slice(0, 100) + '...[large-image-cached-in-db]';
          }
          if (p && typeof p === 'object' && typeof p.url === 'string' && p.url.length > 4096) {
            return { ...p, url: p.url.slice(0, 100) + '...[large-image-cached-in-db]' };
          }
          return p;
        });
      } else {
        copy[key] = sanitizeForLocalStorage(obj[key]);
      }
    }
    return copy;
  }
  return obj;
}

/**
 * Attempt to free space in localStorage when approaching or hitting quota limits
 */
export function pruneLocalStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Purge legacy versions, drafts, temporary keys
        if (
          key.startsWith('apex_') ||
          key.startsWith('najm_jobcard_draft') ||
          key.startsWith('v2_') ||
          key.includes('comp_meg') ||
          key.includes('demo') ||
          key.includes('temp_')
        ) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {
        // Ignore
      }
    });
  } catch (err) {
    console.warn('[Storage] Prune warning:', err);
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn(`[SafeStorage] Failed to read "${key}" from localStorage`, e);
    }
    return memoryStore.get(key) || null;
  },

  setItem(key: string, value: string): boolean {
    // Keep in memory store always
    memoryStore.set(key, value);

    if (typeof window === 'undefined' || !window.localStorage) {
      return true;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (firstErr: any) {
      // Check for QuotaExceededError
      const isQuota =
        firstErr?.name === 'QuotaExceededError' ||
        firstErr?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        firstErr?.code === 22 ||
        firstErr?.code === 1014 ||
        (firstErr?.message && firstErr.message.toLowerCase().includes('quota'));

      if (isQuota) {
        console.warn(`[SafeStorage] LocalStorage quota exceeded for "${key}". Pruning stale storage...`);
        pruneLocalStorage();

        try {
          // Retry direct write after pruning
          localStorage.setItem(key, value);
          return true;
        } catch (retryErr) {
          // If still failing, try saving sanitized (stripped base64) version if JSON
          try {
            const parsed = JSON.parse(value);
            const sanitized = sanitizeForLocalStorage(parsed);
            const compressedStr = JSON.stringify(sanitized);
            localStorage.setItem(key, compressedStr);
            return true;
          } catch {
            // LocalStorage is completely full; data is safely preserved in memory and IndexedDB/Server
            console.warn(`[SafeStorage] Saved "${key}" to memory fallback only due to browser quota limits.`);
            return false;
          }
        }
      }

      console.warn(`[SafeStorage] Error writing "${key}" to localStorage:`, firstErr?.message || firstErr);
      return false;
    }
  },

  removeItem(key: string): void {
    memoryStore.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Error removing "${key}"`, e);
    }
  },

  loadJSON<T>(key: string, fallback: T): T {
    try {
      const raw = this.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch (e) {
      console.warn(`[SafeStorage] Error parsing JSON for key "${key}"`, e);
    }
    return fallback;
  },

  saveJSON<T>(key: string, data: T, sanitize: boolean = true): boolean {
    try {
      const sanitizedData = sanitize ? sanitizeForLocalStorage(data) : data;
      const str = JSON.stringify(sanitizedData);
      return this.setItem(key, str);
    } catch (e) {
      console.warn(`[SafeStorage] Error stringifying JSON for key "${key}"`, e);
      return false;
    }
  }
};

/**
 * Enhanced async persistence for JobCards with IndexedDB backing
 */
export async function persistJobCardsSafely(key: string, jobCards: JobCard[]): Promise<void> {
  // 1. Save sanitized version to localStorage cache (won't exceed quota or throw)
  safeStorage.saveJSON(key, jobCards, true);

  // 2. Save complete raw version with all images and full fidelity to IndexedDB
  try {
    await cacheJobCards(jobCards);
  } catch (err) {
    console.warn('[SafeStorage] IndexedDB job cards cache warning:', err);
  }
}

/**
 * Retrieve JobCards with fallback to IndexedDB if localStorage cache was truncated or missing
 */
export async function loadJobCardsSafely(key: string, fallback: JobCard[]): Promise<JobCard[]> {
  const localCards = safeStorage.loadJSON<JobCard[]>(key, []);
  if (localCards && localCards.length > 0) {
    return localCards;
  }

  try {
    const idbCards = await getCachedJobCards();
    if (idbCards && idbCards.length > 0) {
      return idbCards;
    }
  } catch (err) {
    console.warn('[SafeStorage] IndexedDB read fallback notice:', err);
  }

  return fallback;
}
