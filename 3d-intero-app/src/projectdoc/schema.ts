import { z } from 'zod';

export const SCHEMA_VERSION = 1 as const;

export const itemKindSchema = z.enum([
  'base_cabinet',
  'wall_cabinet',
  'corner_base',
  'corner_wall',
  'appliance',
  'countertop',
  'backsplash',
  'island',
  'panel',
  'hardware',
]);
export type ItemKind = z.infer<typeof itemKindSchema>;

export const ID_PREFIX: Record<ItemKind, string> = {
  base_cabinet: 'cab_base',
  wall_cabinet: 'cab_wall',
  corner_base: 'cab_cbase',
  corner_wall: 'cab_cwall',
  appliance: 'appl',
  countertop: 'ctop',
  backsplash: 'bspl',
  island: 'island',
  panel: 'panel',
  hardware: 'hw',
};

const pointSchema = z.object({ x: z.number(), z: z.number() });
const vec3Schema = z.object({ x: z.number(), y: z.number(), z: z.number() });

export const wallSchema = z.object({
  id: z.string().min(1),
  nama: z.string().min(1),
  panjangCm: z.number().positive(),
  start: pointSchema,
  end: pointSchema,
});
export type ProjectWall = z.infer<typeof wallSchema>;

export const openingSchema = z.object({
  id: z.string().min(1),
  jenis: z.enum(['pintu', 'jendela']),
  wallId: z.string().min(1),
  offsetCm: z.number(),
  lebarCm: z.number().positive(),
  tinggiCm: z.number().positive(),
  ambangCm: z.number().nonnegative(),
});

export const globalsSchema = z.object({
  tinggiTotalCm: z.number().positive(),
  tinggiBaseCm: z.number().positive(),
  gapBaseWallCm: z.number().nonnegative(),
  kedalamanWallCm: z.number().positive(),
  toeKickCm: z.number().nonnegative(),
  snapGizmoCm: z.number().positive(),
});
export type ProjectGlobals = z.infer<typeof globalsSchema>;

export const materialSchema = z.object({
  id: z.string().min(1),
  nama: z.string().min(1),
  tipe: z.string().min(1),
  warna: z.string().min(1),
  tekstur: z.string().nullable(),
  hargaPerM2: z.number().nonnegative().optional(),
});
export type ProjectMaterial = z.infer<typeof materialSchema>;

export const partSchema = z.object({
  materialId: z.string().min(1).optional(),
  tipe: z.string().optional(),
  warna: z.string().optional(),
  ikutPintu: z.boolean().optional(),
  jenis: z.string().optional(),
  panjangCm: z.number().nonnegative().optional(),
  posisi: z.string().optional(),
  softClose: z.boolean().optional(),
});

export const customShapeSchema = z.object({
  id: z.string(),
  kind: z.enum(['box', 'cylinder', 'sphere', 'torus', 'prism']),
  w: z.number(),
  h: z.number(),
  d: z.number(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  color: z.string(),
  metalness: z.number(),
  roughness: z.number(),
  opacity: z.number(),
  animation: z.enum(['none', 'pullout', 'swing', 'liftup', 'spin']),
});

export const itemConfigSchema = z.object({
  doorCount: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  hingeSide: z.enum(['left', 'right']).optional(),
  drawerCount: z.number().optional(),
  openShelf: z.boolean().optional(),
  toeKickHeightCm: z.number().optional(),
  leftAccessory: z.string().optional(),
  rightAccessory: z.string().optional(),
  gasType: z.string().optional(),
  spiceWidthCm: z.number().optional(),
  glassDoor: z.boolean().optional(),
  liftUp: z.boolean().optional(),
  note: z.string().optional(),
  doorNote: z.string().optional(),
  prodStatus: z.string().optional(),
  method: z.string().optional(),
  cornice: z.boolean().optional(),
  corniceHeightCm: z.number().optional(),
  corniceWidthCm: z.number().optional(),
  corniceLight: z.boolean().optional(),
  doorType: z.enum(['swing', 'liftup']).optional(),
  doubleStack: z.boolean().optional(),
  upperTierHeightCm: z.number().optional(),
  cornerDoorStyle: z.enum(['bifold', 'two', 'one']).optional(),
  lazySusan: z.boolean().optional(),
  cornerOrientation: z.enum(['auto', 'left', 'right']).optional(),
  fridgeType: z.string().optional(),
  fridgeWCm: z.number().optional(),
  fridgeHCm: z.number().optional(),
  fridgeDCm: z.number().optional(),
  slot1: z.string().optional(),
  slot2: z.string().optional(),
  electronicPreset: z.string().optional(),
  hoodHeightCm: z.number().optional(),
  islandDoorsPerSide: z.number().optional(),
  stools: z.number().optional(),
  barOverhangCm: z.number().optional(),
  footRest: z.boolean().optional(),
  customShapes: z.array(customShapeSchema).optional(),
  customName: z.string().optional(),
}).passthrough();

export const ledSchema = z.object({
  underCabinet: z.boolean(),
  insideUpper: z.boolean(),
  insideBase: z.boolean(),
  plinth: z.boolean(),
  temperature: z.union([z.literal(3000), z.literal(4000), z.literal(6500)]),
  trigger: z.enum(['always', 'onOpen']),
  intensity: z.number(),
});

export const projectItemSchema = z.object({
  id: z.string().min(1),
  type: itemKindSchema,
  subtype: z.string().min(1),
  wallId: z.string().nullable(),
  parentId: z.string().nullable(),
  offsetCm: z.number(),
  elevationCm: z.number(),
  positionCm: vec3Schema,
  rotationY: z.number(),
  dims: z.object({
    w: z.number().positive(),
    h: z.number().positive(),
    d: z.number().positive(),
  }),
  parts: z.object({
    door: partSchema,
    body: partSchema,
    side: partSchema,
    toe: partSchema,
    handle: partSchema,
  }),
  label: z.string().min(1),
  tags: z.array(z.string()),
  locked: z.boolean(),
  visible: z.boolean(),
  orderIndex: z.number().int(),
  config: itemConfigSchema,
  led: ledSchema,
  colorLabel: z.string().nullable(),
  createdAt: z.string(),
});
export type ProjectItem = z.infer<typeof projectItemSchema>;

export const countertopSchema = z.object({
  tipe: z.string().min(1),
  tebalCm: z.number().positive(),
  overhangCm: z.number().nonnegative(),
  backsplash: z.boolean(),
  backsplashOtomatis: z.boolean(),
  tinggiBacksplashCm: z.number().nonnegative(),
  warnaBacksplash: z.string().min(1),
});

export const projectDocSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  satuan: z.literal('cm'),
  meta: z.object({
    id: z.string().min(1),
    nama: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  room: z.object({
    bentuk: z.enum(['I', 'L', 'U', 'island', 'custom']),
    lebarCm: z.number().nonnegative(),
    dalamCm: z.number().nonnegative(),
    tinggiPlafonCm: z.number().positive(),
    walls: z.array(wallSchema),
    bukaan: z.array(openingSchema),
  }),
  globals: globalsSchema,
  countertop: countertopSchema,
  items: z.array(projectItemSchema),
  materials: z.array(materialSchema),
  preserved: z.object({
    formatVersion: z.string(),
    appVersion: z.string(),
    appearance: z.object({
      canvasColor: z.string(),
      wallColor: z.string(),
      floorColor: z.string(),
    }),
    production: z.unknown(),
    scopeDefaults: z.unknown().optional(),
    dimensions: z.unknown(),
    customComponents: z.unknown(),
  }),
});
export type ProjectDoc = z.infer<typeof projectDocSchema>;

export function parseProjectDoc(input: unknown): ProjectDoc {
  return projectDocSchema.parse(input);
}

export function serializeProjectDoc(doc: ProjectDoc): string {
  return JSON.stringify(parseProjectDoc(doc));
}

export function deserializeProjectDoc(json: string): ProjectDoc {
  return parseProjectDoc(JSON.parse(json));
}

const DEFAULT_LED = {
  underCabinet: false,
  insideUpper: false,
  insideBase: false,
  plinth: false,
  temperature: 4000 as const,
  trigger: 'always' as const,
  intensity: 70,
};

export function defaultParts() {
  return {
    door: { tipe: 'HPL', warna: '#C9A97A' },
    body: { warna: '#F2F2F0', ikutPintu: false },
    side: { ikutPintu: true },
    toe: { ikutPintu: true },
    handle: { warna: '#1A1A1A', jenis: 'bar', panjangCm: 12.8, posisi: 'top', softClose: true },
  };
}

export function createEmptyProjectDoc(opts?: { id?: string; nama?: string; now?: string }): ProjectDoc {
  const now = opts?.now ?? new Date().toISOString();
  return parseProjectDoc({
    schemaVersion: SCHEMA_VERSION,
    satuan: 'cm',
    meta: { id: opts?.id ?? 'prj_lokal', nama: opts?.nama ?? 'Proyek Dapur Baru', createdAt: now, updatedAt: now },
    room: { bentuk: 'custom', lebarCm: 0, dalamCm: 0, tinggiPlafonCm: 240, walls: [], bukaan: [] },
    globals: {
      tinggiTotalCm: 240,
      tinggiBaseCm: 85,
      gapBaseWallCm: 50,
      kedalamanWallCm: 33,
      toeKickCm: 10,
      snapGizmoCm: 1,
    },
    countertop: {
      tipe: 'granit_hitam',
      tebalCm: 2,
      overhangCm: 2,
      backsplash: true,
      backsplashOtomatis: true,
      tinggiBacksplashCm: 60,
      warnaBacksplash: '#ECE4D8',
    },
    items: [],
    materials: [],
    preserved: {
      formatVersion: '1.0',
      appVersion: '3D Intero 1.0',
      appearance: { canvasColor: '#E4E7EB', wallColor: '#D2D3D1', floorColor: '#D9D2C7' },
      production: {},
      dimensions: [],
      customComponents: [],
    },
  });
}

export function allocateItemId(doc: ProjectDoc, type: ItemKind): string {
  const prefix = ID_PREFIX[type];
  const re = new RegExp(`^${prefix}_(\\d+)$`);
  let max = 0;
  for (const item of doc.items) {
    const match = item.id.match(re);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}_${String(max + 1).padStart(4, '0')}`;
}

export function wallHeightCm(globals: ProjectGlobals): number {
  return Math.max(30, globals.tinggiTotalCm - globals.tinggiBaseCm - globals.gapBaseWallCm);
}

export function wallBottomCm(globals: ProjectGlobals): number {
  return globals.tinggiBaseCm + globals.gapBaseWallCm;
}

export { DEFAULT_LED };
