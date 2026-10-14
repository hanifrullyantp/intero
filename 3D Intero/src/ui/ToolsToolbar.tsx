import { useRef, useState } from 'react';
import { useStore, type ToolId } from '../core/store';
import { footprint } from '../utils/geometry';
import { uid } from '../config/library';
import {
  MousePointer2, Hand, Orbit, ZoomIn, Move, RotateCw, ArrowLeftRight, LayoutGrid, AlignCenter,
  Ruler, Scissors, PaintBucket, Pipette, Copy, Clipboard, CopyPlus, Trash2, Group, Hammer, X, Scan, type LucideIcon,
} from './icons';

interface ToolDef { id: ToolId | 'group' | 'component' | 'copy' | 'paste' | 'dup' | 'del'; icon: LucideIcon; label: string; kbd: string; adv?: boolean; sub?: { label: string; run: () => void }[] }

export default function ToolsToolbar() {
  const tool = useStore((s) => s.ui.tool);
  const uiMode = useStore((s) => s.ui.uiMode);
  const selectedIds = useStore((s) => s.selectedIds);
  const project = useStore((s) => s.project);
  const { setUI, updateItems, copySelected, pasteClipboard, duplicateItems, removeItems, requireAdvanced, toast, select, setGroups } = useStore.getState();
  const [mx, setMx] = useState(''); const [my, setMy] = useState(''); const [mz, setMz] = useState('');
  const [angle, setAngle] = useState('90');
  const [flyout, setFlyout] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);

  const doMirror = () => {
    if (!selectedIds.length) return toast({ severity: 'warning', message: 'Select items to mirror' });
    updateItems(selectedIds.map((id) => {
      const it = project.items.find((i) => i.id === id)!;
      const f = footprint(it);
      return { id, patch: { x: Math.round((project.room.width - f.x - f.w) * 10) / 10, rotation: ((360 - it.rotation) % 360) as 0 | 90 | 180 | 270 } };
    }));
    toast({ severity: 'success', message: 'Mirrored across room centre', ttl: 2000 });
  };
  const selectSimilar = () => {
    const first = project.items.find((i) => i.id === selectedIds[0]);
    if (!first) return toast({ severity: 'warning', message: 'Select an item first' });
    select(project.items.filter((i) => i.subtype === first.subtype).map((i) => i.id));
  };
  const groupSel = () => {
    if (!selectedIds.length) return toast({ severity: 'warning', message: 'Select items first' });
    const g = { id: uid('grp'), name: `Group ${(project.groups ?? []).length + 1}` };
    setGroups([...(project.groups ?? []), g]);
    updateItems(selectedIds.map((id) => ({ id, patch: { groupId: g.id } })));
    toast({ severity: 'success', message: `${selectedIds.length} items grouped`, ttl: 1500 });
  };

  const GROUPS: ToolDef[][] = [
    [
      { id: 'select', icon: MousePointer2, label: 'Select', kbd: 'V', sub: [{ label: 'Select similar', run: selectSimilar }, { label: 'Select all', run: () => select(project.items.map((i) => i.id)) }, { label: 'Deselect', run: () => select([]) }] },
    ],
    [
      { id: 'pan', icon: Hand, label: 'Pan', kbd: 'H' },
      { id: 'orbit', icon: Orbit, label: 'Orbit (3D)', kbd: 'O' },
      { id: 'zoom', icon: ZoomIn, label: 'Zoom — click in, Alt+click out', kbd: 'Z' },
    ],
    [
      { id: 'move', icon: Move, label: 'Move — XYZ gizmo, scroll = elevation', kbd: 'M', sub: [{ label: 'Move (free)', run: () => setUI({ tool: 'move' }) }, { label: 'Move + duplicate (hold Ctrl)', run: () => { setUI({ tool: 'move' }); toast({ severity: 'info', message: 'Hold Ctrl while dragging to duplicate', ttl: 2000 }); } }, { label: 'Snap off while moving (hold Alt)', run: () => setUI({ tool: 'move', snap: false }) }] },
      { id: 'rotate', icon: RotateCw, label: 'Rotate', kbd: 'R' },
    ],
    [
      { id: 'mirror', icon: ArrowLeftRight, label: 'Mirror', kbd: '⇧M', adv: true },
      { id: 'array', icon: LayoutGrid, label: 'Array (X / Y / Z)', kbd: '⇧A', adv: true },
      { id: 'align', icon: AlignCenter, label: 'Align & distribute (incl. Z)', kbd: 'A', adv: true },
    ],
    [
      { id: 'copy', icon: Copy, label: 'Copy', kbd: 'Ctrl+C' },
      { id: 'paste', icon: Clipboard, label: 'Paste', kbd: 'Ctrl+V' },
      { id: 'dup', icon: CopyPlus, label: 'Duplicate', kbd: 'Ctrl+D' },
      { id: 'del', icon: Trash2, label: 'Delete', kbd: 'Del' },
    ],
    [
      { id: 'measure', icon: Ruler, label: 'Tape measure', kbd: 'T', sub: [{ label: 'Tape measure', run: () => setUI({ tool: 'measure', viewMode: useStore.getState().ui.viewMode === '3d' ? 'split' : useStore.getState().ui.viewMode }) }, { label: 'Toggle dimensions', run: () => useStore.getState().toggleUI('showDims') }] },
      { id: 'section', icon: Scissors, label: 'Section (X-ray)', kbd: '⌘/', adv: true },
    ],
    [
      { id: 'paint', icon: PaintBucket, label: 'Paint door colour', kbd: 'B' },
      { id: 'eyedropper', icon: Pipette, label: 'Eyedropper', kbd: 'I' },
    ],
    [
      { id: 'group', icon: Group, label: 'Group selected', kbd: 'Ctrl+G', adv: true },
      { id: 'component', icon: Hammer, label: 'Make component', kbd: 'Ctrl+⇧K', adv: true },
    ],
  ];

  const run = (t: ToolDef) => {
    if (t.adv && !requireAdvanced(t.label)) return;
    switch (t.id) {
      case 'orbit': setUI({ viewMode: '3d', tool: 'select' }); return;
      case 'mirror': return doMirror();
      case 'array': return setUI({ modal: 'array' });
      case 'align': return setUI({ modal: 'align' });
      case 'section': setUI({ openView: useStore.getState().ui.openView === 'xray' ? 'normal' : 'xray' }); return;
      case 'copy': return copySelected();
      case 'paste': return pasteClipboard(false);
      case 'dup': return selectedIds.length ? duplicateItems(selectedIds) : toast({ severity: 'warning', message: 'Select items first' });
      case 'del': return selectedIds.length ? removeItems(selectedIds) : undefined;
      case 'group': return groupSel();
      case 'component': return setUI({ modal: 'builder' });
      case 'measure': setUI({ tool: 'measure', viewMode: useStore.getState().ui.viewMode === '3d' ? 'split' : useStore.getState().ui.viewMode }); return;
      default:
        setUI({ tool: t.id as ToolId });
        if (t.id === 'move' && selectedIds.length) toast({ severity: 'info', message: 'Drag object or grab XYZ arrows · green = up/down · scroll = elevation', ttl: 2500 });
    }
  };

  const doMovePrecise = () => {
    const dx = parseFloat(mx) || 0; const dy = parseFloat(my) || 0; const dz = parseFloat(mz) || 0;
    if (!selectedIds.length) return toast({ severity: 'warning', message: 'Select items first' });
    updateItems(selectedIds.map((id) => {
      const it = project.items.find((i) => i.id === id)!;
      return { id, patch: { x: Math.round((it.x + dx) * 10) / 10, y: Math.round((it.y + dy) * 10) / 10, elevation: Math.max(0, Math.round((it.elevation + dz) * 10) / 10) } };
    }));
    setMx(''); setMy(''); setMz('');
  };
  const doRotate = (a?: number) => {
    const deg = a ?? parseFloat(angle) ?? 0;
    const step = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
    if (!selectedIds.length) return toast({ severity: 'warning', message: 'Select items first' });
    updateItems(selectedIds.map((id) => {
      const it = project.items.find((i) => i.id === id)!;
      return { id, patch: { rotation: ((it.rotation + step) % 360) as 0 | 90 | 180 | 270 } };
    }));
  };

  const simpleTools = new Set(['select', 'pan', 'move', 'rotate', 'measure', 'del', 'dup']);
  const visible = (t: ToolDef) => uiMode === 'advanced' || simpleTools.has(t.id);
  const isActive = (t: ToolDef) => tool === t.id;

  return (
    <div className="flex flex-col items-center gap-0.5 py-1 h-full overflow-y-auto overflow-x-visible relative" style={{ background: 'var(--bg-panel)' }}>
      {GROUPS.map((grp, gi) => {
        const ts = grp.filter(visible);
        if (!ts.length) return null;
        return (
          <div key={gi} className="flex flex-col items-center gap-0.5">
            {gi > 0 && <div className="w-6 h-px my-1" style={{ background: 'var(--border)' }} />}
            {ts.map((t) => (
              <div key={t.id} className="relative">
                <button
                  className={`tool-btn ${isActive(t) ? 'active' : ''}`}
                  title={`${t.label} (${t.kbd})${t.sub ? ' · long-press for options' : ''}`}
                  onMouseDown={() => { if (t.sub) pressTimer.current = window.setTimeout(() => setFlyout(t.id), 350); }}
                  onMouseUp={() => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } }}
                  onMouseLeave={() => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } }}
                  onClick={() => { if (flyout) return; run(t); }}
                  onContextMenu={(e) => { if (t.sub) { e.preventDefault(); setFlyout(t.id); } }}
                >
                  <t.icon size={18} strokeWidth={1.75} />
                  {t.sub && <span className="absolute right-0.5 bottom-0.5 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px]" style={{ borderBottomColor: 'var(--text-tertiary)' }} />}
                </button>
                {flyout === t.id && t.sub && (
                  <div className="absolute left-11 top-0 z-50 card py-1 min-w-48 shadow-xl anim-in" onMouseLeave={() => setFlyout(null)}>
                    <div className="flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t.label}<button onClick={() => setFlyout(null)}><X size={11} /></button></div>
                    {t.sub.map((s) => (
                      <button key={s.label} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]" onClick={() => { s.run(); setFlyout(null); }}>{s.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {(tool === 'move' || tool === 'rotate') && selectedIds.length > 0 && (
        <div className="card p-1.5 mt-2 w-11 flex flex-col gap-1 items-stretch">
          {tool === 'move' && (
            <>
              <span className="label text-[8px]! text-center">Δ cm</span>
              <input className="input px-1! text-[10px]! font-mono" placeholder="X" value={mx} onChange={(e) => setMx(e.target.value)} />
              <input className="input px-1! text-[10px]! font-mono" placeholder="Y" value={my} onChange={(e) => setMy(e.target.value)} />
              <input className="input px-1! text-[10px]! font-mono" placeholder="Z" value={mz} onChange={(e) => setMz(e.target.value)} title="ΔZ elevation" />
              <button className="btn-primary px-1! text-[10px]!" onClick={doMovePrecise} title="Apply relative move"><Scan size={12} className="mx-auto" /></button>
            </>
          )}
          {tool === 'rotate' && (
            <>
              <span className="label text-[8px]! text-center">deg</span>
              <input className="input px-1! text-[10px]! font-mono" value={angle} onChange={(e) => setAngle(e.target.value)} />
              <button className="btn-primary px-1! text-[10px]!" onClick={() => doRotate()}>OK</button>
              {[90, 180, 270].map((a) => <button key={a} className="chip text-center" onClick={() => doRotate(a)}>{a}°</button>)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ArrayModal() {
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { setUI, setItems, select, toast } = useStore.getState();
  const [count, setCount] = useState(3);
  const [spacing, setSpacing] = useState(60);
  const [dir, setDir] = useState<'x' | 'y' | 'z'>('x');
  const [mode, setMode] = useState<'linear' | 'grid3d'>('linear');
  const [cy, setCy] = useState(1); const [cz, setCz] = useState(1); const [sy, setSy] = useState(60); const [sz, setSz] = useState(30);
  const apply = () => {
    const src = project.items.filter((i) => selectedIds.includes(i.id));
    if (!src.length) return toast({ severity: 'warning', message: 'Select items first' });
    const clones: typeof src = [];
    const mk = (it: (typeof src)[number], dx: number, dy: number, dz: number) => {
      const c = JSON.parse(JSON.stringify(it)) as (typeof src)[number];
      c.id = uid();
      c.x = Math.round((it.x + dx) * 10) / 10; c.y = Math.round((it.y + dy) * 10) / 10; c.elevation = Math.max(0, Math.round((it.elevation + dz) * 10) / 10);
      return c;
    };
    if (mode === 'linear') {
      for (let k = 1; k <= count; k++) for (const it of src) clones.push(mk(it, dir === 'x' ? spacing * k : 0, dir === 'y' ? spacing * k : 0, dir === 'z' ? spacing * k : 0));
    } else {
      for (let a = 0; a < count; a++) for (let b = 0; b < cy; b++) for (let c = 0; c < cz; c++) {
        if (!a && !b && !c) continue;
        for (const it of src) clones.push(mk(it, spacing * a, sy * b, sz * c));
      }
    }
    setItems([...project.items, ...clones]);
    setUI({ modal: null });
    select(clones.map((c) => c.id));
    toast({ severity: 'success', message: `${clones.length} copies created` });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && setUI({ modal: null })}>
      <div className="card w-full max-w-sm p-4 anim-in">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><LayoutGrid size={16} /> Array Tool</h2>
        <div className="flex gap-1 mb-3">
          <button className={`chip ${mode === 'linear' ? 'active' : ''}`} onClick={() => setMode('linear')}>Linear</button>
          <button className={`chip ${mode === 'grid3d' ? 'active' : ''}`} onClick={() => setMode('grid3d')}>Grid 3D</button>
        </div>
        <div className="flex flex-col gap-2 text-xs">
          {mode === 'linear' && (
            <div><span className="opacity-70">Direction</span>
              <div className="flex gap-1 mt-1">
                <button className={`chip ${dir === 'x' ? 'active' : ''}`} onClick={() => setDir('x')}>X horizontal</button>
                <button className={`chip ${dir === 'y' ? 'active' : ''}`} onClick={() => setDir('y')}>Y depth</button>
                <button className={`chip ${dir === 'z' ? 'active' : ''}`} onClick={() => setDir('z')}>Z vertical</button>
              </div>
            </div>
          )}
          <label>Count {mode === 'grid3d' ? '(X)' : ''}<input type="number" className="input mt-1" value={count} min={1} max={20} onChange={(e) => setCount(parseInt(e.target.value) || 1)} /></label>
          <label>Spacing {mode === 'grid3d' ? 'X' : ''} (cm)<input type="number" className="input mt-1" value={spacing} onChange={(e) => setSpacing(parseFloat(e.target.value) || 0)} /></label>
          {mode === 'grid3d' && (
            <div className="grid grid-cols-2 gap-2">
              <label>Count Y<input type="number" className="input mt-1" value={cy} min={1} max={10} onChange={(e) => setCy(parseInt(e.target.value) || 1)} /></label>
              <label>Spacing Y<input type="number" className="input mt-1" value={sy} onChange={(e) => setSy(parseFloat(e.target.value) || 0)} /></label>
              <label>Count Z<input type="number" className="input mt-1" value={cz} min={1} max={10} onChange={(e) => setCz(parseInt(e.target.value) || 1)} /></label>
              <label>Spacing Z<input type="number" className="input mt-1" value={sz} onChange={(e) => setSz(parseFloat(e.target.value) || 0)} /></label>
            </div>
          )}
          <div className="opacity-60">{mode === 'linear' ? `Total span: ${(count * spacing).toFixed(0)} cm` : `${count}×${cy}×${cz} grid`} · {selectedIds.length} source item(s) · e.g. shelves: Z, spacing 30</div>
        </div>
        <div className="flex justify-end gap-2 mt-4"><button className="btn" onClick={() => setUI({ modal: null })}>Cancel</button><button className="btn-primary" onClick={apply}>Apply</button></div>
      </div>
    </div>
  );
}

export function AlignModal() {
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { setUI, updateItems, toast } = useStore.getState();
  const items = project.items.filter((i) => selectedIds.includes(i.id));
  const align = (mode: string) => {
    if (items.length < 2 && !['floor'].includes(mode)) return toast({ severity: 'warning', message: 'Select 2+ items to align' });
    if (!items.length) return;
    const fs = items.map((i) => footprint(i));
    let patches: { id: string; patch: Partial<{ x: number; y: number; width: number; height: number; depth: number; elevation: number }> }[] = [];
    const r = (v: number) => Math.round(v * 10) / 10;
    if (mode === 'left') { const v = Math.min(...fs.map((f) => f.x)); patches = items.map((it, k) => ({ id: it.id, patch: { x: r(v + (it.x - fs[k].x)) } })); }
    if (mode === 'right') { const v = Math.max(...fs.map((f) => f.x + f.w)); patches = items.map((it, k) => ({ id: it.id, patch: { x: r(v - fs[k].w + (it.x - fs[k].x)) } })); }
    if (mode === 'hcenter') { const v = (Math.min(...fs.map((f) => f.x)) + Math.max(...fs.map((f) => f.x + f.w))) / 2; patches = items.map((it, k) => ({ id: it.id, patch: { x: r(v - fs[k].w / 2 + (it.x - fs[k].x)) } })); }
    if (mode === 'back') { const v = Math.min(...fs.map((f) => f.y)); patches = items.map((it, k) => ({ id: it.id, patch: { y: r(v + (it.y - fs[k].y)) } })); }
    if (mode === 'front') { const v = Math.max(...fs.map((f) => f.y + f.h)); patches = items.map((it, k) => ({ id: it.id, patch: { y: r(v - fs[k].h + (it.y - fs[k].y)) } })); }
    if (mode === 'dcenter') { const v = (Math.min(...fs.map((f) => f.y)) + Math.max(...fs.map((f) => f.y + f.h))) / 2; patches = items.map((it, k) => ({ id: it.id, patch: { y: r(v - fs[k].h / 2 + (it.y - fs[k].y)) } })); }
    // Z (vertical)
    if (mode === 'top') { const v = Math.max(...items.map((i) => i.elevation + i.height)); patches = items.map((it) => ({ id: it.id, patch: { elevation: r(v - it.height) } })); }
    if (mode === 'bottom') { const v = Math.min(...items.map((i) => i.elevation)); patches = items.map((it) => ({ id: it.id, patch: { elevation: r(v) } })); }
    if (mode === 'middle') { const v = (Math.min(...items.map((i) => i.elevation)) + Math.max(...items.map((i) => i.elevation + i.height))) / 2; patches = items.map((it) => ({ id: it.id, patch: { elevation: r(Math.max(0, v - it.height / 2)) } })); }
    if (mode === 'floor') patches = items.map((it) => ({ id: it.id, patch: { elevation: 0 } }));
    if (mode === 'distH') {
      const order = items.map((it, k) => ({ it, f: fs[k] })).sort((a, b) => a.f.x - b.f.x);
      const min = Math.min(...fs.map((f) => f.x)); const max = Math.max(...fs.map((f) => f.x + f.w));
      const totalW = fs.reduce((s, f) => s + f.w, 0); const gap = (max - min - totalW) / (order.length - 1);
      let cursor = min;
      patches = order.map(({ it, f }) => { const p = { id: it.id, patch: { x: r(cursor + (it.x - f.x)) } }; cursor += f.w + gap; return p; });
    }
    if (mode === 'distV') {
      const order = [...items].sort((a, b) => a.elevation - b.elevation);
      const min = Math.min(...items.map((i) => i.elevation)); const max = Math.max(...items.map((i) => i.elevation + i.height));
      const totalH = items.reduce((s, i) => s + i.height, 0); const gap = (max - min - totalH) / (order.length - 1);
      let cursor = min;
      patches = order.map((it) => { const p = { id: it.id, patch: { elevation: r(cursor) } }; cursor += it.height + gap; return p; });
    }
    if (mode === 'matchW') { const w = items[0].width; patches = items.map((it) => ({ id: it.id, patch: { width: w } })); }
    if (mode === 'matchH') { const h = items[0].height; patches = items.map((it) => ({ id: it.id, patch: { height: h } })); }
    if (mode === 'matchD') { const d = items[0].depth; patches = items.map((it) => ({ id: it.id, patch: { depth: d } })); }
    if (mode === 'matchE') { const e = items[0].elevation; patches = items.map((it) => ({ id: it.id, patch: { elevation: e } })); }
    updateItems(patches as never);
    toast({ severity: 'success', message: 'Aligned', ttl: 1500 });
  };
  const Row = ({ title, btns }: { title: string; btns: [string, string][] }) => (
    <>
      <div className="label mt-2">{title}</div>
      <div className="flex gap-1 my-1 flex-wrap">{btns.map(([l, m]) => <button key={m} className="btn" onClick={() => align(m)}>{l}</button>)}</div>
    </>
  );
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && setUI({ modal: null })}>
      <div className="card w-full max-w-md p-4 anim-in">
        <h2 className="text-sm font-bold mb-1 flex items-center gap-2"><AlignCenter size={16} /> Align & Distribute ({items.length} selected)</h2>
        <Row title="Horizontal (X)" btns={[['Left', 'left'], ['Center', 'hcenter'], ['Right', 'right']]} />
        <Row title="Depth (Y)" btns={[['Back', 'back'], ['Center', 'dcenter'], ['Front', 'front']]} />
        <Row title="Vertical (Z)" btns={[['Top', 'top'], ['Middle', 'middle'], ['Bottom', 'bottom'], ['All on floor', 'floor']]} />
        <Row title="Distribute" btns={[['Horizontal', 'distH'], ['Vertical', 'distV']]} />
        <Row title="Match" btns={[['Width', 'matchW'], ['Height', 'matchH'], ['Depth', 'matchD'], ['Elevation', 'matchE']]} />
        <div className="flex justify-end mt-3"><button className="btn-primary" onClick={() => setUI({ modal: null })}>Done</button></div>
      </div>
    </div>
  );
}
