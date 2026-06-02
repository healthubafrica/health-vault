'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

const panels: Record<string, React.ComponentType> = {
  '/dashboard': dynamic(() => import('@/components/panels/DashboardPanel').then(m => ({ default: m.DashboardPanel }))),
  '/profile': dynamic(() => import('@/components/panels/ProfilePanel').then(m => ({ default: m.ProfilePanel }))),
  '/appointments': dynamic(() => import('@/components/panels/AppointmentsPanel').then(m => ({ default: m.AppointmentsPanel }))),
  '/records': dynamic(() => import('@/components/panels/RecordsPanel').then(m => ({ default: m.RecordsPanel }))),
  '/labs': dynamic(() => import('@/components/panels/LabsPanel').then(m => ({ default: m.LabsPanel }))),
  '/telecare': dynamic(() => import('@/components/panels/TeleCarePanel').then(m => ({ default: m.TeleCarePanel }))),
  '/dispatch': dynamic(() => import('@/components/panels/DispatchPanel').then(m => ({ default: m.DispatchPanel }))),
  '/subscriptions': dynamic(() => import('@/components/panels/SubscriptionsPanel').then(m => ({ default: m.SubscriptionsPanel }))),
  '/payments': dynamic(() => import('@/components/panels/PaymentsPanel').then(m => ({ default: m.PaymentsPanel }))),
  '/stride': dynamic(() => import('@/components/panels/StridePanel').then(m => ({ default: m.StridePanel }))),
  '/settings': dynamic(() => import('@/components/panels/SettingsPanel').then(m => ({ default: m.SettingsPanel }))),
}

export function RightPanel() {
  const pathname = usePathname()
  const Panel = panels[pathname]

  if (!Panel) return null

  return (
    <aside
      className="hidden lg:flex flex-col w-[320px] shrink-0 h-full overflow-y-auto no-scrollbar rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-[var(--color-border)]"
      style={{
        background: 'var(--color-panel)',
      }}
    >
      <Panel />
    </aside>
  )
}
