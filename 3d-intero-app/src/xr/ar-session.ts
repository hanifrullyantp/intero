/* eslint-disable @typescript-eslint/no-explicit-any */
// 3D Intero — Sesi AR dengan fallback bertingkat (fix "session configuration is not supported").

export type ArTier = 'full' | 'hittest' | 'basic';
const tiers = ['full', 'hittest', 'basic'] as const;

export class ArStartError extends Error {
  constructor(public code: 'noXR' | 'unsupported' | 'denied' | 'config', message: string) { super(message); }
}

export interface ArCapability { webxr: boolean; immersiveAR: boolean; secure: boolean; hitTest: 'yes' | 'maybe' | 'no'; domOverlay: boolean; depthSensing: boolean }
export async function detectARCapability(): Promise<ArCapability> {
  const xr = (navigator as any).xr;
  const secure = typeof window !== 'undefined' && window.isSecureContext;
  const out: ArCapability = { webxr: !!xr, immersiveAR: false, secure, hitTest: 'no', domOverlay: 'DOMOverlay' in (window as any) || true, depthSensing: false };
  if (!xr) return out;
  out.immersiveAR = await xr.isSessionSupported('immersive-ar').catch(() => false);
  // Fitur opsional tidak bisa di-query tanpa sesi; Chrome Android (ARCore) menyediakan hit-test & dom-overlay.
  const ua = navigator.userAgent;
  const android = /Android/i.test(ua), ios = /iPad|iPhone|iPod/.test(ua);
  out.hitTest = out.immersiveAR ? (android ? 'yes' : 'maybe') : 'no';
  out.depthSensing = out.immersiveAR && android && /Chrome\/(1[1-9]|2\d)/i.test(ua);
  out.domOverlay = out.immersiveAR && !ios ? true : out.immersiveAR;
  return out;
}
export function arBadge(c: ArCapability): 'full' | 'limited' | 'none' {
  if (!c.webxr || !c.immersiveAR) return 'none';
  return c.hitTest === 'yes' ? 'full' : 'limited';
}

/** Coba buka sesi AR: Tier 1 full → Tier 2 hit-test → Tier 3 basic (tanpa hit-test). */
export async function requestArSession(): Promise<{ session: any; tier: ArTier }> {
  const xr = (navigator as any).xr;
  if (!xr) throw new ArStartError('noXR', 'WebXR tidak tersedia di browser ini.');
  const supported = await xr.isSessionSupported('immersive-ar').catch(() => false);
  if (!supported) throw new ArStartError('unsupported', 'Perangkat tidak mendukung AR immersive.');
  const overlay = typeof document !== 'undefined' ? document.getElementById('ar-overlay') : null;
  const attempts: { tier: ArTier; init: any }[] = [
    { tier: 'full', init: { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'light-estimation', 'anchors'], ...(overlay ? { domOverlay: { root: overlay } } : {}) } },
    { tier: 'hittest', init: { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], ...(overlay ? { domOverlay: { root: overlay } } : {}) } },
    { tier: 'basic', init: { requiredFeatures: ['local-floor'], optionalFeatures: ['dom-overlay'], ...(overlay ? { domOverlay: { root: overlay } } : {}) } },
  ];
  let lastErr: unknown = null;
  for (const a of attempts) {
    try { const session = await xr.requestSession('immersive-ar', a.init); return { session, tier: a.tier }; }
    catch (e) {
      lastErr = e;
      const msg = String((e as Error)?.message ?? e);
      console.warn(`AR Tier ${a.tier} gagal: ${msg}`);
      if (/denied|permission/i.test(msg)) throw new ArStartError('denied', 'Izin kamera ditolak. Izinkan akses kamera lalu coba lagi.');
    }
  }
  throw new ArStartError('config', `Konfigurasi AR tidak didukung perangkat ini (${String((lastErr as Error)?.message ?? lastErr)}).`);
}

export const tierNotice: Record<ArTier, string | null> = {
  full: null,
  hittest: 'AR berjalan mode standar (tanpa depth sensing & estimasi cahaya).',
  basic: 'AR berjalan mode dasar. Ketuk layar untuk menempatkan furnitur di depan Anda.',
};
export function noticeForTier(t: ArTier) { return tierNotice[t]; }
export const AR_TIERS = tiers;
