import { cn } from '@/lib/utils'

interface IdChipProps {
  children: string
  dark?: boolean
  className?: string
}

export function IdChip({ children, dark, className }: IdChipProps) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono', className)}
      style={{
        background: dark ? 'var(--color-primary-dark)' : 'var(--color-bg)',
        color: dark ? '#fff' : 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </span>
  )
}
