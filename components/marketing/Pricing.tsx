"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  FREE_PLAN_LIMITS,
  PER_STUDENT_MONTHLY,
  PER_STUDENT_ANNUAL,
} from "@/lib/constants"
import { cn } from "@/lib/utils"

// First FREE_STUDENTS students are always free; billable students are charged
// per head. Pricing constants are shared with the admin billing view.
const FREE_STUDENTS = FREE_PLAN_LIMITS.student

const plans = [
  {
    name: "Starter",
    priceLabel: () => "₹0",
    priceSuffix: "forever",
    description: "For new and small academies finding their feet.",
    limits: `Up to ${FREE_STUDENTS} students · 2 batches · 1 coach`,
    cta: "Start free",
    ctaHref: "/register",
    highlighted: false,
    features: [
      `Up to ${FREE_STUDENTS} students`,
      "2 batches",
      "1 coach account",
      "Fee tracking & reminders",
      "Basic scheduling",
      "Email support",
    ],
  },
  {
    name: "Growth",
    priceLabel: (annual: boolean) => `₹${annual ? PER_STUDENT_ANNUAL : PER_STUDENT_MONTHLY}`,
    priceSuffix: "/ student / mo",
    description: "Pay only for the students you coach — pricing that scales with your academy.",
    limits: `First ${FREE_STUDENTS} students free · then per active student`,
    cta: "Start free trial",
    ctaHref: "/register?plan=growth",
    highlighted: true,
    badge: "Most popular",
    features: [
      "Unlimited batches & coaches",
      "WhatsApp & SMS reminders",
      "Fee collection & payment tracking",
      "Advanced scheduling",
      "Attendance & performance tracking",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    priceLabel: () => "Custom",
    priceSuffix: "volume rate",
    description: "For large academies and multi-branch organisations.",
    limits: "300+ students · lower per-head rate",
    cta: "Contact us",
    ctaHref: "mailto:vinothdevaraj14@gmail.com",
    highlighted: false,
    features: [
      "Everything in Growth",
      "Discounted volume pricing",
      "Multi-branch management",
      "Dedicated onboarding & SLA",
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
            Simple, student-based pricing
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free with your first {FREE_STUDENTS} students. After that, just ₹
            {PER_STUDENT_MONTHLY} per active student — you only pay as you grow.
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
                Save 20%
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
                "relative flex flex-col overflow-visible",
                plan.highlighted
                  ? "border-primary shadow-xl ring-2 ring-primary bg-background"
                  : "border-0 shadow-sm bg-background"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-foreground">
                    {plan.priceLabel(annual)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      {plan.priceSuffix}
                    </span>
                  </p>
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
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent"
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
