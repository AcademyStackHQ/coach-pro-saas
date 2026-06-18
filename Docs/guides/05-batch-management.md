# Module 5 — Batch Management

**Status:** `✅ Done`
**Priority:** 5 of 8
**Back to index:** [docs/README.md](../README.md)

---

## Architecture note (how the build differs from the generic spec below)

The spec below uses `tenant_id` + REST API routes; the actual build follows this
codebase's conventions:

- **`institution_id`** (not `tenant_id`), with Supabase **RLS** via the shared
  helpers (`is_admin_of` / `is_coach_of` / `get_my_institution_ids`) — no
  app-level tenant filtering.
- **Server Actions** in `app/dashboard/batches/actions.ts` (not `/api` routes):
  `createBatch`, `updateBatch`, `deactivate/reactivateBatch`, `enrolStudent`,
  `removeStudent`. Institution is read from the httpOnly cookie via
  `getActiveSession()`, never from form fields.
- **Coaches control their own batches.** RLS helper `owns_batch_coach(coach_id)`
  lets a coach create/edit/manage enrolment for batches assigned to them; admins
  manage all. `/dashboard/batches` renders the coach's own batches (create form
  pins `coach_id` to self); only admins see the coach picker and the
  activate/deactivate toggle.
- **Per-day schedule.** Each training day carries its own start/end time
  (e.g. Fri 17:00–18:30, Sat/Sun 07:00–08:30), stored as a JSONB `schedule`
  array of `{ day, start, end }` on `batches` (`day` = JS `Date.getDay()`
  index, 0 = Sun … 6 = Sat) so the occurrence preview / calendar computes
  directly. The form serialises selected days + times into a hidden `schedule`
  field; `parseSchedule()` (`lib/constants.ts`) validates it on read.
- **Money** (`monthly_fee`) in **paise**. Conflict detection runs server-side in
  TS, comparing the new batch's per-day slots against the institution's active
  batches slot-by-slot (same day + JS time-overlap): coach clash hard-blocks,
  venue clash warns with an override confirm.
- Tables: `batches` + `batch_students` (join, with `active`/`waitlisted`/
  `dropped` status) in `supabase/migrations/004_batches.sql`. `planGuard('batch')`
  counts active batches (Free limit 2). Capacity badge + schedule label helpers
  live in `lib/constants.ts`; the shared form is `components/dashboard/BatchFormFields.tsx`.
- The Batches tabs on the coach and student detail pages now render real
  enrolment data.

---

## What This Module Delivers

- Batch CRUD with schedule conflict detection (coach + venue)
- Capacity management with automatic waitlist promotion
- Batch detail page with enrolled student list
- Status badges (Available / Almost Full / Full)

---

## Database Table

### `batches`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `name` | `TEXT NOT NULL` | e.g. "U-12 Cricket Morning" |
| `program` | `TEXT NOT NULL` | |
| `coach_id` | `UUID FK → coaches` | |
| `schedule` | `JSONB NOT NULL DEFAULT '[]'` | per-day slots `[{ day, start, end }]`, `day` = 0 = Sun … 6 = Sat |
| `venue` | `TEXT` | |
| `capacity` | `INT NOT NULL` | max active enrolments |
| `monthly_fee` | `INT NOT NULL` | in **paise** |
| `status` | `TEXT DEFAULT 'active'` | `active` \| `inactive` |
| `effective_from` | `DATE NOT NULL` | first date occurrences are generated from |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

Apply RLS. Index: `(tenant_id, coach_id, status)`.

---

## Conflict Detection (Server-Side)

Run before every create and update (if schedule fields changed).

### Coach conflict check
```sql
SELECT id, name FROM batches
WHERE tenant_id = $tenantId
  AND coach_id = $coachId
  AND status = 'active'
  AND id != $excludeId          -- exclude self on update
  AND days_of_week && $days     -- overlapping days
  AND NOT (end_time <= $startTime OR start_time >= $endTime)
```

### Venue conflict check (same query, filter by `venue = $venue` instead of `coach_id`)

Return conflict details to the client — show a warning card listing the clashing batches by name and schedule. Admin can override venue conflicts but coach conflicts are hard-blocked.

---

## Capacity & Waitlist Logic

**Active count query:**
```sql
SELECT COUNT(*) FROM batch_students
WHERE batch_id = $id AND status = 'active'
```

**On new enrolment:**
- If `active_count < capacity` → insert with `status = 'active'`
- If `active_count >= capacity` → insert with `status = 'waitlisted'`

**On student removal / drop:**
1. Set `batch_students.status = 'dropped'` for the removed student
2. Find first waitlisted student (ordered by `enrolled_at ASC`)
3. Promote to `status = 'active'`
4. Notify admin via in-app notification (SMS in Module 8)

**Capacity badge thresholds:**

| Colour | Condition |
|---|---|
| Green (Available) | enrolled < 80% of capacity |
| Amber (Almost Full) | enrolled ≥ 80% and < 100% |
| Red (Full) | enrolled = capacity |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/batches` | List all batches with enrolled count |
| `POST` | `/api/batches` | Create batch. Calls conflict check + `planGuard('batch')` |
| `GET` | `/api/batches/[id]` | Batch detail with enrolled students |
| `PATCH` | `/api/batches/[id]` | Update. Re-runs conflict check if schedule changed |
| `DELETE` | `/api/batches/[id]` | Soft-deactivate (`status = 'inactive'`) |
| `GET` | `/api/batches/[id]/students` | Enrolled students with status |
| `POST` | `/api/batches/[id]/students` | Enrol student (handles waitlist automatically) |
| `DELETE` | `/api/batches/[id]/students/[sid]` | Remove + promote waitlisted |

---

## Admin Pages

### `/batches` — Batch List

- Card view (not table — schedule info is richer in cards)
- Card content: name, program, coach name, days+time, venue, capacity badge, monthly fee
- Filter: Program / Coach / Status
- "Create Batch" button → opens modal

### Create Batch Modal

Fields:
- Name, Program, Coach (dropdown from active coaches), Venue
- Training days (chip toggles: M T W T F S S) — selecting a day reveals its own
  Start/End time pickers, so each day can run at a different time. A "use the
  first day's time for all" shortcut fills the rest.
- Capacity (number input)
- Monthly fee (INR input → stored × 100 as paise)
- Effective from (date picker)

On submit: run conflict check → if clear, create. If conflict → show blocking error for coach clash, show warning for venue clash.

### `/batches/[id]` — Batch Detail

Tabs:
1. **Overview** — schedule, venue, capacity doughnut chart, monthly fee
2. **Students** — table of enrolled students with status badge (Active / Waitlisted)
   - "Add Student" → search existing students, enrol
   - "Remove" per row → triggers waitlist promotion
3. **Schedule** — read-only occurrence preview for next 4 weeks

---

## Completion Checklist

- [x] `batches` (+ `batch_students`) tables created with RLS
- [x] `planGuard('batch')` blocks create on Free tier at 2 batches
- [x] Coach conflict check blocks overlapping schedule for same coach
- [x] Venue conflict check warns (non-blocking, override) for overlapping venue
- [x] Capacity badge renders correct colour on batch cards
- [x] Enrolment beyond capacity auto-sets `status = 'waitlisted'`
- [x] Removing a student promotes first waitlisted student
- [x] Batch list page filters by program / coach / status
- [x] Batch detail "Students" tab shows enrolled + waitlisted rows
- [x] "Add Student" to batch enrols from the institution's active students
- [x] Soft-delete sets `status = 'inactive'`, does not remove rows
- [x] Coaches can create/edit/manage enrolment for their own batches

---

## Depends On

[Module 4 — Student Management](./04-student-management.md)

## Unlocks

[Module 6 — Calendar & Scheduling](./06-calendar-scheduling.md)
