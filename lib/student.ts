import { redirect } from 'next/navigation'
import { getActiveSession, type ActiveSession } from '@/lib/activeSession'
import { createClient } from '@/lib/server'
import type { WorkingHoursMap } from '@/lib/constants'

/**
 * The student's OWN record + their academy, for the student-facing pages.
 *
 * A student reads their own `students` row through the RLS self-read clause
 * (`user_id = auth.uid()`, see 003_students.sql) — no admin privilege needed.
 * `student` is null in the edge case where a login exists but the
 * `students.user_id` link is missing (record deleted / not yet linked).
 */
export type MyStudentRecord = {
  id: string
  full_name: string
  calling_name: string | null
  dob: string | null
  gender: string | null
  student_code: string | null
  status: 'active' | 'inactive'
  enrolment_date: string | null
  programs: string[]
  photo_url: string | null
  parent_name: string
  parent_mobile: string
  parent_email: string | null
  uniform_size: string | null
  uniform_number: number | null
  uniform_name: string | null
  monthly_fee: number | null
  deposit_amount: number | null
}

export type MyInstitution = {
  id: string
  name: string
  logo_url: string | null
  address: string | null
  contact_email: string | null
  contact_mobile: string | null
  working_hours: WorkingHoursMap | null
}

export type MyStudentContext = {
  session: ActiveSession
  student: MyStudentRecord | null
  institution: MyInstitution | null
}

/**
 * Resolve the verified session, require the student role, and load the
 * student's own record + academy. Redirects non-students to /dashboard so the
 * student-only pages can't be reached by a coach/admin via URL.
 */
export async function getMyStudentContext(): Promise<MyStudentContext> {
  const session = await getActiveSession()
  if (session.role !== 'student') redirect('/dashboard')

  const supabase = await createClient()

  const [{ data: student }, { data: institution }] = await Promise.all([
    supabase
      .from('students')
      .select(
        'id, full_name, calling_name, dob, gender, student_code, status, enrolment_date, programs, photo_url, parent_name, parent_mobile, parent_email, uniform_size, uniform_number, uniform_name, monthly_fee, deposit_amount'
      )
      .eq('user_id', session.userId)
      .eq('institution_id', session.institutionId)
      .maybeSingle(),
    supabase
      .from('institutions')
      .select('id, name, logo_url, address, contact_email, contact_mobile, working_hours')
      .eq('id', session.institutionId)
      .single(),
  ])

  return {
    session,
    student: (student as MyStudentRecord | null) ?? null,
    institution: institution
      ? {
          ...institution,
          working_hours:
            (institution.working_hours as WorkingHoursMap | null) ?? null,
        }
      : null,
  }
}
