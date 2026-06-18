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
import { CoachDetail, type CoachDetailData } from './CoachDetail'

export const metadata = { title: 'Coach — CoachPro' }

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('admin')
  const { id: userId } = await params

  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')!.value
  const supabase = await createClient()

  const [{ data: member }, { data: ext }, { data: institution }] = await Promise.all([
    supabase
      .from('institution_members')
      .select('user_id, status, profiles(full_name, email, mobile, avatar_url)')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .eq('role', 'coach')
      .maybeSingle(),

    supabase
      .from('coaches')
      .select('id, programs, bio, color, availability, joined_at')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('institutions')
      .select('programs')
      .eq('id', institutionId)
      .single(),
  ])

  if (!member) notFound()

  const profileName =
    member.profiles?.full_name ?? member.profiles?.email ?? 'Coach'

  // This coach's batches (+ active enrolment counts) for the Batches tab.
  let batches: CoachDetailData['batches'] = []
  let calendarEvents: CoachDetailData['calendarEvents'] = []
  if (ext?.id) {
    const { data: rows } = await supabase
      .from('batches')
      .select('id, name, schedule, capacity, status, effective_from')
      .eq('institution_id', institutionId)
      .eq('coach_id', ext.id)
      .order('created_at', { ascending: false })

    const ids = (rows ?? []).map((b) => b.id)
    const counts = new Map<string, number>()
    if (ids.length) {
      const { data: enrolments } = await supabase
        .from('batch_students')
        .select('batch_id')
        .eq('status', 'active')
        .in('batch_id', ids)
      for (const e of enrolments ?? [])
        counts.set(e.batch_id, (counts.get(e.batch_id) ?? 0) + 1)
    }

    batches = (rows ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      slots: parseSchedule(b.schedule),
      capacity: b.capacity,
      enrolled: counts.get(b.id) ?? 0,
      status: b.status === 'inactive' ? 'inactive' : 'active',
    }))

    // Next 2 weeks of batch occurrences + 1-to-1 sessions for the Calendar tab.
    const from = today()
    const to = addDays(from, 14)
    const batchesForOcc: BatchForOccurrence[] = (rows ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      coachId: ext.id,
      coachName: profileName,
      coachColor: ext.color ?? null,
      slots: parseSchedule(b.schedule),
      effectiveFrom: b.effective_from,
      status: b.status === 'inactive' ? 'inactive' : 'active',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessRows } = await (supabase as any)
      .from('sessions')
      .select('id, student_id, date, start_time, end_time, status, venue, notes, students(full_name)')
      .eq('institution_id', institutionId)
      .eq('coach_id', ext.id)
      .gte('date', ymd(from))
      .lte('date', ymd(to))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionRows: SessionRow[] = ((sessRows ?? []) as any[]).map((s) => ({
      id: s.id,
      date: s.date,
      start: s.start_time,
      end: s.end_time,
      coachId: ext.id,
      coachName: profileName,
      coachColor: ext.color ?? null,
      studentId: s.student_id,
      studentName: s.students?.full_name ?? null,
      status: s.status,
      venue: s.venue,
      notes: s.notes ?? null,
    }))

    calendarEvents = buildEvents(batchesForOcc, sessionRows, from, to)
  }

  const profile = member.profiles

  const data: CoachDetailData = {
    user_id: userId,
    status: member.status === 'inactive' ? 'inactive' : 'active',
    name: profile?.full_name ?? profile?.email ?? 'Unknown',
    email: profile?.email ?? '',
    mobile: profile?.mobile ?? null,
    avatar_url: profile?.avatar_url ?? null,
    programs: ext?.programs ?? [],
    bio: ext?.bio ?? '',
    color: ext?.color ?? null,
    availability: ext?.availability ?? {},
    joined_at: ext?.joined_at ?? null,
    institutionPrograms: institution?.programs ?? [],
    batches,
    calendarEvents,
  }

  return <CoachDetail data={data} />
}
