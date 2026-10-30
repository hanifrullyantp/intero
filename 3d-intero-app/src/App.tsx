import { useEffect, useState } from 'react';
import { Landing, landingApi } from './components/Landing';
import { AuthModal } from './components/AuthModal';
import { Editor } from './components/editor/Editor';
import { Viewer } from './components/viewer/Viewer';
import { ArHost } from './components/xr/ArHost';
import { ArFallbackModal, CameraArView } from './components/xr/ArFallback';
import { TooltipHost, ToastHost, toast } from './components/ui';
import { SpotlightHost } from './components/Spotlight';
import { useStore } from './store';
import { fetchProjectShare, forgetShareUrl, projectFromLegacyHash, shareIdFromPath } from './lib/share-link';
import { clearActiveProject } from './lib/account';

// 3D Intero — entry: landing ↔ editor dengan transisi sinematik, mock auth, white flash, share link
export default function App() {
  const [view, setView] = useState<'landing' | 'editor' | 'viewer'>('landing');
  const [authOpen, setAuthOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const theme = useStore((s) => s.theme);
  const [openingShare, setOpeningShare] = useState(() => Boolean(shareIdFromPath(window.location.pathname) || window.location.hash.startsWith('#s=')));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0F1419' : '#F3F4F6');
  }, [theme]);

  // Buka tautan pendek /s/:id, atau tautan lama #s=view|edit.<payload> jika masih utuh.
  useEffect(() => {
    let cancel = false;
    const fail = (message: string) => { if (!cancel) toast(message, 'error'); };
    const apply = (mode: 'view' | 'edit', projectName: string) => {
      if (cancel) return;
      setView(mode === 'view' ? 'viewer' : 'editor');
      toast(mode === 'view' ? `Membuka "${projectName}" dalam mode lihat saja` : `Membuka "${projectName}" (bisa edit, tersimpan lokal)`, 'success');
    };
    (async () => {
      if (window.location.hash === '#viewer') { useStore.getState().ui({ shareMode: 'view' }); setView('viewer'); return; }
      const id = shareIdFromPath(window.location.pathname);
      if (id) {
        try {
          const { mode, project } = await fetchProjectShare(id);
          clearActiveProject();
          const st = useStore.getState();
          st.loadProject(project);
          st.ui({ shareMode: mode, resetViewRequest: st.resetViewRequest + 1 });
          apply(mode, project.projectName);
        } catch (e) { fail((e as Error).message || 'Tautan berbagi tidak dapat dibuka'); }
        return;
      }
      if (!window.location.hash.startsWith('#s=')) return;
      try {
        const legacy = projectFromLegacyHash(window.location.hash);
        if (!legacy) return;
        clearActiveProject();
        const st = useStore.getState();
        st.loadProject(legacy.project);
        st.ui({ shareMode: legacy.mode, resetViewRequest: st.resetViewRequest + 1 });
        apply(legacy.mode, legacy.project.projectName);
      } catch (e) { fail((e as Error).message || 'Tautan berbagi tidak valid atau rusak'); }
    })().finally(() => { if (!cancel) setOpeningShare(false); });
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    const start = () => {
      if (transitioning) return;
      if (view === 'landing' && landingApi.cinematic) { setTransitioning(true); landingApi.cinematic(() => { setView('editor'); setTransitioning(false); }); }
      else setView('editor');
    };
    const openAuth = () => setAuthOpen(true);
    const logout = () => { forgetShareUrl(); useStore.getState().ui({ shareMode: null }); setView('landing'); };
    window.addEventListener('intero:logout', logout);
    window.addEventListener('intero:startEditor', start);
    window.addEventListener('intero:openAuth', openAuth);
    return () => { window.removeEventListener('intero:startEditor', start); window.removeEventListener('intero:openAuth', openAuth); window.removeEventListener('intero:logout', logout); };
  }, [view, transitioning]);

  const backToLanding = () => {
    // Keluar dari mode share saat kembali ke landing
    if (useStore.getState().shareMode) {
      forgetShareUrl();
      useStore.getState().ui({ shareMode: null });
    }
    setView('landing');
  };

  return (
    <div className="h-full w-full" style={{ fontFamily: 'var(--font-body)' }}>
      {openingShare ? (
        <div className="h-full w-full flex items-center justify-center text-[14px]" style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)' }}>Membuka tautan…</div>
      ) : view === 'landing' ? <Landing /> : view === 'viewer' ? <Viewer onBack={backToLanding} /> : <Editor onBackToLanding={backToLanding} />}
      <ArHost />
      {view === 'editor' && <ArFallbackModal reason="Perangkat atau browser ini belum mendukung konfigurasi AR yang dibutuhkan (hit-test / dom-overlay). Silakan pilih salah satu opsi di bawah." onRetry={() => { useStore.getState().ui({ showArFallback: false, showAr: true }); }} />}
      {view === 'editor' && <CameraArView />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      <ToastHost />
      <TooltipHost />
      <SpotlightHost />
      <div id="white-flash" className="fixed inset-0 pointer-events-none" style={{ background: '#FFFFFF', opacity: 0, zIndex: 2000 }} />
    </div>
  );
}
