# Hafalanku

Aplikasi web untuk murojaah, **tes sambung ayat**, kuis metadata Mushaf Standar Indonesia (MSI), dan pembaca Al-Qur'an (mode per halaman & per ayat) dengan pemrosesan audio dan ASR **100% lokal di browser**.

## Struktur Monorepo

```text
hafalanku/
├── apps/
│   ├── web/                  # Frontend MVP: React + TypeScript/TSX + Vite + Tailwind CSS + Web Worker
│   └── api/                  # Kerangka backend fase lanjutan: PHP 8.x OOP + MariaDB (tidak aktif di MVP)
├── packages/
│   ├── quran-types/          # Tipe & skema data MSI bersama
│   ├── quran-matcher/        # Normalisasi teks Arab & alignment evaluasi bacaan (+ unit test)
│   └── asr/                  # Kontrak ASR lokal, resampler 16kHz mono, & utilitas RMS (+ unit test)
├── tools/
│   ├── data-importer/        # Adapter API Qur'an Kemenag / LPMQ & validator dataset MSI lokal
│   └── deploy/               # Skrip pembuat paket upload cPanel Rumahweb Entry
├── PRODUCT.md                # Konteks produk & batasan MVP
├── DESIGN.md                 # Arah visual, design tokens, & aturan aksesibilitas
└── PRD_Hafalanku_Entry_Hosting.md
```

## Prasyarat Lokal

- Node.js >= 20 LTS dan npm (hanya di komputer developer, **tidak** di server Rumahweb Entry).

## Menjalankan Development Lokal

```bash
npm install
npm run dev
```

Perintah verifikasi:

```bash
npm run typecheck       # Type-check seluruh workspace TypeScript
npm run test            # Unit test @hafalanku/quran-matcher dan @hafalanku/asr
npm run validate:data   # Validasi konsistensi dataset MSI dan SHA-256
```

## Build & Deploy ke Rumahweb Shared Hosting Entry (Tanpa SSH)

1. Bangun frontend statis dan kemas paket upload di komputer lokal:

   ```bash
   npm run build:web
   npm run package:deploy
   ```

2. Hasil build siap unggah berada di:
   - Folder: `deploy-bundle/public_html/`
   - Arsip ZIP: `deploy-bundle/hafalanku-entry-public_html.zip`
3. Login ke **cPanel** Rumahweb -> buka **File Manager** -> masuk ke `public_html/` (atau document root domain Anda).
4. Unggah dan ekstrak `hafalanku-entry-public_html.zip` ke `public_html/`. Pastikan file tersembunyi `.htaccess` ikut terpasang agar routing SPA (`/tes`, `/baca`, `/riwayat`, `/pengaturan`) tidak menghasilkan 404 saat di-refresh.
5. Aktifkan SSL/HTTPS di cPanel agar fitur mikrofon (`getUserMedia`) dan Web Worker berjalan normal di browser.

**Jangan pernah mengunggah** `node_modules/`, `.env`, `.git/`, `.agents/`, `tools/`, atau source code mentah ke `public_html/`.

## Memperbarui Dataset MSI & Model ASR

- **Dataset Kemenag / LPMQ:** Salin `.env.example` menjadi `.env` (jangan di-commit), isi `KEMENAG_API_TOKEN` setelah permohonan akses API di `https://quran-api.lpmqkemenag.id/` disetujui, lalu gunakan `tools/data-importer` untuk mengambil, memvalidasi, dan memperbarui JSON di `apps/web/public/data/`.
- **Model ASR Lokal:** Letakkan file model ONNX berlisensi kompatibel (kandidat: Tilawa FastConformer MIT / NVIDIA CC-BY-4.0) di `apps/web/public/models/fastconformer-ar-int8.onnx` sebelum menjalankan `npm run build:web`. Pantau agar total ukuran `dist/` tetap jauh di bawah batas 1 GB Rumahweb Entry.

