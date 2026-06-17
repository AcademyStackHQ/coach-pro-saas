import Link from "next/link"
import { Separator } from "@/components/ui/separator"

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Use cases", href: "/stories" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Contact", href: "mailto:vinothdevaraj14@gmail.com" },
      { label: "Get started", href: "/register" },
      { label: "Join your academy", href: "/signup" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Refund Policy", href: "/refund" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-flex text-lg font-bold tracking-tight">
              <span className="text-brand-light">Coach</span>Pro
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-background/60">
              The all-in-one platform that helps academies and institutes of
              every kind manage students, schedules, fees and communications —
              all in one place.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-background/50">
                {col.heading}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => {
                  const className =
                    "text-sm text-background/70 transition-colors hover:text-background"
                  return (
                    <li key={link.label}>
                      {link.href.startsWith("mailto:") ? (
                        <a href={link.href} className={className}>
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className={className}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8 bg-background/10" />

        <p className="text-center text-sm text-background/50">
          © {new Date().getFullYear()} CoachPro. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
