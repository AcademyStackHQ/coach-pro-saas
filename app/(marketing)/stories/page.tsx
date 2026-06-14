import type { Metadata } from "next"
import { Stories } from "@/components/marketing/Stories"

export const metadata: Metadata = {
  title: "Stories",
  description:
    "See how sports academies across India use CoachPro to manage students, fees, and schedules.",
  alternates: { canonical: "https://coachpro.in/stories" },
}

export default function StoriesPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center mb-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Trusted by academies across India
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Real stories from coaches who made the switch.
        </p>
      </div>
      <Stories />
    </div>
  )
}
