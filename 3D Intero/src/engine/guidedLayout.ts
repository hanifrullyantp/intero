import type { Item, ItemConfig, KitchenLayout, LightingSettings, Project, ProjectMaterials, Wall } from '../models/types';
import { createItem, uid } from '../config/library';
import { placeOnWall, r1, wallLength } from '../utils/geometry';
import { autoKitchen } from './kitchenRules';
import { detectCornerOrientation } from './cornerOrientation';
import { freezeApplianceSize } from './applianceHousing';

export interface GuidedItem { key: string; label: string; width: number; width2?: number; fixed?: boolean }
export interface GuidedSpec {
  name: string; shape: KitchenLayout; items: GuidedItem[];
  ceiling: number; baseH: number; wallH: number; gap: number; ctDepth: number; wallDepth: number;
  materials: ProjectMaterials;
  totalH?: number;
  baseDepth?: number;
  wallLengths?: Partial<Record<'A' | 'B' | 'C', number>>;
  lighting?: LightingSettings;
}

export const GUIDED_CATALOG = [
  { key: 'base_top', label: 'Kabinet Bawah + Atas', defW: 60 },
  { key: 'base_only', label: 'Kabinet Bawah saja', defW: 60 },
  { key: 'wall_only', label: 'Kabinet Atas saja', defW: 60 },
  { key: 'sink', label: 'Sink Cabinet', defW: 80 },
  { key: 'stove', label: 'Kompor + Hood', defW: 80 },
  { key: 'stove_free', label: 'Kompor Freestanding', defW: 60 },
  { key: 'fridge', label: 'Lemari Kulkas 2 Pintu', defW: 70 },
  { key: 'fridge_sbs', label: 'Lemari Kulkas Side-by-side', defW: 90 },
  { key: 'electro', label: 'Kabinet Elektronik (Magiccom + Oven)', defW: 100 },
  { key: 'dispenser', label: 'Kabinet Dispenser', defW: 60 },
  { key: 'pantry', label: 'Pantry Tower', defW: 60 },
  { key: 'open_shelf', label: 'Open Shelf', defW: 60 },
  { key: 'corner_l', label: 'Sudut kiri', defW: 90, cornerOnly: true },
  { key: 'corner_r', label: 'Sudut kanan', defW: 90, cornerOnly: true },
];

export interface GuidedRun { wall: string; label: string; items: GuidedItem[]; startAfter: number }
export const cornerW = (i: GuidedItem) => Math.max(60, i.width || 90);
export const cornerD = (i: GuidedItem) => Math.max(60, i.width2 ?? i.width ?? 90);
const isCornerKey = (key: string) => key === 'corner_l' || key === 'corner_r';

export function splitRuns(shape: KitchenLayout, items: GuidedItem[], ctDepth: number): GuidedRun[] {
  if (shape === 'I') return [{ wall: 'A', label: 'Sisi lurus', items, startAfter: 0 }];
  const corners = items.map((i, n) => isCornerKey(i.key) ? n : -1).filter((n) => n >= 0);
  if (shape === 'L') {
    const index = corners[corners.length - 1];
    if (index === undefined) return [{ wall: 'A', label: 'Sisi A', items, startAfter: 0 }, { wall: 'B', label: 'Sisi B', items: [], startAfter: ctDepth }];
    return [
      { wall: 'A', label: 'Sisi A, menuju sudut', items: items.slice(0, index + 1), startAfter: 0 },
      { wall: 'B', label: 'Sisi B, setelah sudut', items: items.slice(index + 1), startAfter: cornerD(items[index]) },
    ];
  }
  if (corners.length >= 2) {
    const first = corners[0], last = corners[corners.length - 1];
    return [
      { wall: 'B', label: 'Sisi kiri', items: items.slice(0, first), startAfter: cornerD(items[first]) },
      { wall: 'A', label: 'Sisi belakang', items: items.slice(first, last + 1), startAfter: 0 },
      { wall: 'C', label: 'Sisi kanan', items: items.slice(last + 1), startAfter: cornerD(items[last]) },
    ];
  }
  return [{ wall: 'A', label: 'Sisi A', items, startAfter: 0 }];
}

function wall(id: string, label: string, x1: number, y1: number, x2: number, y2: number, nx: number, ny: number, rotation: Wall['rotation'], height: number): Wall {
  return { id, label, x1, y1, x2, y2, nx, ny, rotation, height };
}

function place(entry: string, w: Wall, offset: number, patch: Partial<Item>, config: Partial<ItemConfig> = {}): Item {
  const item = createItem(entry, patch, config);
  return freezeApplianceSize({ ...item, ...placeOnWall(w, offset, item.width, item.depth), wallId: w.id, visible: true, openAmount: 0 });
}

export function generateGuided(spec: GuidedSpec): Project {
  const { shape, items, materials, baseH, wallDepth, ctDepth, ceiling } = spec;
  const runs = splitRuns(shape, items, ctDepth);
  const lengths = new Map(runs.map((run) => [run.wall, r1(run.startAfter + run.items.reduce((n, i) => n + (isCornerKey(i.key) ? cornerW(i) : i.width), 0))]));
  const A = spec.wallLengths?.A ?? Math.max(120, lengths.get('A') ?? 300);
  const B = spec.wallLengths?.B ?? Math.max(120, lengths.get('B') ?? 240);
  const C = spec.wallLengths?.C ?? Math.max(120, lengths.get('C') ?? 240);
  const walls = [wall('A', 'Sisi A', 0, 0, A, 0, 0, 1, 0, ceiling)];
  if (shape === 'L') walls.push(wall('B', 'Sisi B', A, 0, A, B, -1, 0, 90, ceiling));
  if (shape === 'U') walls.push(wall('B', 'Sisi B', 0, 0, 0, B, 1, 0, 270, ceiling), wall('C', 'Sisi C', A, 0, A, C, -1, 0, 90, ceiling));
  const baseDepth = spec.baseDepth ?? Math.max(30, ctDepth - 2);
  const wallBottom = r1(baseH + materials.countertopThickness + (materials.backsplash ? Math.max(materials.backsplashHeight, spec.gap) : spec.gap));
  const totalH = spec.totalH ?? r1(wallBottom + spec.wallH);
  const upperH = r1(totalH - wallBottom);
  if (upperH < 20) throw new Error('Tinggi total terlalu rendah. Sisakan minimal 20 cm di atas backsplash.');
  if (totalH > ceiling) throw new Error('Tinggi kabinet total tidak boleh melebihi plafon.');
  const out: Item[] = [];
  const upper = (w: Wall, offset: number, width: number) => place(width >= 70 ? 'wall_double' : 'wall_single', w, offset,
    { width, height: upperH, depth: wallDepth, elevation: wallBottom });

  for (const run of runs) {
    const w = walls.find((v) => v.id === run.wall);
    if (!w) continue;
    let cursor = run.startAfter;
    for (const specItem of run.items) {
      const k = specItem.key;
      const width = r1(specItem.width);
      if (isCornerKey(k)) {
        const cw = cornerW(specItem), cd = cornerD(specItem);
        const base = place('base_corner_l', w, cursor, { width: cw, depth: cd, height: baseH }, { cornerDepth: baseDepth, cornerDoorModel: 'both' });
        out.push(detectCornerOrientation(base, walls));
        const top = place('wall_corner', w, cursor, { width: cw, depth: cd, height: upperH, elevation: wallBottom }, { cornerDepth: wallDepth, cornerDoorModel: 'both' });
        out.push(detectCornerOrientation(top, walls));
        cursor = r1(cursor + cw);
        continue;
      }
      if (width <= 0) continue;
      if (k === 'gap') { cursor = r1(cursor + width); continue; }
      if (k === 'filler') {
        out.push(place('acc_filler', w, cursor, { width, height: baseH, depth: baseDepth }));
        cursor = r1(cursor + width);
        continue;
      }
      const tallEntry: Record<string, string> = { fridge: 'tall_fridge', fridge_sbs: 'tall_fridge_sbs', electro: 'tall_electro', dispenser: 'tall_dispenser', pantry: 'tall_pantry' };
      if (tallEntry[k]) {
        out.push(place(tallEntry[k], w, cursor, { width, height: totalH, depth: baseDepth }, k === 'electro' ? {
          appliances: ['magiccom', 'oven'],
          magiccom: { width: 32, height: 30, depth: 34, extension: 42, shelfHeight: r1(baseH + materials.countertopThickness) },
        } : {}));
      } else if (k === 'wall_only') {
        out.push(upper(w, cursor, width));
      } else {
        const baseEntry = k === 'sink' ? 'base_sink' : k === 'stove' || k === 'stove_free' ? 'base_stove'
          : k === 'open_shelf' ? 'base_open' : width >= 70 ? 'base_double' : width < 35 ? 'base_pullout' : 'base_drawer_3';
        const base = place(baseEntry, w, cursor, { width, height: baseH, depth: baseDepth });
        out.push(base);
        if (k === 'sink' || k === 'stove' || k === 'stove_free') {
          const sink = k === 'sink';
          const entry = sink ? width >= 90 ? 'app_sink_double' : 'app_sink_single' : width < 60 ? 'app_cooktop_2' : 'app_cooktop_4';
          const apWidth = sink ? Math.min(width - 8, width >= 90 ? 80 : 50) : Math.min(width - 4, width < 60 ? 30 : 60);
          const ap = place(entry, w, cursor + (width - apWidth) / 2, {
            width: apWidth, elevation: sink ? baseH : baseH + materials.countertopThickness,
            depth: Math.min(baseDepth - 4, sink ? 42 : 52),
          }, { applianceHostId: base.id });
          ap.x = r1(ap.x + w.nx * (baseDepth - ap.depth) / 2);
          ap.y = r1(ap.y + w.ny * (baseDepth - ap.depth) / 2);
          out.push(ap);
          if (!sink) {
            const hood = place('app_hood_slim', w, cursor, { width, elevation: wallBottom, height: 15 }, { hoodAuto: true, applianceHostId: ap.id });
            const housing = place('wall_hood', w, cursor, { width, depth: wallDepth, elevation: wallBottom + hood.height, height: upperH - hood.height }, { applianceHostId: hood.id });
            out.push(hood, housing);
          } else out.push(upper(w, cursor, width));
        } else if (k === 'base_top') out.push(upper(w, cursor, width));
      }
      cursor = r1(cursor + width);
    }
  }
  const now = new Date().toISOString();
  return {
    id: uid('prj'), name: spec.name || 'Kitchen Set', type: 'kitchen', layout: shape,
    room: { width: A, depth: shape === 'I' ? 250 : Math.max(B, shape === 'U' ? C : 0, 200), ceilingHeight: ceiling, walls },
    items: autoKitchen(out, materials, totalH), materials: { ...materials },
    settings: {
      kerf: 3, laborRate: 1500000, markup: 20, unit: 'cm', gridSize: 1, countertopMode: 'flat', countertopDepth: baseDepth,
      defaults: { totalHeight: totalH, baseHeight: baseH, baseDepth, wallHeight: upperH, wallDepth, wallBottom, tallDepth: baseDepth },
      lighting: spec.lighting ?? { under: true, inWall: false, inBase: false, tone: 'warm', brightness: 1, glow: true },
      dimensionVersion: 2,
    },
    createdAt: now, updatedAt: now,
  };
}

export { wallLength };