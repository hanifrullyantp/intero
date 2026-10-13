import type { FurnitureType, HoodType, Item, ItemConfig, KitchenLayout, Project, ProjectMaterials, Room, Wall } from '../models/types';
import { createItem, uid } from '../config/library';
import { KITCHEN_STANDARDS } from '../config/standards';
import { HOOD_TYPES } from '../config/appliances';
import { placeOnWall, r1, wallLength } from '../utils/geometry';
import { syncCornerDepths } from './kitchenRules';

export interface WizardOptions {
  name: string;
  type: FurnitureType;
  layout: KitchenLayout;
  sides: number[];
  ceilingHeight: number;
  includeBase: boolean;
  includeWall: boolean;
  includeTall: boolean;
  includeFridge: boolean;
  hoodType: HoodType;
  materials: ProjectMaterials;
}

export const DEFAULT_MATERIALS: ProjectMaterials = {
  board: 'ply18',
  backBoard: 'ply4',
  finishing: 'hpl',
  carcassColor: 'white',
  doorColor: 'white',
  finish: 'matte',
  countertop: 'granite',
  countertopColor: 'black_galaxy',
  countertopThickness: 2,
  edgeProfile: 'straight',
  backsplash: true,
  backsplashHeight: 50,
  handleType: 'bar',
  handleFinish: 'stainless',
  hinge: 'soft_close',
  slide: 'ball_bearing',
  sideFollowDoor: true,
  toeFollowDoor: true,
  crown: false,
  crownHeight: 6,
  crownStyle: 'flat',
};

const BASE = KITCHEN_STANDARDS.base_cabinet;
const WALLC = KITCHEN_STANDARDS.wall_cabinet;

function wall(id: string, label: string, x1: number, y1: number, x2: number, y2: number, nx: number, ny: number, rotation: Wall['rotation'], height: number, virtual = false): Wall {
  return { id, label, x1, y1, x2, y2, nx, ny, rotation, height, virtual };
}

export function buildRoom(type: FurnitureType, layout: KitchenLayout, sides: number[], ceiling: number): Room {
  const A = Math.max(60, sides[0] || 300);
  const Bl = Math.max(60, sides[1] || 200);
  const C = Math.max(60, sides[2] || 200);
  if (type !== 'kitchen') {
    const depth = type === 'wardrobe' ? 250 : 300;
    return { width: A, depth, ceilingHeight: ceiling, walls: [wall('A', 'Wall A', 0, 0, A, 0, 0, 1, 0, ceiling)] };
  }
  switch (layout) {
    case 'L':
      return { width: A, depth: Math.max(Bl, 250), ceilingHeight: ceiling, walls: [wall('A', 'Back Wall (A)', 0, 0, A, 0, 0, 1, 0, ceiling), wall('B', 'Left Wall (B)', 0, 0, 0, Bl, 1, 0, 270, ceiling)] };
    case 'U':
      return {
        width: A,
        depth: Math.max(Bl, C, 250),
        ceilingHeight: ceiling,
        walls: [wall('A', 'Back Wall (A)', 0, 0, A, 0, 0, 1, 0, ceiling), wall('B', 'Left Wall (B)', 0, 0, 0, Bl, 1, 0, 270, ceiling), wall('C', 'Right Wall (C)', A, 0, A, C, -1, 0, 90, ceiling)],
      };
    case 'parallel': {
      const aisle = Math.max(90, sides[2] || 120);
      const depth = 55 + aisle + 55;
      const W = Math.max(A, Bl);
      return { width: W, depth, ceilingHeight: ceiling, walls: [wall('A', 'Back Wall (A)', 0, 0, A, 0, 0, 1, 0, ceiling), wall('B', 'Front Wall (B)', 0, depth, Bl, depth, 0, -1, 180, ceiling)] };
    }
    case 'island': {
      const island = Math.min(A, Math.max(90, sides[1] || 180));
      const aisle = Math.max(90, sides[2] || 110);
      const depth = 55 + aisle + 90 + 120;
      const x0 = r1((A - island) / 2);
      const yIsland = 55 + aisle + 90;
      return {
        width: A,
        depth,
        ceilingHeight: ceiling,
        walls: [wall('A', 'Back Wall (A)', 0, 0, A, 0, 0, 1, 0, ceiling), wall('I', 'Island', x0, yIsland, x0 + island, yIsland, 0, -1, 180, 0, true)],
      };
    }
    default:
      return { width: A, depth: 250, ceilingHeight: ceiling, walls: [wall('A', 'Wall A', 0, 0, A, 0, 0, 1, 0, ceiling)] };
  }
}

// ---------- helpers ----------
function place(entryId: string, w: Wall, t: number, over: Partial<Item> = {}, cfg: Partial<ItemConfig> = {}): Item {
  const it = createItem(entryId, over, cfg);
  const p = placeOnWall(w, t, it.width, it.depth);
  it.x = p.x;
  it.y = p.y;
  it.rotation = p.rotation;
  it.wallId = w.id;
  return it;
}

/** split a run length into sensible standard cabinet widths */
export function fillWidths(len: number): number[] {
  if (len < 2) return [];
  if (len < 30) return [r1(len)];
  const count = Math.floor(len / 60);
  const rem = r1(len - count * 60);
  const widths: number[] = Array(count).fill(60);
  if (rem >= 30) widths.push(rem);
  else if (rem > 0 && count > 0) widths[widths.length - 1] = r1(60 + rem);
  else if (rem > 0) widths.push(rem);
  // merge pairs of 60 into 80+40 occasionally for variety when 3+ cabinets
  return widths.map(r1);
}

function baseTypeFor(w: number, idx: number): string {
  if (w < 20) return 'acc_filler';
  if (w < 35) return 'base_pullout';
  if (w >= 70) return idx % 2 === 0 ? 'base_double' : 'base_drawer_3';
  return idx % 3 === 0 ? 'base_drawer_3' : idx % 3 === 1 ? 'base_single' : 'base_combo';
}

function wallTypeFor(w: number): string {
  if (w < 30) return 'acc_filler';
  return w >= 70 ? 'wall_double' : 'wall_single';
}

interface Fixed {
  t: number;
  w: number;
  entry: string;
  cfg?: Partial<ItemConfig>;
  over?: Partial<Item>;
}

function fillWallRun(w: Wall, from: number, to: number, fixed: Fixed[], out: Item[], includeBase: boolean) {
  const sorted = [...fixed].sort((a, b) => a.t - b.t);
  let cursor = from;
  let idx = 0;
  const gaps: [number, number][] = [];
  for (const f of sorted) {
    if (f.t - cursor > 1) gaps.push([cursor, f.t]);
    cursor = f.t + f.w;
  }
  if (to - cursor > 1) gaps.push([cursor, to]);
  for (const f of sorted) {
    if (includeBase || f.entry.startsWith('tall') || f.entry.startsWith('app')) out.push(place(f.entry, w, f.t, { width: f.w, ...(f.over ?? {}) }, f.cfg));
  }
  if (!includeBase) return;
  for (const [g0, g1] of gaps) {
    let t = g0;
    for (const bw of fillWidths(g1 - g0)) {
      const entry = baseTypeFor(bw, idx++);
      if (entry === 'acc_filler') out.push(place('acc_filler', w, t, { width: bw }));
      else out.push(place(entry, w, t, { width: bw }, { opening: idx % 2 ? 'left' : 'right' }));
      t = r1(t + bw);
    }
  }
}

function hoodDims(type: HoodType) {
  return HOOD_TYPES.find((h) => h.id === type) ?? HOOD_TYPES[0];
}

// ---------- kitchen ----------
function generateKitchen(room: Room, opt: WizardOptions): Item[] {
  const items: Item[] = [];
  const walls = room.walls;
  const A = walls.find((w) => w.id === 'A')!;
  const Bw = walls.find((w) => w.id === 'B');
  const Cw = walls.find((w) => w.id === 'C');
  const Iw = walls.find((w) => w.id === 'I');
  const layout = opt.layout;
  const LA = wallLength(A);
  const cornerL = layout === 'L' || layout === 'U';
  const cornerR = layout === 'U';
  const ct = opt.materials.countertopThickness;

  // corners
  if (cornerL && opt.includeBase) items.push(place('base_corner_l', A, 0, {}, { opening: 'left' }));
  if (cornerR && opt.includeBase) items.push(place('base_corner_l', A, LA - 90, {}, { opening: 'right' }));

  const rangeA: [number, number] = [cornerL ? 90 : 0, LA - (cornerR ? 90 : 0)];
  const rangeB: [number, number] | null = Bw ? [90, wallLength(Bw)] : null;
  const rangeC: [number, number] | null = Cw ? [90, wallLength(Cw)] : null;

  const fixedA: Fixed[] = [];
  const fixedB: Fixed[] = [];
  const fixedC: Fixed[] = [];
  const fixedI: Fixed[] = [];

  const usableA = rangeA[1] - rangeA[0];
  const usableB = rangeB ? rangeB[1] - rangeB[0] : 0;
  const usableC = rangeC ? rangeC[1] - rangeC[0] : 0;

  const sinkW = usableA >= 240 ? 80 : 60;
  const stoveW = 60;
  const fridgeW = 65;

  let sinkWall = A;
  let sinkT = 0;
  let stoveWall = A;
  let stoveT = 0;
  let fridgeWall: Wall | null = null;
  let fridgeT = 0;

  if (layout === 'I' || layout === 'parallel') {
    // sink + stove on wall A; fridge at the right end if space allows
    const needFridge = opt.includeFridge && usableA >= sinkW + stoveW + fridgeW + 120;
    if (needFridge) {
      fridgeWall = A;
      fridgeT = rangeA[1] - fridgeW;
    }
    const end = needFridge ? fridgeT : rangeA[1];
    const span = end - rangeA[0];
    sinkT = r1(rangeA[0] + Math.max(0, span * 0.28 - sinkW / 2));
    stoveT = r1(Math.min(end - stoveW, Math.max(sinkT + sinkW + 60, rangeA[0] + span * 0.72 - stoveW / 2)));
    if (stoveT < sinkT + sinkW) stoveT = sinkT + sinkW;
    if (layout === 'parallel' && Bw) {
      // move fridge & stove to wall B when it exists
      stoveWall = Bw;
      const LB = wallLength(Bw);
      stoveT = r1(Math.max(0, LB * 0.5 - stoveW / 2));
      if (opt.includeFridge && LB >= stoveW + fridgeW + 60) {
        fridgeWall = Bw;
        fridgeT = LB - fridgeW;
      }
      sinkT = r1(rangeA[0] + Math.max(0, usableA * 0.5 - sinkW / 2));
    }
  } else if (layout === 'island') {
    sinkT = r1(rangeA[0] + Math.max(0, usableA * 0.45 - sinkW / 2));
    if (opt.includeFridge && usableA >= sinkW + fridgeW + 120) {
      fridgeWall = A;
      fridgeT = rangeA[1] - fridgeW;
    }
    if (Iw) {
      stoveWall = Iw;
      stoveT = r1(Math.max(0, wallLength(Iw) / 2 - stoveW / 2));
    }
  } else if (layout === 'L' && Bw && rangeB) {
    // longest usable range gets the sink; the other gets stove; fridge at end of wall B
    const sinkOnA = usableA >= usableB;
    const fridgeOnB = opt.includeFridge && usableB >= stoveW + fridgeW + 60;
    if (fridgeOnB) {
      fridgeWall = Bw;
      fridgeT = rangeB[1] - fridgeW;
    } else if (opt.includeFridge && usableA >= sinkW + fridgeW + 100) {
      fridgeWall = A;
      fridgeT = rangeA[1] - fridgeW;
    }
    const endA = fridgeWall === A ? fridgeT : rangeA[1];
    const endB = fridgeWall === Bw ? fridgeT : rangeB[1];
    if (sinkOnA) {
      sinkWall = A;
      sinkT = r1(rangeA[0] + Math.max(0, (endA - rangeA[0]) * 0.5 - sinkW / 2));
      stoveWall = Bw;
      stoveT = r1(rangeB[0] + Math.max(0, (endB - rangeB[0]) * 0.5 - stoveW / 2));
    } else {
      sinkWall = Bw;
      sinkT = r1(rangeB[0] + Math.max(0, (endB - rangeB[0]) * 0.5 - sinkW / 2));
      stoveWall = A;
      stoveT = r1(rangeA[0] + Math.max(0, (endA - rangeA[0]) * 0.5 - stoveW / 2));
    }
  } else if (layout === 'U' && Bw && Cw && rangeB && rangeC) {
    sinkWall = A;
    sinkT = r1(rangeA[0] + Math.max(0, usableA * 0.5 - sinkW / 2));
    stoveWall = Bw;
    stoveT = r1(rangeB[0] + Math.max(0, usableB * 0.5 - stoveW / 2));
    if (opt.includeFridge && usableC >= fridgeW + 30) {
      fridgeWall = Cw;
      fridgeT = rangeC[1] - fridgeW;
    }
  }

  const fixedFor = (w: Wall) => (w === A ? fixedA : w === Bw ? fixedB : w === Cw ? fixedC : fixedI);
  fixedFor(sinkWall).push({ t: sinkT, w: sinkW, entry: 'base_sink' });
  fixedFor(stoveWall).push({ t: stoveT, w: stoveW, entry: 'base_stove' });
  if (fridgeWall && opt.includeTall) fixedFor(fridgeWall).push({ t: fridgeT, w: fridgeW, entry: 'tall_fridge', over: { height: Math.min(210, room.ceilingHeight - 5) } });
  else if (fridgeWall) fixedFor(fridgeWall).push({ t: fridgeT, w: 60, entry: 'app_fridge' });

  fillWallRun(A, rangeA[0], rangeA[1], fixedA, items, opt.includeBase);
  if (Bw && rangeB) fillWallRun(Bw, rangeB[0], rangeB[1], fixedB, items, opt.includeBase);
  if (Cw && rangeC) fillWallRun(Cw, rangeC[0], rangeC[1], fixedC, items, opt.includeBase);
  if (Iw) fillWallRun(Iw, 0, wallLength(Iw), fixedI, items, opt.includeBase);

  // appliances on cabinets
  const sinkCab = items.find((i) => i.subtype === 'base_sink');
  if (sinkCab) {
    const sinkEntry = sinkW >= 80 ? 'app_sink_double' : 'app_sink_single';
    const w = walls.find((x) => x.id === sinkCab.wallId)!;
    const s = createItem(sinkEntry);
    const sp = place(sinkEntry, w, sinkT + (sinkW - s.width) / 2, { elevation: sinkCab.elevation + sinkCab.height, height: 20 });
    // pull sink forward to centre of worktop
    const off = (sinkCab.depth - s.depth) / 2;
    if (w.rotation === 0) sp.y = r1(sp.y + off);
    else if (w.rotation === 180) sp.y = r1(sp.y - off);
    else if (w.rotation === 270) sp.x = r1(sp.x + off);
    else sp.x = r1(sp.x - off);
    items.push(sp);
  }
  const stoveCab = items.find((i) => i.subtype === 'base_stove');
  if (stoveCab) {
    const w = walls.find((x) => x.id === stoveCab.wallId)!;
    const ck = place('app_cooktop_4', w, stoveT, { elevation: stoveCab.elevation + stoveCab.height + ct });
    const off = (stoveCab.depth - ck.depth) / 2;
    if (w.rotation === 0) ck.y = r1(ck.y + off);
    else if (w.rotation === 180) ck.y = r1(ck.y - off);
    else if (w.rotation === 270) ck.x = r1(ck.x + off);
    else ck.x = r1(ck.x - off);
    items.push(ck);
    // hood
    const hType: HoodType = w.virtual ? 'island' : opt.hoodType;
    const hd = hoodDims(hType);
    const hoodElev = r1(ck.elevation + ck.height + 65);
    const hoodEntry = hType === 'pyramid' ? 'app_hood_pyramid' : hType === 't_shape' ? 'app_hood_t' : 'app_hood_slim';
    const hood = place(hoodEntry, w, stoveT, { width: stoveW, depth: hd.depth, height: hd.height, elevation: hoodElev }, { hoodType: hType, distanceFromCooktop: 65, fuel: 'gas' });
    items.push(hood);
    // wall cabinets on top of hood
    const top = WALLC.distance_from_floor + WALLC.default_height;
    if (opt.includeWall && !w.virtual && top - (hoodElev + hd.height) >= 15) {
      items.push(place('wall_hood', w, stoveT, { width: stoveW, elevation: r1(hoodElev + hd.height), height: r1(top - hoodElev - hd.height) }));
    }
  }

  // wall cabinets matching base run
  if (opt.includeWall) {
    const wallElev = WALLC.distance_from_floor;
    const wallH = Math.min(WALLC.default_height, room.ceilingHeight - wallElev - 5);
    if (cornerL) items.push(place('wall_corner', A, 0, { elevation: wallElev, height: wallH }, { opening: 'left' }));
    if (cornerR) items.push(place('wall_corner', A, LA - 60, { elevation: wallElev, height: wallH }, { opening: 'right' }));
    const basesOnWalls = items.filter((i) => i.kind === 'cabinet' && i.category === 'base' && !i.subtype.includes('corner') && i.subtype !== 'base_stove');
    for (const b of basesOnWalls) {
      const w = walls.find((x) => x.id === b.wallId);
      if (!w || w.virtual) continue;
      const corner0 = cornerL && (w.id === 'A' || w.id === 'B') ? 60 : 0;
      const cornerEnd = cornerR && w.id === 'A' ? 60 : cornerR && w.id === 'C' ? 60 : 0;
      const L = wallLength(w);
      // offset along wall from footprint
      const t = w.rotation === 0 ? b.x - w.x1 : w.rotation === 270 ? b.y - w.y1 : w.rotation === 90 ? b.y - w.y1 : b.x - w.x1;
      let t0 = t;
      let wdt = b.width;
      // corner wall cabinets are 60 while base corner is 90 → extend first wall cabinet
      if (corner0 && Math.abs(t - 90) < 0.5) {
        t0 = 60;
        wdt = b.width + 30;
      }
      if (cornerEnd && Math.abs(t + b.width - (L - 90)) < 0.5) wdt = b.width + 30;
      if (w.id === 'C' && cornerR && Math.abs(t - 90) < 0.5) {
        t0 = 60;
        wdt = b.width + 30;
      }
      const entry = wallTypeFor(wdt);
      if (entry === 'acc_filler') continue;
      items.push(place(entry, w, t0, { width: wdt, elevation: wallElev, height: wallH }, { opening: b.config.opening }));
    }
  }
  return items;
}

// ---------- other furniture types ----------
function generateTV(room: Room, opt: WizardOptions): Item[] {
  const A = room.walls[0];
  const L = wallLength(A);
  const items: Item[] = [];
  const consoleW = Math.min(L, 240);
  const t0 = r1((L - consoleW) / 2);
  items.push(place('tv_console', A, t0, { width: consoleW, height: 45, depth: 40 }));
  const tv = createItem('acc_tv');
  items.push(place('acc_tv', A, r1(t0 + (consoleW - tv.width) / 2), { elevation: 95 }));
  if (opt.includeWall) {
    const side = Math.min(40, Math.max(30, (consoleW - tv.width - 20) / 2));
    items.push(place('wall_single', A, t0, { width: side, height: 130, elevation: 90 }, { opening: 'left', shelves: 3 }));
    items.push(place('wall_single', A, r1(t0 + consoleW - side), { width: side, height: 130, elevation: 90 }, { opening: 'right', shelves: 3 }));
    items.push(place('wall_flip', A, r1(t0 + side), { width: r1(consoleW - 2 * side), height: 35, elevation: 185 }));
  }
  return items;
}

function generateWardrobe(room: Room, opt: WizardOptions): Item[] {
  const A = room.walls[0];
  const L = wallLength(A);
  const items: Item[] = [];
  const h = Math.min(240, room.ceilingHeight - 5);
  const n = Math.max(1, Math.round(L / 100));
  const mw = r1(L / n);
  for (let i = 0; i < n; i++) {
    const drawers = i % 2 === 1 ? 2 : 0;
    items.push(place('tall_wardrobe', A, r1(i * mw), { width: mw, height: h, depth: 60 }, { drawers, shelves: drawers ? 3 : 1, accessories: drawers ? [] : ['hanging_rod'] }));
  }
  void opt;
  return items;
}

function generateBookshelf(room: Room): Item[] {
  const A = room.walls[0];
  const L = wallLength(A);
  const items: Item[] = [];
  const h = Math.min(220, room.ceilingHeight - 10);
  const n = Math.max(1, Math.round(L / 80));
  const mw = r1(L / n);
  for (let i = 0; i < n; i++) items.push(place('tall_bookshelf', A, r1(i * mw), { width: mw, height: h, depth: 35 }, { shelves: i % 2 ? 5 : 6 }));
  return items;
}

function generateStorage(room: Room, opt: WizardOptions): Item[] {
  const A = room.walls[0];
  const L = wallLength(A);
  const items: Item[] = [];
  fillWallRun(A, 0, L, [], items, true);
  if (opt.includeWall) {
    for (const b of [...items]) {
      if (b.kind !== 'cabinet') continue;
      items.push(place(wallTypeFor(b.width), A, b.x, { width: b.width, elevation: WALLC.distance_from_floor }));
    }
  }
  return items;
}

export function generateProject(opt: WizardOptions): Project {
  const room = buildRoom(opt.type, opt.layout, opt.sides, opt.ceilingHeight);
  let items: Item[] = [];
  switch (opt.type) {
    case 'kitchen':
      items = generateKitchen(room, opt);
      break;
    case 'tv':
      items = generateTV(room, opt);
      break;
    case 'wardrobe':
      items = generateWardrobe(room, opt);
      break;
    case 'bookshelf':
      items = generateBookshelf(room);
      break;
    case 'storage':
      items = generateStorage(room, opt);
      break;
    default:
      items = [];
  }
  const now = new Date().toISOString();
  items = syncCornerDepths(items); // corner arms flush with the base run
  return {
    id: uid('prj'),
    name: opt.name || 'Untitled Project',
    type: opt.type,
    layout: opt.layout,
    room,
    items,
    materials: { ...DEFAULT_MATERIALS, ...opt.materials },
    settings: { kerf: 3, laborRate: 1500000, markup: 20, unit: 'cm', gridSize: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

export { BASE as BASE_STD };
