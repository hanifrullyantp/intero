import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, Circle, Cylinder, Download, Hammer, Plus, Save, Trash2, Triangle, X, Copy } from 'lucide-react';
import { useStore } from '../../store';
import type { CustomComponent, CustomShape, Item } from '../../types';
import { buildCustomShapes } from '../../generators';
import { MatCache } from '../../generators/common';
import { putMyComponent } from '../../lib/persistence';
import { ColorPicker, DragNumber, Field, Modal, Select, toast } from '../ui';
import { downloadBlob, uid } from '../../lib/utils';
import { LIBRARY_CATEGORIES } from '../../lib/constants';

const TEMPLATES: Record<string, CustomShape[]> = {
  dish_rack: [
    { id: 't1', kind: 'box', w: 500, h: 20, d: 450, x: 0, y: 0, z: 0, color: '#1A1A1A', metalness: 0.2, roughness: 0.5, opacity: 1, animation: 'pullout' },
    { id: 't2', kind: 'box', w: 480, h: 6, d: 430, x: 0, y: 160, z: 0, color: '#D7DADF', metalness: 1, roughness: 0.2, opacity: 1, animation: 'pullout' },
    { id: 't3', kind: 'box', w: 480, h: 6, d: 430, x: 0, y: 360, z: 0, color: '#D7DADF', metalness: 1, roughness: 0.2, opacity: 1, animation: 'pullout' },
  ],
  trash_bin: [
    { id: 't1', kind: 'box', w: 450, h: 14, d: 480, x: 0, y: 0, z: 0, color: '#C8CCD0', metalness: 0.8, roughness: 0.3, opacity: 1, animation: 'pullout' },
    { id: 't2', kind: 'cylinder', w: 220, h: 400, d: 190, x: -110, y: 14, z: 0, color: '#3F8F5A', metalness: 0, roughness: 0.5, opacity: 1, animation: 'pullout' },
    { id: 't3', kind: 'cylinder', w: 220, h: 400, d: 190, x: 110, y: 14, z: 0, color: '#6B7280', metalness: 0, roughness: 0.5, opacity: 1, animation: 'pullout' },
  ],
};

function newShape(kind: CustomShape['kind']): CustomShape {
  return { id: uid('SH'), kind, w: 300, h: kind === 'torus' ? 40 : 300, d: 300, x: 0, y: 0, z: 0, color: '#C9A97A', metalness: 0, roughness: 0.5, opacity: 1, animation: 'none' };
}

function Preview({ shapes }: { shapes: CustomShape[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; root: THREE.Group; cam: THREE.PerspectiveCamera; controls: OrbitControls } | null>(null);
  useEffect(() => {
    const host = ref.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(host.clientWidth, host.clientHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const d = new THREE.DirectionalLight(0xffffff, 2.5); d.position.set(2, 4, 3); scene.add(d);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x998877, 1.2));
    const grid = new THREE.GridHelper(2, 20, 0x9ca3af, 0xd1d5db); scene.add(grid);
    const root = new THREE.Group(); root.scale.setScalar(0.001); scene.add(root);
    const cam = new THREE.PerspectiveCamera(40, host.clientWidth / host.clientHeight, 0.01, 50); cam.position.set(0.9, 0.8, 1.1);
    const controls = new OrbitControls(cam, renderer.domElement); controls.target.set(0, 0.2, 0); controls.enableDamping = true;
    stateRef.current = { renderer, scene, root, cam, controls };
    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, cam); };
    loop();
    const ro = new ResizeObserver(() => { renderer.setSize(host.clientWidth, host.clientHeight); cam.aspect = host.clientWidth / host.clientHeight; cam.updateProjectionMatrix(); });
    ro.observe(host);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); host.removeChild(renderer.domElement); };
  }, []);
  useEffect(() => {
    const st = stateRef.current; if (!st) return;
    for (const c of [...st.root.children]) st.root.remove(c);
    const cache = new MatCache();
    const b = buildCustomShapes(shapes, cache);
    st.root.add(b.group);
  }, [shapes]);
  return <div ref={ref} className="w-full h-full rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />;
}

export function ComponentBuilder({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [tab, setTab] = useState<'design' | 'params' | 'anim' | 'meta'>('design');
  const [shapes, setShapes] = useState<CustomShape[]>(() => {
    const conv = (window as unknown as { __interoConvert?: Item }).__interoConvert;
    if (conv) { (window as unknown as { __interoConvert?: Item }).__interoConvert = undefined; return [{ ...newShape('box'), w: conv.dims.w, h: conv.dims.h, d: conv.dims.d, color: conv.materials.doorColor }]; }
    return [newShape('box')];
  });
  const [sel, setSel] = useState<string | null>(shapes[0]?.id ?? null);
  const [meta, setMeta] = useState({ name: '', category: 'Aksesoris Internal', tags: '', description: '', visibility: 'private' as 'private' | 'shared' });
  const [params, setParams] = useState({ w: 0, h: 0, d: 0 });
  const bounds = useMemo(() => {
    let w = 0, h = 0, d = 0;
    for (const sh of shapes) { w = Math.max(w, Math.abs(sh.x) + sh.w / 2); h = Math.max(h, sh.y + sh.h); d = Math.max(d, Math.abs(sh.z) + sh.d / 2); }
    return { w: Math.round(w * 2) || 100, h: Math.round(h) || 100, d: Math.round(d * 2) || 100 };
  }, [shapes]);
  useEffect(() => { setParams(bounds); }, [bounds]);
  const cur = shapes.find((x) => x.id === sel) ?? null;
  const upd = (patch: Partial<CustomShape>) => { if (!cur) return; setShapes(shapes.map((x) => (x.id === cur.id ? { ...x, ...patch } : x))); };
  const add = (kind: CustomShape['kind']) => { const sh = newShape(kind); setShapes([...shapes, sh]); setSel(sh.id); };
  const applyParams = () => {
    const rx = params.w / bounds.w, ry = params.h / bounds.h, rz = params.d / bounds.d;
    setShapes(shapes.map((sh) => ({ ...sh, w: Math.round(sh.w * rx), h: Math.round(sh.h * ry), d: Math.round(sh.d * rz), x: Math.round(sh.x * rx), y: Math.round(sh.y * ry), z: Math.round(sh.z * rz) })));
    toast('Parameter diterapkan ke semua shape', 'success');
  };
  const union = () => { if (shapes.length < 2) return; toast('Union: semua shape digabung sebagai satu komponen saat publish (grup).', 'info'); };
  const publish = async () => {
    if (!shapes.length) { toast('Minimal 1 shape', 'error'); return; }
    if (!meta.name.trim() || !meta.category) { toast('Nama & kategori wajib diisi', 'error'); setTab('meta'); return; }
    const comp: CustomComponent = { id: uid('CC'), name: meta.name.trim(), category: meta.category, tags: meta.tags.split(',').map((t) => t.trim()).filter(Boolean), description: meta.description, dims: bounds, shapes, createdAt: new Date().toISOString() };
    s.addCustomComponent(comp); await putMyComponent(comp);
    if (meta.visibility === 'shared') downloadBlob(`${comp.name}.component.json`, new Blob([JSON.stringify(comp, null, 2)], { type: 'application/json' }));
    toast(`Komponen "${comp.name}" dipublikasikan ke Kabinet Saya`, 'success');
    onClose(); s.ui({ showLibrary: true });
  };
  const exportJson = () => downloadBlob(`${meta.name || 'komponen'}.component.json`, new Blob([JSON.stringify({ ...meta, dims: bounds, shapes }, null, 2)], { type: 'application/json' }));

  return (
    <Modal onClose={onClose} width={1100} style={{ height: 'calc(100vh - 32px)' }}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-primary)', color: '#fff' }}><Hammer size={18} /></span>
          <div><h3 className="text-[16px] font-bold">Component Builder</h3><p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Bangun komponen kustom dari primitives · tersimpan lokal (IndexedDB)</p></div>
          <div className="seg ml-4">{(['design', 'params', 'anim', 'meta'] as const).map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'design' ? 'Design' : t === 'params' ? 'Parameters' : t === 'anim' ? 'Animation' : 'Metadata'}</button>)}</div>
          <div className="flex-1" />
          <Select value="" onChange={(v) => { if (v && TEMPLATES[v]) { setShapes(TEMPLATES[v].map((x) => ({ ...x, id: uid('SH') }))); } }} options={[{ value: '', label: 'Template…' }, { value: 'dish_rack', label: 'Rak piring' }, { value: 'trash_bin', label: 'Trash bin' }]} className="w-40" />
          <button className="btn btn-secondary btn-sm" onClick={exportJson}><Download size={14} />JSON</button>
          <button className="btn btn-primary btn-sm" onClick={publish}><Save size={14} />Publish</button>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: '260px 1fr 300px' }}>
          <div className="flex flex-col min-h-0" style={{ borderRight: '1px solid var(--border)' }}>
            <div className="p-3 flex flex-wrap gap-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => add('box')}><Box size={14} />Box</button>
              <button className="btn btn-secondary btn-sm" onClick={() => add('cylinder')}><Cylinder size={14} />Cyl</button>
              <button className="btn btn-secondary btn-sm" onClick={() => add('sphere')}><Circle size={14} />Sphere</button>
              <button className="btn btn-secondary btn-sm" onClick={() => add('torus')}><Circle size={14} />Torus</button>
              <button className="btn btn-secondary btn-sm" onClick={() => add('prism')}><Triangle size={14} />Prism</button>
              <button className="btn btn-ghost btn-sm" onClick={union}>Union</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {shapes.map((sh) => (
                <div key={sh.id} className={`layer-row ${sel === sh.id ? 'selected' : ''}`} onClick={() => setSel(sh.id)}>
                  <span className="w-3 h-3 rounded-sm" style={{ background: sh.color }} /><span className="flex-1 truncate capitalize">{sh.kind} {sh.w}×{sh.h}×{sh.d}</span>
                  <button className="ctl" onClick={(e) => { e.stopPropagation(); const c = { ...sh, id: uid('SH'), x: sh.x + 50 }; setShapes([...shapes, c]); setSel(c.id); }}><Copy size={12} /></button>
                  <button className="ctl" onClick={(e) => { e.stopPropagation(); setShapes(shapes.filter((x) => x.id !== sh.id)); if (sel === sh.id) setSel(null); }}><Trash2 size={12} /></button>
                </div>
              ))}
              {!shapes.length && <p className="text-[12px] p-2" style={{ color: 'var(--text-tertiary)' }}>Tambahkan primitive untuk memulai.</p>}
            </div>
            <div className="p-3 text-[11px] mono" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Bounding: {bounds.w} × {bounds.h} × {bounds.d} mm</div>
          </div>
          <div className="p-3 min-h-0"><Preview shapes={shapes} /></div>
          <div className="overflow-y-auto" style={{ borderLeft: '1px solid var(--border)' }}>
            {tab === 'design' && (cur ? (
              <div className="p-4 flex flex-col gap-3">
                <span className="panel-title">Shape: {cur.kind}</span>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="W"><DragNumber value={cur.w} min={2} max={3000} onChange={(v) => upd({ w: v })} /></Field>
                  <Field label="H"><DragNumber value={cur.h} min={2} max={3000} onChange={(v) => upd({ h: v })} /></Field>
                  <Field label="D"><DragNumber value={cur.d} min={2} max={3000} onChange={(v) => upd({ d: v })} /></Field>
                  <Field label="X"><DragNumber value={cur.x} min={-2000} max={2000} onChange={(v) => upd({ x: v })} /></Field>
                  <Field label="Y"><DragNumber value={cur.y} min={0} max={3000} onChange={(v) => upd({ y: v })} /></Field>
                  <Field label="Z"><DragNumber value={cur.z} min={-2000} max={2000} onChange={(v) => upd({ z: v })} /></Field>
                </div>
                <ColorPicker label="Warna" value={cur.color} onChange={(hex) => upd({ color: hex })} />
                <Field label={`Metalness ${cur.metalness.toFixed(2)}`}><input type="range" className="slider" min={0} max={1} step={0.05} value={cur.metalness} style={{ background: 'linear-gradient(90deg,#888,#eee)' }} onChange={(e) => upd({ metalness: +e.target.value })} /></Field>
                <Field label={`Roughness ${cur.roughness.toFixed(2)}`}><input type="range" className="slider" min={0} max={1} step={0.05} value={cur.roughness} style={{ background: 'linear-gradient(90deg,#fff,#666)' }} onChange={(e) => upd({ roughness: +e.target.value })} /></Field>
                <Field label={`Opacity ${cur.opacity.toFixed(2)}`}><input type="range" className="slider" min={0.1} max={1} step={0.05} value={cur.opacity} style={{ background: 'linear-gradient(90deg,transparent,#1B9D6B)' }} onChange={(e) => upd({ opacity: +e.target.value })} /></Field>
              </div>
            ) : <p className="p-4 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Pilih shape di daftar kiri.</p>)}
            {tab === 'params' && (
              <div className="p-4 flex flex-col gap-3">
                <span className="panel-title">Parameter adjustable</span>
                <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Ubah dimensi total komponen; semua shape diskalakan proporsional (linked property).</p>
                <Field label="Lebar total (min 50 · max 3000)"><DragNumber value={params.w} min={50} max={3000} onChange={(v) => setParams({ ...params, w: v })} /></Field>
                <Field label="Tinggi total"><DragNumber value={params.h} min={50} max={3000} onChange={(v) => setParams({ ...params, h: v })} /></Field>
                <Field label="Dalam total"><DragNumber value={params.d} min={50} max={3000} onChange={(v) => setParams({ ...params, d: v })} /></Field>
                <button className="btn btn-primary btn-sm" onClick={applyParams}><Plus size={14} />Terapkan parameter</button>
              </div>
            )}
            {tab === 'anim' && (
              <div className="p-4 flex flex-col gap-3">
                <span className="panel-title">Animasi per shape</span>
                {shapes.map((sh) => (
                  <div key={sh.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <span className="text-[12px] capitalize truncate">{sh.kind} {sh.w}×{sh.h}</span>
                    <Select value={sh.animation} onChange={(v) => setShapes(shapes.map((x) => (x.id === sh.id ? { ...x, animation: v as CustomShape['animation'] } : x)))} options={[{ value: 'none', label: 'Tidak ada' }, { value: 'pullout', label: 'Pull-out' }, { value: 'swing', label: 'Swing (engsel kiri)' }, { value: 'liftup', label: 'Lift-up' }, { value: 'spin', label: 'Rotate 360°' }]} />
                  </div>
                ))}
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Trigger: mengikuti Open Mode global (tombol Open) — sinkron dengan pintu induk.</p>
              </div>
            )}
            {tab === 'meta' && (
              <div className="p-4 flex flex-col gap-3">
                <Field label="Nama *"><input className="input" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} placeholder="mis. Rak Botol Tarik" /></Field>
                <Field label="Kategori *"><Select value={meta.category} onChange={(v) => setMeta({ ...meta, category: v })} options={LIBRARY_CATEGORIES.map((c) => ({ value: c, label: c }))} /></Field>
                <Field label="Tags (pisahkan koma)"><input className="input" value={meta.tags} onChange={(e) => setMeta({ ...meta, tags: e.target.value })} /></Field>
                <Field label="Deskripsi"><textarea className="input" style={{ height: 80, padding: 8 }} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></Field>
                <Field label="Visibility"><Select value={meta.visibility} onChange={(v) => setMeta({ ...meta, visibility: v as 'private' | 'shared' })} options={[{ value: 'private', label: 'Private (lokal browser)' }, { value: 'shared', label: 'Shared (unduh file untuk dibagikan)' }]} /></Field>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Thumbnail dibuat otomatis saat tampil di library.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
