import * as THREE from 'three';
import type { Item } from '../models/types';

/**
 * Loose furniture: island table, bar counter, dining table, dining chair, bar stool, kitchen trolley.
 * Built in the item's local frame: x ∈ [0, W], y ∈ [0, H] (up), z ∈ [0, D] (z = D is the front).
 * The caller places the group with placeGroup().
 */
export interface FurnMats {
  body: THREE.Material;
  door: THREE.Material;
  top: THREE.Material;
  fabric: THREE.Material;
  metal: THREE.Material;
  dark: THREE.Material;
}

/** box whose origin is the MIN corner (x, y, z) */
function bx(sx: number, sy: number, sz: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
  mesh.position.set(x + sx / 2, y + sy / 2, z + sz / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** cylinder standing on y = y0, centred at (cx, cz) */
function cyl(r: number, h: number, m: THREE.Material, cx: number, y0: number, cz: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), m);
  mesh.position.set(cx, y0 + h / 2, cz);
  mesh.castShadow = true;
  return mesh;
}

/** worktop-height counter with cabinet body and doors on the front. `overhang` = front cantilever (bar seating) */
function counter(it: Item, m: FurnMats, overhang: number): THREE.Group {
  const g = new THREE.Group();
  const W = it.width, H = it.height, D = it.depth;
  const topT = 3.5;
  const kick = 8;
  g.add(bx(W + 4, topT, D + 4 + overhang, m.top, -2, H - topT, -2));
  g.add(bx(W, H - topT - kick, D, m.body, 0, kick, 0));
  g.add(bx(W - 6, kick, D - 6, m.dark, 3, 0, 3));
  const n = Math.max(2, Math.round(W / 45));
  const dw = W / n;
  for (let i = 0; i < n; i++) {
    g.add(bx(dw - 0.8, H - topT - kick - 1.5, 1.8, m.door, i * dw + 0.4, kick + 0.6, D));
    g.add(bx(dw * 0.45, 1.1, 1.4, m.metal, i * dw + dw * 0.275, H - topT - 7, D + 1.8));
  }
  return g;
}

export function buildFurnitureItem(it: Item, m: FurnMats): THREE.Group {
  const g = new THREE.Group();
  const W = it.width, H = it.height, D = it.depth;
  switch (it.subtype) {
    case 'fur_island':
      return counter(it, m, 0);
    case 'fur_bar':
      return counter(it, m, 14);
    case 'fur_dining': {
      const topT = 3;
      g.add(bx(W, topT, D, m.top, 0, H - topT, 0));
      const inset = 6;
      for (const x of [inset, W - inset - 5]) for (const z of [inset, D - inset - 5]) g.add(bx(5, H - topT, 5, m.body, x, 0, z));
      g.add(bx(W - 2 * inset, 9, 2, m.body, inset, H - topT - 9, inset));
      g.add(bx(W - 2 * inset, 9, 2, m.body, inset, H - topT - 9, D - inset - 2));
      g.add(bx(2, 9, D - 2 * inset, m.body, inset, H - topT - 9, inset));
      g.add(bx(2, 9, D - 2 * inset, m.body, W - inset - 2, H - topT - 9, inset));
      return g;
    }
    case 'fur_chair': {
      const seatY = 44;
      g.add(bx(W, 4.5, D - 4, m.fabric, 0, seatY, 4));
      for (const x of [2, W - 4.5]) for (const z of [4, D - 6.5]) g.add(bx(2.5, seatY, 2.5, m.body, x, 0, z));
      g.add(bx(W - 2, H - seatY - 4.5, 2.5, m.fabric, 1, seatY + 4.5, 0));
      return g;
    }
    case 'fur_stool': {
      const r = W / 2;
      g.add(cyl(r, 4, m.fabric, r, H - 4, r));
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        g.add(cyl(1.3, H - 4, m.metal, r + Math.cos(a) * (r - 6), 0, r + Math.sin(a) * (r - 6)));
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 6, 0.7, 8, 24), m.metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(r, 14, r);
      g.add(ring);
      return g;
    }
    case 'fur_trolley': {
      const sideT = 1.8;
      g.add(bx(sideT, H - 6, D, m.body, 0, 6, 0));
      g.add(bx(sideT, H - 6, D, m.body, W - sideT, 6, 0));
      for (const y of [6, H * 0.36, H * 0.68, H - 1.6]) g.add(bx(W, 1.6, D, m.top, 0, y, 0));
      g.add(bx(W, 2.5, 1.2, m.metal, 0, H - 2.5, 0));
      for (const x of [3, W - 5.5]) for (const z of [4, D - 6.5]) g.add(cyl(2.5, 2.5, m.dark, x + 2.5, 0, z + 2.5));
      return g;
    }
    default:
      g.add(bx(W, H, D, m.body, 0, 0, 0));
      return g;
  }
}
