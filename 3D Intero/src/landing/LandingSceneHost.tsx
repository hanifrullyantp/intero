import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { buildLandingKitchenScene, type LandingSceneApi } from './buildLandingKitchenScene';

export type LandingSceneHandle = {
  getApi: () => LandingSceneApi | null;
};

const LandingSceneHost = forwardRef<LandingSceneHandle>(function LandingSceneHost(_props, ref) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<LandingSceneApi | null>(null);
  const frameRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    getApi: () => apiRef.current,
  }));

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const api = buildLandingKitchenScene(el);
    apiRef.current = api;

    const loop = () => {
      api.tick();
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      api.camera.aspect = w / h;
      api.camera.updateProjectionMatrix();
      api.renderer.setSize(w, h);
      if (w < 768) {
        api.camera.position.set(5, 3.2, 7);
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      api.dispose();
      apiRef.current = null;
    };
  }, []);

  return <div ref={mountRef} className="landing-scene-host" aria-hidden />;
});

export default LandingSceneHost;
