// 3D Intero — Renderer 3D rangka hollow: per-blok, explode per-blok, hide per-blok/pintu,
// label (blok/perpintu/detail) + ukuran tulisan, warna per profil, sorotan blok terpilih.
import * as THREE from 'three';
import type { FrameMaterialId } from '../types';
import { FRAME_MATERIALS, type FrameBlock, type FrameRole, type FrameResult } from './frame';
import { makeLabel } from '../generators/common';

export interface FrameViewOpts {
  material: FrameMaterialId;
  explode: number;             // jarak explode per-blok (mm)
  labels: boolean;
  labelMode: 'block' | 'doors' | 'detail';
  labelScale: number;          // pengali ukuran tulisan (1 = default)
  welds: boolean;
  acp: 'none' | 'transparent' | 'solid';
  doorColor: string;
  colorBy?: 'material' | 'profile';
  highlight?: string[];        // id blok yang disorot
  hideBlocks?: string[];       // id blok yang disembunyikan
  hideDoors?: boolean;         // sembunyikan rangka pintu
}

/** Warna peran saat mode "warna per profil". */
export const ROLE_COLORS: Record<FrameRole, string> = {
  post: '#3B82F6', railTop: '#F59E0B', railBottom: '#F59E0B', midpost: '#A78BFA',
  crossTop: '#A78BFA', crossBottom: '#A78BFA', shelf: '#14B8A6', doorV: '#EC4899', doorH: '#EC4899',
};
export const ROLE_LEGEND: { label: string; color: string }[] = [
  { label: 'Tiang sudut 1.5×3', color: ROLE_COLORS.post },
  { label: 'Rel atas / bawah', color: ROLE_COLORS.railTop },
  { label: 'Sekat / melintang 1.5×1.5', color: ROLE_COLORS.midpost },
  { label: 'Support rak 1.5×1.5', color: ROLE_COLORS.shelf },
  { label: 'Rangka pintu 2×4', color: ROLE_COLORS.doorV },
];

function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const sp = c as THREE.Sprite;
    if (sp.isSprite) { sp.material.map?.dispose(); sp.material.dispose(); }
  });
}

const cm = (mm: number) => `${Math.round(mm / 10)} cm`;

/** Group berisi seluruh blok rangka (koordinat dunia, satuan mm — pasangkan dengan root ber-skala 0.001). */
export function buildFrameGroup(res: FrameResult, opts: FrameViewOpts, skins: { itemId: string; center: [number, number, number]; size: [number, number, number]; color: string; rotationY: number }[]): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const fm = FRAME_MATERIALS[opts.material];
  const byProfile = opts.colorBy === 'profile';
  const hl = new Set(opts.highlight ?? []);
  const focus = hl.size > 0;
  const hideBlocks = new Set(opts.hideBlocks ?? []);
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const matFor = (role: FrameRole, on: boolean, dim: boolean) => {
    const key = `${byProfile ? role : 'base'}|${on}|${dim}`;
    let m = mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: byProfile ? new THREE.Color(ROLE_COLORS[role]) : fm.color,
        metalness: byProfile ? 0.45 : fm.metalness, roughness: byProfile ? 0.5 : fm.roughness, envMapIntensity: fm.env,
        transparent: dim, opacity: dim ? 0.28 : 1, depthWrite: !dim,
      });
      if (on) { m.emissive = new THREE.Color(0x1B9D6B); m.emissiveIntensity = 0.45; }
      mats.set(key, m);
    }
    return m;
  };
  const edge = new THREE.LineBasicMaterial({ color: 0x2b2f36, transparent: true, opacity: 0.35 });
  const weldMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.9, roughness: 0.3 });
  const geos = new Map<string, THREE.BoxGeometry>();
  const geo = (x: number, y: number, z: number) => {
    const k = `${x}|${y}|${z}`; let g = geos.get(k);
    if (!g) { g = new THREE.BoxGeometry(x, y, z); geos.set(k, g); }
    return g;
  };
  const edgeGeos: THREE.EdgesGeometry[] = [];
  const labelMats: THREE.SpriteMaterial[] = [];
  const skinMats: THREE.Material[] = [];
  const labelColor = fm.alu ? '#0F6B46' : '#0F172A';
  const addLabel = (bg: THREE.Group, text: string, pos: THREE.Vector3) => {
    const sp = makeLabel(text, labelColor);
    sp.scale.set(220 * opts.labelScale, 55 * opts.labelScale, 1);
    sp.position.copy(pos);
    labelMats.push(sp.material as THREE.SpriteMaterial);
    bg.add(sp);
  };

  // Explode PER-BLOK: geser seluruh blok menjauh dari centroid (radial di bidang XZ).
  const centers = res.blocks.map((b) => {
    const a = (b.angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const lx = b.L / 2, lz = b.depth / 2;
    return new THREE.Vector3(b.origin.x + lx * c + lz * s, b.y0 + b.height / 2, b.origin.z - lx * s + lz * c);
  });
  let centroid = new THREE.Vector3();
  for (const c of centers) centroid.add(c);
  if (centers.length) centroid.multiplyScalar(1 / centers.length);

  res.blocks.forEach((b, bi) => {
    if (hideBlocks.has(b.id)) return;
    const bg = new THREE.Group();
    let origin = new THREE.Vector3(b.origin.x, b.origin.y, b.origin.z);
    if (opts.explode > 0) {
      const dir = centers[bi].clone().sub(centroid); dir.y = 0;
      if (dir.lengthSq() > 1) dir.normalize(); else dir.set(0, 0, 1);
      origin = origin.add(dir.multiplyScalar(opts.explode));
    }
    bg.position.copy(origin);
    bg.rotation.y = (b.angle * Math.PI) / 180;
    const cx = b.L / 2, cy = b.y0 + b.height / 2, cz = b.depth / 2;
    const on = hl.has(b.id), dim = focus && !on;
    const mems = res.members.filter((m) => m.blockId === b.id && !(opts.hideDoors && (m.role === 'doorV' || m.role === 'doorH')));
    for (const m of mems) {
      const g = geo(m.d.x, m.d.y, m.d.z);
      const mesh = new THREE.Mesh(g, matFor(m.role, on, dim));
      mesh.position.set(m.c.x, m.c.y, m.c.z);
      if (!dim) { const eg = new THREE.EdgesGeometry(g); edgeGeos.push(eg); mesh.add(new THREE.LineSegments(eg, edge)); }
      mesh.userData.member = m.id;
      bg.add(mesh);
      if (opts.labels && opts.labelMode === 'detail' && m.len >= 300 && !dim) {
        addLabel(bg, cm(m.len), new THREE.Vector3(m.c.x, m.c.y + m.d.y / 2 + 55, m.c.z));
      }
    }
    if (opts.labels && !dim) {
      if (opts.labelMode === 'block') {
        addLabel(bg, `${cm(b.L)} × ${cm(b.depth)} × ${cm(b.height)}`, new THREE.Vector3(cx, cy + b.height / 2 + 135, cz));
      } else if (opts.labelMode === 'doors') {
        b.doors.forEach((dr, di) => {
          const staggerY = (di % 2 === 1 && b.doors.length > 1) ? 38 : 0;
          addLabel(bg, `${cm(dr.w)} × ${cm(dr.h)}`, new THREE.Vector3(dr.x, b.y0 + dr.y + staggerY, b.depth + 70));
        });
      }
    }
    if (opts.welds && !fm.alu && !dim) {
      for (const j of res.joints) {
        if (j.blockId !== b.id) continue;
        const s = new THREE.Mesh(new THREE.SphereGeometry(14, 8, 8), weldMat);
        s.position.set(j.x, j.y, j.z);
        bg.add(s);
      }
    }
    group.add(bg);
  });

  if (opts.acp !== 'none') {
    const opacity = opts.acp === 'transparent' ? (focus ? 0.1 : 0.18) : 1;
    for (const sk of skins) {
      const g = new THREE.Group();
      g.position.set(sk.center[0], sk.center[1], sk.center[2]);
      g.rotation.y = (sk.rotationY * Math.PI) / 180;
      const sm = new THREE.MeshStandardMaterial({ color: new THREE.Color(sk.color), roughness: 0.45, metalness: 0.05, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
      skinMats.push(sm);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sk.size[0], sk.size[1], sk.size[2]), sm);
      g.add(mesh);
      group.add(g);
    }
  }
  return {
    group,
    dispose: () => {
      disposeTree(group); mats.forEach((m) => m.dispose()); geos.forEach((g) => g.dispose());
      edgeGeos.forEach((g) => g.dispose()); edge.dispose(); weldMat.dispose();
      labelMats.forEach((m) => m.dispose()); skinMats.forEach((m) => m.dispose());
    },
  };
}

export function blockLabel(b: FrameBlock): string { return `${b.label} · ${cm(b.L)} × ${cm(b.depth)} × ${cm(b.height)}`; }
