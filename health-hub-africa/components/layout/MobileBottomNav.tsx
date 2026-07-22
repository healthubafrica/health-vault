'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  User, 
  CalendarDays, 
  Truck, 
  Menu, 
  FolderOpen, 
  Lock, 
  FlaskConical, 
  Video, 
  CreditCard, 
  Receipt, 
  Cpu,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags'

const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: 'Home', href: '/dashboard' },
  { icon: CalendarDays, label: 'Appts', href: '/appointments' },
  { icon: Truck, label: 'Dispatch', href: '/dispatch', flag: 'dispatch_enabled' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Menu, label: 'More', isAction: true },
]

const MORE_NAV_ITEMS = [
  { icon: FolderOpen, label: 'Records', href: '/records' },
  { icon: Lock, label: 'My Vault', href: '/vault' },
  { icon: FlaskConical, label: 'Labs', href: '/labs', flag: 'lab_orders_enabled' },
  { icon: Video, label: 'TeleCare', href: '/telecare', flag: 'teleconsult_enabled' },
  { icon: CreditCard, label: 'Plans', href: '/subscriptions' },
  { icon: Receipt, label: 'Payments', href: '/payments' },
  { icon: Cpu, label: 'STRIDE™ AI', href: '/stride', flag: 'neuroflex_enabled' },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { isEnabled } = useFeatureFlags()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 flex items-center justify-around h-16 border-t z-50 pb-[env(safe-area-inset-bottom)]"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {BOTTOM_NAV.filter(({ flag }) => !flag || isEnabled(flag)).map(({ icon: Icon, label, href, isAction }) => {
          const active = href ? pathname === href : isMoreOpen
          
          if (isAction) {
            return (
              <button
                key={label}
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors outline-none',
                  active ? 'text-[#6DC43F]' : 'text-[var(--color-text-muted)]'
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            )
          }

          return (
            <Link
              key={href}
              href={href!}
              onClick={() => setIsMoreOpen(false)}
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

      <AnimatePresence>
        {isMoreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMoreOpen(false)}
            />
            
            {/* Floating Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+1rem)] inset-x-4 z-40 rounded-3xl overflow-hidden shadow-2xl md:hidden border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="p-5 pb-6">
                <div className="flex items-center justify-between mb-5 px-1">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Menu</h3>
                  <button 
                    onClick={() => setIsMoreOpen(false)}
                    className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={18} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                </div>
                
                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                  {MORE_NAV_ITEMS.filter(({ flag }) => !flag || isEnabled(flag)).map(({ icon: Icon, label, href }) => {
                    const active = pathname === href
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setIsMoreOpen(false)}
                        className="flex flex-col items-center gap-2 text-center group"
                      >
                        <div 
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                            active 
                              ? "bg-[#6DC43F]/15 text-[#6DC43F] shadow-sm" 
                              : "bg-black/5 text-[var(--color-text)] dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10"
                          )}
                        >
                          <Icon size={24} strokeWidth={active ? 2.5 : 1.8} />
                        </div>
                        <span 
                          className="text-[10px] font-semibold leading-tight max-w-[60px]"
                          style={{ color: active ? '#6DC43F' : 'var(--color-text-muted)' }}
                        >
                          {label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
