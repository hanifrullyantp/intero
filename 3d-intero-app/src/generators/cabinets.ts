// 3D Intero — Generator Base / Wall / Tall cabinet (parametrik, mm)
import * as THREE from 'three';
import type { Accessory, Item, ProjectSettings, Wall } from '../types';
import {
  type Animatable, type Built, type HandleSpec, type MatCache, type MatSet, BACK_T, GAP, T,
  box, boxMin, cyl, handleSpecFrom, makeCarcass, makeDoor, makeDrawer, makeLedStrip, makeLiftDoor, makeToeKick, matsFor, sphere, torus,
} from './common';
import { type AccBuilt, genCutleryDrawer, genDishRack, genGasRack, genSpiceRack, genTrashBin } from './accessories';

export interface GenCtx { cache: MatCache; settings: ProjectSettings; items: Item[]; walls: Wall[] }

/** Setelah group dipindah, sesuaikan nilai closed/open animasi posisi relatif terhadap posisi baru. */
export function rebaseAnims(anims: Animatable[], g: THREE.Object3D) {
  for (const a of anims) {
    if (a.prop === 'position' && a.obj === g) { const delta = a.open - a.closed; a.closed = g.position[a.axis]; a.open = a.closed + delta; }
  }
  return anims;
}

export function ledIntensity(item: Item) { return Math.max(0, Math.min(1, item.led.intensity / 100)); }

export function addLed(g: THREE.Group, cache: MatCache, item: Item, len: number, x: number, y: number, z: number, lightDir: 'down' | 'up' = 'down') {
  const s = makeLedStrip(cache, len, item.led.temperature, ledIntensity(item), true);
  s.group.position.set(x, y, z);
  if (s.light) s.light.position.set(0, lightDir === 'down' ? -30 : 30, 30);
  s.group.userData.ledTrigger = item.led.trigger;
  g.add(s.group);
  return s;
}

function buildAccessory(kind: Accessory, o: { w: number; h: number; d: number; mats: MatSet; cache: MatCache; handle: HandleSpec | null; item: Item }): AccBuilt | null {
  const base = { w: o.w, h: o.h, d: o.d, mats: o.mats, cache: o.cache, handle: o.handle, gasType: o.item.config.gasType, spiceWidth: o.item.config.spiceWidth };
  switch (kind) {
    case 'dish_rack': return genDishRack(base);
    case 'spice_rack': return genSpiceRack(base);
    case 'gas_rack': return genGasRack(base);
    case 'trash_bin': return genTrashBin(base);
    case 'cutlery_drawer': return genCutleryDrawer(base);
    default: return null;
  }
}

/** Area pintu/laci di depan carcass. frontY0 = y bawah area depan, frontH = tinggi area. */
function buildFront(g: THREE.Group, anims: Animatable[], item: Item, m: MatSet, ctx: GenCtx, frontY0: number, frontH: number, opts: { drawers: number; doors: number; openShelf: boolean; accessories: boolean }) {
  const { w, d } = item.dims;
  const cfg = item.config;
  const hs = handleSpecFrom(item.materials, m.handle);
  const zFront = d / 2;
  let top = frontY0 + frontH;
  if (opts.openShelf) {
    g.add(boxMin(w - 2 * T, T, d - 30, m.body, -w / 2 + T, frontY0 + frontH / 2, -d / 2 + 10));
    return;
  }
  // Laci
  let drawers = opts.drawers;
  if (opts.doors === 0 && drawers === 0) drawers = 3;
  if (drawers > 0) {
    const heights: number[] = [];
    if (opts.doors === 0) {
      if (drawers >= 3) { const first = Math.round(frontH * 0.22); heights.push(first); const rest = (frontH - first) / (drawers - 1); for (let i = 1; i < drawers; i++) heights.push(rest); }
      else for (let i = 0; i < drawers; i++) heights.push(frontH / drawers);
    } else for (let i = 0; i < drawers; i++) heights.push(Math.min(170, frontH / (drawers + 1)));
    for (const dh of heights) {
      const r = makeDrawer({ w: w - 2 * GAP, h: dh - GAP, d: d - T, frontMat: m.door, boxMat: m.interior, handle: hs });
      r.group.position.set(0, top - dh + GAP / 2, zFront);
      rebaseAnims([r.anim], r.group); g.add(r.group); anims.push(r.anim);
      top -= dh;
    }
  }
  const doorH = top - frontY0 - GAP;
  if (opts.doors === 0 || doorH < 60) return;
  const doorCount = opts.doors;
  const dw = doorCount === 2 ? (w - 3 * GAP) / 2 : w - 2 * GAP;
  const sides: ('left' | 'right')[] = doorCount === 2 ? ['left', 'right'] : [cfg.hingeSide ?? 'left'];
  const intH = doorH - T;
  const accL = cfg.leftAccessory ?? 'shelf', accR = cfg.rightAccessory ?? 'shelf';
  let shelfNeeded = false;
  sides.forEach((side, idx) => {
    const acc: Accessory = doorCount === 2 ? (idx === 0 ? accL : accR) : accL;
    const hingeX = doorCount === 2 ? (idx === 0 ? -w / 2 + GAP : w / 2 - GAP) : (side === 'left' ? -w / 2 + GAP : w / 2 - GAP);
    const doorCenterX = doorCount === 2 ? (idx === 0 ? -w / 2 + GAP + dw / 2 : w / 2 - GAP - dw / 2) : 0;
    const built = opts.accessories && acc !== 'shelf' && acc !== 'lazy_susan' ? buildAccessory(acc, { w: dw, h: doorH, d: d - BACK_T, mats: m, cache: ctx.cache, handle: hs, item }) : null;
    if (built) {
      built.group.position.set(doorCenterX, frontY0 + T, zFront);
      rebaseAnims(built.animatables, built.group);
      g.add(built.group); anims.push(...built.animatables);
      if (built.ownFront) { built.group.position.y = frontY0 + GAP; return; }
    } else shelfNeeded = true;
    const door = makeDoor({ w: dw, h: doorH, mat: m.door, hinge: side, handle: hs });
    door.pivot.position.set(hingeX, frontY0 + GAP, zFront + T / 2);
    g.add(door.pivot); anims.push(door.anim);
  });
  if (shelfNeeded && intH > 300) g.add(boxMin(w - 2 * T, T, d - 40, m.body, -w / 2 + T, frontY0 + intH / 2, -d / 2 + 10));
}

export function genBase(item: Item, ctx: GenCtx): Built {
  const { w, h, d } = item.dims;
  const cfg = item.config;
  const m = matsFor(ctx.cache, item.materials);
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  const tk = cfg.toeKickHeight ?? ctx.settings.toeKick;
  const ct = ctx.settings.countertop.thickness;
  g.add(makeToeKick(w, d, tk, m.toe));
  const bodyH = h - tk;

  if (item.type === 'dishwasher') {
    g.add(makeCarcass({ w, h: bodyH, d, body: m.steel, side: m.side, y: tk }));
    const pivot = new THREE.Group(); pivot.position.set(0, tk + GAP, d / 2 + T / 2);
    const panel = box(w - 2 * GAP, bodyH - 60, T, m.door, 0, (bodyH - 60) / 2, 0); panel.userData.isDoor = true; pivot.add(panel);
    const bar = cyl(6, 6, w - 120, m.handle, 0, bodyH - 110, 22, 14); bar.rotation.z = Math.PI / 2; pivot.add(bar);
    g.add(pivot);
    g.add(box(w - 2 * GAP, 56 - GAP, T, m.black, 0, tk + bodyH - 28, d / 2 + T / 2));
    for (let i = 0; i < 5; i++) g.add(box(10, 10, 2, ctx.cache.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 1 }), -w / 2 + 60 + i * 30, tk + bodyH - 28, d / 2 + T + 1));
    anims.push({ obj: pivot, prop: 'rotation', axis: 'x', closed: 0, open: 85 * (Math.PI / 180), duration: 0.6, delay: 0 });
  } else {
    g.add(makeCarcass({ w, h: bodyH, d, body: m.body, side: m.side, y: tk }));
    const defaultDoors: 0 | 1 | 2 = item.type === 'drawer_base' ? 0 : w > 500 ? 2 : 1;
    const doors = cfg.doorCount ?? defaultDoors;
    const drawers = cfg.drawerCount ?? (item.type === 'drawer_base' ? 3 : item.type === 'cooktop_base' ? 1 : 0);
    buildFront(g, anims, item, m, ctx, tk, bodyH, { drawers: item.type === 'sink_base' ? 0 : drawers, doors, openShelf: !!cfg.openShelf, accessories: true });
  }

  // Sink
  if (item.type === 'sink_base') {
    const bw = Math.min(w - 160, 760), bd = d - 240, bh = 190, topY = h + ct;
    const rim = box(bw + 60, 3, bd + 60, m.steel, 0, topY + 1.5, -20); g.add(rim);
    g.add(boxMin(bw, 3, bd, m.steel, -bw / 2, topY - bh, -20 - bd / 2));
    g.add(boxMin(3, bh, bd, m.steel, -bw / 2, topY - bh, -20 - bd / 2));
    g.add(boxMin(3, bh, bd, m.steel, bw / 2 - 3, topY - bh, -20 - bd / 2));
    g.add(boxMin(bw, bh, 3, m.steel, -bw / 2, topY - bh, -20 - bd / 2));
    g.add(boxMin(bw, bh, 3, m.steel, -bw / 2, topY - bh, -20 + bd / 2 - 3));
    g.add(cyl(22, 22, 6, m.black, 0, topY - bh + 4, -20, 16));
    const fz = -d / 2 + 70;
    g.add(cyl(18, 22, 240, m.chrome, 0, topY + 120, fz, 16));
    const spout = cyl(12, 12, 200, m.chrome, 0, topY + 236, fz + 100, 12); spout.rotation.x = Math.PI / 2; g.add(spout);
    g.add(sphere(14, m.chrome, 0, topY + 236, fz, 12));
    g.add(cyl(8, 10, 30, m.chrome, 0, topY + 222, fz + 195, 10));
    const lever = cyl(6, 6, 90, m.chrome, 0, topY + 258, fz - 20, 10); lever.rotation.x = -0.9; g.add(lever);
  }
  // Cooktop 4 tungku
  if (item.type === 'cooktop_base') {
    const pw = Math.min(w - 60, 760), pd = d - 120, py = h + ct + 4;
    const glass = ctx.cache.get('#0B0B0D', { roughness: 0.08, metalness: 0.3 });
    g.add(box(pw, 8, pd, glass, 0, py, 0));
    g.add(box(pw + 10, 4, pd + 10, m.steel, 0, py - 4, 0));
    const bx = pw / 4, bz = pd / 4 - 20;
    [[-bx, -bz, 68], [bx, -bz, 52], [-bx, bz + 10, 52], [bx, bz + 10, 68]].forEach(([x, z, r]) => {
      g.add(torus(r, 5, m.black, x, py + 8, z));
      g.add(torus(r * 0.55, 4, m.black, x, py + 8, z));
      g.add(cyl(r * 0.3, r * 0.3, 10, m.black, x, py + 10, z, 16));
      g.add(cyl(r * 0.2, r * 0.2, 4, ctx.cache.get('#3A4BFF', { emissive: '#3A4BFF', emissiveIntensity: 0.4 }), x, py + 16, z, 12));
      for (let k = 0; k < 4; k++) { const sup = box(r * 2 + 30, 6, 8, m.black, x, py + 12, z); sup.rotation.y = (k * Math.PI) / 4; g.add(sup); }
    });
    for (let i = 0; i < 4; i++) g.add(cyl(14, 14, 14, m.steel, -pw / 2 + 60 + i * 44, py + 11, pd / 2 - 35, 16));
  }
  // LED
  if (item.led.insideBase) addLed(g, ctx.cache, item, w - 2 * T - 20, 0, h - T - 8, d / 2 - 60, 'down');
  if (item.led.plinth) addLed(g, ctx.cache, item, w - 20, 0, 10, d / 2 - 62, 'down');
  return { group: g, animatables: anims };
}

export function genWall(item: Item, ctx: GenCtx): Built {
  const { w, h, d } = item.dims;
  const cfg = item.config;
  const m = matsFor(ctx.cache, item.materials);
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  const hs = handleSpecFrom(item.materials, m.handle);
  const corniceH = cfg.cornice ? (cfg.corniceHeight ?? 50) : 0;
  const cornW = cfg.corniceWidth ?? 40;
  const upperH = cfg.doubleStack ? Math.min(cfg.upperTierHeight ?? 350, h - corniceH - 300) : 0;
  const mainH = h - corniceH - upperH;
  const doorCount = cfg.doorCount ?? (w > 600 ? 2 : 1);
  const zFront = d / 2;
  // Jenis pintu: swing (buka samping) atau liftup (pull-up, buka ke atas)
  const mainLift = cfg.doorType === 'liftup' || (cfg.doorType === undefined && !!cfg.liftUp);

  const tier = (y0: number, th: number, lift: boolean) => {
    g.add(makeCarcass({ w, h: th, d, body: m.body, side: m.side, y: y0, shelves: th > 500 ? [th / 2] : [] }));
    const dh = th - 2 * GAP;
    if (lift) {
      const pw = doorCount === 2 ? (w - 3 * GAP) / 2 : w - 2 * GAP;
      const xs = doorCount === 2 ? [-w / 2 + GAP + pw / 2, w / 2 - GAP - pw / 2] : [0];
      for (const x of xs) {
        const ld = makeLiftDoor(pw, dh, m.door, hs);
        ld.pivot.position.set(x, y0 + th - GAP, zFront + T / 2);
        g.add(ld.pivot); anims.push(ld.anim);
      }
      return;
    }
    const glass = cfg.glassDoor ? { frame: m.frame, glass: m.glass } : null;
    // Gola pada kabinet atas diletakkan di tepi BAWAH pintu
    const edge = { profileEdge: 'bottom' as const };
    if (doorCount === 2) {
      const dw = (w - 3 * GAP) / 2;
      const L = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'left', handle: hs, glass, openAngle: 110, ...edge });
      L.pivot.position.set(-w / 2 + GAP, y0 + GAP, zFront + T / 2); g.add(L.pivot); anims.push(L.anim);
      const R = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'right', handle: hs, glass, openAngle: 110, ...edge });
      R.pivot.position.set(w / 2 - GAP, y0 + GAP, zFront + T / 2); g.add(R.pivot); anims.push(R.anim);
    } else {
      const side = cfg.hingeSide ?? 'left';
      const D = makeDoor({ w: w - 2 * GAP, h: dh, mat: m.door, hinge: side, handle: hs, glass, openAngle: 110, ...edge });
      D.pivot.position.set(side === 'left' ? -w / 2 + GAP : w / 2 - GAP, y0 + GAP, zFront + T / 2); g.add(D.pivot); anims.push(D.anim);
    }
  };
  tier(0, mainH, mainLift);
  if (upperH > 0) tier(mainH, upperH, true);
  if (corniceH > 0) {
    g.add(box(w + cornW, corniceH * 0.6, d + cornW, m.door, 0, h - corniceH + corniceH * 0.3, cornW * 0.25));
    g.add(box(w + cornW + 20, corniceH * 0.4, d + cornW + 20, m.door, 0, h - corniceH * 0.2, cornW * 0.45));
    if (cfg.corniceLight) addLed(g, ctx.cache, item, w - 40, 0, h - corniceH - 6, d / 2 - 40, 'down');
  }
  if (item.led.underCabinet) addLed(g, ctx.cache, item, w - 40, 0, -6, d / 2 - 50, 'down');
  if (item.led.insideUpper) addLed(g, ctx.cache, item, w - 2 * T - 20, 0, mainH - T - 8, d / 2 - 50, 'down');
  return { group: g, animatables: anims };
}

export function genTall(item: Item, ctx: GenCtx): Built {
  const { w, h, d } = item.dims;
  const cfg = item.config;
  const m = matsFor(ctx.cache, item.materials);
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  const hs = handleSpecFrom(item.materials, m.handle);
  const tk = cfg.toeKickHeight ?? ctx.settings.toeKick;
  g.add(makeToeKick(w, d, tk, m.toe));
  const bodyH = h - tk;
  const shelves: number[] = [];
  for (let y = 350; y < bodyH - 200; y += 350) shelves.push(y);
  g.add(makeCarcass({ w, h: bodyH, d, body: m.body, side: m.side, y: tk, shelves }));
  const split = Math.min(1250, bodyH * 0.55);
  const doorCount = cfg.doorCount ?? (w > 600 ? 2 : 1);
  const zFront = d / 2;
  const section = (y0: number, th: number) => {
    const dh = th - 2 * GAP;
    if (doorCount === 2) {
      const dw = (w - 3 * GAP) / 2;
      const L = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'left', handle: hs }); L.pivot.position.set(-w / 2 + GAP, y0 + GAP, zFront + T / 2); g.add(L.pivot); anims.push(L.anim);
      const R = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'right', handle: hs }); R.pivot.position.set(w / 2 - GAP, y0 + GAP, zFront + T / 2); g.add(R.pivot); anims.push(R.anim);
    } else {
      const side = cfg.hingeSide ?? 'left';
      const D = makeDoor({ w: w - 2 * GAP, h: dh, mat: m.door, hinge: side, handle: hs }); D.pivot.position.set(side === 'left' ? -w / 2 + GAP : w / 2 - GAP, y0 + GAP, zFront + T / 2); g.add(D.pivot); anims.push(D.anim);
    }
  };
  section(tk, split);
  section(tk + split, bodyH - split);
  if (item.led.insideUpper) addLed(g, ctx.cache, item, w - 2 * T - 20, 0, h - T - 8, d / 2 - 60, 'down');
  if (item.led.plinth) addLed(g, ctx.cache, item, w - 20, 0, 10, d / 2 - 62, 'down');
  return { group: g, animatables: anims };
}
