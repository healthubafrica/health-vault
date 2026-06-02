import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  dashed?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

export function Card({ dashed, padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-colors',
        dashed
          ? 'border-2 border-dashed'
          : 'border shadow-sm',
        paddingClasses[padding],
        className
      )}
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-sm font-bold mb-3', className)}
      style={{ color: 'var(--color-text)' }}
      {...props}
    >
      {children}
    </h2>
  )
}
