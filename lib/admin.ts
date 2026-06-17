import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase/types'

/**
 * Service-role Supabase client — SERVER ONLY. Bypasses RLS and can call the
 * Auth admin API (createUser / updateUserById). NEVER import this from client
 * components or expose the key. Used to provision student-code logins: create
 * a Supabase auth user behind a synthetic email derived from the student code.
 *
 * No session is persisted — this client is request-scoped and stateless.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for the admin client.'
    )
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
