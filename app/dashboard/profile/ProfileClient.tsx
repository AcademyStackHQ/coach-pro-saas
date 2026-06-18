'use client'

import { useActionState } from 'react'
import { Building2, Mail, MapPin, Phone } from 'lucide-react'
import { updateMyProfile, type ProfileActionState } from './actions'
import { StudentIdCard } from '@/components/dashboard/StudentIdCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, paiseToRupees } from '@/lib/utils'
import { DAYS, GENDERS } from '@/lib/constants'
import type { MyStudentRecord, MyInstitution } from '@/lib/student'

function genderLabel(value: string | null): string {
  return GENDERS.find((g) => g.value === value)?.label ?? '—'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  )
}

export function ProfileClient({
  student,
  institution,
}: {
  student: MyStudentRecord
  institution: MyInstitution | null
}) {
  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    updateMyProfile,
    {}
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your academy keeps your details up to date. You can edit a few fields
          yourself below.
        </p>
      </div>

      <StudentIdCard
        fullName={student.full_name}
        callingName={student.calling_name}
        studentCode={student.student_code}
        photoUrl={student.photo_url}
        status={student.status}
        academyName={institution?.name ?? 'My Academy'}
        academyLogoUrl={institution?.logo_url ?? null}
      />

      {/* Editable slice */}
      <Card>
        <CardHeader>
          <CardTitle>Edit my details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="calling_name">Calling name</Label>
              <Input
                id="calling_name"
                name="calling_name"
                defaultValue={student.calling_name ?? ''}
                placeholder="What should we call you?"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jersey_name">Name on jersey</Label>
                <Input
                  id="jersey_name"
                  name="jersey_name"
                  defaultValue={student.jersey_name ?? ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jersey_number">Jersey number</Label>
                <Input
                  id="jersey_number"
                  name="jersey_number"
                  type="number"
                  min={0}
                  defaultValue={student.jersey_number ?? ''}
                />
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
                    ? 'Saved successfully.'
                    : ''}
              </span>
              <Button type="submit" disabled={pending} className="ml-auto">
                {pending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Read-only: personal */}
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <ReadOnly label="Full name" value={student.full_name} />
            <ReadOnly label="Student code" value={student.student_code ?? '—'} />
            <ReadOnly label="Date of birth" value={formatDate(student.dob)} />
            <ReadOnly label="Gender" value={genderLabel(student.gender)} />
            <ReadOnly
              label="Enrolled on"
              value={formatDate(student.enrolment_date)}
            />
            <ReadOnly
              label="Sports"
              value={student.sports.length ? student.sports.join(', ') : '—'}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Need a correction to these? Ask your academy to update them.
          </p>
        </CardContent>
      </Card>

      {/* Read-only: parent / fees */}
      <Card>
        <CardHeader>
          <CardTitle>Parent &amp; fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <ReadOnly label="Parent name" value={student.parent_name} />
            <ReadOnly label="Parent mobile" value={student.parent_mobile} />
            <ReadOnly label="Parent email" value={student.parent_email ?? '—'} />
            <ReadOnly
              label="Monthly fee"
              value={
                student.monthly_fee != null
                  ? `₹${paiseToRupees(student.monthly_fee)}`
                  : '—'
              }
            />
            <ReadOnly
              label="Advance / deposit"
              value={
                student.deposit_amount != null
                  ? `₹${paiseToRupees(student.deposit_amount)}`
                  : '—'
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Read-only: academy info */}
      {institution && (
        <Card>
          <CardHeader>
            <CardTitle>My Academy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{institution.name}</span>
            </div>
            {institution.address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{institution.address}</span>
              </div>
            )}
            {institution.contact_mobile && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={`tel:${institution.contact_mobile}`}
                  className="hover:underline"
                >
                  {institution.contact_mobile}
                </a>
              </div>
            )}
            {institution.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${institution.contact_email}`}
                  className="hover:underline"
                >
                  {institution.contact_email}
                </a>
              </div>
            )}

            {institution.working_hours && (
              <div className="pt-2">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Working hours
                </p>
                <div className="space-y-0.5">
                  {DAYS.map(({ key, label }) => {
                    const day = institution.working_hours?.[key]
                    return (
                      <div
                        key={key}
                        className="flex justify-between text-sm tabular-nums"
                      >
                        <span className="text-muted-foreground">{label}</span>
                        <span>
                          {day?.open ? `${day.start} – ${day.end}` : 'Closed'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
