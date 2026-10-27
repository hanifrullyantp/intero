// 3D Intero — Indeks fitur untuk Search + Spotlight ("cari lalu tunjukkan di mana fiturnya")
import { useStore } from '../store';
import type { Item, ItemType } from '../types';
import { toast } from '../components/ui';

export interface FeatureDef {
  id: string; label: string; hint: string; keywords: string;
  target: string; run: () => void;
}

const st = () => useStore.getState();
function ensureProps() { st().ui({ showProps: true, mobileSheet: 'props' }); }
function selectFirst(types: ItemType[], needMsg: string): Item | null {
  const s = st();
  const it = s.items.find((i) => types.includes(i.type));
  if (!it) { toast(needMsg, 'warning'); return null; }
  s.setSelection([it.id]);
  ensureProps();
  return it;
}
const BASE = ['base', 'sink_base', 'cooktop_base', 'drawer_base'] as ItemType[];

export const FEATURES: FeatureDef[] = [
  { id: 'topi', label: 'Topi / Cornice kabinet atas', hint: 'Nyalakan "Cornice / Topi" lalu atur tingginya di Konfigurasi.', keywords: 'topi cornice mahkota profil list atas wall', target: '[data-tour="cornice-toggle"]', run: () => { selectFirst(['wall'], 'Tambahkan Wall Cabinet terlebih dahulu untuk mengatur topi.'); } },
  { id: 'double-stack', label: 'Double stack (2 tier) kabinet atas', hint: 'Aktifkan double stack & atur tinggi tier atas.', keywords: 'double stack tier tingkat susun dua wall atas', target: '[data-tour="double-stack-toggle"]', run: () => { selectFirst(['wall'], 'Tambahkan Wall Cabinet terlebih dahulu.'); } },
  { id: 'pintu-kaca', label: 'Pintu kaca kabinet atas', hint: 'Ubah pintu wall cabinet menjadi kaca.', keywords: 'kaca glass door pintu transparan wall', target: '[data-tour="glass-door-toggle"]', run: () => { selectFirst(['wall'], 'Tambahkan Wall Cabinet terlebih dahulu.'); } },
  { id: 'lift-up', label: 'Pintu lift-up (engsel atas)', hint: 'Pintu membuka ke atas — cocok untuk kabinet atas pendek.', keywords: 'lift up angkat atas engsel wall', target: '[data-tour="liftup-toggle"]', run: () => { selectFirst(['wall'], 'Tambahkan Wall Cabinet terlebih dahulu.'); } },
  { id: 'rak-piring', label: 'Rak piring tarik 2-tier', hint: 'Pilih "Rak Piring Tarik 2-tier" di Pintu Kiri/Kanan, lalu tekan Open.', keywords: 'rak piring tarik pull out dish susun', target: '[data-tour="acc-left"]', run: () => { selectFirst(BASE, 'Tambahkan Base Cabinet terlebih dahulu.'); } },
  { id: 'rak-bumbu', label: 'Rak bumbu tarik', hint: 'Pilih "Rak Bumbu Tarik" lalu atur lebar 150/200 mm.', keywords: 'rak bumbu rempah botol tarik spice', target: '[data-tour="acc-left"]', run: () => { selectFirst(BASE, 'Tambahkan Base Cabinet terlebih dahulu.'); } },
  { id: 'rak-gas', label: 'Rak gas tarik (tabung)', hint: 'Pilih "Rak Gas Tarik" lalu pilih tabung 12kg / 5.5kg / 3kg.', keywords: 'rak gas tabung lpg pink hijau tarik', target: '[data-tour="acc-left"]', run: () => { selectFirst(BASE, 'Tambahkan Base Cabinet terlebih dahulu.'); } },
  { id: 'laci-sendok', label: 'Laci tatakan sendok', hint: 'Laci sekat sendok-garpu-pisau di dalam pintu.', keywords: 'sendok garpu pisau cutlery laci sekat', target: '[data-tour="acc-left"]', run: () => { selectFirst(BASE, 'Tambahkan Base Cabinet terlebih dahulu.'); } },
  { id: 'trash-bin', label: 'Trash bin pull-out', hint: 'Dua tempat sampah tarik (organik + anorganik).', keywords: 'sampah trash bin tong pull out', target: '[data-tour="acc-left"]', run: () => { selectFirst(BASE, 'Tambahkan Base Cabinet terlebih dahulu.'); } },
  { id: 'lazy-susan', label: 'Lazy Susan (corner)', hint: 'Piringan putar 360° di corner cabinet.', keywords: 'lazy susan putar corner sudut rak', target: '[data-tour="lazy-susan-toggle"]', run: () => { selectFirst(['corner_base'], 'Tambahkan Corner Base terlebih dahulu.'); } },
  { id: 'magic-com', label: 'Magic Com pull-out rel', hint: 'Slot 1 electronic cabinet: magic com di atas tray rel teleskopik.', keywords: 'magic com rice cooker nasi tray rel', target: '[data-tour="slot1"]', run: () => { selectFirst(['electronic'], 'Tambahkan Electronic Cabinet terlebih dahulu.'); } },
  { id: 'dispenser', label: 'Dispenser air', hint: 'Slot 1: dispenser dengan kran panas/dingin + LED biru.', keywords: 'dispenser air minum galon kran', target: '[data-tour="slot1"]', run: () => { selectFirst(['electronic'], 'Tambahkan Electronic Cabinet terlebih dahulu.'); } },
  { id: 'oven', label: 'Oven (440×290×320)', hint: 'Slot 1 atau Slot 2: pintu kaca, kenop, layar digital.', keywords: 'oven panggang microwave slot', target: '[data-tour="slot2"]', run: () => { selectFirst(['electronic'], 'Tambahkan Electronic Cabinet terlebih dahulu.'); } },
  { id: 'microwave', label: 'Microwave', hint: 'Slot 2: pintu kaca + panel keypad digital.', keywords: 'microwave pemanas slot atas', target: '[data-tour="slot2"]', run: () => { selectFirst(['electronic'], 'Tambahkan Electronic Cabinet terlebih dahulu.'); } },
  { id: 'kulkas', label: 'Kulkas side-by-side', hint: 'Ganti jenis (1/2 pintu, side-by-side) & dimensi kulkas. Filler atas otomatis.', keywords: 'kulkas fridge freezer side by side french pintu', target: '[data-tour="fridge-type"]', run: () => { selectFirst(['fridge'], 'Tambahkan Kulkas terlebih dahulu.'); } },
  { id: 'hood', label: 'Cooker hood + filler otomatis', hint: 'Bottom hood sejajar bottom wall cabinet; filler di atasnya otomatis.', keywords: 'hood cooker asap kompor penyedot cerobong', target: '[data-tour="hood-height"]', run: () => { selectFirst(['hood'], 'Tambahkan Cooker Hood terlebih dahulu.'); } },
  { id: 'island', label: 'Island table + stools', hint: 'Atur pintu per sisi & jumlah stool.', keywords: 'island pulau meja tengah stool kursi', target: '[data-tour="island-stools"]', run: () => { selectFirst(['island'], 'Tambahkan Island Table terlebih dahulu.'); } },
  { id: 'meja-bar', label: 'Meja bar + foot rest', hint: 'Overhang, pipa foot rest stainless, & stools bar.', keywords: 'bar meja tinggi foot rest pijakan kaki stool', target: '[data-tour="bar-footrest"]', run: () => { selectFirst(['bar'], 'Tambahkan Meja Bar terlebih dahulu.'); } },
  { id: 'led', label: 'Lampu LED strip', hint: 'Klik section untuk membuka: under-cabinet, dalam kabinet, plinth, temperatur & trigger.', keywords: 'led lampu strip under cabinet plinth warm cool', target: '[data-section="lampu-led"]', run: () => { if (!selectFirst(['wall', 'base', 'tall', 'electronic', 'island'] as ItemType[], 'Pilih kabinet terlebih dahulu.')) return; } },
  { id: 'handle', label: 'Handle pintu & laci', hint: 'Jenis (bar/knob/J/gola/push), panjang, posisi, & warna handle.', keywords: 'handle gagang knob bar j gola push kenop', target: '[data-section="pintu-laci"]', run: () => { selectFirst(['wall', ...BASE] as ItemType[], 'Pilih kabinet terlebih dahulu.'); } },
  { id: 'material-pintu', label: 'Material pintu (HPL/Duco/PVC/ACP/...)', hint: 'Ganti material & warna pintu, body, sisi, toe kick, handle.', keywords: 'material hpl duco pvc acp solid wood warna pintu body', target: '[data-tour="door-material"]', run: () => { selectFirst(['wall', ...BASE] as ItemType[], 'Pilih kabinet terlebih dahulu.'); } },
  { id: 'open-shelf', label: 'Open shelf (rak terbuka)', hint: 'Base cabinet tanpa pintu/laci.', keywords: 'open shelf rak terbuka tanpa pintu', target: '[data-tour="open-shelf-toggle"]', run: () => { selectFirst(BASE, 'Tambahkan Base Cabinet terlebih dahulu.'); } },
  { id: 'tinggi-total', label: 'Tinggi total kabinet (global)', hint: 'Klik area kosong, lalu atur tinggi total — semua kabinet menyesuaikan otomatis.', keywords: 'tinggi total global seluruh kabinet height', target: '[data-tour="global-height"]', run: () => { st().clearSelection(); ensureProps(); } },
  { id: 'backsplash', label: 'Tinggi backsplash', hint: 'Default mengikuti dasar kabinet atas; matikan untuk atur manual.', keywords: 'backsplash dinding keramik tile subway tinggi', target: '[data-tour="backsplash-auto"]', run: () => { st().clearSelection(); ensureProps(); } },
  { id: 'countertop', label: 'Countertop (termasuk Marble Putih)', hint: 'Jenis, tebal, overhang — kontinu sepanjang dinding.', keywords: 'countertop meja granit marmer putih quartz butcher tebal', target: '[data-tour="countertop-type"]', run: () => { st().clearSelection(); ensureProps(); } },
  { id: 'kecerahan', label: 'Kecerahan viewport', hint: 'Geser untuk meredupkan/mencerahkan pencahayaan 3D.', keywords: 'cerah gelap terang silau brightness cahaya lampu', target: '[data-tour="brightness"]', run: () => { st().clearSelection(); ensureProps(); } },
  { id: 'open-mode', label: 'Open: buka/tutup kabinet', hint: 'Pilih kabinet dulu untuk membuka itu saja; tanpa seleksi = buka semua.', keywords: 'open buka tutup pintu laci semua animasi', target: '[data-tour="open-btn"]', run: () => { /* tombol di toolbar */ } },
  { id: 'mirror', label: 'Mirror (cerminkan)', hint: 'Pilih objek lalu mirror terhadap sumbu X/Z.', keywords: 'mirror cermin balik flip', target: '[data-tour="mirror-btn"]', run: () => { const s = st(); if (!s.selectedIds.length && s.items.length) s.setSelection([s.items[0].id]); } },
  { id: 'array', label: 'Array (duplikat pola)', hint: 'Duplikat linear / grid / circular.', keywords: 'array duplikat pola grid circular linear banyak', target: '[data-tour="array-btn"]', run: () => { const s = st(); if (!s.selectedIds.length && s.items.length) s.setSelection([s.items[0].id]); } },
  { id: 'align', label: 'Align (sejajarkan)', hint: 'Pilih 2+ objek, lalu gunakan tombol align di panel Properties.', keywords: 'align sejajar rata tengah distribusi justify', target: '[data-tour="align-btn"]', run: () => { const s = st(); if (s.selectedIds.length < 2 && s.items.length >= 2) s.setSelection([s.items[0].id, s.items[1].id]); ensureProps(); } },
  { id: 'layers', label: 'Layers: susun ulang kabinet', hint: 'Drag baris layer untuk mengubah urutan — posisi 3D ikut tersusun otomatis.', keywords: 'layer lapisan susun urut reorder drag', target: '[data-tour="layers-panel"]', run: () => { st().ui({ showLayers: true }); } },
  { id: 'dimension', label: 'Dimension line', hint: 'Klik 2 titik untuk garis ukuran permanen (tersimpan & ikut export).', keywords: 'dimension dimensi ukuran garis measure', target: '[data-tour="dimension-btn"]', run: () => { st().setTool('dimension'); } },
  { id: 'tape', label: 'Tape measure', hint: 'Klik 2 titik untuk mengukur jarak sementara.', keywords: 'tape meteran ukur jarak measure', target: '[data-tour="tape-btn"]', run: () => { st().setTool('tape'); } },
  { id: 'paint', label: 'Paint bucket & eyedropper', hint: 'Paint: klik objek untuk mewarnai. Eyedropper (I): ambil warna objek.', keywords: 'paint cat warna eyedropper pipet ember', target: '[data-tour="paint-btn"]', run: () => { st().setTool('paint'); } },
  { id: 'builder', label: 'Component Builder', hint: 'Buat komponen kustom dari primitives (box, cylinder, sphere, torus).', keywords: 'builder buat komponen custom primitive', target: '[data-tour="builder-btn"]', run: () => { st().ui({ showLibrary: true, mobileSheet: 'parts' }); } },
  { id: 'wizard', label: 'Magic Generator (wizard)', hint: 'Buat seluruh layout dapur otomatis dalam 4 langkah.', keywords: 'wizard magic generator otomatis layout dapur baru', target: '[data-tour="wizard-modal"]', run: () => { if (st().shareMode === 'view') { toast('Tidak tersedia di mode lihat saja', 'warning'); return; } st().ui({ showWizard: true }); } },
  { id: 'export', label: 'Export PNG / OBJ / SketchUp', hint: 'Buka menu File untuk export gambar & model 3D.', keywords: 'export png jpg obj sketchup unduh gambar', target: '[data-tour="menu-file"]', run: () => { /* buka menu File */ } },
  { id: 'share', label: 'Bagikan tautan proyek', hint: 'Buat link lihat-saja atau bisa-edit; data dikompresi dalam link (tanpa server).', keywords: 'share bagikan link tautan view edit lihat', target: '[data-tour="share-btn"]', run: () => { /* tombol di toolbar */ } },
  { id: 'orang', label: 'Orang animasi (hide/show)', hint: 'Buka menu Lihat untuk menampilkan/menyembunyikan orang.', keywords: 'orang manusia animasi hide sembunyi activity', target: '[data-tour="menu-lihat"]', run: () => { /* buka menu Lihat */ } },
  { id: 'view-2d', label: 'View 2D & Split Stacked', hint: 'Ganti mode kamera; di Top tersedia sub-mode Base/Wall/Split.', keywords: 'view 2d 3d kamera top depan split denah plan', target: '[data-tour="view-btn"]', run: () => { /* kontrol bawah viewport */ } },
  { id: 'split', label: 'Split Stacked (base & wall terpisah)', hint: 'Viewport dibagi dua: wall plan di atas, base plan di bawah.', keywords: 'split stacked pisah base wall atas bawah plan', target: '[data-tour="sub-btn"]', run: () => { st().setViewMode('top'); } },
];

export function searchFeatures(q: string): FeatureDef[] {
  const query = q.trim().toLowerCase();
  if (!query) return FEATURES.slice(0, 8);
  const words = query.split(/\s+/);
  return FEATURES
    .map((f) => {
      const hay = `${f.label} ${f.keywords}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (f.label.toLowerCase().includes(w)) score += 3;
        else if (hay.includes(w)) score += 1;
        else return { f, score: -1 };
      }
      return { f, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.f);
}
