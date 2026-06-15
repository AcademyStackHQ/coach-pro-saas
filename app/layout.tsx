import type { Metadata } from "next"
import { Inter, Outfit } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

const outfit = Outfit({
  variable: "--font-heading-src",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://coachpro.in"),
  title: "CoachPro — Sports Academy Management Software",
  description:
    "Manage student enrolments, batch schedules, fee collection, and parent communication for your sports coaching academy. Free to start.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
