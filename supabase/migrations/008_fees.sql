-- ============================================================
-- 008 — Fee Management (Module 7)
--
-- Turns the per-student `monthly_fee` (003_students) into a billing
-- loop: a monthly `fee_ledger` invoice per student, and `fee_payments`
-- recorded against it.
--
-- Billing basis is PER-STUDENT FLAT: one ledger row per
-- (institution, student, month_year), amount_due = students.monthly_fee.
-- Students with a null/zero monthly_fee are not billed. Generation is
-- idempotent via the (institution_id, student_id, month_year) unique key.
--
-- Money is INT paise everywhere. There is NO PDF receipt — payments get
-- a sequential `receipt_number` reference only (next_receipt_number RPC).
--
-- RLS: admins manage all fee rows; a student reads their OWN invoices and
-- payments (via students.user_id / parent_user_id, mirroring the students
-- self-read clause). Coaches have no fee access. Generation runs via the
-- service-role client (bypasses RLS), so the write policies stay admin-only.
-- ============================================================


-- ============================================================
-- 1. RECEIPT SEQUENCE — per-institution counter for receipt numbers
-- ============================================================

ALTER TABLE public.institutions
  ADD COLUMN receipt_seq INT NOT NULL DEFAULT 0;


-- ============================================================
-- 2. TABLES
-- ============================================================

CREATE TABLE public.fee_ledger (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES public.students(id)     ON DELETE CASCADE,
  batch_id       UUID        REFERENCES public.batches(id) ON DELETE SET NULL,  -- reserved (per-batch/1:1 billing); unused in v1
  month_year     DATE        NOT NULL,                              -- always the 1st of the billed month
  amount_due     INT         NOT NULL,                              -- in paise
  amount_paid    INT         NOT NULL DEFAULT 0,                    -- in paise
  balance        INT         GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'partial', 'paid', 'waived')),
  due_date       DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),

  -- Idempotency key: one invoice per student per month. Generation upserts
  -- against this and never duplicates or clobbers a paid invoice.
  CONSTRAINT fee_ledger_unique UNIQUE (institution_id, student_id, month_year)
);

CREATE TABLE public.fee_payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  ledger_id      UUID        NOT NULL REFERENCES public.fee_ledger(id)   ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES public.students(id)     ON DELETE CASCADE,  -- denormalised for student-scoped reads
  amount         INT         NOT NULL CHECK (amount > 0),           -- in paise
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_mode   TEXT        NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'card', 'cheque')),
  receipt_number TEXT,                                             -- reference number only (no PDF)
  recorded_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  voided_at      TIMESTAMPTZ,                                      -- NULL = active; non-null = voided
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fee_payments_receipt_unique UNIQUE (institution_id, receipt_number)
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

-- Dashboard scans: outstanding / overdue for an institution by status + due date.
CREATE INDEX idx_fee_ledger_institution_status
  ON public.fee_ledger (institution_id, status, due_date);

-- Per-student ledger lookups (StudentDetail Fees tab, student My Fees).
CREATE INDEX idx_fee_ledger_student
  ON public.fee_ledger (student_id, month_year);

-- Payment history scans.
CREATE INDEX idx_fee_payments_institution_student
  ON public.fee_payments (institution_id, student_id, paid_at);


-- ============================================================
-- 4. RECEIPT NUMBER RPC
--
-- Admin-only. UPDATE ... RETURNING locks the institution row so concurrent
-- payment records never collide on a receipt number. Format:
--   <prefix>-<YYYY>-<seq4>   e.g.  RCP-2026-0042
-- prefix comes from institutions.fee_config->>'receipt_prefix' (default RCP).
-- ============================================================

CREATE OR REPLACE FUNCTION public.next_receipt_number(p_institution_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq    INT;
  v_prefix TEXT;
BEGIN
  IF NOT public.is_admin_of(p_institution_id) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.institutions
  SET    receipt_seq = receipt_seq + 1
  WHERE  id = p_institution_id
  RETURNING receipt_seq,
            COALESCE(NULLIF(fee_config->>'receipt_prefix', ''), 'RCP')
  INTO   v_seq, v_prefix;

  RETURN v_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;


-- ============================================================
-- 5. ROW LEVEL SECURITY
--    Admins manage all; students read their own. Reuses the 001 helpers
--    (is_admin_of / get_my_institution_ids) and the students self-read shape.
-- ============================================================

ALTER TABLE public.fee_ledger   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- fee_ledger -------------------------------------------------

-- Admins read every invoice; a student reads only their own (via the linked
-- students row). Coaches are intentionally excluded (no fee access).
CREATE POLICY "admins or own student read fee_ledger"
  ON public.fee_ledger FOR SELECT
  USING (
    public.is_admin_of(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE  s.id = fee_ledger.student_id
        AND  (s.user_id = auth.uid() OR s.parent_user_id = auth.uid())
    )
  );

CREATE POLICY "admins insert fee_ledger"
  ON public.fee_ledger FOR INSERT
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins update fee_ledger"
  ON public.fee_ledger FOR UPDATE
  USING (public.is_admin_of(institution_id))
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins delete fee_ledger"
  ON public.fee_ledger FOR DELETE
  USING (public.is_admin_of(institution_id));

-- fee_payments -----------------------------------------------

CREATE POLICY "admins or own student read fee_payments"
  ON public.fee_payments FOR SELECT
  USING (
    public.is_admin_of(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE  s.id = fee_payments.student_id
        AND  (s.user_id = auth.uid() OR s.parent_user_id = auth.uid())
    )
  );

CREATE POLICY "admins insert fee_payments"
  ON public.fee_payments FOR INSERT
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins update fee_payments"
  ON public.fee_payments FOR UPDATE
  USING (public.is_admin_of(institution_id))
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins delete fee_payments"
  ON public.fee_payments FOR DELETE
  USING (public.is_admin_of(institution_id));
