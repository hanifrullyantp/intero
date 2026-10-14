import { createClient } from "@supabase/supabase-js";
import { newShareId } from "../../_lib/shareId.ts";

export const config = { maxDuration: 30 };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  const sb = supabaseAdmin();
  if (!sb) {
    return json({ error: "Share API not configured (Supabase env missing)" }, 503);
  }
  try {
    const body = (await request.json()) as { project?: unknown; name?: string };
    const project = body?.project;
    if (!project || typeof project !== "object") {
      return json({ error: "Missing project" }, 400);
    }
    const name = String((project as { name?: string }).name || body.name || "Shared project");
    const id = newShareId();
    const payload = { app: "Instant 3D", version: 1, project };
    const { error } = await sb.from("instant3d_shares").insert({ id, name: name.slice(0, 200), payload });
    if (error) throw new Error(error.message);
    return json({ id });
  } catch (e) {
    return json({ error: (e as Error).message || "Failed to create share" }, 500);
  }
}
