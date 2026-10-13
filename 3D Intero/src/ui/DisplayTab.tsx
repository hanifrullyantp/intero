import { useStore } from '../core/store';
import type { LightingSettings } from '../models/types';

/** View toggles — moved here from the bottom bar of the 3D viewport. */
export default function DisplayTab() {
  const ui = useStore((s) => s.ui);
  const materials = useStore((s) => s.project.materials);
  const lighting: LightingSettings = useStore((s) => s.project.settings.lighting) ?? { under: false, inWall: false, inBase: false, tone: 'warm', brightness: 1, glow: true };
  const { toggleUI, setMaterials, setSettings, commit } = useStore.getState();
  const setLight = (p: Partial<LightingSettings>, history = true) => setSettings({ lighting: { ...lighting, ...p } }, history);
  const lights: { label: string; hint: string; on: boolean; toggle: () => void }[] = [
    { label: 'LED bawah kabinet atas', hint: 'Menerangi meja kerja (worktop)', on: lighting.under, toggle: () => setLight({ under: !lighting.under }) },
    { label: 'LED dalam kabinet atas', hint: 'Terlihat saat pintu dibuka / kaca', on: lighting.inWall, toggle: () => setLight({ inWall: !lighting.inWall }) },
    { label: 'LED dalam kabinet bawah', hint: 'Terlihat saat pintu / laci dibuka', on: lighting.inBase, toggle: () => setLight({ inBase: !lighting.inBase }) },
  ];

  const rows: { label: string; hint: string; on: boolean; toggle: () => void }[] = [
    { label: 'Dimensions', hint: 'Dimension labels in 3D & plan', on: ui.showDims, toggle: () => toggleUI('showDims') },
    { label: 'Handles', hint: 'Door & drawer hardware', on: ui.showHandles, toggle: () => toggleUI('showHandles') },
    { label: 'Shadows', hint: 'Soft shadows in 3D', on: ui.showShadows, toggle: () => toggleUI('showShadows') },
    { label: 'Wireframe', hint: 'Show edges only', on: ui.wireframe, toggle: () => toggleUI('wireframe') },
    { label: 'Backsplash', hint: 'Wall tiles behind the worktop', on: materials.backsplash, toggle: () => setMaterials({ backsplash: !materials.backsplash }) },
    { label: 'Topi kabinet atas', hint: 'Cornice di atas kabinet atas', on: !!materials.crown, toggle: () => setMaterials({ crown: !materials.crown }) },
    { label: 'Internal contents', hint: 'Dishes, bottles, gas tank when open', on: ui.showContents, toggle: () => toggleUI('showContents') },
    { label: 'Labels', hint: 'Item names in 2D plan', on: ui.showLabels, toggle: () => toggleUI('showLabels') },
    { label: 'Grid', hint: '2D plan grid', on: ui.showGrid, toggle: () => toggleUI('showGrid') },
    { label: 'Issues overlay', hint: 'Red/amber highlight on problems', on: ui.showIssues, toggle: () => toggleUI('showIssues') },
    { label: 'Work triangle', hint: 'Sink ↔ stove ↔ fridge distances', on: ui.showTriangle, toggle: () => toggleUI('showTriangle') },
  ];

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b text-[10px] opacity-60" style={{ borderColor: 'var(--border)' }}>Tampilan viewport · tidak mengubah data desain</div>
      <div className="p-2 flex flex-col">
        {rows.map((r) => (
          <button key={r.label} onClick={r.toggle} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-[var(--bg-hover)] text-left">
            <span className="flex-1">
              <span className="block text-xs">{r.label}</span>
              <span className="block text-[10px] opacity-60">{r.hint}</span>
            </span>
            <span className="w-8 h-4 rounded-full relative transition-colors" style={{ background: r.on ? 'var(--brand)' : 'var(--border-strong)' }}>
              <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: r.on ? 18 : 2 }} />
            </span>
          </button>
        ))}
      </div>
      <div className="px-3 pt-2 pb-1 border-t text-[10px] font-semibold uppercase tracking-wider opacity-60" style={{ borderColor: 'var(--border)' }}>Lampu LED strip</div>
      <div className="p-2 pt-0 flex flex-col">
        {lights.map((r) => (
          <button key={r.label} onClick={r.toggle} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-[var(--bg-hover)] text-left">
            <span className="flex-1">
              <span className="block text-xs">{r.label}</span>
              <span className="block text-[10px] opacity-60">{r.hint}</span>
            </span>
            <span className="w-8 h-4 rounded-full relative transition-colors" style={{ background: r.on ? 'var(--brand)' : 'var(--border-strong)' }}>
              <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: r.on ? 18 : 2 }} />
            </span>
          </button>
        ))}
        <div className="flex items-center flex-wrap gap-1 px-2 pt-1">
          <span className="text-[11px] opacity-70 mr-1">Warna cahaya</span>
          {(['warm', 'neutral', 'cool'] as const).map((t) => (
            <button key={t} className={`chip ${lighting.tone === t ? 'active' : ''}`} onClick={() => setLight({ tone: t })}>
              {t === 'warm' ? 'Warm 3000K' : t === 'neutral' ? 'Neutral 4000K' : 'Cool 6000K'}
            </button>
          ))}
        </div>
        <label className="px-2 py-3 text-xs">
          <span className="flex justify-between mb-2"><span>Terang LED</span><b className="font-mono">{Math.round((lighting.brightness ?? 1) * 100)}%</b></span>
          <input type="range" min={0.1} max={3} step={0.1} value={lighting.brightness ?? 1} className="w-full" onPointerDown={() => commit()} onChange={(e) => setLight({ brightness: Number(e.target.value) }, false)} />
        </label>
        <label className="flex gap-2 items-center px-2 pb-3 text-xs"><input type="checkbox" checked={lighting.glow !== false} onChange={(e) => setLight({ glow: e.target.checked })} /> Efek glow dan pancaran pada backsplash</label>
      </div>
    </div>
  );
}
