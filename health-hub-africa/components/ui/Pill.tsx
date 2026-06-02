import { cn } from '@/lib/utils'

type PillVariant = 'success' | 'warning' | 'neutral' | 'emergency' | 'green' | 'phase' | 'info'

interface PillProps {
  variant?: PillVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<PillVariant, { bg: string; text: string }> = {
  success: { bg: 'var(--color-success-bg)', text: '#006022' },
  green: { bg: 'var(--color-success-bg)', text: '#006022' },
  warning: { bg: 'var(--color-warning-bg)', text: '#92610a' },
  neutral: { bg: 'var(--color-bg)', text: 'var(--color-text-muted)' },
  emergency: { bg: 'var(--color-error-bg)', text: 'var(--color-emergency)' },
  phase: { bg: '#e8eaf6', text: '#3949ab' },
  info: { bg: '#e3f2fd', text: '#1565c0' },
}

export function Pill({ variant = 'neutral', children, className }: PillProps) {
  const { bg, text } = variantStyles[variant]
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', className)}
      style={{ background: bg, color: text }}
    >
      {children}
    </span>
  )
}
