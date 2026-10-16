import { useState, useRef, useEffect } from 'react';
import { useStore, persist } from '../core/store';
import { saveProjectFile, openProjectFile } from '../core/projectManager';
import { exportCuttingListCSV, exportDXF, exportJSON, exportTechnicalPDF, exportQuotationPDF, renderPlanImage, downloadCanvasPNG } from '../utils/exporters';
import { CAMERA_PRESETS, capture3D } from '../viewport/Viewport3D';
import { safeName } from '../core/projectManager';
import InteroLogo from './InteroLogo';
import {
  FilePlus2, Save, FolderOpen, Undo2, Redo2, Scissors, Calculator, Download, Hammer,
  Sun, Moon, Monitor, Sparkles, Settings, Keyboard, ChevronDown, Link2,
  DraftingCompass, Receipt, ClipboardList, Image, FileText, Package, Info, PencilRuler, Box, Building, Columns2, type LucideIcon,
} from './icons';
import { createShareLink } from '../core/share';
import SyncStatusBadge from './SyncStatusBadge';
import { isSupabaseConfigured } from '../lib/supabase';

type MenuItem = { label: string; onClick: () => void; icon?: LucideIcon; sep?: boolean; kbd?: string };

export function Dropdown({ label, icon: Icon, items, title, iconOnly, disabled }: { label: string; icon?: LucideIcon; title?: string; items: MenuItem[]; iconOnly?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, []);
  const toggle = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 260)) });
    }
    setOpen((o) => !o);
  };
  return (
    <div ref={ref} className="relative shrink-0">
      <button ref={btnRef} className={`tb-btn ${open ? 'active' : ''}`} onClick={toggle} title={title ?? label} disabled={disabled}>
        {Icon && <Icon size={15} />}
        {!iconOnly && <>{label} <ChevronDown size={11} className="opacity-60" /></>}
      </button>
      {open && pos && (
        <div className="fixed z-[120] min-w-56 card shadow-2xl py-1 anim-in max-h-[80vh] overflow-y-auto" style={{ top: pos.top, left: pos.left }}>
          {items.map((it, i) => it.sep ? (
            <div key={i} className="h-px my-1" style={{ background: 'var(--border)' }} />
          ) : (
            <button key={i} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-primary)' }}
              onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon ? <it.icon size={14} className="opacity-70 shrink-0" /> : <span className="w-3.5" />}
              <span className="flex-1">{it.label}</span>
              {it.kbd && <span className="kbd">{it.kbd}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Toolbar() {
  const project = useStore((s) => s.project);
  const ui = useStore((s) => s.ui);
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const dirty = useStore((s) => s.dirty);
  const { setUI, undo, redo, setProject, toast } = useStore.getState();
  const [editingName, setEditingName] = useState(false);

  const ThemeIcon = ui.theme === 'system' ? Monitor : ui.resolvedTheme === 'dark' ? Moon : Sun;

  const doSave = () => { saveProjectFile(project); persist(project); useStore.setState({ dirty: false }); toast({ severity: 'success', message: 'Project saved (.i3d.json downloaded)' }); };
  const doLoad = async () => {
    try { const p = await openProjectFile(); setProject(p); useStore.getState().requestFit(); toast({ severity: 'success', message: `Loaded "${p.name}"` }); }
    catch (e) { toast({ severity: 'error', message: `Load failed: ${(e as Error).message}` }); }
  };
  const export3D = (type: 'image/png' | 'image/jpeg') => {
    if (ui.viewMode === '2d' || ui.viewMode === 'elevation') {
      setUI({ viewMode: 'split' });
      setTimeout(() => { const c = capture3D(); if (c) downloadCanvasPNG(c, `${safeName(project.name)}_3d.${type === 'image/png' ? 'png' : 'jpg'}`, type); }, 600);
      return;
    }
    const c = capture3D();
    if (c) downloadCanvasPNG(c, `${safeName(project.name)}_3d.${type === 'image/png' ? 'png' : 'jpg'}`, type);
    else toast({ severity: 'warning', message: 'Open the 3D view first' });
  };
  const shareProject = async () => {
    setUI({ loading: 'Creating share link…' });
    try {
      const { url } = await createShareLink(project);
      try {
        await navigator.clipboard.writeText(url);
        toast({ severity: 'success', message: 'Share link copied — anyone can view in 3D (no login)', ttl: 5000 });
      } catch {
        toast({
          severity: 'success',
          message: 'Share link ready',
          ttl: 12000,
          actions: [{ label: 'Copy link', onClick: () => { void navigator.clipboard.writeText(url); } }],
        });
      }
    } catch (e) {
      toast({ severity: 'error', message: (e as Error).message || 'Could not create share link' });
    } finally {
      setUI({ loading: null });
    }
  };

  const aiRender = () => {
    const c = capture3D();
    if (!c) { setUI({ viewMode: 'split' }); toast({ severity: 'info', message: 'Opening 3D view — click AI Render again to capture', ttl: 2500 }); return; }
    downloadCanvasPNG(c, `${safeName(project.name)}_ai_render.png`);
    toast({ severity: 'success', message: 'High-res render captured', ttl: 2500 });
  };

  const ensure3dView = () => {
    if (ui.viewMode === '2d' || ui.viewMode === 'elevation') setUI({ viewMode: 'split' });
  };

  const fileMenu: MenuItem[] = [
    { label: 'New Project — Magic Generator…', icon: FilePlus2, kbd: 'Ctrl+N', onClick: () => setUI({ modal: 'magic' }) },
    { label: 'New Project (wizard)…', icon: DraftingCompass, onClick: () => setUI({ modal: 'wizard' }) },
    { label: 'Open…', icon: FolderOpen, onClick: doLoad },
    { label: 'Save', icon: Save, kbd: 'Ctrl+S', onClick: doSave },
    { label: 'Copy share link (view only)', icon: Link2, onClick: () => { void shareProject(); } },
    { label: 'Templates…', icon: Package, onClick: () => setUI({ modal: 'templates' }) },
    { sep: true, label: '', onClick: () => {} },
    { label: 'Export center…', icon: Download, onClick: () => setUI({ modal: 'export' }) },
    { label: 'Technical drawings (PDF)', icon: DraftingCompass, onClick: () => exportTechnicalPDF(project) },
    { label: 'Quotation (PDF)', icon: Receipt, onClick: () => exportQuotationPDF(project) },
    { label: 'Cutting list (CSV)', icon: ClipboardList, onClick: () => exportCuttingListCSV(project) },
    { label: '3D render (PNG)', icon: Image, onClick: () => export3D('image/png') },
    { label: '2D plan (PNG)', icon: Image, onClick: () => downloadCanvasPNG(renderPlanImage(project, 2400, 1600), `${safeName(project.name)}_plan.png`) },
    { label: 'DXF / JSON', icon: FileText, onClick: () => { exportDXF(project); exportJSON(project); } },
    { sep: true, label: '', onClick: () => {} },
    { label: 'Cutting List & Nesting', icon: Scissors, onClick: () => { if (useStore.getState().requireAdvanced('Cutting List')) setUI({ modal: 'cutting' }); } },
    { label: 'Price Estimation', icon: Calculator, onClick: () => { if (useStore.getState().requireAdvanced('Price Estimation')) setUI({ modal: 'price' }); } },
    { label: 'Component Builder', icon: Hammer, kbd: 'Ctrl+⇧K', onClick: () => setUI({ modal: 'builder' }) },
  ];

  const threeDMenu: MenuItem[] = [
    { label: '2D Plan', icon: PencilRuler, onClick: () => setUI({ viewMode: '2d' }) },
    { label: '3D View', icon: Box, onClick: () => setUI({ viewMode: '3d' }) },
    ...(ui.uiMode === 'advanced' ? [
      { label: 'Elevation', icon: Building, onClick: () => setUI({ viewMode: 'elevation' }) },
      { label: 'Split', icon: Columns2, onClick: () => setUI({ viewMode: 'split' }) },
    ] : []),
    { sep: true, label: '', onClick: () => {} },
    ...CAMERA_PRESETS.map((p) => ({
      label: p.label,
      kbd: p.key,
      onClick: () => {
        const vm = ui.viewMode === '2d' || ui.viewMode === 'elevation' ? 'split' : ui.viewMode;
        setUI({ cameraPreset: p.id, fitRequest: useStore.getState().ui.fitRequest + 1, viewMode: vm });
      },
    })),
    { sep: true, label: '', onClick: () => {} },
    { label: 'X-ray', onClick: () => { ensure3dView(); setUI({ openView: 'xray' }); } },
    { label: 'Explode', onClick: () => { ensure3dView(); setUI({ openView: 'explode' }); } },
    { label: 'Normal shading', onClick: () => setUI({ openView: 'normal' }) },
  ];

  const settingsItems: MenuItem[] = [
    { label: `Theme: ${ui.theme}`, icon: ThemeIcon, kbd: 'Ctrl+⇧T', onClick: () => { const next = ui.theme === 'light' ? 'dark' : ui.theme === 'dark' ? 'system' : 'light'; useStore.getState().setTheme(next); } },
    { label: ui.uiMode === 'simple' ? 'Switch to Advanced' : 'Switch to Simple', icon: ui.uiMode === 'simple' ? Sparkles : Settings, kbd: 'Ctrl+⇧U', onClick: () => useStore.getState().setUIMode(ui.uiMode === 'simple' ? 'advanced' : 'simple') },
    { label: 'Keyboard shortcuts', icon: Keyboard, onClick: () => setUI({ modal: 'shortcuts' }) },
    { label: 'About Instant 3D', icon: Info, onClick: () => toast({ severity: 'info', message: 'Instant 3D — parametric furniture designer by Intero.', ttl: 3500 }) },
  ];

  return (
    <div className="desktop-only h-14 flex items-center gap-2 px-3 border-b shrink-0 select-none" style={{ background: 'var(--bg-main)', borderColor: 'var(--border)', overflowX: 'auto' }}>
      <Dropdown label="Menu" items={fileMenu} iconOnly icon={MenuIcon as unknown as LucideIcon} title="File menu" />
      <InteroLogo size={36} className="shrink-0 rounded-lg shadow-sm" />
      <div className="leading-tight shrink-0">
        <div className="text-[14px] font-bold tracking-tight">Instant 3D</div>
        {editingName ? (
          <input autoFocus className="input py-0! text-[11px]! w-44 mt-0.5" defaultValue={project.name}
            onBlur={(e) => { setProject({ ...project, name: e.target.value || project.name }, false); setEditingName(false); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        ) : (
          <div className="text-[11px] cursor-text truncate max-w-[12rem] flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--text-secondary)' }} title="Click to rename" onClick={() => setEditingName(true)}>
            {project.name}.i3d
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dirty ? 'var(--warning)' : 'var(--success)' }} title={dirty ? 'Modified' : 'Saved'} />
          </div>
        )}
      </div>
      <div className="tb-sep" />
      <button
        type="button"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white shadow-md hover:brightness-105 active:scale-[0.98] transition-all shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--brand-light) 0%, var(--brand) 55%, var(--brand-active) 100%)', border: '1px solid color-mix(in srgb, var(--brand) 40%, white)' }}
        title="New project — Magic Generator (Ctrl+N)"
        onClick={() => setUI({ modal: 'magic' })}
      >
        <FilePlus2 size={15} strokeWidth={2.25} />
        <span className="hidden sm:inline">New Project</span>
      </button>
      <button type="button" className="tb-btn" title="Undo (Ctrl+Z)" disabled={!past} onClick={undo}><Undo2 size={16} /></button>
      <button type="button" className="tb-btn" title="Redo (Ctrl+Shift+Z)" disabled={!future} onClick={redo}><Redo2 size={16} /></button>
      <div className="tb-sep" />
      <Dropdown label="3D" items={threeDMenu} title="Views, camera & render modes" />
      <SyncStatusBadge />
      {isSupabaseConfigured() && (
        <a href="/projects" className="tb-btn text-xs shrink-0" title="All projects">Projects</a>
      )}

      <div className="flex-1 min-w-2" />

      <Dropdown label="" icon={Settings} iconOnly items={settingsItems} title="Settings" />
      <div className="tb-sep" />
      <button type="button" className="btn flex items-center gap-1.5 py-1.5!" title="Copy view-only share link" onClick={() => { void shareProject(); }}><Link2 size={14} /> <span className="hidden lg:inline">Share</span></button>
      <button type="button" className="btn-primary flex items-center gap-1.5 py-1.5!" title="AI Render — capture high-res 3D" onClick={aiRender}><Sparkles size={14} /> <span className="hidden md:inline">AI Render</span></button>
      <button type="button" className="btn flex items-center gap-1.5 py-1.5!" title="Save project (Ctrl+S)" onClick={doSave}><Save size={14} /> <span className="hidden md:inline">Save</span></button>
    </div>
  );
}

function MenuIcon(props: { size?: number; className?: string }) {
  const s = props.size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={props.className}>
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
