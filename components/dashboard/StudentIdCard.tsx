import { Building2 } from 'lucide-react'

export type StudentIdCardProps = {
  fullName: string
  callingName: string | null
  studentCode: string | null
  photoUrl: string | null
  status: 'active' | 'inactive'
  academyName: string
  academyLogoUrl: string | null
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * A student's "digital ID" — photo/initials, name, the student code (their
 * login handle), and academy branding. Presentational only, so it works in
 * both server and client trees. Reused by the overview and profile pages.
 */
export function StudentIdCard({
  fullName,
  callingName,
  studentCode,
  photoUrl,
  status,
  academyName,
  academyLogoUrl,
}: StudentIdCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-sm">
      {/* Academy header */}
      <div className="mb-5 flex items-center gap-2">
        {academyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote image domains aren't configured for next/image
          <img
            src={academyLogoUrl}
            alt={academyName}
            className="size-6 rounded object-cover"
          />
        ) : (
          <div className="flex size-6 items-center justify-center rounded bg-white/20">
            <Building2 className="size-3.5" />
          </div>
        )}
        <span className="truncate text-sm font-semibold tracking-wide">
          {academyName}
        </span>
        <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
          {status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote image domains aren't configured for next/image
          <img
            src={photoUrl}
            alt={fullName}
            className="size-16 shrink-0 rounded-full object-cover ring-2 ring-white/40"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold ring-2 ring-white/40">
            {initials(fullName)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight">{fullName}</p>
          {callingName && (
            <p className="truncate text-sm text-primary-foreground/80">
              “{callingName}”
            </p>
          )}
          <p className="mt-1 font-mono text-sm font-semibold tracking-widest text-primary-foreground/90">
            {studentCode ?? '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
