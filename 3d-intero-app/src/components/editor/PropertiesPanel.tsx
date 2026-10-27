import { useRef, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Info, Lock, Unlock, Trash2, Focus, X, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal, AlignVerticalDistributeCenter, AlignHorizontalDistributeCenter } from 'lucide-react';
import { useStore, type AlignMode, type ItemPatch } from '../../store';
import type { Accessory, CountertopType, DoorMaterial, FridgeType, HandlePosition, HandleType, Item, LedTemp, Slot1, Slot2 } from '../../types';
import { ACCESSORIES, COUNTERTOP_TYPES, ELECTRONIC_PRESETS, HANDLE_TYPES, LED_TEMPS, SLOT1_OPTIONS, SLOT2_OPTIONS, TYPE_LABELS } from '../../lib/constants';
import { ColorPicker, DragNumber, Field, Section, Select, Toggle } from '../ui';
import { contrastRatio, timeAgo } from '../../lib/utils';
import { validateItem } from '../../engine/walls';
import { GlobalCabinetSection } from './GlobalCabinet';

const BASE_TYPES = new Set(['base', 'sink_base', 'cooktop_base', 'drawer_base']);
const CT_TYPES = new Set(['base', 'sink_base', 'cooktop_base', 'drawer_base', 'dishwasher', 'corner_base', 'island', 'bar']);

function Num({ value, patch, min, max, step = 1, unit = 'cm', snap, ids }: { value: number; patch: (v: number) => ItemPatch; min?: number; max?: number; step?: number; unit?: string; snap?: number[]; ids: string[] }) {
  const dragging = useRef(false);
  const st = useStore.getState;
  return <DragNumber value={value} min={min} max={max} step={step} unit={unit} snapOptions={snap}
    onDragStart={() => { dragging.current = true; st().pushHistory(); }}
    onChange={(v, commit) => { st().patchItems(ids, patch(v), !dragging.current && commit); if (commit) dragging.current = false; }} />;
}
function Color({ value, patch, label, ids, tour }: { value: string; patch: (hex: string) => ItemPatch; label?: string; ids: string[]; tour?: string }) {
  const dragging = useRef(false);
  const st = useStore.getState;
  return <ColorPicker tour={tour} label={label} value={value} onDragStart={() => { dragging.current = true; st().pushHistory(); }} onChange={(hex, commit) => { st().patchItems(ids, patch(hex), !dragging.current && commit); if (commit) dragging.current = false; }} />;
}

export function PropertiesPanel({ embedded }: { embedded?: boolean }) {
  const s = useStore();
  const sel = s.items.filter((i) => s.selectedIds.includes(i.id));
  const simple = s.uiMode === 'simple';
  const header = (title: string, sub?: string) => (
    <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="min-w-0 flex-1"><div className="text-[14px] font-bold truncate" style={{ fontFamily: 'var(--font-heading)' }}>{title}</div>{sub && <div className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{sub}</div>}</div>
      {!embedded && <button className="icon-btn" onClick={() => s.ui({ showProps: false })} aria-label="Tutup"><X size={16} /></button>}
    </div>
  );
  if (!sel.length) return <GeneralProps embedded={embedded} header={header} />;
  const ids = sel.map((i) => i.id);
  const it = sel[0];
  const multi = sel.length > 1;
  const m = it.materials, cfg = it.config, led = it.led;
  const issues = multi ? [] : validateItem(it, s.items, s.walls);
  const handleContrast = contrastRatio(m.handleColor, m.doorColor);
  const doorCount = cfg.doorCount ?? (it.type === 'drawer_base' ? 0 : it.dims.w > 500 ? 2 : 1);
  const accOptions = (Object.keys(ACCESSORIES) as Accessory[]).filter((a) => a !== 'lazy_susan').map((a) => ({ value: a, label: ACCESSORIES[a] }));
  const align = (mode: AlignMode) => s.alignItems(ids, mode);
  const isWallRow = it.type === 'wall' || it.type === 'corner_wall' || it.type === 'hood';

  if (s.shareMode === 'view') {
    return (
      <div className="flex flex-col h-full">
        {header(multi ? `${sel.length} objek` : it.name, multi ? 'Mode lihat saja' : `${TYPE_LABELS[it.type]} · ${it.id}`)}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-[13px]">
          {sel.map((o) => (
            <div key={o.id} className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="font-bold mb-1.5">{o.name}</div>
              <div className="flex flex-col gap-1" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex justify-between"><span>Tipe</span><span>{TYPE_LABELS[o.type]}</span></div>
                <div className="flex justify-between"><span>Dimensi</span><span className="mono">{Math.round(o.dims.w)} × {Math.round(o.dims.h)} × {Math.round(o.dims.d)} mm</span></div>
                <div className="flex justify-between"><span>Posisi</span><span className="mono">X {Math.round(o.position.x)} · Z {Math.round(o.position.z)}</span></div>
                <div className="flex justify-between items-center"><span>Material</span><span>{o.materials.doorMaterial}</span></div>
                <div className="flex justify-between items-center"><span>Warna</span><span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded" style={{ background: o.materials.doorColor, border: '1px solid var(--border)' }} />{o.materials.doorColor}</span></div>
              </div>
            </div>
          ))}
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Mode lihat saja: properti dikunci.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {header(multi ? `${sel.length} objek terpilih` : it.name, multi ? sel.map((i) => i.name).join(', ') : `${TYPE_LABELS[it.type]} · ${it.id}`)}
      <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <button className="icon-btn" data-tip="Focus (F)" onClick={() => s.ui({ focusRequest: s.focusRequest + 1 })}><Focus size={16} /></button>
        <button className="icon-btn" data-tip={it.visible ? 'Sembunyikan' : 'Tampilkan'} onClick={() => s.patchItems(ids, { visible: !it.visible })}>{it.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
        <button className="icon-btn" data-tip={it.locked ? 'Buka kunci' : 'Kunci'} onClick={() => s.patchItems(ids, { locked: !it.locked })}>{it.locked ? <Lock size={16} /> : <Unlock size={16} />}</button>
        <div className="flex-1" />
        {multi && <>
          <button className="icon-btn" data-tip="Rata kiri" onClick={() => align('left')}><AlignStartVertical size={15} /></button>
          <button className="icon-btn" data-tip="Tengah X" onClick={() => align('centerX')}><AlignCenterVertical size={15} /></button>
          <button className="icon-btn" data-tip="Rata kanan" onClick={() => align('right')}><AlignEndVertical size={15} /></button>
          <button className="icon-btn" data-tip="Rata belakang" onClick={() => align('back')}><AlignStartHorizontal size={15} /></button>
          <button className="icon-btn" data-tip="Rata depan" onClick={() => align('front')}><AlignEndHorizontal size={15} /></button>
          <button className="icon-btn" data-tip="Distribusi X" onClick={() => align('distributeX')}><AlignHorizontalDistributeCenter size={15} /></button>
          <button className="icon-btn" data-tip="Distribusi Z" onClick={() => align('distributeZ')}><AlignVerticalDistributeCenter size={15} /></button>
        </>}
        <button className="icon-btn" data-tip="Hapus (Del)" onClick={() => s.removeItems(ids)}><Trash2 size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!multi && (
          <Section title="Info" defaultOpen={!simple}>
            <Field label="Nama" inline><input className="input" value={it.name} onChange={(e) => s.patchItem(it.id, { name: e.target.value }, false)} onBlur={() => s.pushHistory()} /></Field>
            <Field label="ID" inline><span className="mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>{it.id}</span></Field>
            <Field label="Tipe" inline><span className="text-[12px]">{TYPE_LABELS[it.type]}</span></Field>
            <Field label="Dibuat" inline><span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{timeAgo(it.createdAt)}</span></Field>
            {it.type !== 'island' && it.type !== 'bar' && <Field label="Dinding" inline><Select value={it.wallId ?? ''} onChange={(v) => s.moveToWall(it.id, v || null)} options={[{ value: '', label: 'Bebas (lepas)' }, ...s.walls.map((w) => ({ value: w.id, label: w.name }))]} /></Field>}
          </Section>
        )}
        <Section title="Dimensi">
          <AspectDims item={it} ids={ids} />
          {(it.type === 'wall' || it.type === 'tall' || it.type === 'fridge' || it.type === 'electronic' || it.type === 'hood') && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Tinggi mengikuti Tinggi Total global ({s.settings.globalCabinetHeight} mm) — ubah di Preferences.</p>}
        </Section>
        <Section title="Posisi">
          <Field label="X" inline><Num ids={ids} value={it.position.x} patch={(v) => ({ position: { x: v } })} step={10} /></Field>
          <Field label="Y (tinggi)" inline><Num ids={ids} value={it.position.y} min={0} max={2600} patch={(v) => ({ position: { y: v } })} step={10} /></Field>
          <Field label="Z" inline><Num ids={ids} value={it.position.z} patch={(v) => ({ position: { z: v } })} step={10} /></Field>
          <Field label="Rotasi Y" inline><Num ids={ids} value={it.rotationY} min={-360} max={360} unit="°" step={15} snap={[15]} patch={(v) => ({ rotationY: v })} /></Field>
          <div className="flex gap-1">{[0, 90, 180, 270].map((a) => <button key={a} className="btn btn-secondary btn-sm flex-1" onClick={() => s.patchItems(ids, { rotationY: a })}>{a}°</button>)}</div>
          {it.wallId && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Item menempel di dinding: geser X/Z akan mengurutkan ulang & merapatkan kabinet otomatis. Lepas dari dinding untuk posisi bebas.</p>}
        </Section>
        <Section title="Material & Warna">
          <Field label="Material Pintu" inline tour="door-material"><Select value={m.doorMaterial} onChange={(v) => s.patchItems(ids, { materials: { doorMaterial: v as DoorMaterial } })} options={(['HPL', 'Duco', 'PVC', 'ACP', 'Solid Wood', 'Glass'] as DoorMaterial[]).map((v) => ({ value: v, label: v }))} /></Field>
          <Color ids={ids} label="Warna Pintu" value={m.doorColor} patch={(hex) => ({ materials: { doorColor: hex } })} />
          <Toggle label="Body sama ikut pintu" checked={m.bodyFollowsDoor} onChange={(v) => s.patchItems(ids, { materials: { bodyFollowsDoor: v } })} />
          {!m.bodyFollowsDoor && <Color ids={ids} label="Warna Body" value={m.bodyColor} patch={(hex) => ({ materials: { bodyColor: hex } })} />}
          <Toggle label="Sisi samping ikut warna pintu" checked={m.sidesFollowDoor} onChange={(v) => s.patchItems(ids, { materials: { sidesFollowDoor: v } })} />
          <Toggle label="Toe kick ikut warna pintu" checked={m.toeKickFollowsDoor} onChange={(v) => s.patchItems(ids, { materials: { toeKickFollowsDoor: v } })} />
          <Color ids={ids} tour="handle-color" label="Warna Handle" value={m.handleColor} patch={(hex) => ({ materials: { handleColor: hex } })} />
          {handleContrast < 4.5 && <div className="badge badge-warn"><AlertTriangle size={12} />Handle kurang kontras dengan pintu ({handleContrast.toFixed(1)}:1, min 4.5:1)</div>}
          <div className="flex gap-1"><button className="btn btn-secondary btn-sm flex-1" onClick={() => s.patchItems(ids, { materials: { handleColor: '#1A1A1A' } })}>Hitam Satin</button><button className="btn btn-secondary btn-sm flex-1" onClick={() => s.patchItems(ids, { materials: { handleColor: '#BDBDBD' } })}>Brushed Steel</button></div>
        </Section>
        {CT_TYPES.has(it.type) && !simple && (
          <Section title="Countertop" defaultOpen={false}>
            <Field label="Jenis" inline><Select value={s.settings.countertop.type} onChange={(v) => s.setCountertop({ type: v as CountertopType })} options={(Object.keys(COUNTERTOP_TYPES) as CountertopType[]).map((k) => ({ value: k, label: COUNTERTOP_TYPES[k].name }))} /></Field>
            <Field label="Tebal" inline><DragNumber value={s.settings.countertop.thickness} min={12} max={60} onChange={(v, c) => { if (c) s.setCountertop({ thickness: v }); }} /></Field>
            <Field label="Overhang" inline><DragNumber value={s.settings.countertop.overhang} min={0} max={80} onChange={(v, c) => { if (c) s.setCountertop({ overhang: v }); }} /></Field>
            <Toggle label="Backsplash" checked={s.settings.countertop.backsplash} onChange={(v) => s.setCountertop({ backsplash: v })} />
            <Field label="Tinggi backsplash" inline><DragNumber value={s.settings.countertop.backsplashHeight} min={0} max={700} onChange={(v, c) => { if (c) s.setCountertop({ backsplashHeight: v }); }} /></Field>
            <ColorPicker label="Warna backsplash" value={s.settings.countertop.backsplashColor} onChange={(hex, c) => { if (c) s.setCountertop({ backsplashColor: hex }); }} />
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Countertop kontinu sepanjang base cabinet pada dinding yang sama (pengaturan global proyek).</p>
          </Section>
        )}
        {!simple && <ConfigSection item={it} ids={ids} doorCount={doorCount} />}
        {(BASE_TYPES.has(it.type)) && doorCount > 0 && !cfg.openShelf && (
          <Section title="Layout Internal (aksesoris per pintu)">
            <Field label={doorCount === 2 ? 'Pintu Kiri' : 'Pintu'} inline tour="acc-left"><Select value={cfg.leftAccessory ?? 'shelf'} onChange={(v) => s.patchItems(ids, { config: { leftAccessory: v as Accessory } })} options={accOptions} /></Field>
            {doorCount === 2 && <Field label="Pintu Kanan" inline tour="acc-right"><Select value={cfg.rightAccessory ?? 'shelf'} onChange={(v) => s.patchItems(ids, { config: { rightAccessory: v as Accessory } })} options={accOptions} /></Field>}
            {(cfg.leftAccessory === 'gas_rack' || cfg.rightAccessory === 'gas_rack') && <Field label="Tabung gas" inline><Select value={cfg.gasType ?? '12kg'} onChange={(v) => s.patchItems(ids, { config: { gasType: v as '12kg' | '3kg' | '5.5kg' } })} options={[{ value: '12kg', label: '12 kg (pink)' }, { value: '5.5kg', label: '5.5 kg (biru)' }, { value: '3kg', label: '3 kg (hijau)' }]} /></Field>}
            {(cfg.leftAccessory === 'spice_rack' || cfg.rightAccessory === 'spice_rack') && <Field label="Lebar rak bumbu" inline><Select value={String(cfg.spiceWidth ?? 200)} onChange={(v) => s.patchItems(ids, { config: { spiceWidth: +v as 150 | 200 } })} options={[{ value: '150', label: '150 mm' }, { value: '200', label: '200 mm' }]} /></Field>}
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Aksesoris pull-out ikut beranimasi saat Open Mode: pintu + isi keluar bersama.</p>
          </Section>
        )}
        {it.type === 'corner_base' && <Section title="Layout Internal"><Toggle tour="lazy-susan-toggle" label="Lazy Susan (berputar 360°)" checked={!!cfg.lazySusan} onChange={(v) => s.patchItems(ids, { config: { lazySusan: v } })} /></Section>}
        {!simple && (
          <Section title="Pintu & Laci" defaultOpen={false}>
            <Field label="Jenis handle" inline><Select value={m.handleType} onChange={(v) => s.patchItems(ids, { materials: { handleType: v as HandleType } })} options={(Object.keys(HANDLE_TYPES) as HandleType[]).map((k) => ({ value: k, label: HANDLE_TYPES[k] }))} /></Field>
            <Field label="Panjang handle" inline><Num ids={ids} value={m.handleLength} min={64} max={1200} patch={(v) => ({ materials: { handleLength: v } })} /></Field>
            <Field label="Posisi handle" inline><Select value={m.handlePosition} onChange={(v) => s.patchItems(ids, { materials: { handlePosition: v as HandlePosition } })} options={[{ value: 'top', label: 'Atas' }, { value: 'middle', label: 'Tengah' }, { value: 'bottom', label: 'Bawah' }]} /></Field>
            <Toggle label="Soft-close" checked={m.softClose} onChange={(v) => s.patchItems(ids, { materials: { softClose: v } })} />
          </Section>
        )}
        {!simple && (
          <Section title="Lampu LED" defaultOpen={false}>
            {isWallRow && <Toggle label="LED di bawah kabinet atas" hint="menyinari countertop" checked={led.underCabinet} onChange={(v) => s.patchItems(ids, { led: { underCabinet: v } })} />}
            {(isWallRow || it.type === 'tall' || it.type === 'electronic') && <Toggle label={it.type === 'electronic' ? 'LED di niche appliance' : 'LED di dalam kabinet atas'} checked={led.insideUpper} onChange={(v) => s.patchItems(ids, { led: { insideUpper: v } })} />}
            {(BASE_TYPES.has(it.type) || it.type === 'corner_base' || it.type === 'island') && <Toggle label="LED di dalam kabinet bawah" checked={led.insideBase} onChange={(v) => s.patchItems(ids, { led: { insideBase: v } })} />}
            {(BASE_TYPES.has(it.type) || it.type === 'tall' || it.type === 'island' || it.type === 'electronic') && <Toggle label="LED toe kick (plinth)" hint="mood accent" checked={led.plinth} onChange={(v) => s.patchItems(ids, { led: { plinth: v } })} />}
            <Field label="Temperatur" inline><Select value={String(led.temperature)} onChange={(v) => s.patchItems(ids, { led: { temperature: +v as LedTemp } })} options={LED_TEMPS.map((t) => ({ value: String(t.value), label: t.name }))} /></Field>
            <Field label="Trigger" inline><Select value={led.trigger} onChange={(v) => s.patchItems(ids, { led: { trigger: v as 'always' | 'onOpen' } })} options={[{ value: 'always', label: 'Selalu Menyala' }, { value: 'onOpen', label: 'Nyala saat Pintu Dibuka' }]} /></Field>
            <Field label={`Intensitas ${led.intensity}%`}><input type="range" className="slider" min={0} max={100} value={led.intensity} style={{ background: 'linear-gradient(90deg,#333,#FFE8B0)' }} onChange={(e) => s.patchItems(ids, { led: { intensity: +e.target.value } }, false)} onPointerDown={() => s.pushHistory()} /></Field>
          </Section>
        )}
        {!multi && !simple && (
          <Section title="Validasi" defaultOpen={issues.length > 0}>
            {issues.length === 0 && handleContrast >= 4.5 && <div className="badge badge-ok">Tidak ada masalah</div>}
            {issues.map((w, i) => <div key={i} className={`badge ${w.level === 'warn' ? 'badge-warn' : 'badge-info'}`} style={{ whiteSpace: 'normal', textAlign: 'left' }}>{w.level === 'warn' ? <AlertTriangle size={12} /> : <Info size={12} />}{w.text}</div>)}
            {handleContrast < 4.5 && <div className="badge badge-warn" style={{ whiteSpace: 'normal' }}><AlertTriangle size={12} />Handle kurang kontras ({handleContrast.toFixed(1)}:1)</div>}
          </Section>
        )}
      </div>
    </div>
  );
}

function AspectDims({ item, ids }: { item: Item; ids: string[] }) {
  const [lock, setLock] = useState(false);
  const st = useStore.getState;
  const dragging = useRef(false);
  const apply = (k: 'w' | 'h' | 'd', v: number, commit: boolean) => {
    let dims: Partial<Item['dims']> = { [k]: v };
    if (lock) { const r = v / item.dims[k]; dims = { w: Math.round(item.dims.w * r), h: Math.round(item.dims.h * r), d: Math.round(item.dims.d * r) }; }
    st().patchItems(ids, { dims }, !dragging.current && commit); if (commit) dragging.current = false;
  };
  const num = (k: 'w' | 'h' | 'd', min: number, max: number) => <DragNumber value={item.dims[k]} min={min} max={max} step={10} onDragStart={() => { dragging.current = true; st().pushHistory(); }} onChange={(v, c) => apply(k, v, c)} />;
  const isCorner = item.type === 'corner_base' || item.type === 'corner_wall';
  return (<>
    <Field label={isCorner ? 'Leg A (W)' : 'Lebar (W)'} inline>{num('w', 150, 4000)}</Field>
    <Field label="Tinggi (H)" inline>{num('h', 100, 3200)}</Field>
    <Field label={isCorner ? 'Leg B (D)' : 'Dalam (D)'} inline>{num('d', 100, 2000)}</Field>
    <Toggle label="Kunci rasio aspek" checked={lock} onChange={setLock} />
  </>);
}

function ConfigSection({ item: it, ids, doorCount }: { item: Item; ids: string[]; doorCount: number }) {
  const s = useStore();
  const cfg = it.config;
  const p = (c: ItemPatch['config']) => s.patchItems(ids, { config: c });
  const t = it.type;
  const corniceControls = (
    <>
      <Toggle tour="cornice-toggle" label="Cornice / Topi" checked={!!cfg.cornice} onChange={(v) => p({ cornice: v })} />
      {cfg.cornice && <>
        <Field label="Tinggi cornice" inline><Num ids={ids} value={cfg.corniceHeight ?? 50} min={30} max={150} patch={(v) => ({ config: { corniceHeight: v } })} /></Field>
        <Field label="Lebar overhang topi" inline><Num ids={ids} value={cfg.corniceWidth ?? 40} min={10} max={120} patch={(v) => ({ config: { corniceWidth: v } })} /></Field>
        <Toggle label="Lampu di bawah topi" checked={!!cfg.corniceLight} onChange={(v) => p({ corniceLight: v })} />
      </>}
    </>
  );
  const content = () => {
    if (BASE_TYPES.has(t)) return (<>
      <Field label="Jumlah pintu" inline tour="door-count"><Select value={String(doorCount)} onChange={(v) => p({ doorCount: +v as 0 | 1 | 2 })} options={[{ value: '0', label: 'Tanpa pintu (laci)' }, { value: '1', label: '1 pintu' }, { value: '2', label: '2 pintu' }]} /></Field>
      {doorCount === 1 && <Field label="Engsel" inline><Select value={cfg.hingeSide ?? 'left'} onChange={(v) => p({ hingeSide: v as 'left' | 'right' })} options={[{ value: 'left', label: 'Kiri' }, { value: 'right', label: 'Kanan' }]} /></Field>}
      {t !== 'sink_base' && <Field label="Jumlah laci" inline><Select value={String(cfg.drawerCount ?? (t === 'drawer_base' ? 3 : t === 'cooktop_base' ? 1 : 0))} onChange={(v) => p({ drawerCount: +v })} options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} laci` }))} /></Field>}
      <Toggle tour="open-shelf-toggle" label="Open shelf (tanpa pintu/laci)" checked={!!cfg.openShelf} onChange={(v) => p({ openShelf: v })} />
      <Field label="Tinggi toe kick" inline><Num ids={ids} value={cfg.toeKickHeight ?? s.settings.toeKick} min={60} max={150} patch={(v) => ({ config: { toeKickHeight: v } })} /></Field>
    </>);
    if (t === 'wall') return (<>
      <Field label="Jumlah pintu" inline><Select value={String(cfg.doorCount ?? (it.dims.w > 600 ? 2 : 1))} onChange={(v) => p({ doorCount: +v as 1 | 2 })} options={[{ value: '1', label: '1 pintu' }, { value: '2', label: '2 pintu' }]} /></Field>
      <Toggle tour="glass-door-toggle" label="Pintu kaca (glass door)" checked={!!cfg.glassDoor} onChange={(v) => p({ glassDoor: v })} />
      <Field label="Jenis pintu" inline><Select value={cfg.doorType ?? (cfg.liftUp ? 'liftup' : 'swing')} onChange={(v) => p({ doorType: v as 'swing' | 'liftup', liftUp: v === 'liftup' })} options={[{ value: 'swing', label: 'Swing (buka samping)' }, { value: 'liftup', label: 'Pull-up (buka ke atas)' }]} /></Field>
      <Toggle tour="double-stack-toggle" label="Double stack (2 tier)" checked={!!cfg.doubleStack} onChange={(v) => p({ doubleStack: v })} />
      {cfg.doubleStack && <Field label="Tinggi tier atas" inline><Num ids={ids} value={cfg.upperTierHeight ?? 350} min={200} max={600} patch={(v) => ({ config: { upperTierHeight: v } })} /></Field>}
      {corniceControls}
    </>);
    if (t === 'tall') return (<>
      <Field label="Jumlah pintu" inline><Select value={String(cfg.doorCount ?? (it.dims.w > 600 ? 2 : 1))} onChange={(v) => p({ doorCount: +v as 1 | 2 })} options={[{ value: '1', label: '1 pintu' }, { value: '2', label: '2 pintu' }]} /></Field>
      {corniceControls}
    </>);
    if (t === 'corner_base' || t === 'corner_wall') return (<>
      <Field label="Jenis pintu" inline><Select value={cfg.cornerDoorStyle ?? 'bifold'} onChange={(v) => p({ cornerDoorStyle: v as 'bifold' | 'two' | 'one' })} options={[{ value: 'bifold', label: 'Bi-fold 168°' }, { value: 'two', label: '2 pintu' }, { value: 'one', label: '1 pintu + panel' }]} /></Field>
      <Field label="Orientasi" inline><Select value={cfg.cornerOrientation ?? 'auto'} onChange={(v) => p({ cornerOrientation: v as 'auto' | 'left' | 'right' })} options={[{ value: 'auto', label: 'Auto-detect tetangga' }, { value: 'left', label: 'Buka ke kanan (sudut kiri)' }, { value: 'right', label: 'Buka ke kiri (sudut kanan)' }]} /></Field>
      {t === 'corner_wall' && corniceControls}
      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Lebar pintu kiri/kanan = Leg A/B − kedalaman. Handle dibuat pada kedua sub-pintu.</p>
    </>);
    if (t === 'fridge') return (<>
      <Field label="Jenis kulkas" inline tour="fridge-type"><Select value={cfg.fridgeType ?? 'sbs'} onChange={(v) => p({ fridgeType: v as FridgeType })} options={[{ value: 'single', label: '1 pintu' }, { value: 'french', label: '2 pintu French' }, { value: 'sbs', label: 'Side-by-side' }]} /></Field>
      <Field label="Lebar kulkas" inline><Num ids={ids} value={cfg.fridgeW ?? 900} min={500} max={1100} patch={(v) => ({ config: { fridgeW: v }, dims: { w: Math.max(it.dims.w, v + 40) } })} /></Field>
      <Field label="Tinggi kulkas" inline><Num ids={ids} value={cfg.fridgeH ?? 1750} min={1200} max={2000} patch={(v) => ({ config: { fridgeH: v } })} /></Field>
      <Field label="Dalam kulkas" inline><Num ids={ids} value={cfg.fridgeD ?? 650} min={500} max={800} patch={(v) => ({ config: { fridgeD: v } })} /></Field>
      {corniceControls}
      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Kulkas fisik tetap; filler cabinet di atasnya otomatis = tinggi total − tinggi kulkas − gap.</p>
    </>);
    if (t === 'electronic') return (<>
      <Field label="Preset" inline><Select value={cfg.electronicPreset ?? 'custom'} onChange={(v) => { const pr = ELECTRONIC_PRESETS.find((x) => x.id === v)!; p(v === 'custom' ? { electronicPreset: v } : { electronicPreset: v, slot1: pr.slot1, slot2: pr.slot2 }); }} options={ELECTRONIC_PRESETS.map((x) => ({ value: x.id, label: x.name }))} /></Field>
      <Field label="Slot 1 (bawah)" inline tour="slot1"><Select value={cfg.slot1 ?? 'magiccom'} onChange={(v) => p({ slot1: v as Slot1, electronicPreset: 'custom' })} options={(Object.keys(SLOT1_OPTIONS) as Slot1[]).map((k) => ({ value: k, label: SLOT1_OPTIONS[k] }))} /></Field>
      <Field label="Slot 2 (atas)" inline tour="slot2"><Select value={cfg.slot2 ?? 'oven'} onChange={(v) => p({ slot2: v as Slot2, electronicPreset: 'custom' })} options={(Object.keys(SLOT2_OPTIONS) as Slot2[]).map((k) => ({ value: k, label: SLOT2_OPTIONS[k] }))} /></Field>
      {corniceControls}
      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Slot 1 sejajar countertop (850 mm); Magic Com pada tray rel teleskopik keluar 350 mm saat Open Mode.</p>
    </>);
    if (t === 'hood') return (<>
      <Field label="Tinggi canopy (bawah filler)" inline tour="hood-height"><Num ids={ids} value={cfg.hoodHeight ?? 70} min={40} max={150} patch={(v) => ({ config: { hoodHeight: v } })} /></Field>
      {corniceControls}
    </>);
    if (t === 'island') return (<>
      <Field label="Pintu per sisi" inline><Select value={String(cfg.islandDoorsPerSide ?? 2)} onChange={(v) => p({ islandDoorsPerSide: +v })} options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} pintu` }))} /></Field>
      <Field label="Stools" inline tour="island-stools"><Select value={String(cfg.stools ?? 0)} onChange={(v) => p({ stools: +v })} options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: n ? `${n} stool` : 'Tanpa stool' }))} /></Field>
    </>);
    if (t === 'bar') return (<>
      <Field label="Overhang" inline><Num ids={ids} value={cfg.barOverhang ?? 300} min={150} max={450} patch={(v) => ({ config: { barOverhang: v } })} /></Field>
      <Toggle tour="bar-footrest" label="Foot rest pipa stainless Ø25" checked={cfg.footRest !== false} onChange={(v) => p({ footRest: v })} />
      <Field label="Stools" inline tour="island-stools"><Select value={String(cfg.stools ?? 0)} onChange={(v) => p({ stools: +v })} options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n ? `${n} stool` : 'Tanpa stool' }))} /></Field>
    </>);
    if (t === 'dishwasher') return <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Panel depan drop-down dengan strip kontrol LED. Pintu terbuka 85° saat Open Mode.</p>;
    return <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Komponen kustom: {cfg.customShapes?.length ?? 0} shape.</p>;
  };
  return <Section title={`Konfigurasi ${TYPE_LABELS[t]}`}>{content()}</Section>;
}

// ─── Properti General: tampil saat tidak ada objek terpilih (klik area kosong) ───
function GeneralProps({ embedded, header }: { embedded?: boolean; header: (t: string, s?: string) => React.ReactNode }) {
  const s = useStore();
  const ct = s.settings.countertop;
  if (s.shareMode === 'view') {
    const counts = s.items.reduce<Record<string, number>>((a, i) => { a[i.type] = (a[i.type] ?? 0) + 1; return a; }, {});
    return (
      <div className="flex flex-col h-full">
        {header('Properti General', 'Mode lihat saja')}
        <div className="p-4 flex flex-col gap-3 text-[13px]">
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="panel-title mb-2">Ringkasan Proyek</div>
            <div className="flex flex-col gap-1">
              {Object.entries(counts).map(([t, n]) => <div key={t} className="flex justify-between"><span>{TYPE_LABELS[t as Item['type']]}</span><span className="mono">{n}</span></div>)}
              {!s.items.length && <span style={{ color: 'var(--text-tertiary)' }}>Proyek kosong.</span>}
            </div>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Mode lihat saja: pengaturan global dikunci. Klik objek untuk melihat ringkasannya.</p>
        </div>
      </div>
    );
  }
  const counts = s.items.reduce<Record<string, number>>((a, i) => { a[i.type] = (a[i.type] ?? 0) + 1; return a; }, {});
  const baseLen = s.items.filter((i) => ['base', 'sink_base', 'cooktop_base', 'drawer_base', 'dishwasher'].includes(i.type)).reduce((a, i) => a + i.dims.w, 0);
  return (
    <div className="flex flex-col h-full">
      {header('Properti General', 'Pengaturan global seluruh dapur')}
      <div className="flex-1 overflow-y-auto">
        <Section title="Ringkasan Proyek" defaultOpen={false}>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex flex-col gap-1 text-[13px]">
              {Object.entries(counts).map(([t, n]) => <div key={t} className="flex justify-between"><span>{TYPE_LABELS[t as Item['type']]}</span><span className="mono">{n}</span></div>)}
              {!s.items.length && <span style={{ color: 'var(--text-tertiary)' }}>Belum ada komponen. Buka Panel Komponen (K) atau Magic Generator.</span>}
              {!!s.items.length && <div className="flex justify-between pt-1 mt-1" style={{ borderTop: '1px solid var(--border)' }}><span>Total panjang base</span><span className="mono">{(baseLen / 1000).toFixed(2)} m</span></div>}
            </div>
          </div>
        </Section>
        <Section title="Pengaturan Global Dapur">
          <Field label="Tinggi Total Kabinet" inline tour="global-height"><DragNumber value={s.settings.globalCabinetHeight} min={1800} max={3200} step={10} onDragStart={s.pushHistory} onChange={(v, c) => { if (c) s.setGlobalHeight(v); }} /></Field>
          <Field label="Tinggi base" inline><DragNumber value={s.settings.baseHeight} min={700} max={1000} onChange={(v, c) => { if (c) s.setSettings({ baseHeight: v }); }} /></Field>
          <Field label="Gap base–wall" inline><DragNumber value={s.settings.wallGap} min={400} max={700} onChange={(v, c) => { if (c) s.setSettings({ wallGap: v }); }} /></Field>
          <Field label="Kedalaman wall" inline><DragNumber value={s.settings.wallDepth} min={280} max={400} onChange={(v, c) => { if (c) s.setSettings({ wallDepth: v }); }} /></Field>
          <Field label="Toe kick" inline><DragNumber value={s.settings.toeKick} min={60} max={150} onChange={(v, c) => { if (c) s.setSettings({ toeKick: v }); }} /></Field>
          <Field label="Snap gizmo" inline tour="snap-size"><Select value={String(s.snapSize)} onChange={(v) => s.ui({ snapSize: +v })} options={[{ value: '10', label: '1 cm' }, { value: '50', label: '5 cm' }, { value: '100', label: '10 cm' }]} /></Field>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Puncak kabinet atas = {Math.round(s.settings.globalCabinetHeight / 10)} cm. Dasar kabinet atas = puncak backsplash. Base tetap {Math.round(s.settings.baseHeight / 10)} cm.</p>
        </Section>
        <Section title="Countertop & Backsplash">
          <Field label="Jenis" inline tour="countertop-type"><Select value={ct.type} onChange={(v) => s.setCountertop({ type: v as CountertopType })} options={(Object.keys(COUNTERTOP_TYPES) as CountertopType[]).map((k) => ({ value: k, label: COUNTERTOP_TYPES[k].name }))} /></Field>
          <Field label="Tebal" inline><DragNumber value={ct.thickness} min={12} max={60} onChange={(v, c) => { if (c) s.setCountertop({ thickness: v }); }} /></Field>
          <Field label="Overhang" inline><DragNumber value={ct.overhang} min={0} max={80} onChange={(v, c) => { if (c) s.setCountertop({ overhang: v }); }} /></Field>
          <Toggle label="Backsplash subway tile" checked={ct.backsplash} onChange={(v) => s.setCountertop({ backsplash: v })} />
          <Field label="Tinggi backsplash" inline><DragNumber value={ct.backsplashHeight} min={100} max={900} onChange={(v, c) => { if (c) s.setBacksplashHeight(v); }} /></Field>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Mengubah tinggi backsplash menaik/menurunkan dasar kabinet atas. Puncak kabinet atas tetap di {Math.round(s.settings.globalCabinetHeight / 10)} cm.</p>
          <ColorPicker label="Warna backsplash" value={ct.backsplashColor} onChange={(hex, c) => { if (c) s.setCountertop({ backsplashColor: hex }); }} />
        </Section>
        <GlobalCabinetSection />
        <Section title="Canvas & Ruangan">
          <ColorPicker label="Warna canvas / background" value={s.settings.appearance.canvasColor} onChange={(hex, c) => { if (c) s.setSettings({ appearance: { ...s.settings.appearance, canvasColor: hex } }); }} />
          <ColorPicker label="Warna dinding" value={s.settings.appearance.wallColor} onChange={(hex, c) => { if (c) s.setSettings({ appearance: { ...s.settings.appearance, wallColor: hex } }); }} />
          <ColorPicker label="Warna lantai" value={s.settings.appearance.floorColor} onChange={(hex, c) => { if (c) s.setSettings({ appearance: { ...s.settings.appearance, floorColor: hex } }); }} />
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Warna dinding dan lantai di viewport 3D. Nilai ini tersimpan bersama proyek.</p>
        </Section>
        <Section title="Tampilan">
          <Toggle label="Grid lantai" checked={s.showGrid} onChange={(v) => s.ui({ showGrid: v })} />
          <Toggle label="Shadows (bayangan)" checked={s.showShadows} onChange={(v) => s.ui({ showShadows: v })} />
          <Toggle label="Orang (animasi)" hint="Memasak, mencuci, berjalan" checked={s.showPeople} onChange={(v) => s.setShowPeople(v)} />
          <Toggle label="X-Ray (pintu transparan)" checked={s.xray} onChange={(v) => s.ui({ xray: v })} />
          <Toggle label="Explode view" checked={s.explode} onChange={(v) => s.ui({ explode: v })} />
          <Field label={`Kecerahan viewport ${Math.round(s.brightness * 100)}%`} tour="brightness"><input type="range" className="slider" min={40} max={130} step={5} value={Math.round(s.brightness * 100)} style={{ background: 'linear-gradient(90deg,#333,#FFE8B0)' }} onChange={(e) => s.setBrightness(+e.target.value / 100)} /></Field>
        </Section>
        {!embedded && <p className="p-4 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Klik objek di viewport untuk mengedit properti per-kabinet.</p>}
      </div>
    </div>
  );
}
