# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- **Monorepo:** npm workspaces (`apps/web`, `apps/api`, `packages/*`, `tools/*`).
- **Frontend MVP (`apps/web`):** React + TypeScript (`.tsx`/`.ts`) dengan Vite, Tailwind CSS, React Router, Web Worker, ONNX Runtime Web (`onnxruntime-web`), dan IndexedDB/Cache Storage.
- **Backend Fase Lanjutan (`apps/api`):** Kerangka REST API PHP 8.x OOP + MariaDB/PDO (tidak diaktifkan pada MVP statis; disiapkan agar siap untuk Rumahweb Shared Hosting Entry tanpa Node.js/SSH).
- **Shared Packages:** `packages/quran-types`, `packages/quran-matcher`, `packages/asr`.
- **Tools Lokal (`tools/data-importer`):** Adapter & validator dataset API Qur'an Kemenag / LPMQ (hanya dijalankan secara lokal, tidak ikut dibundle ke `dist/`).

## Users

- **Penghafal Al-Qur'an, santri, dan peserta tahfiz:** membutuhkan latihan murojaah mandiri untuk menguji kekuatan sambung ayat berdasarkan juz atau rentang juz.
- **Pengajar dan pengguna murojaah rutin:** membutuhkan pembaca Al-Qur'an yang bersih per halaman maupun per ayat serta kuis metadata (nama surah, nomor halaman mushaf, nomor ayat).

## Product Purpose

Hafalanku membantu pengguna menguji dan mengulang hafalan Al-Qur'an melalui **tes sambung ayat** berbasis audio pemantik dan pengenalan suara (ASR) lokal di browser, kuis metadata Mushaf Standar Indonesia (MSI), serta **pembaca Al-Qur'an** dalam mode per halaman dan per ayat.

Keberhasilan MVP diukur dari alur tes tanpa login yang akurat terhadap cakupan juz, pemrosesan audio/ASR 100% lokal di perangkat pengguna, serta build statis ringan yang siap diunggah ke Rumahweb Shared Hosting Entry (batas storage 1 GB, tanpa Node.js/SSH).

## Positioning

- **Privasi & tanpa biaya API AI:** seluruh rekaman suara dan inferensi ASR berjalan secara lokal di browser (WebAssembly / ONNX Runtime Web di Web Worker); tidak ada raw audio atau transkripsi yang dikirim ke server.
- **Satu acuan mushaf yang konsisten:** seluruh penomoran surah, ayat, batas juz, dan pemetaan halaman mengacu pada Mushaf Standar Indonesia (MSI / LPMQ Kemenag RI).
- **Jujur terhadap batas AI:** hasil ASR adalah estimasi bantuan pemeriksaan hafalan (membedakan cocok, terlewat, tertukar, dan confidence rendah / tidak dapat dinilai), bukan penilaian tajwid, makhraj, atau pengganti guru/tashih.

## Operating Context

- **Penggunaan utama di ponsel (mobile-first) dan desktop:** pengguna mendengarkan ayat pemantik, merekam bacaan lanjutan via mikrofon, menjawab kuis metadata opsional, lalu meninjau evaluasi.
- **Lingkungan hosting target:** Rumahweb Shared Hosting Entry (file statis di `public_html/`, `.htaccess` untuk fallback SPA, HTTPS aktif, kapasitas 1 GB).

## Capabilities and Constraints

- **Fitur MVP:** Beranda & navigasi ringkas, Tes Hafalan (pemilihan 1 juz atau rentang juz 1–30, ayat pemantik acak yang punya lanjutan valid, pemutaran audio pemantik, perekaman mikrofon lokal, ASR lokal + matcher, 3 checkbox kuis metadata independen: nama surah, halaman MSI, nomor ayat, halaman hasil & jawaban referensi), Pembaca Al-Qur'an (Mode Halaman MSI & Mode Ayat), Riwayat lokal (IndexedDB), Pengaturan (ukuran teks Arab, manajemen cache model/riwayat).
- **Di luar MVP:** Login/akun pengguna, sinkronisasi cloud, leaderboard, penilaian tajwid/makhraj, multi-qari lanjutan, chatbot tafsir.
- **Blocker data & lisensi yang dicatat terbuka:**
  - Token API Qur'an Kemenag (`quran-api.lpmqkemenag.id`) belum tersedia; MVP menggunakan dataset fixture/sampel lokal yang ditandai jelas sebagai data pengembangan (`isFixture: true`), dilengkapi adapter/importer untuk integrasi resmi saat token disetujui.
  - Sumber audio murottal per ayat yang memiliki izin redistribusi jelas belum ditetapkan; aplikasi menampilkan status jujur ketika audio tidak tersedia dan menyediakan mode uji lokal yang jelas ditandai.
  - Model ASR lokal (kandidat: Tilawa FastConformer MIT/CC-BY-4.0) dimuat secara lazy ke browser dan dicache lokal; pada MVP tersedia arsitektur worker ONNX + fallback transkripsi manual/simulasi pengembangan ketika model ONNX lokal belum diunduh/tersedia.

## Brand Commitments

- **Nama:** Hafalanku (`hafalanku.online`).
- **Bahasa UI:** Bahasa Indonesia yang tenang, jelas, ringkas, dan tidak berlebihan.
- **Referensi pengalaman:** `https://quran.nu.or.id/` sebagai inspirasi kesederhanaan layout, pencarian, dan navigasi Surah/Juz (tanpa menyalin identitas, logo, aset, atau data penomoran).

## Evidence on Hand

- `PRD_Hafalanku_Entry_Hosting.md` sebagai spesifikasi produk dan arsitektur lengkap.
- Data ayat produksi Kemenag/LPMQ dan aset audio berlisensi belum tersedia di repositori; seluruh data sampel awal diberi label eksplisit sebagai fixture pengembangan.

## Product Principles

1. **Ketepatan teks dan metadata MSI di atas segalanya:** jangan pernah mengarang atau memodifikasi teks ayat dengan LLM; tampilkan status jujur bila data masih fixture.
2. **Privasi audio mutlak pada MVP:** izin mikrofon hanya diminta saat tombol rekam ditekan; audio tidak pernah diunggah ke server.
3. **Kejujuran evaluasi AI:** confidence rendah menghasilkan status *Tidak dapat dinilai / Coba ulang*, bukan nilai salah otomatis; pisahkan skor bacaan dan skor metadata.
4. **Ringan & kompatibel Rumahweb Entry:** bundle awal kecil, model ASR lazy-loaded, tanpa ketergantungan Node.js/SSH di server produksi.

## Accessibility & Inclusion

- Arah teks Arab RTL (`dir="rtl"`) dengan font Quran berlisensi yang mendukung penuh harakat dan tanda waqaf tanpa terpotong.
- Kontrol ukuran teks Arab terpisah dari teks UI Latin.
- Target sentuh nyaman (minimal 44×44 px) pada kontrol rekam, pemutar audio, dan navigasi mobile.
- Navigasi keyboard penuh, visible focus ring, kontras teks ≥4.5:1, serta indikator status yang tidak hanya mengandalkan warna.

