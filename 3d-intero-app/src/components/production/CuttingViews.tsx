import { useMemo, useState } from 'react';
import type { Item } from '../../types';
import type { NestResult, Panel, ProductionBundle } from '../../production/types';
import { hingesFor } from '../../production/hardware';

const MAT_LABEL: Record<string, string> = { ply18: 'Plywood 18 mm', ply15: 'Plywood 15 mm', hdf5: 'HDF 5 mm', acp4: 'ACP 4 mm' };
const cm = (mm: number) => (Math.round(mm) / 10).toFixed(1);
const hue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };

function PanelCard({ p }: { p: Panel }) {
  const { w, h } = p; const pad = Math.max(w, h) * 0.04;
  const holes: { x: number; y: number; r: number }[] = [];
  if (p.kind === 'side' && h < 2500) for (const x of [37, w - 37]) for (let y = 80; y <= h - 80; y += 32) holes.push({ x, y, r: 2.5 });
  if (p.kind === 'door') { const n = hingesFor(h); for (let k = 0; k < n; k++) holes.push({ x: 22, y: k === 0 ? 100 : k === n - 1 ? h - 100 : 100 + ((h - 200) * k) / (n - 1), r: 17.5 }); }
  if (p.kind === 'bottom' || p.kind === 'top' || p.kind === 'shelf') for (const x of [30, w - 30]) holes.push({ x, y: h / 2, r: 4 });
  const e = p.edges; const ew = Math.max(w, h) * 0.012;
  return (
    <div className="rounded-xl p-2 flex flex-col gap-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: 176 }}>
      <svg viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`} width={160} height={110} preserveAspectRatio="xMidYMid meet">
        <rect x={0} y={0} width={w} height={h} fill={p.material === 'acp4' ? '#AEB6C0' : '#E6D3AE'} stroke="var(--text-primary)" strokeWidth={Math.max(w, h) * 0.006} />
        {e.t && <line x1={0} y1={0} x2={w} y2={0} stroke="#F59E0B" strokeWidth={ew} />}{e.b && <line x1={0} y1={h} x2={w} y2={h} stroke="#F59E0B" strokeWidth={ew} />}
        {e.l && <line x1={0} y1={0} x2={0} y2={h} stroke="#F59E0B" strokeWidth={ew} />}{e.r && <line x1={w} y1={0} x2={w} y2={h} stroke="#F59E0B" strokeWidth={ew} />}
        {holes.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="none" stroke="#1B9D6B" strokeWidth={Math.max(w, h) * 0.004} />)}
        {p.grain === 'h' && <g stroke="#8B6B3E" strokeWidth={Math.max(w, h) * 0.004}><line x1={w / 2} y1={h * 0.3} x2={w / 2} y2={h * 0.7} /><polyline points={`${w / 2 - w * 0.04},${h * 0.36} ${w / 2},${h * 0.3} ${w / 2 + w * 0.04},${h * 0.36}`} fill="none" /></g>}
      </svg>
      <div className="text-[11px] font-bold truncate">{p.id}</div>
      <div className="text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>{p.label}</div>
      <div className="mono text-[10.5px]">{cm(p.h)} × {cm(p.w)} cm · {p.t} mm</div>
    </div>
  );
}

export function FlatView({ bundle, items, selectedId, scope }: { bundle: ProductionBundle; items: Item[]; selectedId: string | null; scope: 'all' | 'selected' }) {
  const groups = useMemo(() => {
    const list = scope === 'selected' && selectedId ? items.filter((i) => i.id === selectedId) : items;
    return list.map((it) => ({ it, ip: bundle.items.find((p) => p.itemId === it.id) })).filter((g) => g.ip && g.ip.panels.length);
  }, [bundle, items, selectedId, scope]);
  if (!groups.length) return <p className="p-4 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Tidak ada panel untuk ditampilkan.</p>;
  return (
    <div className="p-3 flex flex-col gap-5">
      <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>Garis oranye = edge banding PVC · lingkaran hijau = lubang (system 32 mm, cup engsel Ø35, dowel) · panah = arah serat/motif HPL. Ukuran dalam cm.</p>
      {groups.map(({ it, ip }) => (
        <div key={it.id}>
          <div className="flex items-baseline gap-2 mb-2"><span className="badge badge-ok">{ip!.tag}</span><span className="text-[13px] font-bold">{it.name}</span><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{ip!.method === 'papan_hpl' ? 'Papan + HPL' : 'Rangka + ACP'} · {ip!.panels.length} panel</span></div>
          <div className="flex flex-wrap gap-2">{ip!.panels.map((p) => <PanelCard key={p.id} p={p} />)}</div>
        </div>
      ))}
    </div>
  );
}

function SheetSvg({ nest, index }: { nest: NestResult; index: number }) {
  const sh = nest.sheets[index];
  const used = sh.placements.reduce((a, p) => a + p.w * p.h, 0);
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11.5px] font-semibold">Lembar {sh.index} · terpakai {((used / (nest.sheetW * nest.sheetH)) * 100).toFixed(0)}%</div>
      <svg viewBox={`0 0 ${nest.sheetW} ${nest.sheetH}`} style={{ width: 230, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {sh.placements.map((p) => (
          <g key={p.panelId}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={`hsl(${hue(p.itemTag)} 55% ${p.rotated ? 62 : 72}%)`} stroke="#111827" strokeWidth={3} />
            {p.w > 140 && p.h > 90 && <text x={p.x + p.w / 2} y={p.y + p.h / 2} fontSize={Math.min(46, p.w / 5)} textAnchor="middle" dominantBaseline="middle" fill="#111827" fontWeight={700}>{p.code}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function CutView({ bundle }: { bundle: ProductionBundle }) {
  const [mat, setMat] = useState<string>(bundle.nests[0]?.material ?? 'ply18');
  const nest = bundle.nests.find((n) => n.material === mat) ?? bundle.nests[0];
  if (!nest) return <p className="p-4 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Belum ada panel untuk dipotong.</p>;
  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {bundle.nests.map((n) => <button key={n.material} className={`btn btn-sm ${n.material === nest.material ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMat(n.material)}>{MAT_LABEL[n.material]} · {n.sheets.length} lbr</button>)}
      </div>
      <div className="flex flex-wrap gap-2 text-[12px]">
        <span className="badge badge-ok">Lembar {nest.sheetW}×{nest.sheetH} mm</span>
        <span className={`badge ${nest.wastePct <= 10 ? 'badge-ok' : 'badge-warn'}`}>Waste {nest.wastePct.toFixed(1)}% {nest.wastePct <= 10 ? '(sesuai target <10%)' : '(di atas target 10%)'}</span>
        {nest.unplaced.length > 0 && <span className="badge badge-warn">{nest.unplaced.length} panel melebihi ukuran lembar</span>}
      </div>
      <div className="flex flex-wrap gap-4">{nest.sheets.map((_, i) => <SheetSvg key={i} nest={nest} index={i} />)}</div>
      {nest.unplaced.length > 0 && <p className="text-[12px]" style={{ color: 'var(--warning)' }}>Tidak muat: {nest.unplaced.map((p) => `${p.id} (${cm(p.w)}×${cm(p.h)} cm)`).join(', ')}</p>}
    </div>
  );
}
