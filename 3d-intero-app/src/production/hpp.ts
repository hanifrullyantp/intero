// 3D Intero — HPP Calculator: material, hardware, appliance, LED, jasa, overhead, countertop, custom → margin & PPN
import type { CostCategory, Item, PriceItem, ProjectSettings, Scenario, Wall } from '../types';
import type { HppLine, HppResult, HppSection, ProductionBundle } from './types';
import { computeCountertopRuns } from '../generators/countertop';

export const SECTION_ORDER: { id: string; title: string; cat?: CostCategory }[] = [
  { id: 'material', title: 'Material Utama', cat: 'material' }, { id: 'hardware', title: 'Hardware', cat: 'hardware' },
  { id: 'appliance', title: 'Appliance', cat: 'appliance' }, { id: 'countertop', title: 'Countertop & Backsplash' },
  { id: 'led', title: 'LED System', cat: 'led' }, { id: 'jasa', title: 'Jasa Tukang', cat: 'jasa' },
  { id: 'overhead', title: 'Transport & Overhead', cat: 'overhead' }, { id: 'custom', title: 'Bahan Tambahan (Custom)', cat: 'lainnya' },
];

export function activeScenario(s: ProjectSettings): Scenario {
  const p = s.production;
  return p.scenarios.find((x) => x.id === p.activeScenario) ?? p.scenarios[0];
}

/** Resolusi harga: slot (pilihan skenario) → id langsung. */
export function resolvePrice(prices: PriceItem[], ref: string, sc: Scenario): PriceItem | undefined {
  const sel = sc.slots[ref];
  if (sel) { const p = prices.find((x) => x.id === sel); if (p) return p; }
  return prices.find((x) => x.slot === ref) ?? prices.find((x) => x.id === ref);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeHpp(bundle: ProductionBundle, items: Item[], settings: ProjectSettings, prices: PriceItem[], sc: Scenario, walls: Wall[]): HppResult {
  const sections: HppSection[] = SECTION_ORDER.map((s) => ({ id: s.id, title: s.title, lines: [], subtotal: 0 }));
  const sec = (id: string) => sections.find((s) => s.id === id)!;
  const add = (sid: string, key: string, ref: string | PriceItem, qty: number, note?: string) => {
    const pr = typeof ref === 'string' ? resolvePrice(prices, ref, sc) : ref;
    if (!pr || qty <= 0) return;
    sec(sid).lines.push({ key, name: pr.name, qty: r2(qty), unit: pr.unit, unitPrice: pr.price, total: Math.round(pr.price * qty), note });
  };
  const nestOf = (m: string) => bundle.nests.find((n) => n.material === m);
  const sheets = (m: string) => nestOf(m)?.sheets.length ?? 0;
  const waste = (m: string) => { const n = nestOf(m); return n ? `waste ${n.wastePct.toFixed(1)}%` : undefined; };

  // ── Material utama
  add('material', 'ply18', 'plywood18', sheets('ply18'), waste('ply18'));
  add('material', 'ply15', 'ply15', sheets('ply15'), waste('ply15'));
  add('material', 'hdf5', 'hdf5', sheets('hdf5'), waste('hdf5'));
  const hplSheets = Math.ceil((bundle.hplAreaM2 * 1.12) / (1.22 * 2.44));
  add('material', 'hpl', 'hpl', hplSheets, `${bundle.hplAreaM2.toFixed(1)} m² + 12% waste`);
  add('material', 'edge', 'edge_pvc', Math.ceil(bundle.edgeMeters * 1.1));
  add('material', 'acp', 'acp', sheets('acp4'), waste('acp4'));
  add('material', 'hollow40', 'hollow40', Math.ceil((bundle.frameLen['40x40'] * 1.05) / 6000), `${(bundle.frameLen['40x40'] / 1000).toFixed(1)} m + 5% waste`);
  add('material', 'hollow20', 'hollow20', Math.ceil((bundle.frameLen['20x20'] * 1.05) / 6000), `${(bundle.frameLen['20x20'] / 1000).toFixed(1)} m + 5% waste`);

  // ── Hardware
  for (const h of bundle.hardware) add('hardware', `hw-${h.ref}`, h.ref, h.qty);

  // ── Appliance
  const app = (ref: string, n = 1) => add('appliance', `app-${ref}`, ref, n);
  const cnt = new Map<string, number>();
  const inc = (ref: string) => cnt.set(ref, (cnt.get(ref) ?? 0) + 1);
  for (const it of items) {
    if (it.type === 'cooktop_base') inc('app_cooktop');
    if (it.type === 'sink_base') { inc('app_sink'); inc('app_faucet'); }
    if (it.type === 'hood') inc('app_hood');
    if (it.type === 'fridge') inc('app_fridge');
    if (it.type === 'dishwasher') inc('app_dishwasher');
    if (it.type === 'electronic') {
      const s1 = it.config.slot1 ?? 'magiccom', s2 = it.config.slot2 ?? 'oven';
      if (s1 === 'oven') inc('app_oven'); if (s1 === 'dispenser') inc('app_dispenser'); if (s1 === 'magiccom') inc('app_magiccom');
      if (s2 === 'oven') inc('app_oven'); if (s2 === 'microwave') inc('app_microwave'); if (s2 === 'coffee') inc('app_coffee');
    }
  }
  for (const [ref, n] of cnt) app(ref, n);

  // ── Countertop & backsplash
  const ct = settings.countertop;
  const vis = items.filter((i) => i.visible);
  const runs = computeCountertopRuns(vis, walls);
  let ctArea = runs.reduce((a, r) => a + ((r.end - r.start) * (r.depth + ct.overhang)) / 1e6, 0);
  let bsLen = runs.reduce((a, r) => a + (r.end - r.start), 0);
  for (const it of vis) {
    if (it.type === 'corner_base') { ctArea += (it.dims.w * 600 + (it.dims.d - 600) * 600) / 1e6; bsLen += it.dims.w + it.dims.d - 600; }
    if (it.type === 'island') ctArea += ((it.dims.w + 2 * ct.overhang) * (it.dims.d + 2 * ct.overhang + (it.config.stools ? 250 : 0))) / 1e6;
    if (it.type === 'bar') ctArea += (it.dims.w * it.dims.d) / 1e6;
  }
  add('countertop', 'ct', `ct_${ct.type}`, r2(ctArea));
  if (ct.backsplash) {
    const bsH = ct.backsplashAuto ? Math.max(100, settings.wallGap - ct.thickness) : ct.backsplashHeight;
    add('countertop', 'tile', 'tile_backsplash', r2((bsLen * bsH) / 1e6), `tinggi ${(bsH / 10).toFixed(0)} cm`);
  }

  // ── LED
  let ledMm = 0, sensors = 0;
  for (const it of vis) {
    const l = it.led; let n = 0;
    if (l.underCabinet) n += 1; if (l.insideUpper) n += 1; if (l.insideBase) n += 1; if (l.plinth) n += 1;
    if (it.config.corniceLight) n += 1;
    ledMm += n * it.dims.w;
    if (n > 0 && l.trigger === 'onOpen') sensors += 1;
  }
  const rolls = Math.ceil(ledMm / 5000);
  add('led', 'led-strip', 'led_strip', rolls, `${(ledMm / 1000).toFixed(1)} m total`);
  add('led', 'led-driver', 'led_driver', rolls > 0 ? Math.max(1, Math.ceil(rolls / 3)) : 0);
  add('led', 'led-sensor', 'led_sensor', sensors);

  // ── Jasa
  const cabinets = items.filter((i) => i.type !== 'custom').length;
  const papanItems = bundle.items.filter((i) => i.method === 'papan_hpl').length;
  const frameM = (bundle.frameLen['40x40'] + bundle.frameLen['20x20']) / 1000;
  add('jasa', 'jasa-finishing', 'jasa_finishing', r2(bundle.hplAreaM2));
  add('jasa', 'jasa-assembly', 'jasa_assembly', papanItems);
  add('jasa', 'jasa-welding', 'jasa_welding', r2(frameM));
  add('jasa', 'jasa-powder', 'jasa_powder', r2(bundle.frameSurfaceM2));
  const days = cabinets > 0 ? Math.max(1, Math.ceil(cabinets / 6)) : 0;
  add('jasa', 'jasa-install', 'jasa_install', days);

  // ── Overhead
  if (cabinets > 0) { add('overhead', 'oh-transport', 'oh_transport', 1); add('overhead', 'oh-konsumsi', 'oh_konsumsi', days); }

  // ── Custom items user (masuk ke bagian kategorinya)
  for (const ci of settings.production.customItems) {
    const target = SECTION_ORDER.find((s) => s.cat === ci.category)?.id ?? 'custom';
    const line: HppLine = { key: ci.id, name: ci.name, qty: ci.qty, unit: ci.unit, unitPrice: ci.price, total: Math.round(ci.qty * ci.price), custom: true, customId: ci.id };
    sec(target).lines.push(line);
  }

  for (const s of sections) s.subtotal = s.lines.reduce((a, l) => a + l.total, 0);
  const subtotal = sections.reduce((a, s) => a + s.subtotal, 0);
  const marginAmount = Math.round((subtotal * sc.margin) / 100);
  const ppnAmount = sc.ppnOn ? Math.round(((subtotal + marginAmount) * 11) / 100) : 0;
  const sheetsRec: Record<string, number> = {}, wasteRec: Record<string, number> = {};
  for (const n of bundle.nests) { sheetsRec[n.material] = n.sheets.length; wasteRec[n.material] = n.wastePct; }
  return {
    sections, subtotal, margin: sc.margin, marginAmount, ppnAmount, total: subtotal + marginAmount + ppnAmount,
    stats: { cabinets, sheets: sheetsRec, wastePct: wasteRec, hplAreaM2: bundle.hplAreaM2, frameMeters: frameM },
  };
}

export const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
