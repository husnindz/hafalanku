# Direktori Model ASR Lokal (Lazy-Loaded)

Letakkan artefak model ONNX (kandidat: Tilawa FastConformer berlisensi MIT / NVIDIA CC-BY-4.0) di direktori ini dengan nama `fastconformer-ar-int8.onnx` sebelum build production jika ingin menyajikan model dari hosting sendiri.

- Jangan memasukkan model ke bundle JavaScript awal.
- Aplikasi mengunduh model secara lazy hanya saat pengguna membuka Tes Hafalan dan mengaktifkan ASR lokal, lalu menyimpannya di Cache Storage browser.
- Pastikan total ukuran `dist/` tetap di bawah batas storage Rumahweb Entry 1 GB.

