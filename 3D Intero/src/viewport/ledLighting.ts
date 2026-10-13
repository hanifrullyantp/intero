import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { Item, Project } from '../models/types';
import { housingLayout } from '../engine/applianceHousing';
import { isLowerTier } from '../engine/kitchenRules';

RectAreaLightUniformsLib.init();
const TONES = { warm: '#ffd59c', neutral: '#fff0da', cool: '#dcecff' };
let haloTexture: THREE.DataTexture | undefined;
let wallTexture: THREE.DataTexture | undefined;

function gradient(wall = false) {
  if (wall ? wallTexture : haloTexture) return (wall ? wallTexture : haloTexture)!;
  const w = 128, h = 32;
  const pixels = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = Math.sin(Math.PI * x / (w - 1));
    const alpha = wall ? Math.pow(y / (h - 1), 2.2) : Math.exp(-Math.pow((y / (h - 1) - 0.5) * 4, 2));
    const i = (y * w + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = Math.round(255 * alpha * Math.pow(Math.max(0, edge), 0.5));
  }
  const texture = new THREE.DataTexture(pixels, w, h, THREE.RGBAFormat);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  if (wall) wallTexture = texture; else haloTexture = texture;
  return texture;
}

interface LightBudget { left: number }

/** Emissive diffuser + real area light + a subtle, depth-tested glow. All coordinates are cm. */
export function cabinetLighting(item: Item, project: Project, budget: LightBudget): THREE.Group | null {
  const settings = project.settings.lighting;
  if (!settings || item.kind !== 'cabinet' || item.visible === false) return null;
  const brightness = THREE.MathUtils.clamp(settings.brightness ?? 1, 0, 3);
  if (brightness === 0) return null;
  const color = TONES[settings.tone] ?? TONES.warm;
  const group = new THREE.Group();
  const W = item.width, H = item.height, D = item.depth;
  const corner = item.subtype.includes('corner');
  const arm = corner ? Math.min(item.config.cornerDepth ?? 33, W, D) : D;
  const isWall = item.category === 'wall';

  const line = (cx: number, cy: number, cz: number, length: number, yaw: number, inside: boolean) => {
    if (length < 3) return;
    const assembly = new THREE.Group();
    assembly.position.set(cx, cy, cz);
    assembly.rotation.y = yaw;
    const emitter = new THREE.Mesh(new THREE.BoxGeometry(length, 0.45, 1.6), new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 4 * brightness, roughness: 0.25,
    }));
    emitter.userData.disposeMaterial = true;
    emitter.userData.led = true;
    emitter.raycast = () => {};
    assembly.add(emitter);
    if (budget.left > 0 && (!inside || item.config.openFront || item.config.doors === 0 || item.config.glass || (item.openAmount ?? 0) > 0.02 || item.subtype === 'tall_dispenser')) {
      budget.left--;
      const light = new THREE.RectAreaLight(color, (inside ? 18 : 42) * brightness, length, inside ? 3 : 4);
      light.position.y = -0.3;
      light.rotation.x = -Math.PI / 2;
      assembly.add(light);
    }
    if (settings.glow !== false) {
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(length + 6, 8), new THREE.MeshBasicMaterial({
        color, map: gradient(), transparent: true, opacity: Math.min(0.5, brightness * 0.22),
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      }));
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = -0.35;
      glow.userData.disposeMaterial = true;
      glow.raycast = () => {};
      assembly.add(glow);
    }
    group.add(assembly);
  };

  if (settings.under && isWall && item.subtype !== 'wall_hood' && isLowerTier(item, project.items)) {
    line(W / 2, -0.5, arm - 4, W - 5, 0, false);
    if (corner && D > arm + 5) line(item.config.opening === 'right' ? W - arm + 4 : arm - 4, -0.5, arm + (D - arm) / 2, D - arm - 3, Math.PI / 2, false);
    // A restrained wall wash makes light visible on dark stone as well as white paint.
    if (settings.glow !== false && project.materials.backsplash) {
      const washH = Math.min(35, project.materials.backsplashHeight);
      const wash = new THREE.Mesh(new THREE.PlaneGeometry(W - 4, washH), new THREE.MeshBasicMaterial({
        color, map: gradient(true), transparent: true, opacity: Math.min(0.25, brightness * 0.13),
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      wash.position.set(W / 2, -washH / 2 - 0.5, 1.24);
      wash.raycast = () => {};
      wash.userData.disposeMaterial = true;
      group.add(wash);
    }
  }
  const interior = isWall && settings.inWall || item.category === 'base' && settings.inBase || item.category === 'tall' && settings.inWall;
  if (interior) {
    const y = item.subtype === 'tall_dispenser' ? housingLayout(item, project.materials.board).shelfY - 0.6 : H - 2.5;
    line(W / 2, y, arm - 5, W - 5, 0, true);
    if (corner && D > arm + 5) line(item.config.opening === 'right' ? W - arm + 5 : arm - 5, y, arm + (D - arm) / 2, D - arm - 3, Math.PI / 2, true);
  }
  return group.children.length ? group : null;
}