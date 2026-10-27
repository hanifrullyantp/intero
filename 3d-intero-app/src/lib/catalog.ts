// 3D Intero — Katalog bahan produksi (workflow bengkel riil). Disimpan di Dexie `catalog`, preloaded sekali.
import type { CatalogItem } from '../types';
import { db } from './persistence';

export const HPP_CATS = ['Rangka', 'Material', 'Finishing', 'Hardware', 'LED', 'Listrik', 'Overhead', 'Jasa'] as const;
export type HppCat = (typeof HPP_CATS)[number];

export const PRESET_CATALOG: CatalogItem[] = [
  { id: 'c-gal-1530', cat: 'Rangka', name: 'Hollow Galvanis 1.5×3 cm 0.8mm', unit: 'btg', price: 51500, supplier: 'Sinar Raya', spec: 'batang 6 m' },
  { id: 'c-gal-1515', cat: 'Rangka', name: 'Hollow Galvanis 1.5×1.5 cm 0.8mm', unit: 'btg', price: 36500, supplier: 'Sinar Raya', spec: 'batang 6 m' },
  { id: 'c-gal-2040', cat: 'Rangka', name: 'Hollow Galvanis 2×4 cm 0.8mm (pintu)', unit: 'btg', price: 75000, supplier: 'Sinar Raya', spec: 'batang 6 m' },
  { id: 'c-gal-1530-07', cat: 'Rangka', name: 'Hollow Galvanis 1.5×3 cm 0.7mm', unit: 'btg', price: 36000, supplier: 'Sinar Raya', spec: 'batang 6 m' },
  { id: 'c-gal-1515-07', cat: 'Rangka', name: 'Hollow Galvanis 1.5×1.5 cm 0.7mm', unit: 'btg', price: 25500, supplier: 'Sinar Raya', spec: 'batang 6 m' },
  { id: 'c-alu-1515', cat: 'Rangka', name: 'Aluminium Hollow 1×1.5 inch', unit: 'btg', price: 120000, supplier: 'Sinar Raya', spec: 'batang 6 m' },
  { id: 'c-acp-putih', cat: 'Material', name: 'ACP Putih Alcotuff 3mm', unit: 'lbr', price: 170000, supplier: 'PT Borneo', spec: '1220×2440' },
  { id: 'c-acp-whitegold', cat: 'Material', name: 'ACP Whitegold 3mm', unit: 'lbr', price: 275000, supplier: 'Decorindo', spec: '1220×2440' },
  { id: 'c-acp-premium', cat: 'Material', name: 'ACP Alucobond 4mm', unit: 'lbr', price: 1200000, supplier: 'Decorindo', spec: '1220×2440' },
  { id: 'c-ply18', cat: 'Material', name: 'Plywood 18mm', unit: 'lbr', price: 350000, supplier: 'Mitra Abadi', spec: '1220×2440' },
  { id: 'c-ply15', cat: 'Material', name: 'Plywood 15mm', unit: 'lbr', price: 280000, supplier: 'Mitra Abadi', spec: '1220×2440' },
  { id: 'c-hdf5', cat: 'Material', name: 'HDF 5mm (back panel)', unit: 'lbr', price: 95000, supplier: 'Mitra Abadi' },
  { id: 'c-hpl-taco', cat: 'Material', name: 'HPL Taco', unit: 'lbr', price: 280000, supplier: 'Anugerah', spec: '1220×2440' },
  { id: 'c-hpl-premium', cat: 'Material', name: 'HPL Premium motif kayu', unit: 'lbr', price: 450000, supplier: 'Anugerah' },
  { id: 'c-epoxy', cat: 'Finishing', name: 'Cat Epoxy Hijau', unit: 'klg', price: 156000, supplier: 'Anggrek Baru' },
  { id: 'c-diton', cat: 'Finishing', name: 'Cat Semprot Diton Putih (touch-up)', unit: 'klg', price: 34000, supplier: 'Green Material' },
  { id: 'c-thinner', cat: 'Finishing', name: 'Thinner ND', unit: 'klg', price: 60000, supplier: 'Anggrek Baru' },
  { id: 'c-prima', cat: 'Finishing', name: 'Lem Prima D', unit: 'kg', price: 75000, supplier: 'Aneka Interior' },
  { id: 'c-aibon', cat: 'Finishing', name: 'Lem kuning Aica Aibon', unit: 'kaleng', price: 85000, supplier: 'Aneka Interior' },
  { id: 'c-edging', cat: 'Finishing', name: 'Edging PVC 4.2cm 25m', unit: 'rol', price: 187500, supplier: 'Mitra Abadi' },
  { id: 'c-engsel-slowmo', cat: 'Hardware', name: 'Engsel Sendok Slowmo Stainless', unit: 'psg', price: 40000, supplier: 'Kota Jaya' },
  { id: 'c-engsel-180', cat: 'Hardware', name: 'Engsel 180° ½ Bongkuk', unit: 'psg', price: 60000, supplier: 'Kota Jaya' },
  { id: 'c-engsel-168', cat: 'Hardware', name: 'Engsel 168° Corner', unit: 'psg', price: 95000, supplier: 'Kota Jaya' },
  { id: 'c-rel-rd35', cat: 'Hardware', name: 'Rel RD 35cm', unit: 'psg', price: 36000, supplier: 'Kota Jaya' },
  { id: 'c-rel-fe45', cat: 'Hardware', name: 'Rel FE 45cm', unit: 'psg', price: 52000, supplier: 'Kota Jaya' },
  { id: 'c-handle-taco', cat: 'Hardware', name: 'Handle Taco TP-H01 Stainless', unit: 'btg', price: 175000, supplier: 'Anugerah' },
  { id: 'c-rak-piring', cat: 'Hardware', name: 'Rak Piring 2 Susun Modeline B30MED+T', unit: 'unit', price: 225000, supplier: 'Kota Jaya' },
  { id: 'c-rak-sendok', cat: 'Hardware', name: 'Rak Sendok L', unit: 'unit', price: 135000, supplier: 'Kota Jaya' },
  { id: 'c-skrup-jf', cat: 'Hardware', name: 'Skrup JF 6×5/8"', unit: 'bks', price: 24000, supplier: 'Kota Jaya' },
  { id: 'c-skrup-m4', cat: 'Hardware', name: 'Skrup M4', unit: 'pcs', price: 700, supplier: 'Prima Raya' },
  { id: 'c-fischer', cat: 'Hardware', name: 'Fischer 8mm', unit: 'ring', price: 37000, supplier: 'Prima Raya' },
  { id: 'c-ambalan', cat: 'Hardware', name: 'Ambalan Tipis', unit: 'pack', price: 40000, supplier: 'Kota Jaya' },
  { id: 'c-cutter', cat: 'Hardware', name: 'Isi Pisau Cutter Besar', unit: 'kotak', price: 8000, supplier: 'Kota Jaya' },
  { id: 'c-siku', cat: 'Hardware', name: 'Bracket Siku L 2"', unit: 'pcs', price: 3500, supplier: 'Kota Jaya' },
  { id: 'c-led-strip', cat: 'LED', name: 'LED Strip 120 Mata Warm White', unit: 'rol', price: 163000, supplier: 'Surya Lighting' },
  { id: 'c-trafo', cat: 'LED', name: 'Trafo 8A Slim', unit: 'unit', price: 210000, supplier: 'Surya Lighting' },
  { id: 'c-led-casing', cat: 'LED', name: 'Housing/Casing LED Timbul', unit: 'btg', price: 94000, supplier: 'Surya Lighting' },
  { id: 'c-kabel-dc', cat: 'Listrik', name: 'Kabel DC Hitam Putih', unit: 'meter', price: 5000, supplier: 'Serdam' },
  { id: 'c-steker', cat: 'Listrik', name: 'Steker On/Off Biasa', unit: 'pcs', price: 10000, supplier: 'TB di Purnama' },
  { id: 'c-t-colokan', cat: 'Listrik', name: 'T Colokan 3 Lubang Uticon', unit: 'pcs', price: 38000, supplier: 'TB di Purnama' },
  { id: 'c-ventilasi', cat: 'Listrik', name: 'Ventilasi Udara Gas', unit: 'psg', price: 44000, supplier: 'Pusat Interior' },
  { id: 'c-listrik-ws', cat: 'Overhead', name: 'Listrik Workshop', unit: 'unit', price: 202750, supplier: 'Mandeng Jago' },
  { id: 'c-ojek', cat: 'Overhead', name: 'Ojek Pick Up', unit: 'unit', price: 200000, supplier: 'Dani Maxim' },
  { id: 'c-konsumsi', cat: 'Overhead', name: 'Konsumsi Makan & Minum Lokasi', unit: 'unit', price: 110000, supplier: 'Indra' },
  { id: 'c-knee', cat: 'Overhead', name: 'Knee / Lbow 4"', unit: 'pce', price: 19000, supplier: 'Prima Raya' },
  { id: 'c-jasa-finishing', cat: 'Jasa', name: 'Jasa finishing HPL/ACP', unit: 'm²', price: 150000, supplier: 'Internal' },
  { id: 'c-jasa-assembly', cat: 'Jasa', name: 'Jasa assembly rangka + kabinet', unit: 'unit', price: 75000, supplier: 'Internal' },
  { id: 'c-jasa-pasang', cat: 'Jasa', name: 'Jasa pasang di lokasi', unit: 'hari', price: 350000, supplier: 'Internal' },
];

export async function loadCatalog(): Promise<CatalogItem[]> {
  try { const list = await db.catalog.toArray(); return list.length ? list : PRESET_CATALOG; } catch { return PRESET_CATALOG; }
}
export async function saveCatalog(list: CatalogItem[]): Promise<void> {
  try { await db.transaction('rw', db.catalog, async () => { await db.catalog.clear(); await db.catalog.bulkPut(list); }); } catch (e) { console.warn('Simpan katalog gagal', e); }
}
export async function resetCatalog(): Promise<void> { try { await db.catalog.clear(); } catch { /* ignore */ } }
