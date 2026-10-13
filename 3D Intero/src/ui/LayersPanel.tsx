import { useMemo, useRef, useState } from 'react';
import { useStore } from '../core/store';
import { CATEGORY_COLORS, uid } from '../config/library';
import type { Item, LayerGroup } from '../models/types';
import { Layers, Plus, Group, X, Search, Eye, EyeOff, Lock, LockOpen, ChevronDown, ChevronRight, GripVertical, CopyPlus, Trash2, Package } from './icons';
import { physicalReorder, reorderHost } from '../engine/layerReorder';
import { footprint, offsetOnWall } from '../utils/geometry';

const GROUP_DEFS: { id: string; label: string; match: (i: Item) => boolean }[] = [
  { id: 'room', label: 'Room', match: () => false },
  { id: 'wall', label: 'Wall Cabinets', match: (i) => i.category === 'wall' && i.kind === 'cabinet' },
  { id: 'base', label: 'Base Cabinets', match: (i) => i.category === 'base' && i.kind === 'cabinet' },
  { id: 'tall', label: 'Tall Cabinets', match: (i) => i.category === 'tall' && i.kind === 'cabinet' },
  { id: 'countertop', label: 'Countertop', match: () => false },
  { id: 'appliance', label: 'Appliances', match: (i) => i.kind === 'appliance' },
  { id: 'accessory', label: 'Accessories', match: (i) => i.kind === 'accessory' },
];

const LABEL_COLORS = ['#ef5350', '#ffa726', '#ffd54f', '#66bb6a', '#4fc3f7', '#ba68c8'];

export default function LayersPanel() {
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { select, updateItem, updateItems, setItems, setGroups, removeItems, duplicateItems, toast, setUI } = useStore.getState();
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropLine, setDropLine] = useState<{ id: string; before: boolean } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden' | 'locked'>('all');
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => project.groups ?? [], [project.groups]);
  const customGroups = groups.filter((g) => !g.auto);

  const visibleIds = useMemo(() => {
    const out: string[] = [];
    const ql = q.toLowerCase();
    for (const it of project.items) {
      if (ql && !it.name.toLowerCase().includes(ql)) continue;
      if (filter === 'visible' && it.visible === false) continue;
      if (filter === 'hidden' && it.visible !== false) continue;
      if (filter === 'locked' && !it.locked) continue;
      out.push(it.id);
    }
    return out;
  }, [project.items, q, filter]);

  const itemsByGroup = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const id of visibleIds) {
      const it = project.items.find((i) => i.id === id)!;
      const key = it.groupId ?? (it.kind === 'cabinet' && (it.category === 'base' || it.category === 'tall') && it.wallId ? `run:${it.wallId}` : undefined)
        ?? GROUP_DEFS.find((g) => g.id !== 'room' && g.id !== 'countertop' && g.match(it))?.id ?? 'accessory';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return map;
  }, [project.items, visibleIds]);

  const onKeyNav = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const cur = selectedIds.length ? visibleIds.indexOf(selectedIds[selectedIds.length - 1]) : -1;
    const next = e.key === 'ArrowDown' ? Math.min(visibleIds.length - 1, cur + 1) : Math.max(0, cur - 1);
    if (visibleIds[next]) {
      select(e.shiftKey ? [...selectedIds, visibleIds[next]] : [visibleIds[next]]);
      listRef.current?.querySelector(`[data-row="${visibleIds[next]}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  };

  const toggleGroupVisible = (gid: string) => {
    const list = itemsByGroup.get(gid) ?? [];
    const anyVisible = list.some((i) => i.visible !== false);
    if (list.length) updateItems(list.map((i) => ({ id: i.id, patch: { visible: !anyVisible } })));
  };
  const toggleGroupLock = (gid: string) => {
    const list = itemsByGroup.get(gid) ?? [];
    const anyUnlocked = list.some((i) => !i.locked);
    if (list.length) updateItems(list.map((i) => ({ id: i.id, patch: { locked: anyUnlocked } })));
  };

  const onDrop = (e: React.DragEvent, targetGroup: string, targetItemId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const bounds = e.currentTarget.getBoundingClientRect();
    const before = targetItemId ? e.clientY < bounds.top + bounds.height / 2 : false;
    setDropLine(null);
    setDragId(null);
    if (!dragId) return;
    const dragged = project.items.find((i) => i.id === dragId);
    if (!dragged) return;
    if (targetItemId && targetItemId !== dragId) {
      const source = reorderHost(project, dragId);
      const target = reorderHost(project, targetItemId);
      if (source && target && source.id !== target.id) {
        const result = physicalReorder(project, dragId, targetItemId, before);
        if (result.items) {
          setItems(result.items);
          select([dragId]);
          toast({ severity: 'success', message: 'Urutan kabinet diperbarui. Kabinet, countertop, dan peralatan terkait ikut berpindah.', ttl: 2800 });
        } else toast({ severity: 'warning', message: result.error ?? 'Tidak dapat mengubah urutan.' });
        return;
      }
    }
    if (targetGroup.startsWith('run:')) {
      const wall = project.room.walls.find((w) => `run:${w.id}` === targetGroup);
      const tail = wall && (itemsByGroup.get(targetGroup) ?? []).filter((i) => i.id !== dragId && i.kind === 'cabinet' && !i.subtype.includes('corner'))
        .sort((a, b) => offsetOnWall(wall, footprint(a)) - offsetOnWall(wall, footprint(b))).at(-1);
      if (!tail) return;
      const result = physicalReorder(project, dragId, tail.id, false);
      if (result.items) setItems(result.items);
      else toast({ severity: 'warning', message: result.error ?? 'Tidak dapat mengubah urutan.' });
      return;
    }
    const patch: Partial<Item> = { groupId: customGroups.some((g) => g.id === targetGroup) ? targetGroup : null };
    let items = project.items.map((i) => (i.id === dragId ? { ...i, ...patch } : i));
    if (targetItemId && targetItemId !== dragId) {
      const from = items.findIndex((i) => i.id === dragId);
      const to = items.findIndex((i) => i.id === targetItemId);
      const [mv] = items.splice(from, 1);
      items.splice(to, 0, mv);
    }
    setItems(items);
  };

  const newGroup = () => {
    const g: LayerGroup = { id: uid('grp'), name: `Group ${customGroups.length + 1}`, collapsed: false, visible: true };
    setGroups([...groups, g]);
    toast({ severity: 'success', message: `"${g.name}" created — drag layers into it`, ttl: 2500 });
  };

  const groupSelected = () => {
    if (!selectedIds.length) return toast({ severity: 'warning', message: 'Select items first' });
    const g: LayerGroup = { id: uid('grp'), name: `Group ${customGroups.length + 1}` };
    setGroups([...groups, g]);
    updateItems(selectedIds.map((id) => ({ id, patch: { groupId: g.id } })));
    toast({ severity: 'success', message: `${selectedIds.length} items grouped`, ttl: 2000 });
  };

  const renderRow = (it: Item) => {
    const sel = selectedIds.includes(it.id);
    const hidden = it.visible === false;
    return (
      <div key={it.id} data-row={it.id} draggable={!it.subtype.includes('corner') && !it.locked}
        onDragStart={(e) => { if (it.subtype.includes('corner') || it.locked) { e.preventDefault(); return; } setDragId(it.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('application/x-instant3d-layer', it.id); }}
        onDragEnd={() => { setDragId(null); setDropLine(null); }}
        onDragOver={(e) => {
          if (!dragId || it.id === dragId) return;
          e.preventDefault(); e.stopPropagation();
          const bounds = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < bounds.top + bounds.height / 2;
          if (dropLine?.id !== it.id || dropLine.before !== before) setDropLine({ id: it.id, before });
        }}
        onDrop={(e) => onDrop(e, it.groupId ?? (it.wallId && it.kind === 'cabinet' && (it.category === 'base' || it.category === 'tall') ? `run:${it.wallId}` : it.category), it.id)}
        onClick={(e) => {
          if (it.locked) return toast({ severity: 'warning', message: 'Item is locked', ttl: 1500 });
          if (e.shiftKey || e.ctrlKey || e.metaKey) select([it.id], true);
          else select([it.id]);
        }}
        onDoubleClick={() => setRenaming(it.id)}
        onContextMenu={(e) => { e.preventDefault(); select([it.id]); setUI({ contextMenu: { x: e.clientX, y: e.clientY, itemId: it.id } }); }}
        className={`layer-row ${sel ? 'selected' : ''} ${hidden ? 'hidden-item' : ''} group relative`}
        title={`${it.name}\n${it.width}×${it.height}×${it.depth} cm · ${it.subtype.includes('corner') ? 'Sudut tetap (tidak bisa digeser)' : 'seret untuk menata dinding'} · klik dua kali untuk nama`}>
        <GripVertical size={12} className="opacity-0 group-hover:opacity-60 shrink-0 cursor-grab" />
        {it.labelColor && <i className="w-2 h-2 rounded-full shrink-0" style={{ background: it.labelColor }} />}
        <i className="w-2 h-2 rounded-sm shrink-0" style={{ background: CATEGORY_COLORS[it.category] ?? '#999' }} />
        {renaming === it.id ? (
          <input autoFocus className="input py-0! text-xs flex-1" defaultValue={it.name}
            onBlur={(e) => { updateItem(it.id, { name: e.target.value || it.name }); setRenaming(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null); }}
            onClick={(e) => e.stopPropagation()} />
        ) : (
          <span className="flex-1 truncate">{it.name} <span className="opacity-50">· {it.width}cm</span>{it.subtype.includes('corner') && <span className="ml-1 text-[9px] opacity-50">tetap</span>}</span>
        )}
        <button className="opacity-60 hover:opacity-100" title={hidden ? 'Show (Alt: solo)' : 'Hide (Alt: solo)'} onClick={(e) => {
          e.stopPropagation();
          if (e.altKey) setUI({ isolateIds: hidden ? null : [it.id] });
          else updateItem(it.id, { visible: hidden ? true : false });
        }}>{hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
        <button className="opacity-60 hover:opacity-100" title={it.locked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); updateItem(it.id, { locked: !it.locked }); }}>
          {it.locked ? <Lock size={13} /> : <LockOpen size={13} />}
        </button>
        {dropLine?.id === it.id && <div className={`absolute left-0 right-0 h-[3px] rounded-full pointer-events-none ${dropLine.before ? '-top-[2px]' : '-bottom-[2px]'}`} style={{ background: 'var(--brand)', boxShadow: '0 0 0 3px var(--bg-selected)' }} />}
      </div>
    );
  };

  const renderGroup = (gid: string, label: string, count: number, children: React.ReactNode, custom?: LayerGroup) => {
    const isCollapsed = collapsed[gid];
    return (
      <div key={gid} className="mb-1" onDragOver={(e) => { if (dragId) e.preventDefault(); }} onDrop={(e) => onDrop(e, gid)}>
        <div className="flex items-center gap-1 px-1 py-1 rounded cursor-pointer select-none hover:bg-[var(--bg-hover)]" onClick={() => setCollapsed((c) => ({ ...c, [gid]: !c[gid] }))}>
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          {custom ? <Package size={13} className="opacity-60" /> : <i className="w-2 h-2 rounded-full opacity-70" style={{ background: gid === 'wall' ? '#ba68c8' : gid === 'base' ? '#4fc3f7' : gid === 'tall' ? '#4db6ac' : gid === 'appliance' ? '#ffa726' : gid === 'accessory' ? '#a1887f' : 'var(--text-tertiary)' }} />}
          {custom && renaming === custom.id ? (
            <input autoFocus className="input py-0! text-xs flex-1" defaultValue={custom.name}
              onBlur={(e) => { setGroups(groups.map((g) => (g.id === custom.id ? { ...g, name: e.target.value || g.name } : g))); setRenaming(null); }}
              onClick={(e) => e.stopPropagation()} />
          ) : (
            <span className="text-xs font-semibold flex-1 truncate" onDoubleClick={(e) => { if (custom) { e.stopPropagation(); setRenaming(custom.id); } }}>{label} <span className="opacity-50 font-normal">({count})</span></span>
          )}
          <button className="opacity-60 hover:opacity-100" title="Show/hide group (Shift: all)" onClick={(e) => { e.stopPropagation(); toggleGroupVisible(gid); }}><Eye size={13} /></button>
          <button className="opacity-60 hover:opacity-100" title="Lock/unlock group" onClick={(e) => { e.stopPropagation(); toggleGroupLock(gid); }}><Lock size={13} /></button>
        </div>
        {!isCollapsed && <div className="ml-4 border-l pl-1" style={{ borderColor: 'var(--border)' }}>{children}</div>}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-panel)' }} onKeyDown={onKeyNav} tabIndex={0}>
      <div className="px-2 py-2 border-b flex items-center gap-1" style={{ borderColor: 'var(--border)' }}>
        <Layers size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-xs font-bold flex-1">LAYERS</span>
        <button className="tb-btn" title="New group" onClick={newGroup}><Plus size={14} /></button>
        <button className="tb-btn" title="Group selected (Ctrl+G)" onClick={groupSelected}><Group size={14} /></button>
        <button className="tb-btn" title="Kembali ke properti" onClick={() => setUI({ rightTab: 'props' })}><X size={14} /></button>
      </div>
      <div className="px-2 py-1.5 border-b flex gap-1 items-center" style={{ borderColor: 'var(--border)' }}>
        <Search size={13} className="opacity-50 shrink-0" />
        <input className="input" placeholder="Search layers…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="px-2 py-1 flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['all', 'visible', 'hidden', 'locked'] as const).map((f) => (
          <button key={f} className={`chip capitalize ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-1.5">
        <p className="text-[10px] px-2 pb-2 opacity-60 leading-relaxed">Geser layer kabinet ke atas/bawah pada dinding yang sama. Kabinet lain otomatis merapat; sink, hood, dan kabinet atas ikut berpindah. Corner tetap di tempat.</p>
        {renderGroup('room', 'Room', 3, (
          <>
            {['Floor', 'Walls', 'Ceiling'].map((r) => (
              <div key={r} className="layer-row opacity-70"><i className="w-2 h-2 rounded-sm" style={{ background: 'var(--border-strong)' }} /><span className="flex-1">{r}</span><Eye size={12} className="opacity-50" /></div>
            ))}
          </>
        ))}
        {project.room.walls.filter((w) => (itemsByGroup.get(`run:${w.id}`) ?? []).length).map((w) => {
          const list = [...(itemsByGroup.get(`run:${w.id}`) ?? [])].sort((a, b) => offsetOnWall(w, footprint(a)) - offsetOnWall(w, footprint(b)));
          return renderGroup(`run:${w.id}`, `Susunan ${w.label}`, list.length, list.map(renderRow));
        })}
        {GROUP_DEFS.filter((g) => !['room', 'countertop', 'base', 'tall'].includes(g.id)).map((g) => {
          const list = (itemsByGroup.get(g.id) ?? []).filter((i) => !i.groupId);
          if (!list.length && (q || filter !== 'all')) return null;
          return renderGroup(g.id, g.label, list.length, list.length ? list.map(renderRow) : <div className="text-[10px] opacity-50 px-2 py-1">Empty — drag items here</div>);
        })}
        {renderGroup('countertop', 'Countertop', 1, (
          <div className="layer-row"><i className="w-2 h-2 rounded-sm bg-amber-500" /><span className="flex-1">Countertop (auto)</span><span className="text-[10px] opacity-60">continuous</span></div>
        ))}
        {customGroups.map((g) => {
          const list = project.items.filter((i) => i.groupId === g.id && visibleIds.includes(i.id));
          return renderGroup(g.id, g.name, list.length,
            <>
              {list.map(renderRow)}
              <div className="flex gap-1 px-2 py-1">
                <button className="chip" onClick={() => updateItems(list.map((i) => ({ id: i.id, patch: { groupId: null } })))}>Ungroup</button>
                <button className="chip" onClick={() => { setGroups(groups.filter((x) => x.id !== g.id)); updateItems(list.map((i) => ({ id: i.id, patch: { groupId: null } })), false); }}>Delete group</button>
              </div>
            </>, g);
        })}
      </div>
      <div className="px-2 py-1.5 border-t flex items-center gap-1" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[10px] opacity-60">Label:</span>
        {LABEL_COLORS.map((c) => (
          <button key={c} className="w-4 h-4 rounded-full border border-black/20 hover:scale-110" style={{ background: c }} title="Apply label to selection"
            onClick={() => { if (selectedIds.length) updateItems(selectedIds.map((id) => ({ id, patch: { labelColor: c } }))); }} />
        ))}
        <span className="flex-1" />
        <button className="chip flex items-center gap-1" onClick={() => { if (selectedIds.length) duplicateItems(selectedIds); }}><CopyPlus size={11} /> Duplicate</button>
        <button className="chip flex items-center gap-1" onClick={() => { if (selectedIds.length) removeItems(selectedIds); }}><Trash2 size={11} /> Delete</button>
      </div>
    </div>
  );
}
