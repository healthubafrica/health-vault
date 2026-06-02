import { AppShell } from '@/components/layout/AppShell'
import { AppointmentsScreen } from '@/components/screens/AppointmentsScreen'

export const metadata = { title: 'Appointments — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <AppointmentsScreen />
    </AppShell>
  )
}
