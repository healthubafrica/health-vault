'use client'

import { usePathname } from 'next/navigation'
import { Bell, PanelRightOpen, Search } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Avatar } from '@/components/ui/Avatar'
import { patients, subscriptions } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'

const BREADCRUMBS: Record<string, string[]> = {
  '/dashboard': ['MyHealth Vault+™', 'Dashboard'],
  '/profile': ['MyHealth Vault+™', 'Profile'],
  '/appointments': ['MyHealth Vault+™', 'Appointments'],
  '/records': ['MyHealth Vault+™', 'Clinical Records'],
  '/labs': ['MyHealth Vault+™', 'CareTest™ Labs'],
  '/telecare': ['MyHealth Vault+™', 'TeleCare™'],
  '/dispatch': ['MyHealth Vault+™', 'DispatchCare™'],
  '/subscriptions': ['MyHealth Vault+™', 'Subscriptions'],
  '/payments': ['MyHealth Vault+™', 'Payments'],
  '/stride': ['MyHealth Vault+™', 'STRIDE™ AI'],
}

export function Topbar() {
  const pathname = usePathname()
  const openMobilePanel = useAppStore((s) => s.openMobilePanel)
  const crumbs = BREADCRUMBS[pathname] ?? ['MyHealth Vault+™']
  const { data: profileRes } = useApi(() => patients.getMyProfile())
  const { data: subRes } = useApi(() => subscriptions.getMy())

  const profile = profileRes?.data
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : 'User'
  const planName = subRes?.data?.plan?.name ?? 'Free'

  return (
    <header
      className="flex items-center justify-between gap-3 h-16 px-6 shrink-0 border-b"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Search Input Bar */}
      <div
        className="flex items-center gap-2 w-full max-w-[260px] h-10 px-4 rounded-full text-sm border"
        style={{
          background: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Search size={15} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search anything here"
          className="bg-transparent border-none outline-none text-xs text-[var(--color-text)] placeholder-gray-400 w-full"
        />
      </div>

      {/* Screen Title */}
      <div className="hidden md:flex items-center justify-center flex-1">
        <span className="text-base font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
          {crumbs[crumbs.length - 1] || 'Dashboard'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search Icon Button */}
        <button
          aria-label="Search"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-bg)] text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Search size={15} />
        </button>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-bg)] text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Bell size={15} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C0392B]" aria-hidden="true" />
        </button>

        {/* User Avatar */}
        <div
          aria-label={`Logged in as ${displayName}`}
          className="shrink-0 cursor-pointer shadow-sm rounded-full overflow-hidden border border-[var(--color-border)] flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Avatar seed={displayName} size="sm" shape="circle" />
        </div>

        {/* Plan badge */}
        <span
          className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#bb9f58]/15 text-[#9a7d3a] border border-[#bb9f58]/20 shadow-sm cursor-default"
        >
          {planName} Plan
        </span>

        {/* Mobile panel toggle */}
        <button
          aria-label="Open info panel"
          onClick={openMobilePanel}
          className="flex lg:hidden items-center justify-center w-9 h-9 rounded-full bg-[var(--color-bg)] text-gray-500 hover:text-gray-800 transition-colors"
        >
          <PanelRightOpen size={15} />
        </button>
      </div>
    </header>
  )
}
