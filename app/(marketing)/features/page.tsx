import type { Metadata } from "next"
import { Features } from "@/components/marketing/Features"

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything your academy needs — student management, smart scheduling, fee collection, SMS reminders, and more.",
  alternates: { canonical: "https://coachpro.in/features" },
}

export default function FeaturesPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center mb-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Everything your academy needs
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Built specifically for coaching & teaching academies in India.
        </p>
      </div>
      <Features showHeader={false} />
    </div>
  )
}
