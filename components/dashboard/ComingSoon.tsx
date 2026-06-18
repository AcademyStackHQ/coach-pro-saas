import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Friendly placeholder for routes whose backing module isn't built yet (e.g.
 * the student's Schedule and Fees, which arrive with Modules 6 & 7). Keeps the
 * nav links live without dead-ending in a 404.
 */
export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-6" />
          </div>
          <p className="text-base font-medium">Coming soon</p>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  )
}
