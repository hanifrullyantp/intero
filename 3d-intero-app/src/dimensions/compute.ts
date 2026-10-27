// 3D Intero — Dimension Viewer: hitung garis dimensi (overall, dinding, kabinet, vertikal, internal, pintu) + ringkasan
import type { DimLayers, DimUnit, Item, ProjectSettings, V3, Wall } from '../types';
import { distanceToWall, offsetOnWall, rowOf, wallVec } from '../engine/walls';
import { assignTags } from '../production';

export type DimKind = 'overall' | 'wall' | 'cabinet' | 'internal' | 'vertical' | 'door' | 'clearance';
export interface DimLine { id: string; kind: DimKind; a: V3; b: V3; off: V3; label: string; warn?: boolean }

export function fmtLen(mm: number, unit: DimUnit, dec: number): string {
  switch (unit) {
    case 'mm': return `${Math.round(mm)} mm`;
    case 'cm': return `${(mm / 10).toFixed(dec)} cm`;
    case 'm': return `${(mm / 1000).toFixed(Math.max(dec, 2))} m`;
    default: return `${(mm / 25.4).toFixed(dec)}"`;
  }
}

const P = (x: number, y: number, z: number): V3 => ({ x, y, z });
export function rotY(v: V3, deg: number): V3 {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
}
export function toWorld(it: Item, p: V3): V3 {
  const r = rotY(p, it.rotationY);
  return { x: r.x + it.position.x, y: r.y + it.position.y, z: r.z + it.position.z };
}
export function footprint(it: Item): { x: number; z: number }[] {
  const { w, d } = it.dims;
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => { const p = toWorld(it, P(x, 0, z)); return { x: p.x, z: p.z }; });
}
const wallShort = (w: Wall) => w.name.replace('Dinding ', '');

interface Clear { itemId: string; tag: string; text: string; warn: boolean; a?: V3; b?: V3; off?: V3; kind: 'gap' | 'clearance' }

/** Gap antar kabinet & jalur bebas (walkway) di depan kabinet bawah. */
function analyzeClearance(items: Item[], walls: Wall[], tags: Record<string, string>, f: (mm: number) => string): Clear[] {
  const out: Clear[] = [];
  for (const wall of walls) {
    const v = wallVec(wall);
    const onWall = items.filter((i) => i.wallId === wall.id);
    const at = (t: number, n: number, y: number) => P(wall.start.x + v.dir.x * t + v.normal.x * n, y, wall.start.z + v.dir.z * t + v.normal.z * n);
    for (const row of ['base', 'wall'] as const) {
      const list = onWall.filter((i) => rowOf(i) === row || (row === 'base' && rowOf(i) === 'tall'))
        .map((i) => { const c = offsetOnWall(wall, i.position.x, i.position.z); return { i, s: c - i.dims.w / 2, e: c + i.dims.w / 2 }; })
        .sort((a, b) => a.s - b.s);
      for (let k = 0; k < list.length - 1; k++) {
        const gap = list[k + 1].s - list[k].e;
        const depth = Math.max(list[k].i.dims.d, list[k + 1].i.dims.d);
        const y = row === 'wall' ? list[k].i.position.y + 40 : 40;
        if (gap > 5) out.push({ itemId: list[k].i.id, tag: `${tags[list[k].i.id]}↔${tags[list[k + 1].i.id]}`, text: `Gap ${f(gap)} (${wallShort(wall)})`, warn: false, kind: 'gap', a: at(list[k].e, depth + 40, y), b: at(list[k + 1].s, depth + 40, y), off: P(v.normal.x * 90, 0, v.normal.z * 90) });
        else if (gap < -2) out.push({ itemId: list[k].i.id, tag: `${tags[list[k].i.id]}↔${tags[list[k + 1].i.id]}`, text: `Tumpang tindih ${f(-gap)}`, warn: true, kind: 'gap' });
        else out.push({ itemId: list[k].i.id, tag: `${tags[list[k].i.id]}↔${tags[list[k + 1].i.id]}`, text: 'Menempel (0)', warn: false, kind: 'gap' });
      }
    }
    for (const it of onWall.filter((i) => rowOf(i) === 'base' || rowOf(i) === 'tall')) {
      const corners = footprint(it).map((c) => ({ t: offsetOnWall(wall, c.x, c.z), n: distanceToWall(wall, c.x, c.z) }));
      const t0 = Math.min(...corners.map((c) => c.t)), t1 = Math.max(...corners.map((c) => c.t)), nFront = Math.max(...corners.map((c) => c.n));
      let best = Infinity;
      for (const o of items) {
        if (o.id === it.id) continue;
        const oc = footprint(o).map((c) => ({ t: offsetOnWall(wall, c.x, c.z), n: distanceToWall(wall, c.x, c.z) }));
        const ot0 = Math.min(...oc.map((c) => c.t)), ot1 = Math.max(...oc.map((c) => c.t)), onMin = Math.min(...oc.map((c) => c.n));
        if (Math.min(t1, ot1) - Math.max(t0, ot0) > 50 && onMin >= nFront - 1) best = Math.min(best, onMin - nFront);
      }
      for (const w2 of walls) {
        if (w2.id === wall.id) continue;
        const ns = [w2.start, w2.end].map((p) => ({ t: offsetOnWall(wall, p.x, p.z), n: distanceToWall(wall, p.x, p.z) }));
        const ot0 = Math.min(ns[0].t, ns[1].t), ot1 = Math.max(ns[0].t, ns[1].t), onMin = Math.min(ns[0].n, ns[1].n);
        if (Math.min(t1, ot1) - Math.max(t0, ot0) > 50 && onMin >= nFront - 1) best = Math.min(best, onMin - nFront);
      }
      if (best < 4500 && rowOf(it) === 'base') {
        const tc = (t0 + t1) / 2;
        out.push({ itemId: it.id, tag: tags[it.id], text: `Jalur depan ${tags[it.id]}: ${f(best)}${best < 900 ? ' (saran min. 90 cm)' : ' (OK)'}`, warn: best < 900, kind: 'clearance', a: at(tc, nFront, 30), b: at(tc, nFront + best, 30), off: P(v.dir.x * 120, 0, v.dir.z * 120) });
      }
    }
  }
  return out;
}

export function computeDimLines(items: Item[], walls: Wall[], s: ProjectSettings, layers: DimLayers, selectedIds: string[], unit: DimUnit, dec: number): DimLine[] {
  const vis = items.filter((i) => i.visible);
  const out: DimLine[] = [];
  if (!vis.length) return out;
  const f = (mm: number) => fmtLen(mm, unit, dec);
  const tags = assignTags(items);
  const pts = vis.flatMap(footprint);
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minZ = Math.min(...pts.map((p) => p.z)), maxZ = Math.max(...pts.map((p) => p.z));
  const maxY = Math.max(...vis.map((i) => i.position.y + i.dims.h));

  if (layers.overall) {
    out.push({ id: 'ov-w', kind: 'overall', a: P(minX, 0, maxZ), b: P(maxX, 0, maxZ), off: P(0, 0, 420), label: `Lebar ${f(maxX - minX)}` });
    out.push({ id: 'ov-d', kind: 'overall', a: P(maxX, 0, minZ), b: P(maxX, 0, maxZ), off: P(420, 0, 0), label: `Dalam ${f(maxZ - minZ)}` });
    out.push({ id: 'ov-h', kind: 'overall', a: P(minX, 0, minZ), b: P(minX, maxY, minZ), off: P(-420, 0, 0), label: `Tinggi ${f(maxY)}` });
  }
  if (layers.wall) {
    for (const w of walls) {
      const v = wallVec(w); const md = Math.max(0, ...vis.filter((i) => i.wallId === w.id).map((i) => i.dims.d));
      const n = md + 260;
      out.push({ id: `wl-${w.id}`, kind: 'wall', a: P(w.start.x + v.normal.x * n, 0, w.start.z + v.normal.z * n), b: P(w.end.x + v.normal.x * n, 0, w.end.z + v.normal.z * n), off: P(v.normal.x * 140, 0, v.normal.z * 140), label: `${wallShort(w)} ${f(v.length)}` });
    }
  }
  if (layers.cabinet) {
    const targets = selectedIds.length ? vis.filter((i) => selectedIds.includes(i.id)) : [];
    for (const it of targets) {
      const { w, h, d } = it.dims; const r = it.rotationY;
      out.push({ id: `cw-${it.id}`, kind: 'cabinet', a: toWorld(it, P(-w / 2, h, d / 2)), b: toWorld(it, P(w / 2, h, d / 2)), off: rotY(P(0, 120, 170), r), label: f(w) });
      out.push({ id: `ch-${it.id}`, kind: 'cabinet', a: toWorld(it, P(w / 2, 0, d / 2)), b: toWorld(it, P(w / 2, h, d / 2)), off: rotY(P(170, 0, 170), r), label: f(h) });
      out.push({ id: `cd-${it.id}`, kind: 'cabinet', a: toWorld(it, P(-w / 2, h, -d / 2)), b: toWorld(it, P(-w / 2, h, d / 2)), off: rotY(P(-170, 120, 0), r), label: f(d) });
    }
    if (!targets.length) {
      for (const it of vis.filter((i) => rowOf(i) === 'base' || rowOf(i) === 'tall')) {
        const { w, d } = it.dims;
        out.push({ id: `cw-${it.id}`, kind: 'cabinet', a: toWorld(it, P(-w / 2, 0, d / 2)), b: toWorld(it, P(w / 2, 0, d / 2)), off: rotY(P(0, 0, 160), it.rotationY), label: f(w) });
      }
    }
  }
  if (layers.doors) {
    for (const it of vis) {
      const { w, h, d } = it.dims; const cfg = it.config;
      if (!(rowOf(it) === 'base' || rowOf(it) === 'wall' || rowOf(it) === 'tall')) continue;
      const doors = cfg.doorCount ?? (it.type === 'drawer_base' ? 0 : w > (rowOf(it) === 'wall' ? 600 : 500) ? 2 : 1);
      if (doors > 0 && !cfg.openShelf) {
        const dw = doors === 2 ? (w - 6) / 2 : w - 4;
        const y = h * 0.5;
        for (let k = 0; k < doors; k++) {
          const x0 = doors === 2 ? (k === 0 ? -w / 2 + 2 : 2) : -w / 2 + 2;
          out.push({ id: `dr-${it.id}-${k}`, kind: 'door', a: toWorld(it, P(x0, y, d / 2 + 24)), b: toWorld(it, P(x0 + dw, y, d / 2 + 24)), off: rotY(P(0, 0, 90), it.rotationY), label: f(dw) });
        }
      }
      if (it.type === 'drawer_base') {
        const n = cfg.drawerCount ?? 3; const body = h - (cfg.toeKickHeight ?? s.toeKick);
        const hs: number[] = [];
        if (n >= 3) { const first = Math.round(body * 0.22); hs.push(first); for (let k = 1; k < n; k++) hs.push((body - first) / (n - 1)); } else for (let k = 0; k < n; k++) hs.push(body / Math.max(1, n));
        let top = h;
        hs.forEach((dh, k) => {
          out.push({ id: `df-${it.id}-${k}`, kind: 'door', a: toWorld(it, P(w / 2, top - dh, d / 2 + 24)), b: toWorld(it, P(w / 2, top, d / 2 + 24)), off: rotY(P(110, 0, 60), it.rotationY), label: f(dh) });
          top -= dh;
        });
      }
    }
  }
  if (layers.vertical && walls.length) {
    const w = walls.find((x) => x.id === 'back') ?? walls[0]; const v = wallVec(w);
    const base = P(w.start.x - v.dir.x * 520 + v.normal.x * 120, 0, w.start.z - v.dir.z * 520 + v.normal.z * 120);
    const off = P(-v.dir.x * 140, 0, -v.dir.z * 140);
    const ct = s.countertop.thickness, tk = s.toeKick, baseH = s.baseHeight, wb = baseH + s.wallGap, H = s.globalCabinetHeight;
    const corn = Math.max(0, ...vis.filter((i) => i.type === 'wall' && i.config.cornice).map((i) => i.config.corniceHeight ?? 50));
    const chain: [string, number, number][] = [['Toe', 0, tk], ['Base', tk, baseH], ['Top', baseH, baseH + ct], ['Splash', baseH + ct, wb], ['Wall', wb, H - corn]];
    if (corn > 0) chain.push(['Topi', H - corn, H]);
    chain.forEach(([name, y0, y1], k) => out.push({ id: `vt-${k}`, kind: 'vertical', a: P(base.x, y0, base.z), b: P(base.x, y1, base.z), off, label: `${name} ${f(y1 - y0)}` }));
    out.push({ id: 'vt-total', kind: 'vertical', a: P(base.x, 0, base.z), b: P(base.x, H, base.z), off: P(off.x * 2.6, 0, off.z * 2.6), label: `Total ${f(H)}` });
  }
  if (layers.internal) {
    for (const c of analyzeClearance(items.filter((i) => i.visible), walls, tags, f)) if (c.a && c.b && c.off) out.push({ id: `in-${c.kind}-${c.tag}`, kind: c.kind === 'gap' ? 'internal' : 'clearance', a: c.a, b: c.b, off: c.off, label: c.kind === 'gap' ? c.text.split(' (')[0] : f(Math.hypot(c.b.x - c.a.x, c.b.z - c.a.z)), warn: c.warn });
  }
  return out;
}

export interface DimSummary {
  overall: { w: number; d: number; h: number; area: number };
  walls: { name: string; length: number; items: number }[];
  cabinets: { tag: string; name: string; type: string; w: number; h: number; d: number }[];
  vertical: { label: string; value: number }[];
  clearance: { text: string; warn: boolean }[];
}

export function computeSummary(items: Item[], walls: Wall[], s: ProjectSettings, unit: DimUnit, dec: number): DimSummary {
  const vis = items.filter((i) => i.visible); const tags = assignTags(items);
  const f = (mm: number) => fmtLen(mm, unit, dec);
  const pts = vis.flatMap(footprint);
  const w = pts.length ? Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)) : 0;
  const d = pts.length ? Math.max(...pts.map((p) => p.z)) - Math.min(...pts.map((p) => p.z)) : 0;
  const h = vis.length ? Math.max(...vis.map((i) => i.position.y + i.dims.h)) : 0;
  const ct = s.countertop.thickness, tk = s.toeKick, baseH = s.baseHeight;
  const corn = Math.max(0, ...vis.filter((i) => i.type === 'wall' && i.config.cornice).map((i) => i.config.corniceHeight ?? 50));
  const wallH = s.globalCabinetHeight - baseH - s.wallGap;
  return {
    overall: { w, d, h, area: (w * d) / 1e6 },
    walls: walls.map((x) => ({ name: x.name, length: wallVec(x).length, items: vis.filter((i) => i.wallId === x.id).length })),
    cabinets: [...vis].sort((a, b) => (tags[a.id] ?? '').localeCompare(tags[b.id] ?? '')).map((i) => ({ tag: tags[i.id], name: i.name, type: i.type, w: i.dims.w, h: i.dims.h, d: i.dims.d })),
    vertical: [
      { label: 'Tinggi Toe Kick', value: tk }, { label: 'Tinggi Base Cabinet', value: baseH - tk }, { label: 'Tebal Countertop', value: ct },
      { label: 'Tinggi Countertop (ergonomi)', value: baseH + ct }, { label: 'Backsplash / Gap ke Wall Cab', value: s.wallGap - ct },
      { label: 'Tinggi Wall Cabinet', value: wallH - corn }, ...(corn > 0 ? [{ label: 'Cornice / Topi', value: corn }] : []),
      { label: 'TOTAL TINGGI', value: s.globalCabinetHeight },
    ],
    clearance: analyzeClearance(vis, walls, tags, f).map((c) => ({ text: c.text, warn: c.warn })),
  };
}
