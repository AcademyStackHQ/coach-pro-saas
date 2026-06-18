-- ============================================================
-- 005 — Generic naming: "sport" → "program", "jersey" → "uniform"
--
-- CoachPro is NOT sports-only — it serves tuition, dance, music,
-- martial arts, language, fitness, etc. This renames the
-- sports-flavoured columns to neutral terms used app-wide.
--
-- Pure column renames: data is preserved, no indexes/constraints/
-- policies/functions reference these columns, so nothing else changes.
-- "sports-academy" stays a valid institution CATEGORY (a vertical),
-- it just isn't the framing of the whole product.
-- ============================================================

-- What a batch teaches / what a member does → "program(s)"
ALTER TABLE public.institutions RENAME COLUMN sports TO programs;
ALTER TABLE public.coaches      RENAME COLUMN sports TO programs;
ALTER TABLE public.students     RENAME COLUMN sports TO programs;
ALTER TABLE public.batches      RENAME COLUMN sport  TO program;

-- Team/kit fields → neutral "uniform"
ALTER TABLE public.students RENAME COLUMN jersey_size   TO uniform_size;
ALTER TABLE public.students RENAME COLUMN jersey_number TO uniform_number;
ALTER TABLE public.students RENAME COLUMN jersey_name   TO uniform_name;
