export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="h-14 flex items-center px-6 border-b bg-background shrink-0">
        <span className="font-bold text-lg tracking-tight">CoachPro</span>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  )
}
