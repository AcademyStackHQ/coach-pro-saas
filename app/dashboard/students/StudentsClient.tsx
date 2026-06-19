'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Plus, UserPlus } from 'lucide-react'
import { createStudent, type ActionState } from './actions'
import { ProgramsField } from '@/components/dashboard/ProgramsField'
import { GENDERS, CONTACT_CHANNELS } from '@/lib/constants'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export type StudentRow = {
  id: string
  name: string
  callingName: string | null
  programs: string[]
  status: 'active' | 'inactive'
  parentMobile: string
  photoUrl: string | null
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

const STATUS_BADGE: Record<StudentRow['status'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-50 text-green-700' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground' },
}

function nativeSelectClass() {
  return 'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function AddStudentSheet({
  open,
  onClose,
  institutionPrograms,
}: {
  open: boolean
  onClose: () => void
  institutionPrograms: string[]
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createStudent,
    {}
  )
  // A soft duplicate was detected on the last submit; surfacing the prompt and
  // carrying confirm=1 on the next submit ("Add anyway") is derived from state
  // — no effect needed.
  const showDupPrompt = !!state.duplicate && !state.success

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onClose, 600)
      return () => clearTimeout(t)
    }
  }, [state.success, onClose])

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add Student</SheetTitle>
          <SheetDescription>
            Create a student record. Students are managed by the academy — no
            login or email is required.
          </SheetDescription>
        </SheetHeader>

        <form action={action} className="flex flex-col gap-4 p-4">
          <input type="hidden" name="confirm" value={showDupPrompt ? '1' : ''} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s_full_name">Full name *</Label>
              <Input id="s_full_name" name="full_name" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s_calling_name">Calling name</Label>
              <Input id="s_calling_name" name="calling_name" placeholder="Nickname" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s_dob">Date of birth *</Label>
              <Input id="s_dob" name="dob" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s_gender">Gender</Label>
              <select id="s_gender" name="gender" defaultValue="" className={nativeSelectClass()}>
                <option value="">Not specified</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s_parent_name">Parent name *</Label>
              <Input id="s_parent_name" name="parent_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s_parent_mobile">Parent mobile *</Label>
              <Input
                id="s_parent_mobile"
                name="parent_mobile"
                type="tel"
                required
                placeholder="+919876543210"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s_parent_email">Parent email</Label>
            <Input
              id="s_parent_email"
              name="parent_email"
              type="email"
              placeholder="parent@example.com"
            />
            <p className="text-xs text-muted-foreground">
              A contact field only — siblings can share the same email. A unique
              student code is assigned automatically.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s_contact_channel">Message channel</Label>
            <select
              id="s_contact_channel"
              name="contact_channel"
              defaultValue="sms"
              className={nativeSelectClass()}
            >
              {CONTACT_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              How fee reminders and announcements reach this parent.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Programs</Label>
            <ProgramsField suggestions={institutionPrograms} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s_enrolment_date">Enrolment date</Label>
            <Input id="s_enrolment_date" name="enrolment_date" type="date" />
            <p className="text-xs text-muted-foreground">Defaults to today if left blank.</p>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">Fees (optional)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s_monthly_fee">Monthly fee (₹)</Label>
                <Input
                  id="s_monthly_fee"
                  name="monthly_fee"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s_deposit_amount">Advance / deposit (₹)</Label>
                <Input
                  id="s_deposit_amount"
                  name="deposit_amount"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm font-medium text-green-600">
              Student created
              {state.studentCode && (
                <>
                  {' '}— code{' '}
                  <span className="font-mono">{state.studentCode}</span>
                </>
              )}
              .
            </p>
          )}

          {showDupPrompt ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                A student with this name and date of birth already exists.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending} size="sm">
                  {pending ? 'Adding…' : 'Add anyway'}
                </Button>
                {state.existingId && (
                  <Link
                    href={`/dashboard/students/${state.existingId}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    View existing
                  </Link>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Saving…' : (
                <>
                  <UserPlus className="size-4" />
                  Create Student
                </>
              )}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}

function StudentRowCard({ student }: { student: StudentRow }) {
  const badge = STATUS_BADGE[student.status]
  return (
    <Link
      href={`/dashboard/students/${student.id}`}
      className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials(student.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {student.name}
          {student.callingName && (
            <span className="ml-1.5 font-normal text-muted-foreground">
              “{student.callingName}”
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{student.parentMobile}</p>
        {student.programs.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {student.programs.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {s}
              </Badge>
            ))}
            {student.programs.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{student.programs.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
          badge.className
        )}
      >
        {badge.label}
      </span>
    </Link>
  )
}

export function StudentsClient({
  students,
  institutionPrograms,
}: {
  students: StudentRow[]
  institutionPrograms: string[]
}) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => {
      if (filter !== 'all' && s.status !== filter) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        (s.callingName?.toLowerCase().includes(q) ?? false) ||
        s.parentMobile.toLowerCase().includes(q)
      )
    })
  }, [students, filter, query])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage student records, parents, and enrolment.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" />
          Add Student
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
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or parent mobile…"
          className="sm:max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <GraduationCap className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No students found</p>
          <p className="text-sm text-muted-foreground">
            {students.length === 0
              ? 'Add your first student to get started.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <StudentRowCard key={s.id} student={s} />
          ))}
        </div>
      )}

      <AddStudentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        institutionPrograms={institutionPrograms}
      />
    </div>
  )
}
