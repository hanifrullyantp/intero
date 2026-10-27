import { useMemo, useState } from 'react';
import { Boxes, Download, Factory, Layers3, ListChecks, Scissors, StepForward, Table2 } from 'lucide-react';
import { useStore } from '../../store';
import type { Item, ProdMethod, ProdStatus } from '../../types';
import type { FrameResult } from '../../production/frame';
import type { Panel, ProductionBundle } from '../../production/types';
import { STATUSES, nextStatus, overallProgress, statusOf } from '../../production/status';
import { TYPE_LABELS } from '../../lib/constants';
import { downloadBlob } from '../../lib/utils';
import { Select, Toggle, toast, useIsMobile } from '../ui';
import { BlueprintView, type BlueprintOpts } from './BlueprintView';
import { CutView, FlatView } from './CuttingViews';
import { FrameCutView } from './FrameCutView';

type Sub = 'frame' | 'panel' | 'table' | 'status';
const MAT: Record<string, string> = { ply18: 'Plywood 18', ply15: 'Plywood 15', hdf5: 'HDF 5', acp4: 'ACP 4' };
const cm = (mm: number) => (Math.round(mm) / 10).toFixed(1);
const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

function PanelTable({ panels, items, onlyId }: { panels: Panel[]; items: Item[]; onlyId: string | null }) {
  const [mat, setMat] = useState('all');
  const noteOf = useMemo(() => new Map(items.map((i) => [i.id, i.config.note ?? ''])), [items]);
  const list = panels.filter((p) => (!onlyId || p.itemId === onlyId) && (mat === 'all' || p.material === mat));
  const mats = [...new Set(panels.map((p) => p.material))];
  const totalArea = list.reduce((a, p) => a + (p.w * p.h * p.qty) / 1e6, 0);
  const csv = () => {
    const rows = [['ID', 'Kabinet', 'Panel', 'Panjang (cm)', 'Lebar (cm)', 'Tebal (mm)', 'Material', 'Qty', 'Serat', 'Muka HPL', 'Catatan'], ...list.map((p) => [p.id, p.itemName, p.label, cm(p.h), cm(p.w), p.t, MAT[p.material], p.qty, p.grain === 'h' ? 'searah panjang' : 'bebas', p.hplFaces, noteOf.get(p.itemId) ?? ''])];
    downloadBlob('daftar-panel.csv', new Blob(['\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    toast('CSV daftar panel diunduh', 'success');
  };
  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button className={`btn btn-sm ${mat === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMat('all')}>Semua · {panels.length}</button>
        {mats.map((m) => <button key={m} className={`btn btn-sm ${mat === m ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMat(m)}>{MAT[m]}</button>)}
        <div className="flex-1" /><span className="mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{list.length} panel · {totalArea.toFixed(2)} m²</span>
        <button className="btn btn-secondary btn-sm" onClick={csv}><Download size={13} />CSV</button>
      </div>
      <div className="overflow-auto rounded-xl" style={{ border: '1px solid var(--border)', maxHeight: 'calc(100vh - 190px)' }}>
        <table className="hpp-table">
          <thead><tr>{['ID', 'Kabinet', 'Panel', 'P (cm)', 'L (cm)', 'Tebal', 'Material', 'Qty', 'Serat', 'HPL', 'Tepi (m)'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{list.map((p) => {
            const edge = ((p.edges.t ? p.w : 0) + (p.edges.b ? p.w : 0) + (p.edges.l ? p.h : 0) + (p.edges.r ? p.h : 0)) * p.qty / 1000;
            return <tr key={p.id}><td className="mono strong">{p.id}</td><td>{p.itemName}</td><td>{p.label}</td><td className="mono">{cm(p.h)}</td><td className="mono">{cm(p.w)}</td><td className="mono">{p.t}</td><td>{MAT[p.material]}</td><td className="mono">{p.qty}</td><td>{p.grain === 'h' ? 'searah P' : 'bebas'}</td><td className="mono">{p.hplFaces || '—'}</td><td className="mono">{edge ? edge.toFixed(2) : '—'}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

/** Papan status produksi per kabinet: ringkasan tahap, progres total, ubah status, catatan, metode. */
function StatusBoard({ items, bundle }: { items: Item[]; bundle: ProductionBundle }) {
  const s = useStore();
  const [filter, setFilter] = useState<ProdStatus | 'all'>('all');
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((st) => [st.id, items.filter((i) => statusOf(i.config.prodStatus).id === st.id).length])) as Record<ProdStatus, number>, [items]);
  const prog = overallProgress(items.map((i) => i.config.prodStatus));
  const shown = items.filter((i) => filter === 'all' || statusOf(i.config.prodStatus).id === filter);
  const set = (id: string, st: ProdStatus) => s.patchItem(id, { config: { prodStatus: st } }, false);
  const bulk = (st: ProdStatus) => { for (const i of shown) set(i.id, st); toast(`${shown.length} kabinet → ${statusOf(st).label}`, 'success'); };
  if (!items.length) return <p className="p-4 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Belum ada kabinet.</p>;
  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2"><Factory size={15} style={{ color: 'var(--brand-primary)' }} /><b className="text-[13px] flex-1">Progres produksi keseluruhan</b><b className="mono text-[15px]" style={{ color: 'var(--brand-primary)' }}>{prog}%</b></div>
        <div className="progress"><div style={{ width: `${prog}%` }} /></div>
        <div className="flex flex-wrap gap-1.5">
          <button className={`badge ${filter === 'all' ? 'badge-ok' : ''}`} style={filter === 'all' ? undefined : { background: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => setFilter('all')}>Semua · {items.length}</button>
          {STATUSES.map((st) => <button key={st.id} className="badge" style={{ background: filter === st.id ? st.color : 'var(--bg-panel)', color: filter === st.id ? '#fff' : 'var(--text-secondary)', border: `1px solid ${st.color}` }} onClick={() => setFilter(filter === st.id ? 'all' : st.id)}>{st.label} · {counts[st.id]}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]"><span className="label">Set semua yang tampil:</span>{STATUSES.map((st) => <button key={st.id} className="btn btn-secondary btn-sm" style={{ height: 24, fontSize: 11 }} onClick={() => bulk(st.id)}>{st.label}</button>)}</div>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {shown.map((it) => {
          const ip = bundle.items.find((p) => p.itemId === it.id); const st = statusOf(it.config.prodStatus);
          return (
            <div key={it.id} className="rounded-xl p-2.5 flex flex-col gap-2" style={{ background: 'var(--bg-panel)', border: `1px solid var(--border)`, borderLeft: `4px solid ${st.color}` }}>
              <div className="flex items-center gap-2"><span className="badge badge-ok shrink-0">{ip?.tag}</span><div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold truncate">{it.name}</div><div className="text-[10.5px] mono" style={{ color: 'var(--text-tertiary)' }}>{TYPE_LABELS[it.type]} · {cm(it.dims.w)}×{cm(it.dims.h)}×{cm(it.dims.d)} cm · {ip?.panels.length ?? 0} panel</div></div>
                <button className="icon-btn" style={{ width: 28, height: 28 }} data-tip="Tahap berikutnya" disabled={st.id === 'terpasang'} onClick={() => set(it.id, nextStatus(it.config.prodStatus))}><StepForward size={15} /></button></div>
              <div className="grid grid-cols-2 gap-1.5">
                <Select value={st.id} onChange={(v) => set(it.id, v as ProdStatus)} options={STATUSES.map((x) => ({ value: x.id, label: x.label }))} />
                <Select value={it.config.method ?? ''} onChange={(v) => s.patchItem(it.id, { config: { method: (v || undefined) as ProdMethod | undefined } }, false)} options={[{ value: '', label: 'Metode: ikut skenario' }, { value: 'papan_hpl', label: 'Papan + HPL' }, { value: 'rangka_acp', label: 'Rangka + ACP' }]} />
              </div>
              <textarea className="input" style={{ height: 46, padding: 6, fontSize: 12, resize: 'vertical' }} placeholder="Catatan produksi (HPL khusus, handle beda, dll)…" value={it.config.note ?? ''} onChange={(e) => s.patchItem(it.id, { config: { note: e.target.value } }, false)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CabinetTree({ items, bundle }: { items: Item[]; bundle: ProductionBundle }) {
  const s = useStore(); const sel = s.selectedIds[0] ?? null;
  const walls = s.walls;
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) { const k = it.wallId ? (walls.find((w) => w.id === it.wallId)?.name ?? it.wallId) : 'Island / Bebas'; map.set(k, [...(map.get(k) ?? []), it]); }
    return [...map.entries()].map(([k, v]) => [k, v.sort((a, b) => a.orderIndex - b.orderIndex)] as const);
  }, [items, walls]);
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}><Layers3 size={15} style={{ color: 'var(--brand-primary)' }} /><span className="text-[13px] font-bold">Kabinet ({items.length})</span></div>
      <div className="flex-1 overflow-y-auto min-h-0 p-2">
        {groups.map(([name, list]) => (
          <div key={name} className="mb-2"><div className="px-1.5 py-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{name}</div>
            {list.map((it) => { const active = it.id === sel; const ip = bundle.items.find((p) => p.itemId === it.id); const st = statusOf(it.config.prodStatus);
              return <button key={it.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 text-left" style={{ background: active ? 'var(--bg-selected)' : undefined, border: `1px solid ${active ? 'var(--brand-primary)' : 'transparent'}` }} onClick={() => s.setSelection(active ? [] : [it.id])}>
                <span className="w-1.5 h-7 rounded-full shrink-0" style={{ background: st.color }} /><span className="badge badge-ok shrink-0">{ip?.tag}</span>
                <span className="flex-1 min-w-0"><span className="block text-[12.5px] truncate">{it.name}</span><span className="block text-[10.5px] mono" style={{ color: 'var(--text-tertiary)' }}>{cm(it.dims.w)}×{cm(it.dims.h)}×{cm(it.dims.d)} cm</span></span></button>; })}
          </div>))}
      </div>
    </div>
  );
}

export function CuttingTab({ items, frame, bundle, methodLabel }: { items: Item[]; frame: FrameResult; bundle: ProductionBundle; methodLabel: string }) {
  const s = useStore(); const isMobile = useIsMobile();
  const [sub, setSub] = useState<Sub>('frame');
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [explode, setExplode] = useState(0); const [labels, setLabels] = useState<BlueprintOpts['labels']>('code'); const [showAcp, setShowAcp] = useState(true);
  const selectedId = s.selectedIds[0] ?? null;
  const opts: BlueprintOpts = { selectedId, scope: scope === 'selected' && selectedId ? 'selected' : 'all', explode, labels, showAcp };
  const tabs: [Sub, string, React.ReactNode][] = [['frame', 'Potong Rangka', <Scissors size={13} key="a" />], ['panel', 'Panel & Lembar', <Boxes size={13} key="b" />], ['table', 'Tabel Panel', <Table2 size={13} key="c" />], ['status', 'Status Produksi', <ListChecks size={13} key="d" />]];
  const panelBody = (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 flex flex-wrap items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="seg"><button className={s.prodView === 'flat' ? 'active' : ''} onClick={() => s.ui({ prodView: 'flat' })}>Flat</button><button className={s.prodView === 'cut' ? 'active' : ''} onClick={() => s.ui({ prodView: 'cut' })}>Cut</button><button className={s.prodView === '3d' ? 'active' : ''} onClick={() => s.ui({ prodView: '3d' })}>3D panel</button></div>
        <div className="seg"><button className={opts.scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>Semua</button><button className={opts.scope === 'selected' ? 'active' : ''} disabled={!selectedId} onClick={() => setScope('selected')}>Terpilih</button></div>
        {isMobile && <Select value={selectedId ?? ''} onChange={(v) => s.setSelection(v ? [v] : [])} options={[{ value: '', label: 'Pilih kabinet…' }, ...items.map((i) => ({ value: i.id, label: `${bundle.tags[i.id]} ${i.name}` }))]} className="w-44" />}
        {s.prodView === '3d' && <><label className="flex items-center gap-2 min-w-[140px]"><span className="label whitespace-nowrap">Exploded {explode}</span><input type="range" className="slider" min={0} max={400} step={10} value={explode} onChange={(e) => setExplode(+e.target.value)} /></label>
          <Select value={labels} onChange={(v) => setLabels(v)} options={[{ value: 'none', label: 'Tanpa label' }, { value: 'code', label: 'Label kode' }, { value: 'dims', label: 'Label + ukuran' }]} className="w-36" /><Toggle label="ACP" checked={showAcp} onChange={setShowAcp} /></>}
      </div>
      <div className="flex-1 min-h-0 overflow-auto relative">
        {s.prodView === '3d' && <BlueprintView bundle={bundle} items={items} opts={opts} />}
        {s.prodView === 'flat' && <FlatView bundle={bundle} items={items} selectedId={selectedId} scope={opts.scope} />}
        {s.prodView === 'cut' && <CutView bundle={bundle} />}
      </div>
      <div className="px-3 py-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] mono" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        <span>{methodLabel}</span><span>{bundle.panels.length} panel</span><span>HPL {bundle.hplAreaM2.toFixed(1)} m²</span><span>ACP {bundle.acpAreaM2.toFixed(1)} m²</span><span>Edge {bundle.edgeMeters.toFixed(1)} m</span>
        {bundle.nests.map((n) => <span key={n.material} style={{ color: n.wastePct <= 10 ? 'var(--brand-primary)' : 'var(--warning)' }}>{MAT[n.material]}: {n.sheets.length} lbr / waste {n.wastePct.toFixed(1)}%</span>)}
      </div>
    </div>
  );
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
        <div className="seg" style={{ minWidth: 'max-content' }}>{tabs.map(([id, label, icon]) => <button key={id} className={sub === id ? 'active' : ''} onClick={() => setSub(id)}>{icon}{label}</button>)}</div>
      </div>
      <div className="flex-1 min-h-0">
        {sub === 'frame' && <div className="h-full overflow-y-auto"><FrameCutView frame={frame} /></div>}
        {sub === 'table' && <div className="h-full overflow-y-auto"><PanelTable panels={bundle.panels} items={items} onlyId={selectedId} /></div>}
        {sub === 'status' && <div className="h-full overflow-y-auto"><StatusBoard items={items} bundle={bundle} /></div>}
        {sub === 'panel' && (isMobile ? panelBody : (
          <div className="h-full grid" style={{ gridTemplateColumns: '240px minmax(0,1fr)' }}>
            <div style={{ borderRight: '1px solid var(--border)' }} className="min-h-0"><CabinetTree items={items} bundle={bundle} /></div>
            <div className="min-h-0 min-w-0">{panelBody}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
