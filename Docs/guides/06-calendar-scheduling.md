# Module 6 — Calendar & Scheduling

**Status:** `✅ Done`
**Priority:** 6 of 8
**Back to index:** [docs/README.md](../README.md)

> **Built note (reconciled with the live codebase):** the spec below predates later
> schema changes. As shipped: keyed by `institution_id` (not `tenant_id`); batch
> occurrences are computed from `batches.schedule` JSONB (the old `days_of_week` +
> single `start_time`/`end_time` were dropped in migration 006); and there are **no
> `/api/*` route handlers** — the calendar is a server component reading `view`/`anchor`
> from searchParams, with session mutations as server actions in
> `app/dashboard/calendar/actions.ts`. Views shipped: **Week + Month** (Day deferred).
> Migration: `supabase/migrations/007_sessions.sql`.

---

## What This Module Delivers

- Day / Week / Month calendar views for admin and coach
- Batch occurrence generation (computed on-the-fly — not stored)
- 1-to-1 session booking with conflict detection
- Session status management (completed, cancelled, no-show)
- Coach-colour-coded calendar lanes

---

## Database Table

### `sessions` (1-to-1 only)

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `coach_id` | `UUID FK → coaches` | |
| `student_id` | `UUID FK → students` | |
| `date` | `DATE NOT NULL` | |
| `start_time` | `TIME NOT NULL` | |
| `end_time` | `TIME NOT NULL` | |
| `venue` | `TEXT` | |
| `fee_override` | `INT` | in paise; NULL = use batch/default rate |
| `status` | `TEXT DEFAULT 'scheduled'` | `scheduled` \| `completed` \| `cancelled` \| `no_show` |
| `notes` | `TEXT` | coach notes after session |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

Apply RLS. Index: `(tenant_id, coach_id, date)`.

---

## Calendar API

### `GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`

Server computes and merges two event types:

**1. Batch occurrences (computed on-the-fly):**
For each active batch, iterate its `schedule` slots (`[{ day, start, end }]`, `day` =
JS `Date.getDay()` index, 0 = Sun … 6 = Sat — see Module 5) × date range:
- Generate occurrence dates where `date >= effective_from` and `date`'s weekday matches a
  slot's `day`; the slot's `start`/`end` give that occurrence's time (per-day times vary)
- Return as virtual events (no DB row)

**2. 1-to-1 sessions (from DB):**
Query `sessions` table for the date range.

**Response shape:**
```json
{
  "batch_occurrences": [
    {
      "type": "batch",
      "batch_id": "...",
      "batch_name": "U-12 Cricket",
      "date": "2025-07-07",
      "start_time": "07:00",
      "end_time": "09:00",
      "venue": "Ground A",
      "coach_id": "...",
      "coach_name": "Ravi Kumar",
      "coach_color": "#3b82f6",
      "enrolled_count": 12,
      "capacity": 15
    }
  ],
  "sessions": [
    {
      "type": "session",
      "id": "...",
      "student_name": "Arjun S",
      "coach_name": "Ravi Kumar",
      "coach_color": "#3b82f6",
      "date": "2025-07-07",
      "start_time": "11:00",
      "end_time": "12:00",
      "status": "scheduled"
    }
  ]
}
```

---

## Calendar UI

Install and configure one of:
- `react-big-calendar` (lighter, more customisable)
- `FullCalendar` (feature-rich, has resource view for coach lanes)

### View Modes

| View | Default for | What it shows |
|---|---|---|
| Month | Admin | Dot indicators per day; click day to expand events list |
| Week | Coach | Colour-coded coach lanes; hour-slot grid |
| Day | Admin | 30-min slot grid; drag handles for rescheduling |

### Event Colours
- Batch occurrences use `coaches.color` (set in Module 3)
- Sessions use same coach colour, different opacity or border style
- Cancelled sessions shown with strikethrough / grey

### Role Differences
- Admin: sees ALL coaches' events; can create/edit any session
- Coach: sees ONLY own sessions and own batch occurrences; can mark status only

---

## 1-to-1 Session Booking

### `/api/sessions` routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/sessions` | Book session with conflict check |
| `PATCH` | `/api/sessions/[id]` | Update time/venue/notes |
| `PATCH` | `/api/sessions/[id]/status` | Mark completed / cancelled / no-show |
| `DELETE` | `/api/sessions/[id]` | Hard cancel (sets status = cancelled) |

### Conflict Check on Booking

Before insert, run both checks:

**Coach conflict:**
```sql
-- Check sessions table
SELECT id FROM sessions
WHERE coach_id = $coachId AND date = $date AND status != 'cancelled'
  AND NOT (end_time <= $startTime OR start_time >= $endTime)

-- ALSO check batch occurrences for that date
-- (computed in app logic — check the batch's `schedule` slot for this date's weekday, time overlap)
```

**Student conflict:**
```sql
SELECT id FROM sessions
WHERE student_id = $studentId AND date = $date AND status != 'cancelled'
  AND NOT (end_time <= $startTime OR start_time >= $endTime)
```

If any conflict found → return 409 with clash details.

### Booking Modal (Admin)

Fields:
- Coach (dropdown — active coaches)
- Student (searchable dropdown — active students)
- Date (date picker, respects `working_hours`)
- Start time / End time
- Venue
- Fee override (optional — INR input stored in paise)

### Status Transitions

| From | To | Who |
|---|---|---|
| Scheduled | Completed | Coach or Admin |
| Scheduled | No-show | Coach or Admin |
| Scheduled | Cancelled | Admin only |
| Completed / No-show | — | Final (no further transitions) |

---

## Completion Checklist

- [ ] `sessions` table created with RLS
- [ ] `GET /api/calendar` returns merged batch occurrences + sessions
- [ ] Batch occurrences computed correctly from the batch `schedule` slots + `effective_from`
- [ ] Calendar renders in Month / Week / Day views
- [ ] Coach colour lanes work in Week view
- [ ] Admin sees all coaches' events; coach sees only own
- [ ] 1-to-1 booking modal opens from calendar (click empty slot)
- [ ] Coach conflict check blocks double-booking
- [ ] Student conflict check blocks double-booking
- [ ] Conflicts show descriptive error (which batch/session clashes)
- [ ] Status transitions work (completed, no-show, cancelled)
- [ ] Coach can add notes on session completion
- [ ] Cancelled sessions shown visually distinct on calendar

---

## Depends On

[Module 5 — Batch Management](./05-batch-management.md)

## Unlocks

[Module 7 — Fee Management](./07-fee-management.md)
