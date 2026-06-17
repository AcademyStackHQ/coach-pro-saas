import { redirect } from 'next/navigation'
import { getActiveSession, type ActiveSession, type Role } from '@/lib/activeSession'

/**
 * Per-page role guard for the single /dashboard route group.
 *
 * The role is re-derived from the membership row (see getActiveSession), NOT
 * from the unsigned `active_role` cookie — so a student who edits the cookie to
 * "admin" still can't reach admin-only pages. Non-matching roles are bounced to
 * /dashboard; a missing/stale active institution is bounced to /login.
 *
 *   const session = await requireRole('admin')  // redirects non-admins
 */
export async function requireRole(role: Role): Promise<ActiveSession> {
  const session = await getActiveSession()
  if (session.role !== role) redirect('/dashboard')
  return session
}
