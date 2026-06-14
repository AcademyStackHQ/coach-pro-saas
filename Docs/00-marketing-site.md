# Module 0 — Marketing Site

**Status:** `🔲 Pending`
**Priority:** 0 — can be built in parallel with Module 1; does not block app modules
**Back to index:** [Docs/README.md](./README.md)

---

## What This Module Delivers

- Public marketing site at `coachpro.app` (root domain)
- 6 sections: Navbar · Hero · Features · How it works · Pricing · Stories
- SEO-optimised (meta, Open Graph, structured data, sitemap, robots.txt)
- Converts visitors → free trial signups (primary CTA) and demo bookings

---

## Route Structure

Marketing pages live in their own layout group, separate from the app:

```
app/
  (marketing)/
    layout.tsx          ← marketing shell (navbar + footer)
    page.tsx            ← homepage (/)
    features/page.tsx   ← /features
    pricing/page.tsx    ← /pricing
    stories/page.tsx    ← /stories (customer case studies)
    how-it-works/page.tsx
  (auth)/               ← Module 1
  (admin)/              ← Modules 2–8
```

The `(marketing)` group uses a different layout from the app — no sidebar, no auth required.

---

## Pages & Sections

### Navbar

**Desktop layout:**
```
[CoachPro logo]   Features   How it works   Pricing   Stories      Sign in   [Start free →]
```

**Behaviour:**
- Sticky on scroll with backdrop blur
- `Sign in` → `/login`
- `Start free →` → `/signup` (primary CTA, filled blue button)
- Active link highlighted by current route
- Mobile: hamburger menu → full-screen slide-down drawer

**Component:** `components/marketing/Navbar.tsx`

---

### Hero Section

**Layout (desktop):** Text left · Dashboard mockup right

**Content:**
- Badge pill: `● New · WhatsApp reminders` (dismiss-able, links to relevant feature)
- H1: `Run your coaching academy from one place`
  - "one place" in brand blue (`#2563EB`)
- Subtext: `CoachPro is the cloud platform that handles enrolments, scheduling, fees and parent communication — so you can focus on coaching, not paperwork.`
- CTA row:
  - Primary: `Start free →` → `/signup`
  - Secondary: `Book a demo` → `/demo` or mailto/Calendly link
- Trust row (below CTAs): `✓ No card required   ✓ Set up in minutes   ✓ Cancel anytime`
- Dashboard mockup (right side): browser-frame image showing the admin dashboard preview

**Dashboard mockup content** (matches screenshot):
- Sidebar: Dashboard · Students · Schedule · Finance
- Stat cards: `248 Active students` · `₹4.28L Collected · June` · `92% Attendance`
- "Today's sessions" list with time · batch name · venue · status dot

**SEO for hero:**
- H1 is the only `<h1>` on the page
- Subtext is real paragraph text (not image)
- Dashboard mockup: `<Image alt="CoachPro admin dashboard showing student enrolments and fee collection" priority />` (LCP element — must load fast)

**Component:** `components/marketing/Hero.tsx`

---

### Features Section

**Headline:** `Everything your academy needs`

6 feature cards (2×3 grid on desktop, 1 col on mobile):

| Icon | Title | Description |
|---|---|---|
| 👥 | Student Management | Enrol students, manage profiles, track jersey details and guardian contacts in one place. |
| 📅 | Smart Scheduling | Batch calendars and 1-to-1 sessions with automatic conflict detection for coaches and venues. |
| 💳 | Fee Collection | Auto-generate monthly invoices, record payments, and send PDF receipts instantly. |
| 📱 | SMS & WhatsApp | Automated fee reminders and payment confirmations sent directly to parents. |
| 📊 | Academy Dashboard | Live stats on active students, fee collection rate, and today's sessions at a glance. |
| 🔒 | Secure & Multi-tenant | Every academy's data is fully isolated — GDPR-ready with role-based access control. |

**Component:** `components/marketing/Features.tsx`

---

### How It Works Section

**Headline:** `Up and running in minutes`

3-step horizontal flow (numbered, icon + title + description):

1. **Create your academy** — Sign up free, add your academy name and first sport. No credit card needed.
2. **Add coaches and batches** — Invite coaches by email, set your batch schedules and monthly fees.
3. **Enrol students and collect fees** — Add students, auto-generate monthly invoices, and track payments.

**Component:** `components/marketing/HowItWorks.tsx`

---

### Pricing Section

**Headline:** `Simple, transparent pricing`

3-tier card layout:

| Plan | Price | Limits | CTA |
|---|---|---|---|
| Free | ₹0 / month | 15 students · 2 batches · 1 coach | Start free |
| Pro | ₹999 / month | Unlimited students · coaches · batches | Start free trial |
| Enterprise | Custom | Custom limits + SLA + onboarding | Contact us |

Feature comparison toggle (monthly / annual, annual = 2 months free).

**Component:** `components/marketing/Pricing.tsx`

---

### Stories Section (Testimonials)

**Headline:** `Trusted by academies across India`

3 testimonial cards:

Each card: `"Quote text"` · Name · Role · Academy Name · Sport badge

Placeholder quotes to be replaced with real customer quotes pre-launch.

**Component:** `components/marketing/Stories.tsx`

---

### Footer

4-column layout:

| Column | Links |
|---|---|
| CoachPro (logo + tagline) | — |
| Product | Features · Pricing · How it works · Changelog |
| Company | About · Blog · Careers · Contact |
| Legal | Privacy Policy · Terms of Service · Refund Policy |

Bottom bar: `© 2025 CoachPro. All rights reserved.`

**Component:** `components/marketing/Footer.tsx`

---

## SEO Implementation

### Per-Page Metadata (`app/(marketing)/page.tsx`)

```ts
export const metadata: Metadata = {
  title: 'CoachPro — Sports Academy Management Software',
  description:
    'Manage student enrolments, batch schedules, fee collection, and parent communication for your sports coaching academy. Free to start.',
  keywords: ['sports academy software', 'coaching management', 'student fee management India'],
  openGraph: {
    title: 'CoachPro — Run your coaching academy from one place',
    description: 'Cloud platform for sports academies. Enrolments, scheduling, fees, and SMS — all in one place.',
    url: 'https://coachpro.app',
    siteName: 'CoachPro',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoachPro — Sports Academy Management',
    description: 'Cloud platform for coaching academies.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://coachpro.app',
  },
}
```

### Structured Data (JSON-LD)

Add to `app/(marketing)/layout.tsx`:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'CoachPro',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        description: 'Free plan available',
      },
      description: 'Cloud platform for sports coaching academies to manage students, schedules, fees, and communications.',
    }),
  }}
/>
```

### `app/sitemap.ts`

```ts
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://coachpro.app', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://coachpro.app/features', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://coachpro.app/pricing', changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://coachpro.app/how-it-works', changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://coachpro.app/stories', changeFrequency: 'monthly', priority: 0.6 },
  ]
}
```

### `app/robots.ts`

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/coach', '/api/'] },
    sitemap: 'https://coachpro.app/sitemap.xml',
  }
}
```

---

## Performance Requirements

The marketing site is the first impression — it must be fast.

| Metric | Target |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5 s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FID / INP | < 200 ms |

**Rules:**
- Dashboard mockup image uses `<Image priority />` (Next.js Image with LCP priority)
- All section images use `<Image loading="lazy" />`
- No client-side JS in hero and features — pure Server Components
- Font: use `next/font/google` for Inter (no layout shift)
- OG image (`/og-image.png`) must be exactly 1200 × 630 px

---

## Middleware Separation

The `middleware.ts` from Module 1 must NOT intercept marketing routes. Add a matcher:

```ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|og-image.png).*)',
  ],
}
```

Skip auth check for `app/(marketing)/**` — these are public pages.

---

## Static Assets Needed

| File | Size | Notes |
|---|---|---|
| `public/og-image.png` | 1200×630 | Open Graph share image |
| `public/logo.svg` | — | NavBar + Footer logo |
| `public/favicon.ico` | 32×32 | Browser tab icon |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen |
| `public/dashboard-mockup.png` | ~1400px wide | Hero right-side screenshot |

---

## Completion Checklist

- [ ] `app/(marketing)/layout.tsx` with Navbar + Footer, no auth wrapper
- [ ] `app/(marketing)/page.tsx` renders all 6 sections
- [ ] Navbar: sticky, blur backdrop, mobile hamburger drawer
- [ ] Hero: H1, subtext, CTAs, trust row, dashboard mockup image
- [ ] New badge pill is visible and links to relevant feature
- [ ] Features: 6 cards in 2×3 grid (responsive)
- [ ] How it works: 3-step flow
- [ ] Pricing: 3-tier cards with feature comparison
- [ ] Stories: 3 testimonial cards
- [ ] Footer: 4-column with all links
- [ ] `metadata` export on each page (title, description, OG, Twitter)
- [ ] JSON-LD structured data in `(marketing)/layout.tsx`
- [ ] `app/sitemap.ts` generates correct URLs
- [ ] `app/robots.ts` blocks `/dashboard`, `/coach`, `/api/`
- [ ] Dashboard mockup loads with `<Image priority />` for LCP
- [ ] Middleware matcher excludes marketing routes from auth check
- [ ] All 5 static assets in `public/`
- [ ] Lighthouse score: Performance ≥ 90, SEO = 100 on homepage

---

## Depends On

Nothing — fully independent. Can be built in parallel with Module 1.

## Unlocks

Sign-up traffic → Module 1 (Auth)
