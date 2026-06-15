-- ============================================================
-- Migration 003 — Institution Profile Columns
-- Adds extended profile fields used by the onboarding wizard
-- and the settings page.
-- ============================================================

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS category        TEXT,
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS contact_email   TEXT,
  ADD COLUMN IF NOT EXISTS contact_mobile  TEXT,
  ADD COLUMN IF NOT EXISTS fee_config      JSONB DEFAULT '{}';
