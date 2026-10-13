import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_MATERIALS } from '../src/engine/layoutEngine';
import { AUTO, activeSides, autoSpace, fixedUsed, generateMagic, magicStats, resolveSide, splitAutoFill, type MagicSpec } from '../src/engine/magicGenerator';
import { applyProjectDimensions, defaultsForNewItem } from '../src/engine/projectDimensions';
import { createItem } from '../src/config/library';
import { detectCornerOrientation } from '../src/engine/cornerOrientation';
import { fridgeSize, dispenserSize, housingLayout } from '../src/engine/applianceHousing';
import { generateParts } from '../src/engine/parametric';
import { computeBacksplashes, computeCountertops } from '../src/engine/countertop';
import { cabinetLighting } from '../src/viewport/ledLighting';
import { adjustHex, getColor } from '../src/config/materials';
import { isTopTier, stackAbove } from '../src/engine/kitchenRules';
import type { Project } from '../src/models/types';

function spec(shape: MagicSpec['shape'] = 'L', totalH = 220): MagicSpec {
  return {
    name: 'Regression kitchen', shape, totalH, ceilingHeight: 320, baseH: 85, baseDepth: 58,
    cornerDepth: 90, ctDepth: 60, wallDepth: 33, backsplashHeight: 60,
    sides: {
      A: { length: 575, items: [{ uid: 'fr', key: 'fridge_sbs', width: 90 }, { uid: 'el', key: 'electro', width: 100 }, { uid: 'fill-a', key: AUTO, width: 0 }] },
      B: { length: 260, items: [{ uid: 'fill-b', key: AUTO, width: 0 }, { uid: 'disp', key: 'dispenser', width: 60 }] },
      C: { length: 240, items: [{ uid: 'fill-c', key: AUTO, width: 0 }] },
    },
  };
}

function assertTop(project: Project, top: number) {
  const items = project.items.filter((i) => i.kind === 'cabinet' && (i.category === 'wall' || i.category === 'tall') && isTopTier(i, project.items));
  assert.ok(items.length > 0);
  for (const i of items) assert.ok(Math.abs(i.elevation + i.height - top) < 0.11, `${i.name}: ${i.elevation + i.height} != ${top}`);
}

test('auto-fill never loses a fractional remainder or widens a cabinet into the next slot', () => {
  for (const width of [19.5, 35, 60, 110, 140, 325, 501.3, 995.7]) {
    const parts = splitAutoFill(width);
    assert.ok(Math.abs(parts.reduce((n, x) => n + x, 0) - width) < 0.01);
    assert.ok(parts.every((x) => x > 0 && x <= 120));
  }
  assert.deepEqual(splitAutoFill(325), [80, 80, 80, 85]);
  assert.deepEqual(splitAutoFill(140), [80, 60]);
});

test('I, L and U use exact wall lengths and a common 220 / 250 cm top plane', () => {
  for (const shape of ['I', 'L', 'U'] as const) for (const top of [220, 250]) {
    const input = spec(shape, top);
    const p = generateMagic(input, { ...DEFAULT_MATERIALS });
    assertTop(p, top);
    assert.equal(p.settings.defaults?.wallHeight, top - 147);
    assert.equal(p.room.width, input.sides.A.length);
    assert.ok(p.items.some((i) => i.subtype.startsWith('app_sink')));
    assert.ok(p.items.some((i) => i.subtype.startsWith('app_cooktop')));
    for (const side of activeSides(input)) {
      const result = resolveSide(input, side);
      const corners = fixedUsed(input, side) - input.sides[side].items.filter((i) => i.key !== AUTO).reduce((n, i) => n + i.width, 0);
      assert.ok(Math.abs(result.reduce((n, i) => n + i.width, 0) + corners - input.sides[side].length) < 0.11);
    }
  }
});

test('a returning wall, not a corner label, determines the handedness', () => {
  const p = generateMagic(spec('L'), { ...DEFAULT_MATERIALS });
  for (const i of p.items.filter((i) => i.subtype.includes('corner'))) {
    assert.equal(i.config.opening, 'right');
    const wrong = { ...i, config: { ...i.config, opening: 'left' as const } };
    assert.equal(detectCornerOrientation(wrong, p.room.walls).config.opening, 'right');
    const doors = generateParts(i, p.materials).filter((part) => part.role === 'door');
    assert.ok(doors.some((part) => part.sideFace === true));
    assert.ok(doors.some((part) => !part.sideFace));
    assert.ok(doors.every((part) => part.hingeAt === 'far'));
  }
  const u = generateMagic(spec('U'), { ...DEFAULT_MATERIALS });
  const corners = u.items.filter((i) => i.subtype === 'base_corner_l').sort((a, b) => a.x - b.x);
  assert.deepEqual(corners.map((i) => i.config.opening), ['left', 'right']);
});

test('global height edits resize the housing storage, never the fridge body', () => {
  const p = generateMagic(spec(), { ...DEFAULT_MATERIALS });
  const fridge = p.items.find((i) => i.subtype.startsWith('tall_fridge'))!;
  const device = { ...fridgeSize(fridge) };
  const bottom = housingLayout(fridge, p.materials.board).shelfY;
  const resized = applyProjectDimensions(p, { totalHeight: 250 });
  const changed = resized.items.find((i) => i.id === fridge.id)!;
  assertTop(resized, 250);
  assert.deepEqual(fridgeSize(changed), device);
  assert.equal(housingLayout(changed, p.materials.board).shelfY, bottom);
  assert.equal(changed.height - fridge.height, 30);
  const oldDoor = generateParts(fridge, p.materials).find((part) => part.role === 'door')!;
  const newDoor = generateParts(changed, p.materials).find((part) => part.role === 'door')!;
  assert.equal(oldDoor.box.y, newDoor.box.y);
  assert.ok(Math.abs(newDoor.box.sy - oldDoor.box.sy - 30) < 0.11);
});

test('global base / upper height edits include both corner cabinets', () => {
  const p = generateMagic(spec(), { ...DEFAULT_MATERIALS });
  const changed = applyProjectDimensions(p, { baseHeight: 90, wallHeight: 90 });
  assertTop(changed, 242);
  for (const i of changed.items.filter((i) => i.kind === 'cabinet' && i.category === 'base')) assert.equal(i.height, 90);
  const upperCorner = changed.items.find((i) => i.subtype === 'wall_corner')!;
  assert.equal(upperCorner.height, 90);
  assert.equal(upperCorner.elevation, 152);
  assert.equal(upperCorner.config.cornerDepth, 33);
});

test('new cabinets inherit the edited global top line as well', () => {
  const p = applyProjectDimensions(generateMagic(spec(), { ...DEFAULT_MATERIALS }), { totalHeight: 250 });
  for (const entry of ['wall_single', 'wall_corner', 'tall_fridge', 'tall_dispenser']) {
    const item = defaultsForNewItem(createItem(entry), p);
    assert.equal(item.elevation + item.height, 250);
  }
});

test('two-tier upper cabinets remain stacked and their top meets the global top plane', () => {
  const p = generateMagic(spec(), { ...DEFAULT_MATERIALS });
  const lower = p.items.find((i) => i.category === 'wall' && !i.subtype.includes('corner') && i.subtype !== 'wall_hood')!;
  const upper = stackAbove(lower, 320, 0, 40)!;
  const changed = applyProjectDimensions({ ...p, items: [...p.items, upper] }, { totalHeight: 270 });
  const lowerAfter = changed.items.find((i) => i.id === lower.id)!;
  const upperAfter = changed.items.find((i) => i.id === upper.id)!;
  assert.equal(lowerAfter.elevation + lowerAfter.height, upperAfter.elevation);
  assertTop(changed, 270);
});

test('dispenser has a real fixed-size niche, not a broom cabinet', () => {
  const p = generateMagic(spec(), { ...DEFAULT_MATERIALS });
  const cabinet = p.items.find((i) => i.subtype === 'tall_dispenser')!;
  assert.ok(cabinet);
  const device = dispenserSize(cabinet);
  const layout = housingLayout(cabinet, p.materials.board);
  const parts = generateParts(cabinet, p.materials);
  assert.ok(layout.shelfY > layout.bottom + device.height);
  assert.ok(parts.filter((part) => part.role === 'door').every((part) => part.box.y >= layout.shelfY));
  const taller = applyProjectDimensions(p, { totalHeight: 260 }).items.find((i) => i.id === cabinet.id)!;
  assert.deepEqual(dispenserSize(taller), device);
});

test('countertops stay at 60 cm and the L has perpendicular backsplash strips', () => {
  const p = generateMagic(spec(), { ...DEFAULT_MATERIALS });
  for (const slab of computeCountertops(p)) assert.equal(slab.rotation % 180 === 0 ? slab.h : slab.w, 60);
  const strips = computeBacksplashes(p);
  assert.ok(strips.some((s) => s.w > s.h));
  assert.ok(strips.some((s) => s.h > s.w));
});

test('optional materials and LED settings survive generation and serialization', () => {
  const p = generateMagic(spec(), { ...DEFAULT_MATERIALS, finishing: 'acp', board: 'mdf18', doorColor: '#43795d', countertopColor: 'white_marble' });
  const saved = JSON.parse(JSON.stringify(p)) as Project;
  assert.equal(saved.materials.doorColor, '#43795d');
  assert.equal(getColor(saved.materials.doorColor).hex, '#43795d');
  assert.equal(saved.settings.lighting?.under, true);
  assert.equal(saved.settings.lighting?.glow, true);
  const item = saved.items.find((i) => i.category === 'wall' && i.subtype !== 'wall_hood')!;
  const leds = cabinetLighting(item, saved, { left: 10 });
  let lightCount = 0;
  leds?.traverse((o) => { if ((o as { isRectAreaLight?: boolean }).isRectAreaLight) lightCount++; });
  assert.ok(lightCount > 0);
});

test('marble countertop colours exist and tints change lightness only', () => {
  for (const id of ['white_marble_soft', 'carrara', 'statuario', 'volakas', 'nero_marquina', 'emerald_marble']) {
    const c = getColor(id);
    assert.equal(c.texture, 'marble');
    assert.ok(c.hex.startsWith('#'));
  }
  const sum = (hex: string) => [1, 3, 5].reduce((n, i) => n + parseInt(hex.slice(i, i + 2), 16), 0);
  const sage = getColor('sage').hex;
  assert.ok(sum(adjustHex(sage, 25)) > sum(sage), 'positive tint must lighten');
  assert.ok(sum(adjustHex(sage, -25)) < sum(sage), 'negative tint must darken');
  assert.equal(adjustHex(sage, 0), sage);
  assert.ok(Math.abs(parseInt(adjustHex('#9caf88', 20).slice(1, 3), 16) - parseInt(sage.slice(1, 3), 16)) > 2);
});

test('tints survive generation and the lightened graphite really renders lighter', () => {
  const p = generateMagic(spec(), { ...DEFAULT_MATERIALS, doorColor: 'graphite', tints: { door: 18, carcass: -6, countertop: 0 } });
  const saved = JSON.parse(JSON.stringify(p)) as Project;
  assert.equal(saved.materials.tints?.door, 18);
  assert.equal(saved.materials.tints?.carcass, -6);
  assert.equal(saved.materials.tints?.countertop, 0);
  assert.equal(adjustHex(getColor('graphite').hex, 18) === getColor('graphite').hex, false);
});

test('sink and stove honour an explicit cm distance from the corner', () => {
  const s = spec('L');
  s.placement = { sink: { side: 'A', offset: 200, ref: 'end' }, stove: { side: 'B', offset: 150, ref: 'start' } };
  const p = generateMagic(s, { ...DEFAULT_MATERIALS });
  const sink = p.items.find((i) => i.subtype.startsWith('app_sink'))!;
  const stove = p.items.find((i) => i.subtype.startsWith('app_cooktop'))!;
  // side A of an L turns at its far end → measured back from the wall end
  assert.ok(Math.abs(p.room.width - (sink.x + sink.width / 2) - 200) < 1, `sink at ${p.room.width - (sink.x + sink.width / 2)} cm`);
  // side B starts at the junction
  assert.ok(Math.abs(stove.y + stove.width / 2 - 150) < 1, `stove at ${stove.y + stove.width / 2} cm`);
  const reported = magicStats(s).placement;
  assert.equal(reported.sink?.offset, 200);
  assert.equal(reported.stove?.offset, 150);
});

test('moving the requested offset moves the appliance, and a blocked position is nudged', () => {
  const s = spec('L');
  s.placement = { sink: { side: 'A', offset: 120, ref: 'end' } };
  const first = generateMagic(s, { ...DEFAULT_MATERIALS });
  const a = first.items.find((i) => i.subtype.startsWith('app_sink'))!;
  s.placement = { sink: { side: 'A', offset: 320, ref: 'end' } };
  const second = generateMagic(s, { ...DEFAULT_MATERIALS });
  const b = second.items.find((i) => i.subtype.startsWith('app_sink'))!;
  const fromCorner = (p: Project, i: Project['items'][number]) => p.room.width - (i.x + i.width / 2);
  assert.ok(Math.abs(fromCorner(first, a) - 120) < 1, `sink at ${fromCorner(first, a)} cm`);
  assert.ok(Math.abs(fromCorner(second, b) - 320) < 1, `sink at ${fromCorner(second, b)} cm`);
  assert.notEqual(a.x, b.x);
  // a request inside the fixed fridge tower cannot be honoured → nudged, not dropped
  const blocked = { ...s, placement: { sink: { side: 'A', offset: 545, ref: 'end' as const } } };
  assert.equal(generateMagic(blocked, { ...DEFAULT_MATERIALS }).items.filter((i) => i.subtype.startsWith('app_sink')).length, 1);
  assert.ok(magicStats(blocked).placement.sink);
});

test('overflow or impossible top height is rejected, not silently changed', () => {
  const narrow = spec();
  narrow.sides.A.length = 200;
  assert.ok(autoSpace(narrow, 'A') < 0);
  assert.throws(() => generateMagic(narrow, { ...DEFAULT_MATERIALS }), /melebihi/);
  const short = spec('L', 150);
  assert.throws(() => generateMagic(short, { ...DEFAULT_MATERIALS }), /Tinggi total/);
});