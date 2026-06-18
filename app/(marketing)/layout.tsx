import type { Metadata } from "next"
import { Navbar } from "@/components/marketing/Navbar"
import { Footer } from "@/components/marketing/Footer"

export const metadata: Metadata = {
  title: {
    default: "CoachPro — Academy Management Software",
    template: "%s | CoachPro",
  },
  description:
    "Manage student enrolments, batch schedules, fee collection, and parent communication for your coaching & teaching academy. Free to start.",
  keywords: ["academy management software", "coaching management", "student fee management India"],
  openGraph: {
    title: "CoachPro — Run your coaching academy from one place",
    description:
      "Cloud platform for coaching & teaching academies. Enrolments, scheduling, fees, and SMS — all in one place.",
    url: "https://coachpro.in",
    siteName: "CoachPro",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CoachPro — Academy Management",
    description: "Cloud platform for coaching academies and institutes.",
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "CoachPro",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
              description: "Free plan available",
            },
            description:
              "Cloud platform for coaching & teaching academies to manage students, schedules, fees, and communications.",
          }),
        }}
      />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
