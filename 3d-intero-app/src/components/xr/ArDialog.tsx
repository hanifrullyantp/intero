import { useEffect, useMemo, useState } from 'react';
import { compressToEncodedURIComponent } from 'lz-string';
import qrcode from 'qrcode-generator';
import { Camera, Copy, Glasses, MapPin, Smartphone, Wand2, X } from 'lucide-react';
import { useStore } from '../../store';
import { wallVec } from '../../engine/walls';
import { useXRCaps } from '../../xr/xr-manager';
import { arBadge, detectARCapability, type ArCapability } from '../../xr/ar-session';
import { Modal, toast } from '../ui';
import { launchAR, launchVR } from './launch';

function Card({ icon, title, desc, action, disabled, onClick, children }: { icon: React.ReactNode; title: string; desc: string; action: string; disabled?: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-2.5"><span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>{icon}</span><div className="min-w-0"><div className="text-[13.5px] font-bold">{title}</div><div className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>{desc}</div></div></div>
      {children}
      <button className="btn btn-primary btn-sm" disabled={disabled} onClick={onClick}>{action}</button>
    </div>
  );
}

export function ArDialog() {
  const s = useStore(); const caps = useXRCaps();
  const [cap, setCap] = useState<ArCapability | null>(null);
  useEffect(() => { let ok = true; if (s.showAr) detectARCapability().then((c) => { if (ok) setCap(c); }); return () => { ok = false; }; }, [s.showAr]);
  const badge = cap ? arBadge(cap) : caps.ar ? 'full' : 'none';
  const badgeUi = { full: { c: 'var(--brand-primary)', t: 'AR Full Support' }, limited: { c: 'var(--warning)', t: 'AR Terbatas (hit-test)' }, none: { c: 'var(--danger)', t: 'AR Tidak Didukung' } }[badge];
  const link = useMemo(() => {
    if (!s.showAr || caps.ar) return '';
    try { const pd = s.toProjectData(); pd.settings = { ...pd.settings, production: { ...pd.settings.production, logo: null } }; return `${location.origin}${location.pathname}#s=view.${compressToEncodedURIComponent(JSON.stringify(pd))}`; } catch { return ''; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.showAr, caps.ar]);
  const qr = useMemo(() => {
    if (!link || link.length > 2300) return '';
    try { const q = qrcode(0, 'L'); q.addData(link); q.make(); return q.createSvgTag({ cellSize: 3, margin: 2, scalable: true }); } catch { return ''; }
  }, [link]);
  if (!s.showAr) return null;
  const close = () => s.ui({ showAr: false });
  const { a, b } = s.arPins;
  const dist = a && b ? Math.hypot(b.x - a.x, b.z - a.z) : null;
  const autoPins = () => {
    const w = [...s.walls].sort((x, y) => wallVec(y).length - wallVec(x).length)[0];
    if (!w) { toast('Belum ada dinding pada desain', 'warning'); return; }
    s.ui({ arPins: { a: { x: w.start.x, y: 0, z: w.start.z }, b: { x: w.end.x, y: 0, z: w.end.z } } });
  };
  const pick = (which: 'a' | 'b') => { s.ui({ pickingPin: which, showAr: false }); toast(`Klik titik ${which.toUpperCase()} pada desain 3D`, 'info'); };
  const fmt = (p: typeof a) => (p ? `X ${(p.x / 10).toFixed(0)} · Z ${(p.z / 10).toFixed(0)} cm` : 'belum dipilih');
  const noXR = !caps.ar;
  return (
    <Modal onClose={close} width={720} style={{ maxHeight: 'calc(100vh - 24px)' }}>
      <div className="p-5 flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 40px)' }}>
        <div className="flex items-center gap-2"><Smartphone size={20} style={{ color: 'var(--brand-primary)' }} /><h3 className="text-[17px] font-bold flex-1">AR / VR Visualizer</h3><button className="icon-btn" onClick={close}><X size={16} /></button></div>
        <div className="flex flex-wrap gap-1.5 text-[11.5px]">
          <span className={`badge ${caps.ar ? 'badge-ok' : 'badge-warn'}`}>AR: {caps.checked ? (caps.ar ? 'didukung' : 'tidak didukung') : 'memeriksa…'}</span>
          <span className={`badge ${caps.vr ? 'badge-ok' : 'badge-warn'}`}>VR: {caps.checked ? (caps.vr ? 'didukung' : 'tidak didukung') : 'memeriksa…'}</span>
          {!caps.secure && <span className="badge badge-warn">WebXR memerlukan HTTPS</span>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Card icon={<Smartphone size={18} />} title="Free Placement" desc="Scan lantai dengan kamera, ketuk untuk menaruh kitchen set skala 1:1. Geser, putar, ketuk 2× untuk reset." action="Mulai AR" disabled={noXR} onClick={() => launchAR('free')} />
          <Card icon={<MapPin size={18} />} title="Room Matching (2 titik)" desc="Kalibrasi presisi: sentuh Titik A & B nyata agar set menempel ke dinding ruangan Anda." action="Mulai AR kalibrasi" disabled={noXR || !a || !b} onClick={() => launchAR('twopoint')}>
            <div className="text-[11.5px] flex flex-col gap-1.5">
              <div className="flex items-center gap-2"><span className="badge badge-ok">A</span><span className="flex-1 mono">{fmt(a)}</span><button className="btn btn-secondary btn-sm" onClick={() => pick('a')}>Pilih</button></div>
              <div className="flex items-center gap-2"><span className="badge badge-info">B</span><span className="flex-1 mono">{fmt(b)}</span><button className="btn btn-secondary btn-sm" onClick={() => pick('b')}>Pilih</button></div>
              <div className="flex items-center gap-2"><span className="flex-1" style={{ color: 'var(--text-tertiary)' }}>{dist ? `Jarak A–B di desain: ${(dist / 10).toFixed(1)} cm` : 'Pilih 2 titik referensi di desain'}</span><button className="btn btn-ghost btn-sm" onClick={autoPins}><Wand2 size={12} />Otomatis</button></div>
            </div>
          </Card>
          <Card icon={<Camera size={18} />} title="Foto Ruangan + Furnitur" desc="Foto dapur Anda, tandai 4 sudut lantai, lalu lihat kitchen set menempel di foto. Ekspor PNG untuk dibagikan." action="Buka mode foto" onClick={() => { s.ui({ showAr: false, showPhoto: true }); }} />
          <Card icon={<Glasses size={18} />} title="VR Walkthrough" desc="Jalan-jalan di dapur dengan headset: teleport, ambil kabinet, buka semua pintu, skala dunia, catatan suara." action="Masuk VR" disabled={!caps.vr} onClick={() => launchVR()} />
        </div>
        <div className="flex items-center gap-2 text-[12px]" style={{ flexWrap: 'wrap' }}><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: badgeUi.c }} /><b>{badgeUi.t}</b><span style={{ color: 'var(--text-tertiary)' }}>{cap?.hitTest === 'yes' ? 'hit-test tersedia' : cap?.hitTest === 'maybe' ? 'hit-test bergantung perangkat' : 'tanpa hit-test'}</span><div className="flex-1" /><button className="btn btn-secondary btn-sm" onClick={() => { s.ui({ showAr: false, showCameraAr: true }); }}><Camera size={13} />Mode Kamera Dasar</button></div>
        {noXR && caps.checked && (
          <div className="rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-center" style={{ border: '1px dashed var(--border)' }}>
            {qr ? <div style={{ width: 132, height: 132, background: '#fff', padding: 4, borderRadius: 8, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qr }} /> : null}
            <div className="text-[12px] flex flex-col gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <b style={{ color: 'var(--text-primary)' }}>Perangkat ini belum mendukung AR langsung.</b>
              <span>{qr ? 'Pindai kode QR dengan HP Android (Chrome) atau iOS 17+ untuk membuka desain ini dalam mode lihat saja, lalu tekan AR Preview.' : 'Desain terlalu besar untuk QR. Salin tautan dan buka di HP Anda.'}</span>
              {link && <button className="btn btn-secondary btn-sm self-start" onClick={async () => { try { await navigator.clipboard.writeText(link); toast('Tautan disalin', 'success'); } catch { toast('Gagal menyalin', 'error'); } }}><Copy size={13} />Salin tautan</button>}
              <span>Mode Foto Ruangan tetap bisa dipakai di perangkat ini.</span>
            </div>
          </div>
        )}
        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Skala 1 unit = 1 meter nyata. Light estimation & bayangan bersifat opsional sesuai dukungan perangkat. Depth occlusion belum tersedia.</p>
      </div>
    </Modal>
  );
}

export function PinPickBanner() {
  const s = useStore();
  if (!s.pickingPin) return null;
  return (
    <div className="panel rounded-full px-4 py-2 flex items-center gap-3 text-[13px]" style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 900, boxShadow: 'var(--shadow-lg)' }}>
      <MapPin size={15} style={{ color: 'var(--brand-primary)' }} /><span>Klik <b>Titik {s.pickingPin.toUpperCase()}</b> pada desain 3D</span>
      <button className="btn btn-secondary btn-sm" onClick={() => s.ui({ pickingPin: null, showAr: true })}>Batal</button>
    </div>
  );
}
