import type { LastReadPosition, UserPreferences } from '@hafalanku/quran-types';

const PREFERENCES_KEY = 'hafalanku_preferences_v1';
const LAST_READ_KEY = 'hafalanku_last_read_v1';
const LAST_READER_STATE_KEY = 'hafalanku_last_reader_state_v1';
const TEST_CONFIG_KEY = 'hafalanku_test_config_v1';

export interface LastReaderState {
  mode: 'page' | 'ayah';
  page: number;
  surah: number;
}

export interface MemorizationTestConfig {
  scopeMode: 'juz' | 'surah';
  selectedSurah: number;
  juzStart: number;
  juzEnd: number;
  targetAyahCount: number;
  quizConfig: {
    guessSurah: boolean;
    guessPage: boolean;
    guessAyahNumber: boolean;
  };
}

export const DEFAULT_TEST_CONFIG: MemorizationTestConfig = {
  scopeMode: 'juz',
  selectedSurah: 1,
  juzStart: 1,
  juzEnd: 30,
  targetAyahCount: 2,
  quizConfig: {
    guessSurah: true,
    guessPage: true,
    guessAyahNumber: true,
  },
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  arabicFontSizePx: 30,
  showTranslation: true,
  showPageImage: true,
  showPageText: true,
  showPageAudio: true,
  darkMode: false,
  defaultTargetAyahCount: 2,
  asrConfidenceThreshold: 0.45,
  defaultReaderMode: 'page',
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
      defaultReaderMode:
        parsed.defaultReaderMode === 'ayah' ? 'ayah' : 'page',
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

export function loadLastReaderState(): LastReaderState {
  try {
    const raw = window.localStorage.getItem(LAST_READER_STATE_KEY);
    if (!raw) {
      const lr = loadLastRead();
      return {
        mode: lr?.mode ?? 'page',
        page: lr?.page ?? 1,
        surah: lr?.surah ?? 1,
      };
    }
    const parsed = JSON.parse(raw) as Partial<LastReaderState>;
    return {
      mode: parsed.mode === 'ayah' ? 'ayah' : 'page',
      page: typeof parsed.page === 'number' && parsed.page >= 1 && parsed.page <= 604 ? parsed.page : 1,
      surah: typeof parsed.surah === 'number' && parsed.surah >= 1 && parsed.surah <= 114 ? parsed.surah : 1,
    };
  } catch {
    return { mode: 'page', page: 1, surah: 1 };
  }
}

export function saveLastReaderState(state: Partial<LastReaderState>): void {
  try {
    const current = loadLastReaderState();
    const updated: LastReaderState = { ...current, ...state };
    window.localStorage.setItem(LAST_READER_STATE_KEY, JSON.stringify(updated));
  } catch {
    // Abaikan jika storage diblokir
  }
}

export function loadTestConfig(): MemorizationTestConfig {
  try {
    const raw = window.localStorage.getItem(TEST_CONFIG_KEY);
    if (!raw) return DEFAULT_TEST_CONFIG;
    const parsed = JSON.parse(raw) as Partial<MemorizationTestConfig>;
    return {
      scopeMode: parsed.scopeMode === 'surah' ? 'surah' : 'juz',
      selectedSurah:
        typeof parsed.selectedSurah === 'number' && parsed.selectedSurah >= 1 && parsed.selectedSurah <= 114
          ? parsed.selectedSurah
          : DEFAULT_TEST_CONFIG.selectedSurah,
      juzStart:
        typeof parsed.juzStart === 'number' && parsed.juzStart >= 1 && parsed.juzStart <= 30
          ? parsed.juzStart
          : DEFAULT_TEST_CONFIG.juzStart,
      juzEnd:
        typeof parsed.juzEnd === 'number' && parsed.juzEnd >= 1 && parsed.juzEnd <= 30
          ? parsed.juzEnd
          : DEFAULT_TEST_CONFIG.juzEnd,
      targetAyahCount:
        typeof parsed.targetAyahCount === 'number' && parsed.targetAyahCount >= 1 && parsed.targetAyahCount <= 5
          ? parsed.targetAyahCount
          : DEFAULT_TEST_CONFIG.targetAyahCount,
      quizConfig: {
        guessSurah:
          typeof parsed.quizConfig?.guessSurah === 'boolean'
            ? parsed.quizConfig.guessSurah
            : DEFAULT_TEST_CONFIG.quizConfig.guessSurah,
        guessPage:
          typeof parsed.quizConfig?.guessPage === 'boolean'
            ? parsed.quizConfig.guessPage
            : DEFAULT_TEST_CONFIG.quizConfig.guessPage,
        guessAyahNumber:
          typeof parsed.quizConfig?.guessAyahNumber === 'boolean'
            ? parsed.quizConfig.guessAyahNumber
            : DEFAULT_TEST_CONFIG.quizConfig.guessAyahNumber,
      },
    };
  } catch {
    return DEFAULT_TEST_CONFIG;
  }
}

export function saveTestConfig(config: Partial<MemorizationTestConfig>): void {
  try {
    const current = loadTestConfig();
    const updated: MemorizationTestConfig = {
      ...current,
      ...config,
      quizConfig: {
        ...current.quizConfig,
        ...(config.quizConfig ?? {}),
      },
    };
    window.localStorage.setItem(TEST_CONFIG_KEY, JSON.stringify(updated));
  } catch {
    // Abaikan jika storage diblokir
  }
}

