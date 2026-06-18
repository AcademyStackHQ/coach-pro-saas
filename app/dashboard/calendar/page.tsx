import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { parseSchedule } from '@/lib/constants'
import {
  buildEvents,
  parseYmd,
  today,
  ymd,
  weekRange,
  monthGridRange,
  type BatchForOccurrence,
  type SessionRow,
  type CalendarEvent,
} from '@/lib/calendar'
import { CalendarClient } from './CalendarClient'

export const metadata = { title: 'Calendar — CoachPro' }

type CoachInfo = { name: string; color: string | null }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; anchor?: string }>
}) {
  const session = await getActiveSession()
  const isAdmin = session.role === 'admin'
  const isCoach = session.role === 'coach'
  const isStudent = session.role === 'student'

  const sp = await searchParams
  const view: 'week' | 'month' =
    sp.view === 'week' ? 'week' : sp.view === 'month' ? 'month' : isAdmin ? 'month' : 'week'
  const anchorDate = parseYmd(sp.anchor) ?? today()
  const { from, to } = view === 'week' ? weekRange(anchorDate) : monthGridRange(anchorDate)
  const fromYmd = ymd(from)
  const toYmd = ymd(to)

  const supabase = await createClient()

  // Resolve the caller's own coach/student id for scoping.
  let myCoachId: string | null = null
  let myStudentId: string | null = null
  if (isCoach) {
    const { data } = await supabase
      .from('coaches')
      .select('id')
      .eq('institution_id', session.institutionId)
      .eq('user_id', session.userId)
      .maybeSingle()
    myCoachId = data?.id ?? null
  }
  if (isStudent) {
    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', session.institutionId)
      .eq('user_id', session.userId)
      .maybeSingle()
    myStudentId = data?.id ?? null
  }

  // Students only see batches they're actively enrolled in.
  let enrolledBatchIds: string[] | null = null
  if (isStudent) {
    const { data } = await supabase
      .from('batch_students')
      .select('batch_id')
      .eq('student_id', myStudentId ?? '')
      .eq('status', 'active')
    enrolledBatchIds = (data ?? []).map((e) => e.batch_id)
  }

  // ----- Batches (role-scoped) -----
  let batchQuery = supabase
    .from('batches')
    .select('id, name, coach_id, schedule, effective_from, status')
    .eq('institution_id', session.institutionId)
    .eq('status', 'active')
  if (isCoach) batchQuery = batchQuery.eq('coach_id', myCoachId ?? '')
  if (isStudent)
    batchQuery = enrolledBatchIds && enrolledBatchIds.length
      ? batchQuery.in('id', enrolledBatchIds)
      : batchQuery.eq('id', '00000000-0000-0000-0000-000000000000') // none

  // ----- Sessions (role-scoped, within range) -----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessionQuery = (supabase as any)
    .from('sessions')
    .select(
      'id, coach_id, student_id, date, start_time, end_time, status, venue, notes, students(full_name, student_code)'
    )
    .eq('institution_id', session.institutionId)
    .gte('date', fromYmd)
    .lte('date', toYmd)
  if (isCoach) sessionQuery = sessionQuery.eq('coach_id', myCoachId ?? '')
  if (isStudent) sessionQuery = sessionQuery.eq('student_id', myStudentId ?? '')

  const [{ data: batches }, { data: sessions }, { data: coaches }, { data: students }] =
    await Promise.all([
      batchQuery,
      sessionQuery,
      supabase
        .from('coaches')
        .select('id, color, profiles(full_name, email)')
        .eq('institution_id', session.institutionId),
      // Booking dropdown — active students (admin + coach only).
      isStudent
        ? Promise.resolve({ data: [] as { id: string; full_name: string; student_code: string | null }[] })
        : supabase
            .from('students')
            .select('id, full_name, student_code')
            .eq('institution_id', session.institutionId)
            .eq('status', 'active')
            .order('full_name', { ascending: true }),
    ])

  const coachById = new Map<string, CoachInfo>(
    (coaches ?? []).map((c) => [
      c.id,
      { name: c.profiles?.full_name ?? c.profiles?.email ?? 'Coach', color: c.color ?? null },
    ])
  )

  const batchesForOcc: BatchForOccurrence[] = (batches ?? []).map((b) => {
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
  const sessionRows: SessionRow[] = ((sessions ?? []) as any[]).map((s) => {
    const ci = s.coach_id ? coachById.get(s.coach_id) : undefined
    return {
      id: s.id,
      date: s.date,
      start: s.start_time,
      end: s.end_time,
      coachId: s.coach_id,
      coachName: ci?.name ?? null,
      coachColor: ci?.color ?? null,
      studentId: s.student_id,
      studentName: s.students?.full_name ?? null,
      status: s.status,
      venue: s.venue,
      notes: s.notes ?? null,
    }
  })

  const events: CalendarEvent[] = buildEvents(batchesForOcc, sessionRows, from, to)

  // Legend = the coaches actually present in the view.
  const presentCoachIds = new Set(events.map((e) => e.coachId).filter(Boolean) as string[])
  const coachLegend = Array.from(presentCoachIds).map((id) => ({
    id,
    name: coachById.get(id)?.name ?? 'Coach',
    color: coachById.get(id)?.color ?? null,
  }))

  const coachOptions = (coaches ?? []).map((c) => ({
    id: c.id,
    name: c.profiles?.full_name ?? c.profiles?.email ?? 'Coach',
  }))
  const studentOptions = (students ?? []).map((s) => ({
    id: s.id,
    name: s.full_name,
    code: s.student_code,
  }))

  return (
    <CalendarClient
      events={events}
      view={view}
      anchor={ymd(anchorDate)}
      role={session.role}
      isAdmin={isAdmin}
      canBook={isAdmin || isCoach}
      coachLegend={coachLegend}
      coachOptions={coachOptions}
      studentOptions={studentOptions}
    />
  )
}
