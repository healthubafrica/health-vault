'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { useAppStore } from '@/lib/store'

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
}

export function MobilePanelSheet() {
  const pathname = usePathname()
  const { isMobilePanelOpen, closeMobilePanel } = useAppStore()
  const Panel = panels[pathname]

  if (!isMobilePanelOpen || !Panel) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="lg:hidden fixed inset-0 bg-black/50 z-40"
        onClick={closeMobilePanel}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Info panel"
        className="lg:hidden fixed inset-y-0 right-0 w-[320px] max-w-full z-50 overflow-y-auto no-scrollbar shadow-2xl"
        style={{ background: 'var(--color-panel)' }}
      >
        <div className="flex items-center justify-end p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <button
            aria-label="Close panel"
            onClick={closeMobilePanel}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--color-border)] transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
        <Panel />
      </div>
    </>
  )
}
