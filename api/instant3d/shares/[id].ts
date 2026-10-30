import { supabaseRest, supabaseRestEnabled } from "../../_lib/supabaseRest.ts";

export const config = { maxDuration: 15 };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
}

async function shareId(request: Request, context?: { params?: { id?: string } | Promise<{ id?: string }> }): Promise<string> {
  try {
    const params = context?.params ? await context.params : undefined;
    if (params?.id) return params.id;
  } catch { /* pathname fallback */ }
  const part = new URL(request.url).pathname.split("/").filter(Boolean).pop() || "";
  return decodeURIComponent(part);
}

export async function GET(request: Request, context?: { params?: { id?: string } | Promise<{ id?: string }> }) {
  if (!supabaseRestEnabled()) return json({ error: "Share API not configured" }, 503);
  const id = await shareId(request, context);
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) return json({ error: "Invalid id" }, 400);
  try {
    const rows = await supabaseRest<Array<{ name: string; payload: unknown }>>(
      `instant3d_shares?select=name,payload&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    const data = rows?.[0];
    if (!data) return json({ error: "Not found" }, 404);
    return json({ name: data.name, payload: data.payload });
  } catch (error) {
    return json({ error: (error as Error).message || "Failed to load share" }, 500);
  }
}
