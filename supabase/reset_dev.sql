-- ============================================================
-- reset_dev.sql — wipe & rebuild the database (DEVELOPMENT ONLY)
-- ============================================================
-- Drops the entire `public` schema and all auth users so you can
-- re-run migrations from a clean slate. Use this while developing,
-- BEFORE there is any production data — it is irreversible.
--
-- How to run:
--   • Supabase SQL editor: paste this whole file and run.
--   • psql:                psql "$DATABASE_URL" -f supabase/reset_dev.sql
--   • Supabase CLI:        prefer `supabase db reset` (re-runs migrations
--                          + seeds automatically); use this file only if
--                          you need to reset a remote/linked DB by hand.
--
-- After running, re-apply migrations in order: 001 → 002 → 003 → …
-- ============================================================

-- 1. Drop everything in `public` (tables, functions, policies, indexes,
--    sequences). The on_auth_user_created trigger on auth.users depends on
--    public.handle_new_user(), so it cascades away here too — no orphan.
drop schema public cascade;
create schema public;

-- 2. Restore Supabase's default privileges on the fresh schema.
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all   on schema public to postgres, service_role;

alter default privileges in schema public
  grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines  to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;

-- 3. Wipe auth users so re-registering the same admin/student emails doesn't
--    collide with leftover accounts. Cascades to auth.identities / sessions.
delete from auth.users;
