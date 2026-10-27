// 3D Intero — HPP Calculator v2: estimasi (auto dari scene) vs realisasi (input user) vs selisih.
import type { CatalogItem, FrameMaterialId, HppRow, Item, ProjectSettings, Scenario, Wall } from '../types';
import type { ProductionBundle } from './types';
import { FRAME_MATERIALS, buildFrame, type FrameResult } from './frame';
import { planCuts } from './cutlist';
import { uid } from '../lib/utils';

const cat = (catalog: CatalogItem[], id: string): CatalogItem | undefined => catalog.find((c) => c.id === id);
const FRAME_CATALOG: Record<FrameMaterialId, Record<string, string>> = {
  galvanis_08: { '1530': 'c-gal-1530', '1515': 'c-gal-1515', '2040': 'c-gal-2040', alu: '' },
  galvanis_07: { '1530': 'c-gal-1530-07', '1515': 'c-gal-1515-07', '2040': 'c-gal-2040', alu: '' },
  aluminium: { '1530': '', '1515': '', '2040': '', alu: 'c-alu-1515' },
};
const HW_MAP: Record<string, { id: string; div?: number }> = {
  hinge: { id: 'c-engsel-slowmo' }, hinge168: { id: 'c-engsel-168' }, slide: { id: 'c-rel-fe45' }, handle: { id: 'c-handle-taco' },
  pin: { id: 'c-skrup-m4', div: 1 }, confirmat: { id: 'c-skrup-jf', div: 200 }, dowel: { id: 'c-skrup-m4', div: 1 },
  screw_dw: { id: 'c-skrup-jf', div: 200 }, elbow: { id: 'c-siku' }, bolt_m8: { id: 'c-skrup-m4' }, screw_acp: { id: 'c-skrup-jf', div: 200 },
  glue_yellow: { id: 'c-aibon' }, glue_white: { id: 'c-prima' }, weld_rod: { id: 'c-epoxy' }, silicone: { id: 'c-prima' }, anchor: { id: 'c-fischer' },
  acc_dish: { id: 'c-rak-piring' }, acc_spice: { id: 'c-rak-sendok' }, acc_gas: { id: 'c-rak-sendok' }, acc_cutlery: { id: 'c-rak-sendok' },
  acc_trash: { id: 'c-rak-sendok' }, acc_lazy: { id: 'c-rak-piring' }, acc_magiccom_tray: { id: 'c-rel-fe45' },
};
const FALLBACK: Record<string, { name: string; unit: string; price: number }> = {
  pushopen: { name: 'Push-to-open mechanism', unit: 'pcs', price: 35000 },
  weld_rod: { name: 'Kawat las', unit: 'klg', price: 45000 },
  acc_gas: { name: 'Rak gas tarik', unit: 'set', price: 550000 },
  acc_trash: { name: 'Pull-out trash bin', unit: 'set', price: 750000 },
  acc_cutlery: { name: 'Laci tatakan sendok', unit: 'set', price: 400000 },
  acc_lazy: { name: 'Lazy Susan corner', unit: 'set', price: 1400000 },
  acc_magiccom_tray: { name: 'Tray magic com rel teleskopik', unit: 'set', price: 450000 },
  pin: { name: 'Shelf support pin', unit: 'pcs', price: 500 },
  dowel: { name: 'Dowel 8×30', unit: 'pcs', price: 100 },
};
const r0 = (n: number) => Math.round(n * 100) / 100;

export function autoHppRows(items: Item[], walls: Wall[], settings: ProjectSettings, bundle: ProductionBundle, catalog: CatalogItem[], scenario: Scenario): HppRow[] {
  const material = settings.production.frameMaterial;
  const frame = buildFrame(items, walls, settings, material);
  const rows: HppRow[] = [];
  const push = (o: { cat: string; name: string; spec?: string; unit: string; vol: number; price: number; supplier?: string; note?: string }) => {
    if (!(o.vol > 0)) return;
    rows.push({ id: uid('HR'), name: o.name, cat: o.cat, spec: o.spec ?? '', unit: o.unit, estVol: r0(o.vol), estPrice: Math.round(o.price), realVol: null, realPrice: null, progress: 0, supplier: o.supplier ?? '', note: o.note ?? '', auto: true });
  };
  const fromCatalog = (id: string, vol: number, fb?: { name: string; unit: string; price: number }) => {
    const c = cat(catalog, id) ?? (fb ? { id, cat: 'Hardware', ...fb, supplier: '' } as CatalogItem : undefined);
    if (!c) return;
    push({ cat: c.cat, name: c.name, spec: c.spec, unit: c.unit, vol, price: c.price, supplier: c.supplier });
  };

  // 1 ── Rangka (batang 6 m, waste 5% sudah termasuk) + bracket sudut L
  const fm = FRAME_MATERIALS[material];
  for (const pl of planCuts(frame)) {
    const k = pl.profile;
    const id = FRAME_CATALOG[material][k];
    const c = cat(catalog, id);
    const name = c?.name ?? `${fm.short} · profil ${k === 'alu' ? '1×1.5"' : k.replace('1530', '1.5×3').replace('1515', '1.5×1.5').replace('2040', '2×4')} cm`;
    const price = c?.price ?? Math.round((frame.barPrice[k] || fm.bars[k]) * fm.factor);
    push({ cat: 'Rangka', name, spec: `batang 6 m · potong optimal ${pl.bars.length} · standar +5% ${pl.standard}`, unit: 'btg', vol: pl.buy, price, supplier: c?.supplier });
  }
  fromCatalog('c-siku', frame.cornerBrackets);
  if (material !== 'aluminium') fromCatalog('c-weld-rod', Math.ceil((frame.totalLengthM * 0.06) / 1) || 0, { name: 'Kawat las', unit: 'klg', price: 45000 });

  // 2 ── Material panel (lembar + waste)
  const nest = (m: string) => bundle.nests.find((n) => n.sheets.length >= 0 && n.material === m);
  const sheetsOf = (m: string) => nest(m)?.sheets.length ?? 0;
  const wasteOf = (m: string) => nest(m)?.wastePct ?? 0;
  if (scenario.method === 'rangka_acp') {
    fromCatalog('c-acp-putih', sheetsOf('acp4'));
    fromCatalog('c-ply18', sheetsOf('ply18'));
    fromCatalog('c-hdf5', sheetsOf('hdf5'));
  } else {
    fromCatalog('c-ply18', sheetsOf('ply18'));
    fromCatalog('c-ply15', sheetsOf('ply15'));
    fromCatalog('c-hdf5', sheetsOf('hdf5'));
    const hplSheets = Math.ceil((bundle.hplAreaM2 * 1.12) / (1.22 * 2.44));
    fromCatalog('c-hpl-taco', hplSheets);
  }

  // 3 ── Finishing
  if (scenario.method === 'papan_hpl') {
    fromCatalog('c-aibon', Math.ceil(bundle.hplAreaM2 / 10));
    fromCatalog('c-prima', Math.ceil(bundle.panels.length / 20));
    fromCatalog('c-edging', Math.ceil(bundle.edgeMeters / 25));
    fromCatalog('c-diton', 1);
  } else {
    fromCatalog('c-epoxy', Math.ceil(bundle.frameSurfaceM2 * 0.6));
    fromCatalog('c-thinner', Math.max(1, Math.ceil(bundle.frameSurfaceM2 * 0.3)));
    fromCatalog('c-prima', Math.ceil(bundle.panels.length / 24));
  }

  // 4 ── Hardware dari kalkulator
  for (const h of bundle.hardware) {
    const map = HW_MAP[h.ref];
    if (map) { fromCatalog(map.id, map.div ? h.qty / map.div : h.qty); continue; }
    const fb = FALLBACK[h.ref];
    if (fb) push({ cat: 'Hardware', name: fb.name, unit: fb.unit, vol: h.qty, price: fb.price });
  }

  // 5 ── LED & Listrik
  let ledMm = 0, sensors = 0;
  for (const it of items.filter((i) => i.visible)) {
    const l = it.led; let n = 0;
    if (l.underCabinet) n++; if (l.insideUpper) n++; if (l.insideBase) n++; if (l.plinth) n++; if (it.config.corniceLight) n++;
    ledMm += n * it.dims.w; if (n && l.trigger === 'onOpen') sensors++;
  }
  const rolls = Math.ceil(ledMm / 5000);
  fromCatalog('c-led-strip', rolls);
  fromCatalog('c-trafo', rolls ? Math.max(1, Math.ceil(rolls / 3)) : 0);
  fromCatalog('c-led-casing', rolls);
  fromCatalog('c-kabel-dc', rolls * 6);
  fromCatalog('c-steker', rolls ? Math.max(1, Math.ceil(rolls / 3)) : 0);
  fromCatalog('c-t-colokan', rolls ? 1 : 0);
  fromCatalog('c-ventilasi', items.filter((i) => i.type === 'cooktop_base').length);

  // 6 ── Jasa & overhead
  const cabinets = items.filter((i) => i.type !== 'custom').length;
  const days = cabinets ? Math.max(1, Math.ceil(cabinets / 6)) : 0;
  fromCatalog('c-jasa-finishing', r0(scenario.method === 'papan_hpl' ? bundle.hplAreaM2 : bundle.acpAreaM2));
  fromCatalog('c-jasa-assembly', cabinets);
  fromCatalog('c-jasa-pasang', days);
  fromCatalog('c-listrik-ws', cabinets ? 1 : 0);
  fromCatalog('c-ojek', cabinets ? 1 : 0);
  fromCatalog('c-konsumsi', days);
  void wasteOf; void sensors;
  return rows;
}

/** Gabungkan: baris auto diperbarui, nilai realisasi/progress/supplier lama tetap dipertahankan. */
export function mergeRows(existing: HppRow[], fresh: HppRow[]): HppRow[] {
  const prev = new Map(existing.filter((r) => r.auto).map((r) => [r.cat + '|' + r.name, r]));
  const manual = existing.filter((r) => !r.auto);
  const merged = fresh.map((r) => {
    const old = prev.get(r.cat + '|' + r.name);
    return old ? { ...r, realVol: old.realVol, realPrice: old.realPrice, progress: old.progress, supplier: old.supplier || r.supplier, note: old.note, id: old.id } : r;
  });
  return [...merged, ...manual];
}

export interface HppTotals { estTotal: number; realTotal: number; diff: number; diffPct: number; hasReal: boolean; sellEst: number; sellReal: number; sellFinal: number; ppn: number; margin: number; progress: number }

export function hppTotals(rows: HppRow[], margin: number, ppnOn: boolean): HppTotals {
  const line = (r: HppRow) => ({ est: r.estVol * r.estPrice, real: r.realVol != null && r.realPrice != null ? r.realVol * r.realPrice : null });
  let estTotal = 0, realTotal = 0, hasReal = false, progSum = 0;
  for (const r of rows) { const l = line(r); estTotal += l.est; if (l.real != null) { realTotal += l.real; hasReal = true; } progSum += r.progress; }
  const diff = realTotal - estTotal;
  const sellEst = Math.round(estTotal * (1 + margin / 100));
  const sellReal = Math.round(realTotal * (1 + margin / 100));
  const base = hasReal ? sellReal : sellEst;
  const ppn = ppnOn ? Math.round(base * 0.11) : 0;
  return { estTotal: Math.round(estTotal), realTotal: Math.round(realTotal), diff: Math.round(diff), diffPct: estTotal ? (diff / estTotal) * 100 : 0, hasReal, sellEst, sellReal, sellFinal: base + ppn, ppn, margin, progress: rows.length ? Math.round(progSum / rows.length) : 0 };
}

export const rowEst = (r: HppRow) => Math.round(r.estVol * r.estPrice);
export const rowReal = (r: HppRow) => (r.realVol != null && r.realPrice != null ? Math.round(r.realVol * r.realPrice) : null);
export const frameOf = (items: Item[], walls: Wall[], s: ProjectSettings): FrameResult => buildFrame(items, walls, s, s.production.frameMaterial);
