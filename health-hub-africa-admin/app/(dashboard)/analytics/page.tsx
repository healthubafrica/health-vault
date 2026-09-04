'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { adminApi, type MarketingAnalytics, type TrafficAnalytics, type UsageDataPoint, type RevenueDataPoint } from '@/lib/api'
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
    y: { grid: { color: '#253525' }, ticks: { color: '#8A9A8A', font: { size: 10 }, precision: 0 } },
  },
}
const SOURCE_LABELS: Record<string, string> = {
  social_media: 'Social media',
  friend: 'Friend',
  referral: 'Referral',
  family: 'Family',
  unknown: 'Not captured',
}

function countryName(code: string) {
  if (code === 'Unknown') return code
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 px-4 py-3 first:pl-0 last:pr-0 border-r last:border-r-0" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-faint)' }}>{detail}</p>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-muted)' }}>{children}</div>
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([])
  const [usage, setUsage] = useState<UsageDataPoint[]>([])
  const [marketing, setMarketing] = useState<MarketingAnalytics | null>(null)
  const [traffic, setTraffic] = useState<TrafficAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [rRes, uRes, mRes, tRes] = await Promise.all([
        adminApi.analytics.revenue(period),
        adminApi.analytics.usage(period),
        adminApi.analytics.marketing(period),
        adminApi.analytics.traffic(period),
      ])
      setRevenue(rRes.data)
      setUsage(uRes.data)
      setMarketing(mRes.data)
      setTraffic(tRes.data)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])
  useAutoRefresh(load, 60_000)

  const revenueLabels = revenue.slice(-14).map((row) =>
    new Date(row.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
  )
  const revenueValues = revenue.slice(-14).map((row) => row.amount / 100)
  const usageLabels = usage.slice(-14).map((row) =>
    new Date(row.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
  )
  const activity = marketing?.activity ?? []
  const activityWindow = period === '90d' ? activity : activity.slice(-30)
  const activityLabels = activityWindow.map((row) =>
    new Date(row.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
  )
  const verifiedRate = marketing?.totals.registrations
    ? Math.round((marketing.totals.verifiedRegistrations / marketing.totals.registrations) * 100)
    : 0
  const attributedRate = marketing?.totals.registrations
    ? Math.round((marketing.totals.attributedRegistrations / marketing.totals.registrations) * 100)
    : 0
  const maxDeviceCount = useMemo(
    () => Math.max(1, ...(marketing?.devices.map((row) => row.count) ?? [1])),
    [marketing],
  )
  const trafficActivity = traffic?.activity ?? []
  const trafficActivityWindow = period === '90d' ? trafficActivity : trafficActivity.slice(-30)
  const trafficActivityLabels = trafficActivityWindow.map((row) =>
    new Date(row.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
  )
  const topTrafficLocation = traffic?.locations[0]
  const maxTrafficDeviceCount = useMemo(
    () => Math.max(1, ...(traffic?.devices.map((row) => row.count) ?? [1])),
    [traffic],
  )

  return (
    <div className="max-w-[1200px] pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Acquisition, campaign attribution, login geography, revenue, and service usage
          </p>
        </div>
        <FilterTabs tabs={PERIODS} active={period} onChange={setPeriod} />
      </div>

      {loading && !marketing ? (
        <SkeletonBox height={88} className="rounded-xl mb-4" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 mb-4 border-y" style={{ borderColor: 'var(--color-border)' }}>
          <Metric label="Registrations" value={String(marketing?.totals.registrations ?? 0)} detail={`${verifiedRate}% verified`} />
          <Metric label="Campaign-attributed" value={String(marketing?.totals.attributedRegistrations ?? 0)} detail={`${attributedRate}% of registrations`} />
          <Metric label="Login events" value={String(marketing?.totals.logins ?? 0)} detail="Successful sign-ins only" />
          <Metric label="Unique users" value={String(marketing?.totals.uniqueLoginUsers ?? 0)} detail="Users who signed in" />
          <Metric label="Revenue" value={formatKoboToNaira(revenue.reduce((sum, row) => sum + row.amount, 0))} detail={`Across the last ${period}`} />
        </div>
      )}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
        <Card>
          <CardTitle>Registrations and logins</CardTitle>
          {loading ? <SkeletonBox height={250} className="rounded-xl" /> : activityWindow.length === 0 ? (
            <Empty>No acquisition activity in this period.</Empty>
          ) : (
            <div style={{ height: 250 }}>
              <Line
                data={{
                  labels: activityLabels,
                  datasets: [
                    { label: 'Registrations', data: activityWindow.map((row) => row.registrations), borderColor: '#6DC43F', backgroundColor: 'rgba(109,196,63,0.08)', tension: 0.35, fill: true, pointRadius: 2 },
                    { label: 'Logins', data: activityWindow.map((row) => row.logins), borderColor: '#3B82F6', backgroundColor: 'transparent', tension: 0.35, pointRadius: 2 },
                  ],
                }}
                options={CHART_OPTIONS}
              />
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>How users heard about us</CardTitle>
          {loading ? <SkeletonBox height={250} className="rounded-xl" /> : !marketing?.acquisitionSources.length ? (
            <Empty>No registration-source data yet.</Empty>
          ) : (
            <div className="space-y-4 pt-1">
              {marketing.acquisitionSources.map((row) => (
                <div key={row.source}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{SOURCE_LABELS[row.source] ?? row.source}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{row.count} · {row.percentage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                    <div className="h-full rounded-full bg-[#6DC43F] transition-[width] duration-300" style={{ width: `${row.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mb-4" padding={false}>
        <div className="px-5 pt-5"><CardTitle>Campaign performance</CardTitle></div>
        {!loading && !marketing?.campaigns.length ? (
          <Empty>No UTM-tagged campaign activity yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th className="px-5 py-2.5 font-semibold">Campaign</th>
                  <th className="px-4 py-2.5 font-semibold">Source / medium</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Registrations</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Logins</th>
                </tr>
              </thead>
              <tbody>
                {(marketing?.campaigns ?? []).map((row) => (
                  <tr key={`${row.campaign}-${row.source}-${row.medium}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{row.campaign}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{row.source} / {row.medium}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.registrations}</td>
                    <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.logins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 mb-6">
        <Card padding={false}>
          <div className="px-5 pt-5"><CardTitle>Login locations</CardTitle></div>
          {!loading && !marketing?.loginLocations.length ? (
            <Empty>Location data will appear after tracked sign-ins.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th className="px-5 py-2.5 font-semibold">Location</th>
                    <th className="px-4 py-2.5 font-semibold">Timezone</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Users</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Logins</th>
                  </tr>
                </thead>
                <tbody>
                  {(marketing?.loginLocations ?? []).map((row, index) => (
                    <tr key={`${row.countryCode}-${row.region}-${row.city}-${index}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-5 py-3">
                        <p className="font-medium" style={{ color: 'var(--color-text)' }}>{row.city !== 'Unknown' ? row.city : countryName(row.countryCode)}</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{row.region !== 'Unknown' ? `${row.region}, ` : ''}{countryName(row.countryCode)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{row.timezone}</td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.uniqueUsers}</td>
                      <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.logins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Login devices</CardTitle>
          <div className="space-y-4">
            {(marketing?.devices ?? []).map((row) => (
              <div key={row.device}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.device}</span>
                  <span className="tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{row.count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-300" style={{ width: `${(row.count / maxDeviceCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {!!marketing?.referrers.length && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Top login referrers</h4>
              <div className="space-y-2">
                {marketing.referrers.slice(0, 5).map((row) => (
                  <div key={row.referrer} className="flex justify-between gap-3 text-xs">
                    <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>{row.referrer}</span>
                    <span className="tabular-nums" style={{ color: 'var(--color-text)' }}>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Site traffic</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Anonymous pageviews on the marketing site (myvaultplus.com) — most visitors here never register
        </p>
      </div>

      {loading && !traffic ? (
        <SkeletonBox height={88} className="rounded-xl mb-4" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 mb-4 border-y" style={{ borderColor: 'var(--color-border)' }}>
          <Metric label="Total visits" value={String(traffic?.totalVisits ?? 0)} detail={`Across the last ${period}`} />
          <Metric
            label="Top location"
            value={topTrafficLocation ? (topTrafficLocation.city !== 'Unknown' ? topTrafficLocation.city : countryName(topTrafficLocation.countryCode)) : '—'}
            detail={topTrafficLocation ? `${topTrafficLocation.visits} visits` : 'No visits yet'}
          />
          <Metric label="Top device" value={traffic?.devices[0]?.device ?? '—'} detail={traffic?.devices[0] ? `${traffic.devices[0].count} visits` : 'No visits yet'} />
          <Metric label="Top referrer" value={traffic?.referrers[0]?.referrer ?? 'Direct'} detail={traffic?.referrers[0] ? `${traffic.referrers[0].count} visits` : 'No referrer data yet'} />
        </div>
      )}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
        <Card>
          <CardTitle>Visits over time</CardTitle>
          {loading ? <SkeletonBox height={220} className="rounded-xl" /> : trafficActivityWindow.length === 0 ? (
            <Empty>No site visits recorded in this period.</Empty>
          ) : (
            <div style={{ height: 220 }}>
              <Line
                data={{
                  labels: trafficActivityLabels,
                  datasets: [
                    { label: 'Visits', data: trafficActivityWindow.map((row) => row.visits), borderColor: '#E8930A', backgroundColor: 'rgba(232,147,10,0.08)', tension: 0.35, fill: true, pointRadius: 2 },
                  ],
                }}
                options={CHART_OPTIONS}
              />
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Visitor devices</CardTitle>
          {!loading && !traffic?.devices.length ? (
            <Empty>No device data yet.</Empty>
          ) : (
            <div className="space-y-4 pt-1">
              {(traffic?.devices ?? []).map((row) => (
                <div key={row.device}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.device}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{row.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                    <div className="h-full rounded-full bg-[#E8930A] transition-[width] duration-300" style={{ width: `${(row.count / maxTrafficDeviceCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 mb-6">
        <Card padding={false}>
          <div className="px-5 pt-5"><CardTitle>Visitor locations</CardTitle></div>
          {!loading && !traffic?.locations.length ? (
            <Empty>Location data will appear after tracked pageviews.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th className="px-5 py-2.5 font-semibold">Location</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {(traffic?.locations ?? []).map((row, index) => (
                    <tr key={`${row.countryCode}-${row.region}-${row.city}-${index}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-5 py-3">
                        <p className="font-medium" style={{ color: 'var(--color-text)' }}>{row.city !== 'Unknown' ? row.city : countryName(row.countryCode)}</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{row.region !== 'Unknown' ? `${row.region}, ` : ''}{countryName(row.countryCode)}</p>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.visits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Top referrers</CardTitle>
          {!loading && !traffic?.referrers.length ? (
            <Empty>No referrer data yet.</Empty>
          ) : (
            <div className="space-y-2 pt-1">
              {(traffic?.referrers ?? []).map((row) => (
                <div key={row.referrer} className="flex justify-between gap-3 text-xs">
                  <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>{row.referrer}</span>
                  <span className="tabular-nums" style={{ color: 'var(--color-text)' }}>{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mb-6" padding={false}>
        <div className="px-5 pt-5"><CardTitle>Ad campaign performance (site visits)</CardTitle></div>
        {!loading && !traffic?.campaigns.length ? (
          <Empty>No UTM-tagged campaign traffic yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th className="px-5 py-2.5 font-semibold">Campaign</th>
                  <th className="px-4 py-2.5 font-semibold">Source / medium</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Visits</th>
                </tr>
              </thead>
              <tbody>
                {(traffic?.campaigns ?? []).map((row) => (
                  <tr key={`${row.campaign}-${row.source}-${row.medium}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{row.campaign}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{row.source} / {row.medium}</td>
                    <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Operational analytics</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Revenue and service use for the selected period</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Revenue (₦)</CardTitle>
          {loading ? <SkeletonBox height={240} className="rounded-xl" /> : (
            <div style={{ height: 240 }}>
              <Line data={{ labels: revenueLabels, datasets: [{ label: 'Revenue', data: revenueValues, borderColor: '#6DC43F', backgroundColor: 'rgba(109,196,63,0.08)', tension: 0.4, fill: true, pointRadius: 3 }] }} options={CHART_OPTIONS} />
            </div>
          )}
        </Card>
        <Card>
          <CardTitle>Service usage</CardTitle>
          {loading ? <SkeletonBox height={240} className="rounded-xl" /> : (
            <div style={{ height: 240 }}>
              <Bar
                data={{
                  labels: usageLabels,
                  datasets: [
                    { label: 'Appointments', data: usage.slice(-14).map((row) => row.appointments), backgroundColor: '#6DC43F' },
                    { label: 'TeleCare', data: usage.slice(-14).map((row) => row.telecare), backgroundColor: '#3B82F6' },
                    { label: 'Dispatch', data: usage.slice(-14).map((row) => row.dispatch), backgroundColor: '#C0392B' },
                    { label: 'Labs', data: usage.slice(-14).map((row) => row.labOrders), backgroundColor: '#E8930A' },
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
