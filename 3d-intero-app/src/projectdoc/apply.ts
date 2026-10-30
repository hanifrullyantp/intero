import { commandErrors, commandSchema, type Command } from './commands';
import { positionOnWall, wallLengthCm } from './geometry';
import { freshViolations } from './invariants';
import {
  allocateItemId,
  defaultParts,
  projectDocSchema,
  wallBottomCm,
  type ProjectDoc,
  type ProjectItem,
} from './schema';
import { blankItem, findTemplate } from './templates';

export interface ApplyResult {
  doc: ProjectDoc;
  violations: string[];
}

function touch(doc: ProjectDoc) {
  doc.meta.updatedAt = new Date().toISOString();
}

function placeOnItsWall(doc: ProjectDoc, item: ProjectItem): string | null {
  if (!item.wallId) {
    item.positionCm = { ...item.positionCm, y: item.elevationCm };
    return null;
  }
  const wall = doc.room.walls.find((entry) => entry.id === item.wallId);
  if (!wall) return `Dinding "${item.wallId}" tidak ditemukan.`;
  const placed = positionOnWall(wall, item.offsetCm, item.dims.w, item.dims.d, item.elevationCm);
  item.positionCm = { x: placed.x, y: placed.y, z: placed.z };
  item.rotationY = placed.rotationY;
  return null;
}

function defaultElevation(doc: ProjectDoc, type: ProjectItem['type'], subtype: string): number {
  if (type === 'wall_cabinet' || type === 'corner_wall' || subtype === 'hood') return wallBottomCm(doc.globals);
  return 0;
}

function requireItems(doc: ProjectDoc, ids: string[]): string | null {
  const missing = ids.filter((id) => !doc.items.some((item) => item.id === id));
  if (!missing.length) return null;
  return `Item ${missing.map((id) => `"${id}"`).join(', ')} tidak ditemukan.`;
}

function descendantIds(doc: ProjectDoc, roots: string[]): Set<string> {
  const all = new Set(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of doc.items) {
      if (item.parentId && all.has(item.parentId) && !all.has(item.id)) {
        all.add(item.id);
        grew = true;
      }
    }
  }
  return all;
}

function wouldCycle(doc: ProjectDoc, childIds: string[], parentId: string): boolean {
  if (childIds.includes(parentId)) return true;
  const childrenOf = (id: string): string[] => doc.items.filter((item) => item.parentId === id).map((item) => item.id);
  const stack = [...childIds];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === parentId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...childrenOf(id));
  }
  return false;
}

function nextOrder(doc: ProjectDoc, wallId: string | null): number {
  const same = doc.items.filter((item) => item.wallId === wallId);
  if (!same.length) return 0;
  return Math.max(...same.map((item) => item.orderIndex)) + 1;
}

function mutate(doc: ProjectDoc, cmd: Command): string[] {
  switch (cmd.type) {
    case 'add_item': {
      if (cmd.targetIds.length !== 1) return ['add_item memakai tepat satu targetIds sebagai id item baru.'];
      const id = cmd.targetIds[0];
      const subtype = cmd.item.subtype ?? cmd.item.type;
      const elevation = cmd.item.elevationCm ?? defaultElevation(doc, cmd.item.type, subtype);
      const item = blankItem({
        id,
        type: cmd.item.type,
        subtype,
        wallId: cmd.item.wallId,
        parentId: cmd.item.parentId ?? null,
        offsetCm: cmd.item.offsetCm ?? 0,
        elevationCm: elevation,
        positionCm: cmd.item.positionCm ?? { x: 0, y: elevation, z: 0 },
        rotationY: cmd.item.rotationY ?? 0,
        dims: cmd.item.dims,
        label: cmd.item.label ?? `${cmd.item.type} ${Math.round(cmd.item.dims.w)}cm`,
        tags: cmd.item.tags ?? [],
        locked: cmd.item.locked ?? false,
        visible: cmd.item.visible ?? true,
        colorLabel: cmd.item.colorLabel ?? null,
        orderIndex: nextOrder(doc, cmd.item.wallId),
        config: cmd.item.config ?? {},
        parts: {
          ...defaultParts(),
          ...cmd.item.parts,
          door: { ...defaultParts().door, ...cmd.item.parts?.door },
          body: { ...defaultParts().body, ...cmd.item.parts?.body },
          side: { ...defaultParts().side, ...cmd.item.parts?.side },
          toe: { ...defaultParts().toe, ...cmd.item.parts?.toe },
          handle: { ...defaultParts().handle, ...cmd.item.parts?.handle },
        },
      });
      if (cmd.item.led) item.led = { ...item.led, ...cmd.item.led };
      const placed = placeOnItsWall(doc, item);
      if (placed) return [placed];
      if (cmd.item.rotationY !== undefined) item.rotationY = cmd.item.rotationY;
      doc.items.push(item);
      touch(doc);
      return [];
    }
    case 'update_item': {
      const missing = requireItems(doc, cmd.targetIds);
      if (missing) return [missing];
      for (const item of doc.items) {
        if (!cmd.targetIds.includes(item.id)) continue;
        if (cmd.patch.label !== undefined) item.label = cmd.patch.label;
        if (cmd.patch.tags !== undefined) item.tags = cmd.patch.tags;
        if (cmd.patch.locked !== undefined) item.locked = cmd.patch.locked;
        if (cmd.patch.visible !== undefined) item.visible = cmd.patch.visible;
        if (cmd.patch.colorLabel !== undefined) item.colorLabel = cmd.patch.colorLabel;
        if (cmd.patch.subtype !== undefined) item.subtype = cmd.patch.subtype;
        if (cmd.patch.elevationCm !== undefined) item.elevationCm = cmd.patch.elevationCm;
        if (cmd.patch.dims) item.dims = { ...item.dims, ...cmd.patch.dims };
        if (cmd.patch.config) item.config = { ...item.config, ...cmd.patch.config };
        if (cmd.patch.led) item.led = { ...item.led, ...cmd.patch.led };
        if (cmd.patch.parts) {
          item.parts = {
            door: { ...item.parts.door, ...cmd.patch.parts.door },
            body: { ...item.parts.body, ...cmd.patch.parts.body },
            side: { ...item.parts.side, ...cmd.patch.parts.side },
            toe: { ...item.parts.toe, ...cmd.patch.parts.toe },
            handle: { ...item.parts.handle, ...cmd.patch.parts.handle },
          };
        }
        const placed = placeOnItsWall(doc, item);
        if (placed) return [placed];
        if (cmd.patch.rotationY !== undefined) item.rotationY = cmd.patch.rotationY;
      }
      touch(doc);
      return [];
    }
    case 'move_item': {
      const missing = requireItems(doc, cmd.targetIds);
      if (missing) return [missing];
      for (const item of doc.items) {
        if (!cmd.targetIds.includes(item.id)) continue;
        if (cmd.wallId !== undefined) item.wallId = cmd.wallId;
        if (cmd.offsetCm !== undefined) item.offsetCm = cmd.offsetCm;
        if (cmd.positionCm && !item.wallId) item.positionCm = { ...cmd.positionCm, y: item.elevationCm };
        const placed = placeOnItsWall(doc, item);
        if (placed) return [placed];
      }
      touch(doc);
      return [];
    }
    case 'remove_item': {
      const missing = requireItems(doc, cmd.targetIds);
      if (missing) return [missing];
      const drop = descendantIds(doc, cmd.targetIds);
      doc.items = doc.items.filter((item) => !drop.has(item.id));
      touch(doc);
      return [];
    }
    case 'duplicate_item': {
      const missing = requireItems(doc, cmd.targetIds);
      if (missing) return [missing];
      for (const id of cmd.targetIds) {
        const source = doc.items.find((item) => item.id === id)!;
        const copy = structuredClone(source);
        copy.id = allocateItemId(doc, source.type);
        copy.label = `${source.label} salinan`;
        copy.parentId = null;
        copy.orderIndex = nextOrder(doc, source.wallId);
        copy.createdAt = new Date().toISOString();
        if (source.wallId) copy.offsetCm = source.offsetCm + source.dims.w;
        else copy.positionCm = { ...source.positionCm, x: source.positionCm.x + source.dims.w };
        const placed = placeOnItsWall(doc, copy);
        if (placed) return [placed];
        doc.items.push(copy);
      }
      touch(doc);
      return [];
    }
    case 'set_global': {
      doc.globals = { ...doc.globals, ...cmd.globals };
      if (cmd.countertop) doc.countertop = { ...doc.countertop, ...cmd.countertop };
      touch(doc);
      return [];
    }
    case 'set_material': {
      const index = doc.materials.findIndex((material) => material.id === cmd.material.id);
      if (index >= 0) doc.materials[index] = cmd.material;
      else doc.materials.push(cmd.material);
      if (cmd.part && cmd.part !== 'countertop') {
        const missing = requireItems(doc, cmd.targetIds);
        if (missing) return [missing];
        for (const item of doc.items) {
          if (!cmd.targetIds.includes(item.id)) continue;
          item.parts[cmd.part] = {
            ...item.parts[cmd.part],
            materialId: cmd.material.id,
            tipe: cmd.material.tipe,
            warna: cmd.material.warna,
          };
        }
      } else if (cmd.part === 'countertop') {
        doc.countertop = { ...doc.countertop, tipe: cmd.material.id, };
      } else {
        const materialIds = new Set(doc.materials.map((material) => material.id));
        const unknown = cmd.targetIds.filter((id) => id !== cmd.material.id && !materialIds.has(id) && !doc.items.some((item) => item.id === id));
        if (unknown.length) return [`Material atau item ${unknown.map((id) => `"${id}"`).join(', ')} tidak ditemukan.`];
      }
      touch(doc);
      return [];
    }
    case 'add_wall': {
      if (cmd.targetIds.length !== 1) return ['add_wall memakai tepat satu targetIds sebagai id dinding baru.'];
      const id = cmd.targetIds[0];
      const distance = wallLengthCm(cmd.wall);
      if (Math.abs(distance - cmd.wall.panjangCm) > 0.1) {
        return [`Panjang dinding "${cmd.wall.nama}" (${cmd.wall.panjangCm} cm) tidak sesuai jarak titik awal dan akhir (${Math.round(distance * 10) / 10} cm).`];
      }
      doc.room.walls.push({ id, nama: cmd.wall.nama, panjangCm: cmd.wall.panjangCm, start: cmd.wall.start, end: cmd.wall.end });
      const xs = doc.room.walls.flatMap((wall) => [wall.start.x, wall.end.x]);
      const zs = doc.room.walls.flatMap((wall) => [wall.start.z, wall.end.z]);
      doc.room.lebarCm = Math.max(...xs) - Math.min(...xs);
      doc.room.dalamCm = Math.max(...zs) - Math.min(...zs);
      touch(doc);
      return [];
    }
    case 'update_room': {
      doc.room = { ...doc.room, ...cmd.room, walls: doc.room.walls, bukaan: doc.room.bukaan };
      touch(doc);
      return [];
    }
    case 'group_items': {
      const missing = requireItems(doc, cmd.targetIds);
      if (missing) return [missing];
      if (cmd.parentId) {
        if (!doc.items.some((item) => item.id === cmd.parentId)) return [`Parent "${cmd.parentId}" tidak ditemukan.`];
        if (wouldCycle(doc, cmd.targetIds, cmd.parentId)) return ['Pengelompokan membentuk siklus.'];
      }
      for (const item of doc.items) {
        if (cmd.targetIds.includes(item.id)) item.parentId = cmd.parentId;
      }
      touch(doc);
      return [];
    }
    case 'apply_template': {
      if (cmd.targetIds.length !== 1) return ['apply_template memakai tepat satu targetIds sebagai id item baru.'];
      const template = findTemplate(cmd.templateId);
      if (!template) return [`Template "${cmd.templateId}" tidak dikenal.`];
      const dims = template.dims(doc.globals);
      const elevation = template.elevation(doc.globals);
      const item = blankItem({
        id: cmd.targetIds[0],
        type: template.type,
        subtype: template.subtype,
        label: template.label,
        dims,
        wallId: cmd.wallId,
        offsetCm: cmd.offsetCm,
        elevationCm: elevation,
        orderIndex: nextOrder(doc, cmd.wallId),
      });
      const placed = placeOnItsWall(doc, item);
      if (placed) return [placed];
      doc.items.push(item);
      touch(doc);
      return [];
    }
    default:
      return ['Perintah tidak dikenal.'];
  }
}

export function applyCommand(doc: ProjectDoc, cmd: unknown): ApplyResult {
  const parsed = commandSchema.safeParse(cmd);
  if (!parsed.success) return { doc, violations: commandErrors(parsed.error) };
  const next = structuredClone(doc);
  const problems = mutate(next, parsed.data);
  if (problems.length) return { doc, violations: problems };
  const checked = projectDocSchema.safeParse(next);
  if (!checked.success) return { doc, violations: commandErrors(checked.error) };
  const violations = freshViolations(doc, checked.data);
  if (violations.length) return { doc, violations };
  return { doc: checked.data, violations: [] };
}
