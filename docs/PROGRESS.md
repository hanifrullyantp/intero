# Progress 3D Intero

Ingatan jangka panjang. Perbarui setiap langkah selesai.
Status: `belum` | `sedang` | `selesai` | `menunggu persetujuan` | `dilewati`.

| # | Langkah | Status |
| --- | --- | --- |
| 1 | Audit & peta kode (`docs/CODEMAP.md`) | selesai |
| 2 | ProjectDoc + Command engine | selesai |
| 3 | AI Gateway + router tingkat kesulitan | selesai |
| 4 | Popup chat awal + wizard + suara | selesai |
| 5 | Klik komponen jadi konteks AI | selesai |
| 6 | Audit UI/UX & matematika (hanya laporan) | selesai |
| 7 | Mode Simple vs Advanced [GERBANG] | selesai |
| 8 | Mode Produksi [GERBANG] | selesai |
| 9 | Super Admin | belum |
| 10 | Rencana render realistis AI | belum |
| 11 | Mobile UX redesign | selesai |

Catatan langkah 11: Tahap 1–2 di dokumen. Kode 3a–3d ada di belakang flag `mobile_ux_v2` (default mati). Nyalakan dengan `localStorage.setItem('mobile_ux_v2','1')` lalu muat ulang, atau menu mobile "Coba tampilan mobile baru".

Catatan langkah 1: aplikasi yang cocok dengan screenshot adalah `3d-intero-app/` (deploy default `3d.intero.id`). Ada pohon kedua `3D Intero/` yang tidak ikut `npm run build`. Detail di `docs/CODEMAP.md`.

Catatan langkah 8: metode papan tidak lagi membeli hollow. Luas cat rangka mengikuti batang `buildFrame`. Meja, backsplash, dan SKU aksesori masuk RAB. Nesting MaxRects menjaga ukuran lembar, margin 10 mm, dan sisa per lembar. DXF, label QR, dan ProjectDoc sebagai sumber cut list belum dikerjakan.

Catatan langkah 7: Wave 1 (PR1) ada di belakang flag `simple_shell_v1`, default mati. Saat hidup, Mode Simple menyembunyikan toolbar, ukuran, pustaka, layers, gizmo, dan dialog mirror/array. Undo, Redo, chat AI, orbit/zoom, klik, dan Produksi tetap. Berpindah mode tidak mengubah item atau undo.

Catatan langkah 6: laporan di `docs/AUDIT.md`. Tidak ada perbaikan kode. Temuan utama: `setSettings` tidak menggeser kabinet, `repackWall` mempertahankan Y lama, mode Simple masih mengizinkan ubah ukuran. Tes gagal tidak ditambahkan.

Catatan langkah 5: kabinet yang diklik muncul sebagai chip di chat AI. Chip ikut ke pesan dan `selectedIds` gateway. Menutup chip melepas pilihan. 39 tes lulus. Flag `projectdoc_v1` tetap mati.

Catatan langkah 4: proyek kosong membuka popup "Mulai dari cerita". Kalimat Indonesia diurai menjadi RoomBrief, lalu `generateLayout`. Mikrofon memakai Web Speech `id-ID`; bila browser tidak mendukung, muncul penjelasan. Wizard lengkap tetap ada. 34 tes lulus. Flag `projectdoc_v1` tetap mati.

Catatan langkah 3: gateway di server (`POST /api/3d/ai`), router T0–T3, pratinjau lalu tombol Terapkan. Kunci OpenRouter hanya dari environment. Parser lokal tetap langsung diterapkan. 29 tes lulus. Flag `projectdoc_v1` tetap mati. Di mesin ini `better-sqlite3` belum punya biner Node 24, jadi proses Express penuh belum bisa dijalankan; handler yang sama sudah diuji lewat HTTP.

Catatan langkah 2: skema, perintah, invariant, undo command log, autosave ProjectDoc, scene dari dokumen, `docs/AI_GUIDE.md`, dan panel Struktur Proyek. 22 tes lulus. Flag `projectdoc_v1` tetap mati; nyalakan dengan `localStorage.setItem('projectdoc_v1','1')`. Asumsi: satuan cm, rumus editor hidup, diff share tidak disentuh. Pelanggaran yang sudah ada di file tidak memblokir perintah berikutnya; pelanggaran baru tetap ditolak.
