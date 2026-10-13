// ---- Core data model for 3D Intero ----
// All dimensions are in centimeters (accuracy 0.1 cm)

export type FurnitureType = 'kitchen' | 'tv' | 'wardrobe' | 'bookshelf' | 'storage' | 'custom';
export type KitchenLayout = 'I' | 'L' | 'U' | 'parallel' | 'island';
export type Rotation = 0 | 90 | 180 | 270;
export type ItemKind = 'cabinet' | 'appliance' | 'accessory' | 'furniture';
export type ItemCategory = 'base' | 'wall' | 'tall' | 'appliance' | 'accessory' | 'furniture';
export type FridgeType = 'one_door' | 'two_door' | 'side_by_side';
export type DoorStyle = 'slab' | 'shaker' | 'glass' | 'louvered';
export type OpeningDirection = 'left' | 'right' | 'flip_up' | 'double';
export type HoodType = 'slim' | 'pyramid' | 't_shape' | 'island' | 'built_in';
export type Finish = 'matte' | 'semi' | 'gloss';
export type EdgeProfile = 'straight' | 'bullnose' | 'beveled' | 'ogee';
export type CornerType = 'l_true' | 'lazy_susan' | 'blind' | 'magic';
export type HandlePosition = 'auto' | 'edge-top' | 'edge-bottom' | 'center' | 'vertical';

/** Project-wide defaults edited from the Global Settings panel */
export interface ProjectDefaults {
  baseHeight: number;
  baseDepth: number;
  wallHeight: number;
  wallDepth: number;
  wallBottom: number;
  tallDepth: number;
  /** Finished cabinet top line, not the room ceiling. */
  totalHeight?: number;
}
export type CornerDoorModel = 'both' | 'bifold' | 'double' | 'single' | 'left_only' | 'right_only' | 'open';

export interface Wall {
  id: string;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nx: number;
  ny: number;
  rotation: Rotation;
  height: number;
  virtual?: boolean;
}

export interface Room {
  width: number;
  depth: number;
  ceilingHeight: number;
  walls: Wall[];
}

export interface ItemMaterialOverride {
  useDefault: boolean;
  carcassColor?: string;
  doorColor?: string;
  board?: string;
  backPanel?: string;
  edgeBanding?: string;
}

export interface ItemConfig {
  shelves: number;
  adjustableShelves: boolean;
  doors: number;
  drawers: number;
  doorStyle: DoorStyle;
  opening: OpeningDirection;
  handleType: string;
  /** auto = ergonomic (base: top edge, wall: bottom edge, tall: opposite split) */
  handlePosition: HandlePosition;
  hinge: string;
  slide: string;
  accessories: string[];
  hasToeKick: boolean;
  openFront: boolean;
  glass: boolean;
  hoodType?: HoodType;
  /** hood: keep its bottom flush with the upper-cabinet bottoms (default on; manual moves switch it off) */
  hoodAuto?: boolean;
  distanceFromCooktop?: number;
  fuel?: 'gas' | 'electric';
  burners?: number;
  bowls?: number;
  /** refrigerators (appliance and housing): door layout */
  fridgeType?: FridgeType;
  /** Appliance dimensions stay fixed when its surrounding cabinet is resized. */
  fridge?: { width: number; height: number; depth: number; clearanceTop: number };
  dispenser?: { width: number; height: number; depth: number; clearanceTop: number };
  /** Magiccom on a pull-out rail, with an oven directly above its niche. */
  magiccom?: { width: number; height: number; depth: number; extension: number; shelfHeight: number };
  /** electronics tower: which appliances live inside, bottom to top */
  appliances?: string[];
  /** pull-out organisers embedded in a base cabinet, one per door side */
  interiorLeft?: '' | 'dish' | 'spice' | 'gas' | 'cutlery';
  interiorRight?: '' | 'dish' | 'spice' | 'gas' | 'cutlery';
  /** suppress the built-in front panel when the rack is embedded behind a cabinet door */
  skipFront?: boolean;
  stackParentId?: string;
  applianceHostId?: string;
  tvSize?: string;
  // corner cabinet v3 (true L corner, flexible asymmetric)
  cornerType?: CornerType;
  cornerDoorModel?: CornerDoorModel;
  cornerLeftDoor?: number;
  cornerRightDoor?: number;
  cornerHinge?: string;
  cornerDepth?: number; // arm depth = countertop depth (default 60)
  materials: ItemMaterialOverride;
}

export interface Item {
  id: string;
  kind: ItemKind;
  category: ItemCategory;
  subtype: string;
  name: string;
  x: number;
  y: number;
  rotation: Rotation;
  width: number;
  height: number;
  depth: number;
  elevation: number;
  wallId?: string;
  locked?: boolean;
  /** layers panel */
  visible?: boolean;
  groupId?: string | null;
  labelColor?: string | null;
  /** per-item open amount 0..1 (animated doors) */
  openAmount?: number;
  config: ItemConfig;
}

export interface LayerGroup {
  id: string;
  name: string;
  collapsed?: boolean;
  visible?: boolean;
  locked?: boolean;
  color?: string | null;
  parentId?: string | null;
  auto?: boolean;
}

export interface ProjectMaterials {
  board: string;
  backBoard: string;
  finishing: string;
  carcassColor: string;
  doorColor: string;
  finish: Finish;
  countertop: string;
  countertopColor: string;
  countertopThickness: number;
  edgeProfile: EdgeProfile;
  backsplash: boolean;
  backsplashHeight: number;
  handleType: string;
  handleFinish: string;
  hinge: string;
  slide: string;
  /** visible cabinet sides use the door colour (default on) */
  sideFollowDoor?: boolean;
  /** toe-kick boards use the door colour (default on) */
  toeFollowDoor?: boolean;
  /** black & white adjustment per colour group, -100 (black) .. +100 (white) */
  tints?: ProjectTints;
  /** cornice ("topi") on top of the upper cabinets */
  crown?: boolean;
  crownHeight?: number;
  crownStyle?: 'flat' | 'cornice';
}

export interface ProjectTints {
  door: number;
  carcass: number;
  countertop: number;
}
export type TintTarget = keyof ProjectTints;

export interface LightingSettings {
  /** strip under the upper cabinets, lighting the worktop */
  under: boolean;
  /** strip inside the upper cabinets */
  inWall: boolean;
  /** strip inside the base cabinets */
  inBase: boolean;
  tone: 'warm' | 'neutral' | 'cool';
  brightness?: number;
  glow?: boolean;
}

export interface ProjectSettings {
  kerf: number;
  laborRate: number;
  markup: number;
  unit: 'cm' | 'mm' | 'inch';
  gridSize: number;
  countertopMode?: 'flat' | 'shape';
  countertopDepth?: number;
  defaults?: ProjectDefaults;
  lighting?: LightingSettings;
  dimensionVersion?: number;
}

export interface Project {
  id: string;
  name: string;
  type: FurnitureType;
  layout: KitchenLayout;
  room: Room;
  items: Item[];
  groups?: LayerGroup[];
  materials: ProjectMaterials;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Part {
  id: string;
  itemId: string;
  cabinetName: string;
  name: string;
  cutW: number;
  cutH: number;
  thickness: number;
  material: string;
  qty: number;
  edgeBanding: string;
  edgeMeters: number;
  grain: 'length' | 'width' | 'none';
  box: { x: number; y: number; z: number; sx: number; sy: number; sz: number };
  role: 'carcass' | 'door' | 'drawer' | 'back' | 'shelf' | 'toekick' | 'other';
  hingeSide?: 'left' | 'right' | 'top';
  isFront?: boolean;
  glass?: boolean;
  countInList?: boolean;
  /** bifold panel index for corner doors */
  bifold?: number;
  /** panel mounted on the inner side face of a corner (thin in x, long in z) */
  sideFace?: boolean;
  /** side-face hinge position: near = inner corner end, far = outer end */
  hingeAt?: 'near' | 'far';
}

export interface Footprint { x: number; y: number; w: number; h: number; }
export interface Countertop {
  id: string; x: number; y: number; w: number; h: number;
  elevation: number; thickness: number; rotation: Rotation; wallId?: string;
}
export type Severity = 'error' | 'warning' | 'info';
export interface Issue {
  id: string; severity: Severity; message: string; itemIds: string[]; fix?: string;
}
export interface LibraryEntry {
  id: string; name: string; kind: ItemKind; category: ItemCategory;
  width: number; height: number; depth: number; elevation: number;
  icon: string; description: string; config: Partial<ItemConfig>;
  custom?: boolean;
}
// user-built components
export interface CustomShape {
  id: string;
  type: 'box' | 'cylinder' | 'sphere' | 'plane' | 'prism' | 'torus';
  name?: string;
  /** size in cm */
  w: number; h: number; d: number;
  /** CENTRE of the shape, in component space (0..width, 0..height, 0..depth after normalising) */
  x: number; y: number; z: number;
  /** rotation in degrees */
  rx: number; ry: number; rz: number;
  color: string;
  /** material look preset: chrome | stainless | wood | plastic | black | custom */
  mat?: string;
  /** hole / cut-out marker: not rendered in the project (cut-outs are for drawing only) */
  hole?: boolean;
  /** @deprecated use hole */
  subtract?: boolean;
  /** shapes sharing a group id move together */
  group?: string;
  /** functional role, used by the project renderer / exports */
  role?: 'none' | 'door' | 'drawer' | 'shelf' | 'rail';
}
export interface CustomComponent {
  id: string; name: string; nameEn?: string;
  category: string; tags: string[];
  description: string;
  visibility: 'private' | 'team' | 'public';
  shapes: CustomShape[];
  params: { key: string; label: string; min: number; max: number; def: number }[];
  anim: { type: 'none' | 'pullout' | 'rotate' | 'open' | 'lift'; distance: number; duration: number };
  width: number; height: number; depth: number;
  createdAt: string;
}
