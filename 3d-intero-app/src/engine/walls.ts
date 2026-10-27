// 3D Intero — Geometri dinding + Rearrange Engine (auto-reposition kabinet pada dinding)
import type { Item, KitchenShape, ProjectSettings, RowKind, V2, Wall } from '../types';
import { WALL_NAMES } from '../lib/constants';

export interface WallVec { dir: V2; normal: V2; length: number; angle: number }

export function wallVec(w: Wall): WallVec {
  const dx = w.end.x - w.start.x, dz = w.end.z - w.start.z;
  const length = Math.hypot(dx, dz) || 1;
  const dir = { x: dx / length, z: dz / length };
  const normal = { x: -dir.z, z: dir.x }; // arah ke dalam ruangan
  const angle = Math.atan2(-dir.z, dir.x);
  return { dir, normal, length, angle };
}

/** Posisi dunia untuk item di dinding: offset = jarak dari start dinding ke sisi kiri item. */
export function placeOnWall(wall: Wall, offset: number, w: number, d: number) {
  const v = wallVec(wall);
  const along = offset + w / 2;
  return {
    x: wall.start.x + v.dir.x * along + v.normal.x * (d / 2),
    z: wall.start.z + v.dir.z * along + v.normal.z * (d / 2),
    rotationY: (v.angle * 180) / Math.PI,
  };
}

/** Proyeksi titik ke sumbu dinding → offset dari start (ke tengah item). */
export function offsetOnWall(wall: Wall, x: number, z: number): number {
  const v = wallVec(wall);
  return (x - wall.start.x) * v.dir.x + (z - wall.start.z) * v.dir.z;
}
export function distanceToWall(wall: Wall, x: number, z: number): number {
  const v = wallVec(wall);
  return (x - wall.start.x) * v.normal.x + (z - wall.start.z) * v.normal.z;
}

export function nearestWall(walls: Wall[], x: number, z: number): Wall | null {
  let best: Wall | null = null, bestD = Infinity;
  for (const w of walls) {
    const v = wallVec(w);
    const t = Math.max(0, Math.min(v.length, offsetOnWall(w, x, z)));
    const px = w.start.x + v.dir.x * t, pz = w.start.z + v.dir.z * t;
    const d = Math.hypot(px - x, pz - z);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}

export function makeRoomWalls(shape: KitchenShape, lens: { left: number; back: number; right: number; front: number }): Wall[] {
  const L = lens.left, B = lens.back, R = lens.right, F = lens.front;
  const walls: Wall[] = [];
  if (shape === 'I') {
    walls.push({ id: 'back', name: WALL_NAMES.back, start: { x: 0, z: 0 }, end: { x: B, z: 0 } });
  } else if (shape === 'L') {
    walls.push({ id: 'left', name: WALL_NAMES.left, start: { x: 0, z: L }, end: { x: 0, z: 0 } });
    walls.push({ id: 'back', name: WALL_NAMES.back, start: { x: 0, z: 0 }, end: { x: B, z: 0 } });
  } else if (shape === 'U') {
    walls.push({ id: 'left', name: WALL_NAMES.left, start: { x: 0, z: L }, end: { x: 0, z: 0 } });
    walls.push({ id: 'back', name: WALL_NAMES.back, start: { x: 0, z: 0 }, end: { x: B, z: 0 } });
    walls.push({ id: 'right', name: WALL_NAMES.right, start: { x: B, z: 0 }, end: { x: B, z: R } });
  } else {
    const gap = Math.max(1200, F);
    walls.push({ id: 'back', name: WALL_NAMES.back, start: { x: 0, z: 0 }, end: { x: B, z: 0 } });
    walls.push({ id: 'front', name: WALL_NAMES.front, start: { x: B, z: gap }, end: { x: 0, z: gap } });
  }
  return walls;
}

export function roomBounds(walls: Wall[]) {
  if (!walls.length) return { minX: -1500, maxX: 1500, minZ: -1500, maxZ: 1500 };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const w of walls) for (const p of [w.start, w.end]) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  // Ruang minimal 3 m ke arah dalam
  const span = 3000;
  for (const w of walls) {
    const v = wallVec(w);
    for (const p of [w.start, w.end]) {
      const ix = p.x + v.normal.x * span, iz = p.z + v.normal.z * span;
      minX = Math.min(minX, ix); maxX = Math.max(maxX, ix); minZ = Math.min(minZ, iz); maxZ = Math.max(maxZ, iz);
    }
  }
  return { minX, maxX, minZ, maxZ };
}

export function roomCenter(walls: Wall[]) {
  const b = roomBounds(walls);
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
}

/** Junction: apakah titik start/end dinding bertemu dinding lain. */
export function wallJunctions(walls: Wall[], wall: Wall) {
  const near = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z) < 1;
  const atStart = walls.some((o) => o.id !== wall.id && near(o.end, wall.start));
  const atEnd = walls.some((o) => o.id !== wall.id && near(o.start, wall.end));
  return { atStart, atEnd };
}

// ─── Row & packing ───
export function rowOf(item: Item): RowKind {
  if (!item.wallId) return 'free';
  switch (item.type) {
    case 'wall': case 'corner_wall': case 'hood': return 'wall';
    case 'tall': case 'fridge': case 'electronic': return 'tall';
    case 'island': case 'bar': return 'free';
    default: return 'base';
  }
}

export function wallItemsSorted(items: Item[], wallId: string) {
  return items.filter((i) => i.wallId === wallId).sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Hitung ulang posisi semua item di satu dinding berdasarkan orderIndex (flush, tanpa gap). */
export function repackWall(items: Item[], wall: Wall, settings: ProjectSettings): Item[] {
  const list = wallItemsSorted(items, wall.id);
  if (!list.length) return items;
  let baseCursor = 0, wallCursor = 0;
  const updated = new Map<string, Item>();
  for (const it of list) {
    const row = rowOf(it);
    let start = 0;
    if (row === 'base') { start = baseCursor; baseCursor += it.dims.w; }
    else if (row === 'wall') { start = wallCursor; wallCursor += it.dims.w; }
    else { start = baseCursor; baseCursor += it.dims.w; wallCursor = Math.max(wallCursor, baseCursor); }
    const depth = it.type === 'corner_base' || it.type === 'corner_wall' ? it.dims.d : it.dims.d;
    const p = placeOnWall(wall, start, it.dims.w, depth);
    let y = it.position.y;
    if (row === 'wall') y = it.type === 'hood' || it.type === 'wall' || it.type === 'corner_wall' ? Math.max(y, 0) || settings.baseHeight + settings.wallGap : y;
    if (row === 'base' || row === 'tall') y = 0;
    const changed = Math.abs(p.x - it.position.x) > 0.01 || Math.abs(p.z - it.position.z) > 0.01 || Math.abs(p.rotationY - it.rotationY) > 0.01 || y !== it.position.y;
    if (changed) updated.set(it.id, { ...it, position: { x: p.x, y, z: p.z }, rotationY: p.rotationY });
  }
  if (!updated.size) return items;
  return items.map((i) => updated.get(i.id) ?? i);
}

export function repackAll(items: Item[], walls: Wall[], settings: ProjectSettings): Item[] {
  let out = items;
  for (const w of walls) out = repackWall(out, w, settings);
  return out;
}

/** Setelah drag bebas di viewport: urutkan ulang item di dinding berdasarkan posisi tengahnya. */
export function resortWallByPosition(items: Item[], wall: Wall): Item[] {
  const list = wallItemsSorted(items, wall.id);
  const keyed = list.map((it) => ({ it, off: offsetOnWall(wall, it.position.x, it.position.z) }));
  // Pertahankan parent-child: child mengikuti parent
  const parents = keyed.filter((k) => !k.it.config.parentId || !list.some((l) => l.id === k.it.config.parentId));
  parents.sort((a, b) => a.off - b.off);
  const order: Item[] = [];
  for (const p of parents) {
    order.push(p.it);
    for (const c of list) if (c.config.parentId === p.it.id) order.push(c);
  }
  const idx = new Map(order.map((it, i) => [it.id, i]));
  return items.map((i) => (idx.has(i.id) && idx.get(i.id) !== i.orderIndex ? { ...i, orderIndex: idx.get(i.id)! } : i));
}

/** Reorder eksplisit (dari Layers Panel): orderedIds = urutan top-level baru di dinding. */
export function applyWallOrder(items: Item[], wallId: string, orderedTopIds: string[]): Item[] {
  const list = wallItemsSorted(items, wallId);
  const flat: string[] = [];
  for (const id of orderedTopIds) {
    flat.push(id);
    for (const c of list) if (c.config.parentId === id) flat.push(c.id);
  }
  for (const it of list) if (!flat.includes(it.id)) flat.push(it.id);
  const idx = new Map(flat.map((id, i) => [id, i]));
  return items.map((i) => (idx.has(i.id) ? { ...i, orderIndex: idx.get(i.id)! } : i));
}

/** Deteksi orientasi corner otomatis: lihat tetangga & junction dinding. */
export function detectCornerOrientation(item: Item, items: Item[], walls: Wall[]): 'left' | 'right' {
  const pref = item.config.cornerOrientation ?? 'auto';
  if (pref !== 'auto') return pref;
  const wall = walls.find((w) => w.id === item.wallId);
  if (!wall) return 'left';
  const v = wallVec(wall);
  const off = offsetOnWall(wall, item.position.x, item.position.z) - item.dims.w / 2;
  const j = wallJunctions(walls, wall);
  const nearStart = off < 50, nearEnd = off + item.dims.w > v.length - 50;
  if (nearStart && j.atStart) return 'left';
  if (nearEnd && j.atEnd) return 'right';
  // Tetangga: jika ada kabinet di sisi kiri (offset lebih kecil) → buka ke kanan
  const neighborsLeft = items.some((o) => o.id !== item.id && o.wallId === wall.id && rowOf(o) !== 'wall' && offsetOnWall(wall, o.position.x, o.position.z) < off);
  return neighborsLeft ? 'right' : 'left';
}

/** Validasi non-blocking untuk item. */
export function validateItem(item: Item, items: Item[], walls: Wall[]): { level: 'warn' | 'info'; text: string }[] {
  const out: { level: 'warn' | 'info'; text: string }[] = [];
  const wall = walls.find((w) => w.id === item.wallId);
  if (wall) {
    const v = wallVec(wall);
    const off = offsetOnWall(wall, item.position.x, item.position.z) - item.dims.w / 2;
    if (off < -1) out.push({ level: 'warn', text: `Kabinet melewati awal dinding (${Math.round(-off)} mm)` });
    if (off + item.dims.w > v.length + 1) out.push({ level: 'warn', text: `Kabinet melewati ujung dinding (${Math.round(off + item.dims.w - v.length)} mm)` });
    else if (v.length - (off + item.dims.w) > 0 && v.length - (off + item.dims.w) < 50) out.push({ level: 'warn', text: `Clearance ke ujung dinding < 50 mm` });
    const row = rowOf(item);
    for (const o of items) {
      if (o.id === item.id || o.wallId !== item.wallId) continue;
      const orow = rowOf(o);
      const overlapRow = row === orow || row === 'tall' || orow === 'tall';
      if (!overlapRow) continue;
      const ooff = offsetOnWall(wall, o.position.x, o.position.z) - o.dims.w / 2;
      const overlap = Math.min(off + item.dims.w, ooff + o.dims.w) - Math.max(off, ooff);
      if (overlap > 2) out.push({ level: 'warn', text: `Tumpang tindih dengan ${o.name} (${Math.round(overlap)} mm)` });
      else if (Math.abs(overlap) < 1 && (item.config.doorCount ?? 1) > 0 && (o.type === 'fridge' || o.type === 'tall' || o.type === 'electronic') && row === 'base') out.push({ level: 'info', text: `Pintu bisa benturan dengan ${o.name}` });
    }
  }
  return out;
}
