// 3D Intero — Animation Controller: Open Mode per-item atau serentak dengan stagger cascade (GSAP)
import gsap from 'gsap';
import * as THREE from 'three';
import type { Animatable } from '../generators/common';

export class AnimationController {
  private entries = new Map<string, Animatable[]>();
  private openSet = new Set<string>();
  private groups = new Map<string, THREE.Object3D>();

  get openCount() { return this.openSet.size; }
  isOpen(id: string) { return this.openSet.has(id); }

  register(id: string, list: Animatable[]) {
    this.unregister(id);
    this.entries.set(id, list);
    if (this.openSet.has(id)) for (const a of list) this.apply(a, true, 0, true);
    this.syncLedTriggers(id);
  }

  unregister(id: string) {
    const prev = this.entries.get(id);
    if (prev) for (const a of prev) gsap.killTweensOf(a.obj[a.prop]);
    this.entries.delete(id);
  }

  private apply(a: Animatable, open: boolean, delay: number, instant = false) {
    const target = a.obj[a.prop];
    gsap.killTweensOf(target);
    if (a.spin) {
      if (open) {
        if (instant) target[a.axis] = a.closed;
        gsap.to(target, { [a.axis]: '+=6.283185', duration: a.duration, ease: 'none', repeat: -1, delay });
      } else gsap.to(target, { [a.axis]: a.closed, duration: 0.6, ease: 'power2.out' });
      return;
    }
    const value = open ? a.open : a.closed;
    if (instant) { target[a.axis] = value; return; }
    gsap.to(target, { [a.axis]: value, duration: open ? a.duration : a.duration * 0.8, delay: delay + (open ? a.delay : 0), ease: open ? 'expo.out' : 'power2.inOut' });
  }

  /** Buka/tutup daftar item tertentu. */
  setOpenFor(ids: string[], open: boolean) {
    let i = 0;
    for (const id of ids) {
      const list = this.entries.get(id);
      if (open) this.openSet.add(id); else this.openSet.delete(id);
      if (list) { const stagger = Math.min(i * 0.05, 1.2); for (const a of list) this.apply(a, open, stagger); }
      this.syncLedTriggers(id);
      i++;
    }
  }

  /** Buka/tutup SEMUA item terdaftar. */
  setOpenAll(open: boolean) { this.setOpenFor([...this.entries.keys()], open); }

  attachGroup(id: string, group: THREE.Object3D) { this.groups.set(id, group); this.syncLedTriggers(id); }
  detachGroup(id: string) { this.groups.delete(id); }
  /** LED dengan trigger "nyala saat pintu dibuka" mengikuti state open item induknya. */
  private syncLedTriggers(id: string) {
    const g = this.groups.get(id);
    if (!g) return;
    g.traverse((o) => {
      if (o.userData.ledTrigger === 'onOpen') {
        const on = this.openSet.has(id);
        o.traverse((c) => {
          const l = c as THREE.PointLight;
          if (l.isLight) l.intensity = on ? (l.userData.baseIntensity as number) : 0;
          const m = c as THREE.Mesh;
          if (m.isMesh && m.userData.isLed) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2 : 0.15;
        });
      }
    });
  }

  dispose() { for (const id of [...this.entries.keys()]) this.unregister(id); this.groups.clear(); this.openSet.clear(); }
}

/** Explode view: pisahkan anak langsung group secara radial. */
export function setExplode(group: THREE.Object3D, on: boolean, distance = 100) {
  const center = new THREE.Vector3();
  const bb = new THREE.Box3().setFromObject(group);
  bb.getCenter(center); group.worldToLocal(center);
  for (const child of group.children) {
    if (on) {
      if (!child.userData.explodeBase) child.userData.explodeBase = child.position.clone();
      const dir = child.position.clone().sub(center);
      if (dir.lengthSq() < 1) dir.set(0, 1, 0.3);
      dir.normalize();
      gsap.to(child.position, { x: child.userData.explodeBase.x + dir.x * distance, y: child.userData.explodeBase.y + dir.y * distance, z: child.userData.explodeBase.z + dir.z * distance, duration: 0.6, ease: 'expo.out' });
    } else if (child.userData.explodeBase) {
      const b = child.userData.explodeBase as THREE.Vector3;
      gsap.to(child.position, { x: b.x, y: b.y, z: b.z, duration: 0.5, ease: 'power2.inOut' });
    }
  }
}
