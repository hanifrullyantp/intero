import { create } from 'zustand';
import type { Issue, Item, LayerGroup, Project, ProjectDefaults } from '../models/types';
import { validate } from '../engine/constraints';
import { deepClone } from '../utils/geometry';
import { DEFAULT_MATERIALS } from '../engine/layoutEngine';
import { AUTO, generateMagic } from '../engine/magicGenerator';
import { uid } from '../config/library';
import { wallBottomFor, autoKitchen } from '../engine/kitchenRules';
import { applyProjectDimensions, defaultsForNewItem, migrateKitchenProject, projectDimensions } from '../engine/projectDimensions';
import { detectCornerOrientation } from '../engine/cornerOrientation';

export type ViewMode = '2d' | '3d' | 'elevation' | 'split';
export type ModalId = null | 'wizard' | 'magic' | 'export' | 'cutting' | 'price' | 'templates' | 'hood' | 'editor' | 'shortcuts' | 'about' | 'array' | 'align' | 'builder' | 'tour';
export type ToolId = 'select' | 'pan' | 'orbit' | 'zoom' | 'move' | 'rotate' | 'measure' | 'paint' | 'eyedropper' | 'mirror' | 'array' | 'align' | 'section';
export type ThemeMode = 'light' | 'dark' | 'system';
export type UIMode = 'simple' | 'advanced';
export type OpenViewMode = 'normal' | 'xray' | 'explode';

export interface Toast {
  id: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  message: string;
  actions?: { label: string; onClick: () => void }[];
  ttl?: number;
}

export interface UIState {
  viewMode: ViewMode;
  showGrid: boolean;
  showDims: boolean;
  snap: boolean;
  snapObjects: boolean;
  showTriangle: boolean;
  showHandles: boolean;
  showShadows: boolean;
  wireframe: boolean;
  doorsOpen: boolean;
  openProgress: number;
  openSpeed: number;
  openView: OpenViewMode;
  openPanel: boolean;
  showLabels: boolean;
  showIssues: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  layersOpen: boolean;
  toolsOpen: boolean;
  toolsDock: 'left' | 'top';
  leftWidth: number;
  rightWidth: number;
  layersWidth: number;
  modal: ModalId;
  elevationWallId: string | null;
  cameraPreset: string;
  tool: ToolId;
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  uiMode: UIMode;
  materialStudioOpen: boolean;
  contextMenu: { x: number; y: number; itemId: string | null } | null;
  confirm: { title: string; message: string; onConfirm: () => void } | null;
  loading: string | null;
  loadingProgress: number;
  fitRequest: number;
  dragEntry: string | null;
  showContents: boolean;
  isolateIds: string[] | null;
  tourIndex: number;
  tourPlaying: boolean;
  mobileSheet: null | 'components' | 'materials' | 'tools' | 'layers' | 'settings' | 'props';
  /** active tab in the right sidebar */
  rightTab: RightTab;
  /** 2D plan: separate upper/lower cabinets so they never overlap while editing */
  planFilter: 'all' | 'base' | 'wall';
}

export type RightTab = 'props' | 'mat' | 'layers' | 'issues' | 'display' | 'open';

interface AppState {
  project: Project;
  past: Project[];
  future: Project[];
  selectedIds: string[];
  hoverId: string | null;
  issues: Issue[];
  toasts: Toast[];
  ui: UIState;
  dirty: boolean;
  clipboard: Item[] | null;

  setProject: (p: Project, pushHistory?: boolean) => void;
  commit: () => void;
  updateItem: (id: string, patch: Partial<Item>, history?: boolean) => void;
  updateItems: (patches: { id: string; patch: Partial<Item> }[], history?: boolean) => void;
  updateItemConfig: (id: string, patch: Partial<Item['config']>, history?: boolean) => void;
  addItem: (item: Item, select?: boolean) => void;
  removeItems: (ids: string[]) => void;
  duplicateItems: (ids: string[]) => void;
  setMaterials: (patch: Partial<Project['materials']>) => void;
  setSettings: (patch: Partial<Project['settings']>, history?: boolean) => void;
  applyDimensions: (patch: Partial<ProjectDefaults>) => void;
  setItems: (items: Item[], history?: boolean) => void;
  reorderItems: (ids: string[]) => void;
  setGroups: (groups: LayerGroup[]) => void;
  undo: () => void;
  redo: () => void;
  select: (ids: string[], additive?: boolean) => void;
  setHover: (id: string | null) => void;
  setUI: (patch: Partial<UIState>) => void;
  toggleUI: (key: keyof UIState) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  requestFit: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteClipboard: (atOriginal?: boolean, offset?: { x: number; y: number }) => void;
  setTheme: (t: ThemeMode) => void;
  setUIMode: (m: UIMode) => void;
  setDoorsOpen: (open: boolean, scope?: 'all' | 'selected') => void;
  requireAdvanced: (feature: string) => boolean;
}

const STORAGE_KEY = 'instant3d_autosave_v1';
const THEME_KEY = 'instant3d_theme';
const MODE_KEY = 'instant3d_uimode';

function initialProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Project;
      if (p && p.items && p.room) {
        p.items = p.items.map((i) => ({ visible: true, ...i }));
        return p;
      }
    }
  } catch { /* ignore */ }
  return generateMagic({
    name: 'Modern L-Shape Kitchen', shape: 'L', totalH: 220, ceilingHeight: 280,
    baseH: 85, baseDepth: 58, ctDepth: 60, wallDepth: 33, cornerDepth: 90, backsplashHeight: 60,
    sides: {
      A: { length: 420, items: [{ uid: 'starter-fridge', key: 'fridge_sbs', width: 90 }, { uid: 'starter-auto-a', key: AUTO, width: 0 }] },
      B: { length: 240, items: [{ uid: 'starter-auto-b', key: AUTO, width: 0 }, { uid: 'starter-dispenser', key: 'dispenser', width: 60 }] },
      C: { length: 240, items: [] },
    },
    lighting: { under: true, inWall: true, inBase: false, tone: 'warm', brightness: 1, glow: true },
  }, { ...DEFAULT_MATERIALS });
}

export function persist(project: Project) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { /* ignore */ }
}
export function hasAutosave() { return !!localStorage.getItem(STORAGE_KEY); }

function resolveTheme(t: ThemeMode): 'light' | 'dark' {
  if (t === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return t;
}
function initialTheme(): ThemeMode {
  try { return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light'; } catch { return 'light'; }
}
function initialMode(): UIMode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === 'simple' || saved === 'advanced') return saved;
  } catch { /* ignore */ }
  return window.innerWidth < 768 ? 'simple' : 'advanced';
}

const MAX_HISTORY = 60;

export const useStore = create<AppState>((set, get) => {
  const original = initialProject();
  const project = migrateKitchenProject(original);
  project.items = autoKitchen(project.items.map((i) => ({ visible: true, openAmount: 0, ...i })), project.materials, project.settings.defaults?.totalHeight);
  const theme = initialTheme();
  const touch = (p: Project): Project => ({ ...p, updatedAt: new Date().toISOString() });
  const withHistory = (prev: AppState, next0: Project, history: boolean) => {
    const past = history ? [...prev.past.slice(-MAX_HISTORY + 1), prev.project] : prev.past;
    // automatic relationships (hood flush with upper cabinets, hood housing fills to the top)
    const autoItems = autoKitchen(next0.items, next0.materials, next0.settings.defaults?.totalHeight);
    const next = autoItems === next0.items ? next0 : { ...next0, items: autoItems };
    return { project: touch(next), past, future: history ? [] : prev.future, issues: validate(next), dirty: true };
  };
  /** a manual elevation change on a hood switches its auto alignment off (re-enable in the hood panel) */
  const applyPatch = (i: Item, patch: Partial<Item>): Item => {
    const merged = { ...i, ...patch };
    if ('elevation' in patch && i.subtype.startsWith('app_hood') && i.config.hoodAuto !== false && patch.elevation !== i.elevation) {
      merged.config = { ...(patch.config ?? i.config), hoodAuto: false };
    }
    return merged;
  };
  // apply theme + mode to DOM
  const applyDom = (th: 'light' | 'dark', mode: UIMode) => {
    document.documentElement.dataset.theme = th;
    document.documentElement.dataset.mode = mode;
  };
  setTimeout(() => applyDom(resolveTheme(theme), initialMode()), 0);

  return {
    project, past: original !== project ? [original] : [], future: [], selectedIds: [], hoverId: null,
    issues: validate(project), toasts: [], dirty: false, clipboard: null,
    ui: {
      viewMode: '3d', showGrid: true, showDims: false, snap: true, snapObjects: true,
      showTriangle: false, showHandles: true, showShadows: true, wireframe: false,
      doorsOpen: false, openProgress: 0, openSpeed: 0.8, openView: 'normal', openPanel: false,
      showLabels: true, showIssues: true,
      leftOpen: true, rightOpen: true, layersOpen: false, toolsOpen: true, toolsDock: 'left',
      leftWidth: 240, rightWidth: 300, layersWidth: 260,
      modal: null, elevationWallId: null, cameraPreset: 'perspective',
      tool: 'select', theme, resolvedTheme: resolveTheme(theme), uiMode: initialMode(),
      materialStudioOpen: false, contextMenu: null, confirm: null, loading: null, loadingProgress: 0,
      fitRequest: 0, dragEntry: null, showContents: true,
      isolateIds: null, tourIndex: 0, tourPlaying: false, mobileSheet: null, rightTab: 'props',
      planFilter: 'all',
    },

    setProject: (p, pushHistory = true) => set((s) => ({ ...withHistory(s, migrateKitchenProject({ ...p, items: p.items.map((i) => ({ visible: true, openAmount: 0, ...i })) }), pushHistory), selectedIds: [] })),
    commit: () => set((s) => ({ past: [...s.past.slice(-MAX_HISTORY + 1), deepClone(s.project)], future: [] })),
    updateItem: (id, patch, history = true) =>
      set((s) => withHistory(s, { ...s.project, items: s.project.items.map((i) => (i.id === id ? applyPatch(i, patch) : i)) }, history)),
    updateItems: (patches, history = true) =>
      set((s) => {
        const map = new Map(patches.map((p) => [p.id, p.patch]));
        return withHistory(s, { ...s.project, items: s.project.items.map((i) => (map.has(i.id) ? applyPatch(i, map.get(i.id)!) : i)) }, history);
      }),
    updateItemConfig: (id, patch, history = true) =>
      set((s) => withHistory(s, { ...s.project, items: s.project.items.map((i) => (i.id === id ? { ...i, config: { ...i.config, ...patch } } : i)) }, history)),
    addItem: (item, select = true) => set((s) => {
      const configured = detectCornerOrientation(defaultsForNewItem(item, s.project), s.project.room.walls);
      return { ...withHistory(s, { ...s.project, items: [...s.project.items, { visible: true, openAmount: 0, ...configured }] }, true), selectedIds: select ? [item.id] : s.selectedIds };
    }),
    removeItems: (ids) =>
      set((s) => ({ ...withHistory(s, { ...s.project, items: s.project.items.filter((i) => !ids.includes(i.id)) }, true), selectedIds: s.selectedIds.filter((id) => !ids.includes(id)) })),
    duplicateItems: (ids) =>
      set((s) => {
        const clones: Item[] = s.project.items.filter((i) => ids.includes(i.id)).map((i) => {
          const c = deepClone(i); c.id = uid(); c.name = i.name;
          if (i.rotation % 180 === 0) c.x = i.x + i.width; else c.y = i.y + i.width;
          return c;
        });
        return { ...withHistory(s, { ...s.project, items: [...s.project.items, ...clones] }, true), selectedIds: clones.map((c) => c.id) };
      }),
    setMaterials: (patch) => {
      try {
        set((s) => {
          const oldM = s.project.materials;
          const newM = { ...oldM, ...patch };
          let next = { ...s.project, materials: newM };
          if (s.project.type === 'kitchen' && ('backsplash' in patch || 'backsplashHeight' in patch || 'countertopThickness' in patch)) {
            const d = projectDimensions(s.project);
            const delta = wallBottomFor(s.project.items, newM) - wallBottomFor(s.project.items, oldM);
            next = applyProjectDimensions(next, { wallBottom: d.wallBottom + delta, totalHeight: d.totalHeight });
            const thicknessDelta = newM.countertopThickness - oldM.countertopThickness;
            if (thicknessDelta) next.items = next.items.map((i) => i.subtype.startsWith('app_cooktop') ? { ...i, elevation: i.elevation + thicknessDelta } : i);
          }
          return withHistory(s, next, true);
        });
      } catch (e) { get().toast({ severity: 'warning', message: (e as Error).message }); }
    },
    setSettings: (patch, history = true) => {
      try {
        set((s) => {
          const { defaults, ...settings } = patch;
          let next = { ...s.project, settings: { ...s.project.settings, ...settings } };
          if (defaults) next = applyProjectDimensions(next, defaults);
          return withHistory(s, next, history);
        });
      } catch (e) { get().toast({ severity: 'warning', message: (e as Error).message }); }
    },
    applyDimensions: (patch) => {
      try { set((s) => withHistory(s, applyProjectDimensions(s.project, patch), true)); }
      catch (e) { get().toast({ severity: 'warning', message: (e as Error).message }); }
    },
    setItems: (items, history = true) => set((s) => withHistory(s, { ...s.project, items }, history)),
    reorderItems: (ids) => set((s) => {
      const map = new Map(s.project.items.map((i) => [i.id, i]));
      const ordered = ids.map((id) => map.get(id)).filter(Boolean) as Item[];
      const rest = s.project.items.filter((i) => !ids.includes(i.id));
      return withHistory(s, { ...s.project, items: [...ordered, ...rest] }, true);
    }),
    setGroups: (groups) => set((s) => withHistory(s, { ...s.project, groups }, true)),
    undo: () => set((s) => {
      if (!s.past.length) return {};
      const prev = s.past[s.past.length - 1];
      return { project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future].slice(0, MAX_HISTORY), issues: validate(prev), selectedIds: s.selectedIds.filter((id) => prev.items.some((i) => i.id === id)) };
    }),
    redo: () => set((s) => {
      if (!s.future.length) return {};
      const next = s.future[0];
      return { project: next, past: [...s.past, s.project], future: s.future.slice(1), issues: validate(next) };
    }),
    select: (ids, additive = false) => set((s) => ({ selectedIds: additive ? Array.from(new Set([...s.selectedIds, ...ids])) : ids })),
    setHover: (id) => set((s) => (s.hoverId === id ? {} : { hoverId: id })),
    setUI: (patch) => set((s) => {
      const ui = { ...s.ui, ...patch };
      if (patch.resolvedTheme || patch.uiMode) applyDom(ui.resolvedTheme, ui.uiMode);
      return { ui };
    }),
    toggleUI: (key) => set((s) => {
      const ui = { ...s.ui, [key]: !s.ui[key] };
      return { ui };
    }),
    toast: (t) => {
      const id = uid('toast');
      set((s) => ({ toasts: [...s.toasts.slice(-4), { id, ...t }] }));
      const ttl = t.ttl ?? (t.severity === 'error' ? 7000 : 4000);
      if (ttl > 0) setTimeout(() => get().dismissToast(id), ttl);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    requestFit: () => set((s) => ({ ui: { ...s.ui, fitRequest: s.ui.fitRequest + 1 } })),
    copySelected: () => {
      const s = get();
      const items = s.project.items.filter((i) => s.selectedIds.includes(i.id));
      if (!items.length) return;
      set({ clipboard: deepClone(items) });
      s.toast({ severity: 'success', message: `${items.length} item(s) copied`, ttl: 1500 });
    },
    cutSelected: () => {
      const s = get();
      const items = s.project.items.filter((i) => s.selectedIds.includes(i.id));
      if (!items.length) return;
      set({ clipboard: deepClone(items) });
      s.removeItems(s.selectedIds);
    },
    pasteClipboard: (atOriginal = false, offset) => {
      const s = get();
      if (!s.clipboard?.length) { s.toast({ severity: 'warning', message: 'Clipboard is empty' }); return; }
      const clones = s.clipboard.map((i) => {
        const c = deepClone(i); c.id = uid();
        if (!atOriginal) { c.x += offset?.x ?? 10; c.y += offset?.y ?? 10; }
        return c;
      });
      set((st) => ({ ...withHistory(st, { ...st.project, items: [...st.project.items, ...clones] }, true), selectedIds: clones.map((c) => c.id) }));
    },
    setTheme: (t) => {
      try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
      const r = resolveTheme(t);
      applyDom(r, get().ui.uiMode);
      set((s) => ({ ui: { ...s.ui, theme: t, resolvedTheme: r } }));
    },
    setUIMode: (m) => {
      try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
      const s = get();
      applyDom(s.ui.resolvedTheme, m);
      const patch: Partial<UIState> = { uiMode: m };
      if (m === 'simple') {
        patch.layersOpen = false;
        if (s.ui.viewMode === 'elevation' || s.ui.viewMode === 'split') patch.viewMode = '3d';
      }
      set((st) => ({ ui: { ...st.ui, ...patch } }));
      get().toast({ severity: 'info', message: m === 'simple' ? 'Simple mode — essentials only' : 'Advanced mode — all tools unlocked', ttl: 2500 });
    },
    setDoorsOpen: (open, scope = 'all') => {
      const s = get();
      const ids = scope === 'selected' && s.selectedIds.length ? s.selectedIds : s.project.items.map((i) => i.id);
      // animate openProgress 0->1
      const from = s.ui.openProgress;
      const to = open ? 1 : 0;
      const speed = s.ui.openSpeed;
      const dur = speed * 1000;
      const start = performance.now();
      set((st) => ({ ui: { ...st.ui, doorsOpen: open } }));
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        const v = from + (to - from) * e;
        const st = get();
        st.setUI({ openProgress: v });
        st.setItems(st.project.items.map((i) => (ids.includes(i.id) ? { ...i, openAmount: v } : i)), false);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    requireAdvanced: (feature) => {
      const s = get();
      if (s.ui.uiMode === 'advanced') return true;
      s.toast({ severity: 'info', message: `"${feature}" tersedia di Advanced Mode.`, actions: [{ label: 'Switch to Advanced', onClick: () => s.setUIMode('advanced') }] });
      return false;
    },
  };
});

let lastSaved = '';
setInterval(() => {
  const { project } = useStore.getState();
  if (project.updatedAt !== lastSaved) { persist(project); lastSaved = project.updatedAt; }
}, 30000);
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => persist(useStore.getState().project));
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    const s = useStore.getState();
    if (s.ui.theme === 'system') s.setTheme('system');
  });
}

export const selectedItemSelector = (s: AppState) => (s.selectedIds.length === 1 ? s.project.items.find((i) => i.id === s.selectedIds[0]) ?? null : null);
