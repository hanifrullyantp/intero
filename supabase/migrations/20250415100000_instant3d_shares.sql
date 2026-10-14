-- Public read-only shares for Instant 3D (view link, no login)

CREATE TABLE IF NOT EXISTS public.instant3d_shares (
  id text PRIMARY KEY,
  name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instant3d_shares_created_at_idx ON public.instant3d_shares (created_at DESC);

ALTER TABLE public.instant3d_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instant3d_shares_select_public" ON public.instant3d_shares;
CREATE POLICY "instant3d_shares_select_public" ON public.instant3d_shares
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "instant3d_shares_insert_anon" ON public.instant3d_shares;
CREATE POLICY "instant3d_shares_insert_anon" ON public.instant3d_shares
  FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(id) >= 8 AND char_length(id) <= 32);
