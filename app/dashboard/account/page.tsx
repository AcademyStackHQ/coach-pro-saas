import { getActiveSession } from '@/lib/activeSession'
import { AccountClient } from './AccountClient'

export const metadata = { title: 'Account — CoachPro' }

export default async function AccountPage() {
  // Any signed-in user can change their own password; just verify the session.
  await getActiveSession()
  return <AccountClient />
}
