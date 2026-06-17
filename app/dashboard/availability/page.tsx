import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { requireRole } from '@/lib/requireRole'
import { saveMyAvailability } from '../coaches/actions'
import { AvailabilityEditor } from '@/components/dashboard/AvailabilityEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'My Availability — CoachPro' }

export default async function MyAvailabilityPage() {
  await requireRole('coach')

  const cs = await cookies()
  const institutionId = cs.get('active_institution_id')!.value
  const supabase = await createClient()

  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')

  const { data: ext } = await supabase
    .from('coaches')
    .select('availability')
    .eq('institution_id', institutionId)
    .eq('user_id', userId)
    .maybeSingle()

  const availability = ext?.availability ?? {}

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the times you&apos;re available to take sessions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor
            initial={availability}
            action={saveMyAvailability}
            description="Add multiple blocks per day for split shifts (e.g. mornings and evenings)."
          />
        </CardContent>
      </Card>
    </div>
  )
}
