-- ============================================================
-- Migration 003 — Case-insensitive email linking
--
-- is_email_allowed() (migration 002) already compares emails
-- case-insensitively, but handle_new_user() and
-- link_user_to_institution() (migration 001) matched emails
-- exactly. That mismatch meant an admin who pre-approved
-- "Student@Example.com" would pass the signup allow-list check
-- yet never get linked to the institution (the trigger compared
-- against the lower-cased auth.users.email and found no row),
-- leaving the user stranded on /no-access.
--
-- This migration replaces both functions so every email
-- comparison is case-insensitive.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup_type      TEXT;
  v_institution_name TEXT;
  v_institution_slug TEXT;
  v_new_institution  UUID;
  v_allowed          RECORD;
BEGIN
  v_signup_type := NEW.raw_user_meta_data->>'signup_type';

  -- Always create the profile row first
  INSERT INTO public.profiles (id, email, full_name, mobile)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'mobile'
  );

  IF v_signup_type = 'institution_admin' THEN

    v_institution_name := NEW.raw_user_meta_data->>'institution_name';
    v_institution_slug := NEW.raw_user_meta_data->>'institution_slug';

    INSERT INTO public.institutions (name, slug)
    VALUES (v_institution_name, v_institution_slug)
    RETURNING id INTO v_new_institution;

    INSERT INTO public.institution_members (institution_id, user_id, role)
    VALUES (v_new_institution, NEW.id, 'admin');

  ELSIF v_signup_type = 'student' THEN

    -- Link to every institution that pre-approved this email (case-insensitive)
    FOR v_allowed IN
      SELECT id, institution_id, role
      FROM   public.institution_allowed_emails
      WHERE  lower(email) = lower(NEW.email)
        AND  status = 'pending'
    LOOP
      INSERT INTO public.institution_members (institution_id, user_id, role)
      VALUES (v_allowed.institution_id, NEW.id, v_allowed.role)
      ON CONFLICT (institution_id, user_id) DO NOTHING;

      UPDATE public.institution_allowed_emails
      SET    status = 'joined'
      WHERE  id     = v_allowed.id;
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_user_to_institution(
  p_institution_id UUID,
  p_email          TEXT,
  p_role           TEXT,
  p_added_by       UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_result     JSONB;
BEGIN
  -- Caller must be an admin of this institution
  IF NOT public.is_admin_of(p_institution_id) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT id INTO v_profile_id
  FROM   public.profiles
  WHERE  lower(email) = lower(p_email);

  IF v_profile_id IS NOT NULL THEN
    -- Account exists → link immediately
    INSERT INTO public.institution_members (institution_id, user_id, role)
    VALUES (p_institution_id, v_profile_id, p_role)
    ON CONFLICT (institution_id, user_id) DO NOTHING;

    INSERT INTO public.institution_allowed_emails
           (institution_id, email, role, added_by, status)
    VALUES (p_institution_id, lower(p_email), p_role, p_added_by, 'joined')
    ON CONFLICT (institution_id, email)
    DO UPDATE SET status   = 'joined',
                  role     = EXCLUDED.role,
                  added_by = EXCLUDED.added_by;

    v_result := jsonb_build_object('linked', true, 'status', 'joined');
  ELSE
    -- No account yet → add to whitelist; trigger links them on signup
    INSERT INTO public.institution_allowed_emails
           (institution_id, email, role, added_by, status)
    VALUES (p_institution_id, lower(p_email), p_role, p_added_by, 'pending')
    ON CONFLICT (institution_id, email)
    DO UPDATE SET role     = EXCLUDED.role,
                  added_by = EXCLUDED.added_by;

    v_result := jsonb_build_object('linked', false, 'status', 'pending');
  END IF;

  RETURN v_result;
END;
$$;
