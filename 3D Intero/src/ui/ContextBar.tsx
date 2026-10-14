import { useEffect, useState } from 'react';
import { useStore } from '../core/store';
import { footprint, center, r1 } from '../utils/geometry';
import { getColor } from '../config/materials';
import { Lock, LockOpen, Focus, AirVent } from './icons';

function NumIn({ label, value, onCommit, w = 'w-16' }: { label: string; value: number; onCommit: (v: number) => void; w?: string }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <label className="flex items-center gap-1 text-[11px]">
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <input className={`input ${w} py-0.5! font-mono text-[11px]!`} value={txt} onChange={(e) => setTxt(e.target.value)}
        onBlur={() => { const v = parseFloat(txt); if (!Number.isNaN(v)) onCommit(v); else setTxt(String(value)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </label>
  );
}

export default function ContextBar() {
  const ui = useStore((s) => s.ui);
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { select, updateItem, updateItems, setUI, toast, setItems } = useStore.getState();
  const sel = selectedIds.length === 1 ? project.items.find((i) => i.id === selectedIds[0]) : undefined;
  const Sep = () => <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />;
  const isHood = sel?.subtype.startsWith('app_hood');
  const cooktop = isHood ? project.items.find((c) => c.subtype.startsWith('app_cooktop')) : undefined;
  const ckTop = cooktop ? cooktop.elevation + cooktop.height : null;

  const rotateSel = (deg: number) => {
    if (!selectedIds.length) return;
    updateItems(selectedIds.map((id) => { const it = project.items.find((i) => i.id === id)!; return { id, patch: { rotation: (((it.rotation + deg) % 360 + 360) % 360) as 0 | 90 | 180 | 270 } }; }));
  };

  const show =
    (ui.tool === 'select' && selectedIds.length > 0) ||
    ui.tool === 'move' || ui.tool === 'rotate' || ui.tool === 'paint' || ui.tool === 'measure';
  if (!show) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[min(920px,calc(100%-16px))] flex items-center gap-1 px-2 py-1 rounded-lg border shadow-lg overflow-x-auto text-xs" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
      {ui.tool === 'select' && selectedIds.length > 0 && (
        <>
          <button className="btn py-0.5!" onClick={() => select(project.items.map((i) => i.id))}>Select All</button>
          <button className="btn py-0.5!" onClick={() => select([])}>Deselect</button>
          <button className="btn py-0.5!" disabled={!sel} onClick={() => sel && select(project.items.filter((i) => i.subtype === sel.subtype).map((i) => i.id))}>Select Similar</button>
          <Sep />
          <button className={`btn py-0.5! ${ui.isolateIds ? 'bg-[var(--bg-selected)]' : ''}`} disabled={!selectedIds.length && !ui.isolateIds} onClick={() => setUI({ isolateIds: ui.isolateIds ? null : selectedIds })}><Focus size={12} className="inline mr-1" />{ui.isolateIds ? 'Show all' : 'Isolate'}</button>
          <button className="btn py-0.5!" disabled={!selectedIds.length} onClick={() => updateItems(selectedIds.map((id) => ({ id, patch: { locked: !project.items.find((i) => i.id === id)?.locked } })))}>
            {sel?.locked ? <LockOpen size={12} className="inline mr-1" /> : <Lock size={12} className="inline mr-1" />}{sel?.locked ? 'Unlock' : 'Lock'}
          </button>
        </>
      )}

      {ui.tool === 'move' && (
        sel ? (
          <>
            <NumIn label="X" value={sel.x} onCommit={(v) => updateItem(sel.id, { x: r1(v) })} />
            <NumIn label="Y" value={sel.y} onCommit={(v) => updateItem(sel.id, { y: r1(v) })} />
            <NumIn label="Z" value={sel.elevation} onCommit={(v) => updateItem(sel.id, { elevation: Math.max(0, r1(v)) })} />
            <span className="opacity-50">cm</span>
            <Sep />
            <span style={{ color: 'var(--text-tertiary)' }}>Nudge</span>
            {[1, 10].map((n) => (
              <span key={n} className="flex gap-0.5">
                <button className="chip" title={`Z +${n}`} onClick={() => updateItem(sel.id, { elevation: r1(sel.elevation + n) })}>Z+{n}</button>
                <button className="chip" title={`Z −${n}`} onClick={() => updateItem(sel.id, { elevation: Math.max(0, r1(sel.elevation - n)) })}>Z−{n}</button>
              </span>
            ))}
            <Sep />
            <span className="opacity-60 hidden lg:inline">Drag arrows: red X · green Z-up · blue Y · scroll = elevation · Shift = axis lock</span>
          </>
        ) : <span className="opacity-60">Select an object, then drag it or its XYZ arrows</span>
      )}

      {ui.tool === 'rotate' && (
        <>
          <span style={{ color: 'var(--text-tertiary)' }}>Rotation {sel ? `${sel.rotation}°` : '—'}</span>
          <button className="btn py-0.5!" onClick={() => rotateSel(90)}>90° CW</button>
          <button className="btn py-0.5!" onClick={() => rotateSel(-90)}>90° CCW</button>
          <button className="btn py-0.5!" onClick={() => rotateSel(180)}>180°</button>
          <button className="btn py-0.5!" disabled={!sel} onClick={() => sel && updateItem(sel.id, { rotation: 0 })}>Reset</button>
          <span className="opacity-60 ml-2">Snap 90° · Q / Shift+Q rotate</span>
        </>
      )}

      {ui.tool === 'paint' && (
        <>
          <span style={{ color: 'var(--text-tertiary)' }}>Material</span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>
            <i className="w-3.5 h-3.5 rounded" style={{ background: getColor(project.materials.doorColor).hex }} /> {getColor(project.materials.doorColor).name}
          </span>
          <span className="opacity-60">Click a cabinet to apply · Eyedropper (I) to sample</span>
          <button className="btn py-0.5!" onClick={() => setUI({ materialStudioOpen: true, rightOpen: true })}>Open Material Studio</button>
        </>
      )}

      {ui.tool === 'measure' && <span className="opacity-60">Click two points on the 2D plan · Esc to exit</span>}

      {isHood && sel && (
        <>
          <Sep />
          <span className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}><AirVent size={13} /> Hood elev {sel.elevation} cm{ckTop !== null ? ` · ${r1(sel.elevation - ckTop)} above cooktop` : ''}</span>
          {ckTop !== null && [55, 65, 75, 85].map((d) => (
            <button key={d} className={`chip ${Math.abs(sel.elevation - (ckTop + d)) < 0.5 ? 'active' : ''}`} onClick={() => updateItem(sel.id, { elevation: r1(ckTop + d) })}>+{d}</button>
          ))}
          {cooktop && (
            <button className="btn py-0.5!" onClick={() => {
              const cc = center(footprint(cooktop)); const fh = footprint(sel);
              updateItem(sel.id, sel.rotation % 180 === 0 ? { x: r1(cc.x - fh.w / 2) } : { y: r1(cc.y - fh.h / 2) });
              toast({ severity: 'success', message: 'Hood centred over cooktop', ttl: 1500 });
            }}>Center on cooktop</button>
          )}
        </>
      )}
      {sel && sel.category === 'wall' && sel.kind === 'cabinet' && (
        <>
          <Sep />
          <span style={{ color: 'var(--text-tertiary)' }}>Wall cab.</span>
          <button className="btn py-0.5!" onClick={() => updateItem(sel.id, { elevation: 135 })}>Bottom @135</button>
          <button className="btn py-0.5!" onClick={() => {
            const walls = project.items.filter((i) => i.category === 'wall' && i.kind === 'cabinet');
            const top = Math.max(...walls.map((w) => w.elevation + w.height));
            setItems(project.items.map((i) => (i.category === 'wall' && i.kind === 'cabinet' ? { ...i, elevation: r1(top - i.height) } : i)));
          }}>Align all tops</button>
        </>
      )}
    </div>
  );
}
