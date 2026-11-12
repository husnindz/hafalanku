/**
 * Normalisasi teks Arab Al-Qur'an secara terkontrol untuk pencocokan hasil ASR.
 * Menghapus harakat, tanda waqaf, dan tatweel, serta menyamakan varian Alif
 * tanpa menghapus perbedaan huruf konsonan yang bermakna.
 */
const DIACRITICS_AND_MARKS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_REGEX = /\u0640/g;
const NON_ARABIC_WORD_CHARS_REGEX = /[^\u0621-\u064A\u0671\s]/g;

export function normalizeArabicForMatching(input: string): string {
  return input
    .replace(TATWEEL_REGEX, '')
    .replace(DIACRITICS_AND_MARKS_REGEX, '')
    // Samakan varian Alif (Wasl, Madda, Hamza di atas/bawah Alif) menjadi Alif dasar
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    // Samakan Alif Maqsurah dan Ya di akhir hanya bila diperlukan; pertahankan huruf lain tetap distingtif
    .replace(/\u0649/g, '\u064A')
    .replace(NON_ARABIC_WORD_CHARS_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeArabicWords(input: string): string[] {
  const normalized = normalizeArabicForMatching(input);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

