import { create } from 'zustand';
import type { OrgRole } from '../permissions/roles';
import type { SyncStatus } from '../sync/syncEngine';

interface WorkspaceState {
  accessMode: 'edit' | 'view';
  currentOrgId: string | null;
  currentOrgRole: OrgRole | null;
  activeCloudProjectId: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  setOrg: (orgId: string | null, role: OrgRole | null) => void;
  setActiveProject: (cloudId: string | null) => void;
  setSyncStatus: (s: SyncStatus) => void;
  setSyncError: (msg: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  accessMode: 'edit',
  currentOrgId: null,
  currentOrgRole: null,
  activeCloudProjectId: null,
  syncStatus: navigator.onLine ? 'synced' : 'offline',
  syncError: null,
  setOrg: (orgId, role) => set({ currentOrgId: orgId, currentOrgRole: role }),
  setActiveProject: (cloudId) => set({ activeCloudProjectId: cloudId }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSyncError: (syncError) => set({ syncError }),
}));
