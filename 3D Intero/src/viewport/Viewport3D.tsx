import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStore } from '../core/store';
import { buildFurniture, buildRoom, disposeObject } from './scene3d';
import { computeCountertops } from '../engine/countertop';
import { footprint, nearestWall, distanceToWall, pointInRect, rectsOverlap, verticalOverlap, overlapArea } from '../utils/geometry';

import { createItem, getEntry } from '../config/library';
import { loadCustom } from '../core/customLibrary';
import { getDrag, setDrag } from '../core/dragState';
import { snapRect } from '../engine/snapEngine';
import { isSink, isCooktop } from '../engine/constraints';
import { defaultsForNewItem } from '../engine/projectDimensions';

export const CAMERA_PRESETS: { id: string; label: string; key: string }[] = [
  { id: 'perspective', label: 'Perspective', key: '1' },
  { id: 'parallel', label: 'Parallel', key: '7' },
  { id: 'front', label: 'Front', key: '2' },
  { id: 'back', label: 'Back', key: '3' },
  { id: 'left', label: 'Left', key: '4' },
  { id: 'right', label: 'Right', key: '5' },
  { id: 'top', label: 'Top', key: '6' },
];

let captureFn: (() => HTMLCanvasElement | null) | null = null;
export function capture3D(): HTMLCanvasElement | null {
  return captureFn ? captureFn() : null;
}

/** Mobile-only camera preset picker (desktop uses header 3D menu). */
function MobileCameraDropdown() {
  const preset = useStore((s) => s.ui.cameraPreset);
  const setUI = useStore((s) => s.setUI);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);
  const active = CAMERA_PRESETS.find((p) => p.id === preset) ?? CAMERA_PRESETS[0];
  return (
    <div ref={ref} className="mobile-only absolute top-2 right-2 z-30">
      <button type="button" className="vp-btn active flex items-center gap-1.5" onClick={() => setOpen((o) => !o)} title="Camera angle">
        {active.label}
        <span className={`text-[9px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-9 card py-1 w-44 shadow-xl z-40">
          {CAMERA_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${p.id === preset ? 'text-[var(--accent)]' : ''}`}
              onClick={() => { setUI({ cameraPreset: p.id, fitRequest: useStore.getState().ui.fitRequest + 1 }); setOpen(false); }}
            >
              <span className="w-4 text-center opacity-70">{p.key}</span>
              <span className="flex-1">{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    furniture: THREE.Group | null;
    room: THREE.Group | null;
    helper: THREE.Box3Helper | null;
    hoverHelper: THREE.Box3Helper | null;
    gizmo: THREE.Group | null;
    tween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number; dur: number } | null;
    light: THREE.DirectionalLight;
  } | null>(null);
  const [dragInfo, setDragInfo] = useState<string | null>(null);

  const project = useStore((s) => s.project);
  const ui = useStore((s) => s.ui);
  const selectedIds = useStore((s) => s.selectedIds);
  const hoverId = useStore((s) => s.hoverId);
  const slabs = useMemo(() => computeCountertops(project), [project]);

  // ---- init ----
  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // never start at 0 px — a zero-sized canvas renders nothing even after the first resize
    renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1f2b');
    scene.fog = new THREE.Fog('#1a1f2b', 1500, 3500);
    const camera = new THREE.PerspectiveCamera(45, Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight), 1, 6000);
    camera.position.set(400, 300, 600);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(150, 90, 120);
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

    const hemi = new THREE.HemisphereLight('#dfe9ff', '#5a4a3a', 0.9);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight('#fff4e0', 2.0);
    dir.position.set(300, 500, 400);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 10;
    dir.shadow.camera.far = 2500;
    dir.shadow.bias = -0.0004;
    dir.shadow.normalBias = 1.5;
    scene.add(dir);
    scene.add(dir.target);
    const fill = new THREE.DirectionalLight('#9fc5ff', 0.5);
    fill.position.set(-400, 250, -200);
    scene.add(fill);
    const point = new THREE.PointLight('#ffe6c0', 1.2, 900, 1.5);
    point.position.set(150, 240, 200);
    scene.add(point);

    stateRef.current = { renderer, scene, camera, controls, furniture: null, room: null, helper: null, hoverHelper: null, gizmo: null, tween: null, light: dir };

    // Move tool: scroll wheel on selected object = vertical move (capture phase beats OrbitControls)
    let lastWheelCommit = 0;
    const onWheelCapture = (e: WheelEvent) => {
      const s = useStore.getState();
      if (s.ui.tool !== 'move' || s.selectedIds.length !== 1) return;
      const it = s.project.items.find((i) => i.id === s.selectedIds[0]);
      if (!it || it.locked) return;
      e.preventDefault();
      e.stopPropagation();
      const step = (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 10 : 1);
      const now = performance.now();
      if (now - lastWheelCommit > 800) s.commit();
      lastWheelCommit = now;
      const maxE = Math.max(0, s.project.room.ceilingHeight - it.height);
      s.updateItem(it.id, { elevation: Math.round(Math.max(0, Math.min(maxE, it.elevation + step)) * 10) / 10 }, false);
    };
    mount.addEventListener('wheel', onWheelCapture, { capture: true, passive: false });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const st = stateRef.current!;
      if (st.tween) {
        const k = Math.min(1, (performance.now() - st.tween.start) / st.tween.dur);
        const e = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(st.tween.from, st.tween.to, e);
        controls.target.lerpVectors(st.tween.tFrom, st.tween.tTo, e);
        if (k >= 1) st.tween = null;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);
    captureFn = () => {
      renderer.render(scene, camera);
      return renderer.domElement;
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener('wheel', onWheelCapture, { capture: true } as EventListenerOptions);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      captureFn = null;
    };
  }, []);

  // ---- XYZ transform gizmo (Move tool / single selection) ----
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    if (st.gizmo) {
      st.scene.remove(st.gizmo);
      st.gizmo = null;
    }
    if (selectedIds.length !== 1 || (ui.tool !== 'move' && ui.tool !== 'select')) return;
    const it = project.items.find((i) => i.id === selectedIds[0]);
    if (!it || it.locked || it.visible === false) return;
    const f = footprint(it);
    const g = new THREE.Group();
    const len = Math.max(35, Math.min(90, Math.max(it.width, it.height) * 0.6));
    const mk = (dir: THREE.Vector3, color: number, axis: string) => {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), len, color, len * 0.28, len * 0.14);
      arrow.traverse((o) => {
        o.userData.gizmoAxis = axis;
        o.renderOrder = 1000;
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) { m.depthTest = false; m.transparent = true; m.opacity = ui.tool === 'move' ? 1 : 0.55; }
      });
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, len, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(dir.clone().multiplyScalar(len / 2));
      hit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      hit.userData.gizmoAxis = axis;
      g.add(arrow, hit);
    };
    mk(new THREE.Vector3(1, 0, 0), 0xff4444, 'x');
    mk(new THREE.Vector3(0, 1, 0), 0x2fbf71, 'y');
    mk(new THREE.Vector3(0, 0, 1), 0x4488ff, 'z');
    const ball = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    ball.renderOrder = 1001;
    ball.userData.gizmoAxis = 'free';
    g.add(ball);
    g.position.set(f.x + f.w / 2, it.elevation + it.height / 2, f.y + f.h / 2);
    st.gizmo = g;
    st.scene.add(g);
  }, [selectedIds, project.items, ui.tool]);

  // ---- tool → controls mapping ----
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    if (ui.tool === 'pan') {
      st.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
      st.controls.enabled = true;
    } else if (ui.tool === 'move') {
      st.controls.mouseButtons = { LEFT: -1 as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      st.controls.enabled = true;
    } else {
      st.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      st.controls.enabled = true;
    }
    st.renderer.domElement.style.cursor = ui.tool === 'move' ? 'move' : ui.tool === 'pan' ? 'grab' : ui.tool === 'zoom' ? 'zoom-in' : 'default';
  }, [ui.tool]);

  // ---- room ----
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    if (st.room) {
      st.scene.remove(st.room);
      disposeObject(st.room);
    }
    st.room = buildRoom(project);
    st.scene.add(st.room);
    const r = project.room;
    st.light.target.position.set(r.width / 2, 0, r.depth / 2);
    const s = Math.max(r.width, r.depth) * 0.9;
    st.light.shadow.camera.left = -s;
    st.light.shadow.camera.right = s;
    st.light.shadow.camera.top = s;
    st.light.shadow.camera.bottom = -s;
    st.light.shadow.camera.updateProjectionMatrix();
    st.light.position.set(r.width / 2 + 250, 520, r.depth / 2 + 420);
  }, [project.room]);

  // ---- furniture rebuild ----
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    if (st.furniture) {
      st.scene.remove(st.furniture);
      disposeObject(st.furniture);
    }
    st.furniture = buildFurniture(project, slabs, { doorsOpen: ui.doorsOpen, showHandles: ui.showHandles, wireframe: ui.wireframe, showDims: ui.showDims, openView: ui.openView, showContents: ui.showContents, isolateIds: ui.isolateIds });
    st.furniture.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = ui.showShadows && !m.userData.led && !m.userData.disposeMaterial;
        m.receiveShadow = ui.showShadows;
      }
    });
    st.renderer.shadowMap.enabled = ui.showShadows;
    st.renderer.shadowMap.needsUpdate = true;
    st.scene.add(st.furniture);
  }, [project, slabs, ui.doorsOpen, ui.showHandles, ui.wireframe, ui.showDims, ui.showShadows, ui.openView, ui.showContents, ui.isolateIds]);

  // ---- selection helper ----
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    if (st.helper) {
      st.scene.remove(st.helper);
      st.helper = null;
    }
    if (st.hoverHelper) {
      st.scene.remove(st.hoverHelper);
      st.hoverHelper = null;
    }
    const mk = (ids: string[], color: string) => {
      const box = new THREE.Box3();
      let any = false;
      for (const id of ids) {
        const it = project.items.find((i) => i.id === id);
        if (!it) continue;
        const f = footprint(it);
        box.union(new THREE.Box3(new THREE.Vector3(f.x - 1, it.elevation - 1, f.y - 1), new THREE.Vector3(f.x + f.w + 1, it.elevation + it.height + 1, f.y + f.h + 1)));
        any = true;
      }
      if (!any) return null;
      const h = new THREE.Box3Helper(box, new THREE.Color(color));
      (h.material as THREE.LineBasicMaterial).depthTest = false;
      h.renderOrder = 998;
      return h;
    };
    st.helper = mk(selectedIds, '#1b9d6b');
    if (st.helper) st.scene.add(st.helper);
    if (hoverId && !selectedIds.includes(hoverId)) {
      st.hoverHelper = mk([hoverId], '#8892a0');
      if (st.hoverHelper) st.scene.add(st.hoverHelper);
    }
  }, [selectedIds, hoverId, project.items]);

  // ---- camera presets / fit ----
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const r = project.room;
    const cx = r.width / 2;
    const cz = r.depth / 2;
    const size = Math.max(r.width, r.depth, 200);
    const dist = size * 1.4;
    const top = project.settings.defaults?.totalHeight ?? 220;
    const target = new THREE.Vector3(cx, top * 0.46, cz * 0.65);
    st.camera.fov = ui.cameraPreset === 'parallel' ? 28 : 42;
    st.camera.updateProjectionMatrix();
    let pos: THREE.Vector3;
    switch (ui.cameraPreset) {
      case 'front':
        pos = new THREE.Vector3(cx, 120, cz + dist);
        break;
      case 'back':
        pos = new THREE.Vector3(cx, 120, -dist * 0.8);
        break;
      case 'left':
        pos = new THREE.Vector3(-dist, 120, cz);
        break;
      case 'right':
        pos = new THREE.Vector3(r.width + dist, 120, cz);
        break;
      case 'top':
        pos = new THREE.Vector3(cx, dist * 1.3, cz + 1);
        target.set(cx, 0, cz);
        break;
      case 'parallel':
        pos = new THREE.Vector3(cx + dist * 0.85, top * 0.95, cz + dist * 0.35);
        target.set(cx, top * 0.35, cz);
        break;
      default: {
        // View from the open side of the L, not through its returning wall.
        const rightWall = r.walls.some((w) => w.nx < -0.5 && !w.virtual);
        const leftWall = r.walls.some((w) => w.nx > 0.5 && !w.virtual);
        const side = rightWall && leftWall ? 0 : rightWall ? -1 : 1;
        pos = new THREE.Vector3(cx + side * dist * 0.6, top * 1.4, cz + dist);
      }
    }
    st.tween = { from: st.camera.position.clone(), to: pos, tFrom: st.controls.target.clone(), tTo: target, start: performance.now(), dur: 650 };
  }, [ui.cameraPreset, ui.fitRequest, project.room]);

  // ---- picking ----
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const el = st.renderer.domElement;
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPos: { x: number; y: number } | null = null;
    const pick = (e: MouseEvent): string | null => {
      const rect = el.getBoundingClientRect();
      mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(mouse, st.camera);
      if (!st.furniture) return null;
      const hits = ray.intersectObjects(st.furniture.children, true).filter((h) => !(h.object as THREE.Sprite).isSprite);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (o.userData.itemId) return o.userData.itemId as string;
          o = o.parent;
        }
      }
      return null;
    };
    let drag3d: { id: string; plane: THREE.Plane; offset: THREE.Vector3; ox: number; oy: number; moved: boolean } | null = null;
    const planeHit = (e: MouseEvent, plane: THREE.Plane): THREE.Vector3 | null => {
      const rect = el.getBoundingClientRect();
      mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(mouse, st.camera);
      const pt = new THREE.Vector3();
      return ray.ray.intersectPlane(plane, pt) ? pt : null;
    };
    let gizmoDrag: { axis: string; id: string; plane: THREE.Plane; start: THREE.Vector3; ox: number; oy: number; oe: number; moved: boolean } | null = null;
    const snapHeights = (it: { id: string; height: number; subtype: string; x: number; y: number }, elev: number): { v: number; label: string } | null => {
      const s = useStore.getState();
      const cands: { v: number; label: string }[] = [{ v: 0, label: 'floor' }, { v: 135, label: 'wall cabinet bottom' }, { v: Math.max(0, s.project.room.ceilingHeight - it.height), label: 'ceiling' }];
      const f = footprint(it as never);
      const cx = f.x + f.w / 2; const cz = f.y + f.h / 2;
      const ck = s.project.items.find((c) => c.subtype.startsWith('app_cooktop') && (() => { const g = footprint(c); return cx >= g.x - 20 && cx <= g.x + g.w + 20 && cz >= g.y - 20 && cz <= g.y + g.h + 20; })());
      if (ck) for (const d of [55, 65, 75, 85]) cands.push({ v: ck.elevation + ck.height + d, label: `${d} cm above cooktop` });
      const base = s.project.items.find((b) => b.kind === 'cabinet' && b.category === 'base');
      if (base) cands.push({ v: base.elevation + base.height + s.project.materials.countertopThickness, label: 'worktop' });
      let best: { v: number; label: string } | null = null;
      for (const c of cands) if (Math.abs(c.v - elev) < 2.5 && (!best || Math.abs(c.v - elev) < Math.abs(best.v - elev))) best = c;
      return best;
    };
    const onDown = (e: MouseEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
      if (useStore.getState().ui.accessMode === 'view') return;
      // XYZ gizmo grab (Move or Select tool, single selection)
      if (e.button === 0 && st.gizmo && useStore.getState().selectedIds.length === 1) {
        const rect = el.getBoundingClientRect();
        mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(mouse, st.camera);
        const gh = ray.intersectObjects(st.gizmo.children, true).find((h) => h.object.userData.gizmoAxis);
        if (gh) {
          const s = useStore.getState();
          const it = s.project.items.find((i) => i.id === s.selectedIds[0])!;
          const axis = gh.object.userData.gizmoAxis as string;
          const center = st.gizmo.position.clone();
          let plane: THREE.Plane;
          if (axis === 'y') {
            const camDir = new THREE.Vector3();
            st.camera.getWorldDirection(camDir);
            camDir.y = 0;
            if (camDir.lengthSq() < 1e-6) camDir.set(0, 0, 1);
            camDir.normalize();
            plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, center);
          } else {
            plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -center.y);
          }
          const start = planeHit(e, plane) ?? center.clone();
          gizmoDrag = { axis, id: it.id, plane, start, ox: it.x, oy: it.y, oe: it.elevation, moved: false };
          st.controls.enabled = false;
          return;
        }
      }
      // Move tool: start ground-plane drag
      if (e.button === 0 && useStore.getState().ui.tool === 'move') {
        const id = pick(e);
        if (id) {
          const it = useStore.getState().project.items.find((i) => i.id === id);
          if (it && !it.locked) {
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Math.max(0, it.elevation));
            const pt = planeHit(e, plane);
            const f = footprint(it);
            drag3d = { id, plane, offset: pt ? new THREE.Vector3(pt.x - f.x, 0, pt.z - f.y) : new THREE.Vector3(f.w / 2, 0, f.h / 2), ox: it.x, oy: it.y, moved: false };
            st.controls.enabled = false;
            useStore.getState().select([id]);
          }
        }
      }
    };
    const onUp = (e: MouseEvent) => {
      const viewOnly = useStore.getState().ui.accessMode === 'view';
      if (viewOnly) {
        if (gizmoDrag) { gizmoDrag = null; stateRef.current!.controls.enabled = true; downPos = null; setDragInfo(null); return; }
        if (drag3d) { drag3d = null; stateRef.current!.controls.enabled = true; downPos = null; return; }
        if (!downPos || Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 4) return;
        const st = useStore.getState();
        if (st.ui.tool === 'zoom' && e.button === 0) {
          const SR = stateRef.current!;
          const f = e.altKey ? 1.5 : 0.67;
          const dir = SR.camera.position.clone().sub(SR.controls.target).multiplyScalar(f);
          SR.tween = { from: SR.camera.position.clone(), to: SR.controls.target.clone().add(dir), tFrom: SR.controls.target.clone(), tTo: SR.controls.target.clone(), start: performance.now(), dur: 300 };
          return;
        }
        if (e.button === 0) {
          const id = pick(e);
          if (id) {
            const it = st.project.items.find((i) => i.id === id);
            if (it?.kind === 'cabinet') {
              const target = (it.openAmount ?? 0) > 0.5 ? 0 : 1;
              const start = performance.now(); const from = it.openAmount ?? 0;
              const dur = st.ui.openSpeed * 1000;
              const step = (t: number) => {
                const k = Math.min(1, (t - start) / dur);
                const e2 = 1 - Math.pow(1 - k, 3);
                useStore.getState().updateItem(id, { openAmount: from + (target - from) * e2 }, false);
                if (k < 1) requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            }
          }
        }
        return;
      }
      // finish gizmo drag
      if (gizmoDrag) {
        const wasMoved = gizmoDrag.moved;
        gizmoDrag = null;
        stateRef.current!.controls.enabled = true;
        downPos = null;
        setDragInfo(null);
        if (wasMoved) return;
      }
      // finish 3D move-drag
      if (drag3d) {
        const wasMoved = drag3d.moved;
        drag3d = null;
        stateRef.current!.controls.enabled = true;
        downPos = null;
        if (wasMoved) return;
      }
      if (!downPos || Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 4) return;
      const { select, setUI } = useStore.getState();
      // zoom tool: click to dolly toward target
      if (useStore.getState().ui.tool === 'zoom' && e.button === 0) {
        const SR = stateRef.current!;
        const f = e.altKey ? 1.5 : 0.67;
        const dir = SR.camera.position.clone().sub(SR.controls.target).multiplyScalar(f);
        SR.tween = { from: SR.camera.position.clone(), to: SR.controls.target.clone().add(dir), tFrom: SR.controls.target.clone(), tTo: SR.controls.target.clone(), start: performance.now(), dur: 300 };
        return;
      }
      if (e.button === 2) {
        const id = pick(e);
        if (id) select([id]);
        setUI({ contextMenu: { x: e.clientX, y: e.clientY, itemId: id } });
        return;
      }
      if (e.button !== 0) return;
      const id = pick(e);
      const st = useStore.getState();
      // paint / eyedropper tools
      if (id && st.ui.tool === 'paint') {
        const it = st.project.items.find((i) => i.id === id)!;
        st.updateItemConfig(id, { materials: { ...it.config.materials, useDefault: false, doorColor: st.project.materials.doorColor } });
        st.toast({ severity: 'success', message: `Painted ${it.name}`, ttl: 1200 });
        return;
      }
      if (id && st.ui.tool === 'eyedropper') {
        const it = st.project.items.find((i) => i.id === id)!;
        const c = it.config.materials.useDefault ? st.project.materials.doorColor : it.config.materials.doorColor ?? st.project.materials.doorColor;
        st.setMaterials({ doorColor: c });
        st.toast({ severity: 'info', message: `Sampled ${it.name} colour`, ttl: 1500 });
        st.setUI({ tool: 'select' });
        return;
      }
      // open-mode: click toggles that cabinet's doors
      if (id && st.ui.rightOpen && st.ui.rightTab === 'open' && !e.shiftKey) {
        const it = st.project.items.find((i) => i.id === id);
        if (it?.kind === 'cabinet') {
          select([id]);
          const target = (it.openAmount ?? 0) > 0.5 ? 0 : 1;
          const start = performance.now(); const from = it.openAmount ?? 0;
          const dur = st.ui.openSpeed * 1000;
          const step = (t: number) => {
            const k = Math.min(1, (t - start) / dur);
            const e2 = 1 - Math.pow(1 - k, 3);
            useStore.getState().updateItem(id, { openAmount: from + (target - from) * e2 }, false);
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          return;
        }
      }
      if (id) {
        const it = st.project.items.find((i) => i.id === id);
        if (it?.locked && !e.shiftKey) { st.toast({ severity: 'warning', message: 'Item is locked (unlock in Layers)', ttl: 1500 }); return; }
        select([id], e.shiftKey);
      }
      else if (!e.shiftKey) select([]);
    };
    const onMove = (e: MouseEvent) => {
      // gizmo axis drag (X / Z on ground plane, Y vertical, free = XZ)
      if (gizmoDrag && e.buttons === 1) {
        const pt = planeHit(e, gizmoDrag.plane);
        if (!pt) return;
        const s = useStore.getState();
        const it = s.project.items.find((i) => i.id === gizmoDrag!.id);
        if (!it) return;
        const d = pt.clone().sub(gizmoDrag.start);
        const grid = s.ui.snap ? s.project.settings.gridSize : 0.1;
        const q = (v: number) => Math.round(v / grid) * grid;
        if (!gizmoDrag.moved && d.length() > 0.3) { s.commit(); gizmoDrag.moved = true; }
        if (!gizmoDrag.moved) return;
        const f = footprint(it);
        if (gizmoDrag.axis === 'y') {
          let elev = q(gizmoDrag.oe + d.y);
          elev = Math.max(0, Math.min(s.project.room.ceilingHeight - it.height, elev));
          const snap = s.ui.snap ? snapHeights(it, elev) : null;
          if (snap) elev = snap.v;
          s.updateItem(it.id, { elevation: Math.round(elev * 10) / 10 }, false);
          const ck = s.project.items.find((c) => c.subtype.startsWith('app_cooktop'));
          const above = ck && it.subtype.startsWith('app_hood') ? ` · ${Math.round(elev - (ck.elevation + ck.height))} cm above cooktop` : '';
          setDragInfo(`Z ${Math.round(elev * 10) / 10} cm${snap ? ` · snapped: ${snap.label}` : ''}${above}`);
        } else {
          let nx = gizmoDrag.ox + (gizmoDrag.axis === 'z' ? 0 : d.x);
          let nz = gizmoDrag.oy + (gizmoDrag.axis === 'x' ? 0 : d.z);
          nx = Math.max(0, Math.min(s.project.room.width - f.w, q(nx)));
          nz = Math.max(0, Math.min(s.project.room.depth - f.h, q(nz)));
          s.updateItem(it.id, { x: Math.round(nx * 10) / 10, y: Math.round(nz * 10) / 10 }, false);
          setDragInfo(`X ${Math.round(nx * 10) / 10} · Y ${Math.round(nz * 10) / 10} cm${gizmoDrag.axis !== 'free' ? ` [${gizmoDrag.axis.toUpperCase()} locked]` : ''}`);
        }
        return;
      }
      // 3D move-drag on ground plane
      if (drag3d && e.buttons === 1) {
        const pt = planeHit(e, drag3d.plane);
        if (!pt) return;
        const s = useStore.getState();
        const it = s.project.items.find((i) => i.id === drag3d!.id);
        if (!it) return;
        let nx = pt.x - drag3d.offset.x;
        let nz = pt.z - drag3d.offset.z;
        // Shift: constrain to dominant axis
        if (e.shiftKey) {
          if (Math.abs(nx - drag3d.ox) >= Math.abs(nz - drag3d.oy)) nz = drag3d.oy;
          else nx = drag3d.ox;
        }
        if (s.ui.snap) {
          const g = s.project.settings.gridSize;
          nx = Math.round(nx / g) * g;
          nz = Math.round(nz / g) * g;
        }
        const f = footprint(it);
        nx = Math.max(0, Math.min(s.project.room.width - f.w, nx));
        nz = Math.max(0, Math.min(s.project.room.depth - f.h, nz));
        if (!drag3d.moved && Math.hypot(nx - drag3d.ox, nz - drag3d.oy) > 0.05) {
          s.commit();
          drag3d.moved = true;
        }
        if (drag3d.moved) s.updateItem(drag3d.id, { x: Math.round(nx * 10) / 10, y: Math.round(nz * 10) / 10 }, false);
        return;
      }
      if (e.buttons) return;
      useStore.getState().setHover(pick(e));
    };
    const onDbl = (e: MouseEvent) => {
      const id = pick(e);
      if (id) {
        const it = useStore.getState().project.items.find((i) => i.id === id);
        useStore.getState().select([id]);
        useStore.getState().setUI({ modal: it?.subtype.startsWith('app_hood') ? 'hood' : 'editor', rightOpen: true });
      }
    };
    const onCtx = (e: MouseEvent) => e.preventDefault();
    // ---- drag & drop from the component library into 3D ----
    let ghost: THREE.Mesh | null = null;
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0x1b9d6b, transparent: true, opacity: 0.45, depthTest: false });
    const dropPlace = (e: DragEvent) => {
      const s = useStore.getState();
      const entryId = getDrag() || e.dataTransfer?.getData('text/plain') || '';
      if (!entryId) return null;
      const entry = getEntry(entryId.startsWith('custom:') ? 'acc_open_shelving' : entryId);
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const pt = planeHit(e as unknown as MouseEvent, ground);
      if (!pt) return null;
      const item = defaultsForNewItem(createItem(entryId.startsWith('custom:') ? 'acc_open_shelving' : entryId), s.project);
      if (entryId.startsWith('custom:')) { const comp = loadCustom().find((c) => c.id === entryId.slice(7)); if (comp) { item.subtype = entryId; item.name = comp.name; item.width = comp.width; item.height = comp.height; item.depth = comp.depth; item.elevation = 0; } }
      const probe = { x: pt.x - entry.width / 2, y: pt.z - entry.depth / 2, w: entry.width, h: entry.depth };
      const wall = nearestWall(s.project.room.walls, probe);
      if (wall) { item.rotation = wall.rotation; item.wallId = wall.id; }
      const f0 = footprint(item);
      let x = pt.x - f0.w / 2;
      let z = pt.z - f0.h / 2;
      if (wall && item.kind !== 'appliance') {
        const dW = distanceToWall(wall, { x, y: z, w: f0.w, h: f0.h });
        if (Math.abs(dW) < 45) {
          if (wall.rotation === 0) z = wall.y1; else if (wall.rotation === 180) z = wall.y1 - f0.h; else if (wall.rotation === 270) x = wall.x1; else x = wall.x1 - f0.w;
        }
      }
      // wall cabinets: align over base cabinet under cursor
      if (item.category === 'wall') {
        const host = s.project.items.find((i) => i.kind === 'cabinet' && i.category === 'base' && pointInRect(pt.x, pt.z, footprint(i)));
        if (host) { item.rotation = host.rotation; item.width = host.width; const hf = footprint(host); const f1 = footprint(item); x = host.rotation % 180 === 0 ? hf.x : host.rotation === 270 ? hf.x : hf.x + hf.w - f1.w; z = host.rotation % 180 === 0 ? (host.rotation === 0 ? hf.y : hf.y + hf.h - f1.h) : hf.y; }
      }
      // sink / cooktop: centre on base cabinet under cursor
      if (item.kind === 'appliance' && (isSink(item) || isCooktop(item))) {
        const host = s.project.items.find((i) => i.kind === 'cabinet' && i.category === 'base' && pointInRect(pt.x, pt.z, footprint(i)));
        if (host) { item.rotation = host.rotation; const hf = footprint(host); const f1 = footprint(item); x = hf.x + (hf.w - f1.w) / 2; z = hf.y + (hf.h - f1.h) / 2; item.elevation = host.elevation + host.height + (isCooktop(item) ? s.project.materials.countertopThickness : 0); }
      }
      const f = footprint(item);
      const res = snapRect({ x, y: z, w: f.w, h: f.h }, item.id, s.project.items, s.project.room, { grid: s.ui.snap && !e.shiftKey, gridSize: s.project.settings.gridSize, objects: s.ui.snapObjects && !e.shiftKey, threshold: 6 });
      item.x = res.x; item.y = res.y;
      const ff = footprint(item);
      const collides = s.project.items.some((o) => o.kind !== 'accessory' && item.kind !== 'accessory' && rectsOverlap(ff, footprint(o), 0.5) && verticalOverlap(item, o) && overlapArea(ff, footprint(o)) > 4 && !(item.kind === 'appliance' && o.category === 'base' && item.elevation >= o.height - 1));
      return { item, valid: !collides };
    };
    const onDragOver = (e: DragEvent) => {
      if (!getDrag()) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const r = dropPlace(e);
      if (!r) return;
      const f = footprint(r.item);
      if (!ghost) { ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat); ghost.renderOrder = 900; st.scene.add(ghost); }
      ghost.scale.set(f.w, r.item.height, f.h);
      ghost.position.set(f.x + f.w / 2, r.item.elevation + r.item.height / 2, f.y + f.h / 2);
      ghostMat.color.set(r.valid ? 0x1b9d6b : 0xdc2626);
      setDragInfo(`${r.item.name} ${r.item.width}×${r.item.depth} @ ${f.x.toFixed(0)}, ${f.y.toFixed(0)} · elev ${r.item.elevation}${r.valid ? '' : ' · collision'}`);
    };
    const clearGhost = () => { if (ghost) { st.scene.remove(ghost); ghost.geometry.dispose(); ghost = null; } setDragInfo(null); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const r = dropPlace(e);
      clearGhost();
      const s = useStore.getState();
      setDrag(null);
      if (!r) return;
      s.addItem(r.item);
      s.toast({ severity: r.valid ? 'success' : 'warning', message: r.valid ? `${r.item.name} placed in 3D` : `${r.item.name} placed with a collision — adjust its position`, ttl: 2000 });
    };
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', clearGhost);
    el.addEventListener('drop', onDrop);
    el.addEventListener('mousedown', onDown, true); // capture: gizmo/drag grabs must beat OrbitControls
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('dblclick', onDbl);
    el.addEventListener('contextmenu', onCtx);
    return () => {
      el.removeEventListener('mousedown', onDown, true);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('dblclick', onDbl);
      el.removeEventListener('contextmenu', onCtx);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      <MobileCameraDropdown />
      {dragInfo && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 card px-3 py-1.5 text-xs font-mono shadow-lg" style={{ borderColor: 'var(--accent)' }}>{dragInfo}</div>
      )}
      {ui.tool === 'move' && !dragInfo && (
        <div className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded" style={{ color: 'var(--text-secondary)', background: 'color-mix(in srgb, var(--bg-panel) 75%, transparent)' }}>
          Move: drag object or XYZ arrows · green = up/down · scroll = elevation · Shift = axis lock
        </div>
      )}
    </div>
  );
}
