import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { createCloudProject, fetchMyOrganizations, listOrgProjects, softDeleteProject, type OrgSummary, type ProjectSummary } from '../cloud/orgProjects';
import { useWorkspaceStore } from '../workspace/workspaceStore';
import { canEditProjects } from '../permissions/roles';
import type { OrgRole } from '../permissions/roles';
import InteroLogo from './InteroLogo';
import { FilePlus2, LogOut, FolderOpen, Trash2 } from './icons';
import AuthPage from './AuthPage';

const ORG_KEY = 'instant3d_last_org';

export default function ProjectHub() {
  const { user, loading, signOut, configured } = useAuth();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [orgId, setOrgId] = useState<string | null>(() => {
    try { return localStorage.getItem(ORG_KEY); } catch { return null; }
  });
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void fetchMyOrganizations().then((list) => {
      setOrgs(list);
      let stored: string | null = null;
      try { stored = localStorage.getItem(ORG_KEY); } catch { /* ignore */ }
      const pick = stored && list.some((o) => o.id === stored) ? stored : list[0]?.id ?? null;
      if (pick) {
        setOrgId(pick);
        try { localStorage.setItem(ORG_KEY, pick); } catch { /* ignore */ }
        const org = list.find((o) => o.id === pick)!;
        useWorkspaceStore.getState().setOrg(pick, org.role as OrgRole);
      }
    }).catch((e) => setErr((e as Error).message));
  }, [user]);

  useEffect(() => {
    if (!orgId || !user) return;
    void listOrgProjects(orgId).then(setProjects).catch((e) => setErr((e as Error).message));
  }, [orgId, user]);

  if (!configured) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm mb-4">Cloud workspace requires Supabase env (VITE_SUPABASE_URL).</p>
        <a href="/" className="btn-primary inline-block px-4 py-2 rounded-lg">Open local editor</a>
      </div>
    );
  }
  if (loading) return <div className="p-8 text-center text-sm opacity-70">Loading session…</div>;
  if (!user) return <AuthPage />;

  const currentOrg = orgs.find((o) => o.id === orgId);
  const canEdit = canEditProjects((currentOrg?.role as OrgRole) ?? null);

  const newProject = async () => {
    if (!orgId || !canEdit) return;
    setBusy(true);
    setErr(null);
    try {
      const id = await createCloudProject(orgId, `Project ${projects.length + 1}`);
      window.location.href = `/p/${id}`;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this project from cloud?')) return;
    try {
      await softDeleteProject(id);
      setProjects((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="min-h-full flex flex-col" style={{ background: 'var(--bg-main)' }}>
      <header className="h-14 flex items-center gap-3 px-4 border-b border-[var(--border)] shrink-0">
        <InteroLogo size={36} className="rounded-lg" />
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">Instant 3D</div>
          <div className="text-[11px] opacity-70 truncate">{currentOrg?.name ?? 'Workspace'} · {currentOrg?.plan ?? 'free'}</div>
        </div>
        {orgs.length > 1 && (
          <select className="input py-1! text-xs!" value={orgId ?? ''} onChange={(e) => { setOrgId(e.target.value); try { localStorage.setItem(ORG_KEY, e.target.value); } catch { /* ignore */ } }}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
        <button type="button" className="tb-btn" title="Sign out" onClick={() => { void signOut().then(() => { window.location.href = '/app'; }); }}><LogOut size={16} /></button>
      </header>
      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-lg font-bold">Projects</h1>
          {canEdit && (
            <button type="button" className="btn-primary flex items-center gap-2 py-2!" disabled={busy} onClick={() => { void newProject(); }}>
              <FilePlus2 size={16} /> New project
            </button>
          )}
        </div>
        {err && <p className="text-sm text-[var(--error)] mb-3">{err}</p>}
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id} className="card flex items-center gap-3 p-3">
              <FolderOpen size={20} className="opacity-60 shrink-0" />
              <button type="button" className="flex-1 text-left min-w-0" onClick={() => { window.location.href = `/p/${p.id}`; }}>
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-[10px] opacity-60">Updated {new Date(p.updated_at).toLocaleString()} · rev {p.revision}</div>
              </button>
              {canEdit && (
                <button type="button" className="tb-btn text-[var(--error)]" title="Delete" onClick={() => { void remove(p.id); }}><Trash2 size={14} /></button>
              )}
            </li>
          ))}
          {!projects.length && <li className="text-sm opacity-60 py-8 text-center">No projects yet. Create your first design.</li>}
        </ul>
        <p className="text-[11px] opacity-50 mt-6 text-center">
          <a href="/" className="underline">Local-only editor</a> (no account) · changes sync when online
        </p>
      </main>
    </div>
  );
}
