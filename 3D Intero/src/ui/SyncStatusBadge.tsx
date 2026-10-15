import { useWorkspaceStore } from '../workspace/workspaceStore';

const LABEL: Record<string, string> = {
  synced: 'Online · Synced',
  syncing: 'Syncing…',
  pending: 'Pending sync',
  offline: 'Offline · Local',
  error: 'Sync error',
};

export default function SyncStatusBadge() {
  const status = useWorkspaceStore((s) => s.syncStatus);
  const err = useWorkspaceStore((s) => s.syncError);
  const cloudId = useWorkspaceStore((s) => s.activeCloudProjectId);
  if (!cloudId) return null;

  const dot =
    status === 'synced' ? 'var(--success)' :
    status === 'offline' ? 'var(--warning)' :
    status === 'error' ? 'var(--error)' : 'var(--accent)';

  return (
    <div className="desktop-only flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border border-[var(--border)] shrink-0" style={{ background: 'var(--bg-panel)' }} title={err ?? undefined}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
      <span className="opacity-80">{LABEL[status] ?? status}</span>
    </div>
  );
}
