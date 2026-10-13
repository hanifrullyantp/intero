import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
const rgba = (c: { r: number; g: number; b: number }, a = 1, k = 1) => `rgba(${Math.round(c.r * k)},${Math.round(c.g * k)},${Math.round(c.b * k)},${a})`;

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TextureKind = 'wood' | 'marble' | 'concrete' | 'granite' | 'metal' | 'tile';

export function getTexture(kind: TextureKind, hex: string, repeat = 1): THREE.CanvasTexture {
  const key = `${kind}_${hex}_${repeat}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const base = hexToRgb(hex);
  const rnd = mulberry(hex.length * 7919 + kind.length);
  ctx.fillStyle = rgba(base);
  ctx.fillRect(0, 0, S, S);

  if (kind === 'wood') {
    for (let i = 0; i < 90; i++) {
      const y = rnd() * S;
      const k = 0.78 + rnd() * 0.3;
      ctx.strokeStyle = rgba(base, 0.35 + rnd() * 0.3, k);
      ctx.lineWidth = 1 + rnd() * 3;
      ctx.beginPath();
      const amp = 4 + rnd() * 12;
      const freq = 0.004 + rnd() * 0.01;
      for (let x = 0; x <= S; x += 8) ctx.lineTo(x, y + Math.sin(x * freq + i) * amp + Math.sin(x * 0.05) * 1.5);
      ctx.stroke();
    }
    // fine grain
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = rgba(base, 0.12, 0.7 + rnd() * 0.5);
      ctx.fillRect(rnd() * S, rnd() * S, 20 + rnd() * 80, 1);
    }
  } else if (kind === 'marble') {
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = rgba(base, 0.5, 0.7 + rnd() * 0.15);
      ctx.lineWidth = 0.6 + rnd() * 2;
      ctx.beginPath();
      let x = rnd() * S;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < S) {
        x += (rnd() - 0.5) * 60;
        y += 20 + rnd() * 40;
        ctx.quadraticCurveTo(x + (rnd() - 0.5) * 40, y - 20, x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = rgba(base, 0.08, 0.85 + rnd() * 0.3);
      ctx.fillRect(rnd() * S, rnd() * S, 2, 2);
    }
  } else if (kind === 'granite') {
    for (let i = 0; i < 26000; i++) {
      const k = 0.5 + rnd() * 1.6;
      ctx.fillStyle = rgba(base, 0.6, k);
      const s = rnd() < 0.05 ? 3 : 1.5;
      ctx.fillRect(rnd() * S, rnd() * S, s, s);
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.35})`;
      ctx.fillRect(rnd() * S, rnd() * S, 2, 2);
    }
  } else if (kind === 'concrete') {
    for (let i = 0; i < 12000; i++) {
      ctx.fillStyle = rgba(base, 0.25, 0.8 + rnd() * 0.4);
      ctx.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 3, 2 + rnd() * 3);
    }
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = rgba(base, 0.4, 0.75);
      ctx.beginPath();
      ctx.moveTo(rnd() * S, rnd() * S);
      ctx.lineTo(rnd() * S, rnd() * S);
      ctx.stroke();
    }
  } else if (kind === 'metal') {
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = rgba(base, 0.25, 0.85 + rnd() * 0.3);
      ctx.fillRect(0, rnd() * S, S, 1);
    }
  } else if (kind === 'tile') {
    const n = 4;
    const t = S / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = rgba(base, 1, 0.94 + rnd() * 0.08);
        ctx.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      }
    ctx.fillStyle = rgba(base, 1, 0.8);
    for (let i = 0; i <= n; i++) {
      ctx.fillRect(i * t - 1, 0, 2, S);
      ctx.fillRect(0, i * t - 1, S, 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
