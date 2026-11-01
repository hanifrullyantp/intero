# Roadmap Mode Advanced

Laporan saja. Tidak ada perubahan kode di bagian ini. Editor yang dinilai adalah `3d-intero-app/`. Pohon `3D Intero/` tidak dipakai.

Skor akuisisi adalah dampak bagi pengguna SketchUp yang pindah ke Intero, 1 (kecil) sampai 5 (langsung terasa di sesi pertama). Usaha: S = sehari di satu modul, M = beberapa modul dan tes, L = alur baru atau format baru.

## Alur tukang yang dijadikan patokan

1. Ukur lapangan: panjang dinding, tinggi plafon, posisi pintu, jendela, dan titik listrik.
2. Gambar kerja: denah, tampak, dan ukuran yang bisa diketik, bukan hanya digeser.
3. Persetujuan klien: klien melihat dan memberi komentar tanpa toolbar gambar.
4. Produksi: potong, hardware, dan harga keluar dari ukuran yang sama.
5. Pasang: revisi ukuran di lapangan tidak merusak kabinet yang sudah disetujui.

Mode Simple adalah langkah 3 dan langkah 1 yang dibantu AI. Mode Advanced adalah langkah 2. Mode Produksi adalah langkah 4 dan dinilai di langkah 8, bukan dibangun di sini.

## Yang sudah ada dan tidak diusulkan ulang

| Kemampuan | Modul |
| --- | --- |
| Ketik angka di kolom ukuran (tampilan cm, simpan mm) | `3d-intero-app/src/components/ui.tsx` `DragNumber` |
| Snap gizmo 1/10/50/100 mm dan snap tepi tetangga | `Editor.tsx`, `SceneController.ts` `snapToNeighbors` |
| Kunci objek, dan objek terkunci tidak ikut geser | `LayersPanel.tsx`, `Viewport.tsx` |
| Peringatan tumpang tindih, belum menolak | `engine/walls.ts` `validateItem` |
| Pustaka base, wall, tall, laci, sudut, island, elektronik | `lib/constants.ts` `LIBRARY` |
| Engsel dihitung dari tinggi pintu saat produksi | `production/hardware.ts` `hingesFor` |
| Tampak perspective, top, front, back, left, right, iso | `ViewControls.tsx` |
| Garis dimensi overall, dinding, kabinet, vertikal | `dimensions/compute.ts` |
| Tautan lihat dan sunting | `App.tsx` `shareMode` |
| Multi-pilih, salin, mirror, array, ratakan | `LeftToolbar.tsx`, `store.ts` |
| Undo dan redo | `store.ts` |
| Ekspor PNG, JPG, OBJ (bukan berkas `.skp`) | menu File di `TopToolbar.tsx` |
| Tampilan HP di belakang `mobile_ux_v2` | langkah 11, `components/mobile/` |

Mode Simple hari ini masih membuka ukuran, posisi, material, dan hapus (`PropertiesPanel.tsx`). Toolbar kiri hanya menyisakan select, move, rotate, dan paint (`LeftToolbar.tsx`). Itu belum memenuhi janji “fitur manual hanya di Advanced”.

## Usulan

### Presisi

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Kotak angka saat alat geser aktif: ketik `120` lalu Enter menggeser 120 cm, seperti kotak nilai SketchUp | Ukur lapangan langsung jadi ukuran, tanpa menggeser pixel | M | 5 | Tidak mengubah `DragNumber` yang sudah bisa diketik di panel | `Viewport.tsx`, `Editor.tsx`, `store.ts` |
| P2 | Jarak tetap antara dua kabinet yang dipilih, selain ratakan yang sudah ada | Revisi lapangan menjaga celah kompor atau kulkas | M | 4 | `projectdoc_v1` bila jarak disimpan sebagai command | `PropertiesPanel.tsx`, `projectdoc/schema.ts`, `engine/walls.ts` |
| P3 | Inferensi titik ujung, tengah, dan sejajar, di atas snap 20 mm yang sudah ada | Gambar denah terasa seperti SketchUp | M | 4 | Tidak mengganti snap gizmo | `SceneController.ts` `snapToNeighbors` |
| P4 | Tabrakan pada baris yang sama menolak lepas mouse, bukan hanya peringatan | Mengurangi kitchen set yang saling menusuk | M | 3 | Invariant ProjectDoc sudah ada saat flag hidup; editor hidup masih memakai `validateItem` | `engine/walls.ts`, `Viewport.tsx` |

Kunci objek sudah ada. Tidak masuk gelombang.

### Parametrik

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| PA1 | Mengubah tinggi base atau celah lewat pengaturan global ikut memindahkan kabinet atas yang sudah ada | Satu angka plafon mengubah set, bukan hanya kabinet baru | M | 4 | Tidak memakai rumus pohon `3D Intero/` | `store.ts` `setSettings`, `engine/walls.ts` `repackWall` |
| PA2 | Modul lemari pakaian dan unit TV yang lebarnya mengikuti sisa dinding | Interior di luar kitchen set, masih satu dokumen | L | 3 | Generator baru, bukan hanya baris di `LIBRARY` | `lib/constants.ts`, `generators/`, `types.ts` |

Pustaka base, wall, tall, laci, dan sudut sudah ada dengan ukuran jadi. Tinggi kabinet atas mengikuti `setGlobalHeight`, bukan setiap penulisan settings.

### Hardware

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | Jumlah engsel, rel, dan handle tampil di kartu kabinet saat desain | Tukang melihat BOM sebelum masuk tab produksi | S | 3 | Aturan tetap `hingesFor`. Lampu LED belum satu daftar dengan engsel. Detail bengkel ada di langkah 8 | `production/hardware.ts`, `PropertiesPanel.tsx` |

### Anotasi

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Tampak depan dan atas menampilkan garis ukuran kabinet tanpa harus menyalakan layer dulu | Gambar kerja langsung bisa difoto untuk klien | S | 4 | `compute.ts` sudah menghitung garis | `dimensions/compute.ts`, `ViewControls.tsx` |
| A2 | Potongan (section) pada satu dinding | Gambar pasang untuk tukang | L | 3 | Kamera ortografis sudah ada | `ViewControls.tsx`, `three/SceneController.ts` |

### Kolaborasi

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| K1 | Komentar klien menempel pada satu kabinet di tautan lihat | Persetujuan tidak terjadi di chat terpisah | L | 3 | `shareMode === 'view'` sudah memblokir sunting | `App.tsx`, `Viewer.tsx`, penyimpanan share di server |
| K2 | Versi bernama (pengajuan A, B, C), terpisah dari undo | Revisi klien tidak menimpa ukuran yang sudah disetujui | L | 3 | Undo command log hanya hidup saat `projectdoc_v1` | `store.ts`, `projectdoc/` |

Tautan lihat dan sunting sudah ada.

### Interop

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | Ekspor glTF dari scene yang sama | Arsip dan viewer lain tanpa mengaku sebagai SketchUp | M | 4 | three.js sudah di paket | `three/SceneController.ts`, menu File |
| I2 | DXF untuk panel saw | Bengkel yang sudah punya mesin | L | 4 | Diputuskan bersama langkah 8, jangan dua ekspor | `production/` |
| I3 | Berkas `.skp` | Pengguna lama SketchUp | L | 2 | Format proprietary. OBJ yang ada tetap OBJ, label tidak menyebut SketchUp sebagai berkas asli | menu File |

PDF penawaran dan cut list sudah ada di mode Produksi. Gambar kerja berlembar diserahkan ke langkah 8.

### Produktivitas

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| PR1 | Mode Simple hanya menampilkan chat AI, orbit dan zoom, klik objek, Undo, Redo, dan tombol Produksi. Semua alat manual pindah ke Advanced | Klien dan pemilik bengkel tidak melihat toolbar SketchUp. Advanced tetap untuk juru gambar | S | 5 | Flag baru, default mati. `mobile_ux_v2` tidak diubah | `Editor.tsx`, `LeftToolbar.tsx`, `PropertiesPanel.tsx`, `TopToolbar.tsx`, `ViewControls.tsx`, `ComponentLibrary.tsx` |

Multi-pilih, grup lewat `parentId`, array, mirror, template wizard, dan shortcut V/M/R sudah ada di Advanced. PR1 hanya menyembunyikannya dari Simple.

### Kinerja

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| KN1 | Ukur FPS pada dapur default, lalu instancing untuk engsel dan handle yang berulang | Scene padat tetap bisa diedit di laptop bengkel | L | 3 | Angka 23 FPS pada screenshot lama tidak diukur ulang di laporan ini | `three/SceneController.ts`, `ViewControls.tsx` status bar |

### Perangkat

| ID | Usulan | Manfaat pada alur | Usaha | Skor | Dependensi | Modul |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | Pena pada tablet untuk geser di Advanced | Ukur di lapangan tanpa mouse | L | 2 | Layar HP sudah punya spesifikasi sendiri di langkah 11. Jangan membuka ulang `mobile_ux_v2` | `Viewport.tsx` |

## Gelombang

Wave 1 adalah yang paling terasa dan paling murah. Hanya PR1.

| Gelombang | Isi | Alasan |
| --- | --- | --- |
| Wave 1 | PR1 | Satu perubahan tampilan. Data proyek tidak ditulis. Langsung memisahkan klien dan juru gambar. |
| Wave 2 | P1, P2, P3, PA1, A1, I1 | Presisi ketik dan ukuran yang ikut pengaturan global. Masih di editor yang ada. |
| Wave 3 | P4, PA2, H1, A2, K1, K2, I2, KN1, D1 | Modul baru, format baru, atau kerja yang dimiliki langkah 8 dan 11. |

I3 tidak dijadwalkan.

## Wave 1

Diimplementasikan di belakang flag `simple_shell_v1` (default mati). Nyalakan dengan `localStorage.setItem('simple_shell_v1','1')` lalu muat ulang. Mode Advanced tidak berubah. Tampilan HP baru (`mobile_ux_v2`) tidak diubah.

Saat flag hidup:

- Simple menampilkan chat AI, orbit, zoom, klik untuk memilih, Undo, Redo, dan tombol Produksi.
- Toolbar kiri, kolom ukuran, pustaka, layers, gizmo, dan dialog mirror atau array tidak tampil di Simple.
- Advanced menampilkan alat yang ada sekarang.
- `setUiMode` tetap hanya menyimpan pilihan tampilan. Item, dinding, dan settings tidak berubah. Tidak ada command baru, karena tidak ada data proyek yang berubah.
- Tes memastikan perpindahan mode tidak mengubah jumlah item dan tidak menambah langkah undo.

## Yang tidak diubah

Flag `projectdoc_v1` dan `mobile_ux_v2` tetap mati. Wave 2 dan Wave 3 belum dikerjakan.
