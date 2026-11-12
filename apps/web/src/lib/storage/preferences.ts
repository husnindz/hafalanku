import type { LastReadPosition, UserPreferences } from '@hafalanku/quran-types';

const PREFERENCES_KEY = 'hafalanku_preferences_v1';
const LAST_READ_KEY = 'hafalanku_last_read_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  arabicFontSizePx: 30,
  showTranslation: true,
  showPageImage: true,
  showPageText: true,
  showPageAudio: true,
  darkMode: false,
  defaultTargetAyahCount: 2,
  asrConfidenceThreshold: 0.45,
};

export function loadPreferences(): UserPreferences {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    const showPageImage =
      typeof parsed.showPageImage === 'boolean'
        ? parsed.showPageImage
        : DEFAULT_PREFERENCES.showPageImage;
    let showPageText =
      typeof parsed.showPageText === 'boolean'
        ? parsed.showPageText
        : DEFAULT_PREFERENCES.showPageText;
    // Pastikan minimal salah satu antara gambar atau tulisan tetap tampil
    if (!showPageImage && !showPageText) {
      showPageText = true;
    }

    return {
      arabicFontSizePx:
        typeof parsed.arabicFontSizePx === 'number'
          ? Math.min(44, Math.max(22, parsed.arabicFontSizePx))
          : DEFAULT_PREFERENCES.arabicFontSizePx,
      showTranslation:
        typeof parsed.showTranslation === 'boolean'
          ? parsed.showTranslation
          : DEFAULT_PREFERENCES.showTranslation,
      showPageImage,
      showPageText,
      showPageAudio:
        typeof parsed.showPageAudio === 'boolean'
          ? parsed.showPageAudio
          : DEFAULT_PREFERENCES.showPageAudio,
      darkMode:
        typeof parsed.darkMode === 'boolean'
          ? parsed.darkMode
          : DEFAULT_PREFERENCES.darkMode,
      defaultTargetAyahCount:
        typeof parsed.defaultTargetAyahCount === 'number'
          ? Math.min(5, Math.max(1, parsed.defaultTargetAyahCount))
          : DEFAULT_PREFERENCES.defaultTargetAyahCount,
      asrConfidenceThreshold:
        typeof parsed.asrConfidenceThreshold === 'number'
          ? Math.min(0.85, Math.max(0.2, parsed.asrConfidenceThreshold))
          : DEFAULT_PREFERENCES.asrConfidenceThreshold,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    // Abaikan jika storage diblokir pada mode privat browser
  }
}

export function loadLastRead(): LastReadPosition | null {
  try {
    const raw = window.localStorage.getItem(LAST_READ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastReadPosition>;
    if (
      (parsed.mode !== 'page' && parsed.mode !== 'ayah') ||
      typeof parsed.page !== 'number' ||
      typeof parsed.surah !== 'number'
    ) {
      return null;
    }
    return {
      mode: parsed.mode,
      page: parsed.page,
      surah: parsed.surah,
      ayah: typeof parsed.ayah === 'number' ? parsed.ayah : undefined,
      surahName:
        typeof parsed.surahName === 'string' ? parsed.surahName : undefined,
      updatedAt:
        typeof parsed.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveLastRead(pos: LastReadPosition): void {
  try {
    window.localStorage.setItem(LAST_READ_KEY, JSON.stringify(pos));
  } catch {
    // Abaikan jika storage diblokir
  }
}

