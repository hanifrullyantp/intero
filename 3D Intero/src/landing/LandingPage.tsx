import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { resolvePostLoginEditorUrl } from '../cloud/launchEditor';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { applyTheme, getInitialTheme, type ThemeMode } from '../lib/ui';
import { useSaasPage } from '../ui/saas/useSaasPage';
import type { AuthTab } from '../ui/auth/AuthPopup';
import NewLanding from './NewLanding';
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
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const t = getInitialTheme();
    return t === 'dark' ? t : 'light';
  });
  const [authOpen, setAuthOpen] = useState(forceOpenAuth || shouldOpenAuth());
  const [authTab] = useState<AuthTab>(initialAuthTab());
  const [oauthToast, setOauthToast] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.saas = '1';
    applyTheme(theme);
    return () => {
      delete document.documentElement.dataset.saas;
    };
  }, [theme]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('oauth') === '1' && user && !loading) {
      p.delete('oauth');
      const next = `${window.location.pathname}${p.toString() ? `?${p}` : ''}`;
      window.history.replaceState({}, '', next);
      setOauthToast(true);
    }
  }, [user, loading]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    applyTheme(t);
  };

  const onStart = useCallback(async () => {
    if (!configured || !isSupabaseConfigured()) {
      window.location.href = '/?local=1';
      return;
    }
    const session = (await getSupabase().auth.getSession()).data.session;
    if (!session && !user) {
      setAuthOpen(true);
      return;
    }
    try {
      const url = await resolvePostLoginEditorUrl();
      window.location.replace(url);
    } catch (e) {
      console.error(e);
      window.location.replace('/enter');
    }
  }, [configured, user]);

  const loggedIn = !!user && !loading;
  const showAuth = configured && isSupabaseConfigured();

  return (
    <>
      <NewLanding
        theme={theme}
        setTheme={setTheme}
        loggedIn={loggedIn}
        sessionLoading={loading}
        authOpen={authOpen}
        onAuthOpenChange={setAuthOpen}
        authTab={authTab}
        showAuth={showAuth}
        onStart={() => {
          void onStart();
        }}
      />
      {oauthToast && (
        <div className="landing-oauth-toast">
          Login berhasil — klik &quot;Lanjutkan desain&quot; untuk masuk editor.
          <button type="button" className="auth-link ml-2 text-white" onClick={() => setOauthToast(false)}>
            OK
          </button>
        </div>
      )}
    </>
  );
}
