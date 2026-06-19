import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { getActiveSession } from '@/lib/activeSession'
import { ymd, parseYmd, today } from '@/lib/calendar'
import { firstOfMonth, monthInputValue, monthLabel, type LedgerStatus } from '@/lib/fees'
import { FeesClient, type LedgerRow, type PaymentRow } from './FeesClient'
import { StudentFees, type StudentInvoice } from './StudentFees'

export const metadata = { title: 'Fees — CoachPro' }

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await getActiveSession()
  if (session.role === 'coach') redirect('/dashboard')

  const supabase = await createClient()

  // -------------------------------------------------------------------------
  // Student: read-only view of their own invoices + payments (RLS-scoped).
  // -------------------------------------------------------------------------
  if (session.role === 'student') {
    const { data: ledger } = await supabase
      .from('fee_ledger')
      .select('id, month_year, amount_due, amount_paid, balance, status, due_date')
      .eq('institution_id', session.institutionId)
      .order('month_year', { ascending: false })

    const ledgerIds = (ledger ?? []).map((l) => l.id)
    const paymentsByLedger = new Map<string, StudentInvoice['payments']>()
    if (ledgerIds.length) {
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('id, ledger_id, amount, payment_mode, receipt_number, paid_at, voided_at')
        .in('ledger_id', ledgerIds)
        .order('paid_at', { ascending: false })
      for (const p of payments ?? []) {
        const list = paymentsByLedger.get(p.ledger_id) ?? []
        list.push({
          id: p.id,
          amount: p.amount,
          paymentMode: p.payment_mode,
          receiptNumber: p.receipt_number,
          paidAt: p.paid_at,
          voidedAt: p.voided_at,
        })
        paymentsByLedger.set(p.ledger_id, list)
      }
    }

    const invoices: StudentInvoice[] = (ledger ?? []).map((l) => ({
      id: l.id,
      monthLabel: monthLabel(parseYmd(l.month_year) ?? today()),
      amountDue: l.amount_due,
      amountPaid: l.amount_paid,
      balance: l.balance ?? 0,
      status: l.status as LedgerStatus,
      dueDate: l.due_date,
      payments: paymentsByLedger.get(l.id) ?? [],
    }))

    return <StudentFees invoices={invoices} />
  }

  // -------------------------------------------------------------------------
  // Admin: month dashboard + payment recording.
  // -------------------------------------------------------------------------
  const sp = await searchParams
  const monthDate = firstOfMonth(parseYmd(sp.month ? `${sp.month}-01` : null) ?? today())
  const monthYmd = ymd(monthDate)

  const [{ data: ledger }, { data: smsTemplate }, { data: institution }] =
    await Promise.all([
      supabase
        .from('fee_ledger')
        .select(
          'id, student_id, month_year, amount_due, amount_paid, balance, status, due_date, students(full_name, student_code, parent_name, parent_mobile, contact_channel)'
        )
        .eq('institution_id', session.institutionId)
        .eq('month_year', monthYmd),
      supabase
        .from('sms_templates')
        .select('body')
        .eq('institution_id', session.institutionId)
        .eq('name', 'fee_reminder')
        .maybeSingle(),
      supabase
        .from('institutions')
        .select('name')
        .eq('id', session.institutionId)
        .single(),
    ])

  const ledgerIds = (ledger ?? []).map((l) => l.id)
  const paymentsByLedger = new Map<string, PaymentRow[]>()
  if (ledgerIds.length) {
    const { data: payments } = await supabase
      .from('fee_payments')
      .select(
        'id, ledger_id, amount, payment_mode, receipt_number, paid_at, voided_at, notes'
      )
      .in('ledger_id', ledgerIds)
      .order('paid_at', { ascending: false })
    for (const p of payments ?? []) {
      const list = paymentsByLedger.get(p.ledger_id) ?? []
      list.push({
        id: p.id,
        amount: p.amount,
        paymentMode: p.payment_mode,
        receiptNumber: p.receipt_number,
        paidAt: p.paid_at,
        voidedAt: p.voided_at,
        notes: p.notes,
      })
      paymentsByLedger.set(p.ledger_id, list)
    }
  }

  const rows: LedgerRow[] = (ledger ?? [])
    .map((l) => ({
      id: l.id,
      studentId: l.student_id,
      studentName: l.students?.full_name ?? 'Student',
      studentCode: l.students?.student_code ?? null,
      parentName: l.students?.parent_name ?? null,
      parentMobile: l.students?.parent_mobile ?? null,
      contactChannel: l.students?.contact_channel ?? 'sms',
      month: l.month_year,
      amountDue: l.amount_due,
      amountPaid: l.amount_paid,
      balance: l.balance ?? 0,
      status: l.status as LedgerStatus,
      dueDate: l.due_date,
      payments: paymentsByLedger.get(l.id) ?? [],
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName))

  return (
    <FeesClient
      month={monthInputValue(monthDate)}
      monthLabel={monthLabel(monthDate)}
      rows={rows}
      smsTemplateBody={smsTemplate?.body ?? null}
      academyName={institution?.name ?? null}
    />
  )
}
