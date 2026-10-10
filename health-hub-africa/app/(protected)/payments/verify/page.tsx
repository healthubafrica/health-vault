import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PaymentVerifyScreen } from '@/components/screens/PaymentVerifyScreen'
import { mobileReturnUrl } from '@/lib/payments/mobileReturn'

export const metadata = { title: 'Confirming Payment — MyHealth Vault+™' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Mobile checkout returns here with client=mobile; hand off to the app.
  const deepLink = mobileReturnUrl(await searchParams)
  if (deepLink) redirect(deepLink)

  return (
    <Suspense>
      <PaymentVerifyScreen />
    </Suspense>
  )
}
