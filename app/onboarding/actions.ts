'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import type { Json } from '@/lib/supabase/types'
import { planGuard, PlanLimitError } from '@/lib/planGuard'

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
    .update({ name, category, address, contact_email, contact_mobile, timezone })
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

  let workingHours: Json
  try {
    workingHours = JSON.parse(raw) as Json
  } catch {
    return { error: 'Invalid hours format.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('institutions')
    .update({ working_hours: workingHours })
    .eq('id', institutionId)

  if (error) return { error: 'Failed to save working hours. Please try again.' }
  return { success: true }
}

// Step 4 — optional: enrol the first student.
// Students are academy-owned RECORDS, not logins (under-14 kids have no email,
// siblings share a parent email) — so this is a direct `students` insert, NOT
// the allowlist/signup flow. See Module 4 / the student identity model.
export async function enrolFirstStudent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const fullName = (formData.get('full_name') as string)?.trim() ?? ''
  const dob = (formData.get('dob') as string)?.trim() ?? ''
  const parentName = (formData.get('parent_name') as string)?.trim() ?? ''
  const parentMobile = (formData.get('parent_mobile') as string)?.trim() ?? ''

  const parsed = z
    .object({
      full_name: z.string().min(1, 'Student name is required.'),
      dob: z.string().min(1, 'Date of birth is required.'),
      parent_name: z.string().min(1, 'Parent name is required.'),
      parent_mobile: z.string().regex(/^\+?\d{8,15}$/, 'Enter a valid mobile number.'),
    })
    .safeParse({
      full_name: fullName,
      dob,
      parent_name: parentName,
      parent_mobile: parentMobile,
    })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  try {
    await planGuard(supabase, institutionId, 'student')
  } catch (e) {
    if (e instanceof PlanLimitError) return { error: e.message }
    return { error: 'Could not verify plan limits. Please try again.' }
  }

  // Generate the academy student code (atomic per-institution counter, e.g.
  // MVA0001) — same as the main Add Student flow. Without it the record can
  // never be issued a login later (enableStudentLogin requires student_code).
  // TODO(types): drop the cast once migration 008 is applied + types regenerated.
  const { data: studentCode, error: codeError } = await (supabase.rpc as any)(
    'next_student_code',
    { p_institution_id: institutionId }
  )
  if (codeError || !studentCode) {
    return { error: 'Could not generate a student code. Please try again.' }
  }

  const { error } = await supabase.from('students').insert({
    institution_id: institutionId,
    full_name: fullName,
    dob,
    parent_name: parentName,
    parent_mobile: parentMobile,
    student_code: studentCode as string,
  })

  if (error) return { error: 'Failed to enrol student. Please try again.' }
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
