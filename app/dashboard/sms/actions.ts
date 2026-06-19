'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { sendMessage, channelsFor, type ContactChannel } from '@/lib/messaging'
import { resolveTemplate } from '@/lib/messaging/tokens'

export type ActionState = {
  success?: boolean
  error?: string
  /** Result summary, e.g. "12 sent, 1 skipped, 0 failed". */
  info?: string
}

// ---------------------------------------------------------------------------
// Send fee reminders to the parents of the selected invoices. Students with no
// mobile, or whose contact_channel is 'none' (opted out), are skipped; every
// actual send is logged. Credits decrement by the number sent (never blocks).
// Admin only.
// ---------------------------------------------------------------------------
export async function sendFeeReminders(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getActiveSession()
  if (session.role !== 'admin') return { error: 'Not authorised.' }

  const ledgerIds = ((formData.get('ledger_ids') as string) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (ledgerIds.length === 0) return { error: 'Select at least one invoice.' }

  const templateName = ((formData.get('template_name') as string) ?? 'fee_reminder').trim()

  const supabase = await createClient()

  // Template body + academy name.
  const [{ data: template }, { data: institution }] = await Promise.all([
    supabase
      .from('sms_templates')
      .select('body')
      .eq('institution_id', session.institutionId)
      .eq('name', templateName)
      .maybeSingle(),
    supabase
      .from('institutions')
      .select('name')
      .eq('id', session.institutionId)
      .single(),
  ])
  if (!template) return { error: `Template "${templateName}" not found.` }

  // Invoices + their student contact details (RLS scopes to this institution).
  const { data: ledgers } = await supabase
    .from('fee_ledger')
    .select(
      'id, month_year, amount_due, due_date, student_id, students(full_name, parent_name, parent_mobile, contact_channel)'
    )
    .eq('institution_id', session.institutionId)
    .in('id', ledgerIds)
  if (!ledgers || ledgers.length === 0) return { error: 'No matching invoices.' }

  // Best-effort {batch_name}: the student's first active batch (billing is
  // per-student flat, so a ledger has no batch of its own).
  const studentIds = ledgers.map((l) => l.student_id).filter(Boolean) as string[]
  const batchByStudent = new Map<string, string>()
  if (studentIds.length) {
    const { data: enrol } = await supabase
      .from('batch_students')
      .select('student_id, batches(name)')
      .eq('status', 'active')
      .in('student_id', studentIds)
    for (const e of enrol ?? []) {
      if (e.batches?.name && !batchByStudent.has(e.student_id)) {
        batchByStudent.set(e.student_id, e.batches.name)
      }
    }
  }

  let sent = 0
  let skipped = 0
  let failed = 0
  const logRows: Array<{
    institution_id: string
    ledger_id: string
    student_id: string
    mobile: string
    message: string
    channel: string
    template_name: string
    status: string
    gateway_ref: string | null
  }> = []

  for (const l of ledgers) {
    const s = l.students
    if (!s || !s.parent_mobile) {
      skipped++
      continue
    }

    const message = resolveTemplate(template.body, {
      parent_name: s.parent_name,
      student_name: s.full_name,
      batch_name: batchByStudent.get(l.student_id) ?? '',
      month: l.month_year,
      amount_due: l.amount_due,
      due_date: l.due_date,
      academy_name: institution?.name ?? null,
    })

    // Fan out across the student's preferred channel(s). 'both' = two messages;
    // 'none' = opted out, so nothing to send.
    const channels = channelsFor((s.contact_channel ?? 'sms') as ContactChannel)
    if (channels.length === 0) {
      skipped++
      continue
    }
    for (const channel of channels) {
      const result = await sendMessage(channel, s.parent_mobile, message)
      logRows.push({
        institution_id: session.institutionId,
        ledger_id: l.id,
        student_id: l.student_id,
        mobile: s.parent_mobile,
        message,
        channel,
        template_name: templateName,
        status: result.ok ? 'sent' : 'failed',
        gateway_ref: result.ok ? result.ref : null,
      })
      if (result.ok) sent++
      else failed++
    }
  }

  if (logRows.length) {
    await supabase.from('sms_logs').insert(logRows)
  }
  if (sent > 0) {
    await supabase.rpc('decrement_sms_credits', {
      p_institution_id: session.institutionId,
      p_count: sent,
    })
  }

  revalidatePath('/dashboard/fees')
  revalidatePath('/dashboard/settings')
  return {
    success: true,
    info: `${sent} sent, ${skipped} skipped, ${failed} failed`,
  }
}

// ---------------------------------------------------------------------------
// Edit a template body (upsert by name). Admin only.
// ---------------------------------------------------------------------------
export async function updateSmsTemplate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getActiveSession()
  if (session.role !== 'admin') return { error: 'Not authorised.' }

  const name = ((formData.get('name') as string) ?? '').trim()
  const body = ((formData.get('body') as string) ?? '').trim()
  if (!name) return { error: 'Missing template.' }
  if (!body) return { error: 'Message body cannot be empty.' }

  const supabase = await createClient()
  const { error } = await supabase.from('sms_templates').upsert(
    {
      institution_id: session.institutionId,
      name,
      body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'institution_id,name' }
  )
  if (error) return { error: 'Failed to save the template.' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
