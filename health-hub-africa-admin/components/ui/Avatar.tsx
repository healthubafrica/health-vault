import { cn } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg'

interface AvatarProps {
  name?: string
  src?: string
  size?: Size
  className?: string
}

const sizeClasses: Record<Size, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm',
}

function getInitials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'avatar'}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClasses[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none',
        sizeClasses[size],
        className,
      )}
      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
    >
      {getInitials(name)}
    </div>
  )
}
