'use client'

import { useEffect, useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { AVATAR_COLORS, AVATAR_PATHS, AVATAR_SKIN, avatarArtFor, getInitials, type AvatarArt } from '@/lib/avatar'

type Size = 'xs' | 'sm' | 'md' | 'lg'

interface AvatarProps {
  name?: string
  src?: string | null
  gender?: string | null
  size?: Size
  className?: string
  /** Called when the photo fails to load (e.g. expired signed URL) so the owner can refetch. */
  onImageError?: () => void
}

const sizeClasses: Record<Size, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm',
}

function GenderArt({ art, className }: { art: AvatarArt; className?: string }) {
  const clipId = useId()
  const c = AVATAR_COLORS[art]
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="48" cy="48" r="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <circle cx="48" cy="48" r="48" fill={c.bg} />
        <path d={AVATAR_PATHS.shoulders} fill={c.shirt} />
        <rect x="42" y="54" width="12" height="14" rx="5" fill={AVATAR_SKIN} />
        {art === 'female' && <path d={AVATAR_PATHS.femaleHairBehind} fill={c.hair} />}
        <circle cx="48" cy="40" r="16" fill={AVATAR_SKIN} />
        <path d={AVATAR_PATHS.hairFront[art]} fill={c.hair} />
      </g>
    </svg>
  )
}

export function Avatar({ name, src, gender, size = 'md', className, onImageError }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  const base = cn('rounded-full flex-shrink-0', sizeClasses[size], className)
  const label = name || 'avatar'

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        referrerPolicy="no-referrer"
        onError={() => {
          setFailed(true)
          onImageError?.()
        }}
        className={cn(base, 'object-cover')}
      />
    )
  }

  const art = avatarArtFor(gender)
  if (art) {
    return (
      <span role="img" aria-label={label} className={cn(base, 'inline-block overflow-hidden')}>
        <GenderArt art={art} className="w-full h-full block" />
      </span>
    )
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex items-center justify-center font-bold select-none', base)}
      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
    >
      {getInitials(name)}
    </div>
  )
}
