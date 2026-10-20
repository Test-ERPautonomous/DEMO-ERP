// Robust IndexedDB photo storage helper for Job Card vehicle attachments
export interface JobCardPhoto {
  id: string;
  jobCardId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  category: string;
  caption?: string;
  timestamp: string;
}

const DB_NAME = 'NajmAlHudaGarage_PhotosDB';
const DB_VERSION = 1;
const STORE_NAME = 'job_card_photos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('jobCardId', 'jobCardId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhotosForJobCard(jobCardId: string, photos: JobCardPhoto[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Delete existing photos for this jobCardId first to keep in sync
    const index = store.index('jobCardId');
    const request = index.getAllKeys(jobCardId);

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const keys = request.result;
        keys.forEach(k => store.delete(k));
        photos.forEach(p => store.put(p));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist photos to IndexedDB, fallback to in-memory:', err);
  }
}

export async function loadPhotosForJobCard(jobCardId: string): Promise<JobCardPhoto[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('jobCardId');
    const request = index.getAll(jobCardId);

    return new Promise<JobCardPhoto[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not load photos from IndexedDB:', err);
    return [];
  }
}

export async function deletePhotoFromDB(photoId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(photoId);
  } catch (err) {
    console.warn('Could not delete photo from IndexedDB:', err);
  }
}

// Convert File to compressed Data URL
export function processImageFile(file: File, maxDim = 1920, quality = 0.85): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: e.target?.result as string, size: file.size });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type || 'image/jpeg', quality);
        
        // Approximate size
        const head = 'data:' + (file.type || 'image/jpeg') + ';base64,';
        const sizeInBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);
        resolve({ dataUrl, size: sizeInBytes });
      };
      img.onerror = () => {
        resolve({ dataUrl: e.target?.result as string, size: file.size });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
