# Database migrations

This folder holds the SQL schema for the CoachPro database, applied in
**ascending filename order** (`001` → `002` → `003` → …).

## Current files (the baseline)

| File | Contains |
|------|----------|
| `001_foundation.sql` | `institutions`, `profiles`, `institution_members`, `institution_allowed_emails`; helper functions; public RPCs (incl. institution-code / student-code); RLS; the `handle_new_user` trigger; `link_user_to_institution` |
| `002_coaches.sql` | `coaches` table, `is_coach_of`, RLS |
| `003_students.sql` | `students` table (incl. fees, `parent_*`, and student-code login columns), indexes, RLS |
| `004_batches.sql` | `batches` + enrolment, `schedule` JSONB, `is_*` helpers, RLS |
| `005_sessions.sql` | 1-to-1 `sessions` (calendar), RLS |
| `006_fees.sql` | `fee_ledger` + `fee_payments` (paise), `next_receipt_number`, RLS |
| `007_sms.sql` | `sms_logs` (+ `channel`), per-institution message templates + seed trigger, RLS |

These files are the **baseline (`v0`)** — a consolidated, clean
snapshot of the whole schema. Each object is defined exactly once, in its
final state. There are no `CREATE OR REPLACE` chains to replay.

## The one rule: baseline vs. forward-only migrations

**While in development (no production data):** it's fine to keep editing the
baseline files and recreate the database from scratch. To recreate, drop the
`public` schema and run `001` → … → `007` in order (or just `npm run db:fresh`,
which bundles `supabase/rebuild_all.sql` and replays it after a reset).

**Once there is production data, the baseline freezes.** You can't drop &
recreate a live database, so from that point on:

- ❌ **Never edit `001`–`007`** (or any already-applied file). Editing an
  applied migration does nothing to environments that already ran it, and
  silently diverges new environments from old ones.
- ✅ **Add new, forward-only migrations** starting at `008`, e.g.
  `008_add_attendance.sql`. Each new file is additive and idempotent where
  practical (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- ✅ To change an existing object, write a new migration that `ALTER`s it
  (or `CREATE OR REPLACE`s the function) — don't mutate the original file.

Think of the baseline as a git tag you never rewrite, and every later
migration as a commit on top of it.

## Conventions

- **Money** is stored as `INT` in **paise** (1 INR = 100 paise) — never floats.
- **Emails** are compared case-insensitively (`lower(...)`) everywhere, to
  match Supabase's lowercased auth emails.
- **RLS** policies call the `SECURITY DEFINER` helpers
  (`get_my_institution_ids`, `is_admin_of`, `is_coach_of`) instead of
  querying `institution_members` directly, to avoid infinite policy recursion.
- **Status / soft-delete:** prefer flipping `status = 'inactive'` over hard
  `DELETE`s.
