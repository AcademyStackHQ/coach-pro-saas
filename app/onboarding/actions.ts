'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/server'

export type ActionState = { success?: boolean; error?: string }

async function getInstitutionId(): Promise<string | null> {
  const cs = await cookies()
  return cs.get('active_institution_id')?.value ?? null
}

// Step 1 — required
export async function saveAcademyProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const name = (formData.get('name') as string)?.trim()
  const category = (formData.get('category') as string) ?? ''
  const address = (formData.get('address') as string)?.trim() ?? ''
  const contact_email = (formData.get('contact_email') as string)?.trim() ?? ''
  const contact_mobile = (formData.get('contact_mobile') as string)?.trim() ?? ''
  const timezone = (formData.get('timezone') as string) ?? 'Asia/Kolkata'

  const parsed = z
    .object({
      name: z.string().min(2, 'Academy name must be at least 2 characters.'),
      category: z.string().min(1, 'Please select a category.'),
    })
    .safeParse({ name, category })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('institutions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ name, category, address, contact_email, contact_mobile, timezone } as any)
    .eq('id', institutionId)

  if (error) return { error: 'Failed to save profile. Please try again.' }
  return { success: true }
}

// Step 2 — optional: invite first coach
export async function addCoachInvite(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }
  if (!z.string().email().safeParse(email).success) return { error: 'Invalid email address.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Unauthorized.' }

  const { error } = await supabase.rpc('link_user_to_institution', {
    p_institution_id: institutionId,
    p_email: email,
    p_role: 'coach',
    p_added_by: userId,
  })

  if (error) {
    if (error.message.includes('Not authorised'))
      return { error: 'You are not an admin of this institution.' }
    return { error: 'Failed to add coach. Please try again.' }
  }
  return { success: true }
}

// Step 3 — optional: set working hours
export async function saveWorkingHours(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const raw = formData.get('working_hours') as string
  if (!raw) return { error: 'No hours data provided.' }

  let workingHours: unknown
  try {
    workingHours = JSON.parse(raw)
  } catch {
    return { error: 'Invalid hours format.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('institutions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ working_hours: workingHours as any })
    .eq('id', institutionId)

  if (error) return { error: 'Failed to save working hours. Please try again.' }
  return { success: true }
}

// Step 4 — optional: invite first student
export async function addStudentInvite(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }
  if (!z.string().email().safeParse(email).success) return { error: 'Invalid email address.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Unauthorized.' }

  const { error } = await supabase.rpc('link_user_to_institution', {
    p_institution_id: institutionId,
    p_email: email,
    p_role: 'student',
    p_added_by: userId,
  })

  if (error) {
    if (error.message.includes('Not authorised'))
      return { error: 'You are not an admin of this institution.' }
    return { error: 'Failed to invite student. Please try again.' }
  }
  return { success: true }
}

// Final: mark onboarding complete and go to dashboard
export async function completeOnboarding(): Promise<void> {
  const institutionId = await getInstitutionId()
  if (institutionId) {
    const supabase = await createClient()
    await supabase
      .from('institutions')
      .update({ onboarding_complete: true })
      .eq('id', institutionId)
  }
  revalidatePath('/dashboard')
  redirect('/dashboard')
}
