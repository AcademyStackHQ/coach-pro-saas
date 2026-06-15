'use client'

import { useActionState, useState, useEffect, useTransition } from 'react'
import {
  saveAcademyProfile,
  addCoachInvite,
  saveWorkingHours,
  addStudentInvite,
  completeOnboarding,
  type ActionState,
} from './actions'
import {
  INSTITUTION_CATEGORIES,
  DAYS,
  DEFAULT_WORKING_HOURS,
  type DayKey,
  type WorkingHoursMap,
} from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WizardInstitution = {
  id: string
  name: string
  category: string | null
  address: string | null
  contact_email: string | null
  contact_mobile: string | null
  timezone: string | null
  working_hours: Record<string, unknown> | null
}

const STEPS = [
  { n: 1, label: 'Academy Profile' },
  { n: 2, label: 'First Coach' },
  { n: 3, label: 'Working Hours' },
  { n: 4, label: 'First Student' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                current > s.n
                  ? 'bg-primary border-primary text-primary-foreground'
                  : current === s.n
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {current > s.n ? <Check className="w-4 h-4" /> : s.n}
            </div>
            <span
              className={cn(
                'text-xs font-medium hidden sm:block whitespace-nowrap',
                current >= s.n ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'h-0.5 w-12 sm:w-16 mx-2 mb-5 transition-colors',
                current > s.n ? 'bg-primary' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive mt-1">{message}</p>
}

function nativeSelectClass() {
  return 'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'
}

export function OnboardingWizard({ institution }: { institution: WizardInstitution }) {
  const [step, setStep] = useState(1)
  const [, startTransition] = useTransition()

  // Working hours local state for step 3.
  // The DB default is '{}' so we must verify a real day key exists before using it.
  const [hours, setHours] = useState<WorkingHoursMap>(() => {
    const wh = institution.working_hours
    if (wh && typeof wh === 'object' && 'mon' in wh) {
      return { ...DEFAULT_WORKING_HOURS, ...(wh as Partial<WorkingHoursMap>) }
    }
    return DEFAULT_WORKING_HOURS
  })

  // All action states declared at top level (rules of hooks)
  const [s1, a1, p1] = useActionState<ActionState, FormData>(saveAcademyProfile, {})
  const [s2, a2, p2] = useActionState<ActionState, FormData>(addCoachInvite, {})
  const [s3, a3, p3] = useActionState<ActionState, FormData>(saveWorkingHours, {})
  const [s4, a4, p4] = useActionState<ActionState, FormData>(addStudentInvite, {})

  useEffect(() => { if (s1.success) setStep(2) }, [s1.success])
  useEffect(() => { if (s2.success) setStep(3) }, [s2.success])
  useEffect(() => { if (s3.success) setStep(4) }, [s3.success])
  useEffect(() => {
    if (s4.success) startTransition(async () => { await completeOnboarding() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s4.success])

  function handleFinish() {
    startTransition(async () => { await completeOnboarding() })
  }

  function toggleDay(day: DayKey) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], open: !prev[day].open } }))
  }

  function setDayTime(day: DayKey, field: 'start' | 'end', value: string) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  return (
    <div className="flex-1 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Set up your academy</h1>
          <p className="text-muted-foreground mt-1.5">
            This takes about 5 minutes and you can skip anything for later.
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1: Academy Profile (required) ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Academy Profile</CardTitle>
              <CardDescription>
                Basic information about your academy. You can update this any time in Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={a1} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Academy Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={institution.name}
                    required
                    minLength={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    defaultValue={institution.category ?? ''}
                    required
                    className={nativeSelectClass()}
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {INSTITUTION_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    defaultValue={institution.address ?? ''}
                    placeholder="Full address of your academy"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      name="contact_email"
                      type="email"
                      defaultValue={institution.contact_email ?? ''}
                      placeholder="academy@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_mobile">Contact Mobile</Label>
                    <Input
                      id="contact_mobile"
                      name="contact_mobile"
                      type="tel"
                      defaultValue={institution.contact_mobile ?? ''}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <FieldError message={s1.error} />

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={p1}>
                    {p1 ? 'Saving…' : 'Continue'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: First Coach (optional) ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Add Your First Coach</CardTitle>
              <CardDescription>
                Invite a coach by email. They&apos;ll be able to sign up at{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">/signup</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={a2} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c_name">Full Name</Label>
                  <Input id="c_name" name="full_name" placeholder="Coach name (optional)" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c_email">Email Address</Label>
                  <Input
                    id="c_email"
                    name="email"
                    type="email"
                    placeholder="coach@example.com"
                    required
                  />
                </div>

                <FieldError message={s2.error} />
                {s2.success && (
                  <p className="text-sm text-green-600 font-medium">
                    Coach added to your allow list. They can sign up now.
                  </p>
                )}

                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStep(3)}>
                    Skip for now
                  </Button>
                  <Button type="submit" disabled={p2}>
                    {p2 ? 'Adding…' : 'Add Coach'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Working Hours (optional) ── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
              <CardDescription>
                Set your academy&apos;s operating hours. Students can see when you&apos;re open.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={a3} className="space-y-4">
                <input type="hidden" name="working_hours" value={JSON.stringify(hours)} />

                <div className="divide-y">
                  {DAYS.map(d => (
                    <div key={d.key} className="flex items-center gap-4 py-2.5">
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <input
                          type="checkbox"
                          id={`day-${d.key}`}
                          checked={hours[d.key].open}
                          onChange={() => toggleDay(d.key)}
                          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                        />
                        <Label htmlFor={`day-${d.key}`} className="font-normal cursor-pointer">
                          {d.label}
                        </Label>
                      </div>

                      {hours[d.key].open ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={hours[d.key].start}
                            onChange={e => setDayTime(d.key, 'start', e.target.value)}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <input
                            type="time"
                            value={hours[d.key].end}
                            onChange={e => setDayTime(d.key, 'end', e.target.value)}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>

                <FieldError message={s3.error} />

                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStep(4)}>
                    Skip for now
                  </Button>
                  <Button type="submit" disabled={p3}>
                    {p3 ? 'Saving…' : 'Save Hours'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: First Student (optional) ── */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Invite Your First Student</CardTitle>
              <CardDescription>
                Add a student&apos;s email so they can sign up at{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">/signup</code>. You can add more
                from the Members page later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={a4} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s_email">Student Email</Label>
                  <Input
                    id="s_email"
                    name="email"
                    type="email"
                    placeholder="student@example.com"
                    required
                  />
                </div>

                <FieldError message={s4.error} />

                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleFinish}>
                    Skip &amp; finish setup
                  </Button>
                  <Button type="submit" disabled={p4}>
                    {p4 ? 'Inviting…' : 'Invite Student'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
