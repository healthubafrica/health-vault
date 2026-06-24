import { Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PaymentVerifyScreen } from '@/components/screens/PaymentVerifyScreen'

export const metadata = { title: 'Confirming Payment — MyHealth Vault+™' }

export default function Page() {
  return (
    <AppShell>
      <Suspense>
        <PaymentVerifyScreen />
      </Suspense>
    </AppShell>
  )
}
