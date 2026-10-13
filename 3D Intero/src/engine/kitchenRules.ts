import type { Item, ProjectMaterials } from '../models/types';
import { footprint, overlapArea } from '../utils/geometry';
import { uid } from '../config/library';

const r1 = (v: number) => Math.round(v * 10) / 10;

/** plan coordinate of the item's back (wall) edge, along its depth axis */
export function backLine(i: Item): number {
  const f = footprint(i);
  return i.rotation === 0 ? f.y : i.rotation === 180 ? f.y + f.h : i.rotation === 270 ? f.x : f.x + f.w;
}

/** centre of the item along its run (the wall direction) */
function alongCentre(i: Item): number {
  const f = footprint(i);
  return i.rotation % 180 === 0 ? f.x + f.w / 2 : f.y + f.h / 2;
}

/** overlap of two items along the run axis (cm), assuming the same rotation */
function alongOverlap(a: Item, b: Item): number {
  const fa = footprint(a);
  const fb = footprint(b);
  const [a0, a1, b0, b1] = a.rotation % 180 === 0 ? [fa.x, fa.x + fa.w, fb.x, fb.x + fb.w] : [fa.y, fa.y + fa.h, fb.y, fb.y + fb.h];
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

const isUpper = (i: Item) => i.kind === 'cabinet' && i.category === 'wall' && i.visible !== false;
const stacked = (lower: Item, upper: Item) =>
  overlapArea(footprint(lower), footprint(upper)) > 4 && Math.abs(upper.elevation - (lower.elevation + lower.height)) < 2;

/** true when no upper cabinet sits directly on top of this one */
export function isTopTier(it: Item, items: Item[]): boolean {
  return !items.some((o) => o.id !== it.id && (isUpper(o) || (o.kind === 'cabinet' && o.category === 'tall')) && stacked(it, o));
}

/** true when this upper cabinet does not sit on another upper cabinet (its underside faces the worktop) */
export function isLowerTier(it: Item, items: Item[]): boolean {
  return !items.some((o) => o.id !== it.id && isUpper(o) && stacked(o, it));
}

/**
 * Build the second-tier cabinet that sits directly on top of `it`.
 * Flip-up door by default (reachable from below). Corners keep their L configuration.
 * Returns null when there is less than 20 cm to the ceiling (minus the cornice).
 */
export function stackAbove(it: Item, ceiling: number, crown = 0, height = 45): Item | null {
  const top = it.elevation + it.height;
  const room = ceiling - top - crown - 1;
  const h = r1(Math.min(height, room));
  if (h < 20) return null;
  const isCorner = it.subtype.includes('corner');
  return {
    ...JSON.parse(JSON.stringify(it)),
    id: uid(),
    name: `${it.name} (susun atas)`,
    elevation: r1(top),
    height: h,
    openAmount: 0,
    config: {
      ...JSON.parse(JSON.stringify(it.config)),
      ...(isCorner ? {} : { opening: 'flip_up' as const, doors: 1 }),
      shelves: 1,
      drawers: 0,
      stackParentId: it.id,
    },
  };
}

/**
 * Automatic kitchen relationships, applied after every edit:
 *   • cooker hood (hoodAuto ≠ false): bottom flush with the upper-cabinet bottoms on the same wall
 *   • hood housing ("wall_hood") above it: from the hood top up to the top of the upper-cabinet line
 *     (includes a second tier), same width / run position as the hood
 */
export function autoKitchen(items: Item[], m: Pick<ProjectMaterials, 'backsplash' | 'backsplashHeight' | 'countertopThickness'>, cabinetTop?: number): Item[] {
  const hoods = items.filter((i) => i.kind === 'appliance' && i.subtype.startsWith('app_hood') && i.config.hoodAuto !== false && i.visible !== false);
  if (!hoods.length) return items;
  const patches = new Map<string, Partial<Item>>();
  for (const h of hoods) {
    const back = backLine(h);
    const line = items.filter((i) => isUpper(i) && i.subtype !== 'wall_hood' && i.rotation === h.rotation && Math.abs(backLine(i) - back) < 6);
    let bottom: number;
    let top: number;
    if (line.length) {
      const lower = line.filter((i) => isLowerTier(i, items));
      const pool = lower.length ? lower : line;
      const hc = alongCentre(h);
      const nearest = pool.reduce((a, b) => (Math.abs(alongCentre(a) - hc) <= Math.abs(alongCentre(b) - hc) ? a : b));
      bottom = nearest.elevation;
      top = cabinetTop ?? Math.max(...line.map((i) => i.elevation + i.height));
    } else {
      bottom = wallBottomFor(items, m);
      top = cabinetTop ?? bottom + 70;
    }
    if (Math.abs(h.elevation - bottom) > 0.05) patches.set(h.id, { elevation: r1(bottom) });
    const hoodTop = bottom + h.height;
    const housings = items.filter((i) => i.subtype === 'wall_hood' && (
      i.config.applianceHostId === h.id ||
      (i.rotation === h.rotation && Math.abs(backLine(i) - back) < 6 && alongOverlap(i, h) > 0.5 * Math.min(i.width, h.width))
    ));
    for (const hs of housings) {
      const height = r1(top - hoodTop);
      if (height < 5) continue;
      const p: Partial<Item> = {};
      if (Math.abs(hs.elevation - hoodTop) > 0.05) p.elevation = r1(hoodTop);
      if (Math.abs(hs.height - height) > 0.05) p.height = height;
      if (Math.abs(hs.width - h.width) > 0.05) p.width = h.width;
      if (h.rotation % 180 === 0) { if (Math.abs(hs.x - h.x) > 0.05) p.x = h.x; } else if (Math.abs(hs.y - h.y) > 0.05) p.y = h.y;
      if (Object.keys(p).length) patches.set(hs.id, p);
    }
  }
  if (!patches.size) return items;
  return items.map((i) => (patches.has(i.id) ? { ...i, ...patches.get(i.id)! } : i));
}

/** gap between worktop and wall-cabinet bottom when there is no backsplash */
export const WALL_GAP = 50;
export const DEFAULT_BASE_DEPTH = 55;

export const isCornerItem = (i: Item) => i.kind === 'cabinet' && i.category === 'base' && i.subtype.includes('corner');
export const isBaseRun = (i: Item) =>
  i.kind === 'cabinet' && i.category === 'base' && i.visible !== false && !i.subtype.startsWith('tv') && !i.subtype.includes('corner');

/**
 * The depth every base run AND every corner arm must share (= countertop depth).
 * Most common depth of the straight base cabinets; falls back to the factory default.
 */
export function baseRunDepth(items: Item[]): number {
  const depths = items.filter(isBaseRun).map((i) => Math.round(i.depth));
  if (!depths.length) return DEFAULT_BASE_DEPTH;
  const counts = new Map<number, number>();
  for (const d of depths) counts.set(d, (counts.get(d) ?? 0) + 1);
  let best = depths[0];
  let n = 0;
  for (const [d, c] of counts) if (c > n) { n = c; best = d; }
  return best;
}

/** corners adopt the run depth so their front is flush with the neighbouring cabinets */
export function syncCornerDepths(items: Item[]): Item[] {
  const depth = baseRunDepth(items);
  return items.map((i) => (isCornerItem(i) ? { ...i, config: { ...i.config, cornerDepth: depth } } : i));
}

/** top of the straight base cabinets (carcass top, before the worktop) */
export function baseTopOf(items: Item[]): number {
  const tops = items.filter((i) => i.kind === 'cabinet' && i.category === 'base' && i.visible !== false).map((i) => i.elevation + i.height);
  return tops.length ? Math.max(...tops) : 85;
}

/**
 * Wall-cabinet bottom height. The wall cabinets sit on top of the backsplash:
 * worktop + max(backsplash height, WALL_GAP) when the backsplash is on, else worktop + WALL_GAP.
 * Changing the backsplash height therefore moves the wall cabinets by the same amount.
 */
export function wallBottomFor(items: Item[], m: Pick<ProjectMaterials, 'backsplash' | 'backsplashHeight' | 'countertopThickness'>, gap = WALL_GAP): number {
  const worktop = baseTopOf(items) + m.countertopThickness;
  const above = m.backsplash ? Math.max(m.backsplashHeight, gap) : gap;
  return Math.round((worktop + above) * 10) / 10;
}
