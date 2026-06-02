import { AppShell } from '@/components/layout/AppShell'
import { PaymentsScreen } from '@/components/screens/PaymentsScreen'

export const metadata = { title: 'Payments — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <PaymentsScreen />
    </AppShell>
  )
}
