-- ============================================================
-- 007 — Messaging: SMS + WhatsApp (Module 8, final MVP module)
--
-- Lets an academy message parents fee reminders from the Fees dashboard
-- using editable per-academy templates, with a full send log. Each
-- student has a `contact_channel` preference (sms / whatsapp / both) that
-- routes every outbound message; the message layer is provider-agnostic
-- (mock by default).
--
-- `sms_templates` — editable message bodies per institution (seeded
--   with fee_reminder + payment_confirmation defaults).
-- `sms_logs` — one row per attempted send, per channel (resolved body
--   + channel + status).
--
-- Sending is metered against institutions.sms_credits (decrement, never
-- block — there's no top-up flow yet) via decrement_sms_credits(); each
-- message (a `both` student = 2) spends one credit. Routing is driven by
-- students.contact_channel; the legacy students.sms_opt_in is no longer
-- read by the send path.
--
-- DEFERRED (columns reserved): the HMAC delivery webhook updates
-- sms_logs.status/delivered_at/gateway_ref — not wired in v1.
--
-- RLS: admins manage all; a student reads their OWN log rows (via
-- students.user_id/parent_user_id), mirroring fee_ledger. Templates are
-- admin-only.
-- ============================================================

-- Per-student channel preference (routes all outbound messages). 'both' fans
-- out to SMS + WhatsApp; 'none' opts the parent out of all messaging (the
-- successor to the legacy students.sms_opt_in consent flag).
ALTER TABLE public.students
  ADD COLUMN contact_channel TEXT NOT NULL DEFAULT 'sms'
  CHECK (contact_channel IN ('sms', 'whatsapp', 'both', 'none'));

-- Carry existing consent forward: parents who had opted out of SMS keep that
-- opt-out under the new model, so this migration never starts messaging a
-- parent who previously declined.
UPDATE public.students SET contact_channel = 'none' WHERE sms_opt_in IS FALSE;


-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE public.sms_templates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,                  -- e.g. fee_reminder, payment_confirmation
  body           TEXT        NOT NULL,                  -- with {placeholder} tokens
  updated_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT sms_templates_unique UNIQUE (institution_id, name)
);

CREATE TABLE public.sms_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  ledger_id      UUID        REFERENCES public.fee_ledger(id) ON DELETE SET NULL,  -- NULL for non-fee messages
  student_id     UUID        REFERENCES public.students(id)   ON DELETE SET NULL,
  mobile         TEXT        NOT NULL,                  -- E.164
  message        TEXT        NOT NULL,                  -- resolved body (after token substitution)
  channel        TEXT        NOT NULL DEFAULT 'sms'
                             CHECK (channel IN ('sms', 'whatsapp')),
  template_name  TEXT,
  gateway_ref    TEXT,                                  -- reserved: gateway message id (delivery webhook)
  status         TEXT        NOT NULL DEFAULT 'sent'
                             CHECK (status IN ('sent', 'delivered', 'failed')),
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at   TIMESTAMPTZ                            -- reserved: populated by delivery webhook
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_sms_logs_institution_sent
  ON public.sms_logs (institution_id, sent_at DESC);

CREATE INDEX idx_sms_logs_student
  ON public.sms_logs (student_id, sent_at DESC);


-- ============================================================
-- 3. CREDIT DECREMENT RPC
--    Admin-only, atomic. Floors at 0 (decrement + warn, never block).
--    Mirrors next_receipt_number (006).
-- ============================================================

CREATE OR REPLACE FUNCTION public.decrement_sms_credits(
  p_institution_id UUID,
  p_count          INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INT;
BEGIN
  IF NOT public.is_admin_of(p_institution_id) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.institutions
  SET    sms_credits = GREATEST(COALESCE(sms_credits, 0) - GREATEST(p_count, 0), 0)
  WHERE  id = p_institution_id
  RETURNING sms_credits INTO v_remaining;

  RETURN v_remaining;
END;
$$;


-- ============================================================
-- 4. DEFAULT TEMPLATE SEEDING
--    Existing institutions are backfilled now; future ones are seeded by
--    an AFTER INSERT trigger. (001 is frozen — seeding lives here.)
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_sms_templates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sms_templates (institution_id, name, body)
  VALUES
    (NEW.id, 'fee_reminder',
     'Hi {parent_name}, fees of Rs.{amount_due} for {student_name} ({batch_name}) for {month} are due by {due_date}. - {academy_name}'),
    (NEW.id, 'payment_confirmation',
     'Hi {parent_name}, payment of Rs.{amount_paid} for {student_name} received on {payment_date}. Receipt no: {receipt_number}. - {academy_name}')
  ON CONFLICT (institution_id, name) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_institution_seed_sms_templates
  AFTER INSERT ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.seed_sms_templates();

-- Backfill existing institutions.
INSERT INTO public.sms_templates (institution_id, name, body)
SELECT id, 'fee_reminder',
       'Hi {parent_name}, fees of Rs.{amount_due} for {student_name} ({batch_name}) for {month} are due by {due_date}. - {academy_name}'
FROM   public.institutions
ON CONFLICT (institution_id, name) DO NOTHING;

INSERT INTO public.sms_templates (institution_id, name, body)
SELECT id, 'payment_confirmation',
       'Hi {parent_name}, payment of Rs.{amount_paid} for {student_name} received on {payment_date}. Receipt no: {receipt_number}. - {academy_name}'
FROM   public.institutions
ON CONFLICT (institution_id, name) DO NOTHING;


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs      ENABLE ROW LEVEL SECURITY;

-- sms_templates — admins only ------------------------------

CREATE POLICY "admins read sms_templates"
  ON public.sms_templates FOR SELECT
  USING (public.is_admin_of(institution_id));

CREATE POLICY "admins insert sms_templates"
  ON public.sms_templates FOR INSERT
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins update sms_templates"
  ON public.sms_templates FOR UPDATE
  USING (public.is_admin_of(institution_id))
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins delete sms_templates"
  ON public.sms_templates FOR DELETE
  USING (public.is_admin_of(institution_id));

-- sms_logs — admins manage; students read their own --------

CREATE POLICY "admins or own student read sms_logs"
  ON public.sms_logs FOR SELECT
  USING (
    public.is_admin_of(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE  s.id = sms_logs.student_id
        AND  (s.user_id = auth.uid() OR s.parent_user_id = auth.uid())
    )
  );

CREATE POLICY "admins insert sms_logs"
  ON public.sms_logs FOR INSERT
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins update sms_logs"
  ON public.sms_logs FOR UPDATE
  USING (public.is_admin_of(institution_id))
  WITH CHECK (public.is_admin_of(institution_id));

CREATE POLICY "admins delete sms_logs"
  ON public.sms_logs FOR DELETE
  USING (public.is_admin_of(institution_id));
