// 3D Intero — I/O tabel HPP: PDF (kop surat), Excel (SheetJS), import CSV/Excel.
import type { CatalogItem, HppRow, ProjectSettings } from '../types';
import { hppTotals, rowEst, rowReal } from './hpp2';
import { fmtRp } from './hpp';
import { downloadBlob, pickFile, sanitizeFilename, uid } from '../lib/utils';

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
const HEAD = ['No', 'Nama Item', 'Kategori', 'Spesifikasi', 'Satuan', 'Est Vol', 'Est Harga', 'Est Total', 'Real Vol', 'Real Harga', 'Real Total', 'Selisih', 'Progress %', 'Supplier', 'Catatan'];

export function rowsToAoa(rows: HppRow[]): (string | number)[][] {
  const aoa: (string | number)[][] = [HEAD];
  rows.forEach((r, i) => {
    const est = rowEst(r), real = rowReal(r);
    aoa.push([i + 1, r.name, r.cat, r.spec, r.unit, r.estVol, r.estPrice, est, r.realVol ?? '', r.realPrice ?? '', real ?? '', real == null ? '' : real - est, r.progress, r.supplier, r.note]);
  });
  return aoa;
}

export function exportRowsCsv(projectName: string, rows: HppRow[]) {
  const csv = rowsToAoa(rows).map((r) => r.map(cell).join(',')).join('\n');
  downloadBlob(`${sanitizeFilename(projectName)}_hpp.csv`, new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
}

export async function exportRowsXlsx(projectName: string, rows: HppRow[], settings: ProjectSettings, margin: number, ppnOn: boolean) {
  const XLSX = await import('xlsx');
  const t = hppTotals(rows, margin, ppnOn);
  const head: (string | number)[][] = [['HPP CALCULATOR — 3D Intero'], ['Proyek', projectName], ['Klien', settings.production.clientName || '-'], ['Tanggal', new Date().toLocaleDateString('id-ID')], [], HEAD];
  const body = rowsToAoa(rows).slice(1);
  const tail: (string | number)[][] = [[], ['Total Estimasi', '', '', '', '', '', '', t.estTotal], ['Total Realisasi', '', '', '', '', '', '', t.hasReal ? t.realTotal : ''], ['Selisih', '', '', '', '', '', '', t.hasReal ? t.diff : ''], [`Margin ${margin}%`, '', '', '', '', '', '', t.sellEst], ['PPN 11%', '', '', '', '', '', '', t.ppn], ['TOTAL HARGA JUAL', '', '', '', '', '', '', t.sellFinal], [], ['Catatan proyek'], [settings.production.notes]];
  const ws = XLSX.utils.aoa_to_sheet([...head, ...body, ...tail]);
  ws['!cols'] = [{ wch: 5 }, { wch: 38 }, { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 9 }, { wch: 12 }, { wch: 13 }, { wch: 9 }, { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 24 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'HPP');
  const cut: (string | number)[][] = [['Panel', 'Kabinet', 'Panjang (cm)', 'Lebar (cm)', 'Tebal (mm)', 'Material']];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cut), 'Catatan');
  XLSX.writeFile(wb, `${sanitizeFilename(projectName)}_hpp.xlsx`);
}

export async function exportRowsPdf(a: { projectName: string; rows: HppRow[]; settings: ProjectSettings; margin: number; ppnOn: boolean; logo: string | null; scenario: string }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, M = 12, R = PW - M; let y = M, page = 1;
  const prod = a.settings.production;
  const t = hppTotals(a.rows, a.margin, a.ppnOn);
  const footer = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 156, 165); doc.text('Dibuat dengan 3D Intero', PW / 2, PH - 7, { align: 'center' }); doc.text(`Hal. ${page}`, R, PH - 7, { align: 'right' }); };
  const PH = 297;
  const ensure = (h: number) => { if (y + h > PH - 14) { footer(); doc.addPage(); page += 1; y = M; } };
  if (a.logo) { try { doc.addImage(a.logo, a.logo.includes('image/png') ? 'PNG' : 'JPEG', M, y, 20, 20); } catch { /* logo rusak */ } }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17, 24, 39);
  doc.text('RINCIAN HPP — ESTIMASI vs REALISASI', a.logo ? M + 26 : M, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(75, 85, 99);
  doc.text(`Proyek: ${a.projectName}   ·   Skenario: ${a.scenario}`, a.logo ? M + 26 : M, y + 14);
  doc.text(`Klien: ${prod.clientName || '-'}   ·   Tanggal: ${new Date().toLocaleDateString('id-ID')}`, a.logo ? M + 26 : M, y + 19);
  y += 25; doc.setDrawColor(27, 157, 107); doc.setLineWidth(0.6); doc.line(M, y, R, y); y += 5;
  const col = { no: M + 2, name: M + 10, cat: 96, unit: 118, vol: 132, est: 152, real: 174, sel: R - 2 };
  const drawHead = () => { ensure(8); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255); doc.setFillColor(17, 24, 39); doc.rect(M, y, R - M, 6, 'F'); doc.text('Item', col.name, y + 4); doc.text('Kat.', col.cat, y + 4); doc.text('Sat', col.unit, y + 4); doc.text('Vol', col.vol, y + 4, { align: 'right' }); doc.text('Est', col.est, y + 4, { align: 'right' }); doc.text('Real', col.real, y + 4, { align: 'right' }); doc.text('Selisih', col.sel, y + 4, { align: 'right' }); y += 7; };
  drawHead();
  doc.setFont('helvetica', 'normal');
  a.rows.forEach((r, i) => {
    ensure(6);
    if (i && i % 34 === 0) { drawHead(); doc.setFont('helvetica', 'normal'); }
    const real = rowReal(r);
    doc.setFontSize(7.6); doc.setTextColor(31, 41, 55);
    doc.text(String(i + 1), col.no, y);
    doc.text(doc.splitTextToSize(r.name, 80)[0], col.name, y);
    doc.text(r.cat.slice(0, 10), col.cat, y);
    doc.text(r.unit, col.unit, y);
    doc.text(String(r.estVol), col.vol, y, { align: 'right' });
    doc.text(fmtRp(rowEst(r)).replace('Rp ', ''), col.est, y, { align: 'right' });
    doc.text(real == null ? '-' : fmtRp(real).replace('Rp ', ''), col.real, y, { align: 'right' });
    if (real != null) { const d = real - rowEst(r); doc.setTextColor(d <= 0 ? 22 : 200, d <= 0 ? 130 : 40, d <= 0 ? 100 : 40); doc.text(`${d <= 0 ? '' : '+'}${fmtRp(d).replace('Rp ', '')}`, col.sel, y, { align: 'right' }); doc.setTextColor(31, 41, 55); }
    else doc.text('-', col.sel, y, { align: 'right' });
    y += 4.6;
  });
  ensure(40); y += 4;
  doc.setDrawColor(17, 24, 39); doc.setLineWidth(0.5); doc.line(M, y, R, y); y += 6;
  const row = (l: string, v: string, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 10); doc.setTextColor(bold ? 17 : 55, bold ? 24 : 65, bold ? 39 : 81); doc.text(l, M + 2, y); doc.text(v, col.sel, y, { align: 'right' }); y += bold ? 8 : 6; };
  row('Total Estimasi', fmtRp(t.estTotal));
  row('Total Realisasi', t.hasReal ? `${fmtRp(t.realTotal)} (${t.diff >= 0 ? '+' : ''}${t.diffPct.toFixed(2)}%)` : 'belum diisi');
  if (t.hasReal) row('Selisih', `${t.diff <= 0 ? '' : '+'}${fmtRp(t.diff)}`);
  row(`Margin ${a.margin}% → Harga Jual`, fmtRp(t.sellEst));
  if (a.ppnOn) row('PPN 11%', fmtRp(t.ppn));
  row('TOTAL AKHIR', fmtRp(t.sellFinal), true);
  if (prod.notes.trim()) { ensure(18); y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 24, 39); doc.text('Catatan', M, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(75, 85, 99); for (const ln of doc.splitTextToSize(prod.notes, R - M) as string[]) { ensure(5); doc.text(ln, M, y); y += 4.5; } }
  ensure(30); y += 12;
  doc.setDrawColor(120); doc.setLineWidth(0.3); doc.line(M + 6, y + 16, M + 66, y + 16); doc.line(R - 66, y + 16, R - 6, y + 16);
  doc.setFontSize(9); doc.setTextColor(75, 85, 99); doc.text('Desainer', M + 36, y + 21, { align: 'center' }); doc.text(prod.clientName ? `Klien — ${prod.clientName}` : 'Klien', R - 36, y + 21, { align: 'center' });
  footer();
  doc.save(`${sanitizeFilename(a.projectName)}_hpp.pdf`);
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
const num = (v: string | undefined) => { const n = Number(String(v ?? '').replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

export async function importRows(mode: 'rows' | 'catalog'): Promise<{ rows: HppRow[] } | { catalog: CatalogItem[] } | null> {
  const f = await pickFile('.csv,.xlsx,.xls', true);
  if (!f) return null;
  let grid: string[][];
  try {
    if (/\.csv$/i.test(f.name)) grid = parseCsvText(new TextDecoder().decode(f.data as ArrayBuffer));
    else { const XLSX = await import('xlsx'); const wb = XLSX.read(f.data as ArrayBuffer, { type: 'array' }); grid = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false }) as string[][]; }
  } catch { throw new Error('File tidak dapat dibaca'); }
  if (grid.length < 2) throw new Error('File kosong atau tanpa baris data');
  const head = grid[0].map((h) => h.trim().toLowerCase());
  const ix = (k: string) => head.indexOf(k);
  const out: { rows: HppRow[]; catalog: CatalogItem[] } = { rows: [], catalog: [] };
  for (const g of grid.slice(1)) {
    const name = (g[ix('name')] ?? g[ix('nama item')] ?? g[1] ?? '').trim();
    if (!name) continue;
    const catv = (g[ix('kategori')] ?? g[ix('cat')] ?? 'Material').trim();
    const unit = (g[ix('satuan')] ?? g[ix('unit')] ?? 'pcs').trim();
    const price = num(g[ix('harga')] ?? g[ix('est harga')] ?? g[ix('price')]);
    if (mode === 'catalog') { out.catalog.push({ id: uid('CT'), cat: catv, name, unit, price, supplier: (g[ix('supplier')] ?? '').trim(), spec: (g[ix('spesifikasi')] ?? g[ix('spec')] ?? '').trim() }); continue; }
    out.rows.push({ id: uid('HR'), name, cat: catv, spec: (g[ix('spesifikasi')] ?? g[ix('spec')] ?? '').trim(), unit, estVol: num(g[ix('est vol')] ?? g[ix('vol')] ?? '1') || 1, estPrice: price, realVol: null, realPrice: null, progress: 0, supplier: (g[ix('supplier')] ?? '').trim(), note: (g[ix('catatan')] ?? '').trim() });
  }
  if (mode === 'catalog') return out.catalog.length ? { catalog: out.catalog } : null;
  return out.rows.length ? { rows: out.rows } : null;
}
