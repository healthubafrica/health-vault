'use client'

import { SkeletonBox, SkeletonAvatar } from '@/components/ui/Skeleton'

function FieldRow() {
  return (
    <div className="flex flex-col gap-1.5">
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="h-10 w-full rounded-xl" />
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5" aria-busy="true" aria-label="Loading profile">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <SkeletonBox className="h-7 w-36" />
          <div className="flex items-center gap-2">
            <SkeletonBox className="h-5 w-24 rounded-lg" />
            <SkeletonBox className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <SkeletonAvatar size="lg" shape="square" />
      </div>

      {/* Personal info card */}
      <div className="skeleton-card flex flex-col gap-4">
        <SkeletonBox className="h-5 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow />
          <FieldRow />
          <FieldRow />
          <FieldRow />
          <FieldRow />
          <FieldRow />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <SkeletonBox className="h-10 w-32 rounded-xl" />
      </div>

      {/* Medical info card */}
      <div className="skeleton-card flex flex-col gap-4">
        <SkeletonBox className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow />
          <FieldRow />
          <FieldRow />
          <FieldRow />
        </div>
      </div>

      {/* Emergency contacts */}
      <div className="skeleton-card flex flex-col gap-4">
        <SkeletonBox className="h-5 w-44" />
        {[1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <SkeletonAvatar size="md" shape="circle" />
            <div className="flex flex-col gap-2 flex-1">
              <SkeletonBox className="h-4 w-32" />
              <SkeletonBox className="h-3 w-24" />
            </div>
            <SkeletonBox className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
