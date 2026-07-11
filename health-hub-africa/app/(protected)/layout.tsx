import { AppShell } from '@/components/layout/AppShell'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PageViewTracker />
      {children}
    </AppShell>
  )
}
