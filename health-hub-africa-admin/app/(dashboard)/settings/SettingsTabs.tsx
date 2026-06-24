'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { useAuthStore } from '@/lib/stores/authStore'
import { AccountSecurityTab } from './tabs/AccountSecurityTab'
import { NotificationsTab } from './tabs/NotificationsTab'
import { AppearanceTab } from './tabs/AppearanceTab'
import { SessionsTab } from './tabs/SessionsTab'
import { SystemTab } from './tabs/SystemTab'

const PERSONAL_TABS = ['Account & Security', 'Notifications', 'Appearance', 'Sessions'] as const
const SYSTEM_TAB = 'System'

// Maps tab labels → ?tab= query param tokens. Stable across renames.
const TAB_SLUGS: Record<string, string> = {
  'Account & Security': 'account',
  Notifications: 'notifications',
  Appearance: 'appearance',
  Sessions: 'sessions',
  System: 'system',
}
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

export function SettingsTabs() {
  const router = useRouter()
  const params = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const tabs = useMemo(
    () => [...PERSONAL_TABS, ...(isSuperAdmin ? [SYSTEM_TAB] : [])],
    [isSuperAdmin],
  )

  // Tab resolution: query param → fallback to first tab. If a non-super_admin
  // deep-links ?tab=system, we transparently drop to Account & Security so
  // the SystemTab's own role guard isn't the only line of defence.
  const requested = SLUG_TO_TAB[params.get('tab') ?? '']
  const active = tabs.includes(requested) ? requested : tabs[0]

  const handleChange = (next: string) => {
    const slug = TAB_SLUGS[next]
    const search = new URLSearchParams(params.toString())
    search.set('tab', slug)
    router.replace(`/settings?${search.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-5">
      <FilterTabs tabs={tabs} active={active} onChange={handleChange} />

      {active === 'Account & Security' && <AccountSecurityTab />}
      {active === 'Notifications' && <NotificationsTab />}
      {active === 'Appearance' && <AppearanceTab />}
      {active === 'Sessions' && <SessionsTab />}
      {active === 'System' && <SystemTab />}
    </div>
  )
}
