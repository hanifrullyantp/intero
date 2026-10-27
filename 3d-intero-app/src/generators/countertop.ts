// 3D Intero — Countertop kontinu per dinding + backsplash
import * as THREE from 'three';
import type { CountertopType, Item, ProjectSettings, Wall } from '../types';
import { COUNTERTOP_TYPES } from '../lib/constants';
import { type MatCache, box, marbleTexture, speckleTexture, tileTexture, woodTexture } from './common';
import { offsetOnWall, placeOnWall, rowOf } from '../engine/walls';

export function countertopMaterial(cache: MatCache, type: CountertopType): THREE.MeshStandardMaterial {
  const spec = COUNTERTOP_TYPES[type] ?? COUNTERTOP_TYPES.granit_hitam;
  const map = spec.vein ? marbleTexture(spec.base, spec.vein) : spec.speckle ? speckleTexture(spec.base) : spec.wood ? woodTexture(spec.base) : null;
  return cache.get(map ? '#FFFFFF' : spec.base, { roughness: spec.roughness, metalness: spec.metalness, map });
}
export function backsplashMaterial(cache: MatCache, color: string) {
  return cache.get('#FFFFFF', { roughness: 0.35, metalness: 0.02, map: tileTexture(color) });
}

export const COUNTERTOP_TYPES_ELIGIBLE = new Set(['base', 'sink_base', 'cooktop_base', 'drawer_base', 'dishwasher']);

export interface CountertopRun { wall: Wall; start: number; end: number; depth: number }

export function computeCountertopRuns(items: Item[], walls: Wall[]): CountertopRun[] {
  const runs: CountertopRun[] = [];
  for (const wall of walls) {
    const segs = items
      .filter((i) => i.wallId === wall.id && i.visible && rowOf(i) === 'base' && COUNTERTOP_TYPES_ELIGIBLE.has(i.type))
      .map((i) => { const c = offsetOnWall(wall, i.position.x, i.position.z); return { start: c - i.dims.w / 2, end: c + i.dims.w / 2, depth: i.dims.d }; })
      .sort((a, b) => a.start - b.start);
    let cur: CountertopRun | null = null;
    for (const s of segs) {
      if (cur && s.start - cur.end < 5) { cur.end = Math.max(cur.end, s.end); cur.depth = Math.max(cur.depth, s.depth); }
      else { cur = { wall, start: s.start, end: s.end, depth: s.depth }; runs.push(cur); }
    }
  }
  return runs;
}

function bsHeight(settings: ProjectSettings) {
  const ct = settings.countertop;
  if (!ct.backsplash) return 0;
  if (ct.backsplashAuto) return Math.max(100, settings.baseHeight + settings.wallGap - settings.baseHeight - ct.thickness);
  return ct.backsplashHeight;
}
export function genCountertopRun(run: CountertopRun, settings: ProjectSettings, cache: MatCache): THREE.Group {
  const ct = settings.countertop;
  const bsH = bsHeight(settings);
  const L = run.end - run.start;
  const depth = run.depth + ct.overhang;
  const g = new THREE.Group();
  const p = placeOnWall(run.wall, run.start, L, depth);
  g.position.set(p.x, 0, p.z); g.rotation.y = (p.rotationY * Math.PI) / 180;
  const slab = box(L, ct.thickness, depth, countertopMaterial(cache, ct.type), 0, settings.baseHeight + ct.thickness / 2, 0);
  slab.userData.isCountertop = true; g.add(slab);
  // tepi depan sedikit lebih gelap (edge profile)
  if (bsH > 0) {
    const bs = box(L, bsH, 10, backsplashMaterial(cache, ct.backsplashColor), 0, settings.baseHeight + ct.thickness + bsH / 2, -depth / 2 + 5);
    bs.castShadow = false; g.add(bs);
  }
  g.userData.isCountertop = true;
  return g;
}
