import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { OnboardingWizard, type WizardInstitution } from './Wizard'

export default async function OnboardingPage() {
  // Verifies the real role from the membership row, not the unsigned cookie.
  const { institutionId, role } = await getActiveSession()

  // Only admins complete the academy onboarding
  if (role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()

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
