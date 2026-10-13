import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStore } from '../core/store';
import type { CustomComponent, CustomShape } from '../models/types';
import { loadCustom, saveCustom, MATERIAL_LOOK, lookFor, normalizeShapes } from '../core/customLibrary';
import { uid } from '../config/library';
import { downloadBlob, safeName } from '../core/projectManager';
import {
  MousePointer2, Move, Box, Cylinder, Circle, Shapes, Scan, Square, Minus, DoorOpen, Layers, Hammer, Copy,
  ArrowLeftRight, Group, Ungroup, Trash2, Undo2, Redo2, Download, FolderOpen, Rocket, X, Eye, Check, TriangleAlert,
  Scaling, Magnet, type LucideIcon,
} from './icons';

/* =========================================================================================
 * Component Builder v2
 *  - primitives: box, cylinder, sphere, prism, torus, panel
 *  - presets: shelf, door, drawer, divider, rail, 2-tier dish rack, wall dish rack, spice rack,
 *             double waste bin, hanging rod
 *  - select (click / shift-click), move on the floor (drag), vertical move (alt-drag, PageUp/PageDown)
 *  - grouping, mirror-copy, duplicate, hole/cut-out marker, roles (door / drawer / shelf / rail)
 *  - material presets, numeric position / size / rotation, align, snap (off / 0.5 / 1 / 5 cm)
 *  - undo / redo, JSON import + export, publish to the component library (parametric scaling)
 * ========================================================================================= */

type Tool = 'select' | 'move';
type RightTab = 'props' | 'layers' | 'meta';
type Snapshot = CustomShape[];

const ADD: { type: CustomShape['type']; label: string; icon: LucideIcon; dims: [number, number, number] }[] = [
  { type: 'box', label: 'Box', icon: Box, dims: [40, 20, 30] },
  { type: 'cylinder', label: 'Silinder', icon: Cylinder, dims: [6, 30, 6] },
  { type: 'sphere', label: 'Bola', icon: Circle, dims: [10, 10, 10] },
  { type: 'prism', label: 'Prisma segitiga', icon: Shapes, dims: [10, 20, 10] },
  { type: 'torus', label: 'Torus (cincin)', icon: Scan, dims: [12, 2.4, 12] },
  { type: 'plane', label: 'Panel tipis', icon: Square, dims: [40, 1.8, 30] },
];

const PRESETS: { key: string; label: string }[] = [
  { key: 'shelf', label: 'Rak / papan' },
  { key: 'door', label: 'Pintu' },
  { key: 'drawer', label: 'Laci (muka + kotak)' },
  { key: 'divider', label: 'Sekat' },
  { key: 'rail', label: 'Batang gantung' },
  { key: 'dish2', label: 'Rak piring 2 tingkat' },
  { key: 'dishWall', label: 'Rak piring dinding' },
  { key: 'spice', label: 'Rak bumbu pull-out' },
  { key: 'waste', label: 'Tempat sampah 2 bin' },
  { key: 'hanging', label: 'Rod gantung pakaian' },
];

const rad = (deg: number) => (deg * Math.PI) / 180;
const r1 = (v: number) => Math.round(v * 10) / 10;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function newShape(type: CustomShape['type'], dims: [number, number, number], base = { x: 0, y: 0, z: 0 }): CustomShape {
  const [w, h, d] = dims;
  return { id: uid('sh'), type, w, h, d, x: base.x, y: base.y + h / 2, z: base.z, rx: 0, ry: 0, rz: 0, color: '#9aa0a6', mat: 'custom', role: 'none' };
}

/** all shapes that share a group with any of `ids` (plus the ids themselves) */
function expandGroups(shapes: CustomShape[], ids: string[]): string[] {
  const groups = new Set(shapes.filter((s) => ids.includes(s.id) && s.group).map((s) => s.group!));
  const out = new Set(ids);
  for (const s of shapes) if (s.group && groups.has(s.group)) out.add(s.id);
  return [...out];
}

/** preset generator. Every preset is one group so it moves / mirrors as a unit. Coordinates start at the origin. */
function presetShapes(key: string): CustomShape[] {
  const g = uid('grp');
  const S = (type: CustomShape['type'], w: number, h: number, d: number, x: number, y: number, z: number, extra: Partial<CustomShape> = {}): CustomShape =>
    ({ id: uid('sh'), type, w, h, d, x, y, z, rx: 0, ry: 0, rz: 0, color: '#9aa0a6', mat: 'custom', role: 'none', group: g, ...extra });
  const rod = (len: number, axis: 'x' | 'y' | 'z', x: number, y: number, z: number, name = 'Batang') =>
    ({ ...S('cylinder', 0.8, len, 0.8, x, y, z, { mat: 'chrome', color: MATERIAL_LOOK.chrome.color, name }), rx: axis === 'z' ? 90 : 0, rz: axis === 'x' ? 90 : 0 });
  const wood = MATERIAL_LOOK.wood.color;
  const steel = MATERIAL_LOOK.stainless.color;
  switch (key) {
    case 'shelf': return [S('box', 60, 1.8, 50, 30, 0.9, 25, { name: 'Rak', role: 'shelf', mat: 'wood', color: wood })];
    case 'door': return [S('box', 40, 60, 1.8, 20, 30, 0.9, { name: 'Pintu', role: 'door', mat: 'wood', color: wood })];
    case 'drawer': return [
      S('box', 56, 18, 1.8, 28, 9, 0.9, { name: 'Muka laci', role: 'drawer', mat: 'wood', color: wood }),
      S('box', 50, 14, 40, 28, 11, 22, { name: 'Kotak laci', mat: 'stainless', color: steel }),
    ];
    case 'divider': return [S('box', 1.8, 50, 50, 0.9, 25, 25, { name: 'Sekat', role: 'shelf', mat: 'wood', color: wood })];
    case 'rail': return [rod(60, 'x', 30, 2, 25, 'Batang gantung')];
    case 'dish2': {
      const W = 60, D = 50, H = 55;
      const out: CustomShape[] = [S('box', W - 4, 1, D - 4, W / 2, 1, D / 2, { name: 'Drip tray', mat: 'stainless', color: steel })];
      for (const x of [2, W - 2]) out.push(rod(H, 'y', x, H / 2, 2, 'Tiang'), rod(H, 'y', x, H / 2, D - 2, 'Tiang'));
      for (const y of [H - 1, H * 0.55]) out.push(rod(W, 'x', W / 2, y, 2, 'Rel'), rod(W, 'x', W / 2, y, D - 2, 'Rel'));
      for (let i = 0; i < 6; i++) out.push(rod(H * 0.45, 'y', 5 + i * 9, H * 0.78, D / 2, 'Slot piring'));
      return out;
    }
    case 'dishWall': {
      const W = 80, D = 25, H = 40;
      const out: CustomShape[] = [S('box', W, 1.6, 1.2, W / 2, H - 0.8, 0.6, { name: 'Plat pemasangan', mat: 'wood', color: wood })];
      for (const y of [5, H * 0.55]) out.push(rod(W - 4, 'x', W / 2, y, D * 0.45, 'Rel'));
      for (let i = 0; i <= 12; i++) out.push(rod(H * 0.6, 'y', 3 + (i * (W - 6)) / 12, 2 + H * 0.3, D * 0.45, 'Slot'));
      return out;
    }
    case 'spice': {
      const W = 15, D = 50, H = 70;
      const out: CustomShape[] = [S('box', W - 2, 1, D - 4, W / 2, 0.5, D / 2, { name: 'Dasar', mat: 'stainless', color: steel })];
      for (const x of [0.8, W - 0.8]) out.push(rod(H, 'y', x, H / 2, 2, 'Tiang'), rod(H, 'y', x, H / 2, D - 2, 'Tiang'));
      for (let l = 0; l < 4; l++) out.push(rod(W - 2, 'x', W / 2, 6 + (l * (H - 10)) / 3, 3, 'Rak'));
      return out;
    }
    case 'waste': return [
      S('box', 18, 38, 36, 11, 19, 25, { name: 'Bin kiri', mat: 'stainless', color: steel }),
      S('box', 18, 38, 36, 29, 19, 25, { name: 'Bin kanan', mat: 'stainless', color: steel }),
      S('box', 42, 2, 40, 20, 1, 25, { name: 'Dasar', mat: 'black', color: MATERIAL_LOOK.black.color }),
    ];
    case 'hanging': return [rod(60, 'x', 30, 170, 25, 'Rod gantung')];
    default: return [];
  }
}

function makeMesh(s: CustomShape): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  switch (s.type) {
    case 'box': geo = new THREE.BoxGeometry(s.w, s.h, s.d); break;
    case 'cylinder': geo = new THREE.CylinderGeometry(s.w / 2, s.w / 2, s.h, 24); break;
    case 'sphere': geo = new THREE.SphereGeometry(s.w / 2, 24, 16); break;
    case 'prism': geo = new THREE.CylinderGeometry(s.w / 2, s.w / 2, s.h, 3); break;
    case 'torus': geo = new THREE.TorusGeometry(Math.max(0.4, s.w / 2 - s.h / 2), Math.max(0.3, s.h / 2), 12, 32); break;
    default: geo = new THREE.BoxGeometry(Math.max(0.2, s.w), Math.max(0.2, s.h), Math.max(0.2, s.d));
  }
  const look = lookFor(s);
  const mat = s.hole
    ? new THREE.MeshBasicMaterial({ color: '#ef5350', transparent: true, opacity: 0.3, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: look.color, roughness: look.rough, metalness: look.metal });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(s.x, s.y, s.z);
  m.rotation.set(rad(s.rx), rad(s.ry), rad(s.rz));
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.id = s.id;
  return m;
}

function NumIn({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [t, setT] = useState(String(r1(value)));
  useEffect(() => setT(String(r1(value))), [value]);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label text-[9px]!">{label}</span>
      <input className="input font-mono text-[11px]! py-0.5!" value={t} onChange={(e) => setT(e.target.value)}
        onBlur={() => { const v = parseFloat(t); if (!Number.isNaN(v)) onChange(v); else setT(String(r1(value))); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </div>
  );
}

const SECTION = 'text-[10px] font-semibold uppercase tracking-wider opacity-60 px-2 pt-2 pb-1';

export default function ComponentBuilder() {
  const setUI = useStore((s) => s.setUI);
  const toast = useStore((s) => s.toast);

  const [name, setName] = useState('Komponen baru');
  const [category, setCategory] = useState('Internal/Kitchen');
  const [tags, setTags] = useState('');
  const [desc, setDesc] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'team' | 'public'>('private');
  const [animType, setAnimType] = useState<CustomComponent['anim']['type']>('none');
  const [animDist, setAnimDist] = useState(30);
  const [editId, setEditId] = useState<string | null>(null);
  const [shapes, setShapesState] = useState<CustomShape[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [snap, setSnap] = useState(1);
  const [rtab, setRtab] = useState<RightTab>('props');
  const [, bump] = useState(0);
  const [hint, setHint] = useState('');

  const shapesRef = useRef(shapes); shapesRef.current = shapes;
  const selRef = useRef(sel); selRef.current = sel;
  const snapRef = useRef(snap); snapRef.current = snap;
  const toolRef = useRef<Tool>(tool); toolRef.current = tool;
  const histRef = useRef<{ past: Snapshot[]; future: Snapshot[]; last: number }>({ past: [], future: [], last: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; orbit: OrbitControls; root: THREE.Group } | null>(null);
  const dragRef = useRef<{ axis: 'xz' | 'y'; plane: THREE.Plane; start: THREE.Vector3; origin: Map<string, { x: number; y: number; z: number }>; moved: boolean } | null>(null);

  const setShapes = (next: CustomShape[] | ((p: CustomShape[]) => CustomShape[])) => setShapesState(next);

  /* ---------- history ---------- */
  const snapshot = () => {
    const h = histRef.current;
    h.past.push(clone(shapesRef.current));
    if (h.past.length > 120) h.past.shift();
    h.future = [];
  };
  /** soft commit: groups rapid edits (typing in a number field) into one undo step */
  const commitSoft = () => {
    const h = histRef.current;
    if (Date.now() - h.last > 700) snapshot();
    h.last = Date.now();
  };
  const undo = () => {
    const h = histRef.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(clone(shapesRef.current));
    setShapes(prev);
    setSel((s) => s.filter((id) => prev.some((x) => x.id === id)));
    bump((n) => n + 1);
  };
  const redo = () => {
    const h = histRef.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(clone(shapesRef.current));
    setShapes(next);
    bump((n) => n + 1);
  };

  /* ---------- actions ---------- */
  const addShapes = (list: CustomShape[]) => {
    snapshot();
    setShapes((p) => [...p, ...list]);
    setSel(list.map((s) => s.id));
  };
  const addPrimitive = (type: CustomShape['type'], dims: [number, number, number]) => addShapes([newShape(type, dims)]);
  const addPreset = (key: string) => {
    const list = presetShapes(key);
    if (!list.length) return;
    addShapes(list);
    setHint('Preset ditambahkan sebagai grup — geser salah satunya untuk memindahkan seluruh grup.');
  };
  const updateSel = (patch: Partial<CustomShape>) => {
    if (!selRef.current.length) return;
    commitSoft();
    const ids = selRef.current;
    setShapes((p) => p.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s)));
  };
  const deleteSel = () => {
    if (!selRef.current.length) return;
    snapshot();
    const ids = selRef.current;
    setShapes((p) => p.filter((s) => !ids.includes(s.id)));
    setSel([]);
  };
  const duplicateSel = () => {
    const ids = selRef.current;
    if (!ids.length) return;
    const groupMap = new Map<string, string>();
    const copies = shapesRef.current.filter((s) => ids.includes(s.id)).map((s) => {
      const c: CustomShape = { ...clone(s), id: uid('sh'), x: s.x + 10, z: s.z + 10 };
      if (s.group) { if (!groupMap.has(s.group)) groupMap.set(s.group, uid('grp')); c.group = groupMap.get(s.group); }
      return c;
    });
    addShapes(copies);
  };
  const mirrorCopy = () => {
    const ids = selRef.current;
    const src = shapesRef.current.filter((s) => ids.includes(s.id));
    if (!src.length) return;
    const cx = src.reduce((a, s) => a + s.x, 0) / src.length;
    const copies = src.map((s) => ({ ...clone(s), id: uid('sh'), x: r1(2 * cx - s.x), ry: -s.ry, rz: -s.rz, group: s.group ? s.group + '_m' : undefined }));
    addShapes(copies);
    setHint('Mirror (copy) dibuat di sisi lain dari pusat seleksi.');
  };
  const groupSel = () => {
    if (selRef.current.length < 2) return toast({ severity: 'warning', message: 'Pilih minimal 2 bentuk untuk digrup' });
    snapshot();
    const gid = uid('grp');
    const ids = selRef.current;
    setShapes((p) => p.map((s) => (ids.includes(s.id) ? { ...s, group: gid } : s)));
  };
  const ungroupSel = () => {
    snapshot();
    const ids = expandGroups(shapesRef.current, selRef.current);
    setShapes((p) => p.map((s) => (ids.includes(s.id) ? { ...s, group: undefined } : s)));
  };
  const toggleHole = () => {
    snapshot();
    const cur = shapesRef.current.filter((s) => selRef.current.includes(s.id));
    const on = !cur.every((s) => s.hole);
    setShapes((p) => p.map((s) => (selRef.current.includes(s.id) ? { ...s, hole: on } : s)));
  };
  const nudge = (dx: number, dy: number, dz: number) => {
    if (!selRef.current.length) return;
    commitSoft();
    const ids = expandGroups(shapesRef.current, selRef.current);
    setShapes((p) => p.map((s) => (ids.includes(s.id) ? { ...s, x: r1(s.x + dx), y: r1(s.y + dy), z: r1(s.z + dz) } : s)));
  };

  const exportJson = () => {
    const data = { app: '3D Intero component', version: 2, component: { name, category, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), description: desc, shapes: shapesRef.current } };
    downloadBlob(`${safeName(name)}.i3d-component.json`, JSON.stringify(data, null, 2), 'application/json');
  };
  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        const c = obj.component ?? obj;
        if (!Array.isArray(c.shapes)) throw new Error('shapes tidak ditemukan');
        snapshot();
        setShapes(c.shapes.map((s: CustomShape) => ({ ...s, id: s.id || uid('sh') })));
        if (c.name) setName(c.name);
        if (c.description) setDesc(c.description);
        if (Array.isArray(c.tags)) setTags(c.tags.join(', '));
        setSel([]);
        toast({ severity: 'success', message: `Komponen "${c.name ?? file.name}" diimpor` });
      } catch (e) {
        toast({ severity: 'error', message: `Impor gagal: ${(e as Error).message}` });
      }
    };
    reader.readAsText(file);
  };
  const loadExisting = (id: string) => {
    const c = loadCustom().find((x) => x.id === id);
    if (!c) return;
    setEditId(c.id); setName(c.name); setCategory(c.category); setTags(c.tags.join(', ')); setDesc(c.description);
    setVisibility(c.visibility); setAnimType(c.anim.type); setAnimDist(c.anim.distance);
    setShapes(clone(c.shapes)); setSel([]);
    histRef.current = { past: [], future: [], last: 0 };
  };
  const publish = () => {
    if (!name.trim()) return toast({ severity: 'error', message: 'Isi nama komponen' });
    if (!shapesRef.current.some((s) => !s.hole)) return toast({ severity: 'error', message: 'Tambahkan minimal satu bentuk solid' });
    const norm = normalizeShapes(shapesRef.current);
    const list = loadCustom();
    const id = editId ?? uid('cc');
    const comp: CustomComponent = {
      id, name: name.trim(), category, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), description: desc, visibility,
      shapes: norm.shapes,
      params: [{ key: 'w', label: 'Width', min: Math.max(10, Math.round(norm.width / 2)), max: Math.round(norm.width * 2), def: Math.round(norm.width) }],
      anim: { type: animType, distance: animDist, duration: 0.6 },
      width: norm.width, height: norm.height, depth: norm.depth, createdAt: new Date().toISOString(),
    };
    saveCustom(list.some((c) => c.id === id) ? list.map((c) => (c.id === id ? comp : c)) : [...list, comp]);
    setEditId(id);
    window.dispatchEvent(new Event('custom-library-changed'));
    toast({ severity: 'success', message: `"${comp.name}" disimpan ke My Components` });
    setUI({ modal: null });
  };

  /* ---------- 3D scene (mount once) ---------- */
  useEffect(() => {
    const el = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1c2128');
    const camera = new THREE.PerspectiveCamera(40, Math.max(1, el.clientWidth) / Math.max(1, el.clientHeight), 1, 3000);
    camera.position.set(150, 130, 180);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 30, 0);
    orbit.enableDamping = true;
    orbit.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    scene.add(new THREE.HemisphereLight('#ffffff', '#445566', 1.1));
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(120, 220, 160);
    key.castShadow = true;
    scene.add(key);
    scene.add(new THREE.GridHelper(400, 40, 0x1b9d6b, 0x3a4450));
    const root = new THREE.Group();
    scene.add(root);
    sceneRef.current = { renderer, camera, orbit, root };

    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); orbit.update(); renderer.render(scene, camera); };
    loop();
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);

    const planeHit = (e: PointerEvent, plane: THREE.Plane): THREE.Vector3 | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const pt = new THREE.Vector3();
      return ray.ray.intersectPlane(plane, pt) ? pt : null;
    };
    const pick = (e: PointerEvent): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(root.children.filter((c) => c.userData.id !== undefined), false);
      return hits.length ? (hits[0].object.userData.id as string) : null;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const id = pick(e);
      const cur = selRef.current;
      if (!id) { if (!e.shiftKey) setSel([]); return; }
      if (e.shiftKey) { setSel(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]); return; }
      const all = shapesRef.current;
      const ids = cur.includes(id) ? cur : expandGroups(all, [id]);
      if (!cur.includes(id)) setSel(ids);
      const s = all.find((x) => x.id === id);
      if (!s) return;
      // "Pilih" tool only selects; dragging needs the "Geser" tool or Alt (vertical)
      if (toolRef.current === 'select' && !e.altKey) return;
      const useY = e.altKey;
      let plane: THREE.Plane;
      if (useY) {
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const hn = new THREE.Vector3(camDir.x, 0, camDir.z);
        if (hn.lengthSq() < 1e-6) hn.set(0, 0, 1);
        plane = new THREE.Plane().setFromNormalAndCoplanarPoint(hn.normalize(), new THREE.Vector3(s.x, s.y, s.z));
      } else {
        plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -s.y);
      }
      const start = planeHit(e, plane) ?? new THREE.Vector3(s.x, s.y, s.z);
      const origin = new Map<string, { x: number; y: number; z: number }>();
      for (const sh of all) if (ids.includes(sh.id)) origin.set(sh.id, { x: sh.x, y: sh.y, z: sh.z });
      dragRef.current = { axis: useY ? 'y' : 'xz', plane, start, origin, moved: false };
      orbit.enabled = false;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const pt = planeHit(e, d.plane);
      if (!pt) return;
      let dx = 0, dy = 0, dz = 0;
      if (d.axis === 'y') dy = pt.y - d.start.y;
      else { dx = pt.x - d.start.x; dz = pt.z - d.start.z; }
      const st = snapRef.current;
      const q = (v: number) => (st > 0 ? Math.round(v / st) * st : Math.round(v * 10) / 10);
      dx = q(dx); dy = q(dy); dz = q(dz);
      if (!d.moved) {
        if (Math.hypot(dx, dy, dz) < 0.05) return;
        snapshot();
        d.moved = true;
      }
      setShapes((p) => p.map((s) => {
        const o = d.origin.get(s.id);
        return o ? { ...s, x: r1(o.x + dx), y: r1(Math.max(0, o.y + dy)), z: r1(o.z + dz) } : s;
      }));
      setHint(d.axis === 'y' ? `Tinggi pusat: ${r1(d.origin.values().next().value!.y + dy)} cm` : `Δx ${r1(dx)} · Δz ${r1(dz)} cm`);
    };
    const onUp = () => {
      if (dragRef.current) { dragRef.current = null; orbit.enabled = true; setHint(''); }
    };
    const el2 = renderer.domElement;
    // capture phase: runs before OrbitControls' own pointerdown so a shape drag doesn't also orbit the camera
    el2.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el2.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      orbit.dispose();
      renderer.dispose();
      el.removeChild(el2);
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // rebuild meshes whenever shapes or selection change
  useEffect(() => {
    const st = sceneRef.current;
    if (!st) return;
    while (st.root.children.length) {
      const o = st.root.children.pop() as THREE.Mesh;
      o.geometry?.dispose();
    }
    for (const s of shapes) st.root.add(makeMesh(s));
    for (const id of sel) {
      const m = st.root.children.find((c) => c.userData.id === id) as THREE.Mesh | undefined;
      if (m) st.root.add(new THREE.BoxHelper(m, 0x1b9d6b));
    }
  }, [shapes, sel]);

  // keyboard (capture phase so the app-level shortcuts don't also fire while the builder is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const handled = (fn: () => void) => { e.preventDefault(); e.stopPropagation(); fn(); };
      if (ctrl && k === 'z' && !e.shiftKey) return handled(undo);
      if (ctrl && ((k === 'z' && e.shiftKey) || k === 'y')) return handled(redo);
      if (ctrl && k === 'd') return handled(duplicateSel);
      if (ctrl && k === 'g' && !e.shiftKey) return handled(groupSel);
      if (ctrl && k === 'g' && e.shiftKey) return handled(ungroupSel);
      if (ctrl) return;
      if (e.key === 'Delete' || e.key === 'Backspace') return handled(deleteSel);
      if (e.key === 'Escape') return handled(() => setSel([]));
      if (k === 'v') return handled(() => setTool('select'));
      if (k === 'm') return handled(() => setTool('move'));
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') return handled(() => nudge(-step, 0, 0));
      if (e.key === 'ArrowRight') return handled(() => nudge(step, 0, 0));
      if (e.key === 'ArrowUp') return handled(() => nudge(0, 0, -step));
      if (e.key === 'ArrowDown') return handled(() => nudge(0, 0, step));
      if (e.key === 'PageUp') return handled(() => nudge(0, step, 0));
      if (e.key === 'PageDown') return handled(() => nudge(0, -step, 0));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // handlers only use refs / stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- derived ---------- */
  const selShapes = shapes.filter((s) => sel.includes(s.id));
  const one = selShapes.length === 1 ? selShapes[0] : null;
  const preview = normalizeShapes(shapes.filter((s) => !s.hole));
  const h = histRef.current;
  const myList = loadCustom().filter((c) => c.visibility !== 'public');

  const ToolBtn = ({ active, icon: Icon, label, onClick, kbd }: { active?: boolean; icon: LucideIcon; label: string; onClick: () => void; kbd?: string }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${active ? 'bg-[var(--bg-selected)] text-[var(--accent)]' : 'hover:bg-[var(--bg-hover)]'}`}>
      <Icon size={14} /> <span className="flex-1 truncate">{label}</span>
      {kbd && <span className="kbd">{kbd}</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 p-2 flex items-center justify-center" onMouseDown={(e) => e.target === e.currentTarget && setUI({ modal: null })}>
      <div className="card w-full max-w-[1400px] h-[94vh] flex flex-col overflow-hidden anim-in">
        {/* header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <Hammer size={15} style={{ color: 'var(--accent)' }} />
          <span className="font-bold text-sm">Component Builder</span>
          <span className="text-[11px] opacity-60">v2</span>
          <div className="w-px h-5 mx-2" style={{ background: 'var(--border)' }} />
          <button className="tb-btn" disabled={!h.past.length} title="Undo (Ctrl+Z)" onClick={undo}><Undo2 size={14} /></button>
          <button className="tb-btn" disabled={!h.future.length} title="Redo (Ctrl+Shift+Z)" onClick={redo}><Redo2 size={14} /></button>
          <div className="w-px h-5 mx-2" style={{ background: 'var(--border)' }} />
          <button className="btn flex items-center gap-1.5" onClick={() => fileRef.current?.click()}><FolderOpen size={13} /> Impor JSON</button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
          <button className="btn flex items-center gap-1.5" onClick={exportJson}><Download size={13} /> Ekspor JSON</button>
          <select className="input w-44!" value={editId ?? ''} onChange={(e) => e.target.value && loadExisting(e.target.value)} title="Muat komponen yang sudah ada">
            <option value="">Muat dari My Components…</option>
            {myList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex-1" />
          <button className="btn-primary flex items-center gap-1.5" onClick={publish}><Rocket size={13} /> Publish ke library</button>
          <button className="tb-btn" onClick={() => setUI({ modal: null })} title="Tutup (Esc di luar canvas)"><X size={16} /></button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* left: tools */}
          <div className="w-52 border-r overflow-y-auto p-1.5 flex flex-col gap-0.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <div className={SECTION}>Alat</div>
            <ToolBtn icon={MousePointer2} label="Pilih" kbd="V" active={tool === 'select'} onClick={() => setTool('select')} />
            <ToolBtn icon={Move} label="Geser" kbd="M" active={tool === 'move'} onClick={() => setTool('move')} />
            <div className={SECTION}>Tambah bentuk</div>
            {ADD.map((a) => <ToolBtn key={a.type} icon={a.icon} label={a.label} onClick={() => addPrimitive(a.type, a.dims)} />)}
            <div className={SECTION}>Preset perabot</div>
            {PRESETS.map((p) => <ToolBtn key={p.key} icon={p.key === 'door' ? DoorOpen : p.key === 'drawer' ? Layers : p.key === 'shelf' || p.key === 'divider' ? Minus : Box} label={p.label} onClick={() => addPreset(p.key)} />)}
            <div className={SECTION}>Edit</div>
            <ToolBtn icon={Copy} label="Duplikat" kbd="Ctrl+D" onClick={duplicateSel} />
            <ToolBtn icon={ArrowLeftRight} label="Mirror (copy)" onClick={mirrorCopy} />
            <ToolBtn icon={Group} label="Grup" kbd="Ctrl+G" onClick={groupSel} />
            <ToolBtn icon={Ungroup} label="Lepas grup" kbd="Ctrl+⇧G" onClick={ungroupSel} />
            <ToolBtn icon={Eye} label="Tandai lubang (hole)" onClick={toggleHole} />
            <ToolBtn icon={Trash2} label="Hapus" kbd="Del" onClick={deleteSel} />
          </div>

          {/* centre: canvas */}
          <div className="flex-1 relative min-w-0">
            <div ref={canvasRef} className="absolute inset-0" />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[11px]">
              <span className="badge">Canvas 3D</span>
              <span className="flex items-center gap-1 px-2 py-1 rounded border" style={{ background: 'color-mix(in srgb, var(--bg-panel) 85%, transparent)', borderColor: 'var(--border)' }}>
                <Magnet size={11} /> Snap
                <select className="bg-transparent text-[11px] outline-none" value={snap} onChange={(e) => setSnap(parseFloat(e.target.value))}>
                  <option value={0}>off</option><option value={0.5}>0.5 cm</option><option value={1}>1 cm</option><option value={5}>5 cm</option>
                </select>
              </span>
            </div>
            <div className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded" style={{ background: 'color-mix(in srgb, var(--bg-panel) 85%, transparent)', color: 'var(--text-secondary)' }}>
              Klik = pilih · Shift+klik = tambah · Drag = geser di lantai · Alt+drag = naik/turun · PageUp/Down · panah = geser 1 cm · klik kanan/tengah-drag = putar/geser kamera
              {hint && <div className="mt-0.5 font-mono" style={{ color: 'var(--accent)' }}>{hint}</div>}
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded font-mono" style={{ background: 'color-mix(in srgb, var(--bg-panel) 85%, transparent)', color: 'var(--text-secondary)' }}>
              {shapes.length} bentuk · ukuran {preview.width}×{preview.height}×{preview.depth} cm
            </div>
          </div>

          {/* right: inspector */}
          <div className="w-80 border-l flex flex-col min-h-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
            <div className="flex items-center h-9 border-b px-1 shrink-0" style={{ borderColor: 'var(--border)' }}>
              {([['props', 'Properti'], ['layers', 'Layer'], ['meta', 'Info & animasi']] as [RightTab, string][]).map(([t, l]) => (
                <button key={t} className={`tab flex-1 ${rtab === t ? 'active' : ''}`} onClick={() => setRtab(t)}>{l}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {rtab === 'props' && (
                <div className="p-3 flex flex-col gap-3">
                  {!selShapes.length && (
                    <div className="text-xs opacity-70 flex flex-col gap-2">
                      <div>Tidak ada bentuk terpilih.</div>
                      <div className="text-[11px] opacity-70">Tambahkan bentuk atau preset dari panel kiri, lalu klik di canvas atau pilih dari tab Layer.</div>
                    </div>
                  )}
                  {selShapes.length > 1 && (
                    <div className="text-xs">{selShapes.length} bentuk dipilih{selShapes.some((s) => s.group) ? ' (termasuk grup — bergerak bersama)' : ''}</div>
                  )}
                  {selShapes.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {one && (
                        <label className="flex flex-col gap-0.5">
                          <span className="label text-[9px]!">Nama bentuk</span>
                          <input className="input text-xs" value={one.name ?? ''} placeholder={one.type} onChange={(e) => updateSel({ name: e.target.value })} />
                        </label>
                      )}
                      <div className={SECTION + ' !px-0'}>Posisi (pusat)</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <NumIn label="X" value={selShapes[0].x} onChange={(v) => updateSel({ x: v })} />
                        <NumIn label="Y (tinggi)" value={selShapes[0].y} onChange={(v) => updateSel({ y: Math.max(0, v) })} />
                        <NumIn label="Z" value={selShapes[0].z} onChange={(v) => updateSel({ z: v })} />
                      </div>
                      {one && (
                        <>
                          <div className={SECTION + ' !px-0'}>Ukuran</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <NumIn label={one.type === 'cylinder' || one.type === 'sphere' || one.type === 'torus' ? 'Diameter' : 'Lebar (W)'} value={one.w} onChange={(v) => updateSel({ w: Math.max(0.2, v) })} />
                            <NumIn label="Tinggi (H)" value={one.h} onChange={(v) => updateSel({ h: Math.max(0.2, v) })} />
                            <NumIn label="Kedalaman (D)" value={one.d} onChange={(v) => updateSel({ d: Math.max(0.2, v) })} />
                          </div>
                          <div className={SECTION + ' !px-0'}>Rotasi (derajat)</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <NumIn label="RX" value={one.rx} onChange={(v) => updateSel({ rx: v })} />
                            <NumIn label="RY" value={one.ry} onChange={(v) => updateSel({ ry: v })} />
                            <NumIn label="RZ" value={one.rz} onChange={(v) => updateSel({ rz: v })} />
                          </div>
                          <div className="flex gap-1">
                            <button className="chip" onClick={() => updateSel({ rz: 90 })}>RZ 90°</button>
                            <button className="chip" onClick={() => updateSel({ rx: 90 })}>RX 90°</button>
                            <button className="chip" onClick={() => updateSel({ rx: 0, ry: 0, rz: 0 })}>Reset</button>
                          </div>
                        </>
                      )}
                      <div className={SECTION + ' !px-0'}>Material</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(MATERIAL_LOOK).filter(([k]) => k !== 'custom').map(([k, v]) => (
                          <button key={k} className={`chip ${selShapes.every((s) => s.mat === k) ? 'active' : ''}`} onClick={() => updateSel({ mat: k, color: v.color })}>{v.label}</button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 text-xs">
                        <span className="opacity-70">Warna kustom</span>
                        <input type="color" value={selShapes[0].color} onChange={(e) => updateSel({ mat: 'custom', color: e.target.value })} className="w-10 h-6" />
                      </label>
                      <div className={SECTION + ' !px-0'}>Fungsi</div>
                      <div className="flex flex-wrap gap-1">
                        {(['none', 'door', 'drawer', 'shelf', 'rail'] as const).map((r) => (
                          <button key={r} className={`chip ${selShapes.every((s) => (s.role ?? 'none') === r) ? 'active' : ''}`} onClick={() => updateSel({ role: r })}>
                            {r === 'none' ? 'Solid biasa' : r === 'door' ? 'Pintu' : r === 'drawer' ? 'Laci' : r === 'shelf' ? 'Rak' : 'Batang'}
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={selShapes.every((s) => s.hole)} onChange={toggleHole} />
                        Lubang / cut-out (tidak dirender di proyek)
                      </label>
                      <div className={SECTION + ' !px-0'}>Susun</div>
                      <div className="grid grid-cols-2 gap-1">
                        <button className="btn" onClick={() => { snapshot(); setShapes((p) => p.map((s) => (sel.includes(s.id) ? { ...s, y: s.h / 2 } : s))); }}>Ke lantai</button>
                        <button className="btn" onClick={() => {
                          snapshot();
                          const avg = selShapes.reduce((a, s) => a + s.x, 0) / selShapes.length;
                          setShapes((p) => p.map((s) => (sel.includes(s.id) ? { ...s, x: r1(avg) } : s)));
                        }}>Rata tengah X</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {rtab === 'layers' && (
                <div className="p-2 flex flex-col gap-0.5">
                  {shapes.length === 0 && <div className="text-xs opacity-60 p-2">Belum ada bentuk.</div>}
                  {shapes.map((s, i) => {
                    const look = lookFor(s);
                    const active = sel.includes(s.id);
                    return (
                      <button key={s.id} onClick={(e) => {
                        const ids = expandGroups(shapes, [s.id]);
                        if (e.shiftKey) setSel(active ? sel.filter((x) => x !== s.id) : [...sel, s.id]);
                        else setSel(ids);
                      }} className={`flex items-center gap-2 px-2 py-1 rounded text-left text-xs ${active ? 'bg-[var(--bg-selected)]' : 'hover:bg-[var(--bg-hover)]'}`}>
                        <span className="w-3 h-3 rounded-sm border border-black/20" style={{ background: s.hole ? '#ef5350' : look.color }} />
                        <span className="flex-1 truncate">{s.name ?? `${s.type} ${i + 1}`}</span>
                        {s.role && s.role !== 'none' && <span className="kbd">{s.role}</span>}
                        {s.group && <span className="text-[9px] opacity-60 font-mono">grup {s.group.slice(-4)}</span>}
                        {s.hole && <span className="text-[9px]" style={{ color: 'var(--error)' }}>hole</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {rtab === 'meta' && (
                <div className="p-3 flex flex-col gap-2.5 text-xs">
                  <div className={SECTION + ' !px-0'}>Info komponen</div>
                  <label className="flex flex-col gap-0.5"><span className="label text-[9px]!">Nama</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
                  <label className="flex flex-col gap-0.5"><span className="label text-[9px]!">Kategori</span>
                    <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {['Base Cabinet', 'Wall Cabinet', 'Tall Cabinet', 'Internal/Kitchen', 'Internal/Wardrobe', 'Appliance', 'Accessory', 'Decoration'].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5"><span className="label text-[9px]!">Tag (pisahkan koma)</span><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="rak, piring, chrome" /></label>
                  <label className="flex flex-col gap-0.5"><span className="label text-[9px]!">Deskripsi</span><textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
                  <label className="flex flex-col gap-0.5"><span className="label text-[9px]!">Visibilitas</span>
                    <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as 'private' | 'team' | 'public')}>
                      <option value="private">Private — hanya saya</option><option value="team">Team</option><option value="public">Public — Community</option>
                    </select>
                  </label>
                  <div className={SECTION + ' !px-0'}>Animasi</div>
                  {(['none', 'pullout', 'rotate', 'open', 'lift'] as const).map((a) => (
                    <label key={a} className="flex items-center gap-2">
                      <input type="radio" checked={animType === a} onChange={() => setAnimType(a)} />
                      {a === 'none' ? 'Tanpa animasi' : a === 'pullout' ? 'Tarik keluar (slide)' : a === 'rotate' ? 'Putar' : a === 'open' ? 'Buka (engsel)' : 'Angkat (gas strut)'}
                    </label>
                  ))}
                  {animType !== 'none' && (
                    <NumIn label="Jarak / sudut animasi (cm)" value={animDist} onChange={(v) => setAnimDist(Math.max(0, v))} />
                  )}
                  <div className={SECTION + ' !px-0'}>Parameter</div>
                  <div className="opacity-70">Ukuran akhir: <b>{preview.width} × {preview.height} × {preview.depth} cm</b>. Saat dipakai di proyek, komponen diskala otomatis ke lebar, tinggi, dan kedalaman item.</div>
                  <div className="opacity-70">Cut-out (hole) tidak dirender sebagai padat — gunakan untuk menandai bukaan.</div>
                  <div className="flex items-center gap-1.5 text-[11px]" style={{ color: preview.width > 0 ? 'var(--success)' : 'var(--warning)' }}>
                    {preview.width > 0 ? <Check size={12} /> : <TriangleAlert size={12} />}
                    {shapes.some((s) => !s.hole) ? 'Siap dipublish' : 'Tambahkan minimal satu bentuk solid'}
                  </div>
                  <div className="flex items-center gap-1.5 opacity-60"><Scaling size={12} /> Tip: gunakan preset untuk rak, pintu, dan laci sebagai titik awal.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
