import { jsPDF } from 'jspdf';
import type { Project } from '../models/types';
import { downloadBlob, safeName } from '../core/projectManager';
import { cuttingList, buildBOM } from '../engine/cuttingList';
import { estimatePrice } from '../engine/price';
import { computeCountertops } from '../engine/countertop';
import { renderPlan, renderElevation, fitView, elevationBounds } from '../viewport/renderer2d';
import { footprint, formatIDR, wallLength } from '../utils/geometry';
import { planDimensions } from '../engine/dimensionEngine';
import { getBoard, getColor, getCountertop } from '../config/materials';

// ---------- CSV ----------
export function exportCuttingListCSV(project: Project) {
  const rows = cuttingList(project);
  const head = ['Cabinet', 'Part', 'Length (cm)', 'Width (cm)', 'Qty', 'Thickness (mm)', 'Material', 'Edge Banding', 'Grain'];
  const lines = [head.join(','), ...rows.map((r) => [r.cabinet, r.part, r.w, r.h, r.qty, r.thickness, getBoard(r.material).name, r.edge, r.grain].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))];
  downloadBlob(`${safeName(project.name)}_cutting_list.csv`, '\uFEFF' + lines.join('\n'), 'text/csv;charset=utf-8');
}

export function exportBOMCSV(project: Project) {
  const bom = buildBOM(project);
  const lines: string[] = ['Category,Item,Qty,Unit,Price (IDR)'];
  for (const b of bom.boards) lines.push(`Board,${b.name},${b.sheets},sheet,${b.price}`);
  lines.push(`Edge Banding,PVC edge banding,${bom.edgeBandingMeters},m,`);
  for (const h of [...bom.hinges, ...bom.slides, ...bom.handles]) lines.push(`Hardware,${h.name},${h.qty},pcs,${h.price}`);
  for (const a of bom.accessories) lines.push(`Accessory,${a.name},${a.qty},pcs,${a.price}`);
  lines.push(`Countertop,${getCountertop(project.materials.countertop).name},${bom.countertopM2},m2,`);
  downloadBlob(`${safeName(project.name)}_bom.csv`, lines.join('\n'), 'text/csv');
}

// ---------- DXF ----------
export function exportDXF(project: Project) {
  const out: string[] = [];
  const push = (...v: (string | number)[]) => out.push(...v.map(String));
  push(0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 5, 0, 'ENDSEC');
  push(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, 4);
  for (const [name, color] of [
    ['WALLS', 7],
    ['BASE', 5],
    ['WALLCAB', 6],
    ['APPLIANCE', 2],
    ['DIMS', 8],
    ['TEXT', 7],
  ] as const) push(0, 'LAYER', 2, name, 70, 0, 62, color, 6, 'CONTINUOUS');
  push(0, 'ENDTAB', 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');
  const line = (layer: string, x1: number, y1: number, x2: number, y2: number) => push(0, 'LINE', 8, layer, 10, x1, 20, -y1, 30, 0, 11, x2, 21, -y2, 31, 0);
  const rect = (layer: string, x: number, y: number, w: number, h: number) => {
    line(layer, x, y, x + w, y);
    line(layer, x + w, y, x + w, y + h);
    line(layer, x + w, y + h, x, y + h);
    line(layer, x, y + h, x, y);
  };
  const text = (layer: string, x: number, y: number, h: number, s: string) => push(0, 'TEXT', 8, layer, 10, x, 20, -y, 30, 0, 40, h, 1, s);
  // room
  rect('WALLS', 0, 0, project.room.width, project.room.depth);
  for (const w of project.room.walls) {
    if (w.virtual) continue;
    line('WALLS', w.x1 - w.nx * 12, w.y1 - w.ny * 12, w.x2 - w.nx * 12, w.y2 - w.ny * 12);
  }
  for (const it of project.items) {
    const f = footprint(it);
    const layer = it.kind === 'appliance' ? 'APPLIANCE' : it.category === 'wall' ? 'WALLCAB' : 'BASE';
    rect(layer, f.x, f.y, f.w, f.h);
    text('TEXT', f.x + 2, f.y + f.h / 2, 4, `${it.name} ${it.width}x${it.depth}`);
  }
  for (const d of planDimensions(project)) {
    line('DIMS', d.x1, d.y1, d.x2, d.y2);
    text('DIMS', (d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2 - 2, 4, d.label);
  }
  push(0, 'ENDSEC', 0, 'EOF');
  downloadBlob(`${safeName(project.name)}_plan.dxf`, out.join('\n'), 'application/dxf');
}

// ---------- JSON ----------
export function exportJSON(project: Project) {
  downloadBlob(`${safeName(project.name)}.i3d.json`, JSON.stringify({ app: '3D Intero', version: 1, project }, null, 2), 'application/json');
}

// ---------- Canvas helpers ----------
function offscreen(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function renderPlanImage(project: Project, w = 1600, h = 1100): HTMLCanvasElement {
  const c = offscreen(w, h);
  const ctx = c.getContext('2d')!;
  const bounds = { x: -70, y: -70, w: project.room.width + 140, h: project.room.depth + 140 };
  renderPlan(ctx, w, h, project, fitView(bounds, w, h, 30), {
    showGrid: true,
    showDims: true,
    showTriangle: false,
    showLabels: true,
    selectedIds: [],
    hoverId: null,
    issues: [],
    countertops: computeCountertops(project),
    gridSize: 10,
    light: true,
  });
  return c;
}

export function renderElevationImage(project: Project, wallId: string, w = 1600, h = 900): HTMLCanvasElement | null {
  const wall = project.room.walls.find((x) => x.id === wallId);
  if (!wall) return null;
  const c = offscreen(w, h);
  const ctx = c.getContext('2d')!;
  renderElevation(ctx, w, h, project, wall, fitView(elevationBounds(project, wall), w, h, 30, true), {
    showDims: true,
    showLabels: true,
    selectedIds: [],
    light: true,
    countertops: computeCountertops(project),
  });
  return c;
}

export function downloadCanvasPNG(canvas: HTMLCanvasElement, filename: string, type: 'image/png' | 'image/jpeg' = 'image/png') {
  canvas.toBlob((b) => b && downloadBlob(filename, b), type, 0.92);
}

// ---------- PDF ----------
export function exportTechnicalPDF(project: Project) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const title = (t: string, sub: string) => {
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, pw, 16, 'F');
    doc.setTextColor(255);
    doc.setFontSize(13);
    doc.text(`3D INTERO - ${project.name}`, 8, 10.5);
    doc.setFontSize(9);
    doc.text(t, pw - 8, 10.5, { align: 'right' });
    doc.setTextColor(60);
    doc.setFontSize(8);
    doc.text(sub, 8, 22);
  };
  // page 1: plan
  title('SHEET 01 — PLAN VIEW', `Scale: fit · Units: cm · Generated ${new Date().toLocaleDateString()}`);
  const plan = renderPlanImage(project, 2000, 1300);
  const imgW = pw - 16;
  const imgH = (imgW * plan.height) / plan.width;
  doc.addImage(plan.toDataURL('image/jpeg', 0.9), 'JPEG', 8, 26, imgW, Math.min(imgH, ph - 34));
  // elevations
  project.room.walls.forEach((w, i) => {
    const el = renderElevationImage(project, w.id, 2000, 1100);
    if (!el) return;
    doc.addPage();
    title(`SHEET ${String(i + 2).padStart(2, '0')} — ELEVATION ${w.label.toUpperCase()}`, `Wall length ${wallLength(w)} cm · Ceiling ${project.room.ceilingHeight} cm`);
    const eh = (imgW * el.height) / el.width;
    doc.addImage(el.toDataURL('image/jpeg', 0.9), 'JPEG', 8, 26, imgW, Math.min(eh, ph - 34));
  });
  // material schedule
  doc.addPage();
  title('MATERIAL SCHEDULE & SPECIFICATION', 'Project defaults');
  const m = project.materials;
  const rows = [
    ['Carcass board', getBoard(m.board).name],
    ['Back panel', getBoard(m.backBoard).name],
    ['Finishing', m.finishing.toUpperCase() + ' — ' + m.finish],
    ['Door colour', getColor(m.doorColor).name],
    ['Carcass colour', getColor(m.carcassColor).name],
    ['Countertop', `${getCountertop(m.countertop).name} ${m.countertopThickness} cm — ${getColor(m.countertopColor).name} (${m.edgeProfile})`],
    ['Backsplash', m.backsplash ? `${m.backsplashHeight} cm` : 'None'],
    ['Handles', `${m.handleType} / ${m.handleFinish}`],
    ['Hinges / Slides', `${m.hinge} / ${m.slide}`],
  ];
  doc.setFontSize(10);
  let y = 34;
  for (const [k, v] of rows) {
    doc.setTextColor(90);
    doc.text(k, 12, y);
    doc.setTextColor(20);
    doc.text(v, 70, y);
    y += 7;
  }
  // item schedule
  y += 6;
  doc.setFontSize(11);
  doc.text('CABINET SCHEDULE', 12, y);
  y += 6;
  doc.setFontSize(8);
  const header = ['#', 'Name', 'Type', 'W', 'H', 'D', 'Elev', 'Doors', 'Drawers', 'Shelves'];
  const colX = [12, 22, 90, 130, 145, 160, 175, 192, 210, 230];
  header.forEach((h, i) => doc.text(h, colX[i], y));
  y += 4;
  project.items.forEach((it, idx) => {
    if (y > ph - 12) {
      doc.addPage();
      y = 20;
    }
    const vals = [String(idx + 1), it.name, it.subtype, it.width, it.height, it.depth, it.elevation, it.config.doors, it.config.drawers, it.config.shelves];
    vals.forEach((v, i) => doc.text(String(v), colX[i], y));
    y += 4.2;
  });
  doc.save(`${safeName(project.name)}_technical_drawings.pdf`);
}

export function exportCuttingListPDF(project: Project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const rows = cuttingList(project);
  const bom = buildBOM(project);
  doc.setFontSize(14);
  doc.text(`Cutting List — ${project.name}`, 10, 14);
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(`${rows.length} parts · ${bom.boards.reduce((s, b) => s + b.sheets, 0)} sheets · ${bom.edgeBandingMeters} m edge banding`, 10, 20);
  const cols = ['Cabinet', 'Part', 'L (cm)', 'W (cm)', 'Qty', 'Thk', 'Material', 'Edge', 'Grain'];
  const cx = [10, 48, 95, 112, 128, 138, 150, 178, 192];
  let y = 28;
  const head = () => {
    doc.setTextColor(255);
    doc.setFillColor(30, 42, 58);
    doc.rect(8, y - 4, pw - 16, 6, 'F');
    cols.forEach((c, i) => doc.text(c, cx[i], y));
    doc.setTextColor(20);
    y += 6;
  };
  head();
  let lastCab = '';
  for (const r of rows) {
    if (y > ph - 12) {
      doc.addPage();
      y = 14;
      head();
    }
    const vals = [r.cabinet === lastCab ? '' : r.cabinet, r.part, r.w, r.h, r.qty, r.thickness, getBoard(r.material).name, r.edge, r.grain];
    vals.forEach((v, i) => doc.text(String(v).slice(0, i === 0 || i === 1 ? 22 : 14), cx[i], y));
    lastCab = r.cabinet;
    y += 4.5;
  }
  y += 8;
  if (y > ph - 40) {
    doc.addPage();
    y = 14;
  }
  doc.setFontSize(11);
  doc.text('Material Summary', 10, y);
  y += 6;
  doc.setFontSize(8);
  for (const b of bom.boards) {
    doc.text(`${b.name}: ${b.partArea} m² parts → ${b.sheets} sheets (${b.utilization}% utilisation)`, 10, y);
    y += 4.5;
  }
  doc.text(`Edge banding: ${bom.edgeBandingMeters} m · Hinges: ${bom.hinges[0].qty} · Slides: ${bom.slides[0].qty} · Handles: ${bom.handles[0].qty}`, 10, y);
  doc.save(`${safeName(project.name)}_cutting_list.pdf`);
}

export function exportQuotationPDF(project: Project) {
  const p = estimatePrice(project);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.text('QUOTATION', 10, 13);
  doc.setFontSize(10);
  doc.text(`${project.name} · ${new Date().toLocaleDateString()}`, 10, 21);
  doc.setTextColor(20);
  let y = 40;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, 12, y);
    doc.text(value, pw - 12, y, { align: 'right' });
    y += 7;
  };
  doc.setFontSize(10);
  row('Board materials', formatIDR(p.boards));
  row('Finishing', formatIDR(p.finishing));
  row('Edge banding', formatIDR(p.edgeBanding));
  row('Hardware (hinges, slides, handles)', formatIDR(p.hardware));
  row('Accessories', formatIDR(p.accessories));
  row('Countertop', formatIDR(p.countertop));
  row('Backsplash', formatIDR(p.backsplash));
  doc.line(12, y - 3, pw - 12, y - 3);
  row('Material subtotal', formatIDR(p.materialTotal), true);
  row(`Labour (${p.bom.runningMeters} m × ${formatIDR(project.settings.laborRate)})`, formatIDR(p.labor));
  row(`Markup ${project.settings.markup}%`, formatIDR(p.markup));
  row('Appliances', formatIDR(p.appliances));
  doc.setFillColor(79, 195, 247);
  doc.rect(10, y - 4, pw - 20, 10, 'F');
  doc.setFontSize(12);
  row('TOTAL', formatIDR(p.total), true);
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Price per running meter: ${formatIDR(p.perRunningMeter)}`, 12, y);
  y += 10;
  doc.setFontSize(10);
  doc.text('Items', 12, y);
  y += 6;
  doc.setFontSize(8);
  project.items.filter((i) => i.kind === 'cabinet').forEach((it, i) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${i + 1}. ${it.name} — ${it.width} × ${it.height} × ${it.depth} cm`, 12, y);
    y += 4.5;
  });
  doc.save(`${safeName(project.name)}_quotation.pdf`);
}
