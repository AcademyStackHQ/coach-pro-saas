'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  updateBatch,
  enrolStudent,
  removeStudent,
  deactivateBatch,
  reactivateBatch,
  type ActionState,
} from '../actions'
import {
  BatchFormFields,
  type CoachOption,
} from '@/components/dashboard/BatchFormFields'
import { batchScheduleLabel, capacityBadge, type BatchSlot } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn, paiseToRupees } from '@/lib/utils'

type Enrolment = {
  enrolmentId: string
  studentId: string
  name: string
  studentCode: string | null
  status: 'active' | 'waitlisted'
}

export type BatchDetailData = {
  id: string
  name: string
  program: string
  coachId: string | null
  coachName: string | null
  slots: BatchSlot[]
  venue: string | null
  capacity: number
  monthlyFee: number
  monthlyFeeRupees: string
  status: 'active' | 'inactive'
  effectiveFrom: string | null
  enrolled: Enrolment[]
  enrolOptions: { id: string; name: string; studentCode: string | null }[]
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'students', label: 'Students' },
  { id: 'schedule', label: 'Schedule' },
] as const

type TabId = (typeof TABS)[number]['id']

// ---------------------------------------------------------------------------
// Capacity ring — lightweight SVG (no chart dependency).
// ---------------------------------------------------------------------------
function CapacityRing({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(enrolled / capacity, 1) : 0
  const r = 42
  const circ = 2 * Math.PI * r
  const badge = capacityBadge(enrolled, capacity)
  const stroke =
    badge.label === 'Full' ? '#dc2626' : badge.label === 'Almost Full' ? '#d97706' : '#16a34a'

  return (
    <div className="flex items-center gap-4">
      <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </svg>
      <div>
        <p className="text-2xl font-bold">
          {enrolled}
          <span className="text-base font-normal text-muted-foreground">/{capacity}</span>
        </p>
        <span
          className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}
        >
          {badge.label}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function OverviewTab({
  data,
  coachOptions,
  institutionPrograms,
  isAdmin,
}: {
  data: BatchDetailData
  coachOptions: CoachOption[]
  institutionPrograms: string[]
  isAdmin: boolean
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateBatch, {})
  const showOverride = !!state.warning && !state.success
  const activeCount = data.enrolled.filter((e) => e.status === 'active').length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Capacity</CardTitle>
        </CardHeader>
        <CardContent>
          <CapacityRing enrolled={activeCount} capacity={data.capacity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            <input type="hidden" name="id" value={data.id} />
            <input type="hidden" name="override" value={showOverride ? '1' : ''} />

            <BatchFormFields
              defaults={{
                name: data.name,
                program: data.program,
                coachId: data.coachId,
                slots: data.slots,
                capacity: data.capacity,
                venue: data.venue,
                monthlyFeeRupees: data.monthlyFeeRupees,
                effectiveFrom: data.effectiveFrom,
              }}
              coachOptions={coachOptions}
              institutionPrograms={institutionPrograms}
              isAdmin={isAdmin}
            />

            {showOverride ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">{state.warning}</p>
                <Button type="submit" disabled={pending} size="sm">
                  {pending ? 'Saving…' : 'Save anyway'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    state.error ? 'text-destructive' : 'text-green-600'
                  )}
                >
                  {state.error ? state.error : state.success ? 'Saved successfully.' : ''}
                </span>
                <Button type="submit" disabled={pending} className="ml-auto">
                  {pending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
function StudentsTab({ data }: { data: BatchDetailData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(enrolStudent, {})
  const [selected, setSelected] = useState('')

  const active = data.enrolled.filter((e) => e.status === 'active')
  const waitlisted = data.enrolled.filter((e) => e.status === 'waitlisted')
  const selectClass =
    'h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enrol a student</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="batch_id" value={data.id} />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="enrol_student">Student</Label>
              <div className="flex gap-2">
                <select
                  id="enrol_student"
                  name="student_id"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">Select a student…</option>
                  {data.enrolOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.studentCode ? ` (${s.studentCode})` : ''}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={pending || !selected}>
                  {pending ? 'Enrolling…' : 'Enrol'}
                </Button>
              </div>
            </div>
          </form>
          {state.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
          {data.enrolOptions.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              All active students are already enrolled.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            When the batch is full, new enrolments are automatically waitlisted.
          </p>
        </CardContent>
      </Card>

      <EnrolmentTable title="Active" rows={active} batchId={data.id} empty="No students enrolled yet." />
      {waitlisted.length > 0 && (
        <EnrolmentTable title="Waitlisted" rows={waitlisted} batchId={data.id} empty="" />
      )}
    </div>
  )
}

function EnrolmentTable({
  title,
  rows,
  batchId,
  empty,
}: {
  title: string
  rows: Enrolment[]
  batchId: string
  empty: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {rows.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {rows.map((e) => (
              <li key={e.enrolmentId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/students/${e.studentId}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {e.name}
                  </Link>
                  {e.studentCode && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {e.studentCode}
                    </span>
                  )}
                </div>
                <form action={removeStudent}>
                  <input type="hidden" name="enrolment_id" value={e.enrolmentId} />
                  <input type="hidden" name="batch_id" value={batchId} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Read-only next-4-weeks occurrence preview, computed on the fly.
// ---------------------------------------------------------------------------
function ScheduleTab({ data }: { data: BatchDetailData }) {
  // One slot per day, keyed by JS day index — each occurrence shows its day's time.
  const slotByDay = new Map(data.slots.map((s) => [s.day, s]))
  const occurrences: { date: Date; start: string; end: string }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = data.effectiveFrom ? new Date(data.effectiveFrom) : today
  const start = from > today ? from : today
  const end = new Date(start)
  end.setDate(end.getDate() + 28)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const slot = slotByDay.get(d.getDay())
    if (slot) occurrences.push({ date: new Date(d), start: slot.start, end: slot.end })
  }

  const fmt = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next 4 weeks</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          {batchScheduleLabel(data.slots)}
        </p>
        {occurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sessions scheduled — set training days in Overview.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {occurrences.map((o, i) => (
              <li
                key={i}
                className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
              >
                {fmt.format(o.date)}
                <span className="block text-xs text-muted-foreground">
                  {o.start.slice(0, 5)}–{o.end.slice(0, 5)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
export function BatchDetail({
  data,
  coachOptions,
  institutionPrograms,
  isAdmin,
}: {
  data: BatchDetailData
  coachOptions: CoachOption[]
  institutionPrograms: string[]
  isAdmin: boolean
}) {
  const [tab, setTab] = useState<TabId>('overview')
  const isActive = data.status === 'active'

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/dashboard/batches"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to batches
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.program}
            {data.coachName ? ` · ${data.coachName}` : ''}
            {data.monthlyFee > 0 ? ` · ₹${paiseToRupees(data.monthlyFee)}/mo` : ''}
          </p>
        </div>

        {/* Only admins toggle active/inactive (RLS allows DELETE/restore to admins). */}
        {isAdmin && (
          <form action={isActive ? deactivateBatch : reactivateBatch}>
            <input type="hidden" name="id" value={data.id} />
            <Button type="submit" variant={isActive ? 'outline' : 'default'}>
              {isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </form>
        )}
      </div>

      <div className="flex gap-1 border-b pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          data={data}
          coachOptions={coachOptions}
          institutionPrograms={institutionPrograms}
          isAdmin={isAdmin}
        />
      )}
      {tab === 'students' && <StudentsTab data={data} />}
      {tab === 'schedule' && <ScheduleTab data={data} />}
    </div>
  )
}
