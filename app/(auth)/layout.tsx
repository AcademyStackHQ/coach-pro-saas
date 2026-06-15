import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: {
    template: "%s | CoachPro",
    default: "CoachPro",
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8">
        <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
          CoachPro
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
