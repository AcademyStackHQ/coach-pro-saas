import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
import { SettingsTabs, type SettingsData } from './SettingsTabs'

export const metadata = { title: 'Settings — CoachPro' }

export default async function SettingsPage() {
  // Verifies the real role from the membership row, not the unsigned cookie.
  const { institutionId } = await requireRole('admin')

  const supabase = await createClient()

  const [{ data: institution }, { count: studentCount }, { count: coachCount }] =
    await Promise.all([
      supabase
        .from('institutions')
        .select('id, name, slug, code, timezone, working_hours, plan, sms_credits, category, address, contact_email, contact_mobile, fee_config')
        .eq('id', institutionId)
        .single(),

      // Students are academy-owned records (the `students` table), not members —
      // count them there so the usage figure matches planGuard.
      supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('status', 'active'),

      supabase
        .from('institution_members')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('role', 'coach')
        .eq('status', 'active'),
    ])

  if (!institution) redirect('/login')

  const data: SettingsData = {
    // working_hours / fee_config are `Json` in the generated types; the view
    // model narrows them to objects at this boundary.
    ...(institution as unknown as SettingsData),
    student_count: studentCount ?? 0,
    coach_count: coachCount ?? 0,
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your academy&apos;s configuration.</p>
      </div>
      <SettingsTabs data={data} />
    </div>
  )
}
