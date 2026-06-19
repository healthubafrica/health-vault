import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Variant = 'success' | 'warning' | 'neutral' | 'emergency' | 'info' | 'green'

interface PillProps {
  variant?: Variant
  children: ReactNode
  className?: string
}

const variantClasses: Record<Variant, string> = {
  success:  'bg-[var(--color-success-bg)] text-[#6DC43F]',
  warning:  'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  neutral:  'bg-[var(--color-bg)] text-[var(--color-text-muted)]',
  emergency:'bg-[var(--color-error-bg)] text-[var(--color-emergency)]',
  info:     'bg-[#1E3A5F] text-[#6AADFF]',
  green:    'bg-[var(--color-success-bg)] text-[#6DC43F]',
}

export function Pill({ variant = 'neutral', children, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
