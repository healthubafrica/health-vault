'use client'

import React from 'react'
import type { EmptyArtKey } from '@/lib/emptyArt'
import { EmptyArt } from './EmptyArt'

interface EmptyHintProps {
  art: EmptyArtKey
  children: React.ReactNode
  /** Artwork size in px. */
  size?: number
  /** Stack the art above the text (for tall spots) instead of beside it. */
  stacked?: boolean
  className?: string
}

/** Compact empty message for panels and charts: small still artwork next to the text. */
export function EmptyHint({ art, children, size = 56, stacked = false, className = '' }: EmptyHintProps) {
  return (
    <div
      className={`flex ${stacked ? 'flex-col' : 'flex-row'} items-center justify-center gap-2 text-center ${className}`}
    >
      <EmptyArt name={art} size={size} still />
      <div className="text-xs font-medium text-[var(--color-text-muted)]">{children}</div>
    </div>
  )
}
