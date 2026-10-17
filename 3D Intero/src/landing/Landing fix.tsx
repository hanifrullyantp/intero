// 3D Intero - Landing page dengan background 3D kitchen set
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Boxes, Moon, Share2, Sun, Wand2, WifiOff, Zap } from 'lucide-react';
import { createLandingScene, type LandingScene } from '../lib/landingScene';
import AuthModal from './AuthModal';
import type { AuthTab } from '../ui/auth/AuthPopup';
import type { ThemeMode } from '../lib/ui';
import '../ui/auth/auth.css';
import './landing.css';

export default function Landing({
  onStart,
  theme,
  setTheme,
  loggedIn = false,
  showAuth = true,
  authOpen: authOpenProp,
  onAuthOpenChange,
  authTab = 'login',
  sessionLoading = false,
}: {
  onStart: () => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  loggedIn?: boolean;
  showAuth?: boolean;
  authOpen?: boolean;
  onAuthOpenChange?: (open: boolean) => void;
  authTab?: AuthTab;
  sessionLoading?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [authInternal, setAuthInternal] = useState(false);
  const authOpen = authOpenProp ?? authInternal;
  const setAuth = (open: boolean) => {
    onAuthOpenChange?.(open);
    if (authOpenProp === undefined) setAuthInternal(open);
  };
  const sceneRef = useRef<LandingScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(8);
  const [flash, setFlash] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  useEffect(() => {
    if (!mountRef.current) return;
    const iv = setInterval(() => setProgress((p) => Math.min(95, p + 9)), 90);
    sceneRef.current = createLandingScene(mountRef.current, () => {
      clearInterval(iv);
      setProgress(100);
      setTimeout(() => setLoading(false), 450);
    });
    return () => {
      clearInterval(iv);
      sceneRef.current?.dispose();
    };
  }, []);

  /** Transisi sinematik 2.4 detik menuju editor */
  const cinematic = () => {
    const s = sceneRef.current;
    const start = performance.now();
    const from = s ? s.camera.position.clone() : null;
    if (s) s.controls.autoRotate = false;
    let swapped = false;
    const step = (now: number) => {
      const t = (now - start) / 1000;
      setOverlayOpacity(Math.max(0, 1 - t / 0.6));
      if (s && from && t > 0.3) {
        const k = Math.min(1, (t - 0.3) / 1.5);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        s.camera.position.set(
          from.x + (0.2 - from.x) * e,
          from.y + (1.0 - from.y) * e,
          from.z + (0.8 - from.z) * e,
        );
        if (t > 1.0) {
          const kf = Math.min(1, (t - 1.0) / 0.8);
          s.camera.fov = 45 + 75 * kf;
          s.camera.updateProjectionMatrix();
        }
      }
      if (t > 1.4) setFlash(Math.min(1, (t - 1.4) / 0.4));
      if (t >= 1.8 && !swapped) {
        swapped = true;
        onStart();
      }
      if (t > 1.8) setFlash(Math.max(0, 1 - (t - 1.8) / 0.6));
      if (t < 2.5) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const handleCTA = () => {
    if (sessionLoading) return;
    if (loggedIn) cinematic();
    else if (showAuth) setAuth(true);
    else cinematic();
  };

  const features = [
    { icon: <Boxes size={14} />, label: 'Parametric 3D Real-time' },
    { icon: <WifiOff size={14} />, label: 'Offline-first PWA' },
    { icon: <Wand2 size={14} />, label: 'Export ke SketchUp/OBJ' },
    { icon: <Share2 size={14} />, label: 'Share File .intero' },
  ];

  return (
    <div className="landing-fix-root relative h-full min-h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>
      <div ref={mountRef} className="absolute inset-0 z-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            theme === 'dark'
              ? 'linear-gradient(to bottom, rgba(15,20,25,0.1) 0%, rgba(15,20,25,0.75) 60%, rgba(15,20,25,0.96) 100%)'
              : 'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.72) 58%, rgba(255,255,255,0.96) 100%)',
        }}
      />

      <div className="landing-fix-ui relative z-[2] flex min-h-[100dvh] flex-col pointer-events-none" style={{ opacity: overlayOpacity }}>
        <nav className="glass mx-4 mt-4 flex items-center justify-between px-4 py-2.5 pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: 'var(--brand-primary)' }}>
              <Boxes size={18} />
            </span>
            <span className="font-heading text-lg font-extrabold tracking-tight">3D Intero</span>
          </div>
          <div className="flex items-center gap-2">
            {showAuth && (
              <button
                type="button"
                onClick={() => setAuth(true)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--brand-primary)' }}
              >
                Masuk / Daftar
              </button>
            )}
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="rounded-xl border p-2"
              style={{ borderColor: 'var(--border)' }}
              title="Ganti tema"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </nav>

        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div
            className="anim-up mb-5 rounded-full px-4 py-1.5 text-[12px] font-semibold"
            style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary-active)' }}
          >
            Platform Desain Kitchen Set #1 di Indonesia
          </div>
          <h1 className="anim-up font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Desain Kitchen Set Impianmu
          </h1>
          <h1 className="anim-up font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-6xl" style={{ color: 'var(--brand-primary)' }}>
            dalam Hitungan Menit
          </h1>
          <p className="anim-up mt-4 max-w-xl text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
            Alternatif SketchUp gratis, berbasis web, bisa offline, hasil akurat untuk tukang &amp; produksi.
          </p>
          <button
            type="button"
            onClick={handleCTA}
            disabled={sessionLoading}
            className="anim-up pointer-events-auto mt-7 flex items-center gap-2 rounded-2xl px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
            style={{ background: 'var(--brand-primary)', boxShadow: '0 12px 32px rgba(27,157,107,0.35)' }}
          >
            <Zap size={18} /> {loggedIn ? 'Lanjutkan desain' : 'Mulai Berkreasi'} <ArrowRight size={18} />
          </button>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Klik dan geser untuk melihat preview 3D
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 px-6">
          {features.map((f) => (
            <span
              key={f.label}
              className="glass flex items-center gap-2 px-3.5 py-2 text-xs font-medium"
              style={{ borderRadius: 999 }}
            >
              <span style={{ color: 'var(--brand-primary)' }}>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {showAuth && authOpen && (
        <AuthModal initialTab={authTab} onClose={() => setAuth(false)} onSuccess={() => { setAuth(false); window.setTimeout(cinematic, 350); }} />
      )}

      <div className="pointer-events-none fixed inset-0 z-[900] bg-white" style={{ opacity: flash }} />

      {loading && (
        <div className="fixed inset-0 z-[950] flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-main)' }}>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-white" style={{ background: 'var(--brand-primary)' }}>
            <Boxes size={32} />
          </span>
          <div className="h-1.5 w-56 overflow-hidden rounded-full" style={{ background: 'var(--bg-hover)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--brand-primary)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Memuat 3D Intero...</p>
        </div>
      )}
    </div>
  );
}
