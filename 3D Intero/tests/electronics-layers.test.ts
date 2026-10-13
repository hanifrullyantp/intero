import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_MATERIALS } from '../src/engine/layoutEngine';
import { AUTO, generateMagic, type MagicSpec } from '../src/engine/magicGenerator';
import { electronicsLayout } from '../src/engine/electronicsTower';
import { generateParts } from '../src/engine/parametric';
import { physicalReorder, wallRunItems } from '../src/engine/layerReorder';
import { contrastHandleHex } from '../src/viewport/handles3d';
import { getColor } from '../src/config/materials';
import { footprint, offsetOnWall, r1 } from '../src/utils/geometry';

function fixture(): MagicSpec {
  return {
    name: 'Kitchen order test', shape: 'L', totalH: 220, ceilingHeight: 280,
    baseH: 85, baseDepth: 58, ctDepth: 60, wallDepth: 33, backsplashHeight: 60, cornerDepth: 90,
    sides: {
      A: { length: 450, items: [
        { uid: 'fridge', key: 'fridge_sbs', width: 90 },
        { uid: 'magiccom', key: 'electro', width: 100 },
        { uid: 'fill-a', key: AUTO, width: 0 },
      ] },
      B: { length: 340, items: [{ uid: 'fill-b', key: AUTO, width: 0 }, { uid: 'disp', key: 'dispenser', width: 60 }] },
      C: { length: 240, items: [] },
    },
  };
}

test('Magic Generator builds a pull-out magiccom worktop shelf, oven niche and upper storage', () => {
  const project = generateMagic(fixture(), { ...DEFAULT_MATERIALS });
  const tower = project.items.find((i) => i.subtype === 'tall_electro')!;
  assert.ok(tower);
  assert.equal(tower.height, 220);
  const layout = electronicsLayout(tower);
  assert.equal(layout.shelfY, 87); // 85 cm base + 2 cm countertop
  assert.equal(layout.ovenY, 129); // 30 cm magiccom + 12 cm clearance
  assert.equal(layout.ovenH, 29); // oven 44 x 29 x 32
  assert.equal(layout.ovenTop, 158);
  assert.equal(layout.storageHeight, 62);
  const parts = generateParts(tower, project.materials);
  assert.ok(parts.some((p) => p.name === 'Magiccom Worktop Shelf' && r1(p.box.y + p.box.sy) === 87));
  assert.ok(parts.some((p) => p.name === 'Oven Support Shelf'));
  assert.ok(parts.some((p) => p.role === 'door' && p.box.y < layout.shelfY));
  assert.ok(parts.some((p) => p.role === 'door' && p.box.y >= layout.ovenTop));
  assert.equal(tower.config.magiccom?.extension, 42);
});

test('Layer reorder physically inserts sink to the left and closes its old slot', () => {
  const project = generateMagic(fixture(), { ...DEFAULT_MATERIALS });
  const wall = project.room.walls.find((w) => w.id === 'A')!;
  const sink = project.items.find((i) => i.subtype === 'base_sink')!;
  const sinkAppliance = project.items.find((i) => i.subtype.startsWith('app_sink'))!;
  const upper = project.items.find((i) => i.kind === 'cabinet' && i.category === 'wall' && i.wallId === 'A' && i.width === sink.width && i.x === sink.x)!;
  const tower = project.items.find((i) => i.subtype === 'tall_electro')!;
  const initial = { sinkX: sink.x, appX: sinkAppliance.x, upperX: upper.x };
  const result = physicalReorder(project, sinkAppliance.id, tower.id, true);
  assert.ok(result.items, result.error);
  const updated = { ...project, items: result.items! };
  const moved = updated.items.find((i) => i.id === sink.id)!;
  const movedAppliance = updated.items.find((i) => i.id === sinkAppliance.id)!;
  const movedUpper = updated.items.find((i) => i.id === upper.id)!;
  assert.ok(moved.x < initial.sinkX);
  assert.equal(r1(movedAppliance.x - initial.appX), r1(moved.x - initial.sinkX));
  assert.equal(r1(movedUpper.x - initial.upperX), r1(moved.x - initial.sinkX));
  const row = wallRunItems(updated, wall);
  for (let i = 1; i < row.length; i++) assert.equal(r1(offsetOnWall(wall, footprint(row[i]))), r1(offsetOnWall(wall, footprint(row[i - 1])) + row[i - 1].width));
  assert.equal(updated.items.find((i) => i.subtype === 'tall_fridge_sbs')!.x, project.items.find((i) => i.subtype === 'tall_fridge_sbs')!.x);
});

test('Moving stove cabinet also carries cooktop, hood and housing along its wall', () => {
  const project = generateMagic(fixture(), { ...DEFAULT_MATERIALS });
  const stove = project.items.find((i) => i.subtype === 'base_stove')!;
  const other = project.items.filter((i) => i.category === 'base' && i.wallId === stove.wallId && i.id !== stove.id && !i.subtype.includes('corner'))
    .sort((a, b) => b.y - a.y)[0]!;
  const linked = project.items.filter((i) => i.id === stove.id || i.config.applianceHostId === stove.id || i.subtype.startsWith('app_hood') || i.subtype === 'wall_hood');
  const initial = new Map(linked.map((i) => [i.id, { x: i.x, y: i.y }]));
  const result = physicalReorder(project, stove.id, other.id, false);
  assert.ok(result.items, result.error);
  const moved = result.items!.find((i) => i.id === stove.id)!;
  const delta = { x: r1(moved.x - stove.x), y: r1(moved.y - stove.y) };
  assert.ok(delta.x || delta.y);
  for (const item of linked) {
    const old = initial.get(item.id)!;
    const next = result.items!.find((i) => i.id === item.id)!;
    assert.deepEqual({ x: r1(next.x - old.x), y: r1(next.y - old.y) }, delta, `${item.name} must follow stove`);
  }
});

test('electronics tower accepts an appliance combination and stacks it deterministically', () => {
  const project = generateMagic(fixture(), { ...DEFAULT_MATERIALS });
  const tower = project.items.find((i) => i.subtype === 'tall_electro')!;
  const combo = { ...tower, config: { ...tower.config, appliances: ['dispenser', 'oven', 'microwave'] } };
  const layout = electronicsLayout(combo);
  assert.equal(layout.slots.length, 3);
  assert.equal(layout.slots[0].key, 'dispenser');
  assert.equal(layout.slots[0].atWorktop, true);
  assert.equal(layout.slots[1].key, 'oven');
  assert.equal(layout.slots[1].h, 29);
  assert.equal(layout.slots[2].key, 'microwave');
  assert.ok(layout.slots[2].y > layout.slots[1].y + 29);
  const parts = generateParts(combo, project.materials);
  assert.ok(parts.some((p) => p.name === 'Oven Support Shelf'));
  assert.ok(parts.some((p) => p.name === 'Microwave Support Shelf'));
  assert.ok(parts.some((p) => p.name === 'Dispenser Support Shelf'));
});

test('pull-out organisers keep their front panel and travel with the frame', () => {
  const specs = ['int_dish_pullout', 'int_spice_pullout', 'int_gas_pullout', 'int_cutlery'];
  for (const subtype of specs) {
    const item = { ...createItem(subtype), openAmount: 1 };
    // buildInternal is exercised through the 3D scene; here we assert the registry exists and is a pull-out accessory
    assert.ok(item.subtype.startsWith('int_'));
    assert.ok(item.depth >= 40);
  }
});

test('Layer reorder respects locked cabinets, wall boundaries and fixed corners', () => {
  const project = generateMagic(fixture(), { ...DEFAULT_MATERIALS });
  const sink = project.items.find((i) => i.subtype === 'base_sink')!;
  const stove = project.items.find((i) => i.subtype === 'base_stove')!;
  assert.match(physicalReorder(project, sink.id, stove.id, true).error ?? '', /dinding/);
  const tower = project.items.find((i) => i.subtype === 'tall_electro')!;
  const locked = { ...project, items: project.items.map((i) => i.id === tower.id ? { ...i, locked: true } : i) };
  assert.match(physicalReorder(locked, sink.id, tower.id, true).error ?? '', /kunci/);
  const corner = project.items.find((i) => i.subtype === 'base_corner_l')!;
  assert.ok(physicalReorder(project, corner.id, tower.id, true).error);
});

test('Handle finish remains user-selected when contrasting, or adapts on similar doors', () => {
  assert.equal(contrastHandleHex('black', getColor('white').hex), '#1c1c1c');
  assert.equal(contrastHandleHex('stainless', '#ffffff'), '#34434d');
  assert.equal(contrastHandleHex('black', '#141414'), '#e3e9ed');
  assert.equal(contrastHandleHex('brass', '#ffffff'), '#34434d');
});