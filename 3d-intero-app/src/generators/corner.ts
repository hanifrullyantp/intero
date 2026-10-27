// 3D Intero — Corner Cabinet V2: footprint TRUE L-SHAPE, pintu bi-fold 168°, handle di KEDUA sub-pintu, auto-orientation
import * as THREE from 'three';
import type { Item } from '../types';
import { type Animatable, type Built, BACK_T, GAP, T, boxMin, handleSpecFrom, makeHandle, matsFor, mesh } from './common';
import { type GenCtx, addLed } from './cabinets';
import { genLazySusan } from './accessories';
import { backsplashMaterial, countertopMaterial } from './countertop';
import { detectCornerOrientation } from '../engine/walls';

/** Shape L (bidang x,z): legA sepanjang +x, legB sepanjang +z, kedalaman D; inset = pengurangan di sisi depan. */
export function lShape(legA: number, legB: number, D: number, inset = 0): THREE.Shape {
  const d = D - inset;
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(legA, 0); s.lineTo(legA, d); s.lineTo(d, d); s.lineTo(d, legB); s.lineTo(0, legB); s.closePath();
  return s;
}
/** Extrude shape L menjadi pelat setebal t yang menempati y∈[y0, y0+t]; koordinat shape (x,y) → dunia (x,z). */
export function lPlate(shape: THREE.Shape, t: number, y0: number, mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  geo.rotateX(Math.PI / 2); geo.translate(0, y0 + t, 0);
  return mesh(geo, mat);
}

export function genCorner(item: Item, ctx: GenCtx): Built {
  const isWall = item.type === 'corner_wall';
  const legA = item.dims.w, legB = item.dims.d, H = item.dims.h;
  const D = isWall ? ctx.settings.wallDepth : 600;
  const m = matsFor(ctx.cache, item.materials);
  const cfg = item.config;
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  const orientation = detectCornerOrientation(item, ctx.items, ctx.walls);
  const c = new THREE.Group();
  c.position.set(orientation === 'left' ? -legA / 2 : legA / 2, 0, -legB / 2);
  if (orientation === 'right') c.scale.x = -1;
  g.add(c);

  const tk = isWall ? 0 : (cfg.toeKickHeight ?? ctx.settings.toeKick);
  const corniceH = isWall && cfg.cornice ? (cfg.corniceHeight ?? 50) : 0;
  const y0 = tk, bodyH = H - corniceH - tk;
  // Toe kick L tertutup
  if (tk > 0) c.add(lPlate(lShape(legA, legB, D, 50), tk, 0, m.toe));
  // Pelat bawah & atas L
  c.add(lPlate(lShape(legA, legB, D), T, y0, m.body));
  c.add(lPlate(lShape(legA, legB, D), T, y0 + bodyH - T, m.body));
  // Cornice / Topi L-shape untuk corner_wall
  if (corniceH > 0) {
    const cornW = cfg.corniceWidth ?? 40;
    c.add(lPlate(lShape(legA, legB, D + cornW), corniceH * 0.6, H - corniceH, m.door));
    c.add(lPlate(lShape(legA, legB, D + cornW + 18), corniceH * 0.4, H - corniceH * 0.4, m.door));
    if (cfg.corniceLight) addLed(g, ctx.cache, item, legA - 60, 0, H - corniceH - 6, -legB / 2 + D - 30, 'down');
  }
  // Panel belakang
  c.add(boxMin(legA, bodyH, BACK_T, m.body, 0, y0, 0));
  c.add(boxMin(BACK_T, bodyH, legB, m.body, 0, y0, 0));
  // Panel ujung (sisi)
  c.add(boxMin(T, bodyH, D, m.side, legA - T, y0, 0));
  c.add(boxMin(D, bodyH, T, m.side, 0, y0, legB - T));
  // Rak L utuh di tengah
  if (bodyH > 500) c.add(lPlate(lShape(legA - T, legB - T, D - 30), T, y0 + bodyH / 2, m.body));

  const style = cfg.cornerDoorStyle ?? 'bifold';
  const doorH = bodyH - 2 * GAP;
  const w1 = legA - D - 2 * GAP;   // pintu di bidang z = D
  const w2 = legB - D - 2 * GAP;   // pintu di bidang x = D
  const hs = handleSpecFrom(item.materials, m.handle);
  const handleY = (h: number) => (hs.position === 'top' ? Math.max(hs.length / 2 + 20, h - 110 - hs.length / 2) : hs.position === 'bottom' ? Math.min(h - hs.length / 2 - 20, 110 + hs.length / 2) : h / 2);

  const makeDoorA = () => {
    const pivot = new THREE.Group(); pivot.position.set(legA - GAP, y0 + GAP, D + T / 2);
    const dm = boxMin(w1, doorH, T, m.door, -w1, 0, -T / 2); dm.userData.isDoor = true; pivot.add(dm);
    return pivot;
  };
  const addHandleTo = (pivot: THREE.Group, x: number, y: number, z: number, rotY: number) => {
    const hg = makeHandle(hs, 'v', 300);
    if (!hg) return;
    hg.position.set(x, y, z); hg.rotation.y = rotY; pivot.add(hg);
  };

  if (style === 'bifold' && w1 > 80 && w2 > 80) {
    // Pintu A (engsel di ujung legA) + pintu B terlipat via engsel 168° di sudut dalam
    const pivotA = makeDoorA();
    const pivotB = new THREE.Group(); pivotB.position.set(-w1, 0, 0);
    const dmB = boxMin(T, doorH, w2, m.door, -T / 2, 0, 0); dmB.userData.isDoor = true; pivotB.add(dmB);
    // Engsel 168° (visual): 3 knuckle kecil pada garis lipat
    for (let k = 0; k < 3; k++) pivotB.add(boxMin(12, 60, 12, m.steel, -6, 120 + k * ((doorH - 300) / 2), -6));
    pivotA.add(pivotB);
    // WAJIB: handle pada KEDUA sub-pintu (A dan B)
    const doors: { pivot: THREE.Group; which: 'A' | 'B' }[] = [{ pivot: pivotA, which: 'A' }, { pivot: pivotB, which: 'B' }];
    for (const door of doors) {
      if (door.which === 'A') addHandleTo(door.pivot, -(w1 - 45), handleY(doorH), T / 2, 0);
      else addHandleTo(door.pivot, T / 2, handleY(doorH), 45, Math.PI / 2);
    }
    c.add(pivotA);
    const rad = Math.PI / 180;
    anims.push({ obj: pivotA, prop: 'rotation', axis: 'y', closed: 0, open: 85 * rad, duration: 0.8, delay: 0 });
    anims.push({ obj: pivotB, prop: 'rotation', axis: 'y', closed: 0, open: 83 * rad, duration: 0.8, delay: 0.05 });
  } else {
    // Dua pintu independen (atau satu pintu + panel tetap)
    const pivotA = makeDoorA();
    addHandleTo(pivotA, -(w1 - 45), handleY(doorH), T / 2, 0);
    c.add(pivotA);
    anims.push({ obj: pivotA, prop: 'rotation', axis: 'y', closed: 0, open: 100 * (Math.PI / 180), duration: 0.6, delay: 0 });
    if (style === 'two' && w2 > 80) {
      const pivotB = new THREE.Group(); pivotB.position.set(D + T / 2, y0 + GAP, legB - GAP);
      const dmB = boxMin(T, doorH, w2, m.door, -T / 2, 0, -w2); dmB.userData.isDoor = true; pivotB.add(dmB);
      addHandleTo(pivotB, T / 2, handleY(doorH), -(w2 - 45), Math.PI / 2);
      c.add(pivotB);
      anims.push({ obj: pivotB, prop: 'rotation', axis: 'y', closed: 0, open: -100 * (Math.PI / 180), duration: 0.6, delay: 0.05 });
    } else if (w2 > 0) {
      const fixed = boxMin(T, doorH, w2, m.door, D - T / 2, y0 + GAP, D + GAP); c.add(fixed);
    }
    // tiang sudut dalam
    c.add(boxMin(T, bodyH, T, m.side, D - T, y0, D - T));
  }

  // Lazy Susan (corner base)
  if (!isWall && cfg.lazySusan) {
    const r = Math.min(330, Math.min(legA, legB) / 2 - 60);
    const ls = genLazySusan({ w: legA, h: bodyH - 2 * T, d: legB, mats: m, cache: ctx.cache, handle: null, radius: r, cx: r + 30, cz: r + 30 });
    ls.group.position.y = y0 + T; c.add(ls.group); anims.push(...ls.animatables);
  }

  // Countertop L flat + backsplash (corner base)
  if (!isWall) {
    const ct = ctx.settings.countertop;
    const slab = lPlate(lShape(legA, legB, D + ct.overhang), ct.thickness, H, countertopMaterial(ctx.cache, ct.type));
    slab.userData.isCountertop = true; c.add(slab);
    const bsH = !ct.backsplash ? 0 : ct.backsplashAuto ? Math.max(100, ctx.settings.baseHeight + ctx.settings.wallGap - H - ct.thickness) : ct.backsplashHeight;
    if (bsH > 0) {
      const bm = backsplashMaterial(ctx.cache, ct.backsplashColor);
      c.add(boxMin(legA, bsH, 10, bm, 0, H + ct.thickness, 0));
      c.add(boxMin(10, bsH, legB, bm, 0, H + ct.thickness, 0));
    }
  }
  if (isWall && item.led.underCabinet) { addLed(g, ctx.cache, item, legA - 60, 0, -6, -legB / 2 + D - 40, 'down'); }
  if (!isWall && item.led.insideBase) addLed(c, ctx.cache, item, legA - 2 * T - 40, legA / 2, y0 + bodyH - T - 8, D - 60, 'down');
  return { group: g, animatables: anims };
}
