'use client'

import { useState } from 'react'
import { DAYS_OF_WEEK, dayLabel, type BatchSlot } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type CoachOption = { id: string; name: string }

export type BatchFormDefaults = {
  name?: string
  program?: string
  coachId?: string | null
  slots?: BatchSlot[]
  capacity?: number
  venue?: string | null
  monthlyFeeRupees?: string
  effectiveFrom?: string | null
}

const selectClass =
  'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'

const DEFAULT_START = '06:00'
const DEFAULT_END = '08:00'

/**
 * Shared input set for the batch create + edit forms. Each training day carries
 * its OWN start/end time (e.g. Fri 17:00–18:30, Sat/Sun 07:00–08:30). Selected
 * days + their times are serialised into a single hidden `schedule` field as a
 * JSON array of { day, start, end } (day = JS Date.getDay() index); the parent
 * <form> supplies the action, hidden ids, override handling, and submit button.
 */
export function BatchFormFields({
  defaults = {},
  coachOptions,
  institutionPrograms,
  isAdmin,
}: {
  defaults?: BatchFormDefaults
  coachOptions: CoachOption[]
  institutionPrograms: string[]
  isAdmin: boolean
}) {
  const [slots, setSlots] = useState<BatchSlot[]>(defaults.slots ?? [])

  // Mon-first ordering for both the hidden field and the per-day rows.
  const ordered = DAYS_OF_WEEK.map((d) =>
    slots.find((s) => s.day === d.num)
  ).filter((s): s is BatchSlot => !!s)

  function toggleDay(num: number) {
    setSlots((prev) => {
      if (prev.some((s) => s.day === num)) return prev.filter((s) => s.day !== num)
      // New day inherits the last entered time so multi-day setups are quick.
      const last = prev[prev.length - 1]
      return [
        ...prev,
        { day: num, start: last?.start ?? DEFAULT_START, end: last?.end ?? DEFAULT_END },
      ]
    })
  }

  function setTime(day: number, field: 'start' | 'end', value: string) {
    setSlots((prev) =>
      prev.map((s) => (s.day === day ? { ...s, [field]: value } : s))
    )
  }

  // Copy the first (Mon-first) day's time to every selected day.
  function applyFirstToAll() {
    const base = ordered[0]
    if (!base) return
    setSlots((prev) => prev.map((s) => ({ ...s, start: base.start, end: base.end })))
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="schedule" value={JSON.stringify(ordered)} />

      <div className="space-y-1.5">
        <Label htmlFor="b_name">Batch name *</Label>
        <Input
          id="b_name"
          name="name"
          required
          defaultValue={defaults.name ?? ''}
          placeholder="U-12 Cricket Morning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="b_program">Program *</Label>
          <Input
            id="b_program"
            name="program"
            required
            list="b_program_options"
            defaultValue={defaults.program ?? ''}
            placeholder="Cricket"
          />
          <datalist id="b_program_options">
            {institutionPrograms.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {isAdmin && (
          <div className="space-y-1.5">
            <Label htmlFor="b_coach">Coach</Label>
            <select
              id="b_coach"
              name="coach_id"
              defaultValue={defaults.coachId ?? ''}
              className={selectClass}
            >
              <option value="">Unassigned</option>
              {coachOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Training days *</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((d) => {
            const on = slots.some((s) => s.day === d.num)
            return (
              <button
                key={d.num}
                type="button"
                onClick={() => toggleDay(d.num)}
                aria-pressed={on}
                title={d.label}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                  on
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input text-muted-foreground hover:border-primary/40'
                )}
              >
                {d.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* Per-day times — each selected day gets its own start/end. */}
      {ordered.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Time on each day</Label>
            {ordered.length > 1 && (
              <button
                type="button"
                onClick={applyFirstToAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                Use {dayLabel(ordered[0].day)}’s time for all
              </button>
            )}
          </div>
          {ordered.map((s) => (
            <div key={s.day} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-sm font-medium">
                {dayLabel(s.day)}
              </span>
              <Input
                type="time"
                aria-label={`${dayLabel(s.day)} start time`}
                value={s.start}
                onChange={(e) => setTime(s.day, 'start', e.target.value)}
                required
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                aria-label={`${dayLabel(s.day)} end time`}
                value={s.end}
                onChange={(e) => setTime(s.day, 'end', e.target.value)}
                required
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="b_capacity">Capacity *</Label>
        <Input
          id="b_capacity"
          name="capacity"
          type="number"
          min={1}
          required
          defaultValue={defaults.capacity ?? ''}
          placeholder="20"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="b_venue">Venue</Label>
        <Input
          id="b_venue"
          name="venue"
          defaultValue={defaults.venue ?? ''}
          placeholder="Main Ground"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="b_fee">Monthly fee (₹)</Label>
          <Input
            id="b_fee"
            name="monthly_fee"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={defaults.monthlyFeeRupees ?? ''}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b_effective">Effective from</Label>
          <Input
            id="b_effective"
            name="effective_from"
            type="date"
            defaultValue={defaults.effectiveFrom ?? ''}
          />
          <p className="text-xs text-muted-foreground">Defaults to today.</p>
        </div>
      </div>
    </div>
  )
}
