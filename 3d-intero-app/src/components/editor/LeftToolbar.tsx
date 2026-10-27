import { useRef, useState } from 'react';
import { AlignHorizontalJustifyCenter, ChevronDown, ClipboardPaste, Copy, CopyPlus, FlipHorizontal2, Grid2X2, GripHorizontal, Hand, LayoutGrid, Lightbulb, LightbulbOff, Move, Move3D, Orbit, PaintBucket, Pipette, Ruler, Scaling, MousePointer2, PencilRuler, Trash2, RotateCw, Package, ZoomIn, Wand2, Navigation, SlidersHorizontal, MoreHorizontal, UsersRound } from 'lucide-react';
import { useStore } from '../../store';
import type { ToolId } from '../../types';
import { storage } from '../../lib/utils';
import { toast, useIsMobile } from '../ui';

const TOOLS: { id: ToolId; icon: React.ReactNode; label: string; key: string; simple?: boolean; tour: string; viewOk?: boolean }[] = [
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select — klik pilih, Shift+drag kotak', key: 'V', simple: true, tour: 'select-btn', viewOk: true },
  { id: 'hand', icon: <Hand size={18} />, label: 'Hand / Pan', key: 'H', tour: 'hand-btn', viewOk: true },
  { id: 'orbit', icon: <Orbit size={18} />, label: 'Orbit', key: 'O', tour: 'orbit-btn', viewOk: true },
  { id: 'zoom', icon: <ZoomIn size={18} />, label: 'Zoom — klik zoom in, Alt+klik zoom out', key: 'Z', tour: 'zoom-btn', viewOk: true },
  { id: 'move', icon: <Move size={18} />, label: 'Move (gizmo XYZ)', key: 'M', simple: true, tour: 'move-btn' },
  { id: 'rotate', icon: <RotateCw size={18} />, label: 'Rotate', key: 'R', simple: true, tour: 'rotate-btn' },
  { id: 'scale', icon: <Scaling size={18} />, label: 'Scale', key: 'S', tour: 'scale-btn' },
  { id: 'tape', icon: <Ruler size={18} />, label: 'Tape Measure — klik 2 titik', key: 'T', tour: 'tape-btn', viewOk: true },
  { id: 'dimension', icon: <PencilRuler size={18} />, label: 'Dimension line permanen', key: 'D', tour: 'dimension-btn' },
  { id: 'protractor', icon: <Move3D size={18} />, label: 'Protractor — klik 3 titik', key: 'Shift+P', tour: 'protractor-btn', viewOk: true },
  { id: 'paint', icon: <PaintBucket size={18} />, label: 'Paint Bucket', key: 'B', simple: true, tour: 'paint-btn' },
  { id: 'eyedropper', icon: <Pipette size={18} />, label: 'Eyedropper', key: 'I', tour: 'eyedropper-btn' },
];

const MOBILE_GROUPS: { id: string; label: string; icon: React.ReactNode; tools: ToolId[] }[] = [
  { id: 'navigate', label: 'Navigasi', icon: <Navigation size={17} />, tools: ['select', 'hand', 'orbit', 'zoom'] },
  { id: 'transform', label: 'Transformasi', icon: <SlidersHorizontal size={17} />, tools: ['move', 'rotate', 'scale'] },
  { id: 'measure', label: 'Pengukuran', icon: <Ruler size={17} />, tools: ['tape', 'dimension', 'protractor'] },
  { id: 'material', label: 'Material', icon: <PaintBucket size={17} />, tools: ['paint', 'eyedropper'] },
];

export function LeftToolbar() {
  const s = useStore();
  const mobile = useIsMobile();
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [pos, setPos] = useState(() => storage.get('intero_toolbarPos', { x: 12, y: 12 }));
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const simple = s.uiMode === 'simple';
  const hasSel = s.selectedIds.length > 0;

  const onGrip = (e: React.PointerEvent) => {
    e.preventDefault();
    const r = elRef.current!.getBoundingClientRect();
    const parent = elRef.current!.parentElement!.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    const move = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const x = Math.max(4, Math.min(parent.width - r.width - 4, ev.clientX - parent.left - dragRef.current.dx));
      const y = Math.max(4, Math.min(parent.height - r.height - 4, ev.clientY - parent.top - dragRef.current.dy));
      setPos({ x, y });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); dragRef.current = null; setPos((p) => { storage.set('intero_toolbarPos', p); return p; }); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const resetPos = () => { const d = { x: 12, y: 12 }; setPos(d); storage.set('intero_toolbarPos', d); toast('Posisi toolbar direset', 'info'); };
  const needAdvanced = (fn: () => void) => () => {
    if (simple) { toast('Fitur ini tersedia di Mode Advanced.', 'info', { label: 'Beralih', onClick: () => s.setUiMode('advanced') }); return; }
    fn();
  };
  const tools = simple ? TOOLS.filter((t) => t.simple) : TOOLS;
  const readOnly = s.shareMode === 'view';
  const Btn = ({ icon, tip, onClick, active, disabled, tour }: { icon: React.ReactNode; tip: string; onClick: () => void; active?: boolean; disabled?: boolean; tour?: string }) => (
    <button type="button" className={`icon-btn ${active ? 'active' : ''}`} data-tip={tip} data-tip-side="right" data-tour={tour} onClick={onClick} disabled={disabled} aria-label={tip} style={{ width: 32, height: 32 }}>{icon}</button>
  );
  if (mobile) {
    if (!s.pinTools) return null;
    const panelOnLeft = pos.x > window.innerWidth * 0.55;
    const mobileTool = (id: ToolId) => {
      const t = TOOLS.find((x) => x.id === id)!;
      const simpleAvailable = !!t.simple;
      if (readOnly && !t.viewOk) return;
      if (simple && !simpleAvailable) {
        toast('Fitur ini tersedia di Mode Advanced.', 'info', { label: 'Beralih', onClick: () => s.setUiMode('advanced') });
        return;
      }
      s.setTool(id);
      setMobileGroup(null);
    };
    const operation = (label: string, icon: React.ReactNode, fn: () => void, disabled = false) => (
      <button key={label} type="button" className="mobile-tool-option" disabled={disabled} onClick={() => { fn(); setMobileGroup(null); }}>
        <span>{icon}</span><span>{label}</span>
      </button>
    );
    return (
      <div ref={elRef} data-tour="toolbar" className="float-panel panel rounded-2xl flex flex-col items-center gap-1 p-1 no-select mobile-tools-rail" style={{ left: pos.x, top: pos.y, width: 48, maxHeight: 'calc(100% - 24px)', overflow: 'visible' }}>
        <div className="w-full flex justify-center py-1 cursor-grab active:cursor-grabbing" style={{ color: 'var(--text-tertiary)', touchAction: 'none' }} onPointerDown={onGrip} onDoubleClick={resetPos} title="Geser (ketuk 2× = reset)"><GripHorizontal size={15} /></div>
        <button type="button" className="icon-btn active" style={{ width: 36, height: 36 }} data-tip={`Tool aktif: ${TOOLS.find((t) => t.id === s.tool)?.label ?? 'Select'}`} onClick={() => setMobileGroup('navigate')}>
          {TOOLS.find((t) => t.id === s.tool)?.icon ?? <MousePointer2 size={18} />}
        </button>
        {MOBILE_GROUPS.map((g) => <button key={g.id} type="button" className={`icon-btn ${mobileGroup === g.id ? 'active' : ''}`} style={{ width: 36, height: 36 }} data-tip={g.label} onClick={() => setMobileGroup(mobileGroup === g.id ? null : g.id)}>{g.icon}</button>)}
        <button type="button" className={`icon-btn ${mobileGroup === 'operations' ? 'active' : ''}`} style={{ width: 36, height: 36 }} data-tip="Komponen & operasi" onClick={() => setMobileGroup(mobileGroup === 'operations' ? null : 'operations')}><MoreHorizontal size={18} /></button>
        {mobileGroup && (
          <div className="mobile-tools-popover panel rounded-xl p-2" style={{ position: 'absolute', top: 6, ...(panelOnLeft ? { right: 54 } : { left: 54 }), width: mobileGroup === 'operations' ? 224 : 196, maxWidth: 'calc(100vw - 76px)', maxHeight: 'min(70vh, 520px)', overflowY: 'auto', zIndex: 90 }}>
            <div className="flex items-center justify-between px-1 pb-1.5 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{MOBILE_GROUPS.find((g) => g.id === mobileGroup)?.label ?? 'Komponen & operasi'}</span>
              <button type="button" className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setMobileGroup(null)} aria-label="Tutup kelompok"><ChevronDown size={14} /></button>
            </div>
            {mobileGroup !== 'operations' ? (
              <div className="grid grid-cols-2 gap-1">
                {MOBILE_GROUPS.find((g) => g.id === mobileGroup)?.tools.map((id) => {
                  const t = TOOLS.find((x) => x.id === id)!;
                  return <button key={id} type="button" className={`mobile-tool-option ${s.tool === id ? 'active' : ''}`} disabled={readOnly && !t.viewOk} onClick={() => mobileTool(id)}><span>{t.icon}</span><span>{t.label.split(' — ')[0].split(' (')[0]}</span><kbd>{t.key}</kbd></button>;
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {operation('Panel komponen', <Package size={15} />, () => s.ui({ showLibrary: !s.showLibrary, mobileSheet: s.showLibrary ? null : 'parts' }))}
                {operation('Magic Generator', <Wand2 size={15} />, () => s.ui({ showWizard: true }), readOnly)}
                {operation('Kolaborasi tim', <UsersRound size={15} />, () => window.dispatchEvent(new Event('intero:openTeam')))}
                {operation(s.lightsOn ? 'Matikan lampu' : 'Nyalakan lampu', s.lightsOn ? <Lightbulb size={15} /> : <LightbulbOff size={15} />, () => s.toggleLights())}
                <div className="my-1 h-px" style={{ background: 'var(--border)' }} />
                {operation('Copy', <Copy size={15} />, () => { s.copy(); toast('Disalin ke clipboard', 'info'); }, readOnly || !hasSel)}
                {operation('Paste', <ClipboardPaste size={15} />, () => s.paste(), readOnly || !s.clipboard.length)}
                {operation('Duplicate', <CopyPlus size={15} />, () => s.duplicateItems(s.selectedIds), readOnly || !hasSel)}
                {operation('Mirror', <FlipHorizontal2 size={15} />, needAdvanced(() => s.ui({ dialog: { kind: 'mirror' } })), readOnly || !hasSel)}
                {operation('Array', <Grid2X2 size={15} />, needAdvanced(() => s.ui({ dialog: { kind: 'array' } })), readOnly || !hasSel)}
                {operation('Align', <AlignHorizontalJustifyCenter size={15} />, () => s.ui({ showProps: true, mobileSheet: 'props' }), readOnly || s.selectedIds.length < 2)}
                {operation('Layers', <LayoutGrid size={15} />, () => s.ui({ mobileSheet: 'layers', showLayers: true }))}
                {operation('Hapus', <Trash2 size={15} />, () => s.removeItems(s.selectedIds), readOnly || !hasSel)}
                <div className="my-1 h-px" style={{ background: 'var(--border)' }} />
                {operation(`Mode ${simple ? 'Simple' : 'Advanced'}`, <Move size={15} />, () => s.setUiMode(simple ? 'advanced' : 'simple'))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return (
    <div ref={elRef} data-tour="toolbar" className="float-panel panel rounded-2xl flex flex-col items-center gap-0.5 p-1 no-select" style={{ left: pos.x, top: pos.y, width: 48, maxHeight: 'calc(100% - 24px)', overflowY: 'auto', overflowX: 'visible' }}>
      <div className="w-full flex justify-center py-1 cursor-grab active:cursor-grabbing" style={{ color: 'var(--text-tertiary)', touchAction: 'none' }} onPointerDown={onGrip} onDoubleClick={resetPos} title="Geser (ketuk 2× = reset)"><GripHorizontal size={16} /></div>
      {tools.map((t) => <Btn key={t.id} icon={t.icon} tip={`${t.label} (${t.key})`} tour={t.tour} active={s.tool === t.id} disabled={readOnly && !t.viewOk} onClick={() => s.setTool(t.id)} />)}
      <div className="w-7 h-px my-1" style={{ background: 'var(--border)' }} />
      <Btn icon={<Package size={18} />} tip="Panel Komponen (K)" tour="library-btn" active={s.showLibrary} onClick={() => s.ui({ showLibrary: !s.showLibrary, mobileSheet: s.showLibrary ? null : 'parts' })} />
      <Btn icon={<Wand2 size={18} />} tip="Magic Layout Wizard" tour="wizard-btn" disabled={readOnly} onClick={() => s.ui({ showWizard: true })} />
      <div className="w-7 h-px my-1" style={{ background: 'var(--border)' }} />
      {!simple && <Btn icon={<Copy size={18} />} tip="Copy (Ctrl+C)" disabled={readOnly || !hasSel} onClick={() => { s.copy(); toast('Disalin ke clipboard', 'info'); }} />}
      {!simple && <Btn icon={<ClipboardPaste size={18} />} tip="Paste (Ctrl+V)" disabled={readOnly || !s.clipboard.length} onClick={() => s.paste()} />}
      <Btn icon={<CopyPlus size={18} />} tip="Duplicate (Ctrl+D)" disabled={readOnly || !hasSel} onClick={() => s.duplicateItems(s.selectedIds)} />
      {!simple && <Btn icon={<FlipHorizontal2 size={18} />} tip="Mirror (Shift+M)" tour="mirror-btn" disabled={readOnly || !hasSel} onClick={needAdvanced(() => s.ui({ dialog: { kind: 'mirror' } }))} />}
      {!simple && <Btn icon={<Grid2X2 size={18} />} tip="Array (Shift+A)" tour="array-btn" disabled={readOnly || !hasSel} onClick={needAdvanced(() => s.ui({ dialog: { kind: 'array' } }))} />}
      {!simple && <Btn icon={<AlignHorizontalJustifyCenter size={18} />} tip="Align (A) — pilih 2+ objek" tour="align-btn" disabled={readOnly || s.selectedIds.length < 2} onClick={needAdvanced(() => s.ui({ tool: 'select' }))} />}
      {!simple && <Btn icon={<LayoutGrid size={18} />} tip="Layers (L)" tour="layers-btn" active={s.showLayers} onClick={() => (window.innerWidth < 768 ? s.ui({ mobileSheet: 'layers' }) : s.ui({ showLayers: !s.showLayers }))} />}
      <Btn icon={<Trash2 size={18} />} tip="Delete (Del)" disabled={readOnly || !hasSel} onClick={() => s.removeItems(s.selectedIds)} />
    </div>
  );
}
