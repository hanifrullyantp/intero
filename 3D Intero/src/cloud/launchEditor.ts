import { createCloudProject, fetchMyOrganizations, listOrgProjects } from './orgProjects';
import { useWorkspaceStore } from '../workspace/workspaceStore';
import type { OrgRole } from '../permissions/roles';

const ORG_KEY = 'instant3d_last_org';

/** Pick workspace, open latest project or create one — for post-login entry. */
export async function resolvePostLoginEditorUrl(): Promise<string> {
  const orgs = await fetchMyOrganizations();
  if (!orgs.length) throw new Error('Workspace tidak ditemukan untuk akun ini.');

  let stored: string | null = null;
  try { stored = localStorage.getItem(ORG_KEY); } catch { /* ignore */ }
  const org = (stored && orgs.some((o) => o.id === stored) ? orgs.find((o) => o.id === stored)! : orgs[0]!);
  try { localStorage.setItem(ORG_KEY, org.id); } catch { /* ignore */ }
  useWorkspaceStore.getState().setOrg(org.id, org.role as OrgRole);

  const projects = await listOrgProjects(org.id);
  if (projects.length > 0) return `/p/${projects[0]!.id}`;

  const id = await createCloudProject(org.id, 'Project 1');
  return `/p/${id}`;
}
