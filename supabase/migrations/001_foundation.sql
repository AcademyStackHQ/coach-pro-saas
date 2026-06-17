-- ============================================================
-- 001 — Foundation: Auth, Institutions & Membership
--
-- Consolidated schema (dev phase — drop & recreate). This is the
-- FINAL state of every object below; there are no later
-- CREATE OR REPLACE chains to replay.
--
-- Tables : institutions, profiles, institution_members,
--          institution_allowed_emails
-- Helpers: get_my_institution_ids, is_admin_of,
--          generate_institution_code, next_student_code
-- RPCs   : is_email_allowed, is_institution_name_available,
--          link_user_to_institution
-- Trigger: handle_new_user (on auth.users)
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE public.institutions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  slug                TEXT        NOT NULL,
  code                TEXT,                       -- short human prefix for student codes (e.g. "MVA")
  student_seq         INT         NOT NULL DEFAULT 0,  -- atomic per-institution student counter
  logo_url            TEXT,
  category            TEXT,
  address             TEXT,
  contact_email       TEXT,
  contact_mobile      TEXT,
  sports              TEXT[]      DEFAULT '{}',
  timezone            TEXT        DEFAULT 'Asia/Kolkata',
  plan                TEXT        DEFAULT 'free'
                                  CHECK (plan IN ('free', 'pro', 'enterprise')),
  sms_credits         INT         DEFAULT 0,
  working_hours       JSONB       DEFAULT '{}',
  fee_config          JSONB       DEFAULT '{}',
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

-- Institution code is globally unique (it prefixes every student code).
CREATE UNIQUE INDEX idx_institutions_code_unique
  ON public.institutions (code)
  WHERE code IS NOT NULL;

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
-- 3. HELPER FUNCTIONS (bypass RLS — used inside RLS policies
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
-- 4. PUBLIC RPCs (SECURITY DEFINER, called pre-auth)
--
-- is_email_allowed / is_institution_name_available run for
-- unauthenticated visitors at register/signup time, so they must
-- bypass RLS. Each returns only a boolean — no row data leaks.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_email_allowed(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.institution_allowed_emails
    WHERE  lower(email)  = lower(p_email)
      AND  status        = 'pending'
  );
$$;

-- Case-insensitive + trimmed so it matches the institutions_name_unique
-- behaviour the user actually hits on signup.
CREATE OR REPLACE FUNCTION public.is_institution_name_available(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM   public.institutions
    WHERE  lower(name) = lower(trim(p_name))
  );
$$;


-- ============================================================
-- 5. STUDENT-CODE HELPERS
--
-- Each institution gets a short CODE (initials of its name). Every
-- student gets a globally-unique student_code = CODE || zero-padded
-- per-institution sequence (e.g. MVA0007), which lets a synthetic
-- login email be built from the code alone.
-- ============================================================

-- SECURITY DEFINER so the unauthenticated /register flow can preview
-- the code before the account exists.
CREATE OR REPLACE FUNCTION public.generate_institution_code(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_words     TEXT[];
  v_word      TEXT;
  v_base      TEXT := '';
  v_candidate TEXT;
  v_suffix    INT  := 1;
BEGIN
  -- Split the uppercased name into alphabetic words (drop digits/punctuation).
  v_words := regexp_split_to_array(upper(coalesce(p_name, '')), '[^A-Z]+');

  -- Base = initials of each word (e.g. "Mira Volley Academy" -> "MVA").
  FOREACH v_word IN ARRAY v_words LOOP
    IF length(v_word) > 0 THEN
      v_base := v_base || left(v_word, 1);
    END IF;
  END LOOP;

  -- Fewer than 3 initials (e.g. a single-word name): pad from its letters.
  IF length(v_base) < 3 THEN
    v_base := left(array_to_string(v_words, ''), 3);
  ELSE
    v_base := left(v_base, 3);
  END IF;

  -- No usable letters at all -> deterministic fallback; always 3 chars.
  IF length(v_base) = 0 THEN
    v_base := 'ACA';
  END IF;
  v_base := rpad(v_base, 3, 'X');

  -- Bare base first, then append an incrementing suffix until unique.
  v_candidate := v_base;
  WHILE EXISTS (SELECT 1 FROM public.institutions WHERE code = v_candidate) LOOP
    v_suffix    := v_suffix + 1;
    v_candidate := v_base || v_suffix::TEXT;
  END LOOP;

  RETURN v_candidate;
END;
$$;

-- Admin-only. UPDATE ... RETURNING locks the institution row, so
-- concurrent "Add Student" / imports never collide.
CREATE OR REPLACE FUNCTION public.next_student_code(p_institution_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_seq  INT;
BEGIN
  IF NOT public.is_admin_of(p_institution_id) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.institutions
  SET    student_seq = student_seq + 1
  WHERE  id = p_institution_id
  RETURNING code, student_seq INTO v_code, v_seq;

  -- Institution has no code yet — assign one now.
  IF v_code IS NULL THEN
    v_code := public.generate_institution_code(
      (SELECT name FROM public.institutions WHERE id = p_institution_id)
    );
    UPDATE public.institutions SET code = v_code WHERE id = p_institution_id;
  END IF;

  RETURN v_code || lpad(v_seq::TEXT, 4, '0');
END;
$$;


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.institutions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members        ENABLE ROW LEVEL SECURITY;
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
-- 7. TRIGGER — handle new user signup
--
-- Fires on every auth.users INSERT. Branches on
-- raw_user_meta_data.signup_type:
--
--   'institution_admin' → create institution (+ code) + profile
--                          + admin member row
--   'student'           → create profile + auto-link via
--                          allowed_emails (case-insensitive)
--   'student_code'      → only the profile row is created here;
--                          membership is inserted by the app via
--                          the service-role admin client.
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
  v_institution_code TEXT;
  v_category         TEXT;
  v_new_institution  UUID;
  v_allowed          RECORD;
  v_constraint       TEXT;
  v_linked           INT;
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
    v_institution_code := NEW.raw_user_meta_data->>'institution_code';

    -- The app previews a code, but generate one if absent.
    IF v_institution_code IS NULL OR length(v_institution_code) = 0 THEN
      v_institution_code := public.generate_institution_code(v_institution_name);
    END IF;

    BEGIN
      INSERT INTO public.institutions
             (name, slug, category, contact_email, contact_mobile, code)
      VALUES (v_institution_name, v_institution_slug, v_category,
              NEW.email, NEW.raw_user_meta_data->>'mobile', v_institution_code)
      RETURNING id INTO v_new_institution;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint = 'idx_institutions_code_unique' THEN
        -- Rare race: the previewed code was taken between preview and insert.
        -- Regenerate a fresh, unique code and retry once.
        v_institution_code := public.generate_institution_code(v_institution_name);
        INSERT INTO public.institutions
               (name, slug, category, contact_email, contact_mobile, code)
        VALUES (v_institution_name, v_institution_slug, v_category,
                NEW.email, NEW.raw_user_meta_data->>'mobile', v_institution_code)
        RETURNING id INTO v_new_institution;
      ELSE
        -- The academy NAME or SLUG is already taken (institutions_name_unique /
        -- institutions_slug_unique). Regenerating the code wouldn't help, so
        -- raise a clean, app-recognisable error instead of retrying into the
        -- same collision. The app re-checks the name pre-signup; this is the
        -- backstop for the race.
        RAISE EXCEPTION 'institution_name_taken'
          USING ERRCODE = 'unique_violation';
      END IF;
    END;

    INSERT INTO public.institution_members (institution_id, user_id, role)
    VALUES (v_new_institution, NEW.id, 'admin');

  ELSIF v_signup_type = 'student' THEN

    -- Link to every institution that pre-approved this email (case-insensitive)
    v_linked := 0;
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

      v_linked := v_linked + 1;
    END LOOP;

    -- Invite-only enforcement. The app checks is_email_allowed before signup,
    -- but the publishable key lets anyone call auth.signUp directly with an
    -- arbitrary signup_type, so the real gate must live here: abort (rolling
    -- back the auth.users insert) when the email was never pre-approved.
    IF v_linked = 0 THEN
      RAISE EXCEPTION 'email_not_allowed'
        USING ERRCODE = 'check_violation';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 8. RPC — link_user_to_institution
--
-- Called from the app when an admin adds an email. If the account
-- already exists it is linked immediately; otherwise the email is
-- whitelisted and the trigger links it on signup. All email
-- comparisons are case-insensitive.
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
