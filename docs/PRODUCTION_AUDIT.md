# Audit Mode Produksi

Laporan saja. Kode tidak diubah. Yang dinilai adalah tab Produksi di `3d-intero-app/`: Rangka 3D, Cutting List, dan HPP. Satuan hitungan tetap milimeter. Angka di tabel potong ditampilkan dalam sentimeter.

Tab yang terlihat memakai `buildProduction` untuk panel, `buildFrame` untuk batang, dan `autoHppRows` untuk harga. Kalkulator lama `computeHpp` serta panel `HppPanel` masih ada di repo dan tidak dipasang di tab ini.

## Yang sudah ada

| Bagian | Keadaan | Modul |
| --- | --- | --- |
| Daftar panel | Sisi, atas, bawah, belakang, rak, pintu, dan front laci, dengan lebar, tinggi, tebal, jumlah, material, dan label kabinet | `production/engine-papan.ts`, tabel di `CuttingTab.tsx` |
| Nesting lembar | MaxRects, kerf 3 mm, dua ukuran lembar 1220×2440 dan 1830×2440, panel berserat tidak diputar | `production/nesting.ts`, `production/index.ts` |
| Potong batang | Batang 6 m, kerf 3 mm, sisa di batang, jumlah beli | `production/frame.ts`, `production/cutlist.ts` |
| Engsel | 2 sampai 5 menurut tinggi pintu. Rel laci satu per front laci. Handle satu per pintu atau laci | `production/hardware.ts` `hingesFor` |
| Harga | Margin dan PPN 11% adalah parameter. Angka Rupiah. Estimasi bisa dibanding realisasi | `production/hpp2.ts`, `HppTab.tsx` |
| Berkas | CSV daftar panel, PDF dan Excel baris HPP, PDF potong batang | `CuttingTab.tsx`, `production/hpp-io.ts`, `production/cutlist.ts` |

## Temuan

| # | Severity | Temuan | Modul |
| --- | --- | --- | --- |
| F1 | Kritis | HPP yang terlihat selalu menambahkan batang hollow dari `buildFrame` (profil 1,5×3 cm, 1,5×1,5 cm, 2×4 cm), termasuk saat metode proyek adalah papan. Luas cat dan epoxy memakai panjang hollow 40×40 dari `engine-rangka.ts`. Satu penawaran mencampur dua geometri rangka. | `hpp2.ts` baris rencana potong dan `frameSurfaceM2`, `engine-rangka.ts`, `frame.ts` |
| F2 | Tinggi | Harga tidak dibaca dari ProjectDoc. Panel dan batang dihitung ulang dari `Item` di store. Dokumen proyek tidak menyimpan cut list. | `ProductionMode.tsx`, `buildProduction` |
| F3 | Tinggi | Aksesori yang berbeda memakai satu barang katalog. Rak gas, tempat sampah, laci sendok, dan lazy Susan mengarah ke rak sendok atau rak piring. | `hpp2.ts` `HW_MAP` |
| F4 | Tinggi | Tidak ada berkas untuk panel saw atau CNC. CSV yang ada adalah tabel panel, bukan DXF. QR yang ada adalah tautan AR, bukan label potong. | `CuttingTab.tsx`, `xr/ArDialog.tsx` |
| F5 | Tinggi | Tab HPP tidak memasukkan countertop dan backsplash. Rumus luas meja ada di `computeHpp`, dan fungsi itu tidak dipanggil tab yang terlihat. | `hpp2.ts`, `hpp.ts` |
| F6 | Sedang | Sisa lembar tidak disimpan untuk pekerjaan berikutnya. Ruang kosong hanya hidup selama nesting satu proyek. | `nesting.ts` |
| F7 | Sedang | Tidak ada margin tepi lembar. Kerf 3 mm ditambahkan ke tiap potongan, dan bak lembar dibuat lebih besar sebesar kerf, jadi tepi lembar tidak dijaga. | `nesting.ts` `pack` |
| F8 | Sedang | Alas, atas, dan rak berbutir `none`, jadi nesting boleh memutarnya. Hanya sisi dan pintu yang dikunci searah panjang. | `engine-papan.ts` |
| F9 | Sedang | Edging dijumlahkan sebagai meter, lalu dibagi 25 menjadi gulungan satu jenis. Tidak ada pisah ketebalan atau warna. Panjang hanya dari metode papan. | `index.ts` `edgeLenM`, `hpp2.ts` `c-edging` |
| F10 | Sedang | Penawaran tidak punya revisi A, B, C. Model skenario ada, tab yang terlihat hanya menyunting skenario aktif. PDF klien bergambar kerja tidak ada. PDF yang terpasang adalah tabel HPP. | `HppTab.tsx`, `hpp-io.ts` |
| F11 | Rendah | Sekrup, dowel, dan lem memakai jumlah kasar per kabinet, bukan per sambungan. | `hardware.ts` |
| F12 | Rendah | `HppPanel` dan `exportHppPdf` tidak terpasang di mode Produksi. Dua rumus harga tetap di repo. | `HppPanel.tsx`, `export-pdf.ts` |

## Yang dibutuhkan bengkel dan belum tertutup

Urutan kerja yang diminta adalah cut list, nesting, BOM, RAB, lalu ekspor. Cut list panel, nesting lembar, dan potong batang sudah terpisah. BOM hardware dan RAB sudah berupa baris HPP, dengan lubang di F1, F3, dan F5. Ekspor berhenti di CSV dan PDF harga. Gambar kerja, label QR, dan DXF belum ada.

Ukuran lembar default 122×244 cm sudah ada, dengan satu alternatif 183×244 cm. Ukuran bebas, larangan rotasi untuk seluruh bahan berserat, dan sisa yang bisa dipakai lagi belum ada.

## Nesting

Algoritma yang dipakai tetap MaxRects, best short side fit. Potongan dapur berbentuk empat persegi dan boleh disusun bebas selama serat mengizinkan. Guillotine memotong lembar lurus dari tepi ke tepi, sehingga sisa panjang sering terbuang pada panel yang ukurannya campur. MaxRects menyimpan beberapa ruang kosong sekaligus.

Lembar tidak diperbesar. Kerf 3 mm menjadi jarak antar potongan. Margin tepi 10 mm. Sisa tiap lembar tercatat di `offcutMm2`. Luas panel terpakai ditambah sisa sama dengan luas lembar.

## Sesudah persetujuan

F1, F3, dan F5 diperbaiki di `hpp2.ts`. Metode papan tidak membeli hollow. Luas cat metode rangka dihitung dari member `buildFrame`, batang yang sama dengan daftar potong. Rak gas, tempat sampah, laci sendok, lazy Susan, dan tray magic com punya nama serta harga sendiri. Countertop dan backsplash masuk RAB dari run meja yang sama dengan scene.

F2, F4, F6, dan F8 belum dikerjakan. Catatan lapangan dan status kabinet sudah ada di tab Cutting List.

ProjectDoc tetap bukan sumber scene selama flag `projectdoc_v1` mati. Produksi membaca item editor. DXF dan label QR belum dibuat.
