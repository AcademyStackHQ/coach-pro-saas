import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
import { parseSchedule } from '@/lib/constants'
import {
  buildEvents,
  today,
  addDays,
  ymd,
  type BatchForOccurrence,
  type SessionRow,
} from '@/lib/calendar'
import { StudentDetail, type StudentDetailData } from './StudentDetail'

export const metadata = { title: 'Student — CoachPro' }

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('admin')

  const { id } = await params
  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')!.value

  const supabase = await createClient()

  const [{ data: student }, { data: institution }, { data: enrolments }] =
    await Promise.all([
      supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .eq('institution_id', institutionId)
        .maybeSingle(),

      supabase
        .from('institutions')
        .select('programs')
        .eq('id', institutionId)
        .single(),

      supabase
        .from('batch_students')
        .select(
          'id, status, batches(id, name, program, schedule, coach_id, effective_from, status)'
        )
        .eq('student_id', id)
        .neq('status', 'dropped')
        .order('enrolled_at', { ascending: true }),
    ])

  if (!student) notFound()

  const batches: StudentDetailData['batches'] = (enrolments ?? [])
    .filter((e) => e.batches)
    .map((e) => ({
      id: e.batches!.id,
      name: e.batches!.name,
      program: e.batches!.program,
      status: e.status as 'active' | 'waitlisted',
    }))

  // ----- Schedule tab: next 2 weeks of occurrences (active enrolments) + 1:1s -----
  const from = today()
  const to = addDays(from, 14)

  // Coach colour/name lookup for the events the student will see.
  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, color, profiles(full_name, email)')
    .eq('institution_id', institutionId)
  const coachById = new Map(
    (coaches ?? []).map((c) => [
      c.id,
      { name: c.profiles?.full_name ?? c.profiles?.email ?? 'Coach', color: c.color ?? null },
    ])
  )

  const batchesForOcc: BatchForOccurrence[] = (enrolments ?? [])
    .filter((e) => e.status === 'active' && e.batches)
    .map((e) => {
      const b = e.batches!
      const ci = b.coach_id ? coachById.get(b.coach_id) : undefined
      return {
        id: b.id,
        name: b.name,
        coachId: b.coach_id,
        coachName: ci?.name ?? null,
        coachColor: ci?.color ?? null,
        slots: parseSchedule(b.schedule),
        effectiveFrom: b.effective_from,
        status: b.status === 'inactive' ? 'inactive' : 'active',
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessRows } = await (supabase as any)
    .from('sessions')
    .select('id, coach_id, date, start_time, end_time, status, venue, notes')
    .eq('institution_id', institutionId)
    .eq('student_id', id)
    .gte('date', ymd(from))
    .lte('date', ymd(to))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRows: SessionRow[] = ((sessRows ?? []) as any[]).map((s) => {
    const ci = s.coach_id ? coachById.get(s.coach_id) : undefined
    return {
      id: s.id,
      date: s.date,
      start: s.start_time,
      end: s.end_time,
      coachId: s.coach_id,
      coachName: ci?.name ?? null,
      coachColor: ci?.color ?? null,
      studentId: id,
      studentName: student.full_name,
      status: s.status,
      venue: s.venue,
      notes: s.notes ?? null,
    }
  })

  const calendarEvents = buildEvents(batchesForOcc, sessionRows, from, to)

  const data: StudentDetailData = {
    id: student.id,
    status: student.status === 'inactive' ? 'inactive' : 'active',
    full_name: student.full_name,
    calling_name: student.calling_name,
    dob: student.dob,
    gender: student.gender,
    student_code: student.student_code,
    user_id: student.user_id,
    enrolment_date: student.enrolment_date,
    programs: student.programs ?? [],
    parent_name: student.parent_name,
    parent_mobile: student.parent_mobile,
    parent_email: student.parent_email,
    sms_opt_in: student.sms_opt_in ?? true,
    uniform_size: student.uniform_size,
    uniform_number: student.uniform_number,
    uniform_name: student.uniform_name,
    monthly_fee: student.monthly_fee,
    deposit_amount: student.deposit_amount,
    institutionPrograms: institution?.programs ?? [],
    batches,
    calendarEvents,
  }

  return <StudentDetail data={data} />
}
