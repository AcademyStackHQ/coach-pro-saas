const steps = [
  {
    number: "01",
    title: "Create your academy",
    description:
      "Sign up free, add your academy name and first sport. No credit card needed.",
  },
  {
    number: "02",
    title: "Add coaches and batches",
    description:
      "Invite coaches by email, set your batch schedules and monthly fees.",
  },
  {
    number: "03",
    title: "Enrol students and collect fees",
    description:
      "Add students, auto-generate monthly invoices, and track payments.",
  },
]

export function HowItWorks({ showHeader = true }: { showHeader?: boolean } = {}) {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        {showHeader && (
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              No technical setup. No IT team. Just you and your academy.
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Connector line (desktop only) */}
          <div className="absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] hidden h-px bg-border sm:block" />

          {steps.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Number circle */}
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/8 text-xl font-bold text-primary">
                {step.number}
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
