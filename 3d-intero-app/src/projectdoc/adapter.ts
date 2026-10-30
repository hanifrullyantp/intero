import type {
  CustomShape,
  Item,
  ItemConfig,
  ItemType,
  Materials,
  ProjectData,
  ProjectSettings,
  Wall,
} from '../types';
import { offsetLeftCm, wallLengthCm } from './geometry';
import {
  SCHEMA_VERSION,
  parseProjectDoc,
  type ItemKind,
  type ProjectDoc,
  type ProjectItem,
  type ProjectMaterial,
} from './schema';
import { cmToMm, mmToCm } from './units';

const LIVE_TYPES = new Set<ItemType>([
  'base', 'sink_base', 'cooktop_base', 'drawer_base', 'dishwasher',
  'wall', 'tall', 'corner_base', 'corner_wall',
  'fridge', 'electronic', 'hood', 'island', 'bar', 'custom',
]);

function docKind(type: ItemType): ItemKind {
  switch (type) {
    case 'base':
    case 'sink_base':
    case 'cooktop_base':
    case 'drawer_base':
      return 'base_cabinet';
    case 'wall':
      return 'wall_cabinet';
    case 'corner_base':
      return 'corner_base';
    case 'corner_wall':
      return 'corner_wall';
    case 'island':
    case 'bar':
      return 'island';
    case 'custom':
      return 'panel';
    default:
      return 'appliance';
  }
}

function liveType(item: ProjectItem): ItemType {
  if (LIVE_TYPES.has(item.subtype as ItemType)) return item.subtype as ItemType;
  switch (item.type) {
    case 'base_cabinet': return 'base';
    case 'wall_cabinet': return 'wall';
    case 'corner_base': return 'corner_base';
    case 'corner_wall': return 'corner_wall';
    case 'island': return 'island';
    case 'panel': return 'custom';
    default: return 'fridge';
  }
}

function shapeOf(walls: Wall[], items: Item[]): ProjectDoc['room']['bentuk'] {
  const ids = new Set(walls.map((wall) => wall.id));
  if (!walls.length) return items.some((item) => item.type === 'island' || item.type === 'bar') ? 'island' : 'custom';
  if (walls.length === 1) return 'I';
  if (ids.has('left') && ids.has('back') && ids.has('right')) return 'U';
  if (ids.has('left') && ids.has('back')) return 'L';
  return 'custom';
}

function materialId(tipe: string, warna: string): string {
  return `mat_${tipe}_${warna.replace(/[^a-zA-Z0-9]/g, '')}`.toLowerCase();
}

function upsertMaterial(list: ProjectMaterial[], material: ProjectMaterial) {
  if (!list.some((entry) => entry.id === material.id)) list.push(material);
}

function shapeToDoc(shape: CustomShape): NonNullable<ProjectItem['config']['customShapes']>[number] {
  return {
    ...shape,
    w: mmToCm(shape.w),
    h: mmToCm(shape.h),
    d: mmToCm(shape.d),
    x: mmToCm(shape.x),
    y: mmToCm(shape.y),
    z: mmToCm(shape.z),
  };
}

function shapeToLive(shape: NonNullable<ProjectItem['config']['customShapes']>[number]): CustomShape {
  return {
    ...shape,
    w: cmToMm(shape.w),
    h: cmToMm(shape.h),
    d: cmToMm(shape.d),
    x: cmToMm(shape.x),
    y: cmToMm(shape.y),
    z: cmToMm(shape.z),
  };
}

function configToDoc(config: ItemConfig): ProjectItem['config'] {
  return {
    doorCount: config.doorCount,
    hingeSide: config.hingeSide,
    drawerCount: config.drawerCount,
    openShelf: config.openShelf,
    toeKickHeightCm: config.toeKickHeight === undefined ? undefined : mmToCm(config.toeKickHeight),
    leftAccessory: config.leftAccessory,
    rightAccessory: config.rightAccessory,
    gasType: config.gasType,
    spiceWidthCm: config.spiceWidth === undefined ? undefined : mmToCm(config.spiceWidth),
    glassDoor: config.glassDoor,
    liftUp: config.liftUp,
    note: config.note,
    doorNote: config.doorNote,
    prodStatus: config.prodStatus,
    method: config.method,
    cornice: config.cornice,
    corniceHeightCm: config.corniceHeight === undefined ? undefined : mmToCm(config.corniceHeight),
    corniceWidthCm: config.corniceWidth === undefined ? undefined : mmToCm(config.corniceWidth),
    corniceLight: config.corniceLight,
    doorType: config.doorType,
    doubleStack: config.doubleStack,
    upperTierHeightCm: config.upperTierHeight === undefined ? undefined : mmToCm(config.upperTierHeight),
    cornerDoorStyle: config.cornerDoorStyle,
    lazySusan: config.lazySusan,
    cornerOrientation: config.cornerOrientation,
    fridgeType: config.fridgeType,
    fridgeWCm: config.fridgeW === undefined ? undefined : mmToCm(config.fridgeW),
    fridgeHCm: config.fridgeH === undefined ? undefined : mmToCm(config.fridgeH),
    fridgeDCm: config.fridgeD === undefined ? undefined : mmToCm(config.fridgeD),
    slot1: config.slot1,
    slot2: config.slot2,
    electronicPreset: config.electronicPreset,
    hoodHeightCm: config.hoodHeight === undefined ? undefined : mmToCm(config.hoodHeight),
    islandDoorsPerSide: config.islandDoorsPerSide,
    stools: config.stools,
    barOverhangCm: config.barOverhang === undefined ? undefined : mmToCm(config.barOverhang),
    footRest: config.footRest,
    customShapes: config.customShapes?.map(shapeToDoc),
    customName: config.customName,
  };
}

function configToLive(config: ProjectItem['config']): ItemConfig {
  return {
    doorCount: config.doorCount,
    hingeSide: config.hingeSide,
    drawerCount: config.drawerCount,
    openShelf: config.openShelf,
    toeKickHeight: config.toeKickHeightCm === undefined ? undefined : cmToMm(config.toeKickHeightCm),
    leftAccessory: config.leftAccessory as ItemConfig['leftAccessory'],
    rightAccessory: config.rightAccessory as ItemConfig['rightAccessory'],
    gasType: config.gasType as ItemConfig['gasType'],
    spiceWidth: config.spiceWidthCm === undefined ? undefined : cmToMm(config.spiceWidthCm) as ItemConfig['spiceWidth'],
    glassDoor: config.glassDoor,
    liftUp: config.liftUp,
    note: config.note,
    doorNote: config.doorNote,
    prodStatus: config.prodStatus as ItemConfig['prodStatus'],
    method: config.method as ItemConfig['method'],
    cornice: config.cornice,
    corniceHeight: config.corniceHeightCm === undefined ? undefined : cmToMm(config.corniceHeightCm),
    corniceWidth: config.corniceWidthCm === undefined ? undefined : cmToMm(config.corniceWidthCm),
    corniceLight: config.corniceLight,
    doorType: config.doorType,
    doubleStack: config.doubleStack,
    upperTierHeight: config.upperTierHeightCm === undefined ? undefined : cmToMm(config.upperTierHeightCm),
    cornerDoorStyle: config.cornerDoorStyle,
    lazySusan: config.lazySusan,
    cornerOrientation: config.cornerOrientation,
    fridgeType: config.fridgeType as ItemConfig['fridgeType'],
    fridgeW: config.fridgeWCm === undefined ? undefined : cmToMm(config.fridgeWCm),
    fridgeH: config.fridgeHCm === undefined ? undefined : cmToMm(config.fridgeHCm),
    fridgeD: config.fridgeDCm === undefined ? undefined : cmToMm(config.fridgeDCm),
    slot1: config.slot1 as ItemConfig['slot1'],
    slot2: config.slot2 as ItemConfig['slot2'],
    electronicPreset: config.electronicPreset,
    hoodHeight: config.hoodHeightCm === undefined ? undefined : cmToMm(config.hoodHeightCm),
    islandDoorsPerSide: config.islandDoorsPerSide,
    stools: config.stools,
    barOverhang: config.barOverhangCm === undefined ? undefined : cmToMm(config.barOverhangCm),
    footRest: config.footRest,
    customShapes: config.customShapes?.map(shapeToLive),
    customName: config.customName,
    parentId: undefined,
  };
}

function partsFrom(materials: Materials, catalog: ProjectMaterial[]): ProjectItem['parts'] {
  const doorId = materialId(materials.doorMaterial, materials.doorColor);
  upsertMaterial(catalog, { id: doorId, nama: `${materials.doorMaterial} ${materials.doorColor}`, tipe: materials.doorMaterial, warna: materials.doorColor, tekstur: null });
  return {
    door: { materialId: doorId, tipe: materials.doorMaterial, warna: materials.doorColor },
    body: { warna: materials.bodyColor, ikutPintu: materials.bodyFollowsDoor },
    side: { ikutPintu: materials.sidesFollowDoor },
    toe: { ikutPintu: materials.toeKickFollowsDoor },
    handle: {
      warna: materials.handleColor,
      jenis: materials.handleType,
      panjangCm: mmToCm(materials.handleLength),
      posisi: materials.handlePosition,
      softClose: materials.softClose,
    },
  };
}

function materialsFrom(item: ProjectItem): Materials {
  return {
    doorMaterial: (item.parts.door.tipe ?? 'HPL') as Materials['doorMaterial'],
    doorColor: item.parts.door.warna ?? '#C9A97A',
    bodyFollowsDoor: item.parts.body.ikutPintu ?? false,
    bodyColor: item.parts.body.warna ?? '#F2F2F0',
    sidesFollowDoor: item.parts.side.ikutPintu ?? true,
    toeKickFollowsDoor: item.parts.toe.ikutPintu ?? true,
    handleColor: item.parts.handle.warna ?? '#1A1A1A',
    handleType: (item.parts.handle.jenis ?? 'bar') as Materials['handleType'],
    handleLength: cmToMm(item.parts.handle.panjangCm ?? 12.8),
    handlePosition: (item.parts.handle.posisi ?? 'top') as Materials['handlePosition'],
    softClose: item.parts.handle.softClose ?? true,
  };
}

export function fromProjectData(data: ProjectData, opts?: { id?: string; snapGizmoCm?: number }): ProjectDoc {
  const materials: ProjectMaterial[] = [];
  const countertopId = materialId('countertop', data.settings.countertop.type);
  upsertMaterial(materials, {
    id: countertopId,
    nama: data.settings.countertop.type,
    tipe: 'countertop',
    warna: data.settings.countertop.backsplashColor,
    tekstur: data.settings.countertop.type,
  });

  const walls = data.walls.map((wall) => {
    const start = { x: mmToCm(wall.start.x), z: mmToCm(wall.start.z) };
    const end = { x: mmToCm(wall.end.x), z: mmToCm(wall.end.z) };
    return { id: wall.id, nama: wall.name, panjangCm: wallLengthCm({ start, end }), start, end };
  });

  const items: ProjectItem[] = data.cabinets.map((cabinet) => {
    const dims = { w: mmToCm(cabinet.dims.w), h: mmToCm(cabinet.dims.h), d: mmToCm(cabinet.dims.d) };
    const positionCm = { x: mmToCm(cabinet.position.x), y: mmToCm(cabinet.position.y), z: mmToCm(cabinet.position.z) };
    const wall = walls.find((entry) => entry.id === cabinet.wallId);
    return {
      id: cabinet.id,
      type: docKind(cabinet.type),
      subtype: cabinet.type,
      wallId: cabinet.wallId,
      parentId: cabinet.config.parentId ?? null,
      offsetCm: wall ? offsetLeftCm(wall, positionCm, dims.w) : 0,
      elevationCm: positionCm.y,
      positionCm,
      rotationY: cabinet.rotationY,
      dims,
      parts: partsFrom(cabinet.materials, materials),
      label: cabinet.name,
      tags: [],
      locked: cabinet.locked,
      visible: cabinet.visible,
      orderIndex: cabinet.orderIndex,
      config: configToDoc(cabinet.config),
      led: cabinet.led,
      colorLabel: cabinet.colorLabel,
      createdAt: cabinet.createdAt,
    };
  });

  const xs = walls.flatMap((wall) => [wall.start.x, wall.end.x]);
  const zs = walls.flatMap((wall) => [wall.start.z, wall.end.z]);
  const tinggiTotalCm = mmToCm(data.settings.globalCabinetHeight);

  return parseProjectDoc({
    schemaVersion: SCHEMA_VERSION,
    satuan: 'cm',
    meta: {
      id: opts?.id ?? `prj_${data.createdAt.replace(/\D/g, '').slice(0, 14) || 'lokal'}`,
      nama: data.projectName,
      createdAt: data.createdAt,
      updatedAt: data.modifiedAt,
    },
    room: {
      bentuk: shapeOf(data.walls, data.cabinets),
      lebarCm: xs.length ? Math.max(...xs) - Math.min(...xs) : 0,
      dalamCm: zs.length ? Math.max(...zs) - Math.min(...zs) : 0,
      tinggiPlafonCm: tinggiTotalCm,
      walls,
      bukaan: [],
    },
    globals: {
      tinggiTotalCm,
      tinggiBaseCm: mmToCm(data.settings.baseHeight),
      gapBaseWallCm: mmToCm(data.settings.wallGap),
      kedalamanWallCm: mmToCm(data.settings.wallDepth),
      toeKickCm: mmToCm(data.settings.toeKick),
      snapGizmoCm: opts?.snapGizmoCm ?? 1,
    },
    countertop: {
      tipe: data.settings.countertop.type,
      tebalCm: mmToCm(data.settings.countertop.thickness),
      overhangCm: mmToCm(data.settings.countertop.overhang),
      backsplash: data.settings.countertop.backsplash,
      backsplashOtomatis: data.settings.countertop.backsplashAuto,
      tinggiBacksplashCm: mmToCm(data.settings.countertop.backsplashHeight),
      warnaBacksplash: data.settings.countertop.backsplashColor,
    },
    items,
    materials,
    preserved: {
      formatVersion: data.formatVersion,
      appVersion: data.appVersion,
      appearance: data.settings.appearance,
      production: data.settings.production,
      scopeDefaults: data.settings.scopeDefaults,
      dimensions: data.dimensions,
      customComponents: data.customComponents,
    },
  });
}

export function toProjectData(doc: ProjectDoc): ProjectData {
  const settings: ProjectSettings = {
    globalCabinetHeight: cmToMm(doc.globals.tinggiTotalCm),
    baseHeight: cmToMm(doc.globals.tinggiBaseCm),
    wallGap: cmToMm(doc.globals.gapBaseWallCm),
    wallDepth: cmToMm(doc.globals.kedalamanWallCm),
    toeKick: cmToMm(doc.globals.toeKickCm),
    unit: 'mm',
    countertop: {
      type: doc.countertop.tipe as ProjectSettings['countertop']['type'],
      thickness: cmToMm(doc.countertop.tebalCm),
      overhang: cmToMm(doc.countertop.overhangCm),
      backsplash: doc.countertop.backsplash,
      backsplashAuto: doc.countertop.backsplashOtomatis,
      backsplashHeight: cmToMm(doc.countertop.tinggiBacksplashCm),
      backsplashColor: doc.countertop.warnaBacksplash,
    },
    appearance: doc.preserved.appearance,
    production: doc.preserved.production as ProjectSettings['production'],
    scopeDefaults: doc.preserved.scopeDefaults as ProjectSettings['scopeDefaults'],
  };

  const walls: Wall[] = doc.room.walls.map((wall) => ({
    id: wall.id,
    name: wall.nama,
    start: { x: cmToMm(wall.start.x), z: cmToMm(wall.start.z) },
    end: { x: cmToMm(wall.end.x), z: cmToMm(wall.end.z) },
  }));

  const cabinets: Item[] = doc.items.map((item) => {
    const config = configToLive(item.config);
    if (item.parentId) config.parentId = item.parentId;
    return {
      id: item.id,
      name: item.label,
      type: liveType(item),
      wallId: item.wallId,
      orderIndex: item.orderIndex,
      position: {
        x: cmToMm(item.positionCm.x),
        y: cmToMm(item.positionCm.y),
        z: cmToMm(item.positionCm.z),
      },
      rotationY: item.rotationY,
      dims: { w: cmToMm(item.dims.w), h: cmToMm(item.dims.h), d: cmToMm(item.dims.d) },
      materials: materialsFrom(item),
      config,
      led: item.led,
      visible: item.visible,
      locked: item.locked,
      colorLabel: item.colorLabel,
      createdAt: item.createdAt,
    };
  });

  return {
    formatVersion: doc.preserved.formatVersion,
    appVersion: doc.preserved.appVersion,
    projectName: doc.meta.nama,
    createdAt: doc.meta.createdAt,
    modifiedAt: doc.meta.updatedAt,
    settings,
    walls,
    cabinets,
    dimensions: doc.preserved.dimensions as ProjectData['dimensions'],
    customComponents: doc.preserved.customComponents as ProjectData['customComponents'],
  };
}
