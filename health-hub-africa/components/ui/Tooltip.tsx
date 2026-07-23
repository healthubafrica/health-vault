'use client'

import { ReactNode } from 'react'

interface TooltipProps {
  /** The explanatory text shown on hover/focus. */
  content: string
  children: ReactNode
  /** Which side the bubble renders on. Defaults to 'top'. */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** Use for longer explanations instead of a single nowrap line. */
  wide?: boolean
  className?: string
}

const SIDE_CLASSES: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

/** Hover/focus tooltip. Generalizes the pattern already used in Sidebar.tsx. */
export function Tooltip({ content, children, side = 'top', wide = false, className = '' }: TooltipProps) {
  return (
    <span className={`relative inline-flex group ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${SIDE_CLASSES[side]} px-2 py-1.5 rounded-md bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 ${
          wide ? 'w-56 whitespace-normal text-left' : 'whitespace-nowrap'
        }`}
      >
        {content}
      </span>
    </span>
  )
}
