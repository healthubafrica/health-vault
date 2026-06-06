'use client'

import { SkeletonBox, SkeletonText, SkeletonAvatar } from '@/components/ui/Skeleton'

function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center gap-3 ${className}`}>{children}</div>
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-20 md:pb-5" aria-busy="true" aria-label="Loading dashboard">

      {/* Hello Banner */}
      <div className="rounded-[24px] p-6 bg-[var(--color-primary-dark)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <SkeletonBox className="h-7 w-52 opacity-30" />
          <SkeletonBox className="h-4 w-36 opacity-20" />
        </div>
        <Row>
          <SkeletonBox className="h-5 w-24 opacity-20" />
          <SkeletonBox className="h-7 w-20 rounded-full opacity-20" />
        </Row>
      </div>

      {/* Health Overview header */}
      <div className="flex flex-col gap-3">
        <Row className="justify-between">
          <SkeletonBox className="h-4 w-32" />
          <Row>
            <SkeletonBox className="h-7 w-7 rounded-xl" />
            <SkeletonBox className="h-7 w-7 rounded-xl" />
            <SkeletonBox className="h-7 w-16 rounded-xl" />
          </Row>
        </Row>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card flex flex-col gap-3">
              <SkeletonBox className="h-3 w-24" />
              <SkeletonBox className="h-7 w-20" />
              <SkeletonBox className="h-5 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tests */}
      <div className="flex flex-col gap-3">
        <SkeletonBox className="h-4 w-28" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="skeleton-card flex flex-col gap-4 min-h-[190px]">
              <Row className="justify-between">
                <SkeletonBox className="h-3 w-20" />
                <SkeletonBox className="h-6 w-16 rounded-full" />
              </Row>
              <SkeletonBox className="flex-1 rounded-xl min-h-[80px]" />
              <SkeletonBox className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic Metrics */}
      <div className="flex flex-col gap-3">
        <SkeletonBox className="h-4 w-36" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton-card flex flex-col gap-3 min-h-[180px]">
            <SkeletonBox className="h-3 w-24" />
            <SkeletonBox className="flex-1 rounded-xl" />
          </div>
          <div className="skeleton-card flex flex-col items-center gap-3 min-h-[180px]">
            <SkeletonBox className="h-3 w-24 self-start" />
            <SkeletonBox className="w-40 h-40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="skeleton-card flex flex-col gap-4">
        <SkeletonBox className="h-3 w-28" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-[16px]" style={{ background: 'var(--color-bg)' }}>
              <SkeletonBox className="w-10 h-10 rounded-xl" />
              <SkeletonBox className="h-3 w-16" />
              <SkeletonBox className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="skeleton-card flex flex-col gap-4">
          <SkeletonBox className="h-3 w-28" />
          <Row>
            <SkeletonBox className="h-6 w-20 rounded-full" />
            <SkeletonBox className="h-5 w-16 rounded-lg" />
          </Row>
          <SkeletonBox className="h-7 w-32" />
          <SkeletonBox className="h-4 w-44" />
          <SkeletonBox className="h-8 w-24 rounded-xl" />
        </div>
        <div className="skeleton-card flex flex-col gap-4">
          <SkeletonBox className="h-3 w-24" />
          <Row>
            <SkeletonAvatar size="lg" shape="circle" />
            <div className="flex flex-col gap-2 flex-1">
              <SkeletonBox className="h-4 w-32" />
              <SkeletonBox className="h-3 w-24" />
              <Row>
                <SkeletonBox className="h-3 w-10" />
                <SkeletonBox className="h-3 w-16" />
                <SkeletonBox className="h-3 w-14" />
              </Row>
            </div>
          </Row>
          <SkeletonBox className="h-9 w-full rounded-xl mt-2" />
        </div>
      </div>
    </div>
  )
}
