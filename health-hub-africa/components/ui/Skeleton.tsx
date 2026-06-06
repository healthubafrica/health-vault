'use client'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function SkeletonBox({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

export function SkeletonText({ lines = 1, className = '' }: SkeletonProps & { lines?: number }) {
  if (lines === 1) {
    return <div className={`skeleton h-3.5 rounded-md ${className}`} aria-hidden="true" />
  }
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3.5 rounded-md"
          style={{ width: i === lines - 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 'md', shape = 'circle' }: { size?: 'sm' | 'md' | 'lg'; shape?: 'circle' | 'square' }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' }
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl'
  return <div className={`skeleton ${sizes[size]} ${radius}`} aria-hidden="true" />
}

export function SkeletonCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`skeleton-card ${className}`} aria-hidden="true">
      {children}
    </div>
  )
}
