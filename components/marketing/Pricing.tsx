"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for small academies just getting started.",
    limits: "15 students · 2 batches · 1 coach",
    cta: "Start free",
    ctaHref: "/signup",
    highlighted: false,
    features: [
      "Up to 15 students",
      "2 batches",
      "1 coach account",
      "Fee tracking",
      "Basic scheduling",
      "Email support",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 999,
    annualPrice: 833,
    description: "For growing academies that need more power.",
    limits: "Unlimited students · coaches · batches",
    cta: "Start free trial",
    ctaHref: "/signup?plan=pro",
    highlighted: true,
    badge: "Most popular",
    features: [
      "Unlimited students",
      "Unlimited batches",
      "Unlimited coaches",
      "WhatsApp & SMS reminders",
      "PDF receipts",
      "Advanced scheduling",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    description: "Custom plans for large academies and sports organisations.",
    limits: "Custom limits + SLA + onboarding",
    cta: "Contact us",
    ctaHref: "mailto:hello@coachpro.in",
    highlighted: false,
    features: [
      "Everything in Pro",
      "Custom student limits",
      "Dedicated onboarding",
      "SLA guarantee",
      "Custom integrations",
      "White-label option",
    ],
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free. Scale as you grow. No hidden fees.
          </p>

          {/* Billing toggle */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border bg-background px-2 py-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                !annual
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                annual
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                2 months free
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col",
                plan.highlighted
                  ? "border-blue-600 shadow-xl ring-2 ring-blue-600 bg-background"
                  : "border-0 shadow-sm bg-background"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-3 py-0.5 text-xs">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="mt-2">
                  {plan.monthlyPrice === null ? (
                    <p className="text-3xl font-bold text-foreground">Custom</p>
                  ) : plan.monthlyPrice === 0 ? (
                    <p className="text-3xl font-bold text-foreground">₹0</p>
                  ) : (
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        ₹{annual ? plan.annualPrice?.toLocaleString("en-IN") : plan.monthlyPrice.toLocaleString("en-IN")}
                        <span className="text-base font-normal text-muted-foreground">/mo</span>
                      </p>
                      {annual && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Billed annually (₹{((plan.annualPrice ?? 0) * 10).toLocaleString("en-IN")}/yr)
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">{plan.limits}</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  <Link
                    href={plan.ctaHref}
                    className={cn(
                      buttonVariants({ size: "default" }),
                      "w-full justify-center",
                      plan.highlighted
                        ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
