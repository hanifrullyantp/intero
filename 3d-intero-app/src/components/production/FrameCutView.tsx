import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, Scissors } from 'lucide-react';
import type { FrameResult } from '../../production/frame';
import { KERF, PROFILE_LABEL, ROLE_LABEL, exportCutCsv, exportCutPdf, planCuts, totalBuy, type CutPlan } from '../../production/cutlist';
import { toast } from '../ui';
import { useStore } from '../../store';

const hue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const cm = (mm: number) => (mm / 10).toFixed(1);

function BarRow({ plan, index }: { plan: CutPlan; index: number }) {
  const b = plan.bars[index];
  let x = 0;
  return (
    <div className="flex items-center gap-2">
      <span className="mono text-[10.5px] w-6 text-right shrink-0" style={{ color: 'var(--text-tertiary)' }}>#{b.n}</span>
      <svg viewBox={`0 0 ${plan.barLen} 120`} preserveAspectRatio="none" style={{ flex: 1, height: 28, minWidth: 180, background: 'repeating-linear-gradient(45deg, var(--bg-hover), var(--bg-hover) 6px, var(--bg-secondary) 6px, var(--bg-secondary) 12px)', border: '1px solid var(--border)', borderRadius: 4 }}>
        {b.pieces.map((p) => {
          const w = p.len + KERF; const px = x; x += w;
          return (
            <g key={p.id}>
              <rect x={px} y={0} width={p.len} height={120} fill={`hsl(${hue(p.blockId)} 55% 68%)`} stroke="#111827" strokeWidth={14}><title>{`${ROLE_LABEL[p.role]} ${cm(p.len)} cm — ${p.label}`}</title></rect>
              {p.len > 420 && <text x={px + p.len / 2} y={74} fontSize={52} textAnchor="middle" fill="#111827" fontWeight={700}>{cm(p.len)}</text>}
            </g>
          );
        })}
      </svg>
      <span className="mono text-[10.5px] w-[74px] shrink-0 text-right" style={{ color: b.free > 600 ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}>sisa {cm(b.free)}</span>
    </div>
  );
}

/** Daftar potong rangka: optimasi batang 6 m, visual per batang, tabel potongan terkelompok, ekspor CSV/PDF. */
export function FrameCutView({ frame }: { frame: FrameResult }) {
  const name = useStore((s) => s.projectName);
  const plans = useMemo(() => planCuts(frame), [frame]);
  const [sel, setSel] = useState<string>('all');
  const [busy, setBusy] = useState(false);
  const shown = sel === 'all' ? plans : plans.filter((p) => p.profile === sel);
  if (!plans.length) return <p className="p-4 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Belum ada rangka. Tambahkan kabinet terlebih dahulu.</p>;
  const pdf = async () => { setBusy(true); try { await exportCutPdf(name, plans); toast('PDF daftar potong diunduh', 'success'); } catch (e) { toast(`Gagal: ${(e as Error).message}`, 'error'); } finally { setBusy(false); } };
  return (
    <div className="p-3 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button className={`btn btn-sm ${sel === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSel('all')}>Semua · {totalBuy(plans)} btg</button>
          {plans.map((p) => <button key={p.profile} className={`btn btn-sm ${sel === p.profile ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSel(p.profile)}>{PROFILE_LABEL[p.profile]} · {p.buy}</button>)}
        </div>
        <div className="flex-1" />
        <button className="btn btn-secondary btn-sm" onClick={() => { exportCutCsv(name, plans); toast('CSV daftar potong diunduh', 'success'); }}><FileSpreadsheet size={13} />CSV</button>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={pdf}><FileDown size={13} />{busy ? '…' : 'PDF'}</button>
      </div>
      {shown.map((pl) => (
        <section key={pl.profile} className="rounded-2xl p-3 flex flex-col gap-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <Scissors size={15} style={{ color: 'var(--brand-primary)' }} /><b className="text-[13.5px]">{PROFILE_LABEL[pl.profile]}</b>
            <span className="badge badge-ok">{pl.pieceCount} potongan</span>
            <span className="badge badge-ok">{(pl.lengthMm / 1000).toFixed(2)} m</span>
            <span className="badge badge-info">optimal {pl.bars.length} btg</span>
            <span className="badge badge-info">standar +5% = {pl.standard} btg</span>
            <span className={`badge ${pl.wastePct <= 10 ? 'badge-ok' : 'badge-warn'}`}>waste {pl.wastePct.toFixed(1)}%</span>
            <span className="badge badge-ok" style={{ fontWeight: 800 }}>beli {pl.buy} batang</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="panel-title">Rencana potong per batang</div>
              <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto pr-1">{pl.bars.map((_, i) => <BarRow key={i} plan={pl} index={i} />)}</div>
            </div>
            <div className="min-w-0 overflow-x-auto">
              <div className="panel-title mb-1.5">Daftar potongan</div>
              <table className="hpp-table" style={{ fontSize: 11.5 }}>
                <thead><tr><th>Peran</th><th style={{ textAlign: 'right' }}>Panjang</th><th style={{ textAlign: 'right' }}>Qty</th><th>Blok</th></tr></thead>
                <tbody>{pl.groups.map((g) => (
                  <tr key={g.key}><td className="p-1">{ROLE_LABEL[g.role]}</td><td className="mono p-1" style={{ textAlign: 'right' }}>{cm(g.len)} cm</td><td className="mono strong p-1" style={{ textAlign: 'right' }}>{g.qty}×</td><td className="p-1" style={{ color: 'var(--text-tertiary)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={g.blocks.join(', ')}>{g.blocks.join(', ')}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
