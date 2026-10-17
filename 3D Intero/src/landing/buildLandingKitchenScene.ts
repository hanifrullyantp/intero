import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type LandingSceneApi = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  dispose: () => void;
  tick: () => void;
};

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, ...opts });
}

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildKitchen(root: THREE.Group) {
  const oak = mat(0xc4935a, { roughness: 0.55 });
  const oakDoor = mat(0xb8844f, { roughness: 0.5 });
  const granite = mat(0x1a1a1a, { roughness: 0.15, metalness: 0.05 });
  const wallMat = mat(0xf5f0eb, { roughness: 0.9 });
  const floorMat = mat(0xe8dcc8, { roughness: 0.85 });
  const chrome = mat(0xcccccc, { metalness: 0.85, roughness: 0.2 });
  const tile = mat(0xe8e0d8, { roughness: 0.75 });
  const fridgeMat = mat(0xe8e8e8, { metalness: 0.3, roughness: 0.4 });
  const darkMetal = mat(0x333333, { metalness: 0.7, roughness: 0.35 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), mat(0xf0f0f0, { roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);
  const grid = new THREE.GridHelper(12, 24, 0xd1d5db, 0xe5e7eb);
  grid.position.y = 0.002;
  root.add(grid);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wallMat);
  backWall.position.set(0, 1.5, -1.5);
  backWall.receiveShadow = true;
  root.add(backWall);

  const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), wallMat);
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.set(-3, 1.5, 0.5);
  sideWall.receiveShadow = true;
  root.add(sideWall);

  const cabW = 0.6;
  const cabH = 0.72;
  const cabD = 0.58;
  const lowerY = 0;
  const positions = [-1.5, -0.9, -0.3, 0.3, 0.9];
  positions.forEach((x, i) => {
    const body = box(cabW, cabH, cabD, oak, x, lowerY, -1.2);
    root.add(body);
    const door = box(cabW - 0.04, cabH - 0.06, 0.02, oakDoor, x, lowerY, -1.2 + cabD / 2 + 0.01);
    root.add(door);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 8), darkMetal);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(x + 0.22, lowerY + cabH * 0.55, -1.2 + cabD / 2 + 0.03);
    root.add(handle);
    if (i === 2) {
      const sinkRim = box(0.45, 0.05, 0.38, chrome, x, lowerY + cabH - 0.02, -1.2);
      root.add(sinkRim);
      const basin = box(0.4, 0.12, 0.33, chrome, x, lowerY + cabH - 0.08, -1.2);
      root.add(basin);
    }
    if (i === 3) {
      for (let b = 0; b < 4; b++) {
        const burner = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 24), darkMetal);
        burner.rotation.x = -Math.PI / 2;
        burner.position.set(x - 0.09 + (b % 2) * 0.18, lowerY + cabH + 0.02, -1.2 - 0.06 + Math.floor(b / 2) * 0.18);
        root.add(burner);
      }
    }
  });

  const counter = box(3.2, 0.03, cabD + 0.04, granite, -0.3, lowerY + cabH, -1.2);
  root.add(counter);
  const counterLeg = box(cabD + 0.04, 0.03, 2.2, granite, -2.2, lowerY + cabH, 0.2);
  root.add(counterLeg);

  const splash = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.6), tile);
  splash.position.set(-0.3, lowerY + cabH + 0.35, -1.5 + 0.01);
  root.add(splash);

  const upperY = 1.4;
  const upperH = 0.7;
  const upperD = 0.35;
  [-1.2, -0.6, 0, 0.6].forEach((x) => {
    root.add(box(cabW, upperH, upperD, oak, x, upperY, -1.35));
    const uh = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 8), darkMetal);
    uh.rotation.z = Math.PI / 2;
    uh.position.set(x + 0.2, upperY + upperH * 0.4, -1.35 + upperD / 2 + 0.02);
    root.add(uh);
  });

  const corniceH = 0.28;
  root.add(box(3.2, corniceH, upperD + 0.02, oak, -0.3, upperY + upperH, -1.35));
  [-0.9, -0.3, 0.3, 0.9].forEach((x, i) => {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffcc }),
    );
    bulb.position.set(x, upperY + upperH - 0.02, -1.35 + upperD / 2);
    root.add(bulb);
    const pl = new THREE.PointLight(0xfff4e0, 0.35, 1.8, 2);
    pl.position.set(x, upperY + upperH - 0.05, -1.35 + upperD / 2);
    pl.name = `cornice-light-${i}`;
    root.add(pl);
  });

  root.add(box(0.7, 1.8, 0.65, fridgeMat, 1.65, 0, -1.15));
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.25, 4), chrome);
  hood.rotation.y = Math.PI / 4;
  hood.position.set(0.3, upperY + upperH + 0.15, -1.35);
  root.add(hood);
}

export function buildLandingKitchenScene(container: HTMLElement): LandingSceneApi {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8faf9);
  scene.fog = new THREE.Fog(0xf8faf9, 8, 22);

  const w0 = container.clientWidth || window.innerWidth;
  const h0 = container.clientHeight || window.innerHeight;
  const camera = new THREE.PerspectiveCamera(45, w0 / h0, 0.1, 1000);
  camera.position.set(3.8, 2.85, 5.5);
  camera.lookAt(0, 1.05, -0.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w0, h0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    display: 'block',
  });

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe8e8e8, 0.45);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 8, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -10;
  dir.shadow.camera.right = 10;
  dir.shadow.camera.top = 10;
  dir.shadow.camera.bottom = -10;
  dir.shadow.bias = -0.0001;
  scene.add(dir);

  const under = new THREE.PointLight(0xfff4e0, 0.5, 4);
  under.position.set(0, 1.1, -0.5);
  scene.add(under);

  const kitchen = new THREE.Group();
  buildKitchen(kitchen);
  scene.add(kitchen);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.minDistance = 2;
  controls.maxDistance = 15;
  controls.minPolarAngle = Math.PI * 0.1;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.target.set(0, 1.05, -0.2);

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const pauseAutoRotate = () => {
    controls.autoRotate = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      controls.autoRotate = true;
    }, 3000);
  };
  renderer.domElement.addEventListener('pointerdown', pauseAutoRotate);
  renderer.domElement.addEventListener('wheel', pauseAutoRotate);

  const tick = () => {
    controls.update();
    renderer.render(scene, camera);
  };

  const dispose = () => {
    if (idleTimer) clearTimeout(idleTimer);
    renderer.domElement.removeEventListener('pointerdown', pauseAutoRotate);
    renderer.domElement.removeEventListener('wheel', pauseAutoRotate);
    controls.dispose();
    pmrem.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
  };

  return { renderer, scene, camera, controls, dispose, tick };
}
