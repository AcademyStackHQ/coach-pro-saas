import { cookies } from 'next/headers'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
import { CoachesClient, type CoachRow } from './CoachesClient'

export const metadata = { title: 'Coaches — CoachPro' }

type CoachExt = { user_id: string; sports: string[] | null; color: string | null }

export default async function CoachesPage() {
  await requireRole('admin')

  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')!.value

  const supabase = await createClient()

  const [{ data: members }, { data: exts }, { data: pending }] = await Promise.all([
    supabase
      .from('institution_members')
      .select('user_id, status, profiles(full_name, email, avatar_url)')
      .eq('institution_id', institutionId)
      .eq('role', 'coach'),

    supabase
      .from('coaches')
      .select('user_id, sports, color')
      .eq('institution_id', institutionId),

    supabase
      .from('institution_allowed_emails')
      .select('email')
      .eq('institution_id', institutionId)
      .eq('role', 'coach')
      .eq('status', 'pending'),
  ])

  const extByUser = new Map<string, CoachExt>(
    (exts ?? []).map((e) => [e.user_id, e])
  )

  const active: CoachRow[] = (members ?? []).map((m) => {
    const ext = extByUser.get(m.user_id)
    return {
      kind: m.status === 'inactive' ? 'inactive' : 'active',
      user_id: m.user_id,
      name: m.profiles?.full_name ?? m.profiles?.email ?? 'Unknown',
      email: m.profiles?.email ?? '',
      avatar_url: m.profiles?.avatar_url ?? null,
      sports: ext?.sports ?? [],
      color: ext?.color ?? null,
    }
  })

  const pendingRows: CoachRow[] = (pending ?? []).map((p) => ({
    kind: 'pending',
    user_id: null,
    name: p.email,
    email: p.email,
    avatar_url: null,
    sports: [],
    color: null,
  }))

  return <CoachesClient coaches={[...active, ...pendingRows]} />
}
