'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import {
  updateStudent,
  deactivateStudent,
  reactivateStudent,
  enableStudentLogin,
  resetStudentPassword,
  type ActionState,
  type LoginActionState,
} from '../actions'
import { ProgramsField } from '@/components/dashboard/ProgramsField'
import { EventAgenda } from '@/components/dashboard/EventAgenda'
import type { CalendarEvent } from '@/lib/calendar'
import { GENDERS, UNIFORM_SIZES, CONTACT_CHANNELS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, paiseToRupees, studentLoginEmail } from '@/lib/utils'

export type StudentDetailData = {
  id: string
  status: 'active' | 'inactive'
  full_name: string
  calling_name: string | null
  dob: string | null
  gender: string | null
  student_code: string | null
  user_id: string | null
  enrolment_date: string | null
  programs: string[]
  parent_name: string
  parent_mobile: string
  parent_email: string | null
  contact_channel: string
  uniform_size: string | null
  uniform_number: number | null
  uniform_name: string | null
  monthly_fee: number | null
  deposit_amount: number | null
  feeInvoices: {
    id: string
    monthLabel: string
    amountDue: number
    amountPaid: number
    balance: number
    status: 'pending' | 'partial' | 'paid' | 'waived'
  }[]
  institutionPrograms: string[]
  batches: {
    id: string
    name: string
    program: string
    status: 'active' | 'waitlisted'
  }[]
  calendarEvents: CalendarEvent[]
}

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'parent', label: 'Parent' },
  { id: 'login', label: 'Login' },
  { id: 'uniform', label: 'Uniform' },
  { id: 'fees', label: 'Fees' },
  { id: 'batches', label: 'Batches' },
  { id: 'schedule', label: 'Schedule' },
] as const

type TabId = (typeof TABS)[number]['id']

function nativeSelectClass() {
  return 'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'
}

function SaveRow({ state, pending }: { state: ActionState; pending: boolean }) {
  return (
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
  )
}

function ProfileTab({ data }: { data: StudentDetailData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStudent, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={data.id} />
          <input type="hidden" name="section" value="profile" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name *</Label>
              <Input id="full_name" name="full_name" defaultValue={data.full_name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calling_name">Calling name</Label>
              <Input
                id="calling_name"
                name="calling_name"
                defaultValue={data.calling_name ?? ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" name="dob" type="date" defaultValue={data.dob ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                defaultValue={data.gender ?? ''}
                className={nativeSelectClass()}
              >
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
              <Label htmlFor="student_code">Student code</Label>
              <Input
                id="student_code"
                value={data.student_code ?? '—'}
                disabled
                className="bg-muted/50 cursor-not-allowed font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Auto-assigned; also the student&apos;s login handle.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enrolment_date">Enrolment date</Label>
              <Input
                id="enrolment_date"
                name="enrolment_date"
                type="date"
                defaultValue={data.enrolment_date ?? ''}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Programs</Label>
            <ProgramsField initial={data.programs} suggestions={data.institutionPrograms} />
          </div>

          <SaveRow state={state} pending={pending} />
        </form>
      </CardContent>
    </Card>
  )
}

function ParentTab({ data }: { data: StudentDetailData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStudent, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parent</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={data.id} />
          <input type="hidden" name="section" value="parent" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="parent_name">Parent name *</Label>
              <Input
                id="parent_name"
                name="parent_name"
                defaultValue={data.parent_name}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parent_mobile">Parent mobile *</Label>
              <Input
                id="parent_mobile"
                name="parent_mobile"
                type="tel"
                defaultValue={data.parent_mobile}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parent_email">Parent email</Label>
            <Input
              id="parent_email"
              name="parent_email"
              type="email"
              defaultValue={data.parent_email ?? ''}
            />
            <p className="text-xs text-muted-foreground">
              A contact field only — siblings can share the same email.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact_channel">Message channel</Label>
            <select
              id="contact_channel"
              name="contact_channel"
              defaultValue={data.contact_channel}
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

          <SaveRow state={state} pending={pending} />
        </form>
      </CardContent>
    </Card>
  )
}

function UniformTab({ data }: { data: StudentDetailData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStudent, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uniform</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={data.id} />
          <input type="hidden" name="section" value="uniform" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="uniform_size">Size</Label>
              <select
                id="uniform_size"
                name="uniform_size"
                defaultValue={data.uniform_size ?? ''}
                className={nativeSelectClass()}
              >
                <option value="">—</option>
                {UNIFORM_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uniform_number">Number</Label>
              <Input
                id="uniform_number"
                name="uniform_number"
                type="number"
                min={0}
                defaultValue={data.uniform_number ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uniform_name">Name on uniform</Label>
              <Input
                id="uniform_name"
                name="uniform_name"
                defaultValue={data.uniform_name ?? ''}
              />
            </div>
          </div>

          <SaveRow state={state} pending={pending} />
        </form>
      </CardContent>
    </Card>
  )
}

function FeesTab({ data }: { data: StudentDetailData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStudent, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fees</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={data.id} />
          <input type="hidden" name="section" value="fees" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="monthly_fee">Monthly fee (₹)</Label>
              <Input
                id="monthly_fee"
                name="monthly_fee"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                defaultValue={paiseToRupees(data.monthly_fee)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit_amount">Advance / deposit (₹)</Label>
              <Input
                id="deposit_amount"
                name="deposit_amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                defaultValue={paiseToRupees(data.deposit_amount)}
                placeholder="0.00"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            These are the student&apos;s default fee amounts, used when generating monthly
            invoices. Manage payments from the{' '}
            <Link href="/dashboard/fees" className="underline">
              Fees
            </Link>{' '}
            dashboard.
          </p>

          <SaveRow state={state} pending={pending} />
        </form>

        <div className="mt-6 border-t pt-4">
          <p className="mb-2 text-sm font-medium">Invoice history</p>
          {data.feeInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {data.feeInvoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="font-medium">{inv.monthLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    Due ₹{paiseToRupees(inv.amountDue) || '0'} · Paid ₹
                    {paiseToRupees(inv.amountPaid) || '0'} · Balance ₹
                    {paiseToRupees(inv.balance) || '0'}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      inv.status === 'paid'
                        ? 'bg-green-50 text-green-700'
                        : inv.status === 'partial'
                          ? 'bg-blue-50 text-blue-700'
                          : inv.status === 'waived'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-amber-50 text-amber-700'
                    )}
                  >
                    {inv.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function LoginTab({ data }: { data: StudentDetailData }) {
  const hasLogin = !!data.user_id
  // The action switches by login state; both share LoginActionState.
  const [state, action, pending] = useActionState<LoginActionState, FormData>(
    hasLogin ? resetStudentPassword : enableStudentLogin,
    {}
  )
  const code = data.student_code
  const loginEmail = code ? studentLoginEmail(code) : null
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!code ? (
          <p className="text-sm text-muted-foreground">
            This student has no code yet. Reload the page and try again.
          </p>
        ) : (
          <>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Student code</span>
                <span className="font-mono text-sm font-semibold tracking-wider">
                  {code}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Status</span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    hasLogin ? 'text-green-600' : 'text-muted-foreground'
                  )}
                >
                  {hasLogin ? 'Login enabled' : 'No login yet'}
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              The student signs in with their{' '}
              <span className="font-medium text-foreground">student code</span> (
              <span className="font-mono">{code}</span>) and the password below —
              no email needed, so siblings sharing a parent email never clash.
              {loginEmail && (
                <span className="mt-1 block text-xs">
                  Internal sign-in identity:{' '}
                  <span className="font-mono">{loginEmail}</span>
                </span>
              )}
            </p>

            <form action={action} className="space-y-4">
              <input type="hidden" name="id" value={data.id} />
              <div className="space-y-1.5">
                <Label htmlFor="login_password">
                  {hasLogin ? 'New password' : 'Set password'}
                </Label>
                <div className="relative">
                  <Input
                    id="login_password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, with a letter and a number"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    state.error ? 'text-destructive' : 'text-green-600'
                  )}
                >
                  {state.error
                    ? state.error
                    : state.success
                      ? hasLogin
                        ? 'Password updated.'
                        : 'Login enabled.'
                      : ''}
                </span>
                <Button type="submit" disabled={pending} className="ml-auto">
                  {pending
                    ? 'Saving…'
                    : hasLogin
                      ? 'Reset password'
                      : 'Enable login'}
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function BatchesTab({ data }: { data: StudentDetailData }) {
  if (data.batches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Not enrolled in any batches yet. Enrol this student from a batch&apos;s
          Students tab.
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batches</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {data.batches.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                href={`/dashboard/batches/${b.id}`}
                className="min-w-0 flex-1 hover:underline"
              >
                <p className="truncate text-sm font-medium">{b.name}</p>
                <p className="truncate text-xs text-muted-foreground">{b.program}</p>
              </Link>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  b.status === 'waitlisted'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-green-50 text-green-700'
                )}
              >
                {b.status === 'waitlisted' ? 'Waitlisted' : 'Active'}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function StudentDetail({ data }: { data: StudentDetailData }) {
  const [tab, setTab] = useState<TabId>('profile')
  const isActive = data.status === 'active'

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to students
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {data.full_name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{data.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              Parent: {data.parent_name} · {data.parent_mobile}
            </p>
          </div>
        </div>

        <form action={isActive ? deactivateStudent : reactivateStudent}>
          <input type="hidden" name="id" value={data.id} />
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
      {tab === 'parent' && <ParentTab data={data} />}
      {tab === 'login' && <LoginTab data={data} />}
      {tab === 'uniform' && <UniformTab data={data} />}
      {tab === 'fees' && <FeesTab data={data} />}
      {tab === 'batches' && <BatchesTab data={data} />}
      {tab === 'schedule' && (
        <EventAgenda
          events={data.calendarEvents}
          title="Next 2 weeks"
          empty="No sessions in the next two weeks."
        />
      )}
    </div>
  )
}
