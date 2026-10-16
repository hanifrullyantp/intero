import {
  createCloudProject,
  ensurePersonalWorkspace,
  fetchMyOrganizations,
  listOrgProjects,
} from './orgProjects';
import { useWorkspaceStore } from '../workspace/workspaceStore';
import type { OrgRole } from '../permissions/roles';

const ORG_KEY = 'instant3d_last_org';

async function pickOrgId(): Promise<{ orgId: string; role: OrgRole }> {
  let orgs = await fetchMyOrganizations();
  if (!orgs.length) {
    const orgId = await ensurePersonalWorkspace();
    orgs = await fetchMyOrganizations();
    if (!orgs.length && orgId) {
      return { orgId, role: 'owner' };
    }
  }
  if (!orgs.length) {
    const orgId = await ensurePersonalWorkspace();
    return { orgId, role: 'owner' };
  }

  let stored: string | null = null;
  try { stored = localStorage.getItem(ORG_KEY); } catch { /* ignore */ }
  const org = stored && orgs.some((o) => o.id === stored)
    ? orgs.find((o) => o.id === stored)!
    : orgs[0]!;
  return { orgId: org.id, role: org.role as OrgRole };
}

/** Pick workspace (create if missing), open latest project or create one — post-login entry. */
export async function resolvePostLoginEditorUrl(): Promise<string> {
  const { orgId, role } = await pickOrgId();
  try { localStorage.setItem(ORG_KEY, orgId); } catch { /* ignore */ }
  useWorkspaceStore.getState().setOrg(orgId, role);

  const projects = await listOrgProjects(orgId);
  if (projects.length > 0) return `/p/${projects[0]!.id}`;

  const id = await createCloudProject(orgId, 'Project 1');
  return `/p/${id}`;
}
