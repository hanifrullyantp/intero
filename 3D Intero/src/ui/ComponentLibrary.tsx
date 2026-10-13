import { useEffect, useState } from 'react';
import { LIBRARY, LIBRARY_CATEGORIES, CATEGORY_COLORS, createItem } from '../config/library';
import type { LibraryEntry as LE, CustomComponent } from '../models/types';
import { useStore } from '../core/store';
import { setDrag } from '../core/dragState';
import { footprint } from '../utils/geometry';
import { defaultsForNewItem } from '../engine/projectDimensions';
import { TEMPLATES } from '../config/templates';
import { loadCustom } from '../core/customLibrary';
import { Search, ChevronDown, ChevronRight, Package, Hammer, Star, Globe, Box, LibIcon, LayoutGrid, AlignCenter } from './icons';

/* ---------- module-level components (never defined inside render: that remounts rows and breaks drag) ---------- */

function Thumb({ e }: { e: LE }) {
  const col = CATEGORY_COLORS[e.category];
  const w = 40;
  const h = Math.max(14, Math.min(40, (e.height / Math.max(e.width, 30)) * 30));
  const cfg = e.config;
  const fronts: React.ReactNode[] = [];
  if (e.kind === 'cabinet') {
    const drawers = cfg.drawers ?? 0;
    const doors = cfg.doors ?? 0;
    let y = 1;
    const dh = drawers ? (doors ? h * 0.3 : h - 2) / drawers : 0;
    for (let i = 0; i < drawers; i++) {
      fronts.push(<rect key={'d' + i} x={2} y={y + 0.5} width={w - 4} height={dh - 1.5} fill="none" stroke={col} strokeWidth="1" />);
      y += dh;
    }
    const remaining = h - 1 - y;
    if (doors && !cfg.openFront && remaining > 3) {
      const dw = (w - 4) / doors;
      for (let i = 0; i < doors; i++) fronts.push(<rect key={'o' + i} x={2 + i * dw + 0.5} y={y + 0.5} width={dw - 1} height={remaining - 1} fill={cfg.glass ? 'rgba(159,211,255,0.3)' : 'none'} stroke={col} strokeWidth="1" />);
    }
    if (cfg.openFront) {
      for (let i = 1; i <= (cfg.shelves ?? 1); i++) fronts.push(<line key={'s' + i} x1={2} x2={w - 2} y1={(h / ((cfg.shelves ?? 1) + 1)) * i} y2={(h / ((cfg.shelves ?? 1) + 1)) * i} stroke={col} strokeWidth="1" />);
    }
  }
  return (
    <div className="w-11 h-11 shrink-0 rounded flex items-center justify-center border" style={{ background: col + '18', borderColor: col + '55' }}>
      {e.kind === 'cabinet' ? (
        <svg width={40} height={40} viewBox="0 0 44 44">
          <g transform={`translate(2 ${(44 - h) / 2})`}>
            <rect x={0} y={0} width={w} height={h} rx={1.5} fill={col + '22'} stroke={col} strokeWidth="1" />
            {fronts}
          </g>
        </svg>
      ) : (
        <LibIcon id={e.id} size={20} color={col} />
      )}
    </div>
  );
}

interface TileProps { id: string; name: string; sub: string; thumb: React.ReactNode; title: string; fav?: boolean; onFav?: () => void; onDragStart: (id: string) => void; onDragEnd: () => void; onAdd?: (id: string) => void }

/** distinguishes a real click from a completed HTML5 drag */
let dragHappened = false;

function Tile({ id, name, sub, thumb, title, fav, onFav, onDragStart, onDragEnd, onAdd }: TileProps) {
  return (
    <div draggable
      onDragStart={(ev) => { dragHappened = true; ev.dataTransfer.setData('text/plain', id); ev.dataTransfer.effectAllowed = 'copy'; onDragStart(id); }}
      onDragEnd={() => { setTimeout(() => { dragHappened = false; }, 0); onDragEnd(); }}
      onClick={() => { if (!dragHappened) onAdd?.(id); }}
      className="flex flex-col items-center gap-1 p-1 rounded-lg border border-transparent cursor-grab active:cursor-grabbing transition-all group hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] relative select-none"
      title={title}>
      {thumb}
      <div className="text-[10px] leading-tight text-center truncate w-full" style={{ color: 'var(--text-secondary)' }}>{name}</div>
      <div className="text-[9px] font-mono opacity-50">{sub}</div>
      {onFav && (
        <button className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-80 hover:opacity-100" title="Favourite" onMouseDown={(e) => e.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); onFav(); }}>
          <Star size={11} fill={fav ? 'var(--warning)' : 'none'} style={{ color: fav ? 'var(--warning)' : undefined }} />
        </button>
      )}
    </div>
  );
}

function Row({ id, name, sub, thumb, title, fav, onFav, onDragStart, onDragEnd, onAdd }: TileProps) {
  return (
    <div draggable
      onDragStart={(ev) => { dragHappened = true; ev.dataTransfer.setData('text/plain', id); ev.dataTransfer.effectAllowed = 'copy'; onDragStart(id); }}
      onDragEnd={() => { setTimeout(() => { dragHappened = false; }, 0); onDragEnd(); }}
      onClick={() => { if (!dragHappened) onAdd?.(id); }}
      className="flex items-center gap-2 p-1.5 rounded border border-transparent cursor-grab active:cursor-grabbing transition-colors group hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] select-none"
      title={title}>
      {thumb}
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate">{name}</div>
        <div className="text-[10px] opacity-50 truncate">{sub}</div>
      </div>
      {onFav && (
        <button className="opacity-0 group-hover:opacity-70 hover:opacity-100" title="Favourite" onMouseDown={(e) => e.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); onFav(); }}>
          <Star size={12} fill={fav ? 'var(--warning)' : 'none'} style={{ color: fav ? 'var(--warning)' : undefined }} />
        </button>
      )}
    </div>
  );
}

const FAV_KEY = 'instant3d_favs';
function loadFavs(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}

type Tab = 'builtin' | 'my' | 'community' | 'fav';

export default function ComponentLibrary() {
  const [open, setOpen] = useState<Record<string, boolean>>({ base: true, wall: true, tall: false, appliance: true, accessory: false, templates: false });
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('builtin');
  const [custom, setCustom] = useState<CustomComponent[]>(loadCustom());
  const [favs, setFavs] = useState<string[]>(loadFavs());
  const [view, setView] = useState<'grid' | 'list'>(() => { try { return (localStorage.getItem('instant3d_libview') as 'grid' | 'list') || 'grid'; } catch { return 'grid'; } });
  const uiMode = useStore((s) => s.ui.uiMode);
  const setUI = useStore((s) => s.setUI);
  const setProject = useStore((s) => s.setProject);
  const requestFit = useStore((s) => s.requestFit);
  const toast = useStore((s) => s.toast);
  const requireAdvanced = useStore((s) => s.requireAdvanced);

  useEffect(() => {
    const h = () => setCustom(loadCustom());
    window.addEventListener('custom-library-changed', h);
    return () => window.removeEventListener('custom-library-changed', h);
  }, []);

  const setViewMode = (v: 'grid' | 'list') => { setView(v); try { localStorage.setItem('instant3d_libview', v); } catch { /* ignore */ } };
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const toggleFav = (id: string) => {
    const n = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    setFavs(n);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(n)); } catch { /* ignore */ }
  };
  const onDragStart = (id: string) => setDrag(id);
  const onDragEnd = () => setDrag(null);

  // click-to-add: place at the first free spot along wall A (works on mobile & desktop)
  const quickAdd = (entryId: string) => {
    const s = useStore.getState();
    if (entryId.startsWith('custom:')) return s.toast({ severity: 'info', message: 'Komponen kustom: tarik ke plan untuk menempatkan.', ttl: 2200 });
    const it = defaultsForNewItem(createItem(entryId), s.project);
    const bases = s.project.items.filter((i) => i.kind === 'cabinet' && (i.category === 'base' || i.category === 'tall') && i.rotation === 0);
    const maxX = bases.length ? Math.max(...bases.map((b) => footprint(b).x + footprint(b).w)) : 0;
    it.x = Math.min(maxX, s.project.room.width - footprint(it).w);
    it.y = it.category === 'wall' ? it.elevation : 0;
    s.addItem(it);
    s.requestFit();
    s.toast({ severity: 'success', message: `${it.name} ditambahkan — geser untuk memindahkan`, ttl: 1800 });
  };

  const match = (name: string, desc = '') => !q || name.toLowerCase().includes(q.toLowerCase()) || desc.toLowerCase().includes(q.toLowerCase());
  const filtered = (cat: string) => LIBRARY.filter((l) => l.category === cat && match(l.name, l.description));
  const myComps = custom.filter((c) => c.visibility !== 'public' && match(c.name));
  const commComps = custom.filter((c) => c.visibility === 'public' && match(c.name));
  const favLib = LIBRARY.filter((l) => favs.includes(l.id));

  const libTile = (e: LE) => (
    <Tile key={e.id} id={e.id} name={e.name} sub={`${e.width}cm`} title={`${e.name} — ${e.description}\n${e.width} × ${e.height} × ${e.depth} cm · klik untuk menambah · drag ke plan`}
      thumb={<Thumb e={e} />} fav={favs.includes(e.id)} onFav={() => toggleFav(e.id)} onDragStart={onDragStart} onDragEnd={onDragEnd} onAdd={quickAdd} />
  );
  const libRow = (e: LE) => (
    <Row key={e.id} id={e.id} name={e.name} sub={`${e.width}×${e.height}×${e.depth} cm`} title={`${e.description} — klik untuk menambah · drag ke plan`}
      thumb={<Thumb e={e} />} fav={favs.includes(e.id)} onFav={() => toggleFav(e.id)} onDragStart={onDragStart} onDragEnd={onDragEnd} onAdd={quickAdd} />
  );
  const customTile = (c: CustomComponent, list: boolean) => {
    const id = 'custom:' + c.id;
    const thumb = (
      <div className="w-11 h-11 shrink-0 rounded flex items-center justify-center border" style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
        <Box size={20} style={{ color: 'var(--accent)' }} />
      </div>
    );
    return list
      ? <Row key={id} id={id} name={c.name} sub={`${c.category} · ${c.width}×${c.height}×${c.depth}`} title={c.description || c.name} thumb={thumb} onDragStart={onDragStart} onDragEnd={onDragEnd} onAdd={quickAdd} />
      : <Tile key={id} id={id} name={c.name} sub={`${c.width}cm`} title={c.description || c.name} thumb={thumb} onDragStart={onDragStart} onDragEnd={onDragEnd} onAdd={quickAdd} />;
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-panel)' }}>
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center mb-1">
          <span className="text-[13px] font-semibold flex-1">Components</span>
          <button className={`tb-btn h-6! min-w-6! px-1! ${view === 'grid' ? 'active' : ''}`} title="Grid view" onClick={() => setViewMode('grid')}><LayoutGrid size={13} /></button>
          <button className={`tb-btn h-6! min-w-6! px-1! ${view === 'list' ? 'active' : ''}`} title="List view" onClick={() => setViewMode('list')}><AlignCenter size={13} /></button>
        </div>
        <div className="flex gap-1 mb-1.5">
          {([['builtin', Package, 'Built-in'], ['my', Hammer, 'My'], ['community', Globe, 'Community'], ['fav', Star, 'Fav']] as [Tab, typeof Package, string][]).map(([t, Icon, label]) => (
            <button key={t} className={`tab flex items-center gap-1 flex-1 justify-center ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} title={label}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 items-center">
          <Search size={13} className="opacity-50 shrink-0" />
          <input className="input" placeholder="Search components…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="text-[10px] mt-1 opacity-60">Drag onto the 2D plan or the 3D view{uiMode === 'simple' ? '' : ' · ★ to pin'}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'builtin' && LIBRARY_CATEGORIES.map((cat) => {
          const list = filtered(cat.id);
          if (!list.length && q) return null;
          const isOpen = open[cat.id] || !!q;
          return (
            <div key={cat.id} className="section">
              <div className="section-h" onClick={() => toggle(cat.id)}>
                <span className="flex items-center gap-2">
                  <i className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat.id] }} />
                  {cat.label}
                  <span className="font-normal opacity-50">({list.length})</span>
                </span>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </div>
              {isOpen && view === 'grid' && <div className="px-2 pb-2 grid grid-cols-4 gap-1">{list.map(libTile)}</div>}
              {isOpen && view === 'list' && <div className="px-2 pb-2 grid grid-cols-1 gap-1">{list.map(libRow)}</div>}
            </div>
          );
        })}

        {tab === 'builtin' && (
          <div className="section">
            <div className="section-h" onClick={() => toggle('templates')}>
              <span>Templates</span>
              {open.templates ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </div>
            {open.templates && (
              <div className="px-2 pb-2 flex flex-col gap-1">
                {TEMPLATES.map((t) => (
                  <button key={t.id} className="text-left p-2 rounded border flex items-center gap-2 hover:border-[var(--accent)]" style={{ borderColor: 'var(--border)' }}
                    onClick={() => { setProject(t.build()); requestFit(); toast({ severity: 'success', message: `Template "${t.name}" loaded` }); }}>
                    <i className="w-6 h-6 rounded shrink-0" style={{ background: t.accent }} />
                    <div className="min-w-0"><div className="text-xs truncate">{t.name}</div><div className="text-[10px] opacity-50 truncate">{t.info}</div></div>
                  </button>
                ))}
                <button className="btn mt-1" onClick={() => setUI({ modal: 'templates' })}>Browse all templates…</button>
              </div>
            )}
          </div>
        )}

        {(tab === 'my' || tab === 'community') && (
          <div className="p-2 flex flex-col gap-1">
            <button className="btn-primary flex items-center justify-center gap-1.5 mb-1" onClick={() => { if (requireAdvanced('Component Builder')) setUI({ modal: 'builder' }); }}>
              <Hammer size={13} /> Buat komponen baru
            </button>
            <div className={view === 'grid' ? 'grid grid-cols-4 gap-1' : 'flex flex-col gap-1'}>
              {(tab === 'my' ? myComps : commComps).map((c) => customTile(c, view === 'list'))}
            </div>
            {(tab === 'my' ? myComps : commComps).length === 0 && <div className="text-xs opacity-60 p-2">Belum ada komponen. Buat dengan tombol di atas.</div>}
          </div>
        )}

        {tab === 'fav' && (
          <div className="p-2 flex flex-col gap-1">
            {favLib.map(libRow)}
            {!favLib.length && <div className="text-xs opacity-60 p-2">Tekan ★ pada komponen untuk menyematkannya di sini.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
