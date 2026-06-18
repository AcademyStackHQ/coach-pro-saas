import { getMyStudentContext } from '@/lib/student'
import { ProfileClient } from './ProfileClient'

export const metadata = { title: 'My Profile — CoachPro' }

export default async function MyProfilePage() {
  // Redirects non-students; loads the caller's own record + academy.
  const { student, institution } = await getMyStudentContext()

  if (!student) {
    return (
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your student profile isn&apos;t linked yet. Please ask your academy to
          set it up.
        </p>
      </div>
    )
  }

  return <ProfileClient student={student} institution={institution} />
}
