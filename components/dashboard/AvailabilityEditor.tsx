'use client'

import { useActionState, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  DAYS,
  DEFAULT_AVAILABILITY,
  type AvailabilityMap,
  type DayKey,
  type TimeBlock,
} from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActionState = { success?: boolean; error?: string }

function normalize(value: unknown): AvailabilityMap {
  const base: AvailabilityMap = { ...DEFAULT_AVAILABILITY }
  if (value && typeof value === 'object') {
    for (const d of DAYS) {
      const blocks = (value as Record<string, unknown>)[d.key]
      if (Array.isArray(blocks)) {
        base[d.key] = blocks
          .filter(
            (b): b is TimeBlock =>
              !!b && typeof b === 'object' && 'start' in b && 'end' in b
          )
          .map((b) => ({ start: String(b.start), end: String(b.end) }))
      }
    }
  }
  return base
}

export function AvailabilityEditor({
  initial,
  action,
  /** optional hidden fields (e.g. user_id) forwarded to the server action */
  hidden,
  saveLabel = 'Save Availability',
  description,
}: {
  initial: unknown
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>
  hidden?: Record<string, string>
  saveLabel?: string
  description?: string
}) {
  const [avail, setAvail] = useState<AvailabilityMap>(() => normalize(initial))
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {})

  function addBlock(day: DayKey) {
    setAvail((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: '06:00', end: '08:00' }],
    }))
  }

  function removeBlock(day: DayKey, idx: number) {
    setAvail((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }))
  }

  function setTime(day: DayKey, idx: number, field: 'start' | 'end', value: string) {
    setAvail((prev) => ({
      ...prev,
      [day]: prev[day].map((b, i) => (i === idx ? { ...b, [field]: value } : b)),
    }))
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="availability" value={JSON.stringify(avail)} />
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      <div className="divide-y">
        {DAYS.map((d) => (
          <div key={d.key} className="flex gap-4 py-3">
            <div className="w-28 shrink-0 pt-1.5 text-sm font-medium">{d.label}</div>

            <div className="flex-1 space-y-2">
              {avail[d.key].length === 0 ? (
                <p className="pt-1.5 text-sm text-muted-foreground">Unavailable</p>
              ) : (
                avail[d.key].map((block, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={block.start}
                      onChange={(e) => setTime(d.key, idx, 'start', e.target.value)}
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={block.end}
                      onChange={(e) => setTime(d.key, idx, 'end', e.target.value)}
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => removeBlock(d.key, idx)}
                      aria-label="Remove block"
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={() => addBlock(d.key)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="size-3.5" />
                Add block
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className={cn('text-sm font-medium', state.error ? 'text-destructive' : 'text-green-600')}>
          {state.error ? state.error : state.success ? 'Saved successfully.' : ''}
        </span>
        <Button type="submit" disabled={pending} className="ml-auto">
          {pending ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </form>
  )
}
