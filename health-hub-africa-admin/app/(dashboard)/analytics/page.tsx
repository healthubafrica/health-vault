'use client'

import { useEffect, useState } from 'react'
import { adminApi, type UsageDataPoint, type RevenueDataPoint } from '@/lib/api'
import { Card, CardTitle } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatKoboToNaira } from '@/lib/utils'
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
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler)

const PERIODS = ['7d', '30d', '90d']

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#8A9A8A', font: { size: 11 } } },
    tooltip: {
      backgroundColor: '#1A251A',
      borderColor: '#253525',
      borderWidth: 1,
      titleColor: '#D0E8D0',
      bodyColor: '#8A9A8A',
    },
  },
  scales: {
    x: { grid: { color: '#253525' }, ticks: { color: '#8A9A8A', font: { size: 10 } } },
    y: { grid: { color: '#253525' }, ticks: { color: '#8A9A8A', font: { size: 10 } } },
  },
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([])
  const [usage, setUsage] = useState<UsageDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminApi.analytics.revenue(period),
      adminApi.analytics.usage(period),
    ])
      .then(([rRes, uRes]) => {
        setRevenue(rRes.data)
        setUsage(uRes.data)
      })
      .finally(() => setLoading(false))
  }, [period])

  const revenueLabels = revenue.slice(-14).map((r) =>
    new Date(r.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
  )
  const revenueValues = revenue.slice(-14).map((r) => r.amount / 100)

  const usageLabels = usage.slice(-14).map((u) =>
    new Date(u.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
  )

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Analytics
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Revenue, subscriptions, and service usage
          </p>
        </div>
        <FilterTabs tabs={PERIODS} active={period} onChange={setPeriod} />
      </div>

      <div className="grid gap-4">
        <Card>
          <CardTitle>Revenue (₦)</CardTitle>
          {loading ? (
            <SkeletonBox height={240} className="rounded-xl" />
          ) : (
            <div style={{ height: 240 }}>
              <Line
                data={{
                  labels: revenueLabels,
                  datasets: [
                    {
                      label: 'Revenue',
                      data: revenueValues,
                      borderColor: '#6DC43F',
                      backgroundColor: 'rgba(109,196,63,0.08)',
                      tension: 0.4,
                      fill: true,
                      pointRadius: 3,
                    },
                  ],
                }}
                options={CHART_OPTIONS}
              />
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Service Usage</CardTitle>
          {loading ? (
            <SkeletonBox height={240} className="rounded-xl" />
          ) : (
            <div style={{ height: 240 }}>
              <Bar
                data={{
                  labels: usageLabels,
                  datasets: [
                    { label: 'Appointments', data: usage.slice(-14).map((u) => u.appointments), backgroundColor: '#6DC43F' },
                    { label: 'TeleCare', data: usage.slice(-14).map((u) => u.telecare), backgroundColor: '#3B82F6' },
                    { label: 'Dispatch', data: usage.slice(-14).map((u) => u.dispatch), backgroundColor: '#C0392B' },
                    { label: 'Labs', data: usage.slice(-14).map((u) => u.labOrders), backgroundColor: '#E8930A' },
                  ],
                }}
                options={CHART_OPTIONS}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
