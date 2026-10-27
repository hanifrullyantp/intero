import { useMemo } from 'react';
import { Box, ChevronLeft, Factory, Gauge, Receipt, Scissors } from 'lucide-react';
import { useStore } from '../../store';
import type { ProdTab } from '../../types';
import { activeScenario, fmtRp } from '../../production/hpp';
import { buildProduction } from '../../production';
import { buildFrame } from '../../production/frame';
import { planCuts, totalBuy } from '../../production/cutlist';
import { hppTotals } from '../../production/hpp2';
import { overallProgress } from '../../production/status';
import { useIsMobile } from '../ui';
import { CuttingTab } from './CuttingTab';
import { FramePanel } from './FramePanel';
import { HppTab } from './HppTab';

function KpiChip({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="kpi-chip" title={sub ? `${label}: ${value} (${sub})` : `${label}: ${value}`}>
      <span className="kpi-chip-l">{label}</span>
      <b className="kpi-chip-v mono" style={tone === 'warn' ? { color: 'var(--warning)' } : tone === 'ok' ? { color: 'var(--brand-primary)' } : undefined}>{value}</b>
    </div>
  );
}

/** Mode Produksi — Rangka 3D (melayang di atas viewport utama) · Cutting List · HPP. */
export function ProductionMode() {
  const s = useStore();
  const isMobile = useIsMobile();
  const tab = s.prodTab;
  const prod = s.settings.production;
  const scenario = activeScenario(s.settings);
  const frame = useMemo(() => buildFrame(s.items, s.walls, s.settings, prod.frameMaterial), [s.items, s.walls, s.settings, prod.frameMaterial]);
  const bundle = useMemo(() => buildProduction(s.items, s.settings, scenario.method), [s.items, s.settings, scenario.method]);
  const plans = useMemo(() => planCuts(frame), [frame]);
  const rows = prod.hppRows[scenario.id] ?? [];
  const totals = useMemo(() => hppTotals(rows, scenario.margin, scenario.ppnOn), [rows, scenario.margin, scenario.ppnOn]);
  const sheetCount = bundle.nests.reduce((a, n) => a + n.sheets.length, 0);
  const worstWaste = bundle.nests.reduce((a, n) => Math.max(a, n.wastePct), 0);
  const progress = overallProgress(s.items.map((i) => i.config.prodStatus));
  const methodLabel = scenario.method === 'papan_hpl' ? 'Papan + HPL' : 'Rangka + ACP';

  const tabs: [ProdTab, string, React.ReactNode][] = [['rangka', 'Rangka 3D', <Box size={13} key="a" />], ['cutting', 'Cutting List', <Scissors size={13} key="b" />], ['hpp', 'HPP', <Receipt size={13} key="c" />]];
  const rangka = tab === 'rangka';
  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ pointerEvents: rangka ? 'none' : 'auto', background: rangka ? 'transparent' : 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <div className="shrink-0" style={{ pointerEvents: 'auto', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', boxShadow: rangka ? 'var(--shadow-sm)' : undefined }}>
        <div className="prod-tabbar" style={{ minHeight: 42, padding: '4px 10px' }}>
          <span className="badge badge-ok shrink-0" style={{ padding: '2px 7px', fontSize: 10.5 }}><Factory size={11} />PRODUKSI</span>
          <div className="seg shrink-0">{tabs.map(([id, label, icon]) => <button key={id} className={tab === id ? 'active' : ''} style={{ height: 28, fontSize: 12, padding: '0 10px' }} onClick={() => s.setProdTab(id)}>{icon}{label}</button>)}</div>
          <div className="kpi-inline-strip">
            <KpiChip label="Kabinet" value={String(bundle.items.length)} sub={`${frame.blocks.length} blok rangka`} />
            <KpiChip label="Rangka" value={`${totalBuy(plans)} btg`} sub={`${frame.totalLengthM.toFixed(1)} m hollow`} />
            <KpiChip label="Panel" value={`${sheetCount} lbr`} sub={`${bundle.panels.length} panel · waste ${worstWaste.toFixed(0)}%`} tone={worstWaste > 15 ? 'warn' : undefined} />
            <KpiChip label="Est. HPP" value={rows.length ? fmtRp(totals.estTotal) : '—'} sub={rows.length ? `${rows.length} item` : 'buka tab HPP'} />
            <KpiChip label="Harga Jual" value={rows.length ? fmtRp(totals.sellFinal) : '—'} sub={`margin ${scenario.margin}%${scenario.ppnOn ? ' + PPN' : ''}`} tone="ok" />
            <KpiChip label="Progres" value={`${progress}%`} sub="status produksi" />
          </div>
          <span className="flex-1" />
          <span className="badge shrink-0 hidden sm:inline-flex" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 11 }}>{methodLabel}</span>
          <button className="btn btn-sm btn-secondary shrink-0" style={{ height: 28, padding: '0 10px' }} onClick={() => s.setAppMode('design')}><ChevronLeft size={14} />Desain</button>
        </div>
      </div>

      {rangka && (
        <div className="flex-1 min-h-0 relative" style={{ pointerEvents: 'none' }}>
          {!s.items.length ? (
            <div className="absolute inset-0 flex items-center justify-center p-6"><div className="panel rounded-2xl p-5 text-center max-w-sm" style={{ pointerEvents: 'auto' }}><Gauge size={28} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" /><b>Belum ada kabinet</b><p className="text-[12.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>Kembali ke Mode Desain atau jalankan Magic Generator untuk membuat layout, lalu rangka akan tampil di sini.</p><button className="btn btn-primary btn-sm mt-3" onClick={() => s.setAppMode('design')}>Kembali ke Desain</button></div></div>
          ) : isMobile ? (
            <FramePanelWrap compact><FramePanel result={frame} compact /></FramePanelWrap>
          ) : (
            <div className="absolute" style={{ left: 12, top: 12, bottom: 12, pointerEvents: 'none', display: 'flex' }}><div style={{ pointerEvents: 'auto', maxHeight: '100%', display: 'flex' }}><FramePanel result={frame} /></div></div>
          )}
        </div>
      )}
      {tab === 'cutting' && <div className="flex-1 min-h-0"><CuttingTab items={s.items} frame={frame} bundle={bundle} methodLabel={methodLabel} /></div>}
      {tab === 'hpp' && <div className="flex-1 min-h-0"><HppTab items={s.items} walls={s.walls} settings={s.settings} scenario={scenario} /></div>}
    </div>
  );
}

function FramePanelWrap({ children }: { children: React.ReactNode; compact?: boolean }) {
  return <div className="absolute inset-0" style={{ pointerEvents: 'none' }}><div style={{ pointerEvents: 'auto' }}>{children}</div></div>;
}
