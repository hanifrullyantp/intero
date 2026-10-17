import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildLandingKitchenScene } from '../landing/buildLandingKitchenScene';

export type LandingScene = {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  dispose: () => void;
};

export function createLandingScene(mount: HTMLElement, onReady?: () => void): LandingScene {
  const api = buildLandingKitchenScene(mount);

  let raf = 0;
  const loop = () => {
    api.tick();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const onResize = () => {
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;
    if (!w || !h) return;
    api.camera.aspect = w / h;
    api.camera.updateProjectionMatrix();
    api.renderer.setSize(w, h);
    if (w < 768) {
      api.camera.position.set(5, 3.2, 7);
    }
  };
  window.addEventListener('resize', onResize);
  onResize();

  requestAnimationFrame(() => onReady?.());

  return {
    camera: api.camera,
    controls: api.controls,
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      api.dispose();
    },
  };
}
