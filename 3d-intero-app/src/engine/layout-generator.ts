// 3D Intero — Magic Generator: auto-layout dari input wizard (bentuk, posisi appliance cm dari sudut, material)
import type { Accessory, ItemConfig, ItemType, Materials, ProjectSettings, Wall, WizardInput } from '../types';
import type { NewItemInput } from '../store';
import { makeRoomWalls, wallJunctions, wallVec } from './walls';
import { STYLE_PRESETS } from '../lib/constants';
import { uid } from '../lib/utils';

const CORNER_BASE_LEG = 900, CORNER_WALL_LEG = 600;

interface Fixed { type: ItemType; w: number; pos: number; config: ItemConfig; name?: string }

function fillWidths(gap: number): number[] {
  const out: number[] = [];
  let rem = gap;
  const cands = [800, 600, 400];
  while (rem >= 300) {
    const c = cands.find((c) => c <= rem && (rem - c === 0 || rem - c >= 300));
    if (!c) break;
    out.push(c); rem -= c;
  }
  if (rem > 0) {
    if (out.length) out[out.length - 1] += rem;
    else if (rem >= 150) out.push(rem);
  }
  return out;
}

export function generateLayout(input: WizardInput, settings: ProjectSettings): { walls: Wall[]; items: NewItemInput[]; countertop: ProjectSettings['countertop']['type'] } {
  const lens = { left: input.lengths.left * 10, back: input.lengths.back * 10, right: input.lengths.right * 10, front: input.lengths.front * 10 };
  const walls = makeRoomWalls(input.shape, lens);
  const style = input.style ? STYLE_PRESETS.find((s) => s.id === input.style) : null;
  const mat: Partial<Materials> = style
    ? { doorMaterial: style.doorMaterial, doorColor: style.doorColor, bodyFollowsDoor: style.bodyFollowsDoor, bodyColor: style.bodyColor, handleType: style.handleType, handleColor: style.handleColor }
    : { doorMaterial: input.material.doorMaterial, doorColor: input.material.doorColor, bodyFollowsDoor: input.material.bodyFollowsDoor, bodyColor: input.material.bodyColor, handleType: input.material.handleType, handleColor: input.material.handleColor };
  const ledOn = style ? style.led : input.material.led;
  const countertop = style ? style.countertop : input.material.countertop;
  const items: NewItemInput[] = [];
  const opt = input.options;

  for (const wall of walls) {
    const v = wallVec(wall);
    const j = wallJunctions(walls, wall);
    const startReserve = j.atStart ? CORNER_BASE_LEG : 0;
    const endReserve = j.atEnd ? CORNER_BASE_LEG : 0;
    const usableEnd = v.length - endReserve;

    // Appliance tetap di dinding ini
    const fixed: Fixed[] = [];
    const push = (a: { enabled: boolean; wallId: string; fromCorner: number }, f: Omit<Fixed, 'pos'>) => {
      if (!a.enabled || a.wallId !== wall.id) return;
      fixed.push({ ...f, pos: a.fromCorner * 10 });
    };
    push(input.sink, { type: 'sink_base', w: 800, config: { doorCount: 2, leftAccessory: opt.dishRack ? 'dish_rack' : 'shelf', rightAccessory: 'trash_bin' }, name: 'Sink Cabinet 80cm' });
    push(input.cooktop, { type: 'cooktop_base', w: opt.gasRack ? 800 : 600, config: { doorCount: 2, drawerCount: 1, rightAccessory: opt.gasRack ? 'gas_rack' : 'shelf', gasType: '12kg' }, name: 'Cooktop Cabinet' });
    push(input.fridge, { type: 'fridge', w: 940, config: { fridgeType: 'sbs', fridgeW: 900, fridgeH: 1750, fridgeD: 650 }, name: 'Kulkas Side-by-Side' });
    push(input.electronic, { type: 'electronic', w: 600, config: { slot1: opt.dispenser ? 'dispenser' : opt.magiccom ? 'magiccom' : 'oven', slot2: opt.microwave ? 'microwave' : 'oven', electronicPreset: 'custom' }, name: 'Electronic Cabinet' });
    fixed.sort((a, b) => a.pos - b.pos);
    // Clamp & resolve overlap
    let limit = usableEnd;
    for (let i = fixed.length - 1; i >= 0; i--) { fixed[i].pos = Math.min(fixed[i].pos, limit - fixed[i].w); limit = fixed[i].pos; }
    let cursor = startReserve;
    for (const f of fixed) { f.pos = Math.max(cursor, f.pos); cursor = f.pos + f.w; }
    // Susun urutan base row: isi gap dengan base cabinet
    const seq: { type: ItemType; w: number; config: ItemConfig; name?: string }[] = [];
    let at = startReserve;
    let spiceDone = !opt.spiceRack;
    const addFill = (gap: number, nearCooktop: boolean) => {
      for (const w of fillWidths(gap)) {
        const cfg: ItemConfig = { doorCount: w <= 450 ? 1 : 2, drawerCount: 0 };
        if (!spiceDone && nearCooktop) { cfg.leftAccessory = 'spice_rack'; cfg.spiceWidth = w <= 450 ? 150 : 200; spiceDone = true; }
        seq.push({ type: w <= 450 && Math.random() > 0.5 ? 'base' : 'base', w, config: cfg });
      }
    };
    fixed.forEach((f, i) => {
      if (f.pos - at >= 150) addFill(f.pos - at, f.type === 'cooktop_base' || fixed[i - 1]?.type === 'cooktop_base');
      seq.push({ type: f.type, w: f.w, config: f.config, name: f.name });
      at = f.pos + f.w;
    });
    if (usableEnd - at >= 150) addFill(usableEnd - at, fixed[fixed.length - 1]?.type === 'cooktop_base');
    if (!seq.length && usableEnd - startReserve >= 300) addFill(usableEnd - startReserve, false);

    // Emit: corner (jika junction di start) + base + wall child
    let order = 0;
    const ledCfg = ledOn ? { underCabinet: true } : {};
    if (j.atStart) {
      const cid = uid('CB');
      items.push({ id: cid, type: 'corner_base', dims: { w: CORNER_BASE_LEG, h: settings.baseHeight, d: CORNER_BASE_LEG }, name: 'Corner Base L', wallId: wall.id, orderIndex: order++, materials: mat, config: { cornerDoorStyle: 'bifold', lazySusan: true, cornerOrientation: 'auto' } });
      items.push({ id: uid('CW'), type: 'corner_wall', dims: { w: CORNER_WALL_LEG, h: 700, d: CORNER_WALL_LEG }, name: 'Corner Wall L', wallId: wall.id, orderIndex: order++, materials: mat, config: { cornerDoorStyle: 'bifold', cornerOrientation: 'auto', parentId: cid }, led: ledCfg });
    }
    seq.forEach((s, idx) => {
      const id = uid('BC');
      const isTall = s.type === 'fridge' || s.type === 'electronic' || s.type === 'tall';
      items.push({ id, type: s.type, dims: { w: s.w, h: isTall ? settings.globalCabinetHeight : settings.baseHeight, d: 600 }, name: s.name, wallId: wall.id, orderIndex: order++, materials: mat, config: s.config });
      if (isTall) return;
      let ww = s.w;
      if (j.atStart && idx === 0) ww += CORNER_BASE_LEG - CORNER_WALL_LEG;
      if (j.atEnd && idx === seq.length - 1) ww += CORNER_BASE_LEG - CORNER_WALL_LEG;
      if (s.type === 'cooktop_base') {
        items.push({ id: uid('HD'), type: 'hood', dims: { w: ww, h: 1050, d: settings.wallDepth }, name: `Cooker Hood ${Math.round(ww / 10)}cm`, wallId: wall.id, orderIndex: order++, materials: mat, config: { hoodHeight: 70, parentId: id }, led: { underCabinet: true } });
      } else {
        const cfg: ItemConfig = { doorCount: ww > 600 ? 2 : 1, parentId: id };
        if (s.type === 'sink_base') cfg.glassDoor = true;
        items.push({ id: uid('WC'), type: 'wall', dims: { w: ww, h: 700, d: settings.wallDepth }, name: `Wall Cabinet ${Math.round(ww / 10)}cm`, wallId: wall.id, orderIndex: order++, materials: mat, config: cfg, led: ledCfg });
      }
    });
  }

  // Island & Meja Bar (bebas)
  if (input.island) {
    const iw = input.islandDims.w * 10, idp = input.islandDims.d * 10;
    const cc = islandCenter(input);
    const cx = cc.x, cz = cc.z;
    const islandId = uid('IS');
    items.push({ id: islandId, type: 'island', dims: { w: iw, h: settings.baseHeight, d: idp }, name: 'Island Table', wallId: null, position: { x: cx, y: 0, z: cz }, rotationY: 0, materials: mat, config: { islandDoorsPerSide: iw >= 1500 ? 3 : 2, stools: opt.bar ? 0 : 3 } });
    if (opt.bar) {
      items.push({ id: uid('BR'), type: 'bar', dims: { w: iw, h: 1100, d: 600 }, name: 'Meja Bar', wallId: null, position: { x: cx, y: 0, z: cz + idp / 2 + 300 }, rotationY: 0, materials: mat, config: { barOverhang: 300, footRest: true, stools: 3 } });
    }
  }
  return { walls, items, countertop };
}

export const ACCESSORY_FOR_OPTION: Record<string, Accessory> = { dishRack: 'dish_rack', spiceRack: 'spice_rack', gasRack: 'gas_rack' };

/** Pusat island (mm). Menggunakan posisi hasil drag di diagram bila ada. */
export function islandCenter(input: WizardInput): { x: number; z: number } {
  if (input.islandPos) return { x: input.islandPos.x * 10, z: input.islandPos.z * 10 };
  const iw = input.islandDims.w * 10, idp = input.islandDims.d * 10;
  const xOff = input.shape === 'I' || input.shape === 'G' ? 0 : 700;
  return { x: Math.max(xOff + 600 + 1000 + iw / 2, (input.lengths.back * 10) / 2 + xOff / 2), z: 600 + 1100 + idp / 2 };
}
