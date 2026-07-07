'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  User,
  CalendarDays,
  FolderOpen,
  Lock,
  FlaskConical,
  Video,
  Truck,
  Plane,
  CreditCard,
  Receipt,
  Cpu,
  Settings,
  Sun,
  Moon,
  Siren,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/authStore'
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags'
import { useSettingsStore } from '@/lib/settingsStore'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: CalendarDays, label: 'Appointments', href: '/appointments' },
  { icon: FolderOpen, label: 'Records', href: '/records' },
  { icon: Lock, label: 'My Vault', href: '/vault' },
  { icon: FlaskConical, label: 'CareTest™ Labs', href: '/labs', flag: 'lab_orders_enabled' },
  { icon: Video, label: 'TeleCare™', href: '/telecare', flag: 'teleconsult_enabled' },
  { icon: Truck, label: 'DispatchCare™', href: '/dispatch', flag: 'dispatch_enabled' },
  { icon: Plane, label: 'TravelSafe™', href: '/travelsafe', flag: 'travelsafe_enabled' },
  { icon: CreditCard, label: 'Subscriptions', href: '/subscriptions' },
  { icon: Receipt, label: 'Payments', href: '/payments' },
  { icon: Cpu, label: 'STRIDE™ AI', href: '/stride', flag: 'neuroflex_enabled' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isCollapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const setCollapsed = useSettingsStore((s) => s.set)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()
  const { isEnabled } = useFeatureFlags()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const toggleCollapsed = () => setCollapsed({ sidebarCollapsed: !isCollapsed })

  // Avoid hydration mismatch (theme from next-themes is undefined on the server)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a skeleton placeholder sidebar of collapsed width
    return (
      <aside className="hidden md:flex flex-col w-[72px] shrink-0 h-full rounded-[28px] border border-[var(--color-border)] bg-[var(--color-sidebar)]" />
    )
  }

  const getLogoSrc = () => {
    const isDark = theme === 'dark'
    if (isCollapsed) {
      return isDark ? '/logo-icon-white.png' : '/logo-icon.png'
    } else {
      return isDark ? '/logo-white.png' : '/logo.png'
    }
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 h-full rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-[var(--color-border)] transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[72px]" : "w-[220px]"
      )}
      style={{ background: 'var(--color-sidebar)' }}
    >
      {/* Logo Area */}
      <div className={cn("flex items-center shrink-0 mt-4 h-16 transition-all duration-300", isCollapsed ? "justify-center px-2" : "justify-start px-5")}>
        <Link href="/dashboard" className="flex items-center justify-center">
          <img
            src={getLogoSrc()}
            alt="Health-Hub Africa®"
            className={cn(
              "object-contain transition-all duration-200 hover:scale-105",
              isCollapsed ? "w-10 h-10" : "h-7 w-auto"
            )}
          />
        </Link>
      </div>

      {/* Nav Link List */}
      <nav className={cn("flex-1 flex flex-col gap-1 py-2 overflow-y-auto no-scrollbar transition-all duration-300", isCollapsed ? "items-center px-2" : "px-3")}>
        {NAV_ITEMS.filter(({ flag }) => !flag || isEnabled(flag)).map(({ icon: Icon, label, href }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              title={isCollapsed ? label : undefined}
              className={cn(
                'group relative flex items-center transition-all duration-150',
                isCollapsed 
                  ? 'justify-center w-11 h-11 rounded-2xl' 
                  : 'justify-start gap-3 w-full h-11 px-3.5 rounded-2xl',
                active
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
              
              {/* Menu text (visible only when expanded) */}
              {!isCollapsed && (
                <span className="text-xs font-bold whitespace-nowrap transition-opacity duration-150">
                  {label}
                </span>
              )}

              {/* Hover Tooltip (visible only when collapsed) */}
              {isCollapsed && (
                <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Actions Area */}
      <div className={cn("flex flex-col gap-2 pb-4 pt-2 border-t border-[var(--color-border)]", isCollapsed ? "items-center px-2" : "px-3")}>
        
        {/* Toggle Collapse Button */}
        <button
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu"}
          title={isCollapsed ? "Expand Menu" : undefined}
          className={cn(
            "group relative flex items-center rounded-2xl text-gray-400 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer",
            isCollapsed ? "justify-center w-11 h-11" : "justify-start gap-3 w-full h-11 px-3.5"
          )}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span className="text-xs font-bold">Collapse Menu</span>}
          {isCollapsed && (
            <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              Expand Menu
            </span>
          )}
        </button>

        {/* Settings Link */}
        <Link
          href="/settings"
          aria-label="Settings"
          title={isCollapsed ? "Settings" : undefined}
          className={cn(
            "group relative flex items-center rounded-2xl transition-all duration-150",
            isCollapsed ? "justify-center w-11 h-11" : "justify-start gap-3 w-full h-11 px-3.5",
            pathname === '/settings'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800'
          )}
        >
          <Settings size={18} strokeWidth={pathname === '/settings' ? 2.5 : 1.8} />
          {!isCollapsed && <span className="text-xs font-bold">Settings</span>}
          {isCollapsed && (
            <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              Settings
            </span>
          )}
        </Link>

        {/* Theme Toggle Button */}
        <button
          aria-label="Toggle dark mode"
          title={isCollapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            "group relative flex items-center rounded-2xl text-gray-400 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer",
            isCollapsed ? "justify-center w-11 h-11" : "justify-start gap-3 w-full h-11 px-3.5"
          )}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          {!isCollapsed && <span className="text-xs font-bold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          {isCollapsed && (
            <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          aria-label="Sign out"
          title={isCollapsed ? "Sign Out" : undefined}
          className={cn(
            "group relative flex items-center rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-all duration-150 cursor-pointer",
            isCollapsed ? "justify-center w-11 h-11" : "justify-start gap-3 w-full h-11 px-3.5"
          )}
        >
          <LogOut size={18} strokeWidth={1.8} />
          {!isCollapsed && <span className="text-xs font-bold">Sign Out</span>}
          {isCollapsed && (
            <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              Sign Out
            </span>
          )}
        </button>

        {/* Emergency Siren button — only shown when dispatch is enabled */}
        {isEnabled('dispatch_enabled') && <div className="relative mt-1">
          <Link
            href="/dispatch"
            aria-label="Emergency dispatch"
            title={isCollapsed ? "Emergency Dispatch" : undefined}
            className={cn(
              "relative z-10 flex items-center rounded-full bg-[#C0392B] text-white hover:bg-[#a93226] transition-all duration-150 cursor-pointer",
              isCollapsed ? "justify-center w-11 h-11" : "justify-start gap-3 w-full h-11 px-3.5"
            )}
          >
            <Siren size={18} className="shrink-0" />
            {!isCollapsed && <span className="text-xs font-extrabold uppercase tracking-wider text-white">Emergency</span>}
          </Link>
          {/* Pulse rings (rendered only when collapsed for neatness) */}
          {isCollapsed && [0, 0.65].map((delay) => (
            <motion.span
              key={delay}
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[#C0392B]"
              animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, delay, ease: 'easeOut' }}
            />
          ))}
        </div>}

      </div>
    </aside>
  )
}
