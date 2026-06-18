import type { Metadata } from "next"
import { Hero } from "@/components/marketing/Hero"
import { Features } from "@/components/marketing/Features"
import { HowItWorks } from "@/components/marketing/HowItWorks"
import { Pricing } from "@/components/marketing/Pricing"
import { Stories } from "@/components/marketing/Stories"

export const metadata: Metadata = {
  title: "CoachPro — Academy Management Software",
  alternates: {
    canonical: "https://coachpro.in",
  },
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Stories />
      <Pricing />
    </>
  )
}
