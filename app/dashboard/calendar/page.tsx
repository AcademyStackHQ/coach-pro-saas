import { Calendar } from 'lucide-react'
import { getActiveSession } from '@/lib/activeSession'
import { ComingSoon } from '@/components/dashboard/ComingSoon'

export const metadata = { title: 'Schedule — CoachPro' }

export default async function CalendarPage() {
  await getActiveSession()
  return (
    <ComingSoon
      icon={Calendar}
      title="My Schedule"
      description="Your sessions, batches, and calendar will appear here once scheduling is live."
    />
  )
}
