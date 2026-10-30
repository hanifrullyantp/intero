import { detectCornerOrientation } from '../engine/walls';
import type { Item, ProjectSettings, Wall } from '../types';

/** Sidik geometri yang sama dengan SceneController: perubahan di luar ini tidak membangun ulang mesh. */
export function cabinetSig(item: Item, items: Item[], walls: Wall[], settings: ProjectSettings): string {
  const orient = item.type === 'corner_base' || item.type === 'corner_wall' ? detectCornerOrientation(item, items, walls) : '';
  const { note: _note, method: _method, prodStatus: _status, ...cfgGeom } = item.config;
  void _note; void _method; void _status;
  const { production: _production, scopeDefaults: _scope, appearance: _appearance, ...geomSettings } = settings as ProjectSettings & Record<string, unknown>;
  void _production; void _scope; void _appearance;
  return JSON.stringify([item.type, item.dims, item.materials, cfgGeom, item.led, JSON.stringify(geomSettings), orient]);
}

export type ReconcileAction = 'rebuild' | 'move' | 'keep' | 'remove';

export interface BuiltCabinet {
  id: string;
  sig: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

export function planReconcile(built: BuiltCabinet[], items: Item[], walls: Wall[], settings: ProjectSettings): { id: string; action: ReconcileAction }[] {
  const ids = new Set(items.map((item) => item.id));
  const ops: { id: string; action: ReconcileAction }[] = [];
  for (const entry of built) if (!ids.has(entry.id)) ops.push({ id: entry.id, action: 'remove' });
  for (const item of items) {
    const sig = cabinetSig(item, items, walls, settings);
    const prev = built.find((entry) => entry.id === item.id);
    if (!prev || prev.sig !== sig) {
      ops.push({ id: item.id, action: 'rebuild' });
      continue;
    }
    const moved = Math.abs(prev.x - item.position.x) > 0.5
      || Math.abs(prev.y - item.position.y) > 0.5
      || Math.abs(prev.z - item.position.z) > 0.5
      || Math.abs(prev.rotationY - item.rotationY) > 0.05;
    ops.push({ id: item.id, action: moved ? 'move' : 'keep' });
  }
  return ops;
}
