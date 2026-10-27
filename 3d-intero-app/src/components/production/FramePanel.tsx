import { useMemo, useState } from 'react';
import { Boxes, ChevronDown, ChevronUp, Crosshair, Eye, EyeOff, Layers3, Palette, Ruler, Sparkles, Tag } from 'lucide-react';
import { useStore } from '../../store';
import type { FrameMaterialId, FrameViewMode } from '../../types';
import { FRAME_MATERIALS, type FrameResult } from '../../production/frame';
import { PROFILE_LABEL, planCuts, totalBuy } from '../../production/cutlist';
import { ROLE_LEGEND } from '../../production/frame3d';
import { fmtRp } from '../../production/hpp';
import { Select, Toggle } from '../ui';
import { sceneRef } from '../editor/Viewport';

const cm = (mm: number) => (Math.round(mm) / 10).toFixed(1);
const VIEW_LABEL: Record<FrameViewMode, string> = { frame: 'Rangka Only', frame_acp: 'Rangka + ACP Transparan', solid: 'Rangka + ACP Solid', exploded: 'Exploded View' };

/** Panel visualisasi rangka: mode tampil, material, warna per profil, rekap batang, daftar blok (klik = fokus & sorot). */
export function FramePanel({ result, compact }: { result: FrameResult; compact?: boolean }) {
  const s = useStore();
  const p = s.settings.production;
  const [open, setOpen] = useState(!compact);
  const view: FrameViewMode = p.frameView;
  const plans = useMemo(() => planCuts(result), [result]);
  const fm = FRAME_MATERIALS[p.frameMaterial];
  const barTotal = plans.reduce((a, pl) => a + pl.buy * (result.barPrice[pl.profile] || fm.bars[pl.profile]), 0);
  const selBlock = result.blocks.find((b) => b.cabinetIds.some((id) => s.selectedIds.includes(id)));
  const set = s.setFrame;
  const focusBlock = (ids: string[]) => { s.setSelection(ids); window.setTimeout(() => sceneRef.current?.focus(ids), 30); };
  const fitAll = () => { s.setSelection([]); const c = sceneRef.current; if (c) { const b = c.frameOverlayBounds(); c.fitCameraToObject(b.center, b.size * 1.05); } };

  const header = (
    <button className="w-full flex items-center gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
      <Layers3 size={15} style={{ color: 'var(--brand-primary)' }} /><span className="text-[13px] font-bold flex-1">Visualisasi Rangka</span>
      <span className="mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{totalBuy(plans)} btg</span>
      {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
    </button>
  );
  const wrapStyle: React.CSSProperties = compact
    ? { position: 'absolute', left: 8, right: 8, bottom: 8, maxHeight: open ? '58%' : undefined, overflowY: 'auto' }
    : { width: 288, maxHeight: 'calc(100% - 0px)', overflowY: 'auto' };
  return (
    <div className="panel rounded-2xl p-3 flex flex-col gap-2.5 frame-panel" style={wrapStyle}>
      {header}
      {open && (<>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {(['frame', 'frame_acp', 'solid', 'exploded'] as FrameViewMode[]).map((v) => (
            <label key={v} className="flex items-center gap-2 text-[12px] cursor-pointer py-0.5">
              <input type="radio" name="frameView" className="accent-[var(--brand-primary)]" checked={view === v} onChange={() => set({ frameView: v })} />{VIEW_LABEL[v]}
            </label>
          ))}
        </div>
        {view === 'exploded' && (
          <label className="flex flex-col gap-1"><span className="label">Jarak explode per-blok {(p.frameExplode / 10).toFixed(0)} cm</span><input type="range" className="slider" min={0} max={300} step={10} value={p.frameExplode} onChange={(e) => set({ frameExplode: +e.target.value })} /></label>
        )}
        <Select value={p.frameMaterial} onChange={(v) => set({ frameMaterial: v as FrameMaterialId })} options={(Object.keys(FRAME_MATERIALS) as FrameMaterialId[]).map((k) => ({ value: k, label: FRAME_MATERIALS[k].name }))} />
        <div className="flex flex-col gap-1">
          <Toggle label="Warna per profil" hint="Biru tiang · amber rel · ungu sekat · pink pintu" checked={p.frameColorBy === 'profile'} onChange={(v) => set({ frameColorBy: v ? 'profile' : 'material' })} />
          <Toggle label="Label ukuran" checked={p.frameLabels} onChange={(v) => set({ frameLabels: v })} />
          <Toggle label="Sembunyikan rangka pintu" checked={s.frameHideDoors} onChange={(v) => s.ui({ frameHideDoors: v })} />
          <Toggle label="Sambungan las" checked={p.frameWelds} onChange={(v) => set({ frameWelds: v })} />
        </div>
        {p.frameLabels && (
          <div className="flex flex-col gap-1.5 rounded-lg p-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Mode label</div>
            <Select value={s.frameLabelMode} onChange={(v) => s.ui({ frameLabelMode: v as 'block' | 'doors' | 'detail' })} options={[{ value: 'block', label: 'Ukuran per blok (L×D×T)' }, { value: 'doors', label: 'Ukuran per pintu' }, { value: 'detail', label: 'Detail per batang' }]} />
            <label className="flex flex-col gap-1"><span className="label">Ukuran tulisan ×{s.frameLabelScale.toFixed(1)}</span><input type="range" className="slider" min={0.5} max={2} step={0.1} value={s.frameLabelScale} onChange={(e) => s.ui({ frameLabelScale: +e.target.value })} /></label>
          </div>
        )}
        {p.frameColorBy === 'profile' && !fm.alu && (
          <div className="rounded-lg p-2 flex flex-col gap-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}><Palette size={11} />Legenda</div>
            {ROLE_LEGEND.map((l) => <div key={l.label} className="flex items-center gap-2 text-[11.5px]"><span className="w-3 h-3 rounded-sm shrink-0" style={{ background: l.color }} />{l.label}</div>)}
          </div>
        )}
        <div className="rounded-xl p-2 flex flex-col gap-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}><Ruler size={11} />Kebutuhan batang (6 m)</div>
          {plans.map((pl) => (
            <div key={pl.profile} className="flex justify-between gap-2 text-[11.5px]">
              <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{PROFILE_LABEL[pl.profile]}</span>
              <span className="mono shrink-0">{(pl.lengthMm / 1000).toFixed(1)} m · <b>{pl.buy}</b> btg</span>
            </div>
          ))}
          {result.cornerBrackets > 0 && <div className="flex justify-between text-[11.5px]"><span style={{ color: 'var(--text-secondary)' }}>Bracket siku L</span><span className="mono">{result.cornerBrackets} pcs</span></div>}
          <div className="flex justify-between text-[12px] font-semibold pt-1" style={{ borderTop: '1px solid var(--border)' }}><span>{totalBuy(plans)} batang · {result.totalLengthM.toFixed(1)} m</span><span className="mono">{fmtRp(barTotal)}</span></div>
          <p className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>Dihitung dari rencana potong optimal (kerf 3 mm) atau aturan +5% waste, mana yang lebih besar. Detail di tab Cutting List → Potong Rangka.</p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            <Boxes size={11} /><span className="flex-1">Blok rangka ({result.blocks.length})</span>
            <button className="btn btn-ghost btn-sm" style={{ height: 22, fontSize: 10.5, padding: '0 6px' }} onClick={fitAll}><Crosshair size={11} />Semua</button>
          </div>
          {result.blocks.map((b) => {
            const mems = result.members.filter((m) => m.blockId === b.id);
            const active = selBlock?.id === b.id;
            const hidden = s.frameHideBlocks.includes(b.id);
            const toggleHide = (e: React.MouseEvent) => { e.stopPropagation(); s.ui({ frameHideBlocks: hidden ? s.frameHideBlocks.filter((x) => x !== b.id) : [...s.frameHideBlocks, b.id] }); };
            return (
              <div key={b.id} className="rounded-lg px-2 py-1.5 text-left cursor-pointer" style={{ background: active ? 'var(--bg-selected)' : 'var(--bg-secondary)', border: `1px solid ${active ? 'var(--brand-primary)' : 'var(--border)'}`, opacity: hidden ? 0.5 : 1 }} onClick={() => focusBlock(b.cabinetIds)}>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold"><Tag size={11} style={{ color: 'var(--brand-primary)' }} /><span className="flex-1 truncate">{b.label}</span>
                  <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={toggleHide} data-tip={hidden ? 'Tampilkan blok' : 'Sembunyikan blok'} aria-label={hidden ? 'Tampilkan blok' : 'Sembunyikan blok'}>{hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                </div>
                <div className="text-[10.5px] mono" style={{ color: 'var(--text-tertiary)' }}>{cm(b.L)} × {cm(b.depth)} × {cm(b.y0 + b.height)} cm · {mems.length} batang · {(mems.reduce((a, m) => a + m.len, 0) / 1000).toFixed(1)} m{b.doors.length ? ` · ${b.doors.length} pintu` : ''}</div>
                {b.hood && <div className="text-[10px]" style={{ color: 'var(--info)' }}>Cooker hood — rangka reses (masuk)</div>}
                {(b.trimmedStart > 0 || b.trimmedEnd > 0) && <div className="text-[10px]" style={{ color: 'var(--warning)' }}>L-shape: dipotong {cm(b.trimmedStart || b.trimmedEnd)} cm di sudut (anti double rangka)</div>}
                {b.kind === 'standalone' && !b.hood && <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Rangka mandiri 4 sisi</div>}
              </div>
            );
          })}
        </div>
        <p className="text-[10.5px] flex items-start gap-1.5" style={{ color: 'var(--text-tertiary)' }}><Sparkles size={11} className="shrink-0 mt-0.5" />Klik kabinet di viewport atau blok di atas untuk menyorot rangkanya. Panel kabinet otomatis transparan; backsplash tidak punya rangka.</p>
      </>)}
    </div>
  );
}
