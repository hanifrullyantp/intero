import type { SiteSettings } from "@/types/site-settings";
import { getDefaultSiteSettings, normalizeSiteSettings } from "@/types/site-settings";
import {
  getSupabaseBrowser,
  isSupabaseAdminUser,
  isSupabaseConfigured,
} from "@/lib/supabase";

export { isSupabaseConfigured };

function safeFileSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

async function fetchPublicSettingsSupabase(): Promise<SiteSettings> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from("site_settings").select("data").eq("id", "site").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.data) return getDefaultSiteSettings();
  return normalizeSiteSettings(data.data);
}

async function fetchAdminSettingsSupabase(): Promise<SiteSettings> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from("site_settings").select("data").eq("id", "site").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.data) return getDefaultSiteSettings();
  return normalizeSiteSettings(data.data);
}

async function saveAdminSettingsSupabase(s: SiteSettings): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("site_settings").upsert(
    {
      id: "site",
      data: s,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}

async function uploadFileSupabase(file: File): Promise<string> {
  const sb = getSupabaseBrowser();
  const path = `branding/${Date.now()}-${safeFileSegment(file.name)}`;
  const { error } = await sb.storage.from("site-uploads").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = sb.storage.from("site-uploads").getPublicUrl(path);
  return data.publicUrl;
}

async function submitLeadSupabase(fd: FormData): Promise<void> {
  const sb = getSupabaseBrowser();
  const name = String(fd.get("name") || "").trim();
  const whatsapp = String(fd.get("whatsapp") || "").trim();
  const city = String(fd.get("city") || "").trim();
  const needType = String(fd.get("need_type") || "").trim();
  const sizeEstimate = String(fd.get("size_estimate") || "").trim() || null;
  const budgetRange = String(fd.get("budget_range") || "").trim() || null;
  const notes = String(fd.get("notes") || "").trim() || null;
  const file = fd.get("reference");
  let referencePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const path = `refs/${Date.now()}-${safeFileSegment(file.name)}`;
    const { error: upErr } = await sb.storage.from("site-uploads").upload(path, file);
    if (upErr) throw new Error(upErr.message);
    const { data } = sb.storage.from("site-uploads").getPublicUrl(path);
    referencePath = data.publicUrl;
  }
  const { error } = await sb.from("leads").insert({
    name,
    whatsapp,
    city,
    need_type: needType,
    size_estimate: sizeEstimate,
    budget_range: budgetRange,
    notes,
    reference_path: referencePath,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    crm_status: "baru",
    crm_category: "",
    admin_notes: "",
    follow_up_count: 0,
  });
  if (error) throw new Error(error.message);
}

export async function fetchPublicSettings(): Promise<SiteSettings> {
  if (isSupabaseConfigured()) {
    return fetchPublicSettingsSupabase();
  }
  const r = await fetch("/api/public/settings");
  if (!r.ok) throw new Error("Gagal memuat pengaturan");
  const data = (await r.json()) as unknown;
  return normalizeSiteSettings(data);
}

export async function loginAdmin(usernameOrEmail: string, password: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseBrowser();
    const { data, error } = await sb.auth.signInWithPassword({
      email: usernameOrEmail.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    if (!isSupabaseAdminUser(data.user)) {
      await sb.auth.signOut();
      throw new Error("Akun ini bukan admin (perlu app_metadata.role = admin)");
    }
    return;
  }
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username: usernameOrEmail, password }),
  });
  if (!r.ok) throw new Error("Login gagal");
}

export async function logoutAdmin(): Promise<void> {
  if (isSupabaseConfigured()) {
    await getSupabaseBrowser().auth.signOut();
    return;
  }
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function fetchAdminMe(): Promise<{ user: string } | null> {
  if (isSupabaseConfigured()) {
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    if (!session?.user || !isSupabaseAdminUser(session.user)) return null;
    return { user: session.user.email ?? session.user.id };
  }
  const r = await fetch("/api/auth/me", { credentials: "include" });
  if (!r.ok) return null;
  return r.json() as Promise<{ user: string }>;
}

export async function fetchAdminSettings(): Promise<SiteSettings> {
  if (isSupabaseConfigured()) {
    return fetchAdminSettingsSupabase();
  }
  const r = await fetch("/api/admin/settings", { credentials: "include" });
  if (!r.ok) throw new Error("Unauthorized");
  const data = (await r.json()) as unknown;
  return normalizeSiteSettings(data);
}

export async function saveAdminSettings(s: SiteSettings): Promise<void> {
  if (isSupabaseConfigured()) {
    return saveAdminSettingsSupabase(s);
  }
  const r = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(s),
  });
  if (!r.ok) throw new Error("Gagal menyimpan");
}

export async function uploadFile(file: File): Promise<string> {
  if (isSupabaseConfigured()) {
    return uploadFileSupabase(file);
  }
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/upload", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!r.ok) throw new Error("Upload gagal");
  const j = (await r.json()) as { url: string };
  return j.url;
}

export type LeadRow = {
  id: string | number;
  name: string;
  whatsapp: string;
  city: string;
  need_type: string;
  size_estimate: string | null;
  budget_range: string | null;
  notes: string | null;
  reference_path: string | null;
  created_at: string;
  crm_status?: string | null;
  crm_category?: string | null;
  admin_notes?: string | null;
  last_follow_up_key?: string | null;
  follow_up_count?: number | null;
  updated_at?: string | null;
};

export type LeadUpdatePayload = Partial<{
  crm_status: string;
  crm_category: string;
  admin_notes: string;
  last_follow_up_key: string;
  follow_up_count: number;
}>;

async function fetchLeadsSupabase(): Promise<LeadRow[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadRow[];
}

export async function fetchLeads(): Promise<LeadRow[]> {
  if (isSupabaseConfigured()) {
    return fetchLeadsSupabase();
  }
  const r = await fetch("/api/admin/leads", { credentials: "include" });
  if (!r.ok) throw new Error("Gagal memuat leads");
  return r.json() as Promise<LeadRow[]>;
}

export async function updateLead(id: string | number, patch: LeadUpdatePayload): Promise<void> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseBrowser();
    const { error } = await sb
      .from("leads")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const r = await fetch(`/api/admin/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Gagal memperbarui lead");
  }
}

export type CreateManualLeadPayload = {
  name: string;
  whatsapp: string;
  city: string;
  need_type: string;
  size_estimate?: string | null;
  budget_range?: string | null;
  notes?: string | null;
  crm_status?: string;
  crm_category?: string;
};

/** Lead baru dari admin (tanpa upload file). */
export async function createLeadManual(p: CreateManualLeadPayload): Promise<{ id?: string | number }> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseBrowser();
    const { data, error } = await sb
      .from("leads")
      .insert({
        name: p.name.trim(),
        whatsapp: p.whatsapp.trim(),
        city: p.city.trim(),
        need_type: p.need_type.trim(),
        size_estimate: p.size_estimate?.trim() || null,
        budget_range: p.budget_range?.trim() || null,
        notes: p.notes?.trim() || null,
        user_agent: "admin-manual",
        crm_status: (p.crm_status || "baru").trim() || "baru",
        crm_category: (p.crm_category || "").trim(),
        follow_up_count: 0,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data?.id };
  }
  const r = await fetch("/api/admin/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(p),
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Gagal menyimpan lead");
  }
  const j = (await r.json()) as { id?: number };
  return { id: j.id };
}

export async function deleteLead(id: string | number): Promise<void> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseBrowser();
    const { error } = await sb.from("leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const r = await fetch(`/api/admin/leads/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) throw new Error("Gagal hapus");
}

export async function submitLead(fd: FormData): Promise<void> {
  if (isSupabaseConfigured()) {
    return submitLeadSupabase(fd);
  }
  const r = await fetch("/api/leads", { method: "POST", body: fd });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(e.error || "Gagal mengirim");
  }
}
