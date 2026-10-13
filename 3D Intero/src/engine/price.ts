import type { Project } from '../models/types';
import { buildBOM, edgeBandingPrice, type BOM } from './cuttingList';
import { getCountertop, getFinishing } from '../config/materials';

export interface PriceBreakdown {
  bom: BOM;
  boards: number;
  finishing: number;
  edgeBanding: number;
  hardware: number;
  accessories: number;
  countertop: number;
  backsplash: number;
  appliances: number;
  materialTotal: number;
  labor: number;
  subtotal: number;
  markup: number;
  total: number;
  perRunningMeter: number;
}

export function estimatePrice(project: Project, opts?: { laborRate?: number; markup?: number }): PriceBreakdown {
  const bom = buildBOM(project);
  const laborRate = opts?.laborRate ?? project.settings.laborRate;
  const markupPct = opts?.markup ?? project.settings.markup;
  const boards = bom.boards.reduce((s, b) => s + b.price, 0);
  const fin = getFinishing(project.materials.finishing);
  // finishing applied on exposed faces ≈ 1.6 × front area; approximate from part areas of 18mm board
  const frontArea = bom.boards.filter((b) => b.thickness >= 15).reduce((s, b) => s + b.partArea, 0) * 0.9;
  const finishing = frontArea * fin.pricePerM2;
  const edgeBanding = edgeBandingPrice(bom.edgeBandingMeters);
  const hardware = [...bom.hinges, ...bom.slides, ...bom.handles].reduce((s, h) => s + h.price, 0);
  const accessories = bom.accessories.reduce((s, a) => s + a.price, 0);
  const ct = getCountertop(project.materials.countertop);
  const countertop = bom.countertopM2 * ct.price_per_m2;
  const backsplash = bom.backsplashM2 * ct.price_per_m2 * 0.8;
  const appliances = bom.appliances.reduce((s, a) => s + a.price, 0);
  const materialTotal = boards + finishing + edgeBanding + hardware + accessories + countertop + backsplash;
  const labor = bom.runningMeters * laborRate;
  const subtotal = materialTotal + labor;
  const markup = subtotal * (markupPct / 100);
  const total = subtotal + markup + appliances;
  return {
    bom,
    boards,
    finishing,
    edgeBanding,
    hardware,
    accessories,
    countertop,
    backsplash,
    appliances,
    materialTotal,
    labor,
    subtotal,
    markup,
    total,
    perRunningMeter: bom.runningMeters > 0 ? (total - appliances) / bom.runningMeters : 0,
  };
}
