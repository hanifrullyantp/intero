import type { Project } from '../models/types';
import { saveCloudProject } from '../cloud/orgProjects';
import { getLocalByCloudId, upsertLocalProject, type LocalSyncState } from '../storage/localDb';
import { bumpSyncAttempt, enqueueCloudSync, listSyncQueue, removeSyncQueueItem } from '../storage/syncQueue';
import { useWorkspaceStore } from '../workspace/workspaceStore';

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;
let flushingQueue = false;

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

export function scheduleCloudSave(project: Project) {
  const ws = useWorkspaceStore.getState();
  const cloudId = ws.activeCloudProjectId;
  if (!cloudId || ws.accessMode === 'view') return;

  ws.setSyncStatus(navigator.onLine ? 'pending' : 'offline');

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void flushCloudSave(project);
  }, 2000);
}

export async function flushCloudSave(project: Project): Promise<void> {
  const ws = useWorkspaceStore.getState();
  const cloudId = ws.activeCloudProjectId;
  const orgId = ws.currentOrgId;
  if (!cloudId) return;

  if (!navigator.onLine) {
    ws.setSyncStatus('offline');
    await cacheLocal(cloudId, orgId, project, 'pending');
    await enqueueCloudSync({
      cloudId,
      orgId,
      name: project.name,
      payload: project,
      updatedAt: Date.now(),
    });
    return;
  }

  ws.setSyncStatus('syncing');
  try {
    await saveCloudProject(cloudId, project);
    await cacheLocal(cloudId, orgId, project, 'synced');
    await removeSyncQueueItem(cloudId);
    ws.setSyncStatus('synced');
    ws.setSyncError(null);
  } catch (e) {
    const msg = (e as Error).message;
    ws.setSyncStatus('error');
    await cacheLocal(cloudId, orgId, project, 'error');
    await enqueueCloudSync({
      cloudId,
      orgId,
      name: project.name,
      payload: project,
      updatedAt: Date.now(),
      lastError: msg,
    });
    ws.setSyncError(msg);
  }
}

async function cacheLocal(cloudId: string, orgId: string | null, project: Project, syncState: LocalSyncState) {
  const existing = await getLocalByCloudId(cloudId);
  await upsertLocalProject({
    localId: existing?.localId ?? crypto.randomUUID(),
    cloudId,
    orgId,
    name: project.name,
    payload: project,
    updatedAt: Date.now(),
    syncState,
  });
}

export async function flushSyncQueue(): Promise<void> {
  if (!navigator.onLine || flushingQueue) return;
  flushingQueue = true;
  try {
    const items = await listSyncQueue();
    for (const item of items) {
      if (!navigator.onLine) break;
      try {
        await saveCloudProject(item.cloudId, item.payload);
        await cacheLocal(item.cloudId, item.orgId, item.payload, 'synced');
        await removeSyncQueueItem(item.cloudId);
        const active = useWorkspaceStore.getState().activeCloudProjectId;
        if (active === item.cloudId) {
          useWorkspaceStore.getState().setSyncStatus('synced');
          useWorkspaceStore.getState().setSyncError(null);
        }
      } catch (e) {
        await bumpSyncAttempt(item.cloudId, (e as Error).message);
        const active = useWorkspaceStore.getState().activeCloudProjectId;
        if (active === item.cloudId) {
          useWorkspaceStore.getState().setSyncStatus('error');
          useWorkspaceStore.getState().setSyncError((e as Error).message);
        }
      }
    }
  } finally {
    flushingQueue = false;
  }
}

function retryActiveProjectIfDirty() {
  const ws = useWorkspaceStore.getState();
  const cloudId = ws.activeCloudProjectId;
  if (!cloudId || !navigator.onLine) return;
  void import('../core/store')
    .then(({ useStore }) => {
      const { project, dirty } = useStore.getState();
      if (dirty || ws.syncStatus === 'pending' || ws.syncStatus === 'error' || ws.syncStatus === 'offline') {
        void flushCloudSave(project);
      }
    })
    .catch(() => undefined);
}

export function setupSyncListeners() {
  const goOnline = () => {
    const ws = useWorkspaceStore.getState();
    if (ws.syncStatus === 'offline' || ws.syncStatus === 'pending' || ws.syncStatus === 'error') {
      ws.setSyncStatus('pending');
    }
    void flushSyncQueue().then(() => retryActiveProjectIfDirty());
  };
  const goOffline = () => useWorkspaceStore.getState().setSyncStatus('offline');

  window.addEventListener('online', goOnline);
  window.addEventListener('offline', goOffline);

  if (!retryTimer) {
    retryTimer = setInterval(() => {
      if (!navigator.onLine) return;
      void flushSyncQueue();
    }, 45_000);
  }

  return () => {
    window.removeEventListener('online', goOnline);
    window.removeEventListener('offline', goOffline);
  };
}
