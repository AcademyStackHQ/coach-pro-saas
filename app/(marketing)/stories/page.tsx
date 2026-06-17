import type { Metadata } from "next"
import { Stories } from "@/components/marketing/Stories"

export const metadata: Metadata = {
  title: "Use cases",
  description:
    "See how different kinds of academies and institutes use CoachPro to manage students, fees, and schedules.",
  alternates: { canonical: "https://coachpro.in/stories" },
}

export default function StoriesPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center mb-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Built for every kind of academy
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          From cricket grounds to music schools — see how CoachPro fits.
        </p>
      </div>
      <Stories showHeader={false} />
    </div>
  )
}
