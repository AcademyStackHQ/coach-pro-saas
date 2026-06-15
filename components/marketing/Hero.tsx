import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function DashboardMockup() {
  const sidebarItems = [
    { icon: "⊞", label: "Dashboard", active: true },
    { icon: "👥", label: "Students", active: false },
    { icon: "📅", label: "Schedule", active: false },
    { icon: "💳", label: "Finance", active: false },
  ]

  const stats = [
    { value: "248", label: "Active students", color: "text-primary" },
    { value: "₹4.28L", label: "Collected · June", color: "text-green-600" },
    { value: "92%", label: "Attendance", color: "text-purple-600" },
  ]

  const sessions = [
    { time: "9:00 AM", batch: "Cricket · Batch A", venue: "Ground 1", active: true },
    { time: "11:00 AM", batch: "Football · Juniors", venue: "Ground 2", active: false },
    { time: "4:00 PM", batch: "Cricket · Batch B", venue: "Ground 1", active: false },
  ]

  return (
    <div className="relative w-full rounded-2xl border bg-card shadow-2xl overflow-hidden ring-1 ring-foreground/10">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1">
          <div className="mx-auto max-w-55 rounded border bg-background px-3 py-0.5 text-center text-xs text-muted-foreground">
            app.coachpro.in/dashboard
          </div>
        </div>
      </div>

      {/* App */}
      <div className="flex h-90 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden sm:flex w-44 shrink-0 flex-col border-r bg-muted/20 p-3 gap-1">
          <div className="mb-2 px-2 py-1">
            <span className="text-xs font-bold text-primary">CoachPro</span>
          </div>
          {sidebarItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium",
                item.active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-4 space-y-3 bg-background">
          <div>
            <p className="text-sm font-semibold text-foreground">Dashboard</p>
            <p className="text-xs text-muted-foreground">Saturday, 14 June 2025</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border bg-card p-2.5">
                <p className={cn("text-sm font-bold", stat.color)}>{stat.value}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Today's sessions */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-1.5">Today&#39;s sessions</p>
            <div className="space-y-1.5">
              {sessions.map((session) => (
                <div
                  key={session.time}
                  className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs"
                >
                  <div
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      session.active ? "bg-green-500" : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="w-14 shrink-0 font-medium text-foreground">{session.time}</span>
                  <span className="min-w-0 truncate text-muted-foreground">{session.batch}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">{session.venue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-32">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-150 w-150 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-100 w-100 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="flex flex-col items-start gap-6">
            {/* Badge pill */}
            <Badge
              variant="outline"
              className="rounded-full border-primary/25 bg-primary/8 text-primary px-3 py-1 text-xs font-medium"
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              New · WhatsApp reminders
            </Badge>

            {/* H1 */}
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Run your coaching academy from{" "}
              <span className="text-primary">one place</span>
            </h1>

            {/* Subtext */}
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              CoachPro is the cloud platform that handles enrolments, scheduling,
              fees and parent communication — so you can focus on coaching, not
              paperwork.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent px-8"
                )}
              >
                Start free →
              </Link>
              <Link
                href="/demo"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-8")}
              >
                Book a demo
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {["No card required", "Set up in minutes", "Cancel anytime"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <svg
                    className="h-4 w-4 text-green-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="relative lg:ml-4">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
