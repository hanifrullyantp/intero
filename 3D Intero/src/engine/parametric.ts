import type { Item, Part, ProjectMaterials } from '../models/types';
import { getBoard } from '../config/materials';
import { KITCHEN_STANDARDS, CONSTRUCTION_RULES } from '../config/standards';
import { r1 } from '../utils/geometry';
import { housingLayout } from './applianceHousing';
import { ELECTRO_DEFS, electronicsLayout } from './electronicsTower';

const GAP = CONSTRUCTION_RULES.door_gap; // 0.2 cm between fronts
const TK_H = KITCHEN_STANDARDS.base_cabinet.toe_kick_height;
const TK_D = KITCHEN_STANDARDS.base_cabinet.toe_kick_depth;

interface Ctx {
  item: Item;
  parts: Part[];
  t: number; // board thickness (cm)
  tb: number; // back thickness (cm)
  board: string;
  backBoard: string;
  n: number;
}

function add(
  ctx: Ctx,
  name: string,
  box: [number, number, number, number, number, number],
  role: Part['role'],
  opts: Partial<Part> & { cut?: [number, number] } = {},
): Part {
  const [x, y, z, sx, sy, sz] = box;
  const cut = opts.cut ?? [Math.max(sx, sy), Math.min(sx, sy)];
  const isBack = role === 'back';
  const thickness = isBack ? ctx.tb : opts.thickness ?? ctx.t;
  const part: Part = {
    id: `${ctx.item.id}_p${ctx.n++}`,
    itemId: ctx.item.id,
    cabinetName: ctx.item.name,
    name,
    cutW: r1(cut[0]),
    cutH: r1(cut[1]),
    thickness,
    material: isBack ? ctx.backBoard : opts.material ?? ctx.board,
    qty: 1,
    edgeBanding: opts.edgeBanding ?? '-',
    edgeMeters: opts.edgeMeters ?? 0,
    grain: opts.grain ?? 'length',
    box: { x: r1(x), y: r1(y), z: r1(z), sx: r1(sx), sy: r1(sy), sz: r1(sz) },
    role,
    hingeSide: opts.hingeSide,
    isFront: opts.isFront ?? (role === 'door' || role === 'drawer'),
    glass: opts.glass,
    countInList: (opts.countInList ?? true) && cut[0] > 0 && cut[1] > 0,
    sideFace: opts.sideFace,
    hingeAt: opts.hingeAt,
    bifold: opts.bifold,
  };
  ctx.parts.push(part);
  return part;
}

function edge(cut: [number, number], longs: number, shorts: number) {
  return { edgeBanding: `${longs}L${shorts}S`, edgeMeters: r1((cut[0] * longs + cut[1] * shorts) / 100) };
}

/** Fronts (doors / drawer fronts) for a face area x0..x1 (width) and y0..y1 (height) at z=front */
function fronts(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, zFront: number) {
  const { item, t } = ctx;
  const c = item.config;
  if (c.openFront) return;
  const W = x1 - x0;
  const H = y1 - y0;
  let yTop = y1;
  const drawerCount = c.drawers;
  const doorCount = c.doors;
  // ---- drawers ----
  if (drawerCount > 0) {
    let drawerArea = H;
    if (doorCount > 0) drawerArea = Math.min(H * 0.3, 20 * drawerCount); // combo: drawers on top
    const totalGap = (drawerCount + (doorCount > 0 ? 1 : 0)) * GAP;
    const hf = (drawerArea - totalGap) / drawerCount;
    for (let i = 0; i < drawerCount; i++) {
      const yBottom = yTop - hf;
      const cut: [number, number] = [W - 2 * GAP, hf];
      add(ctx, `Drawer Front ${i + 1}`, [x0 + GAP, yBottom, zFront, W - 2 * GAP, hf, t], 'drawer', {
        cut,
        ...edge(cut, 2, 2),
        hingeSide: 'top',
      });
      // drawer box parts (cutting list only)
      const boxH = Math.max(8, hf - 4);
      const boxD = Math.max(25, Math.min(50, item.depth - 6));
      const innerW = W - 2 * t - 2 * CONSTRUCTION_RULES.drawer_side_gap;
      add(ctx, `Drawer ${i + 1} Side`, [x0 + t + 1.3, yBottom + 1, 3, 1.5, boxH, boxD], 'other', { cut: [boxD, boxH], thickness: 1.5, material: 'ply15', ...edge([boxD, boxH], 1, 0), countInList: true });
      ctx.parts[ctx.parts.length - 1].qty = 2;
      ctx.parts[ctx.parts.length - 1].box.sx = 0; // hidden in 3d
      add(ctx, `Drawer ${i + 1} Back/Front`, [0, 0, 0, 0, 0, 0], 'other', { cut: [innerW - 3, boxH], thickness: 1.5, material: 'ply15', ...edge([innerW - 3, boxH], 1, 0) });
      ctx.parts[ctx.parts.length - 1].qty = 2;
      add(ctx, `Drawer ${i + 1} Bottom`, [0, 0, 0, 0, 0, 0], 'other', { cut: [boxD, innerW], thickness: 0.4, material: 'ply4', grain: 'none' });
      yTop = yBottom - GAP;
    }
  }
  // ---- doors ----
  const doorH = yTop - y0 - (drawerCount > 0 && doorCount > 0 ? 0 : 0);
  if (doorCount > 0 && doorH > 5) {
    if (c.opening === 'flip_up') {
      const cut: [number, number] = [W - 2 * GAP, doorH - GAP];
      add(ctx, 'Flip-up Door', [x0 + GAP, y0 + GAP, zFront, W - 2 * GAP, doorH - GAP, t], 'door', { cut, ...edge(cut, 2, 2), hingeSide: 'top', glass: c.glass });
      return;
    }
    const n = Math.max(1, doorCount);
    const dw = (W - (n + 1) * GAP) / n;
    for (let i = 0; i < n; i++) {
      const dx = x0 + GAP + i * (dw + GAP);
      const cut: [number, number] = [doorH - GAP, dw];
      const hinge: Part['hingeSide'] = n === 1 ? (c.opening === 'right' ? 'right' : 'left') : i === 0 ? 'left' : 'right';
      add(ctx, n === 1 ? 'Door' : `Door ${i === 0 ? 'L' : 'R'}`, [dx, y0 + GAP, zFront, dw, doorH - GAP, t], 'door', { cut, ...edge(cut, 2, 2), hingeSide: hinge, glass: c.glass, grain: 'length' });
    }
  }
}

function standardCarcass(ctx: Ctx, W: number, H: number, D: number, yBase: number, fullTop: boolean) {
  const { t, tb } = ctx;
  const Hc = H - yBase;
  // sides
  const sideCut: [number, number] = [Hc, D];
  add(ctx, 'Side Left', [0, yBase, 0, t, Hc, D], 'carcass', { cut: sideCut, ...edge(sideCut, 1, 0) });
  add(ctx, 'Side Right', [W - t, yBase, 0, t, Hc, D], 'carcass', { cut: sideCut, ...edge(sideCut, 1, 0) });
  const innerW = W - 2 * t;
  // bottom
  add(ctx, 'Bottom', [t, yBase, 0, innerW, t, D], 'carcass', { cut: [innerW, D], ...edge([innerW, D], 1, 0) });
  // top
  if (fullTop) {
    add(ctx, 'Top', [t, H - t, 0, innerW, t, D], 'carcass', { cut: [innerW, D], ...edge([innerW, D], 1, 0) });
  } else {
    add(ctx, 'Top Rail Front', [t, H - t, D - 10, innerW, t, 10], 'carcass', { cut: [innerW, 10] });
    add(ctx, 'Top Rail Back', [t, H - t, tb, innerW, t, 10], 'carcass', { cut: [innerW, 10] });
  }
  // back
  add(ctx, 'Back Panel', [t, yBase + t, 0, innerW, Hc - 2 * t, tb], 'back', { cut: [Hc - 2 * t, innerW], grain: 'none' });
  // shelves
  const n = ctx.item.config.shelves;
  const shelfD = D - tb - 1.5;
  for (let i = 0; i < n; i++) {
    const y = yBase + t + ((Hc - 2 * t) / (n + 1)) * (i + 1) - t / 2;
    add(ctx, `Shelf ${i + 1}`, [t + 0.1, y, tb, innerW - 0.2, t, shelfD], 'shelf', { cut: [innerW - 0.2, shelfD], ...edge([innerW - 0.2, shelfD], 1, 0) });
  }
}

export function generateParts(item: Item, mats: ProjectMaterials): Part[] {
  const boardId = item.config.materials.useDefault ? mats.board : item.config.materials.board ?? mats.board;
  const backId = item.config.materials.useDefault ? mats.backBoard : item.config.materials.backPanel ?? mats.backBoard;
  const ctx: Ctx = {
    item,
    parts: [],
    t: getBoard(boardId).thickness / 10,
    tb: getBoard(backId).thickness / 10,
    board: boardId,
    backBoard: backId,
    n: 0,
  };
  if (item.kind !== 'cabinet') return ctx.parts;
  const W = item.width;
  const H = item.height;
  const D = item.depth;
  const { t } = ctx;
  const c = item.config;
  const isCorner = item.subtype.includes('corner');
  const hasTK = c.hasToeKick && item.category !== 'wall';
  const yBase = hasTK ? TK_H : 0;

  // ---- CORNER V5: true L carcass, NO centre divider, doors face INTO the L ----
  // Local frame: x along the front (0..W), z toward the room (0 = back, D = far end of arm B).
  // Arm A : x 0..W,   z 0..arm  (front opening at z = arm)
  // Arm B : x 0..arm, z arm..D  (side opening at x = arm, or x = W-arm when extension is right)
  if (isCorner) {
    const defArm = item.category === 'wall' ? 33 : 60;
    const arm = Math.max(15, Math.min(c.cornerDepth ?? defArm, W, D));
    const left = c.opening !== 'right';          // arm B extends toward x = 0 (left) or x = W (right)
    const Hc = H - yBase;
    const bLen = D - arm;                         // arm B run beyond the corner square
    const bx0 = left ? 0 : W - arm;               // arm B x-range [bx0, bx0 + arm]
    const outerX = left ? 0 : W - t;              // outer side panel of the L (continuous z 0..D)
    const endAX = left ? W - t : 0;               // closing end of arm A (z 0..arm)
    const topY = H - t;
    // ---- carcass (outer shell only, nothing inside the corner square) ----
    add(ctx, 'Side Outer', [outerX, yBase, 0, t, Hc, D], 'carcass', { cut: [Hc, D], ...edge([Hc, D], 1, 0) });
    add(ctx, 'End A', [endAX, yBase, 0, t, Hc, arm], 'carcass', { cut: [Hc, arm], ...edge([Hc, arm], 1, 0) });
    add(ctx, 'End B', [bx0, yBase, D - t, arm, Hc, t], 'carcass', { cut: [Hc, arm], ...edge([Hc, arm], 1, 0) });
    add(ctx, 'Bottom A', [0, yBase, 0, W, t, arm], 'carcass', { cut: [W, arm] });
    add(ctx, 'Bottom B', [bx0, yBase, arm, arm, t, bLen], 'carcass', { cut: [bLen, arm] });
    if (item.category === 'wall') {
      add(ctx, 'Top A', [0, topY, 0, W, t, arm], 'carcass', { cut: [W, arm] });
      add(ctx, 'Top B', [bx0, topY, arm, arm, t, bLen], 'carcass', { cut: [bLen, arm] });
    } else {
      add(ctx, 'Top Rail A', [0, topY, arm - 10, W, t, 10], 'carcass', { cut: [W, 10] });
      add(ctx, 'Top Rail B', [left ? arm - 10 : bx0, topY, arm, 10, t, bLen], 'carcass', { cut: [bLen, 10] });
    }
    add(ctx, 'Back A', [t, yBase + t, 0, W - 2 * t, Hc - 2 * t, ctx.tb], 'back', { cut: [W - 2 * t, Hc - 2 * t], grain: 'none' });
    // ---- one continuous L shelf per level (two strips meeting at the corner, no divider) ----
    for (let i = 0; i < c.shelves; i++) {
      const y = yBase + t + ((Hc - 2 * t) / (c.shelves + 1)) * (i + 1);
      add(ctx, `Shelf A ${i + 1}`, [t, y, ctx.tb, W - 2 * t, t, arm - ctx.tb], 'shelf', { cut: [W - 2 * t, arm - ctx.tb] });
      add(ctx, `Shelf B ${i + 1}`, [left ? t : W - arm, y, arm, arm - t, t, bLen - t], 'shelf', { cut: [bLen - t, arm - t] });
    }
    if (hasTK) {
      add(ctx, 'Toe Kick A', [0, 0, arm - TK_D - t, W, TK_H, t], 'toekick', { cut: [W, TK_H] });
      add(ctx, 'Toe Kick B', [left ? arm - TK_D - t : W - arm + TK_D, 0, arm, t, TK_H, bLen], 'toekick', { cut: [bLen, TK_H] });
      // closed toe at the corner's ends and outer side (notched lower part of each end panel)
      const aEnd = arm - TK_D;
      add(ctx, 'Toe Side A', [endAX, 0, 0, t, TK_H, aEnd], 'toekick', { cut: [aEnd, TK_H] });
      add(ctx, 'Toe Side B', [left ? bx0 : W - arm + TK_D, 0, D - t, aEnd, TK_H, t], 'toekick', { cut: [aEnd, TK_H] });
      add(ctx, 'Toe Side Outer', [outerX, 0, 0, t, TK_H, D], 'toekick', { cut: [D, TK_H] });
    }
    // ---- doors: each opening is the L's mouth; length 0 = no door (open), unset = full opening ----
    const openFront = W - arm;   // front opening x-span (arm A front face, z = arm)
    const openSide = bLen;       // side opening z-span (arm B inner face)
    const dH = Hc - 2 * GAP;
    const sideX = left ? arm : W - arm - t;     // door plane on arm B's inner face (protrudes into the room by t)
    const sideZ0 = arm;                         // near-corner end of the side opening
    const rawModel = c.cornerDoorModel === 'double' || !c.cornerDoorModel ? 'both' : c.cornerDoorModel;
    const doorLen = (v: number | undefined, full: number) => (v === undefined ? full : Math.max(0, Math.min(v, full)));
    const lenFront = doorLen(c.cornerLeftDoor, openFront);
    const lenSide = doorLen(c.cornerRightDoor, openSide);
    const nearFrontX = left ? arm : W - arm;    // corner-side edge of the front opening
    const hasFront = openFront > 8;
    const hasSide = openSide > 8;
    // front door starts at the corner edge, hinge at the far end, handle at the corner edge
    const addFront = (name: string, len: number, extra: Partial<Part> = {}) => {
      const x0 = left ? nearFrontX : nearFrontX - len;
      const cut: [number, number] = [dH, len - 2 * GAP];
      add(ctx, name, [x0 + GAP, yBase + GAP, arm, len - 2 * GAP, dH, t], 'door', { cut, ...edge(cut, 2, 2), hingeSide: left ? 'right' : 'left', hingeAt: 'far', ...extra });
    };
    // side door starts at the corner (z = arm), hinge at the far end (z = D), handle at the corner end
    const addSide = (name: string, len: number, extra: Partial<Part> = {}) => {
      const cut: [number, number] = [dH, len - 2 * GAP];
      add(ctx, name, [sideX, yBase + GAP, sideZ0 + GAP, t, dH, len - 2 * GAP], 'door', { cut, ...edge(cut, 2, 2), hingeSide: left ? 'left' : 'right', sideFace: true, hingeAt: 'far', ...extra });
    };
    const addBlindFront = (x0: number, w: number) => add(ctx, 'Blind Panel Front', [x0 + GAP, yBase + GAP, arm, w - 2 * GAP, dH, t], 'other', { cut: [dH, w - 2 * GAP], ...edge([dH, w - 2 * GAP], 2, 2), isFront: true });
    const addBlindSide = (z0: number, len: number) => add(ctx, 'Blind Panel Side', [sideX, yBase + GAP, z0 + GAP, t, dH, len - 2 * GAP], 'other', { cut: [dH, len - 2 * GAP], ...edge([dH, len - 2 * GAP], 2, 2), isFront: true, sideFace: true });
    const frontBlindRemainder = () => {
      const rest = openFront - lenFront;
      if (rest > 8) addBlindFront(left ? nearFrontX + lenFront : 0, rest);
    };
    const sideBlindRemainder = () => {
      const rest = openSide - lenSide;
      if (rest > 8) addBlindSide(sideZ0 + lenSide, rest);
    };
    if (!c.openFront && rawModel !== 'open') {
      if (rawModel === 'single') {
        if (hasFront) { addFront('Corner Door 168°', openFront, { bifold: 0 }); }
        if (hasSide) addBlindSide(sideZ0, openSide);
      } else if (rawModel === 'left_only' || rawModel === 'right_only') {
        const useFront = rawModel === 'left_only';
        if (useFront) {
          if (hasFront && lenFront > 8) { addFront('Door Front', lenFront); frontBlindRemainder(); }
          if (hasSide) addBlindSide(sideZ0, openSide);
        } else {
          if (hasSide && lenSide > 8) { addSide('Door Side', lenSide); sideBlindRemainder(); }
          if (hasFront) addBlindFront(left ? nearFrontX : 0, openFront);
        }
      } else if (rawModel === 'bifold') {
        if (hasFront && lenFront > 8) { addFront('Bi-fold Panel A', lenFront, { bifold: 1 }); frontBlindRemainder(); }
        if (hasSide && lenSide > 8) { addSide('Bi-fold Panel B', lenSide, { bifold: 2 }); sideBlindRemainder(); }
      } else {
        // 'both' (default): door on each opening; a length of 0 leaves that mouth open (no door, no panel)
        if (hasFront && lenFront > 8) { addFront('Door Front', lenFront); frontBlindRemainder(); }
        if (hasSide && lenSide > 8) { addSide('Door Side', lenSide); sideBlindRemainder(); }
      }
    }
    return ctx.parts;
  }

  // ---- fridge housing: open box ----
  if (item.subtype.startsWith('tall_fridge')) {
    const layout = housingLayout(item, boardId);
    const upperBottom = layout.shelfY;
    add(ctx, 'Side Left', [0, 0, 0, t, H, D], 'carcass', { cut: [H, D], ...edge([H, D], 1, 0) });
    add(ctx, 'Side Right', [W - t, 0, 0, t, H, D], 'carcass', { cut: [H, D], ...edge([H, D], 1, 0) });
    add(ctx, 'Top', [t, H - t, 0, W - 2 * t, t, D], 'carcass', { cut: [W - 2 * t, D], ...edge([W - 2 * t, D], 1, 0) });
    if (layout.storageHeight > 2) {
      const doorH = H - upperBottom - 2 * GAP;
      add(ctx, 'Top Cabinet Door', [GAP, upperBottom + GAP, D, W - 2 * GAP, doorH, t], 'door', {
        cut: [W - 2 * GAP, doorH], ...edge([W - 2 * GAP, doorH], 2, 2), hingeSide: 'top',
      });
      add(ctx, 'Top Cabinet Bottom', [t, upperBottom, 0, W - 2 * t, t, D], 'carcass', { cut: [W - 2 * t, D] });
      add(ctx, 'Top Cabinet Back', [t, upperBottom + t, 0, W - 2 * t, H - upperBottom - 2 * t, ctx.tb], 'back', {
        cut: [W - 2 * t, H - upperBottom - 2 * t], grain: 'none',
      });
    }
    return ctx.parts;
  }

  if (item.subtype === 'tall_dispenser') {
    const layout = housingLayout(item, boardId);
    const topOfNiche = layout.shelfY;
    const shell = { ...ctx, item: { ...item, config: { ...c, shelves: 0 } } };
    standardCarcass(shell, W, H, D, yBase, true);
    ctx.n = shell.n;
    if (hasTK) {
      add(ctx, 'Toe Kick', [0, 0, D - TK_D - t, W, TK_H, t], 'toekick', { cut: [W, TK_H] });
      add(ctx, 'Toe Side L', [0, 0, 0, t, TK_H, D - TK_D], 'toekick', { cut: [D - TK_D, TK_H] });
      add(ctx, 'Toe Side R', [W - t, 0, 0, t, TK_H, D - TK_D], 'toekick', { cut: [D - TK_D, TK_H] });
    }
    if (layout.storageHeight > 2) {
      add(ctx, 'Niche Ceiling', [t, topOfNiche, 0, W - 2 * t, t, D], 'shelf', { cut: [W - 2 * t, D], ...edge([W - 2 * t, D], 1, 0) });
      const upper = { ...ctx, item: { ...item, config: { ...c, openFront: false, drawers: 0, doors: c.doors || 1 } } };
      fronts(upper, 0, W, topOfNiche, H, D);
      ctx.n = upper.n;
    }
    return ctx.parts;
  }

  if (item.subtype === 'tall_electro') {
    const layout = electronicsLayout(item);
    const shell = { ...ctx, item: { ...item, config: { ...c, shelves: 0 } } };
    standardCarcass(shell, W, H, D, yBase, true);
    ctx.n = shell.n;
    if (hasTK) {
      add(ctx, 'Toe Kick', [0, 0, D - TK_D - t, W, TK_H, t], 'toekick', { cut: [W, TK_H] });
      add(ctx, 'Toe Side L', [0, 0, 0, t, TK_H, D - TK_D], 'toekick', { cut: [D - TK_D, TK_H] });
      add(ctx, 'Toe Side R', [W - t, 0, 0, t, TK_H, D - TK_D], 'toekick', { cut: [D - TK_D, TK_H] });
    }
    for (const slot of layout.slots) {
      if (slot.y > yBase + t && slot.y < H - t) {
        add(ctx, `${ELECTRO_DEFS[slot.key].label} Support Shelf`, [t, slot.y - t, 0, W - 2 * t, t, D], 'shelf', { cut: [W - 2 * t, D], ...edge([W - 2 * t, D], 1, 0) });
      }
    }
    if (layout.top > yBase + t && layout.top < H - t) {
      add(ctx, 'Top Appliance Shelf', [t, layout.top, 0, W - 2 * t, t, D], 'shelf', { cut: [W - 2 * t, D], ...edge([W - 2 * t, D], 1, 0) });
    }
    if (layout.shelfY - yBase > 10) fronts(ctx, 0, W, yBase, layout.shelfY - t, D);
    if (layout.storageHeight > 8) fronts(ctx, 0, W, layout.top + t, H, D);
    return ctx.parts;
  }

  // ---- standard box ----
  const fullTop = item.category !== 'base';
  if (item.subtype === 'tall_oven') {
    const shell = { ...ctx, item: { ...item, config: { ...c, shelves: 0 } } };
    standardCarcass(shell, W, H, D, yBase, fullTop);
    ctx.n = shell.n;
    for (const y of [60, 120, 150]) if (y < H - t) add(ctx, `Appliance Shelf ${y}`, [t, y - t, 0, W - 2 * t, t, D], 'shelf', { cut: [W - 2 * t, D] });
  } else standardCarcass(ctx, W, H, D, yBase, fullTop);
  if (hasTK) {
    add(ctx, 'Toe Kick', [0, 0, D - TK_D - t, W, TK_H, t], 'toekick', { cut: [W, TK_H] });
    // close the toe recess at both cabinet sides (the lower, notched part of the side panel):
    // the end of a run is closed down to the floor; only the front keeps the 5 cm recess
    const sideLen = D - TK_D;
    add(ctx, 'Toe Side L', [0, 0, 0, t, TK_H, sideLen], 'toekick', { cut: [sideLen, TK_H] });
    add(ctx, 'Toe Side R', [W - t, 0, 0, t, TK_H, sideLen], 'toekick', { cut: [sideLen, TK_H] });
  }

  if (item.subtype === 'tall_oven') {
    // oven niche: fronts only on top & bottom sections
    fronts(ctx, 0, W, yBase, 60, D);
    fronts(ctx, 0, W, 150, H, D);
    return ctx.parts;
  }
  if (item.subtype === 'wall_micro') {
    fronts(ctx, 0, W, H - 30, H, D);
    return ctx.parts;
  }
  if (item.subtype === 'tall_pantry') {
    // split doors at 1/3 height
    const split = yBase + (H - yBase) * 0.62;
    fronts(ctx, 0, W, yBase, split, D);
    fronts(ctx, 0, W, split, H, D);
    return ctx.parts;
  }
  if (item.subtype === 'base_corner_blind') {
    // blind panel on the left 40%, door on the rest
    const blindW = W * 0.4;
    add(ctx, 'Blind Panel', [GAP, yBase + GAP, D, blindW - 2 * GAP, H - yBase - 2 * GAP, t], 'door', { cut: [H - yBase, blindW], ...edge([H - yBase, blindW], 2, 2), isFront: true });
    fronts(ctx, blindW, W, yBase, H, D);
    return ctx.parts;
  }
  fronts(ctx, 0, W, yBase, H, D);
  return ctx.parts;
}

/** number of hinges for a door of given height (cm) */
export function hingesForDoor(doorH: number) {
  return doorH < 100 ? 2 : doorH < 160 ? 3 : 4;
}
