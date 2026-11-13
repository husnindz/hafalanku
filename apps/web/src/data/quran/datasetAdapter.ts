import type {
  Ayah,
  JuzRange,
  PageBundle,
  QuranDataset,
  Surah,
} from '@hafalanku/quran-types';
import {
  fetchJuzAyahs,
  fetchPageBundle,
  fetchRandomAyahFromApi,
  fetchSurahAyahs,
  fetchSurahList,
} from './myQuranClient';

let cachedDataset: QuranDataset | null = null;
let loadPromise: Promise<QuranDataset> | null = null;

const ALL_JUZ_RANGES: JuzRange[] = Array.from({ length: 30 }, (_, i) => ({
  juzNumber: i + 1,
  startSurah: 0,
  startAyah: 0,
  endSurah: 0,
  endAyah: 0,
}));

export async function loadQuranDataset(): Promise<QuranDataset> {
  if (cachedDataset) return cachedDataset;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const surahs = await fetchSurahList();
      const dataset: QuranDataset = {
        manifest: {
          version: 'myquran-v3',
          sourceName: 'MyQuran API v3 (https://api.myquran.com/v3)',
          fetchedAt: new Date().toISOString(),
          checksumSha256: 'live-api-indexeddb',
          mushafStandard: 'MSI-LPMQ',
          isFixture: false,
          notes:
            'Data ayat, halaman (1–604), audio, dan gambar halaman bersumber dari MyQuran API v3 dengan cache IndexedDB. Kesesuaian tata letak halaman dengan cetakan Mushaf Standar Indonesia (MSI) perlu diverifikasi berkala.',
        },
        surahs,
        ayahs: [],
        juzRanges: ALL_JUZ_RANGES,
        audioAssets: [],
      };
      cachedDataset = dataset;
      return dataset;
    } catch {
      const res = await fetch('/data/quran-msi-fixture.json');
      if (!res.ok) {
        throw new Error(
          'Gagal terhubung ke MyQuran API v3 dan dataset cadangan lokal tidak tersedia.'
        );
      }
      const fixture = (await res.json()) as QuranDataset;
      cachedDataset = fixture;
      return fixture;
    }
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export function resetCachedDatasetInMemory(): void {
  cachedDataset = null;
}

export function getSurahMap(dataset: QuranDataset): Map<number, Surah> {
  return new Map(dataset.surahs.map((s) => [s.surahNumber, s]));
}

export function getAvailableJuzNumbers(dataset: QuranDataset): number[] {
  if (!dataset.manifest.isFixture) {
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }
  const set = new Set(dataset.ayahs.map((a) => a.juzNumber));
  return Array.from(set).sort((a, b) => a - b);
}

export function getAvailablePagesMsi(dataset: QuranDataset): number[] {
  if (!dataset.manifest.isFixture) {
    return Array.from({ length: 604 }, (_, i) => i + 1);
  }
  const set = new Set(dataset.ayahs.map((a) => a.pageNumberMsi));
  return Array.from(set).sort((a, b) => a - b);
}

export async function getSurahAyahsData(
  dataset: QuranDataset,
  surahNumber: number
): Promise<Ayah[]> {
  if (!dataset.manifest.isFixture) {
    return fetchSurahAyahs(surahNumber);
  }
  return dataset.ayahs
    .filter((a) => a.surahNumber === surahNumber)
    .sort((a, b) => a.ayahNumber - b.ayahNumber);
}

export async function getPageBundleData(
  dataset: QuranDataset,
  pageNumber: number
): Promise<PageBundle> {
  if (!dataset.manifest.isFixture) {
    return fetchPageBundle(pageNumber);
  }
  const ayahs = dataset.ayahs
    .filter((a) => a.pageNumberMsi === pageNumber)
    .sort((a, b) => a.globalAyahNumber - b.globalAyahNumber);
  return {
    pageNumber,
    ayahs,
  };
}

export interface RandomPromptSelection {
  promptAyah: Ayah;
  expectedContinuation: Ayah[];
  isCappedByScope: boolean;
}

function buildSelectionFromScopedList(
  scopedAyahs: Ayah[],
  requestedContinuationCount: number,
  preferredGlobalNumber?: number
): RandomPromptSelection | null {
  if (scopedAyahs.length < 2) return null;

  const validPromptIndices: number[] = [];
  for (let i = 0; i < scopedAyahs.length - 1; i++) {
    const current = scopedAyahs[i]!;
    const next = scopedAyahs[i + 1]!;
    if (next.globalAyahNumber === current.globalAyahNumber + 1) {
      validPromptIndices.push(i);
    }
  }

  if (validPromptIndices.length === 0) return null;

  let pickedIdx =
    validPromptIndices[Math.floor(Math.random() * validPromptIndices.length)]!;

  if (preferredGlobalNumber !== undefined) {
    const found = validPromptIndices.find(
      (idx) => scopedAyahs[idx]?.globalAyahNumber === preferredGlobalNumber
    );
    if (found !== undefined) {
      pickedIdx = found;
    }
  }

  const promptAyah = scopedAyahs[pickedIdx]!;
  const expectedContinuation: Ayah[] = [];
  let prevGlobal = promptAyah.globalAyahNumber;

  for (
    let i = pickedIdx + 1;
    i < scopedAyahs.length &&
    expectedContinuation.length < requestedContinuationCount;
    i++
  ) {
    const candidate = scopedAyahs[i]!;
    if (candidate.globalAyahNumber !== prevGlobal + 1) {
      break;
    }
    expectedContinuation.push(candidate);
    prevGlobal = candidate.globalAyahNumber;
  }

  return {
    promptAyah,
    expectedContinuation,
    isCappedByScope: expectedContinuation.length < requestedContinuationCount,
  };
}

/**
 * Memilih ayat pemantik acak dalam cakupan [juzStart..juzEnd] dari MyQuran API v3
 * (atau fixture jika offline fallback) yang memiliki lanjutan ayat valid.
 */
export async function pickRandomPromptWithContinuationAsync(
  dataset: QuranDataset,
  juzStart: number,
  juzEnd: number,
  requestedContinuationCount: number
): Promise<RandomPromptSelection | null> {
  if (dataset.manifest.isFixture) {
    const scopedAyahs = dataset.ayahs
      .filter((a) => a.juzNumber >= juzStart && a.juzNumber <= juzEnd)
      .sort((a, b) => a.globalAyahNumber - b.globalAyahNumber);
    return buildSelectionFromScopedList(
      scopedAyahs,
      requestedContinuationCount
    );
  }

  let targetJuz =
    juzStart + Math.floor(Math.random() * (juzEnd - juzStart + 1));
  let preferredGlobal: number | undefined;

  // Untuk cakupan penuh 1-30, manfaatkan endpoint /quran/random terlebih dahulu
  if (juzStart === 1 && juzEnd === 30) {
    try {
      const randomAyah = await fetchRandomAyahFromApi();
      if (randomAyah.juzNumber >= 1 && randomAyah.juzNumber <= 30) {
        targetJuz = randomAyah.juzNumber;
        preferredGlobal = randomAyah.globalAyahNumber;
      }
    } catch {
      // Lanjut dengan pemilihan acak berbasis juz jika /quran/random gagal
    }
  }

  const juzAyahs = await fetchJuzAyahs(targetJuz);
  let combined = [...juzAyahs];

  // Jika ada juz berikutnya dalam cakupan, muat juga agar lanjutan di akhir juz tidak terputus
  if (targetJuz < juzEnd) {
    try {
      const nextJuzAyahs = await fetchJuzAyahs(targetJuz + 1);
      combined = [...combined, ...nextJuzAyahs];
    } catch {
      // Tetap lanjut dengan juz saat ini
    }
  }

  combined.sort((a, b) => a.globalAyahNumber - b.globalAyahNumber);
  return buildSelectionFromScopedList(
    combined,
    requestedContinuationCount,
    preferredGlobal
  );
}

/**
 * Memilih ayat pemantik acak dari satu surah tertentu.
 */
export async function pickRandomPromptFromSurahAsync(
  dataset: QuranDataset,
  surahNumber: number,
  requestedContinuationCount: number
): Promise<RandomPromptSelection | null> {
  const ayahs = await getSurahAyahsData(dataset, surahNumber);
  if (ayahs.length === 0) return null;
  const sorted = [...ayahs].sort((a, b) => a.ayahNumber - b.ayahNumber);
  return buildSelectionFromScopedList(sorted, requestedContinuationCount);
}
