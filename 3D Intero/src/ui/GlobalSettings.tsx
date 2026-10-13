import { useEffect, useState } from 'react';
import { useStore } from '../core/store';
import { MATERIALS, getCountertop } from '../config/materials';
import type { HandlePosition, ProjectDefaults } from '../models/types';
import { isLowerTier, isTopTier, stackAbove } from '../engine/kitchenRules';
import { applyProjectDimensions, projectDimensions } from '../engine/projectDimensions';
import { Globe, ChevronDown, ChevronRight, Undo2 } from './icons';

export const FACTORY_DEFAULTS: ProjectDefaults = { totalHeight: 220, baseHeight: 85, baseDepth: 55, wallHeight: 73, wallDepth: 33, wallBottom: 147, tallDepth: 55 };

const HANDLE_OPTIONS: { id: HandlePosition; label: string }[] = [
  { id: 'auto', label: 'Auto (ergonomis)' },
  { id: 'edge-top', label: 'Tepi atas' },
  { id: 'edge-bottom', label: 'Tepi bawah' },
  { id: 'center', label: 'Tengah' },
  { id: 'vertical', label: 'Vertikal' },
];

function Num({ label, value, onChange, min = 0, max = 1000, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="flex-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input type="number" className="input w-20! font-mono" step={step} min={min} max={max} value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => { const v = parseFloat(txt); if (Number.isNaN(v)) return setTxt(String(value)); const c = Math.max(min, Math.min(max, v)); setTxt(String(c)); if (c !== value) onChange(c); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <span className="opacity-50 w-6">cm</span>
    </label>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <div className="section-h" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
      {open && <div className="px-3 pb-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

export default function GlobalSettings() {
  const project = useStore((s) => s.project);
  const ui = useStore((s) => s.ui);
  const { setProject, setMaterials, setSettings, setUI, toggleUI, applyDimensions: applyGlobal } = useStore.getState();
  const [stackH, setStackH] = useState(45);
  const d = projectDimensions(project);
  const setDefaults = (p: Partial<ProjectDefaults>) => applyGlobal(p);
  const m = project.materials;
  const ct = getCountertop(m.countertop);

  const applyDimensions = () => setUI({
    confirm: {
      title: 'Terapkan ukuran default ke semua kabinet?',
      message: `Semua unit tinggi dan atas, termasuk corner, diratakan ke ${d.totalHeight} cm. Kabinet bawah menjadi ${d.baseHeight} cm. Ukuran kulkas dan dispenser tetap. Bisa di-undo.`,
      onConfirm: () => {
        const s = useStore.getState();
        s.applyDimensions(d);
        s.toast({ severity: 'success', message: 'Ukuran default diterapkan ke semua kabinet' });
      },
    },
  });

  const applyHandle = (pos: HandlePosition) => setUI({
    confirm: {
      title: 'Terapkan posisi handle ke semua kabinet?',
      message: `Semua pintu & laci akan memakai posisi "${HANDLE_OPTIONS.find((h) => h.id === pos)?.label}". Pilih "Auto" untuk perilaku ergonomis.`,
      onConfirm: () => {
        const s = useStore.getState();
        s.setItems(s.project.items.map((i) => (i.kind === 'cabinet' ? { ...i, config: { ...i.config, handlePosition: pos } } : i)), true);
        s.toast({ severity: 'success', message: 'Posisi handle diperbarui' });
      },
    },
  });

  const resetFactory = () => setUI({
    confirm: {
      title: 'Reset ke pengaturan pabrik?',
      message: 'Semua kabinet, termasuk corner, kembali ke tinggi total 220 cm. Perangkat di dalam housing tidak diubah.',
      onConfirm: () => { useStore.getState().applyDimensions(FACTORY_DEFAULTS); },
    },
  });

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2.5 border-b flex items-start gap-2" style={{ borderColor: 'var(--border)' }}>
        <Globe size={15} style={{ color: 'var(--accent)', marginTop: 2 }} />
        <div>
          <div className="text-xs font-semibold">Global project settings</div>
          <div className="text-[11px] opacity-60 mt-1">Perubahan ukuran langsung tersinkron ke semua kabinet, termasuk corner. Ukuran perangkat di dalamnya tetap.</div>
        </div>
      </div>

      <Section title="Room & space">
        <Num label="Lebar ruangan (X)" value={project.room.width} min={60} max={2000} onChange={(v) => setProject({ ...project, room: { ...project.room, width: v } })} />
        <Num label="Kedalaman ruangan (Y)" value={project.room.depth} min={60} max={2000} onChange={(v) => setProject({ ...project, room: { ...project.room, depth: v } })} />
        <Num label="Tinggi plafon (Z)" value={project.room.ceilingHeight} min={200} max={400} onChange={(v) => setProject({ ...project, room: { ...project.room, ceilingHeight: v, walls: project.room.walls.map((w) => ({ ...w, height: v })) } })} />
      </Section>

      <Section title="Default dimensions">
        <div className="global-height-control">
          <Num label="Tinggi total kabinet" value={d.totalHeight} min={d.wallBottom + 25} max={400} step={0.1} onChange={(v) => setDefaults({ totalHeight: v })} />
          <p>Satu garis atas: lemari tinggi, kulkas, dispenser, kabinet atas, dan sudut.</p>
        </div>
        <Num label="Base — tinggi" value={d.baseHeight} min={60} max={120} onChange={(v) => setDefaults({ baseHeight: v })} />
        <Num label="Base — kedalaman" value={d.baseDepth} min={30} max={80} onChange={(v) => setDefaults({ baseDepth: v })} />
        <Num label="Wall — tinggi" value={d.wallHeight} min={30} max={120} onChange={(v) => setDefaults({ wallHeight: v })} />
        <Num label="Wall — kedalaman" value={d.wallDepth} min={20} max={50} onChange={(v) => setDefaults({ wallDepth: v })} />
        <Num label="Wall — dari lantai" value={d.wallBottom} min={100} max={250} onChange={(v) => setDefaults({ wallBottom: v })} />
        <Num label="Tall — kedalaman" value={d.tallDepth} min={30} max={70} onChange={(v) => setDefaults({ tallDepth: v })} />
        <div className="flex gap-1.5 mt-1">
          <button className="btn flex-1" onClick={applyDimensions}>Ratakan ulang semua kabinet</button>
          <button className="btn" title="Factory default" onClick={resetFactory}><Undo2 size={12} /></button>
        </div>
      </Section>

      <Section title="Kabinet atas 2 susun">
        <div className="text-[11px] opacity-70">Menambah satu tingkat kabinet (pintu flip-up) di atas setiap kabinet atas yang belum punya susun. Kabinet di atas hood menyesuaikan otomatis.</div>
        <Num label="Tinggi susun atas" value={stackH} min={20} max={90} onChange={setStackH} />
        <div className="flex gap-1.5">
          <button className="btn-primary flex-1" onClick={() => {
            const s = useStore.getState();
            const items = s.project.items;
            const crown = s.project.materials.crown ? s.project.materials.crownHeight ?? 6 : 0;
            const added = items
              .filter((i) => i.kind === 'cabinet' && i.category === 'wall' && i.subtype !== 'wall_hood' && i.visible !== false && isLowerTier(i, items) && isTopTier(i, items))
              .map((i) => stackAbove(i, s.project.room.ceilingHeight, crown, stackH))
              .filter(Boolean) as typeof items;
            if (!added.length) return s.toast({ severity: 'warning', message: 'Tidak ada kabinet atas yang bisa ditumpuk (sudah 2 susun atau plafon terlalu rendah)' });
            const totalHeight = Math.max(...added.map((i) => i.elevation + i.height));
            s.setProject(applyProjectDimensions({ ...s.project, items: [...items, ...added] }, { totalHeight }));
            s.toast({ severity: 'success', message: `${added.length} kabinet susun atas ditambahkan` });
          }}>Buat 2 susun</button>
          <button className="btn" onClick={() => {
            const s = useStore.getState();
            const items = s.project.items;
            const uppers = items.filter((i) => i.kind === 'cabinet' && i.category === 'wall' && !isLowerTier(i, items));
            if (!uppers.length) return s.toast({ severity: 'info', message: 'Belum ada susun atas' });
            s.setProject(applyProjectDimensions({ ...s.project, items: items.filter((i) => !uppers.includes(i)) }));
            s.toast({ severity: 'success', message: `${uppers.length} susun atas dihapus` });
          }}>Hapus susun atas</button>
        </div>
      </Section>

      <Section title="LED & pencahayaan">
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={!!project.settings.lighting?.under} onChange={(e) => {
          const lighting = project.settings.lighting ?? { under: false, inWall: false, inBase: false, tone: 'warm' as const, brightness: 1, glow: true };
          setSettings({ lighting: { ...lighting, under: e.target.checked } });
        }} /><span>LED strip di bawah kabinet atas<br /><span className="text-[10px] opacity-60">Cahaya nyata dan glow. Pengaturan terang, warna, dan interior ada di tab Display.</span></span></label>
        <button className="btn" onClick={() => setUI({ rightTab: 'display', materialStudioOpen: false })}>Atur pencahayaan</button>
      </Section>

      <Section title="Material & countertop">
        <label className="text-xs flex flex-col gap-1"><span style={{ color: 'var(--text-secondary)' }}>Board carcass</span>
          <select className="input" value={m.board} onChange={(e) => setMaterials({ board: e.target.value })}>
            {MATERIALS.boards.filter((b) => b.thickness >= 12).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="text-xs flex flex-col gap-1"><span style={{ color: 'var(--text-secondary)' }}>Countertop</span>
          <select className="input" value={m.countertop} onChange={(e) => setMaterials({ countertop: e.target.value, countertopThickness: getCountertop(e.target.value).thicknesses[0] })}>
            {MATERIALS.countertops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="text-[10px] opacity-60">Tebal {m.countertopThickness} cm · {ct.name}. Warna pintu & carcass: gunakan tab Material.</div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={m.backsplash} onChange={(e) => setMaterials({ backsplash: e.target.checked })} /> Backsplash (2 sisi di sudut L)</label>
        <Num label="Tinggi backsplash" value={m.backsplashHeight} min={10} max={120} onChange={(v) => setMaterials({ backsplashHeight: v })} />
      </Section>

      <Section title="Hardware & handle">
        <label className="text-xs flex flex-col gap-1"><span style={{ color: 'var(--text-secondary)' }}>Gaya handle</span>
          <select className="input" value={m.handleType} onChange={(e) => setMaterials({ handleType: e.target.value })}>
            <option value="bar">Bar handle</option><option value="cup">Cup handle</option><option value="knob">Knob</option>
            <option value="recessed">Recessed / finger pull</option><option value="profile">Profile (gola)</option><option value="none">Push-to-open</option>
          </select>
        </label>
        <label className="text-xs flex flex-col gap-1"><span style={{ color: 'var(--text-secondary)' }}>Finish handle</span>
          <select className="input" value={m.handleFinish} onChange={(e) => setMaterials({ handleFinish: e.target.value })}>
            {['chrome', 'stainless', 'black', 'brass', 'white'].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <div className="text-[11px] opacity-70">Posisi handle default: <b>Auto</b> — base di tepi atas, wall di tepi bawah, laci di tengah, tall dibalik per pintu.</div>
        <div className="flex flex-wrap gap-1">
          {HANDLE_OPTIONS.map((h) => <button key={h.id} className="chip" onClick={() => applyHandle(h.id)}>{h.label}</button>)}
        </div>
      </Section>

      <Section title="Workspace" defaultOpen={false}>
        <label className="text-xs flex items-center gap-2"><span className="flex-1" style={{ color: 'var(--text-secondary)' }}>Satuan</span>
          <select className="input w-24!" value={project.settings.unit} onChange={(e) => setSettings({ unit: e.target.value as 'cm' | 'mm' | 'inch' })}>
            <option value="cm">cm</option><option value="mm">mm</option><option value="inch">inch</option>
          </select>
        </label>
        <Num label="Grid (cm)" value={project.settings.gridSize} min={0.5} max={10} step={0.5} onChange={(v) => setSettings({ gridSize: v })} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={ui.snap} onChange={() => toggleUI('snap')} /> Snap ke grid</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={ui.snapObjects} onChange={() => toggleUI('snapObjects')} /> Snap ke tepi objek</label>
        <div className="text-[10px] opacity-60">Autosave aktif setiap 30 detik (localStorage).</div>
      </Section>
    </div>
  );
}
