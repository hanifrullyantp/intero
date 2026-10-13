import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../core/store';
import { TEMPLATES } from '../config/templates';
import { HOOD_TYPES, APPLIANCES } from '../config/appliances';
import { estimatePrice } from '../engine/price';
import { formatIDR, footprint, center, r1 } from '../utils/geometry';
import { isCooktop, hoodMinDistance } from '../engine/constraints';
import { exportCuttingListCSV, exportBOMCSV, exportDXF, exportJSON, exportTechnicalPDF, exportQuotationPDF, exportCuttingListPDF, renderPlanImage, renderElevationImage, downloadCanvasPNG } from '../utils/exporters';
import { capture3D } from '../viewport/Viewport3D';
import { safeName } from '../core/projectManager';
import { generateParts } from '../engine/parametric';
import { getBoard, getColor } from '../config/materials';
import { NumberField } from './PropertiesPanel';
import type { HoodType, Item, DoorStyle, OpeningDirection } from '../models/types';
import { DraftingCompass, Image, Scissors, Receipt, FileText, X, Check, TriangleAlert, MoveHorizontal, type LucideIcon } from './icons';

export function Modal({ title, children, onClose, width = 'max-w-2xl', footer }: { title: string; children: React.ReactNode; onClose: () => void; width?: string; footer?: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${width} max-h-[92vh] flex flex-col card shadow-2xl anim-in`}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold tracking-wide">{title}</h2>
          <button className="tb-btn" onClick={onClose} title="Close (Esc)">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-4 py-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog() {
  const confirm = useStore((s) => s.ui.confirm);
  const setUI = useStore((s) => s.setUI);
  if (!confirm) return null;
  return (
    <Modal
      title={confirm.title}
      width="max-w-md"
      onClose={() => setUI({ confirm: null })}
      footer={
        <>
          <button className="btn" onClick={() => setUI({ confirm: null })}>
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              confirm.onConfirm();
              setUI({ confirm: null });
            }}
          >
            Confirm
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-300">{confirm.message}</p>
    </Modal>
  );
}

// ------------------------------------------------------------ Templates
export function TemplatesModal() {
  const { setUI, setProject, toast, requestFit } = useStore.getState();
  const [cat, setCat] = useState<'all' | 'kitchen' | 'tv' | 'wardrobe'>('all');
  const list = TEMPLATES.filter((t) => cat === 'all' || t.category === cat);
  return (
    <Modal title="Template Library" width="max-w-4xl" onClose={() => setUI({ modal: null })}>
      <div className="flex gap-1 mb-3">
        {(['all', 'kitchen', 'tv', 'wardrobe'] as const).map((c) => (
          <button key={c} className={`chip capitalize ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c === 'tv' ? 'TV Cabinet' : c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {list.map((t) => (
          <div key={t.id} className="card overflow-hidden hover:border-[#4fc3f7]/60 transition-colors flex flex-col">
            <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${t.accent} 0%, #0f1923 140%)` }}>
              <TemplateThumb id={t.id} />
              <span className="absolute top-2 left-2 badge capitalize">{t.category === 'tv' ? 'TV' : t.category}</span>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-[11px] text-slate-400 flex-1 mt-1">{t.description}</div>
              <div className="text-[10px] text-slate-500 mt-2">{t.info}</div>
              <button
                className="btn-primary mt-2"
                onClick={() => {
                  const p = t.build();
                  setProject(p);
                  requestFit();
                  setUI({ modal: null, viewMode: 'split' });
                  toast({ severity: 'success', message: `Template “${t.name}” loaded — all dimensions are editable` });
                }}
              >
                Load template
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function TemplateThumb({ id }: { id: string }) {
  const p = useMemo(() => TEMPLATES.find((t) => t.id === id)!.build(), [id]);
  const sx = 200 / Math.max(p.room.width, 1);
  const sy = 100 / Math.max(p.room.depth, 1);
  const s = Math.min(sx, sy);
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 112" preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${(220 - p.room.width * s) / 2} ${(112 - p.room.depth * s) / 2})`}>
        <rect x={0} y={0} width={p.room.width * s} height={p.room.depth * s} fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.3)" />
        {p.items
          .filter((i) => i.category !== 'wall')
          .map((i) => {
            const f = footprint(i);
            return <rect key={i.id} x={f.x * s} y={f.y * s} width={f.w * s} height={f.h * s} fill={i.kind === 'appliance' ? '#ffa726' : '#fff'} opacity={i.kind === 'appliance' ? 0.9 : 0.75} stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />;
          })}
      </g>
    </svg>
  );
}

// ------------------------------------------------------------ Export center
export function ExportModal() {
  const project = useStore((s) => s.project);
  const { setUI, toast } = useStore.getState();
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    setPreview(renderPlanImage(project, 1200, 800).toDataURL('image/jpeg', 0.7));
  }, [project]);
  const grab3D = (type: 'image/png' | 'image/jpeg') => {
    const c = capture3D();
    if (!c) return toast({ severity: 'warning', message: 'The 3D view must be visible (use Split or 3D view) to capture a render' });
    downloadCanvasPNG(c, `${safeName(project.name)}_render.${type === 'image/png' ? 'png' : 'jpg'}`, type);
  };
  const Card = ({ title, desc, icon: Icon, actions }: { title: string; desc: string; icon: LucideIcon; actions: { label: string; onClick: () => void }[] }) => (
    <div className="card p-3 flex gap-3">
      <div className="w-9 flex justify-center pt-0.5"><Icon size={22} style={{ color: 'var(--accent)' }} /></div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] opacity-60 mb-2">{desc}</div>
        <div className="flex flex-wrap gap-1">
          {actions.map((a) => (
            <button key={a.label} className="btn" onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <Modal title="Export & Output Center" width="max-w-4xl" onClose={() => setUI({ modal: null })}>
      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <div className="flex flex-col gap-2">
          <Card title="Technical drawings (PDF)" desc="A3 sheets: plan view, elevations of every wall, material schedule and cabinet schedule." icon={DraftingCompass} actions={[{ label: 'Download PDF', onClick: () => exportTechnicalPDF(project) }]} />
          <Card
            title="Images"
            desc="3D render of the current camera view, 2D plan, individual elevations."
            icon={Image}
            actions={[
              { label: '3D PNG', onClick: () => grab3D('image/png') },
              { label: '3D JPEG', onClick: () => grab3D('image/jpeg') },
              { label: 'Plan PNG', onClick: () => downloadCanvasPNG(renderPlanImage(project, 2400, 1600), `${safeName(project.name)}_plan.png`) },
              ...project.room.walls.map((w) => ({
                label: `Elevation ${w.id}`,
                onClick: () => {
                  const c = renderElevationImage(project, w.id, 2400, 1400);
                  if (c) downloadCanvasPNG(c, `${safeName(project.name)}_elevation_${w.id}.png`);
                },
              })),
            ]}
          />
          <Card
            title="Production"
            desc="Cutting list with edge banding & grain, bill of materials."
            icon={Scissors}
            actions={[
              { label: 'Cutting list CSV', onClick: () => exportCuttingListCSV(project) },
              { label: 'Cutting list PDF', onClick: () => exportCuttingListPDF(project) },
              { label: 'BOM CSV', onClick: () => exportBOMCSV(project) },
            ]}
          />
          <Card title="Quotation (PDF)" desc="Cost breakdown with labour, markup and price per running metre." icon={Receipt} actions={[{ label: 'Download quotation', onClick: () => exportQuotationPDF(project) }]} />
          <Card
            title="CAD & data"
            desc="DXF 2D plan with layers (WALLS, BASE, WALLCAB, APPLIANCE, DIMS) and project JSON for re-import."
            icon={FileText}
            actions={[
              { label: 'DXF', onClick: () => exportDXF(project) },
              { label: 'Project JSON', onClick: () => exportJSON(project) },
            ]}
          />
        </div>
        <div>
          <div className="label mb-1">Plan preview</div>
          {preview && <img src={preview} alt="plan preview" className="rounded border border-[#2a3a4a] w-full" />}
          <div className="text-[10px] text-slate-500 mt-2">
            {project.items.length} items · {project.room.width}×{project.room.depth} cm
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ Price
export function PriceModal() {
  const project = useStore((s) => s.project);
  const { setUI, setSettings } = useStore.getState();
  const [labor, setLabor] = useState(project.settings.laborRate);
  const [markup, setMarkup] = useState(project.settings.markup);
  const p = useMemo(() => estimatePrice(project, { laborRate: labor, markup }), [project, labor, markup]);
  const Row = ({ l, v, bold = false, sub = false }: { l: string; v: number; bold?: boolean; sub?: boolean }) => (
    <div className={`flex justify-between py-1.5 border-b border-[#2a3a4a]/60 ${bold ? 'font-bold text-white' : sub ? 'text-slate-400 text-xs' : 'text-slate-300'}`}>
      <span>{l}</span>
      <span className="font-mono">{formatIDR(v)}</span>
    </div>
  );
  return (
    <Modal
      title="Price Estimation"
      width="max-w-3xl"
      onClose={() => setUI({ modal: null })}
      footer={
        <>
          <button
            className="btn"
            onClick={() => {
              setSettings({ laborRate: labor, markup });
            }}
          >
            Save rates to project
          </button>
          <button className="btn-primary" onClick={() => exportQuotationPDF({ ...project, settings: { ...project.settings, laborRate: labor, markup } })}>
            Export quotation PDF
          </button>
        </>
      }
    >
      <div className="grid md:grid-cols-[1fr_260px] gap-5">
        <div className="text-sm">
          <div className="label mb-1">Materials</div>
          <Row l="Board materials" v={p.boards} />
          <Row l="Finishing (HPL / paint)" v={p.finishing} />
          <Row l="Edge banding" v={p.edgeBanding} />
          <Row l="Hardware (hinges, slides, handles)" v={p.hardware} />
          <Row l="Accessories" v={p.accessories} />
          <Row l="Countertop" v={p.countertop} />
          <Row l="Backsplash" v={p.backsplash} />
          <Row l="Material subtotal" v={p.materialTotal} bold />
          <div className="h-3" />
          <Row l={`Labour (${p.bom.runningMeters} running m)`} v={p.labor} />
          <Row l={`Markup ${markup}%`} v={p.markup} />
          <Row l="Appliances (pass-through)" v={p.appliances} sub />
          <div className="flex justify-between items-center mt-3 p-3 rounded bg-[#4fc3f7]/15 border border-[#4fc3f7]/40">
            <span className="font-bold">TOTAL</span>
            <span className="font-mono text-lg font-bold text-[#4fc3f7]">{formatIDR(p.total)}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex justify-between">
            <span>Price per running metre (excl. appliances)</span>
            <span className="font-mono">{formatIDR(p.perRunningMeter)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="card p-3">
            <div className="label">Labour rate (per running m)</div>
            <input type="range" min={500000} max={5000000} step={50000} value={labor} onChange={(e) => setLabor(parseFloat(e.target.value))} className="w-full mt-2" />
            <div className="font-mono text-xs text-right">{formatIDR(labor)}</div>
          </div>
          <div className="card p-3">
            <div className="label">Markup</div>
            <input type="range" min={0} max={60} step={1} value={markup} onChange={(e) => setMarkup(parseFloat(e.target.value))} className="w-full mt-2" />
            <div className="font-mono text-xs text-right">{markup}%</div>
          </div>
          <div className="card p-3 text-xs text-slate-300 space-y-1">
            <div className="label mb-1">Quantities</div>
            {p.bom.boards.map((b) => (
              <div key={b.material} className="flex justify-between">
                <span>{b.name}</span>
                <span className="font-mono">{b.sheets} sht</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Edge banding</span>
              <span className="font-mono">{p.bom.edgeBandingMeters} m</span>
            </div>
            <div className="flex justify-between">
              <span>Hinges / slides / handles</span>
              <span className="font-mono">
                {p.bom.hinges[0].qty} / {p.bom.slides[0].qty} / {p.bom.handles[0].qty}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Countertop</span>
              <span className="font-mono">{p.bom.countertopM2} m²</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ Hood configurator
export function HoodConfigModal() {
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { setUI, updateItem, updateItemConfig, setItems, toast } = useStore.getState();
  const hood = project.items.find((i) => i.id === selectedIds[0] && i.subtype.startsWith('app_hood')) ?? project.items.find((i) => i.subtype.startsWith('app_hood'));
  const cooktop = useMemo(() => {
    if (!hood) return undefined;
    const hc = center(footprint(hood));
    return project.items
      .filter(isCooktop)
      .map((c) => ({ c, d: Math.hypot(center(footprint(c)).x - hc.x, center(footprint(c)).y - hc.y) }))
      .sort((a, b) => a.d - b.d)[0]?.c;
  }, [project, hood]);
  if (!hood) {
    return (
      <Modal title="Cooker Hood Configurator" width="max-w-md" onClose={() => setUI({ modal: null })}>
        <p className="text-sm text-slate-300">No cooker hood in this project. Drag a hood from Appliances in the component library onto the plan above a cooktop.</p>
      </Modal>
    );
  }
  const type = hood.config.hoodType ?? 'slim';
  const minDist = hoodMinDistance(hood);
  const cookTop = cooktop ? cooktop.elevation + cooktop.height : 82;
  const dist = r1(hood.elevation - cookTop);
  const tooNarrow = cooktop ? hood.width < cooktop.width : false;
  const hc = center(footprint(hood));
  const cc = cooktop ? center(footprint(cooktop)) : null;
  const misaligned = cc ? (hood.rotation % 180 === 0 ? Math.abs(hc.x - cc.x) : Math.abs(hc.y - cc.y)) > 1 : false;

  const setType = (t: HoodType) => {
    const d = HOOD_TYPES.find((h) => h.id === t)!;
    updateItem(hood.id, { height: d.height, depth: d.depth, width: d.widths.includes(hood.width) ? hood.width : d.widths[0], name: `Hood ${d.name}`, config: { ...hood.config, hoodType: t } });
  };
  const setDistance = (v: number) => updateItem(hood.id, { elevation: r1(cookTop + v) });
  const alignToCooktop = () => {
    if (!cc) return;
    const f = footprint(hood);
    const patch: Partial<Item> = hood.rotation % 180 === 0 ? { x: r1(cc.x - f.w / 2) } : { y: r1(cc.y - f.h / 2) };
    updateItem(hood.id, patch);
  };
  const makeGap = () => {
    // remove/shrink wall cabinets overlapping the hood footprint, add housing above
    const f = footprint(hood);
    const items = project.items.filter((i) => !(i.category === 'wall' && i.kind === 'cabinet' && i.id !== hood.id && footprint(i).x < f.x + f.w && footprint(i).x + footprint(i).w > f.x && footprint(i).y < f.y + f.h && footprint(i).y + footprint(i).h > f.y && i.elevation < hood.elevation + hood.height));
    setItems(items);
    toast({ severity: 'success', message: 'Wall cabinets cleared from the hood zone' });
  };
  const Slider = ({ label, value, min, max, step = 1, onChange, unit = 'cm' }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) => (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono">{value} {unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input type="range" className="flex-1" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <input type="number" className="input w-20! font-mono" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || min)} />
      </div>
    </div>
  );

  return (
    <Modal title="Cooker Hood Configurator" width="max-w-3xl" onClose={() => setUI({ modal: null })}>
      <div className="grid md:grid-cols-[1fr_240px] gap-5">
        <div className="flex flex-col gap-4">
          <div>
            <div className="label mb-1">Type</div>
            <div className="grid grid-cols-5 gap-1">
              {HOOD_TYPES.map((h) => (
                <button key={h.id} className={`card p-2 text-center hover:border-[#4fc3f7]/60 ${type === h.id ? 'border-[#4fc3f7]! bg-[#4fc3f7]/10' : ''}`} onClick={() => setType(h.id)}>
                  <HoodIcon type={h.id} />
                  <div className="text-[11px] font-semibold mt-1">{h.name}</div>
                  <div className="text-[9px] text-slate-500">{h.depth}×{h.height}</div>
                </button>
              ))}
            </div>
          </div>
          <Slider label="Width" value={hood.width} min={50} max={120} onChange={(v) => updateItem(hood.id, { width: v })} />
          <Slider label="Depth" value={hood.depth} min={25} max={70} onChange={(v) => updateItem(hood.id, { depth: v })} />
          <Slider label="Height" value={hood.height} min={10} max={60} onChange={(v) => updateItem(hood.id, { height: v })} />
          <Slider label={`Distance from cooktop (min ${minDist} for ${hood.config.fuel ?? 'gas'})`} value={dist} min={minDist} max={90} onChange={setDistance} />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Cooktop fuel</span>
            {(['gas', 'electric'] as const).map((fu) => (
              <button key={fu} className={`chip capitalize ${(hood.config.fuel ?? 'gas') === fu ? 'active' : ''}`} onClick={() => updateItemConfig(hood.id, { fuel: fu })}>
                {fu} ({fu === 'gas' ? APPLIANCES.cooker_hood.min_distance_from_gas_cooktop : APPLIANCES.cooker_hood.min_distance_from_electric_cooktop} cm)
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn flex items-center gap-1.5" onClick={alignToCooktop} disabled={!cooktop}>
              <MoveHorizontal size={13} /> Auto-align with cooktop centre
            </button>
            <button className="btn" onClick={makeGap}>
              Clear wall cabinets in hood zone
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="label">Status</div>
          <Status ok={!!cooktop} text={cooktop ? `Cooktop found (${cooktop.width} cm)` : 'No cooktop nearby'} />
          <Status ok={!tooNarrow} text={tooNarrow ? `Hood narrower than cooktop (${hood.width} < ${cooktop?.width})` : 'Hood width covers cooktop'} />
          <Status ok={!misaligned} text={misaligned ? 'Hood off-centre from cooktop' : 'Centred over cooktop'} />
          <Status ok={dist >= minDist} text={dist >= minDist ? `Clearance ${dist} cm OK` : `Clearance ${dist} cm below minimum ${minDist} cm`} />
          <div className="card p-2 text-[11px] text-slate-400 mt-2">
            Elevation: <b className="text-slate-200">{hood.elevation} cm</b> · Top: <b className="text-slate-200">{r1(hood.elevation + hood.height)} cm</b>
            <br />
            Changes preview live in the 3D view.
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Status({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="text-xs rounded border p-2 flex items-center gap-1.5" style={ok ? { borderColor: 'color-mix(in srgb, var(--success) 40%, transparent)', color: 'var(--success)' } : { borderColor: 'color-mix(in srgb, var(--error) 40%, transparent)', color: 'var(--error)' }}>
      {ok ? <Check size={13} /> : <TriangleAlert size={13} />} {text}
    </div>
  );
}

function HoodIcon({ type }: { type: string }) {
  const s = '#cfd8dc';
  return (
    <svg width="48" height="34" viewBox="0 0 48 34" className="mx-auto">
      {type === 'slim' && <rect x="4" y="26" width="40" height="6" fill={s} />}
      {type === 'pyramid' && (
        <>
          <rect x="18" y="2" width="12" height="14" fill={s} />
          <polygon points="4,32 44,32 32,16 16,16" fill={s} />
        </>
      )}
      {type === 't_shape' && (
        <>
          <rect x="18" y="2" width="12" height="22" fill={s} />
          <rect x="4" y="24" width="40" height="8" fill={s} />
        </>
      )}
      {type === 'island' && (
        <>
          <rect x="20" y="0" width="8" height="22" fill={s} />
          <rect x="2" y="22" width="44" height="10" fill={s} />
        </>
      )}
      {type === 'built_in' && (
        <>
          <rect x="4" y="4" width="40" height="22" fill="none" stroke={s} />
          <rect x="8" y="26" width="32" height="6" fill={s} />
        </>
      )}
    </svg>
  );
}

// ------------------------------------------------------------ Cabinet detailed editor
export function EditorModal() {
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { setUI, updateItem, updateItemConfig } = useStore.getState();
  const item = project.items.find((i) => i.id === selectedIds[0]);
  if (!item || item.kind !== 'cabinet') {
    return (
      <Modal title="Cabinet Editor" width="max-w-md" onClose={() => setUI({ modal: null })}>
        <p className="text-sm text-slate-300">Select a cabinet to edit it in detail.</p>
      </Modal>
    );
  }
  const parts = generateParts(item, project.materials);
  const c = item.config;
  const doorHex = getColor(c.materials.useDefault ? project.materials.doorColor : c.materials.doorColor ?? project.materials.doorColor).hex;
  const carcHex = getColor(c.materials.useDefault ? project.materials.carcassColor : c.materials.carcassColor ?? project.materials.carcassColor).hex;
  const S = 220 / Math.max(item.width, item.height);
  const upd = (p: Partial<Item>) => updateItem(item.id, p);
  const cfg = (p: Partial<Item['config']>) => updateItemConfig(item.id, p);
  return (
    <Modal title={`Cabinet Editor — ${item.name}`} width="max-w-5xl" onClose={() => setUI({ modal: null })}>
      <div className="grid md:grid-cols-[260px_1fr_1fr] gap-4">
        <div>
          <div className="label mb-1">Front view</div>
          <svg width={240} height={240} className="card">
            <g transform={`translate(${(240 - item.width * S) / 2} ${(240 - item.height * S) / 2})`}>
              <rect x={0} y={0} width={item.width * S} height={item.height * S} fill={carcHex} stroke="#000" />
              {parts
                .filter((p) => p.isFront && p.box.sx > 0 && p.box.sy > 0 && !p.sideFace)
                .map((p) => (
                  <g key={p.id}>
                    <rect x={p.box.x * S} y={(item.height - p.box.y - p.box.sy) * S} width={p.box.sx * S} height={p.box.sy * S} fill={p.glass ? 'rgba(159,211,255,0.5)' : doorHex} stroke="rgba(0,0,0,0.6)" />
                    {c.doorStyle === 'shaker' && p.box.sx > 16 && <rect x={(p.box.x + 6) * S} y={(item.height - p.box.y - p.box.sy + 6) * S} width={(p.box.sx - 12) * S} height={(p.box.sy - 12) * S} fill="none" stroke="rgba(0,0,0,0.3)" />}
                  </g>
                ))}
              {parts
                .filter((p) => p.role === 'shelf' && (c.openFront || c.doors === 0))
                .map((p) => (
                  <rect key={p.id} x={p.box.x * S} y={(item.height - p.box.y - p.box.sy) * S} width={p.box.sx * S} height={Math.max(1, p.box.sy * S)} fill="rgba(0,0,0,0.3)" />
                ))}
              {c.hasToeKick && item.category !== 'wall' && <rect x={0} y={(item.height - 10) * S} width={item.width * S} height={10 * S} fill="#222" />}
            </g>
          </svg>
          <div className="label mt-3 mb-1">Side section</div>
          <svg width={240} height={120} className="card">
            <g transform={`translate(${(240 - item.depth * (100 / item.height)) / 2} 10)`}>
              <rect x={0} y={0} width={item.depth * (100 / item.height)} height={100} fill={carcHex} stroke="#000" />
              {parts
                .filter((p) => p.role === 'shelf')
                .map((p) => (
                  <rect key={p.id} x={p.box.z * (100 / item.height)} y={(item.height - p.box.y - p.box.sy) * (100 / item.height)} width={p.box.sz * (100 / item.height)} height={Math.max(1.5, p.box.sy * (100 / item.height))} fill="#333" />
                ))}
              <rect x={item.depth * (100 / item.height)} y={(c.hasToeKick && item.category !== 'wall' ? 0 : 0)} width={3} height={100 - (c.hasToeKick && item.category !== 'wall' ? (10 * 100) / item.height : 0)} fill={doorHex} stroke="#000" />
            </g>
          </svg>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Width" value={item.width} min={5} max={400} onChange={(v) => upd({ width: v })} />
            <NumberField label="Height" value={item.height} min={1} max={300} onChange={(v) => upd({ height: v })} />
            <NumberField label="Depth" value={item.depth} min={1} max={200} onChange={(v) => upd({ depth: v })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Doors" value={c.doors} step={1} min={0} max={4} unit="" onChange={(v) => cfg({ doors: v, opening: v >= 2 ? 'double' : c.opening === 'double' ? 'left' : c.opening })} />
            <NumberField label="Drawers" value={c.drawers} step={1} min={0} max={6} unit="" onChange={(v) => cfg({ drawers: v })} />
            <NumberField label="Shelves" value={c.shelves} step={1} min={0} max={12} unit="" onChange={(v) => cfg({ shelves: v })} />
          </div>
          <div>
            <span className="label">Door style</span>
            <div className="flex gap-1 mt-1">
              {(['slab', 'shaker', 'glass', 'louvered'] as DoorStyle[]).map((s) => (
                <button key={s} className={`chip capitalize ${c.doorStyle === s ? 'active' : ''}`} onClick={() => cfg({ doorStyle: s, glass: s === 'glass' })}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Opening</span>
            <div className="flex gap-1 mt-1 flex-wrap">
              {(['left', 'right', 'double', 'flip_up'] as OpeningDirection[]).map((o) => (
                <button key={o} className={`chip ${c.opening === o ? 'active' : ''}`} onClick={() => cfg({ opening: o, doors: o === 'double' ? Math.max(2, c.doors) : 1 })}>
                  {o.replace('_', '-')}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.openFront} onChange={(e) => cfg({ openFront: e.target.checked })} /> Open front
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.hasToeKick} onChange={(e) => cfg({ hasToeKick: e.target.checked })} /> Toe kick
          </label>
          <div className="text-[11px] text-slate-400">
            Shelf span: {r1(item.width - 3.6)} cm {item.width - 3.6 > 80 ? <span className="text-[#ffa726]">— exceeds 80 cm, add divider</span> : <span className="text-[#66bb6a]">OK</span>}
          </div>
        </div>
        <div className="min-h-0">
          <div className="label mb-1">Parts ({parts.filter((p) => p.countInList !== false).reduce((s, p) => s + p.qty, 0)})</div>
          <div className="card max-h-[420px] overflow-auto">
            <table className="w-full table-xs">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>L</th>
                  <th>W</th>
                  <th>Qty</th>
                  <th>Mat</th>
                  <th>Edge</th>
                </tr>
              </thead>
              <tbody>
                {parts
                  .filter((p) => p.countInList !== false)
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td className="font-mono">{p.cutW}</td>
                      <td className="font-mono">{p.cutH}</td>
                      <td className="font-mono">{p.qty}</td>
                      <td>{getBoard(p.material).thickness}mm</td>
                      <td className="font-mono">{p.edgeBanding}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ Shortcuts
export function ShortcutsModal() {
  const setUI = useStore((s) => s.setUI);
  const rows: [string, string][] = [
    ['Ctrl+N', 'New project wizard'],
    ['Ctrl+S', 'Save project (JSON)'],
    ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / Redo'],
    ['Delete / Backspace', 'Delete selected'],
    ['D', 'Duplicate selected'],
    ['G', 'Grab / move mode (drag with mouse)'],
    ['F', 'Fit all'],
    ['Tab', 'Toggle 2D / 3D'],
    ['1 – 6', 'Camera presets (Perspective, Front, Back, Left, Right, Top)'],
    ['M', 'Measure tool'],
    ['Esc', 'Deselect / exit tool / close dialog'],
    ['Space', 'Toggle properties panel (hold + drag in 2D: pan)'],
    ['Arrow keys', 'Nudge selected 1 cm (Shift: 10 cm)'],
    ['R', 'Rotate selected 90°'],
    ['O', 'Open / close doors in 3D'],
    ['Alt+Click', 'Cycle through overlapping items'],
    ['Middle drag / Right drag', 'Pan (2D) / Pan (3D)'],
  ];
  return (
    <Modal title="Keyboard Shortcuts" width="max-w-lg" onClose={() => setUI({ modal: null })}>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        {rows.map(([k, d]) => (
          <div key={k} className="contents">
            <span className="kbd whitespace-nowrap">{k}</span>
            <span className="text-slate-300">{d}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
