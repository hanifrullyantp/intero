import { useState, useRef, useEffect } from 'react';
import { useStore, persist } from '../core/store';
import { saveProjectFile, openProjectFile } from '../core/projectManager';
import { createItem, LIBRARY } from '../config/library';
import { footprint } from '../utils/geometry';
import { exportCuttingListCSV, exportDXF, exportJSON, exportTechnicalPDF, exportQuotationPDF, renderPlanImage, downloadCanvasPNG } from '../utils/exporters';
import { capture3D } from '../viewport/Viewport3D';
import { safeName } from '../core/projectManager';
import {
  FilePlus2, Save, FolderOpen, Undo2, Redo2, Plus, Palette, Scissors, Calculator, Download, DoorOpen, Hammer, Layers,
  Check, TriangleAlert, CircleAlert, Sun, Moon, Monitor, Sparkles, Settings, Keyboard, PanelLeft, PanelRight, ChevronDown,
  DraftingCompass, Receipt, ClipboardList, Image, FileText, Package, Info, type LucideIcon,
} from './icons';

type MenuItem = { label: string; onClick: () => void; icon?: LucideIcon; sep?: boolean; kbd?: string };

export /**
 * Toolbar menu. The panel is rendered with `position: fixed` because the toolbar
 * scrolls horizontally (`overflow-x: auto`), which would clip an absolutely
 * positioned dropdown inside it.
 */
function Dropdown({ label, icon: Icon, items, title, iconOnly }: { label: string; icon?: LucideIcon; title?: string; items: MenuItem[]; iconOnly?: boolean }) {
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
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 260)) });
    }
    setOpen((o) => !o);
  };
  return (
    <div ref={ref} className="relative shrink-0">
      <button ref={btnRef} className={`tb-btn ${open ? 'active' : ''}`} onClick={toggle} title={title ?? label}>
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
  const { setUI, toggleUI, undo, redo, addItem, setProject, toast, requestFit } = useStore.getState();
  const [editingName, setEditingName] = useState(false);

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  const quickAdd = (entryId: string) => {
    const it = createItem(entryId);
    const wall = project.room.walls[0];
    const sameRow = project.items.filter((i) => i.rotation === wall.rotation && i.category === it.category);
    const f = footprint(it);
    if (wall.rotation === 0) {
      const maxX = sameRow.length ? Math.max(...sameRow.map((i) => footprint(i).x + footprint(i).w)) : 0;
      it.x = Math.min(maxX, project.room.width - f.w);
      it.y = 0;
    }
    it.rotation = wall.rotation;
    it.wallId = wall.id;
    addItem(it);
    toast({ severity: 'success', message: `${it.name} added — drag it into position`, ttl: 2500 });
  };
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
    { sep: true, label: '', onClick: () => {} },
    { label: `Preferences — ${ui.uiMode} mode`, icon: Settings, kbd: 'Ctrl+⇧U', onClick: () => useStore.getState().setUIMode(ui.uiMode === 'simple' ? 'advanced' : 'simple') },
    { label: 'Keyboard shortcuts', icon: Keyboard, onClick: () => setUI({ modal: 'shortcuts' }) },
    { label: 'About 3D Intero', icon: Info, onClick: () => toast({ severity: 'info', message: '3D Intero - parametric furniture designer (kitchen, wardrobe, TV cabinet).', ttl: 3500 }) },
  ];

  return (
    <div className="h-14 flex items-center gap-1.5 px-3 border-b shrink-0 select-none" style={{ background: 'var(--bg-main)', borderColor: 'var(--border)', overflowX: 'auto' }}>
      {/* left: menu, logo, name */}
      <Dropdown label="Menu" items={fileMenu} iconOnly icon={MenuIcon as unknown as LucideIcon} title="File menu" />
      <button className="btn-primary flex items-center gap-1.5 py-1.5!" title="New project — Magic Generator (Ctrl+N)" onClick={() => setUI({ modal: 'magic' })}>
        <FilePlus2 size={14} /> <span className="hidden md:inline">New Project</span>
      </button>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shadow cursor-pointer" style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--brand-active))' }} title="Home — fit view" onClick={requestFit}>3D</div>
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
      <div className="tb-sep" />
      <button className="tb-btn" title="Undo (Ctrl+Z)" disabled={!past} onClick={undo}><Undo2 size={16} /></button>
      <button className="tb-btn" title="Redo (Ctrl+Shift+Z)" disabled={!future} onClick={redo}><Redo2 size={16} /></button>
      <div className="tb-sep" />
      <Dropdown label="Add" icon={Plus} title="Quick add cabinet" items={LIBRARY.filter((l) => ['base_single', 'base_double', 'base_drawer_3', 'base_sink', 'base_stove', 'base_corner_l', 'wall_single', 'wall_double', 'tall_pantry', 'tall_fridge'].includes(l.id)).map((l) => ({ label: `${l.name} · ${l.category}`, onClick: () => quickAdd(l.id) }))} />
      <button className={`tb-btn ${ui.materialStudioOpen ? 'active' : ''}`} title="Material Studio" onClick={() => setUI({ materialStudioOpen: !ui.materialStudioOpen, rightOpen: true })}><Palette size={16} /></button>
      <button className={`tb-btn ${ui.rightTab === 'open' && ui.rightOpen ? 'active' : ''}`} title="Open / Close doors mode (Shift+O)" onClick={() => setUI({ rightOpen: true, rightTab: 'open' })}><DoorOpen size={16} /></button>
      <button className={`tb-btn adv-only ${ui.rightTab === 'layers' && ui.rightOpen ? 'active' : ''}`} title="Layers (L)" onClick={() => setUI({ rightOpen: true, rightTab: 'layers' })}><Layers size={16} /></button>

      <div className="flex-1" />

      <button className="tb-btn adv-only" style={{ color: issueColor }} title="Design validation — open issues" onClick={() => setUI({ rightOpen: true, materialStudioOpen: false })}>
        <IssueIcon size={15} /> <span className="hidden lg:inline text-[11px]">{errors ? `${errors} error${errors > 1 ? 's' : ''}` : warnings ? `${warnings} warning${warnings > 1 ? 's' : ''}` : 'Valid'}</span>
      </button>
      <div className="tb-sep" />
      <button className="tb-btn" title={`Theme: ${ui.theme} (Ctrl+Shift+T)`} onClick={() => { const next = ui.theme === 'light' ? 'dark' : ui.theme === 'dark' ? 'system' : 'light'; useStore.getState().setTheme(next); }}><ThemeIcon size={16} /></button>
      <button className="tb-btn" title="Simple / Advanced mode (Ctrl+Shift+U)" onClick={() => useStore.getState().setUIMode(ui.uiMode === 'simple' ? 'advanced' : 'simple')}>
        {ui.uiMode === 'simple' ? <Sparkles size={16} /> : <Settings size={16} />}
      </button>
      <button className="tb-btn" title="Keyboard shortcuts" onClick={() => setUI({ modal: 'shortcuts' })}><Keyboard size={16} /></button>
      <div className="tb-sep" />
      <button className={`tb-btn ${ui.leftOpen ? 'active' : ''}`} title="Component library (Shift+C)" onClick={() => toggleUI('leftOpen')}><PanelLeft size={16} /></button>
      <button className={`tb-btn ${ui.rightOpen ? 'active' : ''}`} title="Properties panel (Space)" onClick={() => toggleUI('rightOpen')}><PanelRight size={16} /></button>
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
