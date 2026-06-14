import type { Metadata } from "next"
import { HowItWorks } from "@/components/marketing/HowItWorks"

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Get your sports academy running on CoachPro in three simple steps. No technical setup required.",
  alternates: { canonical: "https://coachpro.in/how-it-works" },
}

export default function HowItWorksPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center mb-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Up and running in minutes
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Three steps to a fully managed academy.
        </p>
      </div>
      <HowItWorks />
    </div>
  )
}
