/* eslint-disable @typescript-eslint/no-explicit-any */
// 3D Intero — AR (WebXR): hit-test + free placement 1:1, kalibrasi 2 titik, gestur, estimasi cahaya, bayangan
import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import type { SceneController } from '../three/SceneController';
import type { V3 } from '../types';
import { toast } from '../components/ui';
import { requestArSession, noticeForTier, type ArTier } from './ar-session';
import { useStore } from '../store';
import { downloadDataUrl } from '../lib/utils';

export type ArMode = 'free' | 'twopoint';
export type ArPhase = 'idle' | 'scanning' | 'ready' | 'placed' | 'calib-a' | 'calib-b' | 'calibrated';
export interface ArState {
  tier: ArTier;
  active: boolean; mode: ArMode; phase: ArPhase; message: string; scaleLocked: boolean; scale: number;
  shadows: boolean; lightEstimation: boolean; liveDistance: number | null; accuracy: number | null;
}
const initial: ArState = { active: false, mode: 'free', phase: 'idle', message: '', scaleLocked: true, scale: 1, shadows: true, lightEstimation: true, liveDistance: null, accuracy: null, tier: 'full' };
let state: ArState = { ...initial, tier: 'full' };
const listeners = new Set<() => void>();
const setState = (p: Partial<ArState>) => { state = { ...state, ...p }; listeners.forEach((l) => l()); };
export const useArState = (): ArState => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state);

interface Cur { ctl: SceneController; shadowPlane: THREE.Mesh; reset: () => void; pendingShot: boolean; isPlaced: () => boolean }
let cur: Cur | null = null;
const S = 0.001;
const Y = new THREE.Vector3(0, 1, 0);

export async function startAR(ctl: SceneController, mode: ArMode, pins: { a: V3; b: V3 } | null) {
  if (cur) return;
  // Fallback bertingkat: full → hit-test → basic (mencegah 'session configuration is not supported')
  const { session, tier } = await requestArSession();
  const notice = noticeForTier(tier);
  if (notice) toast(notice, tier === 'basic' ? 'warning' : 'info');
  await ctl.beginXR(session, 'ar');

  // Reticle + bidang bayangan
  const reticle = new THREE.Group();
  reticle.add(new THREE.Mesh(new THREE.RingGeometry(0.13, 0.17, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1B9D6B, side: THREE.DoubleSide })));
  reticle.add(new THREE.Mesh(new THREE.CircleGeometry(0.02, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  reticle.matrixAutoUpdate = false; reticle.visible = false; ctl.scene.add(reticle);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.38 }));
  shadowPlane.receiveShadow = true; shadowPlane.visible = false; ctl.scene.add(shadowPlane);
  const marks = new THREE.Group(); ctl.scene.add(marks);
  ctl.root.visible = false;

  let placed = false, hasHit = false;
  let arTier: ArTier = tier;
  const hitPos = new THREE.Vector3();
  let hitSource: any = null, lightProbe: any = null;
  let ptA: THREE.Vector3 | null = null;
  let lastDist = -1;

  setState({ ...initial, active: true, mode, phase: 'scanning', tier: arTier, message: arTier === 'basic' ? 'Mode dasar: ketuk layar untuk menempatkan kitchen set di depan Anda.' : 'Arahkan kamera ke lantai, gerakkan HP perlahan untuk scan permukaan.' });
  useStore.getState().ui({ xrMode: 'ar' });

  if (session.requestHitTestSource) session.requestReferenceSpace('viewer').then((vs: any) => session.requestHitTestSource({ space: vs })).then((src: any) => { hitSource = src; }).catch(() => { if (arTier !== 'basic') toast('Hit-test tidak didukung — memakai mode dasar', 'warning'); arTier = 'basic'; });
  else arTier = 'basic';
  if (session.requestLightProbe) session.requestLightProbe().then((p: any) => { lightProbe = p; }).catch(() => { /* opsional */ });

  const dropMarker = (p: THREE.Vector3, color: number) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 16).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color }));
    m.position.copy(p).add(new THREE.Vector3(0, 0.06, 0)); marks.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    ring.position.copy(p).add(new THREE.Vector3(0, 0.005, 0)); marks.add(ring);
  };
  const place = () => {
    const c = ctl.getRoomCenterM();
    const fwd = new THREE.Vector3(); ctl.renderer.xr.getCamera().getWorldDirection(fwd); fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1); fwd.normalize();
    const phi = Math.atan2(-fwd.x, -fwd.z);
    ctl.root.rotation.y = phi;
    const off = new THREE.Vector3(c.x, 0, c.z).applyAxisAngle(Y, phi);
    ctl.root.position.set(hitPos.x - off.x, hitPos.y, hitPos.z - off.z);
    ctl.root.visible = true; shadowPlane.position.y = hitPos.y; shadowPlane.visible = state.shadows; placed = true;
    setState({ phase: 'placed', message: 'Terpasang skala 1:1. Seret 1 jari untuk geser, putar 2 jari untuk rotasi, ketuk 2× untuk reset.' });
  };
  const calibrate = (ptB: THREE.Vector3) => {
    if (!pins || !ptA) return;
    const dv = new THREE.Vector3((pins.b.x - pins.a.x) * S, 0, (pins.b.z - pins.a.z) * S);
    const av = new THREE.Vector3(ptB.x - ptA.x, 0, ptB.z - ptA.z);
    const dl = dv.length(), al = av.length();
    if (dl < 0.05 || al < 0.05) { toast('Jarak titik terlalu dekat — ulangi kalibrasi', 'error'); reset(); return; }
    const ang = (v: THREE.Vector3) => Math.atan2(-v.z, v.x);
    const phi = ang(av) - ang(dv);
    ctl.root.rotation.y = phi;
    const dA = new THREE.Vector3(pins.a.x * S, 0, pins.a.z * S).applyAxisAngle(Y, phi);
    ctl.root.position.set(ptA.x - dA.x, ptA.y - pins.a.y * S, ptA.z - dA.z);
    ctl.root.visible = true; shadowPlane.position.y = ptA.y; shadowPlane.visible = state.shadows; placed = true;
    const ratio = al / dl, acc = Math.max(1, Math.round(Math.abs(al - dl) * 100));
    if (Math.abs(ratio - 1) > 0.05) toast(`Dimensi tidak match (selisih ${Math.abs((ratio - 1) * 100).toFixed(1)}%) — cek ukuran ruangan`, 'warning');
    else toast(`Kalibrasi berhasil! Akurasi: ±${acc}cm`, 'success');
    setState({ phase: 'calibrated', accuracy: acc, liveDistance: null, message: `Terkalibrasi (jarak desain ${(dl * 100).toFixed(0)} cm, jarak nyata ${(al * 100).toFixed(0)} cm). Jalan mengelilingi ruangan — furnitur tetap di posisi nyata.` });
  };
  const reset = () => {
    placed = false; ptA = null; ctl.root.visible = false; shadowPlane.visible = false;
    for (const c of [...marks.children]) marks.remove(c);
    ctl.root.scale.setScalar(S);
    setState({ scale: 1, accuracy: null, liveDistance: null, phase: mode === 'twopoint' ? 'calib-a' : 'ready', message: mode === 'twopoint' ? 'Sentuh titik yang sesuai dengan "Titik A" di dinding/lantai nyata.' : 'Ketuk layar untuk menempatkan kitchen set.' });
  };
  const onTap = () => {
    if (!hasHit) { toast('Belum ada permukaan terdeteksi — gerakkan HP perlahan', 'warning'); return; }
    if (mode === 'free') { if (!placed) place(); return; }
    if (state.phase === 'calib-a') { ptA = hitPos.clone(); dropMarker(ptA, 0x1B9D6B); setState({ phase: 'calib-b', liveDistance: 0, message: 'Sekarang sentuh titik yang sesuai dengan "Titik B".' }); }
    else if (state.phase === 'calib-b' && ptA) { const b = hitPos.clone(); dropMarker(b, 0x2563EB); calibrate(b); }
  };

  const off = ctl.addXRHook((_t, frame) => {
    const rs = ctl.renderer.xr.getReferenceSpace();
    if (hitSource && rs) {
      const res = frame.getHitTestResults(hitSource);
      const pose = res.length ? res[0].getPose(rs) : null;
      if (pose) { reticle.matrix.fromArray(pose.transform.matrix); hitPos.setFromMatrixPosition(reticle.matrix); hasHit = true; } else hasHit = false;
    }
    // Tier basic: tanpa hit-test → titik penempatan 2 m di depan kamera pada lantai
    if (arTier === 'basic') {
      const cam = ctl.renderer.xr.getCamera();
      const p = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y = 0;
      if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
      f.normalize(); hitPos.copy(p).addScaledVector(f, 2); hitPos.y = 0; hasHit = true;
    }
    const ph = state.phase;
    reticle.visible = hasHit && arTier !== 'basic' && (ph === 'scanning' || ph === 'ready' || ph === 'calib-a' || ph === 'calib-b');
    if (hasHit && ph === 'scanning') setState(mode === 'free' ? { phase: 'ready', message: 'Permukaan terdeteksi. Ketuk layar untuk menempatkan kitchen set.' } : { phase: 'calib-a', message: 'Sentuh titik yang sesuai dengan "Titik A" di dinding/lantai nyata.' });
    if (ph === 'calib-b' && ptA && hasHit) { const d = Math.round(hitPos.distanceTo(ptA) * 100) / 100; if (d !== lastDist) { lastDist = d; setState({ liveDistance: d }); } }
    if (state.lightEstimation && lightProbe && frame.getLightEstimate) {
      const est = frame.getLightEstimate(lightProbe);
      if (est?.primaryLightDirection && est.primaryLightIntensity) {
        const d = est.primaryLightDirection, i = est.primaryLightIntensity;
        ctl.setSunEstimate(new THREE.Vector3(d.x, d.y, d.z), new THREE.Color(Math.min(1, i.x), Math.min(1, i.y), Math.min(1, i.z)), Math.max(i.x, i.y, i.z));
      }
    }
  });
  const offAfter = ctl.addXRAfter(() => {
    if (cur?.pendingShot) {
      cur.pendingShot = false;
      try { downloadDataUrl(`3d-intero-ar-${Date.now()}.png`, ctl.renderer.domElement.toDataURL('image/png')); toast('Screenshot render 3D disimpan (tanpa feed kamera — batasan WebXR).', 'info'); }
      catch { toast('Screenshot tidak didukung di perangkat ini', 'error'); }
    }
  });

  // ─── Gestur sentuh pada lapisan overlay ───
  const layer = document.getElementById('ar-gesture');
  let sx = 0, sy = 0, lx = 0, ly = 0, moved = false, multi = false, a0 = 0, tapTimer: number | null = null;
  const ang = (t: TouchList) => Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX);
  const drag = (dx: number, dy: number) => {
    if (mode !== 'free' || !placed) return;
    const cam = ctl.renderer.xr.getCamera();
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, Y).normalize();
    const camPos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const dist = Math.max(0.8, camPos.distanceTo(ctl.root.position));
    const mpp = (2 * dist * Math.tan(THREE.MathUtils.degToRad(30))) / window.innerHeight;
    ctl.root.position.addScaledVector(right, dx * mpp).addScaledVector(fwd, -dy * mpp);
  };
  const ts = (e: TouchEvent) => { e.preventDefault(); if (e.touches.length === 1) { const t = e.touches[0]; sx = lx = t.clientX; sy = ly = t.clientY; moved = false; multi = false; } else if (e.touches.length === 2) { a0 = ang(e.touches); multi = true; moved = true; } };
  const tm = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && !multi) { const t = e.touches[0]; if (Math.hypot(t.clientX - sx, t.clientY - sy) > 10) moved = true; if (moved) drag(t.clientX - lx, t.clientY - ly); lx = t.clientX; ly = t.clientY; }
    else if (e.touches.length === 2 && mode === 'free' && placed) { const a = ang(e.touches); ctl.root.rotation.y -= a - a0; a0 = a; }
  };
  const te = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 0 && !moved) {
      if (tapTimer) { window.clearTimeout(tapTimer); tapTimer = null; reset(); }
      else tapTimer = window.setTimeout(() => { tapTimer = null; onTap(); }, 300);
    }
  };
  layer?.addEventListener('touchstart', ts, { passive: false }); layer?.addEventListener('touchmove', tm, { passive: false }); layer?.addEventListener('touchend', te, { passive: false });

  cur = { ctl, shadowPlane, reset, pendingShot: false, isPlaced: () => placed };
  const offEnd = ctl.addXREnd(() => {
    off(); offAfter(); offEnd();
    layer?.removeEventListener('touchstart', ts); layer?.removeEventListener('touchmove', tm); layer?.removeEventListener('touchend', te);
    if (tapTimer) window.clearTimeout(tapTimer);
    ctl.scene.remove(reticle, shadowPlane, marks);
    try { hitSource?.cancel(); } catch { /* ignore */ }
    cur = null; setState(initial);
    useStore.getState().ui({ xrMode: 'none' });
  });
}

export function stopAR() { cur?.ctl.endXRSession(); }
export function arReset() { cur?.reset(); }
export function arScreenshot() { if (cur) cur.pendingShot = true; }
export function arToggleShadows() {
  const v = !state.shadows; setState({ shadows: v });
  if (cur) { cur.shadowPlane.visible = v && cur.isPlaced(); cur.ctl.setShadowEnabled(v); }
}
export function arToggleLight() { const v = !state.lightEstimation; setState({ lightEstimation: v }); if (!v) cur?.ctl.resetSun(); }
export function arSetScaleLocked(v: boolean) { setState({ scaleLocked: v }); if (v && cur) { cur.ctl.root.scale.setScalar(S); setState({ scale: 1 }); } }
export function arScale(delta: number) {
  if (state.scaleLocked || !cur) return;
  const s = Math.min(1.5, Math.max(0.5, state.scale + delta));
  cur.ctl.root.scale.setScalar(S * s); setState({ scale: s });
}
