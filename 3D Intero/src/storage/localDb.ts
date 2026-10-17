import Dexie, { type Table } from 'dexie';
import type { Project } from '../models/types';

export type LocalSyncState = 'synced' | 'pending' | 'local_only' | 'error';

export interface LocalProjectRecord {
  /** Local primary key (Dexie) */
  localId: string;
  cloudId: string | null;
  orgId: string | null;
  name: string;
  payload: Project;
  updatedAt: number;
  syncState: LocalSyncState;
}

export interface SyncQueueRow {
  cloudId: string;
  orgId: string | null;
  name: string;
  payload: Project;
  updatedAt: number;
  attempts: number;
  lastError: string | null;
}

class Instant3DDatabase extends Dexie {
  projects!: Table<LocalProjectRecord, string>;
  syncQueue!: Table<SyncQueueRow, string>;

  constructor() {
    super('instant3d_v1');
    this.version(1).stores({
      projects: 'localId, cloudId, orgId, updatedAt',
    });
    this.version(2).stores({
      projects: 'localId, cloudId, orgId, updatedAt',
      syncQueue: 'cloudId, updatedAt, orgId',
    });
  }
}

export const localDb = new Instant3DDatabase();

export async function upsertLocalProject(rec: LocalProjectRecord) {
  await localDb.projects.put(rec);
}

export async function getLocalByCloudId(cloudId: string) {
  return localDb.projects.where('cloudId').equals(cloudId).first();
}

export async function listLocalProjects(orgId: string | null) {
  if (orgId) return localDb.projects.where('orgId').equals(orgId).reverse().sortBy('updatedAt');
  return localDb.projects.orderBy('updatedAt').reverse().toArray();
}
