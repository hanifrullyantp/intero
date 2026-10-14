import { getShareSupabase, supabaseSharesEnabled } from "../../../../server/supabaseShares.ts";

export const config = { maxDuration: 15 };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!supabaseSharesEnabled()) {
    return json({ error: "Share API not configured" }, 503);
  }
  const { id } = await context.params;
  try {
    const row = await getShareSupabase(id);
    if (!row) return json({ error: "Not found" }, 404);
    return json({ name: row.name, payload: row.payload });
  } catch (e) {
    return json({ error: (e as Error).message || "Failed to load share" }, 500);
  }
}
