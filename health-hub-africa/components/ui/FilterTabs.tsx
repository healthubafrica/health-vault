'use client'

import { cn } from '@/lib/utils'

interface FilterTabsProps {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
  className?: string
}

export function FilterTabs({ tabs, active, onChange, className }: FilterTabsProps) {
  return (
    <div
      className={cn('flex gap-1 p-1 rounded-xl', className)}
      role="tablist"
      style={{ background: 'var(--color-bg)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            active === tab
              ? 'bg-[#6DC43F] text-white shadow-sm'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
