import { Suspense } from 'react'
import { PaymentVerifyScreen } from '@/components/screens/PaymentVerifyScreen'

export const metadata = { title: 'Confirming Payment — MyHealth Vault+™' }

export default function Page() {
  return (
    <Suspense>
      <PaymentVerifyScreen />
    </Suspense>
  )
}
