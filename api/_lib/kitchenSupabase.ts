import type { KitchenProjectMeta, KitchenStore } from "./kitchenStore.js";
import { SupabaseRestError, supabaseRest, supabaseRestEnabled } from "./supabaseRest.js";

export function kitchenSupabaseEnabled(): boolean {
  return supabaseRestEnabled();
}

function meta(row: { id: string; name: string; updated_at: string }): KitchenProjectMeta {
  return { id: row.id, name: row.name, updatedAt: row.updated_at };
}

function q(value: string): string {
  return encodeURIComponent(value);
}

export const supabaseKitchenStore: KitchenStore = {
  async createUser(input) {
    try {
      await supabaseRest("kitchen_users", {
        method: "POST",
        prefer: "return=minimal",
        body: JSON.stringify({ id: input.id, email: input.email, name: input.name, password_hash: input.passwordHash }),
      });
      return "ok";
    } catch (error) {
      if (error instanceof SupabaseRestError && (error.code === "23505" || /duplicate/i.test(error.message))) return "exists";
      throw error;
    }
  },
  async userByEmail(email) {
    const rows = await supabaseRest<Array<{ id: string; email: string; name: string; password_hash: string }>>(
      `kitchen_users?select=id,email,name,password_hash&email=eq.${q(email)}&limit=1`,
    );
    const row = rows?.[0];
    if (!row) return null;
    return { id: row.id, email: row.email, name: row.name, passwordHash: row.password_hash };
  },
  async listProjects(userId) {
    const rows = await supabaseRest<Array<{ id: string; name: string; updated_at: string }>>(
      `kitchen_projects?select=id,name,updated_at&user_id=eq.${q(userId)}&order=updated_at.desc&limit=100`,
    );
    return (rows || []).map(meta);
  },
  async getProject(userId, id) {
    const rows = await supabaseRest<Array<{ id: string; name: string; updated_at: string; payload: unknown }>>(
      `kitchen_projects?select=id,name,updated_at,payload&user_id=eq.${q(userId)}&id=eq.${q(id)}&limit=1`,
    );
    const row = rows?.[0];
    if (!row) return null;
    return { ...meta(row), payload: row.payload };
  },
  async saveProject(userId, input) {
    const now = new Date().toISOString();
    if (input.id) {
      const existing = await this.getProject(userId, input.id);
      if (!existing) throw new Error("Proyek tidak ditemukan di akun ini");
      await supabaseRest(`kitchen_projects?id=eq.${q(input.id)}&user_id=eq.${q(userId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ name: input.name, payload: input.payload, updated_at: now }),
      });
      return { id: input.id, name: input.name, updatedAt: now };
    }
    const id = crypto.randomUUID();
    await supabaseRest("kitchen_projects", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ id, user_id: userId, name: input.name, payload: input.payload, updated_at: now }),
    });
    return { id, name: input.name, updatedAt: now };
  },
  async deleteProject(userId, id) {
    const existing = await this.getProject(userId, id);
    if (!existing) return false;
    await supabaseRest(`kitchen_projects?id=eq.${q(id)}&user_id=eq.${q(userId)}`, { method: "DELETE", prefer: "return=minimal" });
    return true;
  },
};
