import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../core/store';
import { renderElevation, fitView, elevationBounds, elevationU } from './renderer2d';
import { computeCountertops } from '../engine/countertop';
import { itemsOnWall } from '../engine/dimensionEngine';
import { renderElevationImage, downloadCanvasPNG } from '../utils/exporters';
import { safeName } from '../core/projectManager';

export default function ViewportElevation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const project = useStore((s) => s.project);
  const ui = useStore((s) => s.ui);
  const selectedIds = useStore((s) => s.selectedIds);
  const { setUI, select } = useStore.getState();
  const slabs = useMemo(() => computeCountertops(project), [project]);
  const walls = project.room.walls;
  const wall = walls.find((w) => w.id === ui.elevationWallId) ?? walls[0];

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !wall) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const view = fitView(elevationBounds(project, wall), w, h, 24, true);
    renderElevation(ctx, w, h, project, wall, view, { showDims: ui.showDims, showLabels: ui.showLabels, selectedIds, countertops: slabs });
  }, [project, wall, ui.showDims, ui.showLabels, selectedIds, slabs]);

  useEffect(() => {
    draw();
  });
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  const onClick = (e: React.MouseEvent) => {
    if (!wall) return;
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const view = fitView(elevationBounds(project, wall), c.clientWidth, c.clientHeight, 24, true);
    const u = (e.clientX - r.left - view.ox) / view.scale;
    const z = (view.oy - (e.clientY - r.top)) / view.scale;
    const candidates = itemsOnWall(project.items, wall);
    const hit = [...candidates].reverse().find((it) => {
      const { u: u0, w } = elevationU(wall, it);
      return u >= u0 && u <= u0 + w && z >= it.elevation && z <= it.elevation + it.height;
    });
    select(hit ? [hit.id] : []);
  };

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden bg-[#141b26]">
      <canvas ref={canvasRef} className="w-full h-full block" onClick={onClick} onDoubleClick={() => selectedIds.length && setUI({ modal: 'editor' })} />
      <div className="absolute top-2 left-44 flex gap-1 items-center">
        <span className="badge">ELEVATION</span>
        {walls.map((w) => (
          <button key={w.id} className={`vp-btn ${wall?.id === w.id ? 'active' : ''}`} onClick={() => setUI({ elevationWallId: w.id })}>
            {w.label}
          </button>
        ))}
      </div>
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          className="vp-btn"
          title="Export this elevation as PNG"
          onClick={() => {
            if (!wall) return;
            const img = renderElevationImage(project, wall.id, 2400, 1400);
            if (img) downloadCanvasPNG(img, `${safeName(project.name)}_elevation_${wall.id}.png`);
          }}
        >
          ⬇ PNG
        </button>
      </div>
    </div>
  );
}
