import type { Item, Part, Project } from '../models/types';
import { generateParts, hingesForDoor } from './parametric';
import { getBoard, HARDWARE, ACCESSORY_OPTIONS, MATERIALS } from '../config/materials';
import { computeCountertops, countertopAreaM2 } from './countertop';
import { r1 } from '../utils/geometry';
import { APPLIANCE_PRICES } from '../config/appliances';

export interface CuttingRow {
  cabinet: string;
  itemId: string;
  part: string;
  w: number;
  h: number;
  qty: number;
  thickness: number;
  material: string;
  edge: string;
  grain: string;
}

export interface MaterialSummary {
  material: string;
  name: string;
  thickness: number;
  partArea: number; // m2
  sheets: number;
  sheetArea: number;
  utilization: number;
  price: number;
}

export interface BOM {
  boards: MaterialSummary[];
  edgeBandingMeters: number;
  hinges: { id: string; name: string; qty: number; price: number }[];
  slides: { id: string; name: string; qty: number; price: number }[];
  handles: { id: string; name: string; qty: number; price: number }[];
  accessories: { id: string; name: string; qty: number; price: number }[];
  appliances: { name: string; qty: number; price: number }[];
  countertopM2: number;
  backsplashM2: number;
  runningMeters: number;
}

export function allParts(project: Project): Part[] {
  return project.items.flatMap((i) => generateParts(i, project.materials));
}

export function cuttingList(project: Project): CuttingRow[] {
  return allParts(project)
    .filter((p) => p.countInList !== false)
    .map((p) => ({
      cabinet: p.cabinetName,
      itemId: p.itemId,
      part: p.name,
      w: p.cutW,
      h: p.cutH,
      qty: p.qty,
      thickness: p.thickness * 10,
      material: p.material,
      edge: p.edgeBanding,
      grain: p.grain,
    }));
}

export function materialSummary(parts: Part[], wasteFactor = 1.15): MaterialSummary[] {
  const map = new Map<string, { area: number }>();
  for (const p of parts) {
    if (p.countInList === false) continue;
    const a = (p.cutW * p.cutH * p.qty) / 10000;
    const e = map.get(p.material) ?? { area: 0 };
    e.area += a;
    map.set(p.material, e);
  }
  return [...map.entries()].map(([id, v]) => {
    const b = getBoard(id);
    const sheetArea = (b.sheet.w * b.sheet.h) / 10000;
    const sheets = Math.ceil((v.area * wasteFactor) / sheetArea);
    return { material: id, name: b.name, thickness: b.thickness, partArea: r1(v.area * 100) / 100, sheets, sheetArea, utilization: sheets ? Math.round((v.area / (sheets * sheetArea)) * 100) : 0, price: sheets * b.price };
  });
}

function hwCount(items: Item[]) {
  let hinges = 0;
  let slides = 0;
  let handles = 0;
  for (const it of items) {
    if (it.kind !== 'cabinet') continue;
    const parts = generateParts(it, { board: 'ply18', backBoard: 'ply4' } as never);
    for (const p of parts) {
      if (p.role === 'door') {
        hinges += hingesForDoor(p.cutW);
        handles += 1;
      }
      if (p.role === 'drawer') {
        slides += 1;
        handles += 1;
      }
    }
  }
  return { hinges, slides, handles };
}

export function buildBOM(project: Project): BOM {
  const parts = allParts(project);
  const boards = materialSummary(parts);
  const edgeBandingMeters = r1(parts.reduce((s, p) => s + p.edgeMeters * p.qty, 0));
  const { hinges, slides, handles } = hwCount(project.items);
  const hinge = HARDWARE.hinges.find((h) => h.id === project.materials.hinge) ?? HARDWARE.hinges[0];
  const slide = HARDWARE.slides.find((s) => s.id === project.materials.slide) ?? HARDWARE.slides[0];
  const handle = HARDWARE.handles.types.find((h) => h.id === project.materials.handleType) ?? HARDWARE.handles.types[0];
  const accMap = new Map<string, number>();
  for (const it of project.items) for (const a of it.config.accessories) accMap.set(a, (accMap.get(a) ?? 0) + 1);
  const accessories = [...accMap.entries()].map(([id, qty]) => {
    const def = ACCESSORY_OPTIONS.find((a) => a.id === id);
    return { id, name: def?.name ?? id, qty, price: (def?.price ?? 0) * qty };
  });
  const appliances = project.items
    .filter((i) => i.kind === 'appliance')
    .map((i) => {
      const key = i.subtype.includes('sink_double') ? 'sink_double' : i.subtype.includes('sink_15') ? 'sink_one_half' : i.subtype.includes('sink') ? 'sink_single' : i.subtype.includes('cooktop_2') ? 'cooktop_2' : i.subtype.includes('cooktop_5') ? 'cooktop_5' : i.subtype.includes('cooktop') ? 'cooktop_4' : i.subtype.includes('hood') ? 'hood' : i.subtype.includes('oven') ? 'oven' : i.subtype.includes('micro') ? 'microwave' : i.subtype.includes('dish') ? 'dishwasher' : 'fridge';
      return { name: i.name, qty: 1, price: APPLIANCE_PRICES[key] ?? 0 };
    });
  const slabs = computeCountertops(project);
  const countertopM2 = r1(countertopAreaM2(slabs) * 100) / 100;
  const runningMeters = r1(project.items.filter((i) => i.kind === 'cabinet' && i.category !== 'wall').reduce((s, i) => s + i.width, 0) / 100);
  const backsplashM2 = project.materials.backsplash && project.type === 'kitchen' ? r1(runningMeters * (project.materials.backsplashHeight / 100) * 100) / 100 : 0;
  return {
    boards,
    edgeBandingMeters,
    hinges: [{ id: hinge.id, name: hinge.name, qty: hinges, price: hinges * hinge.price }],
    slides: [{ id: slide.id, name: slide.name, qty: slides, price: slides * slide.price }],
    handles: [{ id: handle.id, name: handle.name + ' (' + project.materials.handleFinish + ')', qty: handles, price: handles * handle.price }],
    accessories,
    appliances,
    countertopM2,
    backsplashM2,
    runningMeters,
  };
}

export function edgeBandingPrice(m: number) {
  return m * MATERIALS.edgeBandingPricePerM;
}
