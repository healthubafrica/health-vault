import { AppShell } from '@/components/layout/AppShell'
import { RecordsScreen } from '@/components/screens/RecordsScreen'

export const metadata = { title: 'Records — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <RecordsScreen />
    </AppShell>
  )
}
