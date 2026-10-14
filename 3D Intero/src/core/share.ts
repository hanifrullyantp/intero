import type { Project } from '../models/types';
import { normalizeProject } from './projectManager';

const SHARE_PATH = /^\/v\/([A-Za-z0-9_-]{8,32})\/?$/;

export function parseShareIdFromPath(pathname: string): string | null {
  const m = pathname.match(SHARE_PATH);
  return m ? m[1]! : null;
}

export function shareUrlForId(id: string): string {
  const envBase = import.meta.env.VITE_3D_PUBLIC_ORIGIN as string | undefined;
  const origin = (envBase || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  return `${origin}/v/${id}`;
}

async function apiBase(): Promise<string> {
  const env = import.meta.env.VITE_3D_API_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export async function createShareLink(project: Project): Promise<{ id: string; url: string }> {
  const base = await apiBase();
  const r = await fetch(`${base}/api/instant3d/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project }),
  });
  const data = (await r.json()) as { id?: string; error?: string };
  if (!r.ok) throw new Error(data.error || `Share failed (${r.status})`);
  if (!data.id) throw new Error('Invalid share response');
  return { id: data.id, url: shareUrlForId(data.id) };
}

export async function fetchSharedProject(id: string): Promise<Project> {
  const base = await apiBase();
  const r = await fetch(`${base}/api/instant3d/shares/${encodeURIComponent(id)}`);
  const data = (await r.json()) as { payload?: unknown; error?: string };
  if (!r.ok) throw new Error(data.error || `Could not load share (${r.status})`);
  const envelope = data.payload as { project?: unknown } | unknown;
  const raw = envelope && typeof envelope === 'object' && 'project' in envelope ? (envelope as { project: unknown }).project : envelope;
  return normalizeProject(raw);
}
