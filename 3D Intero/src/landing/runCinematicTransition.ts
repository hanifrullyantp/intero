import gsap from 'gsap';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { resolvePostLoginEditorUrl } from '../cloud/launchEditor';

export async function runCinematicTransition(opts: {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  overlayEl: HTMLElement | null;
  flashEl: HTMLElement | null;
}): Promise<void> {
  const { camera, controls, overlayEl, flashEl } = opts;
  controls.autoRotate = false;

  const tl = gsap.timeline();

  if (overlayEl) {
    tl.to(overlayEl, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0);
  }

  tl.to(
    camera.position,
    {
      x: 0.5,
      y: 1.0,
      z: 1.5,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(0, 1, 0);
      },
    },
    0.2,
  );

  tl.to(
    camera,
    {
      fov: 120,
      duration: 0.8,
      ease: 'power4.in',
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    },
    1.2,
  );

  if (flashEl) {
    tl.to(flashEl, { opacity: 1, duration: 0.4, ease: 'power2.in' }, 1.8);
  }

  await new Promise<void>((resolve) => {
    tl.eventCallback('onComplete', () => resolve());
  });

  const url = await resolvePostLoginEditorUrl();
  window.location.replace(url);
}
