import { getSupabase } from '../lib/supabase';
import type { Project } from '../models/types';
import { createStarterProject } from '../core/starterProject';

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updated_at: string;
  revision: number;
}

/** Creates profile + org + membership when signup trigger did not run (legacy users). */
export async function ensurePersonalWorkspace(): Promise<string> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('ensure_personal_workspace');
  if (error) {
    if (error.message.includes('Could not find the function') || error.code === 'PGRST202') {
      throw new Error('Server belum di-update: jalankan migrasi ensure_personal_workspace di Supabase.');
    }
    throw new Error(error.message);
  }
  if (!data) throw new Error('Gagal membuat workspace.');
  return data as string;
}

export async function fetchMyOrganizations(): Promise<OrgSummary[]> {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data: memberships, error: mErr } = await sb
    .from('organization_members')
    .select('org_id, role, organizations(id, name, slug, plan)')
    .eq('user_id', user.id);
  if (mErr) throw new Error(mErr.message);
  return (memberships ?? []).map((row) => {
    const raw = row.organizations as { id: string; name: string; slug: string; plan: string } | { id: string; name: string; slug: string; plan: string }[];
    const org = Array.isArray(raw) ? raw[0]! : raw;
    return { id: org.id, name: org.name, slug: org.slug, plan: org.plan, role: row.role as string };
  });
}

export async function listOrgProjects(orgId: string): Promise<ProjectSummary[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('projects')
    .select('id, name, updated_at, revision')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchProjectPayload(projectId: string): Promise<Project> {
  const sb = getSupabase();
  const { data, error } = await sb.from('project_data').select('payload').eq('project_id', projectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.payload) throw new Error('Project not found');
  const raw = data.payload as { project?: Project } | Project;
  return ('project' in (raw as object) ? (raw as { project: Project }).project : raw) as Project;
}

export async function createCloudProject(orgId: string, name: string, payload?: Project): Promise<string> {
  const sb = getSupabase();
  const body = payload ?? createStarterProject(name);
  const { data, error } = await sb.rpc('create_org_project', {
    p_org_id: orgId,
    p_name: name,
    p_payload: { app: 'Instant 3D', version: 1, project: body },
  });
  if (error) {
    if (error.message.includes('project_limit')) throw new Error('Free plan limit: maximum 3 projects. Upgrade coming soon.');
    throw new Error(error.message);
  }
  return data as string;
}

export async function saveCloudProject(projectId: string, project: Project): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc('save_org_project', {
    p_project_id: projectId,
    p_payload: { app: 'Instant 3D', version: 1, project },
    p_name: project.name,
  });
  if (error) throw new Error(error.message);
}

export async function softDeleteProject(projectId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function renameProject(projectId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nama proyek tidak boleh kosong.');
  const sb = getSupabase();
  const { error } = await sb.from('projects').update({ name: trimmed }).eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function duplicateCloudProject(orgId: string, sourceProjectId: string): Promise<string> {
  const payload = await fetchProjectPayload(sourceProjectId);
  const copyName = `${payload.name || 'Project'} (salinan)`;
  return createCloudProject(orgId, copyName, { ...payload, name: copyName });
}
