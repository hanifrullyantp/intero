import { useEffect, useRef, useState } from 'react';
import { useStore, type ViewMode } from '../core/store';
import Viewport2D from './Viewport2D';
import Viewport3D from './Viewport3D';
import ViewportElevation from './ViewportElevation';
import { PencilRuler, Box, Building, Columns2, ChevronDown, Check, type LucideIcon } from '../ui/icons';

const MODES: { id: ViewMode; label: string; icon: LucideIcon; adv?: boolean; hint: string }[] = [
  { id: '2d', label: '2D Plan', icon: PencilRuler, hint: 'Denah lantai, drag & snap' },
  { id: '3d', label: '3D View', icon: Box, hint: 'Model 3D, orbit & pilih' },
  { id: 'elevation', label: 'Elevation', icon: Building, adv: true, hint: 'Tampak dinding dengan dimensi' },
  { id: 'split', label: 'Split', icon: Columns2, adv: true, hint: '2D + 3D berdampingan' },
];

/** Viewport host. View switching lives in a dropdown anchored to the current-mode indicator (top-left). */
export default function ViewportManager() {
  const mode = useStore((s) => s.ui.viewMode);
  const uiMode = useStore((s) => s.ui.uiMode);
  const setUI = useStore((s) => s.setUI);
  const [split, setSplit] = useState(0.5);
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const dd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (!dd.current?.contains(e.target as Node)) setMenu(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [menu]);

  const startSplitDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const r = wrap.current!.getBoundingClientRect();
      setSplit(Math.min(0.8, Math.max(0.2, (ev.clientX - r.left) / r.width)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const modes = MODES.filter((m) => uiMode === 'advanced' || !m.adv);
  const active = modes.some((m) => m.id === mode) ? mode : '3d';
  const cur = MODES.find((m) => m.id === active)!;

  return (
    <div className="flex-1 min-h-0 min-w-0 relative flex flex-col">
      <div ref={wrap} className="flex-1 min-h-0 relative flex">
        {active === '2d' && <Viewport2D />}
        {active === '3d' && <Viewport3D />}
        {active === 'elevation' && <ViewportElevation />}
        {active === 'split' && (
          <>
            <div style={{ width: `${split * 100}%` }} className="h-full min-w-0">
              <Viewport2D />
            </div>
            <div onMouseDown={startSplitDrag} className="w-1.5 h-full cursor-col-resize shrink-0 transition-colors hover:bg-[var(--accent)]" style={{ background: 'var(--border)' }} title="Drag to resize" />
            <div className="flex-1 h-full min-w-0">
              <Viewport3D />
            </div>
          </>
        )}
      </div>

      {/* view switcher: indicator + dropdown */}
      <div ref={dd} className="absolute top-2 left-2 z-30">
        <button className="vp-btn flex items-center gap-1.5 !px-2.5 !py-1.5 font-semibold" onClick={() => setMenu((o) => !o)} title="Ganti tampilan (Tab: 2D ↔ 3D)">
          <cur.icon size={13} /> {cur.label} <ChevronDown size={12} className={`transition-transform ${menu ? 'rotate-180' : ''}`} />
        </button>
        {menu && (
          <div className="absolute left-0 top-full mt-1 card py-1 w-56 shadow-2xl anim-in">
            {modes.map((m) => (
              <button key={m.id} className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[var(--bg-hover)]"
                onClick={() => { setUI({ viewMode: m.id }); setMenu(false); }}>
                <m.icon size={14} className="opacity-80" />
                <span className="flex-1">
                  <span className="block text-xs">{m.label}</span>
                  <span className="block text-[10px] opacity-60">{m.hint}</span>
                </span>
                {active === m.id && <Check size={13} style={{ color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
