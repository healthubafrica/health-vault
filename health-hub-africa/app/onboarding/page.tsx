import { Suspense } from 'react'
import { OnboardingScreen } from '@/components/screens/OnboardingScreen'

export const metadata = { title: 'Patient Onboarding — MyHealth Vault+™' }

export default function OnboardingPage() {
  return (
    // OnboardingScreen reads useSearchParams() (for ?ref= referral capture),
    // which requires a Suspense boundary in the App Router.
    <Suspense fallback={null}>
      <OnboardingScreen />
    </Suspense>
  )
}
