import type { Item } from '../models/types';
import { getBoard } from '../config/materials';

export function fridgeSize(item: Item) {
  const sbs = item.config.fridgeType === 'side_by_side';
  return item.config.fridge ?? {
    width: Math.max(20, Math.min(item.width - 4, sbs ? 86 : 60)),
    height: sbs ? 178 : item.config.fridgeType === 'one_door' ? 150 : 170,
    depth: sbs ? 68 : 60,
    clearanceTop: 5,
  };
}

export function dispenserSize(item: Item) {
  return item.config.dispenser ?? { width: 31, height: 104, depth: 35, clearanceTop: 8 };
}

/** Shared by the cutting-list generator and the 3D renderer. */
export function housingLayout(item: Item, board = 'ply18') {
  const thickness = getBoard(item.config.materials.useDefault ? board : item.config.materials.board ?? board).thickness / 10;
  const fridge = item.subtype.startsWith('tall_fridge');
  const device = fridge ? fridgeSize(item) : dispenserSize(item);
  const bottom = fridge ? 0 : (item.config.hasToeKick ? 10 : 0) + thickness;
  const shelfY = bottom + device.height + device.clearanceTop;
  return { device, bottom, shelfY, storageHeight: Math.max(0, item.height - shelfY - thickness), thickness };
}

export function freezeApplianceSize(item: Item): Item {
  if (item.subtype.startsWith('tall_fridge') && !item.config.fridge) {
    return { ...item, config: { ...item.config, fridge: fridgeSize(item) } };
  }
  if (item.subtype === 'tall_dispenser' && !item.config.dispenser) {
    return { ...item, config: { ...item.config, dispenser: dispenserSize(item) } };
  }
  return item;
}