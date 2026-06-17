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

  const { data } = await supabase
    .from('institutions')
    .select('id, name, onboarding_complete, timezone, working_hours, category, address, contact_email, contact_mobile')
    .eq('id', institutionId)
    .single()

  if (!data) redirect('/login')

  // working_hours is `Json` in the generated types; the wizard view model
  // narrows it to an object at this boundary.
  const institution = data as unknown as WizardInstitution & { onboarding_complete: boolean }

  // Already onboarded — send them to the dashboard
  if (institution.onboarding_complete) redirect('/dashboard')

  return <OnboardingWizard institution={institution} />
}
