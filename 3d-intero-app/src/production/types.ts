// 3D Intero — Tipe data Mode Produksi (semua dimensi mm kecuali dinyatakan lain)
import type { ProdMethod, V3 } from '../types';

export type PanelMaterial = 'ply18' | 'ply15' | 'hdf5' | 'acp4';
export type PanelKind = 'side' | 'top' | 'bottom' | 'back' | 'shelf' | 'door' | 'drawer' | 'drawerbox' | 'toe' | 'other';
/** Kotak 3D panel dalam frame lokal item (pusat-x, bawah-y, depan = +z). */
export interface PanelBox { cx: number; cy: number; cz: number; sx: number; sy: number; sz: number }
export interface Edges { t: boolean; b: boolean; l: boolean; r: boolean }

export interface Panel {
  id: string; code: string; itemId: string; itemTag: string; itemName: string; label: string; kind: PanelKind;
  w: number; h: number; t: number; material: PanelMaterial; qty: number;
  /** 'h' = serat/motif HPL searah sisi h (tidak boleh diputar saat nesting). */
  grain: 'none' | 'h';
  hplFaces: number; edges: Edges; box?: PanelBox;
}

export type Profile = '40x40' | '20x20';
export interface Segment { id: string; itemId: string; itemTag: string; profile: Profile; a: V3; b: V3; length: number; virtual?: boolean }

export interface Placement { panelId: string; code: string; itemTag: string; x: number; y: number; w: number; h: number; rotated: boolean }
export interface Sheet { index: number; placements: Placement[] }
export interface NestResult {
  material: PanelMaterial; sheetW: number; sheetH: number; sheets: Sheet[]; usedArea: number; wastePct: number; unplaced: Panel[];
}

export interface ItemProduction { itemId: string; tag: string; method: ProdMethod; panels: Panel[]; segments: Segment[]; joints: V3[] }
export interface HwLine { ref: string; qty: number }

export interface ProductionBundle {
  items: ItemProduction[]; panels: Panel[]; segments: Segment[]; joints: { itemId: string; p: V3 }[];
  nests: NestResult[]; edgeMeters: number; hplAreaM2: number; acpAreaM2: number;
  frameLen: Record<Profile, number>; frameSurfaceM2: number; hardware: HwLine[]; tags: Record<string, string>;
}

export interface HppLine { key: string; name: string; qty: number; unit: string; unitPrice: number; total: number; note?: string; custom?: boolean; customId?: string }
export interface HppSection { id: string; title: string; lines: HppLine[]; subtotal: number }
export interface HppResult {
  sections: HppSection[]; subtotal: number; margin: number; marginAmount: number; ppnAmount: number; total: number;
  stats: { cabinets: number; sheets: Record<string, number>; wastePct: Record<string, number>; hplAreaM2: number; frameMeters: number };
}
