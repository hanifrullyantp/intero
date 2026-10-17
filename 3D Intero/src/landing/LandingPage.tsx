import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import InteroLogo from '../ui/InteroLogo';
import AuthPopup, { type AuthTab } from '../ui/auth/AuthPopup';
import { useSaasPage } from '../ui/saas/useSaasPage';
import LandingSceneHost, { type LandingSceneHandle } from './LandingSceneHost';
import { runCinematicTransition } from './runCinematicTransition';
import './landing.css';

function initialAuthTab(): AuthTab {
  const p = new URLSearchParams(window.location.search);
  if (p.get('auth') === 'register') return 'register';
  return 'login';
}

function shouldOpenAuth(): boolean {
  const p = new URLSearchParams(window.location.search);
  return p.get('auth') === 'login' || p.get('auth') === 'register';
}

export default function LandingPage({ forceOpenAuth = false }: { forceOpenAuth?: boolean }) {
  useSaasPage('3D Intero — Desain Kitchen Set');
  const { user, loading, configured } = useAuth();
  const sceneRef = useRef<LandingSceneHandle>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [authOpen, setAuthOpen] = useState(forceOpenAuth || shouldOpenAuth());
  const [authTab, setAuthTab] = useState<AuthTab>(initialAuthTab());
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [oauthToast, setOauthToast] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.saas = '1';
    return () => {
      delete document.documentElement.dataset.saas;
    };
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('oauth') === '1' && user && !loading) {
      p.delete('oauth');
      const next = `${window.location.pathname}${p.toString() ? `?${p}` : ''}`;
      window.history.replaceState({}, '', next);
      setOauthToast(true);
    }
  }, [user, loading]);

  const startTransition = useCallback(async () => {
    if (transitionBusy) return;
    if (!configured || !isSupabaseConfigured()) {
      window.location.href = '/?local=1';
      return;
    }
    const session = (await getSupabase().auth.getSession()).data.session;
    if (!session && !user) {
      setAuthTab('login');
      setAuthOpen(true);
      return;
    }
    const api = sceneRef.current?.getApi();
    if (!api) return;
    setTransitionBusy(true);
    try {
      await runCinematicTransition({
        camera: api.camera,
        controls: api.controls,
        overlayEl: overlayRef.current,
        flashEl: flashRef.current,
      });
    } catch (e) {
      setTransitionBusy(false);
      console.error(e);
      window.location.href = '/enter';
    }
  }, [transitionBusy, configured, user]);

  const onAuthSuccess = useCallback(() => {
    window.setTimeout(() => {
      void startTransition();
    }, 400);
  }, [startTransition]);

  const loggedIn = !!user && !loading;

  return (
    <div className="landing-root">
      <LandingSceneHost ref={sceneRef} />

      <div id="landing-overlay" ref={overlayRef}>
        <div className="landing-gradient" />
        <div className="landing-brand">
          <div className="landing-brand-row">
            <InteroLogo size={48} className="rounded-xl shadow-lg" />
          </div>
          <h1 className="brand-name">3D Intero</h1>
          <p className="brand-tagline">Desain kitchen set impianmu dalam hitungan menit</p>
        </div>
        <button
          type="button"
          id="btn-mulai"
          className="cta-button"
          disabled={transitionBusy || loading}
          onClick={() => { void startTransition(); }}
        >
          <span>{loggedIn ? 'Lanjutkan desain' : 'Mulai Berkreasi'}</span>
          <span className="cta-arrow">→</span>
        </button>
        <p className="landing-hint">Geser & putar untuk melihat kitchen set 3D</p>
        <a href="/?local=1" className="landing-local-link">Coba tanpa akun (editor lokal)</a>
      </div>

      <div id="white-flash" ref={flashRef} />

      {oauthToast && (
        <div className="landing-oauth-toast">
          Login berhasil — klik &quot;Lanjutkan desain&quot; untuk masuk editor.
          <button type="button" className="auth-link ml-2 text-white" onClick={() => setOauthToast(false)}>OK</button>
        </div>
      )}

      {configured && (
        <AuthPopup
          open={authOpen}
          initialTab={authTab}
          onClose={() => setAuthOpen(false)}
          onSuccess={onAuthSuccess}
        />
      )}
    </div>
  );
}
