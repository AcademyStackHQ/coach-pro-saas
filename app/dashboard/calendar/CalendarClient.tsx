'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'
import {
  createSession,
  updateSession,
  updateSessionStatus,
  type ActionState,
} from './actions'
import {
  parseYmd,
  ymd,
  today as todayDate,
  addDays,
  startOfWeek,
  eachDay,
  groupEventsByDate,
  type CalendarEvent,
  type SessionStatus,
} from '@/lib/calendar'
import type { Role } from '@/lib/activeSession'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

type CoachLegend = { id: string; name: string; color: string | null }
type CoachOption = { id: string; name: string }
type StudentOption = { id: string; name: string; code: string | null }

export type CalendarClientProps = {
  events: CalendarEvent[]
  view: 'week' | 'month'
  anchor: string
  role: Role
  isAdmin: boolean
  canBook: boolean
  coachLegend: CoachLegend[]
  coachOptions: CoachOption[]
  studentOptions: StudentOption[]
}

const FALLBACK_COLOR = '#94a3b8'
const PX_PER_HOUR = 48
const DEFAULT_START_HOUR = 6
const DEFAULT_END_HOUR = 21

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const STATUS_BADGE: Record<SessionStatus, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  no_show: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-muted text-muted-foreground',
}
const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
}

// ---------------------------------------------------------------------------
// Side-by-side column layout for overlapping events within one day.
// ---------------------------------------------------------------------------
type Placed = { ev: CalendarEvent; col: number; cols: number }

function layoutDay(evs: CalendarEvent[]): Placed[] {
  const sorted = [...evs].sort(
    (a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end)
  )
  const out: Placed[] = []
  let cluster: CalendarEvent[] = []
  let clusterEnd = -1

  const flush = () => {
    const colEnds: number[] = []
    const colOf = new Map<string, number>()
    for (const ev of cluster) {
      let placed = false
      for (let i = 0; i < colEnds.length; i++) {
        if (toMin(ev.start) >= colEnds[i]) {
          colOf.set(ev.id, i)
          colEnds[i] = toMin(ev.end)
          placed = true
          break
        }
      }
      if (!placed) {
        colOf.set(ev.id, colEnds.length)
        colEnds.push(toMin(ev.end))
      }
    }
    const cols = colEnds.length
    for (const ev of cluster) out.push({ ev, col: colOf.get(ev.id)!, cols })
    cluster = []
  }

  for (const ev of sorted) {
    if (cluster.length && toMin(ev.start) >= clusterEnd) {
      flush()
      clusterEnd = -1
    }
    cluster.push(ev)
    clusterEnd = Math.max(clusterEnd, toMin(ev.end))
  }
  flush()
  return out
}

// ---------------------------------------------------------------------------
// Week view
// ---------------------------------------------------------------------------
function WeekView({
  anchorDate,
  byDate,
  onPickEvent,
  onPickDay,
}: {
  anchorDate: Date
  byDate: Map<string, CalendarEvent[]>
  onPickEvent: (e: CalendarEvent) => void
  onPickDay: (d: string) => void
}) {
  const weekStart = startOfWeek(anchorDate)
  const days = eachDay(weekStart, addDays(weekStart, 6))
  const todayYmd = ymd(todayDate())

  // Fit the grid to the events present (clamped to a sensible default window).
  let minH = DEFAULT_START_HOUR
  let maxH = DEFAULT_END_HOUR
  for (const d of days) {
    for (const e of byDate.get(ymd(d)) ?? []) {
      minH = Math.min(minH, Math.floor(toMin(e.start) / 60))
      maxH = Math.max(maxH, Math.ceil(toMin(e.end) / 60))
    }
  }
  const startMin = minH * 60
  const totalHours = maxH - minH
  const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric' })

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="grid min-w-[680px]" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
        {/* header row */}
        <div className="border-b border-r" />
        {days.map((d) => {
          const isToday = ymd(d) === todayYmd
          return (
            <div
              key={ymd(d)}
              className={cn(
                'border-b border-l py-2 text-center text-xs font-medium',
                isToday ? 'bg-primary/5 text-foreground' : 'text-muted-foreground'
              )}
            >
              {dayFmt.format(d)}
            </div>
          )
        })}

        {/* time gutter */}
        <div className="relative" style={{ height: totalHours * PX_PER_HOUR }}>
          {Array.from({ length: totalHours + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground"
              style={{ top: i * PX_PER_HOUR }}
            >
              {String(minH + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* day columns */}
        {days.map((d) => {
          const key = ymd(d)
          const placed = layoutDay(byDate.get(key) ?? [])
          return (
            <div
              key={key}
              className="relative cursor-pointer border-l"
              style={{ height: totalHours * PX_PER_HOUR }}
              onClick={() => onPickDay(key)}
            >
              {/* hour lines */}
              {Array.from({ length: totalHours }, (_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-border/50"
                  style={{ top: i * PX_PER_HOUR }}
                />
              ))}
              {placed.map(({ ev, col, cols }) => {
                const top = ((toMin(ev.start) - startMin) / 60) * PX_PER_HOUR
                const height = Math.max(
                  ((toMin(ev.end) - toMin(ev.start)) / 60) * PX_PER_HOUR - 2,
                  16
                )
                const isSession = ev.type === 'session'
                const cancelled = ev.status === 'cancelled'
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPickEvent(ev)
                    }}
                    className={cn(
                      'absolute overflow-hidden rounded-md px-1 py-0.5 text-left text-[10px] leading-tight text-white shadow-sm',
                      isSession ? 'ring-1 ring-white/60' : '',
                      cancelled ? 'opacity-50 line-through' : ''
                    )}
                    style={{
                      top,
                      height,
                      left: `${(col / cols) * 100}%`,
                      width: `${(1 / cols) * 100}%`,
                      backgroundColor: ev.coachColor ?? FALLBACK_COLOR,
                    }}
                    title={`${ev.title} · ${ev.start}–${ev.end}`}
                  >
                    <span className="block truncate font-medium">{ev.title}</span>
                    <span className="block truncate opacity-90">
                      {ev.start}–{ev.end}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Month view
// ---------------------------------------------------------------------------
function MonthView({
  anchorDate,
  byDate,
  onPickDay,
}: {
  anchorDate: Date
  byDate: Map<string, CalendarEvent[]>
  onPickDay: (d: string) => void
}) {
  const gridStart = startOfWeek(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1))
  const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)
  const gridEnd = addDays(startOfWeek(monthEnd), 6)
  const days = eachDay(gridStart, gridEnd)
  const month = anchorDate.getMonth()
  const todayYmd = ymd(todayDate())
  const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b">
        {dows.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = ymd(d)
          const list = byDate.get(key) ?? []
          const inMonth = d.getMonth() === month
          const isToday = key === todayYmd
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay(key)}
              className={cn(
                'flex min-h-24 flex-col gap-1 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40',
                !inMonth && 'bg-muted/20 text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  isToday &&
                    'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                )}
              >
                {d.getDate()}
              </span>
              <span className="flex flex-col gap-0.5">
                {list.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    className={cn(
                      'flex items-center gap-1 truncate text-[10px]',
                      ev.status === 'cancelled' && 'opacity-50 line-through'
                    )}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.coachColor ?? FALLBACK_COLOR }}
                    />
                    <span className="truncate">
                      {ev.start} {ev.title}
                    </span>
                  </span>
                ))}
                {list.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{list.length - 3} more
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Booking sheet
// ---------------------------------------------------------------------------
function BookSheet({
  open,
  onClose,
  date,
  isAdmin,
  coachOptions,
  studentOptions,
}: {
  open: boolean
  onClose: () => void
  date: string
  isAdmin: boolean
  coachOptions: CoachOption[]
  studentOptions: StudentOption[]
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSession, {})
  const [query, setQuery] = useState('')
  const [studentId, setStudentId] = useState('')
  const showOverride = !!state.warning && !state.success

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onClose, 600)
      return () => clearTimeout(t)
    }
  }, [state.success, onClose])

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return studentOptions.slice(0, 50)
    return studentOptions
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code ?? '').toLowerCase().includes(q)
      )
      .slice(0, 50)
  }, [query, studentOptions])

  const inputClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Book a session</SheetTitle>
          <SheetDescription>Schedule a 1-to-1 coaching session.</SheetDescription>
        </SheetHeader>

        <form action={action} className="flex flex-col gap-4 p-4">
          <input type="hidden" name="override" value={showOverride ? '1' : ''} />
          <input type="hidden" name="student_id" value={studentId} />

          {isAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="coach_id">Coach</Label>
              <select id="coach_id" name="coach_id" className={inputClass} required>
                <option value="">Select a coach…</option>
                {coachOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Student</Label>
            <input
              type="text"
              placeholder="Search students…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputClass}
            />
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {filteredStudents.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No matches.</p>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setStudentId(s.id)
                      setQuery(s.name)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-muted/50',
                      studentId === s.id && 'bg-primary/10'
                    )}
                  >
                    <span className="truncate">{s.name}</span>
                    {s.code && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {s.code}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={date}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Start</Label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue="06:00"
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">End</Label>
              <input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue="07:00"
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venue">Venue</Label>
            <input id="venue" name="venue" type="text" className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fee_override">Fee override (₹)</Label>
            <input
              id="fee_override"
              name="fee_override"
              type="number"
              min="0"
              step="1"
              placeholder="Leave blank for default"
              className={inputClass}
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm font-medium text-green-600">Session booked.</p>
          )}

          {showOverride ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">{state.warning}</p>
              <Button type="submit" disabled={pending} size="sm">
                {pending ? 'Saving…' : 'Book anyway'}
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={pending || !studentId} className="w-full">
              {pending ? 'Saving…' : 'Book Session'}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Event detail sheet (sessions are manageable; batch occurrences read-only)
// ---------------------------------------------------------------------------
function StatusButton({ id, status, label }: { id: string; status: SessionStatus; label: string }) {
  return (
    <form action={updateSessionStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="outline" size="sm">
        {label}
      </Button>
    </form>
  )
}

function EventSheet({
  event,
  onClose,
  isAdmin,
  canBook,
}: {
  event: CalendarEvent
  onClose: () => void
  isAdmin: boolean
  canBook: boolean
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSession, {})
  const isSession = event.type === 'session'
  const manageable = isSession && canBook
  const scheduled = event.status === 'scheduled'

  const inputClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{event.title}</SheetTitle>
          <SheetDescription>
            {isSession ? '1-to-1 session' : 'Batch session'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{event.date}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">
                {event.start}–{event.end}
              </dd>
            </div>
            {event.coachName && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Coach</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: event.coachColor ?? FALLBACK_COLOR }}
                  />
                  {event.coachName}
                </dd>
              </div>
            )}
            {event.venue && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Venue</dt>
                <dd className="font-medium">{event.venue}</dd>
              </div>
            )}
            {isSession && event.status && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_BADGE[event.status]
                    )}
                  >
                    {STATUS_LABEL[event.status]}
                  </span>
                </dd>
              </div>
            )}
          </dl>

          {/* Status transitions */}
          {manageable && scheduled && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">Update status</p>
              <div className="flex flex-wrap gap-2">
                <StatusButton id={event.refId} status="completed" label="Mark completed" />
                <StatusButton id={event.refId} status="no_show" label="No-show" />
                {isAdmin && (
                  <StatusButton id={event.refId} status="cancelled" label="Cancel" />
                )}
              </div>
            </div>
          )}

          {/* Venue + notes edit */}
          {manageable && (
            <form action={action} className="space-y-3 border-t pt-3">
              <input type="hidden" name="id" value={event.refId} />
              <div className="space-y-1.5">
                <Label htmlFor="edit_venue">Venue</Label>
                <input
                  id="edit_venue"
                  name="venue"
                  type="text"
                  defaultValue={event.venue ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_notes">Notes</Label>
                <textarea
                  id="edit_notes"
                  name="notes"
                  rows={3}
                  defaultValue={event.notes ?? ''}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    state.error ? 'text-destructive' : 'text-green-600'
                  )}
                >
                  {state.error ? state.error : state.success ? 'Saved.' : ''}
                </span>
                <Button type="submit" disabled={pending} size="sm">
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          )}

          {!manageable && isSession && event.notes && (
            <div className="border-t pt-3 text-sm">
              <p className="text-muted-foreground">Notes</p>
              <p className="mt-1">{event.notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Day list sheet (month-cell / week-column click)
// ---------------------------------------------------------------------------
function DaySheet({
  day,
  events,
  onClose,
  onPickEvent,
  onBook,
  canBook,
}: {
  day: string
  events: CalendarEvent[]
  onClose: () => void
  onPickEvent: (e: CalendarEvent) => void
  onBook: (d: string) => void
  canBook: boolean
}) {
  const title = parseYmd(day)
    ? new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(parseYmd(day)!)
    : day

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {events.length} {events.length === 1 ? 'session' : 'sessions'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 p-4">
          {canBook && (
            <Button onClick={() => onBook(day)} variant="outline" className="w-full">
              <Plus className="size-4" />
              Book a session
            </Button>
          )}
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y">
              {events.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => onPickEvent(ev)}
                    className="flex w-full items-center gap-2 py-2.5 text-left hover:bg-muted/40"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.coachColor ?? FALLBACK_COLOR }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-sm font-medium',
                          ev.status === 'cancelled' && 'opacity-50 line-through'
                        )}
                      >
                        {ev.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {ev.start}–{ev.end}
                        {ev.coachName ? ` · ${ev.coachName}` : ''}
                      </span>
                    </span>
                    {ev.type === 'session' && ev.status && (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                          STATUS_BADGE[ev.status]
                        )}
                      >
                        {STATUS_LABEL[ev.status]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function CalendarClient({
  events,
  view,
  anchor,
  isAdmin,
  canBook,
  coachLegend,
  coachOptions,
  studentOptions,
}: CalendarClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const anchorDate = parseYmd(anchor) ?? todayDate()

  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [dayOpen, setDayOpen] = useState<string | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [bookDate, setBookDate] = useState(anchor)

  const byDate = useMemo(() => groupEventsByDate(events), [events])

  const go = (nextView: 'week' | 'month', nextAnchor: string) =>
    router.push(`${pathname}?view=${nextView}&anchor=${nextAnchor}`)

  const shiftPrev = () => {
    const a =
      view === 'week'
        ? addDays(anchorDate, -7)
        : new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1)
    go(view, ymd(a))
  }
  const shiftNext = () => {
    const a =
      view === 'week'
        ? addDays(anchorDate, 7)
        : new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)
    go(view, ymd(a))
  }

  let title: string
  if (view === 'week') {
    const ws = startOfWeek(anchorDate)
    const we = addDays(ws, 6)
    const dm = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
    title = `${dm.format(ws)} – ${dm.format(we)} ${we.getFullYear()}`
  } else {
    title = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(anchorDate)
  }

  const openBook = (d: string) => {
    setBookDate(d)
    setDayOpen(null)
    setBookOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Batch sessions and 1-to-1 coaching.
          </p>
        </div>
        {canBook && (
          <Button onClick={() => openBook(ymd(todayDate()))}>
            <Plus className="size-4" />
            Book Session
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={shiftPrev} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => go(view, ymd(todayDate()))}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={shiftNext} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-1 text-sm font-medium">{title}</span>
        </div>

        <div className="flex gap-1 rounded-md border p-0.5">
          {(['week', 'month'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => go(v, anchor)}
              className={cn(
                'rounded px-3 py-1 text-sm font-medium capitalize transition-colors',
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {coachLegend.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {coachLegend.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: c.color ?? FALLBACK_COLOR }}
              />
              {c.name}
            </span>
          ))}
        </div>
      )}

      {events.length === 0 && view === 'week' && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
          <CalendarDays className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing scheduled this week.</p>
        </div>
      )}

      {view === 'week' ? (
        <WeekView
          anchorDate={anchorDate}
          byDate={byDate}
          onPickEvent={setSelected}
          onPickDay={setDayOpen}
        />
      ) : (
        <MonthView anchorDate={anchorDate} byDate={byDate} onPickDay={setDayOpen} />
      )}

      {selected && (
        <EventSheet
          key={selected.id}
          event={selected}
          onClose={() => setSelected(null)}
          isAdmin={isAdmin}
          canBook={canBook}
        />
      )}

      {dayOpen && (
        <DaySheet
          day={dayOpen}
          events={byDate.get(dayOpen) ?? []}
          onClose={() => setDayOpen(null)}
          onPickEvent={(e) => {
            setDayOpen(null)
            setSelected(e)
          }}
          onBook={openBook}
          canBook={canBook}
        />
      )}

      {bookOpen && (
        <BookSheet
          open={bookOpen}
          onClose={() => setBookOpen(false)}
          date={bookDate}
          isAdmin={isAdmin}
          coachOptions={coachOptions}
          studentOptions={studentOptions}
        />
      )}
    </div>
  )
}
