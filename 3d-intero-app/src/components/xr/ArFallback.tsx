import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Camera, CircleAlert, Download, LogOut, RotateCcw, Smartphone, X, ZoomIn, ZoomOut } from 'lucide-react';
import { SceneController } from '../../three/SceneController';
import { useStore } from '../../store';
import { Modal, toast } from '../ui';
import { downloadBlob, sanitizeFilename } from '../../lib/utils';

/** Modal fallback AR dengan 4 opsi (coba lagi / kamera dasar / buka di HP / batal). */
export function ArFallbackModal({ onRetry, reason }: { onRetry: () => void; reason: string }) {
  const s = useStore();
  if (!s.showArFallback) return null;
  const close = () => s.ui({ showArFallback: false });
  return (
    <Modal onClose={close} width={460}>
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.16)', color: 'var(--warning)' }}><CircleAlert size={19} /></span><h3 className="text-[16px] font-bold flex-1">AR Tidak Dapat Dimulai</h3><button className="icon-btn" onClick={close}><X size={16} /></button></div>
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{reason}</p>
        <div className="flex flex-col gap-2">
          <button className="btn btn-primary justify-start" onClick={() => { close(); onRetry(); }}><RotateCcw size={15} />Coba Lagi</button>
          <button className="btn btn-secondary justify-start" onClick={() => { close(); s.ui({ showCameraAr: true }); }}><Camera size={15} />Mode Kamera Dasar (tanpa tracking)</button>
          <button className="btn btn-secondary justify-start" onClick={() => { close(); s.ui({ showAr: true }); }}><Smartphone size={15} />Buka di HP Flagship (QR)</button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Tip: AR terbaik di Pixel 6+, Samsung S21+, atau iPhone 12 Pro+ dengan Chrome/Safari terbaru, via HTTPS. Untuk membuka desain di HP, salin tautan pendek dari menu Bagikan.</p>
      </div>
    </Modal>
  );
}

const Y = new THREE.Vector3(0, 1, 0);

/** Tier 4 — fallback WebRTC: kamera belakang sebagai latar, scene 3D transparan di atasnya (tanpa SLAM). */
export function CameraArView() {
  const s = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<SceneController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dragRef = useRef<{ p: THREE.Vector3; ox: number; oz: number } | null>(null);
  const pinchRef = useRef<{ d: number; scale: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!s.showCameraAr) return;
    let alive = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); }
      })
      .catch(() => setErr('Akses kamera ditolak atau tidak tersedia. Izinkan kamera lalu coba lagi.'));
    return () => { alive = false; streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, [s.showCameraAr]);

  useEffect(() => {
    if (!s.showCameraAr || !canvasRef.current) return;
    const ctl = new SceneController(canvasRef.current, {}, {});
    ctlRef.current = ctl;
    const st = useStore.getState();
    ctl.setTransparent(true); ctl.setGrid(false); ctl.setPeopleVisible(false);
    ctl.sync(st.items, st.walls, st.settings);
    ctl.setRoomVisible(false); ctl.setLightsOn(st.lightsOn);
    ctl.controls.enabled = false;
    const c = ctl.getRoomCenterM();
    const pos = new THREE.Vector3(c.x + 2.2, 1.55, c.z + 3.4);
    const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(c.x, 0.85, c.z), Y);
    ctl.setManualCamera(pos, new THREE.Quaternion().setFromRotationMatrix(m), 55);
    ctl.resize();
    const ro = new ResizeObserver(() => ctl.resize());
    ro.observe(hostRef.current!);
    return () => { ro.disconnect(); ctl.dispose(); ctlRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.showCameraAr]);

  useEffect(() => { const c = ctlRef.current; if (c) { c.root.scale.setScalar(0.001 * scale); c.root.rotation.y = (rot * Math.PI) / 180; } }, [scale, rot, ready]);

  if (!s.showCameraAr) return null;
  const close = () => s.ui({ showCameraAr: false });
  const apply = (dx: number, dz: number) => { const c = ctlRef.current; if (c) c.root.position.set(c.root.position.x + dx, 0, c.root.position.z + dz); };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    const p = ctlRef.current?.raycastFloor(e.clientX, e.clientY);
    if (p) dragRef.current = { p, ox: ctlRef.current!.root.position.x, oz: ctlRef.current!.root.position.z };
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current; if (!d || !ctlRef.current) return;
    const p = ctlRef.current.raycastFloor(e.clientX, e.clientY);
    if (p) apply(p.x - d.p.x, p.z - d.p.z);
  };
  const onTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinchRef.current) setScale(Math.min(3, Math.max(0.4, pinchRef.current.scale * (d / pinchRef.current.d))));
      else pinchRef.current = { d, scale };
    } else pinchRef.current = null;
  };
  const capture = async () => {
    const ctl = ctlRef.current, video = videoRef.current;
    if (!ctl || !video) return;
    ctl.renderOnce();
    const w = video.videoWidth || 1280, h = video.videoHeight || 720;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const g = out.getContext('2d')!;
    g.drawImage(video, 0, 0, w, h);
    g.drawImage(ctl.renderer.domElement, 0, 0, w, h);
    g.font = `600 ${Math.round(h * 0.024)}px sans-serif`; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'right'; g.fillText('3D Intero · preview kamera', w - 14, h - 14);
    out.toBlob((b) => { if (b) { downloadBlob(`${sanitizeFilename(useStore.getState().projectName)}_ar-kamera.png`, b); toast('Foto preview kamera disimpan', 'success'); } }, 'image/png');
  };
  return (
    <div className="fixed inset-0 z-[1600] flex flex-col" style={{ background: '#000' }}>
      <div ref={hostRef} className="relative flex-1 min-h-0 overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        {!err && <div style={{ position: 'absolute', inset: 0, touchAction: 'none' }} onPointerDown={down} onPointerMove={move} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={() => { pinchRef.current = null; }} />}
        {err && <div className="absolute inset-0 flex items-center justify-center p-6"><div className="panel rounded-2xl p-5 text-center max-w-sm"><CircleAlert size={26} style={{ color: 'var(--warning)' }} className="mx-auto mb-2" /><b>Mode Kamera Dasar</b><p className="text-[12.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>{err}</p><button className="btn btn-secondary btn-sm mt-3" onClick={close}>Tutup</button></div></div>}
        <div className="absolute left-0 right-0 top-0 flex items-center gap-2 p-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
          <span className="pill panel" style={{ fontSize: 11.5, padding: '5px 10px' }}><Camera size={13} />Mode Kamera Dasar — geser untuk memposisikan, cubit untuk skala</span>
          <div className="flex-1" />
          <button className="icon-btn panel" style={{ width: 34, height: 34 }} onClick={close} aria-label="Keluar"><LogOut size={16} /></button>
        </div>
        <div className="absolute left-0 right-0 bottom-0 flex flex-wrap items-center justify-center gap-2 p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <button className="icon-btn panel" style={{ width: 40, height: 40 }} onClick={() => setScale((v) => Math.max(0.4, v - 0.1))} aria-label="Perkecil"><ZoomOut size={17} /></button>
          <span className="pill panel mono" style={{ fontSize: 12, padding: '6px 10px' }}>{Math.round(scale * 100)}%</span>
          <button className="icon-btn panel" style={{ width: 40, height: 40 }} onClick={() => setScale((v) => Math.min(3, v + 0.1))} aria-label="Perbesar"><ZoomIn size={17} /></button>
          <span className="pill panel mono" style={{ fontSize: 12, padding: '6px 10px' }}>Rot {rot}°</span>
          <button className="icon-btn panel" style={{ width: 40, height: 40 }} onClick={() => setRot((v) => (v + 15) % 360)} aria-label="Putar"><RotateCcw size={17} /></button>
          <button className="btn btn-primary" onClick={capture} disabled={!!err}><Download size={15} />Ambil Foto</button>
        </div>
      </div>
      <button className="sr-only" onClick={() => setReady(true)} />
    </div>
  );
}
