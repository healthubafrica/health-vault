'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAdminStore } from '@/lib/stores/adminStore'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  CalendarCheck,
  Video,
  FlaskConical,
  Ambulance,
  FileSearch,
  RefreshCw,
  AlertCircle,
  ScrollText,
  Building2,
  HeadphonesIcon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCircle,
  CreditCard,
  DollarSign,
  Stethoscope,
  Flag,
  Bell,
  Activity,
  CalendarClock,
  Newspaper,
  MessageSquareQuote,
  Settings,
  Network,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: string[]
  group?: string
}

const NAV: NavItem[] = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },

  // Provider-only section
  { label: 'My Sessions', href: '/provider/telecare', icon: Video, roles: ['provider'], group: 'Clinical' },
  { label: 'My Shifts', href: '/provider/shifts', icon: CalendarClock, roles: ['provider'], group: 'Clinical' },
  { label: 'My Appointments', href: '/provider/appointments', icon: CalendarCheck, roles: ['provider'], group: 'Clinical' },

  { label: 'Users', href: '/users', icon: Users, roles: ['admin', 'super_admin'], group: 'Management' },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'super_admin'], group: 'Management' },
  { label: 'Facilities', href: '/facilities', icon: Building2, roles: ['admin', 'super_admin'], group: 'Management' },
  { label: 'Patients', href: '/patients', icon: UserCircle, roles: ['admin', 'super_admin'], group: 'Management' },
  { label: 'Providers', href: '/providers', icon: Stethoscope, roles: ['admin', 'super_admin'], group: 'Management' },
  { label: 'Scheduling', href: '/scheduling', icon: Network, roles: ['admin', 'super_admin'], group: 'Management' },
  { label: 'Subscriptions', href: '/subscriptions', icon: CreditCard, roles: ['admin', 'super_admin'], group: 'Management' },
  { label: 'Payments', href: '/payments', icon: DollarSign, roles: ['admin', 'super_admin'], group: 'Management' },

  { label: 'Appointments', href: '/operations/appointments', icon: CalendarCheck, roles: ['admin', 'super_admin'], group: 'Operations' },
  { label: 'TeleCare', href: '/operations/telecare', icon: Video, roles: ['admin', 'super_admin'], group: 'Operations' },
  { label: 'Expert Review', href: '/operations/expert-review', icon: FileSearch, group: 'Operations' },
  { label: 'Dispatch', href: '/operations/dispatch', icon: Ambulance, roles: ['admin', 'super_admin'], group: 'Operations' },
  { label: 'Lab Orders', href: '/operations/labs', icon: FlaskConical, roles: ['admin', 'super_admin'], group: 'Operations' },
  { label: 'Clinical Queue', href: '/clinical-queue', icon: Activity, roles: ['admin', 'super_admin'], group: 'Operations' },

  { label: 'OpenEMR Sync', href: '/system/sync', icon: RefreshCw, roles: ['admin', 'super_admin'], group: 'System' },
  { label: 'Errors', href: '/system/errors', icon: AlertCircle, roles: ['admin', 'super_admin'], group: 'System' },
  { label: 'Audit Logs', href: '/system/audit-logs', icon: ScrollText, roles: ['super_admin'], group: 'System' },
  { label: 'Feature Flags', href: '/feature-flags', icon: Flag, roles: ['super_admin'], group: 'System' },
  { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['admin', 'super_admin'], group: 'System' },

  { label: 'Blog Posts', href: '/content/blog', icon: Newspaper, roles: ['admin', 'super_admin'], group: 'Content' },
  { label: 'Testimonials', href: '/content/testimonials', icon: MessageSquareQuote, roles: ['admin', 'super_admin'], group: 'Content' },

  { label: 'Settings', href: '/settings', icon: Settings, group: 'Other' },
  { label: 'Support', href: '/support', icon: HeadphonesIcon, group: 'Other' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useAdminStore()
  const { user } = useAuthStore()

  const visibleItems = NAV.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
  )

  const groups = ['', 'Clinical', 'Management', 'Operations', 'Content', 'System', 'Other']

  return (
    <aside
      className={cn(
        'flex-shrink-0 flex flex-col h-full border-r transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-56',
      )}
      style={{ background: 'var(--color-sidebar)', borderColor: 'var(--color-border)' }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <ShieldCheck className="w-5 h-5 text-[#6DC43F] flex-shrink-0" />
        {!sidebarCollapsed && (
          <span
            className="ml-2.5 text-sm font-bold tracking-tight truncate"
            style={{ color: 'var(--color-text)' }}
          >
            HHA Admin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 no-scrollbar">
        {groups.map((group) => {
          const items = visibleItems.filter((i) => (i.group ?? '') === group)
          if (!items.length) return null
          return (
            <div key={group} className="mb-1">
              {group && !sidebarCollapsed && (
                <p
                  className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--color-text-faint)' }}
                >
                  {group}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-[#6DC43F]/15 text-[#6DC43F]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]',
                      sidebarCollapsed && 'justify-center',
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'flex items-center border-t py-3 px-4 text-xs transition-colors duration-150',
          'hover:bg-[var(--color-bg)]',
          sidebarCollapsed && 'justify-center px-0',
        )}
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronLeft className="w-4 h-4 mr-2" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  )
}
