import type { Item, Project, Wall } from '../models/types';
import { footprint, offsetOnWall, overlapArea, placeOnWall, r1, wallLength } from '../utils/geometry';

const corner = (i: Item) => i.kind === 'cabinet' && i.subtype.includes('corner');
const runRoot = (i: Item) => i.kind === 'cabinet' && (i.category === 'base' || i.category === 'tall') && !corner(i);
const alongWidth = (i: Item) => i.width;

/** Presentation order and physical order are the same; corner cabinets remain fixed anchors. */
export function wallRunItems(project: Project, w: Wall): Item[] {
  return project.items.filter((i) => runRoot(i) && i.wallId === w.id && i.rotation === w.rotation)
    .sort((a, b) => offsetOnWall(w, footprint(a)) - offsetOnWall(w, footprint(b)));
}

function intersectsSameRun(a: Item, b: Item): boolean {
  if (a.wallId !== b.wallId || a.rotation !== b.rotation) return false;
  const af = footprint(a), bf = footprint(b);
  const overlap = overlapArea(af, bf);
  return overlap >= 0.7 * Math.min(af.w * af.h, bf.w * bf.h);
}

/** Resolve an appliance or upper layer to the base/tall cabinet that should move with it. */
export function reorderHost(project: Project, id: string, visited = new Set<string>()): Item | undefined {
  if (visited.has(id)) return undefined;
  visited.add(id);
  const item = project.items.find((i) => i.id === id);
  if (!item) return undefined;
  if (runRoot(item)) return item;
  if (item.config.applianceHostId) {
    const host = reorderHost(project, item.config.applianceHostId, visited);
    if (host) return host;
  }
  if (item.config.stackParentId) {
    const host = reorderHost(project, item.config.stackParentId, visited);
    if (host) return host;
  }
  if (item.kind === 'cabinet' && item.category === 'wall' && !corner(item)) {
    return project.items.filter((root) => runRoot(root) && intersectsSameRun(root, item))
      .sort((a, b) => overlapArea(footprint(b), footprint(item)) - overlapArea(footprint(a), footprint(item)))[0];
  }
  if (item.subtype.startsWith('app_sink') || item.subtype.startsWith('app_cooktop')) {
    return project.items.filter((i) => runRoot(i) && i.category === 'base' && i.wallId === item.wallId)
      .sort((a, b) => overlapArea(footprint(b), footprint(item)) - overlapArea(footprint(a), footprint(item)))[0];
  }
  return undefined;
}

/** Order items on a wall; dependents are inferred by their host ID or plan footprint. */
export function physicalReorder(project: Project, fromId: string, toId: string, before: boolean): { items?: Item[]; error?: string } {
  const source = reorderHost(project, fromId), target = reorderHost(project, toId);
  if (!source || !target || source.id === target.id) return { error: 'Pilih dua kabinet berbeda pada dinding yang sama.' };
  if (source.locked || target.locked) return { error: 'Buka kunci kabinet sebelum mengubah urutannya.' };
  if (source.wallId !== target.wallId || source.rotation !== target.rotation) return { error: 'Pindahkan kabinet di antara layer pada dinding yang sama.' };
  const wall = project.room.walls.find((w) => w.id === source.wallId);
  if (!wall) return { error: 'Dinding untuk kabinet tidak ditemukan.' };
  const anchors = project.items.filter((i) => corner(i) && i.wallId === wall.id && i.rotation === wall.rotation)
    .map((i) => ({ start: offsetOnWall(wall, footprint(i)), end: offsetOnWall(wall, footprint(i)) + i.width }))
    .sort((a, b) => a.start - b.start);
  const segment = (i: Item) => anchors.filter((a) => a.end <= offsetOnWall(wall, footprint(i)) + 0.1).length;
  if (segment(source) !== segment(target)) return { error: 'Kabinet tidak bisa melompati sudut tetap. Gunakan dinding yang sama.' };
  const roots = wallRunItems(project, wall).filter((i) => segment(i) === segment(source));
  if (roots.length < 2) return { error: 'Setidaknya dua kabinet pada dinding yang sama diperlukan.' };
  const ordered = roots.filter((i) => i.id !== source.id);
  const dest = ordered.findIndex((i) => i.id === target.id);
  if (dest < 0) return { error: 'Posisi tujuan tidak ditemukan.' };
  ordered.splice(dest + (before ? 0 : 1), 0, source);

  const minOffset = Math.min(...roots.map((i) => offsetOnWall(wall, footprint(i))));
  const anchorEnd = anchors[segment(source) - 1]?.end ?? 0;
  let cursor = r1(Math.max(minOffset, anchorEnd));
  const end = cursor + roots.reduce((n, i) => n + alongWidth(i), 0);
  const nextAnchor = anchors[segment(source)];
  if (end > wallLength(wall) + 0.1 || nextAnchor && end > nextAnchor.start + 0.1) return { error: 'Kabinet tidak muat sebelum sudut/dinding berikutnya.' };

  const positions = new Map<string, { x: number; y: number; dx: number; dy: number }>();
  for (const root of ordered) {
    const pos = placeOnWall(wall, cursor, root.width, root.depth);
    positions.set(root.id, { x: pos.x, y: pos.y, dx: r1(pos.x - root.x), dy: r1(pos.y - root.y) });
    cursor = r1(cursor + root.width);
  }

  const parent = new Map<string, string>();
  for (const item of project.items) {
    if (positions.has(item.id)) continue;
    if (item.config.applianceHostId) { parent.set(item.id, item.config.applianceHostId); continue; }
    if (item.config.stackParentId) { parent.set(item.id, item.config.stackParentId); continue; }
    if (item.kind === 'cabinet' && item.category === 'wall' && !corner(item)) {
      const root = roots.find((r) => intersectsSameRun(r, item));
      if (root) parent.set(item.id, root.id);
    } else if (item.subtype.startsWith('app_sink') || item.subtype.startsWith('app_cooktop')) {
      const root = roots.filter((r) => r.category === 'base')
        .sort((a, b) => overlapArea(footprint(b), footprint(item)) - overlapArea(footprint(a), footprint(item)))[0];
      if (root && overlapArea(footprint(root), footprint(item)) > 0) parent.set(item.id, root.id);
    }
  }
  const movement = (id: string, visited = new Set<string>()): { dx: number; dy: number } | undefined => {
    if (visited.has(id)) return undefined;
    visited.add(id);
    const direct = positions.get(id);
    if (direct) return direct;
    const idOfParent = parent.get(id);
    return idOfParent ? movement(idOfParent, visited) : undefined;
  };
  const items = project.items.map((i) => {
    const root = positions.get(i.id);
    if (root) return { ...i, x: root.x, y: root.y };
    const delta = movement(i.id);
    return delta && (delta.dx || delta.dy) ? { ...i, x: r1(i.x + delta.dx), y: r1(i.y + delta.dy) } : i;
  });
  return { items };
}