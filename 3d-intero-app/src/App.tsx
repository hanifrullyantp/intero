import { useEffect, useState } from 'react';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { Landing, landingApi } from './components/Landing';
import { AuthModal } from './components/AuthModal';
import { Editor } from './components/editor/Editor';
import { Viewer } from './components/viewer/Viewer';
import { ArHost } from './components/xr/ArHost';
import { ArFallbackModal, CameraArView } from './components/xr/ArFallback';
import { TooltipHost, ToastHost, toast } from './components/ui';
import { SpotlightHost } from './components/Spotlight';
import { useStore } from './store';
import { validateProjectData } from './lib/persistence';

// 3D Intero — entry: landing ↔ editor dengan transisi sinematik, mock auth, white flash, share link
export default function App() {
  const [view, setView] = useState<'landing' | 'editor' | 'viewer'>('landing');
  const [authOpen, setAuthOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0F1419' : '#F3F4F6');
  }, [theme]);

  // Buka tautan bersama: #s=view.<payload> atau #s=edit.<payload>
  useEffect(() => {
    if (window.location.hash === '#viewer') { useStore.getState().ui({ shareMode: 'view' }); setView('viewer'); return; }
    const m = window.location.hash.match(/^#s=(view|edit)\.(.+)$/);
    if (!m) return;
    try {
      const json = decompressFromEncodedURIComponent(m[2]);
      if (!json) throw new Error('tautan rusak');
      const data = JSON.parse(json) as unknown;
      if (!validateProjectData(data)) throw new Error('data tidak valid');
      const st = useStore.getState();
      st.loadProject(data);
      st.ui({ shareMode: m[1] as 'view' | 'edit' });
      setView(m[1] === 'view' ? 'viewer' : 'editor');
      toast(m[1] === 'view' ? `Membuka "${data.projectName}" dalam mode lihat saja` : `Membuka "${data.projectName}" (bisa edit, tersimpan lokal)`, 'success');
    } catch {
      toast('Tautan berbagi tidak valid atau rusak', 'error');
    }
  }, []);

  useEffect(() => {
    const start = () => {
      if (transitioning) return;
      if (view === 'landing' && landingApi.cinematic) { setTransitioning(true); landingApi.cinematic(() => { setView('editor'); setTransitioning(false); }); }
      else setView('editor');
    };
    const openAuth = () => setAuthOpen(true);
    const logout = () => { history.replaceState(null, '', location.pathname); useStore.getState().ui({ shareMode: null }); setView('landing'); };
    window.addEventListener('intero:logout', logout);
    window.addEventListener('intero:startEditor', start);
    window.addEventListener('intero:openAuth', openAuth);
    return () => { window.removeEventListener('intero:startEditor', start); window.removeEventListener('intero:openAuth', openAuth); window.removeEventListener('intero:logout', logout); };
  }, [view, transitioning]);

  const backToLanding = () => {
    // Keluar dari mode share saat kembali ke landing
    if (useStore.getState().shareMode) {
      history.replaceState(null, '', location.pathname);
      useStore.getState().ui({ shareMode: null });
    }
    setView('landing');
  };

  return (
    <div className="h-full w-full" style={{ fontFamily: 'var(--font-body)' }}>
      {view === 'landing' ? <Landing /> : view === 'viewer' ? <Viewer onBack={backToLanding} /> : <Editor onBackToLanding={backToLanding} />}
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
