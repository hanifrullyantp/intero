import { useEffect, useState } from 'react';
import App from './App';
import { fetchProjectPayload } from './cloud/orgProjects';
import { useStore } from './core/store';
import { normalizeProject } from './core/projectManager';
import { useWorkspaceStore } from './workspace/workspaceStore';
import { setupSyncListeners, scheduleCloudSave, flushSyncQueue } from './sync/syncEngine';
import { getLocalByCloudId, upsertLocalProject } from './storage/localDb';
import InteroLogo from './ui/InteroLogo';

export function parseEditorProjectId(pathname: string): string | null {
  const m = pathname.match(/^\/p\/([0-9a-f-]{36})\/?$/i);
  return m ? m[1]! : null;
}

export default function EditorRoute({ projectId }: { projectId: string }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useWorkspaceStore.getState().setActiveProject(projectId);
    useWorkspaceStore.getState().setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
    const off = setupSyncListeners();
    let cancelled = false;
    if (navigator.onLine) void flushSyncQueue();

    (async () => {
      try {
        let project;
        if (navigator.onLine) {
          try {
            project = normalizeProject(await fetchProjectPayload(projectId));
          } catch {
            const local = await getLocalByCloudId(projectId);
            if (local) project = normalizeProject(local.payload);
            else throw new Error('Could not load project');
          }
        } else {
          const local = await getLocalByCloudId(projectId);
          if (!local) throw new Error('Offline — no local copy of this project');
          project = normalizeProject(local.payload);
        }
        if (cancelled) return;
        useStore.getState().setProject(project, false);
        useStore.setState({ dirty: false, past: [], future: [] });
        await upsertLocalProject({
          localId: crypto.randomUUID(),
          cloudId: projectId,
          orgId: useWorkspaceStore.getState().currentOrgId,
          name: project.name,
          payload: project,
          updatedAt: Date.now(),
          syncState: 'synced',
        });
        useWorkspaceStore.getState().setSyncStatus(navigator.onLine ? 'synced' : 'offline');
        setReady(true);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      off();
      useWorkspaceStore.getState().setActiveProject(null);
    };
  }, [projectId]);

  useEffect(() => {
    if (!ready) return;
    const unsub = useStore.subscribe((state, prev) => {
      if (state.project !== prev.project) {
        scheduleCloudSave(state.project);
      }
    });
    return unsub;
  }, [ready]);

  if (error) {
    return (
      <div className="h-full grid place-items-center p-6 text-center">
        <InteroLogo size={48} className="mx-auto mb-4 rounded-xl" />
        <p className="text-sm text-[var(--error)] mb-4">{error}</p>
        <a href="/projects" className="btn-primary px-4 py-2 rounded-lg text-sm">Back to projects</a>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="h-full grid place-items-center gap-3">
        <div className="spinner" />
        <p className="text-sm opacity-70">Loading project…</p>
      </div>
    );
  }
  return <App />;
}
