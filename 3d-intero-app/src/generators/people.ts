// 3D Intero — Orang prosedural beranimasi (memasak, mencuci, berjalan). Unit mm.
import * as THREE from 'three';
import { type MatCache, box, cyl, group, mesh, sphere } from './common';

export type PersonActivity = 'stir' | 'wash' | 'walk';

interface Joints {
  root: THREE.Group; torso: THREE.Group;
  hipL: THREE.Group; hipR: THREE.Group; kneeL: THREE.Group; kneeR: THREE.Group;
  shL: THREE.Group; shR: THREE.Group; elbL: THREE.Group; elbR: THREE.Group;
  head: THREE.Group;
}
export interface Person { group: THREE.Group; update: (t: number) => void }

export interface PersonStyle { shirt: string; pants: string; skin: string; hair: string; apron?: boolean }

function limb(cache: MatCache, r1: number, r2: number, len: number, color: string, rough = 0.7): THREE.Mesh {
  const m = mesh(new THREE.CylinderGeometry(r2, r1, len, 12), cache.get(color, { roughness: rough }));
  m.position.y = -len / 2;
  return m;
}

/** Manusia ~1700mm. Origin di lantai, menghadap +z lokal. */
export function buildPerson(cache: MatCache, style: PersonStyle, activity: PersonActivity): { joints: Joints; group: THREE.Group } {
  const root = group();
  const body = group(0, 0, 0); root.add(body);
  // Kaki: pivot pinggul di y=950
  const mkLeg = (sx: number) => {
    const hip = group(sx * 95, 950, 0); body.add(hip);
    hip.add(limb(cache, 75, 65, 420, style.pants));
    const knee = group(0, -420, 0); hip.add(knee);
    knee.add(limb(cache, 60, 50, 400, style.pants));
    const shoe = box(110, 80, 240, cache.get('#2B2F36', { roughness: 0.6 }), 0, -440, 50); knee.add(shoe);
    return { hip, knee };
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  // Torso lebih anatomis
  const torso = group(0, 950, 0); body.add(torso);
  const shirt = cache.get(style.shirt, { roughness: 0.72 });
  const skin = cache.get(style.skin, { roughness: 0.5 });
  torso.add(box(340, 500, 200, shirt, 0, 250, 0));
  torso.add(box(300, 80, 180, shirt, 0, 520, 8)); // bahu
  torso.add(box(320, 110, 185, cache.get(style.pants, { roughness: 0.7 }), 0, 20, 0));
  if (style.apron) {
    torso.add(box(270, 400, 16, cache.get('#F3F1EC', { roughness: 0.82 }), 0, 200, 110));
    torso.add(box(270, 240, 16, cache.get('#F3F1EC', { roughness: 0.82 }), 0, -240, 96));
  }
  // Lengan
  const mkArm = (sx: number) => {
    const sh = group(sx * 210, 450, 0); torso.add(sh);
    sh.add(sphere(62, shirt, 0, 0, 0, 14));
    sh.add(limb(cache, 55, 48, 290, style.shirt));
    const elb = group(0, -290, 0); sh.add(elb);
    elb.add(limb(cache, 46, 38, 260, style.skin, 0.5));
    const hand = sphere(42, skin, 0, -275, 8, 12); hand.scale.set(1, 0.7, 1.15); elb.add(hand);
    return { sh, elb };
  };
  const armL = mkArm(-1), armR = mkArm(1);
  // Kepala + leher + wajah
  const head = group(0, 560, 0); torso.add(head);
  head.add(cyl(55, 62, 70, skin, 0, 35, 0, 14)); // leher
  const skull = sphere(118, skin, 0, 175, 6, 22); skull.scale.set(0.92, 1.08, 1); head.add(skull);
  // telinga
  head.add(sphere(22, skin, -95, 170, 0, 10));
  head.add(sphere(22, skin, 95, 170, 0, 10));
  // mata
  const eyeW = cache.get('#F8F8F8', { roughness: 0.3 });
  const iris = cache.get('#3A2A1A', { roughness: 0.4 });
  head.add(sphere(14, eyeW, -32, 185, 95, 10));
  head.add(sphere(14, eyeW, 32, 185, 95, 10));
  head.add(sphere(7, iris, -32, 185, 106, 8));
  head.add(sphere(7, iris, 32, 185, 106, 8));
  const hair = sphere(124, cache.get(style.hair, { roughness: 0.88 }), 0, 210, -18, 20);
  hair.scale.set(1.02, 0.78, 1.05); head.add(hair);
  head.add(box(130, 40, 28, cache.get(style.hair, { roughness: 0.88 }), 0, 285, 18));
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  root.userData.isPerson = true;
  const joints: Joints = { root, torso, hipL: legL.hip, hipR: legR.hip, kneeL: legL.knee, kneeR: legR.knee, shL: armL.sh, shR: armR.sh, elbL: armL.elb, elbR: armR.elb, head };
  void activity;
  return { joints, group: root };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Orang mengaduk masakan di kompor: hadap -z lokal target (diputar pemanggil). */
export function animateStir(j: Joints, phase = 0): (t: number) => void {
  return (t: number) => {
    const s = t * 3.1 + phase;
    j.shR.rotation.x = -1.05 + Math.sin(s) * 0.26;
    j.shR.rotation.z = -0.25 + Math.cos(s) * 0.26;
    j.elbR.rotation.x = -0.55 + Math.sin(s * 1.0 + 0.6) * 0.12;
    j.shL.rotation.x = -0.15 + Math.sin(t * 1.4 + phase) * 0.06;
    j.elbL.rotation.x = -0.25;
    j.torso.rotation.x = 0.14 + Math.sin(s) * 0.02;
    j.root.position.y = Math.abs(Math.sin(s)) * 9;
    j.head.rotation.x = 0.18;
    j.head.rotation.y = Math.sin(t * 0.7 + phase) * 0.12;
    j.hipL.rotation.x = 0.03; j.hipR.rotation.x = -0.03;
  };
}

/** Orang mencuci di sink: kedua lengan bergerak bergantian. */
export function animateWash(j: Joints, phase = 0): (t: number) => void {
  return (t: number) => {
    const s = t * 2.6 + phase;
    j.shL.rotation.x = -0.95 + Math.sin(s) * 0.3;
    j.shR.rotation.x = -0.95 + Math.sin(s + Math.PI) * 0.3;
    j.elbL.rotation.x = -0.5 + Math.sin(s + 0.5) * 0.15;
    j.elbR.rotation.x = -0.5 + Math.sin(s + Math.PI + 0.5) * 0.15;
    j.torso.rotation.x = 0.2 + Math.sin(s * 0.5) * 0.03;
    j.torso.rotation.z = Math.sin(s * 0.5) * 0.03;
    j.root.position.y = Math.abs(Math.sin(s)) * 7;
    j.head.rotation.x = 0.22;
  };
}

/** Orang berjalan mondar-mandir antara a dan b (koordinat lokal root, mm). */
export function animateWalk(j: Joints, a: { x: number; z: number }, b: { x: number; z: number }, speed = 0.22, phase = 0): (t: number) => void {
  const baseRot = Math.atan2(b.x - a.x, b.z - a.z);
  return (t: number) => {
    const tt = t * speed + phase;
    const s = (Math.sin(tt) + 1) / 2;
    const dir = Math.cos(tt) >= 0 ? 1 : -1;
    j.root.position.x = lerp(a.x, b.x, s);
    j.root.position.z = lerp(a.z, b.z, s);
    const targetRot = dir > 0 ? baseRot : baseRot + Math.PI;
    let d = targetRot - j.root.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    j.root.rotation.y += d * 0.08;
    const w = t * 4.6 + phase;
    const amp = 0.5 * Math.min(1, Math.abs(Math.cos(tt)) * 3 + 0.25);
    j.hipL.rotation.x = Math.sin(w) * amp;
    j.hipR.rotation.x = -Math.sin(w) * amp;
    j.kneeL.rotation.x = Math.max(0, -Math.sin(w - 0.5)) * amp * 1.4;
    j.kneeR.rotation.x = Math.max(0, Math.sin(w - 0.5)) * amp * 1.4;
    j.shL.rotation.x = -Math.sin(w) * amp * 0.7;
    j.shR.rotation.x = Math.sin(w) * amp * 0.7;
    j.elbL.rotation.x = -0.3; j.elbR.rotation.x = -0.3;
    j.root.position.y = Math.abs(Math.sin(w)) * 26;
    j.torso.rotation.y = Math.sin(w) * 0.06;
  };
}
