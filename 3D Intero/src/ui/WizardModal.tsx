import { useState } from 'react';
import { useStore } from '../core/store';
import { MATERIALS, getCountertop } from '../config/materials';
import { generateGuided, splitRuns, type GuidedItem, type GuidedSpec, GUIDED_CATALOG } from '../engine/guidedLayout';
import type { KitchenLayout } from '../models/types';
import { Modal } from './modals';
import { DEFAULT_MATERIALS } from '../engine/layoutEngine';
import { GripVertical, Trash2 } from './icons';

const SHAPES: { id: KitchenLayout; label: string; sub: string }[] = [
  { id: 'I', label: 'Bentuk I', sub: 'Lurus' },
  { id: 'L', label: 'Bentuk L', sub: 'Siku' },
  { id: 'U', label: 'Bentuk U', sub: '3 sisi' },
];

function defaultItems(shape: KitchenLayout): GuidedItem[] {
  if (shape === 'I') return [
    { key: 'stove', label: 'Kompor + Hood', width: 60 },
    { key: 'base_top', label: 'Kabinet Bawah+Atas', width: 80 },
    { key: 'sink', label: 'Sink Cabinet', width: 80 },
    { key: 'base_top', label: 'Kabinet Bawah+Atas', width: 60 },
  ];
  if (shape === 'U') return [
    { key: 'fridge', label: 'Lemari Kulkas', width: 70 },
    { key: 'corner_l', label: 'SIKU KIRI (sudut)', width: 90, width2: 90, fixed: true },
    { key: 'sink', label: 'Sink Cabinet', width: 80 },
    { key: 'stove', label: 'Kompor + Hood', width: 60 },
    { key: 'base_top', label: 'Kabinet Bawah+Atas', width: 60 },
    { key: 'corner_r', label: 'SIKU KANAN (sudut)', width: 90, width2: 90, fixed: true },
    { key: 'pantry', label: 'Pantry Tower', width: 60 },
  ];
  return [
    { key: 'stove', label: 'Kompor + Hood', width: 60 },
    { key: 'base_top', label: 'Kabinet Bawah+Atas', width: 90 },
    { key: 'corner_r', label: 'SIKU (sudut L)', width: 90, width2: 90, fixed: true },
    { key: 'sink', label: 'Sink Cabinet', width: 80 },
    { key: 'base_top', label: 'Kabinet Bawah+Atas', width: 60 },
    { key: 'fridge', label: 'Lemari Kulkas', width: 70 },
  ];
}

const STYLE_PRESETS: { id: string; label: string; door: string; carcass: string; ct: string; ctColor: string }[] = [
  { id: 'modern', label: 'Modern Minimalis', door: 'white', carcass: 'white', ct: 'granite', ctColor: 'black_galaxy' },
  { id: 'classic', label: 'Classic', door: 'cream', carcass: 'cream', ct: 'granite', ctColor: 'grey_granite' },
  { id: 'scandi', label: 'Scandinavian', door: 'maple', carcass: 'white', ct: 'quartz', ctColor: 'calacatta' },
  { id: 'industrial', label: 'Industrial', door: 'grey_dark', carcass: 'grey_dark', ct: 'solid_surface', ctColor: 'concrete' },
];

export default function WizardModal() {
  const { setUI, setProject, toast, requestFit } = useStore.getState();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Dapur Baru');
  const [shape, setShape] = useState<KitchenLayout>('L');
  const [items, setItems] = useState<GuidedItem[]>(defaultItems('L'));
  const [ceiling, setCeiling] = useState(280);
  const [baseH, setBaseH] = useState(85);
  const [wallH, setWallH] = useState(70);
  const [gap, setGap] = useState(50);
  const [ctDepth, setCtDepth] = useState(60);
  const [wallDepth, setWallDepth] = useState(33);
  const [style, setStyle] = useState('modern');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const runs = splitRuns(shape, items, ctDepth);
  const runTotal = (r: { items: GuidedItem[]; startAfter: number }) => r.startAfter + r.items.reduce((s, i) => s + ((i.key === 'corner_l' || i.key === 'corner_r') ? i.width : i.width), 0);

  const moveItem = (from: number, to: number) => {
    if (items[from].fixed || items[to]?.fixed) return;
    const arr = [...items];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    setItems(arr);
  };

  const generate = (skipStyle = false) => {
    const preset = STYLE_PRESETS.find((s) => s.id === style)!;
    const spec: GuidedSpec = {
      name, shape, items, ceiling, baseH, wallH, gap, ctDepth, wallDepth,
      materials: skipStyle ? { ...DEFAULT_MATERIALS } : { ...DEFAULT_MATERIALS, doorColor: preset.door, carcassColor: preset.carcass, countertop: preset.ct, countertopColor: preset.ctColor },
    };
    setUI({ loading: 'Membuat kitchen set…', loadingProgress: 10 });
    let p = 10;
    const tick = setInterval(() => {
      p = Math.min(90, p + 20);
      useStore.getState().setUI({ loadingProgress: p });
    }, 120);
    setTimeout(() => {
      clearInterval(tick);
      try {
        const prj = generateGuided(spec);
        setProject(prj);
        requestFit();
        setUI({ modal: null, loading: null, loadingProgress: 0, viewMode: 'split', cameraPreset: 'perspective', fitRequest: useStore.getState().ui.fitRequest + 1 });
        toast({ severity: 'success', message: `Design berhasil dibuat! ✓ (${prj.items.length} items)` });
      } catch (e) {
        setUI({ loading: null });
        toast({ severity: 'error', message: 'Gagal: ' + (e as Error).message });
      }
    }, 600);
  };

  const steps = ['Bentuk', 'Susun Item', 'Ukuran', 'Style'];
  return (
    <Modal title={`Buat Kitchen Set — Step ${step + 1} of 4: ${['Pilih Bentuk', 'Susun Item', 'Ukuran', 'Style'][step]}`} width="max-w-3xl" onClose={() => setUI({ modal: null })}>
      <div className="flex items-center gap-2 mb-4">
        {steps.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className={`flex items-center gap-1.5 text-xs ${i === step ? 'text-[var(--accent)]' : i < step ? '' : 'opacity-40'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === step ? 'bg-[var(--brand)] text-white' : i < step ? 'bg-[var(--success)] text-white' : 'bg-[var(--bg-hover)]'}`}>{i < step ? '✓' : i + 1}</span>{s}
            {i < 3 && <span className="w-5 h-px bg-[var(--border)] ml-1" />}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="anim-in">
          <label className="block mb-3"><span className="label">Nama project</span><input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="grid grid-cols-3 gap-3">
            {SHAPES.map((s) => (
              <button key={s.id} onClick={() => { setShape(s.id); setItems(defaultItems(s.id)); }} className={`card p-4 text-center hover:border-[var(--accent)] ${shape === s.id ? 'border-[var(--accent)]! bg-[var(--bg-selected)]' : ''}`}>
                <svg width="72" height="52" viewBox="0 0 56 40" className="mx-auto"><rect x="1" y="1" width="54" height="38" fill="none" stroke="var(--border-strong)" />
                  {s.id === 'I' && <rect x="4" y="4" width="48" height="8" fill="var(--brand)" />}
                  {s.id === 'L' && (<><rect x="4" y="4" width="48" height="8" fill="var(--brand)" /><rect x="4" y="4" width="8" height="32" fill="var(--brand)" /></>)}
                  {s.id === 'U' && (<><rect x="4" y="4" width="48" height="8" fill="var(--brand)" /><rect x="4" y="4" width="8" height="32" fill="var(--brand)" /><rect x="44" y="4" width="8" height="32" fill="var(--brand)" /></>)}
                </svg>
                <div className="font-semibold mt-1">{s.label}</div><div className="text-[11px] opacity-60">{s.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="anim-in">
          <div className="text-xs opacity-70 mb-2">📋 Daftar item dari kiri ke kanan — <b>drag untuk reorder</b>. Item SIKU posisinya fixed (sudut).</div>
          <div className="card p-2 max-h-[300px] overflow-y-auto flex flex-col gap-1">
            {items.map((it, i) => (
              <div key={i} draggable={!it.fixed} onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx !== null) moveItem(dragIdx, i); setDragIdx(null); }}
                className={`flex items-center gap-2 p-1.5 rounded border ${it.fixed ? 'border-[var(--warning)] bg-amber-500/10' : 'border-[var(--border)]'} ${dragIdx === i ? 'opacity-40' : ''}`}>
                <span className="text-[10px] opacity-50 w-4">{i + 1}.</span>
                <GripVertical size={13} className="opacity-50 shrink-0" />
                <select className="input flex-1" value={it.key} disabled={it.fixed}
                  onChange={(e) => { const c = GUIDED_CATALOG.find((x) => x.key === e.target.value)!; setItems(items.map((x, j) => (j === i ? { ...x, key: c.key, label: c.label, width: c.defW } : x))); }}>
                  {GUIDED_CATALOG.filter((c) => !c.cornerOnly || it.fixed).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <span className="text-[11px] font-mono w-14 text-right">{it.width} cm</span>
                {!it.fixed && <button className="tb-btn" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={13} /></button>}
              </div>
            ))}
          </div>
          <button className="btn mt-2" onClick={() => setItems([...items, { key: 'base_top', label: 'Kabinet Bawah+Atas', width: 60 }])}>+ Tambah Item</button>
          <div className="text-[11px] opacity-60 mt-2">Total: {runs.map((r) => `${r.label} ${runTotal(r)} cm`).join(' · ')}</div>
        </div>
      )}

      {step === 2 && (
        <div className="anim-in grid md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto">
          <div className="card p-2">
            {runs.map((run) => (
              <div key={run.wall}>
                <div className="label mb-1 mt-1">Dinding {run.wall} — {run.label} — total {runTotal(run)} cm</div>
                {run.items.map((it) => {
                  const i = items.indexOf(it);
                  return (
                    <div key={i} className="flex items-center gap-2 py-1 border-b border-[var(--border)] text-xs">
                      <span className="flex-1 truncate">{i + 1}. {it.label}</span>
                      {it.key.startsWith('corner') ? (
                        <span className="flex items-center gap-1">
                          <input type="number" className="input w-16! font-mono" title="Run W" value={it.width} min={60} max={120} onChange={(e) => { const v = parseFloat(e.target.value) || 60; setItems(items.map((x, j) => (j === i ? { ...x, width: v } : x))); }} />
                          <span className="opacity-50">×</span>
                          <input type="number" className="input w-16! font-mono" title="Run D" value={it.width2 ?? it.width} min={60} max={120} onChange={(e) => { const v = parseFloat(e.target.value) || 60; setItems(items.map((x, j) => (j === i ? { ...x, width2: v } : x))); }} />
                          <span className="opacity-50">cm</span>
                        </span>
                      ) : (
                        <><input type="number" className="input w-20! font-mono" value={it.width} min={20} onChange={(e) => { const v = parseFloat(e.target.value) || 20; setItems(items.map((x, j) => (j === i ? { ...x, width: v } : x))); }} />
                        <span className="opacity-50">cm</span></>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="card p-2 text-xs flex flex-col gap-2">
            <div className="label">Ukuran umum</div>
            {([['Tinggi plafon', ceiling, setCeiling], ['Tinggi kabinet bawah', baseH, setBaseH], ['Tinggi kabinet atas', wallH, setWallH], ['Gap countertop–wall cab', gap, setGap], ['Kedalaman countertop', ctDepth, setCtDepth], ['Kedalaman kabinet atas', wallDepth, setWallDepth]] as [string, number, (v: number) => void][]).map(([l, v, fn]) => (
              <label key={l} className="flex items-center gap-2"><span className="flex-1 opacity-70">{l}</span>
                <input type="number" className="input w-20! font-mono" value={v} onChange={(e) => fn(parseFloat(e.target.value) || 0)} /><span className="opacity-50">cm</span></label>
            ))}
            <div className="text-[11px] opacity-60">ℹ Pintu sudut buka 168° (engsel soft-close). Corner depth = {ctDepth} cm mengikuti countertop.</div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="anim-in">
          <div className="label mb-2">Preset style</div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {STYLE_PRESETS.map((s) => (
              <button key={s.id} onClick={() => setStyle(s.id)} className={`card p-2 text-center ${style === s.id ? 'border-[var(--accent)]! bg-[var(--bg-selected)]' : ''}`}>
                <div className="h-10 rounded mb-1" style={{ background: `linear-gradient(135deg, ${MATERIALS.colors.find((c) => c.id === s.door)?.hex ?? '#fff'} 50%, ${MATERIALS.colors.find((c) => c.id === s.ctColor)?.hex ?? '#111'} 50%)` }} />
                <div className="text-xs font-semibold">{s.label}</div>
              </button>
            ))}
          </div>
          <div className="text-[11px] opacity-60">Countertop: {getCountertop(STYLE_PRESETS.find((s) => s.id === style)!.ct).name} · bisa diubah lagi di Material Studio setelah generate.</div>
        </div>
      )}

      <div className="flex items-center justify-between mt-5 pt-3 border-t border-[var(--border)]">
        <button className="btn" onClick={() => setUI({ modal: null })}>Batal</button>
        <div className="flex gap-2">
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>← Back</button>}
          {step < 3 ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Lanjut →</button> : (
            <>
              <button className="btn" onClick={() => generate(true)}>Skip & Generate</button>
              <button className="btn-primary px-5!" onClick={() => generate(false)}>Generate Design →</button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
