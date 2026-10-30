import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/projectdoc/apply';
import { fromProjectData, toProjectData } from '../src/projectdoc/adapter';
import { isProjectDocV1Enabled } from '../src/projectdoc/flag';
import { createEmptyProjectDoc, deserializeProjectDoc, serializeProjectDoc, type ProjectDoc } from '../src/projectdoc/schema';
import type { Item, Materials, ProjectData, ProjectSettings } from '../src/types';

const NOW = '2026-01-01T00:00:00.000Z';

function wallDoc(): ProjectDoc {
  const empty = createEmptyProjectDoc({ id: 'prj_uji', nama: 'Uji', now: NOW });
  const added = applyCommand(empty, {
    type: 'add_wall',
    targetIds: ['dinding_kiri'],
    wall: { nama: 'Dinding Kiri', panjangCm: 300, start: { x: 0, z: 0 }, end: { x: 300, z: 0 } },
  });
  expect(added.violations).toEqual([]);
  return added.doc;
}

function addBase(doc: ProjectDoc, id: string, offsetCm: number, width = 60, extra: Record<string, unknown> = {}) {
  return applyCommand(doc, {
    type: 'add_item',
    targetIds: [id],
    item: {
      type: 'base_cabinet',
      subtype: 'base',
      wallId: 'dinding_kiri',
      offsetCm,
      dims: { w: width, h: 85, d: 60 },
      label: `Base Cabinet ${width}cm`,
      ...extra,
    },
  });
}

const materials = (): Materials => ({
  doorMaterial: 'HPL',
  doorColor: '#C9A97A',
  bodyFollowsDoor: false,
  bodyColor: '#F2F2F0',
  sidesFollowDoor: true,
  toeKickFollowsDoor: true,
  handleColor: '#1A1A1A',
  handleType: 'bar',
  handleLength: 128,
  handlePosition: 'top',
  softClose: true,
});

function liveProject(): ProjectData {
  const settings = {
    globalCabinetHeight: 2400,
    baseHeight: 850,
    wallGap: 500,
    wallDepth: 330,
    toeKick: 100,
    unit: 'mm',
    countertop: {
      type: 'marble_putih',
      thickness: 20,
      overhang: 20,
      backsplash: true,
      backsplashAuto: true,
      backsplashHeight: 600,
      backsplashColor: '#ECE4D8',
    },
    appearance: { canvasColor: '#E4E7EB', wallColor: '#D2D3D1', floorColor: '#D9D2C7' },
    production: { sheet: '1220x2440', clientName: 'Budi', notes: '', terms: 'net', timeline: '', logo: null, customItems: [], activeScenario: 'sc', scenarios: [], frameMaterial: 'galvanis_08', frameView: 'frame_acp', frameLabels: true, frameWelds: true, frameExplode: 0, hppRows: {} },
  } as ProjectSettings;
  const cabinet: Item = {
    id: 'BC-LAMA1',
    name: 'Base Cabinet 60cm',
    type: 'base',
    wallId: 'left',
    orderIndex: 0,
    position: { x: 300, y: 0, z: 300 },
    rotationY: 0,
    dims: { w: 600, h: 850, d: 600 },
    materials: materials(),
    config: { doorCount: 2, parentId: undefined, toeKickHeight: 100 },
    led: { underCabinet: false, insideUpper: false, insideBase: false, plinth: false, temperature: 4000, trigger: 'always', intensity: 70 },
    visible: true,
    locked: false,
    colorLabel: null,
    createdAt: NOW,
  };
  return {
    formatVersion: '1.0',
    appVersion: '3D Intero 1.0',
    projectName: 'Dapur L',
    createdAt: NOW,
    modifiedAt: NOW,
    settings,
    walls: [{ id: 'left', name: 'Dinding Kiri', start: { x: 0, z: 0 }, end: { x: 3000, z: 0 } }],
    cabinets: [cabinet],
    dimensions: [],
    customComponents: [],
  };
}

describe('serialisasi ProjectDoc', () => {
  it('round-trip JSON', () => {
    const doc = wallDoc();
    const again = deserializeProjectDoc(serializeProjectDoc(doc));
    expect(again).toEqual(doc);
  });

  it('flag projectdoc_v1 mati di luar browser', () => {
    expect(isProjectDocV1Enabled()).toBe(false);
  });
});

describe('adapter proyek lama', () => {
  it('mengubah mm ke cm dan kembali tanpa menggeser geometri', () => {
    const source = liveProject();
    const doc = fromProjectData(source, { snapGizmoCm: 1 });
    expect(doc.satuan).toBe('cm');
    expect(doc.schemaVersion).toBe(1);
    expect(doc.room.bentuk).toBe('I');
    expect(doc.globals).toMatchObject({ tinggiTotalCm: 240, tinggiBaseCm: 85, gapBaseWallCm: 50, kedalamanWallCm: 33, toeKickCm: 10, snapGizmoCm: 1 });
    expect(doc.countertop.tipe).toBe('marble_putih');
    expect(doc.items[0]).toMatchObject({
      id: 'BC-LAMA1',
      type: 'base_cabinet',
      subtype: 'base',
      label: 'Base Cabinet 60cm',
      dims: { w: 60, h: 85, d: 60 },
    });
    expect(doc.items[0].offsetCm).toBeCloseTo(0, 5);

    const back = toProjectData(doc);
    expect(back.settings.globalCabinetHeight).toBe(2400);
    expect(back.settings.baseHeight).toBe(850);
    expect(back.settings.countertop.type).toBe('marble_putih');
    expect(back.settings.countertop.thickness).toBe(20);
    expect(back.walls[0]).toEqual(source.walls[0]);
    expect(back.cabinets[0].dims).toEqual(source.cabinets[0].dims);
    expect(back.cabinets[0].position).toEqual(source.cabinets[0].position);
    expect(back.cabinets[0].materials.doorColor).toBe('#C9A97A');
    expect(back.cabinets[0].config.doorCount).toBe(2);
    expect(back.cabinets[0].config.toeKickHeight).toBe(100);
    expect(back.settings.production).toEqual(source.settings.production);
  });
});

describe('applyCommand', () => {
  it('add_item berhasil dan menolak id ganda, tabrakan, serta lewat dinding', () => {
    const doc = wallDoc();
    const ok = addBase(doc, 'cab_base_0001', 0);
    expect(ok.violations).toEqual([]);
    expect(ok.doc.items).toHaveLength(1);
    expect(ok.doc.items[0].positionCm.x).toBeCloseTo(30, 5);

    const duplicate = addBase(ok.doc, 'cab_base_0001', 80);
    expect(duplicate.violations.some((line) => line.includes('terpakai lebih dari sekali'))).toBe(true);
    expect(duplicate.doc).toBe(ok.doc);

    const crash = addBase(ok.doc, 'cab_base_0002', 50);
    expect(crash.violations.some((line) => line.includes('bertabrakan'))).toBe(true);
    expect(crash.doc).toBe(ok.doc);

    const overflow = addBase(ok.doc, 'cab_base_0003', 280);
    expect(overflow.violations.some((line) => line.includes('melewati panjang dinding'))).toBe(true);
    expect(overflow.doc.items).toHaveLength(1);
  });

  it('base dan wall pada offset yang sama tidak bertabrakan; kulkas bertabrakan dengan base', () => {
    const doc = wallDoc();
    const base = addBase(doc, 'cab_base_0001', 0);
    const wall = applyCommand(base.doc, {
      type: 'add_item',
      targetIds: ['cab_wall_0001'],
      item: { type: 'wall_cabinet', subtype: 'wall', wallId: 'dinding_kiri', offsetCm: 0, elevationCm: 135, dims: { w: 60, h: 105, d: 33 }, label: 'Wall Cabinet 60cm' },
    });
    expect(wall.violations).toEqual([]);

    const fridge = applyCommand(wall.doc, {
      type: 'add_item',
      targetIds: ['appl_0001'],
      item: { type: 'appliance', subtype: 'fridge', wallId: 'dinding_kiri', offsetCm: 0, elevationCm: 0, dims: { w: 90, h: 240, d: 70 }, label: 'Kulkas' },
    });
    expect(fridge.violations.some((line) => line.includes('bertabrakan'))).toBe(true);
  });

  it('update_item berhasil dan menolak tinggi yang melampaui global serta id hilang', () => {
    const doc = addBase(wallDoc(), 'cab_base_0001', 0).doc;
    const ok = applyCommand(doc, { type: 'update_item', targetIds: ['cab_base_0001'], patch: { label: 'Lemari Bawah' } });
    expect(ok.violations).toEqual([]);
    expect(ok.doc.items[0].label).toBe('Lemari Bawah');

    const tooTall = applyCommand(ok.doc, { type: 'update_item', targetIds: ['cab_base_0001'], patch: { dims: { h: 250 } } });
    expect(tooTall.violations.some((line) => line.includes('melampaui tinggi total'))).toBe(true);
    expect(tooTall.doc.items[0].label).toBe('Lemari Bawah');

    const missing = applyCommand(ok.doc, { type: 'update_item', targetIds: ['tidak_ada'], patch: { label: 'X' } });
    expect(missing.violations[0]).toContain('tidak ditemukan');
    expect(missing.doc).toBe(ok.doc);
  });

  it('move_item berhasil dan menolak posisi di luar dinding', () => {
    const doc = addBase(wallDoc(), 'cab_base_0001', 0).doc;
    const ok = applyCommand(doc, { type: 'move_item', targetIds: ['cab_base_0001'], offsetCm: 100 });
    expect(ok.violations).toEqual([]);
    expect(ok.doc.items[0].offsetCm).toBe(100);
    expect(ok.doc.items[0].positionCm.x).toBeCloseTo(130, 5);

    const bad = applyCommand(ok.doc, { type: 'move_item', targetIds: ['cab_base_0001'], offsetCm: -20 });
    expect(bad.violations.some((line) => line.includes('awal dinding'))).toBe(true);
    expect(bad.doc.items[0].offsetCm).toBe(100);
  });

  it('remove_item menghapus anak dan menolak id hilang', () => {
    let doc = addBase(wallDoc(), 'cab_base_0001', 0).doc;
    doc = applyCommand(doc, {
      type: 'add_item',
      targetIds: ['cab_wall_0001'],
      item: { type: 'wall_cabinet', subtype: 'wall', wallId: 'dinding_kiri', parentId: 'cab_base_0001', offsetCm: 0, elevationCm: 135, dims: { w: 60, h: 105, d: 33 }, label: 'Wall Cabinet 60cm' },
    }).doc;
    const removed = applyCommand(doc, { type: 'remove_item', targetIds: ['cab_base_0001'] });
    expect(removed.violations).toEqual([]);
    expect(removed.doc.items).toHaveLength(0);

    const missing = applyCommand(removed.doc, { type: 'remove_item', targetIds: ['cab_base_0001'] });
    expect(missing.violations[0]).toContain('tidak ditemukan');
  });

  it('duplicate_item berhasil bila ada ruang dan gagal bila dinding penuh', () => {
    const doc = addBase(wallDoc(), 'cab_base_0001', 0).doc;
    const copy = applyCommand(doc, { type: 'duplicate_item', targetIds: ['cab_base_0001'] });
    expect(copy.violations).toEqual([]);
    expect(copy.doc.items.map((item) => item.id)).toEqual(['cab_base_0001', 'cab_base_0002']);
    expect(copy.doc.items[1].offsetCm).toBe(60);

    const full = addBase(wallDoc(), 'cab_base_0001', 0, 300).doc;
    const blocked = applyCommand(full, { type: 'duplicate_item', targetIds: ['cab_base_0001'] });
    expect(blocked.violations.some((line) => line.includes('melewati panjang dinding'))).toBe(true);
    expect(blocked.doc.items).toHaveLength(1);
  });

  it('set_global berhasil dan menolak tinggi total yang memotong item', () => {
    const doc = addBase(wallDoc(), 'cab_base_0001', 0).doc;
    const ok = applyCommand(doc, { type: 'set_global', targetIds: ['globals'], globals: { snapGizmoCm: 5 } });
    expect(ok.violations).toEqual([]);
    expect(ok.doc.globals.snapGizmoCm).toBe(5);

    const bad = applyCommand(ok.doc, { type: 'set_global', targetIds: ['globals'], globals: { tinggiTotalCm: 80 } });
    expect(bad.violations.some((line) => line.includes('melampaui tinggi total'))).toBe(true);
    expect(bad.doc.globals.tinggiTotalCm).toBe(240);
  });

  it('set_material memperbarui bagian item dan menolak target hilang', () => {
    const doc = addBase(wallDoc(), 'cab_base_0001', 0).doc;
    const ok = applyCommand(doc, {
      type: 'set_material',
      targetIds: ['cab_base_0001'],
      part: 'door',
      material: { id: 'mat_putih', nama: 'Putih', tipe: 'Duco', warna: '#FFFFFF', tekstur: null },
    });
    expect(ok.violations).toEqual([]);
    expect(ok.doc.items[0].parts.door).toMatchObject({ materialId: 'mat_putih', warna: '#FFFFFF', tipe: 'Duco' });
    expect(ok.doc.materials.some((material) => material.id === 'mat_putih')).toBe(true);

    const missing = applyCommand(ok.doc, {
      type: 'set_material',
      targetIds: ['hilang'],
      part: 'door',
      material: { id: 'mat_hitam', nama: 'Hitam', tipe: 'HPL', warna: '#111111', tekstur: null },
    });
    expect(missing.violations[0]).toContain('tidak ditemukan');
    expect(missing.doc.materials.some((material) => material.id === 'mat_hitam')).toBe(false);
  });

  it('add_wall berhasil, menolak id ganda dan panjang yang tidak cocok', () => {
    const doc = wallDoc();
    const ok = applyCommand(doc, {
      type: 'add_wall',
      targetIds: ['dinding_kanan'],
      wall: { nama: 'Dinding Kanan', panjangCm: 250, start: { x: 0, z: 0 }, end: { x: 0, z: 250 } },
    });
    expect(ok.violations).toEqual([]);
    expect(ok.doc.room.walls).toHaveLength(2);
    expect(ok.doc.room.bentuk).toBe('custom');

    const duplicate = applyCommand(ok.doc, {
      type: 'add_wall',
      targetIds: ['dinding_kiri'],
      wall: { nama: 'Duplikat', panjangCm: 100, start: { x: 0, z: 0 }, end: { x: 100, z: 0 } },
    });
    expect(duplicate.violations.some((line) => line.includes('terpakai lebih dari sekali'))).toBe(true);

    const mismatch = applyCommand(ok.doc, {
      type: 'add_wall',
      targetIds: ['dinding_depan'],
      wall: { nama: 'Depan', panjangCm: 10, start: { x: 0, z: 0 }, end: { x: 80, z: 0 } },
    });
    expect(mismatch.violations[0]).toContain('tidak sesuai jarak');
  });

  it('update_room berhasil dan menolak bentuk yang tidak dikenal', () => {
    const doc = wallDoc();
    const ok = applyCommand(doc, { type: 'update_room', targetIds: ['room'], room: { bentuk: 'L', tinggiPlafonCm: 280 } });
    expect(ok.violations).toEqual([]);
    expect(ok.doc.room.bentuk).toBe('L');
    expect(ok.doc.room.tinggiPlafonCm).toBe(280);
    expect(ok.doc.room.walls).toHaveLength(1);

    const bad = applyCommand(ok.doc, { type: 'update_room', targetIds: ['room'], room: { bentuk: 'Z' } });
    expect(bad.violations[0]).toContain('Perintah tidak valid');
    expect(bad.doc.room.bentuk).toBe('L');
  });

  it('group_items berhasil dan menolak siklus serta parent hilang', () => {
    let doc = addBase(wallDoc(), 'cab_base_0001', 0).doc;
    doc = applyCommand(doc, {
      type: 'add_item',
      targetIds: ['cab_wall_0001'],
      item: { type: 'wall_cabinet', subtype: 'wall', wallId: 'dinding_kiri', offsetCm: 0, elevationCm: 135, dims: { w: 60, h: 105, d: 33 }, label: 'Wall Cabinet 60cm' },
    }).doc;
    const grouped = applyCommand(doc, { type: 'group_items', targetIds: ['cab_wall_0001'], parentId: 'cab_base_0001' });
    expect(grouped.violations).toEqual([]);
    expect(grouped.doc.items.find((item) => item.id === 'cab_wall_0001')?.parentId).toBe('cab_base_0001');

    const cycle = applyCommand(grouped.doc, { type: 'group_items', targetIds: ['cab_base_0001'], parentId: 'cab_wall_0001' });
    expect(cycle.violations.some((line) => line.includes('siklus'))).toBe(true);
    expect(cycle.doc.items.find((item) => item.id === 'cab_base_0001')?.parentId).toBeNull();

    const missing = applyCommand(grouped.doc, { type: 'group_items', targetIds: ['cab_base_0001'], parentId: 'tidak_ada' });
    expect(missing.violations[0]).toContain('tidak ditemukan');
  });

  it('apply_template berhasil dan menolak template asing serta tabrakan', () => {
    const doc = wallDoc();
    const ok = applyCommand(doc, { type: 'apply_template', targetIds: ['cab_base_0001'], templateId: 'base_60', wallId: 'dinding_kiri', offsetCm: 0 });
    expect(ok.violations).toEqual([]);
    expect(ok.doc.items[0]).toMatchObject({ type: 'base_cabinet', label: 'Base Cabinet 60cm', dims: { w: 60, h: 85, d: 60 } });

    const unknown = applyCommand(ok.doc, { type: 'apply_template', targetIds: ['cab_base_0009'], templateId: 'tidak_ada', wallId: 'dinding_kiri', offsetCm: 80 });
    expect(unknown.violations[0]).toContain('tidak dikenal');
    expect(unknown.doc.items).toHaveLength(1);

    const crash = applyCommand(ok.doc, { type: 'apply_template', targetIds: ['cab_base_0002'], templateId: 'base_60', wallId: 'dinding_kiri', offsetCm: 20 });
    expect(crash.violations.some((line) => line.includes('bertabrakan'))).toBe(true);
  });
});
