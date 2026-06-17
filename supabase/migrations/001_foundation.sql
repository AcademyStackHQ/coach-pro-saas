-- ============================================================
-- Migration 001 — Foundation & Auth
-- Tables: institutions, profiles, institution_members,
--         institution_allowed_emails
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE public.institutions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  slug                TEXT        NOT NULL,
  logo_url            TEXT,
  sports              TEXT[]      DEFAULT '{}',
  timezone            TEXT        DEFAULT 'Asia/Kolkata',
  plan                TEXT        DEFAULT 'free'
                                  CHECK (plan IN ('free', 'pro', 'enterprise')),
  sms_credits         INT         DEFAULT 0,
  working_hours       JSONB       DEFAULT '{}',
  onboarding_complete BOOLEAN     DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT institutions_name_unique UNIQUE (name),
  CONSTRAINT institutions_slug_unique UNIQUE (slug)
);

-- One row per person regardless of how many institutions they belong to.
-- Role lives in institution_members, not here.
CREATE TABLE public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  full_name  TEXT,
  mobile     TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Join table: one row per (user, institution) pair.
CREATE TABLE public.institution_members (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id)  ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  role           TEXT        NOT NULL CHECK (role IN ('admin', 'coach', 'student')),
  status         TEXT        DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT institution_members_unique UNIQUE (institution_id, user_id)
);

-- Admin pre-approves emails before the user signs up.
-- Unique constraint enforces the "email + institution must be unique" rule.
CREATE TABLE public.institution_allowed_emails (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id)  ON DELETE CASCADE,
  email          TEXT        NOT NULL,
  role           TEXT        NOT NULL CHECK (role IN ('student', 'coach')),
  added_by       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  status         TEXT        DEFAULT 'pending' CHECK (status IN ('pending', 'joined')),
  created_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT institution_allowed_emails_unique UNIQUE (institution_id, email)
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_institutions_slug
  ON public.institutions (slug);

CREATE INDEX idx_profiles_email
  ON public.profiles (email);

CREATE INDEX idx_institution_members_user_id
  ON public.institution_members (user_id);

CREATE INDEX idx_institution_members_institution_id
  ON public.institution_members (institution_id);

CREATE INDEX idx_allowed_emails_email
  ON public.institution_allowed_emails (email);

CREATE INDEX idx_allowed_emails_institution_id
  ON public.institution_allowed_emails (institution_id);

-- Partial index — only pending rows are queried by the trigger
CREATE INDEX idx_allowed_emails_pending
  ON public.institution_allowed_emails (email)
  WHERE status = 'pending';


-- ============================================================
-- 3. HELPER FUNCTION (bypasses RLS — used inside RLS policies
--    to avoid infinite recursion on institution_members)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_institution_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT institution_id
    FROM   public.institution_members
    WHERE  user_id = auth.uid()
      AND  status  = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.institution_members
    WHERE  institution_id = p_institution_id
      AND  user_id        = auth.uid()
      AND  role           = 'admin'
      AND  status         = 'active'
  );
$$;


-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.institutions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_allowed_emails ENABLE ROW LEVEL SECURITY;

-- institutions
CREATE POLICY "members can read their institution"
  ON public.institutions FOR SELECT
  USING (id = ANY(public.get_my_institution_ids()));

CREATE POLICY "admins can update their institution"
  ON public.institutions FOR UPDATE
  USING (public.is_admin_of(id));

-- profiles
CREATE POLICY "users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "members of shared institution can read each other"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT user_id
      FROM   public.institution_members
      WHERE  institution_id = ANY(public.get_my_institution_ids())
    )
  );

CREATE POLICY "users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- institution_members
CREATE POLICY "members can view their institution roster"
  ON public.institution_members FOR SELECT
  USING (institution_id = ANY(public.get_my_institution_ids()));

CREATE POLICY "admins can add members"
  ON public.institution_members FOR INSERT
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins can update member status"
  ON public.institution_members FOR UPDATE
  USING (public.is_admin_of(institution_id));

CREATE POLICY "admins can remove members"
  ON public.institution_members FOR DELETE
  USING (public.is_admin_of(institution_id));

-- institution_allowed_emails
CREATE POLICY "admins can view allowed emails"
  ON public.institution_allowed_emails FOR SELECT
  USING (public.is_admin_of(institution_id));

CREATE POLICY "admins can add allowed emails"
  ON public.institution_allowed_emails FOR INSERT
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins can update allowed emails"
  ON public.institution_allowed_emails FOR UPDATE
  USING (public.is_admin_of(institution_id));

CREATE POLICY "admins can delete allowed emails"
  ON public.institution_allowed_emails FOR DELETE
  USING (public.is_admin_of(institution_id));


-- ============================================================
-- 5. TRIGGER — handle new user signup
--
-- Fires on every auth.users INSERT.
-- Reads raw_user_meta_data.signup_type to branch behaviour:
--
--   'institution_admin' → create institution + profile + admin member row
--   'student'           → create profile + auto-link via allowed_emails
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
  v_category         TEXT;
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
    v_category         := NEW.raw_user_meta_data->>'category';

    -- category/contact_* columns are added in migration 003; this body
    -- only runs at signup time, by which point they exist.
    INSERT INTO public.institutions (name, slug, category, contact_email, contact_mobile)
    VALUES (
      v_institution_name,
      v_institution_slug,
      v_category,
      NEW.email,
      NEW.raw_user_meta_data->>'mobile'
    )
    RETURNING id INTO v_new_institution;

    INSERT INTO public.institution_members (institution_id, user_id, role)
    VALUES (v_new_institution, NEW.id, 'admin');

  ELSIF v_signup_type = 'student' THEN

    -- Link to every institution that pre-approved this email
    FOR v_allowed IN
      SELECT id, institution_id, role
      FROM   public.institution_allowed_emails
      WHERE  email  = NEW.email
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 6. RPC — link_user_to_institution
--
-- Called from the app when an admin adds an email that already
-- belongs to an existing account. Immediately creates the
-- institution_members row without waiting for signup.
--
-- Usage (in the app):
--   supabase.rpc('link_user_to_institution', {
--     p_institution_id: '...',
--     p_email:          'student@example.com',
--     p_role:           'student',
--     p_added_by:       adminUserId,
--   })
-- ============================================================

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
  WHERE  email = p_email;

  IF v_profile_id IS NOT NULL THEN
    -- Account exists → link immediately
    INSERT INTO public.institution_members (institution_id, user_id, role)
    VALUES (p_institution_id, v_profile_id, p_role)
    ON CONFLICT (institution_id, user_id) DO NOTHING;

    INSERT INTO public.institution_allowed_emails
           (institution_id, email, role, added_by, status)
    VALUES (p_institution_id, p_email, p_role, p_added_by, 'joined')
    ON CONFLICT (institution_id, email)
    DO UPDATE SET status   = 'joined',
                  role     = EXCLUDED.role,
                  added_by = EXCLUDED.added_by;

    v_result := jsonb_build_object('linked', true, 'status', 'joined');
  ELSE
    -- No account yet → add to whitelist; trigger links them on signup
    INSERT INTO public.institution_allowed_emails
           (institution_id, email, role, added_by, status)
    VALUES (p_institution_id, p_email, p_role, p_added_by, 'pending')
    ON CONFLICT (institution_id, email)
    DO UPDATE SET role     = EXCLUDED.role,
                  added_by = EXCLUDED.added_by;

    v_result := jsonb_build_object('linked', false, 'status', 'pending');
  END IF;

  RETURN v_result;
END;
$$;
