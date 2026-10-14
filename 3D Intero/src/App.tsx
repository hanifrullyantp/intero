import { useEffect, useRef } from 'react';
import { useStore } from './core/store';
import Toolbar from './ui/Toolbar';
import ComponentLibrary from './ui/ComponentLibrary';
import PropertiesPanel from './ui/PropertiesPanel';
import ToolsToolbar, { ArrayModal, AlignModal } from './ui/ToolsToolbar';
import ComponentBuilder from './ui/ComponentBuilder';
import ViewportManager from './viewport/ViewportManager';
import ContextBar from './ui/ContextBar';
import WizardModal from './ui/WizardModal';
import MagicWizard from './ui/MagicWizard';
import CuttingListModal from './ui/CuttingListModal';
import { ExportModal, PriceModal, TemplatesModal, HoodConfigModal, EditorModal, ShortcutsModal, ConfirmDialog } from './ui/modals';
import { Toasts, ContextMenu, StatusBar, LoadingOverlay } from './ui/Overlays';
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts';
import { Box, SlidersHorizontal, PanelLeft, X, DoorOpen, DoorClosed } from './ui/icons';

const LIB_KEY = 'instant3d_libopen';
function setLeftOpen(v: boolean) {
  try { localStorage.setItem(LIB_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  useStore.getState().setUI({ leftOpen: v });
}
try {
  if (localStorage.getItem(LIB_KEY) === '0') setTimeout(() => useStore.getState().setUI({ leftOpen: false }), 0);
} catch { /* ignore */ }

function Divider({ side }: { side: 'left' | 'right' }) {
  const setUI = useStore((s) => s.setUI);
  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const st = useStore.getState().ui;
    const startW = side === 'left' ? st.leftWidth : st.rightWidth;
    const onMove = (ev: MouseEvent) => {
      const d = ev.clientX - startX;
      const w = Math.max(180, Math.min(520, side === 'right' ? startW - d : startW + d));
      setUI(side === 'left' ? { leftWidth: w } : { rightWidth: w });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  return <div onMouseDown={onDown} className="w-1 h-full cursor-col-resize shrink-0 transition-colors hover:bg-[var(--accent)]" style={{ background: 'var(--border)' }} title="Drag to resize panel" />;
}

/** Mobile bottom sheets: backdrop tap, × button, or handle tap closes them. */
function MobileNav() {
  const sheet = useStore((s) => s.ui.mobileSheet);
  const doorsOpen = useStore((s) => s.ui.doorsOpen);
  const setUI = useStore((s) => s.setUI);
  const setDoorsOpen = useStore((s) => s.setDoorsOpen);
  const close = () => setUI({ mobileSheet: null });
  return (
    <>
      {sheet && <div className="mobile-only fixed inset-0 z-[79] bg-black/40" onClick={close} />}
      {sheet && (
        <div className="mobile-only mobile-sheet border-t" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-center py-2 relative" onClick={close}>
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
            <button className="absolute right-2 top-1.5 tb-btn" onClick={(e) => { e.stopPropagation(); close(); }} title="Close"><X size={16} /></button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '52vh' }}>
            {sheet === 'components' && <ComponentLibrary />}
            {sheet === 'props' && <PropertiesPanel />}
          </div>
        </div>
      )}
      {/* Parts | OPEN (all cabinets + accessories) | Props */}
      <div className="mobile-only flex items-stretch border-t shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <button className={`flex-1 py-2 flex flex-col items-center gap-0.5 ${sheet === 'components' ? 'text-[var(--accent)]' : ''}`} onClick={() => setUI({ mobileSheet: sheet === 'components' ? null : 'components' })}>
          <Box size={20} /><div className="text-[9px]">Parts</div>
        </button>
        <button
          className="flex-1 -mt-5 flex flex-col items-center gap-0.5"
          onClick={() => setDoorsOpen(!doorsOpen)}
          title="Buka / tutup seluruh kabinet dan aksesoris">
          <span className="w-12 h-12 rounded-full grid place-items-center shadow-lg" style={{ background: doorsOpen ? 'var(--brand)' : 'var(--bg-panel)', border: '2px solid var(--brand)', color: doorsOpen ? '#fff' : 'var(--accent)' }}>
            {doorsOpen ? <DoorClosed size={22} /> : <DoorOpen size={22} />}
          </span>
          <div className="text-[9px]">{doorsOpen ? 'Tutup' : 'Open'}</div>
        </button>
        <button className={`flex-1 py-2 flex flex-col items-center gap-0.5 ${sheet === 'props' ? 'text-[var(--accent)]' : ''}`} onClick={() => setUI({ mobileSheet: sheet === 'props' ? null : 'props' })}>
          <SlidersHorizontal size={20} /><div className="text-[9px]">Props</div>
        </button>
      </div>
    </>
  );
}

export default function App() {
  const ui = useStore((s) => s.ui);
  const toast = useStore((s) => s.toast);
  const installEvt = useRef<Event & { prompt?: () => Promise<unknown> } | null>(null);
  useKeyboardShortcuts();

  // welcome toast
  useEffect(() => {
    const t = setTimeout(() => {
      toast({ severity: 'info', message: ui.uiMode === 'simple' ? 'Simple mode — big viewport, essentials only. Toggle Advanced for pro tools.' : 'Welcome — drag components into the plan or 3D view. Right sidebar: Props · Material · Display · Open.', ttl: 6000 });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PWA install prompt → offered as a toast action
  useEffect(() => {
    const onBefore = (e: Event) => {
      e.preventDefault();
      installEvt.current = e as Event & { prompt?: () => Promise<unknown> };
      useStore.getState().toast({
        severity: 'info', ttl: 12000, message: 'Install 3D Intero sebagai aplikasi desktop/mobile untuk akses offline.',
        actions: [{ label: 'Install', onClick: () => { void installEvt.current?.prompt?.(); } }],
      });
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    return () => window.removeEventListener('beforeinstallprompt', onBefore);
  }, []);

  const simple = ui.uiMode === 'simple';

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Toolbar />
      <div className="flex-1 flex min-h-0 relative">
        {ui.leftOpen && (
          <div className="desktop-only flex shrink-0 h-full">
            <div style={{ width: simple ? 200 : ui.leftWidth }} className="h-full border-r border-[var(--border)] relative">
              <ComponentLibrary />
              <button className="absolute top-2 right-2 tb-btn h-6! min-w-6! px-1! z-10" title="Collapse library (Shift+C)" onClick={() => setLeftOpen(false)}>
                <PanelLeft size={13} />
              </button>
            </div>
            {!simple && <Divider side="left" />}
          </div>
        )}
        {!ui.leftOpen && (
          <button className="desktop-only absolute left-2 top-14 z-30 tb-btn shadow-lg" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }} title="Expand library (Shift+C)" onClick={() => setLeftOpen(true)}>
            <PanelLeft size={14} />
          </button>
        )}
        <div className="flex-1 min-w-0 flex min-h-0">
          {!simple && (
            <div className="desktop-only shrink-0 h-full border-r border-[var(--border)]" style={{ width: 48, background: 'var(--bg-panel)' }}>
              <ToolsToolbar />
            </div>
          )}
          <div className="flex-1 min-w-0 min-h-0 relative flex flex-col">
            <ViewportManager />
            <ContextBar />
          </div>
        </div>
        {ui.rightOpen && (
          <div className="desktop-only flex shrink-0 h-full">
            <Divider side="right" />
            <div style={{ width: simple ? 240 : ui.rightWidth }} className="h-full border-l border-[var(--border)]">
              <PropertiesPanel />
            </div>
          </div>
        )}
      </div>
      <div className="desktop-only"><StatusBar /></div>
      <MobileNav />

      {ui.modal === 'magic' && <MagicWizard />}
      {ui.modal === 'wizard' && <WizardModal />}
      {ui.modal === 'templates' && <TemplatesModal />}
      {ui.modal === 'export' && <ExportModal />}
      {ui.modal === 'cutting' && <CuttingListModal />}
      {ui.modal === 'price' && <PriceModal />}
      {ui.modal === 'hood' && <HoodConfigModal />}
      {ui.modal === 'editor' && <EditorModal />}
      {ui.modal === 'shortcuts' && <ShortcutsModal />}
      {ui.modal === 'array' && <ArrayModal />}
      {ui.modal === 'align' && <AlignModal />}
      {ui.modal === 'builder' && <ComponentBuilder />}
      <ConfirmDialog />
      <ContextMenu />
      <Toasts />
      <LoadingOverlay />
    </div>
  );
}
