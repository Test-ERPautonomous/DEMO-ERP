import { JobCard } from '../types';

const DB_NAME = 'NajmAlHudaDB_v1';
const DB_VERSION = 1;

export interface OfflineUpdate {
  id: string;
  jobCardId: string;
  type: 'update' | 'status_change';
  data: any;
  timestamp: string;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cached_job_cards')) {
        db.createObjectStore('cached_job_cards', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_updates')) {
        db.createObjectStore('offline_updates', { keyPath: 'id' });
      }
    };
  });
}

export async function cacheJobCards(jobCards: JobCard[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction('cached_job_cards', 'readwrite');
    const store = transaction.objectStore('cached_job_cards');

    // Clear existing cache
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add new job cards
    for (const jc of jobCards) {
      store.put(jc);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error('Failed to cache job cards in IndexedDB:', err);
  }
}

export async function getCachedJobCards(): Promise<JobCard[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction('cached_job_cards', 'readonly');
    const store = transaction.objectStore('cached_job_cards');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to retrieve cached job cards:', err);
    return [];
  }
}

export async function saveOfflineUpdate(jobCardId: string, type: 'update' | 'status_change', data: any): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction('offline_updates', 'readwrite');
    const store = transaction.objectStore('offline_updates');

    const update: OfflineUpdate = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      jobCardId,
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    store.put(update);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`[IndexedDB] Offline update saved for Job ${jobCardId} (${type})`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error('Failed to save offline update:', err);
  }
}

export async function getOfflineUpdates(): Promise<OfflineUpdate[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction('offline_updates', 'readonly');
    const store = transaction.objectStore('offline_updates');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to retrieve offline updates:', err);
    return [];
  }
}

export async function deleteOfflineUpdate(id: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction('offline_updates', 'readwrite');
    const store = transaction.objectStore('offline_updates');
    store.delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error('Failed to delete offline update:', err);
  }
}

export async function clearOfflineUpdates(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction('offline_updates', 'readwrite');
    const store = transaction.objectStore('offline_updates');
    store.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error('Failed to clear offline updates:', err);
  }
}
