import type { Project } from '../models/types';
import { generateProject, DEFAULT_MATERIALS, type WizardOptions } from '../engine/layoutEngine';

export interface Template {
  id: string;
  name: string;
  category: 'kitchen' | 'tv' | 'wardrobe';
  description: string;
  info: string;
  accent: string;
  build: () => Project;
}

const base: WizardOptions = {
  name: '',
  type: 'kitchen',
  layout: 'L',
  sides: [300, 240],
  ceilingHeight: 280,
  includeBase: true,
  includeWall: true,
  includeTall: true,
  includeFridge: true,
  hoodType: 'slim',
  materials: { ...DEFAULT_MATERIALS },
};

export const TEMPLATES: Template[] = [
  {
    id: 'kitchen_modern_l',
    name: 'Modern L-Shape',
    category: 'kitchen',
    description: 'Matte white doors, walnut accents, black galaxy granite.',
    info: '300 × 240 cm · 2 walls · fridge tower',
    accent: '#5C4033',
    build: () =>
      generateProject({ ...base, name: 'Modern L-Shape Kitchen', layout: 'L', sides: [300, 240], hoodType: 'slim', materials: { ...DEFAULT_MATERIALS, doorColor: 'white', carcassColor: 'walnut', countertop: 'granite', countertopColor: 'black_galaxy', finish: 'matte', handleType: 'profile' } }),
  },
  {
    id: 'kitchen_minimal_i',
    name: 'Minimalist I-Shape',
    category: 'kitchen',
    description: 'Compact single wall, sage green, white quartz top.',
    info: '360 cm · 1 wall · integrated fridge',
    accent: '#9CAF88',
    build: () =>
      generateProject({ ...base, name: 'Minimalist I-Shape Kitchen', layout: 'I', sides: [360], hoodType: 'built_in', materials: { ...DEFAULT_MATERIALS, doorColor: 'sage', carcassColor: 'white', countertop: 'quartz', countertopColor: 'calacatta', finish: 'matte', handleType: 'none' } }),
  },
  {
    id: 'kitchen_classic_u',
    name: 'Classic U-Shape',
    category: 'kitchen',
    description: 'Shaker style oak doors with pyramid hood and grey granite.',
    info: '320 × 240 × 240 cm · 3 walls',
    accent: '#C8A876',
    build: () => {
      const p = generateProject({ ...base, name: 'Classic U-Shape Kitchen', layout: 'U', sides: [320, 240, 240], hoodType: 'pyramid', materials: { ...DEFAULT_MATERIALS, doorColor: 'oak', carcassColor: 'cream', countertop: 'granite', countertopColor: 'grey_granite', finish: 'semi', handleType: 'cup', handleFinish: 'brass' } });
      p.items.forEach((i) => {
        if (i.kind === 'cabinet') i.config.doorStyle = 'shaker';
      });
      return p;
    },
  },
  {
    id: 'kitchen_island',
    name: 'Island Kitchen',
    category: 'kitchen',
    description: 'Straight wall with cooking island and island hood.',
    info: '360 cm wall · 200 cm island',
    accent: '#1B2A4A',
    build: () => generateProject({ ...base, name: 'Island Kitchen', layout: 'island', sides: [360, 200, 110], hoodType: 'island', materials: { ...DEFAULT_MATERIALS, doorColor: 'navy', carcassColor: 'white', countertop: 'marble', countertopColor: 'white_marble', finish: 'gloss', handleType: 'bar', handleFinish: 'brass' } }),
  },
  {
    id: 'tv_floating',
    name: 'Floating Media Wall',
    category: 'tv',
    description: 'Low console with flanking storage and lift-up top unit.',
    info: '300 cm wall · 55" TV',
    accent: '#404040',
    build: () => generateProject({ ...base, name: 'Floating Media Wall', type: 'tv', layout: 'I', sides: [300], materials: { ...DEFAULT_MATERIALS, doorColor: 'grey_dark', carcassColor: 'oak', finish: 'matte', handleType: 'none' } }),
  },
  {
    id: 'tv_wood',
    name: 'Warm Teak Console',
    category: 'tv',
    description: 'Teak drawers console, open shelving above.',
    info: '240 cm wall · 50" TV',
    accent: '#B8860B',
    build: () => {
      const p = generateProject({ ...base, name: 'Warm Teak Console', type: 'tv', layout: 'I', sides: [240], includeWall: false, materials: { ...DEFAULT_MATERIALS, doorColor: 'teak', carcassColor: 'teak', finish: 'semi', handleType: 'recessed' } });
      return p;
    },
  },
  {
    id: 'wardrobe_3door',
    name: 'Wardrobe 3-Module',
    category: 'wardrobe',
    description: 'Three 2-door modules, hanging + drawers, full height.',
    info: '300 cm · 240 cm high',
    accent: '#E8D4A2',
    build: () => generateProject({ ...base, name: 'Wardrobe 3-Module', type: 'wardrobe', layout: 'I', sides: [300], ceilingHeight: 280, materials: { ...DEFAULT_MATERIALS, doorColor: 'maple', carcassColor: 'white', finish: 'matte', handleType: 'bar', handleFinish: 'black' } }),
  },
  {
    id: 'wardrobe_dark',
    name: 'Wardrobe Wenge Gloss',
    category: 'wardrobe',
    description: 'Two wide modules in high-gloss wenge.',
    info: '220 cm · 240 cm high',
    accent: '#3B2A20',
    build: () => generateProject({ ...base, name: 'Wardrobe Wenge Gloss', type: 'wardrobe', layout: 'I', sides: [220], ceilingHeight: 270, materials: { ...DEFAULT_MATERIALS, doorColor: 'wenge', carcassColor: 'grey_light', finish: 'gloss', handleType: 'profile' } }),
  },
];
