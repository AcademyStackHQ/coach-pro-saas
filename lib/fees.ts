// ---------------------------------------------------------------------------
// Module 7 — Fee Management helpers.
//
// Billing basis is PER-STUDENT FLAT: one fee_ledger invoice per active student
// per month, amount_due = students.monthly_fee. Generation is idempotent via
// the (institution_id, student_id, month_year) unique key, so the manual admin
// button and the cron endpoint can both call it safely and repeatedly.
//
// Money is INT paise. Date math is LOCAL time (reuses lib/calendar's `ymd` to
// avoid the toISOString IST off-by-one).
// ---------------------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { ymd } from '@/lib/calendar'

type Client = SupabaseClient<Database>

export type LedgerStatus = 'pending' | 'partial' | 'paid' | 'waived'

export const PAYMENT_MODES = ['cash', 'upi', 'card', 'cheque'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

/** Day of the month invoices fall due (the 10th). */
export const DEFAULT_DUE_DAY = 10

/** First-of-month local Date for the month containing `d`. */
export function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Parse a "YYYY-MM" month input to a first-of-month local Date, or null. */
export function parseMonth(s: string | undefined | null): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "YYYY-MM" for a date (the value an <input type="month"> expects). */
export function monthInputValue(d: Date): string {
  return ymd(firstOfMonth(d)).slice(0, 7)
}

/** "July 2026" label for a month. */
export function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(d)
}

/** Recompute ledger status from amounts. `waived` is set explicitly, never here. */
export function ledgerStatus(amountDue: number, amountPaid: number): LedgerStatus {
  if (amountPaid <= 0) return 'pending'
  if (amountPaid >= amountDue) return 'paid'
  return 'partial'
}

/**
 * Idempotently generate the monthly invoice ledger for one institution.
 * One row per active student with a positive monthly_fee. Safe to re-run:
 * existing (institution, student, month) rows are left untouched — never
 * duplicated and never reset (paid invoices are preserved).
 *
 * Returns the count of NEW invoices inserted.
 */
export async function generateLedger(
  client: Client,
  institutionId: string,
  monthYear: Date
): Promise<number> {
  const first = firstOfMonth(monthYear)
  const monthYmd = ymd(first)
  const dueYmd = ymd(new Date(first.getFullYear(), first.getMonth(), DEFAULT_DUE_DAY))

  const { data: students, error } = await client
    .from('students')
    .select('id, monthly_fee')
    .eq('institution_id', institutionId)
    .eq('status', 'active')
  if (error || !students) return 0

  const rows = students
    .filter((s) => s.monthly_fee != null && s.monthly_fee > 0)
    .map((s) => ({
      institution_id: institutionId,
      student_id: s.id,
      month_year: monthYmd,
      amount_due: s.monthly_fee as number,
      due_date: dueYmd,
      status: 'pending',
    }))
  if (rows.length === 0) return 0

  // ignoreDuplicates → ON CONFLICT DO NOTHING against fee_ledger_unique.
  // .select() returns only the rows that were actually inserted.
  const { data, error: upErr } = await client
    .from('fee_ledger')
    .upsert(rows, {
      onConflict: 'institution_id,student_id,month_year',
      ignoreDuplicates: true,
    })
    .select('id')
  if (upErr) return 0
  return data?.length ?? 0
}
