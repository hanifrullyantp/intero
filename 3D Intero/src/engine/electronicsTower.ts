import type { Item } from '../models/types';
import { r1 } from '../utils/geometry';

/** Real appliance dimensions (cm). The oven matches the specified 44 × 29 × 32 unit. */
export type ElectroKey = 'magiccom' | 'dispenser' | 'oven' | 'microwave';

export const ELECTRO_DEFS: Record<ElectroKey, { w: number; h: number; d: number; pull: boolean; label: string }> = {
  magiccom: { w: 32, h: 30, d: 34, pull: true, label: 'Magiccom' },
  dispenser: { w: 32, h: 40, d: 35, pull: true, label: 'Dispenser' },
  oven: { w: 44, h: 29, d: 32, pull: false, label: 'Oven' },
  microwave: { w: 44, h: 30, d: 32, pull: false, label: 'Microwave' },
};

export const ELECTRO_ORDER: ElectroKey[] = ['magiccom', 'dispenser', 'oven', 'microwave'];

export const DEFAULT_MAGICCOM = { width: 32, height: 30, depth: 34, extension: 42, shelfHeight: 87 };
export const OVEN_HEIGHT = ELECTRO_DEFS.oven.h; // 29 cm

const WORKTOP_GAP = 12; // air gap above a pull-out appliance at counter height
const STACK_GAP = 8;   // gap between stacked static appliances

export interface ElectroSlot { key: ElectroKey; y: number; h: number; atWorktop: boolean; pull: boolean }

export function appliancesOf(item: Item): ElectroKey[] {
  const cfg = item.config.appliances;
  if (Array.isArray(cfg) && cfg.length) return cfg.filter((k): k is ElectroKey => k in ELECTRO_DEFS);
  if (item.config.magiccom) return ['magiccom', 'oven'];
  return ['magiccom', 'oven'];
}

/**
 * Stacks the selected appliances inside a tall electronics column.
 * The first appliance sits on the worktop shelf (magiccom/dispenser pull out);
 * the rest stack above it with a small gap, each on its own support shelf.
 */
export function electronicsLayout(item: Item) {
  const legacy = { ...DEFAULT_MAGICCOM, ...item.config.magiccom };
  const keys = appliancesOf(item);
  const shelfY = r1(legacy.shelfHeight);
  const slots: ElectroSlot[] = [];
  let cursor = shelfY;
  keys.forEach((key, i) => {
    const def = ELECTRO_DEFS[key];
    const atWorktop = i === 0;
    slots.push({ key, y: r1(cursor), h: def.h, atWorktop, pull: def.pull });
    cursor = r1(cursor + def.h + (def.pull ? WORKTOP_GAP : STACK_GAP));
  });
  const ovenSlot = slots.find((s) => s.key === 'oven');
  const topSlot = slots[slots.length - 1];
  const top = topSlot ? r1(topSlot.y + topSlot.h) : shelfY;
  const ovenY = ovenSlot?.y ?? top;
  return {
    magiccom: legacy,
    shelfY,
    slots,
    ovenY,
    ovenH: OVEN_HEIGHT,
    ovenTop: r1(ovenY + OVEN_HEIGHT),
    top,
    storageHeight: r1(Math.max(0, item.height - top)),
  };
}
