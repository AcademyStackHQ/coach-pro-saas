'use server'

import { revalidatePath } from 'next/cache'
import { getActiveSession } from '@/lib/activeSession'
import { createClient } from '@/lib/server'
import { createAdminClient } from '@/lib/admin'

export type ProfileActionState = {
  success?: boolean
  error?: string
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = ((formData.get(key) as string) ?? '').trim()
  return v === '' ? null : v
}

// ---------------------------------------------------------------------------
// A student edits a WHITELISTED slice of their own record.
//
// `students` RLS only grants UPDATE to admins (003_students.sql), so a student
// can't write via the normal client. We use the service-role client, but gate
// it hard: resolve the verified session, confirm the role is `student`, and
// scope the update to the row the caller owns (`user_id = session.userId`). The
// patch lists ONLY the three self-editable columns — fees, parent contact, and
// identity fields stay admin-owned even though the admin client could write
// them.
// ---------------------------------------------------------------------------
export async function updateMyProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const session = await getActiveSession()
  if (session.role !== 'student') return { error: 'Not authorised.' }

  const supabase = await createClient()
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', session.userId)
    .eq('institution_id', session.institutionId)
    .maybeSingle()

  if (!student) return { error: 'Your student record was not found.' }

  let jerseyNumber: number | null = null
  const numRaw = ((formData.get('jersey_number') as string) ?? '').trim()
  if (numRaw !== '') {
    const n = Number(numRaw)
    if (!Number.isInteger(n) || n < 0) {
      return { error: 'Jersey number must be a whole number.' }
    }
    jerseyNumber = n
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('students')
    .update({
      calling_name: strOrNull(formData, 'calling_name'),
      jersey_name: strOrNull(formData, 'jersey_name'),
      jersey_number: jerseyNumber,
    })
    .eq('id', student.id)
    .eq('user_id', session.userId) // ownership double-guard

  if (error) return { error: 'Could not save your changes. Please retry.' }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard')
  return { success: true }
}
