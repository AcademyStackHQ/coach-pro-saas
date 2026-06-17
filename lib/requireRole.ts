import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Per-page role guard for the single /dashboard route group.
 *
 * Role lives in the httpOnly `active_role` cookie (set at login / institution
 * switch and already validated by proxy.ts). There is no role logic in
 * proxy.ts beyond auth + institution cookie, so admin-only and coach-only
 * pages call this at the top of the server component.
 *
 *   await requireRole('admin')  // redirects non-admins to /dashboard
 */
export async function requireRole(role: 'admin' | 'coach' | 'student') {
  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')?.value
  if (!institutionId) redirect('/login')
  if (cs.get('active_role')?.value !== role) redirect('/dashboard')
}
