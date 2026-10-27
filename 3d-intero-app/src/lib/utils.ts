// 3D Intero — util umum

let counter = 0;
export function uid(prefix = 'ID'): string {
  counter += 1;
  const t = Date.now().toString(36).slice(-4).toUpperCase();
  const r = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${t}${r}${counter.toString(36).toUpperCase()}`;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const round = (v: number, step = 1) => Math.round(v / step) * step;
export const degToRad = (d: number) => (d * Math.PI) / 180;
export const radToDeg = (r: number) => (r * 180) / Math.PI;

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ─── Warna ───
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return { r: 128, g: 128, b: 128 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue2rgb(p, q, h + 1 / 3) * 255, g: hue2rgb(p, q, h) * 255, b: hue2rgb(p, q, h - 1 / 3) * 255 };
}
export const hexToHsl = (hex: string) => { const { r, g, b } = hexToRgb(hex); return rgbToHsl(r, g, b); };
export const hslToHex = (h: number, s: number, l: number) => { const { r, g, b } = hslToRgb(h, s, l); return rgbToHex(r, g, b); };
export function isValidHex(v: string) { return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim()); }
export function normalizeHex(v: string) { const h = v.trim().replace('#', ''); return `#${(h.length === 3 ? h.split('').map((c) => c + c).join('') : h).toUpperCase()}`; }

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
export function lighten(hex: string, amount: number) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clamp(l + amount, 0, 100));
}
export function isDark(hex: string) { return luminance(hex) < 0.35; }

// ─── Waktu ───
export function timeAgo(iso: string | number | null | undefined): string {
  if (!iso) return '-';
  const t = typeof iso === 'number' ? iso : new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 5) return 'baru saja';
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

// ─── File ───
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => document.body.removeChild(a), 100);
}
export function pickFile(accept: string, binary = false): Promise<{ name: string; data: string | ArrayBuffer } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, data: reader.result as string | ArrayBuffer });
      reader.onerror = () => resolve(null);
      if (binary) reader.readAsArrayBuffer(f); else reader.readAsText(f);
    };
    input.click();
  });
}

export function fmtMm(v: number) { return `${Math.round(v)} mm`; }
export function fmtDims(d: { w: number; h: number; d: number }) { return `${Math.round(d.w)} × ${Math.round(d.h)} × ${Math.round(d.d)} mm`; }
export function sanitizeFilename(name: string) { return name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'proyek'; }

export const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth < 768;
export const storage = {
  get<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(key); return v === null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
  },
  set(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ } },
  remove(key: string) { localStorage.removeItem(key); },
};

// ─── Palette import (.ase / .aco / .gpl / .json) ───
export interface PaletteColor { name: string; hex: string }

export function parsePaletteFile(name: string, data: string | ArrayBuffer): PaletteColor[] {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'ase' && data instanceof ArrayBuffer) return parseASE(data);
  if (ext === 'aco' && data instanceof ArrayBuffer) return parseACO(data);
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
  if (ext === 'gpl') return parseGPL(text);
  return parseJSONPalette(text);
}

function parseJSONPalette(text: string): PaletteColor[] {
  try {
    const j = JSON.parse(text) as { colors?: unknown; name?: string } | unknown[];
    const arr = Array.isArray(j) ? j : (j as { colors?: unknown }).colors;
    if (!Array.isArray(arr)) return [];
    return arr.map((c, i) => {
      if (typeof c === 'string') return { name: `Warna ${i + 1}`, hex: normalizeHex(c) };
      const o = c as { name?: string; hex?: string; color?: string };
      const hex = o.hex || o.color || '#888888';
      return { name: o.name || `Warna ${i + 1}`, hex: normalizeHex(hex) };
    }).filter((c) => isValidHex(c.hex));
  } catch { return []; }
}

function parseGPL(text: string): PaletteColor[] {
  const out: PaletteColor[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s*(.*)$/);
    if (m) out.push({ name: m[4] || `Warna ${out.length + 1}`, hex: rgbToHex(+m[1], +m[2], +m[3]) });
  }
  return out;
}

function readUtf16(view: DataView, offset: number, len: number): string {
  let s = '';
  for (let i = 0; i < len - 1; i++) s += String.fromCharCode(view.getUint16(offset + i * 2));
  return s;
}

// Adobe Swatch Exchange (binary big-endian)
function parseASE(buf: ArrayBuffer): PaletteColor[] {
  const v = new DataView(buf);
  const out: PaletteColor[] = [];
  if (v.getUint32(0) !== 0x41534546) return out; // 'ASEF'
  const blocks = v.getUint32(8);
  let off = 12;
  for (let i = 0; i < blocks && off + 6 <= buf.byteLength; i++) {
    const type = v.getUint16(off); const len = v.getUint32(off + 2); off += 6;
    if (type === 0x0001) {
      let p = off;
      const nameLen = v.getUint16(p); p += 2;
      const name = readUtf16(v, p, nameLen); p += nameLen * 2;
      const model = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3)).trim(); p += 4;
      let hex = '#888888';
      if (model === 'RGB') hex = rgbToHex(v.getFloat32(p) * 255, v.getFloat32(p + 4) * 255, v.getFloat32(p + 8) * 255);
      else if (model === 'CMYK') {
        const c = v.getFloat32(p), m = v.getFloat32(p + 4), y = v.getFloat32(p + 8), k = v.getFloat32(p + 12);
        hex = rgbToHex(255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k));
      } else if (model === 'Gray') { const g = v.getFloat32(p) * 255; hex = rgbToHex(g, g, g); }
      else if (model === 'LAB') {
        const L = v.getFloat32(p) * 100, A = v.getFloat32(p + 4), B = v.getFloat32(p + 8);
        hex = labToHex(L, A, B);
      }
      out.push({ name: name || `Warna ${out.length + 1}`, hex });
    }
    off += len;
  }
  return out;
}

// Adobe Color (.aco) v1/v2
function parseACO(buf: ArrayBuffer): PaletteColor[] {
  const v = new DataView(buf);
  const out: PaletteColor[] = [];
  const version = v.getUint16(0); const count = v.getUint16(2);
  let off = 4;
  const readColor = (p: number) => {
    const space = v.getUint16(p); const w = v.getUint16(p + 2), x = v.getUint16(p + 4), y = v.getUint16(p + 6), z = v.getUint16(p + 8);
    if (space === 0) return rgbToHex(w / 257, x / 257, y / 257);
    if (space === 1) { const { r, g, b } = hslToRgb((w / 65535) * 360, (x / 65535) * 100, (y / 65535) * 100); return rgbToHex(r, g, b); }
    if (space === 2) { const c = 1 - w / 65535, m = 1 - x / 65535, yy = 1 - y / 65535, k = 1 - z / 65535; return rgbToHex(255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - yy) * (1 - k)); }
    if (space === 8) { const g = 255 - (w / 10000) * 255; return rgbToHex(g, g, g); }
    return '#888888';
  };
  for (let i = 0; i < count && off + 10 <= buf.byteLength; i++) { out.push({ name: `Warna ${i + 1}`, hex: readColor(off) }); off += 10; }
  if (version === 1 && off + 4 <= buf.byteLength && v.getUint16(off) === 2) {
    off += 4; // versi 2 dengan nama
    for (let i = 0; i < count && off + 10 <= buf.byteLength; i++) {
      const hex = readColor(off); off += 10;
      off += 2; const nameLen = v.getUint16(off); off += 2;
      const name = readUtf16(v, off, nameLen); off += nameLen * 2;
      if (out[i]) out[i] = { name: name || out[i].name, hex };
    }
  }
  return out;
}

function labToHex(L: number, A: number, B: number): string {
  let y = (L + 16) / 116, x = A / 500 + y, z = y - B / 200;
  const f = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  x = 0.95047 * f(x); y = 1.0 * f(y); z = 1.08883 * f(z);
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.204 + z * 1.057;
  const gm = (c: number) => (c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c);
  r = gm(r); g = gm(g); b = gm(b);
  return rgbToHex(r * 255, g * 255, b * 255);
}

export function pickColorFromImage(file: File): Promise<{ canvas: HTMLCanvasElement } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 320 / img.width);
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ canvas });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
