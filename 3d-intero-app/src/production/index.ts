// 3D Intero — Orkestrasi produksi: panel/rangka per kabinet, nesting, hardware.
import type { Item, ProdMethod, ProjectSettings } from '../types';
import type { ItemProduction, NestResult, Panel, PanelMaterial, Profile, ProductionBundle } from './types';
import { buildPapanPanels } from './engine-papan';
import { buildRangka } from './engine-rangka';
import { nestPanels } from './nesting';
import { calcHardware } from './hardware';

const PREFIX: Record<Item['type'], string> = {
  base: 'BC', sink_base: 'SB', cooktop_base: 'CK', drawer_base: 'DB', dishwasher: 'DW', wall: 'WC', tall: 'TC', corner_base: 'CB', corner_wall: 'CW',
  fridge: 'FR', electronic: 'EC', hood: 'HD', island: 'IS', bar: 'BR', custom: 'CU',
};

export function assignTags(items: Item[]): Record<string, string> {
  const ordered = [...items].sort((a, b) => (a.wallId ?? '~').localeCompare(b.wallId ?? '~') || a.orderIndex - b.orderIndex);
  const counters: Record<string, number> = {};
  const tags: Record<string, string> = {};
  for (const it of ordered) {
    const p = PREFIX[it.type]; counters[p] = (counters[p] ?? 0) + 1;
    tags[it.id] = `${p}${String(counters[p]).padStart(2, '0')}`;
  }
  return tags;
}

export function edgeLenM(p: Panel) { return ((p.edges.t ? p.w : 0) + (p.edges.b ? p.w : 0) + (p.edges.l ? p.h : 0) + (p.edges.r ? p.h : 0)) * p.qty / 1000; }

export function buildProduction(items: Item[], settings: ProjectSettings, defaultMethod: ProdMethod): ProductionBundle {
  const [sheetW, sheetH] = settings.production.sheet === '1830x2440' ? [1830, 2440] : [1220, 2440];
  const tags = assignTags(items);
  const perItem: ItemProduction[] = [];
  for (const it of items) {
    const tag = tags[it.id]; const method = it.config.method ?? defaultMethod;
    const papan = buildPapanPanels(it, settings, tag);
    if (method === 'papan_hpl') perItem.push({ itemId: it.id, tag, method, panels: papan, segments: [], joints: [] });
    else { const r = buildRangka(it, settings, tag, papan); perItem.push({ itemId: it.id, tag, method, panels: r.panels, segments: r.segments, joints: r.joints }); }
  }
  const panels = perItem.flatMap((p) => p.panels);
  const segments = perItem.flatMap((p) => p.segments);
  const joints = perItem.flatMap((p) => p.joints.map((pt) => ({ itemId: p.itemId, p: pt })));
  const groups = new Map<PanelMaterial, Panel[]>();
  for (const p of panels) groups.set(p.material, [...(groups.get(p.material) ?? []), p]);
  const nests: NestResult[] = [];
  for (const [mat, list] of groups) nests.push(nestPanels(mat, list, sheetW, sheetH));
  const papanPanels = perItem.filter((p) => p.method === 'papan_hpl').flatMap((p) => p.panels);
  const edgeMeters = papanPanels.reduce((a, p) => a + edgeLenM(p), 0);
  const hplAreaM2 = papanPanels.reduce((a, p) => a + (p.hplFaces * p.w * p.h * p.qty) / 1e6, 0);
  const acpAreaM2 = panels.filter((p) => p.material === 'acp4').reduce((a, p) => a + (p.w * p.h * p.qty) / 1e6, 0);
  const frameLen: Record<Profile, number> = { '40x40': 0, '20x20': 0 };
  for (const sg of segments) frameLen[sg.profile] += sg.length;
  const frameSurfaceM2 = (frameLen['40x40'] * 160 + frameLen['20x20'] * 80) / 1e6;
  return { items: perItem, panels, segments, joints, nests, edgeMeters, hplAreaM2, acpAreaM2, frameLen, frameSurfaceM2, hardware: calcHardware(perItem, items, hplAreaM2), tags };
}
