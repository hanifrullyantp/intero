import { useEffect, useRef, useState } from 'react';
import { Eye, Link2, MoveDiagonal2, Palette, Settings2, GripHorizontal, Layers as LayersIcon, X } from 'lucide-react';
import { useStore } from '../../store';
import { TopToolbar, fileActions } from './TopToolbar';
import { LeftToolbar } from './LeftToolbar';
import { Viewport, sceneRef } from './Viewport';
import { ComponentLibrary } from './ComponentLibrary';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { MaterialPanel } from './MaterialPanel';
import { ViewControls, StatusBar } from './ViewControls';
import { Wizard } from './Wizard';
import { ComponentBuilder } from './ComponentBuilder';
import { DragNumber, Field, Modal, Select, toast, useIsMobile } from '../ui';
import { listMyComponents, loadDraft, loadPrices, saveDraft } from '../../lib/persistence';
import { loadCatalog, saveCatalog, PRESET_CATALOG } from '../../lib/catalog';
import { COLOR_PRESETS } from '../../lib/constants';
import type { DoorMaterial } from '../../types';
import { timeAgo } from '../../lib/utils';
import { MobileChrome, MobileTopbar } from '../mobile/MobileUI';
import { ProductionMode } from '../production/ProductionMode';
import { PriceListDialog } from '../production/PriceListDialog';
import { DimensionPanel } from '../dimensions/DimensionPanel';
import { ArDialog, PinPickBanner } from '../xr/ArDialog';
import { PhotoOverlay } from '../xr/PhotoOverlay';
import { launchVR } from '../xr/launch';
import { teamSession } from '../../lib/team-session';

export function Editor({ onBackToLanding }: { onBackToLanding: () => void }) {
  const s = useStore();
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState<{ savedAt: number; name: string; count: number } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'props' | 'layers' | 'material'>('props');
  const checked = useRef(false);

  // Draft restore + komponen kustom
  useEffect(() => {
    if (checked.current) return; checked.current = true;
    listMyComponents().then((c) => { if (c.length) useStore.getState().setCustomComponents(c); });
    loadPrices().then((p) => { if (p) useStore.getState().ui({ prices: p }); });
    loadCatalog().then((c) => { useStore.getState().ui({ catalog: c }); if (!c.some((x) => x.id === PRESET_CATALOG[0].id)) void saveCatalog(PRESET_CATALOG); });
    if (useStore.getState().shareMode) return;
    loadDraft().then((d) => {
      if (d && d.data.cabinets.length) setDraft({ savedAt: d.savedAt, name: d.data.projectName, count: d.data.cabinets.length });
      else if (!useStore.getState().items.length) useStore.getState().ui({ showWizard: true });
    });
  }, []);
  // Peer-to-peer live sync: snapshots stay between browsers on their direct WebRTC data channel.
  useEffect(() => {
    let remoteApplying = false;
    let sendTimer: ReturnType<typeof setTimeout> | null = null;
    teamSession.onSnapshot((data) => {
      remoteApplying = true;
      const st = useStore.getState();
      st.loadProject(data);
      useStore.setState({ dirty: true });
      window.setTimeout(() => { remoteApplying = false; }, 0);
    });
    const unsubscribeStore = useStore.subscribe((st, prev) => {
      if (remoteApplying || !teamSession.connected) return;
      const changed = st.items !== prev.items || st.walls !== prev.walls || st.settings !== prev.settings || st.projectName !== prev.projectName || st.dimensions !== prev.dimensions || st.customComponents !== prev.customComponents;
      if (!changed) return;
      if (sendTimer) clearTimeout(sendTimer);
      sendTimer = setTimeout(() => teamSession.sendProject(useStore.getState().toProjectData()), 280);
    });
    const unsubscribeTeam = teamSession.subscribe((state) => {
      if (state.status === 'connected' && state.role === 'host') {
        setTimeout(() => teamSession.sendProject(useStore.getState().toProjectData()), 80);
      }
    });
    return () => {
      unsubscribeStore(); unsubscribeTeam();
      if (sendTimer) clearTimeout(sendTimer);
      teamSession.onSnapshot(() => {});
      teamSession.close();
    };
  }, []);
  // Autosave: debounce 2s on-change + interval 10s
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const save = async () => { const st = useStore.getState(); if (st.shareMode) return; if (!st.items.length && !st.walls.length) return; await saveDraft(st.toProjectData()); st.markSaved(); };
    const unsub = useStore.subscribe((st, p) => { if (st.items !== p.items || st.walls !== p.walls || st.settings !== p.settings || st.projectName !== p.projectName || st.dimensions !== p.dimensions || st.customComponents !== p.customComponents) { if (t) clearTimeout(t); t = setTimeout(save, 2000); } });
    const iv = setInterval(() => { if (useStore.getState().dirty) save(); }, 10000);
    return () => { unsub(); clearInterval(iv); if (t) clearTimeout(t); };
  }, []);
  // Theme
  useEffect(() => { document.documentElement.setAttribute('data-theme', s.theme); }, [s.theme]);
  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement || tgt instanceof HTMLSelectElement || tgt.isContentEditable) return;
      const st = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const readOnly = st.shareMode === 'view';
      if (k === '/' && !mod) { e.preventDefault(); st.ui({ showSearch: true }); return; }
      if (readOnly && (k === 'delete' || k === 'backspace')) return;
      if (mod && e.shiftKey && k === 't') { e.preventDefault(); st.setTheme(st.theme === 'light' ? 'dark' : 'light'); return; }
      if (mod && e.shiftKey && k === 'p') { e.preventDefault(); st.setAppMode(st.appMode === 'design' ? 'production' : 'design'); return; }
      if (mod && e.shiftKey && k === 'v') { e.preventDefault(); void launchVR(); return; }
      if (mod && e.shiftKey && k === 'u') { e.preventDefault(); st.setUiMode(st.uiMode === 'simple' ? 'advanced' : 'simple'); return; }
      if (mod && e.shiftKey && k === 'k') { if (!readOnly) { e.preventDefault(); st.ui({ showBuilder: true }); } return; }
      if (mod && e.shiftKey && k === 's' && readOnly) return;
      if (mod && e.shiftKey && k === 's') { e.preventDefault(); fileActions.save(true); return; }
      if (mod && e.shiftKey && k === 'z') { e.preventDefault(); st.redo(); return; }
      if (mod && e.shiftKey && k === 'g') { e.preventDefault(); toast('Ungroup: item dilepas dari parent', 'info'); st.patchItems(st.selectedIds, { config: { parentId: undefined } }); return; }
      if (mod) {
        switch (k) {
          case 'z': e.preventDefault(); st.undo(); return;
          case 'y': e.preventDefault(); st.redo(); return;
          case 'c': e.preventDefault(); if (!readOnly) { st.copy(); if (st.selectedIds.length) toast('Disalin', 'info'); } return;
          case 'v': e.preventDefault(); if (!readOnly) st.paste(); return;
          case 'x': e.preventDefault(); if (!readOnly) st.cut(); return;
          case 'd': e.preventDefault(); if (!readOnly) st.duplicateItems(st.selectedIds); return;
          case 'a': e.preventDefault(); if (!readOnly) st.selectAll(); return;
          case 'n': e.preventDefault(); if (!readOnly) fileActions.newProject(); return;
          case 'o': e.preventDefault(); if (!readOnly) fileActions.open(); return;
          case 's': e.preventDefault(); fileActions.save(); return;
          case 'g': e.preventDefault(); if (!readOnly && st.selectedIds.length > 1) { const [first, ...rest] = st.selectedIds; st.patchItems(rest, { config: { parentId: first } }); toast('Grup dibuat (parent-child)', 'success'); } return;
        }
        return;
      }
      if (e.shiftKey) {
        switch (k) {
          case 'o': st.setOpenMode(true); return;
          case 'c': st.setOpenMode(false); return;
          case 'd': st.setDim({ showDimensions: !st.showDimensions }); st.ui({ showDimPanel: !st.showDimensions }); return;
          case 'm': if (!readOnly && st.selectedIds.length) st.ui({ dialog: { kind: 'mirror' } }); return;
          case 'a': if (!readOnly && st.selectedIds.length) st.ui({ dialog: { kind: 'array' } }); return;
          case 'p': if (!readOnly) st.setTool('protractor'); return;
        }
        return;
      }
      switch (k) {
        case 'v': st.setTool('select'); break; case 'h': st.setTool('hand'); break; case 'o': st.setTool('orbit'); break; case 'z': st.setTool('zoom'); break;
        case 'm': if (!readOnly) st.setTool('move'); break; case 'r': if (!readOnly) st.setTool('rotate'); break; case 's': if (!readOnly) st.setTool('scale'); break; case 't': st.setTool('tape'); break;
        case 'd': if (!readOnly) st.setTool('dimension'); break; case 'b': if (!readOnly) st.setTool('paint'); break; case 'i': if (!readOnly) st.setTool('eyedropper'); break;
        case 'escape': st.clearSelection(); st.ui({ dialog: null }); sceneRef.current?.clearMeasures(); break;
        case 'delete': case 'backspace': if (!readOnly && st.selectedIds.length) { e.preventDefault(); st.removeItems(st.selectedIds); } break;
        case 'f': st.ui({ focusRequest: st.focusRequest + 1 }); break;
        case '1': st.setViewMode('perspective'); break; case '2': st.setViewMode('top'); break; case '3': st.setViewMode('front'); break; case '4': st.setViewMode('right'); break; case '5': st.setViewMode('iso'); break;
        case 'l': st.ui({ showLayers: !st.showLayers }); break; case 'p': st.ui({ showProps: !st.showProps }); break; case 'k': st.ui({ showLibrary: !st.showLibrary }); break;
        case 'a': if (!readOnly && st.selectedIds.length >= 2) st.ui({ showProps: true }); break;
      }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const restoreDraft = async () => { const d = await loadDraft(); if (d) { const st = useStore.getState(); st.loadProject(d.data); st.ui({ resetViewRequest: st.resetViewRequest + 1 }); toast(`Proyek "${d.data.projectName}" dilanjutkan`, 'success'); } setDraft(null); };
  const inProd = s.appMode === 'production';
  const showLayersFloating = s.showLayers && !s.layersDocked && !isMobile && s.uiMode === 'advanced' && !inProd;
  const showSidebar = !isMobile && s.showProps && !inProd;
  const [sidebarW, setSidebarW] = useState(() => { try { return Math.max(260, Math.min(480, JSON.parse(localStorage.getItem('intero_sidebarW') || '320'))); } catch { return 320; } });
  const sidebarDrag = useRef<{ startX: number; startW: number } | null>(null);
  const onSidebarResize = (e: React.PointerEvent) => {
    e.preventDefault();
    sidebarDrag.current = { startX: e.clientX, startW: sidebarW };
    const move = (ev: PointerEvent) => { if (!sidebarDrag.current) return; setSidebarW(Math.max(260, Math.min(480, sidebarDrag.current.startW - (ev.clientX - sidebarDrag.current.startX)))); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); sidebarDrag.current = null; try { localStorage.setItem('intero_sidebarW', JSON.stringify(sidebarWRef.current)); } catch { /* ignore */ } };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const sidebarWRef = useRef(sidebarW); sidebarWRef.current = sidebarW;

  return (
    <div className="flex flex-col h-full theme-transition" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: isMobile && s.appMode === 'design' ? 64 : 0, maxWidth: '100vw', overflowX: 'hidden' }}>
      {isMobile && <MobileTopbar />}
      <TopToolbar onBackToLanding={onBackToLanding} headless={isMobile} />
      {s.shareMode && <ShareBanner mode={s.shareMode} />}
      {!inProd && <ContextBar />}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative min-w-0">
          <Viewport />
          {!inProd && <LeftToolbar />}
          {s.showLibrary && !isMobile && !inProd && <div className="float-panel" style={{ left: 68, top: 12, bottom: 12 }}><ComponentLibrary /></div>}
          {showLayersFloating && <FloatingLayers />}
          <ViewControls />
          <DimensionPanel />
        </div>
        {showSidebar && (
          <aside className="relative flex flex-col shrink-0 theme-transition" style={{ width: sidebarW, background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)' }}>
            <div className="sidebar-resizer" style={{ touchAction: 'none' }} onPointerDown={onSidebarResize} title="Resize panel" />
            <div className="seg m-2">
              <button className={`flex-1 ${sidebarTab === 'props' ? 'active' : ''}`} onClick={() => setSidebarTab('props')}><Settings2 size={13} />Props</button>
              <button className={`flex-1 ${sidebarTab === 'layers' ? 'active' : ''}`} onClick={() => { setSidebarTab('layers'); s.ui({ layersDocked: true, showLayers: true }); }}><LayersIcon size={13} />Layer</button>
              <button className={`flex-1 ${sidebarTab === 'material' ? 'active' : ''}`} onClick={() => setSidebarTab('material')}><Palette size={13} />Material</button>
            </div>
            <div className="flex-1 min-h-0">{sidebarTab === 'layers' ? <LayersPanel embedded /> : sidebarTab === 'material' ? <MaterialPanel /> : <PropertiesPanel embedded />}</div>
          </aside>
        )}
        {s.appMode === 'production' && <ProductionMode />}
      </div>
      {!isMobile && <StatusBar />}
      {isMobile && <MobileChrome />}
      {s.showWizard && <Wizard onClose={() => s.ui({ showWizard: false })} />}
      <ArDialog /><PinPickBanner /><PhotoOverlay /><PriceListDialog />
      {s.showBuilder && <ComponentBuilder onClose={() => s.ui({ showBuilder: false })} />}
      {s.dialog?.kind === 'confirm' && (
        <Modal onClose={() => s.ui({ dialog: null })} width={420}><div className="p-6 flex flex-col gap-4"><h3 className="text-[16px] font-bold">{s.dialog.title}</h3><p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{s.dialog.message}</p><div className="flex justify-end gap-2"><button className="btn btn-secondary" onClick={() => s.ui({ dialog: null })}>Batal</button><button className="btn btn-primary" onClick={() => { const fn = s.dialog?.onConfirm; s.ui({ dialog: null }); fn?.(); }}>Ya, lanjutkan</button></div></div></Modal>
      )}
      {s.dialog?.kind === 'mirror' && <MirrorDialog />}
      {s.dialog?.kind === 'array' && <ArrayDialog />}
      {draft && (
        <Modal width={440}><div className="p-6 flex flex-col gap-4"><h3 className="text-[16px] font-bold">Lanjutkan proyek terakhir?</h3><p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Draft "<b>{draft.name}</b>" ({draft.count} komponen) tersimpan otomatis {timeAgo(draft.savedAt)} di browser ini.</p><div className="flex justify-end gap-2"><button className="btn btn-secondary" onClick={() => { setDraft(null); if (!useStore.getState().items.length) s.ui({ showWizard: true }); }}>Mulai baru</button><button className="btn btn-primary" onClick={restoreDraft}>Lanjutkan</button></div></div></Modal>
      )}
    </div>
  );
}

function ShareBanner({ mode }: { mode: 'view' | 'edit' }) {
  const close = () => { history.replaceState(null, '', location.pathname); useStore.getState().ui({ shareMode: null }); toast('Tautan ditutup — proyek menjadi lokal & autosave aktif', 'info'); };
  return (
    <div className="share-banner shrink-0" style={{ minHeight: 34, background: mode === 'view' ? 'var(--brand-primary-soft)' : '#FFF7E6', color: mode === 'view' ? 'var(--brand-primary)' : '#92600A', borderBottom: '1px solid var(--border)' }}>
      {mode === 'view' ? <Eye size={14} /> : <Link2 size={14} />}
      <span className="flex-1 truncate">{mode === 'view' ? 'Mode Lihat Saja — Anda membuka tautan bersama. Pengeditan dinonaktifkan.' : 'Dibuka dari tautan bersama (bisa edit). Perubahan tersimpan lokal & tidak mengubah tautan.'}</span>
      <button className="btn btn-sm btn-secondary" style={{ height: 24, fontSize: 11 }} onClick={() => fileActions.save()}>Simpan .intero</button>
      <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={close} data-tip="Tutup tautan"><X size={13} /></button>
    </div>
  );
}

function FloatingLayers() {
  const showLibrary = useStore((st) => st.showLibrary);
  const [size, setSize] = useState(() => ({ w: 300, h: 360 }));
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const baseLeft = showLibrary ? 68 + 340 + 8 : 68;
  const ref = useRef<HTMLDivElement>(null);
  const onGrip = (e: React.PointerEvent) => {
    const start = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    const move = (ev: PointerEvent) => setPos({ x: Math.max(0, start.px + ev.clientX - start.x), y: Math.max(0, start.py - (ev.clientY - start.y)) });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const onResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    const move = (ev: PointerEvent) => setSize({ w: Math.max(240, start.w + ev.clientX - start.x), h: Math.max(200, start.h - (ev.clientY - start.y)) });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  return (
    <div ref={ref} className="float-panel layers-float rounded-2xl overflow-hidden flex flex-col" style={{ left: baseLeft + pos.x, bottom: 64 + pos.y, width: size.w, height: size.h, boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex justify-center cursor-grab py-0.5" style={{ color: 'var(--text-tertiary)', touchAction: 'none' }} onPointerDown={onGrip}><GripHorizontal size={14} /></div>
      <div className="flex-1 min-h-0"><LayersPanel /></div>
      <div className="absolute flex items-center justify-center" style={{ right: 2, top: 2, width: 26, height: 26, cursor: 'nesw-resize', color: 'var(--text-tertiary)', touchAction: 'none' }} onPointerDown={onResize} title="Resize panel"><MoveDiagonal2 size={13} /></div>
    </div>
  );
}

function ContextBar() {
  const s = useStore();
  const sel = s.items.find((i) => i.id === s.selectedIds[0]);
  if (!(s.tool === 'move' || s.tool === 'rotate' || s.tool === 'paint' || s.tool === 'scale') || s.uiMode === 'simple') return null;
  return (
    <div className="flex items-center gap-3 px-3 shrink-0 text-[12px]" style={{ height: 36, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
      {s.tool === 'move' && sel && (<>
        <span className="font-semibold">Move</span>
        <span className="label">X</span><div style={{ width: 120 }}><DragNumber value={sel.position.x} step={10} onDragStart={s.pushHistory} onChange={(v, c) => s.patchItem(sel.id, { position: { x: v } }, c && false)} /></div>
        <span className="label">Y</span><div style={{ width: 110 }}><DragNumber value={sel.position.y} min={0} step={10} onDragStart={s.pushHistory} onChange={(v, c) => s.patchItem(sel.id, { position: { y: v } }, c && false)} /></div>
        <span className="label">Z</span><div style={{ width: 120 }}><DragNumber value={sel.position.z} step={10} onDragStart={s.pushHistory} onChange={(v, c) => s.patchItem(sel.id, { position: { z: v } }, c && false)} /></div>
        <span className="label ml-2">Snap</span><Select className="w-24" value={String(s.snapSize)} onChange={(v) => { s.ui({ snapSize: +v }); sceneRef.current?.transform.setTranslationSnap(+v); }} options={[{ value: '1', label: '1 mm' }, { value: '10', label: '10 mm' }, { value: '50', label: '50 mm' }, { value: '100', label: '100 mm' }]} />
        <span className="label">Shift = snap 1 mm · snap tepi kabinet 20 mm</span>
      </>)}
      {s.tool === 'move' && !sel && <span className="label">Pilih objek untuk menampilkan gizmo XYZ.</span>}
      {s.tool === 'rotate' && sel && (<>
        <span className="font-semibold">Rotate</span><span className="label">Sudut</span><div style={{ width: 110 }}><DragNumber value={sel.rotationY} unit="°" step={15} snapOptions={[15]} onDragStart={s.pushHistory} onChange={(v, c) => s.patchItem(sel.id, { rotationY: v }, c && false)} /></div>
        <span className="label">Snap 15° (Shift = 5°) · Pivot: pusat footprint</span>
        {[45, 90, 180].map((a) => <button key={a} className="btn btn-secondary btn-sm" onClick={() => s.patchItem(sel.id, { rotationY: (sel.rotationY + a) % 360 })}>+{a}°</button>)}
      </>)}
      {s.tool === 'scale' && <span className="label">Scale: drag gizmo untuk resize bebas — dimensi parametrik diperbarui otomatis saat dilepas (snap 5%).</span>}
      {s.tool === 'paint' && (<>
        <span className="font-semibold">Paint</span>
        <Select className="w-32" value={s.paintMaterial} onChange={(v) => s.ui({ paintMaterial: v as DoorMaterial })} options={(['HPL', 'Duco', 'PVC', 'ACP', 'Solid Wood', 'Glass'] as DoorMaterial[]).map((v) => ({ value: v, label: v }))} />
        <input type="color" value={s.paintColor} onChange={(e) => s.ui({ paintColor: e.target.value.toUpperCase() })} className="w-8 h-7 rounded cursor-pointer" style={{ border: '1px solid var(--border)', background: 'transparent' }} />
        <div className="flex gap-1">{COLOR_PRESETS.slice(0, 14).map((c) => <button key={c.hex} title={c.name} className="w-5 h-5 rounded-md" style={{ background: c.hex, outline: s.paintColor === c.hex ? '2px solid var(--brand-primary)' : '1px solid var(--border)', outlineOffset: 1 }} onClick={() => s.ui({ paintColor: c.hex })} />)}</div>
        <span className="label">Mode: objek (pintu + panel ikut). Klik objek di viewport untuk menerapkan.</span>
      </>)}
    </div>
  );
}

function MirrorDialog() {
  const s = useStore();
  return (
    <Modal onClose={() => s.ui({ dialog: null })} width={380}>
      <div className="p-6 flex flex-col gap-4"><h3 className="text-[16px] font-bold">Mirror</h3><p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cerminkan {s.selectedIds.length} objek terhadap sumbu. Item di dinding: urutan dibalik & engsel/aksesoris ditukar.</p>
        <div className="grid grid-cols-2 gap-2">{(['x', 'z'] as const).map((ax) => <button key={ax} className="btn btn-secondary" onClick={() => { s.mirrorItems(s.selectedIds, ax); s.ui({ dialog: null }); toast(`Mirror sumbu ${ax.toUpperCase()}`, 'success'); }}>Sumbu {ax.toUpperCase()} {ax === 'x' ? '(kiri-kanan)' : '(depan-belakang)'}</button>)}</div>
      </div>
    </Modal>
  );
}
function ArrayDialog() {
  const s = useStore();
  const [o, setO] = useState({ mode: 'linear' as 'linear' | 'grid' | 'circular', count: 3, spacing: 0, countY: 2, spacingY: 200, radius: 1200, axis: 'x' as 'x' | 'z' });
  return (
    <Modal onClose={() => s.ui({ dialog: null })} width={440}>
      <div className="p-6 flex flex-col gap-4"><h3 className="text-[16px] font-bold">Array</h3>
        <div className="seg">{(['linear', 'grid', 'circular'] as const).map((m) => <button key={m} className={o.mode === m ? 'active' : ''} onClick={() => setO({ ...o, mode: m })}>{m === 'linear' ? 'Linear' : m === 'grid' ? 'Grid' : 'Circular'}</button>)}</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah"><DragNumber value={o.count} min={2} max={30} unit="" onChange={(v) => setO({ ...o, count: v })} /></Field>
          {o.mode !== 'circular' && <Field label="Jarak antar (spacing)"><DragNumber value={o.spacing} min={-500} max={3000} onChange={(v) => setO({ ...o, spacing: v })} /></Field>}
          {o.mode === 'linear' && <Field label="Sumbu"><Select value={o.axis} onChange={(v) => setO({ ...o, axis: v as 'x' | 'z' })} options={[{ value: 'x', label: 'X' }, { value: 'z', label: 'Z' }]} /></Field>}
          {o.mode === 'grid' && <><Field label="Baris"><DragNumber value={o.countY} min={1} max={20} unit="" onChange={(v) => setO({ ...o, countY: v })} /></Field><Field label="Spacing baris"><DragNumber value={o.spacingY} min={-500} max={3000} onChange={(v) => setO({ ...o, spacingY: v })} /></Field></>}
          {o.mode === 'circular' && <Field label="Radius"><DragNumber value={o.radius} min={300} max={6000} onChange={(v) => setO({ ...o, radius: v })} /></Field>}
        </div>
        <div className="flex justify-end gap-2"><button className="btn btn-secondary" onClick={() => s.ui({ dialog: null })}>Batal</button><button className="btn btn-primary" onClick={() => { s.arrayItems(s.selectedIds, o); s.ui({ dialog: null }); toast('Array dibuat', 'success'); }}>Buat Array</button></div>
      </div>
    </Modal>
  );
}
