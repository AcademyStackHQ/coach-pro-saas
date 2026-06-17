# Module 2 — Academy Onboarding & Settings

**Status:** `✅ Done`
**Priority:** 2 of 8
**Back to index:** [docs/README.md](../README.md)

---

## What This Module Delivers

This module is everything that happens **after** an institution admin registers and confirms their email.
Authentication and institution creation are already handled by Module 1.

- 4-step onboarding wizard shown on first login (`institutions.onboarding_complete = false`)
- Academy settings page (edit profile, working hours, fee config, SMS, subscription)
- `planGuard()` — server-side plan tier enforcement before creating coaches, batches, students

> **Not covered here:** User registration, login, student signup, session management.
> Those are all in [Module 1 — Foundation & Auth](./01-foundation-and-auth.md).

---

## Onboarding Wizard (`/onboarding`)

Shown immediately after first login when `institutions.onboarding_complete = false`.
Step 1 is required. Steps 2–4 are skippable.

| Step | Required | Fields |
|---|---|---|
| 1 — Academy Profile | Yes | Name (pre-filled), category, address, contact email/mobile, logo upload, timezone |
| 2 — Add First Coach | Skippable | Full name, email, mobile |
| 3 — Create First Batch | Skippable | Name, days, time, venue, monthly fee |
| 4 — Enrol First Student | Skippable | Name, DOB, guardian name, guardian mobile (direct `students` record — not an email invite; see Module 4 identity model) |

On completion: set `institutions.onboarding_complete = true` → redirect to `/dashboard`.

**UI:** Step counter (`<Progress>`) at top. Each step is a self-contained form posting to a server action.

---

## Settings Page (`/dashboard/settings`)

Five tabs, accessible any time after onboarding.

### Tab 1 — Academy Profile
- Institution name, logo (upload to `academy-logos` Supabase Storage bucket), category, address, contact email/mobile, timezone
- Saves to `institutions` table

### Tab 2 — Working Hours
- 7-day grid (Mon–Sun), each day toggled open/closed + open/close time pickers
- Saved as JSONB in `institutions.working_hours`:
  ```json
  { "mon": [{"start": "06:00", "end": "21:00"}], "tue": null }
  ```

### Tab 3 — Fee Settings
- Accepted payment modes (Cash, UPI, Card, Cheque)
- Late fee policy (grace period days, flat penalty amount)
- Currency is INR — fixed

### Tab 4 — SMS Settings
- Sender ID display, credit balance (`institutions.sms_credits`)
- Opt-out list management
- Template management (links to Module 8)

### Tab 5 — Subscription
- Current plan badge (`institutions.plan`: `free` / `pro` / `enterprise`)
- Usage vs limits: students, batches, coaches
- Upgrade CTA

---

## `planGuard()` Utility

**File:** `lib/planGuard.ts`

Called inside server actions before creating a coach, batch, or student.
Throws if the institution is on the Free plan and has hit its limit.

```ts
async function planGuard(
  institutionId: string,
  resource: 'student' | 'batch' | 'coach'
): Promise<void>
// Throws PlanLimitError if Free tier limit exceeded
```

Free tier limits:

| Resource | Limit |
|---|---|
| Students | 15 |
| Batches | 2 |
| Coaches | 1 |

---

## Database Changes

No new tables. Uses existing `institutions` table columns added in Migration 001:

| Column | Used by |
|---|---|
| `logo_url` | Academy Profile tab, onboarding Step 1 |
| `timezone` | Academy Profile tab |
| `working_hours` (JSONB) | Working Hours tab |
| `plan` | Subscription tab, planGuard() |
| `sms_credits` | SMS Settings tab |
| `onboarding_complete` | Wizard trigger — false = show wizard |

**Migration needed:** Add `address`, `contact_email`, `contact_mobile`, `fee_config` (JSONB) columns to `institutions`.

---

## Completion Checklist

- [ ] Redirect to `/onboarding` on first login when `onboarding_complete = false`
- [ ] Step 1 (academy profile) required — cannot skip
- [ ] Steps 2–4 skippable with a "Skip for now" link
- [ ] Logo upload works (Supabase Storage `academy-logos` bucket)
- [ ] `onboarding_complete = true` set on wizard finish → redirect to `/dashboard`
- [ ] `/dashboard/settings` loads with 5 tabs
- [ ] Working hours grid saves correct JSONB shape
- [ ] `planGuard()` blocks Free tier overflow with a clear upgrade message
- [ ] Subscription tab shows accurate usage counts

---

## Depends On

[Module 1 — Foundation & Auth](./01-foundation-and-auth.md)

## Unlocks

[Module 3 — Coach Management](./03-coach-management.md)
