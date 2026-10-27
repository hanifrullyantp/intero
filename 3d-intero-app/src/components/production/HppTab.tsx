import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ClipboardCopy, Download, FileSpreadsheet, FileText, Plus, RefreshCw, TriangleAlert, Trash2, Upload, Wand2 } from 'lucide-react';
import { useStore } from '../../store';
import type { HppRow, Item, ProjectSettings, Scenario, Wall } from '../../types';
import { autoHppRows, hppTotals, mergeRows, rowEst, rowReal } from '../../production/hpp2';
import { buildProduction } from '../../production';
import { importRows, exportRowsCsv, exportRowsPdf, exportRowsXlsx } from '../../production/hpp-io';
import { HPP_CATS } from '../../lib/catalog';
import { uid } from '../../lib/utils';
import { fmtRp } from '../../production/hpp';
import { toast } from '../ui';

const UNITS = ['btg', 'lbr', 'pcs', 'psg', 'm', 'kg', 'klg', 'rol', 'unit', 'bks', 'ring', 'pack', 'kotak', 'pce', 'set', 'kaleng', 'm²', 'hari', 'trip'];
const CAT_COLOR: Record<string, string> = { Rangka: '#3B82F6', Material: '#1B9D6B', Finishing: '#F59E0B', Hardware: '#8B5CF6', LED: '#EAB308', Listrik: '#14B8A6', Overhead: '#9CA3AF', Jasa: '#EC4899' };
const colorOf = (c: string) => CAT_COLOR[c] ?? '#64748B';
const inp = (v: string) => { const n = Number(v.replace(/[^\d.,-]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const key = (r: HppRow) => `${r.cat}|${r.name}|${r.estVol}|${r.estPrice}`;

/** Tab HPP: tabel Estimasi vs Realisasi vs Selisih (editable per sel), auto-populate dari scene, rincian kategori. */
export function HppTab({ items, walls, settings, scenario }: { items: Item[]; walls: Wall[]; settings: ProjectSettings; scenario: Scenario }) {
  const s = useStore();
  const prod = settings.production;
  const rows = prod.hppRows[scenario.id] ?? [];
  const [filter, setFilter] = useState<string>('Semua');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<null | 'pdf' | 'xls' | 'csv' | 'imp'>(null);
  const bundle = useMemo(() => buildProduction(items, settings, scenario.method), [items, settings, scenario.method]);
  const setRows = (next: HppRow[]) => s.setProduction({ hppRows: { ...prod.hppRows, [scenario.id]: next } });
  const patch = (id: string, p: Partial<HppRow>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const fresh = useMemo(() => (s.catalog.length ? autoHppRows(items, walls, settings, bundle, s.catalog, scenario) : []), [items, walls, settings, bundle, s.catalog, scenario]);

  useEffect(() => {
    if (!s.catalog.length || (prod.hppRows[scenario.id] ?? []).length || !fresh.length) return;
    s.setProduction({ hppRows: { ...prod.hppRows, [scenario.id]: fresh } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, s.catalog.length, fresh.length]);

  // Penanda: estimasi otomatis tertinggal dari scene saat ini
  const stale = useMemo(() => {
    const cur = rows.filter((r) => r.auto).map(key).sort().join('¦');
    return rows.length > 0 && fresh.length > 0 && cur !== fresh.map(key).sort().join('¦');
  }, [rows, fresh]);
  const regenerate = () => { setRows(mergeRows(rows, fresh)); toast('Estimasi diperbarui dari scene — realisasi tetap', 'success'); };

  const totals = hppTotals(rows, scenario.margin, scenario.ppnOn);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.cat, (m.get(r.cat) ?? 0) + rowEst(r));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const suppliers = useMemo(() => [...new Set([...s.catalog.map((c) => c.supplier), ...rows.map((r) => r.supplier)].filter(Boolean))].sort(), [s.catalog, rows]);
  const shown = rows.filter((r) => (filter === 'Semua' || r.cat === filter) && (!q || `${r.name} ${r.spec} ${r.supplier} ${r.note}`.toLowerCase().includes(q.toLowerCase())));
  const logo = prod.logo ?? localStorage.getItem('intero_bizlogo');

  const addRow = () => setRows([{ id: uid('HR'), name: '', cat: filter !== 'Semua' ? filter : 'Material', spec: '', unit: 'pcs', estVol: 1, estPrice: 0, realVol: null, realPrice: null, progress: 0, supplier: '', note: '' }, ...rows]);
  /** Pilih nama dari katalog → kategori, satuan, harga & supplier terisi otomatis. */
  const onName = (r: HppRow, v: string) => {
    const c = s.catalog.find((x) => x.name.toLowerCase() === v.trim().toLowerCase());
    patch(r.id, c ? { name: c.name, cat: c.cat, unit: c.unit, estPrice: c.price, supplier: r.supplier || c.supplier, spec: r.spec || c.spec || '' } : { name: v });
  };
  const copyReal = (r: HppRow) => patch(r.id, { realVol: r.estVol, realPrice: r.estPrice });
  const fillAllReal = () => { setRows(rows.map((r) => (r.realVol == null && r.realPrice == null ? { ...r, realVol: r.estVol, realPrice: r.estPrice } : r))); toast('Realisasi kosong diisi sama dengan estimasi', 'info'); };
  const doExport = async (kind: 'pdf' | 'xls' | 'csv') => {
    setBusy(kind);
    try {
      if (kind === 'csv') { exportRowsCsv(s.projectName, rows); toast('CSV HPP diunduh', 'success'); }
      else if (kind === 'xls') { await exportRowsXlsx(s.projectName, rows, settings, scenario.margin, scenario.ppnOn); toast('Excel HPP diunduh', 'success'); }
      else { await exportRowsPdf({ projectName: s.projectName, rows, settings, margin: scenario.margin, ppnOn: scenario.ppnOn, logo, scenario: scenario.name }); toast('PDF HPP diunduh', 'success'); }
    } catch (e) { toast(`Gagal export: ${(e as Error).message}`, 'error'); } finally { setBusy(null); }
  };
  const doImport = async (mode: 'rows' | 'catalog') => {
    setBusy('imp');
    try {
      const res = await importRows(mode);
      if (!res) { toast('Tidak ada baris valid. Kolom: nama, kategori, satuan, harga, supplier', 'warning'); return; }
      if ('rows' in res) { setRows([...res.rows, ...rows]); toast(`${res.rows.length} baris diimpor`, 'success'); }
      else { const { saveCatalog } = await import('../../lib/catalog'); const merged = [...s.catalog, ...res.catalog]; s.ui({ catalog: merged }); await saveCatalog(merged); toast(`${res.catalog.length} item katalog diimpor`, 'success'); }
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(null); }
  };
  const setScn = (p: Partial<Scenario>) => s.setProduction({ scenarios: prod.scenarios.map((x) => (x.id === scenario.id ? { ...x, ...p } : x)) });
  const chip = (id: string, label: string, color?: string) => (
    <button key={id} className="badge shrink-0" style={filter === id ? { background: color ?? 'var(--brand-primary)', color: '#fff', border: `1px solid ${color ?? 'var(--brand-primary)'}` } : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }} onClick={() => setFilter(id)}>{label}</button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="seg"><button className={scenario.method === 'papan_hpl' ? 'active' : ''} onClick={() => setScn({ method: 'papan_hpl' })}>Papan+HPL</button><button className={scenario.method === 'rangka_acp' ? 'active' : ''} onClick={() => setScn({ method: 'rangka_acp' })}>Rangka+ACP</button></div>
        <button className={`btn btn-sm ${stale ? 'btn-primary' : 'btn-secondary'}`} onClick={regenerate}><RefreshCw size={13} />Auto-hitung</button>
        {stale && <span className="badge badge-warn"><TriangleAlert size={11} />Scene berubah — perbarui estimasi</span>}
        <button className="btn btn-secondary btn-sm" onClick={addRow}><Plus size={13} />Baris</button>
        <button className="btn btn-secondary btn-sm" onClick={fillAllReal} title="Isi realisasi kosong = estimasi"><Wand2 size={13} />Real = Est</button>
        <button className="btn btn-secondary btn-sm" onClick={() => doImport('rows')} disabled={busy === 'imp'}><Upload size={13} />Import</button>
        <button className="btn btn-secondary btn-sm" onClick={() => doImport('catalog')} disabled={busy === 'imp'}><Upload size={13} />Katalog</button>
        <button className="btn btn-ghost btn-sm" onClick={() => s.ui({ showPriceList: true })}>Harga Lama</button>
        <div className="flex-1" />
        <button className="btn btn-ghost btn-sm" onClick={() => doExport('csv')} disabled={busy !== null}><Download size={13} />CSV</button>
        <button className="btn btn-secondary btn-sm" onClick={() => doExport('xls')} disabled={busy !== null}><FileSpreadsheet size={13} />Excel</button>
        <button className="btn btn-primary btn-sm" onClick={() => doExport('pdf')} disabled={busy !== null}><FileText size={13} />{busy === 'pdf' ? '…' : 'PDF'}</button>
      </div>

      <div className="px-3 py-2 shrink-0 flex flex-col gap-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
        {totals.estTotal > 0 && <div className="hpp-cat-bar">{byCat.map(([c, v]) => <div key={c} title={`${c} ${fmtRp(v)}`} style={{ width: `${(v / totals.estTotal) * 100}%`, background: colorOf(c) }} />)}</div>}
        <div className="flex flex-wrap items-center gap-1.5">
          {chip('Semua', `Semua · ${fmtRp(totals.estTotal)}`)}
          {byCat.map(([c, v]) => chip(c, `${c} · ${fmtRp(v)} (${totals.estTotal ? Math.round((v / totals.estTotal) * 100) : 0}%)`, colorOf(c)))}
          <div className="flex-1" />
          <input className="input" style={{ width: 170, height: 28 }} placeholder="Cari item / supplier…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 hpp-scroll">
        <table className="hpp-table">
          <thead><tr>{['No', 'Nama Item', 'Kategori', 'Spesifikasi', 'Satuan', 'Est. Vol', 'Est. Harga', 'Est. Total', 'Real. Vol', 'Real. Harga', 'Real. Total', 'Selisih', '% Progress', 'Supplier', 'Catatan', ''].map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r, idx) => {
              const est = rowEst(r), real = rowReal(r), diff = real == null ? null : real - est;
              return (
                <tr key={r.id}>
                  <td className="mono"><span className="inline-block w-1.5 h-4 rounded-sm align-middle mr-1" style={{ background: colorOf(r.cat) }} />{idx + 1}</td>
                  <td style={{ minWidth: 210 }}><input className="hpp-in" value={r.name} placeholder="Ketik / pilih dari katalog" onChange={(e) => onName(r, e.target.value)} list="hpp-catalog-names" /></td>
                  <td><select className="hpp-in" value={r.cat} onChange={(e) => patch(r.id, { cat: e.target.value })}>{[...new Set([...HPP_CATS, r.cat])].map((c) => <option key={c} value={c}>{c}</option>)}</select></td>
                  <td style={{ minWidth: 130 }}><input className="hpp-in" value={r.spec} placeholder="Merk / ukuran" onChange={(e) => patch(r.id, { spec: e.target.value })} /></td>
                  <td><select className="hpp-in" value={r.unit} onChange={(e) => patch(r.id, { unit: e.target.value })}>{[...new Set([...UNITS, r.unit])].map((u) => <option key={u} value={u}>{u}</option>)}</select></td>
                  <td className="est"><input className="hpp-in" type="number" min={0} step="0.01" value={r.estVol} onChange={(e) => patch(r.id, { estVol: inp(e.target.value) })} /></td>
                  <td className="est"><input className="hpp-in" type="number" min={0} value={r.estPrice} onChange={(e) => patch(r.id, { estPrice: inp(e.target.value) })} /></td>
                  <td className="est mono strong" style={{ whiteSpace: 'nowrap' }}>{fmtRp(est)}</td>
                  <td className="real"><input className="hpp-in" type="number" min={0} step="0.01" placeholder="—" value={r.realVol ?? ''} onChange={(e) => patch(r.id, { realVol: e.target.value === '' ? null : inp(e.target.value) })} /></td>
                  <td className="real"><input className="hpp-in" type="number" min={0} placeholder="—" value={r.realPrice ?? ''} onChange={(e) => patch(r.id, { realPrice: e.target.value === '' ? null : inp(e.target.value) })} /></td>
                  <td className="real mono strong" style={{ whiteSpace: 'nowrap' }}>{real == null ? '—' : fmtRp(real)}</td>
                  <td className={`mono strong ${diff == null ? '' : diff <= 0 ? 'save' : 'over'}`} style={{ whiteSpace: 'nowrap' }}>{diff == null ? '—' : <>{diff <= 0 ? <ArrowDown size={11} className="inline" /> : <ArrowUp size={11} className="inline" />} {fmtRp(Math.abs(diff))}</>}</td>
                  <td className="prog"><input type="range" min={0} max={100} step={5} value={r.progress} onChange={(e) => patch(r.id, { progress: +e.target.value })} /><span className="mono"> {r.progress}%</span></td>
                  <td style={{ minWidth: 120 }}><input className="hpp-in" value={r.supplier} list="hpp-suppliers" placeholder="Toko" onChange={(e) => patch(r.id, { supplier: e.target.value })} /></td>
                  <td style={{ minWidth: 130 }}><input className="hpp-in" value={r.note} placeholder="Catatan" onChange={(e) => patch(r.id, { note: e.target.value })} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" style={{ width: 24, height: 24 }} data-tip="Salin estimasi → realisasi" onClick={() => copyReal(r)} aria-label="Salin ke realisasi"><ClipboardCopy size={12} /></button>
                    <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setRows(rows.filter((x) => x.id !== r.id))} aria-label="Hapus baris"><Trash2 size={12} /></button>
                  </td>
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={16} className="text-center p-6" style={{ color: 'var(--text-tertiary)' }}>{rows.length ? 'Tidak ada baris yang cocok dengan filter.' : <>Belum ada baris. Klik <b>Auto-hitung</b> untuk mengisi dari scene, atau <b>Baris</b> untuk manual.</>}</td></tr>}
          </tbody>
        </table>
        <datalist id="hpp-suppliers">{suppliers.map((sp) => <option key={sp} value={sp} />)}</datalist>
        <datalist id="hpp-catalog-names">{s.catalog.map((c) => <option key={c.id} value={c.name} />)}</datalist>
      </div>

      <div className="hpp-summary shrink-0">
        <div className="hpp-sum-grid">
          <div><span>Total Estimasi</span><b className="mono">{fmtRp(totals.estTotal)}</b></div>
          <div><span>Total Realisasi</span><b className="mono">{totals.hasReal ? fmtRp(totals.realTotal) : '—'}{totals.hasReal && <em className={totals.diff <= 0 ? 'save' : 'over'}> ({totals.diff >= 0 ? '+' : ''}{totals.diffPct.toFixed(2)}%)</em>}</b></div>
          <div><span>Selisih</span><b className={`mono ${!totals.hasReal ? '' : totals.diff <= 0 ? 'save' : 'over'}`}>{totals.hasReal ? `${totals.diff >= 0 ? '+' : '-'}${fmtRp(Math.abs(totals.diff))}` : '—'}</b></div>
          <div><span>Progres beli</span><b className="mono">{totals.progress}%</b></div>
        </div>
        <div className="hpp-sum-grid">
          <div className="hpp-margin"><span>Margin</span><input className="input mono" type="number" min={0} max={200} style={{ width: 64, height: 26 }} value={scenario.margin} onChange={(e) => setScn({ margin: Math.max(0, +e.target.value) })} /><span>%</span><b className="mono">{fmtRp(totals.hasReal ? totals.sellReal : totals.sellEst)}</b></div>
          <label className="hpp-margin cursor-pointer"><input type="checkbox" className="accent-[var(--brand-primary)]" checked={scenario.ppnOn} onChange={(e) => setScn({ ppnOn: e.target.checked })} />PPN 11% <b className="mono">{fmtRp(totals.ppn)}</b></label>
          <div><span>Total Akhir</span><b className="mono final">{fmtRp(totals.sellFinal)}</b></div>
        </div>
      </div>
    </div>
  );
}
