import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles, Wand2, X } from 'lucide-react';
import { useStore } from '../../store';
import type { CountertopType, DoorMaterial, HandleType, KitchenShape, WizardAppliance, WizardInput } from '../../types';
import { COUNTERTOP_TYPES, HANDLE_TYPES, STYLE_PRESETS } from '../../lib/constants';
import { generateLayout, islandCenter } from '../../engine/layout-generator';
import { makeRoomWalls, nearestWall, offsetOnWall, wallVec } from '../../engine/walls';
import { ColorPicker, Field, Modal, Select, Toggle, toast } from '../ui';

const SHAPES: { id: KitchenShape; name: string; desc: string; path: string }[] = [
  { id: 'I', name: 'Lurus (I)', desc: 'Satu dinding', path: 'M10 20 H90 V34 H10 Z' },
  { id: 'L', name: 'L-Shape', desc: '2 dinding siku', path: 'M10 10 H24 V66 H80 V80 H10 Z' },
  { id: 'U', name: 'U-Shape', desc: '3 dinding', path: 'M10 10 H24 V66 H76 V10 H90 V80 H10 Z' },
  { id: 'G', name: 'Galley', desc: '2 dinding berhadapan', path: 'M10 10 H90 V24 H10 Z M10 66 H90 V80 H10 Z' },
];
const defaultApp = (wallId: string, from: number, enabled = true): WizardAppliance => ({ enabled, wallId, fromCorner: from });

export function Wizard({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [step, setStep] = useState(1);
  const [inp, setInp] = useState<WizardInput>({
    shape: 'L', lengths: { left: 240, back: 360, right: 240, front: 360 }, island: false, islandDims: { w: 150, d: 90 }, islandPos: null,
    sink: defaultApp('back', 120), cooktop: defaultApp('back', 250), fridge: defaultApp('left', 20), electronic: defaultApp('back', 300, false),
    options: { magiccom: true, dispenser: false, microwave: true, bar: false, dishRack: true, spiceRack: true, gasRack: true },
    style: 'scandi', material: { doorMaterial: 'HPL', doorColor: '#C9A97A', bodyFollowsDoor: false, bodyColor: '#F5F5F3', countertop: 'granit_hitam', handleType: 'bar', handleColor: '#1A1A1A', led: true },
  });
  const [manual, setManual] = useState(false);
  const planDrag = useRef<'island' | 'sink' | 'cooktop' | 'fridge' | 'electronic' | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [progress, setProgress] = useState<{ pct: number; msg: string } | null>(null);
  const walls = useMemo(() => makeRoomWalls(inp.shape, { left: inp.lengths.left * 10, back: inp.lengths.back * 10, right: inp.lengths.right * 10, front: inp.lengths.front * 10 }), [inp.shape, inp.lengths]);
  const wallOpts = walls.map((w) => ({ value: w.id, label: w.name }));
  useEffect(() => { // pastikan wallId valid
    const ids = walls.map((w) => w.id);
    setInp((p) => { const fix = (a: WizardAppliance) => (ids.includes(a.wallId) ? a : { ...a, wallId: ids[0] }); return { ...p, sink: fix(p.sink), cooktop: fix(p.cooktop), fridge: fix(p.fridge), electronic: fix(p.electronic) }; });
  }, [walls]);
  const set = (patch: Partial<WizardInput>) => setInp((p) => ({ ...p, ...patch }));

  const generate = async () => {
    setStep(4);
    const msgs = ['Menghitung layout...', 'Menempatkan appliance...', 'Mengisi base cabinet...', 'Mengisi wall cabinet...', 'Menerapkan material...', 'Menyelesaikan...'];
    for (let i = 0; i < msgs.length; i++) { setProgress({ pct: Math.round(((i + 1) / msgs.length) * 100), msg: msgs[i] }); await new Promise((r) => setTimeout(r, 260)); }
    const input = { ...inp, style: manual ? null : inp.style };
    const out = generateLayout(input, s.settings);
    const st = useStore.getState();
    st.newProject(st.projectName);
    st.setWalls(out.walls);
    st.setCountertop({ type: out.countertop });
    st.addItems(out.items);
    useStore.setState({ past: [], future: [] });
    st.ui({ showWizard: false, resetViewRequest: st.resetViewRequest + 1, viewMode: 'perspective' });
    toast(`Layout dapur ${inp.shape}-shape dibuat: ${out.items.length} komponen`, 'success');
    onClose();
  };

  // Diagram 2D top view
  // ── Diagram top view (bisa di-drag: appliance pindah dinding / jarak, island pindah posisi) ──
  const PLAN_W = 420, PLAN_H = 230, PAD = 24;
  const planMaxX = Math.max(1000, ...walls.flatMap((w) => [w.start.x, w.end.x]));
  const planMaxZ = Math.max(1500, ...walls.flatMap((w) => [w.start.z, w.end.z]));
  const planK = Math.min((PLAN_W - PAD * 2) / planMaxX, (PLAN_H - PAD * 2) / planMaxZ);
  const PX = (x: number) => PAD + x * planK;
  const PZ = (z: number) => PAD + z * planK;
  const APP_DEFS: { key: 'sink' | 'cooktop' | 'fridge' | 'electronic'; label: string; w: number; color: string }[] = [
    { key: 'sink', label: 'Sink', w: 800, color: '#2563EB' },
    { key: 'cooktop', label: 'Kompor', w: 600, color: '#DC2626' },
    { key: 'fridge', label: 'Kulkas', w: 940, color: '#7C3AED' },
    { key: 'electronic', label: 'Elektronik', w: 600, color: '#D97706' },
  ];
  const appPos = (a: WizardAppliance, w: number) => {
    const wall = walls.find((x) => x.id === a.wallId);
    if (!wall) return null;
    const v = wallVec(wall);
    const t = Math.max(0, Math.min(v.length - w, a.fromCorner * 10));
    return {
      cx: wall.start.x + v.dir.x * (t + w / 2) + v.normal.x * 300,
      cz: wall.start.z + v.dir.z * (t + w / 2) + v.normal.z * 300,
      ang: (Math.atan2(v.dir.z, v.dir.x) * 180) / Math.PI,
    };
  };

  const diagram = () => {
    const toWorld = (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return null;
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: (p.x - PAD) / planK, z: (p.y - PAD) / planK };
    };
    const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
      const key = planDrag.current;
      if (!key) return;
      const wp = toWorld(e.clientX, e.clientY);
      if (!wp) return;
      if (key === 'island') {
        const x = Math.max(0, Math.min(planMaxX, wp.x)), z = Math.max(0, Math.min(planMaxZ, wp.z));
        set({ islandPos: { x: Math.round(x / 10), z: Math.round(z / 10) } });
        return;
      }
      const def = APP_DEFS.find((a) => a.key === key);
      const wall = nearestWall(walls, wp.x, wp.z);
      if (!def || !wall) return;
      const v = wallVec(wall);
      // Proyeksi ke garis dinding → jarak dari sudut kiri (cm), dibatasi panjang dinding
      const t = Math.max(0, Math.min(v.length - def.w, offsetOnWall(wall, wp.x, wp.z) - def.w / 2));
      setInp((p) => ({ ...p, [key]: { ...p[key], wallId: wall.id, fromCorner: Math.round(t / 10) } }) as WizardInput);
    };
    const onUp = () => { planDrag.current = null; };
    const grab = (key: 'island' | 'sink' | 'cooktop' | 'fridge' | 'electronic') => (e: React.PointerEvent<SVGElement>) => {
      e.stopPropagation();
      planDrag.current = key;
      svgRef.current?.setPointerCapture(e.pointerId);
    };
    const isl = islandCenter(inp);
    const islW = inp.islandDims.w * 10, islD = inp.islandDims.d * 10;
    return (
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} className="rounded-xl select-none" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', touchAction: 'none' }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {walls.map((w) => {
          const v = wallVec(w);
          return (
            <g key={w.id}>
              <line x1={PX(w.start.x)} y1={PZ(w.start.z)} x2={PX(w.end.x)} y2={PZ(w.end.z)} stroke="var(--text-primary)" strokeWidth={4} strokeLinecap="square" />
              <line x1={PX(w.start.x + v.normal.x * 300)} y1={PZ(w.start.z + v.normal.z * 300)} x2={PX(w.end.x + v.normal.x * 300)} y2={PZ(w.end.z + v.normal.z * 300)} stroke="var(--brand-primary)" strokeWidth={600 * planK} opacity={0.12} />
              <text x={PX((w.start.x + w.end.x) / 2 + v.normal.x * 900)} y={PZ((w.start.z + w.end.z) / 2 + v.normal.z * 900)} fontSize={10} textAnchor="middle" fill="var(--text-tertiary)">{w.name}</text>
            </g>
          );
        })}
        {APP_DEFS.map((a) => {
          const cfgA = inp[a.key];
          if (!cfgA.enabled) return null;
          const pos = appPos(cfgA, a.w);
          if (!pos) return null;
          const rw = a.w * planK, rh = 600 * planK, x = PX(pos.cx), y = PZ(pos.cz);
          const tr = `rotate(${pos.ang} ${x} ${y})`;
          return (
            <g key={a.key} style={{ cursor: 'grab' }} onPointerDown={grab(a.key)}>
              <rect x={x - rw / 2} y={y - rh / 2} width={rw} height={rh} rx={3} fill={a.color} opacity={0.9} stroke="#fff" strokeWidth={1} transform={tr} />
              <text x={x} y={y + 3} fontSize={9} textAnchor="middle" fill="#fff" fontWeight={700} transform={tr} style={{ pointerEvents: 'none' }}>{a.label}</text>
            </g>
          );
        })}
        {inp.island && (
          <g style={{ cursor: 'move' }} onPointerDown={grab('island')}>
            <rect x={PX(isl.x - islW / 2)} y={PZ(isl.z - islD / 2)} width={islW * planK} height={islD * planK} rx={3} fill="var(--brand-primary)" opacity={0.5} />
            <text x={PX(isl.x)} y={PZ(isl.z) + 3} fontSize={9} textAnchor="middle" fill="var(--text-primary)" fontWeight={700} style={{ pointerEvents: 'none' }}>Island</text>
          </g>
        )}
      </svg>
    );
  };
  const appRow = (label: string, key: 'sink' | 'cooktop' | 'fridge' | 'electronic', w: number) => {
    const a = inp[key];
    const wall = walls.find((x) => x.id === a.wallId);
    const max = wall ? Math.max(0, Math.round((wallVec(wall).length - w) / 10)) : 0;
    return (
      <div className="grid items-center gap-2 rounded-xl p-2" style={{ gridTemplateColumns: '28px 1fr 1fr 1fr', background: a.enabled ? 'var(--bg-secondary)' : 'transparent', border: '1px solid var(--border)' }}>
        <button type="button" className={`switch ${a.enabled ? 'on' : ''}`} style={{ transform: 'scale(0.85)' }} onClick={() => set({ [key]: { ...a, enabled: !a.enabled } } as Partial<WizardInput>)} />
        <span className="text-[13px] font-semibold">{label}</span>
        <select className="input" style={{ height: 30 }} value={a.wallId} disabled={!a.enabled} onChange={(e) => set({ [key]: { ...a, wallId: e.target.value } } as Partial<WizardInput>)}>{wallOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <div className="flex items-center gap-1"><input type="number" className="input mono" style={{ height: 30 }} min={0} max={max} disabled={!a.enabled} value={a.fromCorner} onChange={(e) => set({ [key]: { ...a, fromCorner: Math.max(0, Math.min(max, +e.target.value)) } } as Partial<WizardInput>)} /><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>cm</span></div>
      </div>
    );
  };

  return (
    <Modal onClose={step === 4 ? undefined : onClose} width={760} tour="wizard-modal">
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-primary)', color: '#fff' }}><Wand2 size={20} /></span>
          <div className="flex-1"><h3 className="text-[18px] font-bold">Magic Generator</h3><p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Langkah {step} dari 4 — {['Bentuk dapur', 'Posisi appliance', 'Material & warna', 'Generate'][step - 1]}</p></div>
          {step < 4 && <button className="icon-btn" onClick={onClose}><X size={16} /></button>}
        </div>
        <div className="flex gap-1.5">{[1, 2, 3, 4].map((i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? 'var(--brand-primary)' : 'var(--border)' }} />)}</div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SHAPES.map((sh) => <button key={sh.id} type="button" className="tile p-3 flex flex-col items-center gap-2" style={inp.shape === sh.id ? { borderColor: 'var(--brand-primary)', background: 'var(--bg-selected)' } : undefined} onClick={() => set({ shape: sh.id })}><svg width="72" height="66" viewBox="0 0 100 90"><path d={sh.path} fill={inp.shape === sh.id ? 'var(--brand-primary)' : 'var(--text-tertiary)'} opacity={0.85} /></svg><span className="text-[13px] font-bold">{sh.name}</span><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{sh.desc}</span></button>)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['left', 'back', 'right', 'front'] as const).filter((k) => (inp.shape === 'I' ? k === 'back' : inp.shape === 'L' ? k === 'left' || k === 'back' : inp.shape === 'U' ? k !== 'front' : k === 'back' || k === 'front')).map((k) => (
                <Field key={k} label={`Dinding ${k === 'left' ? 'kiri' : k === 'back' ? 'belakang' : k === 'right' ? 'kanan' : 'depan'} (cm)`}><input type="number" className="input mono" min={120} max={1200} value={inp.lengths[k]} onChange={(e) => set({ lengths: { ...inp.lengths, [k]: Math.max(120, +e.target.value) } })} /></Field>
              ))}
            </div>
            <div className="rounded-xl p-3 flex flex-col gap-3" style={{ border: '1px solid var(--border)' }}>
              <Toggle label="Tambahkan Island" hint="Meja tengah dengan kabinet 4 sisi" checked={inp.island} onChange={(v) => set({ island: v })} />
              {inp.island && <div className="grid grid-cols-2 gap-3"><Field label="Lebar island (cm)"><input type="number" className="input mono" value={inp.islandDims.w} onChange={(e) => set({ islandDims: { ...inp.islandDims, w: +e.target.value } })} /></Field><Field label="Dalam island (cm)"><input type="number" className="input mono" value={inp.islandDims.d} onChange={(e) => set({ islandDims: { ...inp.islandDims, d: +e.target.value } })} /></Field></div>}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="grid text-[10.5px] font-bold uppercase tracking-wide px-2" style={{ gridTemplateColumns: '28px 1fr 1fr 1fr', color: 'var(--text-tertiary)' }}><span /><span>Appliance</span><span>Dinding</span><span>Jarak dari sudut kiri</span></div>
              {appRow('Sink', 'sink', 800)}{appRow('Kompor + Hood', 'cooktop', 600)}{appRow('Kulkas', 'fridge', 940)}{appRow('Electronic Cabinet', 'electronic', 600)}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                {([['magiccom', 'Magic Com pull-out rel'], ['dispenser', 'Dispenser air'], ['microwave', 'Microwave'], ['bar', 'Meja Bar di island'], ['dishRack', 'Rak piring tarik di sink'], ['spiceRack', 'Rak bumbu dekat kompor'], ['gasRack', 'Rak gas 12kg']] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 text-[12.5px] cursor-pointer"><input type="checkbox" className="accent-[var(--brand-primary)]" checked={inp.options[k]} disabled={(k === 'bar' && !inp.island) || ((k === 'magiccom' || k === 'dispenser' || k === 'microwave') && !inp.electronic.enabled)} onChange={(e) => set({ options: { ...inp.options, [k]: e.target.checked } })} />{l}</label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">{diagram()}<p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Seret kotak appliance atau island langsung di diagram: pindah ke dinding lain atau ubah jaraknya dari sudut kiri (cm).</p></div>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="seg self-start"><button className={!manual ? 'active' : ''} onClick={() => setManual(false)}>Preset Style</button><button className={manual ? 'active' : ''} onClick={() => setManual(true)}>Manual</button></div>
            {!manual ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STYLE_PRESETS.map((p) => <button key={p.id} type="button" className="tile p-3 flex flex-col gap-2" style={inp.style === p.id ? { borderColor: 'var(--brand-primary)', background: 'var(--bg-selected)' } : undefined} onClick={() => set({ style: p.id })}><div className="flex gap-1"><span className="w-8 h-8 rounded-lg" style={{ background: p.doorColor }} /><span className="w-8 h-8 rounded-lg" style={{ background: p.bodyColor }} /><span className="w-8 h-8 rounded-lg" style={{ background: COUNTERTOP_TYPES[p.countertop].base, border: '1px solid var(--border)' }} /><span className="w-8 h-8 rounded-lg" style={{ background: p.handleColor }} /></div><span className="text-[13px] font-bold">{p.name}</span><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{p.desc}</span></button>)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Material pintu"><Select value={inp.material.doorMaterial} onChange={(v) => set({ material: { ...inp.material, doorMaterial: v as DoorMaterial } })} options={(['HPL', 'Duco', 'PVC', 'ACP', 'Solid Wood', 'Glass'] as DoorMaterial[]).map((v) => ({ value: v, label: v }))} /></Field>
                <ColorPicker label="Warna pintu" value={inp.material.doorColor} onChange={(hex) => set({ material: { ...inp.material, doorColor: hex } })} />
                <Field label="Countertop"><Select value={inp.material.countertop} onChange={(v) => set({ material: { ...inp.material, countertop: v as CountertopType } })} options={(Object.keys(COUNTERTOP_TYPES) as CountertopType[]).map((k) => ({ value: k, label: COUNTERTOP_TYPES[k].name }))} /></Field>
                <Field label="Handle"><Select value={inp.material.handleType} onChange={(v) => set({ material: { ...inp.material, handleType: v as HandleType } })} options={(Object.keys(HANDLE_TYPES) as HandleType[]).map((k) => ({ value: k, label: HANDLE_TYPES[k] }))} /></Field>
                <ColorPicker label="Warna handle" value={inp.material.handleColor} onChange={(hex) => set({ material: { ...inp.material, handleColor: hex } })} />
                <div className="flex flex-col gap-3 pt-5"><Toggle label="Material body sama ikut pintu" checked={inp.material.bodyFollowsDoor} onChange={(v) => set({ material: { ...inp.material, bodyFollowsDoor: v } })} /><Toggle label="LED strip under-cabinet" checked={inp.material.led} onChange={(v) => set({ material: { ...inp.material, led: v } })} /></div>
                {!inp.material.bodyFollowsDoor && <ColorPicker label="Warna body" value={inp.material.bodyColor} onChange={(hex) => set({ material: { ...inp.material, bodyColor: hex } })} />}
              </div>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Sparkles size={36} style={{ color: 'var(--brand-primary)' }} className="float-anim" />
            <div className="w-full max-w-md progress"><div style={{ width: `${progress?.pct ?? 0}%` }} /></div>
            <span className="text-[13px] font-semibold">{progress?.msg ?? 'Mempersiapkan…'}</span>
          </div>
        )}
        {step < 4 && (
          <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            {step === 3 && <button className="btn btn-ghost" onClick={() => { setManual(false); set({ style: 'scandi' }); generate(); }}>Skip & Generate</button>}
            <div className="flex-1" />
            {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}><ArrowLeft size={15} />Kembali</button>}
            {step < 3 && <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Lanjut<ArrowRight size={15} /></button>}
            {step === 3 && <button className="btn btn-primary" onClick={generate}><Check size={15} />Generate Dapur</button>}
          </div>
        )}
      </div>
    </Modal>
  );
}
