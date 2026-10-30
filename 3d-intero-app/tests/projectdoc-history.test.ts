import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyCommand } from '../src/projectdoc/apply';
import { fromProjectData, toProjectData } from '../src/projectdoc/adapter';
import { diffDoc } from '../src/projectdoc/diff';
import { deserializeCommandLog, pushLog, redoLog, serializeCommandLog, undoLog, type CommandLog } from '../src/projectdoc/history';
import { cabinetSig, planReconcile } from '../src/projectdoc/reconcile';
import { createEmptyProjectDoc, parseProjectDoc, type ProjectDoc } from '../src/projectdoc/schema';
import { cancelDocArm, flushDocHistory, sameScene } from '../src/projectdoc/session';
import { useStore } from '../src/store';
import type { Item, Materials, ProjectData, ProjectSettings } from '../src/types';

const NOW = '2026-01-01T00:00:00.000Z';

function wallDoc(): ProjectDoc {
  const added = applyCommand(createEmptyProjectDoc({ id: 'prj_uji', nama: 'Uji', now: NOW }), {
    type: 'add_wall',
    targetIds: ['dinding_kiri'],
    wall: { nama: 'Dinding Kiri', panjangCm: 300, start: { x: 0, z: 0 }, end: { x: 300, z: 0 } },
  });
  return added.doc;
}

function addBase(doc: ProjectDoc, id: string, offsetCm: number) {
  return applyCommand(doc, {
    type: 'add_item',
    targetIds: [id],
    item: { type: 'base_cabinet', subtype: 'base', wallId: 'dinding_kiri', offsetCm, dims: { w: 60, h: 85, d: 60 }, label: 'Base Cabinet 60cm' },
  });
}

function geom(doc: ProjectDoc) {
  return {
    globals: doc.globals,
    countertop: doc.countertop,
    bentuk: doc.room.bentuk,
    items: doc.items.map((item) => ({
      id: item.id,
      label: item.label,
      wallId: item.wallId,
      parentId: item.parentId,
      offset: Math.round(item.offsetCm * 100) / 100,
      elevation: Math.round(item.elevationCm * 100) / 100,
      x: Math.round(item.positionCm.x * 100) / 100,
      y: Math.round(item.positionCm.y * 100) / 100,
      z: Math.round(item.positionCm.z * 100) / 100,
      rot: Math.round(item.rotationY * 100) / 100,
      dims: item.dims,
    })),
  };
}

function replay(doc: ProjectDoc, commands: CommandLog['past'][number]['commands']) {
  let current = doc;
  for (const command of commands) {
    const result = applyCommand(current, command);
    expect(result.violations, JSON.stringify(command)).toEqual([]);
    current = result.doc;
  }
  return current;
}

const materials = (): Materials => ({
  doorMaterial: 'HPL', doorColor: '#C9A97A', bodyFollowsDoor: false, bodyColor: '#F2F2F0', sidesFollowDoor: true,
  toeKickFollowsDoor: true, handleColor: '#1A1A1A', handleType: 'bar', handleLength: 128, handlePosition: 'top', softClose: true,
});

function kitchen(): ProjectData {
  const settings = {
    globalCabinetHeight: 2400, baseHeight: 850, wallGap: 500, wallDepth: 330, toeKick: 100, unit: 'mm',
    countertop: { type: 'marble_putih', thickness: 20, overhang: 20, backsplash: true, backsplashAuto: true, backsplashHeight: 600, backsplashColor: '#ECE4D8' },
    appearance: { canvasColor: '#E4E7EB', wallColor: '#D2D3D1', floorColor: '#D9D2C7' },
    production: { sheet: '1220x2440', clientName: 'Budi', notes: '', terms: 'net', timeline: '', logo: null, customItems: [], activeScenario: 'sc', scenarios: [], frameMaterial: 'galvanis_08', frameView: 'frame_acp', frameLabels: true, frameWelds: true, frameExplode: 0, hppRows: {} },
  } as ProjectSettings;
  const led = { underCabinet: false, insideUpper: false, insideBase: false, plinth: false, temperature: 4000 as const, trigger: 'always' as const, intensity: 70 };
  const item = (partial: Item): Item => ({
    orderIndex: 0, rotationY: 0, materials: materials(), config: { doorCount: 2 }, led, visible: true, locked: false, colorLabel: null, createdAt: NOW, ...partial,
  });
  return {
    formatVersion: '1.0', appVersion: '3D Intero 1.0', projectName: 'Dapur Uji', createdAt: NOW, modifiedAt: NOW, settings,
    walls: [{ id: 'left', name: 'Dinding Kiri', start: { x: 0, z: 0 }, end: { x: 3000, z: 0 } }],
    cabinets: [
      item({ id: 'BC-LAMA1', name: 'Base Cabinet 60cm', type: 'base', wallId: 'left', position: { x: 300, y: 0, z: 300 }, dims: { w: 600, h: 850, d: 600 }, config: { doorCount: 2, toeKickHeight: 100 } }),
      item({ id: 'WC-1', name: 'Wall Cabinet 60cm', type: 'wall', wallId: 'left', position: { x: 1200, y: 1350, z: 165 }, dims: { w: 600, h: 1050, d: 330 }, config: { doorCount: 2, parentId: 'BC-LAMA1' } }),
      item({ id: 'FR-1', name: 'Kulkas', type: 'fridge', wallId: 'left', position: { x: 2100, y: 0, z: 350 }, dims: { w: 900, h: 2100, d: 700 } }),
      item({ id: 'IS-1', name: 'Island', type: 'island', wallId: null, position: { x: 1500, y: 0, z: 1800 }, rotationY: 15, dims: { w: 1200, h: 850, d: 700 } }),
    ],
    dimensions: [], customComponents: [],
  };
}

describe('pelanggaran yang sudah ada', () => {
  it('mengizinkan ubah label dan menolak tabrakan baru', () => {
    const base = addBase(wallDoc(), 'cab_base_0001', 0).doc;
    const broken = structuredClone(base);
    const copy = structuredClone(broken.items[0]);
    copy.id = 'cab_base_0002';
    copy.offsetCm = 20;
    copy.label = 'Tumpang';
    broken.items.push(copy);
    const parsed = parseProjectDoc(broken);

    const renamed = applyCommand(parsed, { type: 'update_item', targetIds: ['cab_base_0001'], patch: { label: 'Nama baru' } });
    expect(renamed.violations).toEqual([]);
    expect(renamed.doc.items[0].label).toBe('Nama baru');

    const extra = applyCommand(renamed.doc, {
      type: 'add_item',
      targetIds: ['cab_base_0003'],
      item: { type: 'base_cabinet', subtype: 'base', wallId: 'dinding_kiri', offsetCm: 200, dims: { w: 60, h: 85, d: 60 }, label: 'Jauh' },
    });
    expect(extra.violations).toEqual([]);

    const crash = applyCommand(extra.doc, {
      type: 'add_item',
      targetIds: ['cab_base_0004'],
      item: { type: 'base_cabinet', subtype: 'base', wallId: 'dinding_kiri', offsetCm: 0, dims: { w: 60, h: 85, d: 60 }, label: 'Baru' },
    });
    expect(crash.violations.some((line) => line.includes('bertabrakan'))).toBe(true);
    expect(crash.doc).toBe(extra.doc);
  });
});

describe('command log', () => {
  it('undo dan redo mengembalikan dokumen yang disimpan', () => {
    const before = wallDoc();
    const after = addBase(before, 'cab_base_0001', 0).doc;
    const log = pushLog({ past: [], future: [] }, { commands: [], before, after });
    const undone = undoLog(log);
    expect(undone?.doc).toEqual(before);
    const redone = redoLog(undone!.log);
    expect(redone?.doc).toEqual(after);
  });

  it('serialisasi log tetap bisa di-undo', () => {
    const before = wallDoc();
    const after = addBase(before, 'cab_base_0001', 0).doc;
    const log = pushLog({ past: [], future: [] }, { commands: [], before, after });
    const back = deserializeCommandLog(serializeCommandLog(log));
    expect(undoLog(back)?.doc.items).toEqual([]);
    expect(back.past[0].after.items[0].id).toBe('cab_base_0001');
  });
});

describe('diff perintah', () => {
  it('memutar ulang tambah, ubah, geser, hapus, global, dan grup', () => {
    const before = wallDoc();
    const added = addBase(before, 'cab_base_0001', 0).doc;
    const named = applyCommand(added, { type: 'update_item', targetIds: ['cab_base_0001'], patch: { label: 'Lemari Bawah' } }).doc;
    const moved = applyCommand(named, { type: 'move_item', targetIds: ['cab_base_0001'], offsetCm: 80 }).doc;
    const second = addBase(moved, 'cab_base_0002', 160).doc;
    const grouped = applyCommand(second, { type: 'group_items', targetIds: ['cab_base_0002'], parentId: 'cab_base_0001' }).doc;
    const globals = applyCommand(grouped, { type: 'set_global', targetIds: ['globals'], globals: { tinggiTotalCm: 260 }, countertop: { tebalCm: 3 } }).doc;

    for (const step of [added, named, moved, second, grouped, globals]) {
      const diff = diffDoc(before, step);
      expect(diff.complete, JSON.stringify(diff.commands)).toBe(true);
      expect(geom(replay(before, diff.commands))).toEqual(geom(step));
    }

    const removed = applyCommand(globals, { type: 'remove_item', targetIds: ['cab_base_0001'] }).doc;
    const diff = diffDoc(globals, removed);
    expect(diff.complete).toBe(true);
    expect(geom(replay(globals, diff.commands))).toEqual(geom(removed));
    expect(removed.items.map((item) => item.id)).toEqual([]);
  });
});

describe('renderer dan proyek lama', () => {
  it('round-trip menjaga posisi, sidik geometri, dan scene yang sama', () => {
    const source = kitchen();
    const doc = fromProjectData(source, { snapGizmoCm: 1 });
    const back = toProjectData(doc);
    const again = fromProjectData(back, { id: doc.meta.id, snapGizmoCm: doc.globals.snapGizmoCm });
    expect(sameScene(doc, again)).toBe(true);
    expect(back.cabinets.find((item) => item.id === 'WC-1')?.config.parentId).toBe('BC-LAMA1');
    for (const item of source.cabinets) {
      const next = back.cabinets.find((cabinet) => cabinet.id === item.id)!;
      expect(Math.abs(next.position.x - item.position.x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(next.position.y - item.position.y)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(next.position.z - item.position.z)).toBeLessThanOrEqual(0.5);
      expect(cabinetSig(next, back.cabinets, back.walls, back.settings)).toBe(cabinetSig(item, source.cabinets, source.walls, source.settings));
    }
    const first = back.cabinets[0];
    const built = [{ id: first.id, sig: cabinetSig(first, back.cabinets, back.walls, back.settings), x: first.position.x, y: first.position.y, z: first.position.z, rotationY: first.rotationY }];
    expect(planReconcile(built, back.cabinets, back.walls, back.settings).find((op) => op.id === first.id)?.action).toBe('keep');
    const shifted = { ...first, position: { ...first.position, x: first.position.x + 30 } };
    expect(planReconcile(built, [shifted], back.walls, back.settings)[0].action).toBe('move');
    expect(planReconcile(built, [{ ...first, dims: { ...first.dims, w: 700 } }], back.walls, back.settings)[0].action).toBe('rebuild');
    expect(planReconcile(built, [], back.walls, back.settings)[0].action).toBe('remove');
  });
});

describe('store di belakang flag', () => {
  afterEach(() => {
    cancelDocArm();
    vi.unstubAllGlobals();
    useStore.setState({ items: [], walls: [], past: [], future: [], projectDoc: null, docPast: [], docFuture: [], docPending: false, selectedIds: [] });
  });

  function flag(on: boolean) {
    const mem = new Map<string, string>();
    if (on) mem.set('projectdoc_v1', '1');
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => { mem.set(key, value); },
      removeItem: (key: string) => { mem.delete(key); },
    });
  }

  it('tanpa flag undo tetap snapshot', () => {
    flag(false);
    useStore.getState().newProject('Kosong');
    useStore.getState().pushHistory();
    expect(useStore.getState().past.length).toBe(1);
    expect(useStore.getState().docPending).toBe(false);
  });

  it('dengan flag undo mengembalikan dinding dan kabinet', () => {
    flag(true);
    useStore.getState().newProject('Dapur');
    useStore.getState().setWalls([{ id: 'left', name: 'Dinding Kiri', start: { x: 0, z: 0 }, end: { x: 3000, z: 0 } }]);
    flushDocHistory();
    expect(useStore.getState().docPast.length).toBe(1);
    expect(useStore.getState().projectDoc?.room.walls[0].id).toBe('left');
    useStore.getState().addItem({ type: 'base', dims: { w: 600, h: 850, d: 600 }, wallId: 'left', position: { x: 300, y: 0, z: 300 } });
    flushDocHistory();
    expect(useStore.getState().items.length).toBe(1);
    useStore.getState().undo();
    expect(useStore.getState().items.length).toBe(0);
    expect(useStore.getState().walls).toHaveLength(1);
    useStore.getState().redo();
    expect(useStore.getState().items.length).toBe(1);
    useStore.getState().undo();
    useStore.getState().undo();
    expect(useStore.getState().walls).toEqual([]);
  });
});
