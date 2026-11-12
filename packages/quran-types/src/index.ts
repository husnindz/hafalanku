export interface Surah {
  surahNumber: number;
  nameArabic: string;
  nameLatin: string;
  totalAyahs: number;
  revelationPlace?: string;
}

export interface Ayah {
  surahNumber: number;
  ayahNumber: number;
  globalAyahNumber: number;
  juzNumber: number;
  pageNumberMsi: number;
  textUthmaniMsi: string;
  translationId?: string;
  audioUrl?: string;
  imageUrl?: string;
  audioAssetId?: string;
}

export interface PageBundle {
  pageNumber: number;
  imageUrl?: string;
  audioUrl?: string;
  ayahs: Ayah[];
}

export interface JuzRange {
  juzNumber: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

export interface AudioAsset {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  qariId: string;
  qariName: string;
  audioUrlOrPath: string;
  sourceName: string;
  licenseOrPermissionReference: string;
}

export interface DatasetManifest {
  version: string;
  sourceName: string;
  fetchedAt: string;
  checksumSha256: string;
  mushafStandard: 'MSI-LPMQ';
  isFixture: boolean;
  notes: string;
}

export interface QuranDataset {
  manifest: DatasetManifest;
  surahs: Surah[];
  ayahs: Ayah[];
  juzRanges: JuzRange[];
  audioAssets: AudioAsset[];
}

export interface MetadataQuizConfig {
  guessSurah: boolean;
  guessPage: boolean;
  guessAyahNumber: boolean;
}

export interface MetadataQuizAnswers {
  surahNumber?: number;
  pageNumberMsi?: number;
  ayahNumber?: number;
  skipped?: boolean;
}

export interface MetadataQuizResult {
  guessSurah?: {
    expected: number;
    expectedLabel: string;
    actual?: number;
    actualLabel?: string;
    isCorrect: boolean;
  };
  guessPage?: {
    expected: number;
    actual?: number;
    isCorrect: boolean;
  };
  guessAyahNumber?: {
    expected: number;
    actual?: number;
    isCorrect: boolean;
  };
  totalAnswered: number;
  totalCorrect: number;
}

export type WordMatchStatus =
  | 'matched'
  | 'missed'
  | 'substituted'
  | 'extra'
  | 'uncertain';

export interface WordAlignmentItem {
  expectedWord?: string;
  recognizedWord?: string;
  status: WordMatchStatus;
  ayahNumber?: number;
  surahNumber?: number;
}

export type EvaluationStatus =
  | 'matched'
  | 'partial'
  | 'mismatch'
  | 'unratable';

export interface RecitationEvaluationSummary {
  status: EvaluationStatus;
  confidence: number;
  confidenceThreshold: number;
  recognizedTranscript: string;
  normalizedTranscript: string;
  expectedAyahs: Array<{
    surahNumber: number;
    ayahNumber: number;
    textUthmaniMsi: string;
  }>;
  wordAlignments: WordAlignmentItem[];
  matchedWordCount: number;
  expectedWordCount: number;
  missedCount: number;
  substitutedCount: number;
  extraCount: number;
  disclaimer: string;
}

export interface PracticeSessionLocal {
  id: string;
  createdAt: string;
  selectedJuzStart: number;
  selectedJuzEnd: number;
  promptSurah: number;
  promptAyah: number;
  targetAyahCount: number;
  recognizedTranscript?: string;
  evaluationSummary?: RecitationEvaluationSummary;
  metadataAnswers?: MetadataQuizAnswers;
  metadataResult?: MetadataQuizResult;
  isFixtureData: boolean;
}

export interface UserPreferences {
  arabicFontSizePx: number;
  showTranslation: boolean;
  showPageImage: boolean;
  showPageText: boolean;
  showPageAudio: boolean;
  darkMode: boolean;
  defaultTargetAyahCount: number;
  asrConfidenceThreshold: number;
}

export interface LastReadPosition {
  mode: 'page' | 'ayah';
  page: number;
  surah: number;
  ayah?: number;
  surahName?: string;
  updatedAt: string;
}

