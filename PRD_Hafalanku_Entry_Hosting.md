# PRD — Hafalanku

**Nama produk:** Hafalanku  
**Domain yang diusulkan:** `hafalanku.online` (ketersediaan domain belum diperiksa)  
**Jenis produk:** Web app / Progressive Web App (PWA) untuk murojaah dan pengujian hafalan Al-Qur'an  
**Target rilis:** MVP  
**Target hosting:** Rumahweb Shared Hosting Entry (mengacu pada opsi checkout yang dipilih pengguna; storage paket yang ditampilkan 1 GB).  
**Strategi deployment:** React + TypeScript/TSX dibuild secara lokal menjadi frontend statis; tidak memerlukan Node.js runtime atau SSH di server.  
**Acuan mushaf:** Mushaf Standar Indonesia (MSI), khususnya teks dan metadata yang bersumber/terverifikasi dari LPMQ Kementerian Agama RI.

---

## 1. Ringkasan Produk

Hafalanku adalah aplikasi web untuk membantu pengguna menguji dan mengulang hafalan Al-Qur'an. Fitur utamanya adalah **tes sambung ayat**: pengguna memilih juz atau rentang juz, sistem memilih ayat pemantik secara acak dan memutarkan audio ayat tersebut, lalu pengguna melanjutkan bacaan melalui mikrofon.

Bacaan pengguna diproses oleh model pengenalan suara Al-Qur'an (ASR) yang berjalan secara lokal di browser. Hasil pengenalan dibandingkan dengan urutan ayat yang seharusnya berdasarkan dataset MSI. Pengguna juga dapat mengaktifkan kuis tambahan untuk menebak nama surah, nomor halaman mushaf, dan nomor ayat.

Hafalanku juga menyediakan fitur membaca Al-Qur'an dengan dua mode: **per halaman** dan **per ayat**.

### Prinsip produk
- Akurasi dan kehati-hatian terhadap teks Al-Qur'an adalah prioritas tertinggi.
- Seluruh penomoran dan posisi ayat mengikuti satu acuan yang konsisten: MSI.
- AI berjalan on-device/local, bukan melalui API AI berbayar.
- Hasil AI adalah bantuan pemeriksaan hafalan, bukan pengganti guru, tashih, atau penilaian tajwid.
- MVP dibuat ringan untuk Rumahweb Entry: frontend statis hasil build lokal, tanpa backend Node.js/Python dan tanpa ketergantungan SSH.

## 2. Tujuan dan Indikator Keberhasilan

### Tujuan
1. Memungkinkan pengguna menguji hafalan berdasarkan juz atau rentang juz.
2. Memutar ayat pemantik dari sumber audio yang sah dan jelas atribusinya.
3. Merekam dan mengenali bacaan lanjutan pengguna secara lokal.
4. Membandingkan hasil pengenalan dengan urutan ayat target dan menampilkan evaluasi yang mudah dipahami.
5. Memberikan kuis opsional untuk nama surah, halaman MSI, dan nomor ayat.
6. Menyediakan pembaca Al-Qur'an dalam mode per halaman dan per ayat.

### Indikator keberhasilan MVP
- Pengguna dapat memilih cakupan juz dan memulai tes tanpa login.
- Ayat pemantik yang dipilih selalu berada dalam cakupan yang diminta.
- Audio yang diputar sesuai dengan ayat pemantik.
- Pengguna dapat merekam bacaan, menghentikan rekaman, dan memperoleh hasil pengenalan lokal.
- Evaluasi menampilkan bagian yang cocok, terlewat, tertukar, atau tidak berhasil dikenali; confidence rendah tidak langsung dinilai salah.
- Checkbox kuis metadata bekerja secara independen.
- Pembaca dapat berpindah halaman MSI dan menampilkan ayat secara individual.
- Tidak ada audio rekaman pengguna yang dikirim ke server pada MVP.

## 3. Target Pengguna dan Use Case

**Target utama:** penghafal Al-Qur'an, santri, peserta tahfiz, pengajar, dan pengguna yang rutin melakukan murojaah.

**Use case utama:**
- Saya ingin dites secara acak dari Juz 5.
- Saya ingin dites dari rentang Juz 1 sampai Juz 5.
- Saya ingin mendengar satu ayat, kemudian melanjutkan ayat berikutnya dari hafalan.
- Saya ingin mengetahui apakah urutan ayat yang saya baca sudah benar.
- Saya ingin menebak surah dan halaman tanpa harus menebak nomor ayat.
- Saya ingin membaca Al-Qur'an berdasarkan halaman mushaf atau membaca ayat satu per satu.

## 4. Ruang Lingkup MVP

### Masuk MVP
1. Beranda dan navigasi utama.
2. Tes hafalan berdasarkan satu juz atau rentang juz.
3. Pemilihan ayat pemantik secara acak.
4. Pemutaran audio satu ayat pemantik.
5. Perekaman suara pengguna melalui mikrofon.
6. ASR lokal di browser dan pencocokan terhadap urutan ayat target.
7. Kuis opsional melalui checkbox:
   - Tebak nama surah.
   - Tebak halaman mushaf MSI.
   - Tebak nomor ayat.
8. Halaman hasil tes dan jawaban yang benar.
9. Pembaca Al-Qur'an dengan mode per halaman dan per ayat.
10. Pengaturan dasar dan riwayat tes lokal pada perangkat.
11. Tampilan responsif untuk desktop dan perangkat mobile.

### Di luar MVP
- Login, akun pengguna, dan sinkronisasi progres lintas perangkat.
- Dashboard statistik tingkat lanjut, leaderboard, dan fitur sosial.
- Penilaian tajwid, makhraj, sifat huruf, panjang-pendek, atau kualitas suara.
- Koreksi bacaan real-time seperti guru virtual.
- Banyak pilihan qari dan pengaturan audio tingkat lanjut.
- Aplikasi Android/iOS native.
- Fitur AI generatif atau chatbot tafsir.

## 5. Alur Utama: Tes Hafalan

### 5.1 Pengaturan tes
Pengguna membuka menu **Tes Hafalan**, lalu:
1. Memilih satu juz atau rentang juz (1–30).
2. Memilih pengaturan kuis metadata melalui checkbox yang independen:
   - `Tebak nama surah` — default aktif.
   - `Tebak halaman` — default aktif.
   - `Tebak nomor ayat` — default aktif.
3. Menekan tombol **Mulai Tes**.

Untuk MVP, pilihan rentang juz harus jelas (misalnya Juz 1–5). Validasi agar nilai awal tidak lebih besar dari nilai akhir.

### 5.2 Pemilihan dan pemutaran ayat pemantik
1. Sistem mengambil satu ayat pemantik secara acak dari cakupan yang dipilih.
2. Sistem hanya memilih ayat yang memiliki ayat lanjutan yang valid dalam cakupan tes.
3. Sistem memutar audio lengkap untuk ayat pemantik.
4. Pengguna dapat memutar ulang audio sebelum mulai menjawab.
5. Setelah audio selesai atau pengguna menekan **Mulai Menjawab**, pengguna merekam bacaan lanjutan.

**Aturan penting:** ayat pemantik adalah ayat yang diperdengarkan. Jawaban sambung ayat dimulai dari ayat setelah ayat pemantik. Jika jawaban mencapai batas cakupan juz/rentang juz, sistem menghentikan target pada batas tersebut atau memberi instruksi yang jelas. Jangan diam-diam mengubah cakupan tes.

### 5.3 Perekaman jawaban
- Minta izin mikrofon hanya ketika pengguna memulai rekaman.
- Sediakan indikator status: siap, merekam, memproses, dan selesai.
- Sediakan tombol **Selesai** dan **Ulangi Rekaman**.
- Pengguna dapat mengakhiri bacaan secara manual.
- MVP dapat menyediakan target jumlah ayat lanjutan sederhana (misalnya 1–5 ayat) atau tombol selesai manual. Jangan mengandalkan deteksi hening sebagai satu-satunya cara menentukan akhir bacaan.
- Audio diproses di browser. Jangan mengunggah atau menyimpan raw audio secara default.

### 5.4 Kuis metadata
Setelah pengguna menyelesaikan bacaan, tampilkan pertanyaan yang dipilih pada pengaturan awal. Pertanyaan mengacu pada **ayat pemantik** agar referensinya konsisten:
- Nama surah: pilih dari daftar 114 surah.
- Halaman mushaf: input angka atau pemilih nomor halaman yang valid.
- Nomor ayat: input angka.

Pengguna dapat mengirim jawaban metadata sebelum hasil dibuka. Sistem tidak menampilkan jawaban benar sebelum pengguna mengirim jawaban atau memilih lewati.

### 5.5 Hasil evaluasi
Tampilkan bagian-bagian berikut:
- Ayat pemantik yang diputar.
- Urutan ayat yang seharusnya dilanjutkan.
- Hasil pengenalan bacaan pengguna.
- Ayat/kata yang cocok.
- Ayat/kata yang terlewat, tertukar, atau berbeda jika dapat diidentifikasi.
- Bagian yang tidak dapat dinilai karena confidence rendah.
- Hasil masing-masing kuis metadata.
- Tombol **Tes Berikutnya**, **Ulangi**, dan **Lihat Ayat**.

Jangan memaksakan satu angka persentase jika hasil ASR tidak cukup yakin. Pisahkan skor bacaan dan skor metadata. Jelaskan bahwa hasil adalah estimasi mesin.

## 6. Fitur Pembaca Al-Qur'an

### 6.1 Mode per halaman
- Navigasi halaman sebelumnya/berikutnya.
- Nomor halaman mengikuti pemetaan halaman MSI yang telah diverifikasi.
- Semua ayat yang berada pada halaman terpilih ditampilkan bersama.
- Tampilkan identitas surah dan nomor ayat pada batas yang relevan.
- Jika belum tersedia aset halaman resmi yang boleh digunakan, tampilkan teks ayat yang dikelompokkan berdasarkan nomor halaman MSI dalam lembar/page container. Jangan mengklaim layout tersebut identik dengan cetakan mushaf.

### 6.2 Mode per ayat
- Daftar ayat dapat dibaca satu per satu.
- Navigasi ayat sebelumnya/berikutnya.
- Tampilkan nama surah dan nomor ayat.
- Sediakan pilihan untuk menampilkan terjemahan jika dataset resmi dan hak pemakaiannya sudah tersedia.

### 6.3 Ketentuan tampilan teks
- Gunakan teks Arab dan tanda baca dari dataset MSI yang telah diverifikasi.
- Gunakan font Arab yang mendukung glyph dan harakat Al-Qur'an serta memiliki lisensi yang sesuai.
- Pastikan harakat tidak terpotong, tidak bertumpuk, dan terbaca pada desktop maupun mobile.
- Jangan melakukan koreksi, parafrasa, atau generasi ulang terhadap teks ayat menggunakan LLM.

## 7. Data dan Sumber Kebenaran

### 7.1 Sumber utama
Gunakan **API Qur'an Kemenag / LPMQ** sebagai sumber utama teks dan metadata MSI, setelah proses pendaftaran dan persetujuan akses diselesaikan.

Portal API resmi: https://quran-api.lpmqkemenag.id/  
Portal informasi Qur'an Kemenag: https://quran.kemenag.go.id/

Portal API menyebut data teks Al-Qur'an Rasm Usmani, terjemahan Kemenag edisi 2019, tafsir, dan transliterasi. Proses akses yang dipublikasikan mencakup pendaftaran, surat permohonan kepada Kepala LPMQ, pengiriman surat, dan aktivasi/token. Karena itu:
- Jangan menganggap API dapat langsung diakses tanpa persetujuan/token.
- Jangan menaruh token API di frontend atau repository publik.
- Simpan token di environment/server-side jika dibutuhkan untuk proses pengambilan data.
- Buat adapter/import script untuk mengambil data yang diizinkan, memvalidasinya, lalu membentuk dataset aplikasi yang versioned.
- Catat tanggal pengambilan, versi sumber, dan checksum dataset.
- Jangan scraping situs Kemenag sebagai jalan pintas tanpa memeriksa izin dan ketentuan penggunaan.

### 7.2 Acuan MSI
Semua fitur harus menggunakan pemetaan MSI yang sama untuk:
- Nomor surah.
- Nomor ayat.
- Nomor juz dan batas awal/akhir juz.
- Nomor halaman mushaf.
- Relasi ayat ke halaman.

Jangan menghitung nomor halaman berdasarkan perkiraan jumlah baris atau panjang teks. Jika API tidak menyediakan pemetaan halaman, cari dan verifikasi sumber metadata MSI yang sah sebelum mengimplementasikannya. Jangan menggunakan pemetaan dari mushaf Madinah atau edisi lain.

### 7.3 Skema data minimum yang disarankan

`surahs`
- `surah_number`
- `name_arabic`
- `name_latin`
- `total_ayahs`

`ayahs`
- `surah_number`
- `ayah_number`
- `global_ayah_number`
- `juz_number` atau relasi ke tabel penempatan juz
- `page_number_msi`
- `text_uthmani_msi`
- `translation_id` (opsional)
- `audio_asset_id` (opsional)

`juz_ranges`
- `juz_number`
- `start_surah`
- `start_ayah`
- `end_surah`
- `end_ayah`

`audio_assets`
- `surah_number`
- `ayah_number`
- `qari_id`
- `audio_url_or_path`
- `source_name`
- `license_or_permission_reference`

`practice_sessions_local`
- `created_at`
- `selected_juz_start`
- `selected_juz_end`
- `prompt_surah`
- `prompt_ayah`
- `recognized_transcript` (jika tersedia)
- `evaluation_summary`
- `metadata_answers`

Skema akhir boleh disesuaikan dengan bentuk data resmi API. Jangan mengasumsikan nama field API sebelum dokumentasinya diperoleh.

## 8. Audio Murottal

API Kemenag yang dipublikasikan menyebut teks, terjemahan, tafsir, dan transliterasi; dokumentasi publik yang diperiksa belum memastikan adanya endpoint audio per ayat. Karena itu, audio harus diperlakukan sebagai integrasi data terpisah sampai API audio terverifikasi.

Persyaratan:
- Gunakan qari/sumber audio yang jelas asal dan izin pemakaiannya.
- Utamakan audio per ayat agar ayat pemantik dapat diputar secara spesifik.
- Simpan metadata qari, sumber, dan izin/lisensi.
- Jangan menggunakan audio yang hak redistribusinya tidak jelas.
- Jika audio pemantik tidak tersedia, tampilkan pesan yang jelas dan jangan menggantinya dengan audio ayat lain.
- MVP dapat dimulai dengan satu qari yang konsisten.

## 9. AI / ASR Lokal

### 9.1 Prinsip arsitektur
ASR berjalan di browser pengguna menggunakan WebAssembly/ONNX Runtime Web dan Web Worker. Audio tidak perlu dikirim ke layanan AI eksternal.

Pipeline konseptual:
1. Browser meminta izin mikrofon setelah aksi pengguna.
2. Audio dikonversi menjadi PCM mono 16 kHz sesuai kebutuhan model.
3. Audio diproses oleh model ASR lokal.
4. Model menghasilkan transkripsi Arab dan/atau prediksi rentang surah-ayat.
5. Lapisan matcher membandingkan hasil model dengan urutan ayat yang diharapkan setelah ayat pemantik.
6. Normalisasi teks dan alignment menentukan bagian cocok, terlewat, tertukar, atau tidak pasti.
7. Hasil ditampilkan ke pengguna.

### 9.2 Kandidat awal untuk diuji
Evaluasi repository **Tilawa** (sebelumnya Offline Tarteel): https://github.com/yazinsai/tilawa

Repository tersebut menyediakan package TypeScript dan dukungan browser melalui `onnxruntime-web`. README terkini mendeskripsikan engine FastConformer untuk transkripsi teks Arab dan alur on-device. Ini kandidat teknis, bukan keputusan final sebelum benchmark.

**Catatan lisensi penting:** repository membedakan lisensi kode dan aset model. Engine Zipformer default menyertakan model/corpus berlisensi NPL-1.2 (non-commercial, share-alike), sedangkan aset FastConformer disebut memiliki lisensi MIT / NVIDIA CC-BY-4.0. Untuk MVP, evaluasi opsi FastConformer lebih dahulu dan periksa file lisensi/NOTICE setiap artefak yang benar-benar dipakai. Jangan menggunakan aset Zipformer untuk penggunaan komersial sebelum implikasi lisensinya dipastikan.

### 9.3 Cara evaluasi
- Jangan menganggap klaim benchmark repository sebagai jaminan akurasi pada pengguna Indonesia.
- Buat benchmark internal menggunakan rekaman bacaan nyata dari beberapa pengguna/qari dan perangkat yang berbeda, dengan persetujuan perekam.
- Uji bacaan lambat/cepat, variasi aksen, noise, jeda, pengulangan, kesalahan, dan ayat yang mirip.
- Ukur akurasi pengenalan, false positive/negative, latency, penggunaan RAM, dan performa mobile.
- Sediakan status **Tidak dapat dinilai / Coba ulang** jika confidence rendah.
- Model harus diuji pada potongan lanjutan beberapa ayat, bukan hanya satu ayat yang dibaca jelas.

### 9.4 Pencocokan bacaan
Implementasikan normalisasi dan alignment yang dapat diuji secara terpisah:
- Simpan transkripsi mentah untuk evaluasi selama sesi.
- Normalisasi harakat/tanda baca/karakter pemanjang secara terkontrol.
- Jangan menghapus perbedaan huruf yang bermakna secara serampangan.
- Bandingkan hasil dengan ayat target secara berurutan.
- Identifikasi ayat terlewat, urutan melompat, pengulangan, dan bacaan tambahan jika model cukup yakin.
- Simpan confidence dari model dan ambang keputusan yang dapat dikonfigurasi.
- Tampilkan teks target MSI sebagai jawaban referensi.

**Batas kemampuan:** MVP tidak menilai tajwid, makhraj, sifat huruf, panjang-pendek, atau kualitas suara. ASR yang mengenali kata/ayat dengan benar tidak otomatis berarti bacaan tajwidnya benar.

### 9.5 Pengalaman pengguna untuk model lokal
- Model diunduh secara lazy saat pengguna pertama kali menggunakan tes suara.
- Tampilkan ukuran unduhan dan progres pemuatan model.
- Cache model dan aset pendukung setelah unduhan berhasil (misalnya Cache Storage/IndexedDB sesuai kelayakan teknis).
- Jalankan inference di Web Worker agar UI tidak membeku.
- Sediakan pesan kompatibilitas untuk browser/perangkat yang tidak mendukung.
- Sediakan opsi coba ulang dan fallback yang jujur; jangan berpura-pura memberi nilai ketika inference gagal.

## 10. Arsitektur Teknis MVP — Kompatibel dengan Rumahweb Entry

### 10.1 Frontend modern (source code)
- **React + TypeScript dengan TSX** sebagai standar utama. Komponen React menggunakan ekstensi `.tsx`; utilitas, tipe, dan logika non-UI menggunakan `.ts`.
- TSX adalah sintaks TypeScript yang mendukung JSX untuk mendeskripsikan UI React. Ini tetap pendekatan modern; jangan mengganti arsitektur menjadi HTML/PHP campur aduk atau pola JavaScript lama.
- **Vite** digunakan untuk development server dan build production.
- Gunakan ES Modules, TypeScript `strict`, komponen fungsional, hooks, dan pemisahan fitur yang jelas.
- Tailwind CSS untuk styling, dengan design tokens yang konsisten.
- React Router atau solusi routing SPA yang ringan bila diperlukan.
- PWA/service worker opsional untuk caching aset dan pengalaman instalasi.
- Web Worker untuk pemrosesan ASR; ONNX Runtime Web untuk menjalankan model lokal.
- Hindari jQuery, manipulasi DOM manual sebagai pola utama, class component React lama, CommonJS untuk kode baru, serta penulisan seluruh aplikasi dalam satu file.

**Node.js dan npm hanya digunakan di komputer lokal/development environment** untuk memasang dependency, menjalankan Vite, type-check, test, dan menghasilkan build. Node.js tidak dijalankan di hosting Rumahweb Entry.

### 10.2 Backend dan database pada MVP
Untuk menekan biaya dan menyesuaikan paket Entry pada checkout, **MVP sengaja dibuat sebagai aplikasi frontend statis tanpa backend aplikasi dan tanpa database server**:
- Dataset Al-Qur'an MSI yang telah diperoleh secara sah dan diverifikasi disajikan sebagai file JSON/data statis berversi.
- Data sumber boleh diambil/diolah melalui script lokal saat proses build/import. Token API Kemenag hanya digunakan di environment lokal yang tidak masuk repository maupun bundle frontend.
- Pengaturan dan riwayat tes dasar disimpan di browser menggunakan IndexedDB; localStorage hanya untuk preferensi ringan.
- Audio rekaman diproses di browser dan tidak diunggah atau disimpan di server.
- Model ASR diunduh saat diperlukan dan dijalankan di browser; jangan memerlukan server Node/Python/GPU.
- Tidak ada login, sinkronisasi lintas perangkat, atau penyimpanan cloud pada MVP.
- MySQL/MariaDB yang tersedia pada paket Entry tidak wajib dibuat atau digunakan untuk MVP ini.

Dengan arsitektur ini, website tetap interaktif dan dinamis di sisi browser walaupun file production yang diunggah ke hosting berupa aset statis HTML/CSS/JS/JSON/WASM/model.

### 10.3 Opsi backend pada fase lanjutan (bukan kebutuhan MVP)
Jika nanti Hafalanku membutuhkan akun, sinkronisasi riwayat, atau data pengguna di server dan tetap menggunakan paket Entry, evaluasi backend **PHP 8.x + MariaDB** karena PHP dan database tersedia pada shared hosting:
- Buat REST API yang mengembalikan/ menerima JSON.
- Gunakan PHP modern berbasis OOP, namespace, `declare(strict_types=1)`, typed properties/return types, service/repository layer seperlunya, dan PDO prepared statements.
- Pisahkan endpoint, controller, service, repository, konfigurasi, dan validasi; jangan campur HTML dengan logika bisnis.
- Jangan menggunakan pola PHP procedural besar atau menaruh SQL dan kredensial langsung di file endpoint.
- Dependency Composer, bila diperlukan, dipasang/dibangun secara lokal lalu seluruh dependency production yang dibutuhkan diunggah melalui File Manager/FTP. Jangan mengandalkan `composer install`, SSH, atau PHP CLI di server Entry.
- Jangan mengimplementasikan backend PHP pada MVP kecuali ada kebutuhan produk yang disetujui dan jelas. ASR tetap berjalan di browser.

### 10.4 Struktur modul frontend yang disarankan
- `src/app/` — routing, provider, dan konfigurasi aplikasi.
- `src/components/` — komponen UI bersama.
- `src/features/memorization-test/`
- `src/features/quran-reader/`
- `src/features/recitation/`
- `src/features/quiz-metadata/`
- `src/features/session-history/`
- `src/data/quran/` — adapter dan tipe data; hindari menaruh dataset raksasa langsung dalam source file.
- `src/lib/asr/`
- `src/lib/quran-matcher/`
- `src/lib/audio-recorder/`
- `src/workers/asr.worker.ts`
- `public/models/` atau mekanisme asset model yang kompatibel dengan Vite untuk model yang diunduh secara lazy.
- `scripts/` — tool lokal untuk validasi/import data; jangan mengunggah script development ke `public_html`.

Agent boleh menyesuaikan struktur selama pemisahan tanggung jawab tetap jelas.

## 11. UI/UX, Referensi Desain, dan Navigasi

### 11.1 Referensi desain

Gunakan **Qur'an NU Online** sebagai referensi arah desain dan pengalaman pengguna:
https://quran.nu.or.id/

Hal yang dijadikan referensi:
- Tampilan sederhana, bersih, lapang, dan tidak penuh ornamen.
- Pengguna dapat langsung mencari surah/ayat atau menjelajahi Al-Qur'an melalui pilihan seperti Surah dan Juz.
- Daftar surah disajikan secara terstruktur dan mudah dipindai.
- Halaman baca mengutamakan teks ayat, dengan informasi surah serta elemen bacaan pendukung yang disusun jelas.
- Navigasi dan kontrol dibuat mudah dipahami tanpa banyak elemen dekoratif.

**Batas penggunaan referensi:** jadikan situs tersebut inspirasi layout, hierarki informasi, dan kesederhanaan interaksi saja. Jangan menyalin identitas merek, logo, aset visual, kode, atau tampilan persisnya. Hafalanku harus memiliki identitas visual sendiri. Referensi desain ini tidak mengubah sumber data: seluruh teks, metadata, penomoran, dan pemetaan halaman tetap wajib mengikuti MSI, bukan data/penomoran dari situs referensi.

### 11.2 Arah visual Hafalanku
- Gaya minimalis, modern, tenang, dan fokus pada konten Al-Qur'an.
- Gunakan latar terang/netral, teks utama berkontras tinggi, dan satu warna aksen bernuansa hijau untuk identitas Hafalanku. Gunakan warna aksen secukupnya.
- Hindari gradien mencolok, ornamen Islami berlebihan, ilustrasi dekoratif yang tidak membantu, animasi berlebihan, dan terlalu banyak kartu.
- Gunakan whitespace yang cukup dan tata letak konsisten.
- Utamakan tipografi yang mudah dibaca. Teks Arab harus menggunakan font Quran yang mendukung harakat dan tanda waqaf; teks Arab dapat diatur ukurannya secara terpisah dari teks Indonesia.
- Jangan gunakan teks Arab dari font/gambar sebagai pengganti data ayat yang terverifikasi.
- Buat komponen, tombol, input, checkbox, tab, dan status proses dengan gaya konsisten.

### 11.3 Struktur halaman dan navigasi
Navigasi utama sebaiknya ringkas:
- **Beranda**
- **Tes Hafalan**
- **Baca Al-Qur'an**
- **Riwayat**
- **Pengaturan**

Desktop dapat menggunakan header sederhana. Pada mobile, gunakan navigasi ringkas yang tetap mudah dijangkau. Jangan menampilkan semua menu sebagai kartu besar jika tautan navigasi sederhana sudah cukup.

### 11.4 Beranda
- Tampilkan identitas Hafalanku dan deskripsi singkat fungsi aplikasi.
- Sediakan dua aksi utama yang terlihat jelas: **Mulai Tes Hafalan** dan **Baca Al-Qur'an**.
- Sediakan pencarian surah/nomor ayat sebagai jalan pintas menuju pembaca.
- Berikan akses menjelajah berdasarkan Surah atau Juz dengan pola sederhana seperti referensi.
- Hindari dashboard statistik yang ramai pada MVP. Riwayat cukup menjadi menu tersendiri.

### 11.5 Halaman Tes Hafalan
- Fokus pada satu alur utama: pilih cakupan juz, pilih checkbox kuis, lalu mulai tes.
- Kelompokkan pilihan juz dan checkbox dalam satu panel/form yang ringkas.
- Pastikan ketiga checkbox dapat diaktifkan secara independen dan statusnya terlihat jelas.
- Saat tes berlangsung, tampilkan ayat pemantik, kontrol audio, status mikrofon/rekaman, dan tombol aksi utama tanpa distraksi.
- Saat memproses ASR, tampilkan indikator proses dan status yang jujur; jangan membuat pengguna mengira aplikasi macet.
- Pada hasil tes, bedakan secara visual antara bacaan yang cocok, bagian yang terlewat/berbeda, dan bagian yang tidak dapat dinilai.
- Jangan memenuhi layar dengan banyak panel, grafik, atau ornamen yang tidak mendukung proses murojaah.

### 11.6 Halaman Baca Al-Qur'an
- Sediakan kontrol untuk berpindah antara **Mode Halaman** dan **Mode Ayat**.
- Sediakan pencarian surah/nomor ayat serta navigasi Juz/halaman yang mudah ditemukan.
- Mode halaman menampilkan kumpulan ayat sesuai pemetaan halaman MSI dalam satu area baca yang menyerupai lembar halaman, tanpa mengklaim sebagai reproduksi cetakan mushaf jika bukan berasal dari aset halaman resmi.
- Mode ayat menampilkan ayat sebagai unit yang jelas; teks Arab menjadi fokus utama, sedangkan nomor ayat, nama surah, transliterasi, dan terjemahan (jika tersedia) menjadi informasi pendukung.
- Beri jarak yang cukup antar ayat dan jaga arah teks Arab kanan-ke-kiri.
- Sediakan kontrol ukuran teks Arab dan, jika tersedia, audio ayat.

### 11.7 Responsif dan aksesibilitas
- Terapkan pendekatan mobile-first karena fitur rekaman kemungkinan banyak digunakan di ponsel.
- Pastikan tombol rekam/berhenti memiliki ukuran sentuh yang nyaman dan status yang mudah dikenali.
- Jangan mengandalkan warna saja untuk membedakan status; sertakan label atau ikon yang jelas.
- Semua checkbox, input, tab, dan tombol harus dapat digunakan dengan keyboard serta memiliki label aksesibel.
- Periksa teks Arab dan harakat pada ukuran layar kecil agar tidak terpotong atau bertumpuk.
- Uji minimal pada Chrome desktop dan Chrome Android.

## 12. Privasi dan Keamanan

- Minta izin mikrofon hanya setelah pengguna menekan tombol rekam.
- Jelaskan bahwa audio diproses secara lokal.
- Jangan mengirim audio, transkripsi, atau informasi sensitif ke server secara default.
- Jangan memasukkan token API Kemenag ke JavaScript frontend atau repository.
- Jangan menyimpan kredensial/token di Git.
- Gunakan HTTPS.
- Jangan mengumpulkan analytics yang merekam audio atau isi bacaan.
- Sediakan penghapusan riwayat lokal.

## 13. Deployment Rumahweb Entry

### 13.1 Batasan paket yang menjadi dasar rancangan
Gunakan **Rumahweb Shared Hosting Entry** sesuai pilihan pada screenshot checkout pengguna. Pada pilihan tersebut, fitur SSH, Node.js, dan Python ditandai tidak tersedia. Karena itu, jangan membuat arsitektur production yang membutuhkan proses Node.js, Python, SSH, terminal server, process manager, atau server GPU.

Paket Entry tetap dapat digunakan untuk menyajikan website statis melalui cPanel/File Manager/FTP. Paket juga mencantumkan PHP dan MariaDB/MySQL; database tidak wajib dipakai pada MVP. Arsitektur Hafalanku sengaja tidak bergantung pada fitur yang ditandai tidak tersedia.

Catatan: daftar fitur hosting dapat berubah atau berbeda antarhalaman/opsi checkout. Screenshot paket yang benar-benar dipilih dan konfirmasi Rumahweb saat pemesanan menjadi acuan akhir. Jangan mengubah rancangan untuk mengandalkan Node.js/SSH tanpa konfirmasi tertulis bahwa fitur tersebut aktif pada akun Entry pengguna.

### 13.2 Proses development dan build (di komputer lokal)
1. Pasang Node.js versi LTS dan npm/pnpm di komputer developer, bukan di hosting.
2. Clone/download repository, lalu jalankan instalasi dependency di komputer lokal.
3. Jalankan development server Vite secara lokal.
4. Jalankan type-check, lint, unit test, dan pemeriksaan build.
5. Jalankan `npm run build` (atau script build yang ditetapkan project).
6. Vite menghasilkan folder `dist/` berisi file production statis.

Contoh alur perintah; sesuaikan dengan package manager dan script yang benar-benar ada di `package.json`:

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Tidak ada langkah `npm install`, `npm run build`, atau `npm start` di server Rumahweb Entry.

### 13.3 Upload ke hosting tanpa SSH
1. Hubungkan domain ke hosting dan pastikan document root domain diketahui.
2. Login ke cPanel.
3. Buka File Manager atau gunakan FTP/SFTP jika disediakan oleh akun.
4. Upload **isi folder `dist/`** ke document root domain (umumnya `public_html/` untuk domain utama).
5. Pastikan `index.html`, folder assets, file data JSON, worker, dan file model yang memang menjadi aset production ikut terunggah dengan struktur yang sama seperti output build.
6. Bila memakai client-side SPA routing, buat aturan fallback `.htaccess` agar URL aplikasi yang bukan file/folder fisik diarahkan ke `index.html`. Jangan menimpa file `.htaccess` yang sudah berisi konfigurasi penting; gabungkan aturan dengan hati-hati.
7. Aktifkan dan verifikasi SSL/HTTPS dari cPanel.
8. Uji domain publik, navigasi langsung ke route, reload, microphone permission, audio, model download, cache, dan tampilan mobile.

### 13.4 File yang boleh dan tidak boleh di-upload
**Upload:** isi folder `dist/` hasil build production beserta aset runtime yang direferensikan oleh build.

**Jangan upload ke document root:** `node_modules/`, source development yang tidak dibutuhkan runtime, `.git/`, file `.env`/`.env.local`, token API, cache build, folder skills/agent, file test, data rekaman pengguna, dan file konfigurasi rahasia. Source code dan dokumentasi disimpan di repository Git, bukan di `public_html`.

### 13.5 Optimasi batas 1 GB
- Total aset production yang di-host harus dipantau agar tetap berada di bawah kapasitas storage Entry 1 GB, dengan ruang cadangan untuk log dan file lain.
- Model ONNX harus lazy-loaded dan tidak dimasukkan ke bundle JavaScript awal.
- Ukur ukuran file model dan dataset sebelum menentukan model final; jangan mengasumsikan ukuran model tertentu tanpa mengukur artefak final.
- Hindari menyimpan seluruh koleksi audio murottal di hosting sendiri jika ukuran dan izin redistribusinya belum jelas. Gunakan sumber audio yang sah dan stabil atau satu aset terpilih yang memang boleh di-host.
- Gunakan cache browser untuk model dan aset statis yang versioned; cache tidak menghapus kebutuhan bandwidth saat unduhan pertama.
- Pantau penggunaan disk, bandwidth, CPU, dan batas proses melalui cPanel.

### 13.6 Kemungkinan backend di masa depan
Jika fitur login/sinkronisasi benar-benar diperlukan pada fase berikutnya, implementasikan API menggunakan PHP 8.x + MariaDB (lihat Bagian 10.3), lalu upload file PHP melalui File Manager/FTP. Pastikan versi PHP dan ekstensi yang dibutuhkan tersedia di cPanel. Jangan beralih ke Node.js backend kecuali paket hosting ditingkatkan atau layanan hosting lain dipilih.

## 14. Acceptance Criteria / Kriteria Selesai MVP

### Tes hafalan
- [ ] Pengguna dapat memilih satu juz atau rentang juz yang valid.
- [ ] Sistem memilih ayat pemantik acak dan tidak keluar dari cakupan.
- [ ] Ayat pemantik memiliki lanjutan yang valid.
- [ ] Audio pemantik sesuai dengan ayat target dan sumbernya tercatat.
- [ ] Pengguna dapat memulai, menghentikan, dan mengulang rekaman.
- [ ] ASR diproses di browser; tidak ada request audio ke API AI eksternal.
- [ ] Hasil ASR dicocokkan dengan urutan ayat setelah pemantik.
- [ ] Confidence rendah menghasilkan status tidak dapat dinilai, bukan nilai salah otomatis.
- [ ] Checkbox nama surah, halaman, dan nomor ayat dapat dinyalakan/dimatikan secara independen.
- [ ] Hasil kuis metadata sesuai referensi MSI.

### Pembaca Al-Qur'an
- [ ] Mode per halaman menggunakan pemetaan MSI yang tervalidasi.
- [ ] Mode per ayat menampilkan teks yang sama dengan dataset sumber.
- [ ] Navigasi halaman/ayat berfungsi.
- [ ] Teks Arab, harakat, dan tanda waqaf tampil dengan benar di perangkat uji.

### Privasi dan deployment
- [ ] Izin mikrofon hanya diminta setelah aksi pengguna.
- [ ] Audio pengguna tidak diunggah atau disimpan secara default.
- [ ] Model dapat diunduh dan di-cache.
- [ ] Aplikasi dapat diakses melalui HTTPS pada domain Rumahweb.
- [ ] Semua route penting dapat dimuat langsung tanpa 404 setelah fallback SPA dikonfigurasi.
- [ ] Production berhasil dibangun secara lokal menjadi folder `dist/` dan dapat diunggah melalui cPanel File Manager/FTP tanpa SSH.
- [ ] Website production tidak membutuhkan Node.js/Python runtime, SSH, process manager, atau database server.
- [ ] Tidak ada `node_modules`, `.env`, token API, `.git`, atau folder Agent Skills di document root.
- [ ] Total aset yang di-host sesuai kapasitas storage Entry 1 GB dan penggunaan bandwidth/model sudah diukur.
- [ ] Uji minimal pada Chrome desktop dan Chrome Android; catat keterbatasan browser lain.

## 15. Tahapan Implementasi untuk Coding Agent

**Tahap 0 — Setup agent, skills, dan verifikasi blocker data/lisensi**
- Identifikasi coding agent yang digunakan (mis. Codex, Claude Code, Cursor, atau Antigravity) dan baca petunjuk instalasi resmi yang sesuai.
- Pasang Agent Skills yang tercantum pada Bagian 18 dalam lingkup project, bukan global, kecuali pengguna meminta sebaliknya.
- Buat `PRODUCT.md` dan `DESIGN.md` sebelum mengimplementasikan UI; jadikan PRD ini sumber kebutuhan produk dan kedua file tersebut sumber konteks desain.
- Minta/urus akses API Qur'an Kemenag.
- Pastikan field data halaman MSI dan batas juz.
- Tentukan sumber audio per ayat dan izin redistribusinya.
- Periksa lisensi model ASR dan seluruh aset pendukung.
- Jangan mengarang atau memasukkan teks ayat yang belum diverifikasi.

**Tahap 1 — Fondasi aplikasi dan pembaca**
- Buat project React + TypeScript/TSX menggunakan Vite; Node.js/npm hanya untuk development dan build lokal.
- Buat desain responsif dan navigasi.
- Buat adapter dataset Quran dan pembaca per ayat/per halaman.
- Gunakan fixture data hanya untuk pengembangan lokal; beri label jelas dan jangan dianggap sebagai data produksi.

**Tahap 2 — Tes tanpa ASR**
- Implementasikan pemilihan juz, ayat acak, audio pemantik, dan kuis metadata.
- Uji batas juz, akhir surah, dan ayat terakhir.

**Tahap 3 — Integrasi ASR lokal**
- Buat proof of concept model ONNX di browser.
- Tambahkan normalisasi teks dan Quran matcher.
- Integrasikan recorder, Web Worker, progres unduhan, dan cache.
- Uji dengan benchmark rekaman nyata yang memiliki izin.

**Tahap 4 — Hasil, riwayat, dan hardening**
- Buat layar hasil dan riwayat lokal.
- Tambahkan penanganan error, browser tidak didukung, low confidence, offline, dan audio tidak tersedia.
- Audit konsistensi dataset MSI.

**Tahap 5 — Deployment**
- Jalankan type-check, lint, test, dan `npm run build` di komputer lokal.
- Upload isi folder `dist/` melalui cPanel File Manager/FTP; jangan membutuhkan SSH atau Node.js di hosting Entry.
- Konfigurasikan fallback SPA `.htaccess` bila diperlukan dan aktifkan HTTPS.
- Uji seluruh acceptance criteria pada domain online.
- Tulis README development lokal, build, deployment tanpa SSH, konfigurasi, lisensi, dan cara memperbarui dataset/model.

## 16. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Akses API Kemenag memerlukan persetujuan/token | Ajukan akses sejak awal; buat data adapter; jangan mengandalkan endpoint tanpa izin. |
| Pemetaan halaman MSI tidak tersedia di endpoint | Cari metadata MSI yang sah dan verifikasi; jangan menghitung halaman sendiri. |
| Hak audio tidak jelas | Gunakan satu sumber/qari dengan izin redistribusi yang terdokumentasi. |
| ASR salah mengenali bacaan | Confidence threshold, hasil tidak pasti, benchmark pengguna, opsi rekam ulang. |
| Model terlalu berat untuk ponsel | Lazy loading, Web Worker, uji perangkat kelas menengah, dan sediakan fallback. |
| Perbedaan ejaan/transliterasi/rasm | Gunakan teks MSI sebagai referensi dan normalisasi yang terdokumentasi. |
| Pengguna mengira skor AI adalah skor tajwid | Jelaskan keterbatasan secara eksplisit di UI. |
| Paket Entry tidak menyediakan SSH/Node.js/Python pada opsi checkout yang dipilih | Gunakan frontend statis; build di lokal; upload `dist/` melalui File Manager/FTP. Hindari backend Node/Python. |
| Storage Entry hanya 1 GB | Ukur ukuran build, dataset, audio, dan model; lazy-load model; jangan host audio besar tanpa kebutuhan/izin. |
| Fitur akun/sinkronisasi belum dapat ditangani backend pada MVP | Simpan riwayat lokal; bila kelak dibutuhkan, buat API PHP 8.x + MariaDB atau upgrade hosting setelah evaluasi. |
| Bandwidth hosting meningkat karena model besar | Cache model, versi file immutable, kompresi jika kompatibel, dan pantau bandwidth. |

## 17. Referensi Teknis

1. **API Qur'an Kemenag / LPMQ** — https://quran-api.lpmqkemenag.id/  
   Portal menyebut API untuk Mushaf Standar Indonesia dan prosedur pendaftaran/pengajuan akses. Data yang dicantumkan meliputi teks Rasm Usmani, terjemahan, tafsir, dan transliterasi.
2. **Berita LPMQ tentang API Qur'an Kemenag (9 Oktober 2025)** — https://lajnah.kemenag.go.id/info-lpmq/berita-dan-artikel/berita/api-qur%E2%80%99an-kemenag-jadi-jembatan-digital-akses-mushaf-standar-indonesia.html  
   Penjelasan resmi bahwa API menyediakan data mentah JSON untuk pengembang.
3. **Tilawa (sebelumnya Offline Tarteel)** — https://github.com/yazinsai/tilawa  
   Kandidat ASR Al-Qur'an lokal dengan dukungan browser/ONNX; periksa README dan NOTICE terbaru sebelum mengadopsi model/aset.
4. **Paket Hosting Rumahweb** — https://www.rumahweb.com/hosting-murah/  
   Acuan fitur dan batas paket. Untuk rancangan ini, screenshot opsi checkout Entry dari pengguna menjadi dasar bahwa SSH/Node.js/Python tidak tersedia pada paket yang dipilih; periksa kembali saat checkout.
5. **Panduan versi PHP Rumahweb** — https://www.rumahweb.com/journal/cara-mengganti-versi-php-di-cpanel/  
   Referensi pengaturan versi PHP melalui cPanel apabila backend PHP ditambahkan pada fase mendatang.
6. **Koneksi PHP ke MySQL di cPanel** — https://www.rumahweb.com/journal/koneksi-database-php-ke-mysql/  
   Referensi konfigurasi PHP dan MariaDB/MySQL pada shared hosting bila fitur server-side diperlukan kelak.
7. **Qur'an NU Online (referensi desain saja)** — https://quran.nu.or.id/  
   Acuan kesederhanaan layout, pencarian, navigasi Surah/Juz, dan hierarki halaman baca; bukan sumber data teks atau penomoran untuk Hafalanku.


## 18. Agent Skills, Design System, dan Quality Gates

### 18.1 Tujuan
Coding agent wajib menggunakan Agent Skills yang relevan agar implementasi tidak berhenti pada UI generik atau kode yang sekadar berjalan. Skills adalah panduan kerja untuk agent, bukan dependency runtime aplikasi dan bukan pengganti testing, penilaian manusia, verifikasi data MSI, atau pemeriksaan lisensi.

Gunakan instalasi **project-local** agar konfigurasi dapat ditinjau bersama project dan tidak mengubah semua project pengguna. Jangan memasukkan folder atau file skill ke dalam bundle website/`dist` atau mengunggahnya ke `public_html`.

### 18.2 Skills yang direkomendasikan

| Prioritas | Skill / Repository | Kegunaan pada Hafalanku | Instruksi pemakaian |
|---|---|---|---|
| Wajib | [Impeccable](https://github.com/pbakaus/impeccable) — https://impeccable.style/docs/ | Membentuk arah visual, design system, dan alur evaluasi/penyempurnaan UI. | Gunakan saat merancang dan memperbaiki halaman; jalankan init sebelum UI utama dibuat. |
| Wajib | [Anti-Slop](https://github.com/miqdadbadjuber/anti-slop) | Mencegah pola UI generik, copy yang terasa seperti AI, aksesibilitas yang diabaikan, dan layout mobile yang buruk. | Core `antislop` selalu aktif. Pilih skill tambahan sesuai jenis pekerjaan. |
| Wajib | [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Audit aturan UI web, aksesibilitas, form, focus state, interaksi, responsive, dan UX. | Jalankan audit pada halaman/komponen yang sudah dibuat dan sebelum rilis. |
| Wajib | [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | Optimasi komponen React, rendering, re-render, pemuatan data, dan ukuran bundle. | Gunakan pada komponen React + TypeScript/TSX serta untuk lazy loading model ONNX dan menjaga bundle awal tetap kecil. |

**Pilihan Anti-Slop yang relevan:**
- `antislop` — selalu aktif sebagai aturan inti.
- `antislop-ui` — untuk layout, warna, komponen, dekorasi, struktur, dan motion.
- `antislop-human` — untuk kontras, keyboard navigation, focus state, dan affordance interaksi.
- `antislop-layoutmobile` — untuk breakpoint, reflow, overflow, grid, dan tap target.
- `antislop-copywriting` — gunakan saat menulis microcopy, label, CTA, pesan error, onboarding, dan konten UI.
- `antislop-code` — gunakan ketika membersihkan komentar kode yang generik; jangan menghapus komentar teknis yang menjelaskan alasan/risiko penting.

Core dan empat skill UI, human, layoutmobile, serta copywriting direkomendasikan untuk dipilih saat instalasi awal. Skill code dapat ikut dipasang, tetapi hanya dipakai ketika tugasnya relevan. Jangan meminta agent memuat semua skill pada setiap prompt jika tidak diperlukan.

### 18.3 Instruksi instalasi untuk coding agent

Sebelum instalasi:
1. Pastikan berada di root repository Hafalanku.
2. Deteksi coding agent yang sedang digunakan dan pilih integrasi/agent yang benar pada installer.
3. Baca README, panduan instalasi, lisensi, dan daftar file/aksi yang akan dipasang dari sumber resmi.
4. Gunakan installer resmi dan scope project-local. Jangan memasang skill global tanpa alasan dan persetujuan pengguna.
5. Jangan menyetujui hook, MCP server, script, atau permission tambahan yang tidak dibutuhkan. Tinjau perubahan file konfigurasi sebelum menyetujuinya.
6. Jika suatu installer tidak kompatibel dengan coding agent, jangan memaksakan perintah dari agent lain. Gunakan metode Agent Skills yang memang didukung, atau dokumentasikan bahwa instalasi perlu dilakukan manual.

Perintah instalasi utama (jalankan dari root project dan ikuti prompt untuk memilih agent serta scope project):

```bash
# Impeccable — installer menyesuaikan integrasi dengan coding agent
npx impeccable install

# Anti-Slop — pilih core + skill yang relevan pada prompt interaktif
npx antislop-ai

# Audit UI web dan aksesibilitas dari Vercel
npx skills add vercel-labs/agent-skills --skill web-design-guidelines

# Panduan performa React dari Vercel (tetap relevan untuk React + TypeScript/TSX)
npx skills add vercel-labs/agent-skills --skill react-best-practices
```

Catatan:
- Jika agent memiliki native plugin/marketplace integration yang direkomendasikan oleh dokumentasi resmi, agent boleh menggunakannya sebagai pengganti CLI generik. Impeccable mendokumentasikan `npx impeccable install` dan opsi `npx skills add pbakaus/impeccable`; Anti-Slop menyediakan installer `npx antislop-ai` serta jalur plugin/Agent Skills untuk sejumlah agent.
- Nama perintah dan dukungan agent bisa berubah. Verifikasi dokumentasi resmi saat instalasi; jangan menganggap contoh perintah di PRD ini selalu lebih baru daripada dokumentasi upstream.
- Setelah instalasi, restart/reload sesi coding agent jika diperlukan, lalu verifikasi bahwa skill benar-benar terdeteksi dan dapat dipanggil.
- Jangan menjalankan `npx` dari sumber tidak dikenal. Jangan menjalankan skrip remote dengan hak akses tinggi tanpa membaca sumber dan memahami dampaknya.

### 18.4 Inisialisasi arah produk dan desain

Setelah Impeccable terpasang, jalankan perintah inisialisasi yang sesuai dengan agent:

```text
/impeccable init
```

Untuk Codex, dokumentasi Impeccable menggunakan bentuk `$impeccable`. Ikuti sintaks yang ditampilkan oleh agent yang digunakan.

Buat dan pelihara dua file konteks berikut di root repository:

**`PRODUCT.md`** minimal berisi:
- Nama dan tujuan Hafalanku.
- Target pengguna: penghafal Al-Qur'an, santri, pengajar tahfiz, dan pengguna murojaah.
- Pekerjaan utama pengguna: tes sambung ayat, kuis metadata MSI, dan membaca Al-Qur'an.
- Prioritas produk: ketepatan teks MSI, alur tes yang jelas, privasi audio, ringan di perangkat, dan biaya operasional rendah.
- Batas MVP dan fitur yang sengaja belum dibuat.

**`DESIGN.md`** minimal berisi:
- Arah desain: minimal, tenang, bersih, fungsional, dan berorientasi pada keterbacaan.
- Referensi pengalaman: https://quran.nu.or.id/ — hanya inspirasi kesederhanaan, navigasi, dan hierarki informasi; jangan menyalin identitas, logo, aset, atau implementasi situs tersebut.
- Identitas Hafalanku sendiri: aksen hijau yang terukur, latar netral, tipografi jelas, whitespace yang cukup, dan elemen dekoratif minimum.
- Aturan layout untuk desktop dan mobile.
- Design tokens untuk warna, tipografi, spacing, radius, border, focus, dan elevation; pilih nilai yang konsisten, bukan menambahkan style secara acak di setiap halaman.
- Aturan komponen untuk tombol, input, checkbox, tab, dialog, notifikasi, status loading/error, serta kontrol audio/mikrofon.
- Perlakuan khusus teks Arab: RTL, font yang berlisensi dan mendukung harakat/tanda waqaf, ukuran yang dapat disesuaikan, line-height memadai, dan tidak memotong glyph.
- State khusus produk: model sedang diunduh, model siap, izin mikrofon ditolak, browser tidak didukung, ASR memproses, confidence rendah, audio tidak tersedia, offline, dan hasil tidak dapat dinilai.

Jangan mengubah arah Hafalanku menjadi dashboard SaaS generik. Jangan menambahkan gradient, glassmorphism, kartu berlebihan, animasi, ilustrasi, atau statistik dekoratif kecuali ada alasan UX yang jelas. Halaman Baca Al-Qur'an harus mengutamakan teks ayat; halaman Tes Hafalan harus mengutamakan proses mendengar, merekam, dan mengevaluasi.

### 18.5 Cara menggunakan skills selama development

- **Sebelum UI pertama:** gunakan Impeccable untuk membentuk design brief, `PRODUCT.md`, dan `DESIGN.md` berdasarkan PRD.
- **Saat membangun halaman:** gunakan Impeccable untuk layout, typesetting, hierarchy, simplifikasi, dan polish; gunakan `antislop-ui` sebagai filter anti-pola generik.
- **Saat membangun form/interaksi:** terapkan `antislop-human` dan `web-design-guidelines` untuk label, keyboard, focus, kontras, validasi, loading, error, dan feedback.
- **Saat mengerjakan mobile:** gunakan `antislop-layoutmobile`; uji overflow, RTL Arab, ukuran tap target, dan layout pada layar kecil.
- **Saat menulis teks UI:** gunakan `antislop-copywriting`; gunakan Bahasa Indonesia yang alami, singkat, jelas, dan tidak berlebihan.
- **Saat mengembangkan React/TypeScript/TSX dan ASR:** gunakan `react-best-practices`; gunakan tipe yang jelas, lazy-load model, pisahkan worker dari main thread, hindari memuat model ke bundle awal, serta ukur ukuran bundle dan waktu interaksi. Node.js/npm hanya digunakan untuk development/build lokal, bukan runtime hosting.
- **Sebelum milestone/PR/rilis:** jalankan audit Impeccable dan Vercel Web Design Guidelines, kemudian jalankan Anti-Slop Delivery Gate bila didukung versi yang terpasang. Perbaiki temuan penting; jika ada temuan yang sengaja tidak diperbaiki, tulis alasan dan risikonya.

### 18.6 Quality Gate sebelum dinyatakan selesai

- [ ] `PRODUCT.md` dan `DESIGN.md` tersedia dan konsisten dengan PRD.
- [ ] Skills terpasang pada coding agent yang benar dan telah diverifikasi aktif.
- [ ] Tidak ada tampilan generik yang dibuat hanya karena template default agent.
- [ ] Desain tetap sederhana dan mengikuti arah Hafalanku serta referensi pengalaman Qur'an NU Online tanpa menyalinnya.
- [ ] Setiap tombol, checkbox, input, tab, dan kontrol audio memiliki fungsi nyata serta state yang jelas.
- [ ] Halaman diuji pada lebar sekitar 360, 390, 768, 1024, dan 1440 px; tidak ada horizontal overflow yang tidak disengaja.
- [ ] Keyboard navigation, visible focus, semantic HTML, label, kontras, dan reduced motion diperiksa.
- [ ] Teks Arab/harakat/tanda waqaf diuji pada beberapa browser dan ukuran layar; tidak terpotong atau bertumpuk.
- [ ] Loading, error, empty, offline, low-confidence, mic-denied, unsupported-browser, serta audio/model-unavailable state tersedia.
- [ ] Bundle awal tidak mengunduh model ASR besar sebelum diperlukan.
- [ ] Audit UI dan React performance selesai, temuan kritis diperbaiki atau diberi catatan risiko.
- [ ] Tidak ada skill, token, credential, atau konfigurasi agent yang tidak diperlukan ikut terdeploy ke website.
- [ ] Kode UI menggunakan React + TypeScript/TSX modern (atau JavaScript ES Modules bila ada alasan yang disetujui); tidak menggunakan jQuery atau pola PHP/HTML campur sebagai frontend.
- [ ] Deployment production kompatibel dengan Entry: file statis hasil build lokal, upload melalui File Manager/FTP, tanpa SSH/Node.js/Python runtime.

### 18.7 Prinsip agar tidak berlebihan

Jangan memasang puluhan skills yang tumpang tindih. Empat kelompok di atas sudah cukup untuk kebutuhan MVP. Jika kelak ada kebutuhan spesifik (misalnya PWA offline, keamanan, atau pengujian browser otomatis), cari skill tambahan dari repository tepercaya, periksa sumber/lisensi/aktivitasnya, dan pasang hanya bila ada manfaat nyata. Skills membantu proses engineering; kualitas akhir tetap ditentukan oleh implementasi dan pengujian aplikasi.

---

## Catatan untuk Coding Agent

Sebelum coding, selesaikan Tahap 0 dan Bagian 18: pasang skills yang relevan, verifikasi aktivasi, lalu buat `PRODUCT.md` dan `DESIGN.md`. Gunakan PRD ini sebagai sumber kebutuhan produk; jangan mengabaikan quality gate hanya karena UI tampak sudah selesai.

Bangun MVP secara bertahap. Prioritaskan kebenaran data Al-Qur'an dan pengalaman tes hafalan, bukan banyaknya fitur. Jangan membuat data ayat, nomor halaman, batas juz, audio, atau klaim akurasi secara sintetis. Jika akses data/lisensi belum tersedia, buat interface dan fixture pengembangan yang jelas ditandai sebagai dummy, lalu hentikan integrasi produksi pada titik tersebut sampai sumber resmi dan izin tersedia. Semua keputusan teknis harus mempertahankan prinsip ASR lokal di perangkat pengguna dan tidak menggunakan API AI berbayar. Target hosting MVP adalah Rumahweb Entry: gunakan React + TypeScript/TSX modern, lakukan build Vite di komputer lokal, lalu deploy hanya hasil build statis melalui cPanel File Manager/FTP. Jangan membuat backend Node.js/Python atau mengasumsikan SSH tersedia. MVP tidak memerlukan backend; bila kebutuhan server-side muncul di fase berikutnya, evaluasi PHP 8.x OOP + MariaDB dengan pola REST API modern, bukan PHP procedural campur template.
