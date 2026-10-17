import type { Project } from '../models/types';
import { localDb } from './localDb';

export interface SyncQueueRecord {
  cloudId: string;
  orgId: string | null;
  name: string;
  payload: Project;
  updatedAt: number;
  attempts: number;
  lastError: string | null;
}

export async function enqueueCloudSync(rec: Omit<SyncQueueRecord, 'attempts' | 'lastError'> & Partial<Pick<SyncQueueRecord, 'attempts' | 'lastError'>>) {
  const existing = await localDb.syncQueue.get(rec.cloudId);
  const next: SyncQueueRecord = {
    cloudId: rec.cloudId,
    orgId: rec.orgId,
    name: rec.name,
    payload: rec.payload,
    updatedAt: rec.updatedAt,
    attempts: rec.attempts ?? existing?.attempts ?? 0,
    lastError: rec.lastError ?? existing?.lastError ?? null,
  };
  await localDb.syncQueue.put(next);
}

export async function listSyncQueue(): Promise<SyncQueueRecord[]> {
  return localDb.syncQueue.orderBy('updatedAt').toArray();
}

export async function removeSyncQueueItem(cloudId: string) {
  await localDb.syncQueue.delete(cloudId);
}

export async function bumpSyncAttempt(cloudId: string, lastError: string) {
  const row = await localDb.syncQueue.get(cloudId);
  if (!row) return;
  await localDb.syncQueue.put({
    ...row,
    attempts: row.attempts + 1,
    lastError,
  });
}

export async function syncQueueCount(): Promise<number> {
  return localDb.syncQueue.count();
}
