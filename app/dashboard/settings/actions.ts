'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import type { Json } from '@/lib/supabase/types'

export type ActionState = { success?: boolean; error?: string }

async function getInstitutionId(): Promise<string | null> {
  const cs = await cookies()
  return cs.get('active_institution_id')?.value ?? null
}

export async function updateAcademyProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const name = (formData.get('name') as string)?.trim()
  const category = (formData.get('category') as string) ?? ''
  const address = (formData.get('address') as string)?.trim() ?? ''
  const contact_email = (formData.get('contact_email') as string)?.trim() ?? ''
  const contact_mobile = (formData.get('contact_mobile') as string)?.trim() ?? ''
  const timezone = (formData.get('timezone') as string) ?? 'Asia/Kolkata'

  const parsed = z
    .object({ name: z.string().min(2, 'Name must be at least 2 characters.') })
    .safeParse({ name })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('institutions')
    .update({ name, category, address, contact_email, contact_mobile, timezone })
    .eq('id', institutionId)

  if (error) return { error: 'Failed to update profile.' }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateWorkingHours(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const raw = formData.get('working_hours') as string
  if (!raw) return { error: 'No hours data provided.' }

  let workingHours: Json
  try {
    workingHours = JSON.parse(raw) as Json
  } catch {
    return { error: 'Invalid hours format.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('institutions')
    .update({ working_hours: workingHours })
    .eq('id', institutionId)

  if (error) return { error: 'Failed to update working hours.' }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateFeeConfig(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No active institution.' }

  const currency = (formData.get('currency') as string) || 'INR'
  const late_fee_enabled = formData.get('late_fee_enabled') === 'on'
  // Store late fee in paise (1 INR = 100 paise)
  const late_fee_amount = Math.round(
    parseFloat((formData.get('late_fee_amount') as string) || '0') * 100
  )
  const grace_period_days = Math.max(
    0,
    parseInt((formData.get('grace_period_days') as string) || '5', 10)
  )
  const receipt_prefix = (formData.get('receipt_prefix') as string)?.trim() || 'RCP'

  const feeConfig: Json = {
    currency,
    late_fee_enabled,
    late_fee_amount,
    grace_period_days,
    receipt_prefix,
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('institutions')
    .update({ fee_config: feeConfig })
    .eq('id', institutionId)

  if (error) return { error: 'Failed to update fee settings.' }
  revalidatePath('/dashboard/settings')
  return { success: true }
}
