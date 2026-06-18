export const INSTITUTION_CATEGORIES = [
  { value: 'sports-academy',    label: 'Sports Academy' },
  { value: 'tuition-centre',    label: 'Tuition Centre' },
  { value: 'school',            label: 'School' },
  { value: 'dance-academy',     label: 'Dance Academy' },
  { value: 'music-academy',     label: 'Music Academy' },
  { value: 'martial-arts',      label: 'Martial Arts' },
  { value: 'art-and-craft',     label: 'Art & Craft' },
  { value: 'language-institute', label: 'Language Institute' },
  { value: 'yoga-and-wellness', label: 'Yoga & Wellness' },
  { value: 'gym-and-fitness',   label: 'Gym & Fitness' },
  { value: 'other',             label: 'Other' },
]

export const TIMEZONES = [
  { value: 'Asia/Kolkata',      label: 'India (IST, UTC+5:30)' },
  { value: 'Asia/Colombo',      label: 'Sri Lanka (SLST, UTC+5:30)' },
  { value: 'Asia/Dhaka',        label: 'Bangladesh (BST, UTC+6)' },
  { value: 'Asia/Karachi',      label: 'Pakistan (PKT, UTC+5)' },
  { value: 'Asia/Dubai',        label: 'UAE (GST, UTC+4)' },
  { value: 'Asia/Singapore',    label: 'Singapore (SGT, UTC+8)' },
  { value: 'Asia/Bangkok',      label: 'Thailand (ICT, UTC+7)' },
  { value: 'Europe/London',     label: 'UK (GMT/BST)' },
  { value: 'America/New_York',  label: 'US Eastern (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)' },
  { value: 'Australia/Sydney',  label: 'Australia Eastern (AEST)' },
  { value: 'UTC',               label: 'UTC' },
]

export const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const

export type DayKey = (typeof DAYS)[number]['key']

export type DaySchedule = { open: boolean; start: string; end: string }
export type WorkingHoursMap = Record<DayKey, DaySchedule>

export const DEFAULT_WORKING_HOURS: WorkingHoursMap = {
  mon: { open: true,  start: '06:00', end: '21:00' },
  tue: { open: true,  start: '06:00', end: '21:00' },
  wed: { open: true,  start: '06:00', end: '21:00' },
  thu: { open: true,  start: '06:00', end: '21:00' },
  fri: { open: true,  start: '06:00', end: '21:00' },
  sat: { open: true,  start: '07:00', end: '17:00' },
  sun: { open: false, start: '07:00', end: '17:00' },
}

export const FREE_PLAN_LIMITS = { student: 15, coach: 1, batch: 2 } as const

// ----------------------------------------------------------------------------
// Pricing (Growth plan) — per active student, per month, in ₹.
// First FREE_PLAN_LIMITS.student students are always free; only students beyond
// that are billable. Annual billing applies a ~20% discount.
// ----------------------------------------------------------------------------
export const PER_STUDENT_MONTHLY = 20
export const PER_STUDENT_ANNUAL = 16

// ----------------------------------------------------------------------------
// Coach availability (Module 3) — multiple time blocks per day (split shifts).
// Distinct from institutions.working_hours, which is a single open/start/end
// block per day. Shape: { mon: [{ start, end }], tue: [], ... }
// ----------------------------------------------------------------------------

export type TimeBlock = { start: string; end: string }
export type AvailabilityMap = Record<DayKey, TimeBlock[]>

export const DEFAULT_AVAILABILITY: AvailabilityMap = {
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
}

// Distinct calendar-lane colours assigned to coaches (Module 6 reads these).
// Auto-assigned in order; admin can override per coach.
export const COACH_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#db2777', // pink
  '#d97706', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#dc2626', // red
  '#4f46e5', // indigo
  '#65a30d', // lime
  '#c026d3', // fuchsia
] as const

// ----------------------------------------------------------------------------
// Students (Module 4) — academy-owned records, not logins.
// ----------------------------------------------------------------------------

export const GENDERS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
] as const

export const UNIFORM_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

// Age threshold above which a student may have their own login (14+ invite
// path — deferred). A product policy enforced in the UI/server action, never
// as a DB constraint, since the threshold may change.
export const STUDENT_LOGIN_AGE = 14

// Domain for the synthetic email behind a student-code login. The student code
// is globally unique, so `<code>@<domain>` is a unique Supabase Auth identity.
// This mailbox is never sent to — swap for an owned domain anytime.
export const STUDENT_LOGIN_EMAIL_DOMAIN = 'students.coachpro.local'

// ----------------------------------------------------------------------------
// Batches (Module 5) — scheduled training groups.
// days_of_week is stored as INT[] using JS Date.getDay() indices (0 = Sun …
// 6 = Sat) so the calendar can compute occurrences directly. This list is
// Mon-first for the day-picker UI; `num` is the stored value.
// ----------------------------------------------------------------------------

export const DAYS_OF_WEEK = [
  { num: 1, short: 'M', label: 'Mon' },
  { num: 2, short: 'T', label: 'Tue' },
  { num: 3, short: 'W', label: 'Wed' },
  { num: 4, short: 'T', label: 'Thu' },
  { num: 5, short: 'F', label: 'Fri' },
  { num: 6, short: 'S', label: 'Sat' },
  { num: 0, short: 'S', label: 'Sun' },
] as const

// Fraction of capacity at/above which a batch is "Almost Full".
export const CAPACITY_ALMOST_FULL = 0.8

// Capacity badge — Green (Available) < 80%, Amber (Almost Full) ≥ 80%,
// Red (Full) = capacity. Mirrors the status-badge shape used across the app.
export function capacityBadge(
  enrolled: number,
  capacity: number
): { label: string; className: string } {
  if (capacity > 0 && enrolled >= capacity)
    return { label: 'Full', className: 'bg-red-50 text-red-700' }
  if (capacity > 0 && enrolled / capacity >= CAPACITY_ALMOST_FULL)
    return { label: 'Almost Full', className: 'bg-amber-50 text-amber-700' }
  return { label: 'Available', className: 'bg-green-50 text-green-700' }
}

// ----------------------------------------------------------------------------
// A batch's schedule is per-day: each training day carries its own start/end
// time (Fri 17:00–18:30 but Sat/Sun 07:00–08:30). Stored as a JSONB array of
// these slots on `batches.schedule`. `day` is a JS Date.getDay() index.
// ----------------------------------------------------------------------------

export type BatchSlot = { day: number; start: string; end: string }

const hhmm = (t: string) => (t ?? '').slice(0, 5)

// Full label ("Mon") for a JS day index.
export function dayLabel(num: number): string {
  return DAYS_OF_WEEK.find((d) => d.num === num)?.label ?? ''
}

// Order an arbitrary set of JS day indices Mon-first (matching DAYS_OF_WEEK).
function orderDaysMonFirst(days: number[]): number[] {
  return DAYS_OF_WEEK.filter((d) => days.includes(d.num)).map((d) => d.num)
}

// Coerce a stored JSONB schedule (typed as `Json`) into clean BatchSlot[],
// dropping anything malformed. Used on every read (pages + conflict checks).
export function parseSchedule(value: unknown): BatchSlot[] {
  if (!Array.isArray(value)) return []
  const out: BatchSlot[] = []
  for (const v of value) {
    if (!v || typeof v !== 'object') continue
    const r = v as Record<string, unknown>
    const day = Number(r.day)
    const start = typeof r.start === 'string' ? r.start : ''
    const end = typeof r.end === 'string' ? r.end : ''
    if (Number.isInteger(day) && day >= 0 && day <= 6 && start && end)
      out.push({ day, start, end })
  }
  return out
}

// Group slots that share the same start+end so a multi-day batch reads
// compactly. Groups (and the days inside them) are ordered Mon-first.
export function groupSchedule(
  slots: BatchSlot[]
): { days: number[]; start: string; end: string }[] {
  const byTime = new Map<string, { days: number[]; start: string; end: string }>()
  for (const s of slots) {
    const key = `${s.start}-${s.end}`
    const g = byTime.get(key)
    if (g) g.days.push(s.day)
    else byTime.set(key, { days: [s.day], start: s.start, end: s.end })
  }
  const pos = (num: number) => DAYS_OF_WEEK.findIndex((d) => d.num === num)
  return Array.from(byTime.values())
    .map((g) => ({ ...g, days: orderDaysMonFirst(g.days) }))
    .sort((a, b) => pos(a.days[0]) - pos(b.days[0]))
}

// One-line schedule summary for cards / lists, grouping days with equal times:
// "Fri · 17:00–18:30  •  Sat, Sun · 07:00–08:30".
export function batchScheduleLabel(slots: BatchSlot[]): string {
  if (!slots.length) return 'No days set'
  return groupSchedule(slots)
    .map((g) => `${g.days.map(dayLabel).join(', ')} · ${hhmm(g.start)}–${hhmm(g.end)}`)
    .join('  •  ')
}
