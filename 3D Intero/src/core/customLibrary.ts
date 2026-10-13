import type { CustomComponent, CustomShape } from '../models/types';

const KEY = 'instant3d_custom_components_v2';

/** material look presets shared by the builder and the project renderer */
export const MATERIAL_LOOK: Record<string, { color: string; rough: number; metal: number; label: string }> = {
  chrome: { color: '#d3d8dd', rough: 0.18, metal: 0.95, label: 'Chrome' },
  stainless: { color: '#9aa3ab', rough: 0.3, metal: 0.8, label: 'Stainless' },
  wood: { color: '#b08a5a', rough: 0.65, metal: 0, label: 'Wood' },
  plastic: { color: '#eceff1', rough: 0.5, metal: 0, label: 'Plastic' },
  black: { color: '#1c1c1c', rough: 0.4, metal: 0.2, label: 'Black matte' },
  custom: { color: '#9aa0a6', rough: 0.5, metal: 0.1, label: 'Custom colour' },
};

export function lookFor(shape: Pick<CustomShape, 'mat' | 'color'>) {
  const preset = MATERIAL_LOOK[shape.mat ?? 'custom'] ?? MATERIAL_LOOK.custom;
  return { color: shape.mat && shape.mat !== 'custom' ? preset.color : shape.color, rough: preset.rough, metal: preset.metal };
}

/** seed components use the v2 convention: shape centres live inside 0..width × 0..height × 0..depth */
function rod(id: string, len: number, axis: 'x' | 'y' | 'z', x: number, y: number, z: number, dia = 0.6, mat = 'chrome'): CustomShape {
  return {
    id, type: 'cylinder', w: dia, h: len, d: dia, x, y, z,
    rx: axis === 'z' ? 90 : 0, ry: 0, rz: axis === 'x' ? 90 : 0, color: '#d3d8dd', mat,
  };
}

function seedDish(): CustomComponent {
  const W = 60, D = 50, H = 55;
  const shapes: CustomShape[] = [
    { id: 'd_tray', type: 'box', w: W - 4, h: 1, d: D - 4, x: W / 2, y: 1, z: D / 2, rx: 0, ry: 0, rz: 0, color: '#9aa3ab', mat: 'stainless' },
    ...[2, W - 2].flatMap((x, i) => [rod(`d_p${i}a`, H, 'y', x, H / 2, 2), rod(`d_p${i}b`, H, 'y', x, H / 2, D - 2)]),
    rod('d_top_f', W, 'x', W / 2, H - 1, 2), rod('d_top_b', W, 'x', W / 2, H - 1, D - 2),
    rod('d_mid_f', W, 'x', W / 2, H * 0.55, 2), rod('d_mid_b', W, 'x', W / 2, H * 0.55, D - 2),
    ...Array.from({ length: 6 }, (_, i) => rod(`d_slot${i}`, H * 0.45, 'y', 5 + i * 9, H * 0.78, D / 2, 0.45)),
  ];
  return {
    id: 'cc_dish', name: 'Rak Piring Minimalis', nameEn: 'Minimalist Dish Rack', category: 'Internal/Kitchen', tags: ['rak', 'piring', 'chrome'],
    description: 'Rak piring 2 tingkat chrome dengan drip tray. Cocok untuk kabinet 40-80cm.', visibility: 'public',
    width: W, height: H, depth: D, createdAt: new Date().toISOString(),
    params: [{ key: 'w', label: 'Width', min: 40, max: 80, def: 60 }],
    anim: { type: 'pullout', distance: 30, duration: 0.6 }, shapes,
  };
}

function seedGas(): CustomComponent {
  const shapes: CustomShape[] = [
    { id: 'g_body', type: 'cylinder', w: 28, h: 40, d: 28, x: 15, y: 20, z: 15, rx: 0, ry: 0, rz: 0, color: '#2fa36b', mat: 'custom' },
    { id: 'g_valve', type: 'cylinder', w: 10, h: 6, d: 10, x: 15, y: 43, z: 15, rx: 0, ry: 0, rz: 0, color: '#9aa0a6', mat: 'stainless' },
  ];
  return {
    id: 'cc_gas', name: 'Tabung Gas 3kg', nameEn: 'Gas Tank 3kg', category: 'Internal/Kitchen', tags: ['gas', 'tabung'],
    description: 'Tabung gas melon 3kg untuk di dalam kabinet bawah.', visibility: 'public',
    width: 30, height: 46, depth: 30, createdAt: new Date().toISOString(), params: [],
    anim: { type: 'none', distance: 0, duration: 0 }, shapes,
  };
}

export function loadCustom(): CustomComponent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [seedDish(), seedGas()];
}

export function saveCustom(list: CustomComponent[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/** bounding box of a shape in component space (rotation-aware) */
export function shapeAABB(s: CustomShape): { min: [number, number, number]; max: [number, number, number] } {
  const hx = s.w / 2, hy = s.h / 2, hz = s.d / 2;
  const toRad = Math.PI / 180;
  const cx = Math.cos(s.rx * toRad), sx = Math.sin(s.rx * toRad);
  const cy = Math.cos(s.ry * toRad), sy = Math.sin(s.ry * toRad);
  const cz = Math.cos(s.rz * toRad), sz = Math.sin(s.rz * toRad);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const ix of [-1, 1]) for (const iy of [-1, 1]) for (const iz of [-1, 1]) {
    const px = ix * hx, py = iy * hy, pz = iz * hz;
    // Rz · Ry · Rx · p  (matches Euler 'XYZ' applied to the mesh)
    const x1 = px, y1 = py * cx - pz * sx, z1 = py * sx + pz * cx;
    const x2 = x1 * cy + z1 * sy, z2 = -x1 * sy + z1 * cy, y2 = y1;
    const x3 = x2 * cz - y2 * sz, y3 = x2 * sz + y2 * cz, z3 = z2;
    const p = [x3 + s.x, y3 + s.y, z3 + s.z];
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
  }
  return { min: min as [number, number, number], max: max as [number, number, number] };
}

/** move shapes so the bounding box starts at 0,0,0 and return the component size */
export function normalizeShapes(shapes: CustomShape[]): { shapes: CustomShape[]; width: number; height: number; depth: number } {
  if (!shapes.length) return { shapes, width: 10, height: 10, depth: 10 };
  const boxes = shapes.map(shapeAABB);
  const min = [0, 1, 2].map((k) => Math.min(...boxes.map((b) => b.min[k])));
  const max = [0, 1, 2].map((k) => Math.max(...boxes.map((b) => b.max[k])));
  const out = shapes.map((s) => ({ ...s, x: round(s.x - min[0]), y: round(s.y - min[1]), z: round(s.z - min[2]) }));
  return { shapes: out, width: round(max[0] - min[0]), height: round(max[1] - min[1]), depth: round(max[2] - min[2]) };
}

const round = (v: number) => Math.round(v * 10) / 10;
