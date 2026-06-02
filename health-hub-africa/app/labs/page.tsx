import { AppShell } from '@/components/layout/AppShell'
import { LabsScreen } from '@/components/screens/LabsScreen'

export const metadata = { title: 'CareTest™ Labs — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <LabsScreen />
    </AppShell>
  )
}
