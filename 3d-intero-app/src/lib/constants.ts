import { DEFAULT_TERMS, SLOTS_STANDAR } from '../production/prices';
import type {
  Accessory, CountertopType, DoorMaterial, HandleType, LedConfig, LibraryEntry, Materials,
  ProjectSettings, Slot1, Slot2, ItemType, LedTemp,
} from '../types';

export const APP_NAME = '3D Intero';
export const APP_VERSION = '3D Intero 1.0';
export const FORMAT_VERSION = '1.0';
export const BRAND = '#1B9D6B';

export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Putih', hex: '#F5F5F3' }, { name: 'Hitam', hex: '#161616' }, { name: 'Krem', hex: '#E8DCC4' },
  { name: 'Light Wood', hex: '#C9A97A' }, { name: 'Dark Wood', hex: '#5C3F2A' }, { name: 'Graphite', hex: '#3B3F45' },
  { name: 'Asphalt', hex: '#5A5F66' }, { name: 'Silver', hex: '#B8BCC2' }, { name: 'Rosegold', hex: '#B76E79' },
  { name: 'Gold', hex: '#C9A227' }, { name: 'Brass', hex: '#B5A642' }, { name: 'Copper', hex: '#B87333' },
  { name: 'Charcoal', hex: '#2E3135' }, { name: 'Chrome', hex: '#D7DADF' }, { name: 'Monefyi Green', hex: '#1B9D6B' },
  { name: 'Navy', hex: '#1F2A44' }, { name: 'Burgundy', hex: '#6D1F2C' }, { name: 'Olive', hex: '#6B6E3A' },
  { name: 'Terracotta', hex: '#B5593A' }, { name: 'Dusty Pink', hex: '#D4A5A5' }, { name: 'Sage', hex: '#9CAF88' },
  { name: 'Cream', hex: '#F3EBDD' }, { name: 'Mocha', hex: '#7B5B4A' }, { name: 'Taupe', hex: '#8B7D74' },
];

export const LABEL_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

export const DOOR_MATERIALS: Record<DoorMaterial, { roughness: number; metalness: number; grain: boolean; gloss?: boolean }> = {
  'HPL': { roughness: 0.55, metalness: 0.02, grain: true },
  'Duco': { roughness: 0.18, metalness: 0.05, grain: false, gloss: true },
  'PVC': { roughness: 0.4, metalness: 0.0, grain: false },
  'ACP': { roughness: 0.3, metalness: 0.4, grain: false },
  'Solid Wood': { roughness: 0.6, metalness: 0.0, grain: true },
  'Glass': { roughness: 0.05, metalness: 0.1, grain: false },
};

export const COUNTERTOP_TYPES: Record<CountertopType, { name: string; base: string; vein: string | null; roughness: number; metalness: number; speckle?: boolean; wood?: boolean }> = {
  granit_hitam: { name: 'Granit Hitam', base: '#1A1A1A', vein: null, roughness: 0.25, metalness: 0.1, speckle: true },
  granit_putih: { name: 'Granit Putih', base: '#E9E6E0', vein: null, roughness: 0.3, metalness: 0.05, speckle: true },
  granit_grey: { name: 'Granit Grey', base: '#8A8C8E', vein: null, roughness: 0.3, metalness: 0.08, speckle: true },
  marble_putih: { name: 'Marble Putih', base: '#F2F1EE', vein: '#A9A6A0', roughness: 0.15, metalness: 0.05 },
  marble_hitam: { name: 'Marble Hitam', base: '#141414', vein: '#D8D4CC', roughness: 0.15, metalness: 0.1 },
  carrara: { name: 'Carrara', base: '#ECECEA', vein: '#8F9398', roughness: 0.18, metalness: 0.05 },
  calacatta: { name: 'Calacatta', base: '#F6F4EF', vein: '#B29B6C', roughness: 0.15, metalness: 0.05 },
  quartz_white: { name: 'Quartz White', base: '#F4F4F2', vein: null, roughness: 0.3, metalness: 0.02 },
  quartz_grey: { name: 'Quartz Grey', base: '#A6A8A8', vein: null, roughness: 0.3, metalness: 0.02 },
  quartz_black: { name: 'Quartz Black', base: '#202224', vein: null, roughness: 0.3, metalness: 0.05 },
  solid_surface: { name: 'Solid Surface', base: '#EFEDE8', vein: null, roughness: 0.4, metalness: 0.0 },
  butcher_block: { name: 'Butcher Block', base: '#B98B5A', vein: null, roughness: 0.6, metalness: 0.0, wood: true },
  hpl: { name: 'HPL', base: '#D9D5CE', vein: null, roughness: 0.5, metalness: 0.0 },
};

export const ACCESSORIES: Record<Accessory, string> = {
  shelf: 'Rak biasa',
  dish_rack: 'Rak Piring Tarik 2-tier',
  spice_rack: 'Rak Bumbu Tarik',
  gas_rack: 'Rak Gas Tarik',
  cutlery_drawer: 'Laci Tatakan Sendok',
  trash_bin: 'Pull-out Trash Bin',
  lazy_susan: 'Lazy Susan',
};

export const SLOT1_OPTIONS: Record<Slot1, string> = {
  magiccom: 'Magic Com (Pull-out Tray)', dispenser: 'Water Dispenser', oven: 'Oven', shelf: 'Rak Terbuka',
};
export const SLOT2_OPTIONS: Record<Slot2, string> = {
  oven: 'Oven', microwave: 'Microwave', coffee: 'Coffee Machine', shelf: 'Rak Terbuka', door: 'Pintu Kabinet',
};
export const ELECTRONIC_PRESETS: { id: string; name: string; slot1: Slot1; slot2: Slot2 }[] = [
  { id: 'dispenser_oven', name: 'Dispenser Air + Oven (atas)', slot1: 'dispenser', slot2: 'oven' },
  { id: 'magiccom_oven', name: 'Magic Com + Oven (atas)', slot1: 'magiccom', slot2: 'oven' },
  { id: 'oven_microwave', name: 'Oven + Microwave (atas)', slot1: 'oven', slot2: 'microwave' },
  { id: 'magiccom_microwave', name: 'Magic Com + Microwave (atas)', slot1: 'magiccom', slot2: 'microwave' },
  { id: 'dispenser_microwave', name: 'Dispenser + Microwave (atas)', slot1: 'dispenser', slot2: 'microwave' },
  { id: 'oven_oven', name: 'Oven + Oven (double oven)', slot1: 'oven', slot2: 'oven' },
  { id: 'shelf_oven', name: 'Rak Terbuka + Oven', slot1: 'shelf', slot2: 'oven' },
  { id: 'custom', name: 'Kustom', slot1: 'magiccom', slot2: 'oven' },
];

export const HANDLE_TYPES: Record<HandleType, string> = {
  bar: 'Bar', knob: 'Knob', j: 'J-handle', gola: 'Gola', push: 'Push-to-open',
};

export const LED_TEMPS: { value: LedTemp; name: string; hex: number }[] = [
  { value: 3000, name: '3000K Warm White', hex: 0xFFB042 },
  { value: 4000, name: '4000K Natural White', hex: 0xFFF4E5 },
  { value: 6500, name: '6500K Cool Daylight', hex: 0xD4E8FF },
];

export const TYPE_LABELS: Record<ItemType, string> = {
  base: 'Base Cabinet', sink_base: 'Sink Cabinet', cooktop_base: 'Cooktop Cabinet', drawer_base: 'Drawer Cabinet',
  dishwasher: 'Dishwasher', wall: 'Wall Cabinet', tall: 'Tall Cabinet', corner_base: 'Corner Base', corner_wall: 'Corner Wall',
  fridge: 'Kulkas', electronic: 'Electronic Cabinet', hood: 'Cooker Hood', island: 'Island Table', bar: 'Meja Bar', custom: 'Komponen Kustom',
};

export const DEFAULT_MATERIALS: Materials = {
  doorMaterial: 'HPL', doorColor: '#C9A97A', bodyFollowsDoor: false, bodyColor: '#F2F2F0',
  sidesFollowDoor: true, toeKickFollowsDoor: true, handleColor: '#1A1A1A', handleType: 'bar',
  handleLength: 128, handlePosition: 'top', softClose: true,
};

export const DEFAULT_LED: LedConfig = {
  underCabinet: false, insideUpper: false, insideBase: false, plinth: false,
  temperature: 4000, trigger: 'always', intensity: 70,
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  globalCabinetHeight: 2400, baseHeight: 850, wallGap: 500, wallDepth: 330, toeKick: 100, unit: 'mm',
  countertop: { type: 'granit_hitam', thickness: 20, overhang: 20, backsplash: true, backsplashAuto: true, backsplashHeight: 600, backsplashColor: '#ECE4D8' },
  appearance: { canvasColor: '#E4E7EB', wallColor: '#D2D3D1', floorColor: '#D9D2C7' },
  production: {
    sheet: '1220x2440', clientName: '', notes: '', terms: DEFAULT_TERMS, timeline: '', logo: null, customItems: [],
    activeScenario: 'sc-standar',
    scenarios: [{ id: 'sc-standar', name: 'HPP Standar', method: 'rangka_acp', margin: 30, ppnOn: true, slots: { ...SLOTS_STANDAR } }],
    frameMaterial: 'galvanis_08', frameView: 'frame_acp', frameLabels: true, frameWelds: true, frameExplode: 0,
    hppRows: {},
  },
};

export const LIBRARY: LibraryEntry[] = [
  // Base
  { id: 'base40', name: 'Base Cabinet 40', category: 'Base Cabinet', type: 'base', dims: { w: 400, h: 850, d: 600 }, config: { doorCount: 1, drawerCount: 0 } },
  { id: 'base60', name: 'Base Cabinet 60', category: 'Base Cabinet', type: 'base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 2, drawerCount: 0 } },
  { id: 'base80', name: 'Base Cabinet 80', category: 'Base Cabinet', type: 'base', dims: { w: 800, h: 850, d: 600 }, config: { doorCount: 2, drawerCount: 0 } },
  { id: 'base60d', name: 'Base + 1 Laci 60', category: 'Base Cabinet', type: 'base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 2, drawerCount: 1 } },
  { id: 'drawer60', name: 'Drawer 3 Laci 60', category: 'Base Cabinet', type: 'drawer_base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 0, drawerCount: 3 } },
  { id: 'drawer80', name: 'Drawer 4 Laci 80', category: 'Base Cabinet', type: 'drawer_base', dims: { w: 800, h: 850, d: 600 }, config: { doorCount: 0, drawerCount: 4 } },
  { id: 'sink80', name: 'Sink Cabinet 80', category: 'Base Cabinet', type: 'sink_base', dims: { w: 800, h: 850, d: 600 }, config: { doorCount: 2 } },
  { id: 'cooktop60', name: 'Cooktop Cabinet 60', category: 'Base Cabinet', type: 'cooktop_base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 2, drawerCount: 1 } },
  { id: 'cooktop80', name: 'Cooktop Cabinet 80', category: 'Base Cabinet', type: 'cooktop_base', dims: { w: 800, h: 850, d: 600 }, config: { doorCount: 2, drawerCount: 1, rightAccessory: 'gas_rack' } },
  { id: 'openbase', name: 'Open Shelf Base 60', category: 'Base Cabinet', type: 'base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 0, openShelf: true } },
  // Wall
  { id: 'wall40', name: 'Wall Cabinet 40', category: 'Wall Cabinet', type: 'wall', dims: { w: 400, h: 700, d: 330 }, config: { doorCount: 1 } },
  { id: 'wall60', name: 'Wall Cabinet 60', category: 'Wall Cabinet', type: 'wall', dims: { w: 600, h: 700, d: 330 }, config: { doorCount: 1 } },
  { id: 'wall80', name: 'Wall Cabinet 80', category: 'Wall Cabinet', type: 'wall', dims: { w: 800, h: 700, d: 330 }, config: { doorCount: 2 } },
  { id: 'wallglass', name: 'Wall Glass Door 60', category: 'Wall Cabinet', type: 'wall', dims: { w: 600, h: 700, d: 330 }, config: { doorCount: 2, glassDoor: true } },
  { id: 'walllift', name: 'Wall Lift-up 80', category: 'Wall Cabinet', type: 'wall', dims: { w: 800, h: 500, d: 330 }, config: { doorCount: 1, liftUp: true, doorType: 'liftup' } },
  { id: 'walldouble', name: 'Wall Double Stack 80', category: 'Wall Cabinet', type: 'wall', dims: { w: 800, h: 1050, d: 330 }, config: { doorCount: 2, doubleStack: true, cornice: true } },
  // Tall
  { id: 'tall60', name: 'Tall Pantry 60', category: 'Tall Cabinet', type: 'tall', dims: { w: 600, h: 2400, d: 600 } },
  { id: 'tall80', name: 'Tall Pantry 80', category: 'Tall Cabinet', type: 'tall', dims: { w: 800, h: 2400, d: 600 } },
  { id: 'electronic', name: 'Electronic Cabinet', category: 'Tall Cabinet', type: 'electronic', dims: { w: 600, h: 2400, d: 600 }, config: { slot1: 'magiccom', slot2: 'oven', electronicPreset: 'magiccom_oven' } },
  // Corner
  { id: 'cornerbase', name: 'Corner Base L 90', category: 'Corner', type: 'corner_base', dims: { w: 900, h: 850, d: 900 }, config: { cornerDoorStyle: 'bifold', lazySusan: true, cornerOrientation: 'auto' } },
  { id: 'cornerwall', name: 'Corner Wall L 60', category: 'Corner', type: 'corner_wall', dims: { w: 600, h: 700, d: 600 }, config: { cornerDoorStyle: 'bifold', cornerOrientation: 'auto' } },
  // Appliance
  { id: 'fridgesbs', name: 'Kulkas Side-by-Side', category: 'Appliance', type: 'fridge', dims: { w: 940, h: 2400, d: 700 }, config: { fridgeType: 'sbs', fridgeW: 900, fridgeH: 1750, fridgeD: 650 } },
  { id: 'fridge2', name: 'Kulkas 2 Pintu', category: 'Appliance', type: 'fridge', dims: { w: 740, h: 2400, d: 700 }, config: { fridgeType: 'french', fridgeW: 700, fridgeH: 1750, fridgeD: 650 } },
  { id: 'fridge1', name: 'Kulkas 1 Pintu', category: 'Appliance', type: 'fridge', dims: { w: 640, h: 2400, d: 700 }, config: { fridgeType: 'single', fridgeW: 600, fridgeH: 1600, fridgeD: 620 } },
  { id: 'hood60', name: 'Cooker Hood 60', category: 'Appliance', type: 'hood', dims: { w: 600, h: 1050, d: 330 }, config: { hoodHeight: 70 } },
  { id: 'hood90', name: 'Cooker Hood 90', category: 'Appliance', type: 'hood', dims: { w: 900, h: 1050, d: 330 }, config: { hoodHeight: 70 } },
  { id: 'dishwasher', name: 'Dishwasher 60', category: 'Appliance', type: 'dishwasher', dims: { w: 600, h: 850, d: 600 } },
  // Island & Bar
  { id: 'island', name: 'Island Table', category: 'Island & Bar', type: 'island', dims: { w: 1200, h: 850, d: 800 }, config: { islandDoorsPerSide: 2, stools: 0 } },
  { id: 'islandstool', name: 'Island + Stools', category: 'Island & Bar', type: 'island', dims: { w: 1600, h: 850, d: 900 }, config: { islandDoorsPerSide: 2, stools: 3 } },
  { id: 'bar', name: 'Meja Bar', category: 'Island & Bar', type: 'bar', dims: { w: 1500, h: 1100, d: 600 }, config: { barOverhang: 300, footRest: true, stools: 3 } },
  // Elektronik (standalone preset)
  { id: 'elec_disp', name: 'Dispenser + Oven', category: 'Elektronik', type: 'electronic', dims: { w: 600, h: 2400, d: 600 }, config: { slot1: 'dispenser', slot2: 'oven', electronicPreset: 'dispenser_oven' } },
  { id: 'elec_mw', name: 'Oven + Microwave', category: 'Elektronik', type: 'electronic', dims: { w: 600, h: 2400, d: 600 }, config: { slot1: 'oven', slot2: 'microwave', electronicPreset: 'oven_microwave' } },
  { id: 'elec_coffee', name: 'Magic Com + Coffee', category: 'Elektronik', type: 'electronic', dims: { w: 600, h: 2400, d: 600 }, config: { slot1: 'magiccom', slot2: 'coffee', electronicPreset: 'custom' } },
  // Aksesoris internal (base cabinet pre-konfigurasi)
  { id: 'acc_dish', name: 'Base + Rak Piring Tarik', category: 'Aksesoris Internal', type: 'base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 2, leftAccessory: 'dish_rack', rightAccessory: 'shelf' } },
  { id: 'acc_spice', name: 'Base + Rak Bumbu 20', category: 'Aksesoris Internal', type: 'base', dims: { w: 400, h: 850, d: 600 }, config: { doorCount: 2, leftAccessory: 'spice_rack', rightAccessory: 'spice_rack', spiceWidth: 200 } },
  { id: 'acc_gas', name: 'Base + Rak Gas 12kg', category: 'Aksesoris Internal', type: 'base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 2, leftAccessory: 'gas_rack', rightAccessory: 'shelf', gasType: '12kg' } },
  { id: 'acc_cutlery', name: 'Base + Laci Sendok', category: 'Aksesoris Internal', type: 'base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 2, drawerCount: 1, leftAccessory: 'cutlery_drawer', rightAccessory: 'shelf' } },
  { id: 'acc_trash', name: 'Base + Trash Bin', category: 'Aksesoris Internal', type: 'base', dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 2, leftAccessory: 'trash_bin', rightAccessory: 'shelf' } },
];

export const LIBRARY_CATEGORIES = ['Base Cabinet', 'Wall Cabinet', 'Tall Cabinet', 'Corner', 'Appliance', 'Island & Bar', 'Elektronik', 'Aksesoris Internal'];

export interface StylePreset {
  id: string; name: string; doorMaterial: DoorMaterial; doorColor: string; bodyFollowsDoor: boolean; bodyColor: string;
  countertop: CountertopType; handleType: HandleType; handleColor: string; led: boolean; desc: string;
}
export const STYLE_PRESETS: StylePreset[] = [
  { id: 'modern', name: 'Modern Minimalis', doorMaterial: 'Duco', doorColor: '#F2F2F0', bodyFollowsDoor: true, bodyColor: '#F2F2F0', countertop: 'granit_hitam', handleType: 'gola', handleColor: '#1A1A1A', led: true, desc: 'Putih glossy, handle gola tersembunyi, granit hitam' },
  { id: 'classic', name: 'Classic', doorMaterial: 'Solid Wood', doorColor: '#7B5B4A', bodyFollowsDoor: true, bodyColor: '#7B5B4A', countertop: 'marble_putih', handleType: 'knob', handleColor: '#B5A642', led: false, desc: 'Kayu solid mocha, knob brass, marble putih' },
  { id: 'scandi', name: 'Scandinavian', doorMaterial: 'HPL', doorColor: '#C9A97A', bodyFollowsDoor: false, bodyColor: '#F5F5F3', countertop: 'quartz_white', handleType: 'bar', handleColor: '#1A1A1A', led: true, desc: 'Light wood, body putih, quartz putih' },
  { id: 'industrial', name: 'Industrial', doorMaterial: 'ACP', doorColor: '#3B3F45', bodyFollowsDoor: true, bodyColor: '#3B3F45', countertop: 'butcher_block', handleType: 'bar', handleColor: '#BDBDBD', led: true, desc: 'Graphite metalik, butcher block, handle steel' },
  { id: 'japandi', name: 'Japandi', doorMaterial: 'HPL', doorColor: '#B98B5A', bodyFollowsDoor: false, bodyColor: '#F3EBDD', countertop: 'solid_surface', handleType: 'push', handleColor: '#1A1A1A', led: true, desc: 'Kayu hangat, push-to-open, solid surface' },
  { id: 'luxury', name: 'Luxury', doorMaterial: 'Duco', doorColor: '#161616', bodyFollowsDoor: true, bodyColor: '#161616', countertop: 'calacatta', handleType: 'bar', handleColor: '#C9A227', led: true, desc: 'Hitam doff, handle gold, calacatta' },
];

export const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  { group: 'Tools', items: [['V', 'Select'], ['H', 'Hand/Pan'], ['O', 'Orbit'], ['M', 'Move'], ['R', 'Rotate'], ['S', 'Scale'], ['T', 'Tape'], ['D', 'Dimension'], ['B', 'Paint'], ['I', 'Eyedropper'], ['Esc', 'Deselect']] },
  { group: 'Edit', items: [['Ctrl+Z', 'Undo'], ['Ctrl+Y', 'Redo'], ['Ctrl+C', 'Copy'], ['Ctrl+V', 'Paste'], ['Ctrl+X', 'Cut'], ['Ctrl+D', 'Duplicate'], ['Del', 'Hapus'], ['Ctrl+A', 'Pilih Semua'], ['Shift+M', 'Mirror'], ['Shift+A', 'Array']] },
  { group: 'File', items: [['Ctrl+N', 'Baru'], ['Ctrl+O', 'Buka .intero'], ['Ctrl+S', 'Simpan .intero'], ['Ctrl+Shift+S', 'Simpan Sebagai']] },
  { group: 'View', items: [['1', 'Perspective'], ['2', 'Top'], ['3', 'Front'], ['4', 'Right'], ['5', 'Isometric'], ['F', 'Focus Selected'], ['Space', 'Pan sementara'], ['Ctrl+Shift+T', 'Theme'], ['Ctrl+Shift+U', 'Mode Simple/Advanced']] },
  { group: 'Animasi & Panel', items: [['Shift+O', 'Buka Semua'], ['Shift+C', 'Tutup Semua'], ['L', 'Layers'], ['P', 'Properties'], ['K', 'Komponen'], ['Ctrl+Shift+K', 'Component Builder'], ['Shift+D', 'Panel Dimensi'], ['Ctrl+Shift+P', 'Mode Desain / Produksi'], ['Ctrl+Shift+V', 'VR Mode']] },
];

export const WALL_NAMES: Record<string, string> = { left: 'Dinding Kiri', back: 'Dinding Kanan', right: 'Dinding Kanan 2', front: 'Dinding Depan', island: 'Island' };
