'use client'

import { SkeletonBox } from '@/components/ui/Skeleton'

interface ListSkeletonProps {
  title?: string
  rows?: number
  /** Show a right-side badge/pill column */
  showBadge?: boolean
  /** Show a right-side action button column */
  showAction?: boolean
  /** Show a summary stats row above the list */
  showStats?: boolean
  ariaLabel?: string
}

function StatCard() {
  return (
    <div className="skeleton-card flex flex-col gap-3">
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="h-7 w-16" />
      <SkeletonBox className="h-4 w-24 rounded-full" />
    </div>
  )
}

export function ListSkeleton({
  rows = 5,
  showBadge = true,
  showAction = false,
  showStats = false,
  ariaLabel = 'Loading',
}: ListSkeletonProps) {
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5" aria-busy="true" aria-label={ariaLabel}>

      {/* Page header */}
      <div className="flex flex-col gap-2">
        <SkeletonBox className="h-7 w-36" />
        <SkeletonBox className="h-4 w-52" />
      </div>

      {/* Optional stats row */}
      {showStats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard />
          <StatCard />
          <StatCard />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[60, 72, 80, 64].map((w, i) => (
          <SkeletonBox key={i} className="h-8 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* List */}
      <div className="skeleton-card p-0 overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4"
            style={{ borderBottom: i < rows - 1 ? '1px solid var(--color-border)' : 'none' }}
          >
            <SkeletonBox className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <SkeletonBox className="h-4" style={{ width: `${100 + (i % 3) * 30}px` }} />
                {showBadge && <SkeletonBox className="h-5 w-14 rounded-full" />}
              </div>
              <SkeletonBox className="h-3" style={{ width: `${140 + (i % 2) * 40}px` }} />
            </div>
            {showAction && <SkeletonBox className="h-7 w-20 rounded-lg shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  )
}
