import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
import { SettingsTabs, type SettingsData } from './SettingsTabs'

export const metadata = { title: 'Settings — CoachPro' }

export default async function SettingsPage() {
  // Verifies the real role from the membership row, not the unsigned cookie.
  const { institutionId } = await requireRole('admin')

  const supabase = await createClient()

  const [
    { data: institution },
    { count: studentCount },
    { count: coachCount },
    { data: templates },
    { data: logs },
  ] = await Promise.all([
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

    supabase
      .from('sms_templates')
      .select('name, body')
      .eq('institution_id', institutionId)
      .order('name'),

    supabase
      .from('sms_logs')
      .select('id, mobile, message, status, channel, sent_at, students(full_name)')
      .eq('institution_id', institutionId)
      .order('sent_at', { ascending: false })
      .limit(100),
  ])

  if (!institution) redirect('/login')

  const data: SettingsData = {
    // working_hours / fee_config are `Json` in the generated types; the view
    // model narrows them to objects at this boundary.
    ...(institution as unknown as SettingsData),
    student_count: studentCount ?? 0,
    coach_count: coachCount ?? 0,
    smsTemplates: (templates ?? []).map((t) => ({ name: t.name, body: t.body })),
    smsLogs: (logs ?? []).map((l) => ({
      id: l.id,
      studentName: l.students?.full_name ?? null,
      mobile: l.mobile,
      message: l.message,
      status: l.status,
      channel: l.channel,
      sentAt: l.sent_at,
    })),
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
