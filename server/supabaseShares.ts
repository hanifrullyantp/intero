import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { newShareId } from "./instant3dShares.ts";

let admin: SupabaseClient | null = null;

export function supabaseSharesEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function client(): SupabaseClient {
  if (!supabaseSharesEnabled()) throw new Error("Supabase not configured");
  if (!admin) {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export async function createShareSupabase(name: string, project: unknown): Promise<{ id: string }> {
  const id = newShareId();
  const payload = { app: "Instant 3D", version: 1, project };
  const { error } = await client().from("instant3d_shares").insert({ id, name: name.slice(0, 200), payload });
  if (error) throw new Error(error.message);
  return { id };
}

export async function getShareSupabase(id: string): Promise<{ name: string; payload: unknown } | null> {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) return null;
  const { data, error } = await client().from("instant3d_shares").select("name, payload").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { name: data.name as string, payload: data.payload };
}
