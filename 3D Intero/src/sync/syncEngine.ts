import type { Project } from '../models/types';
import { saveCloudProject } from '../cloud/orgProjects';
import { getLocalByCloudId, upsertLocalProject, type LocalSyncState } from '../storage/localDb';
import { useWorkspaceStore } from '../workspace/workspaceStore';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

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
    return;
  }

  ws.setSyncStatus('syncing');
  try {
    await saveCloudProject(cloudId, project);
    await cacheLocal(cloudId, orgId, project, 'synced');
    ws.setSyncStatus('synced');
  } catch (e) {
    ws.setSyncStatus('error');
    await cacheLocal(cloudId, orgId, project, 'error');
    useWorkspaceStore.getState().setSyncError((e as Error).message);
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

export function setupSyncListeners() {
  const goOnline = () => {
    const ws = useWorkspaceStore.getState();
    if (ws.syncStatus === 'offline' || ws.syncStatus === 'pending') {
      ws.setSyncStatus('pending');
    }
  };
  const goOffline = () => useWorkspaceStore.getState().setSyncStatus('offline');
  window.addEventListener('online', goOnline);
  window.addEventListener('offline', goOffline);
  return () => {
    window.removeEventListener('online', goOnline);
    window.removeEventListener('offline', goOffline);
  };
}
