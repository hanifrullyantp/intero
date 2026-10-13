import type { Countertop, Item, Project } from '../models/types';
import { footprint, r1, isCornerItem, localRectToPlan } from '../utils/geometry';
import { KITCHEN_STANDARDS } from '../config/standards';
import { baseRunDepth } from './kitchenRules';

const OH = KITCHEN_STANDARDS.base_cabinet.countertop_overhang_front;
const BS_T = 1.2; // backsplash thickness (cm)

/** merge coplanar slabs on the same wall line whose along-run intervals touch/overlap → one flat slab */
function mergeSlabs(slabs: Countertop[]): Countertop[] {
  const out = [...slabs];
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        if (a.rotation !== b.rotation || Math.abs(a.elevation - b.elevation) > 0.5) continue;
        const horiz = a.rotation % 180 === 0;
        const sameBack = horiz ? Math.abs(a.y - b.y) < 1 && Math.abs(a.h - b.h) < 1 : Math.abs(a.x - b.x) < 1 && Math.abs(a.w - b.w) < 1;
        if (!sameBack) continue;
        const [a0, a1, b0, b1] = horiz ? [a.x, a.x + a.w, b.x, b.x + b.w] : [a.y, a.y + a.h, b.y, b.y + b.h];
        if (b0 > a1 + 0.5 || a0 > b1 + 0.5) continue;
        const lo = Math.min(a0, b0);
        const hi = Math.max(a1, b1);
        const m: Countertop = { ...a };
        if (horiz) { m.x = r1(lo); m.w = r1(hi - lo); } else { m.y = r1(lo); m.h = r1(hi - lo); }
        out.splice(j, 1);
        out[i] = m;
        changed = true;
        break outer;
      }
    }
  }
  return out;
}

/**
 * FLAT countertop (default): one depth along the whole run, following the outer wall.
 * Corner arms add their perpendicular slab at the same depth, then coplanar slabs are merged.
 */
export function computeCountertops(project: Project): Countertop[] {
  if (project.type === 'wardrobe' || project.type === 'bookshelf') return [];
  const bases = project.items.filter(
    (i) => i.kind === 'cabinet' && i.category === 'base' && i.subtype !== 'tv_console' && i.visible !== false && project.type !== 'tv',
  );
  if (!bases.length) return [];
  if ((project.settings.countertopMode ?? 'flat') === 'shape') return computeLegacy(project, bases);

  const slabs: Countertop[] = [];
  const thickness = project.materials.countertopThickness;
  const fixedDepth = project.settings.countertopDepth ?? baseRunDepth(project.items);
  const used = new Set<string>();
  const horizontal = (i: Item) => i.rotation % 180 === 0;
  const sorted = [...bases].sort((a, b) => (horizontal(a) ? a.x - b.x : a.y - b.y));

  const groups: Item[][] = [];
  for (const it of sorted) {
    if (used.has(it.id)) continue;
    const group = [it];
    used.add(it.id);
    const f = footprint(it);
    let end = horizontal(it) ? f.x + f.w : f.y + f.h;
    const back = it.rotation === 0 ? f.y : it.rotation === 180 ? f.y + f.h : it.rotation === 270 ? f.x : f.x + f.w;
    for (const other of sorted) {
      if (used.has(other.id) || other.rotation !== it.rotation) continue;
      const g = footprint(other);
      const oBack = other.rotation === 0 ? g.y : other.rotation === 180 ? g.y + g.h : other.rotation === 270 ? g.x : g.x + g.w;
      if (Math.abs(oBack - back) > 4) continue;
      const start = horizontal(other) ? g.x : g.y;
      const tol = isCornerItem(it) || isCornerItem(other) ? 12 : 3;
      if (start <= end + tol) {
        group.push(other);
        used.add(other.id);
        end = Math.max(end, horizontal(other) ? g.x + g.w : g.y + g.h);
      }
    }
    groups.push(group);
  }

  for (const g of groups) {
    const rot = g[0].rotation;
    const top = Math.max(...g.map((i) => i.elevation + i.height));
    const fs = g.map(footprint);
    const depth = fixedDepth + OH;
    if (rot === 0 || rot === 180) {
      const minX = Math.min(...fs.map((f) => f.x));
      const maxX = Math.max(...fs.map((f) => f.x + f.w));
      const backs = g.filter((i) => !isCornerItem(i)).map((i) => { const f = footprint(i); return rot === 0 ? f.y : f.y + f.h; });
      const backLine = backs.length ? (rot === 0 ? Math.min(...backs) : Math.max(...backs)) : rot === 0 ? Math.min(...fs.map((f) => f.y)) : Math.max(...fs.map((f) => f.y + f.h));
      const y = rot === 0 ? backLine : backLine - depth;
      slabs.push({ id: 'ct_' + g[0].id, x: r1(minX), y: r1(y), w: r1(maxX - minX), h: r1(depth), elevation: top, thickness, rotation: rot, wallId: g[0].wallId });
    } else {
      const minY = Math.min(...fs.map((f) => f.y));
      const maxY = Math.max(...fs.map((f) => f.y + f.h));
      const backs = g.filter((i) => !isCornerItem(i)).map((i) => { const f = footprint(i); return rot === 270 ? f.x : f.x + f.w; });
      const backLine = backs.length ? (rot === 270 ? Math.min(...backs) : Math.max(...backs)) : rot === 270 ? Math.min(...fs.map((f) => f.x)) : Math.max(...fs.map((f) => f.x + f.w));
      const x = rot === 270 ? backLine : backLine - depth;
      slabs.push({ id: 'ct_' + g[0].id, x: r1(x), y: r1(minY), w: r1(depth), h: r1(maxY - minY), elevation: top, thickness, rotation: rot, wallId: g[0].wallId });
    }
  }

  // corner arm B: perpendicular slab, same flat depth, in the corner's local frame
  for (const it of bases) {
    if (!isCornerItem(it)) continue;
    const dep = fixedDepth + OH;
    if (it.depth - dep < 0.5) continue;
    const left = it.config.opening !== 'right';
    const r = localRectToPlan(it, left ? 0 : it.width - dep, left ? dep : it.width, dep, it.depth);
    const perpRot = ((it.rotation + (left ? 270 : 90)) % 360) as Countertop['rotation'];
    slabs.push({ id: 'ctb_' + it.id, x: r.x, y: r.y, w: r.w, h: r.h, elevation: it.elevation + it.height, thickness, rotation: perpRot, wallId: it.wallId });
  }
  return mergeSlabs(slabs);
}

export interface Backsplash { x: number; y: number; w: number; h: number; elevation: number }

/**
 * Backsplash strips, computed per base cabinet instead of per countertop slab (so merging can't drop them):
 *  - straight cabinet  → strip along its wall (back) edge
 *  - corner            → strip along arm A's back edge AND along arm B's outer side → 2 walls, 90°
 */
export function computeBacksplashes(project: Project): Backsplash[] {
  const m = project.materials;
  if (!m.backsplash || project.type !== 'kitchen') return [];
  const t = m.countertopThickness;
  const out: Backsplash[] = [];
  for (const it of project.items) {
    if (it.kind !== 'cabinet' || it.category !== 'base' || it.visible === false || it.subtype === 'tv_console') continue;
    const elevation = it.elevation + it.height + t;
    if (isCornerItem(it)) {
      const left = it.config.opening !== 'right';
      out.push({ ...localRectToPlan(it, 0, it.width, 0, BS_T), elevation });
      out.push({ ...localRectToPlan(it, left ? 0 : it.width - BS_T, left ? BS_T : it.width, 0, it.depth), elevation });
      continue;
    }
    const f = footprint(it);
    const r = it.rotation === 0 ? { x: f.x, y: f.y, w: f.w, h: BS_T }
      : it.rotation === 180 ? { x: f.x, y: f.y + f.h - BS_T, w: f.w, h: BS_T }
      : it.rotation === 90 ? { x: f.x + f.w - BS_T, y: f.y, w: BS_T, h: f.h }
      : { x: f.x, y: f.y, w: BS_T, h: f.h };
    out.push({ ...r, elevation });
  }
  return out;
}

/** legacy shape-following generator (kept for the unusual "follow shape" option) */
function computeLegacy(project: Project, bases: Item[]): Countertop[] {
  const slabs: Countertop[] = [];
  const thickness = project.materials.countertopThickness;
  const used = new Set<string>();
  const groups: Item[][] = [];
  const horizontal = (i: Item) => i.rotation % 180 === 0;
  const sorted = [...bases].sort((a, b) => (horizontal(a) ? a.x - b.x : a.y - b.y));
  for (const it of sorted) {
    if (used.has(it.id)) continue;
    const group = [it];
    used.add(it.id);
    const f = footprint(it);
    let end = horizontal(it) ? f.x + f.w : f.y + f.h;
    const back = it.rotation === 0 ? f.y : it.rotation === 180 ? f.y + f.h : it.rotation === 270 ? f.x : f.x + f.w;
    for (const other of sorted) {
      if (used.has(other.id) || other.rotation !== it.rotation) continue;
      const g = footprint(other);
      const oBack = other.rotation === 0 ? g.y : other.rotation === 180 ? g.y + g.h : other.rotation === 270 ? g.x : g.x + g.w;
      if (Math.abs(oBack - back) > 2) continue;
      const start = horizontal(other) ? g.x : g.y;
      if (start <= end + 3) {
        group.push(other);
        used.add(other.id);
        end = Math.max(end, horizontal(other) ? g.x + g.w : g.y + g.h);
      }
    }
    groups.push(group);
  }
  for (const g of groups) {
    const fs = g.map(footprint);
    const minX = Math.min(...fs.map((f) => f.x));
    const maxX = Math.max(...fs.map((f) => f.x + f.w));
    const minY = Math.min(...fs.map((f) => f.y));
    const maxY = Math.max(...fs.map((f) => f.y + f.h));
    const rot = g[0].rotation;
    const top = Math.max(...g.map((i) => i.elevation + i.height));
    let slab: Countertop;
    if (rot === 0) slab = { id: 'ct_' + g[0].id, x: minX, y: minY, w: maxX - minX, h: maxY - minY + OH, elevation: top, thickness, rotation: rot };
    else if (rot === 180) slab = { id: 'ct_' + g[0].id, x: minX, y: minY - OH, w: maxX - minX, h: maxY - minY + OH, elevation: top, thickness, rotation: rot };
    else if (rot === 270) slab = { id: 'ct_' + g[0].id, x: minX, y: minY, w: maxX - minX + OH, h: maxY - minY, elevation: top, thickness, rotation: rot };
    else slab = { id: 'ct_' + g[0].id, x: minX - OH, y: minY, w: maxX - minX + OH, h: maxY - minY, elevation: top, thickness, rotation: rot };
    slab.x = r1(slab.x); slab.y = r1(slab.y); slab.w = r1(slab.w); slab.h = r1(slab.h);
    slabs.push(slab);
  }
  return slabs;
}

export function countertopAreaM2(slabs: Countertop[]) {
  return slabs.reduce((s, c) => s + (c.w * c.h) / 10000, 0);
}

/** validation: flat mode may not exceed the fixed run depth */
export function validateCountertopDepth(project: Project): string[] {
  if ((project.settings.countertopMode ?? 'flat') !== 'flat') return [];
  const fixed = project.settings.countertopDepth ?? baseRunDepth(project.items);
  const errs: string[] = [];
  for (const s of computeCountertops(project)) {
    const d = s.rotation % 180 === 0 ? s.h - OH : s.w - OH;
    if (d > fixed + 0.5) errs.push(`Countertop slab exceeds fixed depth ${fixed}cm (got ${d.toFixed(1)}cm)`);
  }
  return errs;
}
