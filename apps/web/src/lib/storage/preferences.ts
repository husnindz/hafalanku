import type { UserPreferences } from '@hafalanku/quran-types';

const PREFERENCES_KEY = 'hafalanku_preferences_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  arabicFontSizePx: 30,
  showTranslation: true,
  defaultTargetAyahCount: 2,
  asrConfidenceThreshold: 0.45,
};

export function loadPreferences(): UserPreferences {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      arabicFontSizePx:
        typeof parsed.arabicFontSizePx === 'number'
          ? Math.min(44, Math.max(22, parsed.arabicFontSizePx))
          : DEFAULT_PREFERENCES.arabicFontSizePx,
      showTranslation:
        typeof parsed.showTranslation === 'boolean'
          ? parsed.showTranslation
          : DEFAULT_PREFERENCES.showTranslation,
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

