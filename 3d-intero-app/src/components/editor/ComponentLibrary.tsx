import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Hammer, Search, Trash2, Users, X } from 'lucide-react';
import { useStore } from '../../store';
import type { CustomComponent, Item, LibraryEntry } from '../../types';
import { DEFAULT_LED, DEFAULT_MATERIALS, DEFAULT_SETTINGS, LIBRARY, LIBRARY_CATEGORIES } from '../../lib/constants';
import { buildItem } from '../../generators';
import { MatCache } from '../../generators/common';
import { sceneRef } from './Viewport';
import { toast } from '../ui';
import { deleteMyComponent } from '../../lib/persistence';
import { fmtDims } from '../../lib/utils';

// ─── Thumbnail renderer (offscreen, antrian 1 per frame) ───
const thumbCache = new Map<string, string>();
let thumbRenderer: THREE.WebGLRenderer | null = null;
const thumbQueue: { key: string; item: Item; resolve: (url: string) => void }[] = [];
let thumbRunning = false;
function renderThumb(item: Item): string {
  if (!thumbRenderer) {
    thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbRenderer.setSize(240, 180); thumbRenderer.setPixelRatio(1);
    thumbRenderer.outputColorSpace = THREE.SRGBColorSpace; thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(3, 5, 4); scene.add(d);
  const h = new THREE.HemisphereLight(0xffffff, 0x9a8f80, 1.4); scene.add(h);
  const cache = new MatCache();
  const b = buildItem(item, { cache, settings: DEFAULT_SETTINGS, items: [], walls: [] });
  const root = new THREE.Group(); root.scale.setScalar(0.001); root.add(b.group); scene.add(root);
  const bb = new THREE.Box3().setFromObject(root); const c = bb.getCenter(new THREE.Vector3()); const size = bb.getSize(new THREE.Vector3()).length();
  const cam = new THREE.PerspectiveCamera(32, 240 / 180, 0.01, 100);
  cam.position.set(c.x + size * 0.9, c.y + size * 0.6, c.z + size * 1.1); cam.lookAt(c);
  thumbRenderer.render(scene, cam);
  const url = thumbRenderer.domElement.toDataURL('image/png');
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry.type !== 'BoxGeometry') m.geometry.dispose(); });
  cache.dispose();
  return url;
}
function pump() {
  if (thumbRunning) return;
  thumbRunning = true;
  const step = () => {
    const job = thumbQueue.shift();
    if (!job) { thumbRunning = false; return; }
    try { const url = thumbCache.get(job.key) ?? renderThumb(job.item); thumbCache.set(job.key, url); job.resolve(url); } catch { job.resolve(''); }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
export function thumbnailFor(key: string, item: Item): Promise<string> {
  const c = thumbCache.get(key);
  if (c) return Promise.resolve(c);
  return new Promise((resolve) => { thumbQueue.push({ key, item, resolve }); pump(); });
}
export function entryToItem(e: LibraryEntry): Item {
  return { id: e.id, name: e.name, type: e.type, wallId: null, orderIndex: 0, position: { x: 0, y: 0, z: 0 }, rotationY: 0, dims: { ...e.dims }, materials: { ...DEFAULT_MATERIALS }, config: { ...(e.config ?? {}) }, led: { ...DEFAULT_LED }, visible: true, locked: false, colorLabel: null, createdAt: '' };
}
function useThumb(key: string, item: Item) {
  const [url, setUrl] = useState(thumbCache.get(key) ?? '');
  useEffect(() => { let alive = true; thumbnailFor(key, item).then((u) => { if (alive) setUrl(u); }); return () => { alive = false; }; }, [key, item]);
  return url;
}

function Tile({ entry, onAdd, onDelete, disabled }: { entry: LibraryEntry; onAdd: () => void; onDelete?: () => void; disabled?: boolean }) {
  const item = useMemo(() => entryToItem(entry), [entry]);
  const url = useThumb(entry.id, item);
  return (
    <button type="button" className="tile" draggable={!disabled} disabled={disabled} onClick={onAdd} style={disabled ? { opacity: 0.65, cursor: 'default' } : undefined} title={disabled ? `${entry.name} (mode lihat saja)` : `${entry.name} — klik untuk tambah, atau drag ke viewport`}
      onDragStart={(e) => { e.dataTransfer.setData('text/intero-entry', entry.id); e.dataTransfer.effectAllowed = 'copy'; (window as unknown as { __interoDragEntry?: LibraryEntry }).__interoDragEntry = entry; }}
      onDragEnd={() => { (window as unknown as { __interoDragEntry?: LibraryEntry }).__interoDragEntry = undefined; }}>
      <div className="tile-thumb">{url ? <img src={url} alt={entry.name} draggable={false} /> : <div className="w-10 h-10 rounded-lg animate-pulse" style={{ background: 'var(--border)' }} />}</div>
      <div className="p-2.5 flex items-start gap-1">
        <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold truncate">{entry.name}</div><div className="text-[11px] mono" style={{ color: 'var(--text-tertiary)' }}>{fmtDims(entry.dims)}</div></div>
        {onDelete && <span role="button" className="icon-btn" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Hapus komponen"><Trash2 size={13} /></span>}
      </div>
    </button>
  );
}

export function ComponentLibrary({ embedded }: { embedded?: boolean }) {
  const s = useStore();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'builtin' | 'mine' | 'community'>('builtin');
  const [cat, setCat] = useState<string>('Semua');
  const readOnly = s.shareMode === 'view';

  // Drag-drop ke viewport
  useEffect(() => {
    const over = (e: DragEvent) => { if ((window as unknown as { __interoDragEntry?: LibraryEntry }).__interoDragEntry) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; } };
    const drop = (e: DragEvent) => {
      const entry = (window as unknown as { __interoDragEntry?: LibraryEntry }).__interoDragEntry;
      if (!entry || !(e.target instanceof HTMLCanvasElement)) return;
      e.preventDefault();
      const p = sceneRef.current?.raycastPoint(e.clientX, e.clientY);
      addEntry(entry, p ? { x: p.x, z: p.z } : null);
    };
    window.addEventListener('dragover', over); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('drop', drop); };
  }, []);

  const addEntry = (entry: LibraryEntry, at: { x: number; z: number } | null) => {
    const st = useStore.getState();
    const spawn = at ?? sceneRef.current?.spawnPoint() ?? null;
    const id = st.addItem({ type: entry.type, dims: { ...entry.dims }, name: entry.name, config: { ...(entry.config ?? {}) } }, spawn);
    const added = useStore.getState().items.find((i) => i.id === id);
    toast(added?.wallId ? `${entry.name} ditambahkan ke ${st.walls.find((w) => w.id === added.wallId)?.name ?? 'dinding'}` : `${entry.name} ditambahkan`, 'success');
    if (window.innerWidth < 768) st.ui({ mobileSheet: null, showLibrary: false });
  };
  const addCustom = (c: CustomComponent) => {
    const st = useStore.getState();
    st.addItem({ type: 'custom', dims: { ...c.dims }, name: c.name, config: { customShapes: c.shapes, customName: c.name } }, sceneRef.current?.spawnPoint() ?? null);
    toast(`${c.name} ditambahkan`, 'success');
  };
  const list = useMemo(() => LIBRARY.filter((e) => (cat === 'Semua' || e.category === cat) && (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.category.toLowerCase().includes(q.toLowerCase()))), [cat, q]);
  const mine = useMemo(() => s.customComponents.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [s.customComponents, q]);

  return (
    <div className={`flex flex-col h-full ${embedded ? '' : 'panel rounded-2xl'}`} style={{ width: embedded ? '100%' : 340 }}>
      <div className="flex items-center gap-2 p-3 pb-2">
        <div className="relative flex-1"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} /><input className="input pl-8" placeholder="Cari komponen…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button type="button" className="btn btn-primary btn-sm" data-tour="builder-btn" disabled={readOnly} onClick={() => s.ui({ showBuilder: true })} title="Component Builder (Ctrl+Shift+K)"><Hammer size={14} />Buat</button>
        {!embedded && <button type="button" className="icon-btn" onClick={() => s.ui({ showLibrary: false })} aria-label="Tutup"><X size={16} /></button>}
      </div>
      <div className="px-3"><div className="seg w-full">
        <button type="button" className={`flex-1 ${tab === 'builtin' ? 'active' : ''}`} onClick={() => setTab('builtin')}>Built-in</button>
        <button type="button" className={`flex-1 ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>Kabinet Saya</button>
        <button type="button" className={`flex-1 ${tab === 'community' ? 'active' : ''}`} onClick={() => setTab('community')}>Komunitas</button>
      </div></div>
      {tab === 'builtin' && (
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {['Semua', ...LIBRARY_CATEGORIES].map((c) => <button key={c} type="button" className={`badge shrink-0 ${cat === c ? 'badge-ok' : ''}`} style={cat === c ? undefined : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {tab === 'builtin' && <div className="grid grid-cols-2 gap-2.5">{list.map((e) => <Tile key={e.id} entry={e} disabled={readOnly} onAdd={() => addEntry(e, null)} />)}</div>}
        {tab === 'mine' && (mine.length ? <div className="grid grid-cols-2 gap-2.5">{mine.map((c) => <Tile key={c.id} entry={{ id: c.id, name: c.name, category: c.category, type: 'custom', dims: c.dims, config: { customShapes: c.shapes, customName: c.name } }} disabled={readOnly} onAdd={() => addCustom(c)} onDelete={() => { s.removeCustomComponent(c.id); deleteMyComponent(c.id); toast('Komponen dihapus', 'info'); }} />)}</div>
          : <div className="flex flex-col items-center text-center gap-3 py-10 px-4"><Hammer size={32} style={{ color: 'var(--text-tertiary)' }} /><p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Belum ada komponen kustom. Buat dari primitives (box, cylinder, sphere, torus) dengan Component Builder.</p><button className="btn btn-primary btn-sm" onClick={() => s.ui({ showBuilder: true })}>+ Buat Komponen</button></div>)}
        {tab === 'community' && (
          <div className="flex flex-col items-center text-center gap-3 py-10 px-4">
            <Users size={32} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Komunitas berbagi komponen secara offline: ekspor komponen Anda sebagai file .json dari Component Builder, lalu bagikan via WhatsApp/email. Impor file dari rekan di sini.</p>
            <button className="btn btn-secondary btn-sm" onClick={async () => {
              const { pickFile } = await import('../../lib/utils');
              const f = await pickFile('.json');
              if (!f || typeof f.data !== 'string') return;
              try {
                const c = JSON.parse(f.data) as CustomComponent;
                if (!c.shapes || !c.name) throw new Error('bukan komponen');
                const { putMyComponent } = await import('../../lib/persistence');
                c.id = c.id || `CC-${Date.now()}`; s.addCustomComponent(c); await putMyComponent(c);
                toast(`Komponen "${c.name}" diimpor ke Kabinet Saya`, 'success'); setTab('mine');
              } catch { toast('File komponen tidak valid', 'error'); }
            }}>Impor komponen (.json)</button>
          </div>
        )}
      </div>
    </div>
  );
}
