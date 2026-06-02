import { AppShell } from '@/components/layout/AppShell'
import { StrideScreen } from '@/components/screens/StrideScreen'

export const metadata = { title: 'STRIDE™ AI — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <StrideScreen />
    </AppShell>
  )
}
