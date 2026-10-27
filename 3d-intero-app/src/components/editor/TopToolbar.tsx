import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Check, ChevronDown, ClipboardPaste, Copy, DoorOpen, Download, Eye, FilePlus2, FolderOpen, Grid3X3, HelpCircle, Image as ImageIcon, Keyboard, Layers, Lightbulb, LightbulbOff, Link2, LogOut, Maximize, Moon, Redo2, Save, Scissors, Search, Settings, Share2, SquareCheckBig, Sun, Sunset, Trash2, Undo2, User, Users, UsersRound, Wand2, BookOpen, Info, Ruler, Smartphone, Glasses, Camera, Factory, Hammer } from 'lucide-react';
import { compressToEncodedURIComponent } from 'lz-string';
import { useStore, wallHeightOf, backsplashHeightOf } from '../../store';
import { SearchPalette } from '../Spotlight';
import { sceneRef } from './Viewport';
import { exportImage, exportObj, exportSketchUpFallback, openInteroFile, saveInteroFile } from '../../lib/persistence';
import { toast, Modal, Field, DragNumber, Kbd, Select, Toggle, ColorPicker } from '../ui';
import { APP_NAME, COUNTERTOP_TYPES, SHORTCUTS } from '../../lib/constants';
import type { CountertopType } from '../../types';
import { TeamCollaborationDialog } from './TeamCollaborationDialog';
import { useXRCaps } from '../../xr/xr-manager';
import { launchVR } from '../xr/launch';

function Menu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', h); return () => window.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" className={`btn btn-ghost btn-sm ${open ? 'active' : ''}`} data-tour={`menu-${label.toLowerCase()}`} style={open ? { background: 'var(--bg-hover)', color: 'var(--text-primary)' } : undefined} onClick={() => setOpen(!open)}>{label}</button>
      {open && <div className="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}
function MI({ icon, label, kbd, onClick, danger, disabled }: { icon?: ReactNode; label: string; kbd?: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return <button type="button" className={`menu-item ${danger ? 'danger' : ''}`} onClick={onClick} disabled={disabled} style={disabled ? { opacity: 0.4 } : undefined}>{icon ?? <span style={{ width: 15 }} />}<span>{label}</span>{kbd && <span className="kbd">{kbd}</span>}</button>;
}

export const fileActions = {
  save(as = false) {
    const s = useStore.getState();
    let name = s.projectName;
    if (as) { const n = window.prompt('Nama file proyek (.intero):', s.projectName); if (!n) return; name = n; s.setProjectName(n); }
    saveInteroFile(useStore.getState().toProjectData(), name);
    s.markSaved();
    toast(`Proyek "${name}.intero" diunduh ke komputer Anda`, 'success');
  },
  async open() {
    try {
      const data = await openInteroFile();
      if (!data) return;
      const st = useStore.getState();
      st.loadProject(data);
      st.ui({ resetViewRequest: st.resetViewRequest + 1 });
      toast(`Proyek "${data.projectName}" dibuka (${data.cabinets.length} komponen)`, 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
  },
  newProject() {
    const s = useStore.getState();
    const go = () => { s.newProject(); s.ui({ showWizard: true }); };
    if (s.items.length && s.dirty) s.ui({ dialog: { kind: 'confirm', title: 'Buat proyek baru?', message: 'Perubahan yang belum disimpan sebagai .intero akan hilang (draft otomatis tetap ada di browser).', onConfirm: go } });
    else go();
  },
  export(kind: 'png' | 'jpg' | 'obj' | 'skp') {
    const ctl = sceneRef.current; const s = useStore.getState();
    if (!ctl) return;
    if (kind === 'png' || kind === 'jpg') { exportImage(ctl.screenshot(kind), s.projectName, kind); toast(`Gambar ${kind.toUpperCase()} diunduh`, 'success'); return; }
    const obj = ctl.exportOBJ();
    if (kind === 'obj') { exportObj(obj, s.projectName); toast('File OBJ diunduh (unit meter)', 'success'); }
    else { exportSketchUpFallback(obj, s.projectName); toast('Format .skp proprietary — diunduh sebagai OBJ untuk diimpor ke SketchUp (File > Import).', 'info'); }
  },
};

export function TopToolbar({ onBackToLanding, headless }: { onBackToLanding: () => void; headless?: boolean }) {
  const s = useStore();
  const [editingName, setEditingName] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const readOnly = s.shareMode === 'view';
  const openToggle = () => {
    const st = useStore.getState();
    if (st.selectedIds.length) {
      const allOpen = st.selectedIds.every((id) => st.openIds.includes(id));
      st.toggleOpenMode();
      toast(allOpen ? `Menutup ${st.selectedIds.length} kabinet terpilih` : `Membuka ${st.selectedIds.length} kabinet terpilih`, 'info');
    } else {
      const willOpen = !st.openIds.length;
      st.toggleOpenMode();
      toast(willOpen ? `Membuka semua (${st.items.length} komponen)` : 'Menutup semua', 'info');
    }
  };
  const [nameDraft, setNameDraft] = useState(s.projectName);
  const [userMenu, setUserMenu] = useState(false);
  const user = (() => { try { return JSON.parse(localStorage.getItem('intero_user') || 'null') as { name: string; email: string } | null; } catch { return null; } })();
  const initials = (user?.name || 'P').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const logout = () => {
    localStorage.removeItem('intero_isLoggedIn'); localStorage.removeItem('intero_user');
    toast('Anda telah keluar', 'info'); onBackToLanding();
  };
  const fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
  const hasSel = s.selectedIds.length > 0;
  const caps = useXRCaps();

  useEffect(() => {
    const open = () => setTeamOpen(true); const share = () => setShareOpen(true);
    window.addEventListener('intero:openTeam', open); window.addEventListener('intero:openShare', share);
    return () => { window.removeEventListener('intero:openTeam', open); window.removeEventListener('intero:openShare', share); };
  }, []);

  return (
    <>
    {!headless && <header className="flex items-center gap-1 px-2 shrink-0 theme-transition" style={{ height: 'var(--toolbar-h)', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
      <button type="button" className="flex items-center gap-2 px-2 h-9 rounded-lg hover:bg-[var(--bg-hover)]" onClick={() => s.ui({ dialog: { kind: 'confirm', title: 'Kembali ke halaman utama?', message: 'Proyek tetap tersimpan otomatis di browser (IndexedDB).', onConfirm: onBackToLanding } })} title="Kembali ke landing">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-primary)', color: '#fff' }}><Box size={16} /></span>
        <span className="font-bold text-[14px] hidden sm:inline" style={{ fontFamily: 'var(--font-heading)' }}>{APP_NAME}</span>
      </button>
      <div className="hidden md:flex items-center">
        <Menu label="File">{(close) => (<>
          <MI icon={<FilePlus2 size={15} />} label="Baru (Magic Generator)" kbd="Ctrl+N" disabled={readOnly} onClick={() => { close(); fileActions.newProject(); }} />
          <MI icon={<FolderOpen size={15} />} label="Buka .intero" kbd="Ctrl+O" disabled={readOnly} onClick={() => { close(); fileActions.open(); }} />
          <MI icon={<Save size={15} />} label="Simpan .intero" kbd="Ctrl+S" onClick={() => { close(); fileActions.save(); }} />
          <MI icon={<Save size={15} />} label="Simpan Sebagai…" kbd="Ctrl+Shift+S" onClick={() => { close(); fileActions.save(true); }} />
          <div className="menu-sep" />
          <MI icon={<ImageIcon size={15} />} label="Export PNG" onClick={() => { close(); fileActions.export('png'); }} />
          <MI icon={<ImageIcon size={15} />} label="Export JPG" onClick={() => { close(); fileActions.export('jpg'); }} />
          <MI icon={<Download size={15} />} label="Export OBJ" onClick={() => { close(); fileActions.export('obj'); }} />
          <MI icon={<Download size={15} />} label="Export ke SketchUp (OBJ)" onClick={() => { close(); fileActions.export('skp'); }} />
        </>)}</Menu>
        <Menu label="Edit">{(close) => (<>
          <MI icon={<Undo2 size={15} />} label="Undo" kbd="Ctrl+Z" onClick={() => { close(); s.undo(); }} disabled={readOnly || !s.past.length} />
          <MI icon={<Redo2 size={15} />} label="Redo" kbd="Ctrl+Y" onClick={() => { close(); s.redo(); }} disabled={readOnly || !s.future.length} />
          <div className="menu-sep" />
          <MI icon={<Scissors size={15} />} label="Cut" kbd="Ctrl+X" onClick={() => { close(); s.cut(); }} disabled={readOnly || !hasSel} />
          <MI icon={<Copy size={15} />} label="Copy" kbd="Ctrl+C" onClick={() => { close(); s.copy(); toast('Disalin', 'info'); }} disabled={readOnly || !hasSel} />
          <MI icon={<ClipboardPaste size={15} />} label="Paste" kbd="Ctrl+V" onClick={() => { close(); s.paste(); }} disabled={readOnly || !s.clipboard.length} />
          <MI icon={<Trash2 size={15} />} label="Delete" kbd="Del" onClick={() => { close(); s.removeItems(s.selectedIds); }} disabled={readOnly || !hasSel} />
          <MI icon={<SquareCheckBig size={15} />} label="Select All" kbd="Ctrl+A" disabled={readOnly} onClick={() => { close(); s.selectAll(); }} />
          <div className="menu-sep" />
          <MI icon={<Settings size={15} />} label="Preferences…" onClick={() => { close(); s.ui({ showPrefs: true }); }} />
        </>)}</Menu>
        <Menu label="Lihat">{(close) => (<>
          <MI icon={<Layers size={15} />} label={`${s.showLayers ? 'Sembunyikan' : 'Tampilkan'} Layers Panel`} kbd="L" onClick={() => { close(); s.ui({ showLayers: !s.showLayers }); }} />
          <MI icon={<Grid3X3 size={15} />} label={`${s.showGrid ? 'Sembunyikan' : 'Tampilkan'} Grid`} onClick={() => { close(); s.ui({ showGrid: !s.showGrid }); }} />
          <MI icon={<Sunset size={15} />} label={`${s.showShadows ? 'Matikan' : 'Nyalakan'} Shadows`} onClick={() => { close(); s.ui({ showShadows: !s.showShadows }); }} />
          <MI icon={<Eye size={15} />} label={`X-Ray ${s.xray ? 'Off' : 'On'}`} onClick={() => { close(); s.ui({ xray: !s.xray }); }} />
          <MI icon={<Box size={15} />} label={`Explode View ${s.explode ? 'Off' : 'On'}`} onClick={() => { close(); s.ui({ explode: !s.explode }); }} />
          <div className="menu-sep" />
          <MI icon={<Users size={15} />} label={`${s.showPeople ? 'Sembunyikan' : 'Tampilkan'} Orang (animasi)`} onClick={() => { close(); s.setShowPeople(!s.showPeople); }} />
          <div className="menu-sep" />
          <MI icon={<Maximize size={15} />} label="Fullscreen" onClick={() => { close(); fullscreen(); }} />
        </>)}</Menu>
        <Menu label="Visual">{(close) => (<>
          <MI icon={<Smartphone size={15} />} label="AR Preview" onClick={() => { close(); s.ui({ showAr: true }); }} />
          <MI icon={<Camera size={15} />} label="Foto Ruangan + Furnitur" onClick={() => { close(); s.ui({ showPhoto: true }); }} />
          <MI icon={<Glasses size={15} />} label="VR Mode" kbd="Ctrl+Shift+V" disabled={!caps.vr} onClick={() => { close(); void launchVR(); }} />
          <div className="menu-sep" />
          <MI icon={<Ruler size={15} />} label="Panel Dimensi" kbd="Shift+D" onClick={() => { close(); s.setDim({ showDimensions: true }); s.ui({ showDimPanel: !s.showDimPanel }); }} />
          <MI icon={<Hammer size={15} />} label="Mode Desain" onClick={() => { close(); s.setAppMode('design'); }} />
          <MI icon={<Factory size={15} />} label="Mode Produksi + HPP" kbd="Ctrl+Shift+P" onClick={() => { close(); s.setAppMode('production'); }} />
          <MI icon={<Settings size={15} />} label="Daftar Harga Material" onClick={() => { close(); s.ui({ showPriceList: true }); }} />
        </>)}</Menu>
        <Menu label="Bantuan">{(close) => (<>
          <MI icon={<Keyboard size={15} />} label="Keyboard Shortcuts" onClick={() => { close(); s.ui({ showShortcuts: true }); }} />
          <MI icon={<BookOpen size={15} />} label="Tutorial Cepat" onClick={() => { close(); s.ui({ showAbout: true }); }} />
          <MI icon={<Wand2 size={15} />} label="Magic Layout Wizard" disabled={readOnly} onClick={() => { close(); s.ui({ showWizard: true }); }} />
          <MI icon={<Info size={15} />} label={`Tentang ${APP_NAME}`} onClick={() => { close(); s.ui({ showAbout: true }); }} />
        </>)}</Menu>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2 min-w-0">
        {editingName ? (
          <input autoFocus className="input" style={{ width: 220, height: 32 }} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onBlur={() => { s.setProjectName(nameDraft.trim() || 'Proyek'); setEditingName(false); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingName(false); }} />
        ) : (
          <button type="button" className="px-3 h-8 rounded-lg text-[13px] font-semibold truncate max-w-[220px] hover:bg-[var(--bg-hover)]" onClick={() => { setNameDraft(s.projectName); setEditingName(true); }} title="Klik untuk ganti nama proyek">{s.projectName}{s.dirty ? ' •' : ''}</button>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <button type="button" className="icon-btn" data-tip="Undo (Ctrl+Z)" onClick={s.undo} disabled={!s.past.length}><Undo2 size={17} /></button>
        <button type="button" className="icon-btn" data-tip="Redo (Ctrl+Y)" onClick={s.redo} disabled={!s.future.length}><Redo2 size={17} /></button>
        <div className="divider-v" />
        <button type="button" className={`btn btn-sm ${s.openIds.length ? 'btn-primary' : 'btn-secondary'} hidden sm:inline-flex`} data-tour="open-btn" onClick={openToggle} data-tip={s.selectedIds.length ? `Buka/tutup ${s.selectedIds.length} kabinet terpilih` : 'Buka/tutup semua pintu, laci & aksesoris'}><DoorOpen size={15} />{s.openIds.length ? 'Tutup' : 'Open'}</button>
        <button type="button" className={`btn btn-sm ${s.lightsOn ? 'btn-primary' : 'btn-secondary'} hidden sm:inline-flex`} onClick={() => s.toggleLights()} data-tip={s.lightsOn ? 'Matikan lampu LED' : 'Nyalakan lampu LED'}>{s.lightsOn ? <Lightbulb size={15} /> : <LightbulbOff size={15} />}{s.lightsOn ? 'Lampu On' : 'Lampu Off'}</button>
        <div className="seg hidden xl:inline-flex" title="Mode kerja (Ctrl+Shift+P)"><button type="button" className={s.appMode === 'design' ? 'active' : ''} onClick={() => s.setAppMode('design')}>Desain</button><button type="button" className={s.appMode === 'production' ? 'active' : ''} onClick={() => s.setAppMode('production')}>Produksi</button></div>
        <button type="button" className={`icon-btn ${s.showDimensions ? 'active' : ''}`} data-tip="Dimensi (Shift+D)" onClick={() => { s.setDim({ showDimensions: !s.showDimensions }); s.ui({ showDimPanel: !s.showDimensions }); }}><Ruler size={17} /></button>
        <button type="button" className="icon-btn" data-tip="Cari fitur (/)" onClick={() => s.ui({ showSearch: true })}><Search size={17} /></button>
        <button type="button" className="icon-btn" data-tour="share-btn" data-tip="Bagikan tautan (lihat saja / bisa edit)" onClick={() => setShareOpen(true)}><Share2 size={17} /></button>
        <button type="button" className="icon-btn hidden sm:inline-flex" data-tip="Kolaborasi tim langsung" onClick={() => setTeamOpen(true)}><UsersRound size={17} /></button>
        <div className="seg hidden lg:inline-flex" title="Mode UI (Ctrl+Shift+U)">
          <button type="button" className={s.uiMode === 'simple' ? 'active' : ''} onClick={() => s.setUiMode('simple')}>Simple</button>
          <button type="button" className={s.uiMode === 'advanced' ? 'active' : ''} onClick={() => s.setUiMode('advanced')}>Advanced</button>
        </div>
        <button type="button" className="icon-btn" data-tip={s.theme === 'light' ? 'Dark theme (Ctrl+Shift+T)' : 'Light theme (Ctrl+Shift+T)'} onClick={() => s.setTheme(s.theme === 'light' ? 'dark' : 'light')}>{s.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
        <div className="relative">
          <button type="button" className="flex items-center gap-1 h-9 pl-1 pr-2 rounded-full hover:bg-[var(--bg-hover)]" onClick={() => setUserMenu(!userMenu)}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>{initials}</span><ChevronDown size={14} />
          </button>
          {userMenu && (<>
            <div className="fixed inset-0 z-[290]" onMouseDown={() => setUserMenu(false)} />
            <div className="menu" style={{ left: 'auto', right: 0 }}>
              <div className="px-3 py-2"><div className="text-[13px] font-semibold">{user?.name ?? 'Pengguna 3D Intero'}</div><div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{user?.email ?? '-'}</div></div>
              <div className="menu-sep" />
              <MI icon={<User size={15} />} label="Profil (mockup)" onClick={() => { setUserMenu(false); toast('Profil hanya tampilan — tidak ada backend.', 'info'); }} />
              <MI icon={<HelpCircle size={15} />} label="Bantuan" onClick={() => { setUserMenu(false); s.ui({ showShortcuts: true }); }} />
              <div className="menu-sep" />
              <MI icon={<LogOut size={15} />} label="Logout" danger onClick={() => { setUserMenu(false); logout(); }} />
            </div>
          </>)}
        </div>
      </div>
    </header>}
      {s.showSearch && <SearchPalette onClose={() => s.ui({ showSearch: false })} />}
      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} onTeam={() => { setShareOpen(false); setTeamOpen(true); }} />}
      {teamOpen && <TeamCollaborationDialog onClose={() => setTeamOpen(false)} />}
      {s.showPrefs && <PrefsModal onClose={() => s.ui({ showPrefs: false })} />}
      {s.showShortcuts && <ShortcutsModal onClose={() => s.ui({ showShortcuts: false })} />}
      {s.showAbout && <AboutModal onClose={() => s.ui({ showAbout: false })} />}
    </>
  );
}

function PrefsModal({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const ct = s.settings.countertop;
  return (
    <Modal onClose={onClose} width={560}>
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between"><h3 className="text-[18px] font-bold">Preferences</h3><button className="icon-btn" onClick={onClose}><span className="sr-only">Tutup</span>×</button></div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tinggi Total Kabinet (global)"><DragNumber value={s.settings.globalCabinetHeight} min={1800} max={3200} step={10} onDragStart={s.pushHistory} onChange={(v, c) => { if (c) s.setGlobalHeight(v); }} /></Field>
          <Field label="Tinggi wall cabinet (otomatis)"><div className="input flex items-center mono" style={{ opacity: 0.8 }}>{wallHeightOf(s.settings)} mm</div></Field>
          <Field label="Tinggi base cabinet"><DragNumber value={s.settings.baseHeight} min={700} max={1000} onChange={(v, c) => { if (c) s.setSettings({ baseHeight: v }); }} /></Field>
          <Field label="Gap base–wall"><DragNumber value={s.settings.wallGap} min={400} max={700} onChange={(v, c) => { if (c) s.setSettings({ wallGap: v }); }} /></Field>
          <Field label="Toe kick"><DragNumber value={s.settings.toeKick} min={60} max={150} onChange={(v, c) => { if (c) s.setSettings({ toeKick: v }); }} /></Field>
          <Field label="Kedalaman wall cabinet"><DragNumber value={s.settings.wallDepth} min={280} max={400} onChange={(v, c) => { if (c) s.setSettings({ wallDepth: v }); }} /></Field>
          <Field label="Snap grid gizmo"><Select value={String(s.snapSize)} onChange={(v) => s.ui({ snapSize: +v })} options={[{ value: '1', label: '1 mm' }, { value: '5', label: '5 mm' }, { value: '10', label: '10 mm' }, { value: '50', label: '50 mm' }]} /></Field>
        </div>
        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Tinggi total mengatur semua kabinet: base tetap 850 mm, wall cabinet menyesuaikan ke atas, tall cabinet = tinggi total, kulkas tetap — filler di atasnya yang berubah.</p>
        <div className="section" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-4 flex flex-col gap-3">
            <span className="panel-title">Countertop Default</span>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Jenis"><Select value={ct.type} onChange={(v) => s.setCountertop({ type: v as CountertopType })} options={(Object.keys(COUNTERTOP_TYPES) as CountertopType[]).map((k) => ({ value: k, label: COUNTERTOP_TYPES[k].name }))} /></Field>
              <Field label="Tebal"><DragNumber value={ct.thickness} min={12} max={60} onChange={(v, c) => { if (c) s.setCountertop({ thickness: v }); }} /></Field>
              <Field label="Overhang depan"><DragNumber value={ct.overhang} min={0} max={60} onChange={(v, c) => { if (c) s.setCountertop({ overhang: v }); }} /></Field>
              <Field label="Tinggi backsplash"><DragNumber value={ct.backsplashAuto ? backsplashHeightOf(s.settings) : ct.backsplashHeight} min={0} max={700} disabled={ct.backsplashAuto} onChange={(v, c) => { if (c) s.setCountertop({ backsplashHeight: v }); }} /></Field>
            </div>
            <Toggle checked={ct.backsplash} onChange={(v) => s.setCountertop({ backsplash: v })} label="Backsplash subway tile" />
            <Toggle checked={ct.backsplashAuto} onChange={(v) => s.setCountertop({ backsplashAuto: v })} label="Tinggi backsplash mengikuti dasar kabinet atas" hint={`Otomatis ${backsplashHeightOf(s.settings)} mm`} />
            <ColorPicker label="Warna backsplash" value={ct.backsplashColor} onChange={(hex, c) => { if (c) s.setCountertop({ backsplashColor: hex }); }} />
          </div>
        </div>
        <div className="flex justify-end"><button className="btn btn-primary" onClick={onClose}>Selesai</button></div>
      </div>
    </Modal>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} width={720}>
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-[18px] font-bold flex items-center gap-2"><Keyboard size={20} />Keyboard Shortcuts</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          {SHORTCUTS.map((g) => (
            <div key={g.group} className="flex flex-col gap-1.5">
              <span className="panel-title">{g.group}</span>
              {g.items.map(([k, l]) => <div key={k} className="flex items-center justify-between text-[13px] py-0.5"><span>{l}</span><Kbd>{k}</Kbd></div>)}
            </div>
          ))}
        </div>
        <div className="flex justify-end"><button className="btn btn-primary" onClick={onClose}>Tutup</button></div>
      </div>
    </Modal>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  const steps = ['Mulai dari Magic Generator (File > Baru): pilih bentuk dapur, posisi sink/kompor/kulkas (cm dari sudut), lalu material.', 'Tambah komponen dari Panel Komponen (ikon kotak di toolbar kiri) — cukup klik, komponen menempel otomatis ke dinding terdekat.', 'Pilih objek lalu atur di Properties: dimensi, posisi (drag angka seperti After Effects), material & warna, aksesoris per pintu, LED.', 'Tool Move (M) menampilkan gizmo XYZ; drag untuk geser, snap 10 mm (Shift = 1 mm).', 'Layers Panel: drag-drop urutan kabinet → posisi 3D otomatis tersusun ulang tanpa gap.', 'Tombol Open: buka semua pintu, laci, rak tarik & lazy susan sekaligus. Simpan proyek sebagai file .intero (tanpa server).'];
  return (
    <Modal onClose={onClose} width={560}>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-primary)', color: '#fff' }}><Box size={20} /></span><div><h3 className="text-[18px] font-bold">{APP_NAME}</h3><p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Kitchen Set Designer 3D parametrik · versi 1.0 · frontend-only, offline-first PWA</p></div></div>
        <ol className="flex flex-col gap-2 text-[13px]">{steps.map((t, i) => <li key={i} className="flex gap-3"><span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>{i + 1}</span><span>{t}</span></li>)}</ol>
        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Semua data tersimpan lokal (IndexedDB & file .intero). Tidak ada backend, tidak ada upload.</p>
        <div className="flex justify-end"><button className="btn btn-primary" onClick={onClose}>Mengerti</button></div>
      </div>
    </Modal>
  );
}

function ShareDialog({ onClose, onTeam }: { onClose: () => void; onTeam: () => void }) {
  const s = useStore();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [link, setLink] = useState('');
  useEffect(() => {
    try {
      const pd = s.toProjectData(); pd.settings = { ...pd.settings, production: { ...pd.settings.production, logo: null } }; // logo tidak ikut tautan
      const json = JSON.stringify(pd);
      const payload = compressToEncodedURIComponent(json);
      setLink(`${location.origin}${location.pathname}#s=${mode}.${payload}`);
    } catch { setLink(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); }
    catch {
      const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); toast('Tautan dibagikan — disalin ke clipboard', 'success');
  };
  return (
    <Modal onClose={onClose} width={560} tour="share-dialog">
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-[17px] font-bold flex items-center gap-2"><Share2 size={19} style={{ color: 'var(--brand-primary)' }} />Bagikan Proyek via Tautan</h3>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="tile p-3 flex flex-col gap-1" style={mode === 'view' ? { borderColor: 'var(--brand-primary)', background: 'var(--bg-selected)' } : undefined} onClick={() => setMode('view')}>
            <span className="flex items-center gap-2 text-[13px] font-bold"><Eye size={15} />Lihat saja</span>
            <span className="text-[11px] text-left" style={{ color: 'var(--text-secondary)' }}>Penerima hanya bisa melihat & orbit. Tombol edit dinonaktifkan.</span>
          </button>
          <button type="button" className="tile p-3 flex flex-col gap-1" style={mode === 'edit' ? { borderColor: 'var(--brand-primary)', background: 'var(--bg-selected)' } : undefined} onClick={() => setMode('edit')}>
            <span className="flex items-center gap-2 text-[13px] font-bold"><Link2 size={15} />Bisa edit</span>
            <span className="text-[11px] text-left" style={{ color: 'var(--text-secondary)' }}>Penerima bisa mengedit di perangkatnya (tersimpan lokal).</span>
          </button>
        </div>
        <Field label="Tautan berbagi">
          <div className="flex gap-2">
            <input readOnly className="input mono" style={{ fontSize: 11 }} value={link} onFocus={(e) => e.target.select()} />
            <button className="btn btn-primary btn-sm shrink-0" style={{ height: 32 }} onClick={copy}>{copied ? <Check size={14} /> : null}{copied ? 'Disalin' : 'Salin Link'}</button>
          </div>
        </Field>
        <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>Tanpa server: seluruh data proyek dikompresi ke dalam tautan ({(link.length / 1024).toFixed(1)} KB). Kirim via WhatsApp/email. Perubahan penerima tidak mengubah proyek Anda.</p>
        <div className="flex items-center gap-2"><button className="btn btn-secondary" onClick={onTeam}><UsersRound size={14} />Kolaborasi tim langsung</button><div className="flex-1" /><button className="btn btn-secondary" onClick={onClose}>Tutup</button></div>
      </div>
    </Modal>
  );
}
