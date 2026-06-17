'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  updateStudent,
  deactivateStudent,
  reactivateStudent,
  type ActionState,
} from '../actions'
import { SportsField } from '@/components/dashboard/SportsField'
import { GENDERS, JERSEY_SIZES } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, paiseToRupees } from '@/lib/utils'

export type StudentDetailData = {
  id: string
  status: 'active' | 'inactive'
  full_name: string
  calling_name: string | null
  dob: string | null
  gender: string | null
  student_code: string | null
  enrolment_date: string | null
  sports: string[]
  guardian_name: string
  guardian_mobile: string
  guardian_email: string | null
  sms_opt_in: boolean
  jersey_size: string | null
  jersey_number: number | null
  jersey_name: string | null
  monthly_fee: number | null
  deposit_amount: number | null
  institutionSports: string[]
}

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'guardian', label: 'Guardian' },
  { id: 'jersey', label: 'Jersey' },
  { id: 'fees', label: 'Fees' },
  { id: 'batches', label: 'Batches' },
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
                name="student_code"
                defaultValue={data.student_code ?? ''}
              />
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
            <Label>Sports</Label>
            <SportsField initial={data.sports} suggestions={data.institutionSports} />
          </div>

          <SaveRow state={state} pending={pending} />
        </form>
      </CardContent>
    </Card>
  )
}

function GuardianTab({ data }: { data: StudentDetailData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStudent, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guardian</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={data.id} />
          <input type="hidden" name="section" value="guardian" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="guardian_name">Guardian name *</Label>
              <Input
                id="guardian_name"
                name="guardian_name"
                defaultValue={data.guardian_name}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guardian_mobile">Guardian mobile *</Label>
              <Input
                id="guardian_mobile"
                name="guardian_mobile"
                type="tel"
                defaultValue={data.guardian_mobile}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guardian_email">Guardian email</Label>
            <Input
              id="guardian_email"
              name="guardian_email"
              type="email"
              defaultValue={data.guardian_email ?? ''}
            />
            <p className="text-xs text-muted-foreground">
              A contact field only — siblings can share the same email.
            </p>
          </div>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              name="sms_opt_in"
              defaultChecked={data.sms_opt_in}
              className="size-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Guardian consents to SMS notifications</span>
          </label>

          <SaveRow state={state} pending={pending} />
        </form>
      </CardContent>
    </Card>
  )
}

function JerseyTab({ data }: { data: StudentDetailData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStudent, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jersey</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={data.id} />
          <input type="hidden" name="section" value="jersey" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="jersey_size">Size</Label>
              <select
                id="jersey_size"
                name="jersey_size"
                defaultValue={data.jersey_size ?? ''}
                className={nativeSelectClass()}
              >
                <option value="">—</option>
                {JERSEY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jersey_number">Number</Label>
              <Input
                id="jersey_number"
                name="jersey_number"
                type="number"
                min={0}
                defaultValue={data.jersey_number ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jersey_name">Name on jersey</Label>
              <Input
                id="jersey_name"
                name="jersey_name"
                defaultValue={data.jersey_name ?? ''}
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
            These are the student&apos;s default fee amounts. The full payment ledger
            (invoices, receipts, history) arrives in Module 7.
          </p>

          <SaveRow state={state} pending={pending} />
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
              Guardian: {data.guardian_name} · {data.guardian_mobile}
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
      {tab === 'guardian' && <GuardianTab data={data} />}
      {tab === 'jersey' && <JerseyTab data={data} />}
      {tab === 'fees' && <FeesTab data={data} />}
      {tab === 'batches' && <Placeholder module="Module 5" />}
    </div>
  )
}
