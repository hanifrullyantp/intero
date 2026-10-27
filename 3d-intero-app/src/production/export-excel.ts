// 3D Intero — Export Excel HPP (SheetJS): ringkasan HPP, cutting list, hardware, timeline
import type { Item, PriceItem, ProjectSettings, Scenario } from '../types';
import type { HppResult, ProductionBundle } from './types';
import { resolvePrice } from './hpp';
import { sanitizeFilename } from '../lib/utils';

export interface HppExcelArgs { projectName: string; hpp: HppResult; scenario: Scenario; settings: ProjectSettings; bundle: ProductionBundle; items: Item[]; prices: PriceItem[] }
const cm = (mm: number) => Math.round(mm) / 10;

export async function exportHppExcel(a: HppExcelArgs) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const prod = a.settings.production;

  const sum: (string | number)[][] = [
    ['RINCIAN HPP — 3D Intero'], ['Proyek', a.projectName], ['Klien', prod.clientName || '-'], ['Skenario', a.scenario.name], ['Metode', a.scenario.method === 'papan_hpl' ? 'Papan + HPL' : 'Rangka + ACP'], ['Tanggal', new Date().toLocaleDateString('id-ID')], [],
    ['Bagian', 'Item', 'Qty', 'Satuan', 'Harga satuan (Rp)', 'Total (Rp)', 'Catatan'],
  ];
  for (const sec of a.hpp.sections) {
    for (const l of sec.lines) sum.push([sec.title, l.name, l.qty, l.unit, l.unitPrice, l.total, l.note ?? '']);
    if (sec.lines.length) sum.push([`Subtotal ${sec.title}`, '', '', '', '', sec.subtotal, '']);
  }
  sum.push([], ['SUBTOTAL HPP', '', '', '', '', a.hpp.subtotal], [`Margin ${a.hpp.margin}%`, '', '', '', '', a.hpp.marginAmount]);
  if (a.scenario.ppnOn) sum.push(['PPN 11%', '', '', '', '', a.hpp.ppnAmount]);
  sum.push(['TOTAL HARGA JUAL', '', '', '', '', a.hpp.total], [], ['Catatan proyek'], [prod.notes]);
  const ws1 = XLSX.utils.aoa_to_sheet(sum); ws1['!cols'] = [{ wch: 28 }, { wch: 40 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'HPP Summary');

  const cut: (string | number)[][] = [['ID', 'Kabinet', 'Panel', 'Panjang (cm)', 'Lebar (cm)', 'Tebal (mm)', 'Material', 'Serat', 'Tepi PVC (m)', 'Muka HPL', 'Catatan']];
  const noteById = new Map(a.items.map((i) => [i.id, i.config.note ?? '']));
  for (const p of a.bundle.panels) {
    const edge = ((p.edges.t ? p.w : 0) + (p.edges.b ? p.w : 0) + (p.edges.l ? p.h : 0) + (p.edges.r ? p.h : 0)) / 1000;
    cut.push([p.id, p.itemName, p.label, cm(p.h), cm(p.w), p.t, p.material, p.grain === 'h' ? 'searah panjang' : 'bebas', Math.round(edge * 100) / 100, p.hplFaces, noteById.get(p.itemId) ?? '']);
  }
  cut.push([], ['Ringkasan Nesting'], ['Material', 'Lembar', 'Waste (%)', 'Panel tak muat']);
  for (const n of a.bundle.nests) cut.push([n.material, n.sheets.length, Math.round(n.wastePct * 10) / 10, n.unplaced.length]);
  const ws2 = XLSX.utils.aoa_to_sheet(cut); ws2['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Cutting List');

  const hw: (string | number)[][] = [['Hardware', 'Qty', 'Satuan', 'Harga satuan (Rp)', 'Total (Rp)']];
  for (const h of a.bundle.hardware) { const pr = resolvePrice(a.prices, h.ref, a.scenario); if (pr) hw.push([pr.name, h.qty, pr.unit, pr.price, pr.price * h.qty]); }
  const seg: Record<string, number> = {};
  for (const sg of a.bundle.segments) seg[sg.profile] = (seg[sg.profile] ?? 0) + sg.length;
  if (Object.keys(seg).length) { hw.push([], ['Rangka hollow', 'Panjang total (m)']); for (const [k, v] of Object.entries(seg)) hw.push([k, Math.round(v) / 1000]); }
  const ws3 = XLSX.utils.aoa_to_sheet(hw); ws3['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Hardware');

  const tl: string[][] = [['Timeline Produksi (isi manual di aplikasi)']];
  for (const line of prod.timeline.split('\n')) tl.push([line]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tl), 'Timeline');
  XLSX.writeFile(wb, `${sanitizeFilename(a.projectName)}_HPP_${sanitizeFilename(a.scenario.name)}.xlsx`);
}
