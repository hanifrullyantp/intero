export type KitchenUserRow = { id: string; email: string; name: string; passwordHash: string };
export type KitchenProjectMeta = { id: string; name: string; updatedAt: string };
export type KitchenProjectRow = KitchenProjectMeta & { payload: unknown };

export interface KitchenStore {
  createUser(input: { id: string; email: string; name: string; passwordHash: string }): Promise<"ok" | "exists">;
  userByEmail(email: string): Promise<KitchenUserRow | null>;
  listProjects(userId: string): Promise<KitchenProjectMeta[]>;
  getProject(userId: string, id: string): Promise<KitchenProjectRow | null>;
  saveProject(userId: string, input: { id?: string | null; name: string; payload: unknown }): Promise<KitchenProjectMeta>;
  deleteProject(userId: string, id: string): Promise<boolean>;
}

export function friendlyDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/kitchen_|schema cache|relation|does not exist/i.test(message)) {
    return "Database proyek belum siap. Jalankan migrasi kitchen_projects di Supabase.";
  }
  return message || "Gagal mengakses database";
}
