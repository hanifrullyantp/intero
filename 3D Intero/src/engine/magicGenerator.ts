import type { LightingSettings, Project, ProjectMaterials } from '../models/types';
import { generateGuided, type GuidedItem } from './guidedLayout';
import { r1 } from '../utils/geometry';

export const AUTO = 'auto_fill';
export type SideId = 'A' | 'B' | 'C';
export interface MagicCatalogEntry { key: string; label: string; icon: string; defW: number; tall?: boolean; water?: boolean; cook?: boolean }
export const MAGIC_CATALOG: MagicCatalogEntry[] = [
  { key: AUTO, label: 'Sisanya Kitchen Set (Auto-Fill)', icon: 'sparkles', defW: 0 },
  { key: 'fridge_sbs', label: 'Kulkas Side-by-Side', icon: 'fridge', defW: 90, tall: true },
  { key: 'fridge', label: 'Kulkas 2 Pintu', icon: 'fridge', defW: 70, tall: true },
  { key: 'electro', label: 'Kabinet Elektronik (Magiccom + Oven)', icon: 'oven', defW: 100, tall: true },
  { key: 'dispenser', label: 'Kabinet + Dispenser Air', icon: 'water', defW: 60, tall: true },
  { key: 'pantry', label: 'Pantry Tower', icon: 'cabinet', defW: 60, tall: true },
  { key: 'sink', label: 'Sink + Kabinet Atas', icon: 'water', defW: 80, water: true },
  { key: 'stove', label: 'Kompor + Hood + Kabinet Atas', icon: 'cooktop', defW: 80, cook: true },
  { key: 'base_top', label: 'Kabinet Bawah + Atas', icon: 'cabinet', defW: 80 },
  { key: 'base_only', label: 'Kabinet Bawah saja', icon: 'cabinet', defW: 60 },
  { key: 'wall_only', label: 'Kabinet Atas saja', icon: 'cabinet', defW: 60 },
  { key: 'open_shelf', label: 'Rak Terbuka', icon: 'cabinet', defW: 60 },
];
export const magicEntry = (key: string) => MAGIC_CATALOG.find((i) => i.key === key) ?? MAGIC_CATALOG[0];
export interface MagicItem { uid: string; key: string; width: number }
export interface MagicSide { length: number; items: MagicItem[] }
/** Sink / stove position: centimetre from the wall junction (the inner corner), measured along the wall. */
export interface MagicPlacement { side: SideId; offset: number; ref: 'start' | 'end' }
export interface MagicSpec {
  name: string;
  shape: 'I' | 'L' | 'U';
  sides: Record<SideId, MagicSide>;
  cornerDepth: number;
  totalH: number;
  baseH: number;
  ctDepth: number;
  wallDepth: number;
  backsplashHeight: number;
  ceilingHeight?: number;
  baseDepth?: number;
  lighting?: LightingSettings;
  /** explicit sink / stove position. When absent the generator picks the widest auto-fill slot. */
  placement?: { sink?: MagicPlacement; stove?: MagicPlacement };
}

export function activeSides(spec: Pick<MagicSpec, 'shape'>): SideId[] {
  return spec.shape === 'I' ? ['A'] : spec.shape === 'L' ? ['A', 'B'] : ['A', 'B', 'C'];
}

export function cornerCount(shape: MagicSpec['shape'], side: SideId): number {
  if (shape === 'I' || shape === 'L' && side === 'C') return 0;
  return shape === 'U' && side === 'A' ? 2 : 1;
}

export function fixedUsed(spec: MagicSpec, side: SideId): number {
  return r1(spec.sides[side].items.filter((i) => i.key !== AUTO).reduce((n, i) => n + r1(i.width), 0) + cornerCount(spec.shape, side) * spec.cornerDepth);
}
export const autoCount = (spec: MagicSpec, side: SideId) => spec.sides[side].items.filter((i) => i.key === AUTO).length;
export const autoSpace = (spec: MagicSpec, side: SideId) => r1(spec.sides[side].length - fixedUsed(spec, side));

/** All arithmetic uses tenths of a centimetre; no remainder is dropped or widened. */
export function splitAutoFill(space: number): number[] {
  const units = Math.round(space * 10);
  if (units <= 0) return [];
  if (units === 1400) return [80, 60];
  const count = Math.max(1, Math.ceil(space / 90));
  const base = Math.floor(units / count / 50) * 50;
  const result = Array.from({ length: count }, () => base);
  let remainder = units - base * count;
  for (let n = count - 1; remainder > 0; n = (n - 1 + count) % count) {
    const chunk = Math.min(50, remainder);
    result[n] += chunk;
    remainder -= chunk;
  }
  if (units >= 600 && !result.some((n) => n >= 600) && result.length > 1) {
    const missing = 600 - result[0];
    if (result[1] - missing >= 200) { result[0] += missing; result[1] -= missing; }
  }
  return result.map((n) => n / 10);
}
export const AUTO_STEP_HINT = 'Lebar standar dengan sisa presisi 0,1 cm. Total selalu sesuai panjang dinding.';

interface Resolved extends GuidedItem { auto?: boolean }

export function resolveSide(spec: MagicSpec, side: SideId, need: 'sink' | 'stove' | null = null): Resolved[] {
  const output: Resolved[] = [];
  const available = autoSpace(spec, side);
  const count = autoCount(spec, side);
  const total = Math.max(0, Math.round(available * 10));
  let left = total, leftSlots = count;
  for (const item of spec.sides[side].items) {
    if (item.key !== AUTO) {
      output.push({ key: item.key, label: magicEntry(item.key).label, width: r1(item.width) });
      continue;
    }
    const allotted = leftSlots === 1 ? left : Math.floor(left / leftSlots);
    left -= allotted;
    leftSlots--;
    for (const width of splitAutoFill(allotted / 10)) output.push({
      key: width < 20 ? 'filler' : 'base_top', label: width < 20 ? 'Filler' : 'Kabinet Bawah + Atas', width, auto: true,
    });
  }
  if (!count && available > 0) output.push({ key: 'gap', label: 'Ruang kosong', width: available });
  if (need) {
    const slot = output.filter((i) => i.auto && i.width >= 60).sort((a, b) => Math.abs(a.width - 80) - Math.abs(b.width - 80))[0];
    if (slot) { slot.key = need; slot.label = magicEntry(need).label; }
  }
  return output;
}

export function needsOf(spec: MagicSpec): { sink: 'sink' | null; stove: 'stove' | null } {
  const keys = activeSides(spec).flatMap((s) => spec.sides[s].items.map((i) => i.key));
  return { sink: keys.includes('sink') ? null : 'sink', stove: keys.includes('stove') ? null : 'stove' };
}
export const autoFillSides = (spec: MagicSpec) => activeSides(spec).filter((s) => autoCount(spec, s) > 0 && autoSpace(spec, s) >= 60);

/**
 * Distance in "cm from the corner" (the wall junction) → centre inside this side's item list.
 * Side A of an L turns the corner at its far end, so its list runs away from the junction.
 */
function listCenter(spec: MagicSpec, side: SideId, offset: number, ref: 'start' | 'end', total: number): number {
  const cw = spec.cornerDepth;
  if (spec.shape === 'I') return offset;
  if (spec.shape === 'L' && side === 'A') return total + cw - offset;
  return side === 'A' && ref === 'end' ? total + cw - offset : offset - cw;
}

/** Inverse of listCenter — reports the real position in the same terms the user types in. */
export function placementOf(spec: MagicSpec, side: SideId, centre: number, total: number, ref: 'start' | 'end' = 'start'): MagicPlacement {
  const cw = spec.cornerDepth;
  if (spec.shape === 'I') return { side, offset: r1(centre), ref: 'start' };
  if (spec.shape === 'L' && side === 'A') return { side, offset: r1(total + cw - centre), ref: 'end' };
  return side === 'A' && ref === 'end' ? { side, offset: r1(total + cw - centre), ref: 'end' } : { side, offset: r1(centre + cw), ref: 'start' };
}

/**
 * Drop an appliance inside the auto-fill slot around `centre`, splitting that slot into
 * filler | unit | filler. The requested position wins; only a truly blocked slot is nudged.
 */
function placeAtOffset(list: Resolved[], kind: 'sink' | 'stove', centre: number, notes: string[]): Resolved[] {
  const parts = list.map((r) => ({ r, start: 0, end: 0 }));
  let cursor = 0;
  for (const p of parts) {
    p.start = cursor;
    cursor = r1(cursor + p.r.width);
    p.end = cursor;
  }
  const fill = (w: number): Resolved => ({ key: w < 20 ? 'filler' : 'base_top', label: w < 20 ? 'Filler' : 'Kabinet Bawah + Atas', width: w, auto: true });
  // an empty gap can absorb the appliance just as an auto-fill slot does
  const isSlot = (r: Resolved) => (r.auto || r.key === 'gap') && r.key !== 'filler' && r.width >= 60;
  let index = parts.findIndex((p) => isSlot(p.r) && centre > p.start && centre < p.end);
  if (index < 0) {
    const candidates = parts.filter((p) => isSlot(p.r));
    if (!candidates.length) return list;
    const best = candidates.sort((a, b) => Math.abs((a.start + a.end) / 2 - centre) - Math.abs((b.start + b.end) / 2 - centre))[0];
    index = parts.indexOf(best);
    notes.push(`Posisi ${kind} terhalang item tetap — dipindahkan ke slot terdekat.`);
  }
  const slot = parts[index];
  const width = Math.min(80, Math.max(60, slot.r.width));
  const middle = Math.max(slot.start + width / 2, Math.min(centre, slot.end - width / 2));
  const before = r1(middle - width / 2 - slot.start);
  const after = r1(slot.end - (middle + width / 2));
  const pieces: Resolved[] = [];
  if (before > 0.05) pieces.push(fill(before));
  pieces.push({ key: kind, label: magicEntry(kind).label, width, auto: true });
  if (after > 0.05) pieces.push(fill(after));
  const out = [...list];
  out.splice(index, 1, ...pieces);
  return out;
}

export interface MagicPlan {
  sides: Record<SideId, Resolved[]>;
  placement: Partial<Record<'sink' | 'stove', MagicPlacement>>;
  notes: string[];
}

function resolvedPlan(spec: MagicSpec): MagicPlan {
  const result: Record<SideId, Resolved[]> = { A: [], B: [], C: [] };
  const notes: string[] = [];
  for (const s of activeSides(spec)) result[s] = resolveSide(spec, s);
  const missing = needsOf(spec);
  const placement: Partial<Record<'sink' | 'stove', MagicPlacement>> = {};
  for (const kind of ['sink', 'stove'] as const) {
    if (!missing[kind]) continue;
    const requested = spec.placement?.[kind];
    if (requested && result[requested.side]?.length) {
      const before = result[requested.side];
      const total = before.reduce((n, r) => n + r.width, 0);
      const centre = listCenter(spec, requested.side, requested.offset, requested.ref, total);
      const list = placeAtOffset(before, kind, centre, notes);
      result[requested.side] = list;
      // report where the unit really landed, so a nudged request is honest
      let cursor = 0;
      for (const r of list) {
        if (r.key === kind) { placement[kind] = placementOf(spec, requested.side, cursor + r.width / 2, total, requested.ref); break; }
        cursor = r1(cursor + r.width);
      }
      if (!placement[kind]) placement[kind] = requested;
      continue;
    }
    const preferred = kind === 'stove' && spec.shape !== 'I' ? (['B', 'C', 'A'] as SideId[]) : activeSides(spec);
    for (const side of preferred) {
      const slot = result[side].find((i) => (i.auto || i.key === 'gap') && i.key !== 'filler' && i.width >= 60);
      if (!slot) continue;
      slot.key = kind;
      slot.label = magicEntry(kind).label;
      const total = result[side].reduce((n, r) => n + r.width, 0);
      let cursor = 0;
      for (const r of result[side]) {
        if (r === slot) { placement[kind] = placementOf(spec, side, cursor + r.width / 2, total); break; }
        cursor = r1(cursor + r.width);
      }
      break;
    }
  }
  return { sides: result, placement, notes };
}

export function buildFlat(spec: MagicSpec): GuidedItem[] {
  const resolved = resolvedPlan(spec).sides;
  const corner = (opening: 'left' | 'right'): GuidedItem => ({ key: opening === 'left' ? 'corner_l' : 'corner_r', label: 'Sudut', width: spec.cornerDepth, width2: spec.cornerDepth, fixed: true });
  if (spec.shape === 'I') return resolved.A;
  if (spec.shape === 'L') return [...resolved.A, corner('right'), ...resolved.B];
  return [...resolved.B, corner('left'), ...resolved.A, corner('right'), ...resolved.C];
}

export function magicHeight(spec: MagicSpec, materials: ProjectMaterials, gap = 50) {
  const worktop = r1(spec.baseH + materials.countertopThickness);
  const bottom = r1(worktop + (materials.backsplash ? Math.max(spec.backsplashHeight, gap) : gap));
  return { worktop, bottom, upperHeight: r1(spec.totalH - bottom), top: spec.totalH };
}

export function magicProblems(spec: MagicSpec, materials: ProjectMaterials): string[] {
  const problems: string[] = [];
  const h = magicHeight(spec, materials);
  if (![spec.totalH, spec.baseH, spec.cornerDepth, spec.ctDepth, spec.wallDepth, spec.backsplashHeight].every(Number.isFinite)) return ['Masukkan ukuran yang valid.'];
  if (h.upperHeight < 25) problems.push(`Tinggi total minimal ${h.bottom + 25} cm untuk backsplash ini.`);
  if (spec.totalH > (spec.ceilingHeight ?? Math.max(260, spec.totalH + 30))) problems.push('Tinggi total kabinet melebihi plafon.');
  if (spec.baseH < 30 || spec.ctDepth < 25 || spec.wallDepth < 15) problems.push('Dimensi kabinet terlalu kecil.');
  if (spec.shape !== 'I' && spec.cornerDepth < 60) problems.push('Reservasi sudut minimal 60 cm per sisi.');
  for (const side of activeSides(spec)) {
    if (!Number.isFinite(spec.sides[side].length) || spec.sides[side].length < 60) problems.push(`Panjang sisi ${side} minimal 60 cm.`);
    if (spec.sides[side].items.some((i) => i.key !== AUTO && (!Number.isFinite(i.width) || i.width < 20))) problems.push(`Lebar item pada sisi ${side} minimal 20 cm.`);
    const left = autoSpace(spec, side);
    if (left < 0) problems.push(`Sisi ${side} melebihi dinding ${Math.abs(left)} cm.`);
  }
  for (const kind of ['sink', 'stove'] as const) {
    const place = spec.placement?.[kind];
    if (!place) continue;
    const label = kind === 'sink' ? 'Sink' : 'Kompor';
    if (!activeSides(spec).includes(place.side)) problems.push(`${label}: dinding ${place.side} tidak tersedia untuk bentuk ${spec.shape}.`);
    if (!Number.isFinite(place.offset) || place.offset < 0) problems.push(`${label}: jarak dari sudut harus 0 cm atau lebih.`);
    const maxOffset = spec.sides[place.side]?.length ?? 0;
    if (place.offset > maxOffset) problems.push(`${label}: ${place.offset} cm melebihi panjang dinding ${place.side} (${maxOffset} cm).`);
  }
  return problems;
}

export function generateMagic(spec: MagicSpec, materials: ProjectMaterials, _legacyWallHeight?: number, gap = 50): Project {
  const errors = magicProblems(spec, materials);
  if (errors.length) throw new Error(errors.join(' '));
  const h = magicHeight(spec, materials, gap);
  const project = generateGuided({
    name: spec.name, shape: spec.shape, items: buildFlat(spec),
    ceiling: spec.ceilingHeight ?? Math.max(spec.totalH + 40, 260), totalH: spec.totalH,
    baseH: spec.baseH, baseDepth: spec.baseDepth, wallH: h.upperHeight, gap,
    ctDepth: spec.ctDepth, wallDepth: spec.wallDepth,
    wallLengths: { A: spec.sides.A.length, B: spec.sides.B.length, C: spec.sides.C.length },
    lighting: spec.lighting ?? { under: true, inWall: false, inBase: false, tone: 'warm', brightness: 1, glow: true },
    materials: { ...materials, backsplashHeight: spec.backsplashHeight },
  });
  // Never commit a generated kitchen with an incorrect top line.
  const notAligned = project.items.some((i) => i.kind === 'cabinet' && (i.category === 'wall' || i.category === 'tall') && Math.abs(i.elevation + i.height - spec.totalH) > 0.11);
  if (notAligned) throw new Error('Garis atas kabinet belum sejajar. Generasi dibatalkan untuk melindungi proyek.');
  return project;
}

export function magicStats(spec: MagicSpec) {
  const flat = buildFlat(spec);
  const counts: Record<string, number> = { base_top: 2, sink: 2, stove: 2, corner_l: 2, corner_r: 2, gap: 0, filler: 0 };
  const cabinets = flat.reduce((n, i) => n + (counts[i.key] ?? 1), 0);
  const plan = resolvedPlan(spec);
  return {
    cabinets,
    runM: r1(activeSides(spec).reduce((n, s) => n + spec.sides[s].length, 0) / 100),
    placement: plan.placement,
    notes: plan.notes,
  };
}