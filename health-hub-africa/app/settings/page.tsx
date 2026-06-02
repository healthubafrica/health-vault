import { AppShell } from '@/components/layout/AppShell'
import { SettingsScreen } from '@/components/screens/SettingsScreen'

export const metadata = { title: 'Settings — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <SettingsScreen />
    </AppShell>
  )
}
