'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Inbox, Plus, RefreshCw, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ElementType
  badgeText?: string
  primaryActionLabel?: string
  onPrimaryAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  variant?: 'card' | 'inline' | 'full'
  className?: string
}

export function EmptyState({
  title = 'No records found',
  description = 'There are no items to display right now. Get started by creating a new entry.',
  icon: Icon = Inbox,
  badgeText,
  primaryActionLabel = 'Add New',
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'card',
  className = '',
}: EmptyStateProps) {
  const containerClasses = {
    card: 'p-8 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm text-center flex flex-col items-center justify-center max-w-md mx-auto',
    inline: 'p-5 rounded-[16px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/50 text-center flex flex-col sm:flex-row items-center justify-between gap-4',
    full: 'py-20 px-6 min-h-[420px] rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-xl mx-auto',
  }[variant]

  if (variant === 'inline') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`${containerClasses} ${className}`}
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)]">{title}</h4>
            <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">{description}</p>
          </div>
        </div>
        {onPrimaryAction && (
          <Button size="sm" onClick={onPrimaryAction} className="shrink-0 gap-1.5">
            <Plus size={14} />
            {primaryActionLabel}
          </Button>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`${containerClasses} ${className}`}
    >
      <div className="relative mb-4">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] shadow-inner"
        >
          <Icon className="w-8 h-8" />
        </motion.div>

        {badgeText && (
          <span className="absolute -top-2 -right-2 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--color-gold)] text-white shadow-sm">
            {badgeText}
          </span>
        )}
      </div>

      <h3 className="text-base font-bold text-[var(--color-text)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--color-text-muted)] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(onPrimaryAction || onSecondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onSecondaryAction && secondaryActionLabel && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {onPrimaryAction && (
            <Button size="sm" onClick={onPrimaryAction} className="gap-1.5">
              <Plus size={14} />
              {primaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}
