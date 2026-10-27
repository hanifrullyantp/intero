import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight, Box, Download, Link2, Moon, MousePointerClick, Sun, Wifi, Zap } from 'lucide-react';
import { SceneController } from '../three/SceneController';
import { generateLayout } from '../engine/layout-generator';
import { repackAll } from '../engine/walls';
import { DEFAULT_LED, DEFAULT_MATERIALS, DEFAULT_SETTINGS, APP_NAME } from '../lib/constants';
import type { Item, WizardInput } from '../types';
import { useStore, wallBottomOf, wallHeightOf } from '../store';
import { useIsMobile } from './ui';

export const landingApi: { cinematic: ((onSwap: () => void) => void) | null } = { cinematic: null };

const DEMO: WizardInput = {
  shape: 'L', lengths: { left: 270, back: 390, right: 240, front: 360 }, island: false, islandDims: { w: 150, d: 90 },
  sink: { enabled: true, wallId: 'back', fromCorner: 150 }, cooktop: { enabled: true, wallId: 'back', fromCorner: 270 }, fridge: { enabled: true, wallId: 'left', fromCorner: 0 }, electronic: { enabled: true, wallId: 'left', fromCorner: 100 },
  options: { magiccom: true, dispenser: false, microwave: true, bar: false, dishRack: true, spiceRack: true, gasRack: true },
  style: null, material: { doorMaterial: 'HPL', doorColor: '#C9A97A', bodyFollowsDoor: false, bodyColor: '#F5F5F3', countertop: 'granit_hitam', handleType: 'bar', handleColor: '#1A1A1A', led: true },
};

export function Landing() {
  const mobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const featRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef(mobile);
  const ctlRef = useRef<SceneController | null>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  mobileRef.current = mobile;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctl = new SceneController(canvas, {}, { landing: true });
    ctlRef.current = ctl;
    ctl.setBackground(useStore.getState().theme, DEFAULT_SETTINGS.appearance.canvasColor);
    ctl.setGrid(false);
    const settings = { ...DEFAULT_SETTINGS, countertop: { ...DEFAULT_SETTINGS.countertop, type: 'granit_hitam' as const } };
    const out = generateLayout(DEMO, settings);
    const items: Item[] = out.items.map((n, idx) => {
      const isWallRow = n.type === 'wall' || n.type === 'corner_wall' || n.type === 'hood';
      const isTall = n.type === 'tall' || n.type === 'fridge' || n.type === 'electronic';
      return {
        id: n.id ?? `L${idx}`, name: n.name ?? n.type, type: n.type, wallId: n.wallId ?? null, orderIndex: n.orderIndex ?? idx,
        position: n.position ?? { x: 0, y: isWallRow ? wallBottomOf(settings) : 0, z: 0 }, rotationY: n.rotationY ?? 0,
        dims: { ...n.dims, h: isWallRow ? wallHeightOf(settings) : isTall ? settings.globalCabinetHeight : n.dims.h },
        materials: { ...DEFAULT_MATERIALS, ...(n.materials ?? {}) }, config: n.config ?? {}, led: { ...DEFAULT_LED, ...(n.led ?? {}) },
        visible: true, locked: false, colorLabel: null, createdAt: new Date().toISOString(),
      };
    });
    let p = 0;
    const cx = 1.95, cz = 1.35;
    const timer = setInterval(() => { p = Math.min(92, p + 9); setProgress(p); }, 90);
    requestAnimationFrame(() => {
      ctl.sync(repackAll(items, out.walls, settings), out.walls, settings);
      ctl.setOpenAll(false);
      ctl.camP.position.set(cx + 3.6, 2.3, cz + 4.6); ctl.controls.target.set(cx, 0.95, cz); ctl.controls.update();
      clearInterval(timer); setProgress(100);
      setTimeout(() => setLoaded(true), 350);
    });
    const ro = new ResizeObserver(() => ctl.resize()); ro.observe(canvas.parentElement!);

    landingApi.cinematic = (onSwap) => {
      const flash = document.getElementById('white-flash');
      ctl.setAutoRotate(false); ctl.controls.enabled = false;
      const targets = mobileRef.current ? [navRef.current, heroRef.current, featRef.current].filter(Boolean) : [overlayRef.current];
      const tl = gsap.timeline();
      tl.to(targets, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0);
      tl.to(ctl.camP.position, { x: cx + 0.2, y: 1.0, z: 0.8, duration: 1.5, ease: 'power3.inOut' }, 0.3);
      tl.to(ctl.controls.target, { x: cx, y: 1.0, z: 0.1, duration: 1.5, ease: 'power3.inOut' }, 0.3);
      tl.to(ctl.camP, { fov: 120, duration: 0.8, ease: 'power2.in', onUpdate: () => ctl.camP.updateProjectionMatrix() }, 1.0);
      if (flash) tl.to(flash, { opacity: 1, duration: 0.4, ease: 'power2.in' }, 1.4);
      tl.call(() => onSwap(), [], 1.8);
      if (flash) tl.to(flash, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 1.8);
    };
    return () => { landingApi.cinematic = null; ro.disconnect(); ctl.dispose(); ctlRef.current = null; };
  }, []);
  useEffect(() => { ctlRef.current?.setBackground(theme, DEFAULT_SETTINGS.appearance.canvasColor); }, [theme]);
  // Mobile: preview hanya menangkap sentuhan setelah diketuk (agar scroll halaman tidak terbajak)
  useEffect(() => { const c = ctlRef.current; if (c) c.controls.enabled = !mobile || interactive; }, [mobile, interactive, loaded]);
  useEffect(() => { ctlRef.current?.resize(); }, [mobile]);

  const onCta = () => {
    if (localStorage.getItem('intero_isLoggedIn') === 'true') window.dispatchEvent(new Event('intero:startEditor'));
    else window.dispatchEvent(new Event('intero:openAuth'));
  };
  const features = [
    { icon: <Zap size={15} />, t: 'Parametric 3D Real-time' }, { icon: <Wifi size={15} />, t: 'Offline-first PWA' },
    { icon: <Download size={15} />, t: 'Export ke SketchUp/OBJ' }, { icon: <Link2 size={15} />, t: 'Share File .intero' },
  ];
  return (
    <div className="relative h-full w-full" style={{ background: 'var(--bg-main)', overflowX: 'hidden', overflowY: mobile ? 'auto' : 'hidden', display: mobile ? 'flex' : undefined, flexDirection: mobile ? 'column' : undefined }}>
      <div style={mobile ? { order: 3, position: 'relative', height: 300, margin: '4px 16px 0', borderRadius: 20, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)', background: 'var(--bg-canvas)' } : { position: 'absolute', inset: 0 }}>
        <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: mobile && !interactive ? 'pan-y' : 'none' }} />
        {mobile && !interactive && <button className="absolute inset-0 flex items-end justify-center pb-3" style={{ background: 'transparent', border: 0 }} onClick={() => setInteractive(true)} aria-label="Aktifkan interaksi 3D"><span className="pill panel" style={{ fontSize: 12 }}><MousePointerClick size={14} />Ketuk untuk memutar</span></button>}
        {mobile && interactive && <button className="btn btn-secondary btn-sm absolute" style={{ top: 10, right: 10 }} onClick={() => setInteractive(false)}>Selesai</button>}
      </div>
      <div ref={overlayRef} style={mobile ? { display: 'contents' } : { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        {!mobile && <div className="absolute inset-0 landing-gradient" />}
        <nav ref={navRef} className={mobile ? 'glass flex items-center justify-between px-3 h-14 pointer-events-auto' : 'relative m-4 sm:m-6 glass flex items-center justify-between px-4 sm:px-6 h-16 pointer-events-auto'} style={mobile ? { order: 1, margin: 12, borderRadius: 16, flexShrink: 0 } : { borderRadius: 18 }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-primary)', color: '#fff', boxShadow: '0 6px 16px rgba(27,157,107,0.35)' }}><Box size={20} /></span>
            <span className="font-extrabold text-[17px] tracking-tight truncate" style={{ fontFamily: 'var(--font-heading)' }}>{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn btn-secondary btn-sm" onClick={() => window.dispatchEvent(new Event('intero:openAuth'))}>{mobile ? 'Masuk' : 'Masuk / Daftar'}</button>
            <button className="icon-btn" aria-label="Ganti tema" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          </div>
        </nav>
        <div ref={heroRef} className={mobile ? 'flex flex-col items-center text-center gap-3 px-5 py-4' : 'relative flex-1 flex flex-col items-center justify-center text-center px-6 gap-5 pointer-events-none'} style={mobile ? { order: 2, background: 'var(--bg-main)' } : { paddingBottom: 60 }}>
          <span className="pill glass glass-sm float-anim rise" style={{ animationDelay: '0.05s', fontSize: mobile ? 12 : 13, padding: mobile ? '6px 12px' : undefined }}><span className="w-2 h-2 rounded-full" style={{ background: 'var(--brand-primary)' }} />Platform Desain Kitchen Set #1 di Indonesia</span>
          <h1 className="hero-title rise" style={{ animationDelay: '0.15s', ...(mobile ? { fontSize: 'clamp(28px, 7.4vw, 42px)', lineHeight: 1.18 } : {}) }}>Desain Kitchen Set Impianmu<br /><span className="hero-accent">dalam Hitungan Menit</span></h1>
          <p className="rise" style={{ maxWidth: 560, fontSize: mobile ? 15 : 17, color: 'var(--text-secondary)', animationDelay: '0.25s', background: mobile ? 'var(--bg-main)' : undefined }}>Alternatif SketchUp gratis, berbasis web, bisa offline, hasil akurat untuk tukang & produksi.</p>
          <button className={`btn btn-primary btn-lg rise pointer-events-auto ${mobile ? 'w-full' : ''}`} style={{ animationDelay: '0.35s' }} onClick={onCta}><Zap size={18} />Mulai Berkreasi<ArrowRight size={18} /></button>
          {!mobile && <span className="flex items-center gap-2 text-[12px] rise" style={{ color: 'var(--text-tertiary)', animationDelay: '0.45s' }}><MousePointerClick size={14} />Klik dan geser untuk melihat preview 3D</span>}
        </div>
        <div ref={featRef} className={mobile ? 'grid grid-cols-1 min-[480px]:grid-cols-2 gap-2 px-4 pt-4 pb-2' : 'relative flex flex-wrap items-center justify-center gap-2 px-4 pb-6 sm:pb-8 pointer-events-auto'} style={mobile ? { order: 4 } : undefined}>
          {mobile && <div className="col-span-full text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Fitur utama</div>}
          {features.map((f, i) => <span key={i} className={`pill rise ${mobile ? 'panel' : 'glass glass-sm'}`} style={{ animationDelay: `${0.5 + i * 0.08}s`, ...(mobile ? { width: '100%', justifyContent: 'flex-start', borderRadius: 14, padding: '12px 14px' } : {}) }}><span style={{ color: 'var(--brand-primary)' }}>{f.icon}</span>{f.t}</span>)}
        </div>
        {mobile && <footer style={{ order: 5, padding: '14px 16px 24px', textAlign: 'center', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{APP_NAME} · desain 3D di browser · tanpa server · data tersimpan di perangkat Anda</footer>}
      </div>
      {!loaded && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 transition-opacity duration-500" style={{ background: 'var(--bg-main)', opacity: progress >= 100 ? 0 : 1, pointerEvents: progress >= 100 ? 'none' : 'auto' }}>
          <span className="w-16 h-16 rounded-2xl flex items-center justify-center float-anim" style={{ background: 'var(--brand-primary)', color: '#fff', boxShadow: '0 12px 32px rgba(27,157,107,0.35)' }}><Box size={32} /></span>
          <div className="w-56 progress"><div style={{ width: `${progress}%` }} /></div>
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Memuat {APP_NAME}…</span>
        </div>
      )}
    </div>
  );
}
