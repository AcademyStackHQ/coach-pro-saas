import Link from 'next/link'
import { Calendar, CreditCard, CalendarDays, Trophy, Shirt } from 'lucide-react'
import { getMyStudentContext } from '@/lib/student'
import { StudentIdCard } from '@/components/dashboard/StudentIdCard'
import { paiseToRupees } from '@/lib/utils'

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

function uniformLine(
  size: string | null,
  number: number | null,
  name: string | null
): string {
  const parts = [
    size ? `Size ${size}` : null,
    number != null ? `#${number}` : null,
    name ? `“${name}”` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Not set'
}

export async function StudentOverview() {
  const { student, institution } = await getMyStudentContext()

  if (!student) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Welcome 👋</h1>
        <p className="text-sm text-muted-foreground">
          Your student profile isn&apos;t linked yet. Please ask your academy to
          set it up.
        </p>
      </div>
    )
  }

  const firstName = (student.calling_name || student.full_name).split(' ')[0]

  const infoCards = [
    {
      label: 'Enrolled on',
      value: formatDate(student.enrolment_date),
      icon: CalendarDays,
    },
    {
      label: 'Programs',
      value: student.programs.length ? student.programs.join(', ') : 'None yet',
      icon: Trophy,
    },
    {
      label: 'Uniform',
      value: uniformLine(
        student.uniform_size,
        student.uniform_number,
        student.uniform_name
      ),
      icon: Shirt,
    },
    {
      label: 'Monthly fee',
      value: student.monthly_fee != null ? `₹${paiseToRupees(student.monthly_fee)}` : '—',
      icon: CreditCard,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {institution?.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <StudentIdCard
          fullName={student.full_name}
          callingName={student.calling_name}
          studentCode={student.student_code}
          photoUrl={student.photo_url}
          status={student.status}
          academyName={institution?.name ?? 'My Academy'}
          academyLogoUrl={institution?.logo_url ?? null}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {infoCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" />
                <p className="text-sm">{label}</p>
              </div>
              <p className="mt-1.5 text-base font-semibold text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links to the modules that arrive later */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-3 rounded-xl border bg-card p-5 shadow-xs transition-colors hover:bg-muted/50"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="size-5" />
          </div>
          <div>
            <p className="font-medium">My Schedule</p>
            <p className="text-sm text-muted-foreground">
              Your sessions and calendar — coming soon
            </p>
          </div>
        </Link>
        <Link
          href="/dashboard/fees"
          className="flex items-center gap-3 rounded-xl border bg-card p-5 shadow-xs transition-colors hover:bg-muted/50"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="size-5" />
          </div>
          <div>
            <p className="font-medium">My Fees</p>
            <p className="text-sm text-muted-foreground">
              Invoices and payments — coming soon
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
