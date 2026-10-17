import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Boxes, Moon, Share2, Sun, Wand2, WifiOff, Zap } from 'lucide-react';
import { createLandingScene, type LandingScene } from '../lib/landingScene';
import type { ThemeMode } from '../lib/ui';
import AuthModal from './AuthModal';
import type { AuthTab } from '../ui/auth/AuthPopup';
import InteroLogo from '../ui/InteroLogo';
import '../ui/auth/auth.css';

export default function NewLanding({
  onStart,
  theme,
  setTheme,
  loggedIn,
  sessionLoading,
  authOpen,
  onAuthOpenChange,
  authTab = 'login',
  showAuth,
}: {
  onStart: () => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  loggedIn: boolean;
  sessionLoading: boolean;
  authOpen: boolean;
  onAuthOpenChange: (open: boolean) => void;
  authTab?: AuthTab;
  showAuth: boolean;
}) {
  const sceneMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LandingScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(8);
  const [flash, setFlash] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [transitionBusy, setTransitionBusy] = useState(false);

  useEffect(() => {
    const el = sceneMountRef.current;
    if (!el) return;
    const iv = setInterval(() => setProgress((p) => Math.min(95, p + 9)), 90);
    sceneRef.current = createLandingScene(el, () => {
      clearInterval(iv);
      setProgress(100);
      setTimeout(() => setLoading(false), 450);
    });
    return () => {
      clearInterval(iv);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const cinematic = () => {
    if (transitionBusy) return;
    setTransitionBusy(true);
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
    if (sessionLoading || transitionBusy) return;
    if (loggedIn) cinematic();
    else if (showAuth) onAuthOpenChange(true);
    else onStart();
  };

  const features = [
    { icon: <Boxes size={14} strokeWidth={2.2} />, label: 'Parametric 3D Real-time' },
    { icon: <WifiOff size={14} strokeWidth={2.2} />, label: 'Offline-first PWA' },
    { icon: <Wand2 size={14} strokeWidth={2.2} />, label: 'Export ke SketchUp/OBJ' },
    { icon: <Share2 size={14} strokeWidth={2.2} />, label: 'Share File .intero' },
  ];

  const gradient =
    theme === 'dark'
      ? 'linear-gradient(180deg, rgba(15,20,25,0.05) 0%, rgba(15,20,25,0.35) 42%, rgba(15,20,25,0.88) 78%, rgba(15,20,25,0.98) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.25) 38%, rgba(255,255,255,0.82) 72%, rgba(255,255,255,0.97) 100%)';

  return (
    <div className="landing-new-root" style={{ background: '#f8faf9' }}>
      <div ref={sceneMountRef} className="landing-scene-layer" aria-hidden />

      <div className="landing-vignette pointer-events-none" style={{ background: gradient }} />

      <div className="landing-ui-layer" style={{ opacity: overlayOpacity }}>
        <header className="landing-nav-pill pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <InteroLogo size={32} className="rounded-xl shrink-0 shadow-sm" />
            <span className="font-heading text-[17px] font-extrabold tracking-tight text-[#111827]">3D Intero</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showAuth && (
              <button type="button" onClick={() => onAuthOpenChange(true)} className="landing-btn-auth">
                Masuk / Daftar
              </button>
            )}
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="landing-btn-icon"
              title="Ganti tema"
            >
              {theme === 'light' ? <Moon size={17} strokeWidth={2} /> : <Sun size={17} strokeWidth={2} />}
            </button>
          </div>
        </header>

        <main className="landing-hero pointer-events-none">
          <div
            className="landing-anim-up landing-badge"
          >
            Platform Desain Kitchen Set #1 di Indonesia
          </div>
          <h1 className="landing-anim-up landing-headline landing-headline-dark">Desain Kitchen Set Impianmu</h1>
          <h1 className="landing-anim-up landing-headline landing-headline-brand">dalam Hitungan Menit</h1>
          <p className="landing-anim-up landing-sub">
            Alternatif SketchUp gratis, berbasis web, bisa offline, hasil akurat untuk tukang &amp; produksi.
          </p>
          <button
            type="button"
            onClick={handleCTA}
            disabled={sessionLoading || transitionBusy}
            className="landing-anim-up landing-cta pointer-events-auto"
          >
            <Zap size={18} strokeWidth={2.5} />
            <span>{loggedIn ? 'Lanjutkan desain' : 'Mulai Berkreasi'}</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
          <p className="landing-hint-new">Klik dan geser untuk melihat preview 3D</p>
          <a href="/?local=1" className="landing-local-new pointer-events-auto">
            Coba tanpa akun (editor lokal)
          </a>
        </main>

        <footer className="landing-features pointer-events-none">
          {features.map((f) => (
            <span key={f.label} className="landing-feature-chip">
              <span className="landing-feature-icon">{f.icon}</span>
              {f.label}
            </span>
          ))}
        </footer>
      </div>

      {showAuth && authOpen && (
        <AuthModal
          initialTab={authTab}
          onClose={() => onAuthOpenChange(false)}
          onSuccess={() => {
            onAuthOpenChange(false);
            window.setTimeout(() => cinematic(), 350);
          }}
        />
      )}

      <div className="landing-flash pointer-events-none" style={{ opacity: flash }} />

      {loading && (
        <div className="landing-loader">
          <InteroLogo size={64} className="rounded-2xl shadow-md" />
          <div className="landing-loader-bar">
            <div className="landing-loader-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-[#6b7280]">Memuat 3D Intero...</p>
        </div>
      )}
    </div>
  );
}
