# Module 4 — Student Management

**Status:** `✅ Built` — academy-owned records **plus opt-in per-student login** (migrations `006`, `007`, `008`)
**Priority:** 4 of 8
**Back to index:** [docs/README.md](../README.md)

---

## What This Module Delivers

- Admin student CRUD as **academy-owned records** (personal, guardian, jersey details)
- Soft duplicate detection on create (never a hard fail)
- Soft-deactivate (status flip), never hard delete
- Search + status filtering; a per-student detail view
- The foundation Module 5 (Batches) builds on — a student must exist before it can be enrolled in a batch

### Deferred to fast-follows (not in this build)

| Deferred | Why / when |
|---|---|
| **CSV bulk import** (template, preview, error report) | Ship after the record model is proven (Module 4.1) |
| **Photo upload** | No Supabase Storage pattern exists yet anywhere; `photo_url` column ships, upload wired with the academy-logo bucket work |
| **Dedicated student-portal UI** | Student-code login **is built** (see below), but a logged-in student currently lands on the generic `/dashboard`; a tailored student view is a fast-follow |
| **Parent portal** (`parent_user_id` self-service) | Column ships; the portal is later just `SELECT * FROM students WHERE parent_user_id = auth.uid()` |
| **Batch assignment** (`batch_students`) | Needs the `batches` table from Module 5 |

> **Update (migration `008`):** the original "records-only, 14+ login deferred" stance was **superseded** by a
> parent request — every student can now have an **individual login**, built on Supabase Auth via a synthetic
> email. See [Student-Code Login](#student-code-login--migration-008) below.

---

## ⚠️ Architecture note — read before coding

The generic "`students` keyed on `tenant_id`, REST `/api/students`, `middleware.ts`" design **does not
match this codebase**. The real model (Modules 1–3) is:

| Generic design (ignore) | This codebase (use) |
|---|---|
| `tenants` table, `tenant_id` FK | `institutions` table, `institution_id` FK |
| REST `/api/students*` routes | **Server actions** (`'use server'`), the Module 1–3 pattern |
| `middleware.ts` role-gating | **`proxy.ts`** + per-page `requireRole('admin')` (`lib/requireRole.ts`) |
| Separate `/students` route group | Single **`/dashboard`** group; admin nav links to `/dashboard/students` |
| App-level tenant filtering | **RLS** via `is_admin_of()` / `get_my_institution_ids()` (`001_foundation.sql`) |

This module mirrors **`app/dashboard/coaches/*`** almost exactly (page → client list → `[id]` detail →
`actions.ts`).

---

## Identity Model — a student is a *record*, not a login

This is the most important design rule of the module. A `students` row is a profile **owned by the
academy**, not an auth account. Login identity and enrolment are decoupled, which solves the real-world
problem that **under-14 kids have no email** and a parent often enrols multiple siblings under the
**same email**.

| Concept | Where it lives | Email rule |
|---|---|---|
| **Login identity** (admin, coach, parent, student-with-login) | `auth.users` → `profiles` | **Unique** — Supabase Auth enforces one account per email |
| **Student** (the kid being coached) | `students` | **Login is optional & opt-in** (see [Student-Code Login](#student-code-login--migration-008)). `parent_email` stays a shared contact field — it is *never* the login |

A parent with two kids = **one** auth account (their email) that owns **two** `students` rows, both
carrying the same `parent_email`. No collision, because the kids never log in *with that email* — when
they do get a login, it's keyed on their unique **student code**, not on any email a sibling could share.

### The two nullable identity links

- **`user_id`** — the student's own login account. **Now used** (migration `008`): set when an admin
  enables login for the student. The auth user is created via the service-role admin client with a
  synthetic email — *not* self-signup.
- **`parent_user_id`** — set when the parent has a login (future parent portal). Still deferred; the
  column ships, so the portal is later just `SELECT * FROM students WHERE parent_user_id = auth.uid()`.

`parent_user_id` is `NULL` until the parent portal ships; `user_id` is `NULL` until an admin enables a
login for that student. Note `STUDENT_LOGIN_AGE = 14` is **no longer a gate on enabling login** — login is
opt-in at **any age** (the parent request). The constant remains for any future age-based UI policy and is
never a DB constraint.

### Keep the two paths strictly separate

| Path | Who | Notes |
|---|---|---|
| `institution_allowed_emails` + signup trigger | admins, coaches | Email uniqueness is correct here. |
| Direct `students` insert (this module) | every student (record creation) | Never touches the allowlist/signup flow, so the shared-email collision can't happen. |
| Student-code login | **any student, opt-in** | Service-role `auth.admin.createUser` with a **synthetic email** derived from the student code (`signup_type='student_code'`); skips the allowlist entirely. Sets `students.user_id` + a `role='student'` member row. |

---

## Student-Code Login — migration `008`

Built on Supabase Auth — **no custom auth**. The mechanism:

1. **Codes.** Each institution gets an auto-generated `institutions.code` (letters from its name, e.g.
   `MVA`, globally unique). Each student's `student_code` is auto-assigned as `<code><4-digit seq>` (e.g.
   `MVA0007`), globally unique. The atomic per-institution counter (`institutions.student_seq`) is bumped
   by the `next_student_code()` RPC; the academy code by `generate_institution_code()`.
2. **Synthetic email.** `studentLoginEmail(code)` = `` `${code.toLowerCase()}@students.coachpro.local` ``
   (`STUDENT_LOGIN_EMAIL_DOMAIN` constant, helper in `lib/utils.ts`). Globally unique, so login needs **no
   academy selector**. The mailbox is never sent to — swap the domain for one you own anytime.
3. **Enable login** (admin-only, opt-in, any age): `enableStudentLogin` uses the service-role client
   (`lib/admin.ts`) → `auth.admin.createUser({ email_confirm: true, user_metadata.signup_type:
   'student_code' })` (the `001` trigger creates the `profiles` row and skips the allowlist branch) →
   inserts an `institution_members role='student'` row → sets `students.user_id`. So the **existing**
   membership-based login, `/dashboard`, and `requireRole` all work unchanged. `resetStudentPassword` uses
   `auth.admin.updateUserById`. Credential is a **full password (min 8)**, set/reset by the admin.
4. **Login.** In `login/actions.ts`, an identifier without `@` is treated as a student code → mapped to the
   synthetic email before `signInWithPassword`. The field is labelled "Email or student code".

> A logged-in student currently lands on the generic `/dashboard` (it renders for `role='student'`). A
> dedicated student portal is the documented fast-follow.

---

## Database — migration `supabase/migrations/003_students.sql`

`students` keyed on `institution_id` (mirrors `002_coaches.sql`). Key columns: `full_name`,
`calling_name`, `dob`, `gender`, `parent_name`, `parent_mobile`, `parent_email` (**no unique
constraint**), `sports TEXT[]`, `enrolment_date`, `status` (`active`/`inactive`), `student_code`,
jersey fields, `monthly_fee`, `deposit_amount` (paise), `sms_opt_in`, and the two nullable login FKs
(`user_id`, `parent_user_id`).

The two optional per-student fee fields — `monthly_fee` and `deposit_amount` (one-time advance /
security deposit) — are `INT` in **paise** and nullable. These are student-level defaults; the payment
ledger (invoices, receipts) is Module 7.

**Uniqueness & duplicates** — names/DOB are *not* unique; the student code is:
- **No** hard `UNIQUE` on `(institution_id, full_name, dob)` — names collide; a hard key would reject
  legitimate students. A non-unique detection index backs the soft prompt.
- `student_code` is now **auto-generated and mandatory** (migration `008`) — `<institution code><4-digit
  per-institution sequence>`, e.g. `MVA0007`. Keys: the original partial `UNIQUE (institution_id,
  student_code)` **plus** a **global** `UNIQUE (lower(student_code))`. Global uniqueness is what lets the
  login email be derived from the code alone (no academy selector). It is never hand-edited — it's the
  login handle.

### Institution code + student-code infrastructure (`001_foundation.sql`)

The identifier plumbing lives in `001_foundation.sql`, not here: `institutions.code` (globally unique),
`institutions.student_seq` (atomic counter), the `generate_institution_code(name)` and
`next_student_code(institution_id)` RPCs (both `SECURITY DEFINER`; `next_student_code` is admin-guarded
and bumps the counter via `UPDATE … RETURNING`), and the `student_code` branch in `handle_new_user` so
the academy code is set at admin signup. The auth user for a student login is created from the app via the
service-role client `lib/admin.ts` — see [Student-Code Login](#student-code-login--migration-008).

**RLS** (call the `001` helpers — never query `institution_members` inside a policy):

| Action | `USING` / `WITH CHECK` |
|---|---|
| `SELECT` | `institution_id = ANY(get_my_institution_ids()) OR user_id = auth.uid() OR parent_user_id = auth.uid()` — members read the roster; the self/parent clauses are forward-compatible for the future portal |
| `INSERT` / `UPDATE` / `DELETE` | `is_admin_of(institution_id)` — admins only; deletes rare (prefer soft-delete) |

After running all migrations, **regenerate types via Bash** (PowerShell writes UTF-16+BOM):
`npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts`

> ⚠️ **Install the `supabase` CLI first** (`npm i -D supabase`). If it isn't installed, `npx`'s interactive
> "Need to install… Ok to proceed? (y)" prompt gets written **into** `types.ts`, truncating it → `next build`
> fails with *"types.ts is not a module"* (tsc may still pass). Recover with `git restore
> lib/supabase/types.ts`. Until all migrations are applied + types regenerated, new RPC calls use
> `(supabase.rpc as any)` casts — remove them post-regen.

---

## `planGuard` change

`planGuard(supabase, institutionId, 'student')` must count the **`students`** table (active rows), **not**
`institution_members` — students aren't members, so otherwise the Free-tier limit (15) never fires. The
`coach` branch still counts members. (`lib/planGuard.ts`.)

Enabling a student login inserts a `role='student'` member row, but because the student branch counts the
`students` table (not members), this **never double-counts** against the Free limit.

---

## Server Actions — `app/dashboard/students/actions.ts`

`'use server'`, `ActionState`, institution id from the `active_institution_id` cookie (never FormData).

| Action | Purpose |
|---|---|
| `createStudent(prev, fd)` | Validate required fields (zod); soft dup-check on `(institution_id, lower(full_name), dob)` → returns `{ duplicate, existingId }` unless `confirm='1'`; `planGuard('student')` → **auto-assign `student_code` via `next_student_code()`** → insert. Returns the assigned code. |
| `updateStudent(prev, fd)` | Patch one student by `id` + institution. A hidden `section` field (`profile`/`guardian`/`jersey`/`fees`) scopes which columns each tab writes. **`student_code` is no longer hand-edited** (it's the login handle). |
| `deactivateStudent(fd)` / `reactivateStudent(fd)` | Toggle `students.status` (soft-delete; row kept). |
| `enableStudentLogin(prev, fd)` | **Admin-only.** Create the student's Supabase auth user (synthetic email + password) via the service-role client, grant a `role='student'` member row, and set `students.user_id`. |
| `resetStudentPassword(prev, fd)` | **Admin-only.** `auth.admin.updateUserById` to set a new password for a student that already has a login. |

---

## Pages & Components

### `/dashboard/students` — list (`page.tsx` + `StudentsClient.tsx`)
- `requireRole('admin')`. Search (name / calling name / guardian mobile) + status filter (All / Active /
  Inactive). **Add Student** opens a side sheet (`components/ui/sheet`) with the full create form, wired
  to `createStudent` via `useActionState`. On a duplicate, the footer swaps to **Add anyway / View
  existing / Cancel** ("Add anyway" resubmits with `confirm=1`). Cards link to the detail page.

### `/dashboard/students/[id]` — detail (`page.tsx` + `StudentDetail.tsx`)
- `requireRole('admin')`. Native button tabs (Tabs primitive not installed):
  1. **Profile** — name, calling name, dob, gender, enrolment date, sports. **Student code is read-only** (auto-assigned login handle).
  2. **Parent** — name, mobile, email, `sms_opt_in` toggle.
  3. **Login** — shows the student code + login status; **Enable login** (set password) when none exists, else **Reset password**. Opt-in, any age.
  4. **Jersey** — size, number, name.
  5. **Fees** — monthly fee + advance/deposit (₹ inputs → stored in paise); note that the full ledger is Module 7.
  6. **Batches** — placeholder (Module 5).

The **Add Student** sheet also has an optional "Fees" section so monthly fee + deposit can be set at
enrolment time.
- **Deactivate / Reactivate** button toggles status.

Sports use the shared `components/dashboard/SportsField.tsx` (chip multi-select → hidden `sports` inputs),
seeded from `institutions.sports`.

### Nav
- `components/dashboard/DashboardSidebar.tsx` — `ADMIN_NAV` now links **Students → `/dashboard/students`**
  (replacing the old unused "Members" link).

---

## Completion Checklist

- [x] `students` table + RLS, nullable `user_id` / `parent_user_id`, `parent_email` with no unique key
- [x] No hard `UNIQUE` on `(institution_id, full_name, dob)`; partial `UNIQUE (institution_id, student_code)`
- [x] `planGuard('student')` counts the `students` table; blocks the 16th active student on Free tier
- [x] `requireRole('admin')` gates `/dashboard/students*`
- [x] Student list with search + status filter; **Add Student** sheet creates a record
- [x] Single create returns a soft "possible duplicate" prompt (Add anyway / View existing / Cancel)
- [x] Detail page: Profile / Guardian / Login / Jersey / Fees tabs save; Batches placeholder
- [x] Soft-delete sets `status='inactive'` (row kept); Reactivate restores
- [x] Student records are created via direct insert — never routed through `institution_allowed_emails`
- [x] **`001_foundation.sql`**: institution code + `generate_institution_code` / `next_student_code` RPCs, global unique index, `student_code` branch in `handle_new_user`
- [x] **Student-code login**: `enableStudentLogin` / `resetStudentPassword` via service-role `lib/admin.ts`; `login` accepts a code (synthetic email)
- [ ] **Apply migrations `001`–`003` in Supabase** + regenerate types via **Bash** (CLI installed); then drop the `(rpc as any)` casts
- [ ] _(fast-follow)_ CSV import · photo upload · dedicated student portal UI · parent portal · batch assignment

---

## Depends On

[Module 3 — Coach Management](./03-coach-management.md)

## Unlocks

[Module 5 — Batch Management](./05-batch-management.md)
