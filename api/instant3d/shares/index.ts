import { createShareSupabase, supabaseSharesEnabled } from "../../../server/supabaseShares.ts";

export const config = { maxDuration: 30 };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  if (!supabaseSharesEnabled()) {
    return json({ error: "Share API not configured (Supabase env missing)" }, 503);
  }
  try {
    const body = (await request.json()) as { project?: unknown; name?: string };
    const project = body?.project;
    if (!project || typeof project !== "object") {
      return json({ error: "Missing project" }, 400);
    }
    const name = String((project as { name?: string }).name || body.name || "Shared project");
    const { id } = await createShareSupabase(name, project);
    return json({ id });
  } catch (e) {
    return json({ error: (e as Error).message || "Failed to create share" }, 500);
  }
}
