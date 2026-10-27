import { useCallback, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Image as ImageIcon, Info, MoveHorizontal, Palette, Pipette, X } from 'lucide-react';
import { COLOR_PRESETS } from '../lib/constants';
import { clamp, hexToHsl, hexToRgb, hslToHex, isValidHex, normalizeHex, parsePaletteFile, pickColorFromImage, pickFile, rgbToHex, type PaletteColor } from '../lib/utils';

// ─── Toast ───
export type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastMsg { id: number; text: string; type: ToastType; action?: { label: string; onClick: () => void }; leaving?: boolean }
let toastList: ToastMsg[] = [];
const toastListeners = new Set<(t: ToastMsg[]) => void>();
let toastId = 0;
function emitToasts() { for (const l of toastListeners) l([...toastList]); }
export function toast(text: string, type: ToastType = 'info', action?: { label: string; onClick: () => void }) {
  const id = ++toastId;
  toastList = [...toastList.slice(-4), { id, text, type, action }];
  emitToasts();
  setTimeout(() => { toastList = toastList.map((t) => (t.id === id ? { ...t, leaving: true } : t)); emitToasts(); }, action ? 6000 : 3200);
  setTimeout(() => { toastList = toastList.filter((t) => t.id !== id); emitToasts(); }, action ? 6300 : 3500);
}
export function ToastHost() {
  const [list, setList] = useState<ToastMsg[]>([]);
  useEffect(() => { toastListeners.add(setList); return () => { toastListeners.delete(setList); }; }, []);
  const icon = (t: ToastType) => t === 'success' ? <Check size={16} color="var(--brand-primary)" /> : t === 'error' ? <X size={16} color="var(--danger)" /> : t === 'warning' ? <AlertTriangle size={16} color="var(--warning)" /> : <Info size={16} color="var(--info)" />;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[1200] flex flex-col items-center gap-2 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}>
      {list.map((t) => (
        <div key={t.id} className={`toast glass glass-sm ${t.leaving ? 'leaving' : ''}`}>
          {icon(t.type)}<span className="flex-1">{t.text}</span>
          {t.action && <button className="btn btn-sm btn-primary" onClick={() => { t.action?.onClick(); toastList = toastList.filter((x) => x.id !== t.id); emitToasts(); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

// ─── Primitives ───
export function IconBtn({ icon, tip, onClick, active, disabled, side, className, size }: { icon: ReactNode; tip?: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; active?: boolean; disabled?: boolean; side?: 'right' | 'top'; className?: string; size?: number }) {
  return (
    <button type="button" className={`icon-btn ${active ? 'active' : ''} ${className ?? ''}`} data-tip={tip} data-tip-side={side} onClick={onClick} disabled={disabled} aria-label={tip} style={size ? { width: size, height: size } : undefined}>
      {icon}
    </button>
  );
}
export function Toggle({ checked, onChange, label, hint, tour }: { checked: boolean; onChange: (v: boolean) => void; label?: string; hint?: string; tour?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none" data-tour={tour}>
      <span className="flex flex-col"><span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{label}</span>{hint && <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{hint}</span>}</span>
      <button type="button" role="switch" aria-checked={checked} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} />
    </label>
  );
}
export function Field({ label, children, inline, tour }: { label: string; children: ReactNode; inline?: boolean; tour?: string }) {
  return inline
    ? <div className="grid items-center gap-2" data-tour={tour} style={{ gridTemplateColumns: '92px 1fr' }}><span className="label">{label}</span>{children}</div>
    : <div className="flex flex-col gap-1.5" data-tour={tour}><span className="label">{label}</span>{children}</div>;
}
export function Select<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return <select className={`input ${className ?? ''}`} value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
export const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function Section({ title, children, defaultOpen = true, right }: { title: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section" data-section={slug(title)}>
      <button type="button" className="section-head" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<span className="flex-1">{title}</span>{right}
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}
export function Modal({ children, onClose, width = 520, className, style, tour }: { children: ReactNode; onClose?: () => void; width?: number; className?: string; style?: CSSProperties; tour?: string }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`modal glass ${className ?? ''}`} data-tour={tour} style={{ width: '100%', maxWidth: width, ...style }}>{children}</div>
    </div>
  );
}
export function Kbd({ children }: { children: ReactNode }) { return <span className="kbd">{children}</span>; }

// ─── DragNumber (After Effects style) ───
interface DragNumberProps { value: number; onChange: (v: number, commit: boolean) => void; onDragStart?: () => void; min?: number; max?: number; step?: number; unit?: string; disabled?: boolean; precision?: number; snapOptions?: number[] }
export function DragNumber({ value, onChange, onDragStart, min = -Infinity, max = Infinity, step = 1, unit = 'cm', disabled, precision = 0, snapOptions }: DragNumberProps) {
  const [text, setText] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ start: 0, acc: 0, lastX: 0, locked: false });
  const scale = unit === 'cm' ? 10 : 1; // internal mm, tampilan cm
  const toDisp = (v: number) => v / scale;
  const fromDisp = (v: number) => v * scale;
  const fmt = (v: number) => {
    const d = toDisp(v);
    if (unit === 'cm') { const r = Math.round(d * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); }
    return precision ? d.toFixed(precision) : String(Math.round(d));
  };
  const commitText = () => {
    if (text === null) return;
    const v = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(v)) onChange(clamp(fromDisp(v), min, max), true);
    setText(null);
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    onDragStart?.();
    drag.current = { start: value, acc: 0, lastX: e.clientX, locked: false };
    setDragging(true);
    const el = handleRef.current;
    if (el && e.pointerType === 'mouse' && el.requestPointerLock) { try { el.requestPointerLock(); drag.current.locked = true; } catch { drag.current.locked = false; } }
    const move = (ev: PointerEvent) => {
      const dx = drag.current.locked && document.pointerLockElement === el ? ev.movementX : ev.clientX - drag.current.lastX;
      drag.current.lastX = ev.clientX;
      const per = ev.shiftKey ? 100 : ev.altKey ? 1 : 10; // 1px = 1cm, Shift 10cm, Alt 0.1cm
      drag.current.acc += dx * per;
      let v = drag.current.start + drag.current.acc;
      if (snapOptions && snapOptions.length && !ev.altKey) { const s = snapOptions[0]; v = Math.round(v / s) * s; }
      onChange(clamp(precision ? v : Math.round(v), min, max), false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (document.pointerLockElement === el) document.exitPointerLock();
      setDragging(false);
      const v = clamp(drag.current.start + drag.current.acc, min, max);
      onChange(precision ? v : Math.round(v), true);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { commitText(); (e.target as HTMLInputElement).blur(); }
    else if (e.key === 'Escape') { setText(null); (e.target as HTMLInputElement).blur(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const d = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? step * 10 : step);
      onChange(clamp(value + d, min, max), true); setText(null);
    }
  };
  return (
    <div className={`dragnum ${dragging ? 'dragging' : ''} ${disabled ? 'opacity-50' : ''}`}>
      <div ref={handleRef} className="dragnum-handle" onPointerDown={onPointerDown} title="Drag: 1px = 1cm · Shift = 10cm · Alt = 0.1cm"><MoveHorizontal size={13} /></div>
      <input type="text" inputMode="decimal" value={text ?? fmt(value)} disabled={disabled} onChange={(e) => setText(e.target.value)} onFocus={(e) => { setText(fmt(value)); e.target.select(); }} onBlur={commitText} onKeyDown={onKey} />
      {unit && <span className="dragnum-unit">{unit}</span>}
    </div>
  );
}

// ─── Advanced Color Picker ───
interface ColorPickerProps { value: string; onChange: (hex: string, commit: boolean) => void; label?: string; onDragStart?: () => void; tour?: string }
export function ColorPicker({ value, onChange, label, onDragStart, tour }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexText, setHexText] = useState<string | null>(null);
  const [tab, setTab] = useState<'preset' | 'hsl' | 'rgb' | 'import'>('preset');
  const [imported, setImported] = useState<PaletteColor[]>([]);
  const [imgCanvas, setImgCanvas] = useState<HTMLCanvasElement | null>(null);
  const imgHostRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const hsl = hexToHsl(value);
  const rgb = hexToRgb(value);

  const openPopover = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const w = 300, h = 420;
      setPos({ top: Math.min(window.innerHeight - h - 12, r.bottom + 6), left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) });
    }
    setOpen(true);
  };
  useEffect(() => {
    if (!imgCanvas || !imgHostRef.current) return;
    const host = imgHostRef.current; host.innerHTML = ''; host.appendChild(imgCanvas);
    imgCanvas.style.maxWidth = '100%'; imgCanvas.style.cursor = 'crosshair'; imgCanvas.style.borderRadius = '8px';
    const onClick = (e: MouseEvent) => {
      const r = imgCanvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * imgCanvas.width), y = Math.floor(((e.clientY - r.top) / r.height) * imgCanvas.height);
      const d = imgCanvas.getContext('2d')?.getImageData(x, y, 1, 1).data;
      if (d) onChange(rgbToHex(d[0], d[1], d[2]), true);
    };
    imgCanvas.addEventListener('click', onClick);
    return () => imgCanvas.removeEventListener('click', onClick);
  }, [imgCanvas, onChange]);

  const setHsl = useCallback((h: number, s: number, l: number, commit: boolean) => onChange(hslToHex(h, s, l), commit), [onChange]);
  const eyedrop = async () => {
    const ED = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!ED) { toast('Browser tidak mendukung EyeDropper API. Gunakan tool Eyedropper (I) di viewport.', 'warning'); return; }
    try { const r = await new ED().open(); onChange(normalizeHex(r.sRGBHex), true); } catch { /* dibatalkan */ }
  };
  const importPalette = async () => {
    const f = await pickFile('.ase,.aco,.gpl,.json', true);
    if (!f) return;
    const ext = f.name.toLowerCase().split('.').pop();
    const data = ext === 'ase' || ext === 'aco' ? f.data : new TextDecoder().decode(f.data as ArrayBuffer);
    const cols = parsePaletteFile(f.name, data);
    if (!cols.length) { toast('Palet tidak terbaca atau kosong', 'error'); return; }
    setImported(cols); toast(`${cols.length} warna diimpor dari ${f.name}`, 'success');
  };
  const uploadImage = async () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => { const file = input.files?.[0]; if (!file) return; const r = await pickColorFromImage(file); if (r) { setImgCanvas(r.canvas); setTab('import'); } };
    input.click();
  };
  const sliderBg = {
    h: 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
    s: `linear-gradient(90deg,${hslToHex(hsl.h, 0, hsl.l)},${hslToHex(hsl.h, 100, hsl.l)})`,
    l: `linear-gradient(90deg,#000,${hslToHex(hsl.h, hsl.s, 50)},#fff)`,
  };
  return (
    <div className="flex flex-col gap-1.5" data-tour={tour}>
      {label && <span className="label">{label}</span>}
      <div className="flex items-center gap-2">
        <button ref={btnRef} type="button" onClick={openPopover} className="w-9 h-8 rounded-lg border shrink-0" style={{ background: value, borderColor: 'var(--border)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }} aria-label="Pilih warna" />
        <input className="input mono" style={{ height: 32 }} value={hexText ?? value} onChange={(e) => setHexText(e.target.value)} onFocus={() => setHexText(value)}
          onBlur={() => { if (hexText && isValidHex(hexText)) onChange(normalizeHex(hexText), true); setHexText(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        <IconBtn icon={<Pipette size={15} />} tip="Eyedropper" onClick={eyedrop} />
        <IconBtn icon={<Palette size={15} />} tip="Import palet" onClick={importPalette} />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-[700]" onMouseDown={() => setOpen(false)} />
          <div className="fixed z-[710] panel rounded-2xl p-3 flex flex-col gap-3" style={{ top: pos.top, left: pos.left, width: 300 }}>
            <div className="seg w-full">
              {(['preset', 'hsl', 'rgb', 'import'] as const).map((t) => <button key={t} type="button" className={`flex-1 ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t === 'preset' ? 'Preset' : t === 'hsl' ? 'HSL' : t === 'rgb' ? 'RGB' : 'Import'}</button>)}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl border" style={{ background: value, borderColor: 'var(--border)' }} />
              <div className="flex flex-col"><span className="mono text-[13px]">{value}</span><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>H {Math.round(hsl.h)}° · S {Math.round(hsl.s)}% · L {Math.round(hsl.l)}%</span></div>
            </div>
            {tab === 'preset' && (
              <div className="grid grid-cols-8 gap-1.5">
                {COLOR_PRESETS.map((c) => <button key={c.hex} type="button" title={c.name} className={`chip ${value.toUpperCase() === c.hex.toUpperCase() ? 'active' : ''}`} style={{ background: c.hex }} onClick={() => onChange(c.hex, true)} />)}
              </div>
            )}
            {tab === 'hsl' && (
              <div className="flex flex-col gap-3">
                {([['Hue', 'h', 360, hsl.h], ['Saturation', 's', 100, hsl.s], ['Lightness', 'l', 100, hsl.l]] as const).map(([name, key, max, val]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]"><span className="label">{name}</span><span className="mono">{Math.round(val)}{key === 'h' ? '°' : '%'}</span></div>
                    <input type="range" className="slider" min={0} max={max} value={Math.round(val)} style={{ background: sliderBg[key] }}
                      onPointerDown={() => onDragStart?.()}
                      onChange={(e) => { const v = +e.target.value; setHsl(key === 'h' ? v : hsl.h, key === 's' ? v : hsl.s, key === 'l' ? v : hsl.l, false); }}
                      onPointerUp={(e) => { const v = +(e.target as HTMLInputElement).value; setHsl(key === 'h' ? v : hsl.h, key === 's' ? v : hsl.s, key === 'l' ? v : hsl.l, true); }} />
                  </div>
                ))}
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Lightness independen: cerahkan/gelapkan tanpa mengubah hue.</p>
              </div>
            )}
            {tab === 'rgb' && (
              <div className="grid grid-cols-3 gap-2">
                {(['r', 'g', 'b'] as const).map((k) => (
                  <Field key={k} label={k.toUpperCase()}>
                    <input type="number" className="input mono" min={0} max={255} value={Math.round(rgb[k])} onChange={(e) => { const n = { ...rgb, [k]: clamp(+e.target.value, 0, 255) }; onChange(rgbToHex(n.r, n.g, n.b), true); }} />
                  </Field>
                ))}
              </div>
            )}
            {tab === 'import' && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={importPalette}><Palette size={14} />.ase / .aco / .gpl / .json</button>
                  <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={uploadImage}><ImageIcon size={14} />Dari gambar</button>
                </div>
                {imported.length > 0 && <div className="grid grid-cols-8 gap-1.5 max-h-28 overflow-auto">{imported.map((c, i) => <button key={i} type="button" title={c.name} className="chip" style={{ background: c.hex }} onClick={() => onChange(c.hex, true)} />)}</div>}
                <div ref={imgHostRef} className="max-h-40 overflow-hidden" />
                {imgCanvas && <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Klik piksel pada gambar untuk mengambil warna.</span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setM(window.innerWidth < 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return m;
}

// ─── Tooltip global (portal): tampil saat hover elemen [data-tip], tidak terpotong overflow ───
export function TooltipHost() {
  const [, force] = useState(0);
  const tipRef = useRef<{ text: string; x: number; y: number } | null>(null);
  useEffect(() => {
    const show = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null;
      if (!t || !t.isConnected) { if (tipRef.current) { tipRef.current = null; force((x) => x + 1); } return; }
      const text = t.getAttribute('data-tip');
      if (!text) { tipRef.current = null; force((x) => x + 1); return; }
      const r = t.getBoundingClientRect();
      const side = t.getAttribute('data-tip-side') ?? 'bottom';
      let x = r.left + r.width / 2, y = r.bottom + 8;
      if (side === 'right') { x = r.right + 8; y = r.top + r.height / 2; }
      else if (side === 'top') { y = r.top - 8; }
      else if (side === 'left') { x = r.left - 8; y = r.top + r.height / 2; }
      tipRef.current = { text, x, y };
      (tipRef as unknown as { side: string }).side = side;
      force((n) => n + 1);
    };
    const hide = () => { if (tipRef.current) { tipRef.current = null; force((x) => x + 1); } };
    const onScroll = () => hide();
    document.addEventListener('mouseover', show);
    document.addEventListener('mouseout', hide);
    document.addEventListener('click', hide, true);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mouseover', show); document.removeEventListener('mouseout', hide); document.removeEventListener('click', hide, true); window.removeEventListener('scroll', onScroll, true); };
  }, []);
  const tip = tipRef.current;
  if (!tip) return null;
  const side = (tipRef as unknown as { side?: string }).side ?? 'bottom';
  const style: CSSProperties = { left: Math.max(8, Math.min(window.innerWidth - 8, tip.x)), top: Math.max(8, tip.y) };
  if (side === 'bottom') style.transform = 'translate(-50%, 0)';
  else if (side === 'top') style.transform = 'translate(-50%, -100%)';
  else if (side === 'right') style.transform = 'translate(0, -50%)';
  else style.transform = 'translate(-100%, -50%)';
  return <div className="global-tip" style={style}>{tip.text}</div>;
}
