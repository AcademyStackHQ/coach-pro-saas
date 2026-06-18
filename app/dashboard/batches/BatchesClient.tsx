'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, Plus } from 'lucide-react'
import { createBatch, type ActionState } from './actions'
import {
  BatchFormFields,
  type BatchFormDefaults,
  type CoachOption,
} from '@/components/dashboard/BatchFormFields'
import { batchScheduleLabel, capacityBadge, type BatchSlot } from '@/lib/constants'
import { cn, paiseToRupees } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

export type { CoachOption }

export type BatchRow = {
  id: string
  name: string
  program: string
  coachId: string | null
  coachName: string | null
  coachColor: string | null
  slots: BatchSlot[]
  venue: string | null
  capacity: number
  enrolled: number
  monthlyFee: number
  status: 'active' | 'inactive'
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

function CreateBatchSheet({
  open,
  onClose,
  coachOptions,
  institutionPrograms,
  isAdmin,
}: {
  open: boolean
  onClose: () => void
  coachOptions: CoachOption[]
  institutionPrograms: string[]
  isAdmin: boolean
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createBatch, {})
  const showOverride = !!state.warning && !state.success

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onClose, 600)
      return () => clearTimeout(t)
    }
  }, [state.success, onClose])

  const defaults: BatchFormDefaults = { capacity: 20 }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Create Batch</SheetTitle>
          <SheetDescription>
            Set up a training group with its schedule, coach, and capacity.
          </SheetDescription>
        </SheetHeader>

        <form action={action} className="flex flex-col gap-4 p-4">
          <input type="hidden" name="override" value={showOverride ? '1' : ''} />

          <BatchFormFields
            defaults={defaults}
            coachOptions={coachOptions}
            institutionPrograms={institutionPrograms}
            isAdmin={isAdmin}
          />

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm font-medium text-green-600">Batch created.</p>
          )}

          {showOverride ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">{state.warning}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending} size="sm">
                  {pending ? 'Saving…' : 'Book anyway'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Saving…' : (
                <>
                  <Plus className="size-4" />
                  Create Batch
                </>
              )}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function BatchCard({ batch }: { batch: BatchRow }) {
  const cap = capacityBadge(batch.enrolled, batch.capacity)
  return (
    <Link
      href={`/dashboard/batches/${batch.id}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{batch.name}</p>
          <p className="truncate text-xs text-muted-foreground">{batch.program}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
            batch.status === 'inactive'
              ? 'bg-muted text-muted-foreground'
              : cap.className
          )}
        >
          {batch.status === 'inactive' ? 'Inactive' : cap.label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {batchScheduleLabel(batch.slots)}
      </p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {batch.coachName ? (
            <>
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                style={{ backgroundColor: batch.coachColor ?? '#94a3b8' }}
              >
                {initials(batch.coachName)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {batch.coachName}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No coach assigned</span>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {batch.enrolled}/{batch.capacity}
        </span>
      </div>

      {batch.venue && (
        <p className="truncate text-xs text-muted-foreground">📍 {batch.venue}</p>
      )}
      {batch.monthlyFee > 0 && (
        <p className="text-xs font-medium">₹{paiseToRupees(batch.monthlyFee)}/mo</p>
      )}
    </Link>
  )
}

export function BatchesClient({
  batches,
  coachOptions,
  institutionPrograms,
  isAdmin,
}: {
  batches: BatchRow[]
  coachOptions: CoachOption[]
  institutionPrograms: string[]
  isAdmin: boolean
}) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [program, setProgram] = useState<string>('all')
  const [coach, setCoach] = useState<string>('all')
  const [sheetOpen, setSheetOpen] = useState(false)

  const programs = useMemo(
    () => Array.from(new Set(batches.map((b) => b.program))).sort(),
    [batches]
  )

  const filtered = useMemo(
    () =>
      batches.filter((b) => {
        if (filter !== 'all' && b.status !== filter) return false
        if (program !== 'all' && b.program !== program) return false
        if (coach !== 'all' && b.coachId !== coach) return false
        return true
      }),
    [batches, filter, program, coach]
  )

  const selectClass =
    'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? 'Batches' : 'My Batches'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? 'Training groups, schedules, coaches, and enrolment.'
              : 'The training groups you coach — manage schedule and enrolment.'}
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" />
          Create Batch
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 border-b pb-px">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                filter === f.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className={selectClass}
            aria-label="Filter by program"
          >
            <option value="all">All programs</option>
            {programs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {isAdmin && (
            <select
              value={coach}
              onChange={(e) => setCoach(e.target.value)}
              className={selectClass}
              aria-label="Filter by coach"
            >
              <option value="all">All coaches</option>
              {coachOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <CalendarClock className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No batches found</p>
          <p className="text-sm text-muted-foreground">
            {batches.length === 0
              ? 'Create your first batch to get started.'
              : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <BatchCard key={b.id} batch={b} />
          ))}
        </div>
      )}

      <CreateBatchSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        coachOptions={coachOptions}
        institutionPrograms={institutionPrograms}
        isAdmin={isAdmin}
      />
    </div>
  )
}
