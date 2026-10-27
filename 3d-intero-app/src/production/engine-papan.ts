// 3D Intero — Mesin Produksi METODE A: Papan (plywood) + HPL. Menghasilkan daftar panel per kabinet.
import type { Item, ProjectSettings } from '../types';
import type { Edges, Panel, PanelBox, PanelKind, PanelMaterial } from './types';

const T = 18, GAP = 2, BK = 5;
const THK: Record<PanelMaterial, number> = { ply18: 18, ply15: 15, hdf5: 5, acp4: 4 };
const ALL: Edges = { t: true, b: true, l: true, r: true };
const NONE: Edges = { t: false, b: false, l: false, r: false };
const FRONT_W: Edges = { ...NONE, t: true }; // tepi depan sepanjang lebar panel
const FRONT_H: Edges = { ...NONE, r: true }; // tepi depan sepanjang tinggi panel
const bx = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): PanelBox => ({ cx, cy, cz, sx, sy, sz });

class Collector {
  panels: Panel[] = [];
  constructor(private item: Item, private tag: string) {}
  add(code: string, label: string, kind: PanelKind, w: number, h: number, material: PanelMaterial, o: Partial<Panel> = {}) {
    if (w < 1 || h < 1) return;
    this.panels.push({
      id: `${this.tag}-${code}`, code, itemId: this.item.id, itemTag: this.tag, itemName: this.item.name, label, kind,
      w: Math.round(w), h: Math.round(h), t: THK[material], material, qty: 1, grain: 'none', hplFaces: 0, edges: NONE, ...o,
    });
  }
}

interface CarcassOpts { W: number; D: number; y0: number; H: number; top: 'full' | 'rails' | 'none'; bottom?: boolean; back?: boolean; shelves?: number; sideHpl: number; px?: string }
function carcass(c: Collector, o: CarcassOpts) {
  const { W, D, y0, H } = o; const iw = W - 2 * T; const px = o.px ?? '';
  c.add(`${px}SL`, 'Side Kiri', 'side', D, H, 'ply18', { grain: 'h', hplFaces: o.sideHpl, edges: FRONT_H, box: bx(-W / 2 + T / 2, y0 + H / 2, 0, T, H, D) });
  c.add(`${px}SR`, 'Side Kanan', 'side', D, H, 'ply18', { grain: 'h', hplFaces: o.sideHpl, edges: FRONT_H, box: bx(W / 2 - T / 2, y0 + H / 2, 0, T, H, D) });
  if (o.bottom !== false) c.add(`${px}BT`, 'Bottom', 'bottom', iw, D - BK, 'ply18', { edges: FRONT_W, box: bx(0, y0 + T / 2, BK / 2, iw, T, D - BK) });
  if (o.top === 'full') c.add(`${px}TP`, 'Top', 'top', iw, D - BK, 'ply18', { edges: FRONT_W, box: bx(0, y0 + H - T / 2, BK / 2, iw, T, D - BK) });
  if (o.top === 'rails') {
    c.add(`${px}TR1`, 'Rel Atas Depan', 'top', iw, 100, 'ply18', { edges: FRONT_W, box: bx(0, y0 + H - T / 2, D / 2 - 50, iw, T, 100) });
    c.add(`${px}TR2`, 'Rel Atas Belakang', 'top', iw, 100, 'ply18', { box: bx(0, y0 + H - T / 2, -D / 2 + BK + 50, iw, T, 100) });
  }
  if (o.back !== false) { const bh = H - (o.top === 'full' ? 2 * T : T); c.add(`${px}BK`, 'Back Panel', 'back', iw, bh, 'hdf5', { box: bx(0, y0 + H / 2, -D / 2 + BK / 2, iw, bh, BK) }); }
  const n = o.shelves ?? 0;
  for (let i = 0; i < n; i++) c.add(`${px}SH${i + 1}`, `Rak ${i + 1}`, 'shelf', iw - 2, D - 30 - BK, 'ply15', { edges: FRONT_W, box: bx(0, y0 + ((i + 1) * H) / (n + 1), BK / 2 - 5, iw - 2, 15, D - 30 - BK) });
}

function doorSet(c: Collector, o: { W: number; D: number; y0: number; frontH: number; doors: number; prefix?: string; lift?: boolean }) {
  const doorH = o.frontH - 2 * GAP;
  if (o.doors <= 0 || doorH < 40) return;
  const dw = o.doors === 2 ? (o.W - 3 * GAP) / 2 : o.W - 2 * GAP;
  const p = o.prefix ?? 'DR';
  for (let i = 0; i < o.doors; i++) {
    const cx = o.doors === 2 ? (i === 0 ? -o.W / 2 + GAP + dw / 2 : o.W / 2 - GAP - dw / 2) : 0;
    const label = o.lift ? 'Pintu Pull-up' : o.doors === 2 ? (i === 0 ? 'Pintu Kiri' : 'Pintu Kanan') : 'Pintu';
    c.add(`${p}${i + 1}`, label, 'door', dw, doorH, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(cx, o.y0 + GAP + doorH / 2, o.D / 2 + T / 2, dw, doorH, T) });
  }
}

/** Laci: mengembalikan tinggi depan yang tersisa untuk pintu. */
function drawerSet(c: Collector, o: { W: number; D: number; y0: number; frontH: number; doors: number; drawers: number }): number {
  let drawers = o.drawers;
  if (o.doors === 0 && drawers === 0) drawers = 3;
  if (drawers <= 0) return o.frontH;
  const heights: number[] = [];
  if (o.doors === 0) {
    if (drawers >= 3) { const first = Math.round(o.frontH * 0.22); heights.push(first); const rest = (o.frontH - first) / (drawers - 1); for (let i = 1; i < drawers; i++) heights.push(rest); }
    else for (let i = 0; i < drawers; i++) heights.push(o.frontH / drawers);
  } else for (let i = 0; i < drawers; i++) heights.push(Math.min(170, o.frontH / (drawers + 1)));
  let top = o.y0 + o.frontH;
  const iw = o.W - 2 * T - 50, id = o.D - 60;
  heights.forEach((dh, i) => {
    const yb = top - dh + GAP / 2; const fh = dh - GAP; const bh = Math.max(60, dh - 50); const n = i + 1;
    c.add(`DF${n}`, `Front Laci ${n}`, 'drawer', o.W - 2 * GAP, fh, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(0, yb + fh / 2, o.D / 2 + T / 2, o.W - 2 * GAP, fh, T) });
    c.add(`DS${n}L`, `Sisi Laci ${n} Kiri`, 'drawerbox', id, bh, 'ply15', { box: bx(-iw / 2 + 7.5, yb + 25 + bh / 2, o.D / 2 - 10 - id / 2, 15, bh, id) });
    c.add(`DS${n}R`, `Sisi Laci ${n} Kanan`, 'drawerbox', id, bh, 'ply15', { box: bx(iw / 2 - 7.5, yb + 25 + bh / 2, o.D / 2 - 10 - id / 2, 15, bh, id) });
    c.add(`DB${n}`, `Belakang Laci ${n}`, 'drawerbox', iw - 30, bh, 'ply15', { box: bx(0, yb + 25 + bh / 2, o.D / 2 - 10 - id + 7.5, iw - 30, bh, 15) });
    c.add(`DT${n}`, `Dasar Laci ${n}`, 'drawerbox', iw - 30, id, 'hdf5', { box: bx(0, yb + 25, o.D / 2 - 10 - id / 2, iw - 30, 5, id) });
    top -= dh;
  });
  return top - o.y0;
}

function toeKick(c: Collector, W: number, D: number, tk: number, hpl: number, withBack = false) {
  if (tk <= 0) return;
  c.add('TKF', 'Toe Kick Depan', 'toe', W, tk, 'ply18', { hplFaces: hpl, box: bx(0, tk / 2, D / 2 - 50, W, tk, T) });
  c.add('TKL', 'Toe Kick Kiri', 'toe', D - 50, tk, 'ply18', { box: bx(-W / 2 + T / 2, tk / 2, -25, T, tk, D - 50) });
  c.add('TKR', 'Toe Kick Kanan', 'toe', D - 50, tk, 'ply18', { box: bx(W / 2 - T / 2, tk / 2, -25, T, tk, D - 50) });
  if (withBack) c.add('TKB', 'Toe Kick Belakang', 'toe', W, tk, 'ply18', { box: bx(0, tk / 2, -D / 2 + 50, W, tk, T) });
}

const SLOT1_H = { magiccom: 330, dispenser: 580, oven: 340, shelf: 350 } as const;
const SLOT2_H = { oven: 340, microwave: 350, coffee: 480, shelf: 350, door: 0 } as const;

export function buildPapanPanels(item: Item, s: ProjectSettings, tag: string): Panel[] {
  const c = new Collector(item, tag);
  const { w: W, h, d: D } = item.dims; const cfg = item.config;
  const sideHpl = item.materials.sidesFollowDoor ? 1 : 0;
  const toeHpl = item.materials.toeKickFollowsDoor ? 1 : 0;
  const tkDefault = cfg.toeKickHeight ?? s.toeKick;
  switch (item.type) {
    case 'base': case 'sink_base': case 'cooktop_base': case 'drawer_base': case 'dishwasher': {
      const tk = tkDefault, bodyH = h - tk;
      toeKick(c, W, D, tk, toeHpl);
      if (item.type === 'dishwasher') {
        carcass(c, { W, D, y0: tk, H: bodyH, top: 'rails', sideHpl });
        c.add('FP', 'Panel Depan Dishwasher', 'door', W - 2 * GAP, bodyH - 60, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(0, tk + 30 + (bodyH - 60) / 2, D / 2 + T / 2, W - 2 * GAP, bodyH - 60, T) });
        break;
      }
      const doors = cfg.doorCount ?? (item.type === 'drawer_base' ? 0 : W > 500 ? 2 : 1);
      const drawers = item.type === 'sink_base' ? 0 : (cfg.drawerCount ?? (item.type === 'drawer_base' ? 3 : item.type === 'cooktop_base' ? 1 : 0));
      const open = !!cfg.openShelf;
      carcass(c, { W, D, y0: tk, H: bodyH, top: 'rails', sideHpl, shelves: open ? 1 : doors > 0 && bodyH > 500 ? 1 : 0 });
      if (!open) {
        const rem = drawerSet(c, { W, D, y0: tk, frontH: bodyH, doors, drawers });
        if (doors > 0) doorSet(c, { W, D, y0: tk, frontH: rem, doors });
      }
      break;
    }
    case 'wall': {
      const corniceH = cfg.cornice ? (cfg.corniceHeight ?? 50) : 0, cornW = cfg.corniceWidth ?? 40;
      const upperH = cfg.doubleStack ? Math.min(cfg.upperTierHeight ?? 350, h - corniceH - 300) : 0;
      const mainH = h - corniceH - upperH;
      const doors = cfg.doorCount ?? (W > 600 ? 2 : 1);
      const lift = cfg.doorType === 'liftup' || (cfg.doorType === undefined && !!cfg.liftUp);
      carcass(c, { W, D, y0: 0, H: mainH, top: 'full', sideHpl, shelves: mainH > 500 ? 1 : 0 });
      doorSet(c, { W, D, y0: 0, frontH: mainH, doors, prefix: lift ? 'DL' : 'DR', lift });
      if (upperH > 0) {
        carcass(c, { W, D, y0: mainH, H: upperH, top: 'full', sideHpl, px: 'U' });
        doorSet(c, { W, D, y0: mainH, frontH: upperH, doors, prefix: 'DU', lift: true });
      }
      if (corniceH > 0) {
        c.add('CNF', 'Cornice Depan', 'other', W + cornW, corniceH, 'ply18', { hplFaces: 1, box: bx(0, h - corniceH / 2, D / 2 + cornW / 4, W + cornW, corniceH, T) });
        c.add('CNL', 'Cornice Kiri', 'other', D + cornW, corniceH, 'ply18', { hplFaces: 1, box: bx(-W / 2 - cornW / 2, h - corniceH / 2, cornW / 4, T, corniceH, D + cornW) });
        c.add('CNR', 'Cornice Kanan', 'other', D + cornW, corniceH, 'ply18', { hplFaces: 1, box: bx(W / 2 + cornW / 2, h - corniceH / 2, cornW / 4, T, corniceH, D + cornW) });
      }
      break;
    }
    case 'tall': {
      const tk = tkDefault, bodyH = h - tk;
      toeKick(c, W, D, tk, toeHpl);
      carcass(c, { W, D, y0: tk, H: bodyH, top: 'full', sideHpl, shelves: Math.max(0, Math.floor((bodyH - 200) / 350)) });
      const split = Math.min(1250, bodyH * 0.55), doors = cfg.doorCount ?? (W > 600 ? 2 : 1);
      doorSet(c, { W, D, y0: tk, frontH: split, doors, prefix: 'DL' });
      doorSet(c, { W, D, y0: tk + split, frontH: bodyH - split, doors, prefix: 'DU' });
      break;
    }
    case 'hood': {
      const canopyH = Math.min(150, Math.max(40, cfg.hoodHeight ?? 70)), fillerH = h - canopyH;
      if (fillerH > 40) {
        carcass(c, { W, D, y0: canopyH, H: fillerH, top: 'full', sideHpl });
        doorSet(c, { W, D, y0: canopyH, frontH: fillerH, doors: W > 700 && fillerH - 2 * GAP > 120 ? 2 : 1, prefix: 'DF' });
      }
      break;
    }
    case 'fridge': {
      const fH = Math.min(cfg.fridgeH ?? 1750, h - 60), fillerY = fH + 40, fillerH = h - fillerY, iw = W - 2 * T;
      c.add('SL', 'Side Kiri Housing', 'side', D, h, 'ply18', { grain: 'h', hplFaces: sideHpl, edges: FRONT_H, box: bx(-W / 2 + T / 2, h / 2, 0, T, h, D) });
      c.add('SR', 'Side Kanan Housing', 'side', D, h, 'ply18', { grain: 'h', hplFaces: sideHpl, edges: FRONT_H, box: bx(W / 2 - T / 2, h / 2, 0, T, h, D) });
      c.add('TP', 'Top Housing', 'top', iw, D, 'ply18', { edges: FRONT_W, box: bx(0, h - T / 2, 0, iw, T, D) });
      c.add('BK', 'Back Housing', 'back', iw, h, 'hdf5', { box: bx(0, h / 2, -D / 2 + BK / 2, iw, h, BK) });
      if (fillerH > 60) {
        c.add('FB', 'Dasar Filler', 'bottom', iw, D, 'ply18', { edges: FRONT_W, box: bx(0, fillerY + T / 2, 0, iw, T, D) });
        doorSet(c, { W, D, y0: fillerY, frontH: fillerH, doors: fillerH > 150 && W > 650 ? 2 : 1, prefix: 'DF' });
      }
      break;
    }
    case 'electronic': {
      const tk = tkDefault; const iw = W - 2 * T;
      const slot1 = cfg.slot1 ?? 'magiccom', slot2 = cfg.slot2 ?? 'oven';
      const s1y = s.baseHeight, s1h = SLOT1_H[slot1], s2y = s1y + s1h + T, s2h = SLOT2_H[slot2];
      const topY = slot2 === 'door' ? s2y : s2y + s2h + T;
      toeKick(c, W, D, tk, toeHpl);
      carcass(c, { W, D, y0: tk, H: h - tk, top: 'full', sideHpl, shelves: 0 });
      const seps = slot1 === 'dispenser' ? [s1y + s1h] : [s1y, s1y + s1h];
      if (slot2 !== 'door') seps.push(s2y + s2h);
      seps.forEach((y, i) => c.add(`SP${i + 1}`, `Sekat ${i + 1}`, 'shelf', iw, D - BK, 'ply18', { edges: FRONT_W, box: bx(0, y + T / 2, BK / 2, iw, T, D - BK) }));
      const doors = W > 650 ? 2 : 1;
      if (slot1 !== 'dispenser') doorSet(c, { W, D, y0: tk, frontH: s1y - tk, doors, prefix: 'DL' });
      doorSet(c, { W, D, y0: topY, frontH: h - topY, doors, prefix: 'DU' });
      break;
    }
    case 'island': {
      const tk = tkDefault, bodyH = h - tk, iw = W - 2 * T;
      const n = Math.max(1, Math.min(4, cfg.islandDoorsPerSide ?? 2)), stools = cfg.stools ?? 0;
      toeKick(c, W, D, tk, toeHpl, true);
      carcass(c, { W, D, y0: tk, H: bodyH, top: 'rails', back: false, sideHpl });
      c.add('PT', 'Sekat Tengah', 'other', iw, bodyH, 'ply18', { box: bx(0, tk + bodyH / 2, 0, iw, bodyH, T) });
      const dw = (W - (n + 1) * GAP) / n, dh = bodyH - 2 * GAP;
      for (let i = 0; i < n; i++) {
        const cx = -W / 2 + GAP + dw / 2 + i * (dw + GAP);
        c.add(`DF${i + 1}`, `Pintu Depan ${i + 1}`, 'door', dw, dh, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(cx, tk + GAP + dh / 2, D / 2 + T / 2, dw, dh, T) });
        if (stools === 0) c.add(`DK${i + 1}`, `Pintu Belakang ${i + 1}`, 'door', dw, dh, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(cx, tk + GAP + dh / 2, -D / 2 - T / 2, dw, dh, T) });
      }
      if (stools > 0) c.add('BP', 'Panel Belakang (area kaki)', 'door', iw, bodyH, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(0, tk + bodyH / 2, -D / 2 + T / 2, iw, bodyH, T) });
      break;
    }
    case 'bar': {
      const overhang = Math.min(cfg.barOverhang ?? 300, D - 150), supportD = D - overhang, tk = s.toeKick, bodyH = h - 40 - tk, iw = W - 2 * T;
      const cz = -D / 2 + supportD / 2;
      c.add('SL', 'Side Kiri', 'side', supportD, bodyH, 'ply18', { grain: 'h', hplFaces: sideHpl, edges: FRONT_H, box: bx(-W / 2 + T / 2, tk + bodyH / 2, cz, T, bodyH, supportD) });
      c.add('SR', 'Side Kanan', 'side', supportD, bodyH, 'ply18', { grain: 'h', hplFaces: sideHpl, edges: FRONT_H, box: bx(W / 2 - T / 2, tk + bodyH / 2, cz, T, bodyH, supportD) });
      c.add('FP', 'Panel Depan', 'door', iw, bodyH, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(0, tk + bodyH / 2, -D / 2 + supportD - T / 2, iw, bodyH, T) });
      c.add('BP', 'Panel Belakang', 'door', iw, bodyH, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(0, tk + bodyH / 2, -D / 2 + T / 2, iw, bodyH, T) });
      c.add('TP', 'Top', 'top', iw, supportD, 'ply18', { edges: FRONT_W, box: bx(0, tk + bodyH - T / 2, cz, iw, T, supportD) });
      c.add('TKF', 'Toe Kick', 'toe', W, tk, 'ply18', { hplFaces: toeHpl, box: bx(0, tk / 2, -D / 2 + supportD - 50, W, tk, T) });
      break;
    }
    case 'corner_base': case 'corner_wall': {
      const isWall = item.type === 'corner_wall';
      const legA = W, legB = D, H = h, Dc = isWall ? s.wallDepth : 600;
      const tk = isWall ? 0 : tkDefault, bodyH = H - tk;
      const ox = -legA / 2, oz = -legB / 2;
      const plate = (code: string, label: string, kind: PanelKind, y: number, mat: PanelMaterial, th: number) => {
        c.add(`${code}1`, `${label} A`, kind, legA - T, Dc - BK, mat, { edges: FRONT_W, box: bx(ox + legA / 2, y, oz + Dc / 2, legA, th, Dc) });
        c.add(`${code}2`, `${label} B`, kind, Dc - T, legB - Dc, mat, { box: bx(ox + Dc / 2, y, oz + Dc + (legB - Dc) / 2, Dc, th, legB - Dc) });
      };
      plate('BT', 'Bottom', 'bottom', tk + T / 2, 'ply18', T);
      plate('TP', 'Top', 'top', tk + bodyH - T / 2, 'ply18', T);
      if (bodyH > 500) plate('SH', 'Rak L', 'shelf', tk + bodyH / 2, 'ply15', 15);
      c.add('BK1', 'Back A', 'back', legA, bodyH - 2 * T, 'hdf5', { box: bx(ox + legA / 2, tk + bodyH / 2, oz + BK / 2, legA, bodyH - 2 * T, BK) });
      c.add('BK2', 'Back B', 'back', legB, bodyH - 2 * T, 'hdf5', { box: bx(ox + BK / 2, tk + bodyH / 2, oz + legB / 2, BK, bodyH - 2 * T, legB) });
      c.add('SE1', 'Side Ujung A', 'side', Dc, bodyH, 'ply18', { grain: 'h', hplFaces: sideHpl, edges: FRONT_H, box: bx(ox + legA - T / 2, tk + bodyH / 2, oz + Dc / 2, T, bodyH, Dc) });
      c.add('SE2', 'Side Ujung B', 'side', Dc, bodyH, 'ply18', { grain: 'h', hplFaces: sideHpl, edges: FRONT_H, box: bx(ox + Dc / 2, tk + bodyH / 2, oz + legB - T / 2, Dc, bodyH, T) });
      const w1 = legA - Dc - 2 * GAP, w2 = legB - Dc - 2 * GAP, doorH = bodyH - 2 * GAP;
      const style = cfg.cornerDoorStyle ?? 'bifold';
      if (w1 > 80) c.add('DRA', 'Pintu Corner A', 'door', w1, doorH, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(ox + legA - GAP - w1 / 2, tk + GAP + doorH / 2, oz + Dc + T / 2, w1, doorH, T) });
      if (style !== 'one' && w2 > 80) c.add('DRB', 'Pintu Corner B', 'door', w2, doorH, 'ply18', { grain: 'h', hplFaces: 2, edges: ALL, box: bx(ox + Dc + T / 2, tk + GAP + doorH / 2, oz + legB - GAP - w2 / 2, T, doorH, w2) });
      if (!isWall && tk > 0) {
        c.add('TK1', 'Toe Kick A', 'toe', legA, tk, 'ply18', { hplFaces: toeHpl, box: bx(ox + legA / 2, tk / 2, oz + Dc - 50, legA, tk, T) });
        c.add('TK2', 'Toe Kick B', 'toe', legB - Dc, tk, 'ply18', { hplFaces: toeHpl, box: bx(ox + Dc - 50, tk / 2, oz + Dc + (legB - Dc) / 2, T, tk, legB - Dc) });
      }
      break;
    }
    default: break; // custom: tidak ada panel otomatis
  }
  return c.panels;
}
