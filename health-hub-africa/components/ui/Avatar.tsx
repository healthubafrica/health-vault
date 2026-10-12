'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { avatarKindFor, getInitials, type AvatarKind } from '@/lib/avatar'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AvatarShape = 'circle' | 'rounded'

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
}

const SHAPE_CLASS: Record<AvatarShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-2xl',
}

const BG: Record<AvatarKind, string> = { male: '#E3F0FF', female: '#FDE8EF', neutral: '#E8F3EC' }
const SHIRT: Record<AvatarKind, string> = { male: '#2F6FDE', female: '#D6457A', neutral: '#137333' }
const HAIR_FRONT: Record<AvatarKind, { d: string; fill: string }> = {
  male: { d: 'M31 38 C31 24 40 19 48 19 C56 19 65 24 65 38 C61 31 54 29 48 29 C42 29 35 31 31 38 Z', fill: '#2B2B33' },
  female: { d: 'M32 38 C35 28 43 25 48 25 C55 25 63 29 64 38 C57 33 41 31 32 38 Z', fill: '#2B2B33' },
  neutral: { d: 'M32 36 C34 27 41 24 48 24 C55 24 62 27 64 36 C58 32 40 32 32 36 Z', fill: '#5B5B66' },
}
const HAIR_BEHIND =
  'M29 44 C27 24 38 18 48 18 C58 18 69 24 67 44 C67 56 70 64 72 72 C64 70 62 56 62 46 L34 46 C34 56 32 70 24 72 C26 64 29 56 29 44 Z'

/** Local, decorative gender artwork. No network requests. */
function GenderArt({ kind, px, clipId }: { kind: AvatarKind; px: number; clipId: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={px}
      height={px}
      aria-hidden="true"
      focusable="false"
      className="block w-full h-full"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="48" cy="48" r="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <circle cx="48" cy="48" r="48" fill={BG[kind]} />
        <path d="M10 96 C10 74 28 66 48 66 C68 66 86 74 86 96 Z" fill={SHIRT[kind]} />
        <rect x="42" y="54" width="12" height="14" rx="5" fill="#D9A27E" />
        {kind === 'female' && <path d={HAIR_BEHIND} fill="#2B2B33" />}
        <circle cx="48" cy="40" r="16" fill="#D9A27E" />
        <path d={HAIR_FRONT[kind].d} fill={HAIR_FRONT[kind].fill} />
      </g>
    </svg>
  )
}

interface AvatarProps {
  /** Person's name: used for initials and the accessible label. */
  seed: string
  src?: string | null
  gender?: string | null
  size?: AvatarSize
  shape?: AvatarShape
  className?: string
  alt?: string
}

export function Avatar({
  seed,
  src,
  gender,
  size = 'md',
  shape = 'circle',
  className,
  alt,
}: AvatarProps) {
  const px = SIZE_MAP[size]
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  const kind = avatarKindFor(gender)
  const label = alt ?? seed
  const showPhoto = !!src && !failed
  const initials = getInitials(seed)
  const clipId = `av-clip-${kind ?? 'x'}-${size}`

  return (
    <div
      className={cn('shrink-0 overflow-hidden bg-[var(--color-primary-light)]', SHAPE_CLASS[shape], className)}
      style={{ width: px, height: px }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : kind ? (
        <div role="img" aria-label={label} className="w-full h-full">
          <GenderArt kind={kind} px={px} clipId={clipId} />
        </div>
      ) : (
        <div
          role="img"
          aria-label={label}
          className="w-full h-full flex items-center justify-center font-bold text-[var(--color-primary)] select-none"
          style={{ fontSize: Math.round(px * 0.38) }}
        >
          {initials}
        </div>
      )}
    </div>
  )
}
