// 3D Intero — Ekspor dimensi: CSV + Technical Drawing PDF (A3 landscape: Plan, Front, Side)
import type { DimUnit, Item, ProjectSettings, Wall } from '../types';
import { computeSummary, fmtLen, footprint } from './compute';
import { downloadBlob, sanitizeFilename } from '../lib/utils';
import { wallVec } from '../engine/walls';

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function exportDimensionsCsv(projectName: string, items: Item[], walls: Wall[], s: ProjectSettings, unit: DimUnit, dec: number) {
  const sum = computeSummary(items, walls, s, unit, dec);
  const f = (mm: number) => fmtLen(mm, unit, dec);
  const rows: (string | number)[][] = [['Bagian', 'Nama', 'Lebar', 'Tinggi', 'Dalam / Nilai']];
  rows.push(['Keseluruhan', 'Total', f(sum.overall.w), f(sum.overall.h), f(sum.overall.d)]);
  rows.push(['Keseluruhan', 'Luas area (m²)', '', '', sum.overall.area.toFixed(2)]);
  for (const w of sum.walls) rows.push(['Dinding', w.name, f(w.length), '', `${w.items} komponen`]);
  for (const c of sum.cabinets) rows.push(['Kabinet', `${c.tag} ${c.name}`, f(c.w), f(c.h), f(c.d)]);
  for (const v of sum.vertical) rows.push(['Vertikal', v.label, '', '', f(v.value)]);
  for (const c of sum.clearance) rows.push(['Clearance', c.text, '', '', c.warn ? 'PERINGATAN' : 'OK']);
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  downloadBlob(`${sanitizeFilename(projectName)}_dimensi.csv`, new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
}

type Pt = [number, number];
interface Shape { pts: Pt[] }
interface DimSeg { a: Pt; b: Pt; off: Pt; text: string }

export async function exportTechnicalDrawing(projectName: string, items: Item[], walls: Wall[], s: ProjectSettings, unit: DimUnit, dec: number, logo: string | null) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const PW = 420, PH = 297, M = 10, TB = 30;
  const f = (mm: number) => fmtLen(mm, unit, dec);
  const vis = items.filter((i) => i.visible);
  doc.setDrawColor(30); doc.setLineWidth(0.5); doc.rect(M, M, PW - 2 * M, PH - 2 * M);
  doc.setLineWidth(0.3); doc.line(M, PH - M - TB, PW - M, PH - M - TB);

  // Title block
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17, 24, 39);
  doc.text(`Technical Drawing — ${projectName}`, M + 8, PH - M - TB + 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(75, 85, 99);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}   ·   Satuan: ${unit}   ·   Tinggi total: ${f(s.globalCabinetHeight)}   ·   Countertop: ${f(s.baseHeight + s.countertop.thickness)}`, M + 8, PH - M - TB + 18);
  doc.text('Legend: tampak atas (Plan), tampak depan (Front), tampak samping kanan (Side). Garis dimensi mengikuti satuan di atas.', M + 8, PH - M - TB + 24);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(27, 157, 107);
  doc.text('3D Intero', PW - M - 8, PH - M - TB + 11, { align: 'right' });
  if (logo) { try { doc.addImage(logo, logo.includes('image/png') ? 'PNG' : 'JPEG', PW - M - 52, PH - M - TB + 13, 14, 14); } catch { /* logo tidak valid */ } }

  if (!vis.length) { doc.setTextColor(120); doc.text('Belum ada komponen.', PW / 2, PH / 2, { align: 'center' }); doc.save(`${sanitizeFilename(projectName)}_technical-drawing.pdf`); return; }

  const pts = vis.flatMap(footprint);
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minZ = Math.min(...pts.map((p) => p.z)), maxZ = Math.max(...pts.map((p) => p.z));
  const H = Math.max(...vis.map((i) => i.position.y + i.dims.h));
  const area = { x: M + 4, y: M + 4, w: PW - 2 * M - 8, h: PH - 2 * M - TB - 8 };
  const leftW = area.w * 0.54;

  const plan: Shape[] = vis.map((i) => ({ pts: footprint(i).map((p) => [p.x, p.z] as Pt) }));
  const front: Shape[] = vis.map((i) => { const fp = footprint(i); const x0 = Math.min(...fp.map((p) => p.x)), x1 = Math.max(...fp.map((p) => p.x)); return { pts: [[x0, -i.position.y], [x1, -i.position.y], [x1, -(i.position.y + i.dims.h)], [x0, -(i.position.y + i.dims.h)]] as Pt[] }; });
  const side: Shape[] = vis.map((i) => { const fp = footprint(i); const z0 = Math.min(...fp.map((p) => p.z)), z1 = Math.max(...fp.map((p) => p.z)); return { pts: [[-z1, -i.position.y], [-z0, -i.position.y], [-z0, -(i.position.y + i.dims.h)], [-z1, -(i.position.y + i.dims.h)]] as Pt[] }; });

  const drawView = (box: { x: number; y: number; w: number; h: number }, title: string, shapes: Shape[], dims: DimSeg[], extra?: (map: (p: Pt) => Pt, scale: number) => void) => {
    const all = shapes.flatMap((sh) => sh.pts);
    const bx0 = Math.min(...all.map((p) => p[0])), bx1 = Math.max(...all.map((p) => p[0])), by0 = Math.min(...all.map((p) => p[1])), by1 = Math.max(...all.map((p) => p[1]));
    const bw = Math.max(1, bx1 - bx0), bh = Math.max(1, by1 - by0);
    const pad = 30; const scale = Math.min((box.w - 2 * pad) / bw, (box.h - 2 * pad - 8) / bh);
    const ox = box.x + (box.w - bw * scale) / 2, oy = box.y + 8 + (box.h - 8 - bh * scale) / 2;
    const map = (p: Pt): Pt => [ox + (p[0] - bx0) * scale, oy + (p[1] - by0) * scale];
    doc.setDrawColor(200); doc.setLineWidth(0.2); doc.rect(box.x, box.y, box.w, box.h);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 24, 39); doc.text(title, box.x + 4, box.y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(107, 114, 128); doc.text(`Skala ± 1:${Math.round(1 / scale)}`, box.x + box.w - 4, box.y + 6, { align: 'right' });
    doc.setDrawColor(30); doc.setLineWidth(0.25); doc.setFillColor(236, 240, 244);
    for (const sh of shapes) {
      const m = sh.pts.map(map);
      const rel: [number, number][] = m.slice(1).map((p, k) => [p[0] - m[k][0], p[1] - m[k][1]] as [number, number]);
      doc.lines(rel, m[0][0], m[0][1], [1, 1], 'FD', true);
    }
    doc.setFontSize(7.5);
    for (const d of dims) {
      const a = map(d.a), b = map(d.b); const o = d.off;
      const a2: Pt = [a[0] + o[0], a[1] + o[1]], b2: Pt = [b[0] + o[0], b[1] + o[1]];
      doc.setDrawColor(90); doc.setLineWidth(0.15); doc.line(a[0], a[1], a2[0] + Math.sign(o[0]) * 1.5, a2[1] + Math.sign(o[1]) * 1.5); doc.line(b[0], b[1], b2[0] + Math.sign(o[0]) * 1.5, b2[1] + Math.sign(o[1]) * 1.5);
      doc.setDrawColor(20); doc.setLineWidth(0.25); doc.line(a2[0], a2[1], b2[0], b2[1]);
      for (const t of [a2, b2]) doc.line(t[0] - 1.2, t[1] + 1.2, t[0] + 1.2, t[1] - 1.2);
      const mx = (a2[0] + b2[0]) / 2, my = (a2[1] + b2[1]) / 2; const vertical = Math.abs(a2[0] - b2[0]) < 0.01;
      doc.setTextColor(17, 24, 39);
      if (vertical) doc.text(d.text, mx - 1.5, my, { angle: 90, align: 'center' }); else doc.text(d.text, mx, my - 1.5, { align: 'center' });
    }
    extra?.(map, scale);
  };

  // PLAN
  const planBox = { x: area.x, y: area.y, w: leftW - 2, h: area.h };
  const planDims: DimSeg[] = [
    { a: [minX, maxZ], b: [maxX, maxZ], off: [0, 12], text: f(maxX - minX) },
    { a: [maxX, minZ], b: [maxX, maxZ], off: [12, 0], text: f(maxZ - minZ) },
  ];
  for (const w of walls) { const v = wallVec(w); if (Math.abs(w.start.z - w.end.z) < 1) planDims.push({ a: [w.start.x, w.start.z], b: [w.end.x, w.end.z], off: [0, -9], text: `${w.name.replace('Dinding ', '')} ${f(v.length)}` }); else planDims.push({ a: [w.start.x, w.start.z], b: [w.end.x, w.end.z], off: [-9, 0], text: `${w.name.replace('Dinding ', '')} ${f(v.length)}` }); }
  drawView(planBox, 'PLAN — Tampak Atas', plan, planDims, (map, scale) => {
    // scale bar 1 m + north arrow
    const x0 = planBox.x + 8, y0 = planBox.y + planBox.h - 8; const len = 1000 * scale;
    doc.setDrawColor(20); doc.setLineWidth(0.4); doc.line(x0, y0, x0 + len, y0); doc.line(x0, y0 - 1.5, x0, y0 + 1.5); doc.line(x0 + len, y0 - 1.5, x0 + len, y0 + 1.5);
    doc.setFontSize(7); doc.setTextColor(17, 24, 39); doc.text('1 m', x0 + len / 2, y0 - 2, { align: 'center' });
    const nx = planBox.x + planBox.w - 14, ny = planBox.y + 22;
    doc.setFillColor(17, 24, 39); doc.triangle(nx, ny - 9, nx - 3.5, ny, nx + 3.5, ny, 'F'); doc.text('U', nx, ny + 5, { align: 'center' });
    void map;
  });
  // FRONT
  const rx = area.x + leftW + 2, rw = area.w - leftW - 2, rh = area.h / 2 - 1;
  drawView({ x: rx, y: area.y, w: rw, h: rh }, 'FRONT — Tampak Depan', front, [
    { a: [minX, 0], b: [maxX, 0], off: [0, 10], text: f(maxX - minX) },
    { a: [minX, 0], b: [minX, -H], off: [-10, 0], text: f(H) },
    { a: [maxX, -s.baseHeight], b: [maxX, -(s.baseHeight + s.countertop.thickness)], off: [8, 0], text: `CT ${f(s.baseHeight + s.countertop.thickness)}` },
  ]);
  // SIDE
  drawView({ x: rx, y: area.y + rh + 2, w: rw, h: rh }, 'SIDE — Tampak Samping Kanan', side, [
    { a: [-maxZ, 0], b: [-minZ, 0], off: [0, 10], text: f(maxZ - minZ) },
    { a: [-maxZ, 0], b: [-maxZ, -H], off: [-10, 0], text: f(H) },
  ]);
  doc.save(`${sanitizeFilename(projectName)}_technical-drawing.pdf`);
}
