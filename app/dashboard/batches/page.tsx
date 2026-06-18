import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { parseSchedule } from '@/lib/constants'
import { BatchesClient, type BatchRow, type CoachOption } from './BatchesClient'

export const metadata = { title: 'Batches — CoachPro' }

export default async function BatchesPage() {
  const session = await getActiveSession()
  if (session.role === 'student') redirect('/dashboard')
  const isAdmin = session.role === 'admin'

  const supabase = await createClient()

  // A coach only manages their own batches; resolve their coaches.id first.
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

  let batchQuery = supabase
    .from('batches')
    .select(
      'id, name, program, coach_id, schedule, venue, capacity, monthly_fee, status'
    )
    .eq('institution_id', session.institutionId)
  if (!isAdmin) batchQuery = batchQuery.eq('coach_id', myCoachId ?? '')

  const [{ data: batches }, { data: coaches }, { data: institution }] =
    await Promise.all([
      batchQuery.order('created_at', { ascending: false }),
      supabase
        .from('coaches')
        .select('id, color, profiles(full_name, email)')
        .eq('institution_id', session.institutionId),
      supabase
        .from('institutions')
        .select('programs')
        .eq('id', session.institutionId)
        .single(),
    ])

  const coachById = new Map(
    (coaches ?? []).map((c) => [
      c.id,
      {
        name: c.profiles?.full_name ?? c.profiles?.email ?? 'Coach',
        color: c.color ?? null,
      },
    ])
  )

  // Active enrolment counts for the loaded batches.
  const batchIds = (batches ?? []).map((b) => b.id)
  const counts = new Map<string, number>()
  if (batchIds.length) {
    const { data: enrolments } = await supabase
      .from('batch_students')
      .select('batch_id')
      .eq('status', 'active')
      .in('batch_id', batchIds)
    for (const e of enrolments ?? []) {
      counts.set(e.batch_id, (counts.get(e.batch_id) ?? 0) + 1)
    }
  }

  const rows: BatchRow[] = (batches ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    program: b.program,
    coachId: b.coach_id,
    coachName: b.coach_id ? coachById.get(b.coach_id)?.name ?? null : null,
    coachColor: b.coach_id ? coachById.get(b.coach_id)?.color ?? null : null,
    slots: parseSchedule(b.schedule),
    venue: b.venue,
    capacity: b.capacity,
    enrolled: counts.get(b.id) ?? 0,
    monthlyFee: b.monthly_fee,
    status: b.status === 'inactive' ? 'inactive' : 'active',
  }))

  const coachOptions: CoachOption[] = (coaches ?? []).map((c) => ({
    id: c.id,
    name: c.profiles?.full_name ?? c.profiles?.email ?? 'Coach',
  }))

  return (
    <BatchesClient
      batches={rows}
      coachOptions={coachOptions}
      institutionPrograms={institution?.programs ?? []}
      isAdmin={isAdmin}
    />
  )
}
