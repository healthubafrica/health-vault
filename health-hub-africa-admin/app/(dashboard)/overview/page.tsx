'use client'

import { useEffect, useState } from 'react'
import { adminApi, type AnalyticsSummary } from '@/lib/api'
import { KpiCard } from '@/components/ui/KpiCard'
import { Card, CardTitle } from '@/components/ui/Card'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatKoboToNaira } from '@/lib/utils'
import {
  Users,
  CreditCard,
  TrendingUp,
  CalendarCheck,
  Ambulance,
  AlertCircle,
  UserPlus,
  Activity,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
)

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1A251A',
      borderColor: '#253525',
      borderWidth: 1,
      titleColor: '#D0E8D0',
      bodyColor: '#8A9A8A',
    },
  },
  scales: {
    x: {
      grid: { color: '#253525' },
      ticks: { color: '#8A9A8A', font: { size: 10 } },
    },
    y: {
      grid: { color: '#253525' },
      ticks: { color: '#8A9A8A', font: { size: 10 } },
    },
  },
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [revenueData, setRevenueData] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryRes, revenueRes] = await Promise.all([
          adminApi.analytics.summary(),
          adminApi.analytics.revenue('30d'),
        ])
        setSummary(summaryRes.data)

        const grouped: Record<string, number> = {}
        for (const point of revenueRes.data) {
          const date = new Date(point.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
          grouped[date] = (grouped[date] ?? 0) + point.amount
        }
        const labels = Object.keys(grouped).slice(-14)
        const values = labels.map((l) => grouped[l] / 100)
        setRevenueData({ labels, values })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load overview data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const pctPill = (pct?: number) => ({
    text: pct !== undefined ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : undefined,
    variant: (pct ?? 0) >= 0 ? ('success' as const) : ('emergency' as const),
  })

  return (
    <div className="max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          Overview
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Real-time health metrics and operational KPIs
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBox key={i} height={110} className="rounded-2xl" />
          ))
        ) : (
          <>
            <KpiCard
              label="Total Users"
              value={summary?.totalUsers?.toLocaleString() ?? '—'}
              icon={<Users className="w-4 h-4" />}
              pillText={pctPill(summary?.userGrowthPct).text}
              pillVariant={pctPill(summary?.userGrowthPct).variant}
              subtext="vs last month"
            />
            <KpiCard
              label="Active Subscriptions"
              value={summary?.activeSubscriptions?.toLocaleString() ?? '—'}
              icon={<CreditCard className="w-4 h-4" />}
              pillText={pctPill(summary?.subscriptionGrowthPct).text}
              pillVariant={pctPill(summary?.subscriptionGrowthPct).variant}
              subtext="vs last month"
            />
            <KpiCard
              label="MRR"
              value={summary?.mrr !== undefined ? formatKoboToNaira(summary.mrr) : '—'}
              icon={<TrendingUp className="w-4 h-4" />}
              pillText={pctPill(summary?.mrrGrowthPct).text}
              pillVariant={pctPill(summary?.mrrGrowthPct).variant}
              subtext="vs last month"
            />
            <KpiCard
              label="New Users Today"
              value={summary?.newUsersToday ?? '—'}
              icon={<UserPlus className="w-4 h-4" />}
            />
            <KpiCard
              label="Appointments Today"
              value={summary?.appointmentsToday ?? '—'}
              icon={<CalendarCheck className="w-4 h-4" />}
            />
            <KpiCard
              label="Active Dispatch"
              value={summary?.activeDispatch ?? '—'}
              icon={<Ambulance className="w-4 h-4" />}
              pillText={summary?.activeDispatch ? 'Live' : undefined}
              pillVariant={summary?.activeDispatch ? 'emergency' : 'neutral'}
            />
            <KpiCard
              label="OpenEMR Errors"
              value={summary?.openemrSyncErrors ?? '—'}
              icon={<AlertCircle className="w-4 h-4" />}
              pillText={summary?.openemrSyncErrors ? 'Action needed' : 'Healthy'}
              pillVariant={summary?.openemrSyncErrors ? 'warning' : 'success'}
            />
            <KpiCard
              label="System Status"
              value="Operational"
              icon={<Activity className="w-4 h-4" />}
              pillText="All systems go"
              pillVariant="success"
            />
          </>
        )}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardTitle>Revenue — Last 14 Days</CardTitle>
        {loading ? (
          <SkeletonBox height={220} className="rounded-xl" />
        ) : (
          <div style={{ height: 220 }}>
            <Line
              data={{
                labels: revenueData.labels,
                datasets: [
                  {
                    label: 'Revenue (₦)',
                    data: revenueData.values,
                    borderColor: '#6DC43F',
                    backgroundColor: 'rgba(109,196,63,0.08)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#6DC43F',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                  },
                ],
              }}
              options={CHART_OPTIONS}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
