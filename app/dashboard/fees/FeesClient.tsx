'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Receipt, MessageSquare } from 'lucide-react'
import {
  generateMonth,
  recordPayment,
  voidPayment,
  waiveLedger,
  type ActionState,
} from './actions'
import {
  sendFeeReminders,
  type ActionState as SmsActionState,
} from '../sms/actions'
import { resolveTemplate } from '@/lib/messaging/tokens'
import { PAYMENT_MODES, type LedgerStatus } from '@/lib/fees'
import { ymd, today as todayDate } from '@/lib/calendar'
import { cn, paiseToRupees } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

export type PaymentRow = {
  id: string
  amount: number
  paymentMode: string
  receiptNumber: string | null
  paidAt: string
  voidedAt: string | null
  notes: string | null
}

export type LedgerRow = {
  id: string
  studentId: string
  studentName: string
  studentCode: string | null
  parentName: string | null
  parentMobile: string | null
  contactChannel: string
  month: string // YYYY-MM-DD (first of month)
  amountDue: number
  amountPaid: number
  balance: number
  status: LedgerStatus
  dueDate: string | null
  payments: PaymentRow[]
}

export type FeesClientProps = {
  month: string // YYYY-MM
  monthLabel: string
  rows: LedgerRow[]
  smsTemplateBody: string | null
  academyName: string | null
}

const STATUS_BADGE: Record<LedgerStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  waived: 'bg-muted text-muted-foreground',
}
const STATUS_LABEL: Record<LedgerStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  waived: 'Waived',
}

const inputClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'

const rupee = (paise: number) => `₹${paiseToRupees(paise) || '0'}`

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Summary tiles
// ---------------------------------------------------------------------------
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manage-invoice sheet: record payment, void payments, waive.
// ---------------------------------------------------------------------------
function InvoiceSheet({ row, onClose }: { row: LedgerRow; onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordPayment, {})
  const open = row.status !== 'paid' && row.status !== 'waived'

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onClose, 600)
      return () => clearTimeout(t)
    }
  }, [state.success, onClose])

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{row.studentName}</SheetTitle>
          <SheetDescription>
            Invoice · {STATUS_LABEL[row.status]}
            {row.studentCode ? ` · ${row.studentCode}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Amount due</dt>
              <dd className="font-medium">{rupee(row.amountDue)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-medium">{rupee(row.amountPaid)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Balance</dt>
              <dd className="font-semibold">{rupee(row.balance)}</dd>
            </div>
            {row.dueDate && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Due date</dt>
                <dd className="font-medium">{row.dueDate}</dd>
              </div>
            )}
          </dl>

          {/* Record a payment */}
          {open && (
            <form action={action} className="space-y-3 border-t pt-4">
              <input type="hidden" name="ledger_id" value={row.id} />
              <p className="text-sm font-medium">Record a payment</p>

              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (₹)</Label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  defaultValue={paiseToRupees(row.balance)}
                  className={inputClass}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="payment_mode">Mode</Label>
                  <select id="payment_mode" name="payment_mode" className={inputClass} required>
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paid_at">Date</Label>
                  <input
                    id="paid_at"
                    name="paid_at"
                    type="date"
                    defaultValue={ymd(todayDate())}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <input id="notes" name="notes" type="text" className={inputClass} />
              </div>

              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              {state.success && (
                <p className="text-sm font-medium text-green-600">Payment recorded.</p>
              )}

              <Button type="submit" disabled={pending} className="w-full">
                {pending ? 'Saving…' : 'Record Payment'}
              </Button>
            </form>
          )}

          {/* Payment history */}
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium">Payments</p>
            {row.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {row.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          p.voidedAt && 'text-muted-foreground line-through'
                        )}
                      >
                        {rupee(p.amount)}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {p.paymentMode.toUpperCase()}
                        </span>
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {p.receiptNumber ?? '—'} · {p.paidAt.slice(0, 10)}
                      </p>
                    </div>
                    {!p.voidedAt ? (
                      <form action={voidPayment}>
                        <input type="hidden" name="payment_id" value={p.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Void
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">Voided</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Waive */}
          {open && (
            <form action={waiveLedger} className="border-t pt-4">
              <input type="hidden" name="ledger_id" value={row.id} />
              <Button type="submit" variant="outline" size="sm" className="w-full">
                Waive this invoice
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Send-SMS confirm sheet
// ---------------------------------------------------------------------------
function SmsSheet({
  rows,
  templateBody,
  academyName,
  onClose,
  onSent,
}: {
  rows: LedgerRow[]
  templateBody: string | null
  academyName: string | null
  onClose: () => void
  onSent: () => void
}) {
  const [state, action, pending] = useActionState<SmsActionState, FormData>(
    sendFeeReminders,
    {}
  )

  // Rows with no mobile, or opted out (contact_channel 'none'), are skipped
  // server-side; mirror that here for an accurate recipient count + preview.
  const eligible = rows.filter((r) => r.parentMobile && r.contactChannel !== 'none')
  const skippedCount = rows.length - eligible.length

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => {
        onSent()
        onClose()
      }, 1400)
      return () => clearTimeout(t)
    }
  }, [state.success, onClose, onSent])

  const preview =
    templateBody && eligible[0]
      ? resolveTemplate(templateBody, {
          parent_name: eligible[0].parentName,
          student_name: eligible[0].studentName,
          month: eligible[0].month,
          amount_due: eligible[0].amountDue,
          due_date: eligible[0].dueDate,
          academy_name: academyName,
        })
      : null

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Send fee reminders</SheetTitle>
          <SheetDescription>Texts the fee reminder to selected parents.</SheetDescription>
        </SheetHeader>

        <form action={action} className="flex flex-col gap-4 p-4">
          <input type="hidden" name="ledger_ids" value={rows.map((r) => r.id).join(',')} />
          <input type="hidden" name="template_name" value="fee_reminder" />

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              {eligible.length} recipient{eligible.length === 1 ? '' : 's'}
            </p>
            {skippedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {skippedCount} skipped (no mobile or opted out)
              </p>
            )}
          </div>

          {preview ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Preview · {eligible[0].studentName}
              </p>
              <p className="rounded-lg border p-3 text-sm leading-relaxed">{preview}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {templateBody
                ? 'No eligible recipients in this selection.'
                : 'No fee reminder template configured (Settings → SMS).'}
            </p>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="text-sm font-medium text-green-600">{state.info}</p>}

          <Button
            type="submit"
            disabled={pending || eligible.length === 0 || !templateBody}
            className="w-full"
          >
            {pending ? 'Sending…' : `Send to ${eligible.length}`}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function FeesClient({
  month,
  monthLabel,
  rows,
  smsTemplateBody,
  academyName,
}: FeesClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [filter, setFilter] = useState<'all' | LedgerStatus>('all')
  const [selected, setSelected] = useState<LedgerRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [smsOpen, setSmsOpen] = useState(false)
  const [genState, genAction, genPending] = useActionState<ActionState, FormData>(
    generateMonth,
    {}
  )

  const toggleId = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const goMonth = (m: string) => {
    // Selection is keyed to the current month's invoices; drop it on navigate
    // so the "Send SMS" count never reflects a different month's selection.
    setSelectedIds(new Set())
    router.push(`${pathname}?month=${m}`)
  }

  const stats = useMemo(() => {
    const todayYmd = ymd(todayDate())
    let due = 0,
      collected = 0,
      outstanding = 0,
      overdue = 0
    for (const r of rows) {
      due += r.amountDue
      collected += r.amountPaid
      if (r.status === 'pending' || r.status === 'partial') {
        outstanding += r.balance
        if (r.dueDate && r.dueDate < todayYmd) overdue += 1
      }
    }
    const rate = due > 0 ? Math.round((collected / due) * 100) : 0
    return { due, collected, outstanding, overdue, rate }
  }, [rows])

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  )

  const selectedRows = rows.filter((r) => selectedIds.has(r.id))
  const unpaidIds = filtered
    .filter((r) => r.status === 'pending' || r.status === 'partial')
    .map((r) => r.id)

  // Keep the open sheet in sync after a server action revalidates `rows`.
  const selectedLive = selected ? rows.find((r) => r.id === selected.id) ?? null : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly invoices and payment collection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={selectedIds.size === 0}
            onClick={() => setSmsOpen(true)}
          >
            <MessageSquare className="size-4" />
            Send SMS{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
          <form action={genAction}>
            <input type="hidden" name="month" value={month} />
            <Button type="submit" disabled={genPending}>
              <Plus className="size-4" />
              {genPending ? 'Generating…' : 'Generate invoices'}
            </Button>
          </form>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => goMonth(shiftMonth(month, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => goMonth(shiftMonth(month, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="ml-1 text-sm font-medium">{monthLabel}</span>
        {(genState.info || genState.error) && (
          <span
            className={cn(
              'ml-2 text-sm',
              genState.error ? 'text-destructive' : 'text-green-600'
            )}
          >
            {genState.error ?? genState.info}
          </span>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Collected" value={rupee(stats.collected)} />
        <Stat label="Outstanding" value={rupee(stats.outstanding)} />
        <Stat label="Overdue" value={String(stats.overdue)} hint="invoices past due" />
        <Stat label="Collection rate" value={`${stats.rate}%`} />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1 rounded-md border p-0.5 text-sm">
        {(['all', 'pending', 'partial', 'paid', 'waived'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded px-3 py-1 font-medium capitalize transition-colors',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      <Card>
        <CardContent className="py-2">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Receipt className="size-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No invoices for {monthLabel}.
              </p>
              <p className="text-xs text-muted-foreground">
                Use “Generate invoices” to bill students with a monthly fee set.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {filter} invoices.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 px-1 py-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds((prev) => new Set([...prev, ...unpaidIds]))
                  }
                  disabled={unpaidIds.length === 0}
                  className="font-medium text-foreground hover:underline disabled:opacity-40"
                >
                  Select unpaid
                </button>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="hover:underline"
                    >
                      Clear
                    </button>
                    <span>{selectedIds.size} selected</span>
                  </>
                )}
              </div>
              <ul className="divide-y">
                {filtered.map((r) => (
                  <li key={r.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleId(r.id)}
                      aria-label={`Select ${r.studentName}`}
                      className="size-4 shrink-0 rounded border-input accent-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="flex flex-1 items-center gap-3 py-3 text-left hover:bg-muted/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {r.studentName}
                          {r.studentCode && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {r.studentCode}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Due {rupee(r.amountDue)} · Paid {rupee(r.amountPaid)} · Balance{' '}
                          {rupee(r.balance)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_BADGE[r.status]
                        )}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {selectedLive && (
        <InvoiceSheet
          key={selectedLive.id}
          row={selectedLive}
          onClose={() => setSelected(null)}
        />
      )}

      {smsOpen && (
        <SmsSheet
          rows={selectedRows}
          templateBody={smsTemplateBody}
          academyName={academyName}
          onClose={() => setSmsOpen(false)}
          onSent={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  )
}
