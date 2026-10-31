import type { KitchenShape, WizardInput } from '../types';

export interface RoomBrief {
  shape: KitchenShape;
  lengthsCm: { left: number; back: number; right: number; front: number };
  island: boolean;
  sink: boolean;
  cooktop: boolean;
  fridge: boolean;
  ceilingCm: number | null;
  note: string;
}

export const DEFAULT_ROOM_BRIEF: RoomBrief = {
  shape: 'L',
  lengthsCm: { left: 240, back: 360, right: 240, front: 360 },
  island: false,
  sink: true,
  cooktop: true,
  fridge: true,
  ceilingCm: null,
  note: '',
};

function toCm(raw: string, unit: string | undefined): number {
  const value = parseFloat(raw.replace(',', '.'));
  if (unit === 'm' || unit === 'meter') return Math.round(value * 100);
  if (unit === 'cm') return Math.round(value);
  return value <= 15 ? Math.round(value * 100) : Math.round(value);
}

function lengthsOf(text: string): number[] {
  return [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(m|meter|cm)?\b/gi)]
    .filter((match) => !/kg|mm/i.test(match[0]))
    .map((match) => toCm(match[1], match[2]?.toLowerCase()))
    .filter((cm) => cm >= 80 && cm <= 1200);
}

function mentions(text: string, words: string[]): boolean | null {
  if (words.some((word) => new RegExp(`tanpa\\s+${word}\\b`).test(text))) return false;
  if (words.some((word) => new RegExp(`\\b${word}\\b`).test(text))) return true;
  return null;
}

export function parseRoomBrief(utterance: string, base: RoomBrief = DEFAULT_ROOM_BRIEF): RoomBrief {
  const text = utterance.toLowerCase();
  const next: RoomBrief = { ...base, lengthsCm: { ...base.lengthsCm }, note: utterance.trim() };
  if (/\blurus\b|\bbentuk\s+i\b|\bdapur\s+i\b/.test(text)) next.shape = 'I';
  if (/\bbentuk\s+l\b|\bdapur\s+l\b|\bl-shape\b|\bl\s+shape\b/.test(text)) next.shape = 'L';
  if (/\bbentuk\s+u\b|\bdapur\s+u\b|\bu-shape\b/.test(text)) next.shape = 'U';
  if (/\bgalley\b|\bbentuk\s+g\b|\bdapur\s+g\b/.test(text)) next.shape = 'G';
  const island = mentions(text, ['island', 'pulau']);
  const fridge = mentions(text, ['kulkas']);
  const sink = mentions(text, ['wastafel', 'sink']);
  const cooktop = mentions(text, ['kompor']);
  if (island != null) next.island = island;
  if (fridge != null) next.fridge = fridge;
  if (sink != null) next.sink = sink;
  if (cooktop != null) next.cooktop = cooktop;
  const ceiling = text.match(/(?:plafon|tinggi\s+total)\s+(\d+(?:[.,]\d+)?)\s*(m|meter|cm)?/i);
  if (ceiling) next.ceilingCm = toCm(ceiling[1], ceiling[2]?.toLowerCase());
  const lengths = lengthsOf(text.replace(/(?:plafon|tinggi\s+total)\s+\d+(?:[.,]\d+)?\s*(?:m|meter|cm)?/i, ' '));
  if (lengths.length === 1) next.lengthsCm.back = lengths[0];
  if (lengths.length >= 2) {
    next.lengthsCm.back = lengths[0];
    next.lengthsCm.left = lengths[1];
  }
  if (lengths.length >= 3) next.lengthsCm.right = lengths[2];
  if (lengths.length >= 4) next.lengthsCm.front = lengths[3];
  return next;
}

export function describeRoomBrief(brief: RoomBrief): string {
  const shape = brief.shape === 'I' ? 'lurus' : brief.shape;
  const bits = [`Bentuk ${shape}`, `dinding utama ${brief.lengthsCm.back} cm`, `samping ${brief.lengthsCm.left} cm`];
  if (brief.shape === 'U') bits.push(`sisi kanan ${brief.lengthsCm.right} cm`);
  if (brief.island) bits.push('ada island');
  if (brief.fridge) bits.push('ada kulkas');
  if (brief.sink) bits.push('ada wastafel');
  if (brief.cooktop) bits.push('ada kompor');
  if (brief.ceilingCm) bits.push(`plafon ${brief.ceilingCm} cm`);
  return bits.join(', ') + '.';
}

export function briefToWizardInput(brief: RoomBrief): WizardInput {
  const side = brief.shape === 'I' ? 'back' : 'left';
  return {
    shape: brief.shape,
    lengths: { ...brief.lengthsCm },
    island: brief.island,
    islandDims: { w: 150, d: 90 },
    islandPos: null,
    sink: { enabled: brief.sink, wallId: 'back', fromCorner: 120 },
    cooktop: { enabled: brief.cooktop, wallId: 'back', fromCorner: Math.max(180, brief.lengthsCm.back - 110) },
    fridge: { enabled: brief.fridge, wallId: side, fromCorner: 20 },
    electronic: { enabled: false, wallId: 'back', fromCorner: 300 },
    options: { magiccom: true, dispenser: false, microwave: true, bar: false, dishRack: true, spiceRack: true, gasRack: true },
    style: 'scandi',
    material: {
      doorMaterial: 'HPL', doorColor: '#C9A97A', bodyFollowsDoor: false, bodyColor: '#F5F5F3',
      countertop: 'granit_hitam', handleType: 'bar', handleColor: '#1A1A1A', led: true,
    },
  };
}
