import type { Item, Wall } from '../models/types';
import { alongDir, distanceToWall, footprint, offsetOnWall, placeOnWall, wallDir, wallLength } from '../utils/geometry';

/** The second wall's inward normal tells which arm must turn into the room. */
export function detectCornerOrientation(item: Item, walls: Wall[]): Item {
  if (!item.subtype.includes('corner') || item.subtype.includes('blind')) return item;
  const f = footprint(item);
  const primary = walls.find((w) => w.id === item.wallId && !w.virtual)
    ?? walls.find((w) => w.rotation === item.rotation && !w.virtual && Math.abs(distanceToWall(w, f)) < 2);
  if (!primary) return item;
  const adjacent = walls.find((w) => {
    if (w.id === primary.id || w.virtual || w.rotation % 180 === primary.rotation % 180) return false;
    const offset = offsetOnWall(w, f);
    const span = w.rotation % 180 === 0 ? f.w : f.h;
    return Math.abs(distanceToWall(w, f)) < 2.5 && offset + span > 0 && offset < wallLength(w);
  });
  if (!adjacent) return item;
  const along = alongDir(primary.rotation);
  const opening = adjacent.nx * along.x + adjacent.ny * along.y > 0 ? 'left' : 'right';
  if (item.config.opening === opening && item.rotation === primary.rotation) return item;
  let placement = { x: item.x, y: item.y, rotation: primary.rotation };
  if (item.rotation !== primary.rotation) {
    const direction = wallDir(primary);
    const junction = Math.abs(direction.x) > 0.5
      ? (adjacent.x1 - primary.x1) / direction.x
      : (adjacent.y1 - primary.y1) / direction.y;
    const extendsForward = adjacent.nx * direction.x + adjacent.ny * direction.y > 0;
    placement = placeOnWall(primary, extendsForward ? junction : junction - item.width, item.width, item.depth);
  }
  return { ...item, ...placement, config: { ...item.config, opening } };
}