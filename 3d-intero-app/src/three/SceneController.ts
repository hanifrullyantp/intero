// 3D Intero — SceneController: renderer, kamera, kontrol, sinkronisasi item ↔ Object3D, pengukuran, export
import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import type { DimensionLine, Item, ProjectSettings, RowKind, ToolId, TopSubMode, V3, ViewMode, Wall } from '../types';
import { MatCache, makeLabel, makeDimLabel, setGroupOpacity } from '../generators/common';
import { buildItem, buildRoom, type GenCtx } from '../generators';
import { computeCountertopRuns, genCountertopRun } from '../generators/countertop';
import { AnimationController, setExplode } from '../engine/animation';
import { animateStir, animateWash, animateWalk, buildPerson, type PersonStyle } from '../generators/people';
import { roomBounds, roomCenter, rowOf } from '../engine/walls';
import { cabinetSig } from '../projectdoc/reconcile';
import { degToRad, radToDeg } from '../lib/utils';

export interface SceneCallbacks {
  onTransformLive?: (id: string, pos: V3, rotY: number) => void;
  onTransformEnd?: (id: string, pos: V3, rotY: number, scale?: V3) => void;
  onDragging?: (dragging: boolean) => void;
  onFps?: (fps: number) => void;
}

interface BuiltEntry { item: Item; group: THREE.Group; sig: string; cache: MatCache }
const S = 0.001; // mm → m

export class SceneController {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly root = new THREE.Group();
  readonly camP: THREE.PerspectiveCamera;
  readonly camO: THREE.OrthographicCamera;
  camera: THREE.Camera;
  controls: OrbitControls;
  transform: TransformControls;
  readonly anim = new AnimationController();
  readonly isMobile: boolean;

  private built = new Map<string, BuiltEntry>();
  private sharedCache = new MatCache();
  private roomGroup: THREE.Group | null = null;
  private ctGroup = new THREE.Group();
  private measureGroup = new THREE.Group();
  private dimGroup = new THREE.Group();
  private previewGroup = new THREE.Group();
  private selHelpers = new Map<string, THREE.BoxHelper>();
  private grid: THREE.GridHelper;
  private dirLight: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight; private hemi: THREE.HemisphereLight; private fill: THREE.DirectionalLight;
  private peopleGroup = new THREE.Group();
  private personUpdates: ((t: number) => void)[] = [];
  private peopleKey = '';
  private showPeople = true;
  private readonly isLanding: boolean;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private rafId = 0;
  private disposed = false;
  private frames = 0; private fpsT = performance.now();
  private items: Item[] = []; private walls: Wall[] = []; private settings: ProjectSettings | null = null;
  private roomKey = '';
  private uiTheme: 'light' | 'dark' = 'dark';
  private viewMode: ViewMode = 'perspective'; private topSub: TopSubMode = 'all';
  private tool: ToolId = 'select';
  private xray = false; private exploded = false;
  private dimOverlay = new THREE.Group();
  private frameGroup: THREE.Group | null = null;
  private pinGroup = new THREE.Group();
  paused = false; private manualCamera = false; private brightnessVal = 1; private transparentBg = false;
  readonly xrRig = new THREE.Group();
  xrSession: any = null;
  private xrHooks = new Set<(t: number, frame: any) => void>();
  private xrAfter = new Set<() => void>();
  private xrEnd = new Set<() => void>();
  private xrPrev: { bg: THREE.Color | THREE.Texture | null; grid: boolean; room: boolean; people: boolean } | null = null;
  private spaceDown = false; private shiftDown = false;
  private liveThrottle = 0;
  private dragLabel: THREE.Sprite | null = null;
  private cb: SceneCallbacks;
  private aspect = 1;
  autoRotatePaused = 0;
  private lastInteract = performance.now();
  private idleRotating = false;
  private idlePhase = 0;
  private idleBase = new THREE.Vector3();


  constructor(canvas: HTMLCanvasElement, cb: SceneCallbacks = {}, opts: { landing?: boolean } = {}) {
    this.cb = cb;
    this.isLanding = !!opts.landing;
    this.isMobile = window.innerWidth < 768;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#FAFBFC');
    this.root.scale.setScalar(S);
    this.scene.add(this.root);
    this.root.add(this.ctGroup, this.measureGroup, this.dimGroup, this.previewGroup, this.peopleGroup, this.dimOverlay, this.pinGroup);

    this.camP = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
    this.camP.position.set(3, 2.5, 4);
    this.camO = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.01, 200);
    this.camera = this.camP;

    // Lighting merata (seperti foto 2): ambient tinggi, directional lembut agar produk terbaca
    this.ambient = new THREE.AmbientLight(0xfff7ee, 0.62 * Math.PI); this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0xfffaf3, 0xc4b9a6, 0.58 * Math.PI); this.scene.add(this.hemi);
    this.dirLight = new THREE.DirectionalLight(0xfff3e0, 0.42 * Math.PI);
    this.dirLight.position.set(4.5, 8.5, 5.5); this.dirLight.castShadow = true;
    const sm = this.isMobile ? 512 : 2048;
    this.dirLight.shadow.mapSize.set(sm, sm);
    this.dirLight.shadow.radius = 4; this.dirLight.shadow.blurSamples = 8;
    this.dirLight.shadow.camera.left = -9; this.dirLight.shadow.camera.right = 9; this.dirLight.shadow.camera.top = 9; this.dirLight.shadow.camera.bottom = -9;
    this.dirLight.shadow.camera.near = 0.5; this.dirLight.shadow.camera.far = 40; this.dirLight.shadow.bias = -0.0003; this.dirLight.shadow.normalBias = 0.03;
    this.scene.add(this.dirLight, this.dirLight.target);
    this.fill = new THREE.DirectionalLight(0xe8eef8, 0.38 * Math.PI); this.fill.position.set(-5, 5, -2.5); this.scene.add(this.fill);

    this.grid = new THREE.GridHelper(40, 400, 0x9CA3AF, 0xD1D5DB);
    (this.grid.material as THREE.Material).transparent = true; (this.grid.material as THREE.Material).opacity = 0.35;
    this.grid.position.y = 0.002; this.scene.add(this.grid);

    this.controls = new OrbitControls(this.camP, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; this.controls.minDistance = 0.4; this.controls.maxDistance = 60;
    this.controls.target.set(0, 0.9, 0);
    if (opts.landing) {
      this.controls.autoRotate = true; this.controls.autoRotateSpeed = 0.35; this.controls.enablePan = false; this.controls.enableZoom = false;
      this.controls.addEventListener('start', () => { this.controls.autoRotate = false; this.autoRotatePaused = performance.now(); });
    } else {
      this.controls.addEventListener('start', () => this.markInteract());
      this.controls.addEventListener('end', () => this.markInteract());
    }

    this.transform = new TransformControls(this.camP, canvas);
    this.transform.setTranslationSnap(10); this.transform.setRotationSnap(degToRad(15)); this.transform.setScaleSnap(0.05);
    this.transform.setSize(this.isMobile ? 0.8 : 1);
    this.transform.addEventListener('dragging-changed', (e) => {
      const dragging = e.value as boolean;
      this.controls.enabled = !dragging;
      this.cb.onDragging?.(dragging);
      const obj = this.transform.object as THREE.Group | undefined;
      if (!dragging && obj) {
        const id = obj.userData.itemId as string;
        const pos = { x: obj.position.x, y: Math.max(0, obj.position.y), z: obj.position.z };
        const scale = this.transform.getMode() === 'scale' ? { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z } : undefined;
        obj.scale.set(1, 1, 1);
        this.cb.onTransformEnd?.(id, pos, Math.round(radToDeg(obj.rotation.y) * 100) / 100, scale);
        if (this.dragLabel) { this.root.remove(this.dragLabel); this.dragLabel = null; }
      }
    });
    this.transform.addEventListener('objectChange', () => {
      const obj = this.transform.object as THREE.Group | undefined;
      if (!obj) return;
      if (this.transform.getMode() === 'translate') { if (obj.position.y < 0) obj.position.y = 0; this.snapToNeighbors(obj); }
      const now = performance.now();
      if (now - this.liveThrottle > 100) {
        this.liveThrottle = now;
        this.cb.onTransformLive?.(obj.userData.itemId as string, { x: obj.position.x, y: obj.position.y, z: obj.position.z }, radToDeg(obj.rotation.y));
        this.updateDragLabel(obj);
      }
    });
    this.scene.add(this.transform);

    window.addEventListener('keydown', this.onKey); window.addEventListener('keyup', this.onKey);
    this.resize();
    this.loop();
  }

  private onKey = (e: KeyboardEvent) => {
    const down = e.type === 'keydown';
    if (e.key === 'Shift') { this.shiftDown = down; this.transform.setTranslationSnap(down ? 1 : 10); this.transform.setRotationSnap(degToRad(down ? 5 : 15)); }
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
      if (this.spaceDown !== down) { this.spaceDown = down; this.applyMouseButtons(); }
      if (down) e.preventDefault();
    }
  };

  // ─── Loop ───
  private loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    if (this.paused) return;
    if (this.controls.autoRotate === false && this.autoRotatePaused && performance.now() - this.autoRotatePaused > 3000 && this.controls.enablePan === false) {
      this.controls.autoRotate = true; this.autoRotatePaused = 0;
    }
    // Idle 5 menit: ayunan lembut kiri-kanan (tidak sampai belakang)
    if (!this.isLanding && this.viewMode === 'perspective' && !this.transform.dragging) {
      const nowI = performance.now();
      if (!this.idleRotating && nowI - this.lastInteract > 300000) {
        this.idleRotating = true; this.idlePhase = 0;
        this.idleBase.copy(this.camP.position).sub(this.controls.target);
      }
      if (this.idleRotating) {
        this.idlePhase += 0.004;
        const swing = Math.sin(this.idlePhase) * 0.52; // ±30°
        const ox = this.idleBase.x, oz = this.idleBase.z;
        const c = Math.cos(swing), s = Math.sin(swing);
        this.camP.position.x = this.controls.target.x + ox * c - oz * s;
        this.camP.position.z = this.controls.target.z + ox * s + oz * c;
      }
    }
    if (!this.manualCamera) this.controls.update();
    for (const h of this.selHelpers.values()) h.update();
    if (this.peopleGroup.visible && this.personUpdates.length) {
      const t = this.clock.getElapsedTime();
      for (const u of this.personUpdates) u(t);
    }
    const size = this.renderer.getSize(new THREE.Vector2());
    if (this.viewMode === 'top' && this.topSub === 'split') {
      const w = size.x, h = size.y;
      this.renderer.setScissorTest(true);
      this.setOrthoAspect(w / (h / 2));
      this.applyRowVisibility('wall');
      this.renderer.setViewport(0, h / 2, w, h / 2); this.renderer.setScissor(0, h / 2, w, h / 2); this.renderer.render(this.scene, this.camO);
      this.applyRowVisibility('base');
      this.renderer.setViewport(0, 0, w, h / 2); this.renderer.setScissor(0, 0, w, h / 2); this.renderer.render(this.scene, this.camO);
      this.renderer.setScissorTest(false); this.renderer.setViewport(0, 0, w, h);
      this.setOrthoAspect(w / h);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.frames++;
    const now = performance.now();
    if (now - this.fpsT > 1000) { this.cb.onFps?.(Math.round((this.frames * 1000) / (now - this.fpsT))); this.frames = 0; this.fpsT = now; }
  };

  resize() {
    const el = this.renderer.domElement.parentElement ?? this.renderer.domElement;
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    this.camP.aspect = this.aspect; this.camP.updateProjectionMatrix();
    this.setOrthoAspect(this.aspect);
  }
  private orthoHalf = 4;
  private setOrthoAspect(aspect: number) {
    this.camO.left = -this.orthoHalf * aspect; this.camO.right = this.orthoHalf * aspect; this.camO.top = this.orthoHalf; this.camO.bottom = -this.orthoHalf;
    this.camO.updateProjectionMatrix();
  }

  setBackground(theme: 'light' | 'dark', canvasColor?: string) {
    this.uiTheme = theme;
    const fallback = theme === 'dark' ? '#1C2128' : '#E8EAEE';
    if (this.transparentBg) this.scene.background = null;
    else { if (!(this.scene.background instanceof THREE.Color)) this.scene.background = new THREE.Color(); (this.scene.background as THREE.Color).set(canvasColor || fallback); }
    const gm = this.grid.material as THREE.LineBasicMaterial;
    gm.color.set(theme === 'dark' ? '#4B5563' : '#B6BCC4');
  }
  setGrid(v: boolean) { this.grid.visible = v; }
  setBrightness(v: number) {
    this.brightnessVal = v;
    this.dirLight.intensity = 0.68 * Math.PI * v;
    this.hemi.intensity = 0.52 * Math.PI * v;
    this.ambient.intensity = 0.36 * Math.PI * v;
    this.fill.intensity = 0.22 * Math.PI * v;
  }
  setShadows(v: boolean) { this.renderer.shadowMap.enabled = v; this.dirLight.castShadow = v; this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material) (m.material as THREE.Material).needsUpdate = true; }); }

  // ─── Sinkronisasi item ───
  sync(items: Item[], walls: Wall[], settings: ProjectSettings) {
    this.items = items; this.walls = walls; this.settings = settings;
    const appearance = settings.appearance ?? { canvasColor: '#E4E7EB', wallColor: '#D2D3D1', floorColor: '#D9D2C7' };
    const nextRoomKey = JSON.stringify([walls, appearance]);
    this.setBackground(this.uiTheme, appearance.canvasColor);
    if (this.roomKey !== nextRoomKey) {
      this.roomKey = nextRoomKey;
      if (this.roomGroup) { this.root.remove(this.roomGroup); this.disposeObject(this.roomGroup); }
      const b = roomBounds(walls);
      this.roomGroup = buildRoom(walls, this.sharedCache, b, appearance);
      this.roomGroup.visible = this.roomVisible;
      this.root.add(this.roomGroup);
      const c = roomCenter(walls);
      this.dirLight.target.position.set(c.x * S, 0, c.z * S);
      this.dirLight.position.set(c.x * S + 4, 9, c.z * S + 6);
    }
    const ids = new Set(items.map((i) => i.id));
    for (const [id, e] of this.built) if (!ids.has(id)) this.disposeEntry(id, e);
    for (const item of items) {
      const sig = cabinetSig(item, items, walls, settings);
      const e = this.built.get(item.id);
      if (!e || e.sig !== sig) this.rebuild(item, sig);
      else {
        const g = e.group;
        const dragging = this.transform.dragging && this.transform.object === g;
        if (!dragging) {
          const target = { x: item.position.x, y: item.position.y, z: item.position.z };
          const rot = degToRad(item.rotationY);
          const moved = Math.abs(g.position.x - target.x) > 0.5 || Math.abs(g.position.y - target.y) > 0.5 || Math.abs(g.position.z - target.z) > 0.5 || Math.abs(g.rotation.y - rot) > 0.001;
          if (moved) {
            gsap.killTweensOf(g.position); gsap.killTweensOf(g.rotation);
            gsap.to(g.position, { ...target, duration: 0.4, ease: 'power2.out' });
            gsap.to(g.rotation, { y: rot, duration: 0.4, ease: 'power2.out' });
          }
        }
        e.item = item;
        g.visible = item.visible;
      }
    }
    this.rebuildCountertops();
    if (!this.isLanding) this.syncPeople();
    this.applyViewVisibility();
  }

  private rebuild(item: Item, sig: string) {
    const old = this.built.get(item.id);
    const wasAttached = old && this.transform.object === old.group;
    if (old) this.disposeEntry(item.id, old, true);
    const cache = new MatCache();
    const ctx: GenCtx = { cache, settings: this.settings!, items: this.items, walls: this.walls };
    const b = buildItem(item, ctx);
    b.group.position.set(item.position.x, item.position.y, item.position.z);
    b.group.rotation.y = degToRad(item.rotationY);
    b.group.visible = item.visible;
    this.root.add(b.group);
    this.anim.register(item.id, b.animatables);
    this.anim.attachGroup(item.id, b.group);
    this.built.set(item.id, { item, group: b.group, sig, cache });
    if (this.xray) setGroupOpacity(b.group, 0.3, true);
    if (this.exploded) setExplode(b.group, true);
    if (wasAttached) this.transform.attach(b.group);
    const helper = this.selHelpers.get(item.id);
    if (helper) { helper.setFromObject(b.group); (helper as unknown as { object: THREE.Object3D }).object = b.group; }
  }

  private disposeEntry(id: string, e: BuiltEntry, keepHelper = false) {
    if (this.transform.object === e.group && !keepHelper) this.transform.detach();
    this.root.remove(e.group);
    this.disposeObject(e.group);
    e.cache.dispose();
    this.anim.unregister(id); this.anim.detachGroup(id);
    this.built.delete(id);
    if (!keepHelper) { const h = this.selHelpers.get(id); if (h) { this.scene.remove(h); h.dispose(); this.selHelpers.delete(id); } }
  }
  private disposeObject(o: THREE.Object3D) {
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh && m.geometry && m.geometry.type !== 'BoxGeometry') m.geometry.dispose();
      const sp = c as THREE.Sprite;
      if (sp.isSprite) { sp.material.map?.dispose(); sp.material.dispose(); }
    });
  }

  private rebuildCountertops() {
    for (const c of [...this.ctGroup.children]) { this.ctGroup.remove(c); this.disposeObject(c); }
    if (!this.settings) return;
    for (const run of computeCountertopRuns(this.items, this.walls)) this.ctGroup.add(genCountertopRun(run, this.settings, this.sharedCache));
  }

  // ─── Orang animasi ───
  setPeopleVisible(v: boolean) {
    this.showPeople = v;
    this.peopleGroup.visible = v && (this.viewMode === 'perspective' || this.viewMode === 'iso');
  }
  private syncPeople() {
    const key = JSON.stringify(this.items.filter((i) => (i.type === 'cooktop_base' || i.type === 'sink_base') && i.visible && !i.locked).map((i) => [i.type, Math.round(i.position.x), Math.round(i.position.z), Math.round(i.rotationY), i.dims.d])) + '|' + this.walls.length;
    if (key === this.peopleKey) return;
    this.peopleKey = key;
    for (const c of [...this.peopleGroup.children]) { this.peopleGroup.remove(c); this.disposeObject(c); }
    this.personUpdates = [];
    const styles: PersonStyle[] = [
      { shirt: '#3E6FB0', pants: '#2E333B', skin: '#E8B98F', hair: '#26221F', apron: true },
      { shirt: '#B03E5A', pants: '#33415C', skin: '#D9A06F', hair: '#17130F' },
      { shirt: '#3E9D6B', pants: '#4A4A48', skin: '#F0C49C', hair: '#3A2A1A' },
    ];
    const placeFacing = (item: Item, dist: number) => {
      const r = (item.rotationY * Math.PI) / 180;
      const fx = Math.sin(r), fz = Math.cos(r);
      return { x: item.position.x + fx * (item.dims.d / 2 + dist), z: item.position.z + fz * (item.dims.d / 2 + dist), rot: item.rotationY + 180 };
    };
    const cook = this.items.find((i) => i.type === 'cooktop_base' && i.visible);
    const sink = this.items.find((i) => i.type === 'sink_base' && i.visible);
    if (cook) {
      const p = placeFacing(cook, 430);
      const { joints, group } = buildPerson(this.sharedCache, styles[0], 'stir');
      group.position.set(p.x, 0, p.z); group.rotation.y = (p.rot * Math.PI) / 180;
      this.peopleGroup.add(group); this.personUpdates.push(animateStir(joints, 0));
    }
    if (sink && (!cook || sink.id !== cook.id)) {
      const p = placeFacing(sink, 430);
      const { joints, group } = buildPerson(this.sharedCache, styles[1], 'wash');
      group.position.set(p.x, 0, p.z); group.rotation.y = (p.rot * Math.PI) / 180;
      this.peopleGroup.add(group); this.personUpdates.push(animateWash(joints, 1.4));
    }
    const b = roomBounds(this.walls);
    const spanX = b.maxX - b.minX;
    if (spanX > 3600 && this.walls.length) {
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2 + 500;
      const { joints, group } = buildPerson(this.sharedCache, styles[2], 'walk');
      this.peopleGroup.add(group);
      this.personUpdates.push(animateWalk(joints, { x: cx - spanX / 2 + 1300, z: cz }, { x: cx + spanX / 2 - 1300, z: cz }, 0.22, 0.8));
    }
    this.setPeopleVisible(this.showPeople);
  }

  private cabinetsHidden = false;
  // ─── Visibilitas 2D (base/wall separation) ───
  private applyRowVisibility(mode: RowKind | 'all') {
    if (this.cabinetsHidden) {
      for (const e of this.built.values()) e.group.visible = false;
      this.ctGroup.visible = false;
      return;
    }
    for (const e of this.built.values()) {
      const row = rowOf(e.item);
      let vis = e.item.visible;
      if (mode === 'base' && row === 'wall') vis = false;
      if (mode === 'wall' && row === 'base') vis = false;
      e.group.visible = vis;
    }
    this.ctGroup.visible = mode !== 'wall';
  }
  private applyViewVisibility() {
    if (this.cabinetsHidden) {
      for (const e of this.built.values()) e.group.visible = false;
      this.ctGroup.visible = false;
      return;
    }
    const top2d = this.viewMode === 'top';
    if (!top2d || this.topSub === 'split') { this.applyRowVisibility('all'); for (const e of this.built.values()) if (!this.xray) setGroupOpacity(e.group, null); return; }
    if (this.topSub === 'all') {
      this.applyRowVisibility('all');
      for (const e of this.built.values()) setGroupOpacity(e.group, rowOf(e.item) === 'wall' ? 0.4 : (this.xray ? 0.3 : null), false);
    } else this.applyRowVisibility(this.topSub);
  }

  // ─── Selection ───
  setSelection(ids: string[]) {
    for (const [id, h] of this.selHelpers) if (!ids.includes(id)) { this.scene.remove(h); h.dispose(); this.selHelpers.delete(id); }
    for (const id of ids) {
      if (this.selHelpers.has(id)) continue;
      const e = this.built.get(id);
      if (!e) continue;
      const h = new THREE.BoxHelper(e.group, 0x1B9D6B);
      (h.material as THREE.LineBasicMaterial).depthTest = false; (h.material as THREE.LineBasicMaterial).transparent = true; (h.material as THREE.LineBasicMaterial).opacity = 0.9;
      h.renderOrder = 998;
      this.scene.add(h); this.selHelpers.set(id, h);
    }
    this.updateTransformAttachment(ids);
  }
  private lastSelection: string[] = [];
  private updateTransformAttachment(ids?: string[]) {
    if (ids) this.lastSelection = ids;
    const sel = this.lastSelection;
    const isTransform = this.tool === 'move' || this.tool === 'rotate' || this.tool === 'scale';
    const first = sel.length ? this.built.get(sel[0]) : undefined;
    if (isTransform && first && !first.item.locked) {
      this.transform.attach(first.group);
      this.transform.setMode(this.tool === 'move' ? 'translate' : this.tool === 'rotate' ? 'rotate' : 'scale');
      this.transform.showY = this.tool !== 'rotate';
      this.transform.showX = this.tool !== 'rotate'; this.transform.showZ = this.tool !== 'rotate';
      if (this.tool === 'rotate') { this.transform.showY = true; }
    } else this.transform.detach();
  }

  setTool(tool: ToolId) { this.tool = tool; this.applyMouseButtons(); this.updateTransformAttachment(); }
  private applyMouseButtons() {
    const pan = this.tool === 'hand' || this.spaceDown;
    this.controls.mouseButtons = pan
      ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    if (this.viewMode !== 'perspective' && this.viewMode !== 'iso') this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.controls.touches = pan ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  }
  setControlsEnabled(v: boolean) { this.controls.enabled = v; }

  // ─── Snap ke tepi kabinet lain (20 mm) saat drag gizmo ───
  private snapToNeighbors(obj: THREE.Group) {
    if (this.shiftDown) return;
    const id = obj.userData.itemId as string;
    const me = this.built.get(id);
    if (!me || me.item.wallId) return;
    const bb = new THREE.Box3().setFromObject(obj);
    const tol = 20 * S;
    for (const [oid, e] of this.built) {
      if (oid === id || !e.item.visible) continue;
      const ob = new THREE.Box3().setFromObject(e.group);
      const dx = [ob.max.x - bb.min.x, ob.min.x - bb.max.x, ob.min.x - bb.min.x, ob.max.x - bb.max.x];
      const dz = [ob.max.z - bb.min.z, ob.min.z - bb.max.z, ob.min.z - bb.min.z, ob.max.z - bb.max.z];
      for (const d of dx) if (Math.abs(d) < tol && Math.abs(d) > 0) { obj.position.x += d / S; break; }
      for (const d of dz) if (Math.abs(d) < tol && Math.abs(d) > 0) { obj.position.z += d / S; break; }
    }
  }
  private updateDragLabel(obj: THREE.Group) {
    if (this.dragLabel) { this.root.remove(this.dragLabel); this.dragLabel.material.map?.dispose(); this.dragLabel.material.dispose(); }
    const e = this.built.get(obj.userData.itemId as string);
    const mode = this.transform.getMode();
    const text = mode === 'rotate' ? `${Math.round(radToDeg(obj.rotation.y))}°` : mode === 'scale' ? `${Math.round((e?.item.dims.w ?? 0) * obj.scale.x)} × ${Math.round((e?.item.dims.h ?? 0) * obj.scale.y)}` : `X ${Math.round(obj.position.x)}  Z ${Math.round(obj.position.z)}`;
    this.dragLabel = makeLabel(text);
    this.dragLabel.position.set(obj.position.x, obj.position.y + (e?.item.dims.h ?? 800) + 180, obj.position.z);
    this.root.add(this.dragLabel);
  }

  // ─── View modes ───
  setViewMode(mode: ViewMode, sub: TopSubMode) {
    const prev = this.viewMode;
    this.viewMode = mode; this.topSub = sub;
    const c = roomCenter(this.walls);
    const cx = c.x * S, cz = c.z * S;
    const b = roomBounds(this.walls);
    const extent = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) * S;
    this.orthoHalf = Math.max(2.5, extent * 0.6);
    this.setOrthoAspect(this.aspect);
    const useOrtho = mode !== 'perspective';
    const cam = useOrtho ? this.camO : this.camP;
    this.camera = cam;
    this.controls.object = cam;
    this.transform.camera = cam;
    cam.up.set(0, 1, 0);
    this.camO.zoom = 1;
    const dist = 30;
    switch (mode) {
      case 'top': this.camO.position.set(cx, dist, cz); this.camO.up.set(0, 0, -1); this.controls.target.set(cx, 0, cz); break;
      case 'front': this.camO.position.set(cx, 1.3, cz + dist); this.controls.target.set(cx, 1.3, cz); break;
      case 'back': this.camO.position.set(cx, 1.3, cz - dist); this.controls.target.set(cx, 1.3, cz); break;
      case 'left': this.camO.position.set(cx - dist, 1.3, cz); this.controls.target.set(cx, 1.3, cz); break;
      case 'right': this.camO.position.set(cx + dist, 1.3, cz); this.controls.target.set(cx, 1.3, cz); break;
      case 'iso': this.camO.position.set(cx + dist * 0.577, dist * 0.577, cz + dist * 0.577); this.controls.target.set(cx, 0.9, cz); break;
      default:
        if (prev !== 'perspective') { this.camP.position.set(cx + 3.2, 2.4, cz + 4.2); this.controls.target.set(cx, 0.9, cz); }
    }
    this.camO.updateProjectionMatrix();
    this.controls.enableRotate = mode === 'perspective' || mode === 'iso';
    this.setPeopleVisible(this.showPeople);
    this.controls.minPolarAngle = 0; this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.applyMouseButtons();
    this.controls.update();
    this.applyViewVisibility();
  }
  setTopSubMode(sub: TopSubMode) { this.topSub = sub; this.applyViewVisibility(); }

  focus(ids: string[]) {
    const bb = new THREE.Box3();
    let any = false;
    for (const id of ids) { const e = this.built.get(id); if (e) { bb.expandByObject(e.group); any = true; } }
    if (!any) { this.resetView(); return; }
    const center = bb.getCenter(new THREE.Vector3()); const size = bb.getSize(new THREE.Vector3()).length();
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const dist = Math.max(1.2, size * 1.4);
    const target = center.clone().add(dir.multiplyScalar(dist));
    gsap.to(this.controls.target, { x: center.x, y: center.y, z: center.z, duration: 0.6, ease: 'power3.inOut' });
    if (this.camera === this.camP) gsap.to(this.camP.position, { x: target.x, y: target.y, z: target.z, duration: 0.6, ease: 'power3.inOut' });
    else { this.camO.position.copy(center.clone().add(dir.normalize().multiplyScalar(30))); gsap.to(this.camO, { zoom: Math.max(1, (this.orthoHalf * 2) / (size * 1.6)), duration: 0.5, onUpdate: () => this.camO.updateProjectionMatrix() }); }
  }
  resetView() {
    const c = roomCenter(this.walls);
    if (this.viewMode === 'perspective') {
      gsap.to(this.camP.position, { x: c.x * S + 3.2, y: 2.4, z: c.z * S + 4.2, duration: 0.7, ease: 'power3.inOut' });
      gsap.to(this.controls.target, { x: c.x * S, y: 0.9, z: c.z * S, duration: 0.7, ease: 'power3.inOut' });
    } else this.setViewMode(this.viewMode, this.topSub);
  }
  zoom(factor: number) {
    if (this.camera === this.camP) {
      const dir = this.camP.position.clone().sub(this.controls.target);
      const len = THREE.MathUtils.clamp(dir.length() / factor, this.controls.minDistance, this.controls.maxDistance);
      const target = this.controls.target.clone().add(dir.normalize().multiplyScalar(len));
      gsap.to(this.camP.position, { x: target.x, y: target.y, z: target.z, duration: 0.3, ease: 'power2.out' });
    } else gsap.to(this.camO, { zoom: THREE.MathUtils.clamp(this.camO.zoom * factor, 0.2, 20), duration: 0.3, onUpdate: () => this.camO.updateProjectionMatrix() });
  }
  zoomPercent(): number {
    if (this.camera === this.camP) return Math.round((6 / Math.max(0.1, this.camP.position.distanceTo(this.controls.target))) * 100);
    return Math.round(this.camO.zoom * 100);
  }
  setAutoRotate(on: boolean) { this.controls.autoRotate = on; }

  // ─── Raycast ───
  private ndc(clientX: number, clientY: number) {
    const r = this.renderer.domElement.getBoundingClientRect();
    let y = clientY - r.top, h = r.height;
    if (this.viewMode === 'top' && this.topSub === 'split') { h = r.height / 2; if (y > h) y -= h; }
    return new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -(y / h) * 2 + 1);
  }
  private withPickCamera<T>(fn: () => T): T {
    const split = this.viewMode === 'top' && this.topSub === 'split';
    if (split) this.setOrthoAspect(this.aspect * 2);
    const r = fn();
    if (split) this.setOrthoAspect(this.aspect);
    return r;
  }
  raycastItem(clientX: number, clientY: number): { id: string; point: V3 } | null { return this.withPickCamera(() => this.raycastItemInner(clientX, clientY)); }
  raycastPoint(clientX: number, clientY: number): V3 | null { return this.withPickCamera(() => this.raycastPointInner(clientX, clientY)); }
  private raycastItemInner(clientX: number, clientY: number): { id: string; point: V3 } | null {
    this.raycaster.setFromCamera(this.ndc(clientX, clientY), this.camera);
    const groups = [...this.built.values()].filter((e) => e.group.visible).map((e) => e.group);
    const hits = this.raycaster.intersectObjects(groups, true);
    for (const h of hits) {
      const id = h.object.userData.itemId as string | undefined;
      if (id) return { id, point: { x: h.point.x / S, y: h.point.y / S, z: h.point.z / S } };
    }
    return null;
  }
  private raycastPointInner(clientX: number, clientY: number): V3 | null {
    this.raycaster.setFromCamera(this.ndc(clientX, clientY), this.camera);
    const targets: THREE.Object3D[] = [...this.built.values()].filter((e) => e.group.visible).map((e) => e.group);
    if (this.roomGroup) targets.push(this.roomGroup);
    targets.push(this.ctGroup);
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length) return { x: hits[0].point.x / S, y: hits[0].point.y / S, z: hits[0].point.z / S };
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.floorPlane, p)) return { x: p.x / S, y: 0, z: p.z / S };
    return null;
  }
  itemScreenRect(id: string): { x1: number; y1: number; x2: number; y2: number } | null {
    const e = this.built.get(id);
    if (!e || !e.group.visible) return null;
    const bb = new THREE.Box3().setFromObject(e.group);
    const r = this.renderer.domElement.getBoundingClientRect();
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).project(this.camera);
      const sx = ((p.x + 1) / 2) * r.width, sy = ((1 - p.y) / 2) * r.height;
      x1 = Math.min(x1, sx); y1 = Math.min(y1, sy); x2 = Math.max(x2, sx); y2 = Math.max(y2, sy);
    }
    return { x1, y1, x2, y2 };
  }
  spawnPoint(): { x: number; z: number } { return { x: this.controls.target.x / S, z: this.controls.target.z / S }; }

  // ─── Pengukuran ───
  private makeLine(a: V3, b: V3, color = 0x1B9D6B): THREE.Group {
    const g = new THREE.Group();
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x, a.y, a.z), new THREE.Vector3(b.x, b.y, b.z)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, depthTest: false })); line.renderOrder = 997; g.add(line);
    for (const p of [a, b]) { const s = new THREE.Mesh(new THREE.SphereGeometry(14, 10, 10), new THREE.MeshBasicMaterial({ color, depthTest: false })); s.position.set(p.x, p.y, p.z); s.renderOrder = 997; g.add(s); }
    const dist = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const label = makeLabel(`${(dist / 10).toFixed(1).replace(/\.0$/, '')} cm`, '#' + color.toString(16).padStart(6, '0'));
    label.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 80, (a.z + b.z) / 2); g.add(label);
    return g;
  }
  addMeasure(a: V3, b: V3) { this.measureGroup.add(this.makeLine(a, b)); }
  addAngle(a: V3, v: V3, b: V3) {
    const g = new THREE.Group();
    const va = new THREE.Vector3(a.x - v.x, a.y - v.y, a.z - v.z), vb = new THREE.Vector3(b.x - v.x, b.y - v.y, b.z - v.z);
    const ang = radToDeg(va.angleTo(vb));
    g.add(this.makeLine(v, a, 0x2563EB)); g.add(this.makeLine(v, b, 0x2563EB));
    const label = makeLabel(`${ang.toFixed(1)}°`, '#2563EB'); label.position.set(v.x, v.y + 200, v.z); g.add(label);
    this.measureGroup.add(g);
  }
  clearMeasures() { for (const c of [...this.measureGroup.children]) { this.measureGroup.remove(c); this.disposeObject(c); } this.clearPreview(); }
  setPreview(points: V3[], cursor: V3 | null) {
    this.clearPreview();
    if (!points.length) return;
    for (let i = 0; i < points.length - 1; i++) this.previewGroup.add(this.makeLine(points[i], points[i + 1], 0xF59E0B));
    if (cursor) this.previewGroup.add(this.makeLine(points[points.length - 1], cursor, 0xF59E0B));
    else { const s = new THREE.Mesh(new THREE.SphereGeometry(16, 10, 10), new THREE.MeshBasicMaterial({ color: 0xF59E0B, depthTest: false })); const p = points[0]; s.position.set(p.x, p.y, p.z); this.previewGroup.add(s); }
  }
  clearPreview() { for (const c of [...this.previewGroup.children]) { this.previewGroup.remove(c); this.disposeObject(c); } }
  syncDimensions(dims: DimensionLine[]) {
    for (const c of [...this.dimGroup.children]) { this.dimGroup.remove(c); this.disposeObject(c); }
    for (const d of dims) this.dimGroup.add(this.makeLine(d.a, d.b, 0x111827));
  }

  // ─── Mode animasi ───
  markInteract() { this.lastInteract = performance.now(); this.idleRotating = false; }
  setOpenAll(open: boolean) { this.anim.setOpenAll(open); }
  setOpenItems(ids: string[], open: boolean) { this.anim.setOpenFor(ids, open); }
  setXray(on: boolean) { this.xray = on; for (const e of this.built.values()) setGroupOpacity(e.group, on ? 0.28 : null, true); this.applyViewVisibility(); }
  setExplodeMode(on: boolean) { this.exploded = on; for (const e of this.built.values()) setExplode(e.group, on); }
  setLightsOn(on: boolean) {
    this.root.traverse((o) => {
      const l = o as THREE.PointLight;
      if (l.isLight && l.userData.isLed) l.intensity = on ? ((l.userData.baseIntensity as number) ?? 1) : 0;
      const m = o as THREE.Mesh;
      if (m.isMesh && m.userData.isLed) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) mat.emissiveIntensity = on ? 1.6 : 0.05;
      }
    });
  }

  // ─── Util publik (dimensi, pin AR, foto, XR) ───
  setPaused(v: boolean) { this.paused = v; }
  /** Panel/door/side kabinet dibuat transparan otomatis saat Mode Produksi (rangka terlihat). */
  setSkinOpacity(v: number | null) {
    if (v === null) {
      for (const e of this.built.values()) {
        setGroupOpacity(e.group, null, false);
        if (this.xray) setGroupOpacity(e.group, 0.28, true);
      }
      this.applyViewVisibility();
    } else {
      for (const e of this.built.values()) setGroupOpacity(e.group, v, false);
    }
  }
  /** Overlay rangka hollow (mm, mengikuti root ber-skala 0.001). */
  setFrameOverlay(group: THREE.Group | null) {
    if (this.frameGroup) { this.root.remove(this.frameGroup); }
    this.frameGroup = group;
    if (group) this.root.add(group);
  }
  /** Kulit kabinet (bounding box mm + warna pintu) untuk overlay ACP transparan. */
  getSkins(): { itemId: string; center: [number, number, number]; size: [number, number, number]; color: string; rotationY: number }[] {
    const out: { itemId: string; center: [number, number, number]; size: [number, number, number]; color: string; rotationY: number }[] = [];
    for (const e of this.built.values()) {
      if (!e.group.visible) continue;
      const box = new THREE.Box3().setFromObject(e.group);
      if (box.isEmpty()) continue;
      const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      out.push({ itemId: e.item.id, center: [c.x / S, c.y / S, c.z / S], size: [sz.x / S, sz.y / S, sz.z / S], color: e.item.materials.doorColor, rotationY: e.item.rotationY });
    }
    return out;
  }
  frameOverlayBounds(): { center: THREE.Vector3; size: number } {
    const box = new THREE.Box3();
    for (const e of this.built.values()) box.expandByObject(e.group);
    if (box.isEmpty()) return { center: new THREE.Vector3(0, 1, 0), size: 4 };
    const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3()).length();
    return { center: c, size: Math.max(1.2, sz) };
  }
  fitCameraToObject(center: THREE.Vector3, size: number) {
    const dir = new THREE.Vector3(0.75, 0.55, 1).normalize();
    gsap.to(this.camP.position, { x: center.x + dir.x * size, y: center.y + dir.y * size, z: center.z + dir.z * size, duration: 0.5, ease: 'power2.out' });
    gsap.to(this.controls.target, { x: center.x, y: Math.max(0.6, center.y), z: center.z, duration: 0.5, ease: 'power2.out' });
  }
  setTransparent(v: boolean) { this.transparentBg = v; this.setBackground(this.uiTheme); this.renderer.setClearAlpha(v ? 0 : 1); }
  getRoomCenterM() { const c = roomCenter(this.walls); return { x: c.x * S, z: c.z * S }; }
  getBuilt() { return [...this.built.entries()].map(([id, e]) => ({ id, group: e.group, item: e.item })); }
  commitTransform(id: string, pos: V3, rotY: number) { this.cb.onTransformEnd?.(id, pos, rotY); }
  renderOnce() { this.renderer.render(this.scene, this.camera); }
  private roomVisible = true;
  setRoomVisible(v: boolean) { this.roomVisible = v; if (this.roomGroup) this.roomGroup.visible = v; }
  setCountertopVisible(v: boolean) { this.ctGroup.visible = v && !this.cabinetsHidden; }
  setCabinetVisible(v: boolean) {
    this.cabinetsHidden = !v;
    if (v) {
      this.applyViewVisibility();
    } else {
      for (const e of this.built.values()) e.group.visible = false;
      this.ctGroup.visible = false;
    }
    this.peopleGroup.visible = v && this.showPeople && (this.viewMode === 'perspective' || this.viewMode === 'iso');
  }
  setPeopleHidden(h: boolean) { this.peopleGroup.visible = !h && this.showPeople; }
  setManualCamera(pos: THREE.Vector3, quat: THREE.Quaternion, fovDeg: number) {
    this.manualCamera = true; this.camera = this.camP;
    this.camP.position.copy(pos); this.camP.quaternion.copy(quat); this.camP.fov = fovDeg; this.camP.updateProjectionMatrix(); this.camP.updateMatrixWorld(true);
  }
  clearManualCamera() { this.manualCamera = false; }
  raycastFloor(clientX: number, clientY: number): THREE.Vector3 | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.camera);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.floorPlane, p) ? p : null;
  }
  pickWithRay(origin: THREE.Vector3, dir: THREE.Vector3): { id: string; group: THREE.Group; point: THREE.Vector3 } | null {
    this.raycaster.set(origin, dir.clone().normalize());
    const groups = [...this.built.values()].filter((e) => e.group.visible).map((e) => e.group);
    const hits = this.raycaster.intersectObjects(groups, true);
    for (const h of hits) { const id = h.object.userData.itemId as string | undefined; if (id) { const e = this.built.get(id); if (e) return { id, group: e.group, point: h.point }; } }
    return null;
  }
  setSunEstimate(dir: THREE.Vector3, color: THREE.Color, intensity: number) {
    const c = this.dirLight.target.position;
    this.dirLight.position.copy(c).add(dir.clone().normalize().multiplyScalar(10));
    this.dirLight.color.copy(color); this.dirLight.intensity = Math.max(0.3, Math.min(3.2, intensity)) * Math.PI * 0.6;
  }
  resetSun() { this.dirLight.color.set(0xfff3e0); this.setBrightness(this.brightnessVal); }
  setShadowEnabled(v: boolean) { this.dirLight.castShadow = v; }

  /** Overlay dimensi: garis ekstensi + garis dimensi + panah + label. Satuan mm (root ter-skala). */
  setDimensionOverlay(lines: { a: V3; b: V3; off: V3; label: string; warn?: boolean }[], dark: boolean) {
    for (const c of [...this.dimOverlay.children]) { this.dimOverlay.remove(c); this.disposeObject(c); }
    if (!lines.length) return;
    const norm: number[] = [], warn: number[] = [];
    const push = (arr: number[], p: THREE.Vector3, q: THREE.Vector3) => arr.push(p.x, p.y, p.z, q.x, q.y, q.z);
    for (const l of lines) {
      const arr = l.warn ? warn : norm;
      const a = new THREE.Vector3(l.a.x, l.a.y, l.a.z), b = new THREE.Vector3(l.b.x, l.b.y, l.b.z), off = new THREE.Vector3(l.off.x, l.off.y, l.off.z);
      const a2 = a.clone().add(off), b2 = b.clone().add(off);
      if (off.lengthSq() > 1) { push(arr, a, a2.clone().add(off.clone().normalize().multiplyScalar(40))); push(arr, b, b2.clone().add(off.clone().normalize().multiplyScalar(40))); }
      push(arr, a2, b2);
      const d = b2.clone().sub(a2); const len = d.length(); if (len < 1) continue; d.normalize();
      const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const p1 = new THREE.Vector3().crossVectors(d, up).normalize(), p2 = new THREE.Vector3().crossVectors(d, p1).normalize();
      const wing = Math.min(70, len * 0.25);
      for (const [tip, dir] of [[a2, d], [b2, d.clone().negate()]] as [THREE.Vector3, THREE.Vector3][]) {
        for (const pp of [p1, p2]) for (const sg of [-1, 1]) push(arr, tip, tip.clone().add(dir.clone().multiplyScalar(wing)).add(pp.clone().multiplyScalar(sg * wing * 0.35)));
      }
      const label = makeDimLabel(l.label, dark, !!l.warn);
      label.position.copy(a2.clone().add(b2).multiplyScalar(0.5)).add(new THREE.Vector3(0, 55, 0));
      this.dimOverlay.add(label);
    }
    const mk = (arr: number[], color: number) => {
      if (!arr.length) return;
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      const ls = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true })); ls.renderOrder = 996; this.dimOverlay.add(ls);
    };
    mk(norm, dark ? 0xE5E7EB : 0x111827); mk(warn, 0xF59E0B);
  }

  /** Penanda titik A/B kalibrasi AR di desain. */
  setPinMarkers(a: V3 | null, b: V3 | null) {
    for (const c of [...this.pinGroup.children]) { this.pinGroup.remove(c); this.disposeObject(c); }
    for (const [p, name, color] of [[a, 'Titik A', '#1B9D6B'], [b, 'Titik B', '#2563EB']] as [V3 | null, string, string][]) {
      if (!p) continue;
      const m = new THREE.Mesh(new THREE.ConeGeometry(30, 110, 16), new THREE.MeshBasicMaterial({ color, depthTest: false })); m.rotation.x = Math.PI; m.position.set(p.x, p.y + 55, p.z); m.renderOrder = 995; this.pinGroup.add(m);
      const l = makeLabel(name, color); l.position.set(p.x, p.y + 220, p.z); this.pinGroup.add(l);
    }
  }

  // ─── WebXR ───
  addXRHook(h: (t: number, frame: any) => void) { this.xrHooks.add(h); return () => { this.xrHooks.delete(h); }; }
  addXRAfter(h: () => void) { this.xrAfter.add(h); return () => { this.xrAfter.delete(h); }; }
  addXREnd(h: () => void) { this.xrEnd.add(h); return () => { this.xrEnd.delete(h); }; }
  private xrFrame = (time: number, frame: any) => {
    if (this.disposed) return;
    if (this.peopleGroup.visible && this.personUpdates.length) { const t = this.clock.getElapsedTime(); for (const u of this.personUpdates) u(t); }
    for (const h of this.xrHooks) h(time, frame);
    this.renderer.render(this.scene, this.camera);
    for (const h of this.xrAfter) h();
  };
  async beginXR(session: any, mode: 'ar' | 'vr') {
    if (this.xrSession) return;
    this.setViewMode('perspective', this.topSub);
    cancelAnimationFrame(this.rafId);
    this.xrPrev = { bg: this.scene.background as THREE.Color | THREE.Texture | null, grid: this.grid.visible, room: this.roomGroup?.visible ?? true, people: this.peopleGroup.visible };
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType(mode === 'ar' ? 'local' : 'local-floor');
    await this.renderer.xr.setSession(session);
    this.xrSession = session;
    if (mode === 'ar') { this.transparentBg = true; this.scene.background = null; this.grid.visible = false; if (this.roomGroup) this.roomGroup.visible = false; this.peopleGroup.visible = false; this.renderer.setClearAlpha(0); }
    if (mode === 'vr') { this.scene.add(this.xrRig); this.xrRig.add(this.camP); }
    session.addEventListener('end', () => this.finishXR());
    this.renderer.setAnimationLoop(this.xrFrame);
  }
  endXRSession() { try { this.xrSession?.end(); } catch { this.finishXR(); } }
  private finishXR() {
    if (!this.xrSession) return;
    this.xrSession = null;
    this.renderer.setAnimationLoop(null);
    this.renderer.xr.enabled = false;
    if (this.xrRig.parent) { this.xrRig.remove(this.camP); this.scene.remove(this.xrRig); this.xrRig.position.set(0, 0, 0); this.xrRig.rotation.set(0, 0, 0); this.xrRig.scale.set(1, 1, 1); }
    const p = this.xrPrev;
    this.transparentBg = false;
    if (p) { this.scene.background = p.bg; this.grid.visible = p.grid; if (this.roomGroup) this.roomGroup.visible = p.room; this.peopleGroup.visible = p.people; }
    this.root.position.set(0, 0, 0); this.root.rotation.set(0, 0, 0); this.root.scale.setScalar(S); this.root.visible = true;
    this.renderer.setClearAlpha(1);
    this.resetSun();
    const c = roomCenter(this.walls);
    this.camP.fov = 45; this.camP.position.set(c.x * S + 3.2, 2.4, c.z * S + 4.2); this.camP.quaternion.identity(); this.camP.updateProjectionMatrix();
    this.controls.target.set(c.x * S, 0.9, c.z * S);
    this.resize();
    for (const h of this.xrEnd) h();
    this.loop();
  }

  // ─── Export ───
  screenshot(type: 'png' | 'jpg' = 'png'): string {
    this.renderer.render(this.scene, this.camera);
    return type === 'png' ? this.renderer.domElement.toDataURL('image/png') : this.renderer.domElement.toDataURL('image/jpeg', 0.92);
  }
  exportOBJ(): string {
    const exporter = new OBJExporter();
    const tmp = new THREE.Group();
    for (const e of this.built.values()) tmp.add(e.group.clone(true));
    tmp.add(this.ctGroup.clone(true));
    tmp.scale.setScalar(S); tmp.updateMatrixWorld(true);
    const txt = exporter.parse(tmp);
    return `# 3D Intero export (unit: meter)\n${txt}`;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.onKey); window.removeEventListener('keyup', this.onKey);
    for (const [id, e] of this.built) this.disposeEntry(id, e);
    this.renderer.setAnimationLoop(null);
    this.anim.dispose();
    this.transform.dispose(); this.controls.dispose();
    this.sharedCache.dispose();
    this.renderer.dispose();
  }
}
