-- Intero CMS: jalankan di Supabase → SQL Editor (satu kali), atau: supabase db push
-- Setelah itu: buat user admin di Authentication, lalu User Metadata (raw): { "role": "admin" }

CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY DEFAULT 'site',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  city text NOT NULL,
  need_type text NOT NULL,
  size_estimate text,
  budget_range text,
  notes text,
  reference_path text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_public" ON public.site_settings;
CREATE POLICY "settings_select_public" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings_insert_admin" ON public.site_settings;
CREATE POLICY "settings_insert_admin" ON public.site_settings
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "settings_update_admin" ON public.site_settings;
CREATE POLICY "settings_update_admin" ON public.site_settings
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "leads_insert_public" ON public.leads;
CREATE POLICY "leads_insert_public" ON public.leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "leads_select_admin" ON public.leads;
CREATE POLICY "leads_select_admin" ON public.leads
  FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "leads_delete_admin" ON public.leads;
CREATE POLICY "leads_delete_admin" ON public.leads
  FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-uploads', 'site-uploads', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "site_uploads_select" ON storage.objects;
CREATE POLICY "site_uploads_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-uploads');

DROP POLICY IF EXISTS "site_uploads_insert_refs_anon" ON storage.objects;
CREATE POLICY "site_uploads_insert_refs_anon" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'site-uploads'
    AND name LIKE 'refs/%'
  );

DROP POLICY IF EXISTS "site_uploads_insert_admin" ON storage.objects;
CREATE POLICY "site_uploads_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-uploads'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "site_uploads_delete_admin" ON storage.objects;
CREATE POLICY "site_uploads_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'site-uploads'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
