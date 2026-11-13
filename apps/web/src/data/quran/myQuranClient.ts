import type { Ayah, PageBundle, Surah } from '@hafalanku/quran-types';
import {
  getCachedAyahDetail,
  getCachedJuzAyahs,
  getCachedPageBundle,
  getCachedSurahAyahs,
  getCachedSurahList,
  setCachedAyahDetail,
  setCachedJuzAyahs,
  setCachedPageBundle,
  setCachedSurahAyahs,
  setCachedSurahList,
} from '../../lib/storage/quranApiCache';

export const MYQURAN_API_BASE_URL = 'https://api.myquran.com/v3';

interface MyQuranSurahItem {
  number: number;
  name: string;
  name_latin?: string;
  number_of_ayahs: number;
  revelation?: string;
}

interface MyQuranAyahItem {
  id: number;
  surah_number: number;
  ayah_number: number;
  arab: string;
  translation?: string;
  audio_url?: string;
  image_url?: string;
  meta?: {
    juz?: number;
    page?: number;
  };
}

interface MyQuranPagination {
  page: number;
  limit: number;
  total: number;
}

interface MyQuranResponse<T> {
  status: boolean;
  data: T;
  meta?: {
    url?: {
      audio?: string;
      image?: string;
    };
  };
  pagination?: MyQuranPagination;
}

function mapAyah(raw: MyQuranAyahItem): Ayah {
  return {
    surahNumber: raw.surah_number,
    ayahNumber: raw.ayah_number,
    globalAyahNumber: raw.id,
    juzNumber: raw.meta?.juz ?? 1,
    pageNumberMsi: raw.meta?.page ?? 1,
    textUthmaniMsi: raw.arab,
    translationId: raw.translation,
    audioUrl: raw.audio_url,
    imageUrl: raw.image_url,
  };
}

async function fetchJson<T>(path: string): Promise<MyQuranResponse<T>> {
  const response = await fetch(`${MYQURAN_API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`MyQuran API mengembalikan HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as MyQuranResponse<T>;
  if (!payload.status) {
    throw new Error('Respons MyQuran API menandakan status gagal.');
  }
  return payload;
}

async function fetchPaginatedAyahs(
  buildPath: (page: number, limit: number) => string,
  extractAyahs: (data: unknown) => MyQuranAyahItem[]
): Promise<{
  ayahs: Ayah[];
  metaUrl?: { audio?: string; image?: string };
}> {
  const limit = 50;
  let page = 1;
  const collected: Ayah[] = [];
  let metaUrl: { audio?: string; image?: string } | undefined;

  while (true) {
    const res = await fetchJson<unknown>(buildPath(page, limit));
    if (page === 1 && res.meta?.url) {
      metaUrl = res.meta.url;
    }

    const batch = extractAyahs(res.data).map(mapAyah);
    collected.push(...batch);

    const pagination = res.pagination;
    if (!pagination || collected.length >= pagination.total || batch.length === 0) {
      break;
    }
    page += 1;
  }

  return { ayahs: collected, metaUrl };
}

export async function fetchSurahList(): Promise<Surah[]> {
  const cached = await getCachedSurahList();
  if (cached && cached.length > 0) {
    return cached;
  }

  try {
    const res = await fetchJson<MyQuranSurahItem[]>('/quran');
    const surahs: Surah[] = res.data.map((item) => ({
      surahNumber: item.number,
      nameArabic: '',
      nameLatin: item.name_latin || item.name,
      totalAyahs: item.number_of_ayahs,
      revelationPlace: item.revelation,
    }));

    await setCachedSurahList(surahs);
    return surahs;
  } catch (apiErr) {
    // Fallback cepat ke data lokal jika koneksi ke API lambat / offline di perangkat baru
    try {
      const localRes = await fetch('/data/surahs.json');
      if (localRes.ok) {
        const localPayload = (await localRes.json()) as MyQuranResponse<MyQuranSurahItem[]>;
        const surahs: Surah[] = localPayload.data.map((item) => ({
          surahNumber: item.number,
          nameArabic: '',
          nameLatin: item.name_latin || item.name,
          totalAyahs: item.number_of_ayahs,
          revelationPlace: item.revelation,
        }));
        await setCachedSurahList(surahs);
        return surahs;
      }
    } catch {
      // Abaikan fallback lokal jika gagal
    }
    throw apiErr;
  }
}

export async function fetchSurahAyahs(surahNumber: number): Promise<Ayah[]> {
  const cached = await getCachedSurahAyahs(surahNumber);
  if (cached && cached.length > 0) {
    return cached;
  }

  const { ayahs } = await fetchPaginatedAyahs(
    (page, limit) => `/quran/${surahNumber}?page=${page}&limit=${limit}`,
    (data) => {
      if (Array.isArray(data)) return data as MyQuranAyahItem[];
      const obj = data as { ayahs?: MyQuranAyahItem[] };
      return Array.isArray(obj?.ayahs) ? obj.ayahs : [];
    }
  );

  ayahs.sort((a, b) => a.ayahNumber - b.ayahNumber);
  await setCachedSurahAyahs(surahNumber, ayahs);
  return ayahs;
}

export async function fetchAyahDetail(
  surahNumber: number,
  ayahNumber: number
): Promise<Ayah> {
  const cached = await getCachedAyahDetail(surahNumber, ayahNumber);
  if (cached) {
    return cached;
  }

  const res = await fetchJson<MyQuranAyahItem>(
    `/quran/${surahNumber}/${ayahNumber}`
  );
  const ayah = mapAyah(res.data);
  await setCachedAyahDetail(ayah);
  return ayah;
}

export async function fetchPageBundle(pageNumber: number): Promise<PageBundle> {
  const cached = await getCachedPageBundle(pageNumber);
  if (cached && cached.ayahs.length > 0) {
    return cached;
  }

  const { ayahs, metaUrl } = await fetchPaginatedAyahs(
    (page, limit) => `/quran/page/${pageNumber}?page=${page}&limit=${limit}`,
    (data) => (Array.isArray(data) ? (data as MyQuranAyahItem[]) : [])
  );

  ayahs.sort((a, b) => a.globalAyahNumber - b.globalAyahNumber);

  const bundle: PageBundle = {
    pageNumber,
    imageUrl: metaUrl?.image,
    audioUrl: metaUrl?.audio,
    ayahs,
  };

  await setCachedPageBundle(bundle);
  return bundle;
}

export async function fetchJuzAyahs(juzNumber: number): Promise<Ayah[]> {
  const cached = await getCachedJuzAyahs(juzNumber);
  if (cached && cached.length > 0) {
    return cached;
  }

  const { ayahs } = await fetchPaginatedAyahs(
    (page, limit) => `/quran/juz/${juzNumber}?page=${page}&limit=${limit}`,
    (data) => (Array.isArray(data) ? (data as MyQuranAyahItem[]) : [])
  );

  ayahs.sort((a, b) => a.globalAyahNumber - b.globalAyahNumber);
  await setCachedJuzAyahs(juzNumber, ayahs);
  return ayahs;
}

export async function fetchRandomAyahFromApi(): Promise<Ayah> {
  const res = await fetchJson<MyQuranAyahItem>('/quran/random');
  const ayah = mapAyah(res.data);
  await setCachedAyahDetail(ayah);
  return ayah;
}

