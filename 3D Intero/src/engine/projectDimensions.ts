import type { Item, Project, ProjectDefaults } from '../models/types';
import { footprint, overlapArea, r1 } from '../utils/geometry';
import { autoKitchen, baseRunDepth, wallBottomFor } from './kitchenRules';
import { freezeApplianceSize } from './applianceHousing';
import { detectCornerOrientation } from './cornerOrientation';
import { electronicsLayout } from './electronicsTower';

export type KitchenDimensions = ProjectDefaults & { totalHeight: number };

export function projectDimensions(project: Project): KitchenDimensions {
  const stored = project.settings.defaults;
  const bases = project.items.filter((i) => i.kind === 'cabinet' && i.category === 'base');
  const uppers = project.items.filter((i) => i.kind === 'cabinet' && i.category === 'wall' && i.subtype !== 'wall_hood');
  const tall = project.items.filter((i) => i.kind === 'cabinet' && i.category === 'tall');
  const bottom = stored?.wallBottom ?? (uppers.length ? Math.min(...uppers.map((i) => i.elevation)) : wallBottomFor(project.items, project.materials));
  const line = [...uppers, ...tall].map((i) => i.elevation + i.height);
  const top = stored?.totalHeight ?? (line.length ? Math.max(bottom + 20, ...line) : Math.max(220, bottom + 70));
  return {
    baseHeight: stored?.baseHeight ?? bases[0]?.height ?? 85,
    baseDepth: stored?.baseDepth ?? baseRunDepth(project.items),
    wallDepth: stored?.wallDepth ?? uppers.find((i) => !i.subtype.includes('corner'))?.depth ?? 33,
    wallBottom: r1(bottom),
    wallHeight: r1(top - bottom),
    tallDepth: stored?.tallDepth ?? tall[0]?.depth ?? 55,
    totalHeight: r1(top),
  };
}

function depthAtBack(item: Item, depth: number): Item {
  if (item.subtype.includes('corner')) return { ...item, config: { ...item.config, cornerDepth: depth } };
  const delta = item.depth - depth;
  return { ...item, depth, x: item.rotation === 90 ? r1(item.x + delta) : item.x, y: item.rotation === 180 ? r1(item.y + delta) : item.y };
}

export function defaultsForNewItem(item: Item, project: Project): Item {
  if (project.type !== 'kitchen' || !project.settings.defaults || item.kind !== 'cabinet' || item.config.stackParentId || item.subtype === 'tv_console') return freezeApplianceSize(item);
  const d = projectDimensions(project);
  let result = freezeApplianceSize(item);
  if (item.category === 'base') result = { ...depthAtBack(result, d.baseDepth), height: d.baseHeight };
  if (item.category === 'wall') result = { ...depthAtBack(result, d.wallDepth), elevation: d.wallBottom, height: d.wallHeight };
  if (item.category === 'tall') result = { ...depthAtBack(result, d.tallDepth), height: d.totalHeight - item.elevation };
  if (item.subtype === 'tall_electro') {
    const layout = electronicsLayout(result);
    result = { ...result, config: { ...result.config, magiccom: { ...layout.magiccom, shelfHeight: d.baseHeight + project.materials.countertopThickness } } };
  }
  return result;
}

/** One edit updates the complete cabinet line, including corners and appliance housings. */
export function applyProjectDimensions(project: Project, patch: Partial<ProjectDefaults> = {}): Project {
  const before = projectDimensions(project);
  const d: KitchenDimensions = { ...before, ...patch, totalHeight: patch.totalHeight ?? before.totalHeight };
  for (const value of Object.values(d)) if (!Number.isFinite(value)) throw new Error('Ukuran harus berupa angka yang valid.');
  if (patch.baseHeight !== undefined && patch.wallBottom === undefined) d.wallBottom = r1(before.wallBottom + d.baseHeight - before.baseHeight);
  if (patch.wallHeight !== undefined && patch.totalHeight === undefined) d.totalHeight = r1(d.wallBottom + patch.wallHeight);
  if (d.totalHeight - d.wallBottom < 20) throw new Error('Sisakan minimal 20 cm untuk kabinet atas. Naikkan tinggi total atau turunkan elevasi bawah.');
  if (d.baseHeight < 20 || Math.min(d.baseDepth, d.wallDepth, d.tallDepth) < 10) throw new Error('Dimensi kabinet terlalu kecil.');
  d.wallHeight = r1(d.totalHeight - d.wallBottom);

  const original = project.items.map(freezeApplianceSize);
  const uppers = original.filter((i) => i.kind === 'cabinet' && i.category === 'wall' && i.subtype !== 'wall_hood');
  const chains = new Map<string, Item[]>();
  const parentOf = (i: Item) => uppers.find((o) => o.id !== i.id && (
    i.config.stackParentId === o.id ||
    (Math.abs(o.elevation + o.height - i.elevation) < 1 && overlapArea(footprint(o), footprint(i)) > 4)
  ));
  for (const upper of uppers) {
    let root = upper;
    const seen = new Set<string>();
    while (!seen.has(root.id)) {
      seen.add(root.id);
      const parent = parentOf(root);
      if (!parent) break;
      root = parent;
    }
    const chain = chains.get(root.id) ?? [];
    chain.push(upper);
    chains.set(root.id, chain);
  }
  const levels = new Map<string, { height: number; elevation: number }>();
  for (const chain of chains.values()) {
    chain.sort((a, b) => a.elevation - b.elevation);
    const sum = chain.reduce((n, i) => n + i.height, 0);
    let y = d.wallBottom;
    chain.forEach((i, index) => {
      const height = index === chain.length - 1 ? r1(d.totalHeight - y) : r1(d.wallHeight * i.height / sum);
      levels.set(i.id, { height, elevation: y });
      y = r1(y + height);
    });
  }
  let items = original.map((item) => {
    if (item.kind !== 'cabinet') return item;
    let result = item;
    if (item.category === 'base') result = { ...depthAtBack(item, d.baseDepth), height: d.baseHeight };
    if (item.category === 'wall') {
      result = depthAtBack(item, d.wallDepth);
      const level = levels.get(item.id);
      if (level) result = { ...result, ...level };
    }
    if (item.category === 'tall') result = { ...depthAtBack(item, d.tallDepth), height: r1(d.totalHeight - item.elevation) };
    if (item.subtype === 'tall_electro') {
      const layout = electronicsLayout(result);
      result = { ...result, config: { ...result.config, magiccom: { ...layout.magiccom, shelfHeight: r1(d.baseHeight + project.materials.countertopThickness) } } };
    }
    return detectCornerOrientation(result, project.room.walls);
  });
  // Worktop appliances follow their own host, not the refrigerator or another tall unit.
  const baseDelta = r1(d.baseHeight - before.baseHeight);
  if (baseDelta) items = items.map((i) => i.subtype.startsWith('app_cooktop') || i.subtype.startsWith('app_sink')
    ? { ...i, elevation: r1(i.elevation + baseDelta) } : i);
  items = autoKitchen(items, project.materials, d.totalHeight);
  const countertopDepth = Math.abs(d.baseDepth - before.baseDepth) > 0.05
    ? d.baseDepth : project.settings.countertopDepth ?? d.baseDepth;
  return { ...project, items, settings: { ...project.settings, defaults: d, countertopDepth, dimensionVersion: 2 } };
}

/** Old project files have no independent appliance dimensions. Freeze the old appliance first. */
export function migrateKitchenProject(project: Project): Project {
  if (project.type !== 'kitchen' || project.settings.dimensionVersion === 2) return project;
  const items = project.items.map((i) => {
    let item = i;
    if (i.subtype.startsWith('tall_fridge') && !i.config.fridge) {
      item = { ...i, config: { ...i.config, fridge: {
        width: Math.max(20, i.width - 4), height: Math.max(80, Math.min(i.height - 42, 180)),
        depth: Math.max(20, i.depth - 2), clearanceTop: 5,
      } } };
    }
    return detectCornerOrientation(freezeApplianceSize(item), project.room.walls);
  });
  const prepared: Project = { ...project, items, settings: {
    ...project.settings,
    defaults: project.settings.defaults?.totalHeight ? project.settings.defaults : undefined,
    lighting: project.settings.lighting ?? { under: true, inWall: false, inBase: false, tone: 'warm', brightness: 1, glow: true },
  } };
  // Generated kitchens carry countertopMode; repair their mismatched top line once, on load.
  if (project.settings.countertopMode && items.some((i) => i.category === 'wall')) return applyProjectDimensions(prepared);
  return { ...prepared, settings: { ...prepared.settings, dimensionVersion: 2 } };
}