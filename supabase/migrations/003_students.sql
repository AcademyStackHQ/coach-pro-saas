-- ============================================================
-- 003 — Student Management
-- The `students` table: academy-owned records, NOT logins.
--
-- A student is a profile OWNED by the institution, decoupled from
-- auth identity. Under-14 kids have no email; a parent enrols
-- multiple siblings under the SAME parent_email (no unique
-- constraint). The two nullable FKs (user_id, parent_user_id)
-- ship now but stay NULL until the 14+ login / parent portal land.
--
-- student_code = institution code + per-institution sequence
-- (e.g. MVA0007), generated via next_student_code() in 001. It is
-- globally unique so a synthetic login email can be built from the
-- code alone — no academy selector at login.
-- ============================================================


-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE public.students (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_code     TEXT,                                   -- academy roll number (auto-generated)
  full_name        TEXT        NOT NULL,
  calling_name     TEXT,
  dob              DATE        NOT NULL,
  gender           TEXT        CHECK (gender IN ('male', 'female', 'other')),
  parent_name      TEXT        NOT NULL,
  parent_mobile    TEXT        NOT NULL,                   -- E.164, e.g. +919876543210
  parent_email     TEXT,                                   -- plain contact — NO unique constraint
  sports           TEXT[]      DEFAULT '{}',
  enrolment_date   DATE        DEFAULT now(),
  status           TEXT        DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  photo_url        TEXT,                                   -- column ships; upload wired later
  jersey_size      TEXT,
  jersey_number    INT,
  jersey_name      TEXT,
  monthly_fee      INT,                                    -- recurring monthly fee, in paise
  deposit_amount   INT,                                    -- one-time advance / deposit, in paise
  sms_opt_in       BOOLEAN     DEFAULT true,
  user_id          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,  -- 14+ own login (NULL now)
  parent_user_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,  -- parent portal (NULL now)
  created_at       TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Hard key: ONLY student_code, and only when present (partial unique).
-- The single collision-free key an admin controls; also the dedup key
-- for any future CSV re-import.
CREATE UNIQUE INDEX idx_students_code_unique
  ON public.students (institution_id, student_code)
  WHERE student_code IS NOT NULL;

-- Global unique student_code (case-insensitive) — lets the synthetic
-- login email be built from the code alone. Lower() matches Supabase's
-- lowercased emails.
CREATE UNIQUE INDEX idx_students_code_global_unique
  ON public.students (lower(student_code))
  WHERE student_code IS NOT NULL;

-- Duplicate DETECTION key (non-unique) — case-insensitive name + dob.
-- NOT a UNIQUE constraint: names collide (common names, twins) and a hard
-- key would reject legitimate students. Soft detection + admin confirm.
CREATE INDEX idx_students_dupe
  ON public.students (institution_id, lower(full_name), dob);

CREATE INDEX idx_students_institution_status
  ON public.students (institution_id, status);


-- ============================================================
-- 3. ROW LEVEL SECURITY
--    Reuses the 001 helpers (get_my_institution_ids / is_admin_of)
--    so policies never recurse on institution_members.
-- ============================================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Any active member of the institution (admin or coach) reads the roster.
-- The self/guardian clauses are forward-compatible: the future 14+ student
-- and parent-portal logins read their own rows with no new migration.
CREATE POLICY "members read students"
  ON public.students FOR SELECT
  USING (
    institution_id = ANY(public.get_my_institution_ids())
    OR user_id        = auth.uid()
    OR parent_user_id = auth.uid()
  );

-- Only admins create / edit / delete students (deletes rare — prefer the
-- soft-delete via status = 'inactive').
CREATE POLICY "admins insert students"
  ON public.students FOR INSERT
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins update students"
  ON public.students FOR UPDATE
  USING (public.is_admin_of(institution_id));

CREATE POLICY "admins delete students"
  ON public.students FOR DELETE
  USING (public.is_admin_of(institution_id));
