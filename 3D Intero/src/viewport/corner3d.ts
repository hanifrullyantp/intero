import * as THREE from 'three';
import type { Item, Part } from '../models/types';
import { buildHandle, type HandleSpec } from './handles3d';

/**
 * True L-corner cabinet, rendered in its own local frame (x along the front, z toward the room).
 *
 *   • carcass / back / shelves / toe-kick: static boxes from the parametric parts
 *   • doors: one hinged panel per opening. The hinge sits at the END FARTHEST from the corner,
 *     so the closed panels meet at the inner corner at 90° and face into the corner.
 *   • handles: the same builder as every other door (global style, per-item override, ergonomic
 *     position rules, gola flush with the cabinet bottom on wall units).
 */
export interface CornerMats {
  carcass: THREE.Material;
  back: THREE.Material;
  toe: THREE.Material;
  door: THREE.Material;
  handle: THREE.Material;
  /** exposed side / end panels (door colour when "sides follow door" is on) */
  side: THREE.Material;
}

export interface CornerHandleOpt {
  type: string;
  finish: string;
  pos: HandleSpec['pos'];
  cat: 'base' | 'wall' | 'tall';
  doorHex: string;
}

export interface CornerOpts {
  doorsOpen: boolean;
  handle?: CornerHandleOpt;
}

function mesh(sx: number, sy: number, sz: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x + sx / 2, y + sy / 2, z + sz / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** one door panel pivoting around a vertical hinge at its far end */
function buildDoor(p: Part, left: boolean, openAmount: number, mats: CornerMats, handle?: CornerHandleOpt): THREE.Group {
  const b = p.box;
  const isSide = !!p.sideFace;
  const th = isSide ? b.sx : b.sz;      // panel thickness
  const dh = b.sy;                      // panel height
  let hx: number, hz: number, vx = 0, vz = 0, nx = 0, nz = 0;
  if (!isSide) {
    // front panel: hinge at the far end, free end toward the corner, faces +z (the room)
    const far = left ? b.x + b.sx : b.x;
    const near = left ? b.x : b.x + b.sx;
    hx = far;
    hz = b.z + th / 2;
    vx = near - far;
    nz = 1;
  } else {
    // side panel: hinge at the far end (z = D), free end toward the corner, faces into the L
    const far = b.z + b.sz;
    const near = b.z;
    hx = b.x + th / 2;
    hz = far;
    vz = near - far;
    nx = left ? 1 : -1;
  }
  const pivot = new THREE.Group();
  pivot.position.set(hx, b.y, hz);

  const len = isSide ? Math.abs(vz) : Math.abs(vx);
  const sx = isSide ? th : Math.max(len, 1);
  const sz = isSide ? Math.max(len, 1) : th;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(sx, dh, sz), mats.door);
  panel.position.set(vx / 2, dh / 2, vz / 2);
  panel.castShadow = true;
  panel.receiveShadow = true;
  pivot.add(panel);

  if (handle) {
    // The handle builder works in a panel frame: x ∈ [0, L] along the panel, +z out of the front face.
    // We only ROTATE / TRANSLATE that frame onto the panel (no mirroring — a negative scale hid it before),
    // and choose gripEnd so the grip lands on the free end, next to the inner corner.
    let gripEnd: 'start' | 'end';
    const hg0 = (ge: 'start' | 'end') => buildHandle({
      type: handle.type, finish: handle.finish, pos: handle.pos, cat: handle.cat, role: 'door',
      L: Math.max(len, 1), H: dh, th, gripEnd: ge, doorHex: handle.doorHex,
    });
    let hg: THREE.Group | null;
    if (!isSide) {
      // front panel faces +z. Frame x runs +x; panel spans x ∈ [min(0, vx), max(0, vx)] in the pivot.
      gripEnd = vx < 0 ? 'start' : 'end';      // free end is at x = vx
      hg = hg0(gripEnd);
      if (hg) hg.position.set(Math.min(0, vx), 0, -th / 2);
    } else {
      // side panel faces nx (±x). Rotating the frame by nx·90° about y maps frame +z → nx,
      // and frame +x → -z (nx = 1) or +z (nx = -1). Panel spans z ∈ [vz, 0] (vz < 0).
      const xToMinusZ = nx > 0;
      gripEnd = xToMinusZ ? 'end' : 'start';   // free end is at z = vz
      hg = hg0(gripEnd);
      if (hg) {
        hg.rotation.y = (nx * Math.PI) / 2;
        hg.position.set(-nx * th / 2, 0, xToMinusZ ? 0 : vz);
      }
    }
    if (hg) pivot.add(hg);
  }

  // open direction: the panel swings INTO the room (away from the carcass)
  const dot = nx * vz + nz * -vx;
  const sign = dot >= 0 ? 1 : -1;
  const angle = (p.bifold === 0 ? 168 : 100) * (Math.PI / 180);
  pivot.rotation.y = sign * openAmount * angle;
  return pivot;
}

export function buildCornerCabinet(it: Item, parts: Part[], mats: CornerMats, opts: CornerOpts): THREE.Group {
  const g = new THREE.Group();
  const left = it.config.opening !== 'right';
  const openAmount = it.openAmount ?? (opts.doorsOpen ? 1 : 0);
  for (const p of parts) {
    const b = p.box;
    if (b.sx <= 0 || b.sy <= 0 || b.sz <= 0) continue;
    if (p.role === 'door') {
      g.add(buildDoor(p, left, openAmount, mats, opts.handle));
      continue;
    }
    if (p.role === 'other' && p.isFront) {
      // blind panel — static front
      g.add(mesh(b.sx, b.sy, b.sz, mats.door, b.x, b.y, b.z));
      continue;
    }
    const isSidePanel = p.role === 'carcass' && /^(Side|End)/.test(p.name);
    const mat = p.role === 'toekick' ? mats.toe : p.role === 'back' ? mats.back : isSidePanel ? mats.side : mats.carcass;
    g.add(mesh(b.sx, b.sy, b.sz, mat, b.x, b.y, b.z));
  }
  g.traverse((o) => { o.userData.itemId = it.id; });
  return g;
}
