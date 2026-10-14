import { useRef, useState } from 'react';
import ToolsToolbar from './ToolsToolbar';
import { GripVertical } from './icons';

/** Draggable floating tools palette on mobile (desktop uses docked rail). */
export default function MobileFloatingTools() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try { const v = localStorage.getItem('i3d_tools_pos'); return v ? JSON.parse(v) : null; } catch { return null; }
  });
  const live = useRef(pos);
  live.current = pos;

  const drag = (e: React.PointerEvent) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    const orig = live.current ?? { x: 8, y: window.innerHeight / 2 };
    const move = (ev: PointerEvent) => {
      const np = {
        x: Math.max(2, Math.min(window.innerWidth - 64, orig.x + ev.clientX - start.x)),
        y: Math.max(56, Math.min(window.innerHeight - 160, orig.y + ev.clientY - start.y)),
      };
      live.current = np;
      setPos(np);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      try { if (live.current) localStorage.setItem('i3d_tools_pos', JSON.stringify(live.current)); } catch { /* ignore */ }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      className="mobile-only absolute z-40"
      style={pos ? { left: pos.x, top: pos.y } : { left: 8, top: '42%', transform: 'translateY(-50%)' }}
    >
      <div className="card flex overflow-hidden shadow-xl" style={{ maxHeight: '58vh' }}>
        <div onPointerDown={drag} className="w-4 grid place-items-center cursor-grab active:cursor-grabbing select-none touch-none" style={{ background: 'var(--bg-hover)' }} title="Drag to move tools">
          <GripVertical size={12} className="opacity-50" />
        </div>
        <ToolsToolbar />
      </div>
    </div>
  );
}
