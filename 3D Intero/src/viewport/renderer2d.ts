import type { Countertop, Footprint, Issue, Item, Project, Wall } from '../models/types';
import { footprint, center, alongDir, frontDir, offsetOnWall, wallLength, wallDir, r1 } from '../utils/geometry';
import { CATEGORY_COLORS } from '../config/library';
import { planDimensions, elevationDimensions, itemsOnWall, type DimLine } from '../engine/dimensionEngine';
import { generateParts } from '../engine/parametric';
import { tintedHex } from '../config/materials';
import { isCooktop, isSink, isFridge, isHood } from '../engine/constraints';
import { housingLayout } from '../engine/applianceHousing';
import { electronicsLayout } from '../engine/electronicsTower';
import { contrastHandleHex } from './handles3d';

export interface View2D {
  scale: number; // px per cm
  ox: number;
  oy: number;
}

export interface PlanRenderOpts {
  showGrid: boolean;
  showDims: boolean;
  showTriangle: boolean;
  showLabels: boolean;
  selectedIds: string[];
  hoverId: string | null;
  issues: Issue[];
  guides?: { axis: 'x' | 'y'; value: number }[];
  ghost?: { f: Footprint; valid: boolean; label: string } | null;
  measure?: { x1: number; y1: number; x2: number; y2: number } | null;
  countertops: Countertop[];
  gridSize: number;
  light?: boolean; // print friendly
  isolateIds?: string[] | null;
  moveGizmo?: { x: number; y: number; dx: number; dy: number; axis: 'x' | 'y' | null; dragging: boolean } | null;
  planFilter?: 'all' | 'base' | 'wall';
}

/** Which plan layer an item belongs to, for the 2D lower/upper separation. */
export function planLayerOf(it: Item): 'base' | 'wall' {
  return it.category === 'wall' ? 'wall' : 'base';
}
export function visibleInPlan(it: Item, filter: 'all' | 'base' | 'wall' | undefined): boolean {
  if (!filter || filter === 'all') return true;
  if (it.kind === 'accessory') return true;
  return planLayerOf(it) === filter;
}

export const THEME = {
  bg: '#141b26',
  bgLight: '#ffffff',
  floor: '#1b2533',
  floorLight: '#f6f6f6',
  wall: '#3b4a5c',
  wallLight: '#333',
  gridMinor: 'rgba(255,255,255,0.035)',
  gridMajor: 'rgba(255,255,255,0.09)',
  gridMinorLight: 'rgba(0,0,0,0.05)',
  gridMajorLight: 'rgba(0,0,0,0.12)',
  text: '#e0e0e0',
  textLight: '#222',
  dim: '#8892a0',
  dimLight: '#444',
  selected: '#1B9D6B',
  error: '#ef5350',
  warning: '#ffa726',
  guide: '#1B9D6B',
  triangle: '#ffd54f',
};

export function fitView(bounds: Footprint, w: number, h: number, pad = 60, flipY = false): View2D {
  const scale = Math.max(0.2, Math.min((w - pad * 2) / Math.max(1, bounds.w), (h - pad * 2) / Math.max(1, bounds.h)));
  const ox = (w - bounds.w * scale) / 2 - bounds.x * scale;
  const oy = flipY ? h - (h - bounds.h * scale) / 2 + bounds.y * scale : (h - bounds.h * scale) / 2 - bounds.y * scale;
  return { scale, ox, oy };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawDimLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, label: string, color: string, textColor: string, scaleTxt = 1, highlight = false) {
  ctx.save();
  ctx.strokeStyle = highlight ? THEME.selected : color;
  ctx.fillStyle = highlight ? THEME.selected : textColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const tick = 4;
  for (const [px, py] of [
    [x1, y1],
    [x2, y2],
  ]) {
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(ang + Math.PI / 2) * tick, py + Math.sin(ang + Math.PI / 2) * tick);
    ctx.lineTo(px - Math.cos(ang + Math.PI / 2) * tick, py - Math.sin(ang + Math.PI / 2) * tick);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - 3, py - 3);
    ctx.lineTo(px + 3, py + 3);
    ctx.stroke();
  }
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  ctx.translate(mx, my);
  let rot = ang;
  if (rot > Math.PI / 2 || rot < -Math.PI / 2) rot += Math.PI;
  ctx.rotate(rot);
  ctx.font = `${10 * scaleTxt}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len > ctx.measureText(label).width + 6) ctx.fillText(label, 0, -2);
  else if (len > 8) ctx.fillText(label, 0, -2);
  ctx.restore();
}

function hexAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function cornerPolygon(it: Item): [number, number][] | null {
  if (!it.subtype.includes('corner')) return null;
  const defArm = it.category === 'wall' ? 33 : 60;
  const arm = Math.max(20, Math.min(it.config.cornerDepth ?? defArm, it.width - 5, it.depth - 5));
  const W = it.width;
  const D = it.depth;
  const left = it.config.opening !== 'right';
  // local polygon (x, z): arm A along x at z 0..arm; arm B along z at x-range (asymmetric W×D)
  const pts: [number, number][] = left
    ? [
        [0, 0],
        [W, 0],
        [W, arm],
        [arm, arm],
        [arm, D],
        [0, D],
      ]
    : [
        [0, 0],
        [W, 0],
        [W, D],
        [W - arm, D],
        [W - arm, arm],
        [0, arm],
      ];
  // transform local → plan
  const a = alongDir(it.rotation);
  const fdir = frontDir(it.rotation);
  const f = footprint(it);
  // local origin in plan
  const ox = it.rotation === 0 ? f.x : it.rotation === 90 ? f.x + f.w : it.rotation === 180 ? f.x + f.w : f.x;
  const oy = it.rotation === 0 ? f.y : it.rotation === 90 ? f.y : it.rotation === 180 ? f.y + f.h : f.y + f.h;
  return pts.map(([lx, lz]) => [ox + a.x * lx + fdir.x * lz, oy + a.y * lx + fdir.y * lz]);
}

export function renderPlan(ctx: CanvasRenderingContext2D, W: number, H: number, project: Project, view: View2D, opts: PlanRenderOpts) {
  const light = !!opts.light;
  const { scale, ox, oy } = view;
  const X = (x: number) => ox + x * scale;
  const Y = (y: number) => oy + y * scale;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = light ? THEME.bgLight : THEME.bg;
  ctx.fillRect(0, 0, W, H);

  // --- grid ---
  if (opts.showGrid) {
    let step = opts.gridSize;
    while (step * scale < 6) step *= step === 1 ? 5 : 2;
    const major = step * 10;
    const x0 = Math.floor(-ox / scale / step) * step;
    const y0 = Math.floor(-oy / scale / step) * step;
    const x1 = (W - ox) / scale;
    const y1 = (H - oy) / scale;
    ctx.lineWidth = 1;
    for (let x = x0; x <= x1; x += step) {
      const isMajor = Math.abs(x % major) < 1e-6;
      ctx.strokeStyle = isMajor ? (light ? THEME.gridMajorLight : THEME.gridMajor) : light ? THEME.gridMinorLight : THEME.gridMinor;
      ctx.beginPath();
      ctx.moveTo(Math.round(X(x)) + 0.5, 0);
      ctx.lineTo(Math.round(X(x)) + 0.5, H);
      ctx.stroke();
    }
    for (let y = y0; y <= y1; y += step) {
      const isMajor = Math.abs(y % major) < 1e-6;
      ctx.strokeStyle = isMajor ? (light ? THEME.gridMajorLight : THEME.gridMajor) : light ? THEME.gridMinorLight : THEME.gridMinor;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(Y(y)) + 0.5);
      ctx.lineTo(W, Math.round(Y(y)) + 0.5);
      ctx.stroke();
    }
  }

  // --- room ---
  const room = project.room;
  ctx.fillStyle = light ? THEME.floorLight : THEME.floor;
  ctx.fillRect(X(0), Y(0), room.width * scale, room.depth * scale);
  ctx.strokeStyle = light ? '#999' : '#2a3a4a';
  ctx.lineWidth = 1;
  ctx.strokeRect(X(0), Y(0), room.width * scale, room.depth * scale);
  const WT = 12;
  for (const w of room.walls) {
    if (w.virtual) continue;
    const d = wallDir(w);
    const L = wallLength(w);
    const ax = w.x1 - w.nx * WT;
    const ay = w.y1 - w.ny * WT;
    ctx.fillStyle = light ? THEME.wallLight : THEME.wall;
    const px = Math.min(ax, w.x1, w.x2, w.x2 - w.nx * WT);
    const py = Math.min(ay, w.y1, w.y2, w.y2 - w.ny * WT);
    const pw = Math.abs(d.x) > 0.5 ? L : WT;
    const ph = Math.abs(d.x) > 0.5 ? WT : L;
    ctx.fillRect(X(px), Y(py), pw * scale, ph * scale);
    // wall label
    ctx.fillStyle = light ? '#555' : THEME.dim;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mx = (w.x1 + w.x2) / 2 - w.nx * (WT + 62);
    const my = (w.y1 + w.y2) / 2 - w.ny * (WT + 62);
    ctx.save();
    ctx.translate(X(mx), Y(my));
    if (Math.abs(d.x) < 0.5) ctx.rotate(-Math.PI / 2);
    ctx.fillText(w.label, 0, 0);
    ctx.restore();
  }

  // --- countertops ---
  for (const c of opts.countertops) {
    ctx.fillStyle = light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(X(c.x), Y(c.y), c.w * scale, c.h * scale);
    ctx.strokeStyle = light ? '#777' : 'rgba(255,255,255,0.25)';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(X(c.x), Y(c.y), c.w * scale, c.h * scale);
    ctx.setLineDash([]);
  }

  // --- items ---
  const errorIds = new Set(opts.issues.filter((i) => i.severity === 'error').flatMap((i) => i.itemIds));
  const warnIds = new Set(opts.issues.filter((i) => i.severity === 'warning').flatMap((i) => i.itemIds));
  const order = (i: Item) => (i.kind === 'accessory' ? 0 : i.category === 'tall' ? 1 : i.category === 'base' ? 2 : i.kind === 'appliance' && i.elevation < 120 ? 3 : i.category === 'wall' ? 4 : 5);
  const items = [...project.items].filter((i) => i.visible !== false && (!opts.isolateIds || opts.isolateIds.includes(i.id)) && visibleInPlan(i, opts.planFilter)).sort((a, b) => order(a) - order(b));
  for (const it of items) {
    const f = footprint(it);
    const col = CATEGORY_COLORS[it.category] ?? '#999';
    const isWall = it.category === 'wall' || (it.kind === 'appliance' && it.elevation >= 120);
    const selected = opts.selectedIds.includes(it.id);
    const hovered = opts.hoverId === it.id;
    const poly = cornerPolygon(it);
    const path = () => {
      ctx.beginPath();
      if (poly) {
        poly.forEach(([px, py], i) => (i ? ctx.lineTo(X(px), Y(py)) : ctx.moveTo(X(px), Y(py))));
        ctx.closePath();
      } else ctx.rect(X(f.x), Y(f.y), f.w * scale, f.h * scale);
    };
    path();
    ctx.fillStyle = light ? hexAlpha(col, isWall ? 0.12 : 0.28) : hexAlpha(col, isWall ? 0.14 : 0.32);
    ctx.fill();
    ctx.lineWidth = selected ? 2 : hovered ? 1.5 : 1;
    ctx.strokeStyle = errorIds.has(it.id) ? THEME.error : warnIds.has(it.id) ? THEME.warning : selected ? THEME.selected : light ? '#333' : col;
    if (isWall) ctx.setLineDash([5, 3]);
    path();
    ctx.stroke();
    ctx.setLineDash([]);

    // front line & door swings
    if (it.kind === 'cabinet' && !poly) {
      const fd = frontDir(it.rotation);
      const ad = alongDir(it.rotation);
      // local origin (left-back corner as seen from front)
      const o = {
        x: it.rotation === 0 ? f.x : it.rotation === 90 ? f.x + f.w : it.rotation === 180 ? f.x + f.w : f.x,
        y: it.rotation === 0 ? f.y : it.rotation === 90 ? f.y : it.rotation === 180 ? f.y + f.h : f.y + f.h,
      };
      const P = (lx: number, lz: number) => [X(o.x + ad.x * lx + fd.x * lz), Y(o.y + ad.y * lx + fd.y * lz)] as const;
      ctx.strokeStyle = light ? '#333' : hexAlpha(col, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(...P(0, it.depth));
      ctx.lineTo(...P(it.width, it.depth));
      ctx.stroke();
      ctx.lineWidth = 1;
      const c = it.config;
      if (!c.openFront && c.doors > 0 && c.opening !== 'flip_up' && scale > 0.6) {
        const n = c.doors;
        const dw = it.width / n;
        for (let i = 0; i < n; i++) {
          const hingeLeft = n === 1 ? c.opening !== 'right' : i === 0;
          const hx = hingeLeft ? i * dw : (i + 1) * dw;
          const [hpx, hpy] = P(hx, it.depth);
          const [tipx, tipy] = P(hingeLeft ? hx + dw : hx - dw, it.depth);
          const [openx, openy] = P(hx, it.depth + dw);
          ctx.strokeStyle = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)';
          ctx.beginPath();
          ctx.moveTo(hpx, hpy);
          ctx.lineTo(openx, openy);
          ctx.stroke();
          const a0 = Math.atan2(tipy - hpy, tipx - hpx);
          const a1 = Math.atan2(openy - hpy, openx - hpx);
          ctx.beginPath();
          ctx.arc(hpx, hpy, dw * scale, Math.min(a0, a1), Math.max(a0, a1), Math.abs(a0 - a1) > Math.PI);
          ctx.stroke();
        }
      }
      if (c.drawers > 0 && scale > 0.6) {
        ctx.strokeStyle = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.moveTo(...P(it.width / 2, it.depth));
        ctx.lineTo(...P(it.width / 2, it.depth + 8));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(...P(it.width / 2 - 4, it.depth + 8));
        ctx.lineTo(...P(it.width / 2, it.depth + 12));
        ctx.lineTo(...P(it.width / 2 + 4, it.depth + 8));
        ctx.stroke();
      }
    }

    // appliance icons
    if (it.kind === 'appliance' && scale > 0.5) {
      const c = center(f);
      ctx.strokeStyle = light ? '#333' : '#ffcc80';
      ctx.lineWidth = 1.2;
      if (isCooktop(it)) {
        const n = it.config.burners ?? 4;
        const r = Math.min(f.w, f.h) * 0.16 * scale;
        const pos = n === 2 ? [[-0.25, 0], [0.25, 0]] : n === 5 ? [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25], [0, 0]] : [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]];
        for (const [px, py] of pos) {
          ctx.beginPath();
          ctx.arc(X(c.x + px * f.w), Y(c.y + py * f.h), r, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (isSink(it)) {
        const bowls = it.config.bowls ?? 1;
        for (let i = 0; i < bowls; i++) {
          const bw = (f.w / bowls) * 0.78;
          const bx = f.x + (f.w / bowls) * i + (f.w / bowls - bw) / 2;
          roundRect(ctx, X(bx), Y(f.y + f.h * 0.12), bw * scale, f.h * 0.76 * scale, 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(X(bx + bw / 2), Y(f.y + f.h / 2), 2.5 * scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (isFridge(it)) {
        ctx.beginPath();
        ctx.moveTo(X(f.x), Y(f.y));
        ctx.lineTo(X(f.x + f.w), Y(f.y + f.h));
        ctx.moveTo(X(f.x + f.w), Y(f.y));
        ctx.lineTo(X(f.x), Y(f.y + f.h));
        ctx.stroke();
      } else if (isHood(it)) {
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(X(f.x + 3), Y(f.y + 3), (f.w - 6) * scale, (f.h - 6) * scale);
        ctx.setLineDash([]);
      }
    }

    // label
    if (opts.showLabels && scale * Math.min(f.w, f.h) > 18) {
      const c = center(f);
      ctx.fillStyle = light ? THEME.textLight : THEME.text;
      ctx.font = `${Math.max(9, Math.min(12, scale * 6))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.translate(X(c.x), Y(c.y));
      if (f.h > f.w * 1.4) ctx.rotate(-Math.PI / 2);
      const maxW = Math.max(f.w, f.h) * scale - 6;
      let label = it.name;
      while (ctx.measureText(label).width > maxW && label.length > 3) label = label.slice(0, -2);
      ctx.fillText(label, 0, isWall ? -6 : -5);
      ctx.fillStyle = light ? '#555' : THEME.dim;
      ctx.font = `${Math.max(8, Math.min(11, scale * 5))}px Inter, system-ui, sans-serif`;
      ctx.fillText(`${r1(it.width)}×${r1(it.depth)}`, 0, 7);
      ctx.restore();
    }

    // lock badge + corner hinge marks
    if (it.locked) {
      ctx.fillStyle = light ? '#555' : '#ffd54f';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🔒', X(f.x + f.w) - 3, Y(f.y) + 12);
    }
    if (it.labelColor) {
      ctx.fillStyle = it.labelColor;
      ctx.beginPath();
      ctx.arc(X(f.x) + 5, Y(f.y) + 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (poly && scale > 0.5) {
      // corner opening direction arrows + center hinge mark for bi-fold
      const c = center(f);
      ctx.strokeStyle = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(X(c.x) - 8, Y(c.y));
      ctx.lineTo(X(c.x) + 8, Y(c.y));
      ctx.moveTo(X(c.x), Y(c.y) - 8);
      ctx.lineTo(X(c.x), Y(c.y) + 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = THEME.selected;
      ctx.beginPath();
      ctx.arc(X(c.x), Y(c.y), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light ? '#333' : '#fff';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('168°', X(c.x), Y(c.y) - 6);
    }
    // selection handles
    if (selected && !light) {
      ctx.fillStyle = THEME.selected;
      const hs = 7;
      const pts = [
        [f.x, f.y],
        [f.x + f.w / 2, f.y],
        [f.x + f.w, f.y],
        [f.x, f.y + f.h / 2],
        [f.x + f.w, f.y + f.h / 2],
        [f.x, f.y + f.h],
        [f.x + f.w / 2, f.y + f.h],
        [f.x + f.w, f.y + f.h],
      ];
      for (const [px, py] of pts) {
        ctx.fillRect(X(px) - hs / 2, Y(py) - hs / 2, hs, hs);
      }
    }
  }

  // --- work triangle ---
  if (opts.showTriangle) {
    const sink = project.items.find(isSink);
    const cook = project.items.find(isCooktop);
    const fridge = project.items.find(isFridge);
    const pts = [sink, cook, fridge].filter(Boolean).map((i) => center(footprint(i!)));
    if (pts.length >= 2) {
      ctx.strokeStyle = THEME.triangle;
      ctx.fillStyle = THEME.triangle;
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if (pts.length === 2 && i === 1) break;
        ctx.beginPath();
        ctx.moveTo(X(a.x), Y(a.y));
        ctx.lineTo(X(b.x), Y(b.y));
        ctx.stroke();
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${r1(Math.hypot(a.x - b.x, a.y - b.y))} cm`, X((a.x + b.x) / 2), Y((a.y + b.y) / 2) - 4);
      }
      ctx.setLineDash([]);
    }
  }

  // --- dimensions ---
  if (opts.showDims) {
    const dims = planDimensions(project);
    for (const d of dims) {
      drawDimLine(ctx, X(d.x1), Y(d.y1), X(d.x2), Y(d.y2), d.label, light ? THEME.dimLight : THEME.dim, light ? THEME.textLight : d.level ? THEME.text : THEME.dim, 1, !!d.itemId && opts.selectedIds.includes(d.itemId));
    }
  }

  // --- guides ---
  for (const g of opts.guides ?? []) {
    ctx.strokeStyle = THEME.guide;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    if (g.axis === 'x') {
      ctx.moveTo(X(g.value), 0);
      ctx.lineTo(X(g.value), H);
    } else {
      ctx.moveTo(0, Y(g.value));
      ctx.lineTo(W, Y(g.value));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- ghost ---
  if (opts.ghost) {
    const { f, valid, label } = opts.ghost;
    ctx.fillStyle = valid ? 'rgba(102,187,106,0.35)' : 'rgba(239,83,80,0.35)';
    ctx.strokeStyle = valid ? '#66bb6a' : '#ef5350';
    ctx.lineWidth = 1.5;
    ctx.fillRect(X(f.x), Y(f.y), f.w * scale, f.h * scale);
    ctx.strokeRect(X(f.x), Y(f.y), f.w * scale, f.h * scale);
    ctx.fillStyle = '#fff';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, X(f.x + f.w / 2), Y(f.y) - 6);
  }

  // --- measure ---
  if (opts.measure) {
    const m = opts.measure;
    ctx.strokeStyle = '#ffd54f';
    ctx.fillStyle = '#ffd54f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(m.x1), Y(m.y1));
    ctx.lineTo(X(m.x2), Y(m.y2));
    ctx.stroke();
    for (const [px, py] of [
      [m.x1, m.y1],
      [m.x2, m.y2],
    ]) {
      ctx.beginPath();
      ctx.arc(X(px), Y(py), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const d = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
    ctx.fillText(`${r1(d)} cm  (Δx ${r1(Math.abs(m.x2 - m.x1))}, Δy ${r1(Math.abs(m.y2 - m.y1))})`, X((m.x1 + m.x2) / 2), Y((m.y1 + m.y2) / 2) - 8);
  }

  // --- move gizmo (Move tool): axis arrows + live delta ---
  if (opts.moveGizmo && !light) {
    const gz = opts.moveGizmo;
    const cx = X(gz.x);
    const cy = Y(gz.y);
    const L = 34;
    const drawArrow = (x2: number, y2: number, color: string, dimmed: boolean, label: string, lx: number, ly: number) => {
      ctx.save();
      ctx.globalAlpha = dimmed ? 0.25 : 1;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const ang = Math.atan2(y2 - cy, x2 - cx);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 8 * Math.cos(ang - 0.4), y2 - 8 * Math.sin(ang - 0.4));
      ctx.lineTo(x2 - 8 * Math.cos(ang + 0.4), y2 - 8 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly);
      ctx.restore();
    };
    drawArrow(cx + L, cy, '#1B9D6B', gz.axis === 'y', 'X', cx + L + 10, cy);
    drawArrow(cx, cy + L, '#2979ff', gz.axis === 'x', 'Y', cx, cy + L + 11);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = THEME.selected;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (gz.dragging) {
      const ox = X(gz.x - gz.dx);
      const oy = Y(gz.y - gz.dy);
      ctx.strokeStyle = THEME.selected;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      const dist = Math.hypot(gz.dx, gz.dy);
      const txt = `Δx ${r1(gz.dx)}  Δy ${r1(gz.dy)}  (${r1(dist)} cm)${gz.axis ? `  [${gz.axis.toUpperCase()} locked]` : ''}`;
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(txt).width + 14;
      ctx.fillStyle = 'rgba(10,14,20,0.85)';
      ctx.strokeStyle = THEME.selected;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx + 12, cy - 30, tw, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, cx + 19, cy - 20);
    }
  }
}

// ------------------------------------------------------------------
// ELEVATION
// ------------------------------------------------------------------
export interface ElevationOpts {
  showDims: boolean;
  showLabels: boolean;
  selectedIds: string[];
  light?: boolean;
  countertops: Countertop[];
}

/** Position of an item along the viewer's left→right axis of the wall elevation */
export function elevationU(wall: Wall, it: Item): { u: number; w: number } {
  const f = footprint(it);
  const L = wallLength(wall);
  const t = offsetOnWall(wall, f);
  const w = wall.rotation % 180 === 0 ? f.w : f.h;
  const d = wallDir(wall);
  const a = alongDir(wall.rotation);
  const flipped = d.x * a.x + d.y * a.y < 0;
  return { u: flipped ? L - t - w : t, w };
}

export function elevationBounds(project: Project, wall: Wall): Footprint {
  const L = wallLength(wall);
  return { x: -20, y: -50, w: L + 70, h: project.room.ceilingHeight + 70 };
}

export function renderElevation(ctx: CanvasRenderingContext2D, W: number, H: number, project: Project, wall: Wall, view: View2D, opts: ElevationOpts) {
  const light = !!opts.light;
  const { scale, ox, oy } = view;
  const X = (u: number) => ox + u * scale;
  const Y = (z: number) => oy - z * scale;
  const L = wallLength(wall);
  const ceiling = project.room.ceilingHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = light ? THEME.bgLight : THEME.bg;
  ctx.fillRect(0, 0, W, H);
  // wall face
  ctx.fillStyle = light ? '#fafafa' : '#1b2533';
  ctx.fillRect(X(0), Y(ceiling), L * scale, ceiling * scale);
  // grid 10cm
  ctx.strokeStyle = light ? THEME.gridMinorLight : THEME.gridMinor;
  for (let u = 0; u <= L; u += 10) {
    ctx.beginPath();
    ctx.moveTo(X(u), Y(0));
    ctx.lineTo(X(u), Y(ceiling));
    ctx.stroke();
  }
  for (let z = 0; z <= ceiling; z += 10) {
    ctx.beginPath();
    ctx.moveTo(X(0), Y(z));
    ctx.lineTo(X(L), Y(z));
    ctx.stroke();
  }
  // floor & ceiling
  ctx.strokeStyle = light ? '#222' : '#cfd8dc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(-20), Y(0));
  ctx.lineTo(X(L + 20), Y(0));
  ctx.moveTo(X(-20), Y(ceiling));
  ctx.lineTo(X(L + 20), Y(ceiling));
  ctx.stroke();
  ctx.lineWidth = 1;

  const onWall = itemsOnWall(project.items, wall);
  const wallItems = project.items.filter((i) => {
    if (onWall.includes(i)) return true;
    // appliances & accessories near this wall
    const f = footprint(i);
    const t = offsetOnWall(wall, f);
    const dist = Math.abs((() => {
      const d = wallDir(wall);
      if (Math.abs(d.x) > 0.5) return wall.ny > 0 ? f.y - wall.y1 : wall.y1 - (f.y + f.h);
      return wall.nx > 0 ? f.x - wall.x1 : wall.x1 - (f.x + f.w);
    })());
    return dist < 70 && t > -1 && t < L;
  });
  const tints = project.materials.tints ?? { door: 0, carcass: 0, countertop: 0 };
  const doorHex = tintedHex(project.materials.doorColor, tints.door);
  const carcassHex = tintedHex(project.materials.carcassColor, tints.carcass);
  const ctHex = tintedHex(project.materials.countertopColor, tints.countertop);

  // backsplash & countertop
  const hasBase = wallItems.some((i) => i.category === 'base' && i.kind === 'cabinet');
  if (hasBase && project.type === 'kitchen') {
    const top = (project.settings.defaults?.baseHeight ?? 80) + project.materials.countertopThickness;
    if (project.materials.backsplash) {
      ctx.fillStyle = hexAlpha(ctHex, 0.35);
      ctx.fillRect(X(0), Y(top + project.materials.backsplashHeight), L * scale, project.materials.backsplashHeight * scale);
    }
    for (const c of opts.countertops) {
      if (c.rotation !== wall.rotation) continue;
      const span = wall.rotation % 180 === 0 ? { t: c.x - Math.min(wall.x1, wall.x2), w: c.w } : { t: c.y - Math.min(wall.y1, wall.y2), w: c.h };
      const d = wallDir(wall);
      const a = alongDir(wall.rotation);
      const flipped = d.x * a.x + d.y * a.y < 0;
      const u = flipped ? L - span.t - span.w : span.t;
      ctx.fillStyle = ctHex;
      ctx.fillRect(X(u), Y(c.elevation + c.thickness), span.w * scale, c.thickness * scale);
      ctx.strokeStyle = light ? '#222' : '#000';
      ctx.strokeRect(X(u), Y(c.elevation + c.thickness), span.w * scale, c.thickness * scale);
    }
  }

  const sorted = [...wallItems].sort((a, b) => (a.kind === 'accessory' ? -1 : 0) - (b.kind === 'accessory' ? -1 : 0));
  for (const it of sorted) {
    const { u, w } = elevationU(wall, it);
    const z0 = it.elevation;
    const selected = opts.selectedIds.includes(it.id);
    const itemDoor = it.config.materials.useDefault ? doorHex : tintedHex(it.config.materials.doorColor ?? project.materials.doorColor, tints.door);
    const itemCarcass = it.config.materials.useDefault ? carcassHex : tintedHex(it.config.materials.carcassColor ?? project.materials.carcassColor, tints.carcass);
    if (it.kind === 'cabinet') {
      // carcass
      ctx.fillStyle = itemCarcass;
      ctx.fillRect(X(u), Y(z0 + it.height), w * scale, it.height * scale);
      ctx.strokeStyle = light ? '#222' : '#0a0f14';
      ctx.strokeRect(X(u), Y(z0 + it.height), w * scale, it.height * scale);
      const parts = generateParts(it, project.materials);
      const isCorner = it.subtype.includes('corner');
      for (const p of parts) {
        if (!p.isFront) continue;
        if (isCorner && p.sideFace) continue;
        if (p.box.sx <= 0 || p.box.sy <= 0) continue;
        // local x → u: when wall view is flipped vs item along dir, fronts mirror
        const a = alongDir(it.rotation);
        const wa = alongDir(wall.rotation);
        const same = a.x * wa.x + a.y * wa.y > 0;
        const lx = same ? p.box.x : it.width - p.box.x - p.box.sx;
        const px = X(u + lx);
        const py = Y(z0 + p.box.y + p.box.sy);
        const pw = p.box.sx * scale;
        const ph = p.box.sy * scale;
        ctx.fillStyle = p.glass ? hexAlpha('#9fd3ff', 0.45) : itemDoor;
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = light ? '#333' : 'rgba(0,0,0,0.6)';
        ctx.strokeRect(px, py, pw, ph);
        if (it.config.doorStyle === 'shaker' && pw > 20 && ph > 20) {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.strokeRect(px + 6 * scale, py + 6 * scale, pw - 12 * scale, ph - 12 * scale);
        }
        // hinge-side door swing indicator (dashed triangle)
        if (p.role === 'door' && pw > 12) {
          ctx.strokeStyle = light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.22)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          const hingeLeft = (p.hingeSide === 'left') === same;
          if (p.hingeSide === 'top') {
            ctx.moveTo(px, py);
            ctx.lineTo(px + pw / 2, py + ph);
            ctx.lineTo(px + pw, py);
          } else if (hingeLeft) {
            ctx.moveTo(px, py);
            ctx.lineTo(px + pw, py + ph / 2);
            ctx.lineTo(px, py + ph);
          } else {
            ctx.moveTo(px + pw, py);
            ctx.lineTo(px, py + ph / 2);
            ctx.lineTo(px + pw, py + ph);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // handle
        const ht = project.materials.handleType;
        if (ht !== 'none' && ht !== 'profile') {
          ctx.fillStyle = contrastHandleHex(project.materials.handleFinish, itemDoor);
          const hl = Math.min(16, p.box.sx * 0.5) * scale;
          if (p.role === 'drawer' || p.hingeSide === 'top') ctx.fillRect(px + pw / 2 - hl / 2, py + ph * (p.hingeSide === 'top' ? 0.85 : 0.5) - 1.5, hl, 3);
          else {
            const hingeLeft = (p.hingeSide === 'left') === same;
            const hx = hingeLeft ? px + pw - 4 * scale : px + 4 * scale - 2;
            const vertical = it.category !== 'wall';
            if (vertical) ctx.fillRect(hx, py + ph * 0.1, 2, hl);
            else ctx.fillRect(hx, py + ph - 4 * scale - hl, 2, hl);
          }
        }
      }
      // Built-in appliances use the same fixed dimensions as their 3D models.
      if ((it.subtype.startsWith('tall_fridge') || it.subtype === 'tall_dispenser') && it.rotation === wall.rotation) {
        const { device, bottom } = housingLayout(it, project.materials.board);
        const px = X(u + (w - device.width) / 2);
        const py = Y(z0 + bottom + device.height);
        const pw = device.width * scale;
        const ph = device.height * scale;
        ctx.fillStyle = '#c8cdd1';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#545d65';
        ctx.strokeRect(px, py, pw, ph);
        if (it.subtype === 'tall_dispenser') {
          ctx.fillStyle = '#202a31';
          ctx.fillRect(px + pw * 0.1, py + ph * 0.18, pw * 0.8, ph * 0.32);
          ctx.fillRect(px + pw * 0.07, py + ph * 0.57, pw * 0.86, ph * 0.4);
          ctx.fillStyle = '#d54b4b';
          ctx.fillRect(px + pw * 0.27, py + ph * 0.22, 3, 3);
          ctx.fillStyle = '#459ec1';
          ctx.fillRect(px + pw * 0.64, py + ph * 0.22, 3, 3);
        } else {
          ctx.beginPath();
          if (it.config.fridgeType === 'side_by_side') { ctx.moveTo(px + pw / 2, py); ctx.lineTo(px + pw / 2, py + ph); }
          else { ctx.moveTo(px, py + ph * 0.35); ctx.lineTo(px + pw, py + ph * 0.35); }
          ctx.stroke();
        }
      }
      if (it.subtype === 'tall_electro') {
        const el = electronicsLayout(it);
        const ovenW = Math.min(60, w - 5);
        const ovenX = X(u + (w - ovenW) / 2);
        const ovenY = Y(z0 + el.ovenTop);
        ctx.fillStyle = '#242c32';
        ctx.fillRect(ovenX, ovenY, ovenW * scale, el.ovenH * scale);
        ctx.fillStyle = '#101820';
        ctx.fillRect(ovenX + 3 * scale, ovenY + 5 * scale, Math.max(0, ovenW - 6) * scale, Math.max(0, el.ovenH - 11) * scale);
        ctx.strokeStyle = '#9aa4ad';
        ctx.strokeRect(ovenX, ovenY, ovenW * scale, el.ovenH * scale);
        const potW = Math.min(w - 6, el.magiccom.width);
        const potX = X(u + (w - potW) / 2);
        const potY = Y(z0 + el.shelfY + el.magiccom.height);
        ctx.fillStyle = '#d7dcde';
        ctx.fillRect(potX, potY, potW * scale, el.magiccom.height * scale);
        ctx.fillStyle = '#273238';
        ctx.fillRect(potX, potY, potW * scale, Math.max(1, scale * 2));
        ctx.strokeStyle = '#71808a';
        ctx.beginPath();
        ctx.moveTo(X(u + 2), Y(z0 + el.shelfY));
        ctx.lineTo(X(u + w - 2), Y(z0 + el.shelfY));
        ctx.stroke();
      }
      // open shelves: draw shelf lines
      if (it.config.openFront || it.subtype === 'tall_fridge') {
        ctx.strokeStyle = light ? '#444' : 'rgba(255,255,255,0.4)';
        for (const p of parts) if (p.role === 'shelf') ctx.strokeRect(X(u + p.box.x), Y(z0 + p.box.y + p.box.sy), p.box.sx * scale, p.box.sy * scale);
      }
      // toe kick
      if (it.config.hasToeKick && it.category !== 'wall') {
        ctx.fillStyle = light ? '#555' : '#0d1218';
        ctx.fillRect(X(u), Y(10), w * scale, 10 * scale);
      }
    } else if (it.kind === 'appliance') {
      const h = isSink(it) ? 2 : it.height;
      ctx.fillStyle = isHood(it) ? '#b9bcc0' : isFridge(it) ? '#cfd3d6' : '#9aa0a6';
      ctx.strokeStyle = light ? '#222' : '#000';
      if (isHood(it) && it.config.hoodType === 'pyramid') {
        ctx.beginPath();
        ctx.moveTo(X(u), Y(z0));
        ctx.lineTo(X(u + w), Y(z0));
        ctx.lineTo(X(u + w * 0.68), Y(z0 + it.height * 0.4));
        ctx.lineTo(X(u + w * 0.68), Y(Math.min(ceiling, z0 + it.height + 40)));
        ctx.lineTo(X(u + w * 0.32), Y(Math.min(ceiling, z0 + it.height + 40)));
        ctx.lineTo(X(u + w * 0.32), Y(z0 + it.height * 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(X(u), Y(z0 + h), w * scale, h * scale);
        ctx.strokeRect(X(u), Y(z0 + h), w * scale, h * scale);
      }
      if (isCooktop(it)) {
        ctx.fillStyle = '#333';
        ctx.fillRect(X(u), Y(z0 + 3), w * scale, 3 * scale);
      }
    } else if (it.kind === 'accessory') {
      ctx.fillStyle = it.subtype === 'acc_tv' ? '#111' : hexAlpha(itemDoor, 0.8);
      ctx.fillRect(X(u), Y(z0 + it.height), w * scale, it.height * scale);
      ctx.strokeStyle = light ? '#222' : '#000';
      ctx.strokeRect(X(u), Y(z0 + it.height), w * scale, it.height * scale);
    }
    if (selected) {
      ctx.strokeStyle = THEME.selected;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(X(u) - 1, Y(z0 + it.height) - 1, w * scale + 2, it.height * scale + 2);
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }
    if (opts.showLabels && w * scale > 24 && it.kind === 'cabinet') {
      ctx.fillStyle = light ? '#222' : 'rgba(255,255,255,0.75)';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${r1(w)}`, X(u + w / 2), Y(z0 + it.height) + 10);
    }
  }

  // --- dimensions ---
  if (opts.showDims) {
    const dimColor = light ? THEME.dimLight : THEME.dim;
    const txt = light ? THEME.textLight : THEME.text;
    const rows: Array<(i: Item) => boolean> = [(i) => i.category !== 'wall' && (i.kind === 'cabinet' || isFridge(i)), (i) => i.category === 'wall'];
    rows.forEach((pred, idx) => {
      const list = wallItems.filter(pred).map((i) => ({ it: i, ...elevationU(wall, i) })).sort((a, b) => a.u - b.u);
      let cursor = 0;
      const y = -14 - idx * 16;
      for (const { it, u, w } of list) {
        if (u - cursor > 0.5) drawDimLine(ctx, X(cursor), Y(y), X(u), Y(y), r1(u - cursor).toString(), dimColor, txt);
        drawDimLine(ctx, X(u), Y(y), X(u + w), Y(y), r1(w).toString(), dimColor, txt, 1, opts.selectedIds.includes(it.id));
        cursor = Math.max(cursor, u + w);
      }
    });
    drawDimLine(ctx, X(0), Y(-46), X(L), Y(-46), `${r1(L)}`, dimColor, txt);
    const { vertical } = elevationDimensions(project, wall);
    for (const d of vertical as DimLine[]) drawDimLine(ctx, X(d.x1), Y(d.y1), X(d.x2), Y(d.y2), d.label, dimColor, txt);
    // height references
    ctx.fillStyle = dimColor;
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    const refs: [number, string][] = [
      [0, 'FFL ±0'],
      [ceiling, `Ceiling +${ceiling}`],
    ];
    if (hasBase && project.type === 'kitchen') {
      const worktopHeight = (project.settings.defaults?.baseHeight ?? 80) + project.materials.countertopThickness;
      refs.push([worktopHeight, `Worktop +${worktopHeight}`]);
      const wc = wallItems.find((i) => i.category === 'wall');
      if (wc) refs.push([wc.elevation, `Wall cab. +${r1(wc.elevation)}`]);
    }
    for (const [z, label] of refs) {
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = dimColor;
      ctx.beginPath();
      ctx.moveTo(X(-20), Y(z));
      ctx.lineTo(X(L + 10), Y(z));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(label, X(-20), Y(z) - 3);
    }
  }
  // title
  ctx.fillStyle = light ? '#222' : THEME.text;
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ELEVATION — ${wall.label}`, 12, 20);
}
