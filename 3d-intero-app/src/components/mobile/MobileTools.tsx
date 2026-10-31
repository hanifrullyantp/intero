import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Command } from '../../projectdoc/commands';
import type { ProjectDoc, ProjectItem } from '../../projectdoc/schema';
import { cancelDockPreview, captureDoc, commitDockCommand, previewDockCommand } from '../../projectdoc/session';
import { COLOR_PRESETS } from '../../lib/constants';
import { useStore } from '../../store';
import { toast } from '../ui';

export type DockTool = 'ukuran' | 'material' | 'geser' | 'putar' | 'duplikat' | 'hapus';

function usePreview() {
  const base = useRef<ProjectDoc>(captureDoc());
  const dirty = useRef(useStore.getState().dirty);
  const done = useRef(false);
  useEffect(() => () => {
    if (!done.current) cancelDockPreview(base.current, dirty.current);
  }, []);
  const run = (cmd: Command, commit: boolean) => {
    const errors = (commit ? commitDockCommand : previewDockCommand)(base.current, cmd);
    if (errors[0]) toast(errors[0], 'error');
    if (commit && !errors.length) done.current = true;
    return !errors.length;
  };
  return { base: base.current, run };
}

export function DockToolPanel({ tool, ids, onClose }: { tool: DockTool; ids: string[]; onClose: () => void }) {
  const readOnly = useStore((s) => s.shareMode === 'view');
  const { base, run } = usePreview();
  const item = base.items.find((entry) => entry.id === ids[0]);
  if (!item) return null;
  const apply = (cmd: Command) => { if (run(cmd, true)) onClose(); };
  const preview = (cmd: Command) => { run(cmd, false); };
  return (
    <section className="mv2-tool" data-mv2={tool} aria-label={titleOf(tool)}>
      <div className="mv2-tool-head">
        <b>{titleOf(tool)}</b>
        <button type="button" className="mv2-hit" aria-label="Tutup" onClick={onClose}><X size={20} /></button>
      </div>
      {tool === 'ukuran' && <SizeFields item={item} ids={ids} readOnly={readOnly} preview={preview} apply={apply} onClose={onClose} />}
      {tool === 'material' && <MaterialFields item={item} ids={ids} readOnly={readOnly} preview={preview} apply={apply} onClose={onClose} />}
      {tool === 'geser' && <MoveFields item={item} ids={ids} readOnly={readOnly} preview={preview} apply={apply} onClose={onClose} />}
      {tool === 'putar' && <RotateFields item={item} ids={ids} readOnly={readOnly} preview={preview} apply={apply} onClose={onClose} />}
      {tool === 'duplikat' && <DuplicateFields item={item} ids={ids} readOnly={readOnly} preview={preview} apply={apply} onClose={onClose} />}
      {tool === 'hapus' && <DeleteFields item={item} ids={ids} readOnly={readOnly} apply={apply} onClose={onClose} />}
    </section>
  );
}

function titleOf(tool: DockTool) {
  if (tool === 'ukuran') return 'Ukuran';
  if (tool === 'material') return 'Material';
  if (tool === 'geser') return 'Geser';
  if (tool === 'putar') return 'Putar';
  if (tool === 'duplikat') return 'Duplikat';
  return 'Hapus';
}

function Actions({ onCancel, onApply, disabled }: { onCancel: () => void; onApply: () => void; disabled?: boolean }) {
  return (
    <div className="mv2-apply">
      <button type="button" onClick={onCancel}>Batal</button>
      <button type="button" className="primary" disabled={disabled} onClick={onApply}>Terapkan</button>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="mv2-step">
      <span>{label}</span>
      <button type="button" aria-label={`Kurangi ${label}`} onClick={() => onChange(value - 1)}>−</button>
      <input inputMode="decimal" aria-label={label} value={Number.isFinite(value) ? value : ''} onChange={(e) => {
        const n = Number(e.target.value.replace(',', '.'));
        if (e.target.value !== '' && Number.isFinite(n)) onChange(n);
      }} />
      <span className="unit">cm</span>
      <button type="button" aria-label={`Tambah ${label}`} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function SizeFields({ item, ids, readOnly, preview, apply, onClose }: Fields & { item: ProjectItem }) {
  const [draft, setDraft] = useState({ w: Math.round(item.dims.w), h: Math.round(item.dims.h), d: Math.round(item.dims.d) });
  const cmd = (): Command => ({ type: 'update_item', targetIds: ids, patch: { dims: { w: Math.max(1, draft.w), h: Math.max(1, draft.h), d: Math.max(1, draft.d) } } });
  const setKey = (key: 'w' | 'h' | 'd', value: number) => {
    const next = { ...draft, [key]: Math.max(1, Math.round(value)) };
    setDraft(next);
    preview({ type: 'update_item', targetIds: ids, patch: { dims: next } });
  };
  return (<>
    <Stepper label="Lebar" value={draft.w} onChange={(n) => setKey('w', n)} />
    <input className="mv2-slider" type="range" min={10} max={300} value={draft.w} aria-label="Geser lebar" onChange={(e) => setKey('w', Number(e.target.value))} />
    <Stepper label="Tinggi" value={draft.h} onChange={(n) => setKey('h', n)} />
    <Stepper label="Dalam" value={draft.d} onChange={(n) => setKey('d', n)} />
    <Actions onCancel={onClose} disabled={readOnly} onApply={() => apply(cmd())} />
  </>);
}

function MaterialFields({ item, ids, readOnly, preview, apply, onClose }: Fields & { item: ProjectItem }) {
  const tipe = item.parts.door.tipe || 'HPL';
  const [warna, setWarna] = useState(item.parts.door.warna || COLOR_PRESETS[0].hex);
  const cmd = (hex: string): Command => ({
    type: 'set_material',
    targetIds: ids,
    part: 'door',
    material: { id: `mat_${tipe}_${hex.replace(/[^a-zA-Z0-9]/g, '')}`.toLowerCase(), nama: `${tipe} ${hex}`, tipe, warna: hex, tekstur: null },
  });
  const pick = (hex: string) => { setWarna(hex); preview(cmd(hex)); };
  return (<>
    <p className="mv2-note">Warna pintu</p>
    <div className="mv2-swatches">
      {COLOR_PRESETS.slice(0, 12).map((color) => (
        <button type="button" key={color.hex} aria-label={color.name} className={warna === color.hex ? 'on' : ''} style={{ background: color.hex }} onClick={() => pick(color.hex)} />
      ))}
    </div>
    <Actions onCancel={onClose} disabled={readOnly} onApply={() => apply(cmd(warna))} />
  </>);
}

function MoveFields({ item, ids, readOnly, preview, apply, onClose }: Fields & { item: ProjectItem }) {
  const onWall = Boolean(item.wallId);
  const [offset, setOffset] = useState(Math.round(item.offsetCm));
  const [pos, setPos] = useState({ x: Math.round(item.positionCm.x), z: Math.round(item.positionCm.z) });
  const changeOffset = (n: number) => {
    const next = Math.round(n);
    setOffset(next);
    preview({ type: 'move_item', targetIds: ids, offsetCm: next });
  };
  const changePos = (key: 'x' | 'z', n: number) => {
    const next = { ...pos, [key]: Math.round(n) };
    setPos(next);
    preview({ type: 'move_item', targetIds: ids, positionCm: { x: next.x, y: item.positionCm.y, z: next.z } });
  };
  return (<>
    {onWall ? <Stepper label="Geser" value={offset} onChange={changeOffset} /> : (<>
      <Stepper label="Kiri" value={pos.x} onChange={(n) => changePos('x', n)} />
      <Stepper label="Depan" value={pos.z} onChange={(n) => changePos('z', n)} />
    </>)}
    <Actions onCancel={onClose} disabled={readOnly} onApply={() => apply(onWall ? { type: 'move_item', targetIds: ids, offsetCm: offset } : { type: 'move_item', targetIds: ids, positionCm: { x: pos.x, y: item.positionCm.y, z: pos.z } })} />
  </>);
}

function RotateFields({ item, ids, readOnly, preview, apply, onClose }: Fields & { item: ProjectItem }) {
  const [angle, setAngle] = useState(Math.round(item.rotationY));
  const change = (n: number) => {
    const next = Math.round(n);
    setAngle(next);
    preview({ type: 'update_item', targetIds: ids, patch: { rotationY: next } });
  };
  return (<>
    <div className="mv2-step">
      <span>Sudut</span>
      <button type="button" aria-label="Kurangi sudut" onClick={() => change(angle - 15)}>−</button>
      <input inputMode="numeric" aria-label="Sudut" value={angle} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) change(n); }} />
      <span className="unit">°</span>
      <button type="button" aria-label="Tambah sudut" onClick={() => change(angle + 15)}>+</button>
    </div>
    <Actions onCancel={onClose} disabled={readOnly} onApply={() => apply({ type: 'update_item', targetIds: ids, patch: { rotationY: angle } })} />
  </>);
}

function DuplicateFields({ item, ids, readOnly, preview, apply, onClose }: Fields & { item: ProjectItem }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    preview({ type: 'duplicate_item', targetIds: ids });
  }, [ids, preview]);
  return (<>
    <p className="mv2-note">Salinan {item.label} tampil di kanvas. Terapkan menyimpannya.</p>
    <Actions onCancel={onClose} disabled={readOnly} onApply={() => apply({ type: 'duplicate_item', targetIds: ids })} />
  </>);
}

function DeleteFields({ item, ids, readOnly, apply, onClose }: { item: ProjectItem; ids: string[]; readOnly: boolean; apply: (cmd: Command) => void; onClose: () => void }) {
  const label = ids.length > 1 ? `${ids.length} objek` : item.label;
  return (<>
    <p className="mv2-note">Hapus {label}?</p>
    <Actions onCancel={onClose} disabled={readOnly} onApply={() => apply({ type: 'remove_item', targetIds: ids })} />
  </>);
}

type Fields = {
  ids: string[];
  readOnly: boolean;
  preview: (cmd: Command) => void;
  apply: (cmd: Command) => void;
  onClose: () => void;
};
