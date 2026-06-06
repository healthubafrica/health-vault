'use client'

import { SkeletonBox } from '@/components/ui/Skeleton'

export function AppointmentsSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5" aria-busy="true" aria-label="Loading appointments">

      {/* Page header */}
      <div className="flex flex-col gap-2">
        <SkeletonBox className="h-7 w-36" />
        <SkeletonBox className="h-4 w-56" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[80, 48, 88, 72].map((w, i) => (
          <SkeletonBox key={i} className={`h-8 w-${w} rounded-full`} style={{ width: w }} />
        ))}
      </div>

      {/* List card */}
      <div className="skeleton-card p-0 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 p-4"
            style={{ borderBottom: i < 4 ? '1px solid var(--color-border)' : 'none' }}
          >
            <SkeletonBox className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <SkeletonBox className="h-4 w-32" />
                <SkeletonBox className="h-5 w-16 rounded-full" />
              </div>
              <SkeletonBox className="h-3 w-48" />
              <SkeletonBox className="h-3 w-36" />
            </div>
            <SkeletonBox className="h-7 w-20 rounded-lg shrink-0" />
          </div>
        ))}
      </div>

      {/* Book new card */}
      <div className="skeleton-card flex flex-col gap-4">
        <SkeletonBox className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col gap-1.5">
              <SkeletonBox className="h-3 w-24" />
              <SkeletonBox className="h-10 w-full rounded-xl" />
            </div>
          ))}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <SkeletonBox className="h-3 w-28" />
            <SkeletonBox className="h-20 w-full rounded-xl" />
          </div>
        </div>
        <SkeletonBox className="h-10 w-40 rounded-xl" />
      </div>
    </div>
  )
}
