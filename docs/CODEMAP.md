# CODEMAP — 3D Intero

Audit baca-saja. Setiap klaim menyebut path. Yang tidak ada di repo ditulis **tidak ditemukan**.

Sumber kebenaran untuk UI di screenshot (menu File/Edit/Lihat/Visual/Bantuan, AI Edit, Desain/Produksi, Simple/Advanced, panel Layers per dinding, "Pengaturan Global Dapur", Snap gizmo, Marble Putih) adalah paket **`3d-intero-app/`**. String UI itu ada di `3d-intero-app/src/components/editor/PropertiesPanel.tsx` (sekitar baris 308–318) dan `3d-intero-app/src/components/editor/TopToolbar.tsx` (sekitar baris 181).

Deploy default `3d.intero.id` memakai paket itu: `package.json` skrip `build` memanggil `build:3d` yang membangun `3d-intero-app`, lalu `vercel.json` dan `middleware.ts` menulis ulang host `3d.intero.id` ke `/3d/`. Skrip `build:3d-cloud` membangun folder **`3D Intero/`** dan **tidak** dipanggil oleh `npm run build`.

Ada dua pohon editor. Rumus tinggi dan satuannya berbeda. Bagian 5 di bawah memisahkan keduanya.

---

## 1. Stack nyata

### Editor yang hidup (`3d-intero-app/`)

| Lapisan | Yang ada | Path |
| --- | --- | --- |
| UI | React 19.2.6 | `3d-intero-app/package.json` |
| Bundler | Vite 7.3.2, plugin React, Tailwind CSS 4 (`@tailwindcss/vite`), `vite-plugin-singlefile` | `3d-intero-app/package.json`, `3d-intero-app/vite.config.ts` |
| Bahasa | TypeScript 5.9 | `3d-intero-app/package.json` |
| 3D | three.js `^0.160.0`, `@types/three` `^0.160.0` | `3d-intero-app/package.json` |
| Animasi | gsap `^3.12.5` | `3d-intero-app/package.json`; tween posisi di `3d-intero-app/src/three/SceneController.ts` |
| State | Zustand 5 (`create` tanpa middleware persist) | `3d-intero-app/src/store.ts` |
| DB proyek | IndexedDB lewat Dexie 3, database `intero_db`, satu draft id `'draft'` | `3d-intero-app/src/lib/persistence.ts` |
| Auth editor | Mock: `localStorage` `intero_isLoggedIn` / `intero_user`. Komentar di file: tidak ada server, JWT, atau hashing | `3d-intero-app/src/components/AuthModal.tsx` |
| AI | Parser regex lokal. OpenRouter dipanggil **dari browser** bila user menempel API key (`localStorage` `intero_ai_key`), model hardcode `google/gemini-2.5-flash` | `3d-intero-app/src/engine/ai-assistant.ts` baris 356–378, `3d-intero-app/src/components/editor/AiAssistant.tsx` baris 28 dan 68–69 |
| Ekspor | jsPDF, SheetJS (`xlsx`), QR (`qrcode-generator`), file `.intero` JSON, OBJ | `3d-intero-app/package.json`, `3d-intero-app/src/lib/persistence.ts`, `3d-intero-app/src/production/export-pdf.ts`, `3d-intero-app/src/production/export-excel.ts` |
| Kompresi share lama | `lz-string` | `3d-intero-app/src/lib/share-link.ts` |
| Zod, command layer, feature flag `projectdoc_v1` | **tidak ditemukan** | pencarian `zod`, `applyCommand`, `schemaVersion`, `projectdoc` di repo hanya menemukan pemanggilan OpenRouter di file AI di atas |
| Web Speech / STT | **tidak ditemukan** | pencarian `SpeechRecognition` |
| Test runner di paket ini | **tidak ditemukan** | `3d-intero-app/package.json` hanya `dev` / `build` / `preview`. Tidak ada file `*.test.*` di bawah `3d-intero-app/` |

### Situs induk (bukan editor 3D)

| Lapisan | Yang ada | Path |
| --- | --- | --- |
| UI | React 19.2.3, React Router 7, Tailwind 4, Vite 7 | `package.json` (root) |
| API lokal | Express 4, `tsx`, cookie-parser, cors, multer, nodemailer, bcryptjs, jsonwebtoken | `package.json`, `server/index.ts`, `server/auth.ts` |
| DB lokal | better-sqlite3, file `server/data/intero.sqlite`, tabel `settings` dan `leads` | `server/db.ts` |
| Cloud | Supabase JS. Share 3D: tabel `instant3d_shares` bila env Supabase aktif, kalau tidak SQLite | `server/instant3dShares.ts`, `server/supabaseShares.ts`, `supabase/migrations/20250415100000_instant3d_shares.sql` |
| Auth CMS | Satu user admin (`ADMIN_USERNAME`, default `"admin"`), password bcrypt, JWT di cookie. Bukan RBAC superadmin/admin/support/user | `server/index.ts` baris 116–141, `server/auth.ts` |
| 2FA | **tidak ditemukan** | pencarian `2FA` / `totp` |
| Hosting | Vercel (`vercel.json`, `@vercel/functions` di `middleware.ts`). Docker Compose memetakan volume SQLite untuk VPS | `vercel.json`, `middleware.ts`, `docker-compose.yml`, `README.md` |
| Serverless share | `api/instant3d/shares/index.ts`, `api/instant3d/shares/[id].ts` | folder `api/` |

### Pohon kedua (tidak ikut build default)

`3D Intero/package.json`: React 19.2.6, Vite 7.3.2, Tailwind 4, three `^0.186.1`, Zustand 5, Dexie 4, Supabase JS, gsap, jsPDF. **Tidak** memakai `vite-plugin-singlefile`. Komentar satuan di `3D Intero/src/models/types.ts` baris 2: sentimeter, akurasi 0.1 cm. Ada dua file tes: `3D Intero/tests/kitchen.regression.test.ts`, `3D Intero/tests/electronics-layers.test.ts`. Skrip `test` di `3D Intero/package.json`: **tidak ditemukan** (hanya `dev`, `build`, `preview`).

---

## 2. Peta folder

### Root

| Path | Peran |
| --- | --- |
| `src/` | Landing intero.id, halaman harga/privasi, admin CMS (`src/admin/`) |
| `server/` | API Express: login admin, settings, leads, share Instant 3D |
| `api/` | Handler Vercel untuk share |
| `supabase/migrations/` | SQL CMS, CRM leads, `instant3d_shares`, SaaS |
| `middleware.ts` | Host `3d.intero.id` diarahkan ke `/3d/` |
| `3d-intero-app/` | Editor 3D yang di-deploy |
| `3D Intero/` | Editor paralel, satuan cm, rumus tinggi lain |
| `agents.md` | Hanya front-matter `alwaysApply`. Isi aturan permanen **tidak ditemukan** di file itu |
| `docs/` | Dokumen ini dan `docs/PROGRESS.md`. Di `3D Intero/docs/kitchen-dimensions.md` ada catatan rumus pohon kedua |

### `3d-intero-app/src/`

| Path | Peran |
| --- | --- |
| `main.tsx`, `App.tsx` | Entry. State layar: landing, editor, viewer. Buka `/s/:id` atau hash `#s=` |
| `store.ts` | Zustand: proyek, UI, undo snapshot, mutasi item |
| `types.ts` | `ProjectData`, `Item`, `Wall`, `ProjectSettings`. Komentar baris 1: semua ukuran mm |
| `lib/constants.ts` | Default global, pustaka modul, preset gaya, shortcut, nama dinding |
| `lib/persistence.ts` | Dexie, file `.intero`, ekspor gambar/OBJ |
| `lib/share-link.ts` | POST/GET `/api/instant3d/shares` |
| `lib/utils.ts` | `uid`, localStorage helper, warna |
| `lib/features.ts` | Indeks pencarian/spotlight, bukan feature flag |
| `lib/catalog.ts`, `lib/team-session.ts` | Katalog harga dan sesi kolaborasi WebRTC |
| `engine/walls.ts` | Geometri dinding, `repackWall` / `repackAll`, validasi tumpang tindih (peringatan, tidak memblokir) |
| `engine/layout-generator.ts` | Magic Generator dari `WizardInput` |
| `engine/ai-assistant.ts` | Perintah AI lokal + fallback OpenRouter di klien |
| `engine/animation.ts` | Animasi buka pintu/laci |
| `generators/` | Mesh kabinet, sudut, appliance, countertop, orang, aksesoris. `common.ts`: tebal bahan |
| `three/SceneController.ts` | Renderer, raycast, gizmo, sinkron id, FPS |
| `components/editor/` | Toolbar, viewport, layers, properti, wizard, AI chat, library |
| `components/production/` | UI mode produksi |
| `production/` | Cut list, nesting MaxRects, rangka, HPP, PDF/Excel |
| `dimensions/` | Garis dimensi dan ekspor |
| `xr/` | AR/VR |
| `components/Landing.tsx`, `AuthModal.tsx`, `viewer/Viewer.tsx` | Landing editor, login mock, mode lihat |

### `3D Intero/src/` (pohon kedua, ringkas)

| Path | Peran |
| --- | --- |
| `core/store.ts`, `models/types.ts`, `core/projectManager.ts`, `storage/localDb.ts` | State dan proyek (cm) |
| `engine/kitchenRules.ts`, `engine/projectDimensions.ts`, `engine/layoutEngine.ts`, `engine/magicGenerator.ts` | Aturan tinggi dan generator |
| `engine/cuttingList.ts`, `engine/nesting.ts`, `engine/price.ts` | Produksi/harga versi pohon ini |
| `viewport/scene3d.ts`, `viewport/furniture3d.ts` | Render 3D |
| `ui/` | Toolbar, layers, wizard, properti |
| `auth/AuthProvider.tsx`, `lib/supabase.ts`, `cloud/` | Auth Supabase dan proyek organisasi |
| `permissions/roles.ts` | Peran di pohon ini (bukan halaman `/admin` superadmin produk target) |

Halaman `/admin` untuk superadmin produk (RBAC, routing AI, kuota): **tidak ditemukan**. Yang ada adalah admin CMS landing di `src/admin/` dan login tunggal di `server/index.ts`.

---

## 3. State proyek sekarang

### Bentuk data (editor hidup)

Tipe `ProjectData` di `3d-intero-app/src/types.ts` baris 188–199:

- `formatVersion`, `appVersion` (`FORMAT_VERSION` = `'1.0'` di `3d-intero-app/src/lib/constants.ts` baris 8)
- `projectName`, `createdAt`, `modifiedAt`
- `settings`: `ProjectSettings` (tinggi global, base, gap, kedalaman wall, toe kick, `unit: 'mm'`, countertop, tampilan, produksi)
- `walls[]`: `{ id, name, start, end }` koordinat denah `{x, z}` dalam mm (`types.ts` baris 5–11)
- `cabinets[]`: objek `Item` (di store field-nya bernama `items`)
- `dimensions[]`, `customComponents[]`

`Item` (`types.ts` baris 129–145): `id`, `name`, `type`, `wallId`, `orderIndex`, `position` dunia `{x,y,z}` (komentar: origin = tengah-bawah footprint), `rotationY` derajat, `dims {w,h,d}`, `materials`, `config`, `led`, `visible`, `locked`, `colorLabel`, `createdAt`.

ID dari `uid()` di `3d-intero-app/src/lib/utils.ts` baris 4–8: `prefix-` + 4 karakter waktu + 3 acak + counter. Prefix tipe di `store.ts` baris 111–114 (`BC`, `WC`, `CB`, …). Bentuk `cab_base_0001`: **tidak ditemukan**.

Posisi di dinding tidak disimpan sebagai offset. Offset dihitung ulang dari koordinat dunia oleh `offsetOnWall` (`3d-intero-app/src/engine/walls.ts` baris 28–30). `repackWall` (baris 113–135) menaruh item rapat dari ujung `start` dinding menurut `orderIndex`, kursor terpisah untuk baris base dan wall. Item `tall` / `fridge` / `electronic` memajukan kedua kursor (baris 124).

### Di mana disimpan

1. Memori: Zustand `useStore` (`store.ts`).
2. Autosave browser: `saveDraft` menulis IndexedDB `projects` id `'draft'` (`persistence.ts` baris 22–23). Pemicu di `Editor.tsx` baris 80–86: debounce 2 detik saat `items` / `walls` / `settings` / nama / dimensi / custom berubah, plus interval 10 detik bila `dirty`. Dilewati bila `shareMode` atau proyek kosong (tanpa item dan tanpa dinding).
3. Unduhan manual: JSON `.intero` lewat `saveInteroFile` (`persistence.ts` baris 37–39), menu File di `TopToolbar.tsx`.
4. Bagikan: `createProjectShare` POST `/api/instant3d/shares` (`share-link.ts` baris 34–48). Server menyimpan payload JSON (`server/index.ts` baris 65–88). Tautan lama `#s=view|edit.` + lz-string masih dibaca (`share-link.ts` baris 67–80).
5. UI prefs (bukan geometri): `localStorage` lewat `storage` di `lib/utils.ts` (tema, mode simple, lampu, snap tidak termasuk — `snapSize` hanya di memori, default 10 mm, `store.ts` baris 179).

Undo/redo: salinan snapshot `{ items, walls, settings, dimensions, projectName }`, maksimal 50 langkah (`store.ts` baris 142–144 dan 195–205). Bukan log command. `customComponents` tidak masuk snapshot.

Pohon `3D Intero/` menyimpan proyek lewat Dexie di `3D Intero/src/storage/localDb.ts` dan punya jalur Supabase di `3D Intero/src/cloud/orgProjects.ts`. Itu bukan draft yang dibaca editor hidup.

---

## 4. Fitur yang ada (editor hidup)

### Desain

- Magic Generator / wizard: bentuk I/L/U/G, panjang dinding dalam cm, island, sink, kompor, kulkas, elektronik, gaya (`components/editor/Wizard.tsx`, `engine/layout-generator.ts`, tipe `WizardInput` di `types.ts` baris 211–238).
- Pustaka modul tarik (`lib/constants.ts` `LIBRARY` baris 117–164, `components/editor/ComponentLibrary.tsx`).
- Component builder kustom (`components/editor/ComponentBuilder.tsx`).
- Viewport perspektif + tampak top/front/back/left/right/iso (`types.ts` `ViewMode`).
- Toolbar: select, pan, orbit, zoom, move, rotate, scale, tape, dimension, protractor, paint, eyedropper (`LeftToolbar.tsx` baris 8–21).
- Layers mengambang, grup dinding / tipe / material, reorder (`LayersPanel.tsx`). Nama dinding: `left` = "Dinding Kiri", `back` = "Dinding Kanan" (`constants.ts` baris 189).
- Properti per item dan global (`PropertiesPanel.tsx`).
- Material pintu, countertop, LED, handle (`MaterialPanel.tsx`, `constants.ts`).
- Orang skala, lampu LED, grid, shadow, x-ray, explode (`store.ts` `UIState`, menu Lihat di `TopToolbar.tsx`).
- Garis dimensi (`dimensions/compute.ts`).
- Validasi peringatan tumpang tindih / lewat ujung dinding (`walls.ts` `validateItem` baris 189–212). Tidak menolak command.

### Advanced

Mode `uiMode: 'simple' | 'advanced'` (`types.ts` baris 34). Desktop default advanced, viewport mobile default simple (`store.ts` baris 171). Simple menyisakan tool bertanda `simple: true`: select, move, rotate, paint (`LeftToolbar.tsx` baris 8–19 dan 59). Shortcut Ctrl+Shift+U (`Editor.tsx` baris 104). Fitur manual lain tidak dihapus; beberapa menampilkan toast "tersedia di Mode Advanced" (`LeftToolbar.tsx` baris 55–57).

Yang tetap ada di advanced: copy/paste/duplicate, mirror, array, align (`store.ts`), grouping lewat `config.parentId`, component builder, dimension permanen, protractor, scale, eyedropper.

### Produksi

Toggle `appMode: 'design' | 'production'` (`TopToolbar.tsx` baris 180). Tiga tab: Rangka 3D, Cutting List, HPP (`ProductionMode.tsx` baris 42).

- Panel per kabinet: `production/engine-papan.ts`, rangka hollow: `production/engine-rangka.ts`, orkestrasi `production/index.ts` `buildProduction`.
- Nesting MaxRects, kerf 3 mm, lembar default 1220×2440 mm (alternatif 1830×2440) (`production/nesting.ts` baris 1 dan 83, `production/index.ts` baris 28).
- Cutting stock 1D rangka, batang 6 m (`production/cutlist.ts`).
- Hardware: `production/hardware.ts`.
- HPP: margin, PPN 11% bila `ppnOn` (`production/hpp.ts` sekitar baris 125–126), skenario di `settings.production`.
- Ekspor Excel/PDF: `production/export-excel.ts`, `production/export-pdf.ts`.
- Status kabinet: `config.prodStatus` dan `config.note` (`types.ts` baris 98–101, 242).
- DXF CNC: **tidak ditemukan**. Label QR: dependensi `qrcode-generator` ada di `package.json`; alur label QR terpisah **tidak ditelusuri sebagai fitur selesai** di UI produksi (tab yang ada hanya rangka, cutting, HPP).

### AI Edit

Panel `AiAssistant.tsx`. Perintah dieksekusi langsung oleh `executeLocalAiCommand` (regex), bukan daftar command + preview diff. Bila parser lokal tidak mengubah apa pun dan ada API key, browser memanggil `https://openrouter.ai/api/v1/chat/completions` (`ai-assistant.ts` baris 357–378). Tidak ada tier T0–T3, tidak ada log server, tidak ada kuota. Chip konteks dari klik: **tidak ditemukan** sebagai paket yang dikirim ke model. Seleksi hanya dipakai untuk pola seperti "hapus yang dipilih" (`ai-assistant.ts` baris 310–314).

### Lainnya

- Bagikan view/edit, viewer read-only (`Viewer.tsx`, `share-link.ts`).
- Kolaborasi peer WebRTC (`lib/team-session.ts`, `TeamCollaborationDialog.tsx`).
- AR dan VR (`xr/`, menu Visual).
- Foto ruangan + furnitur (`components/xr/PhotoOverlay.tsx`).
- Ekspor PNG/JPG/OBJ; "Export ke SketchUp" menulis OBJ plus komentar, bukan `.skp` (`persistence.ts` baris 67–69, `TopToolbar.tsx` `fileActions.export`).
- Pencarian fitur `/` (`Spotlight.tsx`, `lib/features.ts`).
- Tema gelap, status bar tool / X Y Z cm / FPS / autosave (`ViewControls.tsx`).
- Landing sinematik di dalam paket 3D (`components/Landing.tsx`).
- Admin CMS situs pemasaran (bukan superadmin editor): `src/admin/`, dilindungi `requireAuth` di `server/index.ts`.

---

## 5. Cara kabinet dihitung

Satuan internal editor hidup: **milimeter**. UI `DragNumber` membagi 10 bila `unit === 'cm'` (`components/ui.tsx` baris 89: `const scale = unit === 'cm' ? 10 : 1`). Angka di screenshot (240, 85, 50, 33, 10) adalah tampilan cm dari default mm 2400, 850, 500, 330, 100.

Default (`lib/constants.ts` baris 104–106):

```
globalCabinetHeight = 2400
baseHeight = 850
wallGap = 500
wallDepth = 330
toeKick = 100
countertop.thickness = 20
countertop.overhang = 20
countertop.backsplash = true
countertop.backsplashAuto = true
countertop.backsplashHeight = 600   // dipakai hanya jika backsplashAuto = false
```

Tebal bahan mesh (`generators/common.ts` baris 7–9): plywood `T = 18`, belakang `BACK_T = 5`, celah pintu `GAP = 2`. Root scene diskalakan `S = 0.001` (mm → meter) di `three/SceneController.ts` baris 24.

### Rumus vertikal (editor hidup)

Dari `store.ts`:

```
wallHeight  = max(300, globalCabinetHeight - baseHeight - wallGap)     // baris 116
wallBottom  = baseHeight + wallGap                                       // baris 117
backsplash  = backsplashAuto
              ? max(100, wallBottom - baseHeight - countertop.thickness) // baris 119
              : countertop.backsplashHeight
```

Dengan default: wallHeight = 1050 mm, wallBottom = 1350 mm, backsplash otomatis = max(100, 1350 − 850 − 20) = 480 mm.

`generators/countertop.ts` baris 37–41 menghitung tinggi backsplash yang sama dengan aljabar lain: `max(100, baseHeight + wallGap - baseHeight - thickness)` yaitu `max(100, wallGap - thickness)`.

Posisi slab countertop (`countertop.ts` baris 51): pusat Y = `baseHeight + thickness/2`, jadi slab menempati `[baseHeight, baseHeight + thickness]`. Backsplash (`countertop.ts` baris 55): dari `baseHeight + thickness` setinggi `bsH`. Saat auto, puncak backsplash = `baseHeight + wallGap` = `wallBottom`.

Teks bantuan yang cocok dengan screenshot (`PropertiesPanel.tsx` baris 315):

> Puncak kabinet atas = `globalCabinetHeight/10` cm. Dasar kabinet atas = puncak backsplash. Base tetap `baseHeight/10` cm.

Itu benar **selama** `backsplashAuto` dan `position.y` kabinet atas = `wallBottom`. Tebal countertop **tidak** mengurangi `wallHeight`. `wallGap` diukur dari puncak carcass base (`baseHeight`), bukan dari puncak batu. Countertop setebal 20 mm berada di dalam zona gap.

Susunan default dari lantai (mm):

| Zona | Dari | Sampai | Sumber |
| --- | --- | --- | --- |
| Lantai / origin base | 0 | — | `repackWall` men-set `y = 0` untuk baris base dan tall (`walls.ts` baris 129) |
| Toe kick | 0 | `tk` | di dalam tinggi base, bukan tambahan di atasnya |
| Badan base | `tk` | `dims.h` | `bodyH = h - tk` (`cabinets.ts` baris 116–119) |
| Countertop | `baseHeight` | `baseHeight + thickness` | `countertop.ts` baris 51. Mengikuti `settings.baseHeight`, bukan `item.dims.h` |
| Backsplash (auto) | `baseHeight + thickness` | `baseHeight + wallGap` | `countertop.ts` baris 55 + rumus baris 40 |
| Kabinet atas | `wallBottom` | `wallBottom + wallHeight` = `globalCabinetHeight` | `wallBottomOf` + `wallHeightOf` |

Toe kick (`cabinets.ts` baris 116–119): `tk = config.toeKickHeight ?? settings.toeKick`, lalu `bodyH = dims.h - tk`, carcass dimulai di `y = tk`. Default `tk = 100`, `dims.h` base pustaka = 850 (`constants.ts` baris 119), jadi badan = 750 mm di atas toe kick 100 mm. Mengubah `settings.toeKick` lewat panel mengubah mesh base (generator membaca settings), tetapi **tidak** mengubah `dims.h`.

`heightsForType` (`store.ts` baris 146–152), dipakai saat `addItem`:

- `wall`, `corner_wall`, `hood`: `position.y = wallBottom`. Jika tipe bukan `wall`, atau `dims.h > wallHeight`, maka `dims.h = wallHeight`. `hood` selalu `dims.h = wallHeight`.
- `tall`, `fridge`, `electronic`: `dims.h = globalCabinetHeight`.
- Jika `wall` dan `dims.h === 700` (tinggi pustaka, `constants.ts` baris 130–133): diganti `wallHeight`.

`setGlobalHeight` (`store.ts` baris 384–394) menulis ulang tinggi dan Y untuk wall/corner_wall/hood, dan tinggi untuk tall/fridge/electronic, lalu `repackAll`.

`setBacksplashHeight` (`store.ts` baris 438–448): `wallGap = max(200, thickness + h)`, `backsplashAuto = false`, lalu kabinet atas mengikuti `wallHeight` dan `wallBottom` baru. Teks di `PropertiesPanel.tsx` baris 323: mengubah tinggi backsplash menaik/menurunkan dasar kabinet atas; puncak tetap di tinggi global.

`setSettings` (`store.ts` baris 396) hanya menggabungkan patch ke `settings` dan `pushHistory`. Tidak menulis ulang `dims.h` atau `position.y` item. Jadi mengubah "Tinggi base" atau "Gap base–wall" dari panel (baris 310–311) mengubah angka settings (dan posisi countertop yang membaca settings) tanpa rumus yang sama dengan `setGlobalHeight`.

### Label "Wall Cabinet 86cm"

Nama default (`store.ts` baris 137–139): `` `${TYPE_LABELS[type]} ${Math.round(w / 10)}cm` ``. `TYPE_LABELS.wall` = `'Wall Cabinet'` (`constants.ts` baris 89). Generator yang sama di `layout-generator.ts` baris 103: `` `Wall Cabinet ${Math.round(ww / 10)}cm` ``. Angka itu **lebar (w)**, bukan tinggi. Tinggi wall setelah `heightsForType` mengikuti `wallHeight` (default 1050 mm = 105 cm) bila `h` masuk sebagai 700 atau lebih besar dari `wallHeight`.

Lebar 86 cm bisa muncul karena sisa gap ditambahkan ke modul terakhir (`layout-generator.ts` `fillWidths` baris 12–25: sisa `rem` ditambah ke elemen terakhir) dan/atau kompensasi sudut baris 96–97: `ww += CORNER_BASE_LEG - CORNER_WALL_LEG` dengan `CORNER_BASE_LEG = 900` dan `CORNER_WALL_LEG = 600` (baris 8), yaitu +300 mm pada kabinet atas di ujung yang punya junction.

### Sudut dan dinding

`makeRoomWalls` (`walls.ts` baris 49–66): bentuk I hanya dinding id `back`; L = `left` + `back`; U menambah `right`; G = `back` + `front`. Panjang input wizard dalam cm dikali 10 di `layout-generator.ts` baris 29.

Corner di-emit sebagai item sendiri lebar 900 (base) dan 600 (wall) bila `wallJunctions` (`walls.ts` baris 91–96, jarak < 1 mm). `repackWall` lalu menaruh mereka sebagai item biasa pada kursor barisnya. Tidak ada pengurangan ganda eksplisit selain cadangan `startReserve`/`endReserve` sebelum mengisi celah (`layout-generator.ts` baris 42–45). Tes otomatis yang membuktikan tidak ada hitungan ganda: **tidak ditemukan** di `3d-intero-app/`.

`fillWidths` memakai `Math.random()` (`layout-generator.ts` baris 71) pada cabang yang kedua sisinya bertipe `'base'`, jadi hasil isi celah tidak deterministik.

### Pohon `3D Intero/` (bukan UI screenshot; satuan cm)

Jangan dicampur dengan rumus di atas.

`3D Intero/src/engine/kitchenRules.ts`:

- `WALL_GAP = 50` (baris 117), satuan cm.
- `baseTopOf` (baris 146–148): puncak carcass base, default 85 bila tidak ada item.
- `wallBottomFor` (baris 156–159): `worktop = baseTop + countertopThickness`; lalu `above = backsplash ? max(backsplashHeight, gap) : gap`; hasil `round((worktop + above) * 10) / 10`.

`3D Intero/src/engine/projectDimensions.ts` baris 56–58: `wallHeight = totalHeight - wallBottom` (dibulatkan 0.1 cm).

`3D Intero/docs/kitchen-dimensions.md` baris 3–5 dan contoh baris 18–20 menulis model lain lagi: dasar kabinet atas = base + **tebal countertop** + tinggi backsplash/gap. Contoh di dokumen itu: 85 + 2 + 60 = 147, tinggi atas = 220 − 147 = 73. Itu **bukan** rumus `3d-intero-app` (yang tidak menambah tebal countertop ke `wallBottom`).

---

## 6. Gap ke arsitektur target

| Target | Kondisi sekarang | Usaha | Risiko |
| --- | --- | --- | --- |
| 1. ProjectDoc JSON berversi, satuan cm, id stabil ringkas | `ProjectData` mm, `formatVersion` string `'1.0'`, id acak, posisi dunia bukan offset. Zod **tidak ditemukan** | L | Dua pohon (mm vs cm). Adapter yang salah menggeser seluruh dapur 10× |
| 2. Semua perubahan lewat Command murni + undo/redo log | Mutasi langsung di Zustand; undo = snapshot sampai 50 (`store.ts`) | L | Undo ganda (snapshot lama + log baru) atau histori hilang saat pindah |
| 3. AI Gateway server, router T0–T3, key tidak di browser | Parser klien + OpenRouter dari browser dengan key user (`ai-assistant.ts` baris 368) | L | Key bocor di bundle bila hanya dipindah tanpa memutus fetch klien. Belum ada tabel `ai_requests` |
| 4. Klik jadi chip konteks, id dikirim ke AI | Raycast sudah mengembalikan `itemId` (`SceneController.ts` `pick` sekitar baris 757). Paket konteks ke model **tidak ditemukan** | M | AI tetap menebak bila chip tidak mengunci command |
| 5. Simple / Advanced / Produksi | Toggle UI sudah ada (`uiMode`, `appMode`). Simple belum menyembunyikan seluruh edit manual; produksi sudah jalan di atas data item yang sama | M | Menyembunyikan tool tanpa flag bisa memutus shortcut yang sudah dipakai |
| 6. Super admin konfigurasi + statistik | Admin CMS landing saja (`src/admin`, `server/index.ts`). RBAC empat peran, 2FA, audit log, routing model di DB: **tidak ditemukan** | L | Mencampur admin CMS dengan admin produk |

Renderer hidup sudah merekonsiliasi per id: `SceneController.sync` (baris 264–309) membuang id yang hilang, `rebuild` hanya bila signature geometri berubah, selain itu menggeser group yang sama. Countertop di-rebuild setiap sync (`rebuildCountertops`, baris 309). Ini dekat dengan target "jangan buat ulang seluruh scene", tetapi sumbernya tetap array Zustand, bukan ProjectDoc.

---

## 7. Sepuluh temuan yang mengganggu rencana

1. **Dua editor, dua satuan, dua rumus tinggi.** Hidup: mm, `wallBottom = baseHeight + wallGap` (`store.ts` baris 117). Pohon `3D Intero/`: cm, `wallBottomFor` menambah tebal countertop (`kitchenRules.ts` baris 156–159). Build default hanya mengemas `3d-intero-app` (`package.json` root skrip `build` / `build:3d`). Mengerjakan ProjectDoc di pohon yang salah membuat Fase 1 tidak muncul di `3d.intero.id`.

2. **Tidak ada lapisan command.** Perubahan tersebar di `addItem`, `patchItems`, `setSettings`, `setGlobalHeight`, `setCountertop`, `setBacksplashHeight`, `repackAll` (`store.ts`). AI memanggil metode store yang sama (`ai-assistant.ts`). Undo menyalin seluruh snapshot, termasuk settings, bukan diff command.

3. **`setSettings` tidak menerapkan rumus tinggi ke item** (`store.ts` baris 396), sedangkan `setGlobalHeight` dan `setBacksplashHeight` menerapkannya. Countertop membaca `settings.baseHeight` (`countertop.ts` baris 51); badan kabinet membaca `item.dims.h` (`cabinets.ts` baris 111–119). Kedua angka bisa berpisah.

4. **`repackWall` tidak selalu memindahkan Y kabinet atas ke `wallBottom` baru.** Baris 128: `y = Math.max(y, 0) || settings.baseHeight + settings.wallGap`. Jika `y` sudah > 0, nilai lama dipertahankan. Hanya path yang menulis `position.y` secara eksplisit yang menggeser kabinet atas.

5. **Satuan campur di batas modul.** Inti mm, wizard dan label cm (`layout-generator.ts` baris 29: `* 10`; nama `Math.round(w/10)`). `DragNumber` mengali 10 (`ui.tsx` baris 89). Skema target minta cm. Satu kelupaan konversi menggeser layout.

6. **ID tidak stabil-ringkas dan tidak monotonic antar sesi.** `uid` memakai waktu + acak (`utils.ts` baris 4–8). Counter modul memori di-reset saat reload. Target `cab_base_0001` belum ada. Tag produksi `BC01` dihitung ulang dari urutan (`production/index.ts` `assignTags` baris 14–22), bukan id permanen.

7. **AI key di klien dan perintah langsung mengubah model.** `fetch` OpenRouter di `ai-assistant.ts` baris 368. Tidak ada dry-run, Zod, atau invariant yang menolak. `validateItem` hanya peringatan (`walls.ts` baris 189).

8. **Generator layout tidak deterministik dan menamai lebar sebagai tinggi semu.** `Math.random()` di `layout-generator.ts` baris 71. Label `Wall Cabinet Ncm` adalah lebar (`store.ts` baris 137–139). Screenshot "86cm" tidak sama dengan tinggi wall (default 105 cm).

9. **Autosave satu slot draft, dan undo tidak mencakup custom component.** `saveDraft` selalu id `'draft'` (`persistence.ts` baris 23). Proyek kedua menimpa draft. `snapshotOf` (`store.ts` baris 142–144) tidak menyertakan `customComponents`. Share mode mematikan autosave (`Editor.tsx` baris 83).

10. **Tidak ada tes di paket yang di-deploy.** `3d-intero-app` tanpa test script. Dua tes hanya di `3D Intero/tests/`, dan paket itu tidak punya skrip `test` di `package.json`. Invariant tabrakan, round-trip JSON, dan "proyek lama tampil identik" belum punya jaring pengaman di editor hidup.

---

## Rekomendasi urutan Fase 1

Kerjakan di **`3d-intero-app/`** bila produk yang harus tetap jalan adalah yang di screenshot. Jangan menyalin rumus `3D Intero/src/engine/kitchenRules.ts` ke sana.

1. Tetapkan adapter baca: `ProjectData` (mm, `cabinets`, posisi dunia) → ProjectDoc (cm, `items`, offset dinding bila `wallId` ada). Tulis balik hanya lewat flag, default off.
2. Skema TypeScript + Zod dan `applyCommand` murni, plus tes, sebelum menyentuh renderer.
3. Invariant (tabrakan, panjang dinding, tinggi, id unik) sebagai fungsi murni yang mengembalikan kalimat Indonesia.
4. Sambungkan undo command **di samping** snapshot yang ada, jangan mengganti `undo()` sampai round-trip lulus.
5. Arahkan `SceneController.sync` ke hasil adapter (id yang sama), jangan rebuild scene dari nol.
6. Panel pohon read-only + "Lihat JSON", lalu `docs/AI_GUIDE.md`.

Jangan mulai gateway OpenRouter di langkah ini.
