'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, PanelRightOpen, Search, LogOut } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Avatar } from '@/components/ui/Avatar'
import { patients, subscriptions } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { useAuthStore } from '@/lib/stores/authStore'

// Tier → badge palette. Matches the website plan cards: gold for GoldCare,
// silver for SilverCare, deep-green for Concierge, mint for BasicCare,
// neutral slate for Free. Keep the bg ≥10% opacity so the chip reads on
// both light and dark surfaces.
type TierStyle = { bg: string; fg: string; border: string }
const TIER_STYLES: Record<string, TierStyle> = {
  Free:          { bg: 'rgba(122,140,132,0.12)', fg: '#41584E', border: 'rgba(122,140,132,0.28)' },
  BasicCare:     { bg: 'rgba(109,196,63,0.14)',  fg: '#137333', border: 'rgba(109,196,63,0.32)' },
  SilverCare:    { bg: 'rgba(157,170,180,0.18)', fg: '#3F4E58', border: 'rgba(157,170,180,0.40)' },
  GoldCare:      { bg: 'rgba(187,159,88,0.15)',  fg: '#9A7D3A', border: 'rgba(187,159,88,0.32)' },
  ConciergeCare: { bg: 'rgba(7,37,28,0.10)',     fg: '#07251C', border: 'rgba(7,37,28,0.30)' },
}

// "BasicCare" / "GoldCare™" / "Free" → matches a TierStyle key.
function tierKeyFor(tier: string | undefined, name: string | undefined): keyof typeof TIER_STYLES {
  const normalised = (tier ?? name ?? '').replace(/[™\s]/g, '')
  if (normalised in TIER_STYLES) return normalised as keyof typeof TIER_STYLES
  return 'Free'
}

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
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const profile = profileRes?.data
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : 'User'
  const planName = subRes?.data?.plan?.name ?? 'Free'
  const planTier = subRes?.data?.plan?.tier
  const tierStyle = TIER_STYLES[tierKeyFor(planTier, planName)]

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

        {/* Plan badge — colour follows the active tier */}
        <span
          className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm cursor-default border"
          style={{
            background: tierStyle.bg,
            color: tierStyle.fg,
            borderColor: tierStyle.border,
          }}
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

        {/* Sign Out — mobile only (sidebar handles desktop) */}
        <button
          aria-label="Sign out"
          onClick={handleLogout}
          className="flex md:hidden items-center justify-center w-9 h-9 rounded-full bg-[var(--color-bg)] text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
