// 3D Intero — Tipe data inti (semua ukuran dalam mm)

export interface V2 { x: number; z: number }
export interface V3 { x: number; y: number; z: number }

export interface Wall {
  id: string;
  name: string;
  start: V2;
  end: V2;
}

export type ItemType =
  | 'base' | 'sink_base' | 'cooktop_base' | 'drawer_base' | 'dishwasher'
  | 'wall' | 'tall' | 'corner_base' | 'corner_wall'
  | 'fridge' | 'electronic' | 'hood' | 'island' | 'bar' | 'custom';

export type DoorMaterial = 'HPL' | 'Duco' | 'PVC' | 'ACP' | 'Solid Wood' | 'Glass';
export type HandleType = 'bar' | 'knob' | 'j' | 'gola' | 'push';
export type HandlePosition = 'top' | 'middle' | 'bottom';
export type Accessory = 'shelf' | 'dish_rack' | 'spice_rack' | 'gas_rack' | 'cutlery_drawer' | 'trash_bin' | 'lazy_susan';
export type GasType = '12kg' | '3kg' | '5.5kg';
export type Slot1 = 'magiccom' | 'dispenser' | 'oven' | 'shelf';
export type Slot2 = 'oven' | 'microwave' | 'coffee' | 'shelf' | 'door';
export type FridgeType = 'single' | 'french' | 'sbs';
export type CountertopType =
  | 'granit_hitam' | 'granit_putih' | 'granit_grey' | 'marble_putih' | 'marble_hitam' | 'carrara' | 'calacatta'
  | 'quartz_white' | 'quartz_grey' | 'quartz_black' | 'solid_surface' | 'butcher_block' | 'hpl';
export type ToolId = 'select' | 'hand' | 'orbit' | 'zoom' | 'move' | 'rotate' | 'scale' | 'tape' | 'dimension' | 'protractor' | 'paint' | 'eyedropper';
export type ViewMode = 'perspective' | 'top' | 'front' | 'back' | 'left' | 'right' | 'iso';
export type TopSubMode = 'all' | 'base' | 'wall' | 'split';
export type RowKind = 'base' | 'wall' | 'tall' | 'free';
export type LedTemp = 3000 | 4000 | 6500;
export type UiMode = 'simple' | 'advanced';
export type Theme = 'light' | 'dark';
export type LayerGrouping = 'wall' | 'type' | 'material';

export interface Materials {
  doorMaterial: DoorMaterial;
  doorColor: string;
  bodyFollowsDoor: boolean;
  bodyColor: string;
  sidesFollowDoor: boolean;
  toeKickFollowsDoor: boolean;
  handleColor: string;
  handleType: HandleType;
  handleLength: number;
  handlePosition: HandlePosition;
  softClose: boolean;
}

export interface LedConfig {
  underCabinet: boolean;
  insideUpper: boolean;
  insideBase: boolean;
  plinth: boolean;
  temperature: LedTemp;
  trigger: 'always' | 'onOpen';
  intensity: number; // 0-100
}

export interface CustomShape {
  id: string;
  kind: 'box' | 'cylinder' | 'sphere' | 'torus' | 'prism';
  w: number; h: number; d: number;
  x: number; y: number; z: number;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  animation: 'none' | 'pullout' | 'swing' | 'liftup' | 'spin';
}

export interface CustomComponent {
  id: string;
  name: string;
  category: string;
  tags: string[];
  description: string;
  dims: { w: number; h: number; d: number };
  shapes: CustomShape[];
  createdAt: string;
  thumbnail?: string;
}

export interface ItemConfig {
  doorCount?: 0 | 1 | 2;
  hingeSide?: 'left' | 'right';
  drawerCount?: number;
  openShelf?: boolean;
  toeKickHeight?: number;
  leftAccessory?: Accessory;
  rightAccessory?: Accessory;
  gasType?: GasType;
  spiceWidth?: 150 | 200;
  glassDoor?: boolean;
  liftUp?: boolean;
  note?: string;           // catatan produksi per kabinet
  doorNote?: string;
  prodStatus?: ProdStatus; // status produksi kabinet
  method?: ProdMethod;     // override metode konstruksi per kabinet
  cornice?: boolean;
  corniceHeight?: number;
  corniceWidth?: number;   // overhang topi (mm)
  corniceLight?: boolean;  // lampu di bawah topi
  doorType?: 'swing' | 'liftup'; // swing = buka samping, liftup = pull-up buka ke atas
  doubleStack?: boolean;
  upperTierHeight?: number;
  cornerDoorStyle?: 'bifold' | 'two' | 'one';
  lazySusan?: boolean;
  cornerOrientation?: 'auto' | 'left' | 'right';
  fridgeType?: FridgeType;
  fridgeW?: number;
  fridgeH?: number;
  fridgeD?: number;
  slot1?: Slot1;
  slot2?: Slot2;
  electronicPreset?: string;
  hoodHeight?: number;
  islandDoorsPerSide?: number;
  stools?: number;
  barOverhang?: number;
  footRest?: boolean;
  parentId?: string;
  customShapes?: CustomShape[];
  customName?: string;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  wallId: string | null;
  orderIndex: number;
  position: V3;      // posisi dunia (origin lokal = tengah-bawah footprint)
  rotationY: number; // derajat
  dims: { w: number; h: number; d: number };
  materials: Materials;
  config: ItemConfig;
  led: LedConfig;
  visible: boolean;
  locked: boolean;
  colorLabel: string | null;
  createdAt: string;
}

export interface CountertopSettings {
  type: CountertopType;
  thickness: number;
  overhang: number;
  backsplash: boolean;
  backsplashAuto: boolean; // mengikuti dasar kabinet atas (wallGap)
  backsplashHeight: number; // dipakai saat backsplashAuto = false
  backsplashColor: string;
}

/** Cakupan properti global: kabinet atas (wall), kabinet bawah (base), atau semua. */
export type ItemScope = 'wall' | 'base' | 'all';
export interface ScopeDefault { config?: ItemConfig; materials?: Partial<Materials>; led?: Partial<LedConfig> }

export interface ProjectSettings {
  globalCabinetHeight: number;
  baseHeight: number;
  wallGap: number;
  wallDepth: number;
  toeKick: number;
  unit: 'mm';
  countertop: CountertopSettings;
  appearance: SceneAppearance;
  production: ProductionSettings;
  /** Default properti per cakupan — diterapkan juga ke komponen yang ditambahkan nanti. */
  scopeDefaults?: Partial<Record<ItemScope, ScopeDefault>>;
}

export interface SceneAppearance {
  canvasColor: string;
  wallColor: string;
  floorColor: string;
}

export interface DimensionLine {
  id: string;
  a: V3;
  b: V3;
  label?: string;
}

export interface ProjectData {
  formatVersion: string;
  appVersion: string;
  projectName: string;
  createdAt: string;
  modifiedAt: string;
  settings: ProjectSettings;
  walls: Wall[];
  cabinets: Item[];
  dimensions: DimensionLine[];
  customComponents: CustomComponent[];
}

export interface LibraryEntry {
  id: string;
  name: string;
  category: string;
  type: ItemType;
  dims: { w: number; h: number; d: number };
  config?: ItemConfig;
  desc?: string;
}

export type KitchenShape = 'I' | 'L' | 'U' | 'G';

export interface WizardAppliance {
  enabled: boolean;
  wallId: string;
  fromCorner: number; // cm dari sudut kiri
}

export interface WizardInput {
  shape: KitchenShape;
  lengths: { left: number; back: number; right: number; front: number }; // cm
  island: boolean;
  islandPos?: { x: number; z: number } | null; // cm, pusat island (bisa di-drag di diagram)
  islandDims: { w: number; d: number };
  sink: WizardAppliance;
  cooktop: WizardAppliance;
  fridge: WizardAppliance;
  electronic: WizardAppliance;
  options: {
    magiccom: boolean; dispenser: boolean; microwave: boolean;
    bar: boolean; dishRack: boolean; spiceRack: boolean; gasRack: boolean;
  };
  style: string | null;
  material: {
    doorMaterial: DoorMaterial; doorColor: string; bodyFollowsDoor: boolean; bodyColor: string;
    countertop: CountertopType; handleType: HandleType; handleColor: string; led: boolean;
  };
}

// ─── Mode Produksi / HPP / Dimensi / AR ───
export type ProdMethod = 'papan_hpl' | 'rangka_acp';
export type ProdStatus = 'belum' | 'potong' | 'rakit' | 'finishing' | 'siap' | 'terpasang';
export type ProdView = '3d' | 'flat' | 'cut';
export type AppMode = 'design' | 'production';
export type DimUnit = 'mm' | 'cm' | 'm' | 'in';
export interface DimLayers { overall: boolean; wall: boolean; cabinet: boolean; internal: boolean; vertical: boolean; doors: boolean }

export type PriceGroup = 'material' | 'acp' | 'hardware' | 'appliance' | 'led' | 'jasa' | 'overhead' | 'countertop';
export interface PriceItem { id: string; group: PriceGroup; name: string; unit: string; price: number; slot?: string }
export type CostCategory = 'material' | 'hardware' | 'appliance' | 'led' | 'jasa' | 'overhead' | 'lainnya';
export interface CustomCostItem { id: string; name: string; qty: number; unit: string; price: number; category: CostCategory }
export interface Scenario { id: string; name: string; method: ProdMethod; margin: number; ppnOn: boolean; slots: Record<string, string> }
export type FrameMaterialId = 'galvanis_08' | 'galvanis_07' | 'aluminium';
export type FrameViewMode = 'frame' | 'frame_acp' | 'solid' | 'exploded';
export type ProdTab = 'rangka' | 'cutting' | 'hpp';
/** Baris HPP: estimasi vs realisasi. Realisasi diisi user saat produksi berjalan. */
export interface HppRow {
  id: string; name: string; cat: string; spec: string; unit: string;
  estVol: number; estPrice: number; realVol: number | null; realPrice: number | null;
  progress: number; supplier: string; note: string; auto?: boolean;
}
export interface CatalogItem { id: string; cat: string; name: string; unit: string; price: number; supplier: string; spec?: string }
export interface ProductionSettings {
  sheet: '1220x2440' | '1830x2440';
  clientName: string; notes: string; terms: string; timeline: string; logo: string | null;
  customItems: CustomCostItem[];
  activeScenario: string;
  scenarios: Scenario[];
  frameMaterial: FrameMaterialId;
  frameView: FrameViewMode;
  frameLabels: boolean; frameWelds: boolean; frameExplode: number;
  frameColorBy?: 'material' | 'profile';
  hppRows: Record<string, HppRow[]>;
}
