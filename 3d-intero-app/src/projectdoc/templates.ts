import type { ProjectGlobals, ProjectItem } from './schema';
import { defaultParts, DEFAULT_LED, wallBottomCm, wallHeightCm } from './schema';

export interface TemplateSpec {
  id: string;
  type: ProjectItem['type'];
  subtype: string;
  label: string;
  dims: (globals: ProjectGlobals) => { w: number; h: number; d: number };
  elevation: (globals: ProjectGlobals) => number;
}

export const TEMPLATES: TemplateSpec[] = [
  {
    id: 'base_60',
    type: 'base_cabinet',
    subtype: 'base',
    label: 'Base Cabinet 60cm',
    dims: (globals) => ({ w: 60, h: globals.tinggiBaseCm, d: 60 }),
    elevation: () => 0,
  },
  {
    id: 'wall_60',
    type: 'wall_cabinet',
    subtype: 'wall',
    label: 'Wall Cabinet 60cm',
    dims: (globals) => ({ w: 60, h: wallHeightCm(globals), d: globals.kedalamanWallCm }),
    elevation: (globals) => wallBottomCm(globals),
  },
  {
    id: 'corner_base_l',
    type: 'corner_base',
    subtype: 'corner_base',
    label: 'Corner Base L',
    dims: (globals) => ({ w: 90, h: globals.tinggiBaseCm, d: 90 }),
    elevation: () => 0,
  },
];

export function findTemplate(id: string): TemplateSpec | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

export function blankItem(partial: Pick<ProjectItem, 'id' | 'type' | 'subtype' | 'label' | 'dims' | 'wallId' | 'offsetCm' | 'elevationCm'> & Partial<ProjectItem>): ProjectItem {
  return {
    parentId: null,
    positionCm: { x: 0, y: partial.elevationCm, z: 0 },
    rotationY: 0,
    parts: defaultParts(),
    tags: [],
    locked: false,
    visible: true,
    orderIndex: 0,
    config: {},
    led: { ...DEFAULT_LED },
    colorLabel: null,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}
