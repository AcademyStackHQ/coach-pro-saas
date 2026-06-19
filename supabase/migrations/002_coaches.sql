-- ============================================================
-- 002 — Coach Management
-- The `coaches` coaching-profile extension table.
--
-- A `coaches` row is NOT an identity — it extends an existing
-- institution_members row (role='coach') with coaching-specific
-- attributes (programs, availability, calendar colour).
-- Active/inactive status lives in institution_members.status,
-- NOT here, so there is one source of truth.
-- ============================================================


-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE public.coaches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  programs       TEXT[]      DEFAULT '{}',
  -- { "mon": [{ "start": "06:00", "end": "09:00" }], "tue": [], ... }
  availability   JSONB       DEFAULT '{}',
  color          TEXT,                      -- hex colour for the calendar lane (Module 6)
  bio            TEXT,
  joined_at      DATE        DEFAULT now(),
  created_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT coaches_institution_user_unique UNIQUE (institution_id, user_id)
);

CREATE INDEX idx_coaches_institution_id
  ON public.coaches (institution_id);


-- ============================================================
-- 2. HELPER FUNCTION
--    Mirrors is_admin_of / get_my_institution_ids in 001.
--    SECURITY DEFINER so it can be called inside RLS policies
--    without recursing on institution_members.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_coach_of(p_institution_id UUID)
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
      AND  role           = 'coach'
      AND  status         = 'active'
  );
$$;


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Any active member of the institution can read its coaches.
CREATE POLICY "members can read coaches"
  ON public.coaches FOR SELECT
  USING (institution_id = ANY(public.get_my_institution_ids()));

-- Admins manage anyone; a coach may create their OWN row (first
-- self-service availability save) when they are a coach here.
CREATE POLICY "admins or self can insert coach"
  ON public.coaches FOR INSERT
  WITH CHECK (
    public.is_admin_of(institution_id)
    OR (user_id = auth.uid() AND public.is_coach_of(institution_id))
  );

-- Admins update anyone; a coach updates only their own row. WITH CHECK mirrors
-- USING so the row can't be re-pointed at another user_id on update (without an
-- explicit WITH CHECK, Postgres reuses USING — make it explicit so it survives
-- future policy edits).
CREATE POLICY "admins or self can update coach"
  ON public.coaches FOR UPDATE
  USING (
    public.is_admin_of(institution_id)
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin_of(institution_id)
    OR user_id = auth.uid()
  );

-- Only admins delete (rare — prefer membership soft-delete).
CREATE POLICY "admins can delete coach"
  ON public.coaches FOR DELETE
  USING (public.is_admin_of(institution_id));
