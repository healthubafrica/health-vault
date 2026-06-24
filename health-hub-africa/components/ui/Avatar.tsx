import Image from 'next/image'
import { cn } from '@/lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AvatarShape = 'circle' | 'rounded'
type DiceBearStyle =
  | 'micah'
  | 'avataaars'
  | 'notionists'
  | 'lorelei'
  | 'adventurer'
  | 'big-smile'

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

interface AvatarProps {
  seed: string
  src?: string | null
  style?: DiceBearStyle
  size?: AvatarSize
  shape?: AvatarShape
  className?: string
  alt?: string
}

function dicebearUrl(seed: string, style: DiceBearStyle): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

export function Avatar({
  seed,
  src,
  style = 'micah',
  size = 'md',
  shape = 'circle',
  className,
  alt,
}: AvatarProps) {
  const px = SIZE_MAP[size]
  const url = src || dicebearUrl(seed, style)

  return (
    <div
      className={cn('shrink-0 overflow-hidden bg-[var(--color-primary-light)]', SHAPE_CLASS[shape], className)}
      style={{ width: px, height: px }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt ?? seed}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
    </div>
  )
}
