# Design System — Hafalanku

## 1. Arah Desain & Identitas Visual

- **Karakter:** Minimal, tenang, lapang, berfokus pada keterbacaan teks Al-Qur'an dan ketenangan murojaah.
- **Mode Surface:** *Operate & Read* — pengguna datang untuk membaca mushaf atau menyelesaikan sesi tes hafalan tanpa distraksi.
- **Referensi Pengalaman:** Kesederhanaan hierarki informasi, daftar surah yang mudah dipindai, dan navigasi Surah/Juz seperti `https://quran.nu.or.id/` — dengan identitas visual milik Hafalanku sendiri.
- **Larangan Visual:** Tidak ada gradient mencolok, tidak ada glassmorphism dekoratif, tidak ada ornamen Islami berlebihan, tidak ada kartu berulang dengan ikon generik, tidak ada dashboard statistik ramai, dan tidak ada eyebrow/kicker di atas heading.

## 2. Design Tokens

### Warna
- **Latar Utama (`--bg-canvas`):** `#FAF9F5` (kertas hangat netral yang nyaman untuk membaca lama)
- **Permukaan (`--bg-surface`):** `#FFFFFF`
- **Permukaan Sekunder (`--bg-subtle`):** `#F2F0E8`
- **Teks Utama (`--text-primary`):** `#171C19` (kontras tinggi, lembut dibanding hitam murni)
- **Teks Sekunder (`--text-secondary`):** `#4B5650`
- **Teks Redup (`--text-muted`):** `#6B7670`
- **Aksen Utama (`--accent-primary`):** `#166534` (hijau zamrud tenang, hover `#14532D`)
- **Aksen Lembut (`--accent-soft`):** `#EAF3EC` (untuk highlight aktif & badge status)
- **Border (`--border-default`):** `#E2DFD5`
- **Border Kuat (`--border-strong`):** `#C9C4B6`
- **Status Semantik:**
  - Cocok / Benar (`--status-match`): `#15803D` (latar `#ECFDF3`)
  - Terlewat / Salah (`--status-miss`): `#B91C1C` (latar `#FEF2F2`)
  - Tidak Pasti / Confidence Rendah (`--status-uncertain`): `#B45309` (latar `#FFFBEB`)
  - Info / Memproses (`--status-info`): `#1D4ED8` (latar `#EFF6FF`)

### Tipografi
- **UI & Terjemahan (Latin):** `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif` (dibuat tenang, bersih, keterbacaan tinggi; tabular numerals untuk nomor ayat/halaman/juz).
- **Teks Arab Al-Qur'an:** `'Amiri Quran', 'Scheherazade New', 'Noto Naskh Arabic', serif` (wajib mendukung harakat lengkap dan tanda waqaf tanpa bertumpuk atau terpotong).
- **Ukuran Teks Arab:** Dapat diatur pengguna secara terpisah (`26px`, `30px`, `34px`, `40px`), default `30px` di desktop dan `28px` di mobile, dengan `line-height: 2.3` dan `padding-block` memadai agar harakat atas/bawah tidak pernah terpotong.

### Spacing, Radius & Elevation
- **Radius:**
  - Kontrol kecil / badge: `6px`
  - Input / tombol / tab: `10px`
  - Panel utama / lembar halaman: `14px`
- **Elevation:** Gunakan border `1px solid var(--border-default)` sebagai pemisah utama; hindari shadow tebal. Shadow lembut hanya untuk dialog atau floating bar bila diperlukan.
- **Browser Surfaces:** Custom `::selection` menggunakan `--accent-soft` & `--text-primary`; `:focus-visible` menggunakan ring `2px solid var(--accent-primary)` dengan `outline-offset: 2px`.

## 3. Struktur Navigasi & Layout

- **Desktop:** Header tunggal bersih (maks. tinggi 64px) berisi identitas **Hafalanku** di kiri, 5 tautan navigasi ringkas (**Beranda**, **Tes Hafalan**, **Baca Al-Qur'an**, **Riwayat**, **Pengaturan**), dan indikator ringkas jika mode fixture aktif.
- **Mobile (<768px):** Header ringkas di atas + bottom navigation bar 5 menu dengan tap target ≥44px agar mudah dijangkau satu tangan saat merekam atau membaca.
- **Lebar Konten:** Maksimal `960px` terpusat untuk pembaca/tes (area baca Arab nyaman `680px–780px`), dengan padding horizontal `16px` (mobile) hingga `24px` (desktop).

## 4. Aturan Komponen & State Khusus Produk

1. **Kontrol Audio & Mikrofon:**
   - Tombol rekam/berhenti berukuran minimal `48px` dengan label teks eksplisit ("Mulai Rekam", "Selesai Merekam", "Ulangi Rekaman"), bukan hanya ikon.
   - Status proses selalu tampil dengan ikon + label: *Siap*, *Merekam*, *Memproses ASR lokal*, *Selesai*.
2. **Banner / Indikator Fixture & Privasi:**
   - Saat menggunakan data sampel lokal (`isFixture: true`), tampilkan pemberitahuan jujur yang ringkas bahwa dataset ini adalah sampel pengembangan menunggu verifikasi API LPMQ Kemenag.
   - Di halaman Tes Hafalan, sertakan keterangan singkat bahwa audio diproses lokal di browser dan tidak dikirim ke server.
3. **State Khusus Produk yang Wajib Tersedia:**
   - `model-downloading`: progress bar persentase + ukuran unduhan + tombol batal.
   - `model-ready`: badge status model lokal siap digunakan.
   - `asr-processing`: indikator loading jujur di Web Worker agar UI tetap responsif.
   - `low-confidence` / `unratable`: tampilan netral (*Tidak dapat dinilai / Coba ulang*) tanpa menghukum pengguna sebagai salah.
   - `mic-denied`: pesan jelas cara mengaktifkan izin mikrofon di browser + tombol coba lagi.
   - `unsupported-browser`: informasi fitur browser yang kurang (MediaRecorder/AudioContext/WASM) + opsi fallback.
   - `audio-unavailable`: pesan jujur bahwa audio ayat pemantik belum tersedia (tanpa memutar ayat lain).
   - `offline`: pemberitahuan status offline dan fitur lokal yang masih dapat dipakai.

