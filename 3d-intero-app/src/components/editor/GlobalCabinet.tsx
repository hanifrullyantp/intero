import { useState } from 'react';
import { useStore, inScope, type ItemPatch } from '../../store';
import type { DoorMaterial, HandleType, Item, ItemScope } from '../../types';
import { COLOR_PRESETS, HANDLE_TYPES } from '../../lib/constants';
import { ColorPicker, DragNumber, Field, Section, Select, Toggle } from '../ui';

const SCOPE_LABEL: Record<ItemScope, string> = { wall: 'Kabinet atas', base: 'Kabinet bawah', all: 'Semua' };
const DOOR_MATERIALS: DoorMaterial[] = ['HPL', 'Duco', 'PVC', 'ACP', 'Solid Wood', 'Glass'];

/**
 * Properti global: satu pengaturan untuk seluruh kabinet dalam cakupan.
 * Diterapkan ke semua komponen yang sudah ada DAN disimpan sebagai default untuk komponen baru.
 */
export function GlobalCabinetSection() {
  const items = useStore((s) => s.items);
  const applyScope = useStore((s) => s.applyScope);
  const [scope, setScope] = useState<ItemScope>('wall');

  const scoped: Item[] = items.filter((i) => inScope(scope, i.type));
  const n = scoped.length;
  const every = (f: (i: Item) => boolean) => n > 0 && scoped.every(f);
  const mixedHint = (f: (i: Item) => boolean) => (n > 0 && scoped.some(f) && !scoped.every(f) ? 'Campuran — aktifkan untuk menyamakan semua' : undefined);
  const first = scoped[0];
  const ap = (patch: ItemPatch) => applyScope(scope, patch);
  const doorType: 'swing' | 'liftup' = first?.config.doorType ? first.config.doorType : first?.config.liftUp ? 'liftup' : 'swing';
  const setDoorType = (v: 'swing' | 'liftup') => ap({ config: { doorType: v, liftUp: v === 'liftup' } });

  return (
    <Section title="Properti Global Kabinet">
      <div className="seg w-full">
        {(['wall', 'base', 'all'] as ItemScope[]).map((sc) => (
          <button key={sc} type="button" className={`flex-1 ${scope === sc ? 'active' : ''}`} onClick={() => setScope(sc)}>{SCOPE_LABEL[sc]}</button>
        ))}
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        {n > 0
          ? `${n} komponen terpengaruh. Setiap perubahan langsung berlaku ke semua, dan juga ke komponen yang ditambahkan berikutnya.`
          : 'Belum ada komponen di cakupan ini. Pengaturan tetap tersimpan dan otomatis berlaku ke komponen yang ditambahkan.'}
      </p>

      {scope === 'wall' && (
        <>
          <Field label="Jenis pintu" inline>
            <Select value={doorType} onChange={(v) => setDoorType(v as 'swing' | 'liftup')} options={[{ value: 'swing', label: 'Swing (buka samping)' }, { value: 'liftup', label: 'Pull-up (buka ke atas)' }]} />
          </Field>
          <Toggle label="Cornice / Topi" hint={mixedHint((i) => !!i.config.cornice)} checked={every((i) => !!i.config.cornice)} onChange={(v) => ap({ config: { cornice: v } })} />
          <Field label="Tinggi topi" inline>
            <DragNumber value={first?.config.corniceHeight ?? 50} min={30} max={150} onChange={(v, c) => { if (c) ap({ config: { corniceHeight: v } }); }} />
          </Field>
          <Field label="Lebar overhang topi" inline>
            <DragNumber value={first?.config.corniceWidth ?? 40} min={10} max={120} onChange={(v, c) => { if (c) ap({ config: { corniceWidth: v } }); }} />
          </Field>
          <Toggle label="Lampu di bawah topi" hint={mixedHint((i) => !!i.config.corniceLight)} checked={every((i) => !!i.config.corniceLight)} onChange={(v) => ap({ config: { corniceLight: v } })} />
          <Toggle label="Pintu kaca" checked={every((i) => !!i.config.glassDoor)} onChange={(v) => ap({ config: { glassDoor: v } })} />
        </>
      )}

      <Field label="Material pintu" inline>
        <Select value={first?.materials.doorMaterial ?? 'HPL'} onChange={(v) => ap({ materials: { doorMaterial: v as DoorMaterial } })} options={DOOR_MATERIALS.map((v) => ({ value: v, label: v }))} />
      </Field>
      <ColorPicker label="Warna pintu" value={first?.materials.doorColor ?? '#C9A97A'} onChange={(hex, c) => { if (c) ap({ materials: { doorColor: hex } }); }} />
      <div className="grid grid-cols-8 gap-1.5">
        {COLOR_PRESETS.slice(0, 16).map((c) => (
          <button key={c.hex} type="button" title={c.name} className="chip" style={{ background: c.hex }} onClick={() => ap({ materials: { doorColor: c.hex } })} />
        ))}
      </div>
      <Field label="Jenis handle" inline>
        <Select value={first?.materials.handleType ?? 'bar'} onChange={(v) => ap({ materials: { handleType: v as HandleType } })} options={(Object.keys(HANDLE_TYPES) as HandleType[]).map((k) => ({ value: k, label: HANDLE_TYPES[k] }))} />
      </Field>
      <ColorPicker label="Warna handle" value={first?.materials.handleColor ?? '#1A1A1A'} onChange={(hex, c) => { if (c) ap({ materials: { handleColor: hex } }); }} />

      <Toggle label="LED under-cabinet" checked={every((i) => i.led.underCabinet)} onChange={(v) => ap({ led: { underCabinet: v } })} />
      <Toggle label="LED dalam kabinet" checked={every((i) => i.led.insideUpper || i.led.insideBase)} onChange={(v) => ap({ led: { insideUpper: v, insideBase: v } })} />
      <Toggle label="LED toe kick (plinth)" checked={every((i) => i.led.plinth)} onChange={(v) => ap({ led: { plinth: v } })} />
    </Section>
  );
}
