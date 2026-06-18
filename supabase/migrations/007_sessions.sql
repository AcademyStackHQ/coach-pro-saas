-- ============================================================
-- 007 — 1-to-1 Sessions (Module 6: Calendar & Scheduling)
--
-- A `session` is a single dated coach↔student appointment (private
-- coaching), distinct from a batch occurrence. Batch occurrences are
-- still computed on the fly from `batches.schedule` (never stored);
-- only these 1-to-1 sessions persist.
--
-- Coaches CONTROL their own sessions: a coach can create/edit sessions
-- where they are the assigned coach; admins manage every session in the
-- institution. `end_time > start_time` is enforced in the server action
-- (parseForm), mirroring the per-day batch schedule convention — the
-- shape is validated application-side, not as a DB CHECK.
--
-- `fee_override` (paise, NULL = use the default/batch rate) is read by
-- Module 7 (Fee Management) when billing private sessions.
-- ============================================================


-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE public.sessions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  coach_id       UUID        NOT NULL REFERENCES public.coaches(id)      ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES public.students(id)     ON DELETE CASCADE,
  date           DATE        NOT NULL,
  start_time     TIME        NOT NULL,
  end_time       TIME        NOT NULL,
  venue          TEXT,
  fee_override   INT,                                   -- in paise; NULL = use default rate
  status         TEXT        NOT NULL DEFAULT 'scheduled'
                             CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes          TEXT,                                  -- coach notes after the session
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Calendar range scans are keyed by (institution, coach, date); the
-- student index backs per-student schedule + conflict lookups.
CREATE INDEX idx_sessions_institution_coach_date
  ON public.sessions (institution_id, coach_id, date);

CREATE INDEX idx_sessions_student_date
  ON public.sessions (student_id, date);


-- ============================================================
-- 2. ROW LEVEL SECURITY — sessions
--    Admins manage all; coaches manage the sessions assigned to them.
--    Mirrors the batches policies; reuses owns_batch_coach(coach_id),
--    which simply checks the coaches row belongs to auth.uid().
-- ============================================================

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Any active member of the institution can read sessions. The page
-- further scopes what each role sees (coach → own; student → own).
CREATE POLICY "members read sessions"
  ON public.sessions FOR SELECT
  USING (institution_id = ANY(public.get_my_institution_ids()));

-- Admins create any session; a coach may create a session only with
-- coach_id pointing at their OWN coaches row.
CREATE POLICY "admins or owning coach insert sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (
    public.is_admin_of(institution_id)
    OR (public.is_coach_of(institution_id) AND public.owns_batch_coach(coach_id))
  );

-- Admins update any session; the assigned coach updates their own.
CREATE POLICY "admins or owning coach update sessions"
  ON public.sessions FOR UPDATE
  USING (
    public.is_admin_of(institution_id)
    OR public.owns_batch_coach(coach_id)
  )
  WITH CHECK (
    public.is_admin_of(institution_id)
    OR public.owns_batch_coach(coach_id)
  );

-- Only admins hard-delete (cancellation is a status change, not a delete).
CREATE POLICY "admins delete sessions"
  ON public.sessions FOR DELETE
  USING (public.is_admin_of(institution_id));
