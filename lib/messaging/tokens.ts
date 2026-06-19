// ---------------------------------------------------------------------------
// Message template token resolution (pure; safe to import on the client for
// live previews). Channel-agnostic — the same resolved body is sent on whatever
// channel(s) the student prefers. Substitutes {tokens} in a template body;
// unknown or missing tokens render as empty so a half-populated context never
// leaks "{foo}".
// ---------------------------------------------------------------------------

import { paiseToRupees } from '@/lib/utils'
import { monthLabel } from '@/lib/fees'
import { smsDateLabel, parseYmd } from '@/lib/calendar'

export type MessageTokens = {
  parent_name?: string | null
  student_name?: string | null
  batch_name?: string | null
  /** First-of-month YYYY-MM-DD; rendered as "July 2026". */
  month?: string | null
  /** Paise; rendered as rupees. */
  amount_due?: number | null
  amount_paid?: number | null
  /** YYYY-MM-DD (or ISO); rendered as "10 Jul 2026". */
  due_date?: string | null
  payment_date?: string | null
  receipt_number?: string | null
  academy_name?: string | null
}

const dateToken = (s: string | null | undefined): string => {
  const d = parseYmd((s ?? '').slice(0, 10))
  return d ? smsDateLabel(d) : ''
}

function tokenValue(key: string, t: MessageTokens): string {
  switch (key) {
    case 'parent_name':
      return t.parent_name ?? ''
    case 'student_name':
      return t.student_name ?? ''
    case 'batch_name':
      return t.batch_name ?? ''
    case 'month': {
      const d = parseYmd((t.month ?? '').slice(0, 10))
      return d ? monthLabel(d) : ''
    }
    case 'amount_due':
      return t.amount_due != null ? paiseToRupees(t.amount_due) : ''
    case 'amount_paid':
      return t.amount_paid != null ? paiseToRupees(t.amount_paid) : ''
    case 'due_date':
      return dateToken(t.due_date)
    case 'payment_date':
      return dateToken(t.payment_date)
    case 'receipt_number':
      return t.receipt_number ?? ''
    case 'academy_name':
      return t.academy_name ?? ''
    default:
      return '' // unknown token → blank
  }
}

/** Replace every {token} in `body` with its resolved value. */
export function resolveTemplate(body: string, tokens: MessageTokens): string {
  return body.replace(/\{(\w+)\}/g, (_match, key: string) => tokenValue(key, tokens))
}

/** Sample data for the Settings template preview. */
export const SAMPLE_TOKENS: MessageTokens = {
  parent_name: 'Priya',
  student_name: 'Aarav',
  batch_name: 'U14 Evening',
  month: '2026-07-01',
  amount_due: 150000,
  amount_paid: 150000,
  due_date: '2026-07-10',
  payment_date: '2026-07-08',
  receipt_number: 'RCP-2026-0042',
  academy_name: 'Sunrise Sports Academy',
}
