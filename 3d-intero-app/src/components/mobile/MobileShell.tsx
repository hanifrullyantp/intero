import { useEffect, useState, type ReactNode } from 'react';
import { CopyPlus, Eye, Focus, Layers, Menu, Mic, MoreHorizontal, Move, Package, Palette, Redo2, RotateCw, Ruler, Scaling, Send, Settings2, Sparkles, Trash2, Undo2, X } from 'lucide-react';
import { canRedo, canUndo } from '../../projectdoc/session';
import { useStore } from '../../store';
import type { TopSubMode, ViewMode } from '../../types';
import { fileActions } from '../editor/file-actions';
import { toast } from '../ui';

const PRESETS: { id: ViewMode; label: string }[] = [
  { id: 'perspective', label: '3D' },
  { id: 'front', label: 'Depan' },
  { id: 'top', label: 'Atas' },
  { id: 'left', label: 'Kiri' },
  { id: 'right', label: 'Kanan' },
  { id: 'iso', label: 'Isometrik' },
];

const SUBS: { id: TopSubMode; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'base', label: 'Bawah saja' },
  { id: 'wall', label: 'Atas saja' },
  { id: 'split', label: 'Denah terpisah' },
];

type DockId = 'ai' | 'komponen' | 'ukur' | 'lapisan' | 'global' | 'tampilan' | 'ukuran' | 'material' | 'geser' | 'putar' | 'duplikat' | 'hapus' | 'lainnya';

const DOCK: Record<DockId, { label: string; icon: ReactNode }> = {
  ai: { label: 'AI', icon: <Sparkles size={22} /> },
  komponen: { label: 'Komponen', icon: <Package size={22} /> },
  ukur: { label: 'Ukur', icon: <Ruler size={22} /> },
  lapisan: { label: 'Lapisan', icon: <Layers size={22} /> },
  global: { label: 'Global', icon: <Settings2 size={22} /> },
  tampilan: { label: 'Tampilan', icon: <Eye size={22} /> },
  ukuran: { label: 'Ukuran', icon: <Scaling size={22} /> },
  material: { label: 'Material', icon: <Palette size={22} /> },
  geser: { label: 'Geser', icon: <Move size={22} /> },
  putar: { label: 'Putar', icon: <RotateCw size={22} /> },
  duplikat: { label: 'Duplikat', icon: <CopyPlus size={22} /> },
  hapus: { label: 'Hapus', icon: <Trash2 size={22} /> },
  lainnya: { label: 'Lainnya', icon: <MoreHorizontal size={22} /> },
};

export function dockItems(simple: boolean, hasSelection: boolean): DockId[] {
  if (hasSelection) return simple ? ['ukuran', 'material', 'hapus'] : ['ukuran', 'material', 'geser', 'putar', 'duplikat', 'hapus', 'lainnya'];
  return simple ? ['komponen'] : ['ai', 'komponen', 'ukur', 'lapisan', 'global', 'tampilan'];
}

function later() {
  toast('Bagian ini menyusul di tahap berikutnya.', 'info');
}

function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOffset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  return offset;
}

export function MobileV2TopBar() {
  const s = useStore();
  const [exportOpen, setExportOpen] = useState(false);
  const readOnly = s.shareMode === 'view';
  const runExport = (kind: 'png' | 'obj') => {
    setExportOpen(false);
    fileActions.export(kind);
  };
  return (
    <header className="mv2-top" data-mv2="top">
      <div className="mv2-top-row">
        <button type="button" className="mv2-hit" aria-label="Menu" onClick={() => s.ui({ mobileDrawer: 'left' })}><Menu size={22} /></button>
        <div className="mv2-seg" role="group" aria-label="Mode kerja">
          <button type="button" className={s.appMode === 'design' ? 'on' : ''} onClick={() => s.setAppMode('design')}>Desain</button>
          <button type="button" className={s.appMode === 'production' ? 'on' : ''} onClick={() => s.setAppMode('production')}>Produksi</button>
        </div>
        <button type="button" className="mv2-mode" onClick={() => s.setUiMode(s.uiMode === 'simple' ? 'advanced' : 'simple')} aria-label={s.uiMode === 'simple' ? 'Mode ringkas' : 'Mode lengkap'}>
          {s.uiMode === 'simple' ? 'Ringkas' : 'Lengkap'}
        </button>
        <span className="mv2-spacer" />
        <button type="button" className="mv2-hit" aria-label="Urungkan" disabled={readOnly || !canUndo(s)} onClick={() => s.undo()}><Undo2 size={20} /></button>
        <button type="button" className="mv2-hit" aria-label="Ulangi" disabled={readOnly || !canRedo(s)} onClick={() => s.redo()}><Redo2 size={20} /></button>
        <div className="mv2-pop-anchor">
          <button type="button" className="mv2-export" aria-expanded={exportOpen} onClick={() => setExportOpen((v) => !v)}>Ekspor</button>
          {exportOpen && (<>
            <button type="button" className="mv2-back" aria-label="Tutup ekspor" onClick={() => setExportOpen(false)} />
            <div className="mv2-pop" role="menu">
              <button type="button" role="menuitem" onClick={() => runExport('png')}>Gambar</button>
              <button type="button" role="menuitem" onClick={() => runExport('obj')}>Ekspor OBJ (bisa dibuka di SketchUp)</button>
            </div>
          </>)}
        </div>
      </div>
    </header>
  );
}

export function MobileV2CanvasHud() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const current = PRESETS.find((v) => v.id === s.viewMode)?.label ?? '3D';
  const focus = () => {
    if (s.selectedIds.length) s.ui({ focusRequest: s.focusRequest + 1 });
    else s.ui({ resetViewRequest: s.resetViewRequest + 1 });
  };
  return (
    <div className="mv2-hud" data-mv2="hud">
      <div className="mv2-pop-anchor">
        <button type="button" className="mv2-float" aria-expanded={open} aria-label={`Tampilan ${current}`} onClick={() => setOpen((v) => !v)}>{current}</button>
        {open && (<>
          <button type="button" className="mv2-back" aria-label="Tutup tampilan" onClick={() => setOpen(false)} />
          <div className="mv2-pop mv2-pop-down" role="menu">
            {PRESETS.map((v) => (
              <button type="button" role="menuitem" key={v.id} className={v.id === s.viewMode ? 'on' : ''} onClick={() => { s.setViewMode(v.id); if (v.id !== 'top') setOpen(false); }}>{v.label}</button>
            ))}
            {s.viewMode === 'top' && s.uiMode === 'advanced' && SUBS.map((v) => (
              <button type="button" role="menuitem" key={v.id} className={v.id === s.topSubMode ? 'on' : ''} onClick={() => { s.setTopSubMode(v.id); setOpen(false); }}>{v.label}</button>
            ))}
          </div>
        </>)}
      </div>
      <button type="button" className="mv2-float" aria-label={s.selectedIds.length ? 'Fokus ke objek' : 'Reset tampilan'} onClick={focus}><Focus size={20} /></button>
    </div>
  );
}

function cmOf(mm: number) {
  return Math.max(1, Math.round(mm / 10));
}

function SizePanel({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const sel = s.items.find((i) => i.id === s.selectedIds[0]);
  const [draft, setDraft] = useState(() => ({
    w: cmOf(sel?.dims.w ?? 600),
    h: cmOf(sel?.dims.h ?? 850),
    d: cmOf(sel?.dims.d ?? 560),
  }));
  const selId = sel?.id;
  useEffect(() => {
    if (!selId) return;
    const item = useStore.getState().items.find((i) => i.id === selId);
    if (!item) return;
    setDraft({ w: cmOf(item.dims.w), h: cmOf(item.dims.h), d: cmOf(item.dims.d) });
  }, [selId]);
  const setKey = (key: 'w' | 'h' | 'd', value: number) => setDraft((d) => ({ ...d, [key]: Math.max(1, Math.round(value)) }));
  const apply = () => {
    toast('Ukuran belum ditulis. Penerapan menyusul.', 'info');
    onClose();
  };
  return (
    <section className="mv2-tool" data-mv2="ukuran" aria-label="Ukuran">
      <div className="mv2-tool-head">
        <b>Ukuran</b>
        <button type="button" className="mv2-hit" aria-label="Tutup ukuran" onClick={onClose}><X size={20} /></button>
      </div>
      <Stepper label="Lebar" value={draft.w} onChange={(n) => setKey('w', n)} />
      <input className="mv2-slider" type="range" min={10} max={300} value={draft.w} aria-label="Geser lebar" onChange={(e) => setKey('w', Number(e.target.value))} />
      <Stepper label="Tinggi" value={draft.h} onChange={(n) => setKey('h', n)} />
      <Stepper label="Dalam" value={draft.d} onChange={(n) => setKey('d', n)} />
      <div className="mv2-apply">
        <button type="button" onClick={onClose}>Batal</button>
        <button type="button" className="primary" onClick={apply}>Terapkan</button>
      </div>
    </section>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="mv2-step">
      <span>{label}</span>
      <button type="button" aria-label={`Kurangi ${label}`} onClick={() => onChange(value - 1)}>−</button>
      <input inputMode="numeric" aria-label={label} value={value} onChange={(e) => {
        const n = Number(e.target.value);
        if (e.target.value === '') return;
        if (Number.isFinite(n)) onChange(n);
      }} />
      <span className="unit">cm</span>
      <button type="button" aria-label={`Tambah ${label}`} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export function MobileV2Bottom() {
  const s = useStore();
  const keyboard = useKeyboardOffset();
  const [tool, setTool] = useState<null | 'ukuran'>(null);
  const [history, setHistory] = useState(false);
  const [prompt, setPrompt] = useState('');
  const hasSelection = s.selectedIds.length > 0;
  const simple = s.uiMode === 'simple';
  const items = dockItems(simple, hasSelection);
  const sel = s.items.find((i) => i.id === s.selectedIds[0]);
  const chip = s.selectedIds.length > 1 ? `${s.selectedIds.length} objek` : (sel?.name || 'Objek');

  useEffect(() => {
    if (!hasSelection) setTool(null);
  }, [hasSelection]);

  const onDock = (id: DockId) => {
    if (id === 'ukuran') { setHistory(false); setTool('ukuran'); return; }
    if (id === 'ai') { setTool(null); setHistory((v) => !v); return; }
    later();
  };

  const listen = () => {
    const w = window as Window & { SpeechRecognition?: new () => SpeechHandle; webkitSpeechRecognition?: new () => SpeechHandle };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { toast('Perangkat ini tidak mendukung mikrofon di browser.', 'info'); return; }
    const rec = new Ctor();
    rec.lang = 'id-ID';
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (text) setPrompt(text);
    };
    rec.onerror = () => toast('Mikrofon tidak dapat dipakai.', 'info');
    try { rec.start(); } catch { toast('Mikrofon tidak dapat dipakai.', 'info'); }
  };

  const send = () => {
    const text = prompt.trim();
    if (!text) return;
    toast('Perintah belum dijalankan. Pratinjau AI menyusul.', 'info');
  };

  return (
    <div className="mv2-bottom" data-mv2="bottom" style={{ transform: keyboard ? `translateY(-${keyboard}px)` : undefined }}>
      {tool === 'ukuran' ? <SizePanel onClose={() => setTool(null)} /> : (<>
        {hasSelection && (
          <div className="mv2-chip" data-mv2="chip">
            <span>{chip}</span>
            <button type="button" aria-label="Batalkan pilihan" onClick={() => s.clearSelection()}><X size={18} /></button>
          </div>
        )}
        {history && <div className="mv2-history" data-mv2="riwayat">Belum ada riwayat perintah.</div>}
        <form className="mv2-ai" data-mv2="ai" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <button type="button" className="mv2-hit" aria-label="Mikrofon" onClick={listen}><Mic size={20} /></button>
          <input value={prompt} placeholder="Bilang apa yang diubah" aria-label="Bilang apa yang diubah" onChange={(e) => setPrompt(e.target.value)} />
          <button type="submit" className="mv2-hit mv2-send" aria-label="Kirim"><Send size={20} /></button>
        </form>
        <nav className="mv2-dock" data-mv2="dock" aria-label="Alat">
          {items.map((id) => (
            <button type="button" key={id} className="mv2-dock-btn" onClick={() => onDock(id)}>
              {DOCK[id].icon}<span>{DOCK[id].label}</span>
            </button>
          ))}
        </nav>
      </>)}
    </div>
  );
}

type SpeechHandle = {
  lang: string;
  start: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
};
