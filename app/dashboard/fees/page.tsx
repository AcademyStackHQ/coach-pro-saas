import { CreditCard } from 'lucide-react'
import { getActiveSession } from '@/lib/activeSession'
import { ComingSoon } from '@/components/dashboard/ComingSoon'

export const metadata = { title: 'Fees — CoachPro' }

export default async function FeesPage() {
  await getActiveSession()
  return (
    <ComingSoon
      icon={CreditCard}
      title="My Fees"
      description="Your invoices, payment history, and dues will appear here once fee management is live."
    />
  )
}
