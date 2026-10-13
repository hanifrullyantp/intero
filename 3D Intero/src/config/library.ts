import type { Item, ItemConfig, LibraryEntry, Rotation } from '../models/types';
import { KITCHEN_STANDARDS } from './standards';

let counter = 0;
export function uid(prefix = 'it'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const DEFAULT_CONFIG: ItemConfig = {
  shelves: 1,
  adjustableShelves: true,
  doors: 1,
  drawers: 0,
  doorStyle: 'slab',
  opening: 'left',
  handleType: 'default',
  handlePosition: 'auto',
  hinge: 'default',
  slide: 'default',
  accessories: [],
  hasToeKick: true,
  openFront: false,
  glass: false,
  cornerType: 'l_true',
  cornerDoorModel: 'both',
  cornerHinge: '168_soft',
  cornerDepth: 55,
  materials: { useDefault: true },
};

const B = KITCHEN_STANDARDS.base_cabinet;
const W = KITCHEN_STANDARDS.wall_cabinet;
const T = KITCHEN_STANDARDS.tall_cabinet;

const e = (
  id: string,
  name: string,
  category: LibraryEntry['category'],
  dims: [number, number, number],
  icon: string,
  description: string,
  config: Partial<ItemConfig> = {},
  elevation = 0,
  kind: LibraryEntry['kind'] = 'cabinet',
): LibraryEntry => ({ id, name, kind, category, width: dims[0], height: dims[1], depth: dims[2], elevation, icon, description, config });

export const LIBRARY: LibraryEntry[] = [
  // ---- BASE ----
  e('base_single', 'Single Door', 'base', [60, B.default_height, B.default_depth], '▯', '1 door, 1 shelf', { doors: 1, shelves: 1 }),
  e('base_double', 'Double Door', 'base', [80, B.default_height, B.default_depth], '▯▯', '2 doors, 1 shelf', { doors: 2, shelves: 1, opening: 'double' }),
  e('base_drawer_2', '2-Drawer', 'base', [60, B.default_height, B.default_depth], '⊟', '2 deep drawers', { doors: 0, drawers: 2, shelves: 0 }),
  e('base_drawer_3', '3-Drawer', 'base', [60, B.default_height, B.default_depth], '≡', '3 drawers', { doors: 0, drawers: 3, shelves: 0 }),
  e('base_drawer_4', '4-Drawer', 'base', [60, B.default_height, B.default_depth], '☰', '4 drawers', { doors: 0, drawers: 4, shelves: 0 }),
  e('base_combo', 'Door + Drawer', 'base', [60, B.default_height, B.default_depth], '⊡', '1 top drawer + door', { doors: 1, drawers: 1, shelves: 1 }),
  e('base_sink', 'Sink Cabinet', 'base', [80, B.default_height, B.default_depth], '◎', 'Double door, no shelf, for sink', { doors: 2, shelves: 0, opening: 'double' }),
  e('base_stove', 'Stove Cabinet', 'base', [60, B.default_height, B.default_depth], '⁂', 'Door + drawer below cooktop', { doors: 2, drawers: 1, shelves: 0, opening: 'double' }),
  e('base_corner_lazy', 'Corner (Lazy Susan)', 'base', [90, B.default_height, 90], '◰', 'L-corner with lazy susan', { doors: 2, shelves: 0, accessories: ['lazy_susan'] }),
  e('base_corner_blind', 'Corner (Blind)', 'base', [100, B.default_height, B.default_depth], '◧', 'Blind corner, 1 door + blind panel', { doors: 1, shelves: 1 }),
  e('base_corner_l', 'Corner (L-Access)', 'base', [90, B.default_height, 90], '◱', 'L-shaped corner, bi-fold door', { doors: 2, shelves: 1 }),
  e('base_open', 'Open Shelf', 'base', [40, B.default_height, B.default_depth], '▭', 'Open shelving, no doors', { doors: 0, shelves: 2, openFront: true }),
  e('base_pullout', 'Pull-Out', 'base', [30, B.default_height, B.default_depth], '⇥', 'Narrow pull-out larder', { doors: 1, shelves: 0, accessories: ['pullout_basket'] }),
  // ---- WALL ----
  e('wall_single', 'Single Door', 'wall', [60, W.default_height, W.default_depth], '▯', '1 door, 2 shelves', { doors: 1, shelves: 2, hasToeKick: false }, W.distance_from_floor),
  e('wall_double', 'Double Door', 'wall', [80, W.default_height, W.default_depth], '▯▯', '2 doors, 2 shelves', { doors: 2, shelves: 2, opening: 'double', hasToeKick: false }, W.distance_from_floor),
  e('wall_flip', 'Flip-Up Door', 'wall', [80, 40, W.default_depth], '⬒', 'Lift-up door', { doors: 1, shelves: 1, opening: 'flip_up', hasToeKick: false }, 165),
  e('wall_glass', 'Glass Door', 'wall', [60, W.default_height, W.default_depth], '◫', 'Aluminium frame glass door', { doors: 1, shelves: 2, glass: true, doorStyle: 'glass', hasToeKick: false }, W.distance_from_floor),
  e('wall_open', 'Open Shelf', 'wall', [60, W.default_height, W.default_depth], '▭', 'Open wall shelving', { doors: 0, shelves: 2, openFront: true, hasToeKick: false }, W.distance_from_floor),
  e('wall_corner', 'Corner Wall', 'wall', [60, W.default_height, 60], '◰', 'L-shaped corner wall unit', { doors: 1, shelves: 2, hasToeKick: false, cornerDepth: 33 }, W.distance_from_floor),
  e('wall_hood', 'Hood Housing', 'wall', [60, 43, W.default_depth], '⌂', 'Housing above cooker hood', { doors: 2, shelves: 0, opening: 'double', hasToeKick: false }, 162),
  e('wall_micro', 'Microwave Housing', 'wall', [60, W.default_height, 40], '▣', 'Open niche + top door', { doors: 1, shelves: 1, hasToeKick: false }, W.distance_from_floor),
  // ---- TALL ----
  e('tall_pantry', 'Pantry', 'tall', [60, 210, T.default_depth], '▮', 'Full height pantry, 2+2 doors', { doors: 2, shelves: 5, opening: 'double' }),
  e('tall_oven', 'Oven Tower', 'tall', [60, 210, T.default_depth], '▣', 'Built-in oven + microwave', { doors: 2, shelves: 2, opening: 'double' }),
  e('tall_electro', 'Kabinet Elektronik (Magiccom + Oven)', 'tall', [80, 220, T.default_depth], '▣', 'Magiccom pada rel tarik setinggi top table; oven built-in di atasnya.', {
    doors: 2, shelves: 0, opening: 'double',
    magiccom: { width: 32, height: 30, depth: 34, extension: 42, shelfHeight: 87 },
  }),
  e('tall_fridge', 'Fridge Housing 2 Pintu', 'tall', [65, 210, 62], '❄', 'Housing for refrigerator', { doors: 1, shelves: 0, openFront: true, fridgeType: 'two_door' }),
  e('tall_fridge_sbs', 'Fridge Housing Side-by-Side', 'tall', [92, 210, 62], '❄', 'Housing side-by-side (lebar sesuai kulkas, 85–95 cm)', { doors: 1, shelves: 0, openFront: true, fridgeType: 'side_by_side' }),
  e('tall_broom', 'Broom Closet', 'tall', [40, 210, T.default_depth], '⫿', 'Tall utility cabinet', { doors: 1, shelves: 1 }),
  e('tall_dispenser', 'Kabinet Dispenser', 'tall', [60, 220, 55], 'dispenser', 'Dispenser air di dalam niche terbuka, penyimpanan di atasnya.', {
    doors: 1, shelves: 0, opening: 'left',
    dispenser: { width: 31, height: 104, depth: 35, clearanceTop: 8 },
  }),
  e('tall_wardrobe', 'Wardrobe 2-Door', 'tall', [100, 240, 60], '👔', 'Hanging rod + shelves', { doors: 2, shelves: 1, opening: 'double', accessories: ['hanging_rod'] }),
  e('tall_bookshelf', 'Bookshelf', 'tall', [80, 200, 35], '📚', 'Open shelving tower', { doors: 0, shelves: 5, openFront: true }),
  e('tv_console', 'TV Console', 'base', [180, 45, 40], '📺', 'Low media console with drawers', { doors: 0, drawers: 3, shelves: 0 }),
  // ---- APPLIANCES ----
  e('app_cooktop_2', 'Cooktop 2-Burner', 'appliance', [30, 5, 52], '🔥', 'Gas 2 burner', { burners: 2, fuel: 'gas' }, 82, 'appliance'),
  e('app_cooktop_4', 'Cooktop 4-Burner', 'appliance', [60, 5, 52], '🔥', 'Gas 4 burner', { burners: 4, fuel: 'gas' }, 82, 'appliance'),
  e('app_cooktop_5', 'Cooktop 5-Burner', 'appliance', [75, 5, 52], '🔥', 'Gas 5 burner', { burners: 5, fuel: 'gas' }, 82, 'appliance'),
  e('app_sink_single', 'Sink Single', 'appliance', [50, 20, 40], '🚰', 'Single bowl', { bowls: 1 }, 80, 'appliance'),
  e('app_sink_double', 'Sink Double', 'appliance', [80, 20, 45], '🚰', 'Double bowl', { bowls: 2 }, 80, 'appliance'),
  e('app_sink_15', 'Sink 1.5 Bowl', 'appliance', [70, 20, 45], '🚰', 'One and a half bowl', { bowls: 2 }, 80, 'appliance'),
  e('app_hood_slim', 'Hood Slim', 'appliance', [60, 15, 45], '⌃', 'Slim cooker hood', { hoodType: 'slim', distanceFromCooktop: 65, fuel: 'gas' }, 147, 'appliance'),
  e('app_hood_pyramid', 'Hood Pyramid', 'appliance', [60, 45, 50], '⌃', 'Pyramid chimney hood', { hoodType: 'pyramid', distanceFromCooktop: 65, fuel: 'gas' }, 147, 'appliance'),
  e('app_hood_t', 'Hood T-Shape', 'appliance', [90, 40, 50], '⌃', 'T-shape chimney hood', { hoodType: 't_shape', distanceFromCooktop: 65, fuel: 'gas' }, 147, 'appliance'),
  e('app_fridge', 'Refrigerator 2 Pintu', 'appliance', [60, 170, 65], 'fridge', 'Kulkas 2 pintu (freezer atas)', { fridgeType: 'two_door' }, 0, 'appliance'),
  e('app_fridge_sbs', 'Refrigerator Side-by-Side', 'appliance', [90, 178, 70], 'fridge', 'Kulkas side-by-side. Lebar 85–95 cm, tinggi 170–180 cm, kedalaman 70 cm (ubah sesuai tipe)', { fridgeType: 'side_by_side' }, 0, 'appliance'),
  // ---- loose furniture (kind furniture: no cutting list, own renderer) ----
  e('fur_island', 'Island Table', 'furniture', [120, 90, 60], 'table', 'Meja island dengan lemari dan worktop (bisa diberi stool)', {}, 0, 'furniture'),
  e('fur_bar', 'Meja Bar (Bar Counter)', 'furniture', [160, 105, 50], 'table', 'Meja bar tinggi 105 cm dengan cantilever untuk duduk di depan', {}, 0, 'furniture'),
  e('fur_dining', 'Meja Makan 4 Orang', 'furniture', [140, 76, 85], 'table', 'Meja makan 140×85 cm, tinggi 76 cm', {}, 0, 'furniture'),
  e('fur_chair', 'Kursi Makan', 'furniture', [45, 92, 50], 'chair', 'Kursi makan dengan sandaran dan dudukan berlapis', {}, 0, 'furniture'),
  e('fur_stool', 'Kursi Bar (Stool)', 'furniture', [36, 75, 36], 'chair', 'Stool bar tinggi 75 cm (untuk meja bar 105 cm)', {}, 0, 'furniture'),
  e('fur_trolley', 'Trolley Dapur', 'furniture', [60, 85, 45], 'package', 'Trolley dapur 3 rak dengan roda', {}, 0, 'furniture'),
  e('app_oven', 'Built-in Oven', 'appliance', [60, 60, 55], '♨', 'Built-in oven', {}, 80, 'appliance'),
  e('app_microwave', 'Microwave', 'appliance', [50, 30, 35], '▣', 'Microwave', {}, 150, 'appliance'),
  e('app_dishwasher', 'Dishwasher', 'appliance', [60, 82, 55], '🍽', 'Standard dishwasher', {}, 0, 'appliance'),
  // ---- ACCESSORIES ----
  e('acc_backsplash', 'Backsplash', 'accessory', [60, 50, 1], '▬', 'Wall backsplash panel', {}, 82, 'accessory'),
  e('acc_end_panel', 'End Panel', 'accessory', [1.8, 82, 57], '|', 'Decorative end panel', {}, 0, 'accessory'),
  e('acc_crown', 'Crown Molding', 'accessory', [60, 5, 5], '⎺', 'Top crown molding', {}, 205, 'accessory'),
  e('acc_filler', 'Filler Strip', 'accessory', [5, 80, 55], '▏', 'Filler between cabinets', {}, 0, 'accessory'),
  e('acc_led', 'LED Light', 'accessory', [60, 1, 2], '✦', 'Under-cabinet LED', {}, 134, 'accessory'),
  e('acc_wine', 'Wine Rack', 'accessory', [30, 40, 33], '🍷', 'Open wine rack', {}, 135, 'accessory'),
  e('acc_open_shelving', 'Open Shelving', 'accessory', [80, 2, 25], '━', 'Floating shelf', {}, 150, 'accessory'),
  e('acc_tv', 'TV 55"', 'accessory', [123, 72, 6], '📺', 'Wall mounted television', { tvSize: '55' }, 100, 'accessory'),
  // ---- internal kitchen organisers (rendered procedurally, pull-out animation) ----
  e('int_dish_pullout', 'Rak Piring Pull-Out 2 Tier', 'accessory', [60, 55, 50], 'rack', 'Chrome wire 2-tier pull-out dish rack with drip tray. Fits a 40–80 cm base cabinet.', {}, 8, 'accessory'),
  e('int_dish_wall', 'Rak Piring Dinding', 'accessory', [80, 40, 25], 'rack', 'Wall-mounted dish rack under a wall cabinet — chrome rails + drip tray.', {}, 80, 'accessory'),
  e('int_spice_pullout', 'Rak Bumbu Pull-Out', 'accessory', [20, 55, 48], 'rack', 'Rak bumbu 3 tingkat pada rel tarik; pintu panel ikut tertarik.', {}, 8, 'accessory'),
  e('int_trash_pullout', 'Tempat Sampah Pull-Out', 'accessory', [40, 55, 50], 'rack', 'Steel pull-out double waste bin (2 × 15 L) with soft-close slide.', {}, 8, 'accessory'),
  e('int_gas_pullout', 'Rak Gas 12 kg Pull-Out', 'accessory', [42, 68, 50], 'rack', 'Tabung gas 12 kg (pink) pada rel tarik dengan strap pengaman.', {}, 8, 'accessory'),
  e('int_cutlery', 'Laci Tatakan Sendok', 'accessory', [60, 18, 48], 'rack', 'Laci organizer sendok, garpu, dan pisau dengan sekat.', {}, 8, 'accessory'),
];

export const LIBRARY_CATEGORIES: { id: LibraryEntry['category']; label: string }[] = [
  { id: 'base', label: 'Base Cabinets' },
  { id: 'wall', label: 'Wall Cabinets' },
  { id: 'tall', label: 'Tall Cabinets' },
  { id: 'appliance', label: 'Appliances' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'furniture', label: 'Meja & Kursi' },
];

export function getEntry(id: string): LibraryEntry {
  return LIBRARY.find((l) => l.id === id) ?? LIBRARY[0];
}

export function createItem(
  entryId: string,
  overrides: Partial<Item> = {},
  configOverrides: Partial<ItemConfig> = {},
): Item {
  const entry = getEntry(entryId);
  return {
    id: uid(),
    kind: entry.kind,
    category: entry.category,
    subtype: entry.id,
    name: entry.name,
    x: 0,
    y: 0,
    rotation: 0 as Rotation,
    width: entry.width,
    height: entry.height,
    depth: entry.depth,
    elevation: entry.elevation,
    config: { ...DEFAULT_CONFIG, ...entry.config, ...configOverrides, accessories: [...(configOverrides.accessories ?? entry.config.accessories ?? [])], materials: { useDefault: true } },
    ...overrides,
  };
}

export const CATEGORY_COLORS: Record<string, string> = {
  base: '#4fc3f7',
  wall: '#ba68c8',
  tall: '#4db6ac',
  appliance: '#ffa726',
  accessory: '#a1887f',
  furniture: '#9575cd',
};
