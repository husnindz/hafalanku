import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { QuranDataset } from '@hafalanku/quran-types';

/**
 * Validasi konsistensi dataset MSI (surah, ayat, halaman MSI, batas juz, dan checksum).
 * Dijalankan secara lokal sebelum build/deploy; tidak pernah dibundle ke frontend.
 */
function main(): void {
  const targetPath =
    process.argv[2] ??
    resolve(process.cwd(), '../../apps/web/public/data/quran-msi-fixture.json');

  const raw = readFileSync(targetPath, 'utf-8');
  const dataset = JSON.parse(raw) as QuranDataset;

  const errors: string[] = [];

  if (!dataset.manifest?.version || !dataset.manifest?.mushafStandard) {
    errors.push('Manifest dataset tidak lengkap.');
  }
  if (!Array.isArray(dataset.surahs) || dataset.surahs.length === 0) {
    errors.push('Daftar surah kosong.');
  }
  if (!Array.isArray(dataset.ayahs) || dataset.ayahs.length === 0) {
    errors.push('Daftar ayat kosong.');
  }
  if (!Array.isArray(dataset.juzRanges) || dataset.juzRanges.length === 0) {
    errors.push('Daftar juzRanges kosong.');
  }

  const surahNumbers = new Set(dataset.surahs.map((s) => s.surahNumber));
  for (const ayah of dataset.ayahs) {
    if (!surahNumbers.has(ayah.surahNumber)) {
      errors.push(`Ayat ${ayah.surahNumber}:${ayah.ayahNumber} merujuk surah tidak dikenal.`);
    }
    if (!ayah.textUthmaniMsi.trim()) {
      errors.push(`Teks Arab kosong pada ${ayah.surahNumber}:${ayah.ayahNumber}.`);
    }
    if (ayah.pageNumberMsi < 1 || ayah.pageNumberMsi > 604) {
      errors.push(`Nomor halaman MSI tidak valid (${ayah.pageNumberMsi}) pada ${ayah.surahNumber}:${ayah.ayahNumber}.`);
    }
    if (ayah.juzNumber < 1 || ayah.juzNumber > 30) {
      errors.push(`Nomor juz tidak valid (${ayah.juzNumber}) pada ${ayah.surahNumber}:${ayah.ayahNumber}.`);
    }
  }

  const contentHash = createHash('sha256')
    .update(JSON.stringify({ surahs: dataset.surahs, ayahs: dataset.ayahs, juzRanges: dataset.juzRanges }))
    .digest('hex');

  if (errors.length > 0) {
    console.error('Validasi dataset MSI GAGAL:');
    for (const err of errors) {
      console.error(` - ${err}`);
    }
    process.exit(1);
  }

  console.log('Validasi dataset MSI BERHASIL:');
  console.log(` - File: ${targetPath}`);
  console.log(` - Versi: ${dataset.manifest.version} (isFixture=${String(dataset.manifest.isFixture)})`);
  console.log(` - Surah: ${dataset.surahs.length}, Ayat: ${dataset.ayahs.length}, Juz: ${dataset.juzRanges.length}`);
  console.log(` - Content SHA-256: ${contentHash}`);
}

main();

