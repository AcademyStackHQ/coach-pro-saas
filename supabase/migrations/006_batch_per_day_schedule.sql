-- ============================================================
-- 006 — Per-day batch schedule
--
-- A batch previously had ONE start_time / end_time applied to every
-- training day (days_of_week INT[]). Real timetables vary per day —
-- e.g. Fri 17:00–18:30 but Sat/Sun 07:00–08:30. We replace the three
-- columns with a single JSONB `schedule`: an array of per-day slots
--   [{ "day": 5, "start": "17:00", "end": "18:30" },
--    { "day": 6, "start": "07:00", "end": "08:30" }, … ]
-- where `day` is a JS Date.getDay() index (0 = Sun … 6 = Sat) so the
-- occurrence preview / calendar (Module 6) still computes directly.
--
-- One slot per day; end > start is enforced in the server action
-- (parseForm), not as a DB constraint, since JSONB shape is validated
-- application-side.
-- ============================================================

-- 1. New column (default empty so the NOT NULL add is instant).
ALTER TABLE public.batches
  ADD COLUMN schedule JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Backfill existing batches: fan the single time across each day.
UPDATE public.batches
SET schedule = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'day',   d,
        'start', to_char(start_time, 'HH24:MI'),
        'end',   to_char(end_time,   'HH24:MI')
      )
      ORDER BY d
    )
    FROM unnest(days_of_week) AS d
  ),
  '[]'::jsonb
)
WHERE array_length(days_of_week, 1) IS NOT NULL;

-- 3. Drop the now-redundant single-time columns + their CHECK.
ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_time_order;
ALTER TABLE public.batches DROP COLUMN days_of_week;
ALTER TABLE public.batches DROP COLUMN start_time;
ALTER TABLE public.batches DROP COLUMN end_time;
