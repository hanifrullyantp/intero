import { useEffect, useState } from 'react';
import { useStore, type RightTab } from '../core/store';
import type { Item, ItemConfig, DoorStyle, OpeningDirection } from '../models/types';
import { KITCHEN_STANDARDS } from '../config/standards';
import { HARDWARE, ACCESSORY_OPTIONS, MATERIALS, getColor } from '../config/materials';
import { LIBRARY, getEntry, DEFAULT_CONFIG } from '../config/library';
import { applyFix } from '../engine/constraints';
import { r1, footprint } from '../utils/geometry';
import { generateParts } from '../engine/parametric';
import MaterialStudio from './MaterialStudio';
import LayersPanel from './LayersPanel';
import DisplayTab from './DisplayTab';
import { isTopTier, isLowerTier, stackAbove } from '../engine/kitchenRules';
import { fridgeSize, dispenserSize, housingLayout } from '../engine/applianceHousing';
import { DEFAULT_MAGICCOM, ELECTRO_DEFS, ELECTRO_ORDER, appliancesOf, electronicsLayout, type ElectroKey } from '../engine/electronicsTower';
import { applyProjectDimensions } from '../engine/projectDimensions';

const INTERIOR_OPTIONS: [string, string][] = [
  ['dish', 'Rak piring tarik'],
  ['spice', 'Rak bumbu tarik'],
  ['gas', 'Rak gas 12 kg'],
  ['cutlery', 'Tatakan sendok'],
];
import GlobalSettings from './GlobalSettings';
import { OpenControls } from './OpenModePanel';
import { LibIcon, Lock, LockOpen, SlidersHorizontal, Palette, Layers, TriangleAlert, Monitor, DoorOpen } from './icons';

export function SliderField({ label, value, onChange, min, max, step = 1, unit = 'cm' }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5"><span style={{ color: 'var(--text-secondary)' }}>{label}</span><span className="font-mono">{value} {unit}</span></div>
      <div className="flex items-center gap-2">
        <input type="range" className="flex-1" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <input type="number" className="input w-20! font-mono" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, parseFloat(e.target.value) || min)))} />
      </div>
    </div>
  );
}

export function NumberField({ label, value, onChange, step = 0.1, min = 0, max = 1000, unit = 'cm', className = '' }: { label?: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string; className?: string }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  const commit = (v: number) => {
    if (Number.isNaN(v)) return setTxt(String(value));
    const c = Math.max(min, Math.min(max, Math.round(v * 10) / 10));
    setTxt(String(c));
    if (c !== value) onChange(c);
  };
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      <div className="flex items-center mt-0.5">
        <button className="h-6 w-5 text-[10px] bg-[#0f1923] border border-[#2a3a4a] rounded-l text-slate-400 hover:text-white" onClick={() => commit(value - step)} tabIndex={-1}>
          −
        </button>
        <input
          className="input rounded-none! border-x-0! text-center h-6 font-mono"
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onBlur={() => commit(parseFloat(txt))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(parseFloat(txt));
            if (e.key === 'ArrowUp') commit(value + step);
            if (e.key === 'ArrowDown') commit(value - step);
          }}
        />
        <button className="h-6 w-5 text-[10px] bg-[#0f1923] border border-[#2a3a4a] rounded-r text-slate-400 hover:text-white" onClick={() => commit(value + step)} tabIndex={-1}>
          +
        </button>
        <span className="text-[10px] text-slate-500 ml-1 w-5">{unit}</span>
      </div>
    </label>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <div className="section-h" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="text-[9px]">{open ? '▼' : '▶'}</span>
      </div>
      {open && <div className="px-3 pb-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

function IssuesList() {
  const issues = useStore((s) => s.issues);
  const project = useStore((s) => s.project);
  const { select, setItems, toast, requestFit } = useStore.getState();
  if (!issues.length) return <div className="text-xs text-[#66bb6a] px-3 py-2">✓ No design issues detected</div>;
  const color = { error: 'text-[#ef5350] border-[#ef5350]/40', warning: 'text-[#ffa726] border-[#ffa726]/40', info: 'text-[#4fc3f7] border-[#4fc3f7]/40' };
  return (
    <div className="flex flex-col gap-1.5 px-3 pb-3">
      {issues.map((i) => (
        <div key={i.id} className={`text-[11px] rounded border bg-[#0f1923]/60 p-2 ${color[i.severity]}`}>
          <div className="text-slate-300">{i.message}</div>
          <div className="flex gap-1 mt-1">
            <button className="chip" onClick={() => { select(i.itemIds); requestFit(); }}>
              Show on plan
            </button>
            {i.fix && (
              <button
                className="chip active"
                onClick={() => {
                  setItems(applyFix(project, i));
                  toast({ severity: 'success', message: 'Auto-fix applied', ttl: 1500 });
                }}
              >
                Fix automatically
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectProps() {
  const project = useStore((s) => s.project);
  const issues = useStore((s) => s.issues);
  const { setProject } = useStore.getState();
  const cabinets = project.items.filter((i) => i.kind === 'cabinet');
  const parts = project.items.flatMap((i) => generateParts(i, project.materials)).filter((p) => p.countInList !== false);
  return (
    <>
      <Section title="Project">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="card p-2">
            <div className="label">Type</div>
            <div className="capitalize">{project.type} {project.type === 'kitchen' ? `· ${project.layout}` : ''}</div>
          </div>
          <div className="card p-2">
            <div className="label">Room</div>
            <div>{project.room.width} × {project.room.depth} cm</div>
          </div>
          <div className="card p-2">
            <div className="label">Cabinets</div>
            <div>{cabinets.length} units</div>
          </div>
          <div className="card p-2">
            <div className="label">Parts</div>
            <div>{parts.reduce((s, p) => s + p.qty, 0)} pcs</div>
          </div>
        </div>
        <NumberField label="Ceiling height" value={project.room.ceilingHeight} step={1} min={200} max={400} onChange={(v) => setProject({ ...project, room: { ...project.room, ceilingHeight: v, walls: project.room.walls.map((w) => ({ ...w, height: v })) } })} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Room width (X)" value={project.room.width} step={1} min={60} max={2000} onChange={(v) => setProject({ ...project, room: { ...project.room, width: v } })} />
          <NumberField label="Room depth (Y)" value={project.room.depth} step={1} min={60} max={2000} onChange={(v) => setProject({ ...project, room: { ...project.room, depth: v } })} />
        </div>
      </Section>
      <Section title={`Design validation (${issues.length})`}>
        <IssuesList />
      </Section>
      <Section title="Tips" defaultOpen={false}>
        <ul className="text-[11px] text-slate-400 list-disc pl-4 space-y-1">
          <li>Click a cabinet in 2D or 3D to edit its properties here.</li>
          <li>Drag components from the library onto the plan; wall cabinets auto-align over base cabinets.</li>
          <li>Alt+click cycles through overlapping items (base vs wall).</li>
          <li>Double-click a cabinet for the detailed editor, right-click for the context menu.</li>
        </ul>
      </Section>
    </>
  );
}

function ItemProps({ item }: { item: Item }) {
  const project = useStore((s) => s.project);
  const { updateItem, updateItemConfig, removeItems, duplicateItems, setItems, toast, setUI } = useStore.getState();
  const c = item.config;
  const upd = (patch: Partial<Item>) => updateItem(item.id, patch);
  const cfg = (patch: Partial<ItemConfig>) => updateItemConfig(item.id, patch);
  const widths = item.category === 'wall' ? KITCHEN_STANDARDS.wall_cabinet.standard_widths : item.category === 'tall' ? KITCHEN_STANDARDS.tall_cabinet.standard_widths : KITCHEN_STANDARDS.base_cabinet.standard_widths;
  const sameCategory = LIBRARY.filter((l) => l.category === item.category && l.kind === item.kind);
  const f = footprint(item);

  const changeType = (subtype: string) => {
    const e = getEntry(subtype);
    upd({ subtype, name: e.name, config: { ...c, ...e.config, accessories: [...(e.config.accessories ?? [])], materials: c.materials } });
  };
  const applyToSimilar = () => {
    const items = project.items.map((i) => (i.id !== item.id && i.subtype === item.subtype ? { ...i, height: item.height, depth: item.depth, config: { ...item.config, accessories: [...item.config.accessories] } } : i));
    setItems(items);
    toast({ severity: 'success', message: `Applied to all ${item.name} cabinets` });
  };
  const resetDefault = () => {
    const e = getEntry(item.subtype);
    upd({ width: e.width, height: e.height, depth: e.depth, config: { ...DEFAULT_CONFIG, ...e.config, accessories: [...(e.config.accessories ?? [])], materials: { useDefault: true } } });
  };

  return (
    <>
      <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bg-selected)', color: 'var(--accent)' }}><LibIcon id={item.subtype} size={18} /></div>
        <div className="min-w-0 flex-1">
          <input className="input font-semibold py-0.5!" value={item.name} onChange={(e) => upd({ name: e.target.value })} />
          <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {item.subtype.includes('corner') ? `L${item.width} × R${item.depth} × D${c.cornerDepth ?? 60} × H${item.height}` : `W${item.width} × H${item.height} × D${item.depth}`} cm · Z {item.elevation}
          </div>
        </div>
        <button className="tb-btn" title="Lock position" onClick={() => upd({ locked: !item.locked })}>
          {item.locked ? <Lock size={14} /> : <LockOpen size={14} />}
        </button>
      </div>
      <Section title="Dimensions">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Width" value={item.width} min={5} max={400} onChange={(v) => upd({ width: v })} />
          <NumberField label="Height" value={item.height} min={1} max={300} onChange={(v) => upd({ height: v })} />
          <NumberField label="Depth" value={item.depth} min={1} max={200} onChange={(v) => upd({ depth: v })} />
        </div>
        <div className="flex flex-wrap gap-1">
          {widths.map((w) => (
            <button key={w} className={`chip ${item.width === w ? 'active' : ''}`} onClick={() => upd({ width: w })}>
              {w}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Pos X" value={item.x} min={-500} max={2000} onChange={(v) => upd({ x: v })} />
          <NumberField label="Pos Y (depth)" value={item.y} min={-500} max={2000} onChange={(v) => upd({ y: v })} />
          <NumberField label="Elev Z (height)" value={item.elevation} min={0} max={300} onChange={(v) => upd({ elevation: v })} />
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          <span className="label">Quick elev:</span>
          {([['Floor', 0], ['Base Top', 87], ['Wall Bottom', 135], ['Ceil', project.room.ceilingHeight]] as const).map(([l, v]) => (
            <button key={l} className={`chip ${item.elevation === v ? 'active' : ''}`} onClick={() => upd({ elevation: v })}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="label">Rotation</span>
          {[0, 90, 180, 270].map((r) => (
            <button key={r} className={`chip ${item.rotation === r ? 'active' : ''}`} onClick={() => upd({ rotation: r as Item['rotation'] })}>
              {r}°
            </button>
          ))}
          <span className="text-[10px] text-slate-500 ml-auto">
            footprint {r1(f.w)}×{r1(f.h)}
          </span>
        </div>
      </Section>

      {item.kind === 'cabinet' && item.subtype.includes('corner') && (
        <Section title="Corner Cabinet Settings (V3 True Corner)">
          <div className="label">Jenis sudut</div>
          <div className="grid grid-cols-2 gap-1">
            {([['l_true', 'L-Shape True Corner'], ['lazy_susan', 'Lazy Susan'], ['blind', 'Blind Corner'], ['magic', 'Magic Corner']] as const).map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5 text-[11px]"><input type="radio" checked={(c.cornerType ?? 'l_true') === v} onChange={() => cfg({ cornerType: v })} /> {l}</label>
            ))}
          </div>
          <div className="label mt-1">Dimensi fleksibel (boleh asimetris)</div>
          <SliderField label="Sisi kiri (W)" value={item.width} min={30} max={200} onChange={(v) => upd({ width: v })} />
          <SliderField label="Sisi kanan (D)" value={item.depth} min={30} max={200} onChange={(v) => upd({ depth: v })} />
          <SliderField label="Depth / arm (= countertop)" value={c.cornerDepth ?? (item.category === 'wall' ? 33 : 60)} min={item.category === 'wall' ? 25 : 40} max={70} onChange={(v) => cfg({ cornerDepth: v })} />
          <div className="flex flex-wrap gap-1">
            {[['70×70', 70, 70], ['75×75', 75, 75], ['80×80', 80, 80], ['85×85', 85, 85], ['90×90', 90, 90], ['100×100', 100, 100], ['75×85', 75, 85], ['90×75', 90, 75], ['90×80', 90, 80]].map(([l, a, b]) => (
              <button key={l as string} className={`chip ${item.width === a && item.depth === b ? 'active' : ''}`} onClick={() => upd({ width: a as number, depth: b as number })}>{l as string}</button>
            ))}
          </div>
          <div className="text-[10px] opacity-60">Internal L space: {r1(item.width - (c.cornerDepth ?? 60))} × {r1(item.depth - (c.cornerDepth ?? 60))} cm · corner square {c.cornerDepth ?? 60}×{c.cornerDepth ?? 60} · min 60×60</div>
          <div className="label mt-1">Konfigurasi pintu (akses)</div>
          <div className="flex flex-col gap-1">
            {([
              ['both', 'Both Sides (recommended)', 'Pintu di sisi kiri + kanan — akses penuh'],
              ['bifold', 'Bi-fold Corner Door', '2 panel lipat 168° di sudut, sisa dilengkapi pintu'],
              ['single', 'Single door 168°', '1 pintu besar di depan, sisi lain blind panel'],
              ['left_only', 'Left Only', 'Pintu kiri saja, kanan blind corner'],
              ['right_only', 'Right Only', 'Pintu kanan saja, kiri blind corner'],
              ['open', 'Open (tanpa pintu)', 'Rak terbuka'],
            ] as const).map(([v, l, d]) => (
              <label key={v} className={`flex items-start gap-2 text-[11px] p-1.5 rounded border cursor-pointer ${((c.cornerDoorModel ?? 'both') === v || (v === 'both' && c.cornerDoorModel === 'double')) ? 'border-[var(--accent)] bg-[var(--bg-selected)]' : 'border-[var(--border)]'}`}>
                <input type="radio" className="mt-0.5" checked={(c.cornerDoorModel ?? 'both') === v || (v === 'both' && c.cornerDoorModel === 'double')} onChange={() => cfg({ cornerDoorModel: v })} />
                <span><b>{l}</b><br /><span className="opacity-60">{d}</span></span>
              </label>
            ))}
          </div>
          {(c.cornerDoorModel ?? 'both') !== 'open' && (
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Pintu depan (A) cm" value={c.cornerLeftDoor ?? Math.max(0, item.width - (c.cornerDepth ?? 60))} min={0} max={200} onChange={(v) => cfg({ cornerLeftDoor: v })} />
              <NumberField label="Pintu sisi (B) cm" value={c.cornerRightDoor ?? Math.max(0, item.depth - (c.cornerDepth ?? 60))} min={0} max={200} onChange={(v) => cfg({ cornerRightDoor: v })} />
            </div>
          )}
          <div className="text-[10px] opacity-60">Panjang 0 = mulut L terbuka tanpa pintu. Kosongkan (default) = seluruh bukaan.</div>
          <div className="text-[10px] opacity-60">Top table L-shape FULL menutup kedua sisi + sudut ({c.cornerDepth ?? 60}cm depth, rata).</div>
          {(c.cornerLeftDoor ?? 45) > (c.cornerDepth ?? 60) || (c.cornerRightDoor ?? 45) > (c.cornerDepth ?? 60) ? <div className="text-[11px]" style={{ color: 'var(--error)' }}>Panel melebihi corner depth — pintu tidak bisa menutup</div> : null}
          {(c.cornerLeftDoor ?? 45) > 60 || (c.cornerRightDoor ?? 45) > 60 ? <div className="text-[11px]" style={{ color: 'var(--warning)' }}>Panel &gt; 60cm terlalu berat untuk engsel 168°</div> : null}
          {(c.cornerLeftDoor ?? 45) < 30 || (c.cornerRightDoor ?? 45) < 30 ? <div className="text-[11px]" style={{ color: 'var(--warning)' }}>Panel &lt; 30cm tidak praktis</div> : null}
          <label><span className="label">Engsel</span>
            <select className="input mt-0.5" value={c.cornerHinge ?? '168_soft'} onChange={(e) => cfg({ cornerHinge: e.target.value })}>
              <option value="168_soft">168° Soft-Close</option>
              <option value="165_std">165° Standard</option>
              <option value="110_std">110° Standard</option>
            </select>
          </label>
          <div className="label mt-1">Countertop over corner</div>
          <div className="flex gap-1">
            <button className={`chip ${(project.settings.countertopMode ?? 'flat') === 'flat' ? 'active' : ''}`} onClick={() => useStore.getState().setSettings({ countertopMode: 'flat' })}>Flat (recommended)</button>
            <button className={`chip ${project.settings.countertopMode === 'shape' ? 'active' : ''}`} onClick={() => { useStore.getState().setSettings({ countertopMode: 'shape' }); toast({ severity: 'warning', message: 'Follow-shape mode dapat menyebabkan countertop overflow di sudut' }); }}>Follow shape</button>
          </div>
          <div className="text-[10px] opacity-60">Flat: depth konsisten, rata mengikuti dinding, tanpa overflow.</div>
          <button className="btn" onClick={() => { setUI({ rightTab: 'open', rightOpen: true }); useStore.getState().setDoorsOpen(true, 'selected'); }}>Preview Opening</button>
        </Section>
      )}

      {item.kind === 'cabinet' && item.category === 'wall' && item.subtype !== 'wall_hood' && (
        <Section title="Kabinet atas — susun 2 tingkat">
          {isTopTier(item, project.items) ? (
            <button className="btn-primary" onClick={() => {
              const up = stackAbove(item, project.room.ceilingHeight, project.materials.crown ? project.materials.crownHeight ?? 6 : 0);
              if (!up) return toast({ severity: 'warning', message: 'Ruang ke plafon kurang dari 20 cm — turunkan kabinet atau naikkan plafon' });
              useStore.getState().setProject(applyProjectDimensions({ ...project, items: [...project.items, up] }, { totalHeight: up.elevation + up.height }));
              useStore.getState().select([up.id]);
              toast({ severity: 'success', message: `Susun atas ${up.height} cm ditambahkan (pintu flip-up)` });
            }}>Tambah susun atas</button>
          ) : (
            <div className="text-[11px] opacity-70">Kabinet ini sudah punya susun di atasnya.</div>
          )}
          {!isLowerTier(item, project.items) && <div className="text-[11px] opacity-70">Ini susun atas. Tinggi & lebarnya bebas diubah; kabinet di atas hood menyesuaikan otomatis.</div>}
          <div className="text-[10px] opacity-60">Untuk semua kabinet atas sekaligus: tab Props tanpa seleksi → Global settings.</div>
        </Section>
      )}

      {item.kind === 'cabinet' && (
        <>
          <Section title="Cabinet type" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-1">
              {sameCategory.map((e) => (
                <button key={e.id} className={`chip text-left truncate flex items-center gap-1 ${item.subtype === e.id ? 'active' : ''}`} onClick={() => changeType(e.id)} title={e.description}>
                  <LibIcon id={e.id} size={12} />
                  {e.name}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Internal layout">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Shelves" value={c.shelves} step={1} min={0} max={12} unit="" onChange={(v) => cfg({ shelves: v })} />
              <div>
                <span className="label">Shelf spacing</span>
                <div className="text-xs mt-1 font-mono text-slate-300">{c.shelves ? r1((item.height - (c.hasToeKick && item.category !== 'wall' ? 10 : 0) - 3.6) / (c.shelves + 1)) : '—'} cm</div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={c.adjustableShelves} onChange={(e) => cfg({ adjustableShelves: e.target.checked })} /> Adjustable shelves (shelf pins)
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={c.hasToeKick} onChange={(e) => cfg({ hasToeKick: e.target.checked })} /> Toe kick (10 cm)
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={c.openFront} onChange={(e) => cfg({ openFront: e.target.checked })} /> Open front (no doors)
            </label>
            <div className="label mt-1">Accessories</div>
            <div className="grid grid-cols-2 gap-1">
              {ACCESSORY_OPTIONS.map((a) => (
                <label key={a.id} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <input type="checkbox" checked={c.accessories.includes(a.id)} onChange={(e) => cfg({ accessories: e.target.checked ? [...c.accessories, a.id] : c.accessories.filter((x) => x !== a.id) })} />
                  {a.name}
                </label>
              ))}
            </div>
            {item.category === 'base' && (
              <>
                <div className="label mt-1">Rak tarik di dalam (ikut pintu)</div>
                <p className="text-[10px] opacity-65">Satu kabinet bisa memuat dua rak tarik — satu per pintu. Saat animasi Open dijalankan, pintu terbuka dan rak ikut tertarik keluar.</p>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="label">Pintu kiri</span>
                    <select className="input mt-0.5" value={c.interiorLeft ?? ''} onChange={(e) => cfg({ interiorLeft: (e.target.value || '') as typeof c.interiorLeft })}>
                      <option value="">— kosong —</option>
                      {INTERIOR_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="label">Pintu kanan</span>
                    <select className="input mt-0.5" value={c.interiorRight ?? ''} onChange={(e) => cfg({ interiorRight: (e.target.value || '') as typeof c.interiorRight })}>
                      <option value="">— kosong —</option>
                      {INTERIOR_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                </div>
                {(c.interiorLeft || c.interiorRight) && (
                  <button className="btn" onClick={() => { useStore.getState().select([item.id]); setUI({ rightTab: 'open', rightOpen: true, viewMode: '3d' }); }}>
                    Preview rak tarik di 3D
                  </button>
                )}
              </>
            )}
          </Section>
          <Section title="Doors & drawers">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Doors" value={c.doors} step={1} min={0} max={4} unit="" onChange={(v) => cfg({ doors: v, opening: v >= 2 ? 'double' : c.opening === 'double' ? 'left' : c.opening })} />
              <NumberField label="Drawers" value={c.drawers} step={1} min={0} max={6} unit="" onChange={(v) => cfg({ drawers: v })} />
            </div>
            <div>
              <span className="label">Door style</span>
              <div className="flex gap-1 mt-1">
                {(['slab', 'shaker', 'glass', 'louvered'] as DoorStyle[]).map((s) => (
                  <button key={s} className={`chip capitalize ${c.doorStyle === s ? 'active' : ''}`} onClick={() => cfg({ doorStyle: s, glass: s === 'glass' })}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Opening</span>
              <div className="flex gap-1 mt-1">
                {(['left', 'right', 'double', 'flip_up'] as OpeningDirection[]).map((o) => (
                  <button key={o} className={`chip ${c.opening === o ? 'active' : ''}`} onClick={() => cfg({ opening: o, doors: o === 'double' ? Math.max(2, c.doors) : o === 'flip_up' ? 1 : Math.min(1, Math.max(1, c.doors)) })}>
                    {o === 'left' ? '◧ Left hinge' : o === 'right' ? '◨ Right hinge' : o === 'double' ? '◫ Double' : '⬒ Flip-up'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="label">Hinge</span>
                <select className="input mt-0.5" value={c.hinge} onChange={(e) => cfg({ hinge: e.target.value })}>
                  <option value="default">Project default</option>
                  {HARDWARE.hinges.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Handle</span>
                <select className="input mt-0.5" value={c.handleType} onChange={(e) => cfg({ handleType: e.target.value })}>
                  <option value="default">Project default</option>
                  {HARDWARE.handles.types.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Section>
          <Section title="Material override" defaultOpen={false}>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={c.materials.useDefault} onChange={(e) => cfg({ materials: { ...c.materials, useDefault: e.target.checked } })} /> Use project default materials
            </label>
            {!c.materials.useDefault && (
              <>
                <label>
                  <span className="label">Carcass board</span>
                  <select className="input mt-0.5" value={c.materials.board ?? project.materials.board} onChange={(e) => cfg({ materials: { ...c.materials, board: e.target.value } })}>
                    {MATERIALS.boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label">Back panel</span>
                  <select className="input mt-0.5" value={c.materials.backPanel ?? project.materials.backBoard} onChange={(e) => cfg({ materials: { ...c.materials, backPanel: e.target.value } })}>
                    {MATERIALS.boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="label">Door colour</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {MATERIALS.colors.map((col) => (
                      <button key={col.id} className={`swatch ${(c.materials.doorColor ?? project.materials.doorColor) === col.id ? 'active' : ''}`} style={{ background: col.hex }} title={col.name} onClick={() => cfg({ materials: { ...c.materials, doorColor: col.id } })} />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="label">Carcass colour</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {MATERIALS.colors.map((col) => (
                      <button key={col.id} className={`swatch ${(c.materials.carcassColor ?? project.materials.carcassColor) === col.id ? 'active' : ''}`} style={{ background: col.hex }} title={col.name} onClick={() => cfg({ materials: { ...c.materials, carcassColor: col.id } })} />
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="text-[10px] text-slate-500">
              Current: {getColor(c.materials.useDefault ? project.materials.doorColor : c.materials.doorColor ?? project.materials.doorColor).name} doors
            </div>
          </Section>
        </>
      )}

      {item.kind === 'cabinet' && ['tall_oven', 'tall_electro', 'tall_broom', 'tall_dispenser'].includes(item.subtype) && (
        <Section title="Isi kabinet elektronik">
          <select className="input" value={item.subtype} onChange={(e) => changeType(e.target.value)}>
            <option value="tall_electro">Magiccom pada rel + oven di atas</option>
            <option value="tall_oven">Oven + microwave</option>
            <option value="tall_dispenser">Dispenser air + penyimpanan atas</option>
            <option value="tall_broom">Penyimpanan tertutup</option>
          </select>
          <p className="text-[11px] opacity-60">Mengganti isi tidak mengubah tinggi housing atau posisinya. Pilih dispenser untuk mengganti lemari kosong dari proyek lama.</p>
        </Section>
      )}

      {item.subtype === 'tall_electro' && (() => {
        const device = { ...DEFAULT_MAGICCOM, ...c.magiccom };
        const layout = electronicsLayout(item);
        const update = (patch: Partial<typeof device>) => cfg({ magiccom: { ...device, ...patch } });
        const chosen = appliancesOf(item);
        const toggleAppliance = (key: ElectroKey) => {
          const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
          cfg({ appliances: next.length ? next : ['magiccom', 'oven'] });
        };
        return <Section title="Isi kabinet elektronik">
          <p className="text-[11px] opacity-70">Pilih kombinasi perangkat. Perangkat pertama duduk di rel setinggi countertop ({layout.shelfY} cm); sisanya bertumpuk di atasnya. Oven 44 × 29 × 32 cm.</p>
          <div className="flex flex-wrap gap-1 mb-1">
            {([['Dispenser + Oven', ['dispenser', 'oven']], ['Magiccom + Oven', ['magiccom', 'oven']], ['Dispenser + Oven + Microwave', ['dispenser', 'oven', 'microwave']], ['Magiccom + Oven + Microwave', ['magiccom', 'oven', 'microwave']]] as [string, ElectroKey[]][]).map(([label, keys]) => (
              <button key={label} className={`chip ${chosen.join() === keys.join() ? 'active' : ''}`} onClick={() => cfg({ appliances: keys })}>{label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {ELECTRO_ORDER.map((key) => {
              const def = ELECTRO_DEFS[key];
              const on = chosen.includes(key);
              return <button key={key} className={`chip text-left ${on ? 'active' : ''}`} onClick={() => toggleAppliance(key)}>
                {on ? '✓ ' : ''}{def.label} · {def.w}×{def.h} cm{def.pull ? ' · rel' : ''}
              </button>;
            })}
          </div>
          <div className="text-[10px] opacity-65">Urutan tumpukan: {layout.slots.map((s) => ELECTRO_DEFS[s.key].label).join(' → ') || '—'} · penyimpanan atas {layout.storageHeight} cm.</div>
          {chosen.includes('magiccom') && <>
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="Magiccom lebar" value={device.width} min={18} max={70} onChange={(width) => update({ width })} />
              <NumberField label="Tinggi" value={device.height} min={15} max={48} onChange={(height) => update({ height })} />
              <NumberField label="Dalam" value={device.depth} min={18} max={65} onChange={(depth) => update({ depth })} />
            </div>
            <NumberField label="Panjang tarik rel" value={device.extension} min={10} max={65} onChange={(extension) => update({ extension })} />
          </>}
          <button className="btn" onClick={() => { useStore.getState().select([item.id]); setUI({ rightTab: 'open', rightOpen: true, viewMode: '3d' }); }}>
            Preview rel tarik di 3D
          </button>
        </Section>;
      })()}

      {item.subtype.includes('fridge') && (
        <Section title="Kulkas — tipe & ukuran">
          <div className="flex gap-1 flex-wrap">
            {([['one_door', '1 pintu'], ['two_door', '2 pintu (freezer atas)'], ['side_by_side', 'Side-by-side']] as const).map(([v, l]) => (
              <button key={v} className={`chip ${(c.fridgeType ?? 'two_door') === v ? 'active' : ''}`} onClick={() => {
                const patch: Partial<Item> = { config: { ...c, fridgeType: v } };
                if (v === 'side_by_side' && item.width < 85) patch.width = 90;
                if (v === 'side_by_side' && item.depth < 60) patch.depth = 70;
                if (item.subtype.startsWith('tall_fridge')) {
                  const housing = { ...item, ...patch, config: { ...c, fridgeType: v, fridge: undefined } };
                  patch.config = { ...housing.config, fridge: fridgeSize(housing) };
                }
                upd(patch);
              }}>{l}</button>
            ))}
          </div>
          <div className="text-[10px] opacity-60">Side-by-side umumnya 85–95 cm lebar, 170–180 cm tinggi, 60–70 cm kedalaman. Ukuran bisa diubah bebas di bagian Dimensions.</div>
          {item.subtype.startsWith('tall_fridge') && (() => {
            const size = fridgeSize(item);
            const updateSize = (patch: Partial<typeof size>) => cfg({ fridge: { ...size, ...patch } });
            return <>
              <div className="label mt-2">Ukuran kulkas saja (tetap)</div>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="Lebar" value={size.width} min={30} max={140} onChange={(width) => updateSize({ width })} />
                <NumberField label="Tinggi" value={size.height} min={80} max={220} onChange={(height) => updateSize({ height })} />
                <NumberField label="Dalam" value={size.depth} min={30} max={90} onChange={(depth) => updateSize({ depth })} />
              </div>
              <NumberField label="Celah ventilasi atas" value={size.clearanceTop} min={2} max={20} onChange={(clearanceTop) => updateSize({ clearanceTop })} />
              <p className="text-[11px] opacity-70">Ruang simpan atas: {r1(housingLayout(item, project.materials.board).storageHeight)} cm. Mengubah tinggi housing tidak memperbesar kulkas.</p>
            </>;
          })()}
        </Section>
      )}

      {item.subtype === 'tall_dispenser' && (() => {
        const size = dispenserSize(item);
        const updateSize = (patch: Partial<typeof size>) => cfg({ dispenser: { ...size, ...patch } });
        return <Section title="Dispenser dalam kabinet">
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Lebar" value={size.width} min={20} max={80} onChange={(width) => updateSize({ width })} />
            <NumberField label="Tinggi" value={size.height} min={40} max={160} onChange={(height) => updateSize({ height })} />
            <NumberField label="Dalam" value={size.depth} min={20} max={70} onChange={(depth) => updateSize({ depth })} />
          </div>
          <p className="text-[11px] opacity-70">Dispenser tetap di niche terbuka. Tinggi total hanya mengubah ruang penyimpanan di atasnya.</p>
        </Section>;
      })()}

      {item.kind === 'appliance' && (
        <Section title="Appliance">
          {item.subtype.startsWith('app_cooktop') && (
            <>
              <div className="flex gap-1">
                {[2, 4, 5].map((n) => (
                  <button key={n} className={`chip ${c.burners === n ? 'active' : ''}`} onClick={() => cfg({ burners: n })}>
                    {n} burner
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {(['gas', 'electric'] as const).map((fu) => (
                  <button key={fu} className={`chip capitalize ${c.fuel === fu ? 'active' : ''}`} onClick={() => cfg({ fuel: fu })}>
                    {fu}
                  </button>
                ))}
              </div>
            </>
          )}
          {item.subtype.startsWith('app_sink') && (
            <div className="flex gap-1">
              {[1, 2].map((n) => (
                <button key={n} className={`chip ${c.bowls === n ? 'active' : ''}`} onClick={() => cfg({ bowls: n })}>
                  {n} bowl
                </button>
              ))}
            </div>
          )}
          {item.subtype.startsWith('app_hood') && (() => {
            const ck = project.items.find((x) => x.subtype.startsWith('app_cooktop'));
            const ckTop = ck ? ck.elevation + ck.height : null;
            const minD = (c.fuel ?? 'gas') === 'gas' ? 65 : 55;
            const dist = ckTop !== null ? r1(item.elevation - ckTop) : null;
            return (
              <>
                <label className="flex items-start gap-2 text-xs p-1.5 rounded border mt-1" style={{ borderColor: c.hoodAuto !== false ? 'var(--accent)' : 'var(--border)', background: c.hoodAuto !== false ? 'var(--bg-selected)' : undefined }}>
                  <input type="checkbox" className="mt-0.5" checked={c.hoodAuto !== false} onChange={(e) => cfg({ hoodAuto: e.target.checked })} />
                  <span><b>Otomatis sejajar kabinet atas</b><br /><span className="opacity-70">Bawah hood rata dengan bawah kabinet atas; kabinet di atas hood menyesuaikan sampai puncak kabinet atas. Menggeser hood manual mematikan opsi ini.</span></span>
                </label>
                <div className="label mt-1">Elevation (Z) — ketinggian</div>
                <SliderField label="Bottom of hood" value={item.elevation} min={100} max={Math.max(120, project.room.ceilingHeight - item.height)} onChange={(v) => upd({ elevation: v })} />
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="label">Quick:</span>
                  {ckTop !== null && [55, 65, 75, 85].map((d) => (
                    <button key={d} className={`chip ${dist === d ? 'active' : ''}`} onClick={() => upd({ elevation: r1(ckTop + d) })}>+{d}cm</button>
                  ))}
                  <button className="chip" onClick={() => upd({ elevation: r1(project.room.ceilingHeight - item.height) })}>Ceiling</button>
                </div>
                {dist !== null && (
                  <div className="text-[11px] flex items-center gap-1.5" style={{ color: dist >= minD ? 'var(--success)' : 'var(--error)' }}>
                    Distance from cooktop: <b>{dist} cm</b> (min {minD} cm for {c.fuel ?? 'gas'}) {dist >= minD ? '✓' : '— too low'}
                  </div>
                )}
                <div className="text-[10px] opacity-60">Tip: Move tool (M) → drag the green arrow or scroll the wheel to raise/lower the hood.</div>
                <button className="btn-primary" onClick={() => setUI({ modal: 'hood' })}>Open hood configurator…</button>
              </>
            );
          })()}
        </Section>
      )}

      <div className="p-3 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button className="btn" onClick={applyToSimilar} title="Copy height, depth & configuration to all cabinets of the same type">
            Apply to all similar
          </button>
          <button className="btn" onClick={resetDefault}>
            Reset to default
          </button>
          <button className="btn" onClick={() => duplicateItems([item.id])}>
            Duplicate (D)
          </button>
          <button className="btn-danger" onClick={() => removeItems([item.id])}>
            Delete
          </button>
        </div>
        {item.kind === 'cabinet' && (
          <button className="btn-primary" onClick={() => setUI({ modal: 'editor' })}>
            Open detailed editor…
          </button>
        )}
      </div>
    </>
  );
}

function SimpleItemProps({ item }: { item: Item }) {
  const project = useStore((s) => s.project);
  const { updateItem, updateItemConfig, removeItems, duplicateItems, setUIMode } = useStore.getState();
  const c = item.config;
  const doorId = c.materials.useDefault ? project.materials.doorColor : c.materials.doorColor ?? project.materials.doorColor;
  const setDoor = (id: string) => updateItemConfig(item.id, { materials: { ...c.materials, useDefault: false, doorColor: id } });
  return (
    <>
      <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
        <input className="input font-semibold" value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
      </div>
      <Section title="Size">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Width" value={item.width} min={5} max={400} onChange={(v) => updateItem(item.id, { width: v })} />
          <NumberField label="Height" value={item.height} min={1} max={300} onChange={(v) => updateItem(item.id, { height: v })} />
          <NumberField label="Depth" value={item.depth} min={1} max={200} onChange={(v) => updateItem(item.id, { depth: v })} />
        </div>
      </Section>
      <Section title="Material">
        <div className="flex flex-wrap gap-1.5">
          {MATERIALS.colors.slice(0, 12).map((col) => (
            <button key={col.id} className={`swatch ${doorId === col.id ? 'active' : ''}`} style={{ background: col.hex }} title={col.name} onClick={() => setDoor(col.id)} />
          ))}
        </div>
        <div className="text-[11px] opacity-70">Door: {getColor(doorId).name}</div>
      </Section>
      <Section title="Position">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Pos X" value={item.x} min={-500} max={2000} onChange={(v) => updateItem(item.id, { x: v })} />
          <NumberField label="Pos Y" value={item.y} min={-500} max={2000} onChange={(v) => updateItem(item.id, { y: v })} />
        </div>
        <div className="text-[11px] opacity-60">Tip: drag the item directly in 2D or 3D to move it.</div>
      </Section>
      <div className="p-3 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button className="btn" onClick={() => duplicateItems([item.id])}>Duplicate</button>
          <button className="btn-danger" onClick={() => removeItems([item.id])}>Delete</button>
        </div>
        <button className="btn-primary" onClick={() => setUIMode('advanced')}>More options (Advanced)</button>
      </div>
    </>
  );
}

type StudioTab = RightTab;

export default function PropertiesPanel() {
  const selectedIds = useStore((s) => s.selectedIds);
  const project = useStore((s) => s.project);
  const studio = useStore((s) => s.ui.materialStudioOpen);
  const uiMode = useStore((s) => s.ui.uiMode);
  const issues = useStore((s) => s.issues);
  const setUI = useStore((s) => s.setUI);
  const item = selectedIds.length === 1 ? project.items.find((i) => i.id === selectedIds[0]) : undefined;
  const { removeItems, select } = useStore.getState();
  const tab = useStore((s) => s.ui.rightTab) as StudioTab;
  const setTab = (t: StudioTab) => setUI({ rightTab: t });
  useEffect(() => { if (studio) setTab('mat'); }, [studio]);
  const pick = (t: StudioTab) => { setTab(t); if (t !== 'mat' && studio) setUI({ materialStudioOpen: false }); if (t === 'mat') setUI({ materialStudioOpen: true }); };
  const tabs: { id: StudioTab; label: string; icon: typeof Lock; adv?: boolean; badge?: number }[] = [
    { id: 'props', label: 'Props', icon: SlidersHorizontal },
    { id: 'mat', label: 'Material', icon: Palette },
    { id: 'layers', label: 'Layers', icon: Layers, adv: true },
    { id: 'issues', label: 'Check', icon: TriangleAlert, adv: true, badge: issues.length },
    { id: 'display', label: 'Display', icon: Monitor },
    { id: 'open', label: 'Open', icon: DoorOpen },
  ];
  const active = tab === 'layers' && uiMode === 'simple' ? 'props' : tab === 'issues' && uiMode === 'simple' ? 'props' : tab;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-panel)' }}>
      <div className={`grid ${uiMode === 'advanced' ? 'grid-cols-3' : 'grid-cols-2'} border-b p-1 shrink-0 gap-0.5`} style={{ borderColor: 'var(--border)' }}>
        {tabs.filter((t) => !t.adv || uiMode === 'advanced').map((t) => (
          <button key={t.id} className={`tab flex items-center gap-1 justify-center relative min-h-8 ${active === t.id ? 'active' : ''}`} onClick={() => pick(t.id)} title={t.label}>
            <t.icon size={12} /> {t.label}
            {t.badge ? <span className="ml-0.5 px-1 rounded text-[9px] font-bold" style={{ background: issues.some((i) => i.severity === 'error') ? 'var(--error)' : 'var(--warning)', color: '#fff' }}>{t.badge}</span> : null}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {active === 'display' ? (
          <DisplayTab />
        ) : active === 'open' ? (
          <OpenControls />
        ) : active === 'mat' ? (
          <MaterialStudio />
        ) : active === 'layers' ? (
          <LayersPanel />
        ) : active === 'issues' ? (
          <div className="py-2"><div className="label px-3 pb-1">Design validation ({issues.length})</div><IssuesList /></div>
        ) : item ? (
          uiMode === 'simple' ? <SimpleItemProps key={item.id} item={item} /> : <ItemProps key={item.id} item={item} />
        ) : selectedIds.length > 1 ? (
          <div className="p-3 flex flex-col gap-2">
            <div className="text-xs">{selectedIds.length} items selected</div>
            <button className="btn" onClick={() => setUI({ modal: 'align' })}>Align & distribute…</button>
            <button className="btn-danger" onClick={() => removeItems(selectedIds)}>Delete selected</button>
            <button className="btn" onClick={() => select([])}>Clear selection</button>
          </div>
        ) : (
          <GlobalSettings />
        )}
      </div>
    </div>
  );
}
