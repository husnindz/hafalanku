import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRecitation, normalizeArabicForMatching } from '../src/index.ts';
import type { Ayah } from '@hafalanku/quran-types';

const sampleAyahs: Ayah[] = [
  {
    surahNumber: 1,
    ayahNumber: 2,
    globalAyahNumber: 2,
    juzNumber: 1,
    pageNumberMsi: 1,
    textUthmaniMsi: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  },
  {
    surahNumber: 1,
    ayahNumber: 3,
    globalAyahNumber: 3,
    juzNumber: 1,
    pageNumberMsi: 1,
    textUthmaniMsi: 'الرَّحْمَٰنِ الرَّحِيمِ',
  },
];

describe('quran-matcher', () => {
  it('normalizes harakat, tatweel, and alif variants without merging distinct consonants', () => {
    const normalized = normalizeArabicForMatching('إِهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ');
    assert.equal(normalized, 'اهدنا الصراط المستقيم');
  });

  it('evaluates matching recitation as matched', () => {
    const result = evaluateRecitation({
      recognizedTranscript: 'الحمد لله رب العالمين الرحمن الرحيم',
      expectedAyahs: sampleAyahs,
      confidence: 0.9,
    });
    assert.equal(result.status, 'matched');
    assert.equal(result.matchedWordCount, 6);
    assert.equal(result.missedCount, 0);
  });

  it('identifies missed words when a word is skipped', () => {
    const result = evaluateRecitation({
      recognizedTranscript: 'الحمد لله العالمين الرحمن الرحيم',
      expectedAyahs: sampleAyahs,
      confidence: 0.85,
    });
    assert.equal(result.missedCount, 1);
    assert.ok(result.wordAlignments.some((w) => w.status === 'missed'));
  });

  it('marks low confidence as unratable instead of wrong', () => {
    const result = evaluateRecitation({
      recognizedTranscript: 'الحمد',
      expectedAyahs: sampleAyahs,
      confidence: 0.25,
      confidenceThreshold: 0.45,
    });
    assert.equal(result.status, 'unratable');
    assert.ok(result.wordAlignments.every((w) => w.status === 'uncertain'));
  });
});

