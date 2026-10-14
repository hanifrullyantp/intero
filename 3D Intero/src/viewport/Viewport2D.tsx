import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../core/store';
import { renderPlan, fitView, visibleInPlan, type View2D } from './renderer2d';
import { computeCountertops } from '../engine/countertop';
import { footprint, pointInRect, r1, nearestWall, distanceToWall, overlapArea, rectsOverlap, verticalOverlap, center, deepClone } from '../utils/geometry';
import { snapRect } from '../engine/snapEngine';
import { createItem, getEntry, uid } from '../config/library';
import { loadCustom } from '../core/customLibrary';
import { getDrag, setDrag } from '../core/dragState';
import type { Footprint, Item, Rotation } from '../models/types';
import { isSink, isCooktop } from '../engine/constraints';
import { defaultsForNewItem } from '../engine/projectDimensions';
type DragMode = null | { kind: 'pan'; sx: number; sy: number; ox: number; oy: number } | { kind: 'move'; start: { x: number; y: number }; origin: Record<string, { x: number; y: number }>; moved: boolean; axis: 'x' | 'y' | null; dup: boolean } | { kind: 'resize'; handle: number; item: Item; start: { x: number; y: number } } | { kind: 'measure' };

const HANDLE_PX = 7;

export default function Viewport2D({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View2D>({ scale: 2, ox: 80, oy: 80 });
  const dragRef = useRef<DragMode>(null);
  const spaceRef = useRef(false);
  const gizmoLive = useRef<{ dx: number; dy: number; axis: 'x' | 'y' | null; dragging: boolean }>({ dx: 0, dy: 0, axis: null, dragging: false });
  const [guides, setGuides] = useState<{ axis: 'x' | 'y'; value: number }[]>([]);
  const [ghost, setGhost] = useState<{ f: Footprint; valid: boolean; label: string } | null>(null);
  const [measure, setMeasure] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [, force] = useState(0);

  const project = useStore((s) => s.project);
  const ui = useStore((s) => s.ui);
  const selectedIds = useStore((s) => s.selectedIds);
  const hoverId = useStore((s) => s.hoverId);
  const issues = useStore((s) => s.issues);
  const { select, setHover, updateItems, commit, addItem, setUI, toast, updateItem } = useStore.getState();

  const countertops = useMemo(() => computeCountertops(project), [project]);

  const toWorld = useCallback((cx: number, cy: number) => {
    const v = viewRef.current;
    return { x: (cx - v.ox) / v.scale, y: (cy - v.oy) / v.scale };
  }, []);

  const fit = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    viewRef.current = fitView({ x: -75, y: -75, w: project.room.width + 150, h: project.room.depth + 150 }, w, h, 20);
    force((n) => n + 1);
  }, [project.room.width, project.room.depth]);

  // fit on mount / fit requests / room change
  useEffect(() => {
    fit();
  }, [fit, ui.fitRequest]);

  // render loop
  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== w * dpr || c.height !== h * dpr) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderPlan(ctx, w, h, project, viewRef.current, {
      showGrid: ui.showGrid,
      showDims: ui.showDims,
      showTriangle: ui.showTriangle,
      showLabels: ui.showLabels,
      selectedIds,
      hoverId,
      issues: ui.showIssues ? issues : [],
      guides,
      ghost,
      measure,
      countertops,
      gridSize: project.settings.gridSize,
      isolateIds: ui.isolateIds,
      planFilter: ui.planFilter,
      moveGizmo: (() => {
        if (ui.tool !== 'move' && ui.tool !== 'select') return null;
        if (selectedIds.length !== 1) return null;
        const it = project.items.find((i) => i.id === selectedIds[0]);
        if (!it || it.locked || it.visible === false) return null;
        const c = center(footprint(it));
        const live = gizmoLive.current;
        const d = dragRef.current;
        return { x: c.x, y: c.y, dx: live.dx, dy: live.dy, axis: d?.kind === 'move' ? (d.axis ?? live.axis) : null, dragging: live.dragging && d?.kind === 'move' };
      })(),
    });
  }, [project, ui, selectedIds, hoverId, issues, guides, ghost, measure, countertops]);

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) spaceRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ---- hit testing ----
  const hitTest = (wx: number, wy: number): Item[] => {
    // priority: worktop appliances > base/tall cabinets > hoods > wall cabinets > accessories
    const order = (i: Item) => (i.kind === 'appliance' && i.elevation < 120 ? 6 : i.category === 'base' || i.category === 'tall' ? 5 : i.kind === 'appliance' ? 4 : i.category === 'wall' ? 3 : 1);
    const pf = useStore.getState().ui.planFilter;
    return [...project.items].filter((i) => i.visible !== false && (!useStore.getState().ui.isolateIds || useStore.getState().ui.isolateIds!.includes(i.id)) && visibleInPlan(i, pf) && pointInRect(wx, wy, footprint(i))).sort((a, b) => order(b) - order(a));
  };

  const handleAt = (cx: number, cy: number): { item: Item; handle: number } | null => {
    if (selectedIds.length !== 1) return null;
    const item = project.items.find((i) => i.id === selectedIds[0]);
    if (!item || item.locked) return null;
    const f = footprint(item);
    const v = viewRef.current;
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
    for (let i = 0; i < pts.length; i++) {
      const sx = v.ox + pts[i][0] * v.scale;
      const sy = v.oy + pts[i][1] * v.scale;
      if (Math.abs(sx - cx) <= HANDLE_PX && Math.abs(sy - cy) <= HANDLE_PX) return { item, handle: i };
    }
    return null;
  };

  const local = (e: React.MouseEvent | React.DragEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { cx: e.clientX - r.left, cy: e.clientY - r.top };
  };

  // ---- mouse ----
  const onMouseDown = (e: React.MouseEvent) => {
    const { cx, cy } = local(e);
    const w = toWorld(cx, cy);
    setUI({ contextMenu: null });
    if (ui.accessMode === 'view') {
      if (e.button === 1 || ui.tool === 'pan') {
        dragRef.current = { kind: 'pan', sx: cx, sy: cy, ox: viewRef.current.ox, oy: viewRef.current.oy };
        e.preventDefault();
      } else if (ui.tool === 'zoom') zoomAt(cx, cy, e.altKey ? 1 / 1.5 : 1.5);
      return;
    }
    if (e.button === 1 || spaceRef.current || ui.tool === 'pan') {
      dragRef.current = { kind: 'pan', sx: cx, sy: cy, ox: viewRef.current.ox, oy: viewRef.current.oy };
      e.preventDefault();
      return;
    }
    if (e.button === 2) return;
    if (ui.tool === 'zoom') {
      zoomAt(cx, cy, e.altKey ? 1 / 1.5 : 1.5);
      return;
    }
    if (ui.tool === 'measure') {
      if (!measure || (measure && measure.x2 !== measure.x1)) setMeasure({ x1: r1(w.x), y1: r1(w.y), x2: r1(w.x), y2: r1(w.y) });
      else setMeasure({ ...measure, x2: r1(w.x), y2: r1(w.y) });
      dragRef.current = { kind: 'measure' };
      return;
    }
    const h = handleAt(cx, cy);
    if (h) {
      commit();
      dragRef.current = { kind: 'resize', handle: h.handle, item: h.item, start: w };
      return;
    }
    const hits = hitTest(w.x, w.y);
    if (!hits.length) {
      if (!e.shiftKey) select([]);
      return;
    }
    // paint tool: apply project door colour
    if (ui.tool === 'paint') {
      const { updateItemConfig } = useStore.getState();
      updateItemConfig(hits[0].id, { materials: { ...hits[0].config.materials, useDefault: false, doorColor: project.materials.doorColor } });
      return;
    }
    if (ui.tool === 'eyedropper') {
      const c = hits[0].config.materials.useDefault ? project.materials.doorColor : hits[0].config.materials.doorColor ?? project.materials.doorColor;
      useStore.getState().setMaterials({ doorColor: c });
      useStore.getState().toast({ severity: 'info', message: `Sampled ${hits[0].name} colour`, ttl: 1500 });
      setUI({ tool: 'select' });
      return;
    }
    // cycle through overlapping hits
    let target = hits[0];
    const selIdx = hits.findIndex((i) => selectedIds.includes(i.id));
    if (selIdx >= 0 && !e.shiftKey && hits.length > 1 && e.detail === 1) target = hits[selIdx];
    if (e.altKey && hits.length > 1) target = hits[(selIdx + 1) % hits.length];
    if (target.locked) { toast({ severity: 'warning', message: 'Item is locked (unlock in Layers)', ttl: 1500 }); return; }
    let ids = selectedIds;
    if (e.shiftKey && ui.tool !== 'move') {
      ids = selectedIds.includes(target.id) ? selectedIds.filter((i) => i !== target.id) : [...selectedIds, target.id];
      select(ids);
    } else if (!selectedIds.includes(target.id)) {
      ids = [target.id];
      select(ids);
    }
    // gizmo axis hit (Move tool, single selection): grab X/Y arrow to lock axis
    let axis: 'x' | 'y' | null = null;
    if ((ui.tool === 'move' || ui.tool === 'select') && ids.length === 1) {
      const it0 = project.items.find((i) => i.id === ids[0]);
      if (it0) {
        const c0 = center(footprint(it0));
        const v = viewRef.current;
        const sx = v.ox + c0.x * v.scale;
        const sy = v.oy + c0.y * v.scale;
        if (Math.abs(cy - sy) < 10 && cx > sx && cx < sx + 52) axis = 'x';
        else if (Math.abs(cx - sx) < 10 && cy > sy && cy < sy + 52) axis = 'y';
      }
    }
    const origin: Record<string, { x: number; y: number }> = {};
    for (const id of ids) {
      const it = project.items.find((i) => i.id === id);
      if (it && !it.locked) origin[id] = { x: it.x, y: it.y };
    }
    dragRef.current = { kind: 'move', start: w, origin, moved: false, axis, dup: e.ctrlKey || e.metaKey };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const { cx, cy } = local(e);
    const w = toWorld(cx, cy);
    setCursor({ x: r1(w.x), y: r1(w.y) });
    const d = dragRef.current;
    if (!d) {
      const hits = hitTest(w.x, w.y);
      setHover(hits[0]?.id ?? null);
      const h = handleAt(cx, cy);
      canvasRef.current!.style.cursor = h ? ([0, 7].includes(h.handle) ? 'nwse-resize' : [2, 5].includes(h.handle) ? 'nesw-resize' : [1, 6].includes(h.handle) ? 'ns-resize' : 'ew-resize') : ui.tool === 'zoom' ? 'zoom-in' : ui.tool === 'pan' ? 'grab' : ui.tool === 'move' ? (hits.length ? 'move' : 'default') : hits.length ? 'move' : ui.tool === 'measure' ? 'crosshair' : ui.tool === 'paint' || ui.tool === 'eyedropper' ? 'copy' : 'default';
      return;
    }
    if (d.kind === 'pan') {
      viewRef.current = { ...viewRef.current, ox: d.ox + (cx - d.sx), oy: d.oy + (cy - d.sy) };
      force((n) => n + 1);
      return;
    }
    if (d.kind === 'measure') {
      if (measure) setMeasure({ ...measure, x2: r1(w.x), y2: r1(w.y) });
      return;
    }
    if (d.kind === 'move') {
      let dx = w.x - d.start.x;
      let dy = w.y - d.start.y;
      // axis lock: gizmo grab or Shift (dominant axis)
      const axis: 'x' | 'y' | null = d.axis ?? (e.shiftKey ? (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y') : null);
      if (axis === 'x') dy = 0;
      if (axis === 'y') dx = 0;
      if (!d.moved && Math.hypot(dx, dy) * viewRef.current.scale < 3) return;
      if (!d.moved) {
        // Ctrl+drag: duplicate first, then move the clones
        if (d.dup) {
          const clones = Object.keys(d.origin).map((id) => {
            const src = project.items.find((i) => i.id === id)!;
            const c = deepClone(src);
            c.id = uid();
            return c;
          });
          const st = useStore.getState();
          st.commit();
          st.setItems([...project.items, ...clones], false);
          st.select(clones.map((c) => c.id));
          const no: Record<string, { x: number; y: number }> = {};
          for (const c of clones) no[c.id] = { x: c.x, y: c.y };
          d.origin = no;
          d.moved = true;
        } else {
          commit();
          d.moved = true;
        }
      }
      const ids = Object.keys(d.origin);
      const patches: { id: string; patch: Partial<Item> }[] = [];
      let g: typeof guides = [];
      const primary = project.items.find((i) => i.id === ids[0]);
      let snapDx = dx;
      let snapDy = dy;
      if (primary) {
        const f = footprint(primary);
        const moving = { x: d.origin[primary.id].x + dx, y: d.origin[primary.id].y + dy, w: f.w, h: f.h };
        const others = project.items.filter((i) => !ids.includes(i.id));
        const res = snapRect(moving, primary.id, others, project.room, { grid: ui.snap, gridSize: project.settings.gridSize, objects: ui.snapObjects && ui.snap, threshold: 8 / viewRef.current.scale }, primary);
        snapDx = axis === 'y' ? 0 : res.x - d.origin[primary.id].x;
        snapDy = axis === 'x' ? 0 : res.y - d.origin[primary.id].y;
        g = res.guides;
      }
      for (const id of ids) patches.push({ id, patch: { x: r1(d.origin[id].x + snapDx), y: r1(d.origin[id].y + snapDy) } });
      updateItems(patches, false);
      setGuides(g);
      gizmoLive.current = { dx: r1(snapDx), dy: r1(snapDy), axis, dragging: true };
      force((n) => n + 1);
      return;
    }
    if (d.kind === 'resize') {
      const it = d.item;
      const f = footprint(it);
      const grid = ui.snap ? project.settings.gridSize : 0.1;
      const sx = Math.round(w.x / grid) * grid;
      const sy = Math.round(w.y / grid) * grid;
      let { x, y, w: fw, h: fh } = f;
      const hnd = d.handle;
      const left = [0, 3, 5].includes(hnd);
      const right = [2, 4, 7].includes(hnd);
      const top = [0, 1, 2].includes(hnd);
      const bottom = [5, 6, 7].includes(hnd);
      if (left) {
        const nx = Math.min(sx, f.x + f.w - 10);
        fw = f.x + f.w - nx;
        x = nx;
      }
      if (right) fw = Math.max(10, sx - f.x);
      if (top) {
        const ny = Math.min(sy, f.y + f.h - 10);
        fh = f.y + f.h - ny;
        y = ny;
      }
      if (bottom) fh = Math.max(10, sy - f.y);
      const flip = it.rotation % 180 !== 0;
      const patch: Partial<Item> = { x: r1(x), y: r1(y), width: r1(flip ? fh : fw), depth: r1(flip ? fw : fh) };
      updateItem(it.id, patch, false);
      return;
    }
  };

  const onMouseUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    gizmoLive.current = { dx: 0, dy: 0, axis: null, dragging: false };
    setGuides([]);
    if (d?.kind === 'move' && d.moved) {
      // after moving a base cabinet, carry appliances that were sitting on it is skipped; re-validate happens automatically
    }
  };

  const zoomAt = (cx: number, cy: number, factor: number) => {
    const v = viewRef.current;
    const ns = Math.min(40, Math.max(0.15, v.scale * factor));
    const wx = (cx - v.ox) / v.scale;
    const wy = (cy - v.oy) / v.scale;
    viewRef.current = { scale: ns, ox: cx - wx * ns, oy: cy - wy * ns };
    force((n) => n + 1);
  };
  const onWheel = (e: React.WheelEvent) => {
    const { cx, cy } = local(e);
    zoomAt(cx, cy, Math.exp(-e.deltaY * 0.0015));
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const { cx, cy } = local(e);
    const w = toWorld(cx, cy);
    const hits = hitTest(w.x, w.y);
    if (hits.length) {
      select([hits[0].id]);
      setUI({ modal: hits[0].subtype.startsWith('app_hood') ? 'hood' : 'editor', rightOpen: true });
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const { cx, cy } = local(e);
    const w = toWorld(cx, cy);
    const hits = hitTest(w.x, w.y);
    if (hits.length && !selectedIds.includes(hits[0].id)) select([hits[0].id]);
    setUI({ contextMenu: { x: e.clientX, y: e.clientY, itemId: hits[0]?.id ?? null } });
  };

  // ---- drag & drop from library ----
  const computeDrop = (entryId: string, wx: number, wy: number) => {
    // custom components from Component Builder
    if (entryId.startsWith('custom:')) {
      const comp = loadCustom().find((c) => c.id === entryId.slice(7));
      if (comp) {
        const custom = createItem('acc_open_shelving');
        custom.subtype = entryId;
        custom.name = comp.name;
        custom.width = comp.width;
        custom.height = comp.height;
        custom.depth = comp.depth;
        custom.elevation = 0;
        const wall = nearestWall(project.room.walls, { x: wx - comp.width / 2, y: wy - comp.depth / 2, w: comp.width, h: comp.depth });
        if (wall) { custom.rotation = wall.rotation; custom.wallId = wall.id; }
        const f0 = footprint(custom);
        const res = snapRect({ x: wx - f0.w / 2, y: wy - f0.h / 2, w: f0.w, h: f0.h }, custom.id, project.items, project.room, { grid: ui.snap, gridSize: project.settings.gridSize, objects: ui.snapObjects, threshold: 6 / viewRef.current.scale });
        custom.x = res.x;
        custom.y = res.y;
        return { item: custom, valid: true, label: `${comp.name} ${comp.width}×${comp.depth}` };
      }
    }
    const entry = getEntry(entryId);
    const item = defaultsForNewItem(createItem(entryId), project);
    // orient to nearest wall
    const probe: Footprint = { x: wx - entry.width / 2, y: wy - entry.depth / 2, w: entry.width, h: entry.depth };
    const wall = nearestWall(project.room.walls, probe);
    let rotation: Rotation = 0;
    if (wall) rotation = wall.rotation;
    item.rotation = rotation;
    const f0 = footprint(item);
    let x = wx - f0.w / 2;
    let y = wy - f0.h / 2;
    if (wall) {
      const dWall = distanceToWall(wall, { x, y, w: f0.w, h: f0.h });
      if (Math.abs(dWall) < 45 && item.kind !== 'appliance') {
        // flush against the wall
        if (wall.rotation === 0) y = wall.y1;
        else if (wall.rotation === 180) y = wall.y1 - f0.h;
        else if (wall.rotation === 270) x = wall.x1;
        else x = wall.x1 - f0.w;
      }
      item.wallId = wall.id;
    }
    // appliance snapping onto base cabinets
    if (item.kind === 'appliance' && (isSink(item) || isCooktop(item))) {
      const host = project.items.find((i) => i.kind === 'cabinet' && i.category === 'base' && pointInRect(wx, wy, footprint(i)));
      if (host) {
        item.rotation = host.rotation;
        const hf = footprint(host);
        const f1 = footprint(item);
        x = hf.x + (hf.w - f1.w) / 2;
        y = hf.y + (hf.h - f1.h) / 2;
        item.elevation = host.elevation + host.height + (isCooktop(item) ? project.materials.countertopThickness : 0);
      }
    }
    // wall cabinets align over base cabinets
    if (item.category === 'wall') {
      const host = project.items.find((i) => i.kind === 'cabinet' && i.category === 'base' && pointInRect(wx, wy, footprint(i)));
      if (host) {
        item.rotation = host.rotation;
        item.width = host.width;
        const hf = footprint(host);
        const f1 = footprint(item);
        x = host.rotation % 180 === 0 ? hf.x : host.rotation === 270 ? hf.x : hf.x + hf.w - f1.w;
        y = host.rotation % 180 === 0 ? (host.rotation === 0 ? hf.y : hf.y + hf.h - f1.h) : hf.y;
      }
    }
    const f = footprint(item);
    const res = snapRect({ x, y, w: f.w, h: f.h }, item.id, project.items, project.room, { grid: ui.snap, gridSize: project.settings.gridSize, objects: ui.snapObjects, threshold: 6 / viewRef.current.scale });
    item.x = res.x;
    item.y = res.y;
    const ff = footprint(item);
    const collides = project.items.some((o) => o.kind !== 'accessory' && item.kind !== 'accessory' && rectsOverlap(ff, footprint(o), 0.5) && verticalOverlap(item, o) && overlapArea(ff, footprint(o)) > 4 && !(item.kind === 'appliance' && o.category === 'base' && item.elevation >= o.height - 1));
    return { item, valid: !collides, label: `${entry.name} ${item.width}×${item.depth}` };
  };

  const onDragOver = (e: React.DragEvent) => {
    const entryId = getDrag();
    if (!entryId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const { cx, cy } = local(e);
    const w = toWorld(cx, cy);
    const { item, valid, label } = computeDrop(entryId, w.x, w.y);
    setGhost({ f: footprint(item), valid, label });
  };
  const onDragLeave = () => setGhost(null);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const entryId = getDrag() || e.dataTransfer.getData('text/plain');
    setGhost(null);
    setDrag(null);
    if (!entryId) return;
    const { cx, cy } = local(e);
    const w = toWorld(cx, cy);
    const { item, valid } = computeDrop(entryId, w.x, w.y);
    addItem(item);
    if (!valid) toast({ severity: 'warning', message: `${item.name} placed with a collision — adjust its position` });
    else toast({ severity: 'success', message: `${item.name} added`, ttl: 1500 });
  };

  return (
    <div ref={wrapRef} className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: 'var(--bg-canvas)' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block select-none touch-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          onMouseUp();
          setHover(null);
          setCursor(null);
        }}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
      {/* overlay controls */}
      <div className="absolute top-2 left-2 flex gap-1 items-center">
        {/* separate upper/lower cabinets so they never overlap while editing */}
        <div className="flex rounded border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {([['all', 'Semua'], ['base', 'Bawah'], ['wall', 'Atas']] as const).map(([k, l]) => (
            <button key={k} className={`px-2 py-1 text-[10px] ${ui.planFilter === k ? '' : ''}`}
              style={ui.planFilter === k ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--bg-panel)', color: 'var(--text-secondary)' }}
              title={k === 'all' ? 'Tampilkan semua' : k === 'base' ? 'Hanya kabinet bawah' : 'Hanya kabinet atas'}
              onClick={() => setUI({ planFilter: k })}>{l}</button>
          ))}
        </div>
        {ui.tool === 'measure' && <span className="badge bg-amber-500/20 text-amber-300 border-amber-500/40">Measure: click two points · Esc to exit</span>}
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] font-mono flex gap-3 px-2 py-1 rounded" style={{ color: 'var(--text-secondary)', background: 'color-mix(in srgb, var(--bg-panel) 75%, transparent)' }}>
        <span>{cursor ? `X ${cursor.x} · Y ${cursor.y} cm` : 'move cursor'}</span>
        <span>zoom {(viewRef.current.scale * 100).toFixed(0)}%</span>
        <span>{ui.snap ? `snap ${project.settings.gridSize} cm` : 'snap off'}</span>
        {ui.tool === 'move' && <span>drag to move · Shift axis · Ctrl dup</span>}
      </div>
      <div className="absolute bottom-2 right-2 flex gap-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        {[
          ['base', '#4fc3f7', 'Base'],
          ['wall', '#ba68c8', 'Wall'],
          ['tall', '#4db6ac', 'Tall'],
          ['appliance', '#ffa726', 'Appliance'],
        ].map(([k, c, l]) => (
          <span key={k} className="flex items-center gap-1">
            <i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
