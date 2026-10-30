import type { Command } from './commands';
import type { ProjectDoc, ProjectItem } from './schema';

const EPS = 0.05;

export interface DocDiff {
  commands: Command[];
  complete: boolean;
}

function near(a: number, b: number) {
  return Math.abs(a - b) <= EPS;
}

function samePoint(a: { x: number; z: number }, b: { x: number; z: number }) {
  return near(a.x, b.x) && near(a.z, b.z);
}

function jsonSame(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function descendantIds(items: ProjectItem[], roots: string[]): Set<string> {
  const all = new Set(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of items) {
      if (item.parentId && all.has(item.parentId) && !all.has(item.id)) {
        all.add(item.id);
        grew = true;
      }
    }
  }
  return all;
}

function parentsFirst(items: ProjectItem[]): ProjectItem[] {
  const pending = [...items];
  const ordered: ProjectItem[] = [];
  while (pending.length) {
    const ready = pending.filter((item) => !item.parentId || !pending.some((other) => other.id === item.parentId));
    if (!ready.length) return items;
    ordered.push(...ready);
    for (const item of ready) pending.splice(pending.indexOf(item), 1);
  }
  return ordered;
}

function addCommand(item: ProjectItem): Command {
  return {
    type: 'add_item',
    targetIds: [item.id],
    item: {
      type: item.type,
      subtype: item.subtype,
      wallId: item.wallId,
      parentId: item.parentId,
      offsetCm: item.offsetCm,
      elevationCm: item.elevationCm,
      positionCm: item.wallId ? undefined : item.positionCm,
      rotationY: item.rotationY,
      dims: item.dims,
      label: item.label,
      tags: item.tags,
      locked: item.locked,
      visible: item.visible,
      colorLabel: item.colorLabel,
      parts: item.parts,
      config: item.config,
      led: item.led,
    },
  };
}

function changedPatch(before: ProjectItem, after: ProjectItem): { patch: Extract<Command, { type: 'update_item' }>['patch']; deletedConfig: boolean } {
  const patch: Extract<Command, { type: 'update_item' }>['patch'] = {};
  if (before.label !== after.label) patch.label = after.label;
  if (!jsonSame(before.tags, after.tags)) patch.tags = after.tags;
  if (before.locked !== after.locked) patch.locked = after.locked;
  if (before.visible !== after.visible) patch.visible = after.visible;
  if (before.colorLabel !== after.colorLabel) patch.colorLabel = after.colorLabel;
  if (before.subtype !== after.subtype) patch.subtype = after.subtype;
  if (!near(before.elevationCm, after.elevationCm)) patch.elevationCm = after.elevationCm;
  const dims: { w?: number; h?: number; d?: number } = {};
  if (!near(before.dims.w, after.dims.w)) dims.w = after.dims.w;
  if (!near(before.dims.h, after.dims.h)) dims.h = after.dims.h;
  if (!near(before.dims.d, after.dims.d)) dims.d = after.dims.d;
  if (Object.keys(dims).length) patch.dims = dims;
  const parts: NonNullable<typeof patch.parts> = {};
  for (const key of ['door', 'body', 'side', 'toe', 'handle'] as const) {
    if (!jsonSame(before.parts[key], after.parts[key])) parts[key] = after.parts[key];
  }
  if (Object.keys(parts).length) patch.parts = parts;
  const deletedConfig = Object.keys(before.config).some((key) => before.config[key] !== undefined && !(key in after.config));
  if (!jsonSame(before.config, after.config)) patch.config = after.config;
  if (!jsonSame(before.led, after.led)) patch.led = after.led;
  return { patch, deletedConfig };
}

function placementChanged(before: ProjectItem, after: ProjectItem) {
  if (before.wallId !== after.wallId) return true;
  if (after.wallId) return !near(before.offsetCm, after.offsetCm);
  return !near(before.positionCm.x, after.positionCm.x) || !near(before.positionCm.z, after.positionCm.z);
}

export function diffDoc(before: ProjectDoc, after: ProjectDoc): DocDiff {
  const commands: Command[] = [];
  let complete = true;

  const globals: Extract<Command, { type: 'set_global' }>['globals'] = {};
  for (const key of ['tinggiTotalCm', 'tinggiBaseCm', 'gapBaseWallCm', 'kedalamanWallCm', 'toeKickCm', 'snapGizmoCm'] as const) {
    if (!near(before.globals[key], after.globals[key])) globals[key] = after.globals[key];
  }
  const countertop: NonNullable<Extract<Command, { type: 'set_global' }>['countertop']> = {};
  for (const key of ['tipe', 'tebalCm', 'overhangCm', 'backsplash', 'backsplashOtomatis', 'tinggiBacksplashCm', 'warnaBacksplash'] as const) {
    const left = before.countertop[key];
    const right = after.countertop[key];
    const changed = typeof left === 'number' && typeof right === 'number' ? !near(left, right) : left !== right;
    if (changed) (countertop as Record<string, unknown>)[key] = right;
  }
  if (Object.keys(globals).length || Object.keys(countertop).length) {
    commands.push({
      type: 'set_global',
      targetIds: ['globals'],
      globals,
      ...(Object.keys(countertop).length ? { countertop } : {}),
    });
  }

  const room: Extract<Command, { type: 'update_room' }>['room'] = {};
  if (before.room.bentuk !== after.room.bentuk) room.bentuk = after.room.bentuk;
  if (!near(before.room.lebarCm, after.room.lebarCm)) room.lebarCm = after.room.lebarCm;
  if (!near(before.room.dalamCm, after.room.dalamCm)) room.dalamCm = after.room.dalamCm;
  if (!near(before.room.tinggiPlafonCm, after.room.tinggiPlafonCm)) room.tinggiPlafonCm = after.room.tinggiPlafonCm;
  if (Object.keys(room).length) commands.push({ type: 'update_room', targetIds: ['room'], room });
  if (!jsonSame(before.room.bukaan, after.room.bukaan)) complete = false;

  const beforeWalls = new Map(before.room.walls.map((wall) => [wall.id, wall]));
  const afterWalls = new Map(after.room.walls.map((wall) => [wall.id, wall]));
  for (const wall of before.room.walls) {
    const next = afterWalls.get(wall.id);
    if (!next || next.nama !== wall.nama || !near(next.panjangCm, wall.panjangCm) || !samePoint(next.start, wall.start) || !samePoint(next.end, wall.end)) complete = false;
  }
  for (const wall of after.room.walls) {
    if (beforeWalls.has(wall.id)) continue;
    commands.push({
      type: 'add_wall',
      targetIds: [wall.id],
      wall: { nama: wall.nama, panjangCm: wall.panjangCm, start: wall.start, end: wall.end },
    });
  }

  const beforeMaterials = new Map(before.materials.map((material) => [material.id, material]));
  const afterMaterials = new Map(after.materials.map((material) => [material.id, material]));
  for (const material of before.materials) if (!afterMaterials.has(material.id)) complete = false;
  for (const material of after.materials) {
    const prev = beforeMaterials.get(material.id);
    if (!prev || !jsonSame(prev, material)) commands.push({ type: 'set_material', targetIds: [material.id], material });
  }

  if (!jsonSame(before.preserved, after.preserved) || before.meta.nama !== after.meta.nama) complete = false;

  const beforeItems = new Map(before.items.map((item) => [item.id, item]));
  const afterItems = new Map(after.items.map((item) => [item.id, item]));
  const removed = before.items.filter((item) => !afterItems.has(item.id)).map((item) => item.id);
  const removedSet = new Set(removed);
  const roots = removed.filter((id) => {
    const item = beforeItems.get(id);
    return item && (!item.parentId || !removedSet.has(item.parentId));
  });
  const removable = roots.filter((id) => [...descendantIds(before.items, [id])].every((child) => removedSet.has(child)));
  if (removable.length !== roots.length) complete = false;
  if (removable.length) commands.push({ type: 'remove_item', targetIds: removable });

  const added = after.items.filter((item) => !beforeItems.has(item.id));
  const orderedAdds = parentsFirst(added);
  if (added.length && orderedAdds === added) complete = false;
  for (const item of orderedAdds) commands.push(addCommand(item));

  const parentGroups = new Map<string, string[]>();
  for (const item of after.items) {
    const prev = beforeItems.get(item.id);
    if (!prev) continue;
    if (prev.orderIndex !== item.orderIndex) complete = false;
    const { patch, deletedConfig } = changedPatch(prev, item);
    if (deletedConfig) complete = false;
    const moved = placementChanged(prev, item);
    if (moved && patch.dims) complete = false;
    if (Object.keys(patch).length) commands.push({ type: 'update_item', targetIds: [item.id], patch });
    if (moved) {
      commands.push({
        type: 'move_item',
        targetIds: [item.id],
        wallId: item.wallId,
        offsetCm: item.offsetCm,
        positionCm: item.wallId ? undefined : item.positionCm,
      });
    }
    if (moved || !near(prev.rotationY, item.rotationY)) {
      commands.push({ type: 'update_item', targetIds: [item.id], patch: { rotationY: item.rotationY } });
    }
    if (prev.parentId !== item.parentId) {
      const key = item.parentId ?? '';
      parentGroups.set(key, [...(parentGroups.get(key) ?? []), item.id]);
    }
  }
  for (const [key, ids] of parentGroups) {
    commands.push({ type: 'group_items', targetIds: ids, parentId: key || null });
  }

  return { commands, complete };
}
