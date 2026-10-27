// 3D Intero — Frame Engine v2: preset material rangka + block grouper (L-shape) + member generator.
// Semua dimensi internal mm; tampilan UI dalam cm. Standar batang 6 m, waste 5%.
import type { FrameMaterialId, Item, ProjectSettings, V3, Wall } from '../types';
import { wallJunctions, wallVec } from '../engine/walls';

export type FrameRole = 'post' | 'midpost' | 'railTop' | 'railBottom' | 'crossTop' | 'crossBottom' | 'shelf' | 'doorV' | 'doorH';
export type ProfileKey = '1530' | '1515' | '2040' | 'alu';

export const BAR_LEN_MM = 6000;
export const WASTE = 0.05;

/** Spesifikasi material rangka (harga per batang 6 m, Rupiah). */
export const FRAME_MATERIALS: Record<FrameMaterialId, {
  name: string; short: string; alu: boolean; factor: number;
  color: number; metalness: number; roughness: number; env: number;
  bars: Record<ProfileKey, number>;
}> = {
  galvanis_08: { name: 'Besi Galvanis 0.8 mm', short: 'Galvanis 0.8mm', alu: false, factor: 1, color: 0x9A9AA3, metalness: 0.85, roughness: 0.35, env: 1.2, bars: { '1530': 51500, '1515': 36500, '2040': 75000, alu: 0 } },
  galvanis_07: { name: 'Besi Galvanis 0.7 mm (hemat)', short: 'Galvanis 0.7mm', alu: false, factor: 0.7, color: 0xA9A9B2, metalness: 0.8, roughness: 0.4, env: 1.1, bars: { '1530': 36000, '1515': 25500, '2040': 52500, alu: 0 } },
  aluminium: { name: 'Aluminium Hollow 1×1.5 inch', short: 'Aluminium 1×1.5"', alu: true, factor: 1, color: 0xD8D8DC, metalness: 0.92, roughness: 0.18, env: 1.5, bars: { '1530': 0, '1515': 0, '2040': 0, alu: 120000 } },
};

/** Profil per role: {alongWall(x), vertical(y), depth(z)} dalam mm — untuk besi. Aluminium satu profil universal. */
export function profileOf(mat: FrameMaterialId, role: FrameRole): { x: number; y: number; z: number } {
  if (FRAME_MATERIALS[mat].alu) return { x: 25, y: 38, z: 38 };
  switch (role) {
    case 'post': return { x: 15, y: 30, z: 30 };
    case 'railTop': return { x: 30, y: 30, z: 15 };
    case 'railBottom': return { x: 15, y: 15, z: 15 };
    case 'midpost': return { x: 15, y: 15, z: 15 };
    case 'crossTop': case 'crossBottom': case 'shelf': return { x: 15, y: 15, z: 15 };
    case 'doorV': return { x: 20, y: 40, z: 40 };
    case 'doorH': return { x: 40, y: 20, z: 40 };
  }
}
export function profileKeyOf(mat: FrameMaterialId, role: FrameRole): ProfileKey {
  if (FRAME_MATERIALS[mat].alu) return 'alu';
  switch (role) {
    case 'post': case 'railTop': return '1530';
    case 'midpost': case 'crossTop': case 'crossBottom': case 'shelf': case 'railBottom': return '1515';
    default: return '2040';
  }
}

export interface FrameMember {
  id: string; blockId: string; itemId: string; role: FrameRole; profile: ProfileKey;
  /** Pusat member dalam koordinat lokal blok: x sepanjang blok (0..L), y vertikal, z kedalaman (0 = dinding / belakang). */
  c: V3; d: V3; len: number;
}
export interface FrameDoor { x: number; y: number; w: number; h: number; itemId: string }
export interface FrameBlock {
  id: string; kind: 'base' | 'wall' | 'standalone'; label: string;
  wallId: string | null; cabinetIds: string[];
  L: number; depth: number; y0: number; height: number;
  angle: number; origin: V3;
  partitions: number[]; doors: FrameDoor[]; shelfLevels: number[];
  trimmedStart: number; trimmedEnd: number; corner: boolean;
  hood?: boolean;
}
export interface FrameJoint extends V3 { blockId: string }
export interface FrameResult {
  blocks: FrameBlock[]; members: FrameMember[]; joints: FrameJoint[];
  lengthMm: Record<ProfileKey, number>;
  bars: Record<ProfileKey, number>; barPrice: Record<ProfileKey, number>;
  barCount: number; totalLengthM: number; cornerBrackets: number; material: FrameMaterialId;
}

const rowsOf = (items: Item[], wall: Wall, row: 'base' | 'wall') =>
  items.filter((i) => i.wallId === wall.id && rowOf(i) === row && (row !== 'wall' || i.type !== 'hood'))
    .map((i) => ({ i, s: offset(wall, i) - i.dims.w / 2, e: offset(wall, i) + i.dims.w / 2 }))
    .sort((a, b) => a.s - b.s);
const rowOf = (i: Item) => (i.type === 'wall' || i.type === 'corner_wall' || i.type === 'hood' ? 'wall' : i.type === 'island' || i.type === 'bar' || i.type === 'fridge' || i.type === 'electronic' || i.type === 'tall' ? 'free' : 'base');
const offset = (w: Wall, i: Item) => { const v = wallVec(w); return (i.position.x - w.start.x) * v.dir.x + (i.position.z - w.start.z) * v.dir.z; };
const rot = (v: V3, deg: number): V3 => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c }; };
const toWorld = (it: Item, p: V3): V3 => { const r = rot(p, it.rotationY); return { x: r.x + it.position.x, y: r.y + it.position.y, z: r.z + it.position.z }; };

function otherWallAt(walls: Wall[], wall: Wall, at: 'start' | 'end'): Wall | null {
  const p = at === 'start' ? wall.start : wall.end;
  const near = (a: V2c, b: V2c) => Math.hypot(a.x - b.x, a.z - b.z) < 1;
  return walls.find((o) => o.id !== wall.id && (near(o.start, p) || near(o.end, p))) ?? null;
}
type V2c = { x: number; z: number };

function rowDepth(items: Item[], wall: Wall, row: 'base' | 'wall', settings: ProjectSettings): number {
  const list = rowsOf(items, wall, row);
  if (list.length) return Math.max(...list.map((r) => r.i.dims.d));
  return row === 'wall' ? settings.wallDepth : 600;
}

function doorsOf(it: Item, s: ProjectSettings): FrameDoor[] {
  const { w, h, d } = it.dims; const cfg = it.config; const out: FrameDoor[] = [];
  const push = (x: number, y: number, dw: number, dh: number) => { if (dw > 90 && dh > 90) out.push({ x, y, w: dw - 6, h: dh - 6, itemId: it.id }); };
  if (it.type === 'island') {
    const n = Math.max(1, Math.min(4, cfg.islandDoorsPerSide ?? 2)); const dw = (w - (n + 1) * 2) / n; const dh = h - (cfg.toeKickHeight ?? s.toeKick) - 4; const yb = 2;
    for (let i = 0; i < n; i++) push(-w / 2 + 2 + dw / 2 + i * (dw + 2), yb + dh / 2, dw, dh);
    if ((cfg.stools ?? 0) === 0) for (let i = 0; i < n; i++) push(-w / 2 + 2 + dw / 2 + i * (dw + 2), yb + dh / 2, dw, dh);
    return out;
  }
  if (it.type === 'bar' || it.type === 'custom') return out;
  const tk = cfg.toeKickHeight ?? s.toeKick;
  const cornice = cfg.cornice ? (cfg.corniceHeight ?? 50) : 0;
  if (it.type === 'hood') {
    const canopyH = Math.min(150, Math.max(40, cfg.hoodHeight ?? 70));
    const fillerH = h - cornice - canopyH;
    if (fillerH > 90) {
      const n = w > 700 && fillerH > 120 ? 2 : 1;
      const dw = n === 2 ? (w - 6) / 2 : w - 4;
      for (let i = 0; i < n; i++) {
        const x = n === 2 ? (i === 0 ? -w / 2 + 2 + dw / 2 : w / 2 - 2 - dw / 2) : 0;
        push(x, canopyH + 2 + (fillerH - 4) / 2, dw, fillerH - 4);
      }
    }
    return out;
  }
  if (it.type === 'corner_wall') {
    const wallD = s.wallDepth;
    const mainH = h - cornice;
    const dw = Math.max(160, w - wallD - 4);
    push(-w / 2 + wallD + 2 + dw / 2, 2 + (mainH - 4) / 2, dw, mainH - 4);
    return out;
  }
  if (it.type === 'wall') {
    const upper = cfg.doubleStack ? Math.min(cfg.upperTierHeight ?? 350, h - cornice - 300) : 0;
    const mainH = h - cornice - upper;
    const n = cfg.doorCount ?? (w > 600 ? 2 : 1); const dw = n === 2 ? (w - 6) / 2 : w - 4;
    for (let i = 0; i < n; i++) { const x = n === 2 ? (i === 0 ? -w / 2 + 2 + dw / 2 : w / 2 - 2 - dw / 2) : 0; push(x, 2 + (mainH - 4) / 2, dw, mainH - 4); }
    if (upper > 0) for (let i = 0; i < n; i++) { const x = n === 2 ? (i === 0 ? -w / 2 + 2 + dw / 2 : w / 2 - 2 - dw / 2) : 0; push(x, mainH + 2 + (upper - 4) / 2, dw, upper - 4); }
    return out;
  }
  if (it.type === 'fridge') {
    const fH = Math.min(cfg.fridgeH ?? 1750, h - cornice - 60); const fy = fH + 40; const fh = h - cornice - fy;
    if (fh > 90) {
      const n = fh > 150 && w > 650 ? 2 : 1; const dw = n === 2 ? (w - 6) / 2 : w - 4;
      for (let i = 0; i < n; i++) { const x = n === 2 ? (i === 0 ? -w / 2 + 2 + dw / 2 : w / 2 - 2 - dw / 2) : 0; push(x, fy + 2 + (fh - 4) / 2, dw, fh - 4); }
    }
    return out;
  }
  if (it.type === 'electronic') {
    const s1 = cfg.slot1 ?? 'magiccom', s2 = cfg.slot2 ?? 'oven';
    const S1 = { magiccom: 330, dispenser: 580, oven: 340, shelf: 350 }[s1];
    const S2 = { oven: 340, microwave: 350, coffee: 480, shelf: 350, door: 0 }[s2];
    const topY = s.baseHeight + S1 + 18 + (s2 === 'door' ? 0 : S2 + 18);
    const effH = h - cornice;
    const n = w > 650 ? 2 : 1; const dw = n === 2 ? (w - 6) / 2 : w - 4;
    if (s1 !== 'dispenser') for (let i = 0; i < n; i++) { const x = n === 2 ? (i === 0 ? -w / 2 + 2 + dw / 2 : w / 2 - 2 - dw / 2) : 0; push(x, 2 + (s.baseHeight - tk - 4) / 2, dw, s.baseHeight - tk - 4); }
    if (effH - topY > 90) for (let i = 0; i < n; i++) { const x = n === 2 ? (i === 0 ? -w / 2 + 2 + dw / 2 : w / 2 - 2 - dw / 2) : 0; push(x, (topY - tk) + 2 + (effH - topY - 4) / 2, dw, effH - topY - 4); }
    return out;
  }
  if (it.type === 'tall') {
    const bodyH = h - cornice - tk; const split = Math.min(1250, bodyH * 0.55);
    const n = cfg.doorCount ?? (w > 600 ? 2 : 1); const dw = n === 2 ? (w - 6) / 2 : w - 4;
    for (const [y0, th] of [[tk, split], [tk + split, bodyH - split]] as [number, number][]) {
      if (th < 150) continue;
      for (let i = 0; i < n; i++) { const x = n === 2 ? (i === 0 ? -w / 2 + 2 + dw / 2 : w / 2 - 2 - dw / 2) : 0; push(x, (y0 - tk) + 2 + (th - 4) / 2, dw, th - 4); }
    }
    return out;
  }
  // base family + corner
  const bodyH = h - tk;
  if (it.type === 'dishwasher') { push(0, 2 + (bodyH - 60) / 2, w - 4, bodyH - 60); return out; }
  if (it.type === 'corner_base') {
    const baseD = 600;
    const dw = Math.max(160, w - baseD - 4);
    push(-w / 2 + baseD + 2 + dw / 2, 2 + (bodyH - 4) / 2, dw, bodyH - 4);
    return out;
  }
  const open = !!cfg.openShelf;
  if (open) return out;
  const doors = cfg.doorCount ?? (it.type === 'drawer_base' ? 0 : w > 500 ? 2 : 1);
  let drawers = it.type === 'sink_base' ? 0 : (cfg.drawerCount ?? (it.type === 'drawer_base' ? 3 : it.type === 'cooktop_base' ? 1 : 0));
  if (doors === 0 && drawers === 0) drawers = 3;
  let top = bodyH;
  if (drawers > 0) {
    const heights: number[] = [];
    if (doors === 0) {
      if (drawers >= 3) {
        const first = Math.round(bodyH * 0.22);
        heights.push(first);
        const rest = (bodyH - first) / (drawers - 1);
        for (let i = 1; i < drawers; i++) heights.push(rest);
      } else {
        for (let i = 0; i < drawers; i++) heights.push(bodyH / drawers);
      }
    } else {
      for (let i = 0; i < drawers; i++) heights.push(Math.min(170, bodyH / (drawers + 1)));
    }
    for (const dh of heights) {
      push(0, top - dh / 2, w - 4, dh - 2);
      top -= dh;
    }
  }
  const doorH = top - 2;
  if (doors > 0 && doorH >= 90) {
    const dw = doors === 2 ? (w - 6) / 2 : w - 4;
    for (let i = 0; i < doors; i++) {
      const x = doors === 2 ? (i === 0 ? -w / 2 + 2 + dw / 2 : w / 2 - 2 - dw / 2) : 0;
      push(x, 2 + doorH / 2, dw, doorH - 2);
    }
  }
  return out;
}

function shelfLevelsOf(it: Item, s: ProjectSettings): number[] {
  const { h } = it.dims; const cfg = it.config;
  if (it.type === 'wall') { const cornice = cfg.cornice ? (cfg.corniceHeight ?? 50) : 0; const mainH = h - cornice - (cfg.doubleStack ? Math.min(cfg.upperTierHeight ?? 350, h - cornice - 300) : 0); return mainH > 500 ? [mainH / 2] : []; }
  if (it.type === 'tall') { const bodyH = h - (cfg.toeKickHeight ?? s.toeKick); const out: number[] = []; for (let y = 350; y < bodyH - 200; y += 350) out.push(y); return out; }
  if (it.type === 'electronic') return [s.baseHeight, s.baseHeight + 348];
  if (it.type === 'island' || it.type === 'bar') return [h * 0.5];
  return [];
}

/** Kelompokkan kabinet menjadi blok rangka: merged per dinding (base & wall terpisah) + kabinet mandiri. */
export function groupBlocks(items: Item[], walls: Wall[], s: ProjectSettings): FrameBlock[] {
  const blocks: FrameBlock[] = [];
  const len = (w: Wall) => wallVec(w).length;
  for (const wall of walls) {
    const v = wallVec(wall);
    const angleDeg = (v.angle * 180) / Math.PI;
    const j = wallJunctions(walls, wall);
    const wallLen = len(wall);
    for (const row of ['base', 'wall'] as const) {
      const rows = rowsOf(items, wall, row);
      if (!rows.length) continue;
      // Rangka mengikuti rentang aktual kabinet pada dinding (dengan trim sudut L jika berbenturan dengan dinding lain)
      const minCabS = Math.max(0, Math.min(...rows.map((r) => r.s)));
      const maxCabE = Math.min(wallLen, Math.max(...rows.map((r) => r.e)));
      let x0 = minCabS, x1 = maxCabE;
      let trimS = 0, trimE = 0, corner = false;
      if (j.atStart && minCabS < 50) {
        const o = otherWallAt(walls, wall, 'start');
        if (o && wallLen > len(o) + 1) { trimS = rowDepth(items, o, row, s); x0 = Math.max(x0, trimS); corner = true; }
      }
      if (j.atEnd && wallLen - maxCabE < 50) {
        const o = otherWallAt(walls, wall, 'end');
        if (o && wallLen > len(o) + 1) { trimE = rowDepth(items, o, row, s); x1 = Math.min(x1, wallLen - trimE); corner = true; }
      }
      // Hood dipotong dari segmen wall (jadi blok reses terpisah) agar tidak rangkap.
      const hoods = row === 'wall' ? items.filter((i) => i.wallId === wall.id && i.type === 'hood') : [];
      let segs: [number, number][] = [[x0, x1]];
      for (const h of hoods) {
        const hc = offset(wall, h); const hs = hc - h.dims.w / 2, he = hc + h.dims.w / 2;
        const next: [number, number][] = [];
        for (const [a, b] of segs) {
          if (he <= a || hs >= b) { next.push([a, b]); continue; }
          if (a < hs - 1) next.push([a, hs]);
          if (he < b + 1) next.push([he, b]);
        }
        segs = next;
      }
      let segN = 0;
      for (const [sx0, sx1] of segs) {
        if (sx1 - sx0 < 150) continue;
        segN += 1;
        const inBlock = rows.filter((r) => r.e > sx0 + 1 && r.s < sx1 - 1);
        if (!inBlock.length) continue;
        const partitions: number[] = [];
        for (let k = 0; k < inBlock.length - 1; k++) {
          const bnd = (inBlock[k].e + inBlock[k + 1].s) / 2 - sx0;
          if (bnd > 60 && bnd < sx1 - sx0 - 60) partitions.push(Math.round(bnd));
        }
        const doors: FrameDoor[] = []; const shelfLevels: number[] = [];
        inBlock.forEach((r) => {
          const cx0 = offset(wall, r.i) - sx0;
          for (const dd of doorsOf(r.i, s)) {
            const cx = cx0 + dd.x;
            if (cx > 20 && cx < sx1 - sx0 - 20) doors.push({ ...dd, x: cx });
          }
          for (const y of shelfLevelsOf(r.i, s)) if (!shelfLevels.includes(y)) shelfLevels.push(y);
        });
        // Kedalaman blok = kedalaman mayoritas (kabinet lurus), bukan max dari corner_base/corner_wall.
        const depth = (() => {
          const tally = new Map<number, number>();
          for (const r of inBlock) {
            const dVal = r.i.type === 'corner_base' ? 600 : r.i.type === 'corner_wall' ? s.wallDepth : r.i.dims.d;
            tally.set(dVal, (tally.get(dVal) ?? 0) + r.i.dims.w);
          }
          let best = inBlock[0].i.type === 'corner_base' ? 600 : inBlock[0].i.type === 'corner_wall' ? s.wallDepth : inBlock[0].i.dims.d;
          let bestW = -1;
          for (const [d, w] of tally) if (w > bestW || (w === bestW && d > best)) { best = d; bestW = w; }
          return best;
        })();
        const y0 = row === 'wall' ? s.baseHeight + s.wallGap : Math.min(...inBlock.map((r) => r.i.config.toeKickHeight ?? s.toeKick));
        const height = row === 'wall' ? Math.max(...inBlock.map((r) => r.i.dims.h)) : Math.max(...inBlock.map((r) => r.i.dims.h)) - y0;
        const origin: V3 = { x: wall.start.x + v.dir.x * sx0, y: 0, z: wall.start.z + v.dir.z * sx0 };
        const label = `${wall.name} · ${row === 'base' ? 'Kabinet Bawah' : 'Kabinet Atas'}${segs.length > 1 ? ` (seks. ${segN})` : ''}`;
        blocks.push({
          id: `${wall.id}-${row}${segs.length > 1 ? `-${segN}` : ''}`, kind: row, label,
          wallId: wall.id, cabinetIds: inBlock.map((r) => r.i.id), L: Math.round(sx1 - sx0), depth, y0, height,
          angle: angleDeg, origin, partitions, doors, shelfLevels, trimmedStart: trimS, trimmedEnd: trimE, corner,
        });
      }
      // Blok hood: reses (kedalamannya sendiri), terpisah dari segmen wall.
      if (row === 'wall') {
        for (const h of hoods) {
          const hc = offset(wall, h); const hx0 = hc - h.dims.w / 2;
          const hDoors = doorsOf(h, s).map((dd) => ({ ...dd, x: dd.x + h.dims.w / 2 }));
          blocks.push({
            id: `hood-${h.id}`, kind: 'wall', hood: true, label: `${wall.name} · Cooker Hood`,
            wallId: wall.id, cabinetIds: [h.id], L: Math.round(h.dims.w), depth: h.dims.d,
            y0: s.baseHeight + s.wallGap, height: Math.round(h.dims.h), angle: angleDeg,
            origin: { x: wall.start.x + v.dir.x * hx0, y: 0, z: wall.start.z + v.dir.z * hx0 },
            partitions: [], doors: hDoors, shelfLevels: [], trimmedStart: 0, trimmedEnd: 0, corner: false,
          });
        }
      }
    }
  }
  for (const it of items) {
    if (rowOf(it) !== 'free') continue;
    const { w, d, h } = it.dims; const tk = it.type === 'fridge' ? 0 : (it.config.toeKickHeight ?? s.toeKick);
    const partitions = it.type === 'island' || it.type === 'bar' ? [Math.round(w / 2)] : [];
    const doors = doorsOf(it, s).map((dd) => ({ ...dd, x: dd.x + w / 2 }));
    const origin = toWorld(it, { x: -w / 2, y: 0, z: -d / 2 });
    blocks.push({
      id: `sa-${it.id}`, kind: 'standalone', label: it.name, wallId: it.wallId, cabinetIds: [it.id],
      L: Math.round(w), depth: d, y0: tk, height: h - tk, angle: it.rotationY, origin,
      partitions, doors, shelfLevels: shelfLevelsOf(it, s), trimmedStart: 0, trimmedEnd: 0, corner: false,
    });
  }
  return blocks;
}

const SIDES = 2;
/** Generate member rangka untuk semua blok + rekap panjang per profil & jumlah batang. */
export function buildFrame(items: Item[], walls: Wall[], s: ProjectSettings, material: FrameMaterialId): FrameResult {
  const blocks = groupBlocks(items, walls, s);
  const members: FrameMember[] = []; const joints: FrameJoint[] = [];
  const alu = FRAME_MATERIALS[material].alu;
  const pz = alu ? 38 : 15;            // setengah-tebal profil utama (z)
  const px = alu ? 25 : 15;
  const half = (r: FrameRole) => { const p = profileOf(material, r); return { x: p.x / 2, y: p.y / 2, z: p.z / 2 }; };
  let n = 0;
  const add = (b: FrameBlock, itemId: string, role: FrameRole, c: V3, d: V3) => {
    n += 1;
    members.push({ id: `${b.id}-M${n}`, blockId: b.id, itemId, role, profile: profileKeyOf(material, role), c, d, len: Math.max(d.x, d.y, d.z) });
  };
  for (const b of blocks) {
    const ids = b.cabinetIds;
    const midItem = ids[0] ?? '';
    const zs = [half('post').z, b.depth - half('post').z];
    // ── Tiang sudut (1.5×3) 4 titik
    for (const x of [half('post').x, b.L - half('post').x]) for (const z of zs) {
      add(b, midItem, 'post', { x, y: b.y0 + b.height / 2, z }, { x: profileOf(material, 'post').x, y: b.height, z: profileOf(material, 'post').z });
      for (const y of [b.y0, b.y0 + b.height]) joints.push({ blockId: b.id, x, y, z });
    }
    // ── Tiang sekat tengah (1.5×1.5) di tiap batas kabinet
    for (const px2 of b.partitions) for (const z of zs) {
      add(b, midItem, 'midpost', { x: px2, y: b.y0 + b.height / 2, z }, { x: profileOf(material, 'midpost').x, y: b.height, z: profileOf(material, 'midpost').z });
      for (const y of [b.y0, b.y0 + b.height]) joints.push({ blockId: b.id, x: px2, y, z });
    }
    // ── Rangka atas & bawah: 2 rel panjang (1.5×3) + rel melintang tiap sekat (1.5×1.5)
    for (const [role, y] of [['railTop', b.y0 + b.height - half('railTop').y], ['railBottom', b.y0 + half('railBottom').y]] as [FrameRole, number][]) {
      const p = profileOf(material, role);
      for (const z of zs) add(b, midItem, role, { x: b.L / 2, y, z }, { x: b.L, y: p.y, z: p.z });
      const crossRole: FrameRole = role === 'railTop' ? 'crossTop' : 'crossBottom';
      // Tiang melintang di SETIAP tepi (dekat & jauh) + tiap sekat → kotak sempurna.
      for (const px2 of [px, ...b.partitions, b.L - px]) {
        add(b, midItem, crossRole, { x: px2, y, z: b.depth / 2 }, { x: profileOf(material, crossRole).x, y: p.y, z: b.depth - 2 * pz });
        joints.push({ blockId: b.id, x: px2, y, z: b.depth / 2 });
      }
    }
    // ── Support rak (melintang di ketinggian rak)
    for (const y of b.shelfLevels) {
      if (y <= b.y0 + 60 || y >= b.y0 + b.height - 60) continue;
      for (const px2 of [px, ...b.partitions, b.L - px]) add(b, midItem, 'shelf', { x: px2, y: b.y0 + y, z: b.depth / 2 }, { x: 15, y: 15, z: b.depth - 2 * pz });
    }
    // ── Rangka pintu (2×4): 4 sisi per daun
    for (const dr of b.doors) {
      const it = items.find((i) => i.id === dr.itemId) ?? items[0];
      const pv = profileOf(material, 'doorV'), ph = profileOf(material, 'doorH');
      const zf = b.depth + pv.z / 2 + 2;
      for (const sx of [-1, 1]) add(b, it.id, 'doorV', { x: dr.x + (sx * (dr.w - pv.x)) / 2, y: b.y0 + dr.y, z: zf }, { x: pv.x, y: dr.h, z: pv.z });
      for (const sy of [-1, 1]) add(b, it.id, 'doorH', { x: dr.x, y: b.y0 + dr.y + (sy * (dr.h - ph.y)) / 2, z: zf }, { x: dr.w, y: ph.y, z: ph.z });
    }
  }
  const lengthMm: Record<ProfileKey, number> = { '1530': 0, '1515': 0, '2040': 0, alu: 0 };
  for (const m of members) lengthMm[m.profile] += m.len;
  const bars: Record<ProfileKey, number> = { '1530': 0, '1515': 0, '2040': 0, alu: 0 };
  const barPrice: Record<ProfileKey, number> = { '1530': 0, '1515': 0, '2040': 0, alu: 0 };
  const fm = FRAME_MATERIALS[material];
  for (const k of Object.keys(lengthMm) as ProfileKey[]) {
    if (lengthMm[k] <= 0) continue;
    bars[k] = Math.ceil((lengthMm[k] / 1000) * (1 + WASTE) / (BAR_LEN_MM / 1000));
    barPrice[k] = fm.bars[k];
  }
  const cornerBrackets = blocks.filter((b) => b.corner).length * SIDES;
  return {
    blocks, members, joints, lengthMm, bars, barPrice,
    barCount: (Object.keys(bars) as ProfileKey[]).reduce((a, k) => a + bars[k], 0),
    totalLengthM: (Object.keys(lengthMm) as ProfileKey[]).reduce((a, k) => a + lengthMm[k], 0) / 1000,
    cornerBrackets, material,
  };
}
