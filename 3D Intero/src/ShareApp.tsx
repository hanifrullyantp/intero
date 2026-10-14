import { useEffect, useState } from 'react';
import { useStore } from './core/store';
import { fetchSharedProject, parseShareIdFromPath } from './core/share';
import InteroLogo from './ui/InteroLogo';
import ViewportManager from './viewport/ViewportManager';
import ViewToolsToolbar from './ui/ViewToolsToolbar';
import { Toasts, LoadingOverlay } from './ui/Overlays';
import { useShareViewerShortcuts } from './ui/useShareViewerShortcuts';
import { DoorOpen, DoorClosed, ExternalLink } from './ui/icons';
import { CAMERA_PRESETS } from './viewport/Viewport3D';
import { ChevronDown } from './ui/icons';

function ShareChrome() {
  const project = useStore((s) => s.project);
  const ui = useStore((s) => s.ui);
  const setDoorsOpen = useStore((s) => s.setDoorsOpen);
  const setUI = useStore((s) => s.setUI);
  const [camOpen, setCamOpen] = useState(false);

  const preset = CAMERA_PRESETS.find((p) => p.id === ui.cameraPreset) ?? CAMERA_PRESETS[0];

  return (
    <>
      <div className="h-12 flex items-center gap-2 px-3 border-b shrink-0" style={{ background: 'var(--bg-main)', borderColor: 'var(--border)' }}>
        <InteroLogo size={32} className="rounded-md shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold truncate">{project.name}</div>
          <div className="text-[10px] opacity-70">Instant 3D · view only</div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border border-[var(--border)] shrink-0"
          style={{ background: 'var(--bg-panel)' }}
          title={ui.doorsOpen ? 'Close all doors' : 'Open all doors'}
          onClick={() => setDoorsOpen(!ui.doorsOpen)}
        >
          {ui.doorsOpen ? <DoorClosed size={14} /> : <DoorOpen size={14} />}
          {ui.doorsOpen ? 'Close' : 'Open'}
        </button>
        <div className="relative shrink-0 hidden sm:block">
          <button type="button" className="tb-btn flex items-center gap-1" onClick={() => setCamOpen((o) => !o)}>
            {preset.label} <ChevronDown size={11} />
          </button>
          {camOpen && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setCamOpen(false)} />
              <div className="absolute right-0 top-full mt-1 card py-1 min-w-40 z-[101] shadow-xl">
                {CAMERA_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)] ${p.id === ui.cameraPreset ? 'text-[var(--accent)]' : ''}`}
                    onClick={() => {
                      setUI({ cameraPreset: p.id, fitRequest: useStore.getState().ui.fitRequest + 1, viewMode: '3d' });
                      setCamOpen(false);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <a href="/" className="btn flex items-center gap-1 py-1.5! text-xs shrink-0" title="Open full editor (requires local project)">
          <ExternalLink size={14} /> <span className="hidden md:inline">Editor</span>
        </a>
      </div>
      <div className="desktop-only absolute left-2 top-[3.5rem] z-30 card shadow-lg">
        <ViewToolsToolbar />
      </div>
      <div className="mobile-only absolute left-2 bottom-[calc(var(--mobile-nav-h)+8px)] z-30 card shadow-lg">
        <ViewToolsToolbar compact />
      </div>
    </>
  );
}

function ShareMobileNav() {
  const doorsOpen = useStore((s) => s.ui.doorsOpen);
  const setDoorsOpen = useStore((s) => s.setDoorsOpen);
  return (
    <div
      className="mobile-only mobile-bottom-nav flex items-center justify-center border-t shrink-0 py-2"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <button
        type="button"
        className="flex flex-col items-center gap-0.5 min-h-[48px] px-6"
        onClick={() => setDoorsOpen(!doorsOpen)}
      >
        <span className="w-10 h-10 rounded-full grid place-items-center shadow-md" style={{ background: doorsOpen ? 'var(--brand)' : 'var(--bg-panel)', border: '2px solid var(--brand)', color: doorsOpen ? '#fff' : 'var(--accent)' }}>
          {doorsOpen ? <DoorClosed size={20} /> : <DoorOpen size={20} />}
        </span>
        <div className="text-[9px]">{doorsOpen ? 'Close doors' : 'Open doors'}</div>
      </button>
    </div>
  );
}

export default function ShareApp() {
  const shareId = parseShareIdFromPath(window.location.pathname);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useShareViewerShortcuts();

  useEffect(() => {
    if (!shareId) {
      setErr('Invalid share link');
      return;
    }
    let cancelled = false;
    (async () => {
      useStore.getState().setUI({
        loading: 'Loading shared design…',
        accessMode: 'view',
        leftOpen: false,
        rightOpen: false,
        toolsOpen: false,
        viewMode: '3d',
        tool: 'orbit',
        modal: null,
        mobileSheet: null,
      });
      try {
        const project = await fetchSharedProject(shareId);
        if (cancelled) return;
        useStore.getState().setProject(project, false);
        useStore.setState({ dirty: false, past: [], future: [], selectedIds: [] });
        useStore.getState().requestFit();
        setReady(true);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) useStore.getState().setUI({ loading: null });
      }
    })();
    return () => { cancelled = true; };
  }, [shareId]);

  if (err) {
    return (
      <div className="h-full grid place-items-center p-6 text-center" style={{ background: 'var(--bg-main)' }}>
        <InteroLogo size={48} className="mx-auto mb-4 rounded-xl" />
        <h1 className="text-lg font-bold mb-2">Share link unavailable</h1>
        <p className="text-sm opacity-70 max-w-sm mb-4">{err}</p>
        <a href="/" className="btn-primary inline-flex px-4 py-2 rounded-lg text-sm">Go to Instant 3D</a>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--bg-main)' }}>
        <LoadingOverlay />
        <Toasts />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <ShareChrome />
      <div className="flex-1 min-h-0 relative flex flex-col mobile-viewport-pad">
        <ViewportManager />
      </div>
      <ShareMobileNav />
      <Toasts />
    </div>
  );
}
