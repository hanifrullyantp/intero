import { useEffect, useState } from 'react';
import { Check, ChevronDown, Crosshair, Focus, Minus, Plus, RotateCcw } from 'lucide-react';
import { useStore } from '../../store';
import type { TopSubMode, ViewMode } from '../../types';
import { sceneRef, liveBus } from './Viewport';
import { timeAgo } from '../../lib/utils';

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'perspective', label: 'Perspective (3D)' }, { id: 'top', label: 'Top (2D plan)' }, { id: 'front', label: 'Front' }, { id: 'back', label: 'Back' }, { id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }, { id: 'iso', label: 'Isometric' },
];
const SUBS: { id: TopSubMode; label: string; hint: string }[] = [
  { id: 'all', label: 'Semua (overlay)', hint: 'Kabinet atas opacity 40%' }, { id: 'base', label: 'Base Only', hint: 'Hanya kabinet bawah' }, { id: 'wall', label: 'Wall Only', hint: 'Hanya kabinet atas' }, { id: 'split', label: 'Split Stacked', hint: 'Wall plan atas, base plan bawah' },
];

export function ViewControls() {
  const s = useStore();
  const [open, setOpen] = useState<null | 'view' | 'sub'>(null);
  const [zoom, setZoom] = useState(100);
  useEffect(() => { const t = setInterval(() => { const z = sceneRef.current?.zoomPercent(); if (z !== undefined) setZoom(z); }, 400); return () => clearInterval(t); }, []);
  const simple = s.uiMode === 'simple';
  const cur = VIEWS.find((v) => v.id === s.viewMode)!;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 z-20" style={{ bottom: 12 }}>
      {open && <div className="fixed inset-0 z-10" onMouseDown={() => setOpen(null)} />}
      <div className="panel rounded-xl flex items-center gap-1 p-1 relative z-20">
        {simple ? (
          <div className="seg"><button className={s.viewMode !== 'top' ? 'active' : ''} onClick={() => s.setViewMode('perspective')}>3D</button><button className={s.viewMode === 'top' ? 'active' : ''} onClick={() => s.setViewMode('top')}>2D</button></div>
        ) : (
          <div className="relative">
            <button type="button" className="btn btn-ghost btn-sm" data-tour="view-btn" onClick={() => setOpen(open === 'view' ? null : 'view')}>{cur.label}<ChevronDown size={14} /></button>
            {open === 'view' && <div className="menu" style={{ top: 'auto', bottom: 'calc(100% + 6px)', minWidth: 200 }}>{VIEWS.map((v) => <button key={v.id} className="menu-item" onClick={() => { s.setViewMode(v.id); setOpen(null); }}><span style={{ width: 14 }}>{v.id === s.viewMode && <Check size={14} />}</span>{v.label}<span className="kbd">{v.id === 'perspective' ? '1' : v.id === 'top' ? '2' : v.id === 'front' ? '3' : v.id === 'right' ? '4' : v.id === 'iso' ? '5' : ''}</span></button>)}</div>}
          </div>
        )}
        {s.viewMode === 'top' && (
          <div className="relative">
            <button type="button" className="btn btn-ghost btn-sm" data-tour="sub-btn" onClick={() => setOpen(open === 'sub' ? null : 'sub')} style={{ color: 'var(--brand-primary)' }}>{SUBS.find((x) => x.id === s.topSubMode)!.label}<ChevronDown size={14} /></button>
            {open === 'sub' && <div className="menu" style={{ top: 'auto', bottom: 'calc(100% + 6px)', minWidth: 230 }}>{SUBS.map((v) => <button key={v.id} className="menu-item" onClick={() => { s.setTopSubMode(v.id); setOpen(null); }}><span style={{ width: 14 }}>{v.id === s.topSubMode && <Check size={14} />}</span><span className="flex flex-col"><span>{v.label}</span><span className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>{v.hint}</span></span></button>)}</div>}
          </div>
        )}
        <div className="divider-v" />
        <button className="icon-btn" style={{ width: 28, height: 28 }} data-tip="Zoom out" data-tip-side="top" onClick={() => s.ui({ zoomRequest: { dir: -1, n: s.zoomRequest.n + 1 } })}><Minus size={14} /></button>
        <span className="mono text-[11px] w-11 text-center" style={{ color: 'var(--text-secondary)' }}>{zoom}%</span>
        <button className="icon-btn" style={{ width: 28, height: 28 }} data-tip="Zoom in" data-tip-side="top" onClick={() => s.ui({ zoomRequest: { dir: 1, n: s.zoomRequest.n + 1 } })}><Plus size={14} /></button>
        <div className="divider-v" />
        <button className="icon-btn" style={{ width: 28, height: 28 }} data-tip="Reset View" data-tip-side="top" onClick={() => s.ui({ resetViewRequest: s.resetViewRequest + 1 })}><RotateCcw size={14} /></button>
        <button className="icon-btn" style={{ width: 28, height: 28 }} data-tip="Focus Selected (F)" data-tip-side="top" onClick={() => s.ui({ focusRequest: s.focusRequest + 1 })} disabled={!s.selectedIds.length}><Focus size={14} /></button>
      </div>
    </div>
  );
}

export function StatusBar() {
  const s = useStore();
  const sel = s.items.filter((i) => s.selectedIds.includes(i.id));
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 5000); return () => clearInterval(t); }, []);
  useEffect(() => liveBus.subscribe(() => tick((x) => x + 1)), []);
  const mw = liveBus.mouse;
  const fps = liveBus.fps;
  return (
    <footer className="flex items-center gap-4 px-3 text-[11px] shrink-0 mono" style={{ height: 'var(--status-h)', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
      <span className="flex items-center gap-1"><Crosshair size={11} />{mw ? `X ${(mw.x / 10).toFixed(1)}  Y ${(mw.y / 10).toFixed(1)}  Z ${(mw.z / 10).toFixed(1)} cm` : 'X —  Y —  Z —'}</span>
      {sel.length === 1 && <span>{sel[0].name}: {(sel[0].dims.w / 10).toFixed(0)} × {(sel[0].dims.h / 10).toFixed(0)} × {(sel[0].dims.d / 10).toFixed(0)} cm</span>}
      {sel.length > 1 && <span>{sel.length} objek terpilih</span>}
      <span className="hidden sm:inline">Tool: {s.tool}</span>
      <span className="flex-1" />
      <span className="hidden md:inline">{fps} FPS</span>
      <span className="flex items-center gap-1" style={{ color: s.dirty ? 'var(--text-tertiary)' : 'var(--brand-primary)' }}>
        {!s.dirty && <Check size={12} />}{s.dirty ? 'Menyimpan…' : s.lastSavedAt ? `Tersimpan otomatis ${timeAgo(s.lastSavedAt)}` : 'Belum tersimpan'}
      </span>
    </footer>
  );
}
