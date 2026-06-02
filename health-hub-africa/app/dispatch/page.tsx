import { AppShell } from '@/components/layout/AppShell'
import { DispatchScreen } from '@/components/screens/DispatchScreen'

export const metadata = { title: 'DispatchCare™ — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <DispatchScreen />
    </AppShell>
  )
}
