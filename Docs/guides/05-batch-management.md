# Module 5 — Batch Management

**Status:** `🔲 Pending`
**Priority:** 5 of 8
**Back to index:** [docs/README.md](../README.md)

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
| `sport` | `TEXT NOT NULL` | |
| `coach_id` | `UUID FK → coaches` | |
| `days_of_week` | `INT[]` | 0 = Sun … 6 = Sat |
| `start_time` | `TIME NOT NULL` | |
| `end_time` | `TIME NOT NULL` | |
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
- Card content: name, sport, coach name, days+time, venue, capacity badge, monthly fee
- Filter: Sport / Coach / Status
- "Create Batch" button → opens modal

### Create Batch Modal

Fields:
- Name, Sport, Coach (dropdown from active coaches), Venue
- Days of week (checkbox group: M T W T F S S)
- Start time / End time (time pickers)
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

- [ ] `batches` table created with RLS
- [ ] `planGuard('batch')` blocks create on Free tier at 2 batches
- [ ] Coach conflict check blocks overlapping schedule for same coach
- [ ] Venue conflict check warns (non-blocking) for overlapping venue
- [ ] Capacity badge renders correct colour on batch cards
- [ ] Enrolment beyond capacity auto-sets `status = 'waitlisted'`
- [ ] Removing a student promotes first waitlisted student
- [ ] Batch list page filters by sport / coach / status
- [ ] Batch detail "Students" tab shows enrolled + waitlisted rows
- [ ] "Add Student" to batch calls Module 4's enrolment API
- [ ] Soft-delete sets `status = 'inactive'`, does not remove rows

---

## Depends On

[Module 4 — Student Management](./04-student-management.md)

## Unlocks

[Module 6 — Calendar & Scheduling](./06-calendar-scheduling.md)
