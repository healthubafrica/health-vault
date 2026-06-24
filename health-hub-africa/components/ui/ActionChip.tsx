'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface ActionChipProps {
  icon: LucideIcon
  name: string
  description?: string
  emergency?: boolean
  onClick?: () => void
  className?: string
}

export function ActionChip({ icon: Icon, name, description, emergency, onClick, className }: ActionChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border text-left w-full transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
        className
      )}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
        style={{ background: emergency ? 'var(--color-error-bg)' : 'var(--color-success-bg)' }}
      >
        <Icon size={18} style={{ color: emergency ? 'var(--color-emergency)' : 'var(--color-success-text)' }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
          {name}
        </p>
        {description && (
          <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        )}
      </div>
    </button>
  )
}
