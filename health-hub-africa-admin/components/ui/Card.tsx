import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border', padding && 'p-5', className)}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={cn('text-sm font-semibold mb-4', className)}
      style={{ color: 'var(--color-text)' }}
    >
      {children}
    </h3>
  )
}
