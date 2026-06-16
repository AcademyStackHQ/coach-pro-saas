-- ============================================================
-- Migration 004 — Institution Name Availability Check RPC
--
-- Adds a public-callable function that checks whether an
-- institution name is still available.
--
-- Why SECURITY DEFINER:
--   institutions has RLS that only lets members read their own
--   institution. A prospective admin is unauthenticated at
--   register time, so a direct SELECT returns zero rows and the
--   client-side check would always report "available". This
--   function runs as its owner (bypassing RLS) and returns only
--   a boolean — no row data is exposed.
--
-- Matching is case-insensitive and trims whitespace so it lines
-- up with the institutions_name_unique constraint behaviour the
-- user actually hits on signup.
-- ============================================================

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
