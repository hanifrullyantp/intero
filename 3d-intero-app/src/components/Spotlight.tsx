import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { useStore } from '../store';
import { FEATURES, searchFeatures, type FeatureDef } from '../lib/features';

// ─── Palet pencarian fitur ───
export function SearchPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchFeatures(q);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const pick = (f: FeatureDef) => {
    f.run();
    onClose();
    setTimeout(() => useStore.getState().ui({ spotlight: { target: f.target, title: f.label, hint: f.hint } }), 380);
  };
  return (
    <>
      <div className="fixed inset-0 z-[1000]" style={{ background: 'rgba(8,12,18,0.3)' }} onMouseDown={onClose} />
      <div className="fixed z-[1010] left-1/2 -translate-x-1/2 panel rounded-2xl overflow-hidden flex flex-col" style={{ top: 76, width: 'min(520px, calc(100vw - 32px))', maxHeight: 'min(60vh, 480px)' }}>
        <div className="flex items-center gap-2 px-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
          <input ref={inputRef} className="flex-1 h-12 bg-transparent outline-none text-[14px]" style={{ color: 'var(--text-primary)' }} placeholder="Cari fitur… mis. topi, rak piring, LED, mirror" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[active]) pick(results[active]);
              else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            }} />
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto p-1.5">
          {results.length === 0 && <p className="text-[13px] p-3" style={{ color: 'var(--text-tertiary)' }}>Tidak ditemukan. Coba kata kunci lain, mis. "handle", "dispenser", "split".</p>}
          {results.map((f, i) => (
            <button key={f.id} className={`search-item ${i === active ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => pick(f)}>
              <Sparkles size={15} className="shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <span className="flex flex-col min-w-0"><span className="font-semibold truncate">{f.label}</span><span className="text-[11.5px] truncate" style={{ color: 'var(--text-tertiary)' }}>{f.hint}</span></span>
            </button>
          ))}
        </div>
        <div className="px-3 py-1.5 text-[10.5px]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>{FEATURES.length} fitur terindeks · Enter untuk tunjukkan lokasi fitur</div>
      </div>
    </>
  );
}

// ─── Spotlight: redupkan semua kecuali target ───
export function SpotlightHost() {
  const sp = useStore((s) => s.spotlight);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (!sp) { setRect(null); return; }
    let alive = true;
    let tries = 0;
    const findEl = () => {
      const els = [...document.querySelectorAll(sp.target)] as HTMLElement[];
      return els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; }) ?? null;
    };
    const measure = () => { const el = findEl(); if (el && alive) { const r = el.getBoundingClientRect(); setRect({ x: r.left, y: r.top, w: r.width, h: r.height }); } };
    const locate = () => {
      const el = findEl();
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(measure, 380); }
      else if (tries++ < 25) setTimeout(locate, 200);
    };
    locate();
    const iv = setInterval(measure, 400);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') useStore.getState().ui({ spotlight: null }); };
    window.addEventListener('resize', measure);
    window.addEventListener('keydown', onKey);
    return () => { alive = false; clearInterval(iv); window.removeEventListener('resize', measure); window.removeEventListener('keydown', onKey); };
  }, [sp]);

  if (!sp) return null;
  const close = () => useStore.getState().ui({ spotlight: null });
  const pad = 8;
  const r = rect ?? { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 40, w: 200, h: 80 };
  const x1 = Math.max(0, r.x - pad), y1 = Math.max(0, r.y - pad), x2 = Math.min(window.innerWidth, r.x + r.w + pad), y2 = Math.min(window.innerHeight, r.y + r.h + pad);
  const cardBelow = y2 + 170 < window.innerHeight;
  const cardTop = cardBelow ? y2 + 12 : Math.max(12, y1 - 170);
  const cardLeft = Math.max(12, Math.min(window.innerWidth - 332, x1));
  return (
    <>
      <div className="spot-shade" style={{ left: 0, top: 0, right: 0, height: y1 }} onClick={close} />
      <div className="spot-shade" style={{ left: 0, top: y2, right: 0, bottom: 0 }} onClick={close} />
      <div className="spot-shade" style={{ left: 0, top: y1, width: x1, height: y2 - y1 }} onClick={close} />
      <div className="spot-shade" style={{ left: x2, top: y1, right: 0, height: y2 - y1 }} onClick={close} />
      {rect && <div className="spot-ring" style={{ left: x1, top: y1, width: x2 - x1, height: y2 - y1 }} />}
      <div className="fixed z-[1502] glass p-4 flex flex-col gap-2" style={{ left: cardLeft, top: cardTop, width: 320 }}>
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
          <span className="text-[14px] font-bold flex-1">{sp.title}</span>
          <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={close} aria-label="Tutup"><X size={14} /></button>
        </div>
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{sp.hint}</p>
        <div className="flex justify-end"><button className="btn btn-primary btn-sm" onClick={close}>Mengerti</button></div>
      </div>
    </>
  );
}
