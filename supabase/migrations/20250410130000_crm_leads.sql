-- CRM: kolom pipeline + follow-up + policy UPDATE untuk admin

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS crm_status text DEFAULT 'baru';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS crm_category text DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_follow_up_key text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_count integer DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "leads_update_admin" ON public.leads;
CREATE POLICY "leads_update_admin" ON public.leads
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
