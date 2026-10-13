import type { Part } from '../models/types';
import { getBoard } from '../config/materials';

export interface PlacedPart {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  cabinet: string;
  rotated: boolean;
}

export interface Sheet {
  material: string;
  w: number;
  h: number;
  parts: PlacedPart[];
  usedArea: number;
  utilization: number;
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Guillotine / MaxRects-lite bin packing with kerf */
export function nestParts(parts: Part[], kerfMm = 3): Sheet[] {
  const kerf = kerfMm / 10;
  const byMat = new Map<string, Part[]>();
  for (const p of parts) {
    if (p.countInList === false) continue;
    const list = byMat.get(p.material) ?? [];
    list.push(p);
    byMat.set(p.material, list);
  }
  const sheets: Sheet[] = [];
  for (const [mat, list] of byMat) {
    const board = getBoard(mat);
    const SW = board.sheet.w;
    const SH = board.sheet.h;
    const pieces: { w: number; h: number; label: string; cabinet: string; grain: string }[] = [];
    for (const p of list) {
      for (let i = 0; i < p.qty; i++) pieces.push({ w: p.cutW, h: p.cutH, label: p.name, cabinet: p.cabinetName, grain: p.grain });
    }
    pieces.sort((a, b) => b.w * b.h - a.w * a.h);
    const matSheets: { free: FreeRect[]; sheet: Sheet }[] = [];
    const newSheet = () => {
      const s = { free: [{ x: 0, y: 0, w: SW, h: SH }], sheet: { material: mat, w: SW, h: SH, parts: [], usedArea: 0, utilization: 0 } as Sheet };
      matSheets.push(s);
      return s;
    };
    for (const pc of pieces) {
      let placed = false;
      for (const s of matSheets) {
        if (tryPlace(s, pc, kerf)) {
          placed = true;
          break;
        }
      }
      if (!placed) {
        const s = newSheet();
        if (!tryPlace(s, pc, kerf)) {
          // piece larger than sheet: place anyway clipped
          s.sheet.parts.push({ x: 0, y: 0, w: Math.min(pc.w, SW), h: Math.min(pc.h, SH), label: pc.label + ' (oversize)', cabinet: pc.cabinet, rotated: false });
        }
      }
    }
    for (const s of matSheets) {
      s.sheet.usedArea = s.sheet.parts.reduce((a, p) => a + p.w * p.h, 0);
      s.sheet.utilization = Math.round((s.sheet.usedArea / (SW * SH)) * 100);
      sheets.push(s.sheet);
    }
  }
  return sheets;
}

function tryPlace(s: { free: FreeRect[]; sheet: Sheet }, pc: { w: number; h: number; label: string; cabinet: string; grain: string }, kerf: number): boolean {
  // orientation: grain along length means long side along sheet height (244) — allow rotation if grain none
  const orientations: [number, number, boolean][] = [[pc.h, pc.w, false]]; // width across sheet, height along sheet
  if (pc.grain === 'none' || true) orientations.push([pc.w, pc.h, true]);
  let best: { idx: number; w: number; h: number; rotated: boolean; score: number } | null = null;
  s.free.forEach((fr, idx) => {
    for (const [w, h, rotated] of orientations) {
      if (w <= fr.w && h <= fr.h) {
        const score = Math.min(fr.w - w, fr.h - h);
        if (!best || score < best.score) best = { idx, w, h, rotated, score };
      }
    }
  });
  if (!best) return false;
  const b: { idx: number; w: number; h: number; rotated: boolean; score: number } = best;
  const fr = s.free[b.idx];
  s.sheet.parts.push({ x: fr.x, y: fr.y, w: b.w, h: b.h, label: pc.label, cabinet: pc.cabinet, rotated: b.rotated });
  // guillotine split: right & bottom
  s.free.splice(b.idx, 1);
  const right: FreeRect = { x: fr.x + b.w + kerf, y: fr.y, w: fr.w - b.w - kerf, h: b.h };
  const bottom: FreeRect = { x: fr.x, y: fr.y + b.h + kerf, w: fr.w, h: fr.h - b.h - kerf };
  if (right.w > 2 && right.h > 2) s.free.push(right);
  if (bottom.w > 2 && bottom.h > 2) s.free.push(bottom);
  s.free.sort((a, b2) => a.y - b2.y || a.x - b2.x);
  return true;
}
