# Spesifikasi UX mobile v2 — 3D Intero

Dokumen saja. Tidak mengubah kode sampai ada perintah `setuju`.

Dasar: `docs/MOBILE_AUDIT.md`. Editor yang hidup: `3d-intero-app/`. `agents.md` tidak berisi aturan tambahan; pratinjau AI di bawah mengikuti permintaan produk (Terapkan / Batal, kanvas tetap terlihat).

Flag: `localStorage.mobile_ux_v2 === '1'`. Default mati, UI mobile lama tetap dipakai.

## Prinsip

- Kanvas 3D selalu terlihat, minimal 50% tinggi layar. Pengecualian: sheet pada snap full (90%).
- Panel tidak menutupi kanvas dengan blur. Saat panel terbuka, area kanvas menyusut dan kamera di-frame ke sisa area itu.
- Satu fungsi, satu tempat. Peta di bawah adalah daftar lengkap.
- Urutan tetap, atas ke bawah: bar atas, kanvas, chip pilihan, bar AI, dock.
- Dock mengikuti konteks. Memilih alat mengganti isi dock menjadi opsi alat itu, dengan Batal dan Terapkan, lalu dock kembali.
- Bahasa antarmuka Indonesia. Satuan tampilan cm. mm hanya jika pengguna memilihnya di pengaturan. Data internal boleh tetap mm.
- Mode Simple: bar atas, kanvas, bar AI, dock ringkas. Alat manual lengkap hanya di Advanced.
- Target sentuh minimal 44 px. Font minimal 12 px. Safe-area notch dan home indicator. Dock dan bar AI naik di atas keyboard virtual.

## Keputusan agar tidak dobel

Permintaan awal menaruh preset kamera di kanvas dan juga "2D/3D" di drawer, serta "Tampilan" di dock dan di drawer. Itu dua pintu untuk hal yang sama. Keputusan spesifikasi ini:

- Preset kamera hanya di tombol kanvas.
- Lampu, orang, dan tema hanya di dock Tampilan.
- Drawer tidak mengulang kamera, lampu, orang, atau tema.
- Tinggi kabinet hanya di dock Global.
- Buka/tutup pintu hanya di dock Lainnya saat objek dipilih.
- AI: bar selalu untuk menulis perintah; item dock AI hanya membuka riwayat perintah yang sama, bukan chat kedua.

## Layout

Tinggi bar atas sekitar 48 px, ditambah `safe-area-inset-top`. Dock sekitar 64 px, ditambah `safe-area-inset-bottom`. Di lebar 390 px dan tinggi 844 px, sisa kanvas tanpa chip sekitar 680 px (lebih dari 50%). Dengan chip dan sheet half, kanvas yang tersisa tetap minimal setengah layar kecuali snap full.

### Awal, tidak ada pilihan (Advanced)

```
+----------------------------------+
| [=]  Desain | Produksi  < >  Ekspor |  48px
+----------------------------------+
|                             [3D v]|
|                             [fokus]|
|            K A N V A S            |
|                                  |
+----------------------------------+
| [mic] Bilang apa yang diubah [>] |  bar AI
+----------------------------------+
| AI Komponen Ukur Lapisan >       |  dock, geser
+----------------------------------+
```

Item dock tersembunyi (Global, Tampilan) ditandai oleh tepi yang memudar dan masih bisa digeser.

### Ada objek terpilih

```
+----------------------------------+
| [=]  Desain | Produksi  < >  Ekspor |
+----------------------------------+
|            K A N V A S            |
+----------------------------------+
| Base Cabinet 60              [x] |  chip
| [mic] Bilang apa yang diubah [>] |
| Ukuran Material Geser Putar >    |
+----------------------------------+
```

Dock terpilih, setelah digeser: Duplikat, Hapus, Lainnya.

### Sedang mengedit ukuran

```
+----------------------------------+
|            K A N V A S            |  >= 50%
+----------------------------------+
| Ukuran                      [x]  |
| Lebar   [-] 60 cm [+]            |
| [========slider========]         |
| Tinggi  [-] 85 cm [+]            |
| Dalam   [-] 56 cm [+]            |
| [ Batal ]          [ Terapkan ]  |
+----------------------------------+
```

Angka bisa diketik. Sebelum Terapkan, perubahan hanya pratinjau pada model. Batal mengembalikan ukuran semula.

### Sheet Komponen, snap half

```
+----------------------------------+
| [=] Desain|Produksi  < >  Ekspor |
|            K A N V A S            |  menyusut + frame
+----------------------------------+
| [mic] ...                    [>] |
| --------- gagang sheet ---------|
| Komponen                     [x] |
| [ cari komponen            ]     |
| [gambar] Base 60                 |
|          40 x 85 x 60 cm         |
+----------------------------------+
  peek 25% | half 50% | full 90%
```

Snap full boleh menutupi lebih dari setengah kanvas. Default half. Tanpa blur.

### Keyboard terbuka

Bar AI dan dock (atau panel opsi) duduk di atas keyboard. Kanvas mengecil. Tidak ada elemen yang tertutup keyboard.

### Drawer menu (satu-satunya)

```
+---------------------------+
| Dapur Ibu Ani          [x]|
| Tersimpan di akun         |  ketuk nama untuk ganti
|---------------------------|
| Proyek                    |
|  Baru / Buka / Simpan /   |
|  Simpan sebagai           |
| Ekspor dan bagikan        |
|  Gambar / OBJ / HPP /     |
|  Tautan / QR AR / .intero |
| Alat lanjutan             |
|  Magic Layout Wizard /    |
|  Component Builder /      |
|  Daftar harga / Kolaborasi|
| Bantuan                   |
|  Pintasan / Tutorial /    |
|  Tentang                  |
+---------------------------+
```

Tidak ada avatar. Tidak ada drawer kedua. Tidak ada tombol tiga titik mengambang.

## Komponen

| Perlakuan | Apa |
| --- | --- |
| Baru, di belakang flag | Kerangka mobile v2: bar atas, kontrol kanvas, chip, bar AI, dock kontekstual, sheet 3 snap, drawer tunggal. File baru di `3d-intero-app/src/components/mobile/` (misalnya `MobileShell.tsx`, `MobileDock.tsx`, `MobileSheet.tsx`, `MobileMenu.tsx`). |
| Diubah hanya saat flag nyala | `Editor.tsx` memilih shell v2 atau `MobileTopbar` + `MobileChrome`. `ViewControls` disembunyikan di mobile v2. `SceneController` mem-frame ulang saat tinggi kanvas berubah, dan gestur satu jari / dua jari mengikuti bagian interaksi. |
| Dipakai ulang, label dan satuan disesuaikan | `ComponentLibrary`, `LayersPanel`, `PropertiesPanel` untuk isi sheet dan dock Global. `fmtDims` butuh tampilan cm. `DragNumber` sudah menampilkan cm. |
| Tidak dirender di v2 | `Fab`, nav `.m-bnav`, tombol `.m-open`, drawer kanan "Aksi cepat", bar Perspective / persen zoom. Kode lama tetap ada selama flag mati. |
| Tidak diubah di 3a | Backend AI. Bar AI di 3a hanya UI. |

## Peta fungsi (satu tempat)

| Fungsi lama | Tempat baru |
| --- | --- |
| Parts / panel komponen | Dock Komponen, sheet |
| Layers | Dock Lapisan, sheet. Hilang dari drawer |
| Props objek | Dock Ukuran, Material, Geser, Putar. Bukan sheet penuh |
| Props global, tinggi total, snap | Dock Global |
| Tombol hijau buka pintu | Dock Lainnya, hanya saat objek dipilih |
| Tools: Select, Orbit, Zoom, Hand | Gestur kanvas. Tidak ada tile alat kamera |
| Ukur / dimension / protractor | Dock Ukur |
| Geser, putar, skala | Dock Geser dan Putar (skala lewat Ukuran) |
| Copy, Paste, Duplicate, Mirror, Array, Align, Delete | Duplikat dan Hapus di dock. Sisanya di Lainnya |
| AI Edit | Bar AI. Riwayat: item dock AI |
| Undo, Redo | Bar atas |
| Desain / Produksi | Bar atas, segmented |
| Simple / Advanced | Bar atas, label "Sederhana / Lengkap", di samping segmented Desain \| Produksi |
| Nama proyek | Header drawer. Ketuk untuk ganti nama |
| Status simpan | Header drawer, di bawah nama |
| Avatar, menu akun | Header drawer, baris akun di bawah status. Tidak di bar atas |
| Baru, Buka, Simpan, Simpan sebagai | Drawer, grup Proyek |
| Unduh .intero | Drawer, grup Ekspor, label "File proyek (.intero)" |
| PNG / JPG | Drawer, "Gambar" |
| OBJ dan SketchUp (OBJ) | Satu item: "Ekspor OBJ (bisa dibuka di SketchUp)" |
| HPP PDF / Excel | Drawer, grup Ekspor |
| Tautan lihat / edit | Drawer, "Tautan" |
| QR AR | Drawer, grup Ekspor |
| AR Preview, Foto ruangan, VR | Drawer, grup Ekspor, satu baris "Lihat di ruangan" yang membuka pilihan AR / foto / VR. Tidak di FAB |
| 3D, Depan, Atas, Kiri, Kanan, Isometric | Tombol kanvas saja. Atas = denah 2D. Isometric masuk daftar preset yang sama |
| Sub-mode denah (base / wall / split) | Di dalam preset Atas, Advanced saja |
| Zoom persen dan tombol +/− | Dihapus dari mobile. Cubit dua jari |
| Reset view / fokus | Tombol kanvas "Fokus" |
| Lampu LED, orang, tema, grid, bayangan | Dock Tampilan |
| Magic Layout Wizard (dan "Baru" yang sama) | Baru = proyek kosong + wizard. Wizard ulang = Alat lanjutan, satu entri |
| Component Builder | Alat lanjutan |
| Daftar harga | Alat lanjutan |
| Kolaborasi | Alat lanjutan |
| Pintasan, tutorial, tentang | Bantuan |
| Preferensi satuan | Bantuan tidak. Ada di dock Global, bagian bawah: "Satuan tampilan" |
| Tiga titik mengambang | Dihapus |
| Drawer Aksi cepat | Dihapus |

Mode Simple menyembunyikan dari dock: Ukur detail, Global lanjutan, Putar, Duplikat, Lainnya. Yang tetap: bar atas, kanvas, bar AI, dock Komponen, Ukuran (jika ada pilihan), Material, Hapus.

## Perilaku

### Dock

Tanpa pilihan: AI, Komponen, Ukur, Lapisan, Global, Tampilan.

Ada pilihan: Ukuran, Material, Geser, Putar, Duplikat, Hapus, Lainnya.

Lainnya berisi: buka/tutup pintu, salin, tempel, cermin, deret, sejajar. Masing-masing menyebut syaratnya jika belum bisa dipakai.

Memilih alat mengganti dock menjadi panel opsi. Batal membuang pratinjau. Terapkan mengirim satu Command lalu menutup panel.

| Alat | Command (`3d-intero-app/src/projectdoc/commands.ts`) |
| --- | --- |
| Ukuran | `update_item` patch `dims` (cm pada dokumen; konversi ke mm hanya di adapter editor lama) |
| Material | `set_material` |
| Geser | `move_item` |
| Putar | `update_item` patch `rotationY` |
| Duplikat | `duplicate_item` |
| Hapus | `remove_item` (Terapkan setelah konfirmasi satu baris, bukan dialog kedua) |
| Global, tinggi total | `set_global` `tinggiTotalCm` |

Flag `projectdoc_v1` tetap terpisah. Mobile v2 memanggil `applyCommand` untuk aksi dock ini. Jika flag ProjectDoc mati, adapter yang sama tetap mencatat undo; tidak menulis `patchItems` langsung dari panel opsi.

### Sheet

Komponen dan Lapisan: peek 25%, half 50%, full 90%. Default half. Gagang dan tiga titik snap yang terlihat. Tombol tutup. Filter lapisan punya padding kiri yang tidak tertimpa `.input`. Ikon lapisan satu gaya (semua garis, 24 px). Satuan kartu komponen cm.

### Kanvas

- Satu jari: orbit.
- Dua jari: geser dan cubit zoom.
- Ketuk objek: pilih. Ketuk kosong: batal pilih.
- Ketuk dua kali: fokus ke objek.
- Tahan lalu geser: pindahkan objek terpilih, hanya Advanced, dan baru terapkan sebagai `move_item` saat jari dilepas.
- Petunjuk gestur sekali, disimpan di `localStorage` (`intero_mobile_gesture_hint`).
- Orang animasi default mati di mobile v2, tanpa mengubah default desktop.
- Zoom awal di lebar di bawah 768 px mem-frame seluruh dapur dengan margin, bukan jarak desktop.

### Bar AI

Satu baris: mikrofon, kolom "Bilang apa yang diubah", kirim. Mikrofon memakai Web Speech jika ada; jika tidak, tombol menjelaskan bahwa perangkat tidak mendukung.

Perintah tidak langsung mengubah proyek. Hasil ditampilkan sebagai pratinjau pada kanvas dengan Terapkan dan Batal. Terapkan menjalankan Command yang sama dengan dock. Batal membuang pratinjau. Di sub-tahap 3a, bar hanya UI; pratinjau menyusul saat perintah AI dihubungkan.

### Sentuh, papan ketik, akses

- Setiap tombol dock, bar atas, chip, dan stepper minimal 44 × 44 px.
- Label dock 12 px.
- `:focus-visible` saja yang menggambar ring. Ketukan tidak meninggalkan ring oranye.
- Teks bantu memakai `--text-secondary` atau lebih gelap, bukan `#9CA3AF` pada ukuran 12 px.
- `visualViewport` mengangkat bar AI dan dock saat keyboard muncul.

## Urutan implementasi

Berhenti setelah tiap sub-tahap dan tunggu `lanjut`.

1. **3a Kerangka.** Flag, bar atas, kanvas dengan dua kontrol, bar AI (UI), dock tiga keadaan (kosong, terpilih, panel contoh Ukuran yang belum menulis data), hapus FAB dan nav lama dari jalur v2.
2. **3b Sheet.** Komponen dan Lapisan, 3 snap, re-frame kamera, filter, ikon, satuan cm pada kartu.
3. **3c Alat.** Ukuran, Material, Geser, Putar, Duplikat, Hapus dengan Batal/Terapkan lewat Command dan undo.
4. **3d Penutup.** Drawer tunggal, sisa salinan bahasa, preset, gestur, safe-area, keyboard, fokus, Simple vs Advanced.

Uji yang harus ada di akhir 3d: lebar 360 dan 390; keadaan awal, objek dipilih, mengedit ukuran; tidak ada tumpang-tindih; kanvas minimal 50% kecuali snap full; undo setelah Terapkan.

## Di luar cakupan

Mode produksi desktop, landing, dan pohon `3D Intero/` tidak didesain ulang di sini. Mode produksi mobile hanya mendapat segmented di bar atas pada 3a; dock produksinya menyusul setelah v2 desain lolos, supaya nav lama tidak hilang tanpa pengganti (temuan M-16).
