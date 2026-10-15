import type { Project } from '../models/types';
import { DEFAULT_MATERIALS } from '../engine/layoutEngine';
import { AUTO, generateMagic } from '../engine/magicGenerator';

/** Default project for new cloud/local projects */
export function createStarterProject(name = 'Untitled project'): Project {
  const p = generateMagic({
    name,
    shape: 'L',
    totalH: 220,
    ceilingHeight: 280,
    baseH: 85,
    baseDepth: 58,
    ctDepth: 60,
    wallDepth: 33,
    cornerDepth: 90,
    backsplashHeight: 60,
    sides: {
      A: { length: 420, items: [{ uid: 'starter-fridge', key: 'fridge_sbs', width: 90 }, { uid: 'starter-auto-a', key: AUTO, width: 0 }] },
      B: { length: 240, items: [{ uid: 'starter-auto-b', key: AUTO, width: 0 }, { uid: 'starter-dispenser', key: 'dispenser', width: 60 }] },
      C: { length: 240, items: [] },
    },
    lighting: { under: true, inWall: true, inBase: false, tone: 'warm', brightness: 1, glow: true },
  }, { ...DEFAULT_MATERIALS });
  return p;
}
