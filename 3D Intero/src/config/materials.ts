export interface BoardMaterial {
  id: string;
  name: string;
  thickness: number; // mm
  sheet: { w: number; h: number }; // cm
  price: number; // IDR per sheet
}

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  texture?: 'wood' | 'marble' | 'concrete' | 'granite' | 'metal';
  category: 'solid' | 'wood' | 'stone' | 'metallic';
}

export const MATERIALS = {
  boards: [
    { id: 'ply18', name: 'Plywood 18mm', thickness: 18, sheet: { w: 122, h: 244 }, price: 350000 },
    { id: 'ply15', name: 'Plywood 15mm', thickness: 15, sheet: { w: 122, h: 244 }, price: 280000 },
    { id: 'ply12', name: 'Plywood 12mm', thickness: 12, sheet: { w: 122, h: 244 }, price: 220000 },
    { id: 'ply9', name: 'Plywood 9mm', thickness: 9, sheet: { w: 122, h: 244 }, price: 180000 },
    { id: 'ply4', name: 'Plywood 4mm', thickness: 4, sheet: { w: 122, h: 244 }, price: 95000 },
    { id: 'mdf18', name: 'MDF 18mm', thickness: 18, sheet: { w: 122, h: 244 }, price: 200000 },
    { id: 'pb18', name: 'Particle Board 18mm', thickness: 18, sheet: { w: 122, h: 244 }, price: 150000 },
    { id: 'block18', name: 'Blockboard 18mm', thickness: 18, sheet: { w: 122, h: 244 }, price: 280000 },
  ] as BoardMaterial[],
  finishings: [
    { id: 'hpl', name: 'HPL (High Pressure Laminate)', thickness: 0.8, pricePerM2: 120000 },
    { id: 'melamine', name: 'Melamine', thickness: 0, pricePerM2: 0 },
    { id: 'duco', name: 'Duco Paint', thickness: 0, pricePerM2: 250000 },
    { id: 'veneer', name: 'Natural Wood Veneer', thickness: 0.5, pricePerM2: 300000 },
    { id: 'pvc_sheet', name: 'PVC Sheet', thickness: 0.3, pricePerM2: 80000 },
    { id: 'pvc', name: 'PVC Laminasi (glossy)', thickness: 0.3, pricePerM2: 110000 },
    { id: 'acp', name: 'ACP (Aluminium Composite)', thickness: 0.4, pricePerM2: 420000 },
    { id: 'acrylic', name: 'Acrylic Sheet', thickness: 1, pricePerM2: 450000 },
  ],
  countertops: [
    { id: 'granite', name: 'Granite', thicknesses: [1.5, 2], price_per_m2: 1500000 },
    { id: 'marble', name: 'Marble', thicknesses: [1.5, 2], price_per_m2: 2000000 },
    { id: 'quartz', name: 'Quartz', thicknesses: [1.5, 2, 3], price_per_m2: 2500000 },
    { id: 'solid_surface', name: 'Solid Surface', thicknesses: [1.2], price_per_m2: 1800000 },
    { id: 'hpl_top', name: 'HPL Countertop', thicknesses: [2.8, 3], price_per_m2: 500000 },
  ],
  colors: [
    { id: 'white', name: 'Pure White', hex: '#FFFFFF', category: 'solid' },
    { id: 'cream', name: 'Cream', hex: '#FFFDD0', category: 'solid' },
    { id: 'grey_light', name: 'Light Grey', hex: '#D3D3D3', category: 'solid' },
    { id: 'grey', name: 'Grey', hex: '#808080', category: 'solid' },
    { id: 'grey_dark', name: 'Dark Grey', hex: '#404040', category: 'solid' },
    { id: 'black', name: 'Black', hex: '#1A1A1A', category: 'solid' },
    { id: 'navy', name: 'Navy Blue', hex: '#1B2A4A', category: 'solid' },
    { id: 'sage', name: 'Sage Green', hex: '#9CAF88', category: 'solid' },
    { id: 'olive', name: 'Olive', hex: '#6B7B3A', category: 'solid' },
    { id: 'terracotta', name: 'Terracotta', hex: '#B5613E', category: 'solid' },
    { id: 'teak', name: 'Teak Wood', hex: '#B8860B', texture: 'wood', category: 'wood' },
    { id: 'oak', name: 'Natural Oak', hex: '#C8A876', texture: 'wood', category: 'wood' },
    { id: 'walnut', name: 'Walnut', hex: '#5C4033', texture: 'wood', category: 'wood' },
    { id: 'maple', name: 'Maple', hex: '#E8D4A2', texture: 'wood', category: 'wood' },
    { id: 'wenge', name: 'Wenge', hex: '#3B2A20', texture: 'wood', category: 'wood' },
    { id: 'ash_grey', name: 'Grey Ash', hex: '#9A9087', texture: 'wood', category: 'wood' },
    { id: 'white_marble', name: 'White Marble', hex: '#F0EDE8', texture: 'marble', category: 'stone' },
    { id: 'concrete', name: 'Concrete Grey', hex: '#A9A9A9', texture: 'concrete', category: 'stone' },
    { id: 'black_galaxy', name: 'Black Galaxy', hex: '#0D0D0D', texture: 'granite', category: 'stone' },
    { id: 'absolute_black', name: 'Absolute Black', hex: '#1A1A1A', texture: 'granite', category: 'stone' },
    { id: 'grey_granite', name: 'Grey Granite', hex: '#696969', texture: 'granite', category: 'stone' },
    { id: 'white_granite', name: 'White Granite', hex: '#E8E8E8', texture: 'granite', category: 'stone' },
    { id: 'calacatta', name: 'Calacatta Quartz', hex: '#F4F1EC', texture: 'marble', category: 'stone' },
    // marbles dedicated to countertops
    { id: 'white_marble_soft', name: 'White Marble', hex: '#F7F6F2', texture: 'marble', category: 'stone' },
    { id: 'carrara', name: 'Carrara White', hex: '#EFEFEC', texture: 'marble', category: 'stone' },
    { id: 'statuario', name: 'Statuario Marble', hex: '#FAFAF7', texture: 'marble', category: 'stone' },
    { id: 'volakas', name: 'Volakas White', hex: '#ECE9E2', texture: 'marble', category: 'stone' },
    { id: 'nero_marquina', name: 'Nero Marquina', hex: '#2B2C2E', texture: 'marble', category: 'stone' },
    { id: 'emerald_marble', name: 'Emerald Marble', hex: '#3E6A56', texture: 'marble', category: 'stone' },
    { id: 'stainless', name: 'Stainless Steel', hex: '#B9BCC0', texture: 'metal', category: 'solid' },
    // metallic finishes (ACP / metallic PVC)
    { id: 'graphite', name: 'Graphite', hex: '#4A4F55', category: 'metallic' },
    { id: 'asphalt', name: 'Asphalt', hex: '#2E3237', category: 'metallic' },
    { id: 'silver', name: 'Silver', hex: '#C4C8CC', category: 'metallic' },
    { id: 'rose_gold', name: 'Rose Gold', hex: '#D8A090', category: 'metallic' },
    { id: 'champagne', name: 'Champagne Gold', hex: '#D9C3A0', category: 'metallic' },
    { id: 'anthracite', name: 'Anthracite', hex: '#333739', category: 'metallic' },
    // extra solids
    { id: 'sand', name: 'Sand Beige', hex: '#D9C8A9', category: 'solid' },
    { id: 'mint', name: 'Mint', hex: '#BFE3D0', category: 'solid' },
    { id: 'dusty_pink', name: 'Dusty Pink', hex: '#D8B4B4', category: 'solid' },
    { id: 'burgundy', name: 'Burgundy', hex: '#6D1F2A', category: 'solid' },
    { id: 'forest', name: 'Forest Green', hex: '#2E4D3A', category: 'solid' },
    { id: 'mocha', name: 'Mocha', hex: '#6F4E37', category: 'solid' },
  ] as ColorSwatch[],
  edgeBandingPricePerM: 6000,
};

export const HARDWARE = {
  hinges: [
    { id: 'soft_close', name: 'Soft-Close Concealed Hinge', angle: 110, price: 40000 },
    { id: 'standard', name: 'Standard Concealed Hinge', angle: 110, price: 15000 },
    { id: 'full_overlay', name: 'Full Overlay Hinge', angle: 110, price: 25000 },
  ],
  slides: [
    { id: 'ball_bearing', name: 'Ball Bearing Full Extension', lengths: [30, 35, 40, 45, 50], price: 45000 },
    { id: 'soft_close_slide', name: 'Soft-Close Full Extension', lengths: [30, 35, 40, 45, 50], price: 90000 },
    { id: 'undermount', name: 'Undermount Slide', lengths: [30, 35, 40, 45, 50], price: 150000 },
  ],
  handles: {
    types: [
      { id: 'bar', name: 'Bar Handle', lengths: [12, 16, 20, 25, 32], price: 25000 },
      { id: 'cup', name: 'Cup Handle', price: 20000 },
      { id: 'knob', name: 'Round Knob', price: 15000 },
      { id: 'recessed', name: 'Recessed Handle', price: 35000 },
      { id: 'profile', name: 'Profile Handle (Gola)', price: 80000 },
      { id: 'none', name: 'Push-to-Open', price: 30000 },
    ],
    finishes: ['chrome', 'stainless', 'black', 'brass', 'white'],
  },
  per_door_hinge_rule: { under_100cm: 2, over_100cm: 3 },
};

export const HANDLE_FINISH_HEX: Record<string, string> = {
  chrome: '#d8dde2',
  stainless: '#b9bcc0',
  black: '#1c1c1c',
  brass: '#c9a24b',
  white: '#f2f2f2',
};

export const ACCESSORY_OPTIONS = [
  { id: 'pullout_basket', name: 'Pull-out Basket', price: 350000 },
  { id: 'dish_rack', name: 'Dish Rack', price: 450000 },
  { id: 'cutlery_tray', name: 'Cutlery Tray', price: 150000 },
  { id: 'lazy_susan', name: 'Lazy Susan', price: 900000 },
  { id: 'led_strip', name: 'LED Strip Light', price: 120000 },
  { id: 'bin_system', name: 'Waste Bin System', price: 650000 },
  { id: 'hanging_rod', name: 'Hanging Rod', price: 80000 },
  { id: 'wine_rack', name: 'Wine Rack Insert', price: 250000 },
];

export function getBoard(id: string): BoardMaterial {
  return MATERIALS.boards.find((b) => b.id === id) ?? MATERIALS.boards[0];
}
/* ---------- custom colours: any '#rrggbb' is a valid colour id; an imported palette gives them names ---------- */
const PALETTE_KEY = 'instant3d_palette_v1';
export interface PaletteColor { hex: string; name: string }
let paletteCache: PaletteColor[] | null = null;

export function normalizeHex(v: string): string | null {
  let s = v.trim().replace(/^0x/i, '#');
  if (!s.startsWith('#')) s = '#' + s;
  if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + s.slice(1).split('').map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null;
}

export function loadPalette(): PaletteColor[] {
  if (paletteCache) return paletteCache;
  try { paletteCache = JSON.parse(localStorage.getItem(PALETTE_KEY) || '[]'); } catch { paletteCache = []; }
  return paletteCache!;
}

export function savePalette(list: PaletteColor[]) {
  paletteCache = list;
  try { localStorage.setItem(PALETTE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/**
 * Parse a pasted / uploaded palette. Accepts one colour per line in any of:
 *   #1B9D6B           Graphite #4A4F55        #4A4F55, Graphite
 *   74 79 85 Graphite (GIMP .gpl: "R G B name")   rgb(74,79,85)
 * and JSON: ["#aabbcc", ...] or [{ "hex": "#aabbcc", "name": "..." }, ...]
 */
export function parsePalette(text: string): PaletteColor[] {
  const out: PaletteColor[] = [];
  const t = text.trim();
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const data = JSON.parse(t);
      const arr = Array.isArray(data) ? data : data.colors ?? [];
      for (const c of arr) {
        const hex = normalizeHex(typeof c === 'string' ? c : c.hex ?? c.color ?? '');
        if (hex) out.push({ hex, name: (typeof c === 'string' ? '' : c.name) || hex.toUpperCase() });
      }
      return out;
    } catch { /* fall through to line parsing */ }
  }
  for (const raw of t.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('GIMP') || line.startsWith('Name:') || line.startsWith('Columns') || line.startsWith('#') && line.length === 1) continue;
    const hexM = line.match(/#?\b([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    const rgbM = line.match(/^(?:rgb\()?\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\)?\s*(.*)$/i);
    let hex: string | null = null;
    let name = '';
    if (rgbM && !line.includes('#')) {
      const [r, g, b] = [rgbM[1], rgbM[2], rgbM[3]].map((n) => Math.min(255, parseInt(n, 10)));
      hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
      name = rgbM[4].trim();
    } else if (hexM) {
      hex = normalizeHex(hexM[1]);
      name = line.replace(hexM[0], '').replace(/[,;:\t]/g, ' ').trim();
    }
    if (hex) out.push({ hex, name: name || hex.toUpperCase() });
  }
  return out;
}

/**
 * Black & white intensity of a colour: amount -100 (toward black) .. +100 (toward white).
 * Hue and saturation are preserved, so "graphite" stays graphite but can read lighter in real rooms.
 */
export function adjustHex(hex: string, amount = 0): string {
  const valid = normalizeHex(hex) ?? hex;
  if (!amount || !valid.startsWith('#') || valid.length < 7) return valid;
  const r = parseInt(valid.slice(1, 3), 16) / 255;
  const g = parseInt(valid.slice(3, 5), 16) / 255;
  const b = parseInt(valid.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let sat = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = ((hue * 60) % 360 + 360) % 360;
  }
  const next = Math.max(0, Math.min(1, light + amount / 100));
  const chroma = (1 - Math.abs(2 * next - 1)) * sat;
  const mid = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const base = next - chroma / 2;
  const sector = Math.floor(hue / 60) % 6;
  const rgb = sector === 0 ? [chroma, mid, 0] : sector === 1 ? [mid, chroma, 0] : sector === 2 ? [0, chroma, mid] : sector === 3 ? [0, mid, chroma] : sector === 4 ? [mid, 0, chroma] : [chroma, 0, mid];
  const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, (v + base) * 255))).toString(16).padStart(2, '0');
  return `#${hex2(rgb[0])}${hex2(rgb[1])}${hex2(rgb[2])}`;
}

/** Colour of a material id after its black & white adjustment. */
export function tintedHex(id: string, amount = 0): string {
  return adjustHex(getColor(id).hex, amount);
}

export function getColor(id: string): ColorSwatch {
  const known = MATERIALS.colors.find((c) => c.id === id);
  if (known) return known;
  const hex = normalizeHex(id || '');
  if (hex) {
    const named = loadPalette().find((p) => p.hex === hex);
    return { id: hex, name: named?.name ?? hex.toUpperCase(), hex, category: 'solid' };
  }
  return MATERIALS.colors[0];
}
export function getCountertop(id: string) {
  return MATERIALS.countertops.find((c) => c.id === id) ?? MATERIALS.countertops[0];
}
export function getFinishing(id: string) {
  return MATERIALS.finishings.find((c) => c.id === id) ?? MATERIALS.finishings[0];
}
