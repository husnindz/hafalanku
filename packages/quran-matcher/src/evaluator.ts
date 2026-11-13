import type {
  Ayah,
  EvaluationStatus,
  RecitationEvaluationSummary,
  WordAlignmentItem,
} from '@hafalanku/quran-types';
import { normalizeArabicForMatching, tokenizeArabicWords } from './normalizer.ts';

export interface EvaluateRecitationInput {
  recognizedTranscript: string;
  expectedAyahs: Ayah[];
  confidence: number;
  confidenceThreshold?: number;
}

interface ExpectedToken {
  normalizedWord: string;
  displayWord: string;
  surahNumber: number;
  ayahNumber: number;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.45;
const EVALUATION_DISCLAIMER =
  'Hasil ini adalah estimasi pencocokan suara lokal (ASR), bukan penilaian tajwid, makhraj, atau pengganti tashih guru.';

function buildExpectedTokens(expectedAyahs: Ayah[]): ExpectedToken[] {
  const tokens: ExpectedToken[] = [];
  for (const ayah of expectedAyahs) {
    const rawWords = ayah.textUthmaniMsi.trim().split(/\s+/).filter(Boolean);
    for (const rawWord of rawWords) {
      const normalized = normalizeArabicForMatching(rawWord);
      if (!normalized) continue;
      for (const part of normalized.split(' ')) {
        if (!part) continue;
        tokens.push({
          normalizedWord: part,
          displayWord: rawWord,
          surahNumber: ayah.surahNumber,
          ayahNumber: ayah.ayahNumber,
        });
      }
    }
  }
  return tokens;
}

/**
 * Alignment berbasis Levenshtein tingkat kata agar urutan ayat terlewat,
 * tertukar, atau tambahan dapat teridentifikasi dengan jelas.
 */
function alignWords(
  expected: ExpectedToken[],
  recognized: string[]
): WordAlignmentItem[] {
  const m = expected.length;
  const n = recognized.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array<number>(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0]![j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = expected[i - 1]!.normalizedWord === recognized[j - 1]! ? 0 : 1;
      const del = dp[i - 1]![j]! + 1;
      const ins = dp[i]![j - 1]! + 1;
      const sub = dp[i - 1]![j - 1]! + cost;
      dp[i]![j] = Math.min(del, ins, sub);
    }
  }

  const aligned: WordAlignmentItem[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      expected[i - 1]!.normalizedWord === recognized[j - 1]!
    ) {
      const exp = expected[i - 1]!;
      aligned.push({
        expectedWord: exp.displayWord,
        recognizedWord: recognized[j - 1],
        status: 'matched',
        surahNumber: exp.surahNumber,
        ayahNumber: exp.ayahNumber,
      });
      i--;
      j--;
    } else if (
      i > 0 &&
      j > 0 &&
      dp[i]![j]! === dp[i - 1]![j - 1]! + 1
    ) {
      const exp = expected[i - 1]!;
      aligned.push({
        expectedWord: exp.displayWord,
        recognizedWord: recognized[j - 1],
        status: 'substituted',
        surahNumber: exp.surahNumber,
        ayahNumber: exp.ayahNumber,
      });
      i--;
      j--;
    } else if (i > 0 && dp[i]![j]! === dp[i - 1]![j]! + 1) {
      const exp = expected[i - 1]!;
      aligned.push({
        expectedWord: exp.displayWord,
        status: 'missed',
        surahNumber: exp.surahNumber,
        ayahNumber: exp.ayahNumber,
      });
      i--;
    } else {
      aligned.push({
        recognizedWord: recognized[j - 1],
        status: 'extra',
      });
      j--;
    }
  }

  return aligned.reverse();
}

export function evaluateRecitation(
  input: EvaluateRecitationInput
): RecitationEvaluationSummary {
  const confidenceThreshold =
    input.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const normalizedTranscript = normalizeArabicForMatching(
    input.recognizedTranscript
  );
  const expectedTokens = buildExpectedTokens(input.expectedAyahs);
  const recognizedWords = tokenizeArabicWords(input.recognizedTranscript);

  const expectedSummary = input.expectedAyahs.map((a) => ({
    surahNumber: a.surahNumber,
    ayahNumber: a.ayahNumber,
    textUthmaniMsi: a.textUthmaniMsi,
  }));

  // Jika confidence di bawah ambang atau tidak ada kata yang cocok:
  // Nilai sebagai jawaban salah (mismatch) dengan seluruh kata target berstatus missed.
  if (input.confidence < confidenceThreshold || recognizedWords.length === 0) {
    const totalWords = expectedTokens.length;
    return {
      status: 'mismatch',
      confidence: input.confidence,
      confidenceThreshold,
      recognizedTranscript: input.recognizedTranscript,
      normalizedTranscript,
      expectedAyahs: expectedSummary,
      wordAlignments: expectedTokens.map((token) => ({
        expectedWord: token.displayWord,
        status: 'missed',
        surahNumber: token.surahNumber,
        ayahNumber: token.ayahNumber,
      })),
      matchedWordCount: 0,
      expectedWordCount: totalWords,
      missedCount: totalWords,
      substitutedCount: 0,
      extraCount: 0,
      disclaimer: EVALUATION_DISCLAIMER,
    };
  }

  const wordAlignments = alignWords(expectedTokens, recognizedWords);
  let matchedWordCount = 0;
  let missedCount = 0;
  let substitutedCount = 0;
  let extraCount = 0;

  for (const item of wordAlignments) {
    if (item.status === 'matched') matchedWordCount++;
    else if (item.status === 'missed') missedCount++;
    else if (item.status === 'substituted') substitutedCount++;
    else if (item.status === 'extra') extraCount++;
  }

  const matchRatio =
    expectedTokens.length > 0 ? matchedWordCount / expectedTokens.length : 0;

  let status: EvaluationStatus = 'mismatch';
  if (matchRatio >= 0.85 && missedCount <= 1 && substitutedCount <= 1) {
    status = 'matched';
  } else if (matchRatio >= 0.4) {
    status = 'partial';
  }

  return {
    status,
    confidence: input.confidence,
    confidenceThreshold,
    recognizedTranscript: input.recognizedTranscript,
    normalizedTranscript,
    expectedAyahs: expectedSummary,
    wordAlignments,
    matchedWordCount,
    expectedWordCount: expectedTokens.length,
    missedCount,
    substitutedCount,
    extraCount,
    disclaimer: EVALUATION_DISCLAIMER,
  };
}

