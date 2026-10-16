-- Backfill / lazy-create personal workspace for users without org (pre-trigger signups)

CREATE OR REPLACE FUNCTION public.ensure_personal_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_name text;
  base_slug text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT m.org_id INTO v_org_id
  FROM public.organization_members m
  WHERE m.user_id = v_uid
  ORDER BY m.created_at ASC
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  SELECT COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
  INTO v_name
  FROM auth.users u
  WHERE u.id = v_uid;

  v_name := COALESCE(NULLIF(trim(v_name), ''), 'Workspace');

  INSERT INTO public.profiles (id, display_name)
  VALUES (v_uid, v_name)
  ON CONFLICT (id) DO UPDATE
  SET display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);

  base_slug := 'ws-' || replace(v_uid::text, '-', '');

  INSERT INTO public.organizations (name, slug, plan)
  VALUES (v_name || ' — Instant 3D', base_slug, 'free')
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_uid, 'owner');

  INSERT INTO public.usage_counters (org_id)
  VALUES (v_org_id)
  ON CONFLICT (org_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_personal_workspace() TO authenticated;
