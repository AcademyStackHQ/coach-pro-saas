import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const useCases = [
  {
    discipline: "Cricket",
    title: "Multi-batch grounds",
    description:
      "Run morning and evening batches across several grounds with automatic conflict detection, attendance, and monthly fee collection.",
  },
  {
    discipline: "Football",
    title: "Multi-venue academies",
    description:
      "Coordinate coaches and age groups across venues, and keep parents updated with WhatsApp reminders and instant payment confirmations.",
  },
  {
    discipline: "Music & dance",
    title: "1-to-1 and group classes",
    description:
      "Mix individual lessons with group batches, track progress per student, and auto-generate invoices every month.",
  },
]

export function Stories({ showHeader = true }: { showHeader?: boolean } = {}) {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        {showHeader && (
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for every kind of academy
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              From cricket grounds to music schools — CoachPro adapts to how you
              run things.
            </p>
          </div>
        )}

        {/* Use-case cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((u) => (
            <Card key={u.title} className="flex flex-col border-0 shadow-sm bg-muted/40">
              <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                <Badge variant="secondary" className="w-fit text-xs">
                  {u.discipline}
                </Badge>
                <p className="text-base font-semibold text-foreground">
                  {u.title}
                </p>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {u.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
