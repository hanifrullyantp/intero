import { describe, expect, it } from 'vitest';
import { DEFAULT_LED, DEFAULT_MATERIALS, DEFAULT_SETTINGS } from '../src/lib/constants';
import { briefToWizardInput, DEFAULT_ROOM_BRIEF } from '../src/ai/room-brief';
import { generateLayout } from '../src/engine/layout-generator';
import { buildProduction } from '../src/production';
import { nestPanels } from '../src/production/nesting';
import { autoHppRows } from '../src/production/hpp2';
import { panelLabelRows } from '../src/production/labels';
import type { NewItemInput } from '../src/store';
import type { Item, Panel, Scenario } from '../src/types';

function asItem(n: NewItemInput, i: number): Item {
  return {
    id: n.id ?? `cab-${i}`, name: n.name ?? n.type, type: n.type, wallId: n.wallId ?? null, orderIndex: n.orderIndex ?? i,
    position: n.position ?? { x: 0, y: 0, z: 0 }, rotationY: n.rotationY ?? 0, dims: n.dims,
    materials: { ...DEFAULT_MATERIALS, ...n.materials }, config: { ...n.config }, led: { ...DEFAULT_LED, ...n.led },
    visible: true, locked: false, colorLabel: null, createdAt: '',
  };
}

function piece(w: number, h: number): Panel {
  return {
    id: `p-${w}x${h}`, code: 'SL', itemId: 'i', itemTag: 'BC01', itemName: 'Base', label: 'Side', kind: 'side',
    w, h, t: 18, material: 'ply18', qty: 1, grain: 'none', hplFaces: 0, edges: { t: false, b: false, l: false, r: false },
  };
}

const papan: Scenario = { id: 'p', name: 'Papan', method: 'papan_hpl', margin: 30, ppnOn: true, slots: {} };
const rangka: Scenario = { ...papan, id: 'r', name: 'Rangka', method: 'rangka_acp' };

describe('produksi', () => {
  const layout = generateLayout(briefToWizardInput({ ...DEFAULT_ROOM_BRIEF, island: true }), DEFAULT_SETTINGS);
  const items = layout.items.map(asItem);
  const settings = DEFAULT_SETTINGS;

  it('luas terpakai ditambah sisa sama dengan luas lembar', () => {
    const nest = nestPanels('ply18', [piece(400, 700), piece(600, 800)]);
    const offcut = nest.sheets.reduce((sum, sheet) => sum + sheet.offcutMm2, 0);
    expect(nest.usedArea + offcut).toBe(nest.sheets.length * nest.sheetW * nest.sheetH);
    expect(nest.sheets[0].placements[0].x).toBeGreaterThanOrEqual(10);
    expect(nest.unplaced).toHaveLength(0);
  });

  it('panel sebesar lembar utuh tidak muat karena margin tepi', () => {
    const nest = nestPanels('ply18', [piece(1220, 2440)]);
    expect(nest.sheets).toHaveLength(0);
    expect(nest.unplaced).toHaveLength(1);
  });

  it('dapur L dengan island: papan tidak membeli hollow, rangka memakai batang, meja masuk RAB', () => {
    const board = buildProduction(items, settings, 'papan_hpl');
    const steel = buildProduction(items, settings, 'rangka_acp');
    const boardRows = autoHppRows(items, layout.walls, settings, board, [], papan);
    const steelRows = autoHppRows(items, layout.walls, settings, steel, [], rangka);
    expect(board.panels.length).toBeGreaterThan(0);
    expect(board.nests.some((n) => n.sheets.length > 0)).toBe(true);
    expect(boardRows.some((r) => r.cat === 'Rangka')).toBe(false);
    expect(steelRows.some((r) => r.cat === 'Rangka')).toBe(true);
    expect(boardRows.some((r) => r.name.includes('Granit'))).toBe(true);
    expect(boardRows.some((r) => r.name.includes('Rak gas'))).toBe(true);
    expect(boardRows.some((r) => r.name === 'Rak Sendok L' && r.estVol > 1)).toBe(false);
    const labels = panelLabelRows(board.panels);
    expect(labels[0][0]).toBe('Kode');
    expect(labels.length).toBe(board.panels.length + 1);
  });
});
