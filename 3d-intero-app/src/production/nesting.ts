// 3D Intero — Optimasi cutting list: MaxRects (best short side fit) + rotasi & arah serat, kerf 3 mm.
// Arah serat HPL mengikuti sisi TERPANJANG panel → sisi terpanjang dijajarkan dengan panjang lembar.
import type { NestResult, Panel, PanelMaterial, Placement, Sheet } from './types';

interface Rect { x: number; y: number; w: number; h: number }
interface Piece { p: Panel; w: number; h: number; rotatable: boolean; w0: number; h0: number }

class Bin {
  free: Rect[];
  placements: Placement[] = [];
  constructor(W: number, H: number) { this.free = [{ x: 0, y: 0, w: W, h: H }]; }
  find(pw: number, ph: number, rotatable: boolean): { x: number; y: number; w: number; h: number; score: number; tie: number } | null {
    let best: { x: number; y: number; w: number; h: number; score: number; tie: number } | null = null;
    const tryFit = (w: number, h: number) => {
      for (const f of this.free) {
        if (w <= f.w && h <= f.h) {
          const score = Math.min(f.w - w, f.h - h), tie = Math.max(f.w - w, f.h - h);
          if (!best || score < best.score || (score === best.score && tie < best.tie)) best = { x: f.x, y: f.y, w, h, score, tie };
        }
      }
    };
    tryFit(pw, ph);
    if (rotatable && pw !== ph) tryFit(ph, pw);
    return best;
  }
  place(r: Rect) {
    const out: Rect[] = [];
    for (const f of this.free) {
      if (r.x >= f.x + f.w || r.x + r.w <= f.x || r.y >= f.y + f.h || r.y + r.h <= f.y) { out.push(f); continue; }
      if (r.x > f.x) out.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h });
      if (r.x + r.w < f.x + f.w) out.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - (r.x + r.w), h: f.h });
      if (r.y > f.y) out.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y });
      if (r.y + r.h < f.y + f.h) out.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - (r.y + r.h) });
    }
    const keep: boolean[] = out.map(() => true);
    for (let i = 0; i < out.length; i++) {
      if (!keep[i]) continue;
      for (let j = i + 1; j < out.length; j++) {
        if (!keep[j]) continue;
        const a = out[i], b = out[j];
        if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) { keep[i] = false; break; }
        if (b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h) keep[j] = false;
      }
    }
    this.free = out.filter((_, i) => keep[i]);
  }
}

function pack(pieces: Piece[], sort: 'area' | 'long' | 'h' | 'w', W: number, H: number, kerf: number) {
  const list = [...pieces].sort((a, b) => {
    switch (sort) {
      case 'long': return Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w * b.h - a.w * a.h;
      case 'h': return b.h - a.h || b.w - a.w;
      case 'w': return b.w - a.w || b.h - a.h;
      default: return b.w * b.h - a.w * a.h;
    }
  });
  const bins: Bin[] = []; const unplaced: Panel[] = [];
  for (const pc of list) {
    const fitsSheet = (pc.w <= W && pc.h <= H) || (pc.rotatable && pc.h <= W && pc.w <= H);
    if (!fitsSheet) { unplaced.push(pc.p); continue; }
    const pw = pc.w + kerf, ph = pc.h + kerf;
    let placed = false;
    for (const bin of bins) {
      const f = bin.find(pw, ph, pc.rotatable);
      if (f) { commit(bin, pc, f, kerf); placed = true; break; }
    }
    if (!placed) {
      const bin = new Bin(W + kerf, H + kerf); bins.push(bin);
      const f = bin.find(pw, ph, pc.rotatable)!;
      commit(bin, pc, f, kerf);
    }
  }
  const used = bins.reduce((a, b) => a + b.placements.reduce((s, p) => s + p.w * p.h, 0), 0);
  return { bins, unplaced, used };
}
function commit(bin: Bin, pc: Piece, f: { x: number; y: number; w: number; h: number }, kerf: number) {
  bin.place({ x: f.x, y: f.y, w: f.w, h: f.h });
  const w = f.w - kerf, h = f.h - kerf;
  bin.placements.push({ panelId: pc.p.id, code: pc.p.code, itemTag: pc.p.itemTag, x: f.x, y: f.y, w, h, rotated: w !== pc.w0 || h !== pc.h0 });
}

export function nestPanels(material: PanelMaterial, panels: Panel[], sheetW = 1220, sheetH = 2440, kerf = 3): NestResult {
  const pieces: Piece[] = [];
  for (const p of panels) for (let i = 0; i < p.qty; i++) {
    const grained = p.grain === 'h';
    let w = p.w, h = p.h;
    if (grained && w > h) [w, h] = [h, w]; // serat sepanjang sisi terpanjang → sejajar panjang lembar
    pieces.push({ p, w, h, rotatable: !grained, w0: p.w, h0: p.h });
  }
  let best: ReturnType<typeof pack> | null = null;
  for (const s of ['area', 'long', 'h', 'w'] as const) {
    const r = pack(pieces, s, sheetW, sheetH, kerf);
    if (!best || r.bins.length < best.bins.length || (r.bins.length === best.bins.length && r.used > best.used)) best = r;
  }
  const res = best!;
  const sheets: Sheet[] = res.bins.map((b, i) => ({ index: i + 1, placements: b.placements }));
  const total = sheets.length * sheetW * sheetH;
  return { material, sheetW, sheetH, sheets, usedArea: res.used, wastePct: total ? Math.max(0, (1 - res.used / total) * 100) : 0, unplaced: res.unplaced };
}
