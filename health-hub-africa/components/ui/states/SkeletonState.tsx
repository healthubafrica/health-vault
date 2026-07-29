'use client'

import React from 'react'

export interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  borderRadius?: string
}

export function Skeleton({ className = '', width, height, borderRadius }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: borderRadius,
  }

  return <div className={`skeleton ${className}`} style={style} />
}

export function CardSkeleton() {
  return (
    <div className="skeleton-card flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-3/5 rounded-md" />
          <Skeleton className="h-3 w-2/5 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-1/4 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="p-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-4 py-2">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="p-8 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center gap-4 text-center">
      <Skeleton className="w-24 h-24 rounded-full" />
      <Skeleton className="h-6 w-44 rounded-md" />
      <Skeleton className="h-3 w-32 rounded-md" />
      <div className="w-full grid grid-cols-3 gap-3 pt-4 border-t border-[var(--color-border)]">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={3} />
    </div>
  )
}
