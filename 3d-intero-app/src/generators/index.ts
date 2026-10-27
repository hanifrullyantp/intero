// 3D Intero — Island, Meja Bar, Komponen Kustom + dispatcher buildItem + room (lantai & dinding)
import * as THREE from 'three';
import type { CustomShape, Item, Wall } from '../types';
import { type Animatable, type Built, GAP, T, box, boxMin, cyl, floorTexture, handleSpecFrom, makeCarcass, makeDoor, makeToeKick, matsFor, mesh, sphere, type MatCache } from './common';
import { type GenCtx, addLed, genBase, genTall, genWall } from './cabinets';
import { genCorner } from './corner';
import { genElectronic, genFridge, genHood } from './appliances';
import { countertopMaterial } from './countertop';
import { wallVec } from '../engine/walls';

export type { GenCtx } from './cabinets';

function stool(cache: MatCache, seatY: number, x: number, z: number, seatColor = '#2B2F36'): THREE.Group {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const steel = cache.get('#C8CCD0', { roughness: 0.3, metalness: 0.9 });
  g.add(cyl(190, 190, 14, steel, 0, 7, 0, 32));
  g.add(cyl(22, 26, seatY - 40, steel, 0, (seatY - 40) / 2 + 14, 0, 16));
  g.add(cyl(170, 150, 50, cache.get(seatColor, { roughness: 0.7 }), 0, seatY - 25, 0, 32));
  g.add(cyl(180, 180, 10, cache.get('#1A1A1A', { roughness: 0.5 }), 0, seatY - 55, 0, 32));
  if (seatY > 700) { const ring = cyl(120, 120, 10, steel, 0, seatY * 0.4, 0, 24, true); g.add(ring); }
  return g;
}

export function genIsland(item: Item, ctx: GenCtx): Built {
  const { w, h, d } = item.dims;
  const cfg = item.config;
  const m = matsFor(ctx.cache, item.materials);
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  const hs = handleSpecFrom(item.materials, m.handle);
  const tk = cfg.toeKickHeight ?? ctx.settings.toeKick;
  const stools = cfg.stools ?? 0;
  const ct = ctx.settings.countertop;
  g.add(makeToeKick(w, d, tk, m.toe));
  const bodyH = h - tk;
  g.add(makeCarcass({ w, h: bodyH, d, body: m.body, side: m.side, y: tk, back: false }));
  g.add(boxMin(w - 2 * T, bodyH, T, m.body, -w / 2 + T, tk, -T / 2)); // sekat tengah
  const n = Math.max(1, Math.min(4, cfg.islandDoorsPerSide ?? 2));
  const dw = (w - (n + 1) * GAP) / n, dh = bodyH - 2 * GAP;
  const frontSide = (zFace: number, rotY: number) => {
    const holder = new THREE.Group(); holder.rotation.y = rotY;
    for (let i = 0; i < n; i++) {
      const hinge: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
      const x0 = -w / 2 + GAP + i * (dw + GAP);
      const D = makeDoor({ w: dw, h: dh, mat: m.door, hinge, handle: hs });
      D.pivot.position.set(hinge === 'left' ? x0 : x0 + dw, tk + GAP, zFace + T / 2);
      holder.add(D.pivot); anims.push(D.anim);
    }
    g.add(holder);
  };
  frontSide(d / 2, 0);
  if (stools === 0) frontSide(d / 2, Math.PI); // sisi belakang
  else g.add(boxMin(w - 2 * T, bodyH, T, m.door, -w / 2 + T, tk, -d / 2)); // panel belakang untuk area kaki
  const kneeOver = stools > 0 ? 250 : 0;
  const slabD = d + 2 * ct.overhang + kneeOver;
  const slab = box(w + 2 * ct.overhang, ct.thickness, slabD, countertopMaterial(ctx.cache, ct.type), 0, h + ct.thickness / 2, -kneeOver / 2);
  slab.userData.isCountertop = true; g.add(slab);
  for (let i = 0; i < stools; i++) {
    const x = stools === 1 ? 0 : -w / 2 + (w / (stools + 1)) * (i + 1);
    g.add(stool(ctx.cache, 680, x, -d / 2 - 330));
  }
  if (item.led.plinth) addLed(g, ctx.cache, item, w - 20, 0, 10, d / 2 - 62, 'down');
  if (item.led.insideBase) addLed(g, ctx.cache, item, w - 2 * T - 20, 0, h - T - 8, d / 2 - 60, 'down');
  return { group: g, animatables: anims };
}

export function genBar(item: Item, ctx: GenCtx): Built {
  const { w, h, d } = item.dims;
  const cfg = item.config;
  const m = matsFor(ctx.cache, item.materials);
  const g = new THREE.Group();
  const overhang = Math.min(cfg.barOverhang ?? 300, d - 150);
  const ct = ctx.settings.countertop;
  const supportD = d - overhang;
  const tk = ctx.settings.toeKick;
  const sz = -d / 2 + supportD / 2;
  // Penopang (panel kabinet) + toe kick
  const tkm = boxMin(w, tk, supportD - 50, m.toe, -w / 2, 0, -d / 2); g.add(tkm);
  g.add(boxMin(T, h - 40 - tk, supportD, m.side, -w / 2, tk, -d / 2));
  g.add(boxMin(T, h - 40 - tk, supportD, m.side, w / 2 - T, tk, -d / 2));
  g.add(boxMin(w - 2 * T, h - 40 - tk, T, m.door, -w / 2 + T, tk, sz + supportD / 2 - T));
  g.add(boxMin(w - 2 * T, h - 40 - tk, T, m.door, -w / 2 + T, tk, -d / 2));
  g.add(boxMin(w - 2 * T, T, supportD, m.body, -w / 2 + T, h - 40 - T, -d / 2));
  // Countertop tinggi dengan overhang depan
  const slab = box(w + 2 * ct.overhang, 40, d + ct.overhang, countertopMaterial(ctx.cache, ct.type), 0, h - 20, ct.overhang / 2);
  slab.userData.isCountertop = true; g.add(slab);
  // Foot rest pipa stainless Ø25 di bawah overhang
  if (cfg.footRest !== false) {
    const steel = ctx.cache.get('#C8CCD0', { roughness: 0.3, metalness: 0.9 });
    const pipe = cyl(12.5, 12.5, w - 60, steel, 0, 250, d / 2 - overhang / 2, 16); pipe.rotation.z = Math.PI / 2; g.add(pipe);
    const n = Math.max(2, Math.round(w / 700));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 120 + i * ((w - 240) / Math.max(1, n - 1));
      const br = cyl(8, 8, overhang / 2 + 10, steel, x, 250, d / 2 - overhang * 0.75, 10); br.rotation.x = Math.PI / 2; g.add(br);
    }
  }
  const stools = cfg.stools ?? 0;
  for (let i = 0; i < stools; i++) {
    const x = stools === 1 ? 0 : -w / 2 + (w / (stools + 1)) * (i + 1);
    g.add(stool(ctx.cache, h - 320, x, d / 2 + 120));
  }
  return { group: g, animatables: [] };
}

export function buildCustomShapes(shapes: CustomShape[], cache: MatCache): Built {
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  for (const s of shapes) {
    const mat = cache.get(s.color, { metalness: s.metalness, roughness: s.roughness, opacity: s.opacity });
    let geo: THREE.BufferGeometry;
    switch (s.kind) {
      case 'cylinder': geo = new THREE.CylinderGeometry(s.w / 2, s.d / 2, s.h, 28); break;
      case 'sphere': geo = new THREE.SphereGeometry(s.w / 2, 24, 24); break;
      case 'torus': geo = new THREE.TorusGeometry(s.w / 2, Math.max(2, s.h / 2), 12, 36); break;
      case 'prism': geo = new THREE.CylinderGeometry(s.w / 2, s.d / 2, s.h, 3); break;
      default: geo = new THREE.BoxGeometry(s.w, s.h, s.d);
    }
    const mm = mesh(geo, mat);
    if (s.kind === 'torus') mm.rotation.x = Math.PI / 2;
    const pivot = new THREE.Group();
    if (s.animation === 'swing') { pivot.position.set(s.x - s.w / 2, s.y, s.z); mm.position.set(s.w / 2, s.h / 2, 0); anims.push({ obj: pivot, prop: 'rotation', axis: 'y', closed: 0, open: -Math.PI / 2, duration: 0.6, delay: 0 }); }
    else if (s.animation === 'liftup') { pivot.position.set(s.x, s.y + s.h, s.z); mm.position.set(0, -s.h / 2, 0); anims.push({ obj: pivot, prop: 'rotation', axis: 'x', closed: 0, open: -85 * (Math.PI / 180), duration: 0.6, delay: 0 }); }
    else if (s.animation === 'pullout') { pivot.position.set(s.x, s.y, s.z); mm.position.set(0, s.h / 2, 0); anims.push({ obj: pivot, prop: 'position', axis: 'z', closed: s.z, open: s.z + Math.max(100, s.d * 0.8), duration: 0.7, delay: 0 }); }
    else if (s.animation === 'spin') { pivot.position.set(s.x, s.y, s.z); mm.position.set(0, s.h / 2, 0); anims.push({ obj: pivot, prop: 'rotation', axis: 'y', closed: 0, open: Math.PI * 2, duration: 3, delay: 0, spin: true }); }
    else { pivot.position.set(s.x, s.y, s.z); mm.position.set(0, s.h / 2, 0); }
    if (s.animation === 'swing' || s.animation === 'liftup') mm.userData.isDoor = true;
    pivot.add(mm); g.add(pivot);
  }
  return { group: g, animatables: anims };
}

export function genCustom(item: Item, ctx: GenCtx): Built {
  const shapes = item.config.customShapes ?? [];
  if (!shapes.length) {
    const m = matsFor(ctx.cache, item.materials);
    const g = new THREE.Group(); g.add(box(item.dims.w, item.dims.h, item.dims.d, m.door, 0, item.dims.h / 2, 0));
    return { group: g, animatables: [] };
  }
  return buildCustomShapes(shapes, ctx.cache);
}

/** Dispatcher utama: bangun Object3D untuk item (origin lokal: tengah-bawah footprint). */
export function buildItem(item: Item, ctx: GenCtx): Built {
  let b: Built;
  switch (item.type) {
    case 'wall': b = genWall(item, ctx); break;
    case 'tall': b = genTall(item, ctx); break;
    case 'corner_base': case 'corner_wall': b = genCorner(item, ctx); break;
    case 'fridge': b = genFridge(item, ctx); break;
    case 'electronic': b = genElectronic(item, ctx); break;
    case 'hood': b = genHood(item, ctx); break;
    case 'island': b = genIsland(item, ctx); break;
    case 'bar': b = genBar(item, ctx); break;
    case 'custom': b = genCustom(item, ctx); break;
    default: b = genBase(item, ctx);
  }
  b.group.userData.itemId = item.id;
  b.group.traverse((o) => { o.userData.itemId = item.id; });
  return b;
}

/** Ruangan: lantai + slab dinding + plin. */
export function buildRoom(walls: Wall[], cache: MatCache, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, appearance = { canvasColor: '#E4E7EB', wallColor: '#D2D3D1', floorColor: '#D9D2C7' }): THREE.Group {
  const g = new THREE.Group();
  const wallH = 2800, wallT = 120;
  const wallMat = cache.get(appearance.wallColor, { roughness: 0.9 });
  const floorMat = cache.get('#FFFFFF', { roughness: 0.8, map: floorTexture(appearance.floorColor) });
  const fw = bounds.maxX - bounds.minX + 2400, fd = bounds.maxZ - bounds.minZ + 2400;
  const floor = box(fw, 20, fd, floorMat, (bounds.minX + bounds.maxX) / 2, -10, (bounds.minZ + bounds.maxZ) / 2);
  floor.castShadow = false; floor.userData.isFloor = true;
  const tex = floorMat.map as THREE.Texture; tex.repeat.set(fw / 2400, fd / 2400);
  g.add(floor);
  for (const w of walls) {
    const v = wallVec(w);
    const cx = (w.start.x + w.end.x) / 2 - v.normal.x * (wallT / 2), cz = (w.start.z + w.end.z) / 2 - v.normal.z * (wallT / 2);
    const slab = box(v.length + wallT, wallH, wallT, wallMat, cx, wallH / 2, cz); slab.rotation.y = v.angle; slab.castShadow = false; slab.userData.isWall = true;
    g.add(slab);
     const skirt = box(v.length, 80, 14, cache.get(appearance.wallColor, { roughness: 0.75 }), (w.start.x + w.end.x) / 2 + v.normal.x * 7, 40, (w.start.z + w.end.z) / 2 + v.normal.z * 7); skirt.rotation.y = v.angle; g.add(skirt);
  }
  // Downlight plafon dekoratif (visual saja)
  if (walls.length) for (let i = 0; i < 3; i++) g.add(sphere(40, cache.get('#FFF6E0', { emissive: '#FFE8B0', emissiveIntensity: 0.8 }), bounds.minX + 800 + i * 900, wallH - 10, bounds.minZ + 900));
  return g;
}
