// 3D Intero — Aksesoris internal per-pintu (semua pull-out beranimasi)
import * as THREE from 'three';
import type { GasType } from '../types';
import { type Animatable, type HandleSpec, type MatCache, type MatSet, box, boxMin, cyl, makeHandle, sphere, torus, T } from './common';

export interface AccOpts { w: number; h: number; d: number; mats: MatSet; cache: MatCache; handle: HandleSpec | null; gasType?: GasType; spiceWidth?: 150 | 200 }
export interface AccBuilt { group: THREE.Group; animatables: Animatable[]; ownFront: boolean }

/** Origin aksesoris: tengah-x kompartemen, y = dasar interior, z = bidang depan carcass (pintu di z∈[0,T]). */
function attachFront(g: THREE.Group, w: number, h: number, o: AccOpts) {
  const front = box(w - 2, h, T, o.mats.door, 0, h / 2, T / 2); front.userData.isDoor = true; g.add(front);
  if (o.handle) {
    const hg = makeHandle(o.handle, 'v', w);
    if (hg) {
      const isProfile = o.handle.type === 'j' || o.handle.type === 'gola';
      hg.position.set(isProfile ? 0 : w / 2 - 45, isProfile ? h - 15 : Math.max(o.handle.length / 2 + 20, h - 110 - o.handle.length / 2), T); g.add(hg);
    }
  }
}
function rails(g: THREE.Group, w: number, d: number, y: number, mat: THREE.Material, heavy = false) {
  const t = heavy ? 14 : 8;
  for (const s of [-1, 1]) g.add(boxMin(t, heavy ? 30 : 20, d - 60, mat, s * (w / 2 - 20) - t / 2, y, -d + 40));
}
function wireShelf(g: THREE.Group, w: number, d: number, y: number, chrome: THREE.Material) {
  const plate = boxMin(w, 3, d, chrome, -w / 2, y, -d); plate.castShadow = false; g.add(plate);
  for (let i = 0; i < 2; i++) {
    const fence = cyl(3, 3, w, chrome, 0, y + 40, i === 0 ? -8 : -d + 8, 8); fence.rotation.z = Math.PI / 2; g.add(fence);
  }
  for (const s of [-1, 1]) { const side = cyl(3, 3, d, chrome, s * (w / 2 - 4), y + 40, -d / 2, 8); side.rotation.x = Math.PI / 2; g.add(side); }
}
function pulloutAnim(g: THREE.Group, travel: number, delay = 0): Animatable {
  return { obj: g, prop: 'position', axis: 'z', closed: g.position.z, open: g.position.z + travel, duration: 0.8, delay };
}

// 1. RAK PIRING TARIK 2-TIER (model Huben 2 susun)
export function genDishRack(o: AccOpts): AccBuilt {
  const g = new THREE.Group();
  const { chrome, black, cache } = { chrome: o.mats.chrome, black: o.mats.black, cache: o.cache };
  const iw = o.w - 50, id = o.d - 60;
  rails(g, o.w, o.d, 20, o.mats.steel);
  g.add(boxMin(iw - 20, 12, id - 20, black, -(iw - 20) / 2, 8, -id + 10)); // drip tray
  // tier bawah: gelas & mangkok
  wireShelf(g, iw, id - 20, 60, chrome);
  const glassMat = cache.get('#D8F0F5', { roughness: 0.05, metalness: 0.05, opacity: 0.45 });
  const cols = Math.max(2, Math.floor(iw / 95));
  for (let i = 0; i < cols; i++) {
    const x = -iw / 2 + 50 + i * (iw - 100) / Math.max(1, cols - 1);
    g.add(cyl(32, 26, 95, glassMat, x, 63 + 47, -id / 2 - 40, 16));
    if (i % 2 === 0) g.add(cyl(60, 40, 50, cache.get('#F4F4F2', { roughness: 0.3 }), x, 63 + 25, -id / 2 + 70, 20));
  }
  // tier atas: piring vertikal
  const ty = Math.max(260, o.h * 0.52);
  wireShelf(g, iw, id - 20, ty, chrome);
  const plateMat = cache.get('#FAFAF7', { roughness: 0.25, metalness: 0.02 });
  const slots = Math.min(16, Math.max(8, Math.floor((iw - 80) / 32)));
  for (let i = 0; i < slots; i++) {
    const x = -iw / 2 + 40 + i * ((iw - 80) / (slots - 1));
    const wire = cyl(2, 2, 130, chrome, x, ty + 65, -id / 2 - 10, 6); g.add(wire);
    if (i % 2 === 1) { const plate = cyl(105, 105, 5, plateMat, x + 8, ty + 110, -id / 2 - 10, 28); plate.rotation.z = Math.PI / 2; g.add(plate); }
  }
  attachFront(g, o.w, o.h, o);
  return { group: g, animatables: [pulloutAnim(g, Math.min(400, o.d * 0.72))], ownFront: true };
}

// 2. RAK BUMBU TARIK (150/200)
export function genSpiceRack(o: AccOpts): AccBuilt {
  const g = new THREE.Group();
  const sw = Math.min(o.w - 40, o.spiceWidth ?? 200), id = o.d - 60;
  rails(g, sw + 36, o.d, 20, o.mats.steel);
  const perTier = sw >= 200 ? 4 : 3;
  const glassMat = o.cache.get('#E7D9B8', { roughness: 0.1, metalness: 0.02, opacity: 0.7 });
  const capMat = o.cache.get('#C9CCD1', { roughness: 0.3, metalness: 0.9 });
  const tiers = [40, Math.max(300, o.h * 0.5)];
  for (const ty of tiers) {
    wireShelf(g, sw, id - 20, ty, o.mats.chrome);
    for (let i = 0; i < perTier; i++) {
      const z = -40 - i * ((id - 90) / Math.max(1, perTier - 1));
      for (let c = 0; c < (sw >= 200 ? 2 : 1); c++) {
        const x = sw >= 200 ? (c === 0 ? -sw / 4 : sw / 4) : 0;
        g.add(cyl(22, 22, 92, glassMat, x, ty + 3 + 46, z, 14));
        g.add(cyl(20, 20, 14, capMat, x, ty + 3 + 92 + 7, z, 14));
      }
    }
  }
  attachFront(g, o.w, o.h, o);
  return { group: g, animatables: [pulloutAnim(g, Math.min(420, o.d * 0.75))], ownFront: true };
}

// 3. RAK GAS TARIK (12kg pink Pertamina / 3kg hijau / 5.5kg biru)
export function genGasRack(o: AccOpts): AccBuilt {
  const g = new THREE.Group();
  const type = o.gasType ?? '12kg';
  const spec = type === '12kg' ? { r: 150, h: 520, color: '#F28CB1' } : type === '3kg' ? { r: 110, h: 280, color: '#2E8B57' } : { r: 125, h: 400, color: '#2E6DB4' };
  const iw = o.w - 50, id = o.d - 60;
  rails(g, o.w, o.d, 20, o.mats.steel, true);
  const grid = boxMin(iw - 10, 10, id - 20, o.mats.black, -(iw - 10) / 2, 30, -id + 10); g.add(grid);
  for (let i = 0; i < 4; i++) g.add(boxMin(iw - 10, 6, 10, o.mats.chrome, -(iw - 10) / 2, 40, -id + 20 + i * ((id - 50) / 3)));
  const body = o.cache.get(spec.color, { roughness: 0.35, metalness: 0.4 });
  const cz = -id / 2, cy = 46;
  g.add(cyl(spec.r, spec.r, spec.h, body, 0, cy + spec.h / 2, cz, 32));
  const dome = sphere(spec.r, body, 0, cy + spec.h, cz, 24); dome.scale.y = 0.42; g.add(dome);
  const dome2 = sphere(spec.r, body, 0, cy, cz, 24); dome2.scale.y = 0.3; g.add(dome2);
  g.add(torus(spec.r * 0.55, 10, body, 0, cy + spec.h + spec.r * 0.42 + 2, cz));
  const ring = cyl(spec.r * 0.85, spec.r * 0.85, 10, body, 0, cy + 5, cz, 24, true); g.add(ring);
  g.add(cyl(24, 24, 30, o.mats.steel, 0, cy + spec.h + spec.r * 0.42 + 10, cz, 16)); // valve
  g.add(box(56, 40, 56, o.mats.black, 0, cy + spec.h + spec.r * 0.42 + 46, cz)); // regulator
  g.add(cyl(14, 14, 60, o.mats.black, 40, cy + spec.h + spec.r * 0.42 + 46, cz, 12)); // knob
  const hose = cyl(7, 7, 220, o.mats.black, 0, cy + spec.h + spec.r * 0.42 + 46, cz - 110, 8); hose.rotation.x = Math.PI / 2; g.add(hose);
  attachFront(g, o.w, o.h, o);
  return { group: g, animatables: [pulloutAnim(g, Math.min(380, o.d * 0.7))], ownFront: true };
}

// 4. LACI TATAKAN SENDOK (inner drawer di belakang pintu swing)
export function genCutleryDrawer(o: AccOpts): AccBuilt {
  const g = new THREE.Group();
  const iw = o.w - 60, id = o.d - 90, ih = 70;
  const bamboo = o.cache.get('#D9B87A', { roughness: 0.6 });
  const bx = boxMin(iw, 10, id, o.mats.interior, -iw / 2, 40, -id - 10); g.add(bx);
  for (const s of [-1, 1]) g.add(boxMin(10, ih, id, o.mats.interior, s * (iw / 2) - (s > 0 ? 10 : 0), 40, -id - 10));
  g.add(boxMin(iw, ih, 10, o.mats.interior, -iw / 2, 40, -id - 10));
  g.add(boxMin(iw, ih + 10, 14, o.mats.door, -iw / 2, 40, -14));
  const slots = iw >= 480 ? 7 : 6;
  const sw = (iw - 20) / slots;
  for (let i = 1; i < slots; i++) g.add(boxMin(5, 50, id - 10, bamboo, -iw / 2 + 10 + i * sw, 50, -id - 5));
  g.add(boxMin(iw - 20, 50, 5, bamboo, -iw / 2 + 10, 50, -id / 2 - 10));
  const silver = o.mats.chrome;
  for (let i = 0; i < slots; i++) {
    const x = -iw / 2 + 10 + (i + 0.5) * sw;
    for (let k = 0; k < 3; k++) {
      const z = -id / 2 + 30 - k * 10, kind = i % 3;
      const handle = boxMin(8, 3, 95, silver, x - 4 + k * 3, 58 + k * 3, z - 95); g.add(handle);
      if (kind === 0) { const bowl = sphere(13, silver, x + k * 3, 60 + k * 3, z + 12, 10); bowl.scale.set(1, 0.3, 1.3); g.add(bowl); }
      else if (kind === 1) { for (let t = 0; t < 3; t++) g.add(boxMin(2, 2, 36, silver, x - 6 + t * 5 + k * 3, 59 + k * 3, z)); }
      else g.add(boxMin(16, 2, 70, silver, x - 8 + k * 3, 59 + k * 3, z));
    }
  }
  return { group: g, animatables: [{ obj: g, prop: 'position', axis: 'z', closed: 0, open: Math.min(300, o.d * 0.55), duration: 0.7, delay: 0.25 }], ownFront: false };
}

// 5. PULL-OUT TRASH BIN (organik + anorganik, tutup swing-up)
export function genTrashBin(o: AccOpts): AccBuilt {
  const g = new THREE.Group();
  const iw = o.w - 50, id = o.d - 60;
  rails(g, o.w, o.d, 20, o.mats.steel, true);
  g.add(boxMin(iw - 10, 12, id - 20, o.mats.steel, -(iw - 10) / 2, 30, -id + 10));
  const bh = Math.min(o.h - 120, 400), r = Math.min(110, iw / 4 - 10);
  const colors = ['#3F8F5A', '#6B7280'];
  const anims: Animatable[] = [];
  colors.forEach((c, i) => {
    const x = (i === 0 ? -1 : 1) * (iw / 4);
    const mat = o.cache.get(c, { roughness: 0.5 });
    g.add(cyl(r, r * 0.86, bh, mat, x, 42 + bh / 2, -id / 2, 24));
    const lidPivot = new THREE.Group(); lidPivot.position.set(x, 42 + bh + 4, -id / 2 - r);
    const lid = cyl(r + 6, r + 6, 10, o.cache.get('#2B2F36', { roughness: 0.4 }), 0, 5, r, 24); lidPivot.add(lid);
    g.add(lidPivot);
    anims.push({ obj: lidPivot, prop: 'rotation', axis: 'x', closed: 0, open: -75 * (Math.PI / 180), duration: 0.5, delay: 0.5 + i * 0.1 });
  });
  attachFront(g, o.w, o.h, o);
  anims.unshift(pulloutAnim(g, Math.min(420, o.d * 0.75)));
  return { group: g, animatables: anims, ownFront: true };
}

// 6. LAZY SUSAN (corner) — platform berputar 360°
export function genLazySusan(o: AccOpts & { radius: number; cx: number; cz: number }): AccBuilt {
  const g = new THREE.Group(); g.position.set(o.cx, 0, o.cz);
  g.add(cyl(14, 14, o.h - 40, o.mats.chrome, 0, (o.h - 40) / 2 + 20, 0, 12));
  const spinner = new THREE.Group();
  const plateMat = o.cache.get('#E8E6E1', { roughness: 0.4 });
  for (const py of [60, Math.max(300, o.h * 0.55)]) {
    spinner.add(cyl(o.radius, o.radius, 12, plateMat, 0, py, 0, 40));
    const rim = cyl(o.radius, o.radius, 36, o.mats.chrome, 0, py + 24, 0, 40, true); rim.castShadow = false; spinner.add(rim);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      spinner.add(cyl(38, 32, 110, o.cache.get(['#F1F1EE', '#C84E3A', '#3A6EA5', '#E0B14A'][i], { roughness: 0.4 }), Math.cos(a) * o.radius * 0.6, py + 6 + 55, Math.sin(a) * o.radius * 0.6, 16));
    }
  }
  g.add(spinner);
  return { group: g, animatables: [{ obj: spinner, prop: 'rotation', axis: 'y', closed: 0, open: Math.PI * 2, duration: 3, delay: 0.3, spin: true }], ownFront: false };
}
