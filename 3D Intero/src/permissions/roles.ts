export type OrgRole = 'owner' | 'admin' | 'designer' | 'viewer' | 'client';

const DESIGNER_PLUS: OrgRole[] = ['owner', 'admin', 'designer'];

export function canEditProjects(role: OrgRole | null): boolean {
  return role != null && DESIGNER_PLUS.includes(role);
}

export function canManageMembers(role: OrgRole | null): boolean {
  return role === 'owner' || role === 'admin';
}
