import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, ChefHat, ChevronDown, ChevronRight, Eye, EyeOff, GripVertical, Lightbulb, Lock, Package, PanelRightClose, PanelRightOpen, Search, Square, Unlock, X, Refrigerator, Wind, Armchair, Layers } from 'lucide-react';
import { useStore } from '../../store';
import type { Item, LayerGrouping } from '../../types';
import { LABEL_COLORS, WALL_NAMES } from '../../lib/constants';
import { rowOf } from '../../engine/walls';
import { thumbnailFor } from './ComponentLibrary';
import { toast } from '../ui';

function iconFor(it: Item) {
  switch (it.type) {
    case 'fridge': return <Refrigerator size={14} />;
    case 'hood': return <Wind size={14} />;
    case 'electronic': case 'dishwasher': case 'cooktop_base': case 'sink_base': return <ChefHat size={14} />;
    case 'island': case 'bar': return <Armchair size={14} />;
    case 'custom': return <Package size={14} />;
    case 'corner_base': case 'corner_wall': return <Square size={14} />;
    default: return it.led.underCabinet || it.led.insideBase || it.led.insideUpper || it.led.plinth ? <Lightbulb size={14} /> : <Box size={14} />;
  }
}

interface Group { id: string; name: string; items: Item[]; reorderable: boolean }

export function LayersPanel({ embedded }: { embedded?: boolean }) {
  const s = useStore();
  const readOnly = s.shareMode === 'view';
  const [grouping, setGrouping] = useState<LayerGrouping>('wall');
  const [q, setQ] = useState(''); const [qd, setQd] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; id: string } | null>(null);
  const [drag, setDrag] = useState<{ id: string; groupId: string } | null>(null);
  const [drop, setDrop] = useState<{ id: string; pos: 'before' | 'after' } | null>(null);
  const [hoverThumb, setHoverThumb] = useState<{ id: string; url: string; x: number; y: number } | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClick = useRef<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setQd(q), 200); return () => clearTimeout(t); }, [q]);

  const groups = useMemo<Group[]>(() => {
    const filt = s.items.filter((i) => !qd || i.name.toLowerCase().includes(qd.toLowerCase()) || i.id.toLowerCase().includes(qd.toLowerCase()));
    if (grouping === 'wall') {
      const gs: Group[] = s.walls.map((w) => ({ id: w.id, name: w.name || WALL_NAMES[w.id] || w.id, items: filt.filter((i) => i.wallId === w.id).sort((a, b) => a.orderIndex - b.orderIndex), reorderable: !qd }));
      const free = filt.filter((i) => !i.wallId);
      if (free.length) gs.push({ id: 'free', name: 'Island / Bebas', items: free, reorderable: false });
      return gs;
    }
    if (grouping === 'type') {
      const map = new Map<string, Item[]>();
      for (const i of filt) { const k = rowOf({ ...i, wallId: i.wallId ?? 'x' }); const key = k === 'tall' ? 'Tall & Appliance' : k === 'wall' ? 'Wall' : k === 'base' ? 'Base' : 'Bebas'; map.set(key, [...(map.get(key) ?? []), i]); }
      return [...map.entries()].map(([k, items]) => ({ id: k, name: k, items: items.sort((a, b) => a.name.localeCompare(b.name)), reorderable: false }));
    }
    const map = new Map<string, Item[]>();
    for (const i of filt) { const key = `${i.materials.doorMaterial} ${i.materials.doorColor}`; map.set(key, [...(map.get(key) ?? []), i]); }
    return [...map.entries()].map(([k, items]) => ({ id: k, name: k, items, reorderable: false }));
  }, [s.items, s.walls, grouping, qd]);

  const topLevel = (g: Group) => g.items.filter((i) => !i.config.parentId || !g.items.some((o) => o.id === i.config.parentId));
  const childrenOf = (g: Group, id: string) => g.items.filter((i) => i.config.parentId === id);

  const select = (e: React.MouseEvent | React.PointerEvent, it: Item) => {
    if (e.shiftKey && lastClick.current) {
      const all = groups.flatMap((g) => g.items);
      const a = all.findIndex((x) => x.id === lastClick.current), b = all.findIndex((x) => x.id === it.id);
      if (a >= 0 && b >= 0) { s.setSelection(all.slice(Math.min(a, b), Math.max(a, b) + 1).map((x) => x.id)); return; }
    }
    if (e.ctrlKey || e.metaKey) s.toggleSelect(it.id); else s.setSelection([it.id]);
    lastClick.current = it.id;
  };
  const doReorder = (g: Group, fromId: string, toId: string, pos: 'before' | 'after') => {
    if (!g.reorderable || fromId === toId) return;
    const order = topLevel(g).map((i) => i.id);
    const from = order.indexOf(fromId), to = order.indexOf(toId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    let idx = order.indexOf(toId); if (pos === 'after') idx += 1;
    order.splice(idx, 0, fromId);
    s.reorderWall(g.id, order);
    toast('Urutan diperbarui — posisi 3D disusun ulang otomatis', 'success');
  };
  const onDragOverRow = (e: React.DragEvent, it: Item) => {
    if (!drag) return; e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDrop({ id: it.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' });
  };
  const onDropRow = (g: Group, it: Item) => {
    if (!drag || !drop) return;
    if (drag.groupId !== g.id) {
      if (grouping === 'wall' && g.id !== 'free') { s.moveToWall(drag.id, g.id); setTimeout(() => { const gg = groups.find((x) => x.id === g.id); if (gg) doReorder({ ...gg, items: useStore.getState().items.filter((i) => i.wallId === g.id).sort((a, b) => a.orderIndex - b.orderIndex) }, drag.id, it.id, drop.pos); }, 0); }
    } else doReorder(g, drag.id, it.id, drop.pos);
    setDrag(null); setDrop(null);
  };
  // Touch long-press reorder
  const onTouchStart = (g: Group, it: Item) => (e: React.TouchEvent) => {
    if (!g.reorderable) return;
    const t = e.touches[0];
    longPress.current = setTimeout(() => { navigator.vibrate?.(50); setDrag({ id: it.id, groupId: g.id }); setDrop({ id: it.id, pos: 'after' }); }, 500);
    const startY = t.clientY;
    const move = (ev: TouchEvent) => {
      const p = ev.touches[0];
      if (!drag && Math.abs(p.clientY - startY) > 10 && longPress.current) { clearTimeout(longPress.current); longPress.current = null; }
      const el = document.elementFromPoint(p.clientX, p.clientY)?.closest('[data-layer-id]') as HTMLElement | null;
      if (el && useStore.getState()) { const r = el.getBoundingClientRect(); setDrop({ id: el.dataset.layerId!, pos: p.clientY < r.top + r.height / 2 ? 'before' : 'after' }); ev.preventDefault(); }
    };
    const end = () => {
      if (longPress.current) { clearTimeout(longPress.current); longPress.current = null; }
      window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end);
      setDrag((d) => { setDrop((dp) => { if (d && dp) doReorder(g, d.id, dp.id, dp.pos); return null; }); return null; });
    };
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', end);
  };
  const showThumb = (it: Item, e: React.MouseEvent) => {
    const x = e.clientX, y = e.clientY;
    hoverTimer.current = setTimeout(async () => { const url = await thumbnailFor(`layer:${it.id}:${JSON.stringify([it.type, it.dims, it.materials, it.config])}`, it); setHoverThumb({ id: it.id, url, x, y }); }, 450);
  };
  const hideThumb = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setHoverThumb(null); };
  const solo = (id: string) => { const others = s.items.filter((i) => i.id !== id).map((i) => i.id); s.patchItems(others, { visible: false }); s.patchItem(id, { visible: true }); };

  const rowProps = {
    selectedIds: s.selectedIds, dragId: drag?.id ?? null, drop, renaming,
    onSelect: select, onRenameStart: (id: string) => setRenaming(id), onRenameDone: (it: Item, name: string) => { s.patchItem(it.id, { name: name.trim() || it.name }); setRenaming(null); }, onRenameCancel: () => setRenaming(null),
    onCtx: (e: React.MouseEvent, id: string) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, id }); },
    onDragStart: (g: Group, it: Item) => setDrag({ id: it.id, groupId: g.id }), onDragEnd: () => { setDrag(null); setDrop(null); }, onDragOver: onDragOverRow, onDrop: onDropRow, onTouchStart,
    onHoverIn: showThumb, onHoverOut: hideThumb,
    toggleVisible: (it: Item) => s.patchItem(it.id, { visible: !it.visible }), toggleLock: (it: Item) => s.patchItem(it.id, { locked: !it.locked }),
    readOnly,
  };

  return (
    <div className="flex flex-col h-full" data-tour="layers-panel" style={{ minHeight: 0 }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <Layers size={15} style={{ color: 'var(--brand-primary)' }} /><span className="text-[13px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Layers</span>
        <select className="input" style={{ height: 26, fontSize: 11, width: 118, padding: '0 22px 0 8px' }} value={grouping} onChange={(e) => setGrouping(e.target.value as LayerGrouping)}><option value="wall">Grup: Dinding</option><option value="type">Grup: Tipe</option><option value="material">Grup: Material</option></select>
        <div className="flex-1" />
        {!embedded && <button className="icon-btn" style={{ width: 26, height: 26 }} data-tip={s.layersDocked ? 'Lepas (floating)' : 'Dock ke sidebar kanan (tab)'} data-tip-side="top" onClick={() => { const dock = !s.layersDocked; s.ui({ layersDocked: dock, ...(dock ? { showProps: true, showLayers: true } : {}) }); }}>{s.layersDocked ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}</button>}
        {!embedded && <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => s.ui({ showLayers: false })} aria-label="Tutup"><X size={14} /></button>}
      </div>
      <div className="px-2 py-1.5"><div className="relative"><Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} /><input className="input pl-7" style={{ height: 28, fontSize: 12 }} placeholder="Filter layer…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-2" onDragOver={(e) => { if (drag) e.preventDefault(); }}>
        {groups.length === 0 && <p className="text-[12px] p-3" style={{ color: 'var(--text-tertiary)' }}>Belum ada layer. Tambahkan komponen terlebih dahulu.</p>}
        {groups.map((g) => (
          <div key={g.id} className="mb-1">
            <button type="button" className="flex items-center gap-1.5 w-full px-1.5 h-7 rounded-md text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }} onClick={() => setCollapsed({ ...collapsed, [g.id]: !collapsed[g.id] })}>
              {collapsed[g.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}<span className="flex-1 text-left truncate">{g.name}</span><span className="mono font-normal">{g.items.length}</span>
            </button>
            {!collapsed[g.id] && topLevel(g).map((it) => (<div key={it.id}><LayerRow g={g} it={it} depth={0} {...rowProps} />{childrenOf(g, it.id).map((c) => <LayerRow key={c.id} g={g} it={c} depth={1} {...rowProps} />)}</div>))}
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 text-[10.5px]" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}>Drag baris (long-press di HP) untuk mengubah urutan — kabinet di dinding disusun ulang otomatis.</div>
      {hoverThumb && hoverThumb.url && <div className="fixed z-[800] panel rounded-xl p-1 pointer-events-none" style={{ left: Math.min(hoverThumb.x + 16, window.innerWidth - 180), top: Math.min(hoverThumb.y - 60, window.innerHeight - 140) }}><img src={hoverThumb.url} alt="" style={{ width: 160, height: 120, borderRadius: 8, objectFit: 'cover' }} /></div>}
      {ctx && (<>
        <div className="fixed inset-0 z-[600]" onPointerDown={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null); }} />
        <div className="menu" style={{ position: 'fixed', left: Math.min(ctx.x, window.innerWidth - 230), top: Math.min(ctx.y, window.innerHeight - 330), zIndex: 610 }}>
          <button className="menu-item" onClick={() => { setRenaming(ctx.id); setCtx(null); }}>Rename</button>
          <button className="menu-item" onClick={() => { s.duplicateItems([ctx.id]); setCtx(null); }}>Duplicate</button>
          <button className="menu-item" onClick={() => { solo(ctx.id); setCtx(null); }}>Hide All Others (Solo)</button>
          <button className="menu-item" onClick={() => { s.patchItems(s.items.map((i) => i.id), { visible: true }); setCtx(null); }}>Show All</button>
          <button className="menu-item" onClick={() => { const it = s.items.find((i) => i.id === ctx.id); if (it) { s.ui({ showBuilder: true }); (window as unknown as { __interoConvert?: Item }).__interoConvert = it; } setCtx(null); }}>Convert to Component</button>
          <button className="menu-item" onClick={() => { const it = s.items.find((i) => i.id === ctx.id); if (it) { const blob = new Blob([JSON.stringify({ formatVersion: '1.0', appVersion: '3D Intero 1.0', projectName: it.name, createdAt: it.createdAt, modifiedAt: new Date().toISOString(), settings: s.settings, walls: [], cabinets: [{ ...it, wallId: null }], dimensions: [], customComponents: [] }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${it.name}.intero`; a.click(); toast('Objek diekspor sebagai .intero', 'success'); } setCtx(null); }}>Export Selected (.intero)</button>
          <div className="menu-sep" />
          <div className="px-3 py-1.5 flex items-center gap-1.5"><span className="text-[11px] mr-1" style={{ color: 'var(--text-tertiary)' }}>Label</span>{LABEL_COLORS.map((c) => <button key={c} type="button" className="w-4 h-4 rounded-full" style={{ background: c, outline: s.items.find((i) => i.id === ctx.id)?.colorLabel === c ? '2px solid var(--text-primary)' : 'none', outlineOffset: 1 }} onClick={() => { s.patchItem(ctx.id, { colorLabel: c }); setCtx(null); }} />)}<button type="button" className="w-4 h-4 rounded-full border" style={{ borderColor: 'var(--border)' }} onClick={() => { s.patchItem(ctx.id, { colorLabel: null }); setCtx(null); }} title="Hapus label" /></div>
          <div className="menu-sep" />
          <button className="menu-item danger" onClick={() => { s.removeItems([ctx.id]); setCtx(null); }}>Delete</button>
        </div>
      </>)}
    </div>
  );
}

interface RowProps {
  g: Group; it: Item; depth: number; selectedIds: string[]; dragId: string | null; drop: { id: string; pos: 'before' | 'after' } | null; renaming: string | null;
  onSelect: (e: React.MouseEvent, it: Item) => void; onRenameStart: (id: string) => void; onRenameDone: (it: Item, name: string) => void; onRenameCancel: () => void;
  onCtx: (e: React.MouseEvent, id: string) => void; onDragStart: (g: Group, it: Item) => void; onDragEnd: () => void; onDragOver: (e: React.DragEvent, it: Item) => void; onDrop: (g: Group, it: Item) => void;
  onTouchStart: (g: Group, it: Item) => (e: React.TouchEvent) => void; onHoverIn: (it: Item, e: React.MouseEvent) => void; onHoverOut: () => void; toggleVisible: (it: Item) => void; toggleLock: (it: Item) => void; readOnly: boolean;
}
function LayerRow(p: RowProps) {
  const { g, it, depth } = p;
  const selected = p.selectedIds.includes(it.id);
  return (
    <div data-layer-id={it.id} className={`layer-row ${selected ? 'selected' : ''} ${p.dragId === it.id ? 'dragging' : ''} ${p.drop?.id === it.id ? (p.drop.pos === 'before' ? 'drop-before' : 'drop-after') : ''}`} style={{ paddingLeft: 6 + depth * 16, opacity: it.visible ? 1 : 0.5 }}
      draggable={!p.readOnly && g.reorderable && depth === 0} onDragStart={() => p.onDragStart(g, it)} onDragEnd={p.onDragEnd} onDragOver={(e) => p.onDragOver(e, it)} onDrop={() => p.onDrop(g, it)}
      onTouchStart={!p.readOnly && depth === 0 ? p.onTouchStart(g, it) : undefined}
      onClick={(e) => p.onSelect(e, it)} onDoubleClick={() => { if (!p.readOnly) p.onRenameStart(it.id); }} onContextMenu={(e) => { if (!p.readOnly) p.onCtx(e, it.id); }}
      onMouseEnter={(e) => p.onHoverIn(it, e)} onMouseLeave={p.onHoverOut}>
      {g.reorderable && depth === 0 ? <GripVertical size={13} style={{ color: 'var(--text-tertiary)', cursor: 'grab' }} /> : <span style={{ width: 13 }} />}
      <span style={{ color: it.colorLabel ?? 'var(--text-secondary)' }}>{iconFor(it)}</span>
      {p.renaming === it.id ? <input autoFocus className="input" style={{ height: 24, fontSize: 12 }} defaultValue={it.name} onClick={(e) => e.stopPropagation()} onBlur={(e) => p.onRenameDone(it, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') p.onRenameCancel(); }} />
        : <span className="flex-1 truncate">{it.name}</span>}
      {it.colorLabel && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: it.colorLabel }} />}
      {!p.readOnly && <button type="button" className={`ctl ${!it.visible ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); p.toggleVisible(it); }} title="Visibility">{it.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button>}
      {!p.readOnly && <button type="button" className={`ctl ${it.locked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); p.toggleLock(it); }} title="Lock">{it.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>}
    </div>
  );
}
