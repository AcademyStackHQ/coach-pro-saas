// ---------------------------------------------------------------------------
// Module 6 — Calendar & Scheduling helpers (pure; no Supabase imports).
//
// Batch occurrences are computed on the fly from `batches.schedule` (never
// stored); 1-to-1 sessions are persisted rows. This module turns both into a
// single `CalendarEvent` stream, plus the date math the week/month grids need
// and the conflict detection the booking action runs.
//
// All day math is LOCAL time (never toISOString) so a 23:30 slot can't shift
// to the next/previous day in IST. DATE/TIME values are treated as wall-clock.
// ---------------------------------------------------------------------------

import {
  parseSchedule,
  batchScheduleLabel,
  type BatchSlot,
} from '@/lib/constants'

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export type CalendarEvent = {
  type: 'batch' | 'session'
  /** Unique per render: `${batchId}:${date}` for occurrences, session id otherwise. */
  id: string
  /** The underlying row id — batchId for occurrences, sessionId for sessions. */
  refId: string
  date: string // YYYY-MM-DD
  start: string // HH:MM
  end: string // HH:MM
  title: string
  coachId: string | null
  coachName: string | null
  coachColor: string | null
  studentId: string | null
  studentName: string | null
  status: SessionStatus | null
  venue: string | null
  /** Coach notes (sessions only). */
  notes: string | null
}

// Input shapes the page maps its query rows into.
export type BatchForOccurrence = {
  id: string
  name: string
  coachId: string | null
  coachName: string | null
  coachColor: string | null
  slots: BatchSlot[]
  effectiveFrom: string | null
  status: 'active' | 'inactive'
}

export type SessionRow = {
  id: string
  date: string // YYYY-MM-DD
  start: string // HH:MM(:SS)
  end: string // HH:MM(:SS)
  coachId: string | null
  coachName: string | null
  coachColor: string | null
  studentId: string | null
  studentName: string | null
  status: SessionStatus
  venue: string | null
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Time / date helpers
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')

/** Normalise a TIME ("HH:MM" or "HH:MM:SS") to "HH:MM". */
export const hhmm = (t: string) => (t ?? '').slice(0, 5)

/** Local YYYY-MM-DD — never UTC (avoids the toISOString off-by-one). */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse YYYY-MM-DD to a local-midnight Date. Returns null when malformed. */
export function parseYmd(s: string | undefined | null): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/** Local midnight today. */
export function today(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Monday-based start of week (UI is Mon-first; getDay() is 0=Sun). */
export function startOfWeek(d: Date): Date {
  const off = (d.getDay() + 6) % 7
  return addDays(d, -off)
}

export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6)
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/** Full leading/trailing weeks covering the anchor's month (Mon-first grid). */
export function monthGridRange(anchor: Date): { from: Date; to: Date } {
  return {
    from: startOfWeek(startOfMonth(anchor)),
    to: endOfWeek(endOfMonth(anchor)),
  }
}

export function weekRange(anchor: Date): { from: Date; to: Date } {
  return { from: startOfWeek(anchor), to: endOfWeek(anchor) }
}

/** Inclusive list of local-midnight dates from `from` to `to`. */
export function eachDay(from: Date, to: Date): Date[] {
  const out: Date[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

// ---------------------------------------------------------------------------
// Event generation + merge
// ---------------------------------------------------------------------------

/**
 * Expand active batches into per-day occurrences within [from, to], honouring
 * each batch's effective_from and per-day schedule slots. Mirrors the
 * BatchDetail ScheduleTab preview, generalised to an arbitrary range.
 */
export function generateBatchOccurrences(
  batches: BatchForOccurrence[],
  from: Date,
  to: Date
): CalendarEvent[] {
  const days = eachDay(from, to)
  const out: CalendarEvent[] = []
  for (const b of batches) {
    if (b.status !== 'active') continue
    const slotByDay = new Map(b.slots.map((s) => [s.day, s]))
    if (slotByDay.size === 0) continue
    const eff = parseYmd(b.effectiveFrom)
    for (const d of days) {
      if (eff && d < eff) continue
      const slot = slotByDay.get(d.getDay())
      if (!slot) continue
      const date = ymd(d)
      out.push({
        type: 'batch',
        id: `${b.id}:${date}`,
        refId: b.id,
        date,
        start: hhmm(slot.start),
        end: hhmm(slot.end),
        title: b.name,
        coachId: b.coachId,
        coachName: b.coachName,
        coachColor: b.coachColor,
        studentId: null,
        studentName: null,
        status: null,
        venue: null,
        notes: null,
      })
    }
  }
  return out
}

export function sessionsToEvents(sessions: SessionRow[]): CalendarEvent[] {
  return sessions.map((s) => ({
    type: 'session' as const,
    id: s.id,
    refId: s.id,
    date: s.date,
    start: hhmm(s.start),
    end: hhmm(s.end),
    title: s.studentName ? `${s.studentName} · 1:1` : '1:1 session',
    coachId: s.coachId,
    coachName: s.coachName,
    coachColor: s.coachColor,
    studentId: s.studentId,
    studentName: s.studentName,
    status: s.status,
    venue: s.venue,
    notes: s.notes ?? null,
  }))
}

const byStartThenTitle = (a: CalendarEvent, b: CalendarEvent) =>
  a.date === b.date
    ? a.start === b.start
      ? a.title.localeCompare(b.title)
      : a.start.localeCompare(b.start)
    : a.date.localeCompare(b.date)

/** Merge batch occurrences + sessions into one sorted stream. */
export function buildEvents(
  batches: BatchForOccurrence[],
  sessions: SessionRow[],
  from: Date,
  to: Date
): CalendarEvent[] {
  return [
    ...generateBatchOccurrences(batches, from, to),
    ...sessionsToEvents(sessions),
  ].sort(byStartThenTitle)
}

export function groupEventsByDate(
  events: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const list = map.get(e.date)
    if (list) list.push(e)
    else map.set(e.date, [e])
  }
  return map
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

export const timesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
) => !(endA <= startB || startA >= endB)

/** Cancelled / no-show sessions never block a new booking. */
const blocksBooking = (s: SessionStatus | null) =>
  s !== 'cancelled' && s !== 'no_show'

/**
 * Detect coach and student clashes for a prospective session on a single date.
 * Compares against BOTH persisted sessions and computed batch occurrences:
 *   • Coach clash  → the coach is double-booked (any of their sessions/batches).
 *   • Student clash → the student is double-booked (their own sessions, plus
 *                     batch occurrences for batches they're actively enrolled in).
 * Both are HARD blocks. Times are compared as wall-clock "HH:MM".
 */
export function findSessionClashes(input: {
  coachId: string
  studentId: string
  date: string
  start: string
  end: string
  excludeSessionId?: string
  existingSessions: SessionRow[]
  batchOccurrences: CalendarEvent[]
  studentBatchIds: Set<string>
}): { coach: string[]; student: string[] } {
  const { coachId, studentId, date, excludeSessionId } = input
  const start = hhmm(input.start)
  const end = hhmm(input.end)
  const coach: string[] = []
  const student: string[] = []

  for (const s of input.existingSessions) {
    if (s.id === excludeSessionId) continue
    if (s.date !== date) continue
    if (!blocksBooking(s.status)) continue
    if (!timesOverlap(start, end, hhmm(s.start), hhmm(s.end))) continue
    const label = `${s.studentName ?? 'a student'} (1:1 ${hhmm(s.start)}–${hhmm(s.end)})`
    if (s.coachId === coachId) coach.push(label)
    if (s.studentId === studentId) student.push(label)
  }

  for (const o of input.batchOccurrences) {
    if (o.type !== 'batch') continue
    if (o.date !== date) continue
    if (!timesOverlap(start, end, o.start, o.end)) continue
    const label = `${o.title} (${o.start}–${o.end})`
    if (o.coachId === coachId) coach.push(label)
    if (studentId && input.studentBatchIds.has(o.refId)) student.push(label)
  }

  return { coach, student }
}

// Re-export so callers can build the one-line batch summary from this module.
export { batchScheduleLabel }
