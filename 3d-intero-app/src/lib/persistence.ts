// 3D Intero — Persistensi lokal: IndexedDB (Dexie) + file .intero. Proyek akun ada di cloud-projects.
import Dexie, { type Table } from 'dexie';
import type { HistoryEntry } from '../projectdoc/history';
import { commandLogSchema } from '../projectdoc/history';
import { projectDocSchema, type ProjectDoc } from '../projectdoc/schema';
import type { CatalogItem, CustomComponent, PriceItem, ProjectData } from '../types';
import { downloadBlob, downloadDataUrl, pickFile, sanitizeFilename } from './utils';

export interface DraftRecord { id: string; data: ProjectData; savedAt: number }
export interface LocalProjectRecord { id: string; name: string; data: ProjectData; savedAt: number }
export interface ProjectDocDraft { id: string; doc: ProjectDoc; past: HistoryEntry[]; future: HistoryEntry[]; savedAt: number }

class InteroDB extends Dexie {
  projects!: Table<DraftRecord, string>;
  myComponents!: Table<CustomComponent, string>;
  priceList!: Table<PriceItem, string>;
  catalog!: Table<CatalogItem, string>;
  localProjects!: Table<LocalProjectRecord, string>;
  projectDocs!: Table<ProjectDocDraft, string>;
  constructor() {
    super('intero_db');
    this.version(1).stores({ projects: 'id, savedAt', myComponents: 'id, category, createdAt' });
    this.version(2).stores({ projects: 'id, savedAt', myComponents: 'id, category, createdAt', priceList: 'id, group' });
    this.version(3).stores({ projects: 'id, savedAt', myComponents: 'id, category, createdAt', priceList: 'id, group', catalog: 'id, cat, supplier' });
    this.version(4).stores({ projects: 'id, savedAt', myComponents: 'id, category, createdAt', priceList: 'id, group', catalog: 'id, cat, supplier', localProjects: 'id, savedAt, name' });
    this.version(5).stores({ projects: 'id, savedAt', myComponents: 'id, category, createdAt', priceList: 'id, group', catalog: 'id, cat, supplier', localProjects: 'id, savedAt, name', projectDocs: 'id, savedAt' });
  }
}
export const db = new InteroDB();

export async function saveDraft(data: ProjectData): Promise<void> {
  try { await db.projects.put({ id: 'draft', data, savedAt: Date.now() }); } catch (e) { console.warn('Autosave gagal', e); }
}
export async function loadDraft(): Promise<DraftRecord | undefined> {
  try { return await db.projects.get('draft'); } catch { return undefined; }
}
export async function clearDraft() { try { await db.projects.delete('draft'); } catch { /* ignore */ } }

export async function saveProjectDocDraft(bundle: { doc: ProjectDoc; past: HistoryEntry[]; future: HistoryEntry[] }): Promise<void> {
  try { await db.projectDocs.put({ id: 'draft', ...bundle, savedAt: Date.now() }); } catch (e) { console.warn('Autosave ProjectDoc gagal', e); }
}
export async function loadProjectDocDraft(): Promise<ProjectDocDraft | undefined> {
  try {
    const row = await db.projectDocs.get('draft');
    if (!row) return undefined;
    const doc = projectDocSchema.safeParse(row.doc);
    if (!doc.success) return undefined;
    const log = commandLogSchema.safeParse({ past: row.past, future: row.future });
    return { id: row.id, doc: doc.data, past: log.success ? log.data.past : [], future: log.success ? log.data.future : [], savedAt: row.savedAt };
  } catch { return undefined; }
}

export async function listLocalProjects(): Promise<LocalProjectRecord[]> {
  try { return (await db.localProjects.orderBy('savedAt').reverse().toArray()); } catch { return []; }
}
export async function saveLocalProject(id: string | null, data: ProjectData): Promise<string> {
  const rowId = id || crypto.randomUUID();
  await db.localProjects.put({ id: rowId, name: data.projectName || 'Proyek', data, savedAt: Date.now() });
  return rowId;
}
export async function deleteLocalProject(id: string) { try { await db.localProjects.delete(id); } catch { /* ignore */ } }

export async function listMyComponents(): Promise<CustomComponent[]> {
  try { return await db.myComponents.toArray(); } catch { return []; }
}
export async function putMyComponent(c: CustomComponent) { try { await db.myComponents.put(c); } catch { /* ignore */ } }
export async function deleteMyComponent(id: string) { try { await db.myComponents.delete(id); } catch { /* ignore */ } }

// ─── File .intero ───
export function saveInteroFile(data: ProjectData, name?: string) {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(`${sanitizeFilename(name ?? data.projectName)}.intero`, new Blob([json], { type: 'application/json' }));
}

export function validateProjectData(raw: unknown): raw is ProjectData {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Partial<ProjectData>;
  return Array.isArray(r.cabinets) && Array.isArray(r.walls) && typeof r.projectName === 'string';
}

export async function openInteroFile(): Promise<ProjectData | null> {
  const f = await pickFile('.intero,.json');
  if (!f || typeof f.data !== 'string') return null;
  try {
    const parsed = JSON.parse(f.data) as unknown;
    if (!validateProjectData(parsed)) throw new Error('Struktur file tidak valid');
    return parsed;
  } catch (e) {
    throw new Error(`File .intero tidak valid: ${(e as Error).message}`);
  }
}

// ─── Export ───
export function exportImage(dataUrl: string, projectName: string, ext: 'png' | 'jpg') {
  downloadDataUrl(`${sanitizeFilename(projectName)}.${ext}`, dataUrl);
}
export function exportObj(objText: string, projectName: string, suffix = '') {
  downloadBlob(`${sanitizeFilename(projectName)}${suffix}.obj`, new Blob([objText], { type: 'text/plain' }));
}
export function exportSketchUpFallback(objText: string, projectName: string) {
  const note = `# 3D Intero — Export untuk SketchUp\n# Format .skp bersifat proprietary dan tidak dapat ditulis langsung dari browser.\n# Impor file ini di SketchUp: File > Import > pilih tipe OBJ (SketchUp Pro 2018+).\n# Unit: meter. Sumbu Y = atas (aktifkan "Swap YZ" saat impor).\n`;
  downloadBlob(`${sanitizeFilename(projectName)}_sketchup.obj`, new Blob([note + objText], { type: 'text/plain' }));
}

// ─── Daftar harga produksi (lintas proyek, editable) ───
export async function loadPrices(): Promise<PriceItem[] | null> {
  try { const list = await db.priceList.toArray(); return list.length ? list : null; } catch { return null; }
}
export async function savePrices(list: PriceItem[]): Promise<void> {
  try { await db.transaction('rw', db.priceList, async () => { await db.priceList.clear(); await db.priceList.bulkPut(list); }); } catch (e) { console.warn('Simpan daftar harga gagal', e); }
}
export async function clearPrices(): Promise<void> { try { await db.priceList.clear(); } catch { /* ignore */ } }
