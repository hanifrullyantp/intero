-- Akun dan proyek 3D Intero (kitchen designer).
-- Hanya service role yang mengakses tabel ini. Tidak ada policy untuk anon.

CREATE TABLE IF NOT EXISTS public.kitchen_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kitchen_projects (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.kitchen_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kitchen_projects_user_updated_idx
  ON public.kitchen_projects (user_id, updated_at DESC);

ALTER TABLE public.kitchen_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_projects ENABLE ROW LEVEL SECURITY;
