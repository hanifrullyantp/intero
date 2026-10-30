import { newShareId } from "../../_lib/shareId.js";
import { SupabaseRestError, supabaseRest, supabaseRestEnabled } from "../../_lib/supabaseRest.js";

export const config = { maxDuration: 30 };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  if (!supabaseRestEnabled()) {
    return json({ error: "Share API not configured (Supabase env missing)" }, 503);
  }
  try {
    const body = (await request.json()) as { project?: unknown; name?: string; app?: string; mode?: string };
    const project = body?.project;
    if (!project || typeof project !== "object") {
      return json({ error: "Missing project" }, 400);
    }
    const rec = project as { name?: string; projectName?: string };
    const name = String(body.name || rec.projectName || rec.name || "Shared project");
    const id = newShareId();
    const payload = body.app === "3d-intero"
      ? { app: "3d-intero", version: 1, mode: body.mode === "edit" ? "edit" : "view", project }
      : { app: "Instant 3D", version: 1, project };
    await supabaseRest("instant3d_shares", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ id, name: name.slice(0, 200), payload }),
    });
    return json({ id });
  } catch (error) {
    const message = error instanceof SupabaseRestError ? error.message : (error as Error).message;
    return json({ error: message || "Failed to create share" }, 500);
  }
}
