import { Camera, Glasses, Lock, LogOut, Minus, Plus, RotateCcw, Sun, SunDim, Unlock, X } from 'lucide-react';
import { arReset, arScale, arScreenshot, arSetScaleLocked, arToggleLight, arToggleShadows, stopAR, useArState } from '../../xr/ar';
import { stopVR, useVrState } from '../../xr/vr';

/** Overlay DOM untuk sesi WebXR (dom-overlay): instruksi, kalibrasi, kontrol; plus HUD saat VR aktif. */
export function ArHost() {
  const ar = useArState(); const vr = useVrState();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const btn = 'flex items-center justify-center rounded-full';
  const bstyle: React.CSSProperties = { width: 46, height: 46, background: 'rgba(15,20,25,0.78)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' };
  return (
    <>
      <div id="ar-overlay" style={{ position: 'fixed', inset: 0, display: ar.active ? 'block' : 'none', zIndex: 3000, fontFamily: 'var(--font-body)' }}>
        <div id="ar-gesture" style={{ position: 'absolute', inset: 0, touchAction: 'none' }} />
        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', left: 12, right: 12, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ background: 'rgba(15,20,25,0.82)', color: '#fff', padding: '10px 14px', borderRadius: 14, fontSize: 13, maxWidth: 520, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
            <b style={{ color: '#4CBE93' }}>{ar.mode === 'twopoint' ? 'Room Matching' : 'Free Placement'}</b> — {ar.message}
          </div>
          {ar.liveDistance !== null && ar.phase === 'calib-b' && <div className="mono" style={{ background: '#1B9D6B', color: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>Jarak dari Titik A: {(ar.liveDistance * 100).toFixed(0)} cm</div>}
          {ar.accuracy !== null && <div style={{ background: '#1B9D6B', color: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Akurasi ±{ar.accuracy} cm</div>}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom) + 16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }} onTouchStart={stop} onTouchEnd={stop} onTouchMove={stop}>
          {!ar.scaleLocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(15,20,25,0.78)', color: '#fff', padding: '6px 12px', borderRadius: 999 }}>
              <button className={btn} style={{ width: 34, height: 34, background: 'transparent', color: '#fff' }} onClick={() => arScale(-0.05)} aria-label="Perkecil"><Minus size={18} /></button>
              <span className="mono" style={{ fontSize: 13, minWidth: 48, textAlign: 'center' }}>{Math.round(ar.scale * 100)}%</span>
              <button className={btn} style={{ width: 34, height: 34, background: 'transparent', color: '#fff' }} onClick={() => arScale(0.05)} aria-label="Perbesar"><Plus size={18} /></button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', padding: '0 12px' }}>
            <button className={btn} style={bstyle} onClick={() => arSetScaleLocked(!ar.scaleLocked)} aria-label="Kunci skala 100%" title={ar.scaleLocked ? 'Skala terkunci 100% (akurat)' : 'Skala bebas'}>{ar.scaleLocked ? <Lock size={19} /> : <Unlock size={19} />}</button>
            <button className={btn} style={{ ...bstyle, background: ar.shadows ? 'rgba(27,157,107,0.9)' : bstyle.background }} onClick={arToggleShadows} aria-label="Bayangan" title="Bayangan"><SunDim size={19} /></button>
            <button className={btn} style={{ ...bstyle, background: ar.lightEstimation ? 'rgba(27,157,107,0.9)' : bstyle.background }} onClick={arToggleLight} aria-label="Estimasi cahaya" title="Lighting estimation"><Sun size={19} /></button>
            <button className={btn} style={bstyle} onClick={arReset} aria-label="Reset penempatan" title="Reset penempatan"><RotateCcw size={19} /></button>
            <button className={btn} style={bstyle} onClick={arScreenshot} aria-label="Screenshot" title="Screenshot render 3D"><Camera size={19} /></button>
            <button className={btn} style={{ ...bstyle, background: 'rgba(220,38,38,0.92)' }} onClick={stopAR} aria-label="Keluar AR" title="Keluar AR"><LogOut size={19} /></button>
          </div>
        </div>
      </div>
      {vr.active && (
        <div className="panel rounded-2xl p-3 flex items-start gap-3" style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 2500, maxWidth: 340 }}>
          <Glasses size={20} style={{ color: 'var(--brand-primary)' }} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-[12.5px]"><b>Sesi VR aktif</b><div style={{ color: 'var(--text-secondary)' }}>{vr.message || 'Gunakan headset.'}</div>{vr.scale !== 1 && <div className="mono text-[11px]">Skala dunia ×{vr.scale}</div>}{vr.notes > 0 && <div className="text-[11px]">{vr.notes} catatan suara</div>}</div>
          <button className="icon-btn" onClick={stopVR} aria-label="Akhiri VR"><X size={15} /></button>
        </div>
      )}
    </>
  );
}
