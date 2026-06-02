import { AppShell } from '@/components/layout/AppShell'
import { SubscriptionsScreen } from '@/components/screens/SubscriptionsScreen'

export const metadata = { title: 'Subscriptions — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <SubscriptionsScreen />
    </AppShell>
  )
}
