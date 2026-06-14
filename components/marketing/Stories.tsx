import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const testimonials = [
  {
    quote:
      "CoachPro transformed how we run our cricket academy. Fee collection used to take days — now it's automatic. Parents love getting WhatsApp receipts instantly.",
    name: "Rajesh Kumar",
    role: "Head Coach",
    academy: "Chennai Cricket Academy",
    sport: "Cricket",
  },
  {
    quote:
      "We manage 400+ students across 3 venues. CoachPro's scheduling prevents conflicts automatically and the dashboard gives me everything at a glance.",
    name: "Priya Nair",
    role: "Academy Director",
    academy: "Kerala Football Academy",
    sport: "Football",
  },
  {
    quote:
      "Switched from spreadsheets 6 months ago and haven't looked back. Setup took 20 minutes and my coaches were onboarded the same day.",
    name: "Suresh Mehta",
    role: "Founder",
    academy: "Ahmedabad Badminton Club",
    sport: "Badminton",
  },
]

export function Stories() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by academies across India
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Join hundreds of coaches who run their academy on CoachPro.
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="flex flex-col border-0 shadow-sm bg-muted/40">
              <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                {/* Quote */}
                <p className="flex-1 text-sm leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                {/* Author */}
                <div className="flex items-center gap-3 border-t pt-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                    {t.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.role} · {t.academy}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
                    {t.sport}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
