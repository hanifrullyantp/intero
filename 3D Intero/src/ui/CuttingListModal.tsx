import { useMemo, useState } from 'react';
import { useStore } from '../core/store';
import { Modal } from './modals';
import { allParts, cuttingList, buildBOM, materialSummary } from '../engine/cuttingList';
import { nestParts } from '../engine/nesting';
import { getBoard, getCountertop } from '../config/materials';
import { exportCuttingListCSV, exportCuttingListPDF, exportBOMCSV } from '../utils/exporters';
import { formatIDR } from '../utils/geometry';

type Tab = 'list' | 'nesting' | 'bom';

export default function CuttingListModal() {
  const project = useStore((s) => s.project);
  const { setUI, setSettings, select } = useStore.getState();
  const [tab, setTab] = useState<Tab>('list');
  const [kerf, setKerf] = useState(project.settings.kerf);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [groupBy, setGroupBy] = useState<'cabinet' | 'material'>('cabinet');

  const parts = useMemo(() => allParts(project), [project]);
  const rows = useMemo(() => cuttingList(project), [project]);
  const bom = useMemo(() => buildBOM(project), [project]);
  const sheets = useMemo(() => nestParts(parts, kerf), [parts, kerf]);
  const summary = useMemo(() => materialSummary(parts), [parts]);
  const totalSheetsNested = sheets.length;
  const avgUtil = sheets.length ? Math.round(sheets.reduce((s, x) => s + x.utilization, 0) / sheets.length) : 0;
  const sheet = sheets[Math.min(sheetIdx, sheets.length - 1)];

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = groupBy === 'cabinet' ? r.cabinet : getBoard(r.material).name;
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()];
  }, [rows, groupBy]);

  return (
    <Modal
      title="Cutting List · Nesting · Bill of Materials"
      width="max-w-6xl"
      onClose={() => setUI({ modal: null })}
      footer={
        <>
          <button className="btn" onClick={() => exportBOMCSV(project)}>
            BOM CSV
          </button>
          <button className="btn" onClick={() => exportCuttingListCSV(project)}>
            Cutting list CSV
          </button>
          <button className="btn-primary" onClick={() => exportCuttingListPDF(project)}>
            Cutting list PDF
          </button>
        </>
      }
    >
      <div className="flex items-center gap-1 mb-3">
        {(['list', 'nesting', 'bom'] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'list' ? `Cutting list (${rows.reduce((s, r) => s + r.qty, 0)} parts)` : t === 'nesting' ? `Sheet nesting (${totalSheetsNested} sheets)` : 'Bill of materials'}
          </button>
        ))}
        <div className="flex-1" />
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <Stat l="Sheets" v={`${totalSheetsNested}`} />
          <Stat l="Edge banding" v={`${bom.edgeBandingMeters} m`} />
          <Stat l="Utilisation" v={`${avgUtil}%`} />
          <Stat l="Waste" v={`${100 - avgUtil}%`} />
        </div>
      </div>

      {tab === 'list' && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs">
            <span className="text-slate-400">Group by</span>
            <button className={`chip ${groupBy === 'cabinet' ? 'active' : ''}`} onClick={() => setGroupBy('cabinet')}>
              Cabinet
            </button>
            <button className={`chip ${groupBy === 'material' ? 'active' : ''}`} onClick={() => setGroupBy('material')}>
              Material
            </button>
            <span className="text-slate-500 ml-2">Dimensions are finished cut sizes in cm; edge banding code: nL = long edges, nS = short edges.</span>
          </div>
          <div className="card max-h-[55vh] overflow-auto">
            <table className="w-full table-xs">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Length</th>
                  <th>Width</th>
                  <th>Qty</th>
                  <th>Thk</th>
                  <th>Material</th>
                  <th>Edge</th>
                  <th>Grain</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([g, list]) => (
                  <GroupRows key={g} group={g} list={list} onSelect={(id) => select([id])} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'nesting' && (
        <div className="grid md:grid-cols-[1fr_260px] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs">
              <button className="btn" disabled={sheetIdx <= 0} onClick={() => setSheetIdx(sheetIdx - 1)}>
                ← Prev
              </button>
              <span className="font-mono">
                Sheet {Math.min(sheetIdx + 1, sheets.length)} / {sheets.length}
              </span>
              <button className="btn" disabled={sheetIdx >= sheets.length - 1} onClick={() => setSheetIdx(sheetIdx + 1)}>
                Next →
              </button>
              {sheet && (
                <span className="ml-3 text-slate-400">
                  {getBoard(sheet.material).name} · {sheet.w}×{sheet.h} cm · <b className={sheet.utilization > 70 ? 'text-[#66bb6a]' : 'text-[#ffa726]'}>{sheet.utilization}% used</b> · {sheet.parts.length} parts
                </span>
              )}
            </div>
            {sheet && <SheetView sheet={sheet} />}
          </div>
          <div className="flex flex-col gap-3">
            <div className="card p-3">
              <div className="label">Saw kerf</div>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min={0} max={6} step={0.5} value={kerf} onChange={(e) => setKerf(parseFloat(e.target.value))} className="flex-1" />
                <span className="font-mono text-xs w-12">{kerf} mm</span>
              </div>
              <button className="btn mt-2 w-full" onClick={() => setSettings({ kerf })}>
                Save to project
              </button>
            </div>
            <div className="card p-3 text-xs">
              <div className="label mb-1">Sheets by material</div>
              {summary.map((s) => (
                <div key={s.material} className="flex justify-between py-0.5">
                  <span>{s.name}</span>
                  <span className="font-mono">{sheets.filter((x) => x.material === s.material).length} sht</span>
                </div>
              ))}
            </div>
            <div className="card p-3 text-xs">
              <div className="label mb-1">All sheets</div>
              <div className="flex flex-wrap gap-1">
                {sheets.map((s, i) => (
                  <button key={i} className={`chip ${i === sheetIdx ? 'active' : ''}`} onClick={() => setSheetIdx(i)} title={`${getBoard(s.material).name} — ${s.utilization}%`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'bom' && (
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div className="card">
            <table className="w-full table-xs">
              <thead>
                <tr>
                  <th>Board material</th>
                  <th>Parts m²</th>
                  <th>Sheets</th>
                  <th>Util.</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {bom.boards.map((b) => (
                  <tr key={b.material}>
                    <td>{b.name}</td>
                    <td className="font-mono">{b.partArea}</td>
                    <td className="font-mono">{b.sheets}</td>
                    <td className="font-mono">{b.utilization}%</td>
                    <td className="font-mono">{formatIDR(b.price)}</td>
                  </tr>
                ))}
                <tr>
                  <td>Edge banding (PVC 2 mm)</td>
                  <td className="font-mono" colSpan={3}>
                    {bom.edgeBandingMeters} m
                  </td>
                  <td className="font-mono">{formatIDR(bom.edgeBandingMeters * 6000)}</td>
                </tr>
                <tr>
                  <td>Countertop — {getCountertop(project.materials.countertop).name}</td>
                  <td className="font-mono" colSpan={3}>
                    {bom.countertopM2} m²
                  </td>
                  <td className="font-mono">{formatIDR(bom.countertopM2 * getCountertop(project.materials.countertop).price_per_m2)}</td>
                </tr>
                {bom.backsplashM2 > 0 && (
                  <tr>
                    <td>Backsplash</td>
                    <td className="font-mono" colSpan={3}>
                      {bom.backsplashM2} m²
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card">
            <table className="w-full table-xs">
              <thead>
                <tr>
                  <th>Hardware / accessory</th>
                  <th>Qty</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {[...bom.hinges, ...bom.slides, ...bom.handles, ...bom.accessories].map((h, i) => (
                  <tr key={i}>
                    <td>{h.name}</td>
                    <td className="font-mono">{h.qty} pcs</td>
                    <td className="font-mono">{formatIDR(h.price)}</td>
                  </tr>
                ))}
                {bom.appliances.map((a, i) => (
                  <tr key={'a' + i}>
                    <td>{a.name}</td>
                    <td className="font-mono">{a.qty}</td>
                    <td className="font-mono">{formatIDR(a.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="card px-2 py-1 text-center min-w-20">
      <div className="label">{l}</div>
      <div className="font-mono text-sm text-white">{v}</div>
    </div>
  );
}

function GroupRows({ group, list, onSelect }: { group: string; list: ReturnType<typeof cuttingList>; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <tr className="bg-[#0f1923]/70 cursor-pointer" onClick={() => setOpen(!open)}>
        <td colSpan={8} className="py-1.5! font-semibold text-slate-200">
          {open ? '▼' : '▶'} {group} <span className="text-slate-500 font-normal">· {list.reduce((s, r) => s + r.qty, 0)} parts</span>
        </td>
      </tr>
      {open &&
        list.map((r, i) => (
          <tr key={i} className="hover:bg-white/5 cursor-pointer" onClick={() => onSelect(r.itemId)} title="Click to select cabinet">
            <td>{r.part}</td>
            <td className="font-mono">{r.w}</td>
            <td className="font-mono">{r.h}</td>
            <td className="font-mono">{r.qty}</td>
            <td className="font-mono">{r.thickness}</td>
            <td>{getBoard(r.material).name}</td>
            <td className="font-mono">{r.edge}</td>
            <td>{r.grain}</td>
          </tr>
        ))}
    </>
  );
}

function SheetView({ sheet }: { sheet: ReturnType<typeof nestParts>[number] }) {
  const W = 700;
  const s = W / sheet.h; // sheet drawn landscape: long side horizontal
  const H = sheet.w * s;
  const colors = ['#4fc3f7', '#ba68c8', '#4db6ac', '#ffa726', '#66bb6a', '#ef5350', '#90a4ae', '#f06292'];
  const cabIdx = new Map<string, number>();
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="card bg-[#0f1923]">
      <rect x={0} y={0} width={W} height={H} fill="#1b2533" stroke="#4fc3f7" />
      {sheet.parts.map((p, i) => {
        if (!cabIdx.has(p.cabinet)) cabIdx.set(p.cabinet, cabIdx.size);
        const col = colors[cabIdx.get(p.cabinet)! % colors.length];
        const x = p.y * s;
        const y = p.x * s;
        const w = p.h * s;
        const h = p.w * s;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={col} fillOpacity={0.35} stroke={col} strokeWidth={1} />
            {w > 40 && h > 14 && (
              <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(11, h * 0.4)} fill="#e0e0e0">
                {p.label} {p.w}×{p.h}
              </text>
            )}
          </g>
        );
      })}
      <text x={6} y={H - 6} fontSize="10" fill="#8892a0">
        {sheet.h} × {sheet.w} cm — grey = waste
      </text>
    </svg>
  );
}
