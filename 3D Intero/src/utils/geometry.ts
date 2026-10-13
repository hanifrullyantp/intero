import type { Footprint, Item, Rotation, Wall } from '../models/types';

export const r1 = (v: number) => Math.round(v * 10) / 10;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function footprint(item: Item): Footprint {
  const flip = item.rotation % 180 !== 0;
  return { x: item.x, y: item.y, w: flip ? item.depth : item.width, h: flip ? item.width : item.depth };
}

export function rectsOverlap(a: Footprint, b: Footprint, tolerance = 0.05): boolean {
  return a.x < b.x + b.w - tolerance && a.x + a.w > b.x + tolerance && a.y < b.y + b.h - tolerance && a.y + a.h > b.y + tolerance;
}

export function overlapArea(a: Footprint, b: Footprint): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export function verticalOverlap(a: Item, b: Item): boolean {
  return a.elevation < b.elevation + b.height - 0.05 && a.elevation + a.height > b.elevation + 0.05;
}

export function center(f: Footprint) {
  return { x: f.x + f.w / 2, y: f.y + f.h / 2 };
}

export function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

export function pointInRect(px: number, py: number, f: Footprint) {
  return px >= f.x && px <= f.x + f.w && py >= f.y && py <= f.y + f.h;
}

/** Direction the front of the item faces, in plan coordinates */
export function frontDir(rotation: Rotation): { x: number; y: number } {
  switch (rotation) {
    case 0:
      return { x: 0, y: 1 };
    case 90:
      return { x: -1, y: 0 };
    case 180:
      return { x: 0, y: -1 };
    default:
      return { x: 1, y: 0 };
  }
}

/** Unit vector along the item's width (left → right as seen from front) */
export function alongDir(rotation: Rotation): { x: number; y: number } {
  switch (rotation) {
    case 0:
      return { x: 1, y: 0 };
    case 90:
      return { x: 0, y: 1 };
    case 180:
      return { x: -1, y: 0 };
    default:
      return { x: 0, y: -1 };
  }
}

export function wallLength(w: Wall) {
  return Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
}

export function wallDir(w: Wall) {
  const L = wallLength(w) || 1;
  return { x: (w.x2 - w.x1) / L, y: (w.y2 - w.y1) / L };
}

/** Compute footprint min-corner for an item of (width, depth) placed on a wall at offset t */
export function placeOnWall(wall: Wall, t: number, width: number, depth: number): { x: number; y: number; rotation: Rotation } {
  const d = wallDir(wall);
  const p0x = wall.x1 + d.x * t;
  const p0y = wall.y1 + d.y * t;
  const p1x = p0x + d.x * width;
  const p1y = p0y + d.y * width;
  const q0x = p0x + wall.nx * depth;
  const q0y = p0y + wall.ny * depth;
  const q1x = p1x + wall.nx * depth;
  const q1y = p1y + wall.ny * depth;
  return {
    x: r1(Math.min(p0x, p1x, q0x, q1x)),
    y: r1(Math.min(p0y, p1y, q0y, q1y)),
    rotation: wall.rotation,
  };
}

/** Offset along a wall of an item's footprint start */
export function offsetOnWall(wall: Wall, f: Footprint): number {
  const d = wallDir(wall);
  if (Math.abs(d.x) > 0.5) {
    return d.x > 0 ? f.x - wall.x1 : wall.x1 - (f.x + f.w);
  }
  return d.y > 0 ? f.y - wall.y1 : wall.y1 - (f.y + f.h);
}

export function distanceToWall(wall: Wall, f: Footprint): number {
  const d = wallDir(wall);
  if (Math.abs(d.x) > 0.5) {
    // horizontal wall at y = wall.y1
    return wall.ny > 0 ? f.y - wall.y1 : wall.y1 - (f.y + f.h);
  }
  return wall.nx > 0 ? f.x - wall.x1 : wall.x1 - (f.x + f.w);
}

export function nearestWall(walls: Wall[], f: Footprint): Wall | undefined {
  let best: Wall | undefined;
  let bestD = Infinity;
  for (const w of walls) {
    const dd = Math.abs(distanceToWall(w, f));
    const t = offsetOnWall(w, f);
    const L = wallLength(w);
    if (t + f.w < -20 || t > L + 20) continue;
    if (dd < bestD) {
      bestD = dd;
      best = w;
    }
  }
  return best;
}

export function isCornerItem(it: Item) {
  return it.subtype.includes('corner');
}

export function cornerArm(it: Item): number {
  const def = it.category === 'wall' ? 33 : 60;
  const v = it.config.cornerDepth ?? def;
  return Math.max(15, Math.min(v, it.width, it.depth));
}

/** Convert an item-local rectangle (x along front, z toward room) to a plan footprint */
export function localRectToPlan(it: Item, lx0: number, lx1: number, lz0: number, lz1: number): Footprint {
  const f = footprint(it);
  const a = alongDir(it.rotation);
  const fd = frontDir(it.rotation);
  const ox = it.rotation === 0 ? f.x : it.rotation === 90 ? f.x + f.w : it.rotation === 180 ? f.x + f.w : f.x;
  const oy = it.rotation === 0 ? f.y : it.rotation === 90 ? f.y : it.rotation === 180 ? f.y + f.h : f.y + f.h;
  const pts = [
    [lx0, lz0],
    [lx1, lz0],
    [lx0, lz1],
    [lx1, lz1],
  ].map(([lx, lz]) => [ox + a.x * lx + fd.x * lz, oy + a.y * lx + fd.y * lz]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: r1(Math.min(...xs)), y: r1(Math.min(...ys)), w: r1(Math.max(...xs) - Math.min(...xs)), h: r1(Math.max(...ys) - Math.min(...ys)) };
}

/** Plan-space rectangles actually occupied by an item (two rects for L-shaped corner cabinets) */
export function occupiedRects(it: Item): Footprint[] {
  const f = footprint(it);
  if (!isCornerItem(it)) return [f];
  const arm = cornerArm(it);
  const W = it.width;
  const D = it.depth;
  const left = it.config.opening !== 'right';
  return [localRectToPlan(it, 0, W, 0, arm), localRectToPlan(it, left ? 0 : W - arm, left ? arm : W, arm, D)];
}

export function itemsOverlapArea(a: Item, b: Item): number {
  let area = 0;
  for (const ra of occupiedRects(a)) for (const rb of occupiedRects(b)) area += overlapArea(ra, rb);
  return area;
}

export function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function fmt(n: number, digits = 1) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(digits);
}

export function formatIDR(n: number) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}
