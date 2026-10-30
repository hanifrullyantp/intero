import type { ProjectData } from '../types';
import { clearSession, getSession, type SessionUser } from './account';
import { validateProjectData } from './persistence';

export interface CloudProjectMeta { id: string; name: string; updatedAt: string }

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const session = getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set('Authorization', `Bearer ${session.token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  let res: Response;
  try { res = await fetch(path, { ...init, headers }); }
  catch { throw new Error('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.'); }
  if (res.status === 401 && session) clearSession();
  return res;
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) return 'Sesi habis. Masuk lagi untuk menyimpan ke akun.';
  return body.error || 'Permintaan gagal';
}

export async function registerAccount(input: { name: string; email: string; password: string }): Promise<{ token: string; user: SessionUser }> {
  const res = await api('/api/3d/auth/register', { method: 'POST', body: JSON.stringify(input) });
  const body = (await res.json().catch(() => ({}))) as { token?: string; user?: SessionUser; error?: string };
  if (!res.ok || !body.token || !body.user) throw new Error(body.error || 'Gagal daftar');
  return { token: body.token, user: body.user };
}

export async function loginAccount(input: { email: string; password: string }): Promise<{ token: string; user: SessionUser }> {
  const res = await api('/api/3d/auth/login', { method: 'POST', body: JSON.stringify(input) });
  const body = (await res.json().catch(() => ({}))) as { token?: string; user?: SessionUser; error?: string };
  if (!res.ok || !body.token || !body.user) throw new Error(body.error || 'Gagal masuk');
  return { token: body.token, user: body.user };
}

export async function listCloudProjects(): Promise<CloudProjectMeta[]> {
  const res = await api('/api/3d/projects');
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { projects?: CloudProjectMeta[] };
  return body.projects || [];
}

export async function fetchCloudProject(id: string): Promise<ProjectData> {
  const res = await api(`/api/3d/projects/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { project?: unknown };
  if (!validateProjectData(body.project)) throw new Error('Data proyek di akun tidak valid');
  return body.project;
}

export async function saveCloudProject(input: { id?: string | null; name: string; project: ProjectData }): Promise<CloudProjectMeta> {
  const res = await api('/api/3d/projects', { method: 'POST', body: JSON.stringify({ id: input.id || undefined, name: input.name, project: input.project }) });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as CloudProjectMeta;
  if (!body.id) throw new Error('Server tidak mengembalikan id proyek');
  return body;
}

export async function deleteCloudProject(id: string): Promise<void> {
  const res = await api(`/api/3d/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
}
