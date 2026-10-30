import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { KitchenProjectMeta, KitchenStore } from "./kitchenStore.ts";

let admin: SupabaseClient | null = null;

export function kitchenSupabaseEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function client(): SupabaseClient {
  if (!kitchenSupabaseEnabled()) throw new Error("Supabase not configured");
  if (!admin) {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

function meta(row: { id: string; name: string; updated_at: string }): KitchenProjectMeta {
  return { id: row.id, name: row.name, updatedAt: row.updated_at };
}

export const supabaseKitchenStore: KitchenStore = {
  async createUser(input) {
    const { error } = await client().from("kitchen_users").insert({
      id: input.id,
      email: input.email,
      name: input.name,
      password_hash: input.passwordHash,
    });
    if (error) {
      if (error.code === "23505" || /duplicate/i.test(error.message)) return "exists";
      throw new Error(error.message);
    }
    return "ok";
  },
  async userByEmail(email) {
    const { data, error } = await client().from("kitchen_users").select("id, email, name, password_hash").eq("email", email).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as { id: string; email: string; name: string; password_hash: string };
    return { id: row.id, email: row.email, name: row.name, passwordHash: row.password_hash };
  },
  async listProjects(userId) {
    const { data, error } = await client().from("kitchen_projects").select("id, name, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return ((data || []) as { id: string; name: string; updated_at: string }[]).map(meta);
  },
  async getProject(userId, id) {
    const { data, error } = await client().from("kitchen_projects").select("id, name, updated_at, payload").eq("user_id", userId).eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as { id: string; name: string; updated_at: string; payload: unknown };
    return { ...meta(row), payload: row.payload };
  },
  async saveProject(userId, input) {
    const sb = client();
    const now = new Date().toISOString();
    if (input.id) {
      const existing = await this.getProject(userId, input.id);
      if (!existing) throw new Error("Proyek tidak ditemukan di akun ini");
      const { error } = await sb.from("kitchen_projects").update({ name: input.name, payload: input.payload, updated_at: now }).eq("id", input.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: input.id, name: input.name, updatedAt: now };
    }
    const id = crypto.randomUUID();
    const { error } = await sb.from("kitchen_projects").insert({ id, user_id: userId, name: input.name, payload: input.payload, updated_at: now });
    if (error) throw new Error(error.message);
    return { id, name: input.name, updatedAt: now };
  },
  async deleteProject(userId, id) {
    const existing = await this.getProject(userId, id);
    if (!existing) return false;
    const { error } = await client().from("kitchen_projects").delete().eq("id", id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return true;
  },
};
