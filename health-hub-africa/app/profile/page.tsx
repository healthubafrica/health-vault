import { AppShell } from '@/components/layout/AppShell'
import { ProfileScreen } from '@/components/screens/ProfileScreen'

export const metadata = { title: 'Profile — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <ProfileScreen />
    </AppShell>
  )
}
