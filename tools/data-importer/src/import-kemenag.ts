/**
 * Adapter importer resmi untuk API Qur'an Kemenag / LPMQ.
 * Memerlukan KEMENAG_API_TOKEN di environment lokal setelah permohonan akses disetujui LPMQ.
 * Token TIDAK PERNAH boleh masuk ke repository Git atau bundle frontend.
 */
async function main(): Promise<void> {
  const token = process.env.KEMENAG_API_TOKEN;
  const baseUrl =
    process.env.KEMENAG_API_BASE_URL ?? 'https://quran-api.lpmqkemenag.id/api/v1';

  if (!token) {
    console.error(
      [
        'KEMENAG_API_TOKEN belum disetel di environment lokal.',
        'Ajukan akses API resmi melalui https://quran-api.lpmqkemenag.id/ terlebih dahulu.',
        'Untuk pengembangan lokal saat ini, aplikasi menggunakan dataset fixture berlabel jelas.',
      ].join('\n')
    );
    process.exit(1);
  }

  console.log(`Menghubungi endpoint resmi LPMQ: ${baseUrl}`);
  const response = await fetch(`${baseUrl}/surah`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Gagal mengambil data dari API Kemenag (HTTP ${response.status}).`);
    process.exit(1);
  }

  const payload = await response.json();
  console.log(
    'Berhasil terhubung ke API Kemenag. Sesuaikan pemetaan field surah/ayat/halaman MSI sebelum menulis ke apps/web/public/data/.',
    Array.isArray(payload) ? `Total item: ${payload.length}` : 'Payload diterima.'
  );
}

main().catch((err: unknown) => {
  console.error('Terjadi kesalahan saat menjalankan importer Kemenag:', err);
  process.exit(1);
});

