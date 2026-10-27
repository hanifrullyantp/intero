// 3D Intero — Daftar potong rangka: cutting-stock 1D (batang 6 m, kerf 3 mm), kelompok potongan, ekspor CSV/PDF.
import type { FrameResult, FrameRole, ProfileKey } from './frame';
import { downloadBlob, sanitizeFilename } from '../lib/utils';

export const KERF = 3;
export const BAR_MM = 6000;
export const PROFILE_ORDER: ProfileKey[] = ['1530', '1515', '2040', 'alu'];
export const PROFILE_LABEL: Record<ProfileKey, string> = { '1530': 'Hollow 1.5×3 cm', '1515': 'Hollow 1.5×1.5 cm', '2040': 'Hollow 2×4 cm (pintu)', alu: 'Aluminium 1×1.5"' };
export const ROLE_LABEL: Record<FrameRole, string> = {
  post: 'Tiang sudut', midpost: 'Tiang sekat', railTop: 'Rel atas', railBottom: 'Rel bawah', crossTop: 'Melintang atas',
  crossBottom: 'Melintang bawah', shelf: 'Support rak', doorV: 'Rangka pintu (tegak)', doorH: 'Rangka pintu (datar)',
};

export interface CutPiece { id: string; len: number; role: FrameRole; blockId: string; label: string; split: boolean }
export interface CutBar { n: number; pieces: CutPiece[]; used: number; free: number }
export interface CutGroup { key: string; profile: ProfileKey; role: FrameRole; len: number; qty: number; blocks: string[] }
export interface CutPlan {
  profile: ProfileKey; barLen: number; bars: CutBar[]; pieceCount: number; lengthMm: number; wastePct: number; groups: CutGroup[];
  /** Jumlah batang yang dibeli: maksimum antara hasil potong optimal dan aturan standar +5% waste. */
  buy: number; standard: number;
}

const needOf = (len: number, barLen: number) => Math.min(len + KERF, barLen);

function pack(pieces: CutPiece[], barLen: number, mode: 'best' | 'first'): CutBar[] {
  const list = [...pieces].sort((a, b) => b.len - a.len);
  const bars: CutBar[] = [];
  for (const p of list) {
    const need = needOf(p.len, barLen);
    let target = -1, bestLeft = Infinity;
    for (let i = 0; i < bars.length; i++) {
      const free = barLen - bars[i].used;
      if (free >= need) {
        if (mode === 'first') { target = i; break; }
        if (free - need < bestLeft) { bestLeft = free - need; target = i; }
      }
    }
    if (target < 0) { bars.push({ n: bars.length + 1, pieces: [], used: 0, free: barLen }); target = bars.length - 1; }
    const b = bars[target];
    b.pieces.push(p); b.used += need; b.free = barLen - b.used;
  }
  return bars;
}

/** Rencana potong per profil. Potongan > panjang batang dipecah (disambung). */
export function planCuts(res: FrameResult, barLen = BAR_MM): CutPlan[] {
  const label = new Map(res.blocks.map((b) => [b.id, b.label]));
  const by = new Map<ProfileKey, CutPiece[]>();
  for (const m of res.members) {
    const len = Math.round(m.len);
    if (len < 1) continue;
    const parts = len > barLen ? Math.ceil(len / barLen) : 1;
    for (let k = 0; k < parts; k++) {
      const piece: CutPiece = { id: `${m.id}${parts > 1 ? `.${k + 1}` : ''}`, len: parts > 1 ? Math.ceil(len / parts) : len, role: m.role, blockId: m.blockId, label: label.get(m.blockId) ?? m.blockId, split: parts > 1 };
      by.set(m.profile, [...(by.get(m.profile) ?? []), piece]);
    }
  }
  const plans: CutPlan[] = [];
  for (const profile of PROFILE_ORDER) {
    const pieces = by.get(profile);
    if (!pieces?.length) continue;
    const a = pack(pieces, barLen, 'best'), b = pack(pieces, barLen, 'first');
    const bars = a.length <= b.length ? a : b;
    const lengthMm = pieces.reduce((s, p) => s + p.len, 0);
    const groups = new Map<string, CutGroup>();
    for (const p of pieces) {
      const key = `${profile}|${p.role}|${p.len}`;
      const g = groups.get(key) ?? { key, profile, role: p.role, len: p.len, qty: 0, blocks: [] };
      g.qty += 1; if (!g.blocks.includes(p.label)) g.blocks.push(p.label);
      groups.set(key, g);
    }
    const standard = Math.ceil((lengthMm * 1.05) / barLen);
    plans.push({
      profile, barLen, bars, pieceCount: pieces.length, lengthMm,
      wastePct: Math.max(0, (1 - lengthMm / (bars.length * barLen)) * 100),
      groups: [...groups.values()].sort((x, y) => y.len - x.len),
      buy: Math.max(bars.length, standard), standard,
    });
  }
  return plans;
}

export const totalBuy = (plans: CutPlan[]) => plans.reduce((s, p) => s + p.buy, 0);

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
const cm = (mm: number) => (mm / 10).toFixed(1);

export function exportCutCsv(projectName: string, plans: CutPlan[]) {
  const rows: (string | number)[][] = [['Profil', 'Peran', 'Panjang (cm)', 'Qty', 'Blok / kabinet']];
  for (const p of plans) for (const g of p.groups) rows.push([PROFILE_LABEL[p.profile], ROLE_LABEL[g.role], cm(g.len), g.qty, g.blocks.join('; ')]);
  rows.push([], ['Rencana per batang'], ['Profil', 'Batang ke-', 'Potongan (cm)', 'Terpakai (cm)', 'Sisa (cm)']);
  for (const p of plans) for (const b of p.bars) rows.push([PROFILE_LABEL[p.profile], b.n, b.pieces.map((x) => cm(x.len)).join(' + '), cm(b.used), cm(b.free)]);
  rows.push([], ['Ringkasan'], ['Profil', 'Total (m)', 'Batang optimal', 'Batang standar +5%', 'Batang dibeli', 'Waste (%)']);
  for (const p of plans) rows.push([PROFILE_LABEL[p.profile], (p.lengthMm / 1000).toFixed(2), p.bars.length, p.standard, p.buy, p.wastePct.toFixed(1)]);
  downloadBlob(`${sanitizeFilename(projectName)}_daftar-potong-rangka.csv`, new Blob(['\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
}

export async function exportCutPdf(projectName: string, plans: CutPlan[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, M = 12, R = PW - M;
  let y = M, page = 1;
  const footer = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 156, 165); doc.text('Dibuat dengan 3D Intero', PW / 2, PH - 7, { align: 'center' }); doc.text(`Hal. ${page}`, R, PH - 7, { align: 'right' }); };
  const ensure = (h: number) => { if (y + h > PH - 14) { footer(); doc.addPage(); page += 1; y = M; } };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(17, 24, 39); doc.text('DAFTAR POTONG RANGKA', M, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(75, 85, 99); doc.text(`Proyek: ${projectName}   ·   ${new Date().toLocaleDateString('id-ID')}   ·   batang ${BAR_MM / 1000} m, kerf ${KERF} mm`, M, y + 11);
  y += 17; doc.setDrawColor(27, 157, 107); doc.setLineWidth(0.6); doc.line(M, y, R, y); y += 6;
  for (const p of plans) {
    ensure(24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(27, 157, 107);
    doc.text(`${PROFILE_LABEL[p.profile]} — beli ${p.buy} batang (optimal ${p.bars.length}, standar ${p.standard}) · waste ${p.wastePct.toFixed(1)}%`, M, y); y += 5;
    doc.setFontSize(8); doc.setTextColor(255); doc.setFillColor(17, 24, 39); doc.rect(M, y, R - M, 5.5, 'F');
    doc.text('Peran', M + 2, y + 3.8); doc.text('Panjang (cm)', 92, y + 3.8, { align: 'right' }); doc.text('Qty', 110, y + 3.8, { align: 'right' }); doc.text('Blok', 116, y + 3.8); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(31, 41, 55);
    for (const g of p.groups) {
      ensure(5);
      doc.text(ROLE_LABEL[g.role], M + 2, y); doc.text(cm(g.len), 92, y, { align: 'right' }); doc.text(String(g.qty), 110, y, { align: 'right' });
      doc.text(doc.splitTextToSize(g.blocks.join(', '), 80)[0], 116, y); y += 4.4;
    }
    y += 3; ensure(8);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(17, 24, 39); doc.text('Rencana potong per batang', M, y); y += 4;
    const W = R - M - 12;
    for (const b of p.bars) {
      ensure(6.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(107, 114, 128); doc.text(`#${b.n}`, M, y + 3.4);
      doc.setDrawColor(150); doc.setLineWidth(0.15); doc.rect(M + 10, y, W, 4.6);
      let x = M + 10;
      for (const pc of b.pieces) {
        const w = ((pc.len + KERF) / p.barLen) * W;
        doc.setFillColor(214, 236, 226); doc.rect(x, y, w, 4.6, 'FD');
        if (w > 11) { doc.setTextColor(17, 24, 39); doc.text(cm(pc.len), x + w / 2, y + 3.2, { align: 'center' }); }
        x += w;
      }
      doc.setTextColor(107, 114, 128); doc.text(`sisa ${cm(b.free)} cm`, R, y + 3.4, { align: 'right' });
      y += 6;
    }
    y += 5;
  }
  footer();
  doc.save(`${sanitizeFilename(projectName)}_daftar-potong-rangka.pdf`);
}
