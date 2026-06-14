# Module 2 — Tenant & Academy Setup

**Status:** `🔲 Pending`
**Priority:** 2 of 8
**Back to index:** [Docs/README.md](./README.md)

---

## What This Module Delivers

- 4-step onboarding wizard shown on first login
- Academy settings page (5 tabs)
- `planGuard()` — server-side plan tier enforcement
- Subdomain routing wired into middleware

---

## Onboarding Wizard

Shown immediately after signup when `tenants.onboarding_complete = false`.
4 steps, skippable from Step 2 onwards.

| Step | Required | Fields |
|---|---|---|
| 1 — Academy Profile | Yes | Name, sport(s), address, contact, logo upload, timezone |
| 2 — Add First Coach | Skippable | Name, email, mobile |
| 3 — Create First Batch | Skippable | Name, sport, days, time, venue, monthly fee |
| 4 — Enrol First Student | Skippable | Name, DOB, guardian mobile, batch assignment |

On wizard completion: set `tenants.onboarding_complete = true`, redirect to `/dashboard`.

**UI:** shadcn `<Progress>` step counter at top. Each step is a self-contained `<form>` that POST to the relevant API.

---

## Settings Page (`/settings`)

Five tabs:

### Tab 1 — Academy Profile
- Academy name, logo (upload to `academy-logos` bucket), sports list, address, contact email/mobile, timezone
- `PATCH /api/settings/academy`

### Tab 2 — Working Hours
- 7-day grid (Mon–Sun), each day toggle open/closed + open/close time pickers
- Saved as JSONB in `tenants.working_hours`:
  ```json
  { "mon": [{"start": "06:00", "end": "21:00"}], "tue": null, ... }
  ```
- `PATCH /api/settings/working-hours`

### Tab 3 — Fee Settings
- Currency display (INR — fixed)
- Accepted payment modes (checkboxes: Cash, UPI, Card, Cheque)
- Late fee policy (days grace period, flat penalty in paise)

### Tab 4 — SMS Settings
- Sender ID display, credit balance
- Opt-out list (comma-separated mobiles)
- Template management (links to Module 8)

### Tab 5 — Subscription
- Current plan badge (Free / Pro / Enterprise)
- Usage vs limits: students X/15, batches X/2, coaches X/1
- Upgrade CTA button

---

## `planGuard()` Utility

**File:** `lib/planGuard.ts`

Called server-side before any `POST /api/students`, `POST /api/batches`, `POST /api/coaches`.

```ts
// Pseudocode — implement with Supabase server client
async function planGuard(
  tenantId: string,
  resource: 'student' | 'batch' | 'coach'
): Promise<void>

// Throws PlanLimitError { code: 'PLAN_LIMIT', upgradeUrl: '/settings#subscription' }
// if Free tier limit is exceeded
```

Free tier limits:

| Resource | Limit |
|---|---|
| Students | 15 |
| Batches | 2 |
| Coaches | 1 |

---

## Subdomain Routing

In `middleware.ts` (already scaffolded in Module 1), add:

1. Parse `Host` header → extract subdomain (e.g. `tigers` from `tigers.coachpro.app`)
2. Query `tenants WHERE subdomain = $subdomain`
3. If not found → redirect to marketing page or 404
4. Inject `tenant_id` as request header: `x-tenant-id`
5. All Route Handlers read `headers().get('x-tenant-id')` for tenant context

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/settings` | Fetch full tenant settings |
| `PATCH` | `/api/settings/academy` | Update academy profile |
| `PATCH` | `/api/settings/working-hours` | Update working hours JSONB |
| `PATCH` | `/api/settings/fee-config` | Update fee settings |

---

## Completion Checklist

- [ ] Onboarding wizard renders after first signup
- [ ] Step 1 (academy profile) is required — cannot skip
- [ ] Steps 2–4 are skippable
- [ ] `tenants.onboarding_complete` set to `true` on finish
- [ ] `/settings` page loads with 5 tabs
- [ ] Logo upload works (Supabase Storage `academy-logos` bucket)
- [ ] Working hours grid saves JSONB correctly
- [ ] `planGuard()` returns 403 with `PLAN_LIMIT` on Free tier overflow
- [ ] Subscription tab shows correct usage counts
- [ ] Subdomain middleware injects `x-tenant-id` into request headers

---

## Depends On

[Module 1 — Foundation & Auth](./01-foundation-and-auth.md)

## Unlocks

[Module 3 — Coach Management](./03-coach-management.md)
