"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/stories", label: "Stories" },
]

export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center text-lg font-bold tracking-tight">
          <span className="text-blue-600">Coach</span>Pro
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
            )}
          >
            Start free →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="right" showCloseButton={false}>
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-4">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="text-lg font-bold tracking-tight"
                >
                  <span className="text-blue-600">Coach</span>Pro
                </Link>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 p-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                      pathname === link.href
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* CTAs */}
              <div className="mt-auto flex flex-col gap-2 border-t p-4">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants(),
                    "w-full justify-center bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                  )}
                >
                  Start free →
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
