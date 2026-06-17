'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import type { Json } from '@/lib/supabase/types'
import { planGuard, PlanLimitError } from '@/lib/planGuard'
import { COACH_COLORS } from '@/lib/constants'

export type ActionState = { success?: boolean; error?: string }

async function getInstitutionId(): Promise<string | null> {
  const cs = await cookies()
  return cs.get('active_institution_id')?.value ?? null
}

async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub as string | undefined
}

// Admin gate for actions that edit a coach OTHER than the caller. RLS already
// blocks cross-user writes, but gate explicitly (like the students module) so
// the user gets a clear "Not authorised" and a future switch to the admin
// client can't silently drop the check.
async function isAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  institutionId: string
): Promise<boolean> {
  const { data } = await supabase.rpc('is_admin_of', {
    p_institution_id: institutionId,
  })
  return data === true
}

// ---------------------------------------------------------------------------
// Invite a coach — reuses the Module 1 allowlist flow (same as onboarding
// Step 2). Wrapped in planGuard so the Free tier blocks a 2nd active coach.
// ---------------------------------------------------------------------------
export async function inviteCoach(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }
  if (!z.string().email().safeParse(email).success)
    return { error: 'Invalid email address.' }

  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return { error: 'Unauthorized.' }

  try {
    await planGuard(supabase, institutionId, 'coach')
  } catch (e) {
    if (e instanceof PlanLimitError) return { error: e.message }
    return { error: 'Could not verify plan limits. Please try again.' }
  }

  const { error } = await supabase.rpc('link_user_to_institution', {
    p_institution_id: institutionId,
    p_email: email,
    p_role: 'coach',
    p_added_by: userId,
  })

  if (error) {
    if (error.message.includes('Not authorised'))
      return { error: 'You are not an admin of this institution.' }
    return { error: 'Failed to invite coach. Please try again.' }
  }

  revalidatePath('/dashboard/coaches')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Update coaching profile (sports, bio, colour) — admin only, by user_id.
// Upserts the coaches extension row; assigns a colour on first create.
// ---------------------------------------------------------------------------
export async function updateCoachProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const userId = (formData.get('user_id') as string)?.trim()
  if (!userId) return { error: 'Missing coach.' }

  const sports = (formData.getAll('sports') as string[])
    .map((s) => s.trim())
    .filter(Boolean)
  const bio = ((formData.get('bio') as string) ?? '').trim()
  let color = ((formData.get('color') as string) ?? '').trim()

  const supabase = await createClient()
  if (!(await isAdmin(supabase, institutionId)))
    return { error: 'Not authorised.' }

  // Assign a colour on first create if none chosen — next unused in palette.
  if (!color) {
    const { data: existing } = await supabase
      .from('coaches')
      .select('color')
      .eq('institution_id', institutionId)

    const used = new Set((existing ?? []).map((c) => c.color).filter(Boolean))
    color = COACH_COLORS.find((c) => !used.has(c)) ?? COACH_COLORS[0]
  }

  const { error } = await supabase
    .from('coaches')
    .upsert(
      { institution_id: institutionId, user_id: userId, sports, bio, color },
      { onConflict: 'institution_id,user_id' }
    )

  if (error) return { error: 'Failed to save coach profile.' }

  revalidatePath(`/dashboard/coaches/${userId}`)
  revalidatePath('/dashboard/coaches')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Save a coach's availability — admin editing a specific coach (user_id in form).
// ---------------------------------------------------------------------------
export async function saveCoachAvailability(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const userId = (formData.get('user_id') as string)?.trim()
  if (!userId) return { error: 'Missing coach.' }

  const availability = parseAvailability(formData.get('availability') as string)
  if (availability === null) return { error: 'Invalid availability format.' }

  const supabase = await createClient()
  if (!(await isAdmin(supabase, institutionId)))
    return { error: 'Not authorised.' }

  const { error } = await supabase
    .from('coaches')
    .upsert(
      { institution_id: institutionId, user_id: userId, availability },
      { onConflict: 'institution_id,user_id' }
    )

  if (error) return { error: 'Failed to save availability.' }

  revalidatePath(`/dashboard/coaches/${userId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Coach self-service — save own availability (user_id = auth.uid()).
// ---------------------------------------------------------------------------
export async function saveMyAvailability(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const availability = parseAvailability(formData.get('availability') as string)
  if (availability === null) return { error: 'Invalid availability format.' }

  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return { error: 'Unauthorized.' }

  const { error } = await supabase
    .from('coaches')
    .upsert(
      { institution_id: institutionId, user_id: userId, availability },
      { onConflict: 'institution_id,user_id' }
    )

  if (error) return { error: 'Failed to save availability.' }

  revalidatePath('/dashboard/availability')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Soft-delete / restore — toggles institution_members.status (single source
// of truth for active/inactive). Never deletes the coaches row.
// ---------------------------------------------------------------------------
async function setMemberStatus(userId: string, status: 'active' | 'inactive') {
  const institutionId = await getInstitutionId()
  if (!institutionId) return
  const supabase = await createClient()
  await supabase
    .from('institution_members')
    .update({ status })
    .eq('institution_id', institutionId)
    .eq('user_id', userId)
    .eq('role', 'coach')
  revalidatePath('/dashboard/coaches')
  revalidatePath(`/dashboard/coaches/${userId}`)
}

export async function deactivateCoach(formData: FormData): Promise<void> {
  const userId = (formData.get('user_id') as string)?.trim()
  if (userId) await setMemberStatus(userId, 'inactive')
}

export async function reactivateCoach(formData: FormData): Promise<void> {
  const userId = (formData.get('user_id') as string)?.trim()
  if (userId) await setMemberStatus(userId, 'active')
}

// ---------------------------------------------------------------------------
function parseAvailability(raw: string | null): Json | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Json) : null
  } catch {
    return null
  }
}
