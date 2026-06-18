'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Plus, UserPlus } from 'lucide-react'
import { inviteCoach, type ActionState } from './actions'
import { Button } from '@/components/ui/button'
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

export type CoachRow = {
  kind: 'active' | 'inactive' | 'pending'
  user_id: string | null
  name: string
  email: string
  avatar_url: string | null
  programs: string[]
  color: string | null
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'pending', label: 'Pending' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

const STATUS_BADGE: Record<CoachRow['kind'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-50 text-green-700' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700' },
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function AddCoachSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(inviteCoach, {})

  // Close automatically once an invite succeeds.
  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onClose, 600)
      return () => clearTimeout(t)
    }
  }, [state.success, onClose])

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Coach</SheetTitle>
          <SheetDescription>
            Invite a coach by email. If they don&apos;t have an account yet, they&apos;ll be
            linked automatically when they sign up.
          </SheetDescription>
        </SheetHeader>

        <form action={action} className="flex flex-col gap-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="coach_email">Email</Label>
            <Input
              id="coach_email"
              name="email"
              type="email"
              required
              placeholder="coach@example.com"
              autoFocus
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm font-medium text-green-600">Coach invited.</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Inviting…' : (
              <>
                <UserPlus className="size-4" />
                Send Invite
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function CoachCard({ coach }: { coach: CoachRow }) {
  const badge = STATUS_BADGE[coach.kind]

  const inner = (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: coach.color ?? '#94a3b8' }}
      >
        {initials(coach.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{coach.name}</p>
        <p className="truncate text-xs text-muted-foreground">{coach.email}</p>
        {coach.programs.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {coach.programs.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {s}
              </Badge>
            ))}
            {coach.programs.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{coach.programs.length - 3}
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
    </div>
  )

  // Only active/inactive coaches (with a profile) are clickable.
  if (coach.user_id) {
    return <Link href={`/dashboard/coaches/${coach.user_id}`}>{inner}</Link>
  }
  return inner
}

export function CoachesClient({ coaches }: { coaches: CoachRow[] }) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = useMemo(
    () => (filter === 'all' ? coaches : coaches.filter((c) => c.kind === filter)),
    [coaches, filter]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coaches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite coaches and manage their programs, availability, and calendar colour.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" />
          Add Coach
        </Button>
      </div>

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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <GraduationCap className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No coaches yet</p>
          <p className="text-sm text-muted-foreground">
            Invite your first coach to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <CoachCard key={c.user_id ?? `pending-${i}`} coach={c} />
          ))}
        </div>
      )}

      <AddCoachSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
