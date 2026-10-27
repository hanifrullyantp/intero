import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Item } from '../../types';
import type { PanelBox, ProductionBundle } from '../../production/types';
import { makeLabel } from '../../generators/common';
import { useStore } from '../../store';

export interface BlueprintOpts { selectedId: string | null; scope: 'all' | 'selected'; explode: number; labels: 'none' | 'code' | 'dims'; showAcp: boolean }
const COLORS: Record<string, string> = { ply18: '#CDAE80', ply15: '#DCC8A0', hdf5: '#8D7B63', acp4: '#9AA3AD' };
const UP = new THREE.Vector3(0, 1, 0);

function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
    const sp = c as THREE.Sprite;
    if (sp.isSprite) sp.material.map?.dispose();
  });
}

interface Props { bundle: ProductionBundle; items: Item[]; opts: BlueprintOpts }
export function BlueprintView({ bundle, items, opts }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ref = useRef<{ scene: THREE.Scene; cam: THREE.PerspectiveCamera; controls: OrbitControls; content: THREE.Group; fitKey: string } | null>(null);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(el.clientWidth || 300, el.clientHeight || 300);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.domElement.style.display = 'block';
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(3, 6, 4); scene.add(dl);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 0.9));
    const grid = new THREE.GridHelper(20, 40, 0x6b7280, 0x9ca3af);
    (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.3; scene.add(grid);
    const cam = new THREE.PerspectiveCamera(40, (el.clientWidth || 1) / (el.clientHeight || 1), 0.05, 200); cam.position.set(3, 2.5, 4);
    const controls = new OrbitControls(cam, renderer.domElement); controls.enableDamping = true;
    const content = new THREE.Group(); content.scale.setScalar(0.001); scene.add(content);
    ref.current = { scene, cam, controls, content, fitKey: '' };
    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, cam); };
    loop();
    const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); });
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); disposeTree(content); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); ref.current = null; };
  }, []);

  useEffect(() => {
    const r = ref.current; if (!r) return;
    for (const c of [...r.content.children]) { r.content.remove(c); disposeTree(c); }
    const list = opts.scope === 'selected' && opts.selectedId ? items.filter((i) => i.id === opts.selectedId) : items;
    const single = list.length === 1;
    const lineMat = new THREE.LineBasicMaterial({ color: theme === 'dark' ? 0xe5e7eb : 0x1f2937, transparent: true, opacity: 0.7 });
    for (const it of list) {
      const ip = bundle.items.find((p) => p.itemId === it.id); if (!ip) continue;
      const ig = new THREE.Group();
      if (!single) { ig.position.set(it.position.x, it.position.y, it.position.z); ig.rotation.y = (it.rotationY * Math.PI) / 180; }
      const cy0 = it.dims.h / 2;
      const explodeOf = (x: number, y: number, z: number) => { const d = new THREE.Vector3(x, y - cy0, z); if (d.lengthSq() < 1) d.set(0, 1, 0); return d.normalize().multiplyScalar(opts.explode); };
      const addBox = (b: PanelBox, color: string, opacity: number, label?: string) => {
        const geo = new THREE.BoxGeometry(b.sx, b.sy, b.sz);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
        const ex = explodeOf(b.cx, b.cy, b.cz);
        mesh.position.set(b.cx + ex.x, b.cy + ex.y, b.cz + ex.z);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat));
        ig.add(mesh);
        if (label) { const sp = makeLabel(label, '#1B9D6B'); sp.scale.set(190, 48, 1); sp.position.set(mesh.position.x, mesh.position.y + 40, mesh.position.z); ig.add(sp); }
      };
      if (ip.method === 'papan_hpl') {
        for (const p of ip.panels) {
          if (!p.box) continue;
          const doorLike = p.kind === 'door' || p.kind === 'drawer';
          const label = single && opts.labels !== 'none' ? (opts.labels === 'dims' ? `${p.code} ${(p.w / 10).toFixed(1)}×${(p.h / 10).toFixed(1)}` : p.code) : undefined;
          addBox(p.box, doorLike ? it.materials.doorColor : COLORS[p.material], 0.95, label);
        }
      } else {
        const tube = new THREE.MeshStandardMaterial({ color: '#B4BAC2', metalness: 0.8, roughness: 0.35 });
        for (const sg of ip.segments) {
          if (sg.virtual) continue;
          const a = new THREE.Vector3(sg.a.x, sg.a.y, sg.a.z), b = new THREE.Vector3(sg.b.x, sg.b.y, sg.b.z);
          const dir = b.clone().sub(a); const len = dir.length(); if (len < 1) continue; dir.normalize();
          const thick = sg.profile === '40x40' ? 40 : 20;
          const m = new THREE.Mesh(new THREE.BoxGeometry(thick, len, thick), tube);
          const mid = a.clone().add(b).multiplyScalar(0.5); const ex = explodeOf(mid.x, mid.y, mid.z);
          m.position.copy(mid).add(ex); m.quaternion.setFromUnitVectors(UP, dir); ig.add(m);
        }
        const jm = new THREE.MeshStandardMaterial({ color: '#1B9D6B', roughness: 0.5 });
        for (const j of ip.joints) { const s = new THREE.Mesh(new THREE.SphereGeometry(15, 10, 10), jm); const ex = explodeOf(j.x, j.y, j.z); s.position.set(j.x + ex.x, j.y + ex.y, j.z + ex.z); ig.add(s); }
        if (opts.showAcp) for (const p of ip.panels) if (p.box) addBox(p.box, p.kind === 'door' || p.kind === 'drawer' ? it.materials.doorColor : COLORS.acp4, 0.28, single && opts.labels !== 'none' ? p.code : undefined);
      }
      r.content.add(ig);
    }
    const key = `${opts.scope}|${opts.selectedId}|${list.length}`;
    if (r.fitKey !== key) {
      r.fitKey = key; r.content.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(r.content);
      if (!bb.isEmpty()) {
        const c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3()).length();
        r.controls.target.copy(c); r.cam.position.copy(c).add(new THREE.Vector3(0.7, 0.55, 1).normalize().multiplyScalar(Math.max(1.2, size * 1.1)));
      }
    }
  }, [bundle, items, opts, theme]);

  return <div ref={host} className="w-full h-full" style={{ minHeight: 240 }} />;
}
