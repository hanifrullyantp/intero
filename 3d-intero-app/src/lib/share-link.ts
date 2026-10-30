// Tautan berbagi pendek: proyek disimpan di server, URL hanya berisi id.
// Hash `#s=view.<payload>` tetap dibaca agar tautan lama yang utuh masih bisa dibuka.
import { decompressFromEncodedURIComponent } from 'lz-string';
import type { ProjectData } from '../types';
import { validateProjectData } from './persistence';

const SHARE_PATH = /^\/s\/([A-Za-z0-9_-]{8,32})\/?$/;

export function shareIdFromPath(pathname: string): string | null {
  const m = pathname.match(SHARE_PATH);
  return m ? m[1] : null;
}

export function shareUrlForId(id: string): string {
  const origin = location.origin.replace(/\/$/, '');
  return `${origin}/s/${id}`;
}

/** Hapus id tautan dari address bar setelah penerima menutup mode berbagi. */
export function forgetShareUrl() {
  history.replaceState(null, '', '/');
}

function slimProject(data: ProjectData): ProjectData {
  const copy = structuredClone(data);
  if (copy.settings?.production) copy.settings.production.logo = null;
  copy.customComponents = (copy.customComponents ?? []).map((c) => {
    const { thumbnail: _thumb, ...rest } = c;
    return rest;
  });
  return copy;
}

export async function createProjectShare(data: ProjectData, mode: 'view' | 'edit'): Promise<string> {
  const project = slimProject(data);
  let res: Response;
  try {
    res = await fetch('/api/instant3d/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, name: project.projectName, app: '3d-intero', mode }),
    });
  } catch {
    throw new Error('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.');
  }
  const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !body.id) throw new Error(body.error || 'Gagal membuat tautan');
  return shareUrlForId(body.id);
}

export async function fetchProjectShare(id: string): Promise<{ mode: 'view' | 'edit'; project: ProjectData }> {
  let res: Response;
  try {
    res = await fetch(`/api/instant3d/shares/${encodeURIComponent(id)}`);
  } catch {
    throw new Error('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.');
  }
  const body = (await res.json().catch(() => ({}))) as { payload?: unknown; error?: string };
  if (!res.ok) throw new Error(body.error === 'Not found' ? 'Tautan tidak ditemukan' : (body.error || 'Tautan tidak dapat dibuka'));
  const envelope = body.payload as { project?: unknown; mode?: string } | undefined;
  const raw = envelope && typeof envelope === 'object' && 'project' in envelope ? envelope.project : envelope;
  if (!validateProjectData(raw)) throw new Error('Data proyek pada tautan tidak valid');
  const mode = envelope && typeof envelope === 'object' && envelope.mode === 'edit' ? 'edit' : 'view';
  return { mode, project: raw };
}

/** Tautan lama `#s=view.<lz>` / `#s=edit.<lz>`. Mengembalikan null jika hash bukan tautan berbagi. */
export function projectFromLegacyHash(hash: string): { mode: 'view' | 'edit'; project: ProjectData } | null {
  const raw = (hash.startsWith('#') ? hash.slice(1) : hash).trim();
  const m = raw.match(/^s=(view|edit)\.(.+)$/);
  if (!m) return null;
  const mode = m[1] as 'view' | 'edit';
  let json: string | null = decompressFromEncodedURIComponent(m[2]) || null;
  if (!json) {
    try { json = decompressFromEncodedURIComponent(decodeURIComponent(m[2])) || null; } catch { json = null; }
  }
  if (!json) throw new Error('Tautan berbagi terpotong atau rusak. Buat tautan baru — tautan sekarang pendek dan tidak lagi menaruh data di URL.');
  let data: unknown;
  try { data = JSON.parse(json); } catch { throw new Error('Tautan berbagi tidak valid'); }
  if (!validateProjectData(data)) throw new Error('Data proyek pada tautan tidak valid');
  return { mode, project: data };
}
