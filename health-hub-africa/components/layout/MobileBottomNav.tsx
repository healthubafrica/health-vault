'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, CalendarDays, Truck, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: 'Home', href: '/dashboard' },
  { icon: CalendarDays, label: 'Appts', href: '/appointments' },
  { icon: Truck, label: 'Dispatch', href: '/dispatch' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Cpu, label: 'AI', href: '/stride' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 flex items-center justify-around h-16 border-t z-40 safe-bottom"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {BOTTOM_NAV.map(({ icon: Icon, label, href }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors',
              active ? 'text-[#6DC43F]' : 'text-[var(--color-text-muted)]'
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
