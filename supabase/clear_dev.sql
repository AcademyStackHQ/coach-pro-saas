-- ============================================================
-- clear_dev.sql — empty all data, KEEP the tables (DEVELOPMENT ONLY)
-- ============================================================
-- Unlike reset_dev.sql (which drops the whole `public` schema and
-- makes you re-run every migration), this script leaves the tables,
-- functions, policies, triggers and indexes in place — it only wipes
-- the *rows*. After running you have a brand-new, empty database with
-- the full schema ready to use, no migrations to replay.
--
-- It also clears auth users so the same admin/student emails can be
-- re-registered without colliding with leftover accounts.
--
-- This is irreversible. Use it only on a dev/throwaway database.
--
-- How to run:
--   • Supabase SQL editor: paste this whole file and run.
--   • psql:                psql "$DATABASE_URL" -f supabase/clear_dev.sql
-- ============================================================

BEGIN;

-- 1. Empty every application table in one shot.
--    CASCADE follows FK chains (members, coaches, students, batches,
--    batch_students, sessions, allowed emails all reference
--    institutions/profiles/coaches/students), so order doesn't matter.
--    RESTART IDENTITY resets any serial/identity sequences;
--    institution_members.student_seq lives on the institutions row,
--    so truncating institutions already zeroes the student counter.
TRUNCATE TABLE
  public.sessions,
  public.batch_students,
  public.batches,
  public.students,
  public.coaches,
  public.institution_allowed_emails,
  public.institution_members,
  public.profiles,
  public.institutions
RESTART IDENTITY CASCADE;

-- 2. Wipe auth users (cascades to auth.identities / auth.sessions).
--    public.profiles has ON DELETE CASCADE on auth.users, but it's
--    already empty from step 1 — this just clears the auth side.
DELETE FROM auth.users;

COMMIT;
