'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { createAdminClient } from '@/lib/admin'
import { notify } from '@/lib/notify'
import type { TablesUpdate } from '@/lib/supabase/types'
import { planGuard, PlanLimitError } from '@/lib/planGuard'
import {
  rupeesToPaise,
  studentLoginEmail,
  studentPasswordError,
} from '@/lib/utils'

export type ActionState = {
  success?: boolean
  error?: string
  duplicate?: boolean
  existingId?: string
  studentId?: string
  studentCode?: string
}

// State for the enable-login / reset-password forms on the student detail page.
export type LoginActionState = {
  success?: boolean
  error?: string
  loginEmail?: string
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
// touches the allowlist/signup flow, so a shared parent_email can't collide.
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
  const parentName = str(formData, 'parent_name')
  const parentMobile = str(formData, 'parent_mobile')

  const required = z.object({
    full_name: z.string().min(1, 'Name is required.'),
    dob: z.string().min(1, 'Date of birth is required.'),
    parent_name: z.string().min(1, 'Parent name is required.'),
    parent_mobile: z.string().regex(mobileRe, 'Enter a valid mobile number.'),
  })
  const parsed = required.safeParse({
    full_name: fullName,
    dob,
    parent_name: parentName,
    parent_mobile: parentMobile,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
  }

  const parentEmail = strOrNull(formData, 'parent_email')
  if (parentEmail && !z.string().email().safeParse(parentEmail).success) {
    return { error: 'Enter a valid parent email.' }
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

  // Auto-generate the student code (atomic per-institution counter, e.g.
  // MVA0007). Done only after the duplicate check + planGuard pass so a prompt
  // or a blocked insert never burns a number. This code is also the student's
  // login handle, so it is never set/edited by hand.
  // TODO(types): drop the cast once migration 008 is applied + types regenerated.
  const { data: studentCode, error: codeError } = await (supabase.rpc as any)(
    'next_student_code',
    { p_institution_id: institutionId }
  )
  if (codeError || !studentCode) {
    return { error: 'Could not generate a student code. Please try again.' }
  }

  const { data: inserted, error } = await supabase
    .from('students')
    .insert({
      institution_id: institutionId,
      full_name: fullName,
      calling_name: strOrNull(formData, 'calling_name'),
      dob,
      gender: strOrNull(formData, 'gender'),
      parent_name: parentName,
      parent_mobile: parentMobile,
      parent_email: parentEmail,
      student_code: studentCode as string,
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
  return {
    success: true,
    studentId: inserted.id,
    studentCode: studentCode as string,
  }
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

  const section = str(formData, 'section') // 'profile' | 'parent' | 'jersey'

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
    // student_code is auto-generated and the login handle — never hand-edited.
    patch.enrolment_date = strOrNull(formData, 'enrolment_date')
    patch.sports = (formData.getAll('sports') as string[])
      .map((s) => s.trim())
      .filter(Boolean)
  } else if (section === 'parent') {
    const parentName = str(formData, 'parent_name')
    const parentMobile = str(formData, 'parent_mobile')
    if (!parentName) return { error: 'Parent name is required.' }
    if (!mobileRe.test(parentMobile))
      return { error: 'Enter a valid mobile number.' }
    const parentEmail = strOrNull(formData, 'parent_email')
    if (parentEmail && !z.string().email().safeParse(parentEmail).success)
      return { error: 'Enter a valid parent email.' }
    patch.parent_name = parentName
    patch.parent_mobile = parentMobile
    patch.parent_email = parentEmail
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

// ---------------------------------------------------------------------------
// Student-code login (admin only)
//
// Keeps Supabase Auth as the only identity provider: the student's globally
// unique code maps to a synthetic email (`<code>@<domain>`); we create a real
// auth user for it and grant a `role='student'` membership so the existing
// membership-based login + dashboard work unchanged. `students.user_id` links
// the record to its login. Under-14 kids share a parent email freely — that
// email is never used here, so siblings never collide.
// ---------------------------------------------------------------------------
async function requireActiveAdmin(): Promise<
  | { ok: true; institutionId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }
> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { ok: false, error: 'No active institution.' }

  const supabase = await createClient()
  // The admin client below bypasses RLS, so gate the privileged ops explicitly.
  const { data: isAdmin } = await supabase.rpc('is_admin_of', {
    p_institution_id: institutionId,
  })
  if (!isAdmin) return { ok: false, error: 'Not authorised.' }

  return { ok: true, institutionId, supabase }
}

export async function enableStudentLogin(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const id = str(formData, 'id')
  if (!id) return { error: 'Missing student.' }

  const password = (formData.get('password') as string) ?? ''

  const guard = await requireActiveAdmin()
  if (!guard.ok) return { error: guard.error }
  const { institutionId, supabase } = guard

  const { data: student } = await supabase
    .from('students')
    .select(
      'id, full_name, student_code, user_id, parent_name, parent_mobile, parent_email, sms_opt_in'
    )
    .eq('id', id)
    .eq('institution_id', institutionId)
    .maybeSingle()

  if (!student) return { error: 'Student not found.' }
  if (student.user_id) return { error: 'This student already has a login.' }
  if (!student.student_code)
    return { error: 'This student has no code yet. Reload and try again.' }

  const pwError = studentPasswordError(password, student.student_code)
  if (pwError) return { error: pwError }

  const email = studentLoginEmail(student.student_code)
  const admin = createAdminClient()

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no inbox to confirm — it's a synthetic address
      user_metadata: {
        full_name: student.full_name,
        signup_type: 'student_code',
      },
    })

  if (createError || !created.user) {
    return { error: 'Could not create the login. It may already exist.' }
  }

  const userId = created.user.id

  // The auth user, the membership, and the students.user_id link are three
  // separate writes — not one transaction. If a later write fails we delete the
  // auth user we just created, so the whole op is atomic from the admin's view
  // AND retryable: a leftover auth user would make the next createUser collide
  // on the (deterministic) synthetic email and dead-end the student forever.
  // upsert keeps the membership write idempotent across retries.
  let failed = false

  const { error: memberError } = await admin
    .from('institution_members')
    .upsert(
      {
        institution_id: institutionId,
        user_id: userId,
        role: 'student',
        status: 'active',
      },
      { onConflict: 'institution_id,user_id' }
    )
  if (memberError) failed = true

  if (!failed) {
    const { error: linkError } = await admin
      .from('students')
      .update({ user_id: userId })
      .eq('id', id)
    if (linkError) failed = true
  }

  if (failed) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(userId)
    if (cleanupError) {
      // The synthetic email is deterministic, so a leftover auth user will
      // collide on the next createUser and dead-end this student forever. The
      // rollback delete itself failed — log loudly for manual cleanup.
      console.error(
        `enableStudentLogin: orphaned auth user ${userId} for student ${id} — manual cleanup needed`,
        cleanupError
      )
    }
    return { error: 'Could not enable login. Please retry.' }
  }

  revalidatePath(`/dashboard/students/${id}`)

  // Best-effort heads-up to the parent that the login now exists. No provider
  // is wired yet, so this is a no-op today (see lib/notify.ts); it never blocks
  // or fails the action.
  await notify(
    {
      type: 'student.login_enabled',
      studentName: student.full_name,
      studentCode: student.student_code,
    },
    {
      name: student.parent_name,
      mobile: student.parent_mobile,
      email: student.parent_email,
      smsOptIn: student.sms_opt_in ?? true,
    }
  )

  return { success: true, loginEmail: email }
}

export async function resetStudentPassword(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const id = str(formData, 'id')
  if (!id) return { error: 'Missing student.' }

  const password = (formData.get('password') as string) ?? ''

  const guard = await requireActiveAdmin()
  if (!guard.ok) return { error: guard.error }
  const { institutionId, supabase } = guard

  const { data: student } = await supabase
    .from('students')
    .select(
      'user_id, student_code, full_name, parent_name, parent_mobile, parent_email, sms_opt_in'
    )
    .eq('id', id)
    .eq('institution_id', institutionId)
    .maybeSingle()

  if (!student?.user_id)
    return { error: 'This student does not have a login yet.' }

  const pwError = studentPasswordError(password, student.student_code)
  if (pwError) return { error: pwError }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(student.user_id, {
    password,
  })

  if (error) return { error: 'Could not reset the password. Please retry.' }

  revalidatePath(`/dashboard/students/${id}`)

  // Best-effort heads-up to the parent that the password changed. No-op until a
  // provider is wired (see lib/notify.ts); never blocks or fails the action.
  await notify(
    {
      type: 'student.password_reset',
      studentName: student.full_name,
      studentCode: student.student_code ?? '',
    },
    {
      name: student.parent_name,
      mobile: student.parent_mobile,
      email: student.parent_email,
      smsOptIn: student.sms_opt_in ?? true,
    }
  )

  return { success: true }
}
