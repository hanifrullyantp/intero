import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlignHorizontalJustifyCenter, Box, Check, ClipboardPaste, Copy, CopyPlus, DoorOpen, Download, Eye, FilePlus2, FlipHorizontal2, FolderOpen, Glasses, Grid2X2, Hand, HelpCircle,
  Image as ImageIcon, Keyboard, Layers, LayoutGrid, Lightbulb, LightbulbOff, LogOut, Menu, Moon, MousePointer2, Move, Move3D, MoreVertical, Orbit, Package, PaintBucket, PencilRuler, Pipette, Redo2,
  RotateCw, Ruler, Save, Scaling, Settings, Settings2, Share2, Smartphone, Sun, Trash2, Undo2, UsersRound, Wand2, Wrench, X, Camera, Factory, Hammer, Tag, ZoomIn,
} from 'lucide-react';
import { canRedo, canUndo } from '../../projectdoc/session';
import { useStore } from '../../store';
import type { ToolId, TopSubMode, ViewMode } from '../../types';
import { fileActions } from '../editor/TopToolbar';
import { clearSession, getSession } from '../../lib/account';
import { ComponentLibrary } from '../editor/ComponentLibrary';
import { PropertiesPanel } from '../editor/PropertiesPanel';
import { LayersPanel } from '../editor/LayersPanel';
import { launchVR } from '../xr/launch';
import { useXRCaps } from '../../xr/xr-manager';
import { DragNumber, Field, Toggle, toast } from '../ui';
import { timeAgo } from '../../lib/utils';
import { isMobileUxV2Enabled, setMobileUxV2Enabled } from '../../lib/mobile-ux-flag';

function openToggle() {
  const st = useStore.getState();
  if (st.selectedIds.length) { const all = st.selectedIds.every((id) => st.openIds.includes(id)); st.toggleOpenMode(); toast(all ? `Menutup ${st.selectedIds.length} kabinet terpilih` : `Membuka ${st.selectedIds.length} kabinet terpilih`, 'info'); }
  else { const will = !st.openIds.length; st.toggleOpenMode(); toast(will ? 'Membuka semua' : 'Menutup semua', 'info'); }
}

/** Topbar mobile: baris 1 tetap (tanpa scroll horizontal), baris 2 kontekstual dengan scroll internal snap. */
export function MobileTopbar() {
  const s = useStore();
  const [userMenu, setUserMenu] = useState(false);
  const [user, setUser] = useState(() => getSession()?.user ?? null);
  useEffect(() => {
    const sync = () => setUser(getSession()?.user ?? null);
    window.addEventListener('intero:session', sync);
    return () => window.removeEventListener('intero:session', sync);
  }, []);
  const initials = (user?.name || 'P').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const readOnly = s.shareMode === 'view';
  const pill = (icon: ReactNode, label: string, onClick: () => void, active = false) => <button key={label} className={`m-pill ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>;
  return (
    <div className="m-topbar-wrap">
      <header className="m-topbar">
        <button className="icon-btn" aria-label="Menu" onClick={() => s.ui({ mobileDrawer: 'left' })}><Menu size={20} /></button>
        <span className="m-logo"><Box size={15} /></span>
        <button className="m-name" onClick={() => { if (readOnly) return; const n = window.prompt('Nama proyek:', s.projectName); if (n?.trim()) s.setProjectName(n.trim()); }}>{s.projectName}{s.dirty ? ' •' : ''}</button>
        <button className="icon-btn" aria-label="Aksi" onClick={() => s.ui({ mobileDrawer: 'right' })}><MoreVertical size={20} /></button>
        <div className="relative">
          <button className="m-avatar" aria-label="Akun" onClick={() => setUserMenu(!userMenu)}>{initials}</button>
          {userMenu && (<>
            <div className="fixed inset-0 z-[790]" onClick={() => setUserMenu(false)} />
            <div className="menu" style={{ position: 'fixed', top: 54, right: 8, left: 'auto', zIndex: 800 }}>
              <div className="px-3 py-2"><div className="text-[13px] font-semibold">{user?.name ?? 'Pengguna 3D Intero'}</div><div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{user?.email ?? '-'}</div></div>
              <div className="menu-sep" />
              <button className="menu-item danger" onClick={() => { setUserMenu(false); clearSession(); window.dispatchEvent(new Event('intero:logout')); }}><LogOut size={15} />Logout</button>
            </div>
          </>)}
        </div>
      </header>
      {s.selectedIds.length > 0 && s.appMode === 'design' && (
        <div className="m-row2">
          {pill(<DoorOpen size={14} />, s.openIds.length ? 'Tutup' : 'Open', openToggle, s.openIds.length > 0)}
          {pill(s.lightsOn ? <Lightbulb size={14} /> : <LightbulbOff size={14} />, 'Lampu', () => s.toggleLights(), s.lightsOn)}
          {pill(<Share2 size={14} />, 'Share', () => window.dispatchEvent(new Event('intero:openShare')))}
          {pill(<Settings2 size={14} />, 'Props', () => s.ui({ mobileSheet: 'props' }))}
          {pill(<Ruler size={14} />, 'Dimensi', () => { s.setDim({ showDimensions: true }); s.ui({ showDimPanel: true }); })}
          {pill(<Wrench size={14} />, s.uiMode === 'simple' ? 'Simple' : 'Advanced', () => s.setUiMode(s.uiMode === 'simple' ? 'advanced' : 'simple'))}
        </div>
      )}
    </div>
  );
}

function Drawer({ side, open, onClose, title, children }: { side: 'left' | 'right'; open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (<>
    <div className={`m-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
    <aside className={`m-drawer ${side} ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="flex items-center gap-2 px-4 shrink-0" style={{ height: 56, borderBottom: '1px solid var(--border)' }}><span className="font-bold text-[15px] flex-1" style={{ fontFamily: 'var(--font-heading)' }}>{title}</span><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div>
      <div className="flex-1 overflow-y-auto py-2">{children}</div>
    </aside>
  </>);
}
const Sec = ({ children }: { children: ReactNode }) => <div className="px-4 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{children}</div>;
function DItem({ icon, label, onClick, danger, disabled, right }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean; right?: ReactNode }) {
  return <button className="m-ditem" style={{ color: danger ? 'var(--danger)' : undefined, opacity: disabled ? 0.4 : 1 }} disabled={disabled} onClick={onClick}>{icon}<span className="flex-1 text-left">{label}</span>{right}</button>;
}

function Drawers({ legacyActions = true }: { legacyActions?: boolean }) {
  const s = useStore(); const caps = useXRCaps();
  const readOnly = s.shareMode === 'view';
  const close = () => s.ui({ mobileDrawer: null });
  const go = (fn: () => void) => () => { close(); fn(); };
  return (<>
    <Drawer side="left" open={s.mobileDrawer === 'left'} onClose={close} title={APP_NAME}>
      <Sec>File</Sec>
      <DItem icon={<FilePlus2 size={17} />} label="Baru (Magic Generator)" disabled={readOnly} onClick={go(() => fileActions.newProject())} />
      <DItem icon={<FolderOpen size={17} />} label="Buka proyek…" disabled={readOnly} onClick={go(() => fileActions.browse())} />
      <DItem icon={<Save size={17} />} label="Simpan ke akun & perangkat" disabled={readOnly} onClick={go(() => fileActions.save())} />
      <DItem icon={<Save size={17} />} label="Simpan sebagai…" disabled={readOnly} onClick={go(() => fileActions.save(true))} />
      <DItem icon={<Download size={17} />} label="Unduh file .intero" onClick={go(() => fileActions.download())} />
      <DItem icon={<ImageIcon size={17} />} label="Export PNG / JPG" onClick={go(() => fileActions.export('png'))} />
      <DItem icon={<Download size={17} />} label="Export OBJ / SketchUp" onClick={go(() => fileActions.export('obj'))} />
      <Sec>Edit</Sec>
      <DItem icon={<Undo2 size={17} />} label="Undo" disabled={readOnly || !canUndo(s)} onClick={() => s.undo()} />
      <DItem icon={<Redo2 size={17} />} label="Redo" disabled={readOnly || !canRedo(s)} onClick={() => s.redo()} />
      <DItem icon={<Settings size={17} />} label="Preferences" onClick={go(() => s.ui({ showPrefs: true }))} />
      <Sec>Lihat</Sec>
      <DItem icon={<Box size={17} />} label="Mode 3D (Perspective)" onClick={go(() => s.setViewMode('perspective'))} right={s.viewMode === 'perspective' ? <Check size={15} /> : undefined} />
      <DItem icon={<LayoutGrid size={17} />} label="Mode 2D (Top plan)" onClick={go(() => s.setViewMode('top'))} right={s.viewMode === 'top' ? <Check size={15} /> : undefined} />
      <DItem icon={<Layers size={17} />} label="Layers" onClick={go(() => s.ui({ mobileSheet: 'layers' }))} />
      <DItem icon={<Ruler size={17} />} label="Dimensi proyek" onClick={go(() => { s.setDim({ showDimensions: true }); s.ui({ showDimPanel: true }); })} />
      <Sec>Mode kerja</Sec>
      <DItem icon={<Hammer size={17} />} label="Mode Desain" onClick={go(() => s.setAppMode('design'))} right={s.appMode === 'design' ? <Check size={15} /> : undefined} />
      <DItem icon={<Factory size={17} />} label="Mode Produksi + HPP" onClick={go(() => s.setAppMode('production'))} right={s.appMode === 'production' ? <Check size={15} /> : undefined} />
      <Sec>AR / VR</Sec>
      <DItem icon={<Smartphone size={17} />} label="AR Preview" onClick={go(() => s.ui({ showAr: true }))} />
      <DItem icon={<Camera size={17} />} label="Foto Ruangan + Furnitur" onClick={go(() => s.ui({ showPhoto: true }))} />
      <DItem icon={<Glasses size={17} />} label="VR Mode" disabled={!caps.vr} onClick={go(() => void launchVR())} />
      <Sec>Alat & pengaturan</Sec>
      <DItem icon={<Wand2 size={17} />} label="Magic Layout Wizard" disabled={readOnly} onClick={go(() => s.ui({ showWizard: true }))} />
      <DItem icon={<Hammer size={17} />} label="Component Builder" disabled={readOnly} onClick={go(() => s.ui({ showBuilder: true }))} />
      <DItem icon={<UsersRound size={17} />} label="Kolaborasi tim" onClick={go(() => window.dispatchEvent(new Event('intero:openTeam')))} />
      <DItem icon={<Tag size={17} />} label="Daftar Harga" onClick={go(() => s.ui({ showPriceList: true }))} />
      <DItem icon={s.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />} label={s.theme === 'dark' ? 'Tema terang' : 'Tema gelap'} onClick={() => s.setTheme(s.theme === 'dark' ? 'light' : 'dark')} />
      <DItem icon={<Keyboard size={17} />} label="Shortcuts & bantuan" onClick={go(() => s.ui({ showShortcuts: true }))} />
      <DItem icon={<HelpCircle size={17} />} label="Tentang & tutorial" onClick={go(() => s.ui({ showAbout: true }))} />
      <DItem icon={<Smartphone size={17} />} label={isMobileUxV2Enabled() ? 'Kembali ke tampilan lama' : 'Coba tampilan mobile baru'} onClick={go(() => { setMobileUxV2Enabled(!isMobileUxV2Enabled()); window.location.reload(); })} />
    </Drawer>
    {legacyActions && <Drawer side="right" open={s.mobileDrawer === 'right'} onClose={close} title="Aksi cepat">
      <div className="px-4 py-2 text-[12px] flex items-center gap-1.5" style={{ color: s.dirty ? 'var(--text-tertiary)' : 'var(--brand-primary)' }}>{!s.dirty && <Check size={13} />}{s.dirty ? 'Menyimpan…' : s.lastSavedAt ? `Tersimpan ${timeAgo(s.lastSavedAt)}` : 'Belum tersimpan'}</div>
      <DItem icon={<Save size={17} />} label="Simpan ke akun & perangkat" disabled={readOnly} onClick={go(() => fileActions.save())} />
      <DItem icon={<Download size={17} />} label="Unduh file .intero" onClick={go(() => fileActions.download())} />
      <Sec>Export</Sec>
      <DItem icon={<ImageIcon size={17} />} label="Gambar PNG" onClick={go(() => fileActions.export('png'))} />
      <DItem icon={<Download size={17} />} label="OBJ" onClick={go(() => fileActions.export('obj'))} />
      <DItem icon={<Download size={17} />} label="SketchUp (OBJ)" onClick={go(() => fileActions.export('skp'))} />
      <DItem icon={<Factory size={17} />} label="HPP: PDF / Excel (Mode Produksi)" onClick={go(() => s.setAppMode('production'))} />
      <Sec>Share</Sec>
      <DItem icon={<Share2 size={17} />} label="Tautan lihat / edit" onClick={go(() => window.dispatchEvent(new Event('intero:openShare')))} />
      <DItem icon={<Smartphone size={17} />} label="QR untuk AR di HP" onClick={go(() => s.ui({ showAr: true }))} />
      <Sec>Proyek</Sec>
      <div className="px-4 pb-4 flex flex-col gap-3">
        <Field label="Nama proyek"><input className="input" value={s.projectName} disabled={readOnly} onChange={(e) => s.setProjectName(e.target.value)} /></Field>
        <Field label="Tinggi total kabinet"><DragNumber value={s.settings.globalCabinetHeight} min={1800} max={3200} step={10} disabled={readOnly} onDragStart={s.pushHistory} onChange={(v, c) => { if (c) s.setGlobalHeight(v); }} /></Field>
        <Toggle label="Lampu LED" checked={s.lightsOn} onChange={() => s.toggleLights()} />
        <Toggle label="Orang beranimasi" checked={s.showPeople} onChange={(v) => s.setShowPeople(v)} />
      </div>
    </Drawer>}
  </>);
}

export { Drawers as MobileDrawers };

const VIEWS: { id: ViewMode; label: string }[] = [{ id: 'perspective', label: 'Perspective' }, { id: 'top', label: 'Top (2D)' }, { id: 'front', label: 'Front' }, { id: 'back', label: 'Back' }, { id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }, { id: 'iso', label: 'Isometric' }];
const SUBS: { id: TopSubMode; label: string }[] = [{ id: 'all', label: 'Semua' }, { id: 'base', label: 'Base Only' }, { id: 'wall', label: 'Wall Only' }, { id: 'split', label: 'Split Stacked' }];

const TOOL_TILES: { id: ToolId; icon: ReactNode; label: string; edit?: boolean }[] = [
  { id: 'select', icon: <MousePointer2 size={20} />, label: 'Select' }, { id: 'hand', icon: <Hand size={20} />, label: 'Hand' }, { id: 'orbit', icon: <Orbit size={20} />, label: 'Orbit' }, { id: 'zoom', icon: <ZoomIn size={20} />, label: 'Zoom' },
  { id: 'move', icon: <Move size={20} />, label: 'Move', edit: true }, { id: 'rotate', icon: <RotateCw size={20} />, label: 'Rotate', edit: true }, { id: 'scale', icon: <Scaling size={20} />, label: 'Scale', edit: true },
  { id: 'tape', icon: <Ruler size={20} />, label: 'Measure' }, { id: 'dimension', icon: <PencilRuler size={20} />, label: 'Dimension', edit: true }, { id: 'protractor', icon: <Move3D size={20} />, label: 'Protractor' },
  { id: 'paint', icon: <PaintBucket size={20} />, label: 'Paint', edit: true }, { id: 'eyedropper', icon: <Pipette size={20} />, label: 'Eyedropper', edit: true },
];

function ToolsGrid() {
  const s = useStore(); const readOnly = s.shareMode === 'view'; const has = s.selectedIds.length > 0;
  const tile = (key: string, icon: ReactNode, label: string, onClick: () => void, active = false, disabled = false) => <button key={key} className={`m-tile ${active ? 'active' : ''}`} disabled={disabled} onClick={onClick}>{icon}<span>{label}</span></button>;
  const adv = (fn: () => void) => () => { if (s.uiMode === 'simple') { toast('Fitur ini tersedia di Mode Advanced.', 'info', { label: 'Beralih', onClick: () => s.setUiMode('advanced') }); return; } fn(); };
  return (
    <div className="p-3 flex flex-col gap-3 overflow-y-auto h-full">
      <div className="m-tools-grid">{TOOL_TILES.map((t) => tile(t.id, t.icon, t.label, () => { s.setTool(t.id); s.ui({ mobileSheet: null }); }, s.tool === t.id, readOnly && !!t.edit))}</div>
      <div className="panel-title">Edit</div>
      <div className="m-tools-grid">
        {tile('copy', <Copy size={20} />, 'Copy', () => { s.copy(); toast('Disalin', 'info'); }, false, readOnly || !has)}
        {tile('paste', <ClipboardPaste size={20} />, 'Paste', () => s.paste(), false, readOnly || !s.clipboard.length)}
        {tile('dup', <CopyPlus size={20} />, 'Duplicate', () => s.duplicateItems(s.selectedIds), false, readOnly || !has)}
        {tile('mirror', <FlipHorizontal2 size={20} />, 'Mirror', adv(() => { s.ui({ dialog: { kind: 'mirror' }, mobileSheet: null }); }), false, readOnly || !has)}
        {tile('array', <Grid2X2 size={20} />, 'Array', adv(() => { s.ui({ dialog: { kind: 'array' }, mobileSheet: null }); }), false, readOnly || !has)}
        {tile('align', <AlignHorizontalJustifyCenter size={20} />, 'Align', () => s.ui({ mobileSheet: 'props' }), false, readOnly || s.selectedIds.length < 2)}
        {tile('del', <Trash2 size={20} />, 'Delete', () => s.removeItems(s.selectedIds), false, readOnly || !has)}
      </div>
      <Toggle label="Sematkan tools ke layar (floating, bisa digeser)" hint="Tahan & geser pegangan untuk memindah · ketuk 2× untuk reset posisi" checked={s.pinTools} onChange={(v) => { s.ui({ pinTools: v, mobileSheet: v ? null : 'tools' }); }} />
    </div>
  );
}

function ViewSheet() {
  const s = useStore();
  return (
    <div className="p-3 flex flex-col gap-3 overflow-y-auto h-full">
      <div className="panel-title">Mode tampilan</div>
      <div className="m-tools-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>{VIEWS.map((v) => <button key={v.id} className={`m-tile ${s.viewMode === v.id ? 'active' : ''}`} onClick={() => { s.setViewMode(v.id); if (v.id !== 'top') s.ui({ mobileSheet: null }); }}><Eye size={18} /><span>{v.label}</span></button>)}</div>
      {s.viewMode === 'top' && (<><div className="panel-title">Sub-mode 2D</div><div className="m-tools-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>{SUBS.map((v) => <button key={v.id} className={`m-tile ${s.topSubMode === v.id ? 'active' : ''}`} onClick={() => { s.setTopSubMode(v.id); s.ui({ mobileSheet: null }); }}><LayoutGrid size={18} /><span>{v.label}</span></button>)}</div></>)}
      <div className="flex gap-2"><button className="btn btn-secondary flex-1" onClick={() => s.ui({ resetViewRequest: s.resetViewRequest + 1 })}>Reset view</button><button className="btn btn-secondary flex-1" disabled={!s.selectedIds.length} onClick={() => s.ui({ focusRequest: s.focusRequest + 1 })}>Fokus terpilih</button></div>
      <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>Gestur: ketuk 3 jari untuk berganti 3D → Top → Front.</p>
    </div>
  );
}

function Sheets() {
  const s = useStore(); const sheet = s.mobileSheet;
  const [snap, setSnap] = useState<30 | 60 | 95>(60);
  const startY = useRef(0);
  if (!sheet) return null;
  const close = () => s.ui({ mobileSheet: null, showLibrary: false });
  const onHandle = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointerup', up);
      const dy = ev.clientY - startY.current;
      if (dy > 60) { if (snap === 30) close(); else setSnap(snap === 95 ? 60 : 30); } else if (dy < -60) setSnap(snap === 30 ? 60 : 95);
    };
    window.addEventListener('pointerup', up);
  };
  const title = { parts: 'Komponen', props: 'Properties', layers: 'Layers', tools: 'Tools', view: 'Tampilan' }[sheet];
  return (<>
    <div className="fixed inset-0 z-[390]" style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(2px)' }} onClick={close} />
    <div className="m-sheet" style={{ height: `${snap}vh` }}>
      <div onPointerDown={onHandle} style={{ touchAction: 'none' }}><div className="sheet-handle" /></div>
      <div className="px-4 pb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{title}</div>
      <div className="flex-1 min-h-0">{sheet === 'parts' ? <ComponentLibrary embedded /> : sheet === 'props' ? <PropertiesPanel embedded /> : sheet === 'layers' ? <LayersPanel embedded /> : sheet === 'tools' ? <ToolsGrid /> : <ViewSheet />}</div>
    </div>
  </>);
}

function Fab() {
  const s = useStore(); const [open, setOpen] = useState(false);
  const item = (icon: ReactNode, label: string, onClick: () => void, active = false) => <div className="m-fab-item" key={label}><span className="m-fab-label">{label}</span><button className={`m-fab-btn ${active ? 'active' : ''}`} onClick={() => { onClick(); setOpen(false); }} aria-label={label}>{icon}</button></div>;
  return (
    <div className="m-fab-wrap">
      {open && (<div className="m-fab-stack">
        {item(<Eye size={19} />, 'Mode tampilan', () => s.ui({ mobileSheet: 'view' }))}
        {item(<Ruler size={19} />, s.showDimensions ? 'Sembunyikan dimensi' : 'Tampilkan dimensi', () => { s.setDim({ showDimensions: !s.showDimensions }); s.ui({ showDimPanel: !s.showDimensions }); }, s.showDimensions)}
        {item(<Smartphone size={19} />, 'AR Preview', () => s.ui({ showAr: true }))}
        {item(s.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />, s.theme === 'dark' ? 'Tema terang' : 'Tema gelap', () => s.setTheme(s.theme === 'dark' ? 'light' : 'dark'))}
        {item(<Wrench size={19} />, s.uiMode === 'simple' ? 'Mode Simple → Advanced' : 'Mode Advanced → Simple', () => s.setUiMode(s.uiMode === 'simple' ? 'advanced' : 'simple'))}
      </div>)}
      <button className="m-fab" onClick={() => setOpen(!open)} aria-label="Aksi cepat">{open ? <X size={22} /> : <MoreVertical size={22} />}</button>
    </div>
  );
}

function useThreeFingerCycle() {
  useEffect(() => {
    let t0 = 0, active = false;
    const modes: ViewMode[] = ['perspective', 'top', 'front'];
    const ts = (e: TouchEvent) => { if (e.touches.length === 3) { t0 = performance.now(); active = true; } else if (e.touches.length > 3) active = false; };
    const te = (e: TouchEvent) => {
      if (active && e.touches.length === 0) {
        if (performance.now() - t0 < 350) { const st = useStore.getState(); const next = modes[(modes.indexOf(st.viewMode) + 1) % modes.length]; st.setViewMode(next); toast(`Tampilan: ${next}`, 'info'); }
        active = false;
      }
    };
    window.addEventListener('touchstart', ts, { passive: true }); window.addEventListener('touchend', te, { passive: true });
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchend', te); };
  }, []);
}

export function MobileChrome() {
  const s = useStore();
  useThreeFingerCycle();
  const sheet = s.mobileSheet;
  const tab = (id: 'parts' | 'tools' | 'layers' | 'props', icon: ReactNode, label: string) => (
    <button key={id} className={`m-tab ${sheet === id ? 'active' : ''}`} onClick={() => s.ui({ mobileSheet: sheet === id ? null : id, showLibrary: id === 'parts' && sheet !== id })}>{icon}<span>{label}</span></button>
  );
  const production = s.appMode === 'production';
  return (<>
    {!production && <Sheets />}
    {!production && <Fab />}
    {!production && (
      <nav className="m-bnav" data-tour="mobile-nav">
        {tab('parts', <Package size={21} />, 'Parts')}
        {tab('tools', <Wrench size={21} />, 'Tools')}
        <button data-tour="open-btn" className="m-open" style={{ background: s.openIds.length ? 'var(--brand-primary-active)' : 'var(--brand-primary)' }} onClick={openToggle} aria-label="Open/Close pintu kabinet"><DoorOpen size={27} /></button>
        {tab('layers', <Layers size={21} />, 'Layers')}
        {tab('props', <Settings2 size={21} />, 'Props')}
      </nav>
    )}
    <Drawers />
  </>);
}
