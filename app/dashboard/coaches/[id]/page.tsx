import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
import { parseSchedule } from '@/lib/constants'
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

  // This coach's batches (+ active enrolment counts) for the Batches tab.
  let batches: CoachDetailData['batches'] = []
  if (ext?.id) {
    const { data: rows } = await supabase
      .from('batches')
      .select('id, name, schedule, capacity, status')
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
  }

  return <CoachDetail data={data} />
}
