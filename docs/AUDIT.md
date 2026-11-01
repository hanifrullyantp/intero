# Audit UI/UX dan matematika

Laporan saja untuk editor yang hidup di `3d-intero-app/`. Tidak ada perbaikan kode di langkah ini. Rumus pembanding di pohon `3D Intero/` tidak dipakai.

Satuan internal editor tetap milimeter. Angka di `DragNumber` berunit `cm` dibagi 10 saat ditampilkan dan dikali 10 saat disimpan (`3d-intero-app/src/components/ui.tsx`).

Tes yang gagal tidak ditambahkan. Suite yang ada tetap hijau. Kasus di bawah ini dicatat sebagai calon tes, bukan sebagai tes yang sengaja digagalkan.

## Matematika

| # | Temuan | Tingkat | Bukti |
| --- | --- | --- | --- |
| M1 | Tinggi kabinet atas = tinggi total − tinggi base − celah. Tebal countertop tidak mengurangi tinggi itu. Dasar kabinet atas = tinggi base + celah. | informasi | `wallHeightOf` dan `wallBottomOf` di `3d-intero-app/src/store.ts`. Default 2400, 850, dan 500 mm menghasilkan tinggi atas 1050 mm dan dasar atas 1350 mm. |
| M2 | Backsplash otomatis = dasar kabinet atas − tinggi base − tebal countertop, minimal 100 mm. | informasi | `backsplashHeightOf` di `store.ts`. |
| M3 | `setSettings` hanya menyimpan angka global. Kabinet yang sudah ada tidak berubah tinggi atau posisi Y. `setGlobalHeight` yang menggeser kabinet atas, tall, kulkas, dan elektronik. | tinggi | `setSettings` dan `setGlobalHeight` di `store.ts`. Mengubah base atau celah lewat settings membuat panel dan model tidak sepakat sampai ada repack yang menulis Y. |
| M4 | Saat merapikan dinding, kabinet atas yang Y-nya sudah lebih dari 0 mempertahankan Y lama. Rumus `base + celah` hanya dipakai bila Y dianggap kosong. | tinggi | `repackWall` di `3d-intero-app/src/engine/walls.ts`: `Math.max(y, 0) \|\| settings.baseHeight + settings.wallGap`. |
| M5 | Label `Wall Cabinet 60cm` adalah lebar, bukan tinggi. Panel properti juga menulis tinggi global dalam mm di samping bidang yang tampilannya cm. | sedang | `defaultName` di `store.ts` memakai `w / 10`. Catatan di `PropertiesPanel.tsx` menyebut `globalCabinetHeight` mm. |
| M6 | Wizard dan popup awal mengirim panjang dinding dalam cm. `generateLayout` mengalikan 10 menjadi mm. | informasi | `layout-generator.ts` dan `briefToWizardInput`. Kontrak ini sudah konsisten selama pemanggil tidak mengirim mm. |
| M7 | Cabang acak di pengisi celah selalu memilih tipe `base`. Panggilan `Math.random` tidak mengubah hasil, tetapi membuat fungsi tetap tidak murni. | rendah | `layout-generator.ts`, kedua sisi ternary adalah `'base'`. |
| M8 | ProjectDoc memakai cm dan, saat flag mati, tidak menjadi sumber scene. `set_global` pada dokumen tidak memindahkan kabinet yang sudah ada. | informasi | Flag `projectdoc_v1` default mati. Jangan mencampur rumus `3D Intero/src/engine/kitchenRules.ts`, yang menambahkan tebal countertop ke dasar kabinet atas. |

## UI/UX

| # | Temuan | Tingkat | Bukti |
| --- | --- | --- | --- |
| U1 | Mode Simple masih membuka dimensi, posisi, material, dan hapus. Yang disembunyikan antara lain konfigurasi pintu, aksesoris, dan sebagian bagian lanjutan. Toolbar menyisakan alat yang bertanda simple. | sedang | `PropertiesPanel.tsx` memakai `!simple` hanya pada sebagian section. `LeftToolbar.tsx` memfilter `TOOLS`. |
| U2 | Proyek kosong membuka popup cerita. Wizard lengkap ada di tombol kedua dan di menu. Dua pintu masuk ini sah, tetapi pengguna yang mencari Magic Generator langsung tidak melihat diagram sampai menekan Wizard lengkap. | rendah | `Editor.tsx` mengatur `startChat`. Menu tetap `showWizard`. |
| U3 | Chip konteks hanya terlihat saat panel AI Edit terbuka. Klik di kanvas tetap memilih objek, jadi chip muncul belakangan dengan pilihan yang sama. Di lebar di bawah `md`, tombolnya ikon tanpa teks "AI Edit". | sedang | `AiAssistant.tsx` dan tombol di `TopToolbar.tsx` (`hidden md:inline`). |
| U4 | Satu kolom chat memakai dua perilaku: perintah yang parser lokal kenali langsung mengubah model, perintah lain menunggu Terapkan. | sedang | `executeAiWithLlmFallback` di `ai-assistant.ts`. |
| U5 | Landing tidak punya error boundary. Jika WebGL gagal dibuat, pohon React landing jatuh dan editor tidak terbuka. | sedang | `SceneController` dipanggil dari efek di `Landing.tsx`. Terlihat saat browser headless tanpa WebGL. |
| U6 | Tampilan mobile baru ada di belakang `mobile_ux_v2` dan tidak aktif secara default. Audit ini tidak menilai ulang layar itu. | informasi | `docs/PROGRESS.md` langkah 11. |

## Yang tidak diubah

Tidak ada patch perilaku, tidak ada tes baru, dan flag `projectdoc_v1` tetap mati.
