import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, FileSpreadsheet, FileText, Plus, Settings2, Trash2 } from 'lucide-react';
import { useStore } from '../../store';
import type { CostCategory, Item, PriceItem, Scenario, Wall } from '../../types';
import type { HppResult, ProductionBundle } from '../../production/types';
import { SECTION_ORDER, computeHpp, fmtRp } from '../../production/hpp';
import { buildProduction } from '../../production';
import { SLOTS_HEMAT, SLOTS_PREMIUM, SLOTS_STANDAR, SLOT_LABELS } from '../../production/prices';
import { exportHppPdf } from '../../production/export-pdf';
import { exportHppExcel } from '../../production/export-excel';
import { Field, Select, Toggle, toast } from '../ui';
import { uid } from '../../lib/utils';

interface Props { hpp: HppResult; bundle: ProductionBundle; scenario: Scenario; items: Item[]; walls: Wall[]; prices: PriceItem[] }

export function HppPanel({ hpp, bundle, scenario, items, walls, prices }: Props) {
  const s = useStore();
  const prod = s.settings.production;
  const [open, setOpen] = useState<Record<string, boolean>>({ material: true, hardware: false, appliance: false, countertop: false, led: false, jasa: false, overhead: false, custom: true });
  const [adding, setAdding] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', qty: 1, unit: 'pcs', price: 0 });
  const [compare, setCompare] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [busy, setBusy] = useState<null | 'pdf' | 'xls'>(null);

  const updateScenario = (patch: Partial<Scenario>) => s.setProduction({ scenarios: prod.scenarios.map((x) => (x.id === scenario.id ? { ...x, ...patch } : x)) });
  const addScenario = (preset: 'hemat' | 'standar' | 'premium') => {
    const slots = preset === 'hemat' ? SLOTS_HEMAT : preset === 'premium' ? SLOTS_PREMIUM : SLOTS_STANDAR;
    const id = uid('sc'); const name = `HPP ${preset === 'hemat' ? 'Hemat' : preset === 'premium' ? 'Premium' : 'Standar'}${prod.scenarios.length ? ` ${prod.scenarios.length + 1}` : ''}`;
    s.setProduction({ scenarios: [...prod.scenarios, { ...scenario, id, name, slots: { ...slots } }], activeScenario: id });
  };
  const delScenario = () => { if (prod.scenarios.length <= 1) { toast('Minimal satu skenario', 'warning'); return; } const rest = prod.scenarios.filter((x) => x.id !== scenario.id); s.setProduction({ scenarios: rest, activeScenario: rest[0].id }); };
  const rename = () => { const n = window.prompt('Nama skenario:', scenario.name); if (n?.trim()) updateScenario({ name: n.trim() }); };
  const addCustom = (sectionId: string) => {
    if (!form.name.trim() || form.price < 0) { toast('Isi nama item dan harga', 'error'); return; }
    const cat: CostCategory = SECTION_ORDER.find((x) => x.id === sectionId)?.cat ?? 'lainnya';
    s.setProduction({ customItems: [...prod.customItems, { id: uid('CI'), name: form.name.trim(), qty: form.qty, unit: form.unit, price: form.price, category: cat }] });
    setForm({ name: '', qty: 1, unit: 'pcs', price: 0 }); setAdding(null);
  };
  const logo = prod.logo ?? localStorage.getItem('intero_bizlogo');
  const uploadLogo = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return;
      const img = new Image(); const url = URL.createObjectURL(f);
      img.onload = () => {
        const sc = Math.min(1, 256 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL('image/png'); try { localStorage.setItem('intero_bizlogo', data); } catch { /* kuota */ }
        s.setProduction({ logo: data }); URL.revokeObjectURL(url); toast('Logo bisnis disimpan', 'success');
      };
      img.src = url;
    };
    input.click();
  };
  const doPdf = async () => {
    setBusy('pdf');
    try { await exportHppPdf({ projectName: s.projectName, hpp, scenario, settings: s.settings, thumb: s.designThumb, logo }); toast('PDF HPP diunduh', 'success'); }
    catch (e) { toast(`Gagal membuat PDF: ${(e as Error).message}`, 'error'); } finally { setBusy(null); }
  };
  const doXls = async () => {
    setBusy('xls');
    try { await exportHppExcel({ projectName: s.projectName, hpp, scenario, settings: s.settings, bundle, items, prices }); toast('Excel HPP diunduh', 'success'); }
    catch (e) { toast(`Gagal membuat Excel: ${(e as Error).message}`, 'error'); } finally { setBusy(null); }
  };
  const compareRows = useMemo(() => {
    if (!compare) return [];
    const cache: Record<string, ProductionBundle> = {};
    return prod.scenarios.map((sc) => { const b = (cache[sc.method] ??= buildProduction(items, s.settings, sc.method)); return { sc, r: computeHpp(b, items, s.settings, prices, sc, walls) }; });
  }, [compare, prod.scenarios, items, s.settings, prices, walls]);
  const slotKeys = Object.keys(SLOT_LABELS);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <Select value={scenario.id} onChange={(v) => s.setProduction({ activeScenario: v })} options={prod.scenarios.map((x) => ({ value: x.id, label: x.name }))} className="flex-1" />
          <button className="icon-btn" data-tip="Ganti nama" onClick={rename}><Settings2 size={15} /></button>
          <button className="icon-btn" data-tip="Hapus skenario" onClick={delScenario}><Trash2 size={15} /></button>
        </div>
        <div className="flex gap-1">{(['hemat', 'standar', 'premium'] as const).map((p) => <button key={p} className="btn btn-secondary btn-sm flex-1" onClick={() => addScenario(p)}><Copy size={12} />+ {p}</button>)}</div>
        <Field label="Metode konstruksi" inline><Select value={scenario.method} onChange={(v) => updateScenario({ method: v })} options={[{ value: 'papan_hpl', label: 'Papan + HPL' }, { value: 'rangka_acp', label: 'Rangka besi + ACP' }]} /></Field>
        <button className="btn btn-ghost btn-sm justify-start" onClick={() => setShowSlots(!showSlots)}>{showSlots ? <ChevronDown size={14} /> : <ChevronRight size={14} />}Pilihan material skenario</button>
        {showSlots && <div className="flex flex-col gap-1.5">{slotKeys.map((k) => { const opts = prices.filter((p) => p.slot === k); if (!opts.length) return null; return <Field key={k} label={SLOT_LABELS[k]} inline><Select value={scenario.slots[k] ?? opts[0].id} onChange={(v) => updateScenario({ slots: { ...scenario.slots, [k]: v } })} options={opts.map((o) => ({ value: o.id, label: `${o.name} — ${fmtRp(o.price)}` }))} /></Field>; })}</div>}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {hpp.sections.map((sec) => {
          const isOpen = open[sec.id];
          return (
            <div key={sec.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <button className="section-head" onClick={() => setOpen({ ...open, [sec.id]: !isOpen })}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<span className="flex-1">{sec.title}</span><span className="mono text-[11px]" style={{ textTransform: 'none' }}>{fmtRp(sec.subtotal)}</span></button>
              {isOpen && (
                <div className="px-3 pb-3 flex flex-col gap-1">
                  {sec.lines.map((l) => (
                    <div key={l.key} className="flex items-start gap-2 text-[12px]">
                      <div className="flex-1 min-w-0"><div className="truncate">{l.name}</div><div className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>{l.qty} {l.unit} × {fmtRp(l.unitPrice)}{l.note ? ` · ${l.note}` : ''}</div></div>
                      <span className="mono shrink-0">{fmtRp(l.total)}</span>
                      {l.custom && <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => s.setProduction({ customItems: prod.customItems.filter((c) => c.id !== l.customId) })}><Trash2 size={12} /></button>}
                    </div>
                  ))}
                  {!sec.lines.length && <span className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>Tidak ada item.</span>}
                  {adding === sec.id ? (
                    <div className="rounded-lg p-2 flex flex-col gap-1.5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <input className="input" placeholder="Nama item" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      <div className="grid grid-cols-3 gap-1.5">
                        <input className="input" type="number" min={0} placeholder="Qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: +e.target.value })} />
                        <input className="input" placeholder="Satuan" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                        <input className="input" type="number" min={0} placeholder="Harga" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
                      </div>
                      <div className="flex gap-1.5"><button className="btn btn-primary btn-sm flex-1" onClick={() => addCustom(sec.id)}>Tambah</button><button className="btn btn-secondary btn-sm" onClick={() => setAdding(null)}>Batal</button></div>
                    </div>
                  ) : <button className="btn btn-ghost btn-sm justify-start" onClick={() => { setAdding(sec.id); setForm({ name: '', qty: 1, unit: 'pcs', price: 0 }); }}><Plus size={13} />Tambah</button>}
                </div>
              )}
            </div>
          );
        })}

        <div className="p-3 flex flex-col gap-2.5">
          <Field label="Nama klien"><input className="input" value={prod.clientName} onChange={(e) => s.setProduction({ clientName: e.target.value })} /></Field>
          <Field label="Catatan proyek"><textarea className="input" style={{ height: 70, padding: 8 }} value={prod.notes} onChange={(e) => s.setProduction({ notes: e.target.value })} placeholder="Request klien, catatan khusus…" /></Field>
          <Field label="Timeline produksi (satu baris per tahap)"><textarea className="input" style={{ height: 64, padding: 8 }} value={prod.timeline} onChange={(e) => s.setProduction({ timeline: e.target.value })} placeholder={'Hari 1-3: potong & edging\nHari 4-10: assembly & finishing'} /></Field>
          <Field label="Syarat & Ketentuan (PDF)"><textarea className="input" style={{ height: 90, padding: 8 }} value={prod.terms} onChange={(e) => s.setProduction({ terms: e.target.value })} /></Field>
          <div className="flex items-center gap-2"><button className="btn btn-secondary btn-sm" onClick={uploadLogo}>Upload logo bisnis</button>{logo && <img src={logo} alt="logo" style={{ height: 28, borderRadius: 4 }} />}</div>
          <Toggle label="Bandingkan semua skenario" checked={compare} onChange={setCompare} />
          {compare && (
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-[11.5px]"><thead><tr style={{ background: 'var(--bg-secondary)' }}><th className="text-left p-1.5">Skenario</th><th className="text-right p-1.5">HPP</th><th className="text-right p-1.5">Total jual</th></tr></thead>
                <tbody>{compareRows.map(({ sc, r }) => <tr key={sc.id} style={{ borderTop: '1px solid var(--border)', background: sc.id === scenario.id ? 'var(--bg-selected)' : undefined }}><td className="p-1.5">{sc.name}<div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sc.method === 'papan_hpl' ? 'Papan+HPL' : 'Rangka+ACP'} · margin {sc.margin}%</div></td><td className="p-1.5 text-right mono">{fmtRp(r.subtotal)}</td><td className="p-1.5 text-right mono font-bold">{fmtRp(r.total)}</td></tr>)}</tbody></table>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex justify-between text-[12.5px]"><span>SUBTOTAL HPP</span><span className="mono font-semibold">{fmtRp(hpp.subtotal)}</span></div>
        <div className="flex items-center justify-between gap-2 text-[12.5px]">
          <span className="flex items-center gap-1.5">Margin <input className="input mono" type="number" min={0} max={200} style={{ width: 62, height: 26 }} value={scenario.margin} onChange={(e) => updateScenario({ margin: Math.max(0, +e.target.value) })} />%</span>
          <span className="mono">{fmtRp(hpp.marginAmount)}</span>
        </div>
        <label className="flex items-center justify-between text-[12.5px] cursor-pointer"><span className="flex items-center gap-1.5"><input type="checkbox" className="accent-[var(--brand-primary)]" checked={scenario.ppnOn} onChange={(e) => updateScenario({ ppnOn: e.target.checked })} />PPN 11%</span><span className="mono">{fmtRp(hpp.ppnAmount)}</span></label>
        <div className="flex justify-between text-[15px] font-extrabold pt-1" style={{ borderTop: '1px solid var(--border)', color: 'var(--brand-primary)' }}><span>TOTAL HARGA JUAL</span><span className="mono">{fmtRp(hpp.total)}</span></div>
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button className="btn btn-secondary btn-sm" onClick={() => s.ui({ showPriceList: true })}>Daftar Harga</button>
          <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={doPdf}><FileText size={13} />{busy === 'pdf' ? '…' : 'PDF'}</button>
          <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={doXls}><FileSpreadsheet size={13} />{busy === 'xls' ? '…' : 'Excel'}</button>
        </div>
      </div>
    </div>
  );
}
