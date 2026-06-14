# Module 4 — Student Management

**Status:** `🔲 Pending`
**Priority:** 4 of 8
**Back to index:** [Docs/README.md](./README.md)

---

## What This Module Delivers

- Student CRUD with full profile (personal, guardian, jersey details)
- Batch assignment (one student can be in multiple batches)
- CSV bulk import with error report
- Student profile page with fee history preview

---

## Database Tables

### `students`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `full_name` | `TEXT NOT NULL` | |
| `calling_name` | `TEXT` | nickname shown on calendar |
| `dob` | `DATE NOT NULL` | |
| `gender` | `TEXT` | `male` \| `female` \| `other` |
| `guardian_name` | `TEXT NOT NULL` | |
| `guardian_mobile` | `TEXT NOT NULL` | E.164 format, e.g. `+919876543210` |
| `guardian_email` | `TEXT` | |
| `sports` | `TEXT[]` | |
| `enrolment_date` | `DATE NOT NULL` | used for fee proration |
| `status` | `TEXT DEFAULT 'active'` | `active` \| `inactive` |
| `photo_url` | `TEXT` | Supabase Storage signed URL |
| `jersey_size` | `TEXT` | `XS` \| `S` \| `M` \| `L` \| `XL` \| `XXL` |
| `jersey_number` | `INT` | |
| `jersey_name` | `TEXT` | name printed on jersey |
| `sms_opt_in` | `BOOL DEFAULT true` | guardian consent for SMS |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

### `batch_students` (junction)

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `batch_id` | `UUID FK → batches` | |
| `student_id` | `UUID FK → students` | |
| `enrolled_at` | `DATE NOT NULL` | |
| `status` | `TEXT DEFAULT 'active'` | `active` \| `waitlisted` \| `dropped` |

Apply RLS to both tables.
Index: `(tenant_id, batch_id, status)` on `batch_students`.

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/students` | Paginated list. Filters: `batch`, `sport`, `status`, `search` |
| `POST` | `/api/students` | Create student. Calls `planGuard('student')` |
| `GET` | `/api/students/[id]` | Full profile with batches, fee summary, session count |
| `PATCH` | `/api/students/[id]` | Update any profile field |
| `DELETE` | `/api/students/[id]` | Soft-deactivate (`status = 'inactive'`) |
| `POST` | `/api/students/import` | CSV bulk import — returns success + error report |
| `POST` | `/api/students/[id]/batches` | Assign student to a batch |
| `DELETE` | `/api/students/[id]/batches/[batchId]` | Remove from batch (triggers waitlist promotion in Module 5) |

---

## Admin Pages

### `/students` — Student List

- Searchable table (name, calling name, guardian mobile)
- Filter chips: Batch, Sport, Status
- Columns: Photo · Name · Calling Name · Sport · Batch(es) · Status · Actions
- "Add Student" button → opens side sheet with create form
- "Import CSV" button → opens import flow

### `/students/[id]` — Student Profile

Tabs:
1. **Profile** — personal details + edit form
2. **Guardian** — guardian name, mobile, email, SMS opt-in toggle
3. **Batches** — enrolled batches with status badge; "Add to Batch" action
4. **Fee History** — ledger summary (populated in Module 7)
5. **Jersey** — size, number, jersey name

---

## CSV Import Flow

1. Admin downloads template: `GET /api/students/import/template` → returns CSV with column headers
2. Admin fills template and uploads
3. Server parses CSV, validates each row:
   - Required: `full_name`, `dob`, `guardian_name`, `guardian_mobile`
   - `guardian_mobile` must be parseable to E.164
   - `enrolment_date` defaults to today if blank
4. Preview table shown: valid rows (green) + error rows (red with reason)
5. Admin confirms → valid rows inserted, error rows skipped
6. Download error report (CSV of failed rows + error reason)

### CSV Column Headers
```
full_name, calling_name, dob, gender,
guardian_name, guardian_mobile, guardian_email,
sport, enrolment_date, jersey_size, jersey_number, jersey_name
```

---

## Completion Checklist

- [ ] `students` table created with RLS
- [ ] `batch_students` junction table created with RLS
- [ ] `planGuard('student')` blocks create on Free tier at 15 students
- [ ] Student list page renders with search + filters
- [ ] "Add Student" sheet creates student and optionally assigns to batch
- [ ] Student profile page loads with all 5 tabs
- [ ] Photo upload works (Supabase Storage `profile-photos` bucket)
- [ ] `sms_opt_in` toggle saves and is respected by SMS module
- [ ] CSV template download works
- [ ] CSV import validates, previews, and inserts valid rows
- [ ] CSV error report download works
- [ ] Soft-delete sets `status = 'inactive'`, does not remove rows
- [ ] Batch assignment creates `batch_students` row
- [ ] Removing from batch triggers waitlist promotion (Module 5)

---

## Depends On

[Module 3 — Coach Management](./03-coach-management.md)

## Unlocks

[Module 5 — Batch Management](./05-batch-management.md)
