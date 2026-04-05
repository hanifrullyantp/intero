import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.length &&
      import.meta.env.VITE_SUPABASE_ANON_KEY?.length,
  );
}

export function getSupabaseBrowser(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diset");
  }
  if (!browserClient) {
    browserClient = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
  return browserClient;
}

export function isSupabaseAdminUser(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  return user?.app_metadata?.role === "admin";
}
