import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { OnboardingWizard, type WizardInstitution } from './Wizard'

export default async function OnboardingPage() {
  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')?.value
  const role = cs.get('active_role')?.value

  if (!institutionId) redirect('/login')

  // Only admins complete the academy onboarding
  if (role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) redirect('/login')

  // Select all profile fields including the new columns from migration 003.
  // Cast to WizardInstitution because the generated types predate that migration.
  const { data } = await supabase
    .from('institutions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select('id, name, onboarding_complete, timezone, working_hours, category, address, contact_email, contact_mobile' as any)
    .eq('id', institutionId)
    .single()

  if (!data) redirect('/login')

  const institution = data as unknown as WizardInstitution & { onboarding_complete: boolean }

  // Already onboarded — send them to the dashboard
  if (institution.onboarding_complete) redirect('/dashboard')

  return <OnboardingWizard institution={institution} />
}
