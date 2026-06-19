# Module 8 — SMS Notifications

**Status:** `✅ Done` (migration `007_sms.sql`; runs on a `mock` no-op provider until `SMS_PROVIDER` / `WHATSAPP_PROVIDER` is set)
**Priority:** 8 of 8 — final MVP module
**Back to index:** [docs/README.md](../README.md)

---

## What This Module Delivers

- Bulk fee reminders from the Fees dashboard (multi-select defaulters)
- **Multi-channel: SMS + WhatsApp**, routed by a per-student preference
- Editable message templates with placeholder tokens
- Message log table — full send history (per channel)
- Credit tracking — decrement on send, low-credit banner

> **As built (reconciliation — the spec below predates the build):** uses
> `institution_id`/`institutions` (not `tenant_id`/`tenants`). The send is a **server action**
> (`app/dashboard/sms/actions.ts#sendFeeReminders`) invoked from `FeesClient`, not a
> `POST /api/sms/send` route.
>
> **Multi-channel (SMS + WhatsApp):** each student has a `students.contact_channel`
> preference (`sms` | `whatsapp` | `both`; `both` = two messages), set by the admin on the
> Add-Student form + Parent tab and **self-editable by the student in My Profile**. It is the
> single routing + consent control — the legacy `sms_opt_in` column is **retired from the send
> path** (kept in the schema, no longer read). The messaging layer is **`lib/messaging`**:
> channel- and provider-aware, env-selected (`SMS_PROVIDER` / `WHATSAPP_PROVIDER`), with a
> **`mock` provider as the default** (logs `[msg:mock:<channel>]`, no real send). A real vendor
> (MSG91/Meta/Twilio) is one registry entry in `lib/messaging/index.ts#providerFor` — no call-site
> change. `sms_logs` gained a `channel` column; one row per message.
>
> Token resolution is `lib/messaging/tokens.ts#resolveTemplate` (reuses `paiseToRupees`/`monthLabel`/
> `smsDateLabel`). Credits **decrement per message (floored at 0) but never block** — no top-up
> flow; a banner shows at ≤ 20. Templates are seeded per institution by a trigger in `007_sms.sql`
> (existing academies backfilled). **Deferred:** the HMAC delivery webhook (columns
> `gateway_ref`/`delivered_at` reserved), auto payment-confirmation, real providers + WhatsApp
> template/HSM approval, and a separate WhatsApp number (reuses `parent_mobile`).

---

## Database Tables

### `sms_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `ledger_id` | `UUID FK → fee_ledger` | NULL for non-fee messages |
| `student_id` | `UUID FK → students` | |
| `mobile` | `TEXT NOT NULL` | E.164 format |
| `message` | `TEXT NOT NULL` | resolved message body (after token substitution) |
| `gateway_ref` | `TEXT` | MSG91 message ID for delivery tracking |
| `status` | `TEXT DEFAULT 'sent'` | `sent` \| `delivered` \| `failed` |
| `sent_at` | `TIMESTAMPTZ NOT NULL` | |
| `delivered_at` | `TIMESTAMPTZ` | populated by webhook |

### `sms_templates`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `tenant_id` | `UUID FK → tenants` | RLS key |
| `name` | `TEXT NOT NULL` | e.g. `fee_reminder`, `payment_confirmation` |
| `body` | `TEXT NOT NULL` | with `{placeholder}` tokens |
| `updated_at` | `TIMESTAMPTZ DEFAULT now()` | |

Apply RLS to both tables.

### Default Seed Templates

```sql
INSERT INTO sms_templates (tenant_id, name, body) VALUES
  ($tenantId, 'fee_reminder',
   'Hi {parent_name}, fees of Rs.{amount_due} for {student_name} ({batch_name}) for {month} are due by {due_date}. - {academy_name}'),
  ($tenantId, 'payment_confirmation',
   'Hi {parent_name}, payment of Rs.{amount_paid} for {student_name} received on {payment_date}. Receipt no: {receipt_number}. - {academy_name}');
```

---

## Available Placeholder Tokens

| Token | Resolved from |
|---|---|
| `{parent_name}` | `students.parent_name` |
| `{student_name}` | `students.full_name` |
| `{batch_name}` | `batches.name` |
| `{month}` | `fee_ledger.month_year` formatted as "July 2025" |
| `{amount_due}` | `fee_ledger.amount_due / 100` (INR) |
| `{amount_paid}` | `fee_payments.amount / 100` (INR) |
| `{due_date}` | `fee_ledger.due_date` formatted as "10 Jul 2025" |
| `{payment_date}` | `fee_payments.paid_at` |
| `{receipt_number}` | `fee_payments.receipt_number` (reference number) |
| `{academy_name}` | `tenants.name` |

---

## Messaging Adapter (as built)

**Directory:** `lib/messaging/` (the original spec sketched a single `lib/sms/index.ts`).

Channel-aware (SMS + WhatsApp) and provider-pluggable. Each channel resolves its
provider from env, defaulting to a `mock` no-op that logs and sends nothing:

```ts
// lib/messaging/index.ts
//   SMS_PROVIDER=msg91     → real SMS via that provider
//   WHATSAPP_PROVIDER=meta → real WhatsApp via that provider
//   (unset)                → mock (default — logs [msg:mock:<channel>], no real send)

export interface MessageProvider {
  send(channel: Channel, to: string, body: string): Promise<MessageResult>
}
```

Wiring a real vendor (MSG91 / Meta / Twilio) is one registry entry in
`lib/messaging/index.ts#providerFor` — no call-site change. A student's
`contact_channel` (`sms` | `whatsapp` | `both`) drives which channels each message
goes out on (`channelsFor`).

---

## Send Flow

### `POST /api/sms/send`

Request body:
```json
{
  "template_name": "fee_reminder",
  "student_ids": ["uuid1", "uuid2"],
  "ledger_ids": ["ledger-uuid1", "ledger-uuid2"]
}
```

Server logic:
1. Load template body
2. For each student:
   a. Check `students.sms_opt_in = true` — skip if false
   b. Resolve all `{tokens}` for this student/ledger
   c. Call `gateway.send(mobile, resolvedMessage)`
   d. Insert `sms_logs` row with `status = 'sent'`
3. Decrement `tenants.sms_credits` by count of messages sent
4. If `sms_credits <= 20` after send → create in-app alert for admin
5. Return `{ sent: N, skipped: N, failed: N }`

---

## HMAC Webhook (Delivery Status)

### `POST /api/sms/webhook` (public endpoint — no auth cookie required)

MSG91 calls this with delivery status updates.

**HMAC verification:**
```ts
const sig = req.headers['x-msg91-signature']
const expected = createHmac('sha256', process.env.SMS_WEBHOOK_SECRET!)
  .update(rawBody)
  .digest('hex')

if (sig !== expected) return Response.json({ error: 'Unauthorized' }, { status: 401 })
```

**Payload handling:**
```ts
// Update sms_logs where gateway_ref = payload.messageId
UPDATE sms_logs SET status = $status, delivered_at = $timestamp
WHERE gateway_ref = $messageId
```

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/sms/send` | Required | Send to one or many students |
| `POST` | `/api/sms/webhook` | HMAC only | Delivery status from MSG91 |
| `GET` | `/api/sms/logs` | Required | Paginated send history |
| `GET` | `/api/sms/templates` | Required | List templates |
| `PATCH` | `/api/sms/templates/[id]` | Required | Update template body |

---

## Admin UI

### Send from Fee Dashboard

1. Check one or more rows in defaulters table
2. Click "Send SMS" button
3. Modal shows:
   - Template selector (default: `fee_reminder`)
   - Preview of resolved message for first selected student
   - Count of recipients (skipping opt-out)
4. Confirm → call `POST /api/sms/send`
5. Toast: "12 sent, 1 skipped (opted out)"

### SMS Logs (`/settings` → SMS tab)

Filterable table:
- Columns: Student · Mobile · Message (truncated) · Status · Sent At · Delivered At
- Filter: Status (sent / delivered / failed) · Date range
- Status badge: green = delivered, amber = sent, red = failed

### Template Editor (`/settings` → SMS tab)

- List of templates
- Click to edit `body` field — inline text editor with token hint chips
- "Preview" button → resolves tokens with sample data
- Save → `PATCH /api/sms/templates/[id]`

---

## Completion Checklist

- [ ] `sms_logs` table created with RLS
- [ ] `sms_templates` table created with RLS
- [ ] Default templates seeded per tenant on onboarding
- [ ] `lib/sms/index.ts` adapter with `noop` for dev + `msg91` for production
- [ ] Token resolution covers all 10 placeholder types
- [ ] `sms_opt_in = false` students are skipped silently
- [ ] `tenants.sms_credits` decremented on each send
- [ ] Low-credit alert (≤ 20) triggers in-app notification
- [ ] Webhook endpoint validates HMAC before processing
- [ ] Delivery status updates `sms_logs.status` and `delivered_at`
- [ ] SMS send from fee dashboard works (single + bulk)
- [ ] SMS logs page renders with filters
- [ ] Template editor saves and previews correctly
- [ ] Dev environment uses `noop` gateway (no real SMS sent)
- [ ] `SMS_WEBHOOK_SECRET` is set in Vercel production env

---

## Depends On

[Module 7 — Fee Management](./07-fee-management.md)

## Unlocks

Phase 2 features: Auto-SMS on fee generation, Attendance, Parent Portal
