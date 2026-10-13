import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../core/store';
import { DEFAULT_MATERIALS } from '../engine/layoutEngine';
import { MATERIALS, HARDWARE, getColor, getBoard, getCountertop } from '../config/materials';
import type { ProjectMaterials } from '../models/types';
import {
  MAGIC_CATALOG, AUTO, magicEntry, autoSpace, autoCount, fixedUsed, activeSides, cornerCount, needsOf,
  generateMagic, magicHeight, magicProblems, magicStats, type MagicPlacement, type MagicSpec, type MagicItem, type SideId,
} from '../engine/magicGenerator';
import { Trash2, Sparkles, ArrowRight, ArrowLeft, Check, TriangleAlert, X, Ruler, Palette, Lightbulb, Plus, ChevronDown, ChevronRight, Layers, Box } from './icons';
import MagicPreview from './MagicPreview';
import './magic-wizard.css';

const newItem = (key = AUTO): MagicItem => ({ uid: crypto.randomUUID(), key, width: magicEntry(key).defW });
const DEFAULT_LIGHTS = { under: true, inWall: false, inBase: false, tone: 'warm' as const, brightness: 1, glow: true };
const initialSpec = (): MagicSpec => ({
  name: 'Kitchen Set Baru', shape: 'L', totalH: 220, ceilingHeight: 280,
  cornerDepth: 90, baseH: 85, baseDepth: 58, ctDepth: 60, wallDepth: 33, backsplashHeight: 60,
  sides: {
    A: { length: 575, items: [newItem('fridge_sbs'), newItem('electro'), newItem()] },
    B: { length: 260, items: [newItem(), newItem('dispenser')] },
    C: { length: 240, items: [newItem()] },
  },
  lighting: { ...DEFAULT_LIGHTS },
});

const STYLES: { id: string; name: string; description: string; values: Partial<ProjectMaterials> }[] = [
  { id: 'clean', name: 'Clean White', description: 'Putih matte + granit hitam', values: { doorColor: 'white', carcassColor: 'white', countertop: 'granite', countertopColor: 'black_galaxy', finishing: 'hpl', finish: 'matte', handleType: 'bar', handleFinish: 'black' } },
  { id: 'natural', name: 'Natural Oak', description: 'Oak hangat + quartz terang', values: { doorColor: 'oak', carcassColor: 'white', countertop: 'quartz', countertopColor: 'calacatta', finishing: 'veneer', finish: 'matte', handleType: 'profile', handleFinish: 'brass' } },
  { id: 'sage', name: 'Soft Sage', description: 'Sage + batu putih', values: { doorColor: 'sage', carcassColor: 'white', countertop: 'quartz', countertopColor: 'white_marble', finishing: 'hpl', finish: 'matte', handleType: 'bar', handleFinish: 'brass' } },
  { id: 'graphite', name: 'Graphite', description: 'Graphite + silver', values: { doorColor: 'graphite', carcassColor: 'grey_dark', countertop: 'solid_surface', countertopColor: 'concrete', finishing: 'acp', finish: 'semi', handleType: 'profile', handleFinish: 'stainless' } },
];

function Numeric({ label, value, onChange, min = 0, max = 1000 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return <label className="magic-field"><span>{label}</span><div className="magic-number">
    <input type="number" step="0.1" min={min} max={max} value={text} onFocus={(e) => e.target.select()} onChange={(e) => {
      setText(e.target.value);
      const n = Number(e.target.value);
      if (e.target.value !== '' && Number.isFinite(n)) onChange(Math.round(n * 10) / 10);
    }} onBlur={() => { if (!text) setText(String(value)); }} /><small>cm</small>
  </div></label>;
}

function RoomShape({ shape, small = false }: { shape: MagicSpec['shape']; small?: boolean }) {
  return <svg viewBox="0 0 120 92" className={small ? 'magic-shape-small' : 'magic-shape'} fill="none" aria-hidden="true">
    <path d="M21 26H100" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
    {shape !== 'I' && <path d="M100 26V77" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />}
    {shape === 'U' && <path d="M21 26V77" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />}
    <text x="58" y="13" fill="currentColor" fontSize="11" fontFamily="inherit">A</text>
    {shape === 'L' && <text x="79" y="60" fill="currentColor" fontSize="11" fontFamily="inherit">B</text>}
    {shape === 'U' && <><text x="36" y="60" fill="currentColor" fontSize="11" fontFamily="inherit">B</text><text x="79" y="60" fill="currentColor" fontSize="11" fontFamily="inherit">C</text></>}
  </svg>;
}

function SpaceBar({ spec, side }: { spec: MagicSpec; side: SideId }) {
  const remaining = autoSpace(spec, side), count = autoCount(spec, side);
  const total = spec.sides[side].length;
  const corner = cornerCount(spec.shape, side);
  const pieces: { label: string; width: number; type: string }[] = spec.sides[side].items.map((i) => ({
    label: i.key === AUTO ? 'Auto-fill' : magicEntry(i.key).label,
    width: i.key === AUTO ? Math.max(0, remaining / Math.max(1, count)) : i.width,
    type: i.key === AUTO ? 'auto' : 'fixed',
  }));
  if (corner) {
    const p = { label: 'Sudut', width: spec.cornerDepth, type: 'corner' };
    if (side !== 'A' || spec.shape === 'U') pieces.unshift(p);
    if (side === 'A') pieces.push(p);
  }
  if (!count && remaining > 0) pieces.push({ label: 'Kosong', width: remaining, type: 'empty' });
  return <div className="magic-space">
    <div className="magic-space-track" aria-label={`Sisi ${side}, sisa ${remaining} cm`}>
      {pieces.map((p, index) => <div key={index} className={`magic-space-${p.type}`} style={{ flexGrow: Math.max(0.1, p.width), flexBasis: 0 }} title={`${p.label}: ${p.width.toFixed(1)} cm`}>
        {p.width >= 40 && <span>{Math.round(p.width * 10) / 10}</span>}
      </div>)}
    </div>
    <div className={remaining < 0 ? 'magic-space-error' : 'magic-space-note'}><span>{remaining < 0 ? `Melebihi dinding ${Math.abs(remaining)} cm` : count ? `${remaining} cm untuk auto-fill` : `${remaining} cm ruang tersisa`}</span><span>{fixedUsed(spec, side)} / {total} cm tetap</span></div>
  </div>;
}

function TintSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <label className="magic-field">
    <span className="flex justify-between">
      {label}
      <b className="font-mono" style={{ color: value ? 'var(--brand)' : undefined }}>{value > 0 ? `+${value}` : value || 'netral'}</b>
    </span>
    <input type="range" min={-60} max={60} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>;
}

function ColorChoice({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="magic-field"><span>{label}</span><div className="magic-color-input">
    <input type="color" value={getColor(value).hex} title={`Warna ${label}`} onChange={(e) => onChange(e.target.value)} />
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {!MATERIALS.colors.some((c) => c.id === value) && <option value={value}>{value.toUpperCase()}</option>}
      {MATERIALS.colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  </div></label>;
}

export default function MagicWizard() {
  const { setUI, setProject, toast } = useStore.getState();
  const [step, setStep] = useState(0);
  const [spec, setSpec] = useState<MagicSpec>(initialSpec);
  const [materials, setMaterials] = useState<ProjectMaterials>({ ...DEFAULT_MATERIALS });
  const [style, setStyle] = useState('clean');
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dialog = useRef<HTMLDivElement>(null);
  const up = (patch: Partial<MagicSpec>) => setSpec((s) => ({ ...s, ...patch }));
  const setSide = (side: SideId, items: MagicItem[]) => setSpec((s) => ({ ...s, sides: { ...s.sides, [side]: { ...s.sides[side], items } } }));
  const mat = (patch: Partial<ProjectMaterials>) => { setMaterials((m) => ({ ...m, ...patch })); setStyle('custom'); };
  const setTint = (key: 'door' | 'carcass' | 'countertop', value: number) => {
    setMaterials((m) => ({ ...m, tints: { door: 0, carcass: 0, countertop: 0, ...(m.tints ?? {}), [key]: value } }));
    setStyle('custom');
  };
  const setPlacement = (kind: 'sink' | 'stove', value?: MagicPlacement) => setSpec((s) => ({ ...s, placement: { ...s.placement, [kind]: value } }));
  const placementText = (kind: 'sink' | 'stove') => {
    const p = stats.placement[kind];
    return p ? `dinding ${p.side}, ${p.offset} cm dari sudut` : 'posisi otomatis';
  };
  const sides = activeSides(spec);
  const lights = spec.lighting ?? DEFAULT_LIGHTS;
  const heights = magicHeight(spec, materials);
  const errors = useMemo(() => magicProblems(spec, materials), [spec, materials]);
  const stats = useMemo(() => magicStats(spec), [spec]);
  const missing = useMemo(() => needsOf(spec), [spec]);
  const preview = useMemo(() => {
    try { return errors.length ? null : generateMagic(spec, materials); }
    catch { return null; }
  }, [spec, materials, errors]);
  const totalCabinets = preview?.items.filter((i) => i.kind === 'cabinet').length ?? stats.cabinets;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (!busy) setUI({ modal: null }); }
      if (e.key === 'Tab' && dialog.current) {
        const nodes = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'));
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', key, true);
    return () => { window.removeEventListener('keydown', key, true); previous?.focus(); };
  }, [busy, setUI]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const generate = (skip = false) => {
    if (busy) return;
    const selectedMaterials = skip ? { ...DEFAULT_MATERIALS } : materials;
    const invalid = magicProblems(spec, selectedMaterials);
    if (invalid.length) { toast({ severity: 'warning', message: invalid[0] }); return; }
    setBusy(true);
    setProgress(12);
    timers.current.push(setTimeout(() => setProgress(45), 250), setTimeout(() => setProgress(78), 650), setTimeout(() => {
      try {
        const generated = generateMagic(spec, selectedMaterials);
        setProgress(100);
        setProject(generated);
        const ui = useStore.getState().ui;
        setUI({ modal: null, loading: null, viewMode: '3d', cameraPreset: 'perspective', fitRequest: ui.fitRequest + 1, rightOpen: true, rightTab: 'props', showDims: false });
        toast({ severity: 'success', message: `${generated.items.filter((i) => i.kind === 'cabinet').length} kabinet dibuat. Garis atas rata ${spec.totalH} cm; ukuran perangkat tetap.`, ttl: 6000 });
      } catch (e) { setBusy(false); toast({ severity: 'error', message: (e as Error).message }); }
    }, 1200));
  };

  const reorder = (side: SideId, index: number, direction: number) => {
    const list = [...spec.sides[side].items];
    const other = index + direction;
    if (other < 0 || other >= list.length) return;
    [list[index], list[other]] = [list[other], list[index]];
    setSide(side, list);
  };

  return <div className="magic-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setUI({ modal: null }); }}>
    <div ref={dialog} className="magic-dialog" role="dialog" aria-modal="true" aria-labelledby="magic-title" tabIndex={-1}>
      <header className="magic-header">
        <div className="magic-brandmark"><Sparkles size={22} strokeWidth={1.5} /></div>
        <div><span className="magic-eyebrow">3D INTERO / NEW PROJECT</span><h1 id="magic-title">Magic Generator</h1></div>
        <span className="magic-header-note">Dari daftar kebutuhan, menjadi dapur.</span>
        <button type="button" className="magic-close" disabled={busy} title="Tutup" onClick={() => setUI({ modal: null })}><X size={19} /></button>
      </header>
      <nav className="magic-steps" aria-label="Tahapan generator">
        {[{ name: 'Ruangan', detail: 'Bentuk & ukuran', icon: Ruler }, { name: 'Komponen', detail: 'Susun kebutuhan', icon: Layers }, { name: 'Material', detail: 'Opsional', icon: Palette }].map((s, i) => <button key={s.name} type="button" disabled={busy} className={step === i ? 'current' : step > i ? 'complete' : ''} onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}>
          <span className="magic-step-number">{step > i ? <Check size={14} /> : `0${i + 1}`}</span><span><b>{s.name}</b><small>{s.detail}</small></span><s.icon size={17} strokeWidth={1.5} />
        </button>)}
      </nav>
      <div className="magic-body">
        <div className="magic-form" key={step}>
          <fieldset disabled={busy}>
            {step === 0 && <>
              <div className="magic-section-heading"><span>01 / MULAI DARI RUANGAN</span><h2>Kenali ruang dapur Anda.</h2><p>Ukuran dalam centimeter. Tinggi total adalah garis atas semua kabinet, bukan ukuran kulkas.</p></div>
              <label className="magic-field"><span>Nama proyek</span><input value={spec.name} onChange={(e) => up({ name: e.target.value })} placeholder="Misal: Kitchen Set Dewi" /></label>
              <div className="magic-field"><span>Bentuk kitchen set</span><div className="magic-shapes">
                {(['I', 'L', 'U'] as const).map((shape) => <button key={shape} type="button" className={spec.shape === shape ? 'chosen' : ''} onClick={() => up({ shape })} aria-pressed={spec.shape === shape}>
                  <RoomShape shape={shape} small /><b>{shape}-Shape</b><small>{shape === 'I' ? 'Satu dinding' : shape === 'L' ? 'Dua sisi bersudut' : 'Tiga sisi'}</small>
                  {spec.shape === shape && <Check size={14} className="magic-choice-check" />}
                </button>)}
              </div></div>
              <div className="magic-input-grid">{sides.map((side) => <Numeric key={side} label={`Panjang dinding ${side}`} value={spec.sides[side].length} min={60} onChange={(length) => setSpec((s) => ({ ...s, sides: { ...s.sides, [side]: { ...s.sides[side], length } } }))} />)}</div>
              <div className="magic-input-grid">
                <Numeric label="Tinggi total kabinet" value={spec.totalH} min={180} max={350} onChange={(totalH) => up({ totalH })} />
                <Numeric label="Tinggi plafon ruangan" value={spec.ceilingHeight ?? 280} min={200} max={450} onChange={(ceilingHeight) => up({ ceilingHeight })} />
              </div>
              <div className="magic-height-note"><Ruler size={17} /><div><b>Satu garis atas, {spec.totalH} cm</b><p>Kabinet tinggi, sudut atas, dan unit atas akan sejajar. Ukuran kulkas tetap; hanya penyimpanan di atasnya yang berubah.</p></div></div>
              <button type="button" className="magic-disclosure" onClick={() => setAdvanced(!advanced)}>{advanced ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Ukuran bawah, backsplash & sudut</button>
              {advanced && <div className="magic-input-grid magic-advanced">
                <Numeric label="Tinggi kabinet bawah" value={spec.baseH} min={60} max={110} onChange={(baseH) => up({ baseH })} />
                <Numeric label="Tinggi backsplash" value={spec.backsplashHeight} min={10} max={120} onChange={(backsplashHeight) => up({ backsplashHeight })} />
                <Numeric label="Kedalaman countertop" value={spec.ctDepth} min={35} max={90} onChange={(ctDepth) => up({ ctDepth, baseDepth: Math.max(30, ctDepth - 2) })} />
                <Numeric label="Kedalaman kabinet atas" value={spec.wallDepth} min={20} max={50} onChange={(wallDepth) => up({ wallDepth })} />
                {spec.shape !== 'I' && <Numeric label="Reservasi corner per sisi" value={spec.cornerDepth} min={60} max={150} onChange={(cornerDepth) => up({ cornerDepth })} />}
              </div>}
            </>}

            {step === 1 && <>
              <div className="magic-section-heading"><span>02 / DAFTAR KEBUTUHAN</span><h2>Susun seperti daftar belanja.</h2><p>Tentukan item khusus. Auto-fill mengisi sisa ruang tanpa mengubah panjang dinding.</p></div>
              {sides.map((side) => {
                const rows = spec.sides[side].items;
                const CornerRow = () => <div className="magic-corner-row"><Box size={14} /><span>Sudut {spec.shape}-Shape</span><b>{spec.cornerDepth} cm</b><small>Otomatis</small></div>;
                return <section key={side} className="magic-side-section">
                  <header><span className="magic-wall-letter">{side}</span><div><h3>Dinding {side}</h3><small>{side === 'A' ? spec.shape === 'U' ? 'Dinding belakang, di antara dua sudut' : 'Urut dari kiri ke kanan' : 'Mulai setelah sudut'}</small></div><b>{spec.sides[side].length}<small> cm</small></b></header>
                  {(side !== 'A' || spec.shape === 'U') && spec.shape !== 'I' && <CornerRow />}
                  {rows.map((i, index) => <div key={i.uid} className={`magic-list-row ${i.key === AUTO ? 'auto-row' : ''}`}>
                    <span className="magic-item-index">{index + 1}</span>
                    <select aria-label={`Komponen ${index + 1} sisi ${side}`} value={i.key} onChange={(e) => setSide(side, rows.map((r) => r.uid === i.uid ? { ...r, key: e.target.value, width: magicEntry(e.target.value).defW } : r))}>
                      {MAGIC_CATALOG.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    {i.key === AUTO ? <span className="magic-auto-value"><Sparkles size={12} />{Math.max(0, Math.round(autoSpace(spec, side) / Math.max(1, autoCount(spec, side)) * 10) / 10)}<small>cm</small></span> : <div className="magic-row-width"><input aria-label={`Lebar ${magicEntry(i.key).label}`} type="number" step="0.1" min={20} value={i.width} onChange={(e) => setSide(side, rows.map((r) => r.uid === i.uid ? { ...r, width: Number(e.target.value) } : r))} /><span>cm</span></div>}
                    <div className="magic-row-actions"><button type="button" title="Geser ke atas" disabled={index === 0} onClick={() => reorder(side, index, -1)}><ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} /></button><button type="button" title="Geser ke bawah" disabled={index === rows.length - 1} onClick={() => reorder(side, index, 1)}><ChevronDown size={12} /></button></div>
                    <button type="button" className="magic-remove" title="Hapus item" onClick={() => setSide(side, rows.filter((r) => r.uid !== i.uid))}><Trash2 size={13} /></button>
                  </div>)}
                  {side === 'A' && spec.shape !== 'I' && <CornerRow />}
                  <button type="button" className="magic-add" onClick={() => setSide(side, [...rows, newItem('base_top')])}><Plus size={13} /> Tambah item</button>
                  <SpaceBar spec={spec} side={side} />
                </section>;
              })}
              <div className="card p-3">
                <div className="label">Posisi sink &amp; kompor</div>
                <p className="text-[11px] opacity-70 mb-1">Jarak dalam cm dari sudut, dihitung dari titik pertemuan dinding. Opsional — biarkan otomatis.</p>
                {(['sink', 'stove'] as const).map((kind) => {
                  const listed = !missing[kind];
                  const p = spec.placement?.[kind];
                  return <div key={kind} className="flex items-center gap-2 py-1.5 border-t flex-wrap" style={{ borderColor: 'var(--border)' }}>
                    <b className="w-28 text-xs">{kind === 'sink' ? 'Sink' : 'Kompor + hood'}</b>
                    {listed ? (
                      <span className="text-[11px] opacity-60">Sudah ada di daftar item</span>
                    ) : (
                      <>
                        <select className="input w-28!" aria-label={`Dinding untuk ${kind}`} value={p?.side ?? 'auto'} onChange={(e) => setPlacement(kind, e.target.value === 'auto' ? undefined : { side: e.target.value as SideId, offset: p?.offset ?? 80, ref: p?.ref ?? 'start' })}>
                          <option value="auto">Otomatis</option>
                          {activeSides(spec).map((s) => <option key={s} value={s}>Dinding {s}</option>)}
                        </select>
                        {p && <>
                          <input className="input w-20! font-mono" type="number" min={0} max={spec.sides[p.side].length} value={p.offset} onChange={(e) => setPlacement(kind, { ...p, offset: Number(e.target.value) })} />
                          <span className="text-[11px] opacity-60">cm dari sudut</span>
                          {spec.shape === 'U' && p.side === 'A' && (
                            <select className="input w-28!" aria-label="Sudut acuan" value={p.ref} onChange={(e) => setPlacement(kind, { ...p, ref: e.target.value as 'start' | 'end' })}>
                              <option value="start">Sudut kiri</option>
                              <option value="end">Sudut kanan</option>
                            </select>
                          )}
                        </>}
                      </>
                    )}
                  </div>;
                })}
                {stats.notes.map((n) => <p key={n} className="text-[10px] mt-1" style={{ color: 'var(--warning)' }}>{n}</p>)}
              </div>
              <div className="magic-inline-note"><Sparkles size={17} /><p>Sink {placementText('sink')}; kompor {placementText('stove')} beserta hood-nya. Kabinet atas, housing hood, countertop, serta plinth dibuat bersama.</p></div>
            </>}

            {step === 2 && <>
              <div className="magic-section-heading"><span>03 / MATERIAL & SUASANA</span><h2>Sentuhan akhir, sesuai selera.</h2><p>Opsional. Pilih preset atau sesuaikan sendiri. Semua material tetap bisa diubah setelah generate.</p></div>
              <div className="magic-style-grid">{STYLES.map((s) => <button key={s.id} type="button" className={`magic-style ${style === s.id ? 'chosen' : ''}`} onClick={() => { setStyle(s.id); setMaterials((m) => ({ ...m, ...s.values })); }}>
                <div className="magic-material-sample"><span style={{ background: getColor(s.values.doorColor!).hex }} /><span style={{ background: getColor(s.values.countertopColor!).hex }} /></div>
                <span className="magic-style-name"><b>{s.name}</b>{style === s.id && <Check size={14} />}</span><small>{s.description}</small>
              </button>)}</div>
              <div className="magic-input-grid">
                <label className="magic-field"><span>Bahan utama</span><select value={materials.board} onChange={(e) => mat({ board: e.target.value })}>{MATERIALS.boards.filter((b) => b.thickness >= 12).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
                <label className="magic-field"><span>Finishing pintu</span><select value={materials.finishing} onChange={(e) => mat({ finishing: e.target.value })}>{MATERIALS.finishings.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
                <ColorChoice label="Warna pintu" value={materials.doorColor} onChange={(doorColor) => mat({ doorColor })} />
                <ColorChoice label="Warna carcass" value={materials.carcassColor} onChange={(carcassColor) => mat({ carcassColor })} />
                <label className="magic-field"><span>Countertop</span><select value={materials.countertop} onChange={(e) => mat({ countertop: e.target.value })}>{MATERIALS.countertops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <ColorChoice label="Warna countertop" value={materials.countertopColor} onChange={(countertopColor) => mat({ countertopColor })} />
                <label className="magic-field"><span>Jenis handle</span><select value={materials.handleType} onChange={(e) => mat({ handleType: e.target.value })}>{HARDWARE.handles.types.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
                <label className="magic-field"><span>Permukaan</span><select value={materials.finish} onChange={(e) => mat({ finish: e.target.value as ProjectMaterials['finish'] })}><option value="matte">Matte</option><option value="semi">Semi-gloss</option><option value="gloss">High gloss</option></select></label>
              </div>
              <div className="magic-tint-block">
                <div className="label">Kecerahan warna (black &amp; white)</div>
                <p className="text-[11px] opacity-70">Warna terlalu tua atau terlalu terang di ruangan Anda? Geser untuk menyesuaikan, contoh abu gelap → +20 agar lebih terang.</p>
                <div className="magic-input-grid">
                  <TintSlider label="Pintu" value={materials.tints?.door ?? 0} onChange={(v) => setTint('door', v)} />
                  <TintSlider label="Carcase" value={materials.tints?.carcass ?? 0} onChange={(v) => setTint('carcass', v)} />
                  <TintSlider label="Countertop" value={materials.tints?.countertop ?? 0} onChange={(v) => setTint('countertop', v)} />
                </div>
              </div>
              <section className="magic-led-section">
                <div><Lightbulb size={19} /><span><b>Pencahayaan LED</b><small>Strip dengan pancaran cahaya ke backsplash dan meja.</small></span></div>
                <label><input type="checkbox" checked={lights.under} onChange={(e) => up({ lighting: { ...lights, under: e.target.checked } })} /> Bawah kabinet atas</label>
                <label><input type="checkbox" checked={lights.inWall} onChange={(e) => up({ lighting: { ...lights, inWall: e.target.checked } })} /> Interior kabinet dan niche dispenser</label>
                <div className="magic-light-options"><select aria-label="Temperatur LED" value={lights.tone} onChange={(e) => up({ lighting: { ...lights, tone: e.target.value as typeof lights.tone } })}><option value="warm">Warm / 3000 K</option><option value="neutral">Neutral / 4000 K</option><option value="cool">Cool / 6000 K</option></select><label><input type="checkbox" checked={lights.glow !== false} onChange={(e) => up({ lighting: { ...lights, glow: e.target.checked } })} /> Efek glow</label></div>
              </section>
            </>}
            {errors.length > 0 && <div className="magic-errors" role="status"><TriangleAlert size={16} /><div>{errors.map((e) => <p key={e}>{e}</p>)}</div></div>}
          </fieldset>
        </div>

        <aside className="magic-summary">
          <div className="magic-summary-heading"><span>DESAIN ANDA</span><b>{spec.shape}-Shape Kitchen</b></div>
          <MagicPreview project={preview} />
          <div className="magic-topline"><Ruler size={16} /><span>Garis atas kabinet<strong>{spec.totalH}<small> cm</small></strong></span><Check size={15} /></div>
          <dl className="magic-summary-list"><div><dt>Kabinet bawah</dt><dd>{spec.baseH} cm</dd></div><div><dt>Countertop</dt><dd>{materials.countertopThickness} cm</dd></div><div><dt>Backsplash / gap</dt><dd>{heights.bottom - heights.worktop} cm</dd></div><div><dt>Kabinet atas (termasuk corner)</dt><dd>{heights.upperHeight} cm</dd></div><div className="magic-summary-total"><dt>Total dari lantai</dt><dd>{spec.totalH} cm</dd></div></dl>
          <p className="magic-device-note">Ukuran kulkas dan dispenser tidak ikut membesar. Sisa tinggi menjadi ruang penyimpanan di atas perangkat.</p>
          <div className="magic-summary-materials"><span>Material saat ini</span><b>{getBoard(materials.board).name}</b><small>{getColor(materials.doorColor).name} / {getCountertop(materials.countertop).name}</small></div>
          <div className="magic-summary-footer"><Box size={14} />{totalCabinets} kabinet terencana<span>{stats.runM} m</span></div>
        </aside>
      </div>

      <footer className="magic-footer">
        {busy ? <div className="magic-generating" role="status"><Sparkles size={18} /><span>{progress < 40 ? 'Membagi ruang secara presisi...' : progress < 75 ? 'Menyelaraskan tinggi dan arah sudut...' : 'Menyiapkan material dan pencahayaan...'}<i><b style={{ width: `${progress}%` }} /></i></span><strong>{progress}%</strong></div> : <>
          <button className="btn magic-back" type="button" onClick={() => step ? setStep(step - 1) : setUI({ modal: null })}>{step ? <><ArrowLeft size={14} /> Kembali</> : 'Batal'}</button>
          <span className="magic-footer-hint">Semua ukuran tetap bisa diedit.</span>
          {step === 2 && <button type="button" className="magic-skip" disabled={errors.length > 0} onClick={() => generate(true)}>Lewati, gunakan default</button>}
          <button type="button" className="btn-primary magic-primary" disabled={errors.length > 0} onClick={() => step < 2 ? setStep(step + 1) : generate()}>
            {step === 0 ? <>Susun komponen <ArrowRight size={15} /></> : step === 1 ? <>Pilih material <ArrowRight size={15} /></> : <><Sparkles size={16} /> Magic Generate</>}
          </button>
        </>}
      </footer>
    </div>
  </div>;
}