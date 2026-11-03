'use client'

import Link from 'next/link'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { useLiveData } from '@/lib/hooks/useLiveData'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/states'
import { STATUS_STYLE, summarize } from '@/components/layout/SystemStatusPill'

const QUICK_LINKS = [
  { label: 'CloudWatch dashboard', href: 'https://af-south-1.console.aws.amazon.com/cloudwatch/home?region=af-south-1#dashboards/dashboard/hha-production' },
  { label: 'CloudWatch alarms', href: 'https://af-south-1.console.aws.amazon.com/cloudwatch/home?region=af-south-1#alarmsV2:' },
  { label: 'Sentry', href: 'https://sentry.io/' },
  { label: 'Vercel', href: 'https://vercel.com/dashboard' },
  { label: 'Paystack', href: 'https://dashboard.paystack.com/' },
  { label: 'AWS Billing', href: 'https://us-east-1.console.aws.amazon.com/costmanagement/home#/home' },
]

const ago = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`
}

export default function SystemStatusPage() {
  const { data, isInitialLoad, error, refresh } = useLiveData(() => adminApi.system.status(), [], { intervalMs: 60_000 })
  const overall = STATUS_STYLE[data?.overall ?? 'unknown']

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            System Status
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Live health of the platform, its integrations and AWS. Refreshes every minute.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {error && !data && <ErrorState message={error} onRetry={refresh} />}

      {isInitialLoad && <SkeletonBox className="h-20 w-full rounded-2xl mb-4" />}

      {data && (
        <>
          <div
            className="rounded-2xl px-5 py-4 mb-4 flex items-center justify-between"
            style={{ background: overall.bg, color: overall.color }}
            role="status"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: overall.color }} aria-hidden />
              <span className="text-base font-bold">{summarize(data)}</span>
            </div>
            <span className="text-xs opacity-80">Checked {ago(data.checkedAt)}</span>
          </div>

          <Card padding={false} className="mb-4">
            <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {data.checks.map((c) => {
                const s = STATUS_STYLE[c.status]
                const external = c.link?.startsWith('http')
                return (
                  <li key={c.key} className="flex items-center gap-4 px-5 py-3.5" style={{ borderColor: 'var(--color-border)' }}>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg w-20 text-center flex-shrink-0"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.label}</p>
                      <p className="text-xs mt-0.5 break-words" style={{ color: 'var(--color-text-muted)' }}>{c.detail}</p>
                    </div>
                    {c.link && (
                      <Link
                        href={c.link}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        className="text-xs font-semibold flex items-center gap-1 flex-shrink-0 hover:underline"
                        style={{ color: '#6DC43F' }}
                      >
                        Open {external && <ExternalLink className="w-3 h-3" />}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold flex items-center gap-1.5 px-3 h-8 rounded-xl border transition-colors hover:bg-[var(--color-bg)]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {l.label}
            <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
    </div>
  )
}
