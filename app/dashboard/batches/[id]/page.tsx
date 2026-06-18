import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { parseSchedule } from '@/lib/constants'
import { paiseToRupees } from '@/lib/utils'
import { BatchDetail, type BatchDetailData } from './BatchDetail'
import type { CoachOption } from '@/components/dashboard/BatchFormFields'

export const metadata = { title: 'Batch — CoachPro' }

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getActiveSession()
  if (session.role === 'student') redirect('/dashboard')
  const isAdmin = session.role === 'admin'

  const { id } = await params
  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('batches')
    .select('*')
    .eq('id', id)
    .eq('institution_id', session.institutionId)
    .maybeSingle()
  if (!batch) notFound()

  // Resolve the caller's coach id to decide whether they may edit this batch.
  let myCoachId: string | null = null
  if (!isAdmin) {
    const { data: me } = await supabase
      .from('coaches')
      .select('id')
      .eq('institution_id', session.institutionId)
      .eq('user_id', session.userId)
      .maybeSingle()
    myCoachId = me?.id ?? null
  }
  const canManage = isAdmin || (!!myCoachId && batch.coach_id === myCoachId)
  if (!canManage) redirect('/dashboard/batches')

  const [{ data: enrolments }, { data: coaches }, { data: allStudents }, { data: institution }] =
    await Promise.all([
      supabase
        .from('batch_students')
        .select('id, student_id, status, enrolled_at, students(full_name, student_code)')
        .eq('batch_id', id)
        .neq('status', 'dropped')
        .order('enrolled_at', { ascending: true }),
      supabase
        .from('coaches')
        .select('id, profiles(full_name, email)')
        .eq('institution_id', session.institutionId),
      supabase
        .from('students')
        .select('id, full_name, student_code')
        .eq('institution_id', session.institutionId)
        .eq('status', 'active')
        .order('full_name', { ascending: true }),
      supabase
        .from('institutions')
        .select('programs')
        .eq('id', session.institutionId)
        .single(),
    ])

  const coachById = new Map(
    (coaches ?? []).map((c) => [
      c.id,
      c.profiles?.full_name ?? c.profiles?.email ?? 'Coach',
    ])
  )

  // `.neq('status','dropped')` leaves only active/waitlisted rows.
  const enrolled = (enrolments ?? []).map((e) => ({
    enrolmentId: e.id,
    studentId: e.student_id,
    name: e.students?.full_name ?? 'Unknown',
    studentCode: e.students?.student_code ?? null,
    status: e.status as 'active' | 'waitlisted',
  }))

  // Students not currently enrolled (active or waitlisted) — the enrol picker.
  const enrolledIds = new Set(enrolled.map((e) => e.studentId))
  const enrolOptions = (allStudents ?? [])
    .filter((s) => !enrolledIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.full_name, studentCode: s.student_code }))

  const data: BatchDetailData = {
    id: batch.id,
    name: batch.name,
    program: batch.program,
    coachId: batch.coach_id,
    coachName: batch.coach_id ? coachById.get(batch.coach_id) ?? null : null,
    slots: parseSchedule(batch.schedule),
    venue: batch.venue,
    capacity: batch.capacity,
    monthlyFee: batch.monthly_fee,
    monthlyFeeRupees: paiseToRupees(batch.monthly_fee),
    status: batch.status === 'inactive' ? 'inactive' : 'active',
    effectiveFrom: batch.effective_from,
    enrolled,
    enrolOptions,
  }

  const coachOptions: CoachOption[] = (coaches ?? []).map((c) => ({
    id: c.id,
    name: c.profiles?.full_name ?? c.profiles?.email ?? 'Coach',
  }))

  return (
    <BatchDetail
      data={data}
      coachOptions={coachOptions}
      institutionPrograms={institution?.programs ?? []}
      isAdmin={isAdmin}
    />
  )
}
