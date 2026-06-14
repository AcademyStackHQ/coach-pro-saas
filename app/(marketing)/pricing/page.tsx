import type { Metadata } from "next"
import { Pricing } from "@/components/marketing/Pricing"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing. Start free with up to 15 students. Upgrade to Pro for unlimited everything.",
  alternates: { canonical: "https://coachpro.in/pricing" },
}

export default function PricingPage() {
  return <Pricing />
}
