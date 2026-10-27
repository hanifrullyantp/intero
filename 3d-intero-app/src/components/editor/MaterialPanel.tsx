import { Palette } from 'lucide-react';
import { useStore } from '../../store';
import type { DoorMaterial } from '../../types';
import { COLOR_PRESETS } from '../../lib/constants';
import { ColorPicker, Field, Section, Select, Toggle } from '../ui';
import { hexToHsl, hslToHex } from '../../lib/utils';

const METALS = [
  { name: 'Asphalt', hex: '#5A5F66' }, { name: 'Graphite', hex: '#3B3F45' }, { name: 'Charcoal', hex: '#2E3135' },
  { name: 'Silver', hex: '#B8BCC2' }, { name: 'Chrome', hex: '#D7DADF' }, { name: 'Rosegold', hex: '#B76E79' },
  { name: 'Gold', hex: '#C9A227' }, { name: 'Brass', hex: '#B5A642' }, { name: 'Copper', hex: '#B87333' },
];

export function MaterialPanel() {
  const s = useStore();
  const sel = s.items.filter((i) => s.selectedIds.includes(i.id));
  const target = sel[0] ?? s.items[0];
  const ids = sel.length ? sel.map((i) => i.id) : s.items.map((i) => i.id);
  const apply = (patch: { materials?: Partial<typeof target.materials> }) => {
    if (!ids.length) return;
    s.patchItems(ids, patch);
  };
  if (!target) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Palette size={16} style={{ color: 'var(--brand-primary)' }} /><span className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Material</span>
        </div>
        <p className="p-4 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Tambahkan kabinet terlebih dahulu, atau pilih objek.</p>
      </div>
    );
  }
  const m = target.materials;
  const hsl = hexToHsl(m.doorColor);
  const setLight = (l: number) => apply({ materials: { doorColor: hslToHex(hsl.h, hsl.s, l) } });
  const setSat = (sat: number) => apply({ materials: { doorColor: hslToHex(hsl.h, sat, hsl.l) } });
  const scope = sel.length ? `${sel.length} terpilih` : 'Semua kabinet';
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <Palette size={16} style={{ color: 'var(--brand-primary)' }} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Material</div>
          <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{scope}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Section title="Bahan pintu">
          <Field label="Material" inline><Select value={m.doorMaterial} onChange={(v) => apply({ materials: { doorMaterial: v as DoorMaterial } })} options={(['HPL', 'Duco', 'PVC', 'ACP', 'Solid Wood', 'Glass'] as DoorMaterial[]).map((v) => ({ value: v, label: v }))} /></Field>
          <ColorPicker label="Warna" value={m.doorColor} onChange={(hex, c) => { if (c) apply({ materials: { doorColor: hex } }); }} />
          <Field label={`Kecerahan ${Math.round(hsl.l)}%`}><input type="range" className="slider" min={8} max={92} value={Math.round(hsl.l)} style={{ background: `linear-gradient(90deg,#111,${hslToHex(hsl.h, hsl.s, 50)},#fff)` }} onChange={(e) => setLight(+e.target.value)} /></Field>
          <Field label={`Kepekatan (saturasi) ${Math.round(hsl.s)}%`}><input type="range" className="slider" min={0} max={100} value={Math.round(hsl.s)} style={{ background: `linear-gradient(90deg,${hslToHex(hsl.h, 0, hsl.l)},${hslToHex(hsl.h, 100, hsl.l)})` }} onChange={(e) => setSat(+e.target.value)} /></Field>
          <Toggle label="Sisi samping ikut pintu" checked={m.sidesFollowDoor} onChange={(v) => apply({ materials: { sidesFollowDoor: v } })} />
          <Toggle label="Toe kick ikut pintu" checked={m.toeKickFollowsDoor} onChange={(v) => apply({ materials: { toeKickFollowsDoor: v } })} />
        </Section>
        <Section title="Preset warna">
          <div className="grid grid-cols-8 gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button key={c.hex} type="button" title={c.name} className={`chip ${m.doorColor.toUpperCase() === c.hex.toUpperCase() ? 'active' : ''}`} style={{ background: c.hex }} onClick={() => apply({ materials: { doorColor: c.hex } })} />
            ))}
          </div>
        </Section>
        <Section title="Logam & aksen">
          <div className="grid grid-cols-3 gap-2">
            {METALS.map((c) => (
              <button key={c.hex} type="button" className="btn btn-secondary btn-sm justify-start gap-2" onClick={() => apply({ materials: { doorColor: c.hex, doorMaterial: c.name === 'Chrome' || c.name === 'Silver' ? 'ACP' : 'Duco' } })}>
                <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: c.hex, border: '1px solid var(--border)' }} />{c.name}
              </button>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Asphalt, Graphite, Silver, Rosegold, Gold — geser kecerahan untuk mengatur kepekatan.</p>
        </Section>
        <Section title="Handle">
          <ColorPicker label="Warna handle" value={m.handleColor} onChange={(hex, c) => { if (c) apply({ materials: { handleColor: hex } }); }} />
          <div className="flex gap-1">
            <button className="btn btn-secondary btn-sm flex-1" onClick={() => apply({ materials: { handleColor: '#1A1A1A' } })}>Hitam Satin</button>
            <button className="btn btn-secondary btn-sm flex-1" onClick={() => apply({ materials: { handleColor: '#BDBDBD' } })}>Silver</button>
            <button className="btn btn-secondary btn-sm flex-1" onClick={() => apply({ materials: { handleColor: '#C9A227' } })}>Gold</button>
            <button className="btn btn-secondary btn-sm flex-1" onClick={() => apply({ materials: { handleColor: '#B76E79' } })}>Rosegold</button>
          </div>
        </Section>
      </div>
    </div>
  );
}
