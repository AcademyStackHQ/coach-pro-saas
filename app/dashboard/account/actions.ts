'use server'

import { getActiveSession } from '@/lib/activeSession'
import { createClient } from '@/lib/server'
import { studentLoginEmail, studentPasswordError } from '@/lib/utils'

export type PasswordActionState = {
  success?: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// The signed-in user changes their OWN password. No service role needed:
// `auth.updateUser` acts on the current session. We first re-verify the
// current password (a failed signInWithPassword leaves the session intact) so a
// borrowed/unlocked session can't silently change the password.
// ---------------------------------------------------------------------------
export async function changeMyPassword(
  _prev: PasswordActionState,
  formData: FormData
): Promise<PasswordActionState> {
  const session = await getActiveSession()

  const current = (formData.get('current_password') as string) ?? ''
  const next = (formData.get('new_password') as string) ?? ''
  const confirm = (formData.get('confirm_password') as string) ?? ''

  if (!current || !next || !confirm) {
    return { error: 'Please fill in all fields.' }
  }
  if (next !== confirm) {
    return { error: 'New passwords do not match.' }
  }

  const supabase = await createClient()

  // The student code (when this is a student login) tightens the password rule
  // — the new password may not contain the code. Null for admin/coach logins.
  const { data: student } = await supabase
    .from('students')
    .select('student_code')
    .eq('user_id', session.userId)
    .eq('institution_id', session.institutionId)
    .maybeSingle()
  const code = student?.student_code ?? null

  const pwError = studentPasswordError(next, code)
  if (pwError) return { error: pwError }

  // Resolve the sign-in identity: students authenticate via the synthetic email
  // built from their code; everyone else via the JWT's email claim.
  const { data: claims } = await supabase.auth.getClaims()
  const email =
    (claims?.claims?.email as string | undefined) ??
    (code ? studentLoginEmail(code) : undefined)
  if (!email) return { error: 'Could not verify your account. Please re-login.' }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: current,
  })
  if (reauthError) return { error: 'Your current password is incorrect.' }

  const { error: updateError } = await supabase.auth.updateUser({
    password: next,
  })
  if (updateError) return { error: 'Could not update your password. Please retry.' }

  return { success: true }
}
