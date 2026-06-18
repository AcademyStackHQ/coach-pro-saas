# Module 3 — Coach Management

**Status:** `✅ Done`
**Priority:** 3 of 8
**Back to index:** [docs/README.md](../README.md)

---

## What This Module Delivers

- Admin: coach list + invite-by-email + manage coaching profile (soft-deactivate, never hard delete)
- Coaching profile data: programs taught, weekly availability grid, calendar colour
- Coach self-service: edit own availability; a coach-scoped dashboard view
- The foundation Module 5 (Batches) and Module 6 (Calendar) build on — a coach must exist before a batch can be assigned to one

---

## ⚠️ Architecture note — read before coding

The generic "coaches table keyed on `tenant_id`, role on `profiles`, `/invite/[token]`, `middleware.ts`,
separate `/coach` route group" design **does not match this codebase**. The real model, established in
Modules 1–2, is:

| Generic design (ignore) | This codebase (use) |
|---|---|
| `tenants` table, `tenant_id` FK | `institutions` table, `institution_id` FK |
| `profiles.role` | Role lives in **`institution_members.role`** (one row per user+institution) |
| `auth.admin.inviteUserByEmail()` + `/invite/[token]` | **`link_user_to_institution` RPC** + `institution_allowed_emails` allowlist + signup trigger (Module 1) |
| `middleware.ts` role-gating | **`proxy.ts`** (auth + institution cookie) + per-page role guard |
| Separate `/coach/*` route group | Single **`/dashboard`** group; sidebar branches on the `active_role` cookie |
| REST `/api/coaches` routes | **Server actions** (`'use server'`), the Module 1–2 pattern |

A "coach" is **already** a person with an `institution_members` row where `role = 'coach'`.
This module does **not** reinvent the invite — it reuses the existing allowlist flow and adds a
**`coaches` extension table** for coaching-specific attributes, plus the admin/coach UI.

---

## Database Tables

### `coaches` — a coaching-profile extension, not an identity

A `coaches` row holds the *coaching attributes* of a person who is already an active member of the
institution. Identity (login) and role live in `profiles` / `institution_members`; this table only adds
programs, availability, and calendar colour.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `institution_id` | `UUID FK → institutions` | RLS key |
| `user_id` | `UUID FK → profiles` | the coach's login. Set once the coach has joined (has a `profiles` row) |
| `programs` | `TEXT[] DEFAULT '{}'` | programs this coach can teach |
| `availability` | `JSONB DEFAULT '{}'` | **Multi-block per day** (supports split shifts): `{ "mon": [{"start":"06:00","end":"09:00"},{"start":"17:00","end":"20:00"}], "tue": [], ... }`. Distinct from `institutions.working_hours` (single open/start/end block) |
| `color` | `TEXT` | hex colour for the coach's calendar lane (Module 6). Auto-assigned from a palette, admin can override |
| `bio` | `TEXT` | optional short bio |
| `joined_at` | `DATE DEFAULT now()` | |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

```
CONSTRAINT coaches_institution_user_unique UNIQUE (institution_id, user_id)
```

> **No `status` column here.** Active/inactive is a property of *membership*, not of the coaching
> profile — it already lives in `institution_members.status`. Soft-deactivating a coach sets
> `institution_members.status = 'inactive'` (the existing "admins can update member status" policy and
> the `coaches` row is left intact). One source of truth, no drift.

**RLS** (mirror the Module 1 helper pattern — never query `institution_members` directly inside a
policy or you recurse):

| Action | `USING` / `WITH CHECK` |
|---|---|
| `SELECT` | `institution_id = ANY(public.get_my_institution_ids())` — any member can read coaches in their institution |
| `INSERT` | `public.is_admin_of(institution_id)` |
| `UPDATE` | `public.is_admin_of(institution_id) OR user_id = auth.uid()` — admin manages anyone; a coach edits their **own** availability |
| `DELETE` | `public.is_admin_of(institution_id)` — rarely used; prefer membership soft-delete |

**Index:** `(institution_id)` on `coaches`.

**Optional forward-use helper** (Module 5/6 will want it; cheap to add now):

```sql
CREATE OR REPLACE FUNCTION public.is_coach_of(p_institution_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institution_members
    WHERE institution_id = p_institution_id
      AND user_id = auth.uid() AND role = 'coach' AND status = 'active'
  );
$$;
```

---

## Two coach states

The coach list is the **union** of two sources, because an invited coach may not have signed up yet:

| State | Where it lives | UI |
|---|---|---|
| **Pending** | `institution_allowed_emails` (`role='coach'`, `status='pending'`) — no profile/membership yet | "Pending — awaiting sign-up" badge. No coaching profile editable yet |
| **Active** | `institution_members` (`role='coach'`, `status='active'`) + optional `coaches` extension row | Full profile: programs, availability, colour |

The `coaches` extension row is created lazily — the first time an admin saves coaching attributes for a
coach who has joined (`upsert` on `(institution_id, user_id)`). A freshly-joined coach with no extension
row yet simply shows empty programs/availability.

---

## Invite Flow (reuses Module 1, do not rebuild)

1. Admin opens **Add Coach** sheet → enters email (name/mobile optional, captured at signup).
2. Server action wraps the call in `planGuard(supabase, institutionId, 'coach')` — Free tier blocks a
   2nd coach.
3. Server action calls the existing RPC:
   ```ts
   await supabase.rpc('link_user_to_institution', {
     p_institution_id: institutionId, // from cookie, never the form
     p_email: email,
     p_role: 'coach',
     p_added_by: userId,
   })
   ```
   - If the email already has an account → membership created immediately (`status: 'joined'`).
   - If not → row added to `institution_allowed_emails` as `pending`; the Module 1 signup trigger
     links them on sign-up. (This is exactly what onboarding Step 2 already does.)
4. Coach signs up / signs in through the normal Module 1 flow — **no `/invite/[token]` page, no
   `inviteUserByEmail`.** (Optionally send them a notification email later via Module 8.)
5. On first admin edit of programs/availability/colour, the `coaches` extension row is upserted.

---

## Server Actions

Follow the Module 2 convention: `'use server'`, `ActionState` return type, institution id read from the
`active_institution_id` cookie (never from FormData), admin checks enforced by RLS / `is_admin_of`.

| Action | Purpose |
|---|---|
| `inviteCoach(prev, formData)` | `planGuard('coach')` → `link_user_to_institution(role='coach')`. Returns pending/joined |
| `updateCoachProfile(prev, formData)` | Upsert `coaches` (programs, bio, colour) for a `user_id` in the active institution |
| `saveCoachAvailability(prev, formData)` | Upsert `coaches.availability` JSONB (multi-block per day) |
| `deactivateCoach(formData)` | Set `institution_members.status = 'inactive'` for that user_id |
| `reactivateCoach(formData)` | Set `institution_members.status = 'active'` |
| `saveMyAvailability(prev, formData)` | Coach self-service: upsert own `coaches.availability` (`user_id = auth.uid()`) |

> If a REST surface is genuinely needed later (e.g. mobile app), add route handlers then. For the web
> app, server actions are the established pattern.

---

## Admin Pages

### `/dashboard/coaches` — Coach List

- Admin-only (per-page role guard — see below). The sidebar link already exists.
- Card or table view: name, programs tags, status badge (Active / Inactive / Pending).
- Status filter: All / Active / Inactive / Pending.
- **Add Coach** → side sheet (`components/ui/sheet`) with the invite form.
- Click an active coach → `/dashboard/coaches/[id]`.

### `/dashboard/coaches/[id]` — Coach Detail

`[id]` is the coach's `user_id`. Tabs (native buttons + state — **Tabs primitive is not installed**):

1. **Profile** — name, mobile, avatar (read from `profiles`), programs (multi-select), bio, colour swatch,
   join date. Programs/bio/colour save via `updateCoachProfile`.
2. **Availability** — 7-day grid; each day holds a **list** of start–end blocks (Add block / remove),
   so a coach can have split shifts. Implemented as the shared `AvailabilityEditor` component (modeled
   on the Module 2 working-hours editor but multi-block); saves JSONB via `saveCoachAvailability`.
3. **Batches** — the coach's assigned batches with per-day schedule label and active enrolment count, each linking to `/dashboard/batches/[id]` (Module 5). Empty-state when none.
4. **Calendar** — placeholder until Module 6 (read-only week view of this coach's sessions).

A **Deactivate** action (with confirm) sets membership inactive; deactivated coaches show a Reactivate
action.

---

## Coach Self-Service

The coach uses the **same `/dashboard`** — the sidebar already renders `COACH_NAV` when the
`active_role` cookie is `coach`.

- **`/dashboard/availability`** — coach edits their *own* availability grid (`saveMyAvailability`,
  guarded by `user_id = auth.uid()` in RLS). Add a "My Availability" link to `COACH_NAV`.
- `/dashboard` overview, "My Batches", and "Calendar" coach views are filled in by Modules 5–6.

---

## Role Gating

There is no `/coach` route group and no role logic in `proxy.ts` beyond auth + institution cookie.
Gate admin-only pages **per page** in the server component, reading the role from the cookie (the
existing convention):

```ts
const role = (await cookies()).get('active_role')?.value
if (role !== 'admin') redirect('/dashboard')
```

Extract this into a small `requireRole(role)` helper in `lib/` and reuse it for every admin-only page
(`/dashboard/coaches`, and later members/batches/fees).

---

## Calendar Colour

Maintain a `COACH_COLORS` palette in `lib/constants.ts` (e.g. 8–10 distinct hex values). On first
`coaches` row creation, auto-assign the next unused colour in the institution; the admin can override via
a swatch picker on the Profile tab. Module 6 reads `coaches.color` for calendar lanes.

---

## Completion Checklist

- [ ] `coaches` extension table created (`institution_id`, `user_id`, `programs`, `availability`, `color`, `bio`), **no `status` column**
- [ ] `UNIQUE (institution_id, user_id)` on `coaches`
- [ ] RLS: members read; admins write; a coach can update **own** row (`user_id = auth.uid()`)
- [ ] Optional `is_coach_of(institution_id)` helper added
- [ ] Types regenerated via **Bash** after migration (`npx supabase gen types ... > lib/supabase/types.ts`)
- [ ] `requireRole('admin')` helper gates `/dashboard/coaches*`
- [ ] `inviteCoach` wraps `planGuard(supabase, institutionId, 'coach')` → blocks 2nd coach on Free tier
- [ ] Invite reuses `link_user_to_institution` (no `inviteUserByEmail`, no `/invite/[token]`)
- [ ] Coach list unions active members (`role='coach'`) + pending allowlist rows, with correct badges
- [ ] "Add Coach" sheet invites and the new coach appears as Pending
- [ ] Coach detail Profile tab saves programs/bio/colour (upserts `coaches`)
- [ ] Availability grid saves the working-hours-shaped JSONB
- [ ] Deactivate sets `institution_members.status='inactive'` (row not deleted); Reactivate restores
- [ ] Colour auto-assigned from `COACH_COLORS`, admin override works
- [ ] `/dashboard/availability` lets a coach edit only their own availability
- [ ] "My Availability" added to `COACH_NAV`

---

## Depends On

[Module 2 — Academy Onboarding & Settings](./02-tenant-academy-setup.md)

## Unlocks

[Module 4 — Student Management](./04-student-management.md)
