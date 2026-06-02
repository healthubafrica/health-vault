import { AppShell } from '@/components/layout/AppShell'
import { TeleCareScreen } from '@/components/screens/TeleCareScreen'

export const metadata = { title: 'TeleCare™ — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <TeleCareScreen />
    </AppShell>
  )
}
