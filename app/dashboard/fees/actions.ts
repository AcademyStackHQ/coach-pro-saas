'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { rupeesToPaise } from '@/lib/utils'
import { today, parseYmd } from '@/lib/calendar'
import {
  generateLedger,
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

  // Load the invoice for friendly validation only — the authoritative checks
  // and the write happen atomically inside record_fee_payment below.
  const { data: ledger } = await supabase
    .from('fee_ledger')
    .select('id, institution_id, student_id, amount_due, amount_paid, status')
    .eq('id', ledgerId)
    .maybeSingle()
  if (!ledger || ledger.institution_id !== session.institutionId)
    return { error: 'Invoice not found.' }
  if (ledger.status === 'paid' || ledger.status === 'waived')
    return { error: `This invoice is already ${ledger.status}.` }
  if (amount > ledger.amount_due - ledger.amount_paid)
    return { error: 'Amount exceeds the outstanding balance.' }

  // Atomic, admin-guarded RPC: locks the invoice row, assigns the sequential
  // receipt number, inserts the payment and advances amount_paid + status in
  // one transaction. Eliminates the lost-update race between concurrent
  // payments and never leaves a receipt-number gap (a failed insert rolls the
  // sequence back).
  const { error: rpcErr } = await supabase.rpc('record_fee_payment', {
    p_ledger_id: ledger.id,
    p_amount: amount,
    p_mode: mode,
    p_paid_at: paidAt,
    p_notes: notes,
    p_recorded_by: session.userId,
  })
  if (rpcErr) return { error: 'Failed to record the payment.' }

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

  // Atomic, admin-guarded RPC: marks the payment voided and reverses its
  // amount off the invoice (status recomputed) in one locked transaction.
  // A no-op for an already-voided payment. Returns the student id.
  const { data: studentId } = await supabase.rpc('void_fee_payment', {
    p_payment_id: paymentId,
  })

  revalidateFees((studentId as string | null) ?? undefined)
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
