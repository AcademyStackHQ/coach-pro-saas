'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  updateCoachProfile,
  saveCoachAvailability,
  deactivateCoach,
  reactivateCoach,
  type ActionState,
} from '../actions'
import { COACH_COLORS } from '@/lib/constants'
import { AvailabilityEditor } from '@/components/dashboard/AvailabilityEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type CoachDetailData = {
  user_id: string
  status: 'active' | 'inactive'
  name: string
  email: string
  mobile: string | null
  avatar_url: string | null
  sports: string[]
  bio: string
  color: string | null
  availability: unknown
  joined_at: string | null
  institutionSports: string[]
}

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'availability', label: 'Availability' },
  { id: 'batches', label: 'Batches' },
  { id: 'calendar', label: 'Calendar' },
] as const

type TabId = (typeof TABS)[number]['id']

function ProfileTab({ data }: { data: CoachDetailData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateCoachProfile,
    {}
  )
  const [color, setColor] = useState<string>(data.color ?? COACH_COLORS[0])
  const [selectedSports, setSelectedSports] = useState<string[]>(data.sports)
  const [customSport, setCustomSport] = useState('')

  function toggleSport(sport: string) {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
  }

  function addCustomSport() {
    const s = customSport.trim()
    if (s && !selectedSports.includes(s)) setSelectedSports((prev) => [...prev, s])
    setCustomSport('')
  }

  // Union of institution sports + any already on the coach + custom additions.
  const sportOptions = Array.from(
    new Set([...data.institutionSports, ...selectedSports])
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coaching Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <input type="hidden" name="user_id" value={data.user_id} />
          <input type="hidden" name="color" value={color} />
          {selectedSports.map((s) => (
            <input key={s} type="hidden" name="sports" value={s} />
          ))}

          {/* Read-only identity (lives in profiles) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={data.name} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input value={data.mobile ?? '—'} disabled className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sports</Label>
            <div className="flex flex-wrap gap-2">
              {sportOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No sports configured yet — add one below.
                </p>
              )}
              {sportOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSport(s)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    selectedSports.includes(s)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Input
                value={customSport}
                onChange={(e) => setCustomSport(e.target.value)}
                placeholder="Add a sport"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomSport()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addCustomSport}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={data.bio}
              placeholder="Short bio shown on the coach's profile"
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Calendar Colour</Label>
            <div className="flex flex-wrap gap-2">
              {COACH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Select colour ${c}`}
                  className={cn(
                    'size-7 rounded-full ring-offset-2 transition',
                    color === c ? 'ring-2 ring-foreground' : ''
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

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
              {pending ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Placeholder({ module }: { module: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        Available in {module}.
      </CardContent>
    </Card>
  )
}

export function CoachDetail({ data }: { data: CoachDetailData }) {
  const [tab, setTab] = useState<TabId>('profile')
  const isActive = data.status === 'active'

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/dashboard/coaches"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to coaches
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
            style={{ backgroundColor: data.color ?? '#94a3b8' }}
          >
            {data.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{data.name}</h1>
            <p className="text-sm text-muted-foreground">{data.email}</p>
          </div>
        </div>

        <form action={isActive ? deactivateCoach : reactivateCoach}>
          <input type="hidden" name="user_id" value={data.user_id} />
          <Button type="submit" variant={isActive ? 'outline' : 'default'}>
            {isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
        </form>
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

      {tab === 'profile' && <ProfileTab data={data} />}
      {tab === 'availability' && (
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityEditor
              initial={data.availability}
              action={saveCoachAvailability}
              hidden={{ user_id: data.user_id }}
              description="When this coach is available to take sessions. Add multiple blocks per day for split shifts."
            />
          </CardContent>
        </Card>
      )}
      {tab === 'batches' && <Placeholder module="Module 5" />}
      {tab === 'calendar' && <Placeholder module="Module 6" />}
    </div>
  )
}
