import { cookies } from 'next/headers'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
import { StudentsClient, type StudentRow } from './StudentsClient'

export const metadata = { title: 'Students — CoachPro' }

export default async function StudentsPage() {
  await requireRole('admin')

  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')!.value

  const supabase = await createClient()

  const [{ data: students }, { data: institution }] = await Promise.all([
    supabase
      .from('students')
      .select(
        'id, full_name, calling_name, sports, status, parent_mobile, photo_url'
      )
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false }),

    supabase
      .from('institutions')
      .select('sports')
      .eq('id', institutionId)
      .single(),
  ])

  const rows: StudentRow[] = (students ?? []).map((s) => ({
    id: s.id,
    name: s.full_name,
    callingName: s.calling_name,
    sports: s.sports ?? [],
    status: s.status === 'inactive' ? 'inactive' : 'active',
    parentMobile: s.parent_mobile,
    photoUrl: s.photo_url,
  }))

  return (
    <StudentsClient students={rows} institutionSports={institution?.sports ?? []} />
  )
}
