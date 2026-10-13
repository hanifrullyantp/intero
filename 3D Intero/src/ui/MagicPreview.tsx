import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Project } from '../models/types';
import { buildFurniture, buildRoom, disposeObject } from '../viewport/scene3d';
import { computeCountertops } from '../engine/countertop';
import { RotateCw, Box } from './icons';

/** A separate scene: previewing a material never edits the open project. */
export default function MagicPreview({ project }: { project: Project | null }) {
  const host = useRef<HTMLDivElement>(null);
  const fitKey = useRef('');
  const state = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; orbit: OrbitControls; group: THREE.Group; targetPosition: THREE.Vector3; targetLook: THREE.Vector3; moving: boolean } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9ede9');
    scene.add(new THREE.HemisphereLight('#ffffff', '#a5a49e', 1.2));
    const sun = new THREE.DirectionalLight('#fff4e8', 2.2);
    sun.position.set(-150, 450, 500);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -600;
    sun.shadow.camera.right = sun.shadow.camera.top = 600;
    sun.shadow.camera.far = 1800;
    sun.shadow.normalBias = 1;
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
    camera.position.set(-300, 300, 650);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.maxPolarAngle = Math.PI / 2 - 0.08;
    orbit.minDistance = 160;
    orbit.maxDistance = 1800;
    const group = new THREE.Group();
    scene.add(group);
    state.current = { renderer, scene, camera, orbit, group, targetPosition: camera.position.clone(), targetLook: new THREE.Vector3(150, 100, 60), moving: true };
    orbit.addEventListener('start', () => { if (state.current) state.current.moving = false; });
    const resize = () => {
      const w = el.clientWidth || 350, h = el.clientHeight || 260;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const s = state.current;
      if (s?.moving) {
        camera.position.lerp(s.targetPosition, 0.08);
        orbit.target.lerp(s.targetLook, 0.08);
        if (camera.position.distanceTo(s.targetPosition) < 0.1) s.moving = false;
      }
      orbit.update();
      renderer.render(scene, camera);
    };
    frame();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      disposeObject(group);
      orbit.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      state.current = null;
      fitKey.current = '';
    };
  }, []);

  const fit = () => {
    const s = state.current;
    if (!s || !project) return;
    const W = project.room.width, D = project.layout === 'I' ? 140 : project.room.depth;
    const H = project.settings.defaults?.totalHeight ?? 220;
    const distance = Math.max(W, D, H) * 1.65;
    s.targetLook.set(W / 2, H * 0.43, project.layout === 'I' ? 30 : D * 0.33);
    const rightWall = project.room.walls.some((w) => w.nx < -0.5);
    const both = project.room.walls.some((w) => w.nx > 0.5) && rightWall;
    s.targetPosition.set(W / 2 + (both ? 0 : rightWall ? -0.6 : 0.6) * distance, H * 1.35, D * 0.45 + distance);
    s.moving = true;
  };

  useEffect(() => {
    const s = state.current;
    if (!s) return;
    const timeout = window.setTimeout(() => {
      for (const child of [...s.group.children]) { disposeObject(child); s.group.remove(child); }
      if (!project) return;
      s.group.add(buildRoom(project), buildFurniture(project, computeCountertops(project), {
        doorsOpen: false, showHandles: true, showDims: false, showContents: true, wireframe: false,
      }));
      const key = `${project.layout}:${project.room.width}:${project.room.depth}:${project.settings.defaults?.totalHeight}`;
      if (fitKey.current !== key) { fitKey.current = key; fit(); }
    }, 140);
    return () => clearTimeout(timeout);
  }, [project]);

  return <div className="magic-preview">
    <div ref={host} className="magic-preview-canvas" />
    <span className="magic-preview-caption"><span />Pratinjau langsung</span>
    <button className="magic-preview-reset" type="button" onClick={fit} title="Atur ulang kamera"><RotateCw size={14} /></button>
    {(!project || failed) && <div className="magic-preview-empty"><Box size={32} strokeWidth={1} /><span>{failed ? 'Pratinjau 3D memerlukan WebGL.' : 'Lengkapi ukuran untuk melihat desain.'}</span></div>}
    <small>Geser untuk memutar tampilan</small>
  </div>;
}