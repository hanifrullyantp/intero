-- Instant 3D SaaS: organizations, projects, RLS, free-tier RPCs

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  limits jsonb NOT NULL DEFAULT '{"maxProjects":3,"maxStorageBytes":100000000,"maxMembers":1}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','designer','viewer','client')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  name text NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  storage_mode text NOT NULL DEFAULT 'hybrid' CHECK (storage_mode IN ('cloud','local_only','hybrid')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS projects_org_id_idx ON public.projects (org_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_data (
  project_id uuid PRIMARY KEY REFERENCES public.projects ON DELETE CASCADE,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage_counters (
  org_id uuid PRIMARY KEY REFERENCES public.organizations ON DELETE CASCADE,
  projects_count integer NOT NULL DEFAULT 0,
  storage_bytes bigint NOT NULL DEFAULT 0,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date
);

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid, p_roles text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = p_org_id
      AND m.user_id = auth.uid()
      AND (p_roles IS NULL OR m.role = ANY (p_roles))
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS orgs_select_member ON public.organizations;
CREATE POLICY orgs_select_member ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));

DROP POLICY IF EXISTS members_select_same_org ON public.organization_members;
CREATE POLICY members_select_same_org ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS projects_select_member ON public.projects;
CREATE POLICY projects_select_member ON public.projects FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS projects_update_designer ON public.projects;
CREATE POLICY projects_update_designer ON public.projects FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND public.is_org_member(org_id, ARRAY['owner','admin','designer']));

DROP POLICY IF EXISTS project_data_select ON public.project_data;
CREATE POLICY project_data_select ON public.project_data FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.deleted_at IS NULL AND public.is_org_member(p.org_id)
    )
  );

DROP POLICY IF EXISTS project_data_update ON public.project_data;
CREATE POLICY project_data_update ON public.project_data FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.deleted_at IS NULL
        AND public.is_org_member(p.org_id, ARRAY['owner','admin','designer'])
    )
  );

DROP POLICY IF EXISTS usage_select_member ON public.usage_counters;
CREATE POLICY usage_select_member ON public.usage_counters FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE OR REPLACE FUNCTION public.handle_new_instant3d_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  base_slug text;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  base_slug := 'ws-' || substr(replace(NEW.id::text, '-', ''), 1, 12);
  INSERT INTO public.organizations (name, slug, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Workspace') || ' — Instant 3D',
    base_slug,
    'free'
  )
  RETURNING id INTO new_org_id;
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');
  INSERT INTO public.usage_counters (org_id) VALUES (new_org_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_instant3d ON auth.users;
CREATE TRIGGER on_auth_user_created_instant3d
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_instant3d_user();

CREATE OR REPLACE FUNCTION public.create_org_project(p_org_id uuid, p_name text, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_max int;
  v_count int;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.is_org_member(p_org_id, ARRAY['owner','admin','designer']) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT (limits->>'maxProjects')::int INTO v_max FROM public.organizations WHERE id = p_org_id;
  SELECT projects_count INTO v_count FROM public.usage_counters WHERE org_id = p_org_id;
  IF v_count >= v_max THEN RAISE EXCEPTION 'project_limit'; END IF;
  INSERT INTO public.projects (org_id, name, updated_by)
  VALUES (p_org_id, left(p_name, 200), v_uid)
  RETURNING id INTO v_new_id;
  INSERT INTO public.project_data (project_id, payload) VALUES (v_new_id, p_payload);
  UPDATE public.usage_counters SET projects_count = projects_count + 1 WHERE org_id = p_org_id;
  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_org_project(uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_org_project(p_project_id uuid, p_payload jsonb, p_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT org_id INTO v_org FROM public.projects WHERE id = p_project_id AND deleted_at IS NULL;
  IF v_org IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.is_org_member(v_org, ARRAY['owner','admin','designer']) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.project_data SET payload = p_payload, updated_at = now() WHERE project_id = p_project_id;
  UPDATE public.projects
  SET updated_at = now(), updated_by = auth.uid(), revision = revision + 1,
      name = COALESCE(left(p_name, 200), name)
  WHERE id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_org_project(uuid, jsonb, text) TO authenticated;
