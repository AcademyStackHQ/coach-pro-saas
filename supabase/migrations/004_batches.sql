-- ============================================================
-- 004 — Batch Management
-- `batches` (training groups) + `batch_students` (enrolment join).
--
-- A batch is a scheduled training group owned by the institution and
-- (optionally) assigned to a coach. Coaches CONTROL their own batches:
-- a coach can create/edit/manage enrolment for batches where they are
-- the assigned coach; admins manage every batch in the institution.
--
-- Occurrences are NOT stored — the schedule (a per-day JSONB slot array
-- + effective_from) is the source of truth; the calendar computes
-- occurrences on the fly (Module 6).
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE public.batches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  program        TEXT        NOT NULL,
  -- nullable: a batch may be created before a coach is assigned. ON DELETE
  -- SET NULL so removing a coach profile never deletes their batches.
  coach_id       UUID        REFERENCES public.coaches(id) ON DELETE SET NULL,
  -- Per-day timetable, one slot per day:
  --   [{ "day": 5, "start": "17:00", "end": "18:30" }, … ]
  -- where `day` is a JS Date.getDay() index (0 = Sun … 6 = Sat) so the
  -- occurrence/calendar math (Module 6) computes directly. `end > start` is
  -- validated in the server action (parseForm), not as a DB constraint.
  schedule       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  venue          TEXT,
  capacity       INT         NOT NULL CHECK (capacity > 0),  -- max ACTIVE enrolments
  monthly_fee    INT         NOT NULL DEFAULT 0,             -- in paise
  status         TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  effective_from DATE        NOT NULL DEFAULT now(),         -- first occurrence date
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_batches_institution_coach_status
  ON public.batches (institution_id, coach_id, status);


CREATE TABLE public.batch_students (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- institution_id is denormalised from batches so RLS policies don't have to
  -- join through batches on every row (mirrors the SELECT key on every tenant
  -- table). Kept consistent by the server actions.
  institution_id UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  batch_id       UUID        NOT NULL REFERENCES public.batches(id)  ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'waitlisted', 'dropped')),
  enrolled_at    TIMESTAMPTZ DEFAULT now(),                 -- waitlist promotion order
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- A student can be active/waitlisted in a batch at most once, but a dropped
-- row may coexist with a fresh re-enrolment (partial unique excludes dropped).
CREATE UNIQUE INDEX idx_batch_students_unique_active
  ON public.batch_students (batch_id, student_id)
  WHERE status <> 'dropped';

-- Active-count + waitlist-head lookups.
CREATE INDEX idx_batch_students_batch_status
  ON public.batch_students (batch_id, status, enrolled_at);


-- ============================================================
-- 2. HELPER FUNCTION
--    True when the given coaches.id row belongs to the caller.
--    SECURITY DEFINER so it can be used inside RLS policies without
--    recursing on coaches' own policies.
-- ============================================================

CREATE OR REPLACE FUNCTION public.owns_batch_coach(p_coach_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.coaches
    WHERE  id      = p_coach_id
      AND  user_id = auth.uid()
  );
$$;


-- ============================================================
-- 3. ROW LEVEL SECURITY — batches
--    Admins manage all; coaches manage the batches assigned to them.
-- ============================================================

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Any active member of the institution can read the batch list.
CREATE POLICY "members read batches"
  ON public.batches FOR SELECT
  USING (institution_id = ANY(public.get_my_institution_ids()));

-- Admins create any batch; a coach may create a batch only with coach_id
-- pointing at their OWN coaches row.
CREATE POLICY "admins or owning coach insert batches"
  ON public.batches FOR INSERT
  WITH CHECK (
    public.is_admin_of(institution_id)
    OR (public.is_coach_of(institution_id) AND public.owns_batch_coach(coach_id))
  );

-- Admins update any batch; the assigned coach updates their own. WITH CHECK
-- mirrors USING so a coach can't re-point a batch at another coach.
CREATE POLICY "admins or owning coach update batches"
  ON public.batches FOR UPDATE
  USING (
    public.is_admin_of(institution_id)
    OR public.owns_batch_coach(coach_id)
  )
  WITH CHECK (
    public.is_admin_of(institution_id)
    OR public.owns_batch_coach(coach_id)
  );

-- Only admins hard-delete (UI soft-deletes via status = 'inactive').
CREATE POLICY "admins delete batches"
  ON public.batches FOR DELETE
  USING (public.is_admin_of(institution_id));


-- ============================================================
-- 4. ROW LEVEL SECURITY — batch_students
--    Admins and the owning coach manage enrolment for a batch.
-- ============================================================

ALTER TABLE public.batch_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read batch_students"
  ON public.batch_students FOR SELECT
  USING (institution_id = ANY(public.get_my_institution_ids()));

CREATE POLICY "admins or owning coach insert batch_students"
  ON public.batch_students FOR INSERT
  WITH CHECK (
    public.is_admin_of(institution_id)
    OR public.owns_batch_coach(
         (SELECT coach_id FROM public.batches WHERE id = batch_id)
       )
  );

CREATE POLICY "admins or owning coach update batch_students"
  ON public.batch_students FOR UPDATE
  USING (
    public.is_admin_of(institution_id)
    OR public.owns_batch_coach(
         (SELECT coach_id FROM public.batches WHERE id = batch_id)
       )
  )
  WITH CHECK (
    public.is_admin_of(institution_id)
    OR public.owns_batch_coach(
         (SELECT coach_id FROM public.batches WHERE id = batch_id)
       )
  );

CREATE POLICY "admins or owning coach delete batch_students"
  ON public.batch_students FOR DELETE
  USING (
    public.is_admin_of(institution_id)
    OR public.owns_batch_coach(
         (SELECT coach_id FROM public.batches WHERE id = batch_id)
       )
  );
