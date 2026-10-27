import { useEffect, useRef, useState } from 'react';
import { Box, Download, FileUp, Glasses, Moon, Ruler, Smartphone, Sun } from 'lucide-react';
import { useStore } from '../../store';
import { Viewport } from '../editor/Viewport';
import { ViewControls } from '../editor/ViewControls';
import { DimensionPanel } from '../dimensions/DimensionPanel';
import { ArDialog, PinPickBanner } from '../xr/ArDialog';
import { PhotoOverlay } from '../xr/PhotoOverlay';
import { launchVR } from '../xr/launch';
import { useXRCaps } from '../../xr/xr-manager';
import { saveInteroFile, validateProjectData } from '../../lib/persistence';
import { APP_NAME } from '../../lib/constants';
import { toast } from '../ui';

/** Viewer standalone: tanpa kemampuan edit. AR/VR & dimensi sama seperti editor. Buka via tautan berbagi atau drag-drop file .intero. */
export function Viewer({ onBack }: { onBack: () => void }) {
  const s = useStore();
  const caps = useXRCaps();
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { useStore.getState().ui({ shareMode: 'view', appMode: 'design', tool: 'select', showLayers: false, showProps: false }); }, []);

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as unknown;
      if (!validateProjectData(data)) throw new Error('Struktur file tidak valid');
      const st = useStore.getState(); st.loadProject(data); st.ui({ shareMode: 'view', resetViewRequest: st.resetViewRequest + 1 });
      toast(`"${data.projectName}" dibuka (lihat saja)`, 'success');
    } catch (e) { toast(`File .intero tidak valid: ${(e as Error).message}`, 'error'); }
  };
  const empty = !s.items.length;
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void loadFile(e.dataTransfer.files?.[0]); }}>
      <header className="flex items-center gap-2 px-3 shrink-0" style={{ height: 56, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', maxWidth: '100vw' }}>
        <button className="flex items-center gap-2 min-w-0" onClick={onBack} title="Kembali"><span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-primary)', color: '#fff' }}><Box size={17} /></span><span className="font-bold text-[14px] hidden sm:inline" style={{ fontFamily: 'var(--font-heading)' }}>{APP_NAME}</span></button>
        <div className="flex-1 min-w-0 text-center"><div className="text-[13px] font-semibold truncate">{s.projectName}</div><div className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>Mode lihat saja</div></div>
        <button className="icon-btn" data-tip="Dimensi" onClick={() => { s.setDim({ showDimensions: true }); s.ui({ showDimPanel: !s.showDimPanel }); }}><Ruler size={17} /></button>
        <button className="btn btn-primary btn-sm" onClick={() => s.ui({ showAr: true })}><Smartphone size={14} /><span className="hidden sm:inline">AR Preview</span></button>
        {caps.vr && <button className="btn btn-secondary btn-sm" onClick={() => launchVR()}><Glasses size={14} /><span className="hidden sm:inline">VR</span></button>}
        <button className="btn btn-secondary btn-sm" disabled={empty} onClick={() => saveInteroFile(s.toProjectData())}><Download size={14} /><span className="hidden md:inline">Download .intero</span></button>
        <button className="icon-btn" onClick={() => s.setTheme(s.theme === 'dark' ? 'light' : 'dark')}>{s.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
      </header>
      <div className="flex-1 relative min-h-0">
        <Viewport />
        <ViewControls />
        <DimensionPanel />
        {empty && (
          <div className="absolute inset-0 flex items-center justify-center p-6 z-20" style={{ background: drag ? 'rgba(27,157,107,0.18)' : 'transparent', pointerEvents: 'none' }}>
            <div className="panel rounded-2xl p-6 flex flex-col items-center gap-3 text-center max-w-sm" style={{ pointerEvents: 'auto' }}>
              <FileUp size={34} style={{ color: 'var(--brand-primary)' }} /><b>Buka desain untuk dilihat</b>
              <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>Seret file <b>.intero</b> ke sini, atau pilih dari perangkat. Tidak ada upload — file dibuka lokal di browser Anda.</span>
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>Pilih file .intero</button>
              <input ref={fileRef} type="file" accept=".intero,.json" className="hidden" onChange={(e) => void loadFile(e.target.files?.[0])} />
            </div>
          </div>
        )}
      </div>
      <ArDialog /><PinPickBanner /><PhotoOverlay />
    </div>
  );
}
