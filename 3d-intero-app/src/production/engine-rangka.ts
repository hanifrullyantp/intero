// 3D Intero — Mesin Produksi METODE B: Rangka besi hollow 40×40 + panel ACP 4 mm.
import type { Item, ProjectSettings, V3 } from '../types';
import type { Panel, Segment } from './types';

const HS = 40, OFF = HS / 2;
const P = (x: number, y: number, z: number): V3 => ({ x, y, z });
const NO_EDGE = { t: false, b: false, l: false, r: false };

interface FrameDef { W: number; D: number; y0: number; H: number; ox: number; oz: number; shelves: number }

export function frameDefs(item: Item, s: ProjectSettings): FrameDef[] {
  const { w: W, h, d: D } = item.dims; const cfg = item.config;
  const tk = cfg.toeKickHeight ?? s.toeKick;
  switch (item.type) {
    case 'base': case 'sink_base': case 'cooktop_base': case 'drawer_base': case 'dishwasher':
      return [{ W, D, y0: tk, H: h - tk, ox: 0, oz: 0, shelves: h - tk > 500 ? 1 : 0 }];
    case 'wall': { const cornice = cfg.cornice ? (cfg.corniceHeight ?? 50) : 0; return [{ W, D, y0: 0, H: h - cornice, ox: 0, oz: 0, shelves: h - cornice > 500 ? 1 : 0 }]; }
    case 'tall': return [{ W, D, y0: tk, H: h - tk, ox: 0, oz: 0, shelves: Math.max(1, Math.floor((h - tk - 200) / 450)) }];
    case 'hood': { const canopy = Math.min(150, Math.max(40, cfg.hoodHeight ?? 70)); return [{ W, D, y0: canopy, H: h - canopy, ox: 0, oz: 0, shelves: 0 }]; }
    case 'fridge': return [{ W, D, y0: 0, H: h, ox: 0, oz: 0, shelves: 0 }];
    case 'electronic': return [{ W, D, y0: tk, H: h - tk, ox: 0, oz: 0, shelves: 2 }];
    case 'island': return [{ W, D, y0: tk, H: h - tk, ox: 0, oz: 0, shelves: 1 }];
    case 'bar': { const overhang = Math.min(cfg.barOverhang ?? 300, D - 150); const sd = D - overhang; return [{ W, D: sd, y0: s.toeKick, H: h - 40 - s.toeKick, ox: 0, oz: -D / 2 + sd / 2, shelves: 1 }]; }
    case 'corner_base': case 'corner_wall': {
      const isWall = item.type === 'corner_wall'; const Dc = isWall ? s.wallDepth : 600; const y0 = isWall ? 0 : tk;
      return [
        { W, D: Dc, y0, H: h - y0, ox: 0, oz: -D / 2 + Dc / 2, shelves: h - y0 > 500 ? 1 : 0 },
        { W: Dc, D: D - Dc, y0, H: h - y0, ox: -W / 2 + Dc / 2, oz: Dc / 2, shelves: h - y0 > 500 ? 1 : 0 },
      ];
    }
    default: return [];
  }
}

/** Rangka hollow + panel ACP dari daftar panel papan (sisi, pintu, dasar, toe kick). */
export function buildRangka(item: Item, s: ProjectSettings, tag: string, papan: Panel[]): { segments: Segment[]; panels: Panel[]; joints: V3[] } {
  const segments: Segment[] = []; const joints: V3[] = []; let n = 0;
  const addSeg = (profile: Segment['profile'], a: V3, b: V3, virtual = false) => {
    n += 1;
    segments.push({ id: `${tag}-F${n}`, itemId: item.id, itemTag: tag, profile, a, b, length: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), virtual });
  };
  for (const f of frameDefs(item, s)) {
    const xs = [-(f.W / 2 - OFF), f.W / 2 - OFF], zs = [-(f.D / 2 - OFF), f.D / 2 - OFF];
    const ys = [f.y0 + OFF, f.y0 + f.H - OFF];
    const shelfYs: number[] = [];
    for (let i = 1; i <= f.shelves; i++) shelfYs.push(f.y0 + (f.H * i) / (f.shelves + 1));
    for (const x of xs) for (const z of zs) {
      addSeg('40x40', P(f.ox + x, f.y0, f.oz + z), P(f.ox + x, f.y0 + f.H, f.oz + z));
      for (const y of [...ys, ...shelfYs]) joints.push(P(f.ox + x, y, f.oz + z));
    }
    for (const y of ys) {
      for (const z of zs) addSeg('40x40', P(f.ox - (f.W / 2 - HS), y, f.oz + z), P(f.ox + (f.W / 2 - HS), y, f.oz + z));
      for (const x of xs) addSeg('40x40', P(f.ox + x, y, f.oz - (f.D / 2 - HS)), P(f.ox + x, y, f.oz + (f.D / 2 - HS)));
    }
    for (const y of shelfYs) for (const z of zs) addSeg('40x40', P(f.ox - (f.W / 2 - HS), y, f.oz + z), P(f.ox + (f.W / 2 - HS), y, f.oz + z));
    if (f.W > 1000) {
      const zb = f.oz - (f.D / 2 - OFF);
      addSeg('20x20', P(f.ox - (f.W / 2 - HS), f.y0 + HS, zb), P(f.ox + (f.W / 2 - HS), f.y0 + f.H - HS, zb));
      addSeg('20x20', P(f.ox + (f.W / 2 - HS), f.y0 + HS, zb), P(f.ox - (f.W / 2 - HS), f.y0 + f.H - HS, zb));
    }
  }
  const panels: Panel[] = papan
    .filter((p) => p.kind !== 'drawerbox' && !(p.kind === 'top' && p.code.includes('TR')))
    .map((p) => ({ ...p, material: 'acp4' as const, t: 4, hplFaces: 0, edges: NO_EDGE, grain: 'none' as const }));
  // Rangka daun pintu/laci (hollow 20×20, panjang saja)
  for (const p of panels) if (p.kind === 'door' || p.kind === 'drawer') addSeg('20x20', P(0, 0, 0), P(2 * (p.w + p.h), 0, 0), true);
  return { segments, panels, joints };
}
