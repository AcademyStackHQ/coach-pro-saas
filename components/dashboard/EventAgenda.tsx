import { parseYmd, groupEventsByDate, type CalendarEvent } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const FALLBACK_COLOR = '#94a3b8'

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  no_show: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-muted text-muted-foreground',
}
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/**
 * Read-only upcoming-events list grouped by date. Reused by the coach and
 * student detail pages to show their schedule (batch occurrences + sessions).
 */
export function EventAgenda({
  events,
  title = 'Upcoming',
  empty = 'Nothing scheduled.',
}: {
  events: CalendarEvent[]
  title?: string
  empty?: string
}) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {empty}
        </CardContent>
      </Card>
    )
  }

  const byDate = groupEventsByDate(events)
  const dates = Array.from(byDate.keys()).sort()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {dates.map((d) => {
          const day = parseYmd(d)
          return (
            <div key={d}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                {day ? dateFmt.format(day) : d}
              </p>
              <ul className="divide-y rounded-lg border">
                {(byDate.get(d) ?? []).map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 px-3 py-2">
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
                        {ev.type === 'session' ? ' · 1:1' : ''}
                        {ev.venue ? ` · ${ev.venue}` : ''}
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
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
