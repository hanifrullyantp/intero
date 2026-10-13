import { useEffect } from 'react';
import { useStore } from '../core/store';
import { DoorOpen, DoorClosed, Play, Pause, SkipBack, SkipForward, Video } from './icons';

/** Door / drawer animation controls. Rendered inside the right sidebar "Open" tab. */
export function OpenControls() {
  const ui = useStore((s) => s.ui);
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const { setUI, setDoorsOpen, toast } = useStore.getState();
  const cabinets = project.items.filter((i) => i.kind === 'cabinet');

  // guided tour: step through cabinets while the Open tab is mounted
  useEffect(() => {
    if (!ui.tourPlaying || !cabinets.length) return;
    const t = setTimeout(() => {
      const idx = (ui.tourIndex + 1) % cabinets.length;
      setUI({ tourIndex: idx });
      useStore.getState().select([cabinets[idx].id]);
      setDoorsOpen(true, 'selected');
    }, 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.tourPlaying, ui.tourIndex]);

  const speedLabel = ui.openSpeed <= 0.5 ? 'Fast (0.4s)' : ui.openSpeed >= 1.2 ? 'Slow (1.5s)' : 'Normal (0.8s)';
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b text-[10px] opacity-60" style={{ borderColor: 'var(--border)' }}>
        Klik pintu/laci di 3D untuk membuka satu per satu · Shift+O membuka tab ini.
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-1">
          <button className="btn flex items-center justify-center gap-1" onClick={() => setDoorsOpen(true, 'all')}><Play size={12} /> Open all</button>
          <button className="btn flex items-center justify-center gap-1" onClick={() => setDoorsOpen(false, 'all')}><DoorClosed size={12} /> Close all</button>
          <button className="btn" onClick={() => (selectedIds.length ? setDoorsOpen(true, 'selected') : toast({ severity: 'warning', message: 'Select cabinets first' }))}>Open selected</button>
          <button className="btn" onClick={() => (selectedIds.length ? setDoorsOpen(false, 'selected') : null)}>Close selected</button>
        </div>
        <div>
          <div className="text-xs mb-1 flex justify-between"><span className="opacity-70">Speed</span><span>{speedLabel}</span></div>
          <input type="range" min={0.4} max={1.5} step={0.1} value={ui.openSpeed} onChange={(e) => setUI({ openSpeed: parseFloat(e.target.value) })} className="w-full" />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={ui.showContents} onChange={(e) => setUI({ showContents: e.target.checked })} /> Show internal contents (dishes, gas tank)
        </label>
        <div>
          <div className="label mb-1 flex items-center gap-1"><DoorOpen size={11} /> View mode</div>
          <div className="flex gap-1">
            {(['normal', 'xray', 'explode'] as const).map((m) => (
              <button key={m} className={`chip ${ui.openView === m ? 'active' : ''}`} onClick={() => setUI({ openView: m })}>
                {m === 'normal' ? 'Normal' : m === 'xray' ? 'X-Ray' : 'Explode'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-1 flex items-center gap-1"><Video size={11} /> Guided tour</div>
          <div className="flex gap-1">
            {!ui.tourPlaying ? (
              <button className="btn-primary flex-1 flex items-center justify-center gap-1" onClick={() => { setUI({ tourPlaying: true, tourIndex: 0, viewMode: '3d' }); if (cabinets[0]) useStore.getState().select([cabinets[0].id]); }}><Play size={12} /> Start tour</button>
            ) : (
              <>
                <button className="btn" onClick={() => setUI({ tourIndex: (ui.tourIndex - 1 + cabinets.length) % cabinets.length })}><SkipBack size={12} /></button>
                <button className="btn flex-1 flex items-center justify-center gap-1" onClick={() => setUI({ tourPlaying: false })}><Pause size={12} /> Pause / Exit</button>
                <button className="btn" onClick={() => setUI({ tourIndex: (ui.tourIndex + 1) % cabinets.length })}><SkipForward size={12} /></button>
              </>
            )}
          </div>
          {ui.tourPlaying && cabinets[ui.tourIndex] && (
            <div className="text-[11px] mt-1.5 opacity-80">{ui.tourIndex + 1}/{cabinets.length} · {cabinets[ui.tourIndex].name}</div>
          )}
        </div>
      </div>
    </div>
  );
}
