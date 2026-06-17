import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
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
      .select('sports, bio, color, availability, joined_at')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('institutions')
      .select('sports')
      .eq('id', institutionId)
      .single(),
  ])

  if (!member) notFound()

  const profile = member.profiles

  const data: CoachDetailData = {
    user_id: userId,
    status: member.status === 'inactive' ? 'inactive' : 'active',
    name: profile?.full_name ?? profile?.email ?? 'Unknown',
    email: profile?.email ?? '',
    mobile: profile?.mobile ?? null,
    avatar_url: profile?.avatar_url ?? null,
    sports: ext?.sports ?? [],
    bio: ext?.bio ?? '',
    color: ext?.color ?? null,
    availability: ext?.availability ?? {},
    joined_at: ext?.joined_at ?? null,
    institutionSports: institution?.sports ?? [],
  }

  return <CoachDetail data={data} />
}
