'use client'

import Link from 'next/link'
import { Card, CardTitle } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Flag, FileText, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'

export function SystemTab() {
  const user = useAuthStore((s) => s.user)

  // Defensive: callers should already filter on role, but if somebody routes
  // directly to ?tab=system as e.g. admin, render nothing instead of leaking
  // env metadata.
  if (user?.role !== 'super_admin') return null

  const env = process.env.NEXT_PUBLIC_ENV ?? process.env.NODE_ENV ?? 'unknown'

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle>Environment</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Environment" value={env} variant={env === 'production' ? 'success' : 'warning'} />
          <InfoRow label="Admin app" value="HHA Admin" />
        </div>
      </Card>

      <Card>
        <CardTitle>Platform controls</CardTitle>
        <p className="text-[11px] mb-4" style={{ color: 'var(--color-text-faint)' }}>
          Settings managed elsewhere in the admin app.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LinkCard
            href="/feature-flags"
            icon={<Flag className="w-4 h-4" />}
            title="Feature flags"
            description="Toggle product features for the whole platform"
          />
          <LinkCard
            href="/system/audit-logs"
            icon={<FileText className="w-4 h-4" />}
            title="Audit logs"
            description="Every state-change action by every user, searchable"
          />
        </div>
      </Card>
    </div>
  )
}

function InfoRow({
  label,
  value,
  variant,
}: {
  label: string
  value: string
  variant?: 'success' | 'warning' | 'neutral'
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Pill variant={variant ?? 'neutral'}>{value}</Pill>
      </div>
    </div>
  )
}

function LinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-[var(--color-bg)]"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <span
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {title}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      </div>
      <ArrowRight
        className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--color-text-muted)' }}
      />
    </Link>
  )
}
