import { AppShell } from '@/components/layout/AppShell'
import { DashboardScreen } from '@/components/screens/DashboardScreen'

export const metadata = { title: 'Dashboard — MyHealth Vault+™' }

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardScreen />
    </AppShell>
  )
}
