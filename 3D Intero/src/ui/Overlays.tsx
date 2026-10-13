import { useEffect } from 'react';
import { useStore } from '../core/store';
import { LIBRARY, uid } from '../config/library';
import { footprint, r1 } from '../utils/geometry';
import { formatLength } from '../core/units';
import { downloadBlob, safeName } from '../core/projectManager';
import { LibIcon, Info, Check, TriangleAlert, CircleAlert, X } from './icons';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const style = {
    info: { border: 'var(--accent)', Icon: Info },
    success: { border: 'var(--success)', Icon: Check },
    warning: { border: 'var(--warning)', Icon: TriangleAlert },
    error: { border: 'var(--error)', Icon: CircleAlert },
  };
  return (
    <div className="fixed bottom-10 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map((t) => {
        const S = style[t.severity];
        return (
          <div key={t.id} className="card p-3 shadow-xl anim-in pointer-events-auto flex gap-2 items-start" style={{ borderLeft: `4px solid ${S.border}` }}>
            <S.Icon size={15} style={{ color: S.border, flexShrink: 0, marginTop: 1 }} />
            <div className="flex-1 text-xs">
              {t.message}
              {t.actions && (
                <div className="flex gap-1 mt-1.5">
                  {t.actions.map((a) => (
                    <button key={a.label} className="chip active" onClick={() => { a.onClick(); dismiss(t.id); }}>{a.label}</button>
                  ))}
                </div>
              )}
            </div>
            <button className="opacity-50 hover:opacity-100" onClick={() => dismiss(t.id)}><X size={13} /></button>
          </div>
        );
      })}
    </div>
  );
}

const LABEL_COLORS = ['#ef5350', '#ffa726', '#ffd54f', '#66bb6a', '#4fc3f7', '#ba68c8'];

export function ContextMenu() {
  const cm = useStore((s) => s.ui.contextMenu);
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { setUI, removeItems, duplicateItems, updateItem, updateItems, select, setGroups, copySelected, pasteClipboard } = useStore.getState();
  useEffect(() => {
    if (!cm) return;
    const h = () => setUI({ contextMenu: null });
    window.addEventListener('mousedown', h);
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('mousedown', h); window.removeEventListener('keydown', h); };
  }, [cm, setUI]);
  if (!cm) return null;
  const item = cm.itemId ? project.items.find((i) => i.id === cm.itemId) : undefined;
  const close = () => setUI({ contextMenu: null });
  const Item = ({ label, onClick, danger = false, disabled = false, kbd }: { label: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; kbd?: string }) => (
    <button disabled={disabled} className="w-full text-left px-3 py-1.5 text-xs flex justify-between items-center disabled:opacity-40 hover:bg-[var(--bg-hover)]"
      style={{ color: danger ? 'var(--error)' : 'var(--text-primary)' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => { onClick(); close(); }}>
      <span className="flex items-center gap-2">{label}</span>
      {kbd && <span className="kbd ml-4">{kbd}</span>}
    </button>
  );
  const Sep = () => <div className="h-px my-1" style={{ background: 'var(--border)' }} />;
  const Head = ({ children }: { children: React.ReactNode }) => <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{children}</div>;
  const ids = selectedIds.length ? selectedIds : item ? [item.id] : [];
  const siblings = item ? LIBRARY.filter((l) => l.category === item.category && l.kind === item.kind && l.id !== item.subtype).slice(0, 5) : [];
  const x = Math.min(cm.x, window.innerWidth - 250);
  const y = Math.min(cm.y, window.innerHeight - 420);
  return (
    <div className="fixed z-[150] card shadow-2xl py-1 w-60 anim-in max-h-[70vh] overflow-y-auto" style={{ left: x, top: y }} onMouseDown={(e) => e.stopPropagation()}>
      {item ? (
        <>
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider truncate border-b" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}>{item.name}</div>
          <Item label="Properties" onClick={() => setUI({ rightOpen: true, materialStudioOpen: false })} />
          <Item label={item.subtype.startsWith('app_hood') ? 'Hood configurator…' : 'Edit in detail…'} onClick={() => setUI({ modal: item.subtype.startsWith('app_hood') ? 'hood' : 'editor' })} />
          <Item label="Rename" onClick={() => { const n = window.prompt('Rename item', item.name); if (n) updateItem(item.id, { name: n }); }} />
          <Sep />
          <Item label="Copy" kbd="Ctrl+C" onClick={() => copySelected()} />
          <Item label="Paste" kbd="Ctrl+V" onClick={() => pasteClipboard(false)} />
          <Item label="Duplicate" kbd="D" onClick={() => duplicateItems(ids)} />
          <Item label="Rotate 90°" kbd="R" onClick={() => updateItem(item.id, { rotation: ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270 })} />
          <Item label={item.locked ? 'Unlock' : 'Lock position'} onClick={() => updateItem(item.id, { locked: !item.locked })} />
          <Item label="Isolate (hide others)" onClick={() => setUI({ isolateIds: ids })} />
          <Sep />
          <Item label="Group selected" kbd="Ctrl+G" onClick={() => {
            const g = { id: uid('grp'), name: `Group ${(project.groups ?? []).length + 1}` };
            setGroups([...(project.groups ?? []), g]);
            updateItems(ids.map((id) => ({ id, patch: { groupId: g.id } })));
          }} />
          <Item label="Ungroup" onClick={() => updateItems(ids.map((id) => ({ id, patch: { groupId: null } })))} />
          <Item label="Convert to component…" onClick={() => setUI({ modal: 'builder' })} />
          <Head>Color label</Head>
          <div className="flex gap-1.5 px-3 pb-1">
            {LABEL_COLORS.map((c) => (
              <button key={c} className="w-5 h-5 rounded-full border border-black/20 hover:scale-110" style={{ background: c }} onClick={() => { updateItems(ids.map((id) => ({ id, patch: { labelColor: c } }))); close(); }} />
            ))}
          </div>
          {siblings.length > 0 && (
            <>
              <Head>Change type</Head>
              {siblings.map((s) => (
                <Item key={s.id} label={<><LibIcon id={s.id} size={14} /> {s.name}</>} onClick={() => updateItem(item.id, { subtype: s.id, name: s.name, config: { ...item.config, ...s.config, accessories: [...(s.config.accessories ?? [])], materials: item.config.materials } })} />
              ))}
            </>
          )}
          <Sep />
          <Item label="Export selected (JSON)" onClick={() => downloadBlob(`${safeName(project.name)}_selection.json`, JSON.stringify(project.items.filter((i) => ids.includes(i.id)), null, 2), 'application/json')} />
          <Item label="Delete" kbd="Del" danger onClick={() => removeItems(ids)} />
        </>
      ) : (
        <>
          <Item label="Select all" kbd="Ctrl+A" onClick={() => select(project.items.map((i) => i.id))} />
          <Item label="Deselect" kbd="Esc" onClick={() => select([])} />
          <Item label="Show all (clear isolate)" onClick={() => setUI({ isolateIds: null })} />
          <Item label="Fit all" kbd="F" onClick={() => useStore.getState().requestFit()} />
          <Sep />
          <Item label="Toggle grid" onClick={() => useStore.getState().toggleUI('showGrid')} />
          <Item label="Toggle dimensions" onClick={() => useStore.getState().toggleUI('showDims')} />
          <Item label="Work triangle overlay" onClick={() => useStore.getState().toggleUI('showTriangle')} />
          <Sep />
          <Item label="New project…" kbd="Ctrl+N" onClick={() => setUI({ modal: 'wizard' })} />
        </>
      )}
    </div>
  );
}

export function StatusBar() {
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const issues = useStore((s) => s.issues);
  const ui = useStore((s) => s.ui);
  const past = useStore((s) => s.past.length);
  const { setSettings } = useStore.getState();
  const item = selectedIds.length === 1 ? project.items.find((i) => i.id === selectedIds[0]) : undefined;
  const cabinets = project.items.filter((i) => i.kind === 'cabinet').length;
  const running = r1(project.items.filter((i) => i.kind === 'cabinet' && i.category !== 'wall').reduce((s, i) => s + i.width, 0) / 100);
  const unit = project.settings.unit;
  const issueColor = issues.some((i) => i.severity === 'error') ? 'var(--error)' : issues.length ? 'var(--warning)' : 'var(--success)';
  return (
    <div className="h-7 flex items-center gap-4 px-3 text-[11px] shrink-0 select-none border-t" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
      <span className="flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />{ui.loading ? ui.loading : 'Ready'} · <span className="capitalize">{ui.tool}</span></span>
      <span><b>{cabinets}</b> cabinets · <b>{project.items.length}</b> items · {running} m run</span>
      <span>Room {formatLength(project.room.width, unit)} × {formatLength(project.room.depth, unit)} · ceiling {formatLength(project.room.ceilingHeight, unit)}</span>
      {item && (
        <span className="font-mono" style={{ color: 'var(--accent)' }}>
          {item.name}: {formatLength(item.width, unit)} W × {formatLength(item.height, unit)} H × {formatLength(item.depth, unit)} D @ ({r1(footprint(item).x)}, {r1(footprint(item).y)}) elev {item.elevation}
        </span>
      )}
      <span className="flex-1" />
      <span style={{ color: issueColor }}>{issues.length ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : 'design valid'}</span>
      <span>{past} undo steps</span>
      <span className="flex items-center gap-1">
        units
        {(['cm', 'mm', 'inch'] as const).map((u) => (
          <button key={u} className={`px-1 rounded ${unit === u ? 'bg-[var(--bg-selected)] text-[var(--accent)]' : ''}`} onClick={() => setSettings({ unit: u })}>{u}</button>
        ))}
      </span>
      <span>{ui.snap ? 'SNAP' : 'snap off'}</span>
      <span>autosave on</span>
    </div>
  );
}

export function LoadingOverlay() {
  const loading = useStore((s) => s.ui.loading);
  const progress = useStore((s) => s.ui.loadingProgress);
  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex flex-col items-center justify-center gap-3">
      <div className="spinner" />
      <div className="text-sm text-white">{loading}</div>
      <div className="w-56 h-1.5 rounded-full bg-white/20 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--brand-light)' }} />
      </div>
    </div>
  );
}
