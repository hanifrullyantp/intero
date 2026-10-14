import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 15 };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sb = supabaseAdmin();
  if (!sb) {
    return json({ error: "Share API not configured" }, 503);
  }
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) {
    return json({ error: "Invalid id" }, 400);
  }
  try {
    const { data, error } = await sb.from("instant3d_shares").select("name, payload").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return json({ error: "Not found" }, 404);
    return json({ name: data.name, payload: data.payload });
  } catch (e) {
    return json({ error: (e as Error).message || "Failed to load share" }, 500);
  }
}
