import type { Footprint, Item, Room } from '../models/types';
import { footprint, r1 } from '../utils/geometry';

export interface SnapResult {
  x: number;
  y: number;
  guides: { axis: 'x' | 'y'; value: number }[];
}

export interface SnapOptions {
  grid: boolean;
  gridSize: number;
  objects: boolean;
  threshold: number; // cm
}

export function snapRect(
  moving: Footprint,
  movingId: string,
  items: Item[],
  room: Room,
  opts: SnapOptions,
  sameLevelOnly?: Item,
): SnapResult {
  let x = moving.x;
  let y = moving.y;
  const guides: SnapResult['guides'] = [];
  if (opts.grid) {
    x = Math.round(x / opts.gridSize) * opts.gridSize;
    y = Math.round(y / opts.gridSize) * opts.gridSize;
  }
  if (opts.objects) {
    const candX: number[] = [0, room.width];
    const candY: number[] = [0, room.depth];
    for (const it of items) {
      if (it.id === movingId) continue;
      if (sameLevelOnly && it.category !== sameLevelOnly.category && it.kind === 'cabinet' && sameLevelOnly.kind === 'cabinet') {
        // still allow snapping to other categories (wall over base) — but with lower priority (skip appliances)
      }
      if (it.kind === 'accessory') continue;
      const f = footprint(it);
      candX.push(f.x, f.x + f.w);
      candY.push(f.y, f.y + f.h);
    }
    let bestDx = opts.threshold;
    let snapX: number | null = null;
    let guideX = 0;
    for (const c of candX) {
      for (const edge of [x, x + moving.w]) {
        const d = Math.abs(c - edge);
        if (d < bestDx) {
          bestDx = d;
          snapX = edge === x ? c : c - moving.w;
          guideX = c;
        }
      }
    }
    let bestDy = opts.threshold;
    let snapY: number | null = null;
    let guideY = 0;
    for (const c of candY) {
      for (const edge of [y, y + moving.h]) {
        const d = Math.abs(c - edge);
        if (d < bestDy) {
          bestDy = d;
          snapY = edge === y ? c : c - moving.h;
          guideY = c;
        }
      }
    }
    if (snapX !== null) {
      x = snapX;
      guides.push({ axis: 'x', value: guideX });
    }
    if (snapY !== null) {
      y = snapY;
      guides.push({ axis: 'y', value: guideY });
    }
  }
  // keep inside room
  x = Math.max(0, Math.min(room.width - moving.w, x));
  y = Math.max(0, Math.min(room.depth - moving.h, y));
  return { x: r1(x), y: r1(y), guides };
}

export function snapValue(v: number, grid: number) {
  return r1(Math.round(v / grid) * grid);
}
