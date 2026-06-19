'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { rupeesToPaise } from '@/lib/utils'
import { today, parseYmd } from '@/lib/calendar'
import {
  generateLedger,
  ledgerStatus,
  parseMonth,
  firstOfMonth,
  PAYMENT_MODES,
  type PaymentMode,
} from '@/lib/fees'

export type ActionState = {
  success?: boolean
  error?: string
  /** Informational result, e.g. how many invoices were generated. */
  info?: string
}

function revalidateFees(studentId?: string) {
  revalidatePath('/dashboard/fees')
  if (studentId) revalidatePath(`/dashboard/students/${studentId}`)
}

// ---------------------------------------------------------------------------
// Generate (or top up) the monthly invoice ledger for a month. Idempotent:
// re-running only creates invoices that don't exist yet. Admin only.
// ---------------------------------------------------------------------------
export async function generateMonth(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getActiveSession()
  if (session.role !== 'admin') return { error: 'Not authorised.' }

  const month = parseMonth(formData.get('month') as string) ?? firstOfMonth(today())

  const supabase = await createClient()
  const created = await generateLedger(supabase, session.institutionId, month)

  revalidateFees()
  return {
    success: true,
    info:
      created === 0
        ? 'All invoices for this month already exist.'
        : `Generated ${created} invoice${created === 1 ? '' : 's'}.`,
  }
}

// ---------------------------------------------------------------------------
// Record a payment against a ledger invoice. Assigns a sequential
// receipt_number, then advances amount_paid + status. Admin only.
// ---------------------------------------------------------------------------
export async function recordPayment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getActiveSession()
  if (session.role !== 'admin') return { error: 'Not authorised.' }

  const ledgerId = (formData.get('ledger_id') as string)?.trim()
  if (!ledgerId) return { error: 'Missing invoice.' }

  const amount = rupeesToPaise(formData.get('amount'))
  if (amount == null || amount <= 0) return { error: 'Enter a valid amount.' }

  const mode = (formData.get('payment_mode') as string)?.trim() as PaymentMode
  if (!PAYMENT_MODES.includes(mode)) return { error: 'Select a payment mode.' }

  const dateRaw = (formData.get('paid_at') as string)?.trim()
  const paidAt = dateRaw && parseYmd(dateRaw) ? dateRaw : null
  const notes = ((formData.get('notes') as string) ?? '').trim() || null

  const supabase = await createClient()

  // Load + authorise the invoice (must be in the active institution, open).
  const { data: ledger } = await supabase
    .from('fee_ledger')
    .select('id, institution_id, student_id, amount_due, amount_paid, status')
    .eq('id', ledgerId)
    .maybeSingle()
  if (!ledger || ledger.institution_id !== session.institutionId)
    return { error: 'Invoice not found.' }
  if (ledger.status === 'paid' || ledger.status === 'waived')
    return { error: `This invoice is already ${ledger.status}.` }

  // Sequential receipt number (atomic, admin-guarded RPC).
  const { data: receiptNumber, error: rcptErr } = await supabase.rpc(
    'next_receipt_number',
    { p_institution_id: session.institutionId }
  )
  if (rcptErr) return { error: 'Could not generate a receipt number.' }

  const { error: payErr } = await supabase.from('fee_payments').insert({
    institution_id: session.institutionId,
    ledger_id: ledger.id,
    student_id: ledger.student_id,
    amount,
    payment_mode: mode,
    receipt_number: receiptNumber,
    recorded_by: session.userId,
    notes,
    ...(paidAt ? { paid_at: paidAt } : {}),
  })
  if (payErr) return { error: 'Failed to record the payment.' }

  const newPaid = ledger.amount_paid + amount
  const { error: updErr } = await supabase
    .from('fee_ledger')
    .update({
      amount_paid: newPaid,
      status: ledgerStatus(ledger.amount_due, newPaid),
    })
    .eq('id', ledger.id)
  if (updErr) return { error: 'Payment saved but the invoice did not update.' }

  revalidateFees(ledger.student_id)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Void a payment: marks it voided and reverses its amount off the invoice.
// Plain form action (button submit). Admin only.
// ---------------------------------------------------------------------------
export async function voidPayment(formData: FormData): Promise<void> {
  const session = await getActiveSession()
  if (session.role !== 'admin') return

  const paymentId = (formData.get('payment_id') as string)?.trim()
  if (!paymentId) return

  const supabase = await createClient()
  const { data: payment } = await supabase
    .from('fee_payments')
    .select('id, institution_id, ledger_id, student_id, amount, voided_at')
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment || payment.institution_id !== session.institutionId) return
  if (payment.voided_at) return // already voided

  const { error: voidErr } = await supabase
    .from('fee_payments')
    .update({ voided_at: new Date().toISOString() })
    .eq('id', payment.id)
  if (voidErr) return

  const { data: ledger } = await supabase
    .from('fee_ledger')
    .select('id, amount_due, amount_paid, status')
    .eq('id', payment.ledger_id)
    .maybeSingle()
  if (ledger && ledger.status !== 'waived') {
    const newPaid = Math.max(0, ledger.amount_paid - payment.amount)
    await supabase
      .from('fee_ledger')
      .update({ amount_paid: newPaid, status: ledgerStatus(ledger.amount_due, newPaid) })
      .eq('id', ledger.id)
  }

  revalidateFees(payment.student_id)
}

// ---------------------------------------------------------------------------
// Waive an invoice (writes off the balance). Plain form action. Admin only.
// ---------------------------------------------------------------------------
export async function waiveLedger(formData: FormData): Promise<void> {
  const session = await getActiveSession()
  if (session.role !== 'admin') return

  const ledgerId = (formData.get('ledger_id') as string)?.trim()
  if (!ledgerId) return

  const supabase = await createClient()
  const { data: ledger } = await supabase
    .from('fee_ledger')
    .select('id, institution_id, student_id, status')
    .eq('id', ledgerId)
    .maybeSingle()
  if (!ledger || ledger.institution_id !== session.institutionId) return
  if (ledger.status === 'paid' || ledger.status === 'waived') return

  await supabase.from('fee_ledger').update({ status: 'waived' }).eq('id', ledger.id)
  revalidateFees(ledger.student_id)
}
