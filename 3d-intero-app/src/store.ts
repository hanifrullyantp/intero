import { create } from 'zustand';
import type {
  CustomComponent, DimensionLine, DoorMaterial, Item, ItemConfig, ItemType, LedConfig, Materials, ProjectData,
  ProjectSettings, Theme, ToolId, TopSubMode, UiMode, V3, ViewMode, Wall, CountertopSettings, ItemScope, ScopeDefault,
  AppMode, ProdView, PriceItem, DimLayers, DimUnit, ProductionSettings, ProdTab, CatalogItem,
} from './types';
import { APP_VERSION, DEFAULT_LED, DEFAULT_MATERIALS, DEFAULT_SETTINGS, FORMAT_VERSION, TYPE_LABELS } from './lib/constants';
import { isMobileViewport, storage, uid } from './lib/utils';
import { DEFAULT_PRICES } from './production/prices';
import { applyWallOrder, distanceToWall, nearestWall, offsetOnWall, repackAll, resortWallByPosition, roomCenter, rowOf, wallVec } from './engine/walls';
import { fromProjectData, toProjectData } from './projectdoc/adapter';
import { isProjectDocV1Enabled } from './projectdoc/flag';
import type { HistoryEntry } from './projectdoc/history';
import { beginDocPreview, endDocPreview } from './projectdoc/preview';
import type { ProjectDoc } from './projectdoc/schema';
import { armDocHistory, cancelDocArm, redoDocHistory, undoDocHistory } from './projectdoc/session';

export interface Snapshot { items: Item[]; walls: Wall[]; settings: ProjectSettings; dimensions: DimensionLine[]; projectName: string }

export interface ItemPatch {
  name?: string; type?: ItemType; wallId?: string | null; rotationY?: number; visible?: boolean; locked?: boolean; colorLabel?: string | null;
  dims?: Partial<Item['dims']>; position?: Partial<V3>; materials?: Partial<Materials>; config?: Partial<ItemConfig>; led?: Partial<LedConfig>;
}

export interface NewItemInput {
  id?: string;
  type: ItemType; dims: { w: number; h: number; d: number }; name?: string; config?: ItemConfig;
  materials?: Partial<Materials>; led?: Partial<LedConfig>; wallId?: string | null; position?: V3; rotationY?: number; orderIndex?: number;
}

export type AlignMode = 'left' | 'centerX' | 'right' | 'front' | 'centerZ' | 'back' | 'bottom' | 'top' | 'distributeX' | 'distributeZ';
export interface ArrayOptions { mode: 'linear' | 'grid' | 'circular'; count: number; spacing: number; countY: number; spacingY: number; radius: number; axis: 'x' | 'z' }

interface UIState {
  selectedIds: string[]; hoverId: string | null;
  tool: ToolId; viewMode: ViewMode; topSubMode: TopSubMode;
  openIds: string[]; xray: boolean; explode: boolean;
  shareMode: 'view' | 'edit' | null;
  brightness: number; showPeople: boolean; lightsOn: boolean;
  appMode: AppMode; prodView: ProdView; prodTab: ProdTab; prices: PriceItem[]; catalog: CatalogItem[]; designThumb: string | null;
  showDimensions: boolean; showDimPanel: boolean; dimLayers: DimLayers; dimUnit: DimUnit; dimDecimals: 0 | 1 | 2;
  arPins: { a: V3 | null; b: V3 | null }; pickingPin: 'a' | 'b' | null;
  showAr: boolean; showPhoto: boolean; showPriceList: boolean; xrMode: 'none' | 'ar' | 'vr'; pinTools: boolean;
  showArFallback: boolean; showCameraAr: boolean;
  frameLabelMode: 'block' | 'doors' | 'detail';
  frameLabelScale: number;
  frameHideBlocks: string[];
  frameHideDoors: boolean;
  spotlight: { target: string; title: string; hint: string } | null;
  showSearch: boolean;
  showAiChat: boolean;
  uiMode: UiMode; theme: Theme;
  showGrid: boolean; showShadows: boolean; showLayers: boolean; showLibrary: boolean; showProps: boolean;
  showWizard: boolean; showBuilder: boolean; showShortcuts: boolean; showAbout: boolean; showPrefs: boolean;
  layersDocked: boolean;
  paintColor: string; paintMaterial: DoorMaterial;
  clipboard: Item[];
  dirty: boolean; lastSavedAt: number | null;
  focusRequest: number; resetViewRequest: number; zoomRequest: { dir: number; n: number };
  mouseWorld: V3 | null; fps: number;
  snapSize: number;
  dialog: null | { kind: 'mirror' | 'array' | 'confirm'; title?: string; message?: string; onConfirm?: () => void };
  mobileSheet: null | 'parts' | 'props' | 'layers' | 'tools' | 'view';
  mobileDrawer: null | 'left' | 'right';
}

export interface EditorStore extends Snapshot, UIState {
  createdAt: string;
  customComponents: CustomComponent[];
  past: Snapshot[]; future: Snapshot[];
  projectDoc: ProjectDoc | null;
  docPast: HistoryEntry[];
  docFuture: HistoryEntry[];
  docPending: boolean;

  ui: (patch: Partial<UIState>) => void;
  pushHistory: () => void; undo: () => void; redo: () => void;
  setProjectName: (n: string) => void;
  newProject: (name?: string) => void;
  loadProject: (data: ProjectData) => void;
  toProjectData: () => ProjectData;
  markSaved: () => void;

  addItem: (input: NewItemInput, at?: { x: number; z: number } | null, opts?: { history?: boolean; select?: boolean }) => string;
  addItems: (inputs: NewItemInput[]) => void;
  patchItem: (id: string, patch: ItemPatch, history?: boolean) => void;
  patchItems: (ids: string[], patch: ItemPatch, history?: boolean) => void;
  removeItems: (ids: string[]) => void;
  duplicateItems: (ids: string[]) => void;
  liveTransform: (id: string, pos: V3, rotY: number) => void;
  commitTransform: (id: string, pos: V3, rotY: number, scale?: V3) => void;
  reorderWall: (wallId: string, orderedTopIds: string[]) => void;
  moveToWall: (id: string, wallId: string | null) => void;
  setGlobalHeight: (h: number) => void;
  setSettings: (patch: Partial<ProjectSettings>) => void;
  setCountertop: (patch: Partial<CountertopSettings>) => void;
  setWalls: (walls: Wall[]) => void;
  addDimension: (a: V3, b: V3) => void;
  removeDimension: (id: string) => void;
  clearDimensions: () => void;

  setSelection: (ids: string[]) => void; toggleSelect: (id: string) => void; selectAll: () => void; clearSelection: () => void;
  setTool: (t: ToolId) => void; setViewMode: (v: ViewMode) => void; setTopSubMode: (s: TopSubMode) => void;
  setTheme: (t: Theme) => void; setUiMode: (m: UiMode) => void; toggleOpenMode: () => void; setOpenMode: (o: boolean) => void;
  setBrightness: (v: number) => void; setShowPeople: (v: boolean) => void; setLightsOn: (v: boolean) => void; toggleLights: () => void;
  setAppMode: (m: AppMode) => void;
  setDim: (p: Partial<{ showDimensions: boolean; dimLayers: DimLayers; dimUnit: DimUnit; dimDecimals: 0 | 1 | 2 }>) => void;
  setProduction: (p: Partial<ProductionSettings>) => void;
  setProdTab: (t: ProdTab) => void;
  setFrame: (p: Partial<Pick<ProductionSettings, 'frameMaterial' | 'frameView' | 'frameLabels' | 'frameWelds' | 'frameExplode' | 'frameColorBy'>>) => void;
  setBacksplashHeight: (h: number) => void;
  applyToAll: (patch: ItemPatch) => void;
  applyScope: (scope: ItemScope, patch: ItemPatch) => void;
  copy: () => void; cut: () => void; paste: () => void;
  mirrorItems: (ids: string[], axis: 'x' | 'z') => void;
  arrayItems: (ids: string[], o: ArrayOptions) => void;
  alignItems: (ids: string[], mode: AlignMode) => void;
  addCustomComponent: (c: CustomComponent) => void; removeCustomComponent: (id: string) => void; setCustomComponents: (c: CustomComponent[]) => void;
}

const ID_PREFIX: Record<ItemType, string> = {
  base: 'BC', sink_base: 'SK', cooktop_base: 'CT', drawer_base: 'DR', dishwasher: 'DW', wall: 'WC', tall: 'TC', corner_base: 'CB', corner_wall: 'CW',
  fridge: 'FR', electronic: 'EC', hood: 'HD', island: 'IS', bar: 'BR', custom: 'CU',
};

export function wallHeightOf(s: ProjectSettings) { return Math.max(300, s.globalCabinetHeight - s.baseHeight - s.wallGap); }
export function wallBottomOf(s: ProjectSettings) { return s.baseHeight + s.wallGap; }
/** Tinggi backsplash efektif: otomatis = jarak top countertop ke dasar kabinet atas. */
export function backsplashHeightOf(s: ProjectSettings) { return s.countertop.backsplashAuto ? Math.max(100, wallBottomOf(s) - s.baseHeight - s.countertop.thickness) : s.countertop.backsplashHeight; }

const SCOPE_BY_TYPE: Partial<Record<ItemType, ItemScope>> = {
  wall: 'wall', corner_wall: 'wall', hood: 'wall', fridge: 'wall', tall: 'wall', electronic: 'wall',
  base: 'base', sink_base: 'base', cooktop_base: 'base', drawer_base: 'base', dishwasher: 'base', corner_base: 'base',
};
export function scopeOfType(type: ItemType): ItemScope | null { return SCOPE_BY_TYPE[type] ?? null; }
/** Apakah tipe item termasuk cakupan (wall/base) — 'all' mencakup semua. */
export function inScope(scope: ItemScope, type: ItemType): boolean { return scope === 'all' || scopeOfType(type) === scope; }
/** Gabungan default: 'all' lebih dulu, lalu cakupan spesifik menimpa. */
export function scopeDefaultsFor(settings: ProjectSettings, type: ItemType): ScopeDefault {
  const d = settings.scopeDefaults ?? {};
  const a: ScopeDefault = d.all ?? {};
  const sc = scopeOfType(type);
  const b: ScopeDefault = (sc ? d[sc] : undefined) ?? {};
  return { config: { ...a.config, ...b.config }, materials: { ...a.materials, ...b.materials }, led: { ...a.led, ...b.led } };
}

function defaultName(type: ItemType, w: number, config?: ItemConfig) {
  if (type === 'custom' && config?.customName) return config.customName;
  return `${TYPE_LABELS[type]} ${Math.round(w / 10)}cm`;
}

function snapshotOf(s: Snapshot): Snapshot {
  return { items: s.items, walls: s.walls, settings: s.settings, dimensions: s.dimensions, projectName: s.projectName };
}

function heightsForType(type: ItemType, dims: { w: number; h: number; d: number }, s: ProjectSettings) {
  const d = { ...dims };
  let y = 0;
  if (type === 'wall' || type === 'corner_wall' || type === 'hood') { y = wallBottomOf(s); if (type !== 'wall' || d.h > wallHeightOf(s)) d.h = wallHeightOf(s); if (type === 'hood') d.h = wallHeightOf(s); }
  if (type === 'tall' || type === 'fridge' || type === 'electronic') d.h = s.globalCabinetHeight;
  if (type === 'wall' && d.h === 700) d.h = wallHeightOf(s);
  return { dims: d, y };
}

const initialUI: UIState = {
  selectedIds: [], hoverId: null,
  tool: 'select', viewMode: 'perspective', topSubMode: storage.get<TopSubMode>('intero_topSubMode', 'all'),
  openIds: [], xray: false, explode: false,
  shareMode: null,
  brightness: storage.get<number>('intero_brightness', 1),
  showPeople: storage.get<boolean>('intero_showPeople', true),
  lightsOn: storage.get<boolean>('intero_lightsOn', true),
  appMode: 'design', prodView: '3d', prodTab: 'rangka', prices: DEFAULT_PRICES, catalog: [], designThumb: null,
  showDimensions: storage.get<boolean>('intero_showDims', false), showDimPanel: false,
  dimLayers: storage.get<DimLayers>('intero_dimLayers', { overall: true, wall: true, cabinet: true, internal: false, vertical: false, doors: false }),
  dimUnit: storage.get<DimUnit>('intero_dimUnit', 'cm'), dimDecimals: storage.get<0 | 1 | 2>('intero_dimDec', 1),
  arPins: { a: null, b: null }, pickingPin: null,
  showAr: false, showPhoto: false, showPriceList: false, xrMode: 'none', pinTools: false, showArFallback: false, showCameraAr: false,
  frameLabelMode: 'block', frameLabelScale: 1, frameHideBlocks: [], frameHideDoors: false,
  spotlight: null, showSearch: false, showAiChat: false,
  uiMode: storage.get<UiMode>('intero_uiMode', isMobileViewport() ? 'simple' : 'advanced'),
  theme: storage.get<Theme>('intero_theme', 'light'),
  showGrid: true, showShadows: true, showLayers: !isMobileViewport(), showLibrary: false, showProps: !isMobileViewport(),
  showWizard: false, showBuilder: false, showShortcuts: false, showAbout: false, showPrefs: false,
  layersDocked: false,
  paintColor: '#C9A97A', paintMaterial: 'HPL',
  clipboard: [], dirty: false, lastSavedAt: null,
  focusRequest: 0, resetViewRequest: 0, zoomRequest: { dir: 0, n: 0 },
  mouseWorld: null, fps: 0, snapSize: 10, dialog: null, mobileSheet: null, mobileDrawer: null,
};

export const useStore = create<EditorStore>()((set, get) => ({
  projectName: 'Proyek Dapur Baru',
  createdAt: new Date().toISOString(),
  settings: DEFAULT_SETTINGS,
  walls: [],
  items: [],
  dimensions: [],
  customComponents: [],
  past: [], future: [],
  projectDoc: null,
  docPast: [],
  docFuture: [],
  docPending: false,
  ...initialUI,

  ui: (patch) => set(patch),

  pushHistory: () => {
    if (isProjectDocV1Enabled()) { armDocHistory(); return; }
    set((s) => ({ past: [...s.past.slice(-49), snapshotOf(s)], future: [], dirty: true }));
  },
  undo: () => {
    if (isProjectDocV1Enabled()) { undoDocHistory(); return; }
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      return { ...prev, past: s.past.slice(0, -1), future: [snapshotOf(s), ...s.future].slice(0, 50), dirty: true, selectedIds: s.selectedIds.filter((id) => prev.items.some((i) => i.id === id)) };
    });
  },
  redo: () => {
    if (isProjectDocV1Enabled()) { redoDocHistory(); return; }
    set((s) => {
      const next = s.future[0];
      if (!next) return {};
      return { ...next, future: s.future.slice(1), past: [...s.past, snapshotOf(s)], dirty: true };
    });
  },

  setProjectName: (n) => set({ projectName: n, dirty: true }),
  newProject: (name = 'Proyek Dapur Baru') => {
    cancelDocArm();
    set({
      projectName: name, createdAt: new Date().toISOString(), settings: DEFAULT_SETTINGS, walls: [], items: [], dimensions: [],
      past: [], future: [], selectedIds: [], dirty: false, openIds: [],
      projectDoc: null, docPast: [], docFuture: [], docPending: false,
    });
    if (isProjectDocV1Enabled()) {
      const snapGizmoCm = Math.max(0.1, get().snapSize / 10);
      set({ projectDoc: fromProjectData(get().toProjectData(), { snapGizmoCm }) });
    }
  },
  loadProject: (data) => {
    cancelDocArm();
    const settings = { ...DEFAULT_SETTINGS, ...data.settings, countertop: { ...DEFAULT_SETTINGS.countertop, ...(data.settings?.countertop ?? {}) }, appearance: { ...DEFAULT_SETTINGS.appearance, ...(data.settings?.appearance ?? {}) }, production: { ...DEFAULT_SETTINGS.production, ...(data.settings?.production ?? {}) } };
    const items = (data.cabinets ?? []).map((i) => ({ ...i, materials: { ...DEFAULT_MATERIALS, ...i.materials }, led: { ...DEFAULT_LED, ...i.led }, config: i.config ?? {} }));
    const walls = data.walls ?? [];
    const dimensions = data.dimensions ?? [];
    const customComponents = data.customComponents?.length ? data.customComponents : get().customComponents;
    const projectName = data.projectName || 'Proyek';
    const createdAt = data.createdAt || new Date().toISOString();
    const cleared = { past: [] as Snapshot[], future: [] as Snapshot[], selectedIds: [] as string[], dirty: false, openIds: [] as string[], docPast: [] as HistoryEntry[], docFuture: [] as HistoryEntry[], docPending: false };
    if (!isProjectDocV1Enabled()) {
      set({ projectName, createdAt, settings, walls, items, dimensions, customComponents, projectDoc: null, ...cleared });
      return;
    }
    const doc = fromProjectData({
      formatVersion: data.formatVersion, appVersion: data.appVersion, projectName, createdAt, modifiedAt: data.modifiedAt || createdAt,
      settings, walls, cabinets: items, dimensions, customComponents,
    }, { snapGizmoCm: Math.max(0.1, get().snapSize / 10) });
    const projected = toProjectData(doc);
    set({
      projectName: projected.projectName,
      createdAt: projected.createdAt,
      settings: projected.settings,
      walls: projected.walls,
      items: projected.cabinets,
      dimensions: Array.isArray(projected.dimensions) ? projected.dimensions : [],
      customComponents: projected.customComponents?.length ? projected.customComponents : customComponents,
      projectDoc: doc,
      ...cleared,
    });
  },
  toProjectData: () => {
    const s = get();
    return {
      formatVersion: FORMAT_VERSION, appVersion: APP_VERSION, projectName: s.projectName, createdAt: s.createdAt, modifiedAt: new Date().toISOString(),
      settings: s.settings, walls: s.walls, cabinets: s.items, dimensions: s.dimensions, customComponents: s.customComponents,
    };
  },
  markSaved: () => set({ dirty: false, lastSavedAt: Date.now() }),

  addItem: (input, at = null, opts = {}) => {
    const s = get();
    if (opts.history !== false) s.pushHistory();
    const st = get();
    const { dims, y } = heightsForType(input.type, input.dims, st.settings);
    const id = input.id ?? uid(ID_PREFIX[input.type]);
    const defs = scopeDefaultsFor(st.settings, input.type);
    let wallId: string | null = input.wallId === undefined ? null : input.wallId;
    let position: V3 = input.position ?? { x: 0, y, z: 0 };
    let rotationY = input.rotationY ?? 0;
    let orderIndex = input.orderIndex ?? 0;
    const row = rowOf({ wallId: 'x', type: input.type } as Item);
    const attachable = row !== 'free' && input.type !== 'island' && input.type !== 'bar';
    if (input.wallId === undefined) {
      const target = at ?? roomCenter(st.walls);
      const w = attachable && st.walls.length ? nearestWall(st.walls, target.x, target.z) : null;
      if (w) {
        wallId = w.id;
        const existing = st.items.filter((i) => i.wallId === w.id);
        orderIndex = existing.length ? Math.max(...existing.map((i) => i.orderIndex)) + 1 : 0;
      } else {
        position = { x: target.x, y, z: target.z };
      }
    } else if (wallId) {
      const existing = st.items.filter((i) => i.wallId === wallId);
      if (input.orderIndex === undefined) orderIndex = existing.length ? Math.max(...existing.map((i) => i.orderIndex)) + 1 : 0;
    }
    const item: Item = {
      id, name: input.name ?? defaultName(input.type, dims.w, input.config), type: input.type, wallId, orderIndex, position, rotationY,
      dims, materials: { ...DEFAULT_MATERIALS, ...defs.materials, ...(input.materials ?? {}) }, config: { ...defs.config, ...(input.config ?? {}) }, led: { ...DEFAULT_LED, ...defs.led, ...(input.led ?? {}) },
      visible: true, locked: false, colorLabel: null, createdAt: new Date().toISOString(),
    };
    const items = repackAll([...st.items, item], st.walls, st.settings);
    set({ items, dirty: true, ...(opts.select === false ? {} : { selectedIds: [id] }) });
    return id;
  },
  addItems: (inputs) => {
    get().pushHistory();
    for (const inp of inputs) get().addItem(inp, null, { history: false, select: false });
  },

  patchItem: (id, patch, history = true) => get().patchItems([id], patch, history),
  patchItems: (ids, patch, history = true) => {
    const s = get();
    if (history) s.pushHistory();
    const st = get();
    let items = st.items.map((it) => {
      if (!ids.includes(it.id)) return it;
      const next: Item = {
        ...it,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.rotationY !== undefined ? { rotationY: patch.rotationY } : {}),
        ...(patch.visible !== undefined ? { visible: patch.visible } : {}),
        ...(patch.locked !== undefined ? { locked: patch.locked } : {}),
        ...(patch.colorLabel !== undefined ? { colorLabel: patch.colorLabel } : {}),
        dims: patch.dims ? { ...it.dims, ...patch.dims } : it.dims,
        position: patch.position ? { ...it.position, ...patch.position } : it.position,
        materials: patch.materials ? { ...it.materials, ...patch.materials } : it.materials,
        config: patch.config ? { ...it.config, ...patch.config } : it.config,
        led: patch.led ? { ...it.led, ...patch.led } : it.led,
      };
      if (patch.wallId !== undefined && patch.wallId !== it.wallId) {
        next.wallId = patch.wallId;
        if (patch.wallId) {
          const ex = st.items.filter((i) => i.wallId === patch.wallId && i.id !== it.id);
          next.orderIndex = ex.length ? Math.max(...ex.map((i) => i.orderIndex)) + 1 : 0;
        }
      }
      return next;
    });
    // Posisi diubah manual pada item dinding → urutkan ulang berdasar posisi
    if (patch.position && (patch.position.x !== undefined || patch.position.z !== undefined)) {
      for (const id of ids) {
        const it = items.find((i) => i.id === id);
        const wall = it?.wallId ? st.walls.find((w) => w.id === it.wallId) : null;
        if (wall) items = resortWallByPosition(items, wall);
      }
    }
    items = repackAll(items, st.walls, st.settings);
    set({ items, dirty: true });
  },

  removeItems: (ids) => {
    const s = get();
    s.pushHistory();
    const all = new Set(ids);
    for (const it of s.items) if (it.config.parentId && all.has(it.config.parentId)) all.add(it.id);
    const items = repackAll(s.items.filter((i) => !all.has(i.id)), s.walls, s.settings);
    set({ items, selectedIds: s.selectedIds.filter((i) => !all.has(i)), openIds: s.openIds.filter((i) => !all.has(i)), dirty: true });
  },

  duplicateItems: (ids) => {
    const s = get();
    s.pushHistory();
    const newIds: string[] = [];
    for (const id of ids) {
      const it = s.items.find((i) => i.id === id);
      if (!it) continue;
      const nid = get().addItem({
        type: it.type, dims: { ...it.dims }, name: `${it.name} (copy)`, config: { ...it.config, parentId: undefined }, materials: { ...it.materials }, led: { ...it.led },
        wallId: it.wallId, position: it.wallId ? it.position : { x: it.position.x + 100, y: it.position.y, z: it.position.z + 100 }, rotationY: it.rotationY,
      }, null, { history: false, select: false });
      newIds.push(nid);
    }
    set({ selectedIds: newIds });
  },

  liveTransform: (id, pos, rotY) => {
    beginDocPreview();
    try {
      set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, position: pos, rotationY: rotY } : i)) }));
    } finally {
      endDocPreview();
    }
  },

  commitTransform: (id, pos, rotY, scale) => {
    const s = get();
    s.pushHistory();
    const st = get();
    let items = st.items.map((i) => {
      if (i.id !== id) return i;
      const dims = scale ? { w: Math.max(100, Math.round(i.dims.w * scale.x)), h: Math.max(100, Math.round(i.dims.h * scale.y)), d: Math.max(100, Math.round(i.dims.d * scale.z)) } : i.dims;
      return { ...i, position: pos, rotationY: rotY, dims };
    });
    const it = items.find((i) => i.id === id)!;
    const row = rowOf({ ...it, wallId: 'x' });
    if (it.wallId) {
      const wall = st.walls.find((w) => w.id === it.wallId);
      if (wall) {
        const dist = distanceToWall(wall, pos.x, pos.z) - it.dims.d / 2;
        const off = offsetOnWall(wall, pos.x, pos.z);
        const v = wallVec(wall);
        if (Math.abs(dist) > 400 || off < -it.dims.w || off > v.length + it.dims.w) {
          items = items.map((i) => (i.id === id ? { ...i, wallId: null } : i));
        } else {
          items = resortWallByPosition(items, wall);
        }
      }
    } else if (row !== 'free' && st.walls.length) {
      const w = nearestWall(st.walls, pos.x, pos.z);
      if (w) {
        const dist = distanceToWall(w, pos.x, pos.z) - it.dims.d / 2;
        const off = offsetOnWall(w, pos.x, pos.z);
        if (Math.abs(dist) < 150 && off > -50 && off < wallVec(w).length + 50) {
          const ex = items.filter((i) => i.wallId === w.id);
          const orderIndex = ex.length ? Math.max(...ex.map((i) => i.orderIndex)) + 1 : 0;
          items = items.map((i) => (i.id === id ? { ...i, wallId: w.id, orderIndex } : i));
          items = resortWallByPosition(items, w);
        }
      }
    }
    items = repackAll(items, st.walls, st.settings);
    set({ items, dirty: true });
  },

  reorderWall: (wallId, orderedTopIds) => {
    const s = get();
    s.pushHistory();
    const items = repackAll(applyWallOrder(s.items, wallId, orderedTopIds), s.walls, s.settings);
    set({ items, dirty: true });
  },

  moveToWall: (id, wallId) => get().patchItem(id, { wallId }),

  setGlobalHeight: (h) => {
    const s = get();
    s.pushHistory();
    const settings = { ...s.settings, globalCabinetHeight: h };
    const wh = wallHeightOf(settings), wb = wallBottomOf(settings);
    const items = s.items.map((i) => {
      if (i.type === 'wall' || i.type === 'corner_wall' || i.type === 'hood') return { ...i, dims: { ...i.dims, h: wh }, position: { ...i.position, y: wb } };
      if (i.type === 'tall' || i.type === 'fridge' || i.type === 'electronic') return { ...i, dims: { ...i.dims, h } };
      return i;
    });
    set({ settings, items: repackAll(items, s.walls, settings), dirty: true });
  },
  setSettings: (patch) => { get().pushHistory(); set((s) => ({ settings: { ...s.settings, ...patch }, dirty: true })); },
  setCountertop: (patch) => { get().pushHistory(); set((s) => ({ settings: { ...s.settings, countertop: { ...s.settings.countertop, ...patch } }, dirty: true })); },
  setWalls: (walls) => { get().pushHistory(); set((s) => ({ walls, items: repackAll(s.items, walls, s.settings), dirty: true })); },

  addDimension: (a, b) => { get().pushHistory(); set((s) => ({ dimensions: [...s.dimensions, { id: uid('DIM'), a, b }], dirty: true })); },
  removeDimension: (id) => { get().pushHistory(); set((s) => ({ dimensions: s.dimensions.filter((d) => d.id !== id), dirty: true })); },
  clearDimensions: () => { get().pushHistory(); set({ dimensions: [], dirty: true }); },

  setSelection: (ids) => set({ selectedIds: ids }),
  toggleSelect: (id) => set((s) => ({ selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((i) => i !== id) : [...s.selectedIds, id] })),
  selectAll: () => set((s) => ({ selectedIds: s.items.filter((i) => !i.locked && i.visible).map((i) => i.id) })),
  clearSelection: () => set({ selectedIds: [] }),
  setTool: (t) => set({ tool: t }),
  setViewMode: (v) => set({ viewMode: v }),
  setTopSubMode: (m) => { storage.set('intero_topSubMode', m); set({ topSubMode: m }); },
  setTheme: (t) => { storage.set('intero_theme', t); document.documentElement.setAttribute('data-theme', t); set({ theme: t }); },
  setUiMode: (m) => { storage.set('intero_uiMode', m); set({ uiMode: m }); },
  toggleOpenMode: () => set((s) => {
    // Ada seleksi -> buka/tutup yg dipilih saja. Tanpa seleksi -> buka/tutup semua.
    if (s.selectedIds.length) {
      const sel = s.selectedIds.filter((id) => s.items.some((i) => i.id === id));
      const allOpen = sel.length > 0 && sel.every((id) => s.openIds.includes(id));
      return { openIds: allOpen ? s.openIds.filter((id) => !sel.includes(id)) : [...new Set([...s.openIds, ...sel])] };
    }
    return { openIds: s.openIds.length ? [] : s.items.map((i) => i.id) };
  }),
  setOpenMode: (o) => set((s) => ({ openIds: o ? s.items.map((i) => i.id) : [] })),
  setBrightness: (v) => { storage.set('intero_brightness', v); set({ brightness: v }); },
  setShowPeople: (v) => { storage.set('intero_showPeople', v); set({ showPeople: v }); },
  setLightsOn: (v) => { storage.set('intero_lightsOn', v); set({ lightsOn: v }); },
  setAppMode: (m) => set({ appMode: m, selectedIds: m === 'production' ? get().selectedIds : get().selectedIds }),
  setDim: (p) => {
    if (p.showDimensions !== undefined) storage.set('intero_showDims', p.showDimensions);
    if (p.dimLayers) storage.set('intero_dimLayers', p.dimLayers);
    if (p.dimUnit) storage.set('intero_dimUnit', p.dimUnit);
    if (p.dimDecimals !== undefined) storage.set('intero_dimDec', p.dimDecimals);
    set(p);
  },
  setProduction: (p) => set((s) => ({ settings: { ...s.settings, production: { ...s.settings.production, ...p } }, dirty: true })),
  setProdTab: (t) => set({ prodTab: t }),
  setFrame: (p) => set((s) => ({ settings: { ...s.settings, production: { ...s.settings.production, ...p } }, dirty: true })),
  toggleLights: () => set((s) => { const v = !s.lightsOn; storage.set('intero_lightsOn', v); return { lightsOn: v }; }),
  setBacksplashHeight: (h) => {
    const s = get();
    s.pushHistory();
    const wallGap = Math.max(200, s.settings.countertop.thickness + h);
    const settings = { ...s.settings, wallGap, countertop: { ...s.settings.countertop, backsplashHeight: h, backsplashAuto: false, backsplash: true } };
    const wh = wallHeightOf(settings), wb = wallBottomOf(settings);
    const items = s.items.map((i) => {
      if (i.type === 'wall' || i.type === 'corner_wall' || i.type === 'hood') return { ...i, dims: { ...i.dims, h: wh }, position: { ...i.position, y: wb } };
      return i;
    });
    set({ settings, items: repackAll(items, s.walls, settings), dirty: true });
  },
  applyScope: (scope, patch) => {
    const s0 = get();
    s0.pushHistory();
    const st = get();
    const prev = st.settings.scopeDefaults ?? {};
    const cur: ScopeDefault = prev[scope] ?? {};
    const next: ScopeDefault = {
      config: patch.config ? { ...cur.config, ...patch.config } : cur.config,
      materials: patch.materials ? { ...cur.materials, ...patch.materials } : cur.materials,
      led: patch.led ? { ...cur.led, ...patch.led } : cur.led,
    };
    set({ settings: { ...st.settings, scopeDefaults: { ...prev, [scope]: next } } });
    const ids = get().items.filter((i) => inScope(scope, i.type)).map((i) => i.id);
    if (ids.length) get().patchItems(ids, patch, false);
    else set({ dirty: true });
  },
  applyToAll: (patch) => {
    const s = get();
    const ids = s.items.map((i) => i.id);
    if (!ids.length) return;
    s.patchItems(ids, patch);
  },

  copy: () => set((s) => ({ clipboard: s.items.filter((i) => s.selectedIds.includes(i.id)).map((i) => ({ ...i })) })),
  cut: () => { const s = get(); s.copy(); s.removeItems(s.selectedIds); },
  paste: () => {
    const s = get();
    if (!s.clipboard.length) return;
    s.pushHistory();
    const ids: string[] = [];
    for (const it of s.clipboard) {
      ids.push(get().addItem({
        type: it.type, dims: { ...it.dims }, name: it.name, config: { ...it.config, parentId: undefined }, materials: { ...it.materials }, led: { ...it.led },
        wallId: it.wallId, position: it.wallId ? it.position : { x: it.position.x + 150, y: it.position.y, z: it.position.z + 150 }, rotationY: it.rotationY,
      }, null, { history: false, select: false }));
    }
    set({ selectedIds: ids });
  },

  mirrorItems: (ids, axis) => {
    const s = get();
    s.pushHistory();
    const sel = s.items.filter((i) => ids.includes(i.id));
    if (!sel.length) return;
    const cx = sel.reduce((a, i) => a + i.position.x, 0) / sel.length;
    const cz = sel.reduce((a, i) => a + i.position.z, 0) / sel.length;
    let items = s.items.map((i) => {
      if (!ids.includes(i.id)) return i;
      const cfg = { ...i.config, hingeSide: i.config.hingeSide === 'left' ? 'right' as const : i.config.hingeSide === 'right' ? 'left' as const : i.config.hingeSide, leftAccessory: i.config.rightAccessory, rightAccessory: i.config.leftAccessory };
      if (i.wallId) return { ...i, config: cfg };
      const position = axis === 'x' ? { ...i.position, x: 2 * cx - i.position.x } : { ...i.position, z: 2 * cz - i.position.z };
      const rotationY = axis === 'x' ? -i.rotationY : 180 - i.rotationY;
      return { ...i, position, rotationY, config: cfg };
    });
    // Item dinding: balik urutan di antara item terpilih
    for (const w of s.walls) {
      const onWall = sel.filter((i) => i.wallId === w.id).sort((a, b) => a.orderIndex - b.orderIndex);
      if (onWall.length > 1) {
        const idxs = onWall.map((i) => i.orderIndex);
        const rev = [...onWall].reverse();
        items = items.map((i) => { const k = rev.findIndex((r) => r.id === i.id); return k >= 0 ? { ...i, orderIndex: idxs[k] } : i; });
      }
    }
    set({ items: repackAll(items, s.walls, s.settings), dirty: true });
  },

  arrayItems: (ids, o) => {
    const s = get();
    s.pushHistory();
    const newIds: string[] = [];
    for (const id of ids) {
      const it = s.items.find((i) => i.id === id);
      if (!it) continue;
      const make = (pos: V3, rot: number) => newIds.push(get().addItem({
        type: it.type, dims: { ...it.dims }, name: it.name, config: { ...it.config, parentId: undefined }, materials: { ...it.materials }, led: { ...it.led },
        wallId: it.wallId && o.mode === 'linear' ? it.wallId : null, position: pos, rotationY: rot,
      }, null, { history: false, select: false }));
      if (o.mode === 'linear') {
        for (let k = 1; k < o.count; k++) {
          const off = (it.dims.w + o.spacing) * k;
          make({ x: it.position.x + (o.axis === 'x' ? off : 0), y: it.position.y, z: it.position.z + (o.axis === 'z' ? off : 0) }, it.rotationY);
        }
      } else if (o.mode === 'grid') {
        for (let r = 0; r < o.countY; r++) for (let c = 0; c < o.count; c++) {
          if (r === 0 && c === 0) continue;
          make({ x: it.position.x + (it.dims.w + o.spacing) * c, y: it.position.y, z: it.position.z + (it.dims.d + o.spacingY) * r }, it.rotationY);
        }
      } else {
        for (let k = 1; k < o.count; k++) {
          const a = (k / o.count) * Math.PI * 2;
          make({ x: it.position.x + Math.sin(a) * o.radius, y: it.position.y, z: it.position.z + (Math.cos(a) - 1) * o.radius }, it.rotationY + (a * 180) / Math.PI);
        }
      }
    }
    set({ selectedIds: [...ids, ...newIds] });
  },

  alignItems: (ids, mode) => {
    const s = get();
    const sel = s.items.filter((i) => ids.includes(i.id));
    if (sel.length < 2) return;
    s.pushHistory();
    const minX = Math.min(...sel.map((i) => i.position.x - i.dims.w / 2)), maxX = Math.max(...sel.map((i) => i.position.x + i.dims.w / 2));
    const minZ = Math.min(...sel.map((i) => i.position.z - i.dims.d / 2)), maxZ = Math.max(...sel.map((i) => i.position.z + i.dims.d / 2));
    const minY = Math.min(...sel.map((i) => i.position.y)), maxY = Math.max(...sel.map((i) => i.position.y + i.dims.h));
    const sortedX = [...sel].sort((a, b) => a.position.x - b.position.x), sortedZ = [...sel].sort((a, b) => a.position.z - b.position.z);
    const items = s.items.map((i) => {
      if (!ids.includes(i.id)) return i;
      const p = { ...i.position };
      switch (mode) {
        case 'left': p.x = minX + i.dims.w / 2; break;
        case 'right': p.x = maxX - i.dims.w / 2; break;
        case 'centerX': p.x = (minX + maxX) / 2; break;
        case 'front': p.z = maxZ - i.dims.d / 2; break;
        case 'back': p.z = minZ + i.dims.d / 2; break;
        case 'centerZ': p.z = (minZ + maxZ) / 2; break;
        case 'bottom': p.y = minY; break;
        case 'top': p.y = maxY - i.dims.h; break;
        case 'distributeX': { const k = sortedX.findIndex((x) => x.id === i.id); p.x = sortedX.length > 1 ? sortedX[0].position.x + ((sortedX[sortedX.length - 1].position.x - sortedX[0].position.x) * k) / (sortedX.length - 1) : p.x; break; }
        case 'distributeZ': { const k = sortedZ.findIndex((x) => x.id === i.id); p.z = sortedZ.length > 1 ? sortedZ[0].position.z + ((sortedZ[sortedZ.length - 1].position.z - sortedZ[0].position.z) * k) / (sortedZ.length - 1) : p.z; break; }
      }
      if (i.wallId && mode !== 'bottom' && mode !== 'top') return i;
      return { ...i, position: p };
    });
    set({ items: repackAll(items, s.walls, s.settings), dirty: true });
  },

  addCustomComponent: (c) => set((s) => ({ customComponents: [...s.customComponents.filter((x) => x.id !== c.id), c] })),
  removeCustomComponent: (id) => set((s) => ({ customComponents: s.customComponents.filter((x) => x.id !== id) })),
  setCustomComponents: (c) => set({ customComponents: c }),
}));

export const selectSelectedItems = (s: EditorStore) => s.items.filter((i) => s.selectedIds.includes(i.id));
