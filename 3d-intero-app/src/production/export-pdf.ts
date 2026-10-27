// 3D Intero — Export PDF HPP (jsPDF): header bisnis, thumbnail, breakdown, tanda tangan, T&C, watermark
import type { ProjectSettings, Scenario } from '../types';
import type { HppResult } from './types';
import { fmtRp } from './hpp';
import { sanitizeFilename } from '../lib/utils';

export interface HppPdfArgs { projectName: string; hpp: HppResult; scenario: Scenario; settings: ProjectSettings; thumb: string | null; logo: string | null }

export async function exportHppPdf(a: HppPdfArgs) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, M = 14, R = PW - M;
  let y = M; let page = 1;
  const prod = a.settings.production;

  const footer = () => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 156, 165);
    doc.text('Dibuat dengan 3D Intero', PW / 2, PH - 8, { align: 'center' });
    doc.text(`Hal. ${page}`, R, PH - 8, { align: 'right' });
  };
  const ensure = (h: number) => { if (y + h > PH - 16) { footer(); doc.addPage(); page += 1; y = M; } };

  // Header
  if (a.logo) { try { doc.addImage(a.logo, a.logo.includes('image/png') ? 'PNG' : 'JPEG', M, y, 22, 22); } catch { /* abaikan logo rusak */ } }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(17, 24, 39);
  doc.text('RINCIAN HPP & PENAWARAN', a.logo ? M + 28 : M, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(75, 85, 99);
  doc.text(`Proyek: ${a.projectName}`, a.logo ? M + 28 : M, y + 15);
  doc.text(`Klien: ${prod.clientName || '-'}   ·   Skenario: ${a.scenario.name}   ·   Tanggal: ${new Date().toLocaleDateString('id-ID')}`, a.logo ? M + 28 : M, y + 21);
  y += 28;
  doc.setDrawColor(27, 157, 107); doc.setLineWidth(0.6); doc.line(M, y, R, y); y += 5;

  if (a.thumb) { try { doc.addImage(a.thumb, 'JPEG', M, y, 100, 66); doc.setFontSize(9); doc.setTextColor(107, 114, 128); doc.text(`Metode: ${a.scenario.method === 'papan_hpl' ? 'Papan + HPL' : 'Rangka besi + ACP'}`, M + 106, y + 6); doc.text(`Jumlah kabinet: ${a.hpp.stats.cabinets}`, M + 106, y + 12); y += 70; } catch { /* thumbnail rusak */ } }

  // Tabel
  const colQ = 118, colP = 160, colT = R;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255); doc.setFillColor(17, 24, 39);
  ensure(8); doc.rect(M, y, R - M, 6.5, 'F');
  doc.text('Item', M + 2, y + 4.5); doc.text('Qty', colQ, y + 4.5, { align: 'right' }); doc.text('Harga satuan', colP, y + 4.5, { align: 'right' }); doc.text('Total', colT - 2, y + 4.5, { align: 'right' });
  y += 9;
  for (const sec of a.hpp.sections) {
    if (!sec.lines.length) continue;
    ensure(14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(27, 157, 107); doc.text(sec.title.toUpperCase(), M, y); y += 4.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(31, 41, 55);
    for (const l of sec.lines) {
      ensure(6);
      const name = doc.splitTextToSize(l.name + (l.note ? ` (${l.note})` : ''), 84) as string[];
      doc.text(name[0], M + 2, y);
      doc.text(`${l.qty} ${l.unit}`, colQ, y, { align: 'right' });
      doc.text(fmtRp(l.unitPrice), colP, y, { align: 'right' });
      doc.text(fmtRp(l.total), colT - 2, y, { align: 'right' });
      y += 4.8;
    }
    doc.setFont('helvetica', 'bold'); doc.setDrawColor(210); doc.setLineWidth(0.2); doc.line(M, y - 2.5, R, y - 2.5);
    doc.text(`Subtotal ${sec.title}`, M + 2, y + 1); doc.text(fmtRp(sec.subtotal), colT - 2, y + 1, { align: 'right' }); y += 8;
  }
  ensure(34);
  doc.setDrawColor(17, 24, 39); doc.setLineWidth(0.5); doc.line(M, y, R, y); y += 6;
  const row = (label: string, val: string, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 10); doc.setTextColor(bold ? 17 : 55, bold ? 24 : 65, bold ? 39 : 81); doc.text(label, M + 2, y); doc.text(val, colT - 2, y, { align: 'right' }); y += bold ? 8 : 6; };
  row('SUBTOTAL HPP', fmtRp(a.hpp.subtotal));
  row(`Margin keuntungan ${a.hpp.margin}%`, fmtRp(a.hpp.marginAmount));
  if (a.scenario.ppnOn) row('PPN 11%', fmtRp(a.hpp.ppnAmount));
  row('TOTAL HARGA JUAL', fmtRp(a.hpp.total), true);

  if (prod.notes.trim()) { ensure(20); y += 3; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 24, 39); doc.text('Catatan Proyek', M, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(75, 85, 99); for (const ln of doc.splitTextToSize(prod.notes, R - M) as string[]) { ensure(5); doc.text(ln, M, y); y += 4.5; } }
  if (prod.terms.trim()) { ensure(24); y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 24, 39); doc.text('Syarat & Ketentuan', M, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); for (const ln of doc.splitTextToSize(prod.terms, R - M) as string[]) { ensure(4.5); doc.text(ln, M, y); y += 4.2; } }
  ensure(40); y += 12;
  doc.setDrawColor(100); doc.setLineWidth(0.3); doc.line(M + 6, y + 18, M + 66, y + 18); doc.line(R - 66, y + 18, R - 6, y + 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(75, 85, 99);
  doc.text('Desainer', M + 36, y + 23, { align: 'center' }); doc.text(prod.clientName ? `Klien — ${prod.clientName}` : 'Klien', R - 36, y + 23, { align: 'center' });
  footer();
  doc.save(`${sanitizeFilename(a.projectName)}_HPP_${sanitizeFilename(a.scenario.name)}.pdf`);
}
