# Module 7 — Fee Management

**Status:** `🔲 Pending`
**Priority:** 7 of 8
**Back to index:** [Docs/README.md](./README.md)

---

## What This Module Delivers

- Monthly fee ledger auto-generated on 1st of each month (Vercel Cron)
- Fee proration for mid-month enrolments
- Payment recording (cash, UPI, card, cheque)
- PDF receipt generation + Supabase Storage upload
- Fee dashboard with collection stats
- Defaulters list with one-click SMS trigger (bridges to Module 8)
- Payment void support

---

## Database Tables

### `fee_ledger`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `student_id` | `UUID FK → students` | |
| `batch_id` | `UUID FK → batches` | NULL for 1-to-1 sessions |
| `month_year` | `DATE NOT NULL` | first day of the month, e.g. `2025-07-01` |
| `amount_due` | `INT NOT NULL` | in **paise** |
| `amount_paid` | `INT DEFAULT 0` | in **paise** |
| `balance` | `INT GENERATED ALWAYS AS (amount_due - amount_paid) STORED` | |
| `status` | `TEXT DEFAULT 'pending'` | `pending` \| `partial` \| `paid` \| `waived` |
| `due_date` | `DATE` | typically 10th of the month |
| `notes` | `TEXT` | admin notes |

### `fee_payments`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `ledger_id` | `UUID FK → fee_ledger` | |
| `amount` | `INT NOT NULL` | in **paise** |
| `paid_at` | `TIMESTAMPTZ NOT NULL` | |
| `payment_mode` | `TEXT NOT NULL` | `cash` \| `upi` \| `card` \| `cheque` |
| `receipt_number` | `TEXT UNIQUE` | sequential per tenant, e.g. `RCP-2025-0042` |
| `receipt_url` | `TEXT` | 7-day signed URL to PDF in Storage |
| `recorded_by` | `UUID FK → profiles` | admin who recorded this |
| `voided_at` | `TIMESTAMPTZ` | NULL = active; non-null = voided |

Apply RLS to both tables. Index: `(tenant_id, student_id, month_year)` on `fee_ledger`.

---

## Monthly Ledger Auto-Generation

### Vercel Cron Job

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/fees/ledger/generate",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

Runs at midnight on the 1st of each month (UTC).

### Generation Logic (`POST /api/fees/ledger/generate`)

```
For each active batch:
  For each active batch_student in that batch:
    If fee_ledger row already exists for (student_id, batch_id, month_year) → SKIP (idempotent)
    Else:
      days_in_month = last_day_of_month - first_day_of_month + 1
      If student.enrolment_date is within current month:
        proration_factor = (days_in_month - enrolment_day + 1) / days_in_month
        amount_due = ROUND(batch.monthly_fee * proration_factor)
      Else:
        amount_due = batch.monthly_fee
      INSERT fee_ledger (student_id, batch_id, month_year, amount_due, due_date)
```

This endpoint is also callable manually by admin from the UI.

---

## Payment Recording Flow

### `POST /api/fees/payments`

1. Validate: `ledger_id`, `amount` (> 0), `payment_mode`
2. Check ledger is not already `paid` or `waived`
3. Generate `receipt_number`: query `MAX(receipt_number)` for tenant → increment
4. Insert `fee_payments` row
5. Update `fee_ledger.amount_paid += amount`
6. Recalculate `status`:
   - `amount_paid = 0` → `pending`
   - `0 < amount_paid < amount_due` → `partial`
   - `amount_paid >= amount_due` → `paid`
7. Generate PDF receipt (see below)
8. Upload PDF to Supabase Storage
9. Update `fee_payments.receipt_url` with signed URL
10. Return payment record + receipt URL

---

## PDF Receipt

### Content
- Academy logo + name
- Receipt number + date
- Student name + batch name
- Month
- Amount paid (formatted as INR)
- Payment mode
- Amount due / balance
- Recorded by (admin name)
- "Paid" stamp if balance = 0

### Generation
Use `@react-pdf/renderer` (server-side, no browser required) or Puppeteer (heavier but full HTML→PDF).

**Storage path:** `receipts/{tenant_id}/{YYYY}/{MM}/{receipt_number}.pdf`
**Signed URL TTL:** 7 days (regenerate on access if expired)

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/fees` | Dashboard summary (collected, outstanding, overdue, rate) |
| `GET` | `/api/fees/ledger` | Paginated ledger. Filters: student, batch, month, status |
| `POST` | `/api/fees/ledger/generate` | Manual trigger for monthly generation |
| `POST` | `/api/fees/payments` | Record payment + generate receipt |
| `DELETE` | `/api/fees/payments/[id]` | Void payment (sets `voided_at`, reverses `amount_paid`) |
| `GET` | `/api/fees/receipts/[id]` | Return fresh signed URL for PDF |

---

## Fee Dashboard (`/fees`)

### Summary Cards (top row)

| Card | Metric |
|---|---|
| Total Collected | `SUM(amount_paid)` for current month, current tenant |
| Total Outstanding | `SUM(balance)` where `status IN ('pending', 'partial')` |
| Overdue | `COUNT(*)` where `due_date < TODAY` AND `status != 'paid'` |
| Collection Rate | `SUM(amount_paid) / SUM(amount_due) * 100` % |

### Defaulters Table (below cards)

Columns: Student Name · Batch · Month · Due · Paid · Balance · Due Date · Actions

Actions per row:
- "Record Payment" → opens payment modal
- "Send SMS" → triggers Module 8 SMS send for this student (pre-fills template `fee_reminder`)
- "Waive" → sets status = `waived`, balance = 0

### Filters
- Month selector (default: current month)
- Batch filter
- Status filter (pending / partial / paid / overdue / waived)

---

## Payment Modal

Fields:
- Amount (INR — auto-fills outstanding balance, editable for partial)
- Payment mode (radio: Cash / UPI / Card / Cheque)
- Date (defaults to today)
- Notes (optional)

On submit → calls `POST /api/fees/payments` → on success, shows receipt link.

---

## Completion Checklist

- [ ] `fee_ledger` table created with RLS and generated `balance` column
- [ ] `fee_payments` table created with RLS
- [ ] Vercel Cron job configured in `vercel.json`
- [ ] `/api/fees/ledger/generate` is idempotent (safe to run multiple times)
- [ ] Fee proration calculates correctly for mid-month enrolments
- [ ] Payment recording updates `amount_paid` and recalculates `status`
- [ ] `receipt_number` is sequential and unique per tenant
- [ ] PDF receipt generates and uploads to Supabase Storage
- [ ] Signed URL is valid and returned to client
- [ ] Fee dashboard summary cards show correct figures for current month
- [ ] Defaulters list filters by month, batch, status
- [ ] "Record Payment" modal works end-to-end
- [ ] Payment void reverses `amount_paid` and resets ledger status
- [ ] "Send SMS" button on defaulter row bridges to Module 8
- [ ] Admin can manually trigger ledger generation from UI

---

## Depends On

[Module 6 — Calendar & Scheduling](./06-calendar-scheduling.md)

## Unlocks

[Module 8 — SMS Notifications](./08-sms-notifications.md)
