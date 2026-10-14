import { useState, useRef, useEffect } from 'react';
import { useStore, persist, type ViewMode } from '../core/store';
import { saveProjectFile, openProjectFile } from '../core/projectManager';
import { exportCuttingListCSV, exportDXF, exportJSON, exportTechnicalPDF, exportQuotationPDF, renderPlanImage, downloadCanvasPNG } from '../utils/exporters';
import { CAMERA_PRESETS, capture3D } from '../viewport/Viewport3D';
import { safeName } from '../core/projectManager';
import {
  FilePlus2, Save, FolderOpen, Undo2, Redo2, Scissors, Calculator, Download, Hammer,
  Check, TriangleAlert, CircleAlert, Sun, Moon, Monitor, Sparkles, Settings, Keyboard, ChevronDown,
  DraftingCompass, Receipt, ClipboardList, Image, FileText, Package, Info, PencilRuler, Box, Building, Columns2, type LucideIcon,
} from './icons';

type MenuItem = { label: string; onClick: () => void; icon?: LucideIcon; sep?: boolean; kbd?: string };

export /**
 * Toolbar menu. The panel is rendered with `position: fixed` because the toolbar
 * scrolls horizontally (`overflow-x: auto`), which would clip an absolutely
 * positioned dropdown inside it.
 */
function Dropdown({ label, icon: Icon, items, title, iconOnly, disabled }: { label: string; icon?: LucideIcon; title?: string; items: MenuItem[]; iconOnly?: boolean; disabled?: boolean }) {
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
  const issues = useStore((s) => s.issues);
  const { setUI, undo, redo, setProject, toast, requestFit } = useStore.getState();
  const [editingName, setEditingName] = useState(false);

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const cameraOn = ui.viewMode === '3d' || ui.viewMode === 'split';
  const viewLabel: Record<ViewMode, string> = { '2d': '2D Plan', '3d': '3D View', elevation: 'Elevation', split: 'Split' };
  const cameraLabel = CAMERA_PRESETS.find((p) => p.id === ui.cameraPreset)?.label ?? 'Perspective';

  const doSave = () => { saveProjectFile(project); persist(project); useStore.setState({ dirty: false }); toast({ severity: 'success', message: 'Project saved (.i3d.json downloaded)' }); };
  const doLoad = async () => {
    try { const p = await openProjectFile(); setProject(p); requestFit(); toast({ severity: 'success', message: `Loaded "${p.name}"` }); }
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
  const aiRender = () => {
    const c = capture3D();
    if (!c) { setUI({ viewMode: 'split' }); toast({ severity: 'info', message: 'Opening 3D view — click AI Render again to capture', ttl: 2500 }); return; }
    downloadCanvasPNG(c, `${safeName(project.name)}_ai_render.png`);
    toast({ severity: 'success', message: 'High-res render captured', ttl: 2500 });
  };

  const ThemeIcon = ui.theme === 'system' ? Monitor : ui.resolvedTheme === 'dark' ? Moon : Sun;
  const issueColor = errors ? 'var(--error)' : warnings ? 'var(--warning)' : 'var(--success)';
  const IssueIcon = errors ? CircleAlert : warnings ? TriangleAlert : Check;

  const fileMenu: MenuItem[] = [
    { label: 'New Project — Magic Generator…', icon: FilePlus2, kbd: 'Ctrl+N', onClick: () => setUI({ modal: 'magic' }) },
    { label: 'New Project (lanjutan)…', icon: DraftingCompass, onClick: () => setUI({ modal: 'wizard' }) },
    { label: 'Open…', icon: FolderOpen, onClick: doLoad },
    { label: 'Save', icon: Save, kbd: 'Ctrl+S', onClick: doSave },
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

  const viewItems: MenuItem[] = [
    { label: '2D Plan', icon: PencilRuler, onClick: () => setUI({ viewMode: '2d' }) },
    { label: '3D View', icon: Box, onClick: () => setUI({ viewMode: '3d' }) },
    ...(ui.uiMode === 'advanced' ? [
      { label: 'Elevation', icon: Building, onClick: () => setUI({ viewMode: 'elevation' }) },
      { label: 'Split', icon: Columns2, onClick: () => setUI({ viewMode: 'split' }) },
    ] : []),
  ];
  const cameraItems: MenuItem[] = CAMERA_PRESETS.map((p) => ({
    label: p.label,
    kbd: p.key,
    onClick: () => setUI({ cameraPreset: p.id, fitRequest: useStore.getState().ui.fitRequest + 1 }),
  }));
  const settingsItems: MenuItem[] = [
    { label: `Theme: ${ui.theme}`, icon: ThemeIcon, kbd: 'Ctrl+⇧T', onClick: () => { const next = ui.theme === 'light' ? 'dark' : ui.theme === 'dark' ? 'system' : 'light'; useStore.getState().setTheme(next); } },
    { label: ui.uiMode === 'simple' ? 'Switch to Advanced' : 'Switch to Simple', icon: ui.uiMode === 'simple' ? Sparkles : Settings, kbd: 'Ctrl+⇧U', onClick: () => useStore.getState().setUIMode(ui.uiMode === 'simple' ? 'advanced' : 'simple') },
    { label: 'Keyboard shortcuts', icon: Keyboard, onClick: () => setUI({ modal: 'shortcuts' }) },
    { label: 'About 3D Intero', icon: Info, onClick: () => toast({ severity: 'info', message: '3D Intero - parametric furniture designer (kitchen, wardrobe, TV cabinet).', ttl: 3500 }) },
  ];

  return (
    <div className="h-14 flex items-center gap-1.5 px-3 border-b shrink-0 select-none" style={{ background: 'var(--bg-main)', borderColor: 'var(--border)', overflowX: 'auto' }}>
      {/* left: menu, logo, name */}
      <Dropdown label="Menu" items={fileMenu} iconOnly icon={MenuIcon as unknown as LucideIcon} title="File menu" />
      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shadow cursor-pointer shrink-0" style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--brand-active))' }} title="Fit view" onClick={requestFit}>3D</div>
      <div className="leading-tight mr-2">
        <div className="text-[13px] font-semibold tracking-wide">3D Intero</div>
        {editingName ? (
          <input autoFocus className="input py-0! text-[11px]! w-44" defaultValue={project.name}
            onBlur={(e) => { setProject({ ...project, name: e.target.value || project.name }, false); setEditingName(false); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        ) : (
          <div className="text-[11px] cursor-text truncate max-w-48 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }} title="Click to rename" onClick={() => setEditingName(true)}>
            {project.name}.i3d <span className="w-1.5 h-1.5 rounded-full" style={{ background: dirty ? 'var(--warning)' : 'var(--success)' }} title={dirty ? 'Modified' : 'Saved'} />
          </div>
        )}
      </div>
      <button className="btn-primary flex items-center gap-1.5 py-1.5! shrink-0" title="New project — Magic Generator (Ctrl+N)" onClick={() => setUI({ modal: 'magic' })}>
        <FilePlus2 size={14} /> <span className="hidden md:inline">New Project</span>
      </button>
      <div className="tb-sep" />
      <button className="tb-btn" title="Undo (Ctrl+Z)" disabled={!past} onClick={undo}><Undo2 size={16} /></button>
      <button className="tb-btn" title="Redo (Ctrl+Shift+Z)" disabled={!future} onClick={redo}><Redo2 size={16} /></button>
      <div className="tb-sep" />
      <span className="text-[11px] shrink-0 hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>View</span>
      <Dropdown label={viewLabel[ui.viewMode]} items={viewItems} title="Switch view" />
      <span className="text-[11px] shrink-0 hidden lg:inline" style={{ color: 'var(--text-tertiary)' }}>Camera</span>
      <Dropdown label={cameraLabel} items={cameraItems} title={cameraOn ? 'Camera angle' : 'Camera is available in 3D or Split view'} disabled={!cameraOn} />

      <div className="flex-1" />

      <button className="tb-btn adv-only" style={{ color: issueColor }} title="Design validation — open Check" onClick={() => setUI({ rightOpen: true, rightTab: 'issues', materialStudioOpen: false })}>
        <IssueIcon size={15} /> <span className="hidden lg:inline text-[11px]">{errors ? `${errors}` : warnings ? `${warnings}` : '0'}</span>
      </button>
      <Dropdown label="" icon={Settings} iconOnly items={settingsItems} title="Settings" />
      <div className="tb-sep" />
      <button className="btn-primary flex items-center gap-1.5 py-1.5!" title="AI Render — capture high-res 3D" onClick={aiRender}><Sparkles size={14} /> <span className="hidden md:inline">AI Render</span></button>
      <button className="btn flex items-center gap-1.5 py-1.5!" title="Save project (Ctrl+S)" onClick={doSave}><Save size={14} /> <span className="hidden md:inline">Save</span></button>
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
