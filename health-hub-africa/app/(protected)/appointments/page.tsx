import { Suspense } from 'react'
import { AppointmentsScreen } from '@/components/screens/AppointmentsScreen'

export const metadata = { title: 'Appointments — MyHealth Vault+™' }

export default function Page() {
  return (
    <Suspense>
      <AppointmentsScreen />
    </Suspense>
  )
}
