import { useEffect, useRef, useState } from 'react';
import { Copy, Settings2, Trash2 } from 'lucide-react';
import { sceneSource } from '../../projectdoc/session';
import { SceneController } from '../../three/SceneController';
import { useStore } from '../../store';
import type { V3 } from '../../types';
import { toast } from '../ui';
import { computeDimLines } from '../../dimensions/compute';
import { buildFrame } from '../../production/frame';
import { buildFrameGroup } from '../../production/frame3d';

export const sceneRef: { current: SceneController | null } = { current: null };

/** Bus ringan untuk nilai live (koordinat mouse, FPS) agar tidak me-render ulang seluruh UI lewat store. */
export const liveBus = {
  mouse: null as V3 | null, fps: 0,
  listeners: new Set<() => void>(),
  notify() { for (const l of this.listeners) l(); },
  subscribe(l: () => void) { this.listeners.add(l); return () => { this.listeners.delete(l); }; },
};

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const measurePts = useRef<V3[]>([]);
  const down = useRef<{ x: number; y: number; t: number; shift: boolean; boxSel: boolean; pointerType: string; gizmo: boolean } | null>(null);
  const lastMove = useRef(0);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const st = useStore.getState;
    canvas.addEventListener('pointerdown', () => sceneRef.current?.markInteract());
    const ctl = new SceneController(canvas, {
      onTransformLive: (id, pos, rotY) => st().liveTransform(id, pos, rotY),
      onTransformEnd: (id, pos, rotY, scale) => st().commitTransform(id, pos, rotY, scale),
      onFps: (fps) => { liveBus.fps = fps; liveBus.notify(); },
    });
    sceneRef.current = ctl;
    const s0 = st();
    ctl.setBackground(s0.theme, s0.settings.appearance?.canvasColor); ctl.setGrid(s0.showGrid); ctl.setShadows(s0.showShadows);
    const g0 = sceneSource(s0);
    ctl.sync(g0.items, g0.walls, g0.settings);
    ctl.setViewMode(s0.viewMode, s0.topSubMode);
    ctl.setTool(s0.tool);
    ctl.syncDimensions(s0.dimensions);
    ctl.setSelection(s0.selectedIds);
    ctl.setPinMarkers(s0.arPins.a, s0.arPins.b);
    ctl.setBrightness(s0.brightness);
    ctl.setPeopleVisible(s0.showPeople);
    ctl.setLightsOn(s0.lightsOn);
    if (s0.openIds.length) ctl.setOpenItems(s0.openIds, true);
    if (s0.items.length) ctl.resetView();

    const refreshDims = () => {
      const s = st();
      if (!s.showDimensions) { ctl.setDimensionOverlay([], s.theme === 'dark'); return; }
      ctl.setDimensionOverlay(computeDimLines(s.items, s.walls, s.settings, s.dimLayers, s.selectedIds, s.dimUnit, s.dimDecimals), s.theme === 'dark');
    };
    refreshDims();
    let frameCleanup: (() => void) | null = null;
    let fitted = false;
    /** Bangun overlay rangka hollow saat Mode Produksi (tab Rangka 3D). */
    const syncFrame = () => {
      const s = st();
      if (frameCleanup) { frameCleanup(); frameCleanup = null; }
      ctl.setFrameOverlay(null);
      const inRangka = s.appMode === 'production' && s.prodTab === 'rangka' && s.items.length > 0;
      const view = s.settings.production.frameView;
      const clean = inRangka && (view === 'frame' || view === 'exploded');
      // View "Rangka Only" / "Exploded View": sembunyikan dinding, countertop & kabinet solid → hanya rangka.
      ctl.setRoomVisible(!clean);
      ctl.setCountertopVisible(!clean);
      ctl.setCabinetVisible(!clean);
      if (!inRangka) { ctl.setSkinOpacity(null); return; }
      ctl.setSkinOpacity(clean ? null : view === 'solid' ? 0.88 : 0.22);
      const p = s.settings.production;
      const res = buildFrame(s.items, s.walls, s.settings, p.frameMaterial);
      const g = buildFrameGroup(res, {
        material: p.frameMaterial,
        explode: p.frameView === 'exploded' ? p.frameExplode : 0,
        labels: p.frameLabels,
        labelMode: s.frameLabelMode,
        labelScale: s.frameLabelScale,
        welds: p.frameWelds,
        acp: clean ? 'none' : p.frameView === 'solid' ? 'solid' : p.frameView === 'frame_acp' ? 'transparent' : 'none',
        doorColor: s.items[0]?.materials.doorColor ?? '#C9A97A',
        colorBy: p.frameColorBy ?? 'material',
        highlight: res.blocks.filter((b) => b.cabinetIds.some((id) => s.selectedIds.includes(id))).map((b) => b.id),
        hideBlocks: s.frameHideBlocks,
        hideDoors: s.frameHideDoors,
      }, clean ? [] : ctl.getSkins());
      ctl.setFrameOverlay(g.group);
      frameCleanup = g.dispose;
    };
    syncFrame();
    const unsub = useStore.subscribe((s, p) => {
      if (s.items !== p.items || s.walls !== p.walls || s.settings !== p.settings || s.projectDoc !== p.projectDoc || s.docPending !== p.docPending) {
        const g = sceneSource(s);
        ctl.sync(g.items, g.walls, g.settings);
        if (!s.lightsOn) ctl.setLightsOn(false);
      }
      if (s.selectedIds !== p.selectedIds) ctl.setSelection(s.selectedIds);
      if (s.tool !== p.tool) { ctl.setTool(s.tool); if (s.tool !== 'tape' && s.tool !== 'dimension' && s.tool !== 'protractor') { measurePts.current = []; ctl.clearPreview(); } }
      if (s.viewMode !== p.viewMode) ctl.setViewMode(s.viewMode, s.topSubMode);
      if (s.topSubMode !== p.topSubMode) ctl.setTopSubMode(s.topSubMode);
      if (s.openIds !== p.openIds) {
        const added = s.openIds.filter((id) => !p.openIds.includes(id));
        const removed = p.openIds.filter((id) => !s.openIds.includes(id));
        if (added.length) ctl.setOpenItems(added, true);
        if (removed.length) ctl.setOpenItems(removed, false);
      }
      if (s.brightness !== p.brightness) ctl.setBrightness(s.brightness);
      if (s.showPeople !== p.showPeople) ctl.setPeopleVisible(s.showPeople);
      if (s.lightsOn !== p.lightsOn) ctl.setLightsOn(s.lightsOn);
      if (s.xray !== p.xray) ctl.setXray(s.xray);
      if (s.explode !== p.explode) ctl.setExplodeMode(s.explode);
      if (s.theme !== p.theme || s.settings.appearance?.canvasColor !== p.settings.appearance?.canvasColor) ctl.setBackground(s.theme, s.settings.appearance?.canvasColor);
      if (s.showGrid !== p.showGrid) ctl.setGrid(s.showGrid);
      if (s.showShadows !== p.showShadows) ctl.setShadows(s.showShadows);
      if (s.dimensions !== p.dimensions) ctl.syncDimensions(s.dimensions);
      if (s.focusRequest !== p.focusRequest) ctl.focus(s.selectedIds);
      if (s.resetViewRequest !== p.resetViewRequest) ctl.resetView();
      if (s.zoomRequest !== p.zoomRequest && s.zoomRequest.dir) ctl.zoom(s.zoomRequest.dir > 0 ? 1.25 : 0.8);
      if (s.items !== p.items || s.walls !== p.walls || s.settings !== p.settings || s.selectedIds !== p.selectedIds || s.showDimensions !== p.showDimensions || s.dimLayers !== p.dimLayers || s.dimUnit !== p.dimUnit || s.dimDecimals !== p.dimDecimals || s.theme !== p.theme) refreshDims();
      if (s.arPins !== p.arPins) ctl.setPinMarkers(s.arPins.a, s.arPins.b);
      if (s.appMode !== p.appMode) {
        try { useStore.getState().ui({ designThumb: ctl.screenshot('jpg') }); } catch { /* abaikan */ }
        if (s.appMode !== 'production') { ctl.setPaused(false); ctl.resize(); }
      }
      if (s.appMode !== p.appMode || s.prodTab !== p.prodTab) {
        syncFrame();
        if (s.appMode === 'production') {
          ctl.setPaused(s.prodTab !== 'rangka');
          if (s.prodTab === 'rangka') { ctl.resize(); if (!fitted) { fitted = true; const b = ctl.frameOverlayBounds(); ctl.fitCameraToObject(b.center, b.size * 1.05); } }
        } else {
          ctl.setPaused(false);
          refreshDims();
        }
      } else if (s.appMode === 'production' && s.prodTab === 'rangka' && (s.items !== p.items || s.walls !== p.walls || s.settings !== p.settings || s.selectedIds !== p.selectedIds || s.frameLabelMode !== p.frameLabelMode || s.frameLabelScale !== p.frameLabelScale || s.frameHideBlocks !== p.frameHideBlocks || s.frameHideDoors !== p.frameHideDoors)) {
        syncFrame();
      }
    });
    const ro = new ResizeObserver(() => ctl.resize());
    ro.observe(hostRef.current!);
    return () => { unsub(); ro.disconnect(); if (frameCleanup) frameCleanup(); ctl.dispose(); sceneRef.current = null; };
  }, []);

  // ─── Pointer interaction ───
  const onPointerDown = (e: React.PointerEvent) => {
    const ctl = sceneRef.current; if (!ctl) return;
    setCtxMenu(null);
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const s = useStore.getState();
    const boxSel = s.tool === 'select' && e.shiftKey;
    down.current = { x: e.clientX, y: e.clientY, t: performance.now(), shift: e.shiftKey, boxSel, pointerType: e.pointerType, gizmo: !!ctl.transform.axis };
    if (boxSel) { ctl.setControlsEnabled(false); setBox({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY }); }
    if (e.pointerType === 'touch') {
      const hit = ctl.raycastItem(e.clientX, e.clientY);
      if (hit) {
        longPress.current = setTimeout(() => {
          if (!down.current) return;
          navigator.vibrate?.(50);
          useStore.getState().setSelection([hit.id]);
          setCtxMenu({ x: e.clientX, y: e.clientY, id: hit.id });
          down.current = null;
        }, 500);
      }
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const ctl = sceneRef.current; if (!ctl) return;
    const d = down.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 && longPress.current) { clearTimeout(longPress.current); longPress.current = null; }
    if (d?.boxSel) setBox({ x1: d.x, y1: d.y, x2: e.clientX, y2: e.clientY });
    const s = useStore.getState();
    const now = performance.now();
    if (e.pointerType === 'mouse' && now - lastMove.current > 50) {
      lastMove.current = now;
      const p = ctl.raycastPoint(e.clientX, e.clientY);
      liveBus.mouse = p; liveBus.notify();
      if ((s.tool === 'tape' || s.tool === 'dimension' || s.tool === 'protractor') && measurePts.current.length && p) ctl.setPreview(measurePts.current, p);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const ctl = sceneRef.current; if (!ctl) return;
    if (longPress.current) { clearTimeout(longPress.current); longPress.current = null; }
    const d = down.current; down.current = null;
    if (!d) return;
    const s = useStore.getState();
    if (d.boxSel) {
      ctl.setControlsEnabled(true);
      const host = hostRef.current!.getBoundingClientRect();
      const x1 = Math.min(d.x, e.clientX) - host.left, x2 = Math.max(d.x, e.clientX) - host.left, y1 = Math.min(d.y, e.clientY) - host.top, y2 = Math.max(d.y, e.clientY) - host.top;
      setBox(null);
      if (x2 - x1 > 4 && y2 - y1 > 4) {
        const ids = s.items.filter((i) => i.visible && !i.locked).filter((i) => { const r = ctl.itemScreenRect(i.id); return r && r.x1 >= x1 && r.x2 <= x2 && r.y1 >= y1 && r.y2 <= y2; }).map((i) => i.id);
        s.setSelection(ids);
        if (ids.length) toast(`${ids.length} objek dipilih`, 'info');
      }
      return;
    }
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
    if (moved || d.gizmo) return;
    const hit = ctl.raycastItem(e.clientX, e.clientY);
    const item = hit ? s.items.find((i) => i.id === hit.id) : undefined;
    if (s.pickingPin) {
      const pp = hit?.point ?? ctl.raycastPoint(e.clientX, e.clientY);
      if (pp) { s.ui({ arPins: { ...s.arPins, [s.pickingPin]: { x: pp.x, y: pp.y, z: pp.z } }, pickingPin: null, showAr: true }); toast(`Titik ${s.pickingPin.toUpperCase()} ditetapkan`, 'success'); }
      return;
    }
    const readOnly = s.shareMode === 'view';
    switch (s.tool) {
      case 'select': case 'orbit': case 'move': case 'rotate': case 'scale': case 'hand': {
        if (s.tool === 'hand') return;
        if (item && !item.locked) {
          if (e.shiftKey || e.ctrlKey || e.metaKey) s.toggleSelect(item.id);
          else s.setSelection([item.id]);
        } else if (!e.shiftKey) s.clearSelection();
        break;
      }
      case 'zoom': ctl.zoom(e.altKey ? 0.75 : 1.35); break;
      case 'paint': {
        if (readOnly || !item) return;
        s.patchItem(item.id, { materials: { doorColor: s.paintColor, doorMaterial: s.paintMaterial } });
        toast(`Material ${s.paintMaterial} ${s.paintColor} diterapkan ke ${item.name}`, 'success');
        break;
      }
      case 'eyedropper': {
        if (readOnly || !item) return;
        s.ui({ paintColor: item.materials.doorColor, paintMaterial: item.materials.doorMaterial, tool: 'paint' });
        toast(`Warna ${item.materials.doorColor} (${item.materials.doorMaterial}) diambil — tool Paint aktif`, 'success');
        break;
      }
      case 'tape': case 'dimension': case 'protractor': {
        const p = hit?.point ?? ctl.raycastPoint(e.clientX, e.clientY);
        if (!p) return;
        measurePts.current.push(p);
        const need = s.tool === 'protractor' ? 3 : 2;
        if (measurePts.current.length >= need) {
          const [a, b, c] = measurePts.current;
          if (s.tool === 'tape') { ctl.addMeasure(a, b); toast(`Jarak: ${Math.round(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z))} mm`, 'info'); }
          else if (s.tool === 'dimension') { if (readOnly) { measurePts.current = []; ctl.clearPreview(); return; } s.addDimension(a, b); toast('Dimension line ditambahkan (ikut tersimpan & export)', 'success'); }
          else ctl.addAngle(a, b, c);
          measurePts.current = []; ctl.clearPreview();
        } else ctl.setPreview(measurePts.current, null);
        break;
      }
    }
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const ctl = sceneRef.current; if (!ctl) return;
    const hit = ctl.raycastItem(e.clientX, e.clientY);
    if (hit) { useStore.getState().setSelection([hit.id]); ctl.focus([hit.id]); }
  };
  const onContextMenu = (e: React.MouseEvent) => {
    const ctl = sceneRef.current; if (!ctl) return;
    if (useStore.getState().shareMode === 'view') return;
    const hit = ctl.raycastItem(e.clientX, e.clientY);
    if (hit) { e.preventDefault(); useStore.getState().setSelection([hit.id]); setCtxMenu({ x: e.clientX, y: e.clientY, id: hit.id }); }
  };

  const split = useStore((s) => s.viewMode === 'top' && s.topSubMode === 'split');
  const tool = useStore((s) => s.tool);
  return (
    <div ref={hostRef} className={`absolute inset-0 overflow-hidden tool-${tool}`} style={{ background: 'var(--bg-canvas)', touchAction: 'none' }}>
      <canvas ref={canvasRef} className="block w-full h-full outline-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { down.current = null; setBox(null); }} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu} />
      {split && (<><span className="view-split-label" style={{ top: 12 }}>Wall Plan (kabinet atas)</span><span className="view-split-label" style={{ top: 'calc(50% + 8px)' }}>Base Plan (kabinet bawah)</span><div className="absolute left-0 right-0 pointer-events-none" style={{ top: '50%', height: 2, background: 'var(--brand-primary)', opacity: 0.6 }} /></>)}
      {box && <div className="fixed pointer-events-none border-2 rounded" style={{ left: Math.min(box.x1, box.x2), top: Math.min(box.y1, box.y2), width: Math.abs(box.x2 - box.x1), height: Math.abs(box.y2 - box.y1), borderColor: 'var(--brand-primary)', background: 'rgba(27,157,107,0.12)', zIndex: 50 }} />}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[600]" onPointerDown={() => setCtxMenu(null)} />
          <div className="menu" style={{ position: 'fixed', left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 160), zIndex: 610 }}>
            <button className="menu-item" onClick={() => { useStore.getState().ui({ showProps: true, mobileSheet: 'props' }); setCtxMenu(null); }}><Settings2 size={15} />Properti</button>
            <button className="menu-item" onClick={() => { useStore.getState().duplicateItems([ctxMenu.id]); setCtxMenu(null); }}><Copy size={15} />Duplikat</button>
            <div className="menu-sep" />
            <button className="menu-item danger" onClick={() => { useStore.getState().removeItems([ctxMenu.id]); setCtxMenu(null); }}><Trash2 size={15} />Hapus</button>
          </div>
        </>
      )}
    </div>
  );
}
