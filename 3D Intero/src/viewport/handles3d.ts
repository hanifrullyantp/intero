import * as THREE from 'three';
import type { HandlePosition } from '../models/types';
import { HANDLE_FINISH_HEX, normalizeHex } from '../config/materials';

/**
 * One handle builder for every door / drawer (normal cabinets AND corner panels).
 *
 * Geometry is returned in the PANEL's local frame:
 *   x ∈ [0, L]  along the panel (0 = start, L = end)
 *   y ∈ [0, H]  up the panel
 *   z = 0 is the panel's back face, z = th its front face; the handle protrudes in +z.
 * The caller places / rotates the group so that +z points out of the front.
 *
 * Position rules (ergonomic defaults, overridable per item):
 *   base door   → top edge (reach from the worktop)      wall door → bottom edge
 *   tall door   → upper door: bottom edge, lower: top    drawer    → centre
 *   flip-up     → bottom edge                            corner    → same rules as its cabinet type
 *   config.handlePosition: edge-top | edge-bottom | center | vertical overrides everything.
 *
 * Profile (gola): a continuous strip. On wall cabinets it sits FLUSH WITH THE BOTTOM edge
 * of the cabinet (aligned, not above it); on base cabinets flush with the top edge.
 */
export interface HandleSpec {
  type: string;               // bar | cup | knob | recessed | profile | none
  finish: string;             // key of HANDLE_FINISH_HEX
  pos: HandlePosition;        // auto | edge-top | edge-bottom | center | vertical
  L: number;                  // panel length (cm)
  H: number;                  // panel height (cm)
  th: number;                 // panel thickness (cm)
  cat: 'base' | 'wall' | 'tall' | 'other';
  role: 'door' | 'drawer' | 'flip';
  upperTall?: boolean;        // tall cabinet: this door is in the upper half
  gripEnd: 'start' | 'end';   // which end of the panel the vertical / knob grip sits on
  /** actual rendered door colour (including black/white adjustment) for contrast */
  doorHex?: string;
}

const OFF = 4;
const metalCache = new Map<string, THREE.MeshStandardMaterial>();
function metal(hex: string): THREE.MeshStandardMaterial {
  let m = metalCache.get(hex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.28, metalness: 0.85 });
    metalCache.set(hex, m);
  }
  return m;
}
const darkMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 });

function luminance(hex: string): number {
  const color = normalizeHex(hex) ?? '#ffffff';
  const values = [1, 3, 5].map((p) => parseInt(color.slice(p, p + 2), 16) / 255).map((x) => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

/** Keep the selected hardware finish where it reads clearly; otherwise use a brushed light/dark variant. */
export function contrastHandleHex(finish: string, doorHex = '#ffffff'): string {
  const requested = HANDLE_FINISH_HEX[finish] ?? '#c9cdd1';
  const doorL = luminance(doorHex), handleL = luminance(requested);
  const ratio = (Math.max(doorL, handleL) + 0.05) / (Math.min(doorL, handleL) + 0.05);
  return ratio >= 2.8 ? requested : doorL > 0.33 ? '#34434d' : '#e3e9ed';
}

/**
 * Gola edge: the channel is always on a horizontal edge of the front, never centred.
 * base door / every base DRAWER front → top edge (channel above each drawer)
 * upper cabinet door / drawer / flip-up → bottom edge
 * tall: upper section bottom edge, lower section top edge. Explicit edge-top / edge-bottom win.
 */
export function resolveGolaEdge(s: HandleSpec): 'top' | 'bottom' {
  if (s.pos === 'edge-top') return 'top';
  if (s.pos === 'edge-bottom') return 'bottom';
  if (s.cat === 'wall' || s.role === 'flip') return 'bottom';
  if (s.cat === 'tall') return s.upperTall ? 'bottom' : 'top';
  return 'top';
}

export function resolveHandleY(s: HandleSpec): 'top' | 'bottom' | 'center' | 'vertical' {
  if (s.pos === 'vertical') return 'vertical';
  if (s.pos === 'center') return 'center';
  if (s.pos === 'edge-top') return 'top';
  if (s.pos === 'edge-bottom') return 'bottom';
  // auto — ergonomic
  if (s.role === 'drawer') return 'center';
  if (s.role === 'flip') return 'bottom';
  if (s.cat === 'wall') return 'bottom';
  if (s.cat === 'tall') return s.upperTall ? 'bottom' : 'top';
  if (s.cat === 'base') return 'top';
  return 'center';
}

export function buildHandle(s: HandleSpec): THREE.Group | null {
  if (!s.type || s.type === 'none') return null;
  const mat = metal(contrastHandleHex(s.finish, s.doorHex));
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rz = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rz;
    mesh.castShadow = true;
    g.add(mesh);
  };
  const bx = (sx: number, sy: number, sz: number, m: THREE.Material, x: number, y: number, z: number) =>
    add(new THREE.BoxGeometry(sx, sy, sz), m, x, y, z);

  const L = s.L, H = s.H, zf = s.th;
  const where = resolveHandleY(s);
  const yEdge = where === 'top' ? H - OFF : where === 'bottom' ? OFF : H / 2;
  const gripX = s.gripEnd === 'end' ? L - OFF : OFF;

  switch (s.type) {
    case 'profile': {
      // gola: aluminium channel along the front's edge, FLUSH with the door face (aligned, not stuck on top).
      // It wraps the edge (slightly deeper than the panel) so it reads as a continuous recessed profile.
      const edge = resolveGolaEdge(s);
      const ph = 2.4;
      const y = edge === 'top' ? H - ph / 2 : ph / 2;
      bx(L, ph, zf + 0.3, mat, L / 2, y, zf / 2);
      // dark shadow line where the fingers go in
      bx(L, 0.5, zf + 0.32, darkMat, L / 2, edge === 'top' ? H - ph - 0.25 : ph + 0.25, zf / 2);
      return g;
    }
    case 'knob': {
      add(new THREE.SphereGeometry(1.5, 16, 12), mat, where === 'center' ? L / 2 : gripX, yEdge, zf + 1.4);
      return g;
    }
    case 'cup': {
      add(new THREE.TorusGeometry(3.2, 0.6, 8, 16, Math.PI), mat, L / 2, yEdge, zf + 1.2, Math.PI);
      return g;
    }
    case 'recessed': {
      bx(Math.min(L * 0.6, 40), 1.4, 0.8, darkMat, L / 2, yEdge, zf - 0.4);
      return g;
    }
    default: {
      // bar handle
      if (where === 'vertical') {
        const len = Math.min(18, H * 0.4);
        bx(1.6, len, 1.6, mat, gripX, H / 2, zf + 2.2);
        bx(0.9, 0.9, 2.3, mat, gripX, H / 2 - len / 2 + 0.4, zf + 1.1);
        bx(0.9, 0.9, 2.3, mat, gripX, H / 2 + len / 2 - 0.4, zf + 1.1);
        return g;
      }
      const len = Math.min(18, L * 0.5);
      bx(len, 1.6, 1.6, mat, L / 2, yEdge, zf + 2.2);
      bx(0.9, 0.9, 2.3, mat, L / 2 - len / 2 + 0.6, yEdge, zf + 1.1);
      bx(0.9, 0.9, 2.3, mat, L / 2 + len / 2 - 0.6, yEdge, zf + 1.1);
      return g;
    }
  }
}
