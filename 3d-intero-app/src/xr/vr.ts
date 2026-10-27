/* eslint-disable @typescript-eslint/no-explicit-any */
// 3D Intero — VR (WebXR immersive-vr): teleport, smooth locomotion, grab, buka semua pintu, skala dunia, catatan suara
import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import type { SceneController } from '../three/SceneController';
import { useStore } from '../store';

export interface VrState { active: boolean; message: string; scale: number; recording: boolean; notes: number }
const initial: VrState = { active: false, message: '', scale: 1, recording: false, notes: 0 };
let state: VrState = initial;
const listeners = new Set<() => void>();
const setState = (p: Partial<VrState>) => { state = { ...state, ...p }; listeners.forEach((l) => l()); };
export const useVrState = (): VrState => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state);

let cur: { ctl: SceneController } | null = null;
const Y = new THREE.Vector3(0, 1, 0);

function helpPanel(): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = 768; c.height = 448;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(15,20,25,0.92)'; g.beginPath(); g.roundRect(0, 0, 768, 448, 28); g.fill();
  g.strokeStyle = '#1B9D6B'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#1B9D6B'; g.font = 'bold 40px sans-serif'; g.fillText('3D Intero — Kontrol VR', 36, 66);
  g.fillStyle = '#F0F6FC'; g.font = '30px sans-serif';
  ['Trigger: teleport / putar catatan suara', 'Grip (genggam): ambil & pindahkan kabinet', 'Stick kiri: berjalan  ·  Stick kanan: putar 30°', 'A (kanan): buka/tutup semua pintu', 'B (kanan): rekam catatan suara', 'X / Y (kiri): perbesar / perkecil dunia'].forEach((t, i) => g.fillText(t, 36, 130 + i * 52));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

export async function startVR(ctl: SceneController) {
  if (cur) return;
  const xr = (navigator as any).xr;
  if (!xr) throw new Error('WebXR tidak tersedia di browser ini.');
  const sessionP = xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
  const micP: Promise<MediaStream | null> = navigator.mediaDevices?.getUserMedia ? navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null) : Promise.resolve(null);
  const session = await sessionP;
  const mic = await micP;
  await ctl.beginXR(session, 'vr');
  const rig = ctl.xrRig; const c = ctl.getRoomCenterM();
  rig.position.set(c.x, 0, c.z + 3.2); rig.rotation.y = 0;
  setState({ ...initial, active: true, message: 'Mode VR aktif' });
  useStore.getState().ui({ xrMode: 'vr' });

  const ctrls: THREE.Group[] = []; const inputs: any[] = [null, null];
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -4)]);
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.25, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1B9D6B, side: THREE.DoubleSide }));
  marker.visible = false; ctl.scene.add(marker);
  const markers = new THREE.Group(); ctl.scene.add(markers);
  const notes: { url: string }[] = [];
  const help = helpPanel(); help.position.set(0, 1.5, -1.4); rig.add(help);
  const helpTimer = window.setTimeout(() => { help.visible = false; }, 20000);

  let tele: THREE.Vector3 | null = null;
  let grabbed: { i: number; id: string; group: THREE.Group } | null = null;
  let recorder: MediaRecorder | null = null; let chunks: Blob[] = []; let recordCtrl = 1;
  const o = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Quaternion(); const plane = new THREE.Plane(Y, 0);
  const rayOf = (ctrl: THREE.Group) => { ctrl.getWorldPosition(o); ctrl.getWorldQuaternion(q); d.set(0, 0, -1).applyQuaternion(q); };
  const camPos = () => new THREE.Vector3().setFromMatrixPosition(ctl.renderer.xr.getCamera().matrixWorld);

  const setScale = (k: number) => {
    const nk = Math.min(8, Math.max(0.15, k)); const cp = camPos();
    const ratio = nk / rig.scale.x;
    rig.position.copy(cp).add(rig.position.clone().sub(cp).multiplyScalar(ratio));
    rig.scale.setScalar(nk); setState({ scale: Math.round(nk * 100) / 100 });
  };
  const toggleRecord = () => {
    if (!mic) { setState({ message: 'Mikrofon tidak tersedia — catatan suara nonaktif' }); return; }
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    chunks = []; recorder = new MediaRecorder(mic);
    const rc = ctrls[recordCtrl] ?? ctrls[0];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' }); const url = URL.createObjectURL(blob);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0xF59E0B }));
      rc.getWorldPosition(m.position); m.userData.url = url; markers.add(m); notes.push({ url });
      setState({ recording: false, notes: notes.length, message: 'Catatan suara disimpan (bola oranye). Trigger pada bola untuk memutar.' });
    };
    recorder.start(); setState({ recording: true, message: 'Merekam… tekan B lagi untuk berhenti' });
  };
  const onSelect = (i: number) => {
    const ctrl = ctrls[i]; rayOf(ctrl);
    const hits = new THREE.Raycaster(o.clone(), d.clone().normalize(), 0, 6).intersectObjects(markers.children, false);
    if (hits.length) { void new Audio(hits[0].object.userData.url as string).play(); return; }
    if (tele && !grabbed) { const cp = camPos(); rig.position.x += tele.x - cp.x; rig.position.z += tele.z - cp.z; }
  };
  const onGrab = (i: number) => {
    if (useStore.getState().shareMode === 'view') { setState({ message: 'Mode lihat saja — tidak bisa memindahkan' }); return; }
    rayOf(ctrls[i]); const hit = ctl.pickWithRay(o.clone(), d.clone());
    if (hit) { ctrls[i].attach(hit.group); grabbed = { i, id: hit.id, group: hit.group }; }
  };
  const onRelease = (i: number) => {
    if (!grabbed || grabbed.i !== i) return;
    const { group, id } = grabbed; grabbed = null;
    ctl.root.attach(group); group.rotation.x = 0; group.rotation.z = 0; group.scale.set(1, 1, 1);
    ctl.commitTransform(id, { x: group.position.x, y: Math.max(0, group.position.y), z: group.position.z }, THREE.MathUtils.radToDeg(group.rotation.y));
  };
  for (let i = 0; i < 2; i++) {
    const ctrl = ctl.renderer.xr.getController(i);
    rig.add(ctrl); ctrls.push(ctrl);
    ctrl.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x1B9D6B })));
    ctrl.addEventListener('connected', (e: any) => { inputs[i] = e.data; if (e.data?.handedness === 'right') recordCtrl = i; });
    ctrl.addEventListener('disconnected', () => { inputs[i] = null; });
    ctrl.addEventListener('selectstart', () => onSelect(i));
    ctrl.addEventListener('squeezestart', () => onGrab(i));
    ctrl.addEventListener('squeezeend', () => onRelease(i));
  }

  let lastT = 0, turnCool = 0; const prev: Record<string, boolean> = {};
  const edge = (key: string, pressed: boolean) => { const was = prev[key]; prev[key] = pressed; return pressed && !was; };
  const off = ctl.addXRHook((t) => {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016; lastT = t; turnCool -= dt;
    let show = false; tele = null;
    for (const ctrl of ctrls) {
      rayOf(ctrl);
      const hit = new THREE.Vector3();
      if (d.y < -0.05 && new THREE.Ray(o, d).intersectPlane(plane, hit) && hit.distanceTo(o) < 14) { marker.position.set(hit.x, 0.01, hit.z); tele = hit; show = true; break; }
    }
    marker.visible = show && !grabbed;
    const cam = ctl.renderer.xr.getCamera();
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, Y).normalize();
    for (let i = 0; i < 2; i++) {
      const inp = inputs[i]; const gp = inp?.gamepad; if (!gp) continue;
      const ax: number[] = gp.axes; const x = ax.length >= 4 ? ax[2] : ax[0], yv = ax.length >= 4 ? ax[3] : ax[1];
      if (inp.handedness === 'left') {
        if (Math.hypot(x, yv) > 0.15) rig.position.addScaledVector(fwd, -yv * 1.8 * rig.scale.x * dt).addScaledVector(right, x * 1.8 * rig.scale.x * dt);
        if (edge('lx', !!gp.buttons[4]?.pressed)) setScale(rig.scale.x * 1.4);
        if (edge('ly', !!gp.buttons[5]?.pressed)) setScale(rig.scale.x / 1.4);
      } else if (inp.handedness === 'right') {
        if (Math.abs(x) > 0.7 && turnCool <= 0) {
          const a = -Math.sign(x) * (Math.PI / 6); const cp = camPos();
          rig.position.sub(cp).applyAxisAngle(Y, a).add(cp); rig.rotation.y += a; turnCool = 0.3;
        }
        if (edge('ra', !!gp.buttons[4]?.pressed)) { const st = useStore.getState(); st.setOpenMode(!st.openIds.length); setState({ message: st.openIds.length ? 'Menutup semua pintu' : 'Membuka semua pintu' }); }
        if (edge('rb', !!gp.buttons[5]?.pressed)) toggleRecord();
      }
    }
  });
  cur = { ctl };
  const offEnd = ctl.addXREnd(() => {
    off(); offEnd(); window.clearTimeout(helpTimer);
    if (recorder && recorder.state === 'recording') recorder.stop();
    mic?.getTracks().forEach((tk) => tk.stop());
    for (const ctrl of ctrls) rig.remove(ctrl);
    rig.remove(help); ctl.scene.remove(marker, markers);
    for (const n of notes) URL.revokeObjectURL(n.url);
    cur = null; setState(initial); useStore.getState().ui({ xrMode: 'none' });
  });
}

export function stopVR() { cur?.ctl.endXRSession(); }
