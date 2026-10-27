// 3D Intero — Deteksi kemampuan WebXR (AR/VR)
import { useEffect, useState } from 'react';

export interface XRCaps { ar: boolean; vr: boolean; secure: boolean; checked: boolean }

export async function detectXR(): Promise<XRCaps> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xr = (navigator as any).xr;
  const secure = typeof window !== 'undefined' && window.isSecureContext;
  if (!xr) return { ar: false, vr: false, secure, checked: true };
  const [ar, vr] = await Promise.all([
    xr.isSessionSupported('immersive-ar').catch(() => false),
    xr.isSessionSupported('immersive-vr').catch(() => false),
  ]);
  return { ar: !!ar, vr: !!vr, secure, checked: true };
}

export function useXRCaps(): XRCaps {
  const [caps, setCaps] = useState<XRCaps>({ ar: false, vr: false, secure: typeof window !== 'undefined' && window.isSecureContext, checked: false });
  useEffect(() => { let alive = true; detectXR().then((c) => { if (alive) setCaps(c); }); return () => { alive = false; }; }, []);
  return caps;
}
