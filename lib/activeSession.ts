import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'

export type Role = 'admin' | 'coach' | 'student'

export type ActiveSession = {
  userId: string
  institutionId: string
  /** The REAL role, read from the membership row — never the cookie. */
  role: Role
}

/**
 * Resolve the verified active session for the current request.
 *
 * `active_institution_id` / `active_role` are set at login but are plain
 * (unsigned) cookies, so a logged-in user can edit them in devtools. They are
 * therefore safe only as a *hint* for which institution is active — never as an
 * authorization claim. This helper re-derives the real role from the
 * `institution_members` row (under RLS) and redirects to /login when the cookie
 * institution isn't a current, active membership for the user (tampered or
 * stale cookie). Use the returned `role` for any gating — never `active_role`.
 */
export async function getActiveSession(): Promise<ActiveSession> {
  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')?.value
  if (!institutionId) redirect('/login')

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')

  const { data: membership } = await supabase
    .from('institution_members')
    .select('role')
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) redirect('/login')

  return { userId, institutionId, role: membership.role as Role }
}
