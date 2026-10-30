export class SupabaseRestError extends Error {
  code: string | null;
  constructor(message: string, code: string | null = null) {
    super(message);
    this.code = code;
  }
}

export function supabaseRestEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function supabaseRest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SupabaseRestError("Supabase not configured");
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.prefer) headers.set("Prefer", init.prefer);
  const { prefer: _prefer, ...request } = init;
  const res = await fetch(`${url}/rest/v1/${path}`, { ...request, headers });
  const text = await res.text();
  if (!res.ok) {
    let message = text || `Supabase ${res.status}`;
    let code: string | null = null;
    try {
      const body = JSON.parse(text) as { message?: string; code?: string };
      message = body.message || message;
      code = body.code || null;
    } catch { /* body is not JSON */ }
    throw new SupabaseRestError(message, code);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
