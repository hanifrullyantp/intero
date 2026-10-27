// 3D Intero — Toolkit generator bersama (semua dalam mm; root scene di-scale 0.001)
import * as THREE from 'three';
import type { HandlePosition, HandleType, LedTemp, Materials } from '../types';
import { DOOR_MATERIALS, LED_TEMPS } from '../lib/constants';
import { isDark } from '../lib/utils';

export const T = 18;      // tebal plywood
export const BACK_T = 5;  // tebal HDF belakang
export const GAP = 2;     // celah pintu

export interface Animatable {
  obj: THREE.Object3D; prop: 'rotation' | 'position'; axis: 'x' | 'y' | 'z';
  closed: number; open: number; duration: number; delay: number; spin?: boolean;
}
export interface Built { group: THREE.Group; animatables: Animatable[] }

export interface MatOpts { roughness?: number; metalness?: number; opacity?: number; emissive?: number | string; emissiveIntensity?: number; map?: THREE.Texture | null; side?: THREE.Side }

export class MatCache {
  private cache = new Map<string, THREE.MeshStandardMaterial>();
  get(color: string | number, o: MatOpts = {}): THREE.MeshStandardMaterial {
    const key = [color, o.roughness ?? 0.5, o.metalness ?? 0, o.opacity ?? 1, o.emissive ?? 0, o.emissiveIntensity ?? 0, o.map?.uuid ?? '', o.side ?? 0].join('|');
    let m = this.cache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color), roughness: o.roughness ?? 0.5, metalness: o.metalness ?? 0,
        transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1, map: o.map ?? null, side: o.side ?? THREE.FrontSide,
      });
      if (o.emissive !== undefined) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; }
      m.userData.baseOpacity = o.opacity ?? 1;
      this.cache.set(key, m);
    }
    return m;
  }
  dispose() { for (const m of this.cache.values()) m.dispose(); this.cache.clear(); }
}

// ─── Primitif ───
const geoCache = new Map<string, THREE.BufferGeometry>();
function boxGeo(w: number, h: number, d: number) {
  const k = `b${w}|${h}|${d}`;
  let g = geoCache.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
  return g;
}
export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
/** Box dengan pusat di (x,y,z). */
export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) { return mesh(boxGeo(w, h, d), mat, x, y, z); }
/** Box dengan sudut minimum di (x,y,z). */
export function boxMin(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) { return mesh(boxGeo(w, h, d), mat, x + w / 2, y + h / 2, z + d / 2); }
export function cyl(rTop: number, rBot: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 24, open = false) {
  return mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open), mat, x, y, z);
}
export function sphere(r: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 20) { return mesh(new THREE.SphereGeometry(r, seg, seg), mat, x, y, z); }
export function torus(r: number, tube: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = mesh(new THREE.TorusGeometry(r, tube, 10, 32), mat, x, y, z); m.rotation.x = Math.PI / 2; return m;
}
export function group(x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); return g; }

// ─── Tekstur prosedural (canvas) ───
const texCache = new Map<string, THREE.CanvasTexture>();
function canvasTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = 1): THREE.CanvasTexture {
  let t = texCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
export function grainTexture(): THREE.CanvasTexture {
  return canvasTex('grain', 256, 512, (ctx) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * 256, a = 0.03 + Math.random() * 0.08;
      ctx.strokeStyle = `rgba(60,40,20,${a})`; ctx.lineWidth = 0.5 + Math.random() * 2;
      ctx.beginPath(); ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (Math.random() - 0.5) * 20, 170, x + (Math.random() - 0.5) * 20, 340, x + (Math.random() - 0.5) * 10, 512); ctx.stroke();
    }
  });
}
export function marbleTexture(base: string, vein: string): THREE.CanvasTexture {
  return canvasTex(`marble${base}${vein}`, 512, 512, (ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
    const rng = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    for (let i = 0; i < 22; i++) {
      ctx.strokeStyle = vein; ctx.globalAlpha = 0.12 + rng() * 0.28; ctx.lineWidth = 0.6 + rng() * 2.4;
      ctx.beginPath(); let x = rng() * 512, y = rng() * 512; ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { const nx = x + (rng() - 0.5) * 220, ny = y + (rng() - 0.5) * 220; ctx.quadraticCurveTo(x + (rng() - 0.5) * 120, y + (rng() - 0.5) * 120, nx, ny); x = nx; y = ny; }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, 2);
}
export function speckleTexture(base: string): THREE.CanvasTexture {
  return canvasTex(`speckle${base}`, 256, 256, (ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
    const dark = isDark(base);
    for (let i = 0; i < 2600; i++) {
      const v = dark ? 90 + Math.random() * 120 : 60 + Math.random() * 120;
      ctx.fillStyle = `rgba(${v},${v},${v},${0.18 + Math.random() * 0.3})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5);
    }
  }, 4);
}
export function woodTexture(base: string): THREE.CanvasTexture {
  return canvasTex(`wood${base}`, 512, 256, (ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`; ctx.fillRect(0, i * 28 + Math.random() * 6, 512, 2); }
    for (let i = 0; i < 90; i++) { ctx.strokeStyle = `rgba(40,20,0,${0.05 + Math.random() * 0.1})`; ctx.lineWidth = 0.5 + Math.random(); ctx.beginPath(); const y = Math.random() * 256; ctx.moveTo(0, y); ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 8, 340, y + (Math.random() - 0.5) * 8, 512, y); ctx.stroke(); }
  }, 2);
}
export function tileTexture(color: string): THREE.CanvasTexture {
  return canvasTex(`tile${color}`, 512, 256, (ctx) => {
    ctx.fillStyle = '#C9C2B8'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = color;
    for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) { const off = r % 2 ? 64 : 0; ctx.fillRect(c * 128 + off + 3, r * 64 + 3, 122, 58); }
  }, 1);
}
export function floorTexture(base = '#D9D2C7'): THREE.CanvasTexture {
  return canvasTex(`floor:${base}`, 512, 512, (ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(86,82,76,0.2)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke(); }
    for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`; ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3); }
  }, 1);
}

// ─── Material set per item ───
export interface MatSet { door: THREE.MeshStandardMaterial; body: THREE.MeshStandardMaterial; side: THREE.MeshStandardMaterial; toe: THREE.MeshStandardMaterial; handle: THREE.MeshStandardMaterial; interior: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial; frame: THREE.MeshStandardMaterial; steel: THREE.MeshStandardMaterial; black: THREE.MeshStandardMaterial; chrome: THREE.MeshStandardMaterial }
export function matsFor(cache: MatCache, m: Materials): MatSet {
  const spec = DOOR_MATERIALS[m.doorMaterial] ?? DOOR_MATERIALS.HPL;
  const door = cache.get(m.doorColor, { roughness: spec.roughness, metalness: spec.metalness, map: spec.grain ? grainTexture() : null });
  const bodyColor = m.bodyFollowsDoor ? m.doorColor : m.bodyColor;
  const body = cache.get(bodyColor, { roughness: 0.6, metalness: 0.02 });
  const side = m.sidesFollowDoor ? door : body;
  const toe = m.toeKickFollowsDoor ? door : body;
  const handleDark = isDark(m.handleColor);
  const handle = cache.get(m.handleColor, { roughness: handleDark ? 0.3 : 0.4, metalness: handleDark ? 0.6 : 0.9 });
  return {
    door, body, side, toe, handle,
    interior: cache.get(bodyColor, { roughness: 0.7, metalness: 0.0 }),
    glass: cache.get('#BFE3EE', { roughness: 0.05, metalness: 0.1, opacity: 0.32, side: THREE.DoubleSide }),
    frame: cache.get(m.doorColor, { roughness: 0.4, metalness: 0.3 }),
    steel: cache.get('#C8CCD0', { roughness: 0.35, metalness: 0.85 }),
    black: cache.get('#1A1A1A', { roughness: 0.4, metalness: 0.3 }),
    chrome: cache.get('#E2E5E9', { roughness: 0.15, metalness: 1.0 }),
  };
}

// ─── Handle ───
export interface HandleSpec { type: HandleType; length: number; mat: THREE.Material; position: HandlePosition }
/** Handle vertikal (pintu) atau horizontal (laci). Dikembalikan dengan pusat di origin. */
export function makeHandle(spec: HandleSpec, orientation: 'v' | 'h', faceW: number): THREE.Group | null {
  const g = new THREE.Group();
  const L = Math.min(spec.length, orientation === 'h' ? faceW - 60 : spec.length);
  if (spec.type === 'push') return null;
  if (spec.type === 'bar') {
    const bar = cyl(5, 5, L, spec.mat, 0, 0, 22, 16);
    if (orientation === 'h') bar.rotation.z = Math.PI / 2;
    g.add(bar);
    for (const s of [-1, 1]) {
      const st = cyl(4, 4, 22, spec.mat, orientation === 'v' ? 0 : s * (L / 2 - 14), orientation === 'v' ? s * (L / 2 - 14) : 0, 11, 12);
      st.rotation.x = Math.PI / 2; g.add(st);
    }
  } else if (spec.type === 'knob') {
    const stem = cyl(5, 7, 16, spec.mat, 0, 0, 8, 16); stem.rotation.x = Math.PI / 2; g.add(stem);
    g.add(sphere(14, spec.mat, 0, 0, 24, 18));
  } else if (spec.type === 'j') {
    g.add(box(Math.min(faceW - 8, 220), 26, 16, spec.mat, 0, 0, 8));
  } else {
    g.add(box(faceW - 4, 34, 14, spec.mat, 0, 0, 4)); // gola profile channel
  }
  return g;
}
function handleY(pos: HandlePosition, h: number, L: number) {
  if (pos === 'top') return Math.max(L / 2 + 20, h - 110 - L / 2);
  if (pos === 'bottom') return Math.min(h - L / 2 - 20, 110 + L / 2);
  return h / 2;
}

// ─── Pintu swing ───
export interface DoorOpts { w: number; h: number; mat: THREE.Material; hinge: 'left' | 'right'; handle?: HandleSpec | null; glass?: { frame: THREE.Material; glass: THREE.Material } | null; openAngle?: number; thick?: number; profileEdge?: 'top' | 'bottom' }
/** Pivot diletakkan pemanggil di sisi engsel (x engsel, y bawah pintu, z bidang tengah pintu). */
export function makeDoor(o: DoorOpts): { pivot: THREE.Group; anim: Animatable } {
  const thick = o.thick ?? T;
  const pivot = new THREE.Group();
  const dir = o.hinge === 'left' ? 1 : -1;
  const cx = dir * (o.w / 2);
  if (o.glass) {
    const fw = 60;
    pivot.add(box(o.w, fw, thick, o.glass.frame, cx, o.h - fw / 2, 0));
    pivot.add(box(o.w, fw, thick, o.glass.frame, cx, fw / 2, 0));
    pivot.add(box(fw, o.h - 2 * fw, thick, o.glass.frame, cx - dir * (o.w / 2 - fw / 2), o.h / 2, 0));
    pivot.add(box(fw, o.h - 2 * fw, thick, o.glass.frame, cx + dir * (o.w / 2 - fw / 2), o.h / 2, 0));
    const pane = box(o.w - 2 * fw, o.h - 2 * fw, 5, o.glass.glass, cx, o.h / 2, 0); pane.castShadow = false; pivot.add(pane);
  } else {
    const d = box(o.w, o.h, thick, o.mat, cx, o.h / 2, 0);
    d.userData.isDoor = true; pivot.add(d);
  }
  if (o.handle) {
    const hg = makeHandle(o.handle, 'v', o.w);
    if (hg) {
      const isProfile = o.handle.type === 'j' || o.handle.type === 'gola';
      const hx = isProfile ? cx : dir * (o.w - 45);
      const hy = isProfile ? (o.profileEdge === 'bottom' ? (o.handle.type === 'gola' ? 17 : 13) : o.h - (o.handle.type === 'gola' ? 17 : 13)) : handleY(o.handle.position, o.h, o.handle.length);
      hg.position.set(hx, hy, thick / 2); pivot.add(hg);
    }
  }
  const openAngle = (o.openAngle ?? 110) * (Math.PI / 180);
  return { pivot, anim: { obj: pivot, prop: 'rotation', axis: 'y', closed: 0, open: -dir * openAngle, duration: 0.6, delay: 0 } };
}

/** Pintu lift-up (engsel atas). Pivot di tepi atas pintu. */
export function makeLiftDoor(w: number, h: number, mat: THREE.Material, handle: HandleSpec | null): { pivot: THREE.Group; anim: Animatable } {
  const pivot = new THREE.Group();
  const d = box(w, h, T, mat, 0, -h / 2, 0); d.userData.isDoor = true; pivot.add(d);
  if (handle) { const hg = makeHandle({ ...handle, length: Math.min(handle.length, w - 80) }, 'h', w); if (hg) { hg.position.set(0, -h + 60, T / 2); pivot.add(hg); } }
  return { pivot, anim: { obj: pivot, prop: 'rotation', axis: 'x', closed: 0, open: -85 * (Math.PI / 180), duration: 0.6, delay: 0 } };
}

// ─── Laci ───
export interface DrawerOpts { w: number; h: number; d: number; frontMat: THREE.Material; boxMat: THREE.Material; handle?: HandleSpec | null; travel?: number }
/** Origin: tengah-x, bawah laci, z = bidang depan carcass (front plate z∈[0,T], box ke -d). */
export function makeDrawer(o: DrawerOpts): { group: THREE.Group; anim: Animatable } {
  const g = new THREE.Group();
  const front = box(o.w, o.h, T, o.frontMat, 0, o.h / 2, T / 2); front.userData.isDoor = true; g.add(front);
  const bw = o.w - 2 * GAP - 24, bd = o.d - 40, bh = Math.max(40, o.h - 50);
  const wallT = 12;
  g.add(boxMin(bw, wallT, bd, o.boxMat, -bw / 2, 20, -bd));
  g.add(boxMin(wallT, bh, bd, o.boxMat, -bw / 2, 20, -bd));
  g.add(boxMin(wallT, bh, bd, o.boxMat, bw / 2 - wallT, 20, -bd));
  g.add(boxMin(bw, bh, wallT, o.boxMat, -bw / 2, 20, -bd));
  if (o.handle) {
    const hg = makeHandle(o.handle, 'h', o.w);
    if (hg) { const isProfile = o.handle.type === 'j' || o.handle.type === 'gola'; hg.position.set(0, isProfile ? o.h - 15 : o.h / 2, T); g.add(hg); }
  }
  return { group: g, anim: { obj: g, prop: 'position', axis: 'z', closed: g.position.z, open: g.position.z + (o.travel ?? o.d * 0.9), duration: 0.5, delay: 0 } };
}

// ─── Carcass ───
export interface CarcassOpts { w: number; h: number; d: number; body: THREE.Material; side: THREE.Material; y?: number; top?: boolean; bottom?: boolean; back?: boolean; shelves?: number[] }
/** Frame lokal: x∈[-w/2,w/2], y∈[y, y+h], z∈[-d/2, d/2], depan di +z. */
export function makeCarcass(o: CarcassOpts): THREE.Group {
  const g = new THREE.Group();
  const y0 = o.y ?? 0;
  g.add(boxMin(T, o.h, o.d, o.side, -o.w / 2, y0, -o.d / 2));
  g.add(boxMin(T, o.h, o.d, o.side, o.w / 2 - T, y0, -o.d / 2));
  if (o.bottom !== false) g.add(boxMin(o.w - 2 * T, T, o.d, o.body, -o.w / 2 + T, y0, -o.d / 2));
  if (o.top !== false) g.add(boxMin(o.w - 2 * T, T, o.d, o.body, -o.w / 2 + T, y0 + o.h - T, -o.d / 2));
  if (o.back !== false) g.add(boxMin(o.w - 2 * T, o.h - 2 * T, BACK_T, o.body, -o.w / 2 + T, y0 + T, -o.d / 2));
  for (const sy of o.shelves ?? []) g.add(boxMin(o.w - 2 * T, T, o.d - 30, o.body, -o.w / 2 + T, y0 + sy, -o.d / 2 + 10));
  return g;
}

/** Toe kick BOX tertutup di semua sisi (depan, kiri, kanan, belakang). */
export function makeToeKick(w: number, d: number, h: number, mat: THREE.Material, inset = 50): THREE.Mesh {
  return boxMin(w, h, d - inset, mat, -w / 2, 0, -d / 2);
}

// ─── LED strip ───
export function ledHex(temp: LedTemp) { return LED_TEMPS.find((t) => t.value === temp)?.hex ?? 0xFFF4E5; }
export function makeLedStrip(cache: MatCache, len: number, temp: LedTemp, intensity01: number, withLight = true): { group: THREE.Group; light: THREE.PointLight | null; mesh: THREE.Mesh } {
  const g = new THREE.Group();
  const hex = ledHex(temp);
  const m = box(len, 5, 10, cache.get(hex, { emissive: hex, emissiveIntensity: 1.6 + intensity01 }), 0, 0, 0);
  m.castShadow = false; m.userData.isLed = true; g.add(m);
  let light: THREE.PointLight | null = null;
  if (withLight) {
    light = new THREE.PointLight(hex, intensity01 * 6, 1.6, 2);
    light.position.set(0, -20, 40); light.userData.isLed = true; light.userData.baseIntensity = intensity01 * 6;
    g.add(light);
  }
  return { group: g, light, mesh: m };
}

// ─── Label sprite (untuk ukur/dimensi & rangka) ───
export function makeLabel(text: string, bg = '#0F172A', fg = '#FFFFFF'): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = '800 50px "JetBrains Mono", "Inter", monospace';
  const tw = Math.min(476, Math.max(180, ctx.measureText(text).width + 64));
  const x0 = (512 - tw) / 2;
  ctx.fillStyle = bg;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(x0, 12, tw, 104, 24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66, 460);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(280, 70, 1); sp.renderOrder = 999;
  return sp;
}

export function handleSpecFrom(m: Materials, mat: THREE.Material): HandleSpec {
  return { type: m.handleType, length: m.handleLength, mat, position: m.handlePosition };
}

/** Terapkan opacity ke seluruh mesh dalam group (dengan clone material agar aman per-item). */
export function setGroupOpacity(root: THREE.Object3D, opacity: number | null, onlyDoors = false) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (onlyDoors && !m.userData.isDoor && !m.userData.isDoorPanel) return;
    let mat = m.material as THREE.MeshStandardMaterial;
    if (!mat) return;
    // Clone agar tidak mengubah material cache bersama (X-Ray benar-benar bekerja per-objek)
    if (!mat.userData._xrayOwned) {
      mat = mat.clone();
      mat.userData._xrayOwned = true;
      mat.userData.baseOpacity = (m.material as THREE.MeshStandardMaterial).userData.baseOpacity ?? (m.material as THREE.MeshStandardMaterial).opacity ?? 1;
      m.material = mat;
    }
    const base = (mat.userData.baseOpacity as number | undefined) ?? 1;
    if (opacity === null) {
      mat.opacity = base;
      mat.transparent = base < 1;
      mat.depthWrite = base >= 1;
    } else {
      mat.opacity = Math.min(base, opacity);
      mat.transparent = true;
      mat.depthWrite = false;
    }
    mat.needsUpdate = true;
  });
}

/** Label dimensi (monospace) — kontras tinggi mengikuti tema; kuning bila peringatan. */
export function makeDimLabel(text: string, dark: boolean, warn = false): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = '800 50px "JetBrains Mono", "Inter", monospace';
  const tw = Math.min(484, Math.max(190, ctx.measureText(text).width + 64));
  const x0 = (512 - tw) / 2;
  ctx.fillStyle = warn ? 'rgba(245,158,11,0.98)' : dark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)';
  ctx.strokeStyle = warn ? '#B45309' : dark ? 'rgba(56,189,248,0.65)' : 'rgba(15,23,42,0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(x0, 14, tw, 100, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = warn ? '#1F1300' : dark ? '#F8FAFC' : '#0F172A';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66, 464);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(270, 68, 1); sp.renderOrder = 997;
  return sp;
}
