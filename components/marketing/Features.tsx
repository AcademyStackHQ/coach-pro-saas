import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

const features = [
  {
    icon: "👥",
    title: "Student Management",
    description:
      "Enrol students, manage profiles, track uniform details and guardian contacts in one place.",
  },
  {
    icon: "📅",
    title: "Smart Scheduling",
    description:
      "Batch calendars and 1-to-1 sessions with automatic conflict detection for coaches and venues.",
  },
  {
    icon: "💳",
    title: "Fee Collection",
    description:
      "Auto-generate monthly invoices, record payments, and track balances in real time.",
  },
  {
    icon: "📱",
    title: "SMS & WhatsApp",
    description:
      "Automated fee reminders and payment confirmations sent directly to parents.",
  },
  {
    icon: "📊",
    title: "Academy Dashboard",
    description:
      "Live stats on active students, fee collection rate, and today's sessions at a glance.",
  },
  {
    icon: "🔒",
    title: "Secure & Multi-tenant",
    description:
      "Every academy's data is fully isolated — DPDP-compliant with role-based access control.",
  },
]

export function Features({ showHeader = true }: { showHeader?: boolean } = {}) {
  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        {showHeader && (
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything your academy needs
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              One platform. Zero spreadsheets. Full control.
            </p>
          </div>
        )}

        {/* 6-card grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-sm bg-background">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-xl">
                  {feature.icon}
                </div>
                <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
