import { useRef, useState } from 'react';
import { useStore } from '../core/store';
import Viewport2D from './Viewport2D';
import Viewport3D from './Viewport3D';
import ViewportElevation from './ViewportElevation';

/** Viewport host. View switching lives in the header. */
export default function ViewportManager() {
  const mode = useStore((s) => s.ui.viewMode);
  const [split, setSplit] = useState(0.5);
  const wrap = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex-1 min-h-0 min-w-0 relative flex flex-col">
      <div ref={wrap} className="flex-1 min-h-0 relative flex">
        {mode === '2d' && <Viewport2D />}
        {mode === '3d' && <Viewport3D />}
        {mode === 'elevation' && <ViewportElevation />}
        {mode === 'split' && (
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
    </div>
  );
}
