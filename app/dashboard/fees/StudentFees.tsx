import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Receipt } from 'lucide-react'
import { cn, paiseToRupees } from '@/lib/utils'
import type { LedgerStatus } from '@/lib/fees'

export type StudentPayment = {
  id: string
  amount: number
  paymentMode: string
  receiptNumber: string | null
  paidAt: string
  voidedAt: string | null
}

export type StudentInvoice = {
  id: string
  monthLabel: string
  amountDue: number
  amountPaid: number
  balance: number
  status: LedgerStatus
  dueDate: string | null
  payments: StudentPayment[]
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

const rupee = (paise: number) => `₹${paiseToRupees(paise) || '0'}`

export function StudentFees({ invoices }: { invoices: StudentInvoice[] }) {
  const outstanding = invoices
    .filter((i) => i.status === 'pending' || i.status === 'partial')
    .reduce((sum, i) => sum + i.balance, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Fees</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your monthly invoices and payment history.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <p className="text-sm text-muted-foreground">Total outstanding</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{rupee(outstanding)}</p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Receipt className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">{inv.monthLabel}</CardTitle>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_BADGE[inv.status]
                  )}
                >
                  {STATUS_LABEL[inv.status]}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Due</dt>
                    <dd className="font-medium">{rupee(inv.amountDue)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="font-medium">{rupee(inv.amountPaid)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Balance</dt>
                    <dd className="font-semibold">{rupee(inv.balance)}</dd>
                  </div>
                </dl>

                {inv.payments.length > 0 && (
                  <ul className="divide-y rounded-lg border text-sm">
                    {inv.payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <span
                          className={cn(
                            'font-medium',
                            p.voidedAt && 'text-muted-foreground line-through'
                          )}
                        >
                          {rupee(p.amount)}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {p.paymentMode.toUpperCase()}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {p.receiptNumber ?? '—'} · {p.paidAt.slice(0, 10)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
