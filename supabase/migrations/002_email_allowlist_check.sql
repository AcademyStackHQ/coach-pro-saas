-- ============================================================
-- Migration 002 — Email Allow-list Check RPC
--
-- Adds a public-callable function that checks whether a given
-- email has been pre-approved by any institution admin.
--
-- Why SECURITY DEFINER:
--   institution_allowed_emails has RLS that only lets admins
--   read rows. A prospective student is unauthenticated at
--   signup time, so they can't query the table directly.
--   This function runs as its owner (bypassing RLS) and
--   returns only a boolean — no row data is exposed.
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
