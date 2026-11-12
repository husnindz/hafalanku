import type { Ayah, PageBundle, Surah } from '@hafalanku/quran-types';

const CACHE_DB_NAME = 'hafalanku_quran_cache_v1';
const CACHE_DB_VERSION = 1;

const STORE_SURAHS = 'surah_list';
const STORE_SURAH_AYAHS = 'surah_ayahs';
const STORE_PAGE_BUNDLES = 'page_bundles';
const STORE_JUZ_AYAHS = 'juz_ayahs';
const STORE_AYAH_DETAILS = 'ayah_details';

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia.'));
      return;
    }

    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of [
        STORE_SURAHS,
        STORE_SURAH_AYAHS,
        STORE_PAGE_BUNDLES,
        STORE_JUZ_AYAHS,
        STORE_AYAH_DETAILS,
      ]) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Gagal membuka cache IndexedDB.'));
  });
}

async function getFromStore<T>(
  storeName: string,
  key: IDBValidKey
): Promise<T | null> {
  try {
    const db = await openCacheDb();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function putInStore<T>(
  storeName: string,
  key: IDBValidKey,
  value: T
): Promise<void> {
  try {
    const db = await openCacheDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Abaikan kegagalan cache pada mode privat
  }
}

export async function getCachedSurahList(): Promise<Surah[] | null> {
  return getFromStore<Surah[]>(STORE_SURAHS, 'all');
}

export async function setCachedSurahList(surahs: Surah[]): Promise<void> {
  return putInStore(STORE_SURAHS, 'all', surahs);
}

export async function getCachedSurahAyahs(
  surahNumber: number
): Promise<Ayah[] | null> {
  return getFromStore<Ayah[]>(STORE_SURAH_AYAHS, surahNumber);
}

export async function setCachedSurahAyahs(
  surahNumber: number,
  ayahs: Ayah[]
): Promise<void> {
  return putInStore(STORE_SURAH_AYAHS, surahNumber, ayahs);
}

export async function getCachedPageBundle(
  pageNumber: number
): Promise<PageBundle | null> {
  return getFromStore<PageBundle>(STORE_PAGE_BUNDLES, pageNumber);
}

export async function setCachedPageBundle(bundle: PageBundle): Promise<void> {
  return putInStore(STORE_PAGE_BUNDLES, bundle.pageNumber, bundle);
}

export async function getCachedJuzAyahs(
  juzNumber: number
): Promise<Ayah[] | null> {
  return getFromStore<Ayah[]>(STORE_JUZ_AYAHS, juzNumber);
}

export async function setCachedJuzAyahs(
  juzNumber: number,
  ayahs: Ayah[]
): Promise<void> {
  return putInStore(STORE_JUZ_AYAHS, juzNumber, ayahs);
}

export async function getCachedAyahDetail(
  surahNumber: number,
  ayahNumber: number
): Promise<Ayah | null> {
  return getFromStore<Ayah>(STORE_AYAH_DETAILS, `${surahNumber}:${ayahNumber}`);
}

export async function setCachedAyahDetail(ayah: Ayah): Promise<void> {
  return putInStore(
    STORE_AYAH_DETAILS,
    `${ayah.surahNumber}:${ayah.ayahNumber}`,
    ayah
  );
}

export async function clearQuranApiCache(): Promise<void> {
  try {
    const db = await openCacheDb();
    const storeNames = [
      STORE_SURAHS,
      STORE_SURAH_AYAHS,
      STORE_PAGE_BUNDLES,
      STORE_JUZ_AYAHS,
      STORE_AYAH_DETAILS,
    ];
    await new Promise<void>((resolve) => {
      const tx = db.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        tx.objectStore(name).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Abaikan
  }
}

