import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ListRowProps {
  title: string
  subtitle?: string
  right?: ReactNode
  left?: ReactNode
  className?: string
  onClick?: () => void
}

export function ListRow({ title, subtitle, right, left, className, onClick }: ListRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2.5 border-b last:border-b-0',
        onClick && 'cursor-pointer hover:bg-[var(--color-bg)] rounded-xl px-2 -mx-2',
        className,
      )}
      style={{ borderColor: 'var(--color-border)' }}
      onClick={onClick}
    >
      {left && <div className="shrink-0">{left}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
