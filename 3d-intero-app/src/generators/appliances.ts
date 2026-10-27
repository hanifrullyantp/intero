// 3D Intero — Appliance: Oven, Microwave, Dispenser, Magic Com tray, Coffee, Kulkas (incl. side-by-side), Electronic Cabinet multi-combo, Cooker Hood + filler
import * as THREE from 'three';
import type { Item, Slot1, Slot2 } from '../types';
import { type Animatable, type Built, type MatCache, type MatSet, GAP, T, box, boxMin, cyl, handleSpecFrom, makeCarcass, makeDoor, makeLiftDoor, makeToeKick, matsFor, sphere } from './common';
import { type GenCtx, addCornice, addLed, rebaseAnims } from './cabinets';

export const OVEN = { w: 440, h: 290, d: 320 };
export const MICROWAVE = { w: 500, h: 300, d: 400 };
export const MAGICCOM = { w: 300, h: 250, d: 320 };

/** Origin appliance: tengah-x, y bawah, z = bidang depan (body ke -z). */
export function genOven(cache: MatCache, m: MatSet, w = OVEN.w, h = OVEN.h, d = OVEN.d): { group: THREE.Group; anim: Animatable | null } {
  const g = new THREE.Group();
  g.add(box(w, h, d, m.steel, 0, h / 2, -d / 2));
  const inner = cache.get('#141414', { roughness: 0.6 });
  g.add(boxMin(w - 60, h - 90, 12, inner, -(w - 60) / 2, 25, -40));
  g.add(box(60, 14, 10, cache.get('#FFC98A', { emissive: '#FFB357', emissiveIntensity: 1.2 }), w / 2 - 70, h - 60, -20)); // lampu interior
  const glass = cache.get('#2A2E33', { roughness: 0.08, metalness: 0.2, opacity: 0.65 });
  const door = box(w - 40, h - 70, 6, glass, 0, (h - 70) / 2 + 12, 3); door.castShadow = false; g.add(door);
  g.add(box(w - 40, 12, 8, m.black, 0, 12, 4)); g.add(box(w - 40, 12, 8, m.black, 0, h - 52, 4));
  const handle = cyl(7, 7, w - 90, m.chrome, 0, h - 62, 34, 14); handle.rotation.z = Math.PI / 2; g.add(handle);
  for (const s of [-1, 1]) { const st = cyl(5, 5, 30, m.chrome, s * (w / 2 - 55), h - 62, 17, 10); st.rotation.x = Math.PI / 2; g.add(st); }
  for (const s of [-1, 1]) { const k = cyl(12, 12, 14, m.chrome, s * (w / 2 - 55), h - 24, 7, 16); k.rotation.x = Math.PI / 2; g.add(k); g.add(box(3, 10, 3, m.black, s * (w / 2 - 55), h - 18, 14)); }
  g.add(box(96, 18, 3, cache.get('#FF8A2A', { emissive: '#FF7A10', emissiveIntensity: 1.5 }), 0, h - 24, 1.5));
  return { group: g, anim: null };
}

export function genMicrowave(cache: MatCache, m: MatSet, w = MICROWAVE.w, h = MICROWAVE.h, d = MICROWAVE.d): { group: THREE.Group; anim: Animatable } {
  const g = new THREE.Group();
  g.add(box(w, h, d, m.steel, 0, h / 2, -d / 2));
  const dw = w * 0.68, pw = w * 0.22;
  const pivot = new THREE.Group(); pivot.position.set(-w / 2 + 10, 10, 4);
  const frame = cache.get('#1C1F23', { roughness: 0.35, metalness: 0.4 });
  pivot.add(boxMin(dw, h - 20, 16, frame, 0, 0, -8));
  const pane = boxMin(dw - 50, h - 70, 4, cache.get('#3A4047', { roughness: 0.05, metalness: 0.2, opacity: 0.6 }), 25, 25, 8); pane.castShadow = false; pivot.add(pane);
  pivot.add(boxMin(10, h - 70, 16, m.chrome, dw - 24, 25, 6));
  pivot.userData.isDoor = true;
  g.add(pivot);
  const px = w / 2 - pw / 2 - 12;
  g.add(box(pw, h - 20, 6, frame, px, h / 2, 3));
  g.add(box(pw - 24, 28, 3, cache.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 1.1 }), px, h - 40, 6));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.add(box(12, 12, 3, cache.get('#9CA3AF', { emissive: '#D1D5DB', emissiveIntensity: 0.3 }), px - pw / 2 + 16 + c * ((pw - 32) / 2), h - 80 - r * 34, 6));
  return { group: g, anim: { obj: pivot, prop: 'rotation', axis: 'y', closed: 0, open: -100 * (Math.PI / 180), duration: 0.6, delay: 0.1 } };
}

export function genMagicComTray(cache: MatCache, m: MatSet, nicheW: number, nicheD: number): { group: THREE.Group; anim: Animatable } {
  const g = new THREE.Group();
  const tw = nicheW - 40, td = nicheD - 60;
  g.add(boxMin(tw, 18, td, m.body, -tw / 2, 0, -td));
  for (const s of [-1, 1]) { g.add(boxMin(12, 26, td - 20, m.steel, s * (tw / 2 + 2) - 6, -4, -td + 10)); g.add(boxMin(8, 12, td - 30, m.chrome, s * (tw / 2 + 4) - 4, 2, -td + 15)); }
  const body = cache.get('#ECECEC', { roughness: 0.3, metalness: 0.4 });
  const cz = -td / 2 - 10;
  g.add(cyl(140, 150, 200, body, 0, 18 + 100, cz, 32));
  g.add(cyl(142, 142, 30, m.black, 0, 18 + 215, cz, 32));
  g.add(cyl(120, 142, 14, m.black, 0, 18 + 237, cz, 32));
  g.add(box(70, 18, 30, m.black, 0, 18 + 252, cz)); // handle tutup
  g.add(box(90, 60, 8, cache.get('#3A3F46', { roughness: 0.4 }), 0, 18 + 70, cz + 150)); // panel kontrol
  g.add(box(26, 12, 4, cache.get('#22C55E', { emissive: '#22C55E', emissiveIntensity: 1.6 }), -18, 18 + 60, cz + 155));
  g.add(box(26, 12, 4, cache.get('#F59E0B', { emissive: '#F59E0B', emissiveIntensity: 0.9 }), 18, 18 + 60, cz + 155));
  g.add(box(60, 20, 3, cache.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 1.2 }), 0, 18 + 88, cz + 155));
  return { group: g, anim: { obj: g, prop: 'position', axis: 'z', closed: 0, open: 350, duration: 0.7, delay: 0.1 } };
}

/** Dispenser lantai: body dari lantai (y=0) hingga nicheH. Origin: tengah-x, y bawah, z = bidang depan. */
export function genDispenser(cache: MatCache, m: MatSet, nicheW: number, nicheH: number, nicheD: number): THREE.Group {
  const g = new THREE.Group();
  const bw = Math.min(nicheW - 36, 400), bh = Math.max(900, nicheH - 8), bd = Math.min(nicheD - 50, 420);
  const black = cache.get('#16181C', { roughness: 0.38, metalness: 0.22 });
  const face = cache.get('#1C1F24', { roughness: 0.32, metalness: 0.18 });
  const bz = -bd;
  // Body penuh dari lantai
  g.add(boxMin(bw, bh, bd, black, -bw / 2, 0, bz));
  // Pintu bawah (dari lantai sampai ~55% tinggi)
  const doorH = bh * 0.55;
  const door = box(bw - 24, doorH - 20, 10, face, 0, 10 + (doorH - 20) / 2, 6);
  door.userData.isDoor = true; g.add(door);
  const bar = cyl(5, 5, doorH * 0.35, m.chrome, bw / 2 - 36, doorH * 0.55, 22, 12); g.add(bar);
  // Recess dispenser di bagian atas
  const recH = Math.min(280, bh * 0.28), recY = doorH + 20;
  g.add(boxMin(bw - 50, recH, 70, cache.get('#2A2E33', { roughness: 0.5 }), -(bw - 50) / 2, recY, -8));
  const ty = recY + recH * 0.62;
  [['#C0392B', -50], ['#2E6DB4', 50]].forEach(([c, x]) => {
    g.add(box(32, 28, 36, cache.get(c as string, { roughness: 0.4 }), x as number, ty, 18));
    g.add(cyl(5, 5, 36, m.chrome, x as number, ty - 22, 18, 10));
    g.add(box(28, 8, 32, cache.get(c as string, { roughness: 0.4 }), x as number, ty + 20, 10));
  });
  // Drip tray stainless di dasar recess
  g.add(boxMin(bw - 70, 8, 80, m.steel, -(bw - 70) / 2, recY - 4, -70));
  for (let i = 0; i < 7; i++) g.add(boxMin(bw - 90, 2, 4, m.black, -(bw - 90) / 2, recY + 4, -64 + i * 10));
  // Display + LED
  g.add(box(110, 22, 4, cache.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 1.4 }), 0, recY + recH + 18, 4));
  const ledMat = cache.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 1.6 });
  g.add(box(bw - 70, 5, 3, ledMat, 0, recY + recH - 6, 3));
  const light = new THREE.PointLight(0x38BDF8, 0.9, 0.8, 2); light.position.set(0, recY + recH * 0.5, 80); light.userData.isLed = true; light.userData.baseIntensity = 0.9; g.add(light);
  // Galon 19L di dalam (terlihat jika pintu transparan / xray)
  const water = cache.get('#9BD5F0', { roughness: 0.05, metalness: 0.0, opacity: 0.45 });
  const galH = Math.min(340, doorH - 80);
  const gal = cyl(120, 120, galH, water, 0, 50 + galH / 2, bz + bd / 2, 24); gal.castShadow = false; g.add(gal);
  const top = sphere(120, water, 0, 50 + galH, bz + bd / 2, 16); top.scale.y = 0.32; top.castShadow = false; g.add(top);
  g.add(cyl(36, 36, 30, cache.get('#2563EB', { roughness: 0.4 }), 0, 50 + galH + 40, bz + bd / 2, 14));
  return g;
}

export function genCoffeeMachine(cache: MatCache, m: MatSet, nicheW: number, nicheH: number): THREE.Group {
  const g = new THREE.Group();
  const w = Math.min(nicheW - 80, 560), h = Math.min(nicheH - 40, 450), d = 400;
  g.add(box(w, h, d, cache.get('#15171A', { roughness: 0.3, metalness: 0.3 }), 0, h / 2, -d / 2));
  g.add(box(w - 40, h - 40, 4, m.chrome, 0, h / 2, 1));
  g.add(box(140, 40, 3, cache.get('#F8FAFC', { emissive: '#F8FAFC', emissiveIntensity: 0.9 }), 0, h - 60, 4));
  const pf = cyl(34, 34, 40, m.chrome, 0, h * 0.5, 20, 20); pf.rotation.x = Math.PI / 2; g.add(pf);
  const ph = cyl(10, 12, 110, m.black, 0, h * 0.5 - 60, 40, 12); g.add(ph);
  g.add(boxMin(w - 80, 8, 90, m.steel, -(w - 80) / 2, 40, -90));
  for (const x of [-70, 70]) g.add(cyl(32, 26, 70, cache.get('#F8F6F1', { roughness: 0.3 }), x, 48 + 35, -45, 16));
  return g;
}

// ─── Kulkas (single / french / side-by-side) dengan housing + filler ───
export function genFridge(item: Item, ctx: GenCtx): Built {
  const { w, h, d } = item.dims;
  const cfg = item.config;
  const m = matsFor(ctx.cache, item.materials);
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  const corniceH = cfg.cornice ? (cfg.corniceHeight ?? 50) : 0;
  const effH = h - corniceH;
  const type = cfg.fridgeType ?? 'sbs';
  const fW = Math.min(cfg.fridgeW ?? 900, w - 40), fH = Math.min(cfg.fridgeH ?? 1750, effH - 60), fD = Math.min(cfg.fridgeD ?? 650, d);
  // Housing: panel samping + atas + belakang
  g.add(boxMin(T, effH, d, m.side, -w / 2, 0, -d / 2));
  g.add(boxMin(T, effH, d, m.side, w / 2 - T, 0, -d / 2));
  g.add(boxMin(w - 2 * T, T, d, m.body, -w / 2 + T, effH - T, -d / 2));
  g.add(boxMin(w - 2 * T, effH, 5, m.body, -w / 2 + T, 0, -d / 2));
  // Body kulkas
  const silver = ctx.cache.get('#C8CCD0', { roughness: 0.35, metalness: 0.6 });
  const dark = ctx.cache.get('#8E9399', { roughness: 0.4, metalness: 0.5 });
  const zBack = -d / 2 + 20, zFront = zBack + fD;
  g.add(boxMin(fW, fH, fD - 40, dark, -fW / 2, 0, zBack));
  g.add(boxMin(fW, 60, fD - 40, m.black, -fW / 2, 0, zBack)); // plinth grille
  const doorT = 40, doorH = fH - 70;
  const hs = { type: 'bar' as const, length: Math.min(600, doorH * 0.6), mat: m.handle, position: 'middle' as const };
  if (type === 'sbs') {
    const dw = fW / 2 - 3;
    const L = makeDoor({ w: dw, h: doorH, mat: silver, hinge: 'left', handle: { ...hs, position: 'middle' }, openAngle: 95, thick: doorT });
    L.pivot.position.set(-fW / 2, 62, zFront - 40 + doorT / 2); g.add(L.pivot); anims.push(L.anim);
    const R = makeDoor({ w: dw, h: doorH, mat: silver, hinge: 'right', handle: { ...hs, position: 'middle' }, openAngle: 95, thick: doorT });
    R.pivot.position.set(fW / 2, 62, zFront - 40 + doorT / 2); g.add(R.pivot); anims.push(R.anim);
    // water & ice dispenser recess di pintu kiri
    L.pivot.add(boxMin(170, 320, 30, m.black, dw / 2 - 85, doorH * 0.5, doorT / 2 - 28));
    L.pivot.add(box(120, 26, 3, ctx.cache.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 1.2 }), dw / 2, doorH * 0.5 + 290, doorT / 2 + 1));
  } else if (type === 'french') {
    const topH = doorH * 0.6, botH = doorH - topH - 6, dw = fW / 2 - 3;
    const L = makeDoor({ w: dw, h: topH, mat: silver, hinge: 'left', handle: { ...hs, length: Math.min(400, topH * 0.6) }, openAngle: 95, thick: doorT });
    L.pivot.position.set(-fW / 2, 62 + botH + 6, zFront - 40 + doorT / 2); g.add(L.pivot); anims.push(L.anim);
    const R = makeDoor({ w: dw, h: topH, mat: silver, hinge: 'right', handle: { ...hs, length: Math.min(400, topH * 0.6) }, openAngle: 95, thick: doorT });
    R.pivot.position.set(fW / 2, 62 + botH + 6, zFront - 40 + doorT / 2); g.add(R.pivot); anims.push(R.anim);
    const fz = new THREE.Group(); fz.position.set(0, 62, zFront - 40);
    const fd = box(fW, botH, doorT, silver, 0, botH / 2, doorT / 2); fd.userData.isDoor = true; fz.add(fd);
    const bar = cyl(6, 6, fW * 0.6, m.handle, 0, botH - 80, doorT + 20, 14); bar.rotation.z = Math.PI / 2; fz.add(bar);
    g.add(fz); anims.push({ obj: fz, prop: 'position', axis: 'z', closed: fz.position.z, open: fz.position.z + fD * 0.6, duration: 0.6, delay: 0.1 });
  } else {
    const D = makeDoor({ w: fW, h: doorH, mat: silver, hinge: 'right', handle: { ...hs, length: Math.min(700, doorH * 0.5), position: 'middle' }, openAngle: 95, thick: doorT });
    D.pivot.position.set(fW / 2, 62, zFront - 40 + doorT / 2); g.add(D.pivot); anims.push(D.anim);
    D.pivot.add(box(fW - 4, 6, doorT + 2, dark, -fW / 2, doorH * 0.74, 0)); // garis freezer
  }
  g.add(box(fW * 0.3, 20, 6, m.black, 0, fH - 30, zFront + 3)); // vent atas
  // Filler cabinet di atas kulkas → tinggi global dikurangi cornice
  const fillerY = fH + 40, fillerH = effH - fillerY;
  if (fillerH > 60) {
    g.add(boxMin(w - 2 * T, T, d, m.body, -w / 2 + T, fillerY, -d / 2));
    const hsp = handleSpecFrom(item.materials, m.handle);
    if (fillerH > 150) {
      const dh = fillerH - 2 * GAP;
      if (w > 650) {
        const dw = (w - 3 * GAP) / 2;
        const L = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'left', handle: hsp }); L.pivot.position.set(-w / 2 + GAP, fillerY + GAP, d / 2 + T / 2); g.add(L.pivot); anims.push(L.anim);
        const R = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'right', handle: hsp }); R.pivot.position.set(w / 2 - GAP, fillerY + GAP, d / 2 + T / 2); g.add(R.pivot); anims.push(R.anim);
      } else {
        const ld = makeLiftDoor(w - 2 * GAP, dh, m.door, hsp); ld.pivot.position.set(0, effH - GAP, d / 2 + T / 2); g.add(ld.pivot); anims.push(ld.anim);
      }
    } else g.add(box(w - 2 * GAP, fillerH - 2 * GAP, T, m.door, 0, fillerY + fillerH / 2, d / 2 + T / 2));
  }
  addCornice(g, item, ctx, m, w, h, d);
  return { group: g, animatables: anims };
}

// ─── Electronic Cabinet multi-combo (2 slot modular) ───
const SLOT1_H: Record<Slot1, number> = { magiccom: 330, dispenser: 580, oven: 340, shelf: 350 };
const SLOT2_H: Record<Slot2, number> = { oven: 340, microwave: 350, coffee: 480, shelf: 350, door: 0 };

export function genElectronic(item: Item, ctx: GenCtx): Built {
  const { w, h, d } = item.dims;
  const cfg = item.config;
  const m = matsFor(ctx.cache, item.materials);
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  const hs = handleSpecFrom(item.materials, m.handle);
  const tk = cfg.toeKickHeight ?? ctx.settings.toeKick;
  const corniceH = cfg.cornice ? (cfg.corniceHeight ?? 50) : 0;
  const effH = h - corniceH;
  const slot1 = cfg.slot1 ?? 'magiccom', slot2 = cfg.slot2 ?? 'oven';
  const base = ctx.settings.baseHeight;
  const s1y = base, s1h = SLOT1_H[slot1];
  const s2y = s1y + s1h + T, s2h = SLOT2_H[slot2];
  const topY = slot2 === 'door' ? s2y : s2y + s2h + T;
  const zFront = d / 2;
  const nicheW = w - 2 * T, nicheD = d - 5;

  g.add(makeToeKick(w, d, tk, m.toe));
  g.add(makeCarcass({ w, h: effH - tk, d, body: m.body, side: m.side, y: tk }));
  // Panel horizontal pembatas slot (dispenser lantai: tidak ada sekat di s1y)
  const seps = slot1 === 'dispenser' ? [s1y + s1h, ...(slot2 === 'door' ? [] : [s2y + s2h])] : [s1y, s1y + s1h, ...(slot2 === 'door' ? [] : [s2y + s2h])];
  for (const y of seps) g.add(boxMin(nicheW, T, d, m.body, -nicheW / 2, y, -d / 2));

  const doors = (y0: number, th: number) => {
    const dh = th - 2 * GAP;
    if (dh < 60) return;
    if (w > 650) {
      const dw = (w - 3 * GAP) / 2;
      const L = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'left', handle: hs }); L.pivot.position.set(-w / 2 + GAP, y0 + GAP, zFront + T / 2); g.add(L.pivot); anims.push(L.anim);
      const R = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'right', handle: hs }); R.pivot.position.set(w / 2 - GAP, y0 + GAP, zFront + T / 2); g.add(R.pivot); anims.push(R.anim);
    } else {
      const side = cfg.hingeSide ?? 'left';
      const D = makeDoor({ w: w - 2 * GAP, h: dh, mat: m.door, hinge: side, handle: hs }); D.pivot.position.set(side === 'left' ? -w / 2 + GAP : w / 2 - GAP, y0 + GAP, zFront + T / 2); g.add(D.pivot); anims.push(D.anim);
    }
  };
  if (slot1 !== 'dispenser') doors(tk, s1y - tk); // pintu bawah (dispenser lantai menutupi area ini)
  doors(topY, effH - topY);             // pintu atas

  const nicheLed = (y: number) => { if (item.led.insideUpper) addLed(g, ctx.cache, item, nicheW - 20, 0, y - 8, zFront - 50, 'down'); };
  // Slot 1 (bawah, sejajar countertop) — dispenser dari lantai
  const s1Floor = s1y + T;
  if (slot1 === 'magiccom') {
    const t = genMagicComTray(ctx.cache, m, nicheW, nicheD); t.group.position.set(0, s1Floor, zFront); rebaseAnims([t.anim], t.group); g.add(t.group); anims.push(t.anim);
  } else if (slot1 === 'dispenser') {
    const dspH = s1y + s1h - tk;
    const dsp = genDispenser(ctx.cache, m, nicheW, dspH, nicheD); dsp.position.set(0, tk, zFront); g.add(dsp);
  } else if (slot1 === 'oven') {
    const o = genOven(ctx.cache, m); o.group.position.set(0, s1Floor + 15, zFront); g.add(o.group);
  }
  nicheLed(s1y + s1h);
  // Slot 2 (atas, ketinggian mata)
  const s2Floor = s2y + T;
  if (slot2 === 'oven') { const o = genOven(ctx.cache, m); o.group.position.set(0, s2Floor + 15, zFront); g.add(o.group); }
  else if (slot2 === 'microwave') { const mw = genMicrowave(ctx.cache, m); mw.group.position.set(0, s2Floor + 10, zFront); g.add(mw.group); anims.push(mw.anim); }
  else if (slot2 === 'coffee') { const cf = genCoffeeMachine(ctx.cache, m, nicheW, s2h - T); cf.position.set(0, s2Floor + 10, zFront); g.add(cf); }
  if (slot2 !== 'door') nicheLed(s2y + s2h);
  if (item.led.plinth) addLed(g, ctx.cache, item, w - 20, 0, 10, d / 2 - 62, 'down');
  addCornice(g, item, ctx, m, w, h, d);
  return { group: g, animatables: anims };
}

// ─── Cooker hood: bottom sejajar bottom wall cabinet, filler otomatis di atas ───
export function genHood(item: Item, ctx: GenCtx): Built {
  const { w, h, d } = item.dims;
  const cfg = item.config;
  const m = matsFor(ctx.cache, item.materials);
  const g = new THREE.Group();
  const anims: Animatable[] = [];
  const corniceH = cfg.cornice ? (cfg.corniceHeight ?? 50) : 0;
  const effH = h - corniceH;
  // Canopy tipis di bawah filler — TANPA leher/cerobong; filler menutup penuh sampai hood
  const canopyH = Math.min(150, Math.max(40, cfg.hoodHeight ?? 70));
  const canopyD = Math.max(d + 150, 480);
  const canopyZ = canopyD / 2 - d / 2;
  g.add(box(w, canopyH, canopyD, m.steel, 0, canopyH / 2, canopyZ));
  g.add(box(w, Math.max(14, canopyH * 0.4), 12, m.black, 0, canopyH * 0.5, canopyZ + canopyD / 2 - 6));
  const grid = ctx.cache.get('#4B5563', { roughness: 0.5, metalness: 0.6 });
  for (const s of [-1, 1]) {
    g.add(box(w / 2 - 50, 3, canopyD - 120, grid, s * (w / 4), -1.5, canopyZ));
    for (let k = 0; k < 6; k++) g.add(box(w / 2 - 60, 2, 3, m.steel, s * (w / 4), -2, canopyZ - (canopyD - 140) / 2 + k * ((canopyD - 140) / 5)));
  }
  const lampOn = item.led.underCabinet;
  for (const s of [-1, 1]) {
    const lx = s * (w / 2 - 110), lz = canopyZ + canopyD / 2 - 90;
    g.add(cyl(22, 22, 4, ctx.cache.get('#FFF1D6', { emissive: '#FFE8B0', emissiveIntensity: lampOn ? 2.2 : 0.3 }), lx, -2, lz, 16));
    if (lampOn) { const pl = new THREE.PointLight(0xFFE8B0, 3 * (item.led.intensity / 100), 1.8, 2); pl.position.set(lx, -30, lz); pl.userData.isLed = true; pl.userData.baseIntensity = pl.intensity; g.add(pl); }
  }
  // Filler penuh: dari atas canopy sampai puncak wall cabinet (dikurangi cornice)
  const fillerY = canopyH, fillerH = effH - canopyH;
  if (fillerH > 40) {
    g.add(makeCarcass({ w, h: fillerH, d, body: m.body, side: m.side, y: fillerY }));
    const hsp = handleSpecFrom(item.materials, m.handle);
    const dh = fillerH - 2 * GAP;
    if (w > 700 && dh > 120) {
      const dw = (w - 3 * GAP) / 2;
      const L = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'left', handle: hsp }); L.pivot.position.set(-w / 2 + GAP, fillerY + GAP, d / 2 + T / 2); g.add(L.pivot); anims.push(L.anim);
      const R = makeDoor({ w: dw, h: dh, mat: m.door, hinge: 'right', handle: hsp }); R.pivot.position.set(w / 2 - GAP, fillerY + GAP, d / 2 + T / 2); g.add(R.pivot); anims.push(R.anim);
    } else {
      const ld = makeLiftDoor(w - 2 * GAP, dh, m.door, hsp); ld.pivot.position.set(0, effH - GAP, d / 2 + T / 2); g.add(ld.pivot); anims.push(ld.anim);
    }
  }
  addCornice(g, item, ctx, m, w, h, d);
  return { group: g, animatables: anims };
}
