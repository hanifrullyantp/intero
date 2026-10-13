import * as THREE from 'three';
import type { Countertop, Item, Project } from '../models/types';
import { generateParts } from '../engine/parametric';
import { adjustHex, getColor, tintedHex } from '../config/materials';
import { getTexture } from '../utils/textures';
import { footprint } from '../utils/geometry';
import { isCooktop, isSink, isHood, isFridge } from '../engine/constraints';
import { buildCornerCabinet } from './corner3d';
import { buildHandle } from './handles3d';
import { buildFurnitureItem, type FurnMats } from './furniture3d';
import { computeBacksplashes } from '../engine/countertop';
import { isTopTier } from '../engine/kitchenRules';
import { housingLayout } from '../engine/applianceHousing';
import { ELECTRO_DEFS, electronicsLayout } from '../engine/electronicsTower';
import { cabinetLighting } from './ledLighting';
import { occupiedRects } from '../utils/geometry';
import { DEFAULT_CONFIG } from '../config/library';
export type { FurnMats };
import { loadCustom, lookFor } from '../core/customLibrary';
import type { CustomShape } from '../models/types';

export interface SceneOpts {
  doorsOpen: boolean;
  showHandles: boolean;
  wireframe: boolean;
  showDims: boolean;
  openView?: 'normal' | 'xray' | 'explode';
  showContents?: boolean;
  isolateIds?: string[] | null;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();

function finishParams(finish: string) {
  return finish === 'gloss' ? { roughness: 0.18, metalness: 0.05 } : finish === 'semi' ? { roughness: 0.4, metalness: 0.03 } : { roughness: 0.75, metalness: 0.0 };
}

/** surface response per door material (PVC is glossy, ACP is a metal composite, veneer is open-pore) */
const FINISHING_LOOK: Record<string, { rough: number; metal: number }> = {
  pvc: { rough: 0.22, metal: 0.02 },
  acp: { rough: 0.3, metal: 0.55 },
  duco: { rough: 0.35, metal: 0 },
  veneer: { rough: 0.6, metal: 0 },
  melamine: { rough: 0.5, metal: 0 },
  acrylic: { rough: 0.1, metal: 0.05 },
};

export function colorMaterial(colorId: string, finish: string, wireframe = false, repeat = 1, finishing = 'hpl', tint = 0): THREE.MeshStandardMaterial {
  const key = `${colorId}|${finish}|${wireframe}|${repeat}|${finishing}|${tint}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  const c = getColor(colorId);
  const baseHex = adjustHex(c.hex, tint);
  const p = finishParams(finish);
  const look = FINISHING_LOOK[finishing];
  let rough = look ? look.rough : p.roughness;
  let metal = look ? look.metal : p.metalness;
  if (finish === 'gloss') rough = Math.max(0.05, rough - 0.12);
  if (finish === 'matte') rough = Math.min(0.95, rough + 0.08);
  if (c.texture === 'granite' || c.texture === 'marble') { rough = 0.2; metal = 0.05; }
  if (c.texture === 'metal') { rough = 0.3; metal = 0.8; }
  if (c.category === 'metallic') { metal = Math.max(metal, 0.6); rough = Math.min(rough, 0.3); }
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(baseHex), roughness: rough, metalness: metal, wireframe });
  if (c.texture) {
    // texture carries the colour, so it has to receive the black & white adjustment too
    m.map = getTexture(c.texture, baseHex, repeat);
    m.color.set('#ffffff');
  }
  matCache.set(key, m);
  return m;
}

const simple = (hex: string, roughness = 0.5, metalness = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, ...extra });
const STEEL = () => simple('#c3c7cb', 0.25, 0.9);
const DARK = () => simple('#1b1d20', 0.4, 0.2);
const GLASS = () => new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 });
const BLACK_GLASS = () => simple('#0b0d10', 0.1, 0.4);

function box(sx: number, sy: number, sz: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x + sx / 2, y + sy / 2, z + sz / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function placeGroup(g: THREE.Group, it: Item) {
  const f = footprint(it);
  switch (it.rotation) {
    case 0:
      g.position.set(f.x, it.elevation, f.y);
      g.rotation.y = 0;
      break;
    case 90:
      g.position.set(f.x + f.w, it.elevation, f.y);
      g.rotation.y = -Math.PI / 2;
      break;
    case 180:
      g.position.set(f.x + f.w, it.elevation, f.y + f.h);
      g.rotation.y = Math.PI;
      break;
    default:
      g.position.set(f.x, it.elevation, f.y + f.h);
      g.rotation.y = Math.PI / 2;
  }
}

// ---------- handles ----------




const lightBudget = { left: 10 };

// ---------- cornice ("topi") on top of the upper cabinets ----------
function buildCornice(project: Project, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const m = project.materials;
  if (!m.crown) return g;
  const ceiling = project.room.ceilingHeight;
  const tops = project.items.filter((i) => i.kind === 'cabinet' && (i.category === 'wall' || i.category === 'tall') && i.visible !== false && isTopTier(i, project.items));
  for (const it of tops) {
    const top = it.elevation + it.height;
    const h = Math.min(m.crownHeight ?? 6, ceiling - top);
    if (h < 0.5) continue;
    for (const r of occupiedRects(it)) {
      // slight overhang all round so neighbouring cornices read as one continuous band
      g.add(box(r.w + 2, h, r.h + 2, mat, r.x - 1, top, r.y - 1));
      if ((m.crownStyle ?? 'flat') === 'cornice' && h >= 4) g.add(box(r.w + 5, Math.min(2, h * 0.3), r.h + 5, mat, r.x - 2.5, top + h - Math.min(2, h * 0.3), r.y - 2.5));
    }
  }
  return g;
}

// ---------- cabinet ----------
function buildCabinet(it: Item, project: Project, opts: SceneOpts): THREE.Group {
  const g = new THREE.Group();
  const m = project.materials;
  const ov = it.config.materials;
  const carcassId = ov.useDefault ? m.carcassColor : ov.carcassColor ?? m.carcassColor;
  const doorId = ov.useDefault ? m.doorColor : ov.doorColor ?? m.doorColor;
  const carcassMat = colorMaterial(carcassId, 'matte', opts.wireframe, 2, 'hpl', m.tints?.carcass ?? 0);
  const doorMat = colorMaterial(doorId, m.finish, opts.wireframe, 1, m.finishing, m.tints?.door ?? 0);
  const edgeMat = carcassMat;
  const parts = generateParts(it, m);
  // effective handle type: per-item override, else the project's global handle style
  const handleType = it.config.handleType && it.config.handleType !== 'default' ? it.config.handleType : m.handleType;
  const handleOpt = opts.showHandles && handleType !== 'none' ? {
    type: handleType, finish: m.handleFinish, pos: it.config.handlePosition ?? 'auto',
    cat: it.category as 'base' | 'wall' | 'tall', doorHex: tintedHex(doorId, m.tints?.door ?? 0),
  } : undefined;
  // exposed sides & toe kick follow the door colour unless switched off in the Material settings
  const sideMat = m.sideFollowDoor !== false ? doorMat : carcassMat;
  const toeMat = m.toeFollowDoor !== false ? doorMat : simple('#2b2b2b', 0.7);
  if (it.subtype.includes('corner')) {
    // true L-corner: dedicated renderer (doors hinge at the far end and meet at 90° in the corner)
    const cg = buildCornerCabinet(it, parts, {
      carcass: carcassMat,
      back: edgeMat,
      toe: toeMat,
      door: doorMat,
      handle: simple('#cccccc', 0.3, 0.9),
      side: sideMat,
    }, { doorsOpen: opts.doorsOpen, handle: handleOpt });
    const led = cabinetLighting(it, project, lightBudget);
    if (led) cg.add(led);
    placeGroup(cg, it);
    return cg;
  }
  for (const p of parts) {
    if (p.box.sx <= 0 || p.box.sy <= 0 || p.box.sz <= 0) continue;
    const { x, y, z, sx, sy, sz } = p.box;
    if (p.role === 'door' || p.role === 'drawer') {
      const mat = p.glass ? GLASS() : doorMat;
      const pivot = new THREE.Group();
      let mesh: THREE.Mesh;
      if (p.glass) {
        // frame + glass
        const frame = new THREE.Group();
        const fm = simple('#9aa0a6', 0.35, 0.8);
        const fw = 4;
        frame.add(box(sx, fw, sz, fm, 0, 0, 0), box(sx, fw, sz, fm, 0, sy - fw, 0), box(fw, sy, sz, fm, 0, 0, 0), box(fw, sy, sz, fm, sx - fw, 0, 0));
        const glass = box(sx - 2 * fw, sy - 2 * fw, 0.4, mat, fw, fw, sz / 2);
        frame.add(glass);
        mesh = glass;
        pivot.add(frame);
      } else {
        mesh = box(sx, sy, sz, mat, 0, 0, 0);
        pivot.add(mesh);
        if (it.config.doorStyle === 'shaker' && sx > 16 && sy > 16) {
          const inset = box(sx - 12, sy - 12, 0.6, doorMat, 6, 6, sz - 0.5);
          inset.scale.z = 0.5;
          pivot.add(inset);
          // frame shading via darker edge
          const rim = box(sx - 11, sy - 11, 0.2, simple('#000', 1, 0, { transparent: true, opacity: 0.12 }), 5.5, 5.5, sz);
          pivot.add(rim);
        } else if (it.config.doorStyle === 'louvered' && sy > 20) {
          const slatMat = doorMat;
          for (let yy = 6; yy < sy - 6; yy += 4) pivot.add(box(sx - 8, 1.2, 0.8, slatMat, 4, yy, sz));
        }
      }
      // handle
      if (handleOpt && !(it.subtype === 'base_corner_blind' && p.name === 'Blind Panel')) {
        const role = p.role === 'drawer' ? 'drawer' : p.hingeSide === 'top' ? 'flip' : 'door';
        const h = buildHandle({
          ...handleOpt,
          L: sx, H: sy, th: sz, role,
          upperTall: it.category === 'tall' && y + sy / 2 > it.height / 2,
          gripEnd: p.hingeSide === 'right' ? 'start' : 'end',
        });
        if (h) pivot.add(h);
      }
      // open/close animation (per-item openAmount 0..1, animated)
      const oa = it.openAmount ?? (opts.doorsOpen ? 1 : 0);
      const xray = opts.openView === 'xray';
      if (xray) {
        pivot.traverse((o) => {
          const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (mm && 'opacity' in mm) { mm.transparent = true; mm.opacity = 0.3; }
        });
      }
      const explode = opts.openView === 'explode' ? 1 : 0;
      if (p.role === 'drawer') {
        pivot.position.set(x, y, z + oa * Math.min(40, it.depth * 0.85) + explode * 18);
        if (oa > 0.05 || explode) {
          const bm = simple('#e8e2d6', 0.8);
          const bd = Math.min(45, it.depth - 6);
          const bh = Math.max(6, sy - 5);
          const drawerBox = new THREE.Group();
          drawerBox.add(box(1.5, bh, bd, bm, 1.5, 1.5, -bd), box(1.5, bh, bd, bm, sx - 3, 1.5, -bd), box(sx - 3, 1.5, bd, bm, 1.5, 1.5, -bd), box(sx - 6, bh, 1.5, bm, 3, 1.5, -bd));
          pivot.add(drawerBox);
          // cutlery tray hint
          if (oa > 0.5 && opts.showContents !== false) pivot.add(box(sx - 10, 2, bd - 10, simple('#b0bec5', 0.7), 5, 3, -bd + 5));
        }
      } else if (p.hingeSide === 'top') {
        pivot.position.set(x, y + sy, z + explode * 14);
        mesh.position.y -= sy;
        pivot.children.forEach((ch) => { if (ch !== mesh) ch.position.y -= sy; });
        pivot.rotation.x = oa * (-Math.PI / 2 + 0.25); // lift-up gas strut
      } else if (p.sideFace) {
        // corner side-face panel: thin in x, long in z. Hinge at near (inner corner) or far end.
        const leftExt = it.config.opening !== 'right';
        const outward = leftExt ? 1 : -1; // direction the panel swings (away from arm B's inner face)
        const near = p.hingeAt !== 'far';
        pivot.position.set(x + explode * outward * 16, y, near ? z : z + sz);
        if (!near) pivot.children.forEach((ch) => { ch.position.z -= sz; });
        const ang = ((p.bifold ? 100 : 110) * Math.PI) / 180;
        // rotation.y > 0 turns +z toward +x; panel extends +z (near) or -z (far) from its hinge
        pivot.rotation.y = (near ? outward : -outward) * oa * ang;
      } else {
        const hingeLeft = p.hingeSide !== 'right';
        const openAngle = p.bifold === 0 ? (168 * Math.PI) / 180 : p.bifold ? (100 * Math.PI) / 180 : (110 * Math.PI) / 180;
        pivot.position.set(hingeLeft ? x : x + sx, y, z + explode * 16);
        pivot.children.forEach((ch) => { ch.position.x += hingeLeft ? 0 : -sx; });
        pivot.rotation.y = oa * (hingeLeft ? -openAngle : openAngle);
      }
      pivot.traverse((o) => (o.userData.itemId = it.id));
      g.add(pivot);
      continue;
    }
    const isSidePanel = p.role === 'carcass' && /^(Side|End)/.test(p.name);
    const mesh = box(sx, sy, sz, p.role === 'toekick' ? toeMat : p.role === 'back' ? edgeMat : p.isFront ? doorMat : isSidePanel ? sideMat : carcassMat, x, y, z);
    mesh.userData.itemId = it.id;
    g.add(mesh);
  }
  // embedded pull-out organisers: one per door side of a base cabinet, travel with the doors
  if (it.category === 'base' && (it.config.interiorLeft || it.config.interiorRight)) {
    const oa = it.openAmount ?? (opts.doorsOpen ? 1 : 0);
    const boardT = 1.8;
    const innerH = Math.max(20, it.height - (it.config.hasToeKick ? 10 : 0) - boardT - 2);
    const innerD = Math.max(24, it.depth - 6);
    const both = !!it.config.interiorLeft && !!it.config.interiorRight;
    const halfW = both ? (it.width - 2 * boardT - 2) / 2 : it.width - 2 * boardT;
    const mount = (key: string | undefined, xOff: number) => {
      if (!key) return;
      const unit = buildInteriorUnit(key, halfW, innerH, innerD, project, oa);
      if (unit) { unit.position.x = xOff; unit.position.y = (it.config.hasToeKick ? 10 : 0) + 1; g.add(unit); }
    };
    mount(it.config.interiorLeft, boardT + 0.5);
    mount(it.config.interiorRight, both ? boardT + halfW + 1.5 : boardT + 0.5);
  }
  // extras per type
  if (it.subtype.startsWith('tall_fridge')) {
    const { device, bottom } = housingLayout(it, m.board);
    const fr = buildFridge(device.width, device.height, device.depth, it.config.fridgeType ?? 'two_door');
    fr.name = 'embedded-refrigerator';
    fr.userData.applianceDimensions = { ...device };
    fr.position.set((it.width - device.width) / 2, bottom, 1);
    g.add(fr);
  }
  if (it.subtype === 'tall_dispenser') {
    const { device, bottom } = housingLayout(it, m.board);
    const dispenser = buildDispenser(device.width, device.height, device.depth);
    dispenser.position.set((it.width - device.width) / 2, bottom, Math.max(1, it.depth - device.depth - 1));
    g.add(dispenser);
  }
  if (it.subtype === 'tall_electro') {
    const layout = electronicsLayout(it);
    const rail = simple('#929da7', 0.3, 0.8);
    const trayMat = simple('#cbd2d6', 0.42, 0.6);
    const usableW = Math.min(Math.max(12, it.width - 5), layout.magiccom.width + 8);
    const usableD = Math.min(Math.max(10, it.depth - 3), layout.magiccom.depth + 5);
    const left = (it.width - usableW) / 2;
    // Twin fixed runners at the height of the finished worktop.
    g.add(box(1.2, 1.2, it.depth - 9, rail, left, layout.shelfY + 1, 4));
    g.add(box(1.2, 1.2, it.depth - 9, rail, left + usableW - 1.2, layout.shelfY + 1, 4));
    const pull = new THREE.Group();
    pull.name = 'magiccom-pull-out';
    pull.add(box(usableW, 1.3, usableD, trayMat, 0, 0, 0));
    const pot = Math.min(layout.magiccom.width, usableW - 4);
    const potH = layout.magiccom.height;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(pot * 0.47, pot * 0.43, potH * 0.77, 28), simple('#e8eaeb', 0.25, 0.28));
    shell.position.set(usableW / 2, 1.4 + potH * 0.41, usableD / 2);
    shell.castShadow = true;
    pull.add(shell);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(pot * 0.47, pot * 0.47, 2.5, 28), simple('#2d343a', 0.35, 0.2));
    lid.position.set(usableW / 2, potH - 1.4, usableD / 2);
    pull.add(lid);
    pull.add(box(pot * 0.55, 1.2, 3.5, simple('#343b40', 0.42, 0.2), (usableW - pot * 0.55) / 2, potH, usableD / 2 - 1.75));
    pull.add(box(pot * 0.52, potH * 0.16, 0.5, simple('#393f43', 0.4), (usableW - pot * 0.52) / 2, potH * 0.17, usableD / 2 + pot * 0.43));
    pull.add(box(3, 1.4, 0.5, simple('#b8593b', 0.3, 0, { emissive: '#9a321a', emissiveIntensity: 0.35 }), usableW / 2 - 1.5, potH * 0.19, usableD / 2 + pot * 0.43 + 0.5));
    const extension = Math.max(0, Math.min(layout.magiccom.extension, it.depth - 8));
    pull.position.set(left, layout.shelfY + 1.5, it.depth - usableD - 1 + extension * (it.openAmount ?? (opts.doorsOpen ? 1 : 0)));
    g.add(pull);
    // The remaining chosen appliances occupy their own niche, each on its support shelf.
    for (const slot of layout.slots) {
      if (slot.atWorktop && slot.key === 'magiccom') continue;
      const def = ELECTRO_DEFS[slot.key];
      const aw = Math.min(def.w, it.width - 5);
      const ax = (it.width - aw) / 2;
      if (slot.key === 'dispenser') {
        const compact = buildDispenser(aw, def.h - 2, Math.min(def.d, it.depth - 3));
        compact.position.set(ax, slot.y + 1, Math.max(1, it.depth - Math.min(def.d, it.depth - 3) - 1) + Math.min(18, it.depth - 10) * (it.openAmount ?? (opts.doorsOpen ? 1 : 0)));
        g.add(compact);
      } else {
        g.add(buildOvenFront(ax, slot.y + 1, aw, def.h, Math.min(def.d, it.depth - 1), slot.key === 'microwave'));
      }
    }
  }
  if (it.subtype === 'tall_oven') {
    g.add(buildOvenFront(4, 60, it.width - 8, 60, it.depth));
    g.add(buildOvenFront(4, 120, it.width - 8, 30, it.depth, true));
  }
  if (it.subtype === 'wall_micro') {
    g.add(buildOvenFront(3, 3, it.width - 6, it.height - 34, it.depth, true));
  }
  if (it.config.accessories.includes('hanging_rod')) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, it.width - 4, 12), STEEL());
    rod.rotation.z = Math.PI / 2;
    rod.position.set(it.width / 2, it.height - 12, it.depth / 2);
    g.add(rod);
  }
  if (it.config.accessories.includes('led_strip')) {
    const led = box(it.width - 4, 0.6, 1.5, simple('#fff7d6', 0.3, 0, { emissive: '#fff2b0', emissiveIntensity: 1.5 }), 2, 0.3, it.depth - 4);
    g.add(led);
  }
  // internal contents visible when open
  const led = cabinetLighting(it, project, lightBudget);
  if (led) g.add(led);
  const oa2 = it.openAmount ?? (opts.doorsOpen ? 1 : 0);
  if (oa2 > 0.4 && opts.showContents !== false && it.kind === 'cabinet') {
    g.add(buildContents(it));
  }
  g.traverse((o) => {
    if (!o.userData.itemId) o.userData.itemId = it.id;
  });
  placeGroup(g, it);
  return g;
}

function buildContents(it: Item): THREE.Group {
  const g = new THREE.Group();
  const W = it.width; const D = it.depth; const H = it.height;
  const yBase = it.config.hasToeKick && it.category !== 'wall' ? 10 : 2;
  if (it.subtype.includes('sink') || it.config.accessories.includes('dish_rack')) {
    // dish rack: tray + plates
    const tray = box(W - 10, 1.5, D - 10, simple('#90a4ae', 0.5, 0.4), 5, yBase + 8, 5);
    g.add(tray);
    const plateMat = simple('#f5f5f5', 0.3, 0);
    const n = Math.max(2, Math.floor((W - 14) / 6));
    for (let i = 0; i < n; i++) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1, 20), plateMat);
      plate.rotation.z = Math.PI / 2 - 0.25;
      plate.rotation.y = 0.15;
      plate.position.set(8 + i * ((W - 16) / Math.max(1, n - 1)), yBase + 18, D / 2);
      plate.castShadow = true;
      g.add(plate);
    }
  } else if (it.config.accessories.includes('bin_system')) {
    g.add(box(W / 2 - 8, 30, D - 14, simple('#546e7a', 0.6), 5, yBase + 2, 7));
    g.add(box(W / 2 - 8, 30, D - 14, simple('#78909c', 0.6), W / 2 + 3, yBase + 2, 7));
  } else if (it.category === 'base' && !it.subtype.includes('corner')) {
    // gas tank 3kg in one base cabinet
    if (it.subtype === 'base_single') {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 34, 20), simple('#2fa36b', 0.5, 0.3));
      tank.position.set(W - 20, yBase + 19, D / 2);
      tank.castShadow = true;
      g.add(tank);
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 5, 12), STEEL());
      valve.position.set(W - 20, yBase + 38, D / 2);
      g.add(valve);
    } else {
      // spice bottles / pots
      const cols = ['#c62828', '#ef6c00', '#2e7d32', '#1565c0'];
      const n = Math.max(2, Math.floor((W - 10) / 12));
      for (let i = 0; i < n; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 10 + (i % 3) * 3, 12), simple(cols[i % 4], 0.4, 0.1));
        b.position.set(8 + i * ((W - 16) / Math.max(1, n - 1)), yBase + 8, D / 2);
        b.castShadow = true;
        g.add(b);
      }
    }
  } else if (it.category === 'wall') {
    // stacked bowls / glasses
    for (let i = 0; i < 3; i++) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(6 - i, 4, 4, 16), simple('#eceff1', 0.35, 0));
      bowl.position.set(W / 2 - 12 + i * 12, yBase + 12, D / 2);
      g.add(bowl);
    }
  } else if (it.category === 'tall') {
    // pantry jars
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
      const jar = box(8, 12, 8, simple('#d7ccc8', 0.5), W / 2 - 16 + i * 11, yBase + 30 + r * 40, D / 2 - 4);
      g.add(jar);
    }
  }
  void H;
  return g;
}

/** refrigerator body. two_door: freezer on top (default). side_by_side: vertical split, long handles. one_door: single door. */
function buildFridge(w: number, h: number, d: number, type: 'one_door' | 'two_door' | 'side_by_side' = 'two_door'): THREE.Group {
  const g = new THREE.Group();
  const mat = simple('#d7dadd', 0.35, 0.7);
  const hm = simple('#9aa0a6', 0.3, 0.9);
  g.add(box(w, h, d, mat, 0, 0, 0));
  if (type === 'side_by_side') {
    const seamX = w / 2;
    g.add(box(0.6, h - 2, 0.5, DARK(), seamX - 0.3, 1, d));
    g.add(box(1.6, h * 0.42, 2.6, hm, seamX - 5, h * 0.42, d), box(1.6, h * 0.42, 2.6, hm, seamX + 3.4, h * 0.42, d));
    g.add(box(w - 2, 1.2, 0.6, DARK(), 1, 0.4, d)); // plinth grille
    return g;
  }
  if (type === 'one_door') {
    g.add(box(1.5, h * 0.5, 2.5, hm, w - 6, h * 0.25, d));
    return g;
  }
  const split = h * 0.65;
  g.add(box(w - 1, 0.4, 0.6, DARK(), 0.5, split, d));
  g.add(box(1.5, split * 0.6, 2.5, hm, w - 6, split * 0.2, d), box(1.5, (h - split) * 0.6, 2.5, hm, w - 6, split + (h - split) * 0.2, d));
  return g;
}

function buildDispenser(W: number, H: number, D: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'embedded-water-dispenser';
  const body = simple('#d3d8dc', 0.35, 0.55);
  const dark = simple('#171c23', 0.3, 0.1);
  const panel = simple('#283039', 0.25, 0.3);
  group.add(box(W, H, D, body));
  group.add(box(W - 1.4, H * 0.43, 1.2, panel, 0.7, 2, D));
  group.add(box(W - 4, H * 0.24, 0.8, dark, 2, H * 0.51, D - 0.2));
  group.add(box(W, H * 0.19, 1.4, panel, 0, H * 0.8, D));
  // Hot/cold controls, spouts and drip tray make the open niche read as a water dispenser.
  for (const [x, color] of [[W * 0.34, '#d74d4d'], [W * 0.66, '#4da8d7']] as const) {
    group.add(box(2.5, 1.8, 0.8, simple(color, 0.3, 0), x - 1.25, H * 0.825, D + 1.2));
    group.add(box(1.3, 2.7, 3.5, STEEL(), x - 0.65, H * 0.745, D - 0.2));
  }
  group.add(box(W - 5, 1.2, 6, dark, 2.5, H * 0.505, D - 1));
  for (let x = 5; x < W - 4; x += 2.5) group.add(box(0.4, 0.2, 4.5, STEEL(), x, H * 0.505 + 1.2, D - 0.4));
  group.add(box(W * 0.38, 2.5, 0.3, simple('#b4e7ed', 0.15, 0, { emissive: '#68cdd5', emissiveIntensity: 0.5 }), W * 0.31, H * 0.91, D + 1.5));
  group.add(box(1, H * 0.22, 1.3, STEEL(), W - 4.5, H * 0.16, D + 1.1));
  return group;
}

function buildOvenFront(x: number, y: number, w: number, h: number, depth: number, micro = false): THREE.Group {
  const g = new THREE.Group();
  g.add(box(w, h, 1, DARK(), x, y, depth - 1));
  g.add(box(w - 6, h * (micro ? 0.7 : 0.6), 0.4, BLACK_GLASS(), x + 3, y + h * 0.15, depth));
  g.add(box(w - 8, 1.2, 1.2, STEEL(), x + 4, y + h - 5, depth + 1.5));
  if (!micro) {
    for (let i = 0; i < 3; i++) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.5, 12), STEEL());
      knob.rotation.x = Math.PI / 2;
      knob.position.set(x + w / 2 + (i - 1) * 8, y + h - 4, depth + 0.8);
      g.add(knob);
    }
  }
  return g;
}

// ---------- appliances ----------
function buildAppliance(it: Item, project: Project, ceiling: number): THREE.Group {
  const g = new THREE.Group();
  const W = it.width;
  const D = it.depth;
  const H = it.height;
  if (isSink(it)) {
    const steel = STEEL();
    const rim = box(W, 1, D, steel, 0, project.materials.countertopThickness - 1, 0);
    g.add(rim);
    const bowls = it.config.bowls ?? 1;
    for (let i = 0; i < bowls; i++) {
      const bw = W / bowls - 6;
      const bx = (W / bowls) * i + 3;
      const basin = new THREE.Group();
      const depth = 17;
      const bm = simple('#b8bcc0', 0.3, 0.8, { side: THREE.DoubleSide });
      basin.add(box(bw, 1, D - 6, bm, bx, -depth, 3));
      basin.add(box(1, depth, D - 6, bm, bx, -depth, 3), box(1, depth, D - 6, bm, bx + bw - 1, -depth, 3), box(bw, depth, 1, bm, bx, -depth, 3), box(bw, depth, 1, bm, bx, -depth, D - 4));
      basin.position.y = project.materials.countertopThickness;
      g.add(basin);
      const drain = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.4, 16), DARK());
      drain.position.set(bx + bw / 2, project.materials.countertopThickness - depth + 1.2, D / 2);
      g.add(drain);
    }
    // faucet
    const fm = STEEL();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 2, 16), fm);
    base.position.set(W / 2, project.materials.countertopThickness + 1, 4);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 22, 12), fm);
    pipe.position.set(W / 2, project.materials.countertopThickness + 12, 4);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(9, 1, 8, 16, Math.PI), fm);
    arc.position.set(W / 2, project.materials.countertopThickness + 23, 13);
    arc.rotation.y = Math.PI / 2;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 12), fm);
    spout.position.set(W / 2, project.materials.countertopThickness + 20, 22);
    g.add(base, pipe, arc, spout);
  } else if (isCooktop(it)) {
    g.add(box(W, 1.2, D, BLACK_GLASS(), 0, 0, 0));
    const n = it.config.burners ?? 4;
    const pos = n === 2 ? [[0.5, 0.5], [0.5, 0.5]] : n === 5 ? [[0.22, 0.25], [0.78, 0.25], [0.22, 0.75], [0.78, 0.75], [0.5, 0.5]] : [[0.25, 0.28], [0.75, 0.28], [0.25, 0.72], [0.75, 0.72]];
    const burners = n === 2 ? [[0.3, 0.5], [0.7, 0.5]] : pos;
    const steel = STEEL();
    for (const [px, pz] of burners) {
      const r = Math.min(W, D) * (n === 2 ? 0.18 : 0.14);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.6, 8, 24), DARK());
      ring.rotation.x = Math.PI / 2;
      ring.position.set(px * W, 1.8, pz * D);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.5, 1.2, 20), DARK());
      cap.position.set(px * W, 1.9, pz * D);
      const grate = new THREE.Group();
      for (let a = 0; a < 4; a++) {
        const bar = box(r * 2.1, 0.7, 0.7, steel, -r * 1.05, 2.2, -0.35);
        bar.rotation.y = (a * Math.PI) / 4;
        bar.position.set(px * W, 0, pz * D);
        grate.add(bar);
      }
      g.add(ring, cap, grate);
    }
    for (let i = 0; i < n; i++) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.2, 12), DARK());
      knob.position.set(W * 0.15 + (i * W * 0.7) / Math.max(1, n - 1), 1.8, D - 4);
      g.add(knob);
    }
  } else if (isHood(it)) {
    const steel = STEEL();
    const type = it.config.hoodType ?? 'slim';
    const chimneyTop = Math.max(H, ceiling - it.elevation - (project.room.walls.length ? 0 : 0));
    if (type === 'pyramid') {
      const geo = new THREE.CylinderGeometry(Math.min(W, D) * 0.28, W * 0.7, H * 0.55, 4);
      const pyr = new THREE.Mesh(geo, steel);
      pyr.rotation.y = Math.PI / 4;
      pyr.scale.z = D / W;
      pyr.position.set(W / 2, H * 0.275, D / 2);
      pyr.castShadow = true;
      g.add(pyr);
      g.add(box(W, 2, D, steel, 0, 0, 0));
      g.add(box(W * 0.35, chimneyTop - H * 0.55, D * 0.5, steel, W * 0.325, H * 0.55, D * 0.25));
    } else if (type === 't_shape' || type === 'island') {
      g.add(box(W, 6, D, steel, 0, 0, 0));
      g.add(box(W * 0.3, chimneyTop - 6, D * 0.45, steel, W * 0.35, 6, D * 0.27));
      g.add(box(W - 4, 0.3, D - 4, simple('#fff', 0.2, 0, { emissive: '#ffe9b0', emissiveIntensity: 0.8 }), 2, -0.15, 2));
    } else if (type === 'built_in') {
      g.add(box(W, H, D, simple('#9aa0a6', 0.4, 0.6), 0, 0, 0));
    } else {
      g.add(box(W, H * 0.6, D, steel, 0, H * 0.4, 0));
      g.add(box(W, H * 0.4, D * 0.5, DARK(), 0, 0, D * 0.5));
      g.add(box(W - 4, 0.3, D * 0.4, simple('#fff', 0.2, 0, { emissive: '#ffe9b0', emissiveIntensity: 0.8 }), 2, -0.1, 4));
    }
  } else if (isFridge(it)) {
    g.add(buildFridge(W, H, D, it.config.fridgeType ?? 'two_door'));
  } else if (it.subtype === 'app_oven' || it.subtype === 'app_microwave') {
    g.add(box(W, H, D - 2, simple('#2a2d31', 0.5, 0.2), 0, 0, 0));
    g.add(buildOvenFront(0, 0, W, H, D, it.subtype === 'app_microwave'));
  } else if (it.subtype === 'app_dishwasher') {
    g.add(box(W, H, D, simple('#dcdfe2', 0.35, 0.6), 0, 0, 0));
    g.add(box(W - 2, 1.5, 1.5, STEEL(), 1, H - 8, D));
  } else {
    g.add(box(W, H, D, simple('#999'), 0, 0, 0));
  }
  g.traverse((o) => (o.userData.itemId = it.id));
  placeGroup(g, it);
  return g;
}

/** Internal kitchen organisers: chrome dish racks, spice rack, waste bins (procedural, pull-out animated) */
function buildInternal(it: Item, project: Project): THREE.Group {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const W = it.width;
  const H = it.height;
  const D = it.depth;
  const chrome = simple('#d3d8dd', 0.2, 0.95);
  const steel = simple('#9aa3ab', 0.3, 0.8);
  const plastic = simple('#eceff1', 0.5, 0);
  const wood = colorMaterial(project.materials.carcassColor, 'matte', false, 1, 'hpl', project.materials.tints?.carcass ?? 0);
  const bar = (sx: number, sy: number, sz: number, m: THREE.Material, x: number, y: number, z: number) => inner.add(box(sx, sy, sz, m, x, y, z));
  let pullDist = 0;
  const doorMat = colorMaterial(project.materials.doorColor, project.materials.finish, false, 1, project.materials.finishing, project.materials.tints?.door ?? 0);
  if (it.subtype === 'int_dish_pullout') {
    // full-height pull-out: the door panel is fixed to the chrome frame and travels with it.
    // Three chrome tiers like the reference: standing plates on top, canisters in the
    // middle, bottle rack with round holders below.
    pullDist = D - 6;
    if (!it.config.skipFront) inner.add(box(1.8, H + 6, 2, doorMat, 0, 0, D - 1.2));
    bar(W - 3, 1.2, D - 5, steel, 2.5, 1, 3);
    for (const x of [2.5, W - 3.5]) bar(1, H - 2, 1, chrome, x, 1, 3);
    bar(W - 2, 1.2, 1.2, chrome, 2, H - 1.5, D - 2);
    const wire = (y0: number, guardH: number) => {
      const nBars = Math.max(4, Math.floor((W - 8) / 3));
      for (let i = 0; i <= nBars; i++) bar(0.45, 0.45, D - 8, chrome, 4 + (i * (W - 8)) / nBars, y0, 4);
      for (let k = 0; k <= 4; k++) bar(W - 8, 0.45, 0.45, chrome, 4, y0, 4 + (k * (D - 8)) / 4);
      if (guardH) {
        bar(W - 8, guardH, 0.5, chrome, 4, y0, D - 4.5);
        for (let i = 0; i <= nBars; i++) bar(0.4, guardH, 0.4, chrome, 4 + (i * (W - 8)) / nBars, y0, D - 4.5);
      }
    };
    const yTop = Math.round(H * 0.68), yMid = Math.round(H * 0.38), yBot = 8;
    wire(yTop, 8); wire(yMid, 4); wire(yBot, 4);
    // round bottle holders on the bottom tier
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.35, 8, 20), chrome);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(10 + i * (W - 20) / 2, yBot + 4.2, D / 2);
      inner.add(ring);
    }
    // standing plates in the top tier
    for (let i = 0; i < Math.min(6, Math.floor((W - 10) / 7)); i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.7, 26), plastic);
      p.rotation.z = Math.PI / 2 - 0.16;
      p.position.set(8 + i * 7, yTop + 11, D - 8);
      p.castShadow = true;
      inner.add(p);
    }
    // canisters in the middle tier
    const canister = (x: number, body: string, lid: string) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 9, 18), simple(body, 0.45, 0.05));
      b.position.set(x, yMid + 5.5, D / 2);
      b.castShadow = true;
      inner.add(b);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 1.6, 18), simple(lid, 0.4, 0.2));
      l.position.set(x, yMid + 10.8, D / 2);
      inner.add(l);
    };
    canister(W * 0.34, '#e8e6e2', '#d8b93c');
    canister(W * 0.66, '#3a3f44', '#c9ccd0');
    // bottles in the bottom tier
    const bottle = (x: number) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 12, 16), simple('#3d5a2a', 0.25, 0.1, { transparent: true, opacity: 0.85 }));
      b.position.set(x, yBot + 7, D / 2);
      b.castShadow = true;
      inner.add(b);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 4, 12), simple('#3d5a2a', 0.25, 0.1));
      neck.position.set(x, yBot + 14.8, D / 2);
      inner.add(neck);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 12), simple('#20241f', 0.5, 0));
      cap.position.set(x, yBot + 17.8, D / 2);
      inner.add(cap);
      inner.add(box(4.6, 3.4, 0.3, simple('#efe9dc', 0.6, 0), x - 2.3, yBot + 5.5, D / 2 + 2.7));
    };
    bottle(W * 0.18); bottle(W * 0.55);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 9, 16), simple('#f5f2ec', 0.3, 0, { transparent: true, opacity: 0.7 }));
    cork.position.set(W * 0.8, yBot + 6, D / 2);
    inner.add(cork);
    const corkTop = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 2.6, 14), simple('#c98d4b', 0.6, 0));
    corkTop.position.set(W * 0.8, yBot + 11.6, D / 2);
    inner.add(corkTop);
  } else if (it.subtype === 'int_gas_pullout') {
    // 12 kg pink gas cylinder on a slide-out tray with a safety strap and front panel.
    pullDist = D - 8;
    if (!it.config.skipFront) inner.add(box(1.8, H, 2, doorMat, 0, 0, D - 1.2));
    bar(W - 3, 1.4, D - 6, steel, 2.5, 0.6, 3);
    for (const x of [2.5, W - 3.5]) bar(1, H * 0.72, 1, steel, x, 0.6, 3);
    bar(W - 2, 1.2, 1.2, steel, 2, H * 0.72, D - 2);
    const pink = simple('#e86fa4', 0.4, 0.1);
    const pinkDark = simple('#c14f86', 0.45, 0.1);
    const cxp = W / 2;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(14, W * 0.34), Math.min(14, W * 0.34), H * 0.6, 26), pink);
    body.position.set(cxp, H * 0.34, D / 2);
    body.castShadow = true;
    inner.add(body);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(13, W * 0.32), Math.min(14.5, W * 0.36), H * 0.1, 26), pinkDark);
    foot.position.set(cxp, H * 0.07, D / 2);
    inner.add(foot);
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(6.5, Math.min(13.5, W * 0.33), H * 0.12, 26), pinkDark);
    shoulder.position.set(cxp, H * 0.68, D / 2);
    inner.add(shoulder);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 4.5, 14), simple('#8a8f94', 0.3, 0.7));
    valve.position.set(cxp, H * 0.76, D / 2);
    inner.add(valve);
    const hand = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.7, 8, 20, Math.PI), simple('#8a8f94', 0.3, 0.7));
    hand.position.set(cxp, H * 0.79, D / 2);
    inner.add(hand);
    // retaining strap across the body
    const strap = new THREE.Mesh(new THREE.TorusGeometry(Math.min(14.4, W * 0.35), 0.8, 8, 26), steel);
    strap.rotation.x = Math.PI / 2;
    strap.position.set(cxp, H * 0.5, D / 2);
    inner.add(strap);
  } else if (it.subtype === 'int_cutlery') {
    // shallow drawer with divider compartments and cutlery, front panel travels with it.
    pullDist = D - 8;
    if (!it.config.skipFront) inner.add(box(1.8, H + 2, 2, doorMat, 0, 0, D - 1.2));
    bar(W - 3, 1.2, D - 5, simple('#8a8f94', 0.4, 0.5), 2.5, 0.6, 3);
    for (const x of [2.5, W - 3.5, W / 2]) bar(0.9, H * 0.6, D - 6, simple('#9aa3ab', 0.4, 0.6), x - 0.4, 1.4, 3);
    for (const z of [3, D * 0.5, D - 5]) bar(W - 4, 0.9, 0.9, simple('#9aa3ab', 0.4, 0.6), 3, 1.4, z);
    // cutlery: handles + heads laid in the compartments
    const handle = (x: number, z: number, col: string) => {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 9, 10), simple(col, 0.35, 0.4));
      h.rotation.x = Math.PI / 2;
      h.position.set(x, 3.4, z + 4);
      inner.add(h);
    };
    for (let i = 0; i < 5; i++) handle(W * 0.14 + i * 2.4, D * 0.2, '#c9ccd0');
    for (let i = 0; i < 4; i++) handle(W * 0.5 + i * 2.6, D * 0.2, '#c9ccd0');
    for (let i = 0; i < 4; i++) {
      const spoon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 8, 10), simple('#c9ccd0', 0.35, 0.5));
      spoon.rotation.x = Math.PI / 2;
      spoon.position.set(W * 0.16 + i * 2.6, 3.4, D * 0.62);
      inner.add(spoon);
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), simple('#c9ccd0', 0.3, 0.5));
      bowl.scale.set(1, 0.4, 1.4);
      bowl.position.set(W * 0.16 + i * 2.6, 3.6, D * 0.62 + 5.4);
      inner.add(bowl);
    }
    for (let i = 0; i < 3; i++) {
      const knife = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 11), simple('#7d838a', 0.3, 0.6));
      knife.position.set(W * 0.52 + i * 3, 3.2, D * 0.64);
      inner.add(knife);
    }
  } else if (it.subtype === 'int_dish_wall') {
    // wood-finish mounting plate (sits flush to the wall cabinet bottom) + chrome rails + drip tray
    bar(W, 1.6, 1.2, wood, 0, H - 1.6, 0);
    bar(W - 4, 0.8, D - 2, steel, 2, 0.2, 1);
    for (const y of [5, H * 0.55]) bar(W - 4, 0.6, 0.6, chrome, 2, y, D * 0.45);
    const nSlots = Math.max(3, Math.floor(W / 5));
    for (let i = 0; i <= nSlots; i++) bar(0.4, H * 0.6, 0.4, chrome, 3 + (i * (W - 6)) / nSlots, 2, D * 0.45);
    for (let i = 0; i < 3; i++) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.6, 5, 16), plastic);
      bowl.position.set(12 + i * 15, 4, D * 0.7);
      inner.add(bowl);
    }
  } else if (it.subtype === 'int_spice_pullout') {
    // narrow pull-out spice column: front panel + guard rails + jars on every tier.
    pullDist = D - 6;
    if (!it.config.skipFront) inner.add(box(1.8, H + 2, 2, doorMat, 0, 0, D - 1.2));
    bar(W - 3, 1, D - 4, steel, 1.5, 0.5, 2);
    for (const x of [1.5, W - 2.5]) bar(1, H, 1, chrome, x, 0.5, 2);
    const levels = 4;
    for (let l = 0; l < levels; l++) {
      const y = 5 + (l * (H - 9)) / (levels - 1);
      bar(W - 3, 0.5, D - 6, chrome, 1.5, y, 3);
      bar(W - 3, 3, 0.5, chrome, 1.5, y, D - 4);
      const cols = ['#c62828', '#ef6c00', '#2e7d32', '#1565c0', '#8d6e63', '#f9a825'];
      for (let j = 0; j < 3; j++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6.5, 14), simple(cols[(l * 3 + j) % cols.length], 0.4, 0.08));
        b.position.set(W * 0.25 + j * W * 0.25, y + 3.4, D * 0.45);
        b.castShadow = true;
        inner.add(b);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.2, 14), simple('#37474f', 0.4, 0.2));
        cap.position.set(W * 0.25 + j * W * 0.25, y + 7.2, D * 0.45);
        inner.add(cap);
      }
    }
  } else if (it.subtype === 'int_trash_pullout') {
    pullDist = D - 6;
    bar(W, 1, D - 4, steel, 0, 0.5, 2);
    for (const x of [0.5, W - 1.5]) bar(1, H * 0.85, 1, steel, x, 0, 1);
    bar(W, 1.2, 1.2, steel, 0, H * 0.85, D - 1.2);
    const half = (W - 6) / 2;
    bar(half, H * 0.7, D - 12, simple('#546e7a', 0.55, 0.2), 3, 3, 6);
    bar(half, H * 0.7, D - 12, simple('#78909c', 0.55, 0.2), 3 + half + 0, 3, 6);
  }
  inner.position.z = (it.openAmount ?? 0) * pullDist; // +z = toward the user
  g.add(inner);
  g.traverse((o) => { o.userData.itemId = it.id; });
  placeGroup(g, it);
  return g;
}

const INTERIOR_SUBTYPE: Record<string, string> = {
  dish: 'int_dish_pullout', spice: 'int_spice_pullout', gas: 'int_gas_pullout', cutlery: 'int_cutlery',
};

/** Embed a pull-out organiser inside a cabinet half; its frame travels with the host's open amount. */
export function buildInteriorUnit(key: string, width: number, height: number, depth: number, project: Project, openAmount: number): THREE.Group | null {
  const subtype = INTERIOR_SUBTYPE[key];
  if (!subtype || width < 12 || height < 12) return null;
  const synth: Item = {
    id: 'interior', kind: 'accessory', category: 'accessory', subtype, name: key,
    x: 0, y: 0, rotation: 0, width, height, depth, elevation: 0,
    config: { ...DEFAULT_CONFIG, skipFront: true }, openAmount,
  };
  const g = buildInternal(synth, project);
  return (g.children[0] as THREE.Group) ?? null;
}

function buildAccessory(it: Item, project: Project): THREE.Group {
  if (it.subtype.startsWith('int_')) return buildInternal(it, project);
  const g = new THREE.Group();
  const m = project.materials;
  const W = it.width;
  const H = it.height;
  const D = it.depth;
  if (it.subtype === 'acc_tv') {
    g.add(box(W, H, D * 0.6, simple('#0a0a0a', 0.3, 0.3), 0, 0, 0));
    g.add(box(W - 2, H - 2, 0.3, simple('#101418', 0.05, 0.6, { emissive: '#223548', emissiveIntensity: 0.6 }), 1, 1, D * 0.6));
  } else if (it.subtype === 'acc_led') {
    g.add(box(W, H, D, simple('#fff7d6', 0.3, 0, { emissive: '#fff2b0', emissiveIntensity: 2 }), 0, 0, 0));
  } else if (it.subtype === 'acc_backsplash') {
    g.add(box(W, H, D, colorMaterial(m.countertopColor, 'gloss', false, 2, 'hpl', m.tints?.countertop ?? 0), 0, 0, 0));
  } else if (it.subtype === 'acc_wine') {
    const wm = colorMaterial(m.doorColor, m.finish, false, 1, m.finishing, m.tints?.door ?? 0);
    g.add(box(1.8, H, D, wm, 0, 0, 0), box(1.8, H, D, wm, W - 1.8, 0, 0), box(W, 1.8, D, wm, 0, 0, 0), box(W, 1.8, D, wm, 0, H - 1.8, 0));
    for (let i = 1; i < 3; i++) g.add(box(W, 1.2, D, wm, 0, (H / 3) * i, 0));
  } else {
    const followsDoor = it.subtype === 'acc_filler' || it.subtype === 'acc_end_panel' || it.subtype === 'acc_crown';
    const tone = followsDoor ? m.tints?.door ?? 0 : m.tints?.carcass ?? 0;
    g.add(box(W, H, D, colorMaterial(followsDoor ? m.doorColor : m.carcassColor, m.finish, false, 1, m.finishing, tone), 0, 0, 0));
  }
  g.traverse((o) => (o.userData.itemId = it.id));
  placeGroup(g, it);
  return g;
}

// ---------- room ----------
export function buildRoom(project: Project): THREE.Group {
  const g = new THREE.Group();
  const r = project.room;
  const floorMat = new THREE.MeshStandardMaterial({ map: getTexture('tile', '#cfc8bd', Math.max(2, r.width / 60)), roughness: 0.6 });
  floorMat.map!.repeat.set(r.width / 60, r.depth / 60);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(r.width + 400, r.depth + 400), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(r.width / 2, -0.01, r.depth / 2);
  floor.receiveShadow = true;
  g.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.9 });
  for (const w of r.walls) {
    if (w.virtual) continue;
    const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    const T = 12;
    const horizontal = Math.abs(w.x2 - w.x1) > 0.5;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? L + T * 2 : T, r.ceilingHeight, horizontal ? T : L + T * 2), wallMat);
    const cx = (w.x1 + w.x2) / 2 - w.nx * (T / 2);
    const cz = (w.y1 + w.y2) / 2 - w.ny * (T / 2);
    mesh.position.set(cx, r.ceilingHeight / 2, cz);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    g.add(mesh);
  }
  return g;
}

// ---------- countertops ----------
function buildCountertops(project: Project, slabs: Countertop[], wire: boolean): THREE.Group {
  const g = new THREE.Group();
  const m = project.materials;
  const mat = colorMaterial(m.countertopColor, 'gloss', wire, 2, 'hpl', m.tints?.countertop ?? 0);
  for (const c of slabs) {
    const mesh = box(c.w, c.thickness, c.h, mat, c.x, c.elevation, c.y);
    mesh.userData.countertop = true;
    g.add(mesh);

  }
  return g;
}

// ---------- labels ----------
export function makeLabel(text: string, color = '#ffffff', bg = 'rgba(20,27,38,0.85)'): THREE.Sprite {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  const w = ctx.measureText(text).width + 28;
  c.width = w;
  c.height = 48;
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  ctx.fillStyle = bg;
  ctx.roundRect(0, 0, w, 48, 10);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 14, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(w / 3, 16, 1);
  sp.renderOrder = 999;
  return sp;
}

/** user component: shapes are stored in component space (0..W × 0..H × 0..D); scaled to the item's current size */
function buildCustomComponent(it: Item): THREE.Group {
  const g = new THREE.Group();
  let shapes: CustomShape[] = [];
  let compW = it.width, compH = it.height, compD = it.depth;
  try {
    const all = loadCustom();
    const found = all.find((c) => c.id === it.subtype.slice(7));
    if (found) { shapes = found.shapes; compW = found.width; compH = found.height; compD = found.depth; }
  } catch { /* ignore */ }
  const sx = compW ? it.width / compW : 1;
  const sy = compH ? it.height / compH : 1;
  const sz = compD ? it.depth / compD : 1;
  for (const s of shapes) {
    if (s.hole || s.subtract) continue; // cut-out markers are not solids
    const w = s.w * sx, h = s.h * sy, d = s.d * sz;
    let geo: THREE.BufferGeometry;
    if (s.type === 'box') geo = new THREE.BoxGeometry(w, h, d);
    else if (s.type === 'cylinder') geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 20);
    else if (s.type === 'sphere') geo = new THREE.SphereGeometry(w / 2, 20, 14);
    else if (s.type === 'prism') geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 3);
    else if (s.type === 'torus') geo = new THREE.TorusGeometry(w / 2, Math.max(0.3, Math.min(w, h) * 0.12), 10, 24);
    else geo = new THREE.BoxGeometry(w, Math.max(0.2, h), Math.max(0.2, d));
    const look = lookFor(s);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: look.color, roughness: look.rough, metalness: look.metal }));
    m.position.set(s.x * sx, s.y * sy, s.z * sz);
    m.rotation.set((s.rx * Math.PI) / 180, (s.ry * Math.PI) / 180, (s.rz * Math.PI) / 180);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  if (!shapes.length) g.add(box(it.width, it.height, it.depth, simple('#8b949e', 0.6), 0, 0, 0));
  g.traverse((o) => { o.userData.itemId = it.id; });
  placeGroup(g, it);
  return g;
}

/** backsplash strips (2 walls at a corner, one per straight run) — separate from the slabs */
function buildBacksplashes(project: Project): THREE.Group {
  const g = new THREE.Group();
  const mat = colorMaterial(project.materials.countertopColor, 'gloss', false, 2, 'hpl', project.materials.tints?.countertop ?? 0);
  for (const b of computeBacksplashes(project)) g.add(box(b.w, project.materials.backsplashHeight, b.h, mat, b.x, b.elevation, b.y));
  return g;
}

export function buildFurniture(project: Project, slabs: Countertop[], opts: SceneOpts): THREE.Group {
  const root = new THREE.Group();
  const m = project.materials;
  lightBudget.left = 10;
  const furnMats: FurnMats = {
    body: colorMaterial(m.carcassColor, 'matte', opts.wireframe, 2, 'hpl', m.tints?.carcass ?? 0),
    door: colorMaterial(m.doorColor, m.finish, opts.wireframe, 1, m.finishing, m.tints?.door ?? 0),
    top: colorMaterial(m.countertopColor, 'gloss', opts.wireframe, 2, 'hpl', m.tints?.countertop ?? 0),
    fabric: simple('#8d6e63', 0.9),
    metal: simple('#c9cdd1', 0.25, 0.9),
    dark: simple('#2b2b2b', 0.7),
  };
  for (const it of project.items) {
    if (it.visible === false) continue;
    if (opts.isolateIds && !opts.isolateIds.includes(it.id)) continue;
    let g: THREE.Group;
    if (it.subtype.startsWith('custom:')) g = buildCustomComponent(it);
    else if (it.kind === 'cabinet') g = buildCabinet(it, project, opts);
    else if (it.kind === 'appliance') g = buildAppliance(it, project, project.room.ceilingHeight);
    else if (it.kind === 'furniture') { g = buildFurnitureItem(it, furnMats); placeGroup(g, it); }
    else g = buildAccessory(it, project);
    g.userData.itemId = it.id;
    g.name = it.id;
    root.add(g);
    if (opts.showDims && it.kind === 'cabinet' && it.category !== 'wall') {
      const f = footprint(it);
      const lab = makeLabel(`${it.width} cm`);
      lab.position.set(f.x + f.w / 2, it.elevation + it.height + 12, f.y + f.h / 2);
      root.add(lab);
    }
  }
  root.add(buildCountertops(project, slabs, opts.wireframe));
  root.add(buildBacksplashes(project));
  root.add(buildCornice(project, furnMats.door));
  return root;
}

export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (mesh.userData.disposeMaterial && mat) {
      for (const material of Array.isArray(mat) ? mat : [mat]) material.dispose();
    }
    if (mat && !(mat instanceof Array) && (mat as THREE.SpriteMaterial).map && (o as THREE.Sprite).isSprite) {
      (mat as THREE.SpriteMaterial).map?.dispose();
      mat.dispose();
    }
  });
}
