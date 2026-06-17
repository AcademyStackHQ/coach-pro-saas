'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import type { TablesUpdate } from '@/lib/supabase/types'
import { planGuard, PlanLimitError } from '@/lib/planGuard'
import { rupeesToPaise } from '@/lib/utils'

export type ActionState = {
  success?: boolean
  error?: string
  duplicate?: boolean
  existingId?: string
  studentId?: string
}

async function getInstitutionId(): Promise<string | null> {
  const cs = await cookies()
  return cs.get('active_institution_id')?.value ?? null
}

// Loose E.164-ish mobile check: optional +, 8–15 digits.
const mobileRe = /^\+?\d{8,15}$/

function str(formData: FormData, key: string): string {
  return ((formData.get(key) as string) ?? '').trim()
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key)
  return v === '' ? null : v
}

// ---------------------------------------------------------------------------
// Create a student — a direct `students` insert (records, not logins). Never
// touches the allowlist/signup flow, so a shared guardian_email can't collide.
// Soft duplicate detection on (institution_id, lower(full_name), dob) prompts
// the admin unless they confirm. planGuard counts the `students` table.
// ---------------------------------------------------------------------------
export async function createStudent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const fullName = str(formData, 'full_name')
  const dob = str(formData, 'dob')
  const guardianName = str(formData, 'guardian_name')
  const guardianMobile = str(formData, 'guardian_mobile')

  const required = z.object({
    full_name: z.string().min(1, 'Name is required.'),
    dob: z.string().min(1, 'Date of birth is required.'),
    guardian_name: z.string().min(1, 'Guardian name is required.'),
    guardian_mobile: z.string().regex(mobileRe, 'Enter a valid mobile number.'),
  })
  const parsed = required.safeParse({
    full_name: fullName,
    dob,
    guardian_name: guardianName,
    guardian_mobile: guardianMobile,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
  }

  const guardianEmail = strOrNull(formData, 'guardian_email')
  if (guardianEmail && !z.string().email().safeParse(guardianEmail).success) {
    return { error: 'Enter a valid guardian email.' }
  }

  const supabase = await createClient()
  const confirmed = str(formData, 'confirm') === '1'

  // Soft duplicate detection — prompt unless the admin already confirmed.
  if (!confirmed) {
    const { data: dupe } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', institutionId)
      .ilike('full_name', fullName)
      .eq('dob', dob)
      .limit(1)
      .maybeSingle()

    if (dupe) return { duplicate: true, existingId: dupe.id }
  }

  try {
    await planGuard(supabase, institutionId, 'student')
  } catch (e) {
    if (e instanceof PlanLimitError) return { error: e.message }
    return { error: 'Could not verify plan limits. Please try again.' }
  }

  const sports = (formData.getAll('sports') as string[])
    .map((s) => s.trim())
    .filter(Boolean)

  const { data: inserted, error } = await supabase
    .from('students')
    .insert({
      institution_id: institutionId,
      full_name: fullName,
      calling_name: strOrNull(formData, 'calling_name'),
      dob,
      gender: strOrNull(formData, 'gender'),
      guardian_name: guardianName,
      guardian_mobile: guardianMobile,
      guardian_email: guardianEmail,
      student_code: strOrNull(formData, 'student_code'),
      enrolment_date: strOrNull(formData, 'enrolment_date') ?? undefined,
      sports,
      // Optional fees captured at enrolment — stored in paise.
      monthly_fee: rupeesToPaise(formData.get('monthly_fee')),
      deposit_amount: rupeesToPaise(formData.get('deposit_amount')),
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505')
      return { error: 'A student with that code already exists.' }
    return { error: 'Failed to create student. Please try again.' }
  }

  revalidatePath('/dashboard/students')
  return { success: true, studentId: inserted.id }
}

// ---------------------------------------------------------------------------
// Update a student — admin only, by id within the active institution.
// ---------------------------------------------------------------------------
export async function updateStudent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const id = str(formData, 'id')
  if (!id) return { error: 'Missing student.' }

  const section = str(formData, 'section') // 'profile' | 'guardian' | 'jersey'

  // Only patch the fields belonging to the submitted section, so each tab's
  // form doesn't clobber the others.
  const patch: TablesUpdate<'students'> = {}

  if (section === 'profile') {
    const fullName = str(formData, 'full_name')
    if (!fullName) return { error: 'Name is required.' }
    patch.full_name = fullName
    patch.calling_name = strOrNull(formData, 'calling_name')
    // dob is NOT NULL — only overwrite when a value is supplied.
    const dobVal = str(formData, 'dob')
    if (dobVal) patch.dob = dobVal
    patch.gender = strOrNull(formData, 'gender')
    patch.student_code = strOrNull(formData, 'student_code')
    patch.enrolment_date = strOrNull(formData, 'enrolment_date')
    patch.sports = (formData.getAll('sports') as string[])
      .map((s) => s.trim())
      .filter(Boolean)
  } else if (section === 'guardian') {
    const guardianName = str(formData, 'guardian_name')
    const guardianMobile = str(formData, 'guardian_mobile')
    if (!guardianName) return { error: 'Guardian name is required.' }
    if (!mobileRe.test(guardianMobile))
      return { error: 'Enter a valid mobile number.' }
    const guardianEmail = strOrNull(formData, 'guardian_email')
    if (guardianEmail && !z.string().email().safeParse(guardianEmail).success)
      return { error: 'Enter a valid guardian email.' }
    patch.guardian_name = guardianName
    patch.guardian_mobile = guardianMobile
    patch.guardian_email = guardianEmail
    patch.sms_opt_in = str(formData, 'sms_opt_in') === 'on'
  } else if (section === 'jersey') {
    patch.jersey_size = strOrNull(formData, 'jersey_size')
    const num = str(formData, 'jersey_number')
    patch.jersey_number = num === '' ? null : Number(num)
    patch.jersey_name = strOrNull(formData, 'jersey_name')
  } else if (section === 'fees') {
    patch.monthly_fee = rupeesToPaise(formData.get('monthly_fee'))
    patch.deposit_amount = rupeesToPaise(formData.get('deposit_amount'))
  } else {
    return { error: 'Unknown form section.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('students')
    .update(patch)
    .eq('id', id)
    .eq('institution_id', institutionId)

  if (error) {
    if (error.code === '23505')
      return { error: 'A student with that code already exists.' }
    return { error: 'Failed to save changes.' }
  }

  revalidatePath(`/dashboard/students/${id}`)
  revalidatePath('/dashboard/students')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Soft delete / restore — toggles students.status (rows are never removed).
// ---------------------------------------------------------------------------
async function setStudentStatus(id: string, status: 'active' | 'inactive') {
  const institutionId = await getInstitutionId()
  if (!institutionId) return
  const supabase = await createClient()
  await supabase
    .from('students')
    .update({ status })
    .eq('id', id)
    .eq('institution_id', institutionId)
  revalidatePath('/dashboard/students')
  revalidatePath(`/dashboard/students/${id}`)
}

export async function deactivateStudent(formData: FormData): Promise<void> {
  const id = (formData.get('id') as string)?.trim()
  if (id) await setStudentStatus(id, 'inactive')
}

export async function reactivateStudent(formData: FormData): Promise<void> {
  const id = (formData.get('id') as string)?.trim()
  if (id) await setStudentStatus(id, 'active')
}
