# Audit UX mobile — 3D Intero

Laporan baca-saja untuk editor yang hidup di `3d.intero.id` (paket `3d-intero-app/`). Tidak ada perubahan kode di tahap ini.

`agents.md` di root hanya berisi front-matter `alwaysApply: true`. Isi aturan permanen tidak ada di file itu.

Breakpoint mobile: lebar viewport di bawah 768 px (`useIsMobile` di `3d-intero-app/src/components/ui.tsx`, dan `isMobileViewport` di `3d-intero-app/src/lib/utils.ts`).

Tanggal audit: 30 Oktober 2026. Lebar acuan screenshot: sekitar 375 px.

## Koreksi pada temuan awal #2

Kode sheet sudah punya tiga tinggi: 30, 60, dan 95 persen viewport (`Sheets` di `MobileUI.tsx`, state awal `60`). Geser gagang ke bawah atau ke atas mengganti tinggi itu. Tidak ada label peek / half / full. Lapisan gelap plus `blur(2px)` tetap menutupi seluruh kanvas, dan kamera tidak di-frame ulang. Secara pemakaian, model tetap tidak terlihat saat panel terbuka. Temuan M-02 tetap berlaku.

## Inventaris komponen mobile

| Komponen | File | Peran di layar sempit |
| --- | --- | --- |
| `MobileTopbar` | `3d-intero-app/src/components/mobile/MobileUI.tsx` | Bar atas 56 px: menu hamburger, logo, nama proyek, tombol Aksi (tiga titik), avatar |
| `Drawers` | file yang sama | Drawer kiri (daftar panjang) dan drawer kanan berjudul "Aksi cepat" |
| `Sheets`, `ToolsGrid`, `ViewSheet` | file yang sama | Bottom sheet. Isi Parts, Props, Layers datang dari panel desktop |
| `ComponentLibrary` (`embedded`) | `3d-intero-app/src/components/editor/ComponentLibrary.tsx` | Isi sheet Parts |
| `PropertiesPanel` (`embedded`) | `3d-intero-app/src/components/editor/PropertiesPanel.tsx` | Isi sheet Props |
| `LayersPanel` (`embedded`) | `3d-intero-app/src/components/editor/LayersPanel.tsx` | Isi sheet Layers |
| `Fab` | `MobileUI.tsx` | Tombol bulat tiga titik mengambang di kanan bawah kanvas |
| `MobileChrome` | `MobileUI.tsx` | Nav bawah: Parts, Tools, tombol pintu, Layers, Props. Juga memasang sheet, FAB, dan drawer |
| `ViewControls` | `3d-intero-app/src/components/editor/ViewControls.tsx` | Bar mengambang di bawah kanvas: Perspective (3D) atau 3D/2D, zoom persen, reset, fokus |
| `AiAssistant` | `3d-intero-app/src/components/editor/AiAssistant.tsx` | Panel chat. Tombol pembuka ada di `TopToolbar`, dan toolbar itu `headless` di mobile (`Editor.tsx`) |
| `Editor` | `3d-intero-app/src/components/editor/Editor.tsx` | Memasang `MobileTopbar` + `MobileChrome`, `paddingBottom: 64` saat mode desain |
| Gaya `.m-*` | `3d-intero-app/src/index.css` sekitar baris 321–355 | Topbar, drawer, nav, sheet, tile, FAB |

`MobileChrome` tidak merender nav dan sheet saat `appMode === 'production'` (M-16).

## Ukuran sentuh dan teks (dari CSS, lebar belum diukur di perangkat)

| Elemen | Ukuran | Ambang |
| --- | --- | --- |
| `.m-ditem` (baris drawer) | `min-height: 44px`, font 14 px | Cukup |
| `.m-bnav` | tinggi 64 px + `padding-bottom: env(safe-area-inset-bottom)` | Area nav cukup; label tab tidak |
| `.m-tab` | tinggi 60 px, font **10.5 px** | Font di bawah 12 px |
| `.m-open` (tombol pintu) | 60 × 60 px, ikon 27 px | Cukup, tetapi menonjol tanpa label |
| `.m-tile` (alat) | `min-height: 62px`, font **11 px** | Font di bawah 12 px |
| `.m-pill` (baris kedua, hanya saat ada pilihan) | tinggi **30 px**, font 12 px | Tinggi di bawah 44 px |
| `.icon-btn` | **34 × 34 px** | Di bawah 44 px |
| Tombol zoom / reset di `ViewControls` | **28 × 28 px**, angka zoom font 11 px | Di bawah 44 px dan 12 px |
| `.m-fab` | 48 × 48 px | Cukup |
| `.m-fab-btn` | **42 × 42 px** | Di bawah 44 px |
| `.m-avatar` | **32 × 32 px**, font 11 px | Di bawah 44 px |
| `.m-name` | tinggi **36 px**, font 13.5 px | Tinggi di bawah 44 px |
| `.dragnum` / handle | tinggi **32 px**, handle **26 px** lebar | Di bawah 44 px |
| `.seg button` | tinggi **26 px** | Di bawah 44 px |
| `.input` filter layer | tinggi 28 px (inline di Layers) | Di bawah 44 px |

Safe-area: hanya nav bawah yang memakai `env(safe-area-inset-bottom)`. Sheet memakai `bottom: 64px` dan FAB `bottom: 82px`, keduanya tidak menambah inset. Topbar tidak memakai `env(safe-area-inset-top)`.

Keyboard virtual: tidak ada pemakaian `visualViewport` di `3d-intero-app/src`.

Kontras: `--text-tertiary` adalah `#9CA3AF` di atas putih (`--bg-panel` / `--bg-main`). Rasio terhadap putih sekitar 2.5:1. Untuk teks di bawah 18 px, WCAG AA meminta 4.5:1. Teks bantu 11 px di kartu Parts, hint Tools, dan subjudul Properties memakai warna ini.

## Kinerja

Diukur sekali di Chrome, viewport 390 × 844, `http://127.0.0.1:5175/` (Vite dev, bukan build produksi).

| Metrik | Hasil |
| --- | --- |
| Waktu sampai `load` | 329 ms |
| Waktu sampai DOM interaktif | 155 ms |
| Transfer dokumen | sekitar 1.1 KB HTML; skrip dan CSS di-dev-serve terpisah, jadi angka ini bukan ukuran bundle produksi (`vite-plugin-singlefile` menggabungkan semuanya saat `npm run build`) |
| FPS kanvas editor | **Tidak diukur.** Landing memakai sesi akun (`getSession`) sebelum masuk editor, dan sesi uji tidak dibuat. Loop FPS ada di `SceneController` (`onFps` → `liveBus.fps`) tetapi tidak ditampilkan di UI mobile |

## Temuan

### M-01 — Kritis

- Lokasi: `MobileChrome` di `3d-intero-app/src/components/mobile/MobileUI.tsx` (nav bawah, sekitar baris 266–271). Tombol AI di `TopToolbar.tsx`; `Editor.tsx` merender toolbar itu dengan `headless={isMobile}`.
- Deskripsi: Nav bawah berisi Parts, Tools, tombol hijau bulat berikon pintu di tengah, Layers, dan Props. Tombol tengah memanggil `openToggle` (buka/tutup pintu). Ada `aria-label` "Open/Close pintu kabinet", tetapi tidak ada label yang terlihat, padahal posisinya paling menonjol. Aksi utama AI tidak punya pintu masuk di mobile.
- Usulan: Letakkan AI di bar yang selalu terlihat. Pindahkan buka/tutup pintu ke alat pada objek yang dipilih, bukan ke pusat navigasi.

### M-02 — Kritis

- Lokasi: `Sheets` di `MobileUI.tsx` (tinggi `${snap}vh`, default 60) dan `.m-sheet` di `index.css` (`bottom: 64px`, `max-height: calc(100dvh - 130px)`). Overlay: `background: rgba(0,0,0,0.28); backdropFilter: blur(2px)`.
- Deskripsi: Sheet default menutupi sekitar 60% tinggi layar dan mengaburkan kanvas. Snap 30/60/95 hanya lewat geser gagang, tanpa nama. Kanvas tidak menyusut dan kamera tidak menyesuaikan.
- Usulan: Tiga snap berlabel (peek 25%, half 50%, full 90%), default half, tanpa blur. Saat sheet terbuka, area kanvas mengecil dan kamera di-frame ke sisa area itu.

### M-03 — Tinggi

- Lokasi: `Fab` dan `.m-fab-wrap` (`right: 12px; bottom: 82px; z-index: 380`) di `index.css`. `ViewControls` memakai `position: absolute; bottom: 12px; z-index: 20`. Tombol tiga titik kedua: `MoreVertical` di `MobileTopbar` (`aria-label` "Aksi") membuka drawer kanan.
- Deskripsi: Tombol mengambang menimpa bar Perspective / persen zoom. Dua menu tiga titik punya isi berbeda: drawer kanan (simpan, ekspor, share) dan FAB (tampilan, dimensi, AR, tema, Simple/Advanced). Keduanya memakai nama "Aksi cepat" (judul drawer dan `aria-label` FAB).
- Usulan: Satu menu. Hapus FAB. Pindahkan preset tampilan dan fokus ke kontrol kecil di tepi kanvas. Hapus bar Perspective / persen dari atas kanvas; zoom lewat cubit.

### M-04 — Tinggi

- Lokasi: `.m-bnav` `z-index: 400` di atas `.m-sheet` `z-index: 395`. `.m-open` `margin-top: -26px` (`index.css`). Teks yang tertutup ada di `ToolsGrid` ("Sematkan tools ke layar…") dan di dasar `PropertiesPanel`.
- Deskripsi: Tombol hijau naik ke dalam area sheet dan menimpa isi bawah sheet karena nav digambar di atas sheet.
- Usulan: Jangan menumpuk tombol tengah di atas sheet. Setelah nav lama diganti dock, sheet berakhir di atas dock, bukan di belakang tombol yang menonjol.

### M-05 — Tinggi

- Lokasi: `Drawers` di `MobileUI.tsx`. Kiri dibuka hamburger. Kanan dibuka tombol Aksi.
- Deskripsi: Dua drawer. Simpan ke akun dan unduh/ekspor ada di kiri (File) dan di kanan (Aksi cepat). Nama proyek ada di topbar dan lagi di kanan. Lampu dan orang ada di kanan, tema ada di kiri dan di FAB.
- Usulan: Satu drawer. Hapus "Aksi cepat". Setiap fungsi hanya di satu tempat.

### M-06 — Tinggi

- Lokasi: seksi "Mode kerja" dan "Edit" di drawer kiri, `MobileUI.tsx`. Undo/Redo memakai `disabled={readOnly || !s.past.length}` dan `!s.future.length`.
- Deskripsi: Sekitar 26 baris dalam satu gulir (File 7, Edit 3, Lihat 4, Mode kerja 2, AR/VR 3, Alat 7). Mode Desain/Produksi terkubur. Undo dan Redo tidak ada di bar atas; pada proyek baru keduanya nonaktif tanpa penjelasan.
- Usulan: Bar atas memuat segmented Desain | Produksi, Undo, dan Redo. Drawer dikelompokkan paling banyak lima grup.

### M-07 — Sedang

- Lokasi: drawer kiri di `MobileUI.tsx`; ikon `Hammer` untuk "Mode Desain" dan "Component Builder"; `fileActions.export` di `3d-intero-app/src/components/editor/file-actions.ts`.
- Deskripsi: "Baru (Magic Generator)" dan "Magic Layout Wizard" membuka wizard yang sama (`showWizard`). "Layers" ada di drawer dan di nav bawah. Ikon palu dipakai untuk dua hal berbeda. "Export OBJ / SketchUp" dan "SketchUp (OBJ)" sama-sama mengunduh OBJ (`export('obj')` dan `export('skp')` menulis OBJ, yang kedua menambah catatan impor SketchUp).
- Usulan: Satu entri wizard, satu entri lapisan, ikon berbeda per fungsi. Label: "Ekspor OBJ (bisa dibuka di SketchUp)".

### M-08 — Sedang

- Lokasi: label nav `Parts` / `Tools` / `Layers` / `Props`; judul sheet `{ parts: 'Komponen', props: 'Properties', layers: 'Layers', tools: 'Tools', view: 'Tampilan' }`; `TOOL_TILES` dan `VIEWS` di `MobileUI.tsx`; tab "Built-in" di `ComponentLibrary.tsx`; "Snap gizmo" di `PropertiesPanel.tsx`.
- Deskripsi: Inggris dan Indonesia dipakai berdampingan (Properties vs Komponen, Perspective vs Tema gelap).
- Usulan: Seluruh UI mobile berbahasa Indonesia. Nama merek dan istilah yang diberi padanan boleh tetap.

### M-09 — Tinggi

- Lokasi: `fmtDims` di `3d-intero-app/src/lib/utils.ts` (baris yang mengembalikan `"… mm"`), dipakai kartu Parts di `ComponentLibrary.tsx`. `DragNumber` di `ui.tsx` memakai `scale = 10` dan label default `cm`. Ringkasan objek di `PropertiesPanel.tsx` masih menulis `mm`. Field "Tinggi total kabinet" di drawer kanan mengikat `globalCabinetHeight` (mm) tanpa konversi.
- Deskripsi: Parts menampilkan misalnya 400 × 850 × 600 mm. Props menampilkan cm. Angka tinggi total di drawer adalah milimeter mentah.
- Usulan: Satu satuan tampilan, default cm. Milimeter hanya bila pengguna memilihnya di pengaturan. Penyimpanan internal boleh tetap mm.

### M-10 — Sedang

- Lokasi: `LayersPanel.tsx` filter: ikon `Search` `absolute left-2`, input `className="input pl-7"` dengan `height: 28`. `.input` di `index.css` mengatur `padding: 0 10px` di luar layer Tailwind, sehingga `pl-7` kalah. `iconFor` di file yang sama: kulkas, angin (hood), topi koki (elektronik, kompor, sink, dishwasher), kursi (island/bar), kotak (sudut), lampu atau kubus (lainnya).
- Deskripsi: Ikon pencarian menimpa placeholder "Filter layer…". Ikon baris lapisan tidak satu keluarga.
- Usulan: Padding kiri input yang tidak tertimpa CSS `.input`. Satu set ikon lapisan. Placeholder berbahasa Indonesia.

### M-11 — Sedang

- Lokasi: `TOOL_TILES` dan grid Edit di `ToolsGrid`, `MobileUI.tsx`.
- Deskripsi: Dua belas alat memakai istilah Inggris (Hand, Orbit, Protractor, Eyedropper, dan lain-lain) tanpa penjelasan. Copy, Paste, Duplicate, Mirror, Array, Align, dan Delete di-`disabled` saat tidak ada pilihan, clipboard kosong, atau pilihan kurang dari dua, dengan opacity 0.4 dan tanpa alasan.
- Usulan: Label Indonesia. Alat yang belum bisa dipakai menampilkan syaratnya (misalnya "Pilih objek dulu"), bukan hanya tampak mati.

### M-12 — Sedang

- Lokasi: `button { font-family: inherit; cursor: pointer; }` di `index.css`. Tidak ada aturan `button:focus` atau `:focus-visible` untuk `.m-tab`.
- Deskripsi: Setelah ketukan, browser menggambar ring fokus default (sering oranye atau biru) pada tab. `.m-tab.active` hanya mengganti warna teks.
- Usulan: `outline` hanya pada `:focus-visible`, supaya sentuhan tidak meninggalkan ring keyboard.

### M-13 — Tinggi

- Lokasi: kelas di bagian "Ukuran sentuh" di atas; safe-area hanya pada `.m-bnav`.
- Deskripsi: Banyak target di bawah 44 × 44 px dan beberapa label di bawah 12 px. Home indicator dan notch tidak dihitung pada sheet, FAB, dan topbar. Dock dan kolom ketik tidak naik saat keyboard virtual muncul. Teks abu-abu kecil gagal kontras AA.
- Usulan: Target minimal 44 px, font minimal 12 px, safe-area di keempat tepi, dan dock serta bar AI naik di atas keyboard. Teks bantu memakai `--text-secondary` (`#6B7280`) atau lebih gelap.

### M-14 — Tinggi

- Lokasi: `showPeople` default `true` di `3d-intero-app/src/store.ts` (tidak dipaksa mati di mobile). Sentuhan kamera: `SceneController.ts` mengatur `controls.touches` satu jari rotasi, dua jari dolly dan geser. `useThreeFingerCycle` di `MobileUI.tsx` mengganti perspective → top → front bila tiga jari ditekan kurang dari 350 ms. Satu-satunya kalimat gestur ada di `ViewSheet` (font 11.5 px). Preset ada di `VIEWS` (Perspective, Top, Front, Back, Left, Right, Isometric) di dalam sheet, dan di dropdown `ViewControls`.
- Deskripsi: Figur manusia bisa menutupi kitchen set di layar sempit. Tidak ada preset Depan/Atas/Kiri/Kanan satu ketukan di tepi kanvas. Tidak ada petunjuk gestur sekali di pemakaian pertama. `resetView` tidak punya jarak khusus untuk layar sempit.
- Usulan: Orang animasi mati secara default di mobile. Dua kontrol kecil di tepi kanan atas: preset tampilan dan fokus/reset. Petunjuk gestur sekali. Zoom lewat cubit.

### M-15 — Tinggi

- Lokasi: "Mode Desain" / "Mode Produksi + HPP" di drawer kiri. Simple/Advanced: item FAB "Mode Simple → Advanced", dan pil `Wrench` di baris kedua topbar hanya jika `selectedIds.length > 0` (`MobileTopbar`).
- Deskripsi: Produksi tidak ada di permukaan utama. Sakelar Simple/Advanced tidak ada di bar yang selalu terlihat; di Simple, dock lengkap tetap bisa dibuka dari nav.
- Usulan: Segmented Desain | Produksi di bar atas. Mode Simple hanya menampilkan bar atas, kanvas, bar AI, dan dock ringkas.

### M-16 — Sedang

- Lokasi: `MobileChrome`: `{!production && <Sheets />}`, FAB, dan nav.
- Deskripsi: Masuk mode produksi di mobile menghilangkan nav, sheet, dan FAB sekaligus. Tidak ada dock pengganti untuk rangka, cutting list, atau HPP.
- Usulan: Mode produksi memakai bar atas yang sama dan dock isinya sendiri, dengan kanvas atau lembar kerja tetap terlihat.

### M-17 — Rendah

- Lokasi: `patchItems` / `pushHistory` di `PropertiesPanel.tsx` dan `store.ts`. Flag `projectdoc_v1` di `3d-intero-app/src/projectdoc/flag.ts` (default mati, nyala bila `localStorage` bernilai `1`).
- Deskripsi: Perubahan ukuran dan properti dari sheet menulis state langsung dan undo snapshot, bukan Command ProjectDoc. Bukan bug yang terlihat di screenshot; ini batas untuk Tahap 3c (Batal/Terapkan lewat Command).
- Usulan: Alat dock v2 memanggil Command dan tetap bisa di-undo. Flag `mobile_ux_v2` terpisah dari `projectdoc_v1`.

### M-18 — Rendah

- Lokasi: `3d-intero-app/package.json` dan `3d-intero-app/tests/` (`projectdoc.test.ts`, `projectdoc-history.test.ts`, `ai-gateway.test.ts`).
- Deskripsi: Tidak ada Playwright dan tidak ada tes tampilan mobile. Vitest yang ada tidak membuka nav atau sheet.
- Usulan: Saat implementasi, tambah tes untuk tiga keadaan: layar awal, objek dipilih, dan sedang mengedit ukuran, pada lebar 360 dan 390 px.

## Yang tidak diubah

Tidak ada file komponen, CSS, atau store yang diubah pada tahap ini.
