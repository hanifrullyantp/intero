import type { Footprint, Item, Project, Wall } from '../models/types';
import { footprint, offsetOnWall, distanceToWall, wallLength, wallDir, r1 } from '../utils/geometry';

export interface DimLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  level: number; // 0 chain, 1 overall
  itemId?: string;
}

/** Items belonging to a wall (base-level items touching the wall) */
export function itemsOnWall(items: Item[], wall: Wall, category?: 'base' | 'wall' | 'tall'): Item[] {
  const L = wallLength(wall);
  return items
    .filter((i) => {
      if (i.kind === 'appliance' && i.subtype.startsWith('app_fridge') === false && i.subtype.startsWith('app_dishwasher') === false) return false;
      if (category && !(i.category === category || (category === 'base' && (i.category === 'tall' || i.kind === 'appliance')))) return false;
      const f = footprint(i);
      const d = distanceToWall(wall, f);
      const t = offsetOnWall(wall, f);
      return d > -1 && d < 8 && t > -L * 0.01 - 1 && t + Math.min(f.w, f.h) <= L + 1;
    })
    .sort((a, b) => offsetOnWall(wall, footprint(a)) - offsetOnWall(wall, footprint(b)));
}

/** Chain + overall dimensions for all walls (plan view). Offsets are outside the room. */
export function planDimensions(project: Project): DimLine[] {
  const lines: DimLine[] = [];
  for (const wall of project.room.walls) {
    const L = wallLength(wall);
    const dir = wallDir(wall);
    const off1 = 28;
    const off2 = 48;
    const base = itemsOnWall(project.items, wall, 'base').filter((i) => i.category !== 'wall');
    const pt = (t: number, off: number) => ({
      x: wall.x1 + dir.x * t - wall.nx * off,
      y: wall.y1 + dir.y * t - wall.ny * off,
    });
    // chain
    const segs: { t0: number; t1: number; id?: string }[] = [];
    let cursor = 0;
    for (const it of base) {
      const f = footprint(it);
      const t0 = Math.max(0, offsetOnWall(wall, f));
      const w = wall.rotation % 180 === 0 ? f.w : f.h;
      const t1 = Math.min(L, t0 + w);
      if (t0 - cursor > 0.5) segs.push({ t0: cursor, t1: t0 });
      segs.push({ t0, t1, id: it.id });
      cursor = Math.max(cursor, t1);
    }
    if (L - cursor > 0.5 && base.length) segs.push({ t0: cursor, t1: L });
    for (const s of segs) {
      const a = pt(s.t0, off1);
      const b = pt(s.t1, off1);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, label: r1(s.t1 - s.t0).toString(), level: 0, itemId: s.id });
    }
    const a = pt(0, off2);
    const b = pt(L, off2);
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, label: r1(L).toString(), level: 1 });
  }
  return lines;
}

/** Dimensions for an elevation (front view) of a wall: x = offset along wall, y = height */
export function elevationDimensions(project: Project, wall: Wall): { horizontal: DimLine[]; vertical: DimLine[] } {
  const horizontal: DimLine[] = [];
  const vertical: DimLine[] = [];
  const L = wallLength(wall);
  const onWall = itemsOnWall(project.items, wall);
  const rows: Array<'base' | 'wall'> = ['base', 'wall'];
  rows.forEach((cat, idx) => {
    const list = onWall.filter((i) => (cat === 'base' ? i.category !== 'wall' : i.category === 'wall'));
    let cursor = 0;
    const y = -12 - idx * 14;
    for (const it of list) {
      const f = footprint(it);
      const t0 = Math.max(0, offsetOnWall(wall, f));
      const w = wall.rotation % 180 === 0 ? f.w : f.h;
      if (t0 - cursor > 0.5) horizontal.push({ x1: cursor, y1: y, x2: t0, y2: y, label: r1(t0 - cursor).toString(), level: 0 });
      horizontal.push({ x1: t0, y1: y, x2: t0 + w, y2: y, label: r1(w).toString(), level: 0, itemId: it.id });
      cursor = Math.max(cursor, t0 + w);
    }
  });
  horizontal.push({ x1: 0, y1: -42, x2: L, y2: -42, label: r1(L).toString(), level: 1 });
  // vertical: heights of unique levels
  const levels = new Set<number>([0]);
  for (const it of onWall) {
    levels.add(r1(it.elevation));
    levels.add(r1(it.elevation + it.height));
  }
  levels.add(project.room.ceilingHeight);
  const sortedLevels = [...levels].sort((a, b) => a - b);
  for (let i = 1; i < sortedLevels.length; i++) {
    const a = sortedLevels[i - 1];
    const b = sortedLevels[i];
    if (b - a < 0.5) continue;
    vertical.push({ x1: L + 15, y1: a, x2: L + 15, y2: b, label: r1(b - a).toString(), level: 0 });
  }
  vertical.push({ x1: L + 32, y1: 0, x2: L + 32, y2: project.room.ceilingHeight, label: project.room.ceilingHeight.toString(), level: 1 });
  return { horizontal, vertical };
}

export function totalFootprintBounds(items: Item[]): Footprint {
  if (!items.length) return { x: 0, y: 0, w: 100, h: 100 };
  const fs = items.map(footprint);
  const x = Math.min(...fs.map((f) => f.x));
  const y = Math.min(...fs.map((f) => f.y));
  const x2 = Math.max(...fs.map((f) => f.x + f.w));
  const y2 = Math.max(...fs.map((f) => f.y + f.h));
  return { x, y, w: x2 - x, h: y2 - y };
}
