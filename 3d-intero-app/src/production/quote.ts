// Luas meja dan backsplash untuk RAB. Tinggi backsplash mengikuti rumus scene: celah dikurangi tebal meja.
import type { Item, ProjectSettings, Wall } from '../types';
import { computeCountertopRuns } from '../generators/countertop';

export function countertopMeasure(items: Item[], walls: Wall[], settings: ProjectSettings): { areaM2: number; backsplashM2: number; backsplashHeightMm: number } {
  const ct = settings.countertop;
  const vis = items.filter((i) => i.visible);
  const runs = computeCountertopRuns(vis, walls);
  let areaMm2 = runs.reduce((a, r) => a + (r.end - r.start) * (r.depth + ct.overhang), 0);
  let bsLen = runs.reduce((a, r) => a + (r.end - r.start), 0);
  for (const it of vis) {
    if (it.type === 'corner_base') { areaMm2 += it.dims.w * 600 + (it.dims.d - 600) * 600; bsLen += it.dims.w + it.dims.d - 600; }
    if (it.type === 'island') areaMm2 += (it.dims.w + 2 * ct.overhang) * (it.dims.d + 2 * ct.overhang + (it.config.stools ? 250 : 0));
    if (it.type === 'bar') areaMm2 += it.dims.w * it.dims.d;
  }
  const backsplashHeightMm = !ct.backsplash ? 0 : ct.backsplashAuto ? Math.max(100, settings.wallGap - ct.thickness) : ct.backsplashHeight;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { areaM2: r2(areaMm2 / 1e6), backsplashM2: r2((bsLen * backsplashHeightMm) / 1e6), backsplashHeightMm };
}
