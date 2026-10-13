import { useState } from 'react';
import { useStore } from '../core/store';
import { useRef } from 'react';
import { MATERIALS, HARDWARE, getColor, getCountertop, loadPalette, savePalette, parsePalette, normalizeHex, type PaletteColor } from '../config/materials';
import { Plus, Trash2, FolderOpen, Download } from './icons';
import { downloadBlob } from '../core/projectManager';

/**
 * Custom colours: type a hex code (#1B9D6B, 1b9d6b, #fff), pick from the colour picker,
 * or import a palette (paste lines / upload .txt .csv .json .gpl). Imported colours are saved in
 * this browser and shown as swatches; projects store the hex itself so files stay portable.
 */
function CustomColors({ current, onApply }: { current: string; onApply: (id: string) => void }) {
  const [hex, setHex] = useState(normalizeHex(current) ?? '#1b9d6b');
  const [name, setName] = useState('');
  const [palette, setPalette] = useState<PaletteColor[]>(loadPalette());
  const [paste, setPaste] = useState('');
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useStore((s) => s.toast);
  const valid = normalizeHex(hex);

  const store = (list: PaletteColor[]) => { savePalette(list); setPalette(list); };
  const addToPalette = (c: PaletteColor) => {
    const rest = palette.filter((p) => p.hex !== c.hex);
    store([...rest, c]);
  };
  const apply = () => {
    if (!valid) return toast({ severity: 'warning', message: 'Kode warna tidak valid — contoh: #1B9D6B' });
    if (name.trim()) addToPalette({ hex: valid, name: name.trim() });
    onApply(valid);
  };
  const doImport = (text: string) => {
    const list = parsePalette(text);
    if (!list.length) return toast({ severity: 'error', message: 'Tidak ada kode warna yang dikenali' });
    const map = new Map(palette.map((p) => [p.hex, p]));
    for (const c of list) map.set(c.hex, c);
    store([...map.values()]);
    setPaste('');
    setShowImport(false);
    toast({ severity: 'success', message: `${list.length} warna diimpor ke palet` });
  };

  return (
    <div className="mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="label mb-1">Kode warna / palet sendiri</div>
      <div className="flex items-center gap-1.5">
        <input type="color" value={valid ?? '#000000'} onChange={(e) => setHex(e.target.value)} className="w-9 h-8 rounded cursor-pointer border" style={{ borderColor: 'var(--border)' }} title="Pilih warna" />
        <input className="input font-mono w-24!" value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#1B9D6B" onKeyDown={(e) => { if (e.key === 'Enter') apply(); }} />
        <input className="input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama (opsional)" />
        <button className="btn-primary px-2!" onClick={apply} disabled={!valid} title="Terapkan warna"><Plus size={13} /></button>
      </div>
      {!valid && hex.trim() && <div className="text-[10px] mt-0.5" style={{ color: 'var(--error)' }}>Format: #RRGGBB, RRGGBB atau #RGB</div>}

      {palette.length > 0 && (
        <div className="grid grid-cols-8 gap-1 mt-2">
          {palette.map((p) => (
            <div key={p.hex} className="relative group">
              <button className={`swatch w-full! h-7! ${normalizeHex(current) === p.hex ? 'active' : ''}`} style={{ background: p.hex }} title={`${p.name} (${p.hex.toUpperCase()})`} onClick={() => onApply(p.hex)} />
              <button className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 rounded-full items-center justify-center text-white" style={{ background: 'var(--error)' }} title="Hapus dari palet" onClick={() => store(palette.filter((x) => x.hex !== p.hex))}><Trash2 size={9} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 mt-2">
        <button className="chip flex items-center gap-1" onClick={() => setShowImport((o) => !o)}><Plus size={10} /> Tempel kode</button>
        <button className="chip flex items-center gap-1" onClick={() => fileRef.current?.click()}><FolderOpen size={10} /> Impor file</button>
        {palette.length > 0 && <button className="chip flex items-center gap-1" onClick={() => downloadBlob('palet-warna.json', JSON.stringify(palette, null, 2), 'application/json')}><Download size={10} /> Ekspor</button>}
        <input ref={fileRef} type="file" accept=".txt,.csv,.json,.gpl" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => doImport(String(r.result));
          r.readAsText(f);
          e.target.value = '';
        }} />
      </div>
      {showImport && (
        <div className="mt-2 flex flex-col gap-1">
          <textarea className="input font-mono text-[11px]!" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Satu warna per baris, contoh:\nGraphite #4A4F55\n#B76E79 Rose Gold\n74 79 85 Asphalt'} />
          <button className="btn-primary" onClick={() => doImport(paste)}>Impor ke palet</button>
        </div>
      )}
    </div>
  );
}
import type { EdgeProfile, Finish } from '../models/types';
import { NumberField } from './PropertiesPanel';

type Scope = 'all' | 'selected' | 'base' | 'wall' | 'countertop';
type Cat = 'all' | 'solid' | 'metallic' | 'wood' | 'stone';

export default function MaterialStudio() {
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { setMaterials, setItems, toast } = useStore.getState();
  const [scope, setScope] = useState<Scope>('all');
  const [cat, setCat] = useState<Cat>('all');
  const [target, setTarget] = useState<'door' | 'carcass'>('door');
  const m = project.materials;

  const colors = MATERIALS.colors.filter((c) => cat === 'all' || c.category === cat);

  const applyColor = (colorId: string) => {
    if (scope === 'countertop') {
      setMaterials({ countertopColor: colorId });
      return;
    }
    if (scope === 'all') {
      setMaterials(target === 'door' ? { doorColor: colorId } : { carcassColor: colorId });
      // clear overrides so the default shows everywhere
      setItems(project.items.map((i) => ({ ...i, config: { ...i.config, materials: { ...i.config.materials, [target === 'door' ? 'doorColor' : 'carcassColor']: undefined } } })), false);
      return;
    }
    const pred = (i: typeof project.items[number]) => (scope === 'selected' ? selectedIds.includes(i.id) : i.category === scope);
    if (scope === 'selected' && !selectedIds.length) {
      toast({ severity: 'warning', message: 'Select cabinets first' });
      return;
    }
    setItems(project.items.map((i) => (pred(i) ? { ...i, config: { ...i.config, materials: { ...i.config.materials, useDefault: false, [target === 'door' ? 'doorColor' : 'carcassColor']: colorId } } } : i)));
    toast({ severity: 'success', message: `${getColor(colorId).name} applied to ${scope === 'selected' ? 'selection' : scope + ' cabinets'}`, ttl: 1500 });
  };

  const ct = getCountertop(m.countertop);

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 section">
        <div className="label mb-1">Apply to</div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'selected', 'base', 'wall', 'countertop'] as Scope[]).map((s) => (
            <button key={s} className={`chip capitalize ${scope === s ? 'active' : ''}`} onClick={() => setScope(s)}>
              {s === 'all' ? 'All' : s === 'selected' ? `Selected (${selectedIds.length})` : s === 'countertop' ? 'Countertop only' : `All ${s}`}
            </button>
          ))}
        </div>
        {scope !== 'countertop' && (
          <div className="flex gap-1 mt-2">
            <button className={`chip ${target === 'door' ? 'active' : ''}`} onClick={() => setTarget('door')}>
              Door / front colour
            </button>
            <button className={`chip ${target === 'carcass' ? 'active' : ''}`} onClick={() => setTarget('carcass')}>
              Carcass colour
            </button>
          </div>
        )}
      </div>

      <div className="px-3 py-2 section">
        <div className="flex items-center justify-between mb-1">
          <span className="label">Colour & texture</span>
          <div className="flex gap-1">
            {(['all', 'solid', 'metallic', 'wood', 'stone'] as Cat[]).map((c) => (
              <button key={c} className={`chip capitalize ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
                {c === 'solid' ? 'Solid / HPL' : c === 'metallic' ? 'Metallic' : c === 'wood' ? 'Wood grain' : c === 'stone' ? 'Stone' : 'All'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1.5 mt-2">
          {colors.map((c) => {
            const active = scope === 'countertop' ? m.countertopColor === c.id : target === 'door' ? m.doorColor === c.id : m.carcassColor === c.id;
            return (
              <button
                key={c.id}
                className={`swatch w-full! h-9! ${active ? 'active' : ''}`}
                title={c.name}
                style={{
                  background: c.texture === 'wood' ? `repeating-linear-gradient(100deg, ${c.hex} 0 3px, rgba(0,0,0,0.12) 3px 4px)` : c.texture === 'granite' ? `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0 1px, transparent 1px), ${c.hex}` : c.texture === 'marble' ? `linear-gradient(120deg, ${c.hex} 60%, rgba(0,0,0,0.08) 61%, ${c.hex} 63%)` : c.hex,
                }}
                onClick={() => applyColor(c.id)}
              />
            );
          })}
        </div>
        <div className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Doors: <b style={{ color: 'var(--text-secondary)' }}>{getColor(m.doorColor).name}</b> · Carcass: <b style={{ color: 'var(--text-secondary)' }}>{getColor(m.carcassColor).name}</b>
        </div>
        <CustomColors
          current={scope === 'countertop' ? m.countertopColor : target === 'door' ? m.doorColor : m.carcassColor}
          onApply={applyColor}
        />
      </div>

      <div className="px-3 py-2 section">
        <div className="label mb-1">Kecerahan warna (black &amp; white)</div>
        <p className="text-[10px] opacity-60 mb-2">Atur kepekatan tanpa mengubah jenis warna. Contoh: abu yang terlihat terlalu gelap → geser ke kanan.</p>
        {([
          ['door', 'Pintu'],
          ['carcass', 'Carcase'],
          ['countertop', 'Countertop'],
        ] as const).map(([key, label]) => {
          const value = m.tints?.[key] ?? 0;
          return (
            <div key={key} className="mb-2">
              <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="font-mono" style={{ color: value ? 'var(--accent)' : undefined }}>{value > 0 ? `+${value}` : value || 'netral'}</span>
              </div>
              <input
                type="range"
                min={-60}
                max={60}
                step={1}
                value={value}
                className="w-full"
                onPointerDown={() => useStore.getState().commit()}
                onChange={(e) => setMaterials({ tints: { door: 0, carcass: 0, countertop: 0, ...(m.tints ?? {}), [key]: Number(e.target.value) } })}
              />
              <div className="flex gap-1 mt-1">
                {[[-20, 'Tua'], [0, 'Netral'], [20, 'Terang']].map(([n, l]) => (
                  <button key={l} className={`chip ${value === n ? 'active' : ''}`} onClick={() => setMaterials({ tints: { door: 0, carcass: 0, countertop: 0, ...(m.tints ?? {}), [key]: n } })}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex gap-1">
          <button className="btn flex-1" onClick={() => setMaterials({ tints: { door: 0, carcass: 0, countertop: 0 } })}>Reset semua ke netral</button>
        </div>
      </div>

      <div className="px-3 py-2 section">
        <div className="label mb-1">Sisi, toe kick & topi</div>
        <label className="flex items-center gap-2 text-xs py-0.5">
          <input type="checkbox" checked={m.sideFollowDoor !== false} onChange={(e) => setMaterials({ sideFollowDoor: e.target.checked })} />
          Sisi samping kabinet mengikuti warna pintu
        </label>
        <label className="flex items-center gap-2 text-xs py-0.5">
          <input type="checkbox" checked={m.toeFollowDoor !== false} onChange={(e) => setMaterials({ toeFollowDoor: e.target.checked })} />
          Toe kick (plint bawah) mengikuti warna pintu
        </label>
        <label className="flex items-center gap-2 text-xs py-0.5 mt-1">
          <input type="checkbox" checked={!!m.crown} onChange={(e) => setMaterials({ crown: e.target.checked })} />
          Topi (cornice) di atas kabinet atas
        </label>
        {m.crown && (
          <div className="flex items-center gap-2 mt-1">
            <NumberField label="Tinggi topi" value={m.crownHeight ?? 6} step={0.5} min={1} max={30} onChange={(v) => setMaterials({ crownHeight: v })} className="flex-1" />
            <div className="flex flex-col gap-1">
              <span className="label">Model</span>
              <div className="flex gap-1">
                <button className={`chip ${(m.crownStyle ?? 'flat') === 'flat' ? 'active' : ''}`} onClick={() => setMaterials({ crownStyle: 'flat' })}>Flat</button>
                <button className={`chip ${m.crownStyle === 'cornice' ? 'active' : ''}`} onClick={() => setMaterials({ crownStyle: 'cornice' })}>Bertingkat</button>
              </div>
            </div>
          </div>
        )}
        <div className="text-[10px] opacity-60 mt-1">Topi mengikuti warna pintu dan dipasang di kabinet atas & tinggi teratas (termasuk susun 2).</div>
      </div>

      <div className="px-3 py-2 section">
        <div className="label mb-1">Finish</div>
        <div className="flex gap-1">
          {(['matte', 'semi', 'gloss'] as Finish[]).map((f) => (
            <button key={f} className={`chip ${m.finish === f ? 'active' : ''}`} onClick={() => setMaterials({ finish: f })}>
              {f === 'matte' ? 'Matte' : f === 'semi' ? 'Semi-Gloss' : 'High Gloss'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label>
            <span className="label">Finishing</span>
            <select className="input mt-0.5" value={m.finishing} onChange={(e) => setMaterials({ finishing: e.target.value })}>
              {MATERIALS.finishings.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Carcass board</span>
            <select className="input mt-0.5" value={m.board} onChange={(e) => setMaterials({ board: e.target.value })}>
              {MATERIALS.boards.filter((b) => b.thickness >= 12).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Back panel</span>
            <select className="input mt-0.5" value={m.backBoard} onChange={(e) => setMaterials({ backBoard: e.target.value })}>
              {MATERIALS.boards.filter((b) => b.thickness <= 12).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="px-3 py-2 section">
        <div className="label mb-1">Countertop</div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Material</span>
            <select className="input mt-0.5" value={m.countertop} onChange={(e) => setMaterials({ countertop: e.target.value, countertopThickness: getCountertop(e.target.value).thicknesses[0] })}>
              {MATERIALS.countertops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Thickness</span>
            <select className="input mt-0.5" value={m.countertopThickness} onChange={(e) => setMaterials({ countertopThickness: parseFloat(e.target.value) })}>
              {ct.thicknesses.map((t) => (
                <option key={t} value={t}>
                  {t} cm
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {MATERIALS.colors.filter((c) => c.category === 'stone' || c.id === 'white' || c.id === 'black').map((c) => (
            <button key={c.id} className={`swatch ${m.countertopColor === c.id ? 'active' : ''}`} style={{ background: c.hex }} title={c.name} onClick={() => setMaterials({ countertopColor: c.id })} />
          ))}
        </div>
        <div className="label mt-2 mb-1">Edge profile</div>
        <div className="flex gap-1">
          {(['straight', 'bullnose', 'beveled', 'ogee'] as EdgeProfile[]).map((e) => (
            <button key={e} className={`chip capitalize ${m.edgeProfile === e ? 'active' : ''}`} onClick={() => setMaterials({ edgeProfile: e })}>
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={m.backsplash} onChange={(e) => setMaterials({ backsplash: e.target.checked })} /> Backsplash
          </label>
          {m.backsplash && <NumberField value={m.backsplashHeight} step={1} min={10} max={120} onChange={(v) => setMaterials({ backsplashHeight: v })} className="flex-1" />}
        </div>
      </div>

      <div className="px-3 py-2 section">
        <div className="label mb-1">Hardware</div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Handle</span>
            <select className="input mt-0.5" value={m.handleType} onChange={(e) => setMaterials({ handleType: e.target.value })}>
              {HARDWARE.handles.types.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Handle finish</span>
            <select className="input mt-0.5" value={m.handleFinish} onChange={(e) => setMaterials({ handleFinish: e.target.value })}>
              {HARDWARE.handles.finishes.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Hinges</span>
            <select className="input mt-0.5" value={m.hinge} onChange={(e) => setMaterials({ hinge: e.target.value })}>
              {HARDWARE.hinges.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Drawer slides</span>
            <select className="input mt-0.5" value={m.slide} onChange={(e) => setMaterials({ slide: e.target.value })}>
              {HARDWARE.slides.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="px-3 py-2">
        <button
          className="btn w-full"
          onClick={() => {
            setItems(project.items.map((i) => ({ ...i, config: { ...i.config, materials: { useDefault: true } } })));
            toast({ severity: 'success', message: 'All per-cabinet overrides cleared' });
          }}
        >
          Clear all per-cabinet overrides
        </button>
      </div>
    </div>
  );
}
