import type { PracticeSessionLocal } from '@hafalanku/quran-types';

const DB_NAME = 'hafalanku_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'practice_sessions_local';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung oleh browser ini.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Gagal membuka penyimpanan lokal.'));
  });
}

export async function savePracticeSession(
  session: PracticeSessionLocal
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Gagal menyimpan sesi.'));
  });
}

export async function listPracticeSessions(): Promise<PracticeSessionLocal[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const items = (req.result as PracticeSessionLocal[]) ?? [];
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(items);
    };
    req.onerror = () => reject(req.error ?? new Error('Gagal membaca riwayat.'));
  });
}

export async function deletePracticeSession(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Gagal menghapus sesi.'));
  });
}

export async function clearPracticeSessions(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error('Gagal menghapus semua riwayat.'));
  });
}

