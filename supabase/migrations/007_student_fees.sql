-- ============================================================
-- Migration 007 — Student fee fields
-- Adds optional per-student fee config captured at enrolment:
--   monthly_fee    — the recurring monthly fee
--   deposit_amount — one-time advance / security deposit
--
-- Both are INT in PAISE (1 INR = 100 paise), per the money
-- convention — never floats. Both nullable: fees are optional and
-- may be set later. These are student-level defaults; the actual
-- payment ledger arrives in Module 7 (Fee Management).
-- ============================================================

ALTER TABLE public.students
  ADD COLUMN monthly_fee    INT,   -- recurring monthly fee, in paise
  ADD COLUMN deposit_amount INT;   -- one-time advance / deposit, in paise
