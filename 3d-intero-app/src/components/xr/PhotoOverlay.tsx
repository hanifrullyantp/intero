import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Brush, Camera, Download, Eraser, Image as ImageIcon, Move, RotateCcw, Share2, Undo2, X } from 'lucide-react';
import { useStore } from '../../store';
import { SceneController } from '../../three/SceneController';
import { solveCameraFromRect } from '../../xr/perspective-solver';
import { footprint } from '../../dimensions/compute';
import { wallVec } from '../../engine/walls';
import { Field, toast, useIsMobile } from '../ui';
import { downloadBlob, sanitizeFilename } from '../../lib/utils';

type Step = 'pick' | 'calib' | 'compose';
type Tool = 'move' | 'brush' | 'erase';
const CORNER_LABELS = ['Belakang-kiri', 'Belakang-kanan', 'Depan-kanan', 'Depan-kiri'];
const Y = new THREE.Vector3(0, 1, 0);
const fit = (iw: number, ih: number, mw: number, mh: number) => { const k = Math.max(0.05, Math.min(mw / iw, mh / ih)); return { w: Math.floor(iw * k), h: Math.floor(ih * k) }; };

/** Mode AR 3: foto dapur + kitchen set 3D. Kalibrasi 4 titik lantai → homografi → kamera 3D yang cocok dengan foto. */
export function PhotoOverlay() {
  const s = useStore();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>('pick');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [pts, setPts] = useState<[number, number][]>([]);
  const backLen = s.walls.find((w) => w.id === 'back') ?? s.walls[0];
  const [W, setW] = useState(() => (backLen ? Math.round(wallVec(backLen).length) / 1000 : 3));
  const [D, setD] = useState(2.4);
  const [fov, setFov] = useState(55);
  const [offX, setOffX] = useState(0); const [offZ, setOffZ] = useState(0); const [rot, setRot] = useState(0);
  const [shadows, setShadows] = useState(true); const [sunAz, setSunAz] = useState(40); const [bright, setBright] = useState(1);
  const [tone, setTone] = useState(1); const [sat, setSat] = useState(1);
  const [tool, setTool] = useState<Tool>('move'); const [brush, setBrush] = useState(28);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctlRef = useRef<SceneController | null>(null);
  const occRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const shadowRef = useRef<THREE.Mesh | null>(null);
  const dragRef = useRef<{ p: THREE.Vector3; ox: number; oz: number } | null>(null);
  const strokeRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { const h = () => setVp({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  const avail = { w: Math.max(240, vp.w - (isMobile ? 16 : 320)), h: Math.max(200, vp.h - (isMobile ? 330 : 110)) };
  const disp = img ? fit(img.naturalWidth, img.naturalHeight, avail.w, avail.h) : { w: 320, h: 240 };
  const solved = useMemo(() => (img && pts.length === 4 ? solveCameraFromRect(pts, W, D, img.naturalWidth, img.naturalHeight, fov) : null), [img, pts, W, D, fov]);
  const minCorner = useMemo(() => {
    const xs: number[] = [], zs: number[] = [];
    for (const w of s.walls) { xs.push(w.start.x, w.end.x); zs.push(w.start.z, w.end.z); }
    if (!xs.length) for (const p of s.items.flatMap(footprint)) { xs.push(p.x); zs.push(p.z); }
    return { x: (xs.length ? Math.min(...xs) : 0) * 0.001, z: (zs.length ? Math.min(...zs) : 0) * 0.001 };
  }, [s.walls, s.items]);

  // Buat scene 3D saat masuk tahap compose
  useEffect(() => {
    if (step !== 'compose' || !canvasRef.current) return;
    const ctl = new SceneController(canvasRef.current, {}, {});
    ctlRef.current = ctl;
    ctl.controls.enabled = false; ctl.setTransparent(true); ctl.setGrid(false); ctl.setPeopleVisible(false); ctl.setRoomVisible(false);
    const st = useStore.getState();
    ctl.sync(st.items, st.walls, st.settings); ctl.setRoomVisible(false); ctl.setLightsOn(st.lightsOn);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.4 }));
    sh.receiveShadow = true; sh.position.y = 0.002; ctl.scene.add(sh); shadowRef.current = sh;
    const m = document.createElement('canvas'); m.width = disp.w; m.height = disp.h; maskRef.current = m;
    ctl.resize();
    return () => { ctl.dispose(); ctlRef.current = null; shadowRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  useEffect(() => {
    const ctl = ctlRef.current; if (!ctl || !solved) return;
    ctl.resize(); ctl.setManualCamera(solved.position, solved.quaternion, fov);
  }, [solved, fov, step, disp.w, disp.h]);
  useEffect(() => {
    const ctl = ctlRef.current; if (!ctl) return;
    const rad = (rot * Math.PI) / 180; const off = new THREE.Vector3(minCorner.x, 0, minCorner.z).applyAxisAngle(Y, rad);
    ctl.root.rotation.y = rad; ctl.root.position.set(offX - off.x, 0, offZ - off.z);
  }, [offX, offZ, rot, minCorner, step]);
  useEffect(() => {
    const ctl = ctlRef.current; if (!ctl) return;
    const az = (sunAz * Math.PI) / 180;
    ctl.setSunEstimate(new THREE.Vector3(Math.cos(az) * 0.6, 0.85, Math.sin(az) * 0.6), new THREE.Color(1, 1, 1), 1);
    ctl.setShadowEnabled(shadows); if (shadowRef.current) shadowRef.current.visible = shadows;
    ctl.setBrightness(bright);
  }, [sunAz, shadows, bright, step]);
  useEffect(() => {
    if (step !== 'compose' || !occRef.current || !maskRef.current) return;
    occRef.current.width = disp.w; occRef.current.height = disp.h;
    if (maskRef.current.width !== disp.w) { maskRef.current.width = disp.w; maskRef.current.height = disp.h; }
  }, [step, disp.w, disp.h]);

  if (!s.showPhoto) return null;
  const close = () => { s.ui({ showPhoto: false }); setStep('pick'); setImg(null); setPts([]); setOffX(0); setOffZ(0); setRot(0); };
  const load = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file); const im = new Image();
    im.onload = () => { setImg(im); setStep('calib'); setPts([]); };
    im.onerror = () => { URL.revokeObjectURL(url); toast('Gambar tidak dapat dibaca', 'error'); };
    im.src = url;
  };
  const onCalibClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!img || pts.length >= 4) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPts([...pts, [((e.clientX - r.left) / r.width) * img.naturalWidth, ((e.clientY - r.top) / r.height) * img.naturalHeight]]);
  };
  const next = () => { if (!solved) { toast('Kalibrasi gagal — titik tidak membentuk persegi panjang yang valid. Ulangi urutan titik.', 'error'); return; } setStep('compose'); };

  const redrawOcc = () => {
    const c = occRef.current, m = maskRef.current; if (!c || !m || !img) return;
    const g = c.getContext('2d')!; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height); g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-over';
  };
  const paintTo = (x: number, y: number) => {
    const m = maskRef.current; if (!m) return; const g = m.getContext('2d')!;
    g.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over'; g.fillStyle = '#000';
    const from = strokeRef.current ?? { x, y }; const dist = Math.hypot(x - from.x, y - from.y); const n = Math.max(1, Math.ceil(dist / (brush / 3)));
    for (let i = 0; i <= n; i++) { const px = from.x + ((x - from.x) * i) / n, py = from.y + ((y - from.y) * i) / n; g.beginPath(); g.arc(px, py, brush, 0, Math.PI * 2); g.fill(); }
    strokeRef.current = { x, y }; redrawOcc();
  };
  const local = (e: React.PointerEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * disp.w, y: ((e.clientY - r.top) / r.height) * disp.h }; };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === 'move') { const p = ctlRef.current?.raycastFloor(e.clientX, e.clientY); if (p) dragRef.current = { p, ox: offX, oz: offZ }; }
    else { strokeRef.current = null; const l = local(e); paintTo(l.x, l.y); }
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === 'move') { const d = dragRef.current; if (!d) return; const p = ctlRef.current?.raycastFloor(e.clientX, e.clientY); if (p) { setOffX(d.ox + (p.x - d.p.x)); setOffZ(d.oz + (p.z - d.p.z)); } }
    else if (strokeRef.current) { const l = local(e); paintTo(l.x, l.y); }
  };
  const up = () => { dragRef.current = null; strokeRef.current = null; };
  const compose = async (): Promise<Blob | null> => {
    const ctl = ctlRef.current; if (!ctl || !img) return null;
    ctl.renderOnce();
    const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight)); const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
    const out = document.createElement('canvas'); out.width = w; out.height = h; const g = out.getContext('2d')!;
    g.drawImage(img, 0, 0, w, h);
    g.filter = `brightness(${tone}) saturate(${sat})`; g.drawImage(ctl.renderer.domElement, 0, 0, w, h); g.filter = 'none';
    if (occRef.current) g.drawImage(occRef.current, 0, 0, w, h);
    g.font = `600 ${Math.round(h * 0.022)}px sans-serif`; g.fillStyle = 'rgba(255,255,255,0.85)'; g.textAlign = 'right'; g.fillText('3D Intero', w - 14, h - 14);
    return new Promise((res) => out.toBlob((b) => res(b), 'image/png'));
  };
  const exportPng = async () => { const b = await compose(); if (!b) return; downloadBlob(`${sanitizeFilename(s.projectName)}_preview-dapur.png`, b); toast('Foto preview diunduh — siap dibagikan ke WhatsApp/IG', 'success'); };
  const share = async () => {
    const b = await compose(); if (!b) return;
    const file = new File([b], `${sanitizeFilename(s.projectName)}_preview-dapur.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Begini jadinya dapur Anda setelah dipasang kitchen set!', text: 'Dibuat dengan 3D Intero' }); } catch { /* dibatalkan */ } }
    else { downloadBlob(file.name, b); toast('Berbagi langsung tidak didukung — file diunduh.', 'info'); }
  };

  const panelCls = 'panel flex flex-col gap-3 p-3 overflow-y-auto';
  const panelStyle: React.CSSProperties = isMobile ? { position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '44vh', borderRadius: '18px 18px 0 0' } : { position: 'fixed', top: 52, right: 0, bottom: 0, width: 308 };
  const slider = (label: string, v: number, set: (n: number) => void, min: number, max: number, step: number, unit = '') => (
    <Field label={`${label} ${Number.isInteger(v) ? v : v.toFixed(2)}${unit}`}><input type="range" className="slider" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} /></Field>
  );
  return (
    <div className="fixed inset-0 z-[1500] flex flex-col" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <div className="flex items-center gap-2 px-3 shrink-0" style={{ height: 52, borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
        <Camera size={18} style={{ color: 'var(--brand-primary)' }} /><span className="font-bold text-[14px] flex-1 truncate">Foto Ruangan + Kitchen Set</span>
        <div className="hidden sm:flex gap-1 text-[11px]">{(['pick', 'calib', 'compose'] as Step[]).map((x, i) => <span key={x} className={`badge ${step === x ? 'badge-ok' : ''}`} style={step === x ? undefined : { color: 'var(--text-tertiary)' }}>{i + 1}. {x === 'pick' ? 'Foto' : x === 'calib' ? 'Kalibrasi' : 'Komposisi'}</span>)}</div>
        <button className="icon-btn" onClick={close} aria-label="Tutup"><X size={17} /></button>
      </div>

      {step === 'pick' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <ImageIcon size={42} style={{ color: 'var(--text-tertiary)' }} />
          <div className="max-w-md text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>Ambil foto dapur kosong/existing dari sudut mata, pastikan 4 sudut lantai (atau batas area kitchen set) terlihat jelas.</div>
          <div className="flex flex-wrap gap-2 justify-center">
            <label className="btn btn-primary cursor-pointer"><Camera size={16} />Ambil foto<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => load(e.target.files?.[0])} /></label>
            <label className="btn btn-secondary cursor-pointer"><ImageIcon size={16} />Pilih dari galeri<input type="file" accept="image/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} /></label>
          </div>
        </div>
      )}

      {step === 'calib' && img && (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <div className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-auto">
            <div style={{ position: 'relative', width: disp.w, height: disp.h }}>
              <img src={img.src} alt="foto ruangan" style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }} draggable={false} />
              <svg viewBox={`0 0 ${img.naturalWidth} ${img.naturalHeight}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: pts.length < 4 ? 'crosshair' : 'default' }} onClick={onCalibClick}>
                {pts.length > 1 && <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="rgba(27,157,107,0.18)" stroke="#1B9D6B" strokeWidth={img.naturalWidth * 0.004} />}
                {pts.map((p, i) => (<g key={i}><circle cx={p[0]} cy={p[1]} r={img.naturalWidth * 0.011} fill="#1B9D6B" stroke="#fff" strokeWidth={img.naturalWidth * 0.003} /><text x={p[0]} y={p[1] - img.naturalWidth * 0.018} fontSize={img.naturalWidth * 0.022} fill="#fff" stroke="#000" strokeWidth={img.naturalWidth * 0.0015} textAnchor="middle" fontWeight={700}>{i + 1}</text></g>))}
              </svg>
            </div>
          </div>
          <div className={panelCls} style={isMobile ? { maxHeight: '42vh' } : { width: 308, borderLeft: '1px solid var(--border)', borderTop: 0 }}>
            <div className="text-[13px] font-bold">Tandai 4 sudut lantai</div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{pts.length < 4 ? <>Klik titik <b>{pts.length + 1}: {CORNER_LABELS[pts.length]}</b> pada foto.</> : 'Semua titik terpasang. Isi ukuran area nyata.'}</div>
            <div className="grid grid-cols-2 gap-2"><Field label="Lebar area (m)"><input className="input mono" type="number" step={0.05} min={0.5} value={W} onChange={(e) => setW(Math.max(0.5, +e.target.value))} /></Field><Field label="Dalam area (m)"><input className="input mono" type="number" step={0.05} min={0.5} value={D} onChange={(e) => setD(Math.max(0.5, +e.target.value))} /></Field></div>
            {slider('FOV kamera', fov, setFov, 30, 100, 1, '°')}
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Ukuran area nyata dipakai sebagai referensi skala (mis. lebar dinding yang sudah diukur). FOV vertikal HP biasanya 50–60°.</p>
            <div className="flex gap-2"><button className="btn btn-secondary btn-sm" onClick={() => setPts(pts.slice(0, -1))} disabled={!pts.length}><Undo2 size={13} />Undo</button><button className="btn btn-secondary btn-sm" onClick={() => setPts([])} disabled={!pts.length}><RotateCcw size={13} />Reset</button><div className="flex-1" /><button className="btn btn-primary btn-sm" disabled={pts.length < 4} onClick={next}>Lanjut</button></div>
          </div>
        </div>
      )}

      {step === 'compose' && img && (
        <div className="flex-1 min-h-0 flex items-center justify-center" style={{ paddingRight: isMobile ? 0 : 308, paddingBottom: isMobile ? '44vh' : 0 }}>
          <div style={{ position: 'relative', width: disp.w, height: disp.h, backgroundImage: `url(${img.src})`, backgroundSize: '100% 100%', touchAction: 'none', overflow: 'hidden' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: `brightness(${tone}) saturate(${sat})`, pointerEvents: 'none' }} />
            <canvas ref={occRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
          </div>
          <div className={panelCls} style={panelStyle}>
            <div className="seg w-full"><button className={`flex-1 ${tool === 'move' ? 'active' : ''}`} onClick={() => setTool('move')}><Move size={13} />Geser</button><button className={`flex-1 ${tool === 'brush' ? 'active' : ''}`} onClick={() => setTool('brush')}><Brush size={13} />Masker</button><button className={`flex-1 ${tool === 'erase' ? 'active' : ''}`} onClick={() => setTool('erase')}><Eraser size={13} />Hapus</button></div>
            {tool === 'move' ? <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Seret pada foto untuk menggeser kitchen set di lantai.</p> : <>{slider('Ukuran kuas', brush, setBrush, 6, 80, 1, ' px')}<p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Masker: cat area foto yang harus berada DI DEPAN furnitur (mis. kusen, meja).</p></>}
            {slider('Geser X', offX, setOffX, -3, 3, 0.01, ' m')}{slider('Geser Z', offZ, setOffZ, -3, 3, 0.01, ' m')}{slider('Rotasi', rot, setRot, -180, 180, 1, '°')}
            <label className="flex items-center justify-between text-[12.5px]"><span>Bayangan di lantai</span><input type="checkbox" className="accent-[var(--brand-primary)]" checked={shadows} onChange={(e) => setShadows(e.target.checked)} /></label>
            {slider('Arah cahaya', sunAz, setSunAz, 0, 360, 1, '°')}{slider('Ambient / cahaya', bright, setBright, 0.4, 1.6, 0.05)}{slider('Kecerahan warna', tone, setTone, 0.6, 1.5, 0.02)}{slider('Saturasi', sat, setSat, 0.4, 1.6, 0.02)}
            {slider('FOV (fine-tune)', fov, setFov, 30, 100, 1, '°')}
            <div className="grid grid-cols-2 gap-2"><button className="btn btn-primary btn-sm" onClick={exportPng}><Download size={13} />Ekspor PNG</button><button className="btn btn-secondary btn-sm" onClick={share}><Share2 size={13} />Bagikan</button></div>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('calib')}>Ulangi kalibrasi</button>
          </div>
        </div>
      )}
    </div>
  );
}
