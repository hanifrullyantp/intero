export interface Point2 {
  x: number;
  z: number;
}

export interface WallGeom {
  start: Point2;
  end: Point2;
}

export function wallLengthCm(wall: WallGeom): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
}

/** Offset dari ujung start dinding ke sisi kiri item. `positionCm` adalah pusat footprint. */
export function offsetLeftCm(wall: WallGeom, positionCm: Point2, widthCm: number): number {
  const length = wallLengthCm(wall) || 1;
  const dirX = (wall.end.x - wall.start.x) / length;
  const dirZ = (wall.end.z - wall.start.z) / length;
  const center = (positionCm.x - wall.start.x) * dirX + (positionCm.z - wall.start.z) * dirZ;
  return center - widthCm / 2;
}

/** Sama dengan `placeOnWall` di engine/walls.ts, tetapi dalam cm. */
export function positionOnWall(wall: WallGeom, offsetCm: number, widthCm: number, depthCm: number, elevationCm: number) {
  const length = wallLengthCm(wall) || 1;
  const dirX = (wall.end.x - wall.start.x) / length;
  const dirZ = (wall.end.z - wall.start.z) / length;
  const normalX = -dirZ;
  const normalZ = dirX;
  const along = offsetCm + widthCm / 2;
  return {
    x: wall.start.x + dirX * along + normalX * (depthCm / 2),
    y: elevationCm,
    z: wall.start.z + dirZ * along + normalZ * (depthCm / 2),
    rotationY: (Math.atan2(-dirZ, dirX) * 180) / Math.PI,
  };
}
