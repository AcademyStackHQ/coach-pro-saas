# Module 3 — Coach Management

**Status:** `🔲 Pending`
**Priority:** 3 of 8
**Back to index:** [Docs/README.md](./README.md)

---

## What This Module Delivers

- Admin: full coach CRUD + invite-by-email flow
- Coach: personal dashboard (own calendar, batches, students)
- Coach availability grid (per-day time blocks)
- Calendar colour coding per coach

---

## Database Tables

### `coaches`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | equals `profiles.id` |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `profile_id` | `UUID FK → profiles` | joins to full name, mobile, avatar |
| `sports` | `TEXT[]` | sports this coach can teach |
| `availability` | `JSONB` | `{ mon: [{start, end}], ... }` |
| `color` | `TEXT` | hex colour for calendar lane |
| `status` | `TEXT DEFAULT 'active'` | `active` \| `inactive` |
| `joined_at` | `DATE` | |

Apply RLS: `tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())`.

---

## Invite Flow

1. Admin fills: full name, email, mobile
2. Server calls `supabase.auth.admin.inviteUserByEmail()` (uses `SUPABASE_SERVICE_ROLE_KEY`)
3. Supabase sends invite email with magic link → `/invite/[token]`
4. Coach lands on invite page, sets a password
5. `profiles` row already exists (created by DB trigger on `auth.users` insert) — update `role = 'coach'`
6. Insert `coaches` row for this profile
7. Coach is redirected to `/coach/calendar`

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/coaches` | List coaches for tenant (name, sports, status, batch count) |
| `POST` | `/api/coaches` | Create profile + send invite. Calls `planGuard('coach')` |
| `GET` | `/api/coaches/[id]` | Full profile + availability + assigned batches |
| `PATCH` | `/api/coaches/[id]` | Update profile fields or availability |
| `DELETE` | `/api/coaches/[id]` | Soft-deactivate (`status = 'inactive'`) — never hard delete |
| `GET` | `/api/coaches/[id]/schedule` | Sessions + batch occurrences for a date range |

---

## Admin Pages

### `/coaches` — Coach List

- Card or table view: name, sports tags, status badge, assigned batch count
- "Add Coach" → opens side sheet with invite form
- Status filter: Active / Inactive
- Click card → navigate to `/coaches/[id]`

### `/coaches/[id]` — Coach Detail

Tabs:
1. **Profile** — name, mobile, avatar (upload), sports, join date
2. **Availability** — 7-day grid, each day has time-block inputs (same pattern as working hours)
3. **Batches** — list of assigned batches with schedule summary
4. **Calendar** — mini week view of this coach's sessions (read-only for admin)

---

## Coach Dashboard (`/coach`)

Role-gated — `middleware.ts` blocks admin from accessing this route group.

### `/coach/calendar`
- Week view by default
- Shows only this coach's sessions and batch occurrences
- Click session → view details / mark completed / mark no-show

### `/coach/students`
- List of all students enrolled in this coach's batches
- Search by name
- Click student → read-only student profile (name, photo, contact)

---

## Completion Checklist

- [ ] `coaches` table created with RLS
- [ ] `planGuard('coach')` blocks invite on Free tier when 1 coach exists
- [ ] Invite email sends via Supabase Auth
- [ ] `/invite/[token]` page completes coach profile setup
- [ ] Admin `/coaches` list renders with correct data
- [ ] "Add Coach" sheet form POSTs and triggers invite
- [ ] Availability grid saves JSONB correctly
- [ ] Coach colour field saved and used in calendar (Module 6)
- [ ] Soft-delete (`status = 'inactive'`) does not remove DB rows
- [ ] `/coach/calendar` is inaccessible to admin users
- [ ] `/coach/students` shows only students in this coach's batches

---

## Depends On

[Module 2 — Tenant & Academy Setup](./02-tenant-academy-setup.md)

## Unlocks

[Module 4 — Student Management](./04-student-management.md)
