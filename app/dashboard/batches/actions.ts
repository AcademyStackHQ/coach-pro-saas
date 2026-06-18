'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { planGuard, PlanLimitError } from '@/lib/planGuard'
import { rupeesToPaise } from '@/lib/utils'
import { parseSchedule, dayLabel, type BatchSlot } from '@/lib/constants'

export type ActionState = {
  success?: boolean
  error?: string
  /** Non-blocking venue clash — the client re-submits with override=1 to confirm. */
  warning?: string
}

type Supa = Awaited<ReturnType<typeof createClient>>

// The owning coach's coaches.id for the active session, or null when the caller
// is an admin (or has no coach profile). Server actions force a coach's batches
// to reference this id — a submitted coach_id is never trusted for coaches.
async function myCoachId(supabase: Supa, institutionId: string, userId: string) {
  const { data } = await supabase
    .from('coaches')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

// ---------------------------------------------------------------------------
// Schedule conflict detection (server-side).
//   • Coach clash  → hard block (never overridable).
//   • Venue clash  → non-blocking warning (proceed with override=1).
// Two batches clash when they share a day AND their times overlap.
// ---------------------------------------------------------------------------
const timesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
) => !(endA <= startB || startA >= endB)

async function findClashes(
  supabase: Supa,
  opts: {
    institutionId: string
    coachId: string | null
    venue: string | null
    slots: BatchSlot[]
    excludeId?: string
  }
): Promise<{ coach: string[]; venue: string[] }> {
  // Per-day schedules can't be filtered with a single array operator, so load
  // the institution's active batches and compare slot-by-slot in JS (the set
  // is small). Two batches clash when any pair of slots shares a day and
  // their times overlap.
  const { data } = await supabase.from('batches')
    .select('id, name, coach_id, venue, schedule')
    .eq('institution_id', opts.institutionId)
    .eq('status', 'active')

  const coach: string[] = []
  const venue: string[] = []
  for (const b of data ?? []) {
    if (opts.excludeId && b.id === opts.excludeId) continue
    const other = parseSchedule(b.schedule)
    const clash = opts.slots.some((s) =>
      other.some(
        (o) => o.day === s.day && timesOverlap(s.start, s.end, o.start, o.end)
      )
    )
    if (!clash) continue
    if (opts.coachId && b.coach_id === opts.coachId) coach.push(b.name)
    if (
      opts.venue &&
      b.venue &&
      b.venue.trim().toLowerCase() === opts.venue.trim().toLowerCase()
    )
      venue.push(b.name)
  }
  return { coach, venue }
}

// ---------------------------------------------------------------------------
// Parse the shared batch form fields (create + update).
// ---------------------------------------------------------------------------
const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  program: z.string().trim().min(1, 'Program is required.'),
  capacity: z.coerce.number().int().positive('Capacity must be at least 1.'),
})

function parseForm(formData: FormData) {
  const parsed = formSchema.safeParse({
    name: formData.get('name'),
    program: formData.get('program'),
    capacity: formData.get('capacity'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' } as const
  }

  // The form submits the per-day schedule as a JSON array of { day, start, end }.
  let raw: unknown
  try {
    raw = JSON.parse((formData.get('schedule') as string) || '[]')
  } catch {
    return { error: 'Invalid schedule.' } as const
  }
  const schedule = parseSchedule(raw)
  if (schedule.length === 0)
    return { error: 'Add at least one training day with a time.' } as const
  for (const s of schedule) {
    if (s.end <= s.start)
      return {
        error: `End time must be after start time on ${dayLabel(s.day)}.`,
      } as const
  }

  const venueRaw = ((formData.get('venue') as string) ?? '').trim()
  const effective = ((formData.get('effective_from') as string) ?? '').trim()

  return {
    values: {
      name: parsed.data.name,
      program: parsed.data.program,
      capacity: parsed.data.capacity,
      schedule,
      venue: venueRaw || null,
      monthly_fee: rupeesToPaise(formData.get('monthly_fee')) ?? 0,
      effective_from: effective || new Date().toISOString().slice(0, 10),
    },
  } as const
}

// ---------------------------------------------------------------------------
// Create a batch. Coaches may only create batches assigned to themselves.
// ---------------------------------------------------------------------------
export async function createBatch(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getActiveSession()
  if (session.role !== 'admin' && session.role !== 'coach')
    return { error: 'Not authorised.' }

  const parsed = parseForm(formData)
  if ('error' in parsed) return { error: parsed.error }
  const v = parsed.values

  const supabase = await createClient()

  // Coaches are pinned to their own coach row; admins may pick any coach.
  let coachId: string | null
  if (session.role === 'coach') {
    coachId = await myCoachId(supabase, session.institutionId, session.userId)
    if (!coachId) return { error: 'No coach profile found for your account.' }
  } else {
    coachId = ((formData.get('coach_id') as string) ?? '').trim() || null
  }

  try {
    await planGuard(supabase, session.institutionId, 'batch')
  } catch (e) {
    if (e instanceof PlanLimitError) return { error: e.message }
    return { error: 'Could not verify plan limits. Please try again.' }
  }

  const override = (formData.get('override') as string) === '1'
  const clashes = await findClashes(supabase, {
    institutionId: session.institutionId,
    coachId,
    venue: v.venue,
    slots: v.schedule,
  })
  if (clashes.coach.length)
    return { error: `Schedule clash for this coach with: ${clashes.coach.join(', ')}.` }
  if (clashes.venue.length && !override)
    return {
      warning: `This venue is already booked at that time by: ${clashes.venue.join(', ')}. Submit again to book anyway.`,
    }

  const { error } = await supabase.from('batches').insert({
    institution_id: session.institutionId,
    coach_id: coachId,
    ...v,
  })

  if (error) return { error: 'Failed to create batch.' }

  revalidatePath('/dashboard/batches')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Update a batch. RLS allows admins or the assigned coach. Re-runs conflict
// detection (schedule may have changed).
// ---------------------------------------------------------------------------
export async function updateBatch(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getActiveSession()
  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Missing batch.' }

  const parsed = parseForm(formData)
  if ('error' in parsed) return { error: parsed.error }
  const v = parsed.values

  const supabase = await createClient()

  // Determine the batch's coach for the conflict check. Admins may reassign;
  // coaches keep the existing assignment (their own).
  const { data: existing } = await supabase.from('batches')
    .select('coach_id')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return { error: 'Batch not found.' }

  const coachId =
    session.role === 'admin'
      ? ((formData.get('coach_id') as string) ?? '').trim() || null
      : existing.coach_id

  const override = (formData.get('override') as string) === '1'
  const clashes = await findClashes(supabase, {
    institutionId: session.institutionId,
    coachId,
    venue: v.venue,
    slots: v.schedule,
    excludeId: id,
  })
  if (clashes.coach.length)
    return { error: `Schedule clash for this coach with: ${clashes.coach.join(', ')}.` }
  if (clashes.venue.length && !override)
    return {
      warning: `This venue is already booked at that time by: ${clashes.venue.join(', ')}. Submit again to save anyway.`,
    }

  const { error } = await supabase.from('batches')
    .update({ coach_id: coachId, ...v })
    .eq('id', id)

  if (error) return { error: 'Failed to update batch.' }

  revalidatePath('/dashboard/batches')
  revalidatePath(`/dashboard/batches/${id}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Soft delete / restore (admins only — enforced by RLS DELETE/UPDATE policy).
// ---------------------------------------------------------------------------
async function setBatchStatusValue(id: string, status: 'active' | 'inactive') {
  const supabase = await createClient()
  await supabase.from('batches').update({ status }).eq('id', id)
  revalidatePath('/dashboard/batches')
  revalidatePath(`/dashboard/batches/${id}`)
}

export async function deactivateBatch(formData: FormData): Promise<void> {
  const id = (formData.get('id') as string)?.trim()
  if (id) await setBatchStatusValue(id, 'inactive')
}

export async function reactivateBatch(formData: FormData): Promise<void> {
  const id = (formData.get('id') as string)?.trim()
  if (id) await setBatchStatusValue(id, 'active')
}

// ---------------------------------------------------------------------------
// Enrol a student — active if a seat is free, else waitlisted.
// ---------------------------------------------------------------------------
export async function enrolStudent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getActiveSession()
  const batchId = (formData.get('batch_id') as string)?.trim()
  const studentId = (formData.get('student_id') as string)?.trim()
  if (!batchId || !studentId) return { error: 'Select a student to enrol.' }

  const supabase = await createClient()

  const { data: batch } = await supabase.from('batches')
    .select('capacity')
    .eq('id', batchId)
    .maybeSingle()
  if (!batch) return { error: 'Batch not found.' }

  // Already active/waitlisted? (the partial unique index would also reject it).
  const { data: dup } = await supabase.from('batch_students')
    .select('id')
    .eq('batch_id', batchId)
    .eq('student_id', studentId)
    .neq('status', 'dropped')
    .maybeSingle()
  if (dup) return { error: 'This student is already enrolled in this batch.' }

  const { count } = await supabase.from('batch_students')
    .select('*', { count: 'exact', head: true })
    .eq('batch_id', batchId)
    .eq('status', 'active')

  const status = (count ?? 0) < batch.capacity ? 'active' : 'waitlisted'

  const { error } = await supabase.from('batch_students').insert({
    institution_id: session.institutionId,
    batch_id: batchId,
    student_id: studentId,
    status,
  })
  if (error) return { error: 'Failed to enrol student.' }

  revalidatePath(`/dashboard/batches/${batchId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Remove a student (mark dropped). If an ACTIVE seat opened, promote the
// oldest waitlisted student into it.
// ---------------------------------------------------------------------------
export async function removeStudent(formData: FormData): Promise<void> {
  const enrolmentId = (formData.get('enrolment_id') as string)?.trim()
  const batchId = (formData.get('batch_id') as string)?.trim()
  if (!enrolmentId || !batchId) return

  const supabase = await createClient()

  const { data: row } = await supabase.from('batch_students')
    .select('status')
    .eq('id', enrolmentId)
    .maybeSingle()
  if (!row) return

  await supabase.from('batch_students')
    .update({ status: 'dropped' })
    .eq('id', enrolmentId)

  // A waitlisted student only moves up when an ACTIVE seat is freed.
  if (row.status === 'active') {
    const { data: next } = await supabase.from('batch_students')
      .select('id')
      .eq('batch_id', batchId)
      .eq('status', 'waitlisted')
      .order('enrolled_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (next) {
      await supabase.from('batch_students')
        .update({ status: 'active' })
        .eq('id', next.id)
      // TODO(M8): notify the promoted student / parent via SMS.
    }
  }

  revalidatePath(`/dashboard/batches/${batchId}`)
}
