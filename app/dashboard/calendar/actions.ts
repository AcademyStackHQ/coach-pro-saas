'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { rupeesToPaise } from '@/lib/utils'
import { parseSchedule } from '@/lib/constants'
import {
  findSessionClashes,
  generateBatchOccurrences,
  parseYmd,
  hhmm,
  type SessionRow,
  type BatchForOccurrence,
  type SessionStatus,
} from '@/lib/calendar'

export type ActionState = {
  success?: boolean
  error?: string
  /** Non-blocking venue clash — the client re-submits with override=1 to confirm. */
  warning?: string
}

type Supa = Awaited<ReturnType<typeof createClient>>

// `sessions` is created in migration 007 but types aren't regenerated until the
// migration is applied. Cast through this until `npx supabase gen types` is run,
// then drop the cast (the column shapes already match this file's usage).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessionsTable = (s: Supa) => (s as any).from('sessions')

// The owning coach's coaches.id for the active session, or null for admins.
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
// Parse the booking form (shared by create).
// ---------------------------------------------------------------------------
const formSchema = z.object({
  student_id: z.string().trim().min(1, 'Select a student.'),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date.'),
  start_time: z.string().trim().min(1, 'Start time is required.'),
  end_time: z.string().trim().min(1, 'End time is required.'),
})

function parseForm(formData: FormData) {
  const parsed = formSchema.safeParse({
    student_id: formData.get('student_id'),
    date: formData.get('date'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
  })
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' } as const

  const start = hhmm(parsed.data.start_time)
  const end = hhmm(parsed.data.end_time)
  if (end <= start) return { error: 'End time must be after start time.' } as const

  const venueRaw = ((formData.get('venue') as string) ?? '').trim()
  return {
    values: {
      student_id: parsed.data.student_id,
      date: parsed.data.date,
      start_time: start,
      end_time: end,
      venue: venueRaw || null,
      fee_override: rupeesToPaise(formData.get('fee_override')),
    },
  } as const
}

// ---------------------------------------------------------------------------
// Load everything needed to detect clashes for a single date, and run the
// coach + student conflict check. Also computes a soft venue clash.
// ---------------------------------------------------------------------------
async function detectClashes(
  supabase: Supa,
  opts: {
    institutionId: string
    coachId: string
    studentId: string
    date: string
    start: string
    end: string
    venue: string | null
    excludeSessionId?: string
  }
): Promise<{ coach: string[]; student: string[]; venue: string[] }> {
  const day = parseYmd(opts.date)!

  const [{ data: sessRows }, { data: batchRows }, { data: enrolments }] =
    await Promise.all([
      sessionsTable(supabase)
        .select(
          'id, coach_id, student_id, date, start_time, end_time, status, venue, students(full_name)'
        )
        .eq('institution_id', opts.institutionId)
        .eq('date', opts.date),
      supabase
        .from('batches')
        .select('id, name, coach_id, schedule, venue, effective_from, status')
        .eq('institution_id', opts.institutionId)
        .eq('status', 'active'),
      supabase
        .from('batch_students')
        .select('batch_id')
        .eq('student_id', opts.studentId)
        .eq('status', 'active'),
    ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingSessions: SessionRow[] = (sessRows ?? []).map((s: any) => ({
    id: s.id,
    date: s.date,
    start: s.start_time,
    end: s.end_time,
    coachId: s.coach_id,
    coachName: null,
    coachColor: null,
    studentId: s.student_id,
    studentName: s.students?.full_name ?? null,
    status: s.status,
    venue: s.venue,
  }))

  const batchesForOcc: BatchForOccurrence[] = (batchRows ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    coachId: b.coach_id,
    coachName: null,
    coachColor: null,
    slots: parseSchedule(b.schedule),
    effectiveFrom: b.effective_from,
    status: b.status === 'inactive' ? 'inactive' : 'active',
  }))
  const occurrences = generateBatchOccurrences(batchesForOcc, day, day)

  const studentBatchIds = new Set((enrolments ?? []).map((e) => e.batch_id))

  const { coach, student } = findSessionClashes({
    coachId: opts.coachId,
    studentId: opts.studentId,
    date: opts.date,
    start: opts.start,
    end: opts.end,
    excludeSessionId: opts.excludeSessionId,
    existingSessions,
    batchOccurrences: occurrences,
    studentBatchIds,
  })

  // Soft venue clash — same venue (case-insensitive), overlapping, on that day.
  const venue: string[] = []
  if (opts.venue) {
    const v = opts.venue.trim().toLowerCase()
    const overlaps = (s: string, e: string) =>
      !(opts.end <= s || opts.start >= e)
    for (const s of existingSessions) {
      if (s.id === opts.excludeSessionId) continue
      if (s.status === 'cancelled' || s.status === 'no_show') continue
      if (s.venue && s.venue.trim().toLowerCase() === v &&
          overlaps(hhmm(s.start), hhmm(s.end)))
        venue.push(s.studentName ? `${s.studentName} (1:1)` : '1:1 session')
    }
    for (const b of batchRows ?? []) {
      if (!b.venue || b.venue.trim().toLowerCase() !== v) continue
      const slot = parseSchedule(b.schedule).find((sl) => sl.day === day.getDay())
      if (slot && overlaps(hhmm(slot.start), hhmm(slot.end))) venue.push(b.name)
    }
  }

  return { coach, student, venue }
}

// ---------------------------------------------------------------------------
// Create a 1-to-1 session. Admins book for any coach; coaches book only for
// themselves (a submitted coach_id is ignored for coaches).
// ---------------------------------------------------------------------------
export async function createSession(
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

  let coachId: string | null
  if (session.role === 'coach') {
    coachId = await myCoachId(supabase, session.institutionId, session.userId)
    if (!coachId) return { error: 'No coach profile found for your account.' }
  } else {
    coachId = ((formData.get('coach_id') as string) ?? '').trim() || null
    if (!coachId) return { error: 'Select a coach.' }
  }

  const override = (formData.get('override') as string) === '1'
  const clashes = await detectClashes(supabase, {
    institutionId: session.institutionId,
    coachId,
    studentId: v.student_id,
    date: v.date,
    start: v.start_time,
    end: v.end_time,
    venue: v.venue,
  })
  if (clashes.coach.length)
    return { error: `This coach is already booked: ${clashes.coach.join(', ')}.` }
  if (clashes.student.length)
    return { error: `This student is already booked: ${clashes.student.join(', ')}.` }
  if (clashes.venue.length && !override)
    return {
      warning: `This venue is already booked at that time by: ${clashes.venue.join(', ')}. Submit again to book anyway.`,
    }

  const { error } = await sessionsTable(supabase).insert({
    institution_id: session.institutionId,
    coach_id: coachId,
    student_id: v.student_id,
    date: v.date,
    start_time: v.start_time,
    end_time: v.end_time,
    venue: v.venue,
    fee_override: v.fee_override,
    status: 'scheduled',
  })
  if (error) return { error: 'Failed to book the session.' }

  revalidatePath('/dashboard/calendar')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Edit a session's venue and coach notes (does not reschedule, so no conflict
// re-check is needed). Admins or the owning coach (RLS enforced).
// ---------------------------------------------------------------------------
export async function updateSession(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getActiveSession()
  if (session.role === 'student') return { error: 'Not authorised.' }
  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Missing session.' }

  const supabase = await createClient()
  const venueRaw = ((formData.get('venue') as string) ?? '').trim()
  const notesRaw = ((formData.get('notes') as string) ?? '').trim()

  const { error } = await sessionsTable(supabase)
    .update({ venue: venueRaw || null, notes: notesRaw || null })
    .eq('id', id)
  if (error) return { error: 'Failed to update the session.' }

  revalidatePath('/dashboard/calendar')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Status transitions. Matrix:
//   scheduled → completed | no_show   (coach or admin)
//   scheduled → cancelled             (admin only)
//   completed / no_show / cancelled   (terminal — no further transitions)
// RLS lets the owning coach update, so the admin-only cancel is enforced here.
// ---------------------------------------------------------------------------
const NEXT_STATUSES: SessionStatus[] = ['completed', 'no_show', 'cancelled']

export async function updateSessionStatus(formData: FormData): Promise<void> {
  const session = await getActiveSession()
  if (session.role === 'student') return
  const id = (formData.get('id') as string)?.trim()
  const next = (formData.get('status') as string)?.trim() as SessionStatus
  if (!id || !NEXT_STATUSES.includes(next)) return

  const supabase = await createClient()
  const { data: row } = await sessionsTable(supabase)
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!row || row.status !== 'scheduled') return // only scheduled sessions transition
  if (next === 'cancelled' && session.role !== 'admin') return // cancel = admin only

  await sessionsTable(supabase).update({ status: next }).eq('id', id)
  revalidatePath('/dashboard/calendar')
}
