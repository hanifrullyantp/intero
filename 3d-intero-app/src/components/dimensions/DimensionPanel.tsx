import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileDown, FileSpreadsheet, Ruler, TriangleAlert, X } from 'lucide-react';
import { useStore } from '../../store';
import type { DimLayers, DimUnit } from '../../types';
import { computeSummary, fmtLen } from '../../dimensions/compute';
import { exportDimensionsCsv, exportTechnicalDrawing } from '../../dimensions/export';
import { TYPE_LABELS } from '../../lib/constants';
import { Select, Toggle, toast, useIsMobile } from '../ui';

const LAYERS: { key: keyof DimLayers; label: string }[] = [
  { key: 'overall', label: 'Dimensi Total (overall)' }, { key: 'wall', label: 'Dimensi Dinding' }, { key: 'cabinet', label: 'Dimensi Cabinet' },
  { key: 'internal', label: 'Dimensi Internal (gap, clearance)' }, { key: 'vertical', label: 'Dimensi Vertikal (tinggi)' }, { key: 'doors', label: 'Dimensi Pintu & Laci' },
];

/** Panel floating: toggle layer dimensi, satuan, ringkasan terorganisir & ekspor. */
export function DimensionPanel() {
  const s = useStore();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState<Record<string, boolean>>({ overall: true, walls: true, cabinets: false, vertical: true, clearance: true });
  const sum = useMemo(() => computeSummary(s.items, s.walls, s.settings, s.dimUnit, s.dimDecimals), [s.items, s.walls, s.settings, s.dimUnit, s.dimDecimals]);
  if (!s.showDimPanel) return null;
  const f = (mm: number) => fmtLen(mm, s.dimUnit, s.dimDecimals);
  const head = (id: string, title: string) => (
    <button className="section-head" onClick={() => setOpen({ ...open, [id]: !open[id] })}>{open[id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<span className="flex-1">{title}</span></button>
  );
  const row = (a: string, b: string, warn?: boolean) => <div className="flex justify-between gap-3 text-[12px] py-0.5" style={{ color: warn ? 'var(--warning)' : undefined }}><span className="min-w-0">{warn && <TriangleAlert size={11} className="inline mr-1" />}{a}</span><span className="mono shrink-0">{b}</span></div>;
  const logo = s.settings.production.logo ?? localStorage.getItem('intero_bizlogo');
  const pdf = async () => { try { await exportTechnicalDrawing(s.projectName, s.items, s.walls, s.settings, s.dimUnit, s.dimDecimals, logo); toast('Technical drawing PDF diunduh', 'success'); } catch (e) { toast(`Gagal: ${(e as Error).message}`, 'error'); } };
  const style: React.CSSProperties = isMobile
    ? { position: 'fixed', left: 8, right: 8, bottom: 72, maxHeight: '58vh', zIndex: 380 }
    : { position: 'absolute', right: 12, top: 12, width: 330, maxHeight: 'calc(100% - 84px)', zIndex: 25 };
  return (
    <div className="panel rounded-2xl flex flex-col overflow-hidden" style={style}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Ruler size={16} style={{ color: 'var(--brand-primary)' }} /><span className="text-[13px] font-bold flex-1">Dimensi Proyek</span>
        <button className="icon-btn" onClick={() => s.ui({ showDimPanel: false })} aria-label="Tutup"><X size={15} /></button>
      </div>
      <div className="overflow-y-auto">
        <div className="p-3 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <Toggle label="Tampilkan dimensi di viewport" checked={s.showDimensions} onChange={(v) => s.setDim({ showDimensions: v })} />
          <div className="grid grid-cols-1 gap-1.5">
            {LAYERS.map((l) => (
              <label key={l.key} className="flex items-center gap-2 text-[12.5px] cursor-pointer">
                <input type="checkbox" className="accent-[var(--brand-primary)]" checked={s.dimLayers[l.key]} onChange={(e) => s.setDim({ dimLayers: { ...s.dimLayers, [l.key]: e.target.checked }, showDimensions: true })} />{l.label}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={s.dimUnit} onChange={(v) => s.setDim({ dimUnit: v as DimUnit })} options={[{ value: 'mm', label: 'mm' }, { value: 'cm', label: 'cm' }, { value: 'm', label: 'm' }, { value: 'in', label: 'inch' }]} />
            <Select value={String(s.dimDecimals)} onChange={(v) => s.setDim({ dimDecimals: +v as 0 | 1 | 2 })} options={[{ value: '0', label: '0 desimal' }, { value: '1', label: '1 desimal' }, { value: '2', label: '2 desimal' }]} />
          </div>
        </div>
        {!s.items.length && <p className="p-3 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Belum ada komponen.</p>}
        {!!s.items.length && (<>
          {head('overall', 'Dimensi Keseluruhan')}
          {open.overall && <div className="px-3 pb-2">{row('Total Lebar', f(sum.overall.w))}{row('Total Dalam', f(sum.overall.d))}{row('Total Tinggi', f(sum.overall.h))}{row('Luas Area', `${sum.overall.area.toFixed(2)} m²`)}</div>}
          {head('walls', 'Dimensi per Dinding')}
          {open.walls && <div className="px-3 pb-2">{sum.walls.map((w) => row(w.name, f(w.length)))}{!sum.walls.length && row('Dinding', 'open')}</div>}
          {head('cabinets', `Dimensi per Cabinet (${sum.cabinets.length})`)}
          {open.cabinets && <div className="px-3 pb-2">{sum.cabinets.map((c) => row(`${c.tag} ${TYPE_LABELS[c.type as keyof typeof TYPE_LABELS] ?? c.name}`, `${f(c.w)} × ${f(c.h)} × ${f(c.d)}`))}</div>}
          {head('vertical', 'Dimensi Vertikal')}
          {open.vertical && <div className="px-3 pb-2">{sum.vertical.map((v) => row(v.label, f(v.value)))}</div>}
          {head('clearance', 'Clearance & Gap')}
          {open.clearance && <div className="px-3 pb-2">{sum.clearance.length ? sum.clearance.map((c, i) => <div key={i}>{row(c.text, c.warn ? 'periksa' : 'OK', c.warn)}</div>) : <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Tidak ada gap atau hambatan terdeteksi.</span>}</div>}
        </>)}
      </div>
      <div className="p-3 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary btn-sm" onClick={pdf} disabled={!s.items.length}><FileDown size={13} />Technical PDF</button>
        <button className="btn btn-secondary btn-sm" disabled={!s.items.length} onClick={() => { exportDimensionsCsv(s.projectName, s.items, s.walls, s.settings, s.dimUnit, s.dimDecimals); toast('CSV dimensi diunduh', 'success'); }}><FileSpreadsheet size={13} />CSV</button>
      </div>
    </div>
  );
}
