import { AppShell } from '@/components/layout/AppShell'
import { VaultScreen } from '@/components/screens/VaultScreen'

export const metadata = { title: 'My Vault — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <VaultScreen />
    </AppShell>
  )
}
