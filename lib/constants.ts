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

export const JERSEY_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

// Age threshold above which a student may have their own login (14+ invite
// path — deferred). A product policy enforced in the UI/server action, never
// as a DB constraint, since the threshold may change.
export const STUDENT_LOGIN_AGE = 14
