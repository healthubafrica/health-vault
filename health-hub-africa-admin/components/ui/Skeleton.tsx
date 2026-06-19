import type React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonBoxProps {
  className?: string
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
}

export function SkeletonBox({ className, width, height, style }: SkeletonBoxProps) {
  return (
    <div
      className={cn('skeleton', className)}
      style={{ width, height, ...style }}
    />
  )
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="skeleton rounded-full flex-shrink-0"
      style={{ width: size, height: size }}
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('skeleton-card', className)}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar size={36} />
        <div className="flex-1">
          <SkeletonText lines={2} />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
}
