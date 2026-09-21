'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, ChevronRight, ChevronDown } from 'lucide-react'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { adminApi, type MarketingAnalytics, type TrafficAnalytics, type FunnelAnalytics, type DemographicsAnalytics, type ClickstreamAnalytics, type GeoComparison, type GeoMapAnalytics, type GeoMapCountry, type GeoBasis, type RetentionAnalytics, type DigitalExperienceAnalytics, type SecurityAnalytics, type UsageDataPoint, type UsageServiceKey, type RevenueDataPoint } from '@/lib/api'
import dynamic from 'next/dynamic'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatKoboToNaira, formatDateTime } from '@/lib/utils'
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
const SECTIONS = ['Overview', 'Funnels', 'Acquisition', 'Geography', 'Demographics', 'Digital Experience', 'Security'] as const
type Section = (typeof SECTIONS)[number]

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

// Spec §J lifecycle segments (mirrors LIFECYCLE_STAGES in the API). They
// overlap — a patient can be Activated and Returning — and are evaluated
// within the selected period.
const LIFECYCLE_STAGE_OPTIONS = [
  { value: 'anonymous', label: 'Anonymous' },
  { value: 'registered', label: 'Registered' },
  { value: 'verified', label: 'Verified' },
  { value: 'activated', label: 'Activated' },
  { value: 'returning', label: 'Returning' },
]

// Every service the API reports usage for. Series with no activity in the
// visible window are dropped at render time so the legend only lists what's
// actually on the chart.
const USAGE_SERIES: Array<{ key: UsageServiceKey; label: string; color: string }> = [
  { key: 'minuteCare', label: 'MinuteCare', color: '#6DC43F' },
  { key: 'teleCare', label: 'TeleCare', color: '#3B82F6' },
  { key: 'careTest', label: 'CareTest (labs)', color: '#E8930A' },
  { key: 'healthConsult', label: 'HealthConsult', color: '#14B8A6' },
  { key: 'expertReview', label: 'Expert Review', color: '#8B5CF6' },
  { key: 'neuroFlex', label: 'STRIDE / NeuroFlex', color: '#EC4899' },
  { key: 'dispatchCare', label: 'DispatchCare', color: '#C0392B' },
  { key: 'travelSafe', label: 'TravelSafe', color: '#64748B' },
]

// Same look as CHART_OPTIONS, stacked so up to 8 services stay readable per day.
const STACKED_CHART_OPTIONS = {
  ...CHART_OPTIONS,
  scales: {
    x: { ...CHART_OPTIONS.scales.x, stacked: true },
    y: { ...CHART_OPTIONS.scales.y, stacked: true },
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

// Chart.js + the ~100KB world atlas only load when the Geography tab renders the map.
const WorldMap = dynamic(() => import('@/components/analytics/WorldMap'), {
  ssr: false,
  loading: () => <SkeletonBox height={360} className="rounded-xl" />,
})

// Spec §F maps that rest on IP-derived ACCESS geography. The two declared-
// geography maps (Patient Distribution, and "declared vs access") are not
// here on purpose: Patient.country is a hard-coded "Nigeria" default in web
// onboarding, mobile signup and the API, so it isn't real data yet.
const MAP_METRICS: Array<{ key: keyof GeoMapCountry; label: string; kind: 'count' | 'rate'; unit: string }> = [
  { key: 'visitors', label: 'Portal access (unique visitors)', kind: 'count', unit: '' },
  { key: 'sessions', label: 'Engagement (sessions)', kind: 'count', unit: '' },
  { key: 'clicks', label: 'Engagement (clicks)', kind: 'count', unit: '' },
  { key: 'registrations', label: 'Registrations', kind: 'count', unit: '' },
  { key: 'activationRate', label: 'Activation rate', kind: 'rate', unit: '%' },
  { key: 'bookingConversionRate', label: 'Booking conversion', kind: 'rate', unit: '%' },
  { key: 'paymentSuccessRate', label: 'Payment success', kind: 'rate', unit: '%' },
]

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 px-4 py-3 first:pl-0 last:pr-0 border-r last:border-r-0" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-faint)' }}>{detail}</p>
    </div>
  )
}

// Display-only grouping — the API returns raw counts per event name (see
// analytics.service.ts) so newly instrumented events never need a backend
// change; only this ordering needs updating when a new step is added.
const FUNNEL_GROUPS: Record<string, string[]> = {
  'Registration & OTP': ['registration_complete', 'registration_error', 'otp_requested', 'otp_verify_success', 'otp_verify_failure'],
  'Booking': ['service_selected', 'booking_started', 'booking_confirmed', 'booking_error', 'booking_validation_error', 'booking_cancelled', 'booking_rescheduled'],
  'Payments': ['checkout_started', 'payment_pending', 'payment_success', 'payment_failure'],
  'Document Uploads': ['upload_start', 'upload_success', 'upload_failure'],
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="h-40 flex items-center justify-center text-sm text-center px-4" style={{ color: 'var(--color-text-muted)' }}>{children}</div>
}

// ── CSV export ────────────────────────────────────────────────────────────
// Client-side only — every exportable table here is data the page already
// has in memory after fetching, so there's no need for a dedicated backend
// export endpoint (unlike, say, the Users page's export, which streams a
// filtered DB query the client never fully loads).

function csvField(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = [headers, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ExportButton({ onExport, label = 'Export CSV' }: { onExport: () => void; label?: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={onExport}>
      <Download className="w-3.5 h-3.5" />
      {label}
    </Button>
  )
}

function CardHeader({ title, subtitle, onExport }: { title: string; subtitle?: string; onExport?: () => void }) {
  return (
    <div className="px-5 pt-5 flex items-start justify-between gap-3">
      <div>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
      </div>
      {onExport && <ExportButton onExport={onExport} />}
    </div>
  )
}

// World -> Continent -> Country -> Region -> City (spec §B levels 0-5;
// World is this component's implicit root — the array itself). Three-level
// expand state (continent, "continent|country", "continent|country|region"
// for the city list) rather than a generic recursive tree — the hierarchy
// is exactly 4 levels deep, always, so a generic tree component would be
// more code for the same result.
function GeoHierarchyTree({ hierarchy }: { hierarchy: TrafficAnalytics['hierarchy'] }) {
  const [openContinents, setOpenContinents] = useState<Set<string>>(new Set())
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set())
  const [openRegions, setOpenRegions] = useState<Set<string>>(new Set())

  const toggleContinent = (code: string) =>
    setOpenContinents((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  const toggleCountry = (key: string) =>
    setOpenCountries((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  const toggleRegion = (key: string) =>
    setOpenRegions((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
      {hierarchy.map((continent) => {
        const continentOpen = openContinents.has(continent.continentCode)
        return (
          <div key={continent.continentCode}>
            <button
              onClick={() => toggleContinent(continent.continentCode)}
              className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:opacity-80 transition-opacity"
            >
              <span className="flex items-center gap-2 min-w-0">
                {continentOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>{continent.continent}</span>
                <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--color-text-faint)' }}>{continent.countries.length} countr{continent.countries.length === 1 ? 'y' : 'ies'}</span>
              </span>
              <span className="tabular-nums text-sm flex-shrink-0" style={{ color: 'var(--color-text)' }}>{continent.visits}</span>
            </button>
            {continentOpen && (
              <div className="pb-2">
                {continent.countries.map((country) => {
                  const countryKey = `${continent.continentCode}|${country.countryCode}`
                  const countryOpen = openCountries.has(countryKey)
                  return (
                    <div key={countryKey}>
                      <button
                        onClick={() => toggleCountry(countryKey)}
                        className="w-full flex items-center justify-between gap-3 pl-10 pr-5 py-2.5 text-left hover:opacity-80 transition-opacity"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {countryOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                          <span className="font-medium truncate" style={{ color: 'var(--color-text)' }}>{countryName(country.countryCode)}</span>
                          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--color-text-faint)' }}>{country.regions.length} region{country.regions.length === 1 ? '' : 's'}</span>
                        </span>
                        <span className="tabular-nums text-sm flex-shrink-0" style={{ color: 'var(--color-text)' }}>{country.visits}</span>
                      </button>
                      {countryOpen && (
                        <div className="pb-2">
                          {country.regions.map((region) => {
                            const regionKey = `${countryKey}|${region.region}`
                            const regionOpen = openRegions.has(regionKey)
                            return (
                              <div key={regionKey}>
                                <button
                                  onClick={() => toggleRegion(regionKey)}
                                  className="w-full flex items-center justify-between gap-3 pl-16 pr-5 py-2 text-left hover:opacity-80 transition-opacity"
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    {regionOpen ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                                    <span className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>{region.region}</span>
                                  </span>
                                  <span className="tabular-nums text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{region.visits}</span>
                                </button>
                                {regionOpen && (
                                  <div className="pl-24 pr-5 pb-1 flex flex-col gap-1">
                                    {region.cities.map((c) => (
                                      <div key={c.city} className="flex items-center justify-between gap-3 py-0.5">
                                        <span className="text-xs truncate" style={{ color: 'var(--color-text-faint)' }}>{c.city}</span>
                                        <span className="tabular-nums text-xs flex-shrink-0" style={{ color: 'var(--color-text-faint)' }}>{c.visits}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const [section, setSection] = useState<Section>('Overview')
  const [period, setPeriod] = useState('30d')
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([])
  const [usage, setUsage] = useState<UsageDataPoint[]>([])
  const [marketing, setMarketing] = useState<MarketingAnalytics | null>(null)
  const [traffic, setTraffic] = useState<TrafficAnalytics | null>(null)
  const [funnel, setFunnel] = useState<FunnelAnalytics | null>(null)
  const [demographics, setDemographics] = useState<DemographicsAnalytics | null>(null)
  const [clickstream, setClickstream] = useState<ClickstreamAnalytics | null>(null)
  const [geoComparison, setGeoComparison] = useState<GeoComparison | null>(null)
  const [geoMap, setGeoMap] = useState<GeoMapAnalytics | null>(null)
  const [mapMetricKey, setMapMetricKey] = useState<keyof GeoMapCountry>('visitors')
  const [mapBasis, setMapBasis] = useState<GeoBasis>('access')
  const [retention, setRetention] = useState<RetentionAnalytics | null>(null)
  const [digitalExperience, setDigitalExperience] = useState<DigitalExperienceAnalytics | null>(null)
  const [security, setSecurity] = useState<SecurityAnalytics | null>(null)
  const [funnelCountry, setFunnelCountry] = useState('')
  const [funnelContinent, setFunnelContinent] = useState('')
  const [funnelDevice, setFunnelDevice] = useState('')
  const [funnelAgeBand, setFunnelAgeBand] = useState('')
  const [funnelPlanTier, setFunnelPlanTier] = useState('')
  const [funnelGender, setFunnelGender] = useState('')
  const [funnelNationality, setFunnelNationality] = useState('')
  const [funnelBrowser, setFunnelBrowser] = useState('')
  const [funnelOs, setFunnelOs] = useState('')
  const [funnelFeatureArea, setFunnelFeatureArea] = useState('')
  const [funnelTimezone, setFunnelTimezone] = useState('')
  const [funnelAcquisitionSource, setFunnelAcquisitionSource] = useState('')
  const [funnelUtmCampaign, setFunnelUtmCampaign] = useState('')
  const [funnelLifecycleStage, setFunnelLifecycleStage] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [rRes, uRes, mRes, tRes, fRes, demoRes, csRes, gRes, mapRes, retRes, deRes, secRes] = await Promise.all([
        adminApi.analytics.revenue(period),
        adminApi.analytics.usage(period),
        adminApi.analytics.marketing(period),
        adminApi.analytics.traffic(period),
        adminApi.analytics.funnel(period, {
          country: funnelCountry || undefined,
          continent: funnelContinent || undefined,
          device: funnelDevice || undefined,
          ageBand: funnelAgeBand || undefined,
          planTier: funnelPlanTier || undefined,
          gender: funnelGender || undefined,
          nationality: funnelNationality || undefined,
          browser: funnelBrowser || undefined,
          os: funnelOs || undefined,
          featureArea: funnelFeatureArea || undefined,
          timezone: funnelTimezone || undefined,
          acquisitionSource: funnelAcquisitionSource || undefined,
          utmCampaign: funnelUtmCampaign || undefined,
          lifecycleStage: funnelLifecycleStage || undefined,
        }),
        adminApi.analytics.demographics(),
        adminApi.analytics.clickstream(period),
        adminApi.analytics.geoComparison(period),
        adminApi.analytics.geoMap(period, mapBasis),
        adminApi.analytics.retention(),
        adminApi.analytics.digitalExperience(period),
        adminApi.analytics.security(period),
      ])
      setRevenue(rRes.data)
      setUsage(uRes.data)
      setMarketing(mRes.data)
      setTraffic(tRes.data)
      setFunnel(fRes.data)
      setDemographics(demoRes.data)
      setClickstream(csRes.data)
      setGeoComparison(gRes.data)
      setGeoMap(mapRes.data)
      setRetention(retRes.data)
      setDigitalExperience(deRes.data)
      setSecurity(secRes.data)
    } finally {
      setLoading(false)
    }
  }, [period, funnelCountry, funnelContinent, funnelDevice, funnelAgeBand, funnelPlanTier, funnelGender, funnelNationality, funnelBrowser, funnelOs, funnelFeatureArea, funnelTimezone, funnelAcquisitionSource, funnelUtmCampaign, funnelLifecycleStage, mapBasis])

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
  const activationRate = funnel?.kpis.find((k) => k.key === 'activationRate')?.value ?? null
  const maxDeviceCount = useMemo(
    () => Math.max(1, ...(marketing?.devices.map((row) => row.count) ?? [1])),
    [marketing],
  )
  const trafficActivity = traffic?.activity ?? []
  const trafficActivityWindow = period === '90d' ? trafficActivity : trafficActivity.slice(-30)
  const trafficActivityLabels = trafficActivityWindow.map((row) =>
    new Date(row.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
  )
  const funnelCounts = useMemo(
    () => new Map((funnel?.steps ?? []).map((s) => [s.eventName, s.count])),
    [funnel],
  )
  const groupedEventNames = new Set(Object.values(FUNNEL_GROUPS).flat())
  const otherEvents = (funnel?.steps ?? []).filter((s) => !groupedEventNames.has(s.eventName))
  const mapMetric = MAP_METRICS.find((m) => m.key === mapMetricKey) ?? MAP_METRICS[0]
  // Accessible text alternative to the canvas map; also lists countries the atlas can't draw.
  const topMapCountries = (geoMap?.countries ?? [])
    .filter((c) => typeof c[mapMetric.key] === 'number' && (c[mapMetric.key] as number) > 0)
    .sort((a, b) => (b[mapMetric.key] as number) - (a[mapMetric.key] as number))
    .slice(0, 10)
  const topTrafficLocation = traffic?.locations[0]
  const maxTrafficDeviceCount = useMemo(
    () => Math.max(1, ...(traffic?.devices.map((row) => row.count) ?? [1])),
    [traffic],
  )
  const maxPortalDeviceCount = useMemo(
    () => Math.max(1, ...(digitalExperience?.devices.map((row) => row.count) ?? [1])),
    [digitalExperience],
  )
  const maxBrowserCount = useMemo(
    () => Math.max(1, ...(digitalExperience?.browsers.map((row) => row.count) ?? [1])),
    [digitalExperience],
  )
  const maxAgeBandCount = useMemo(
    () => Math.max(1, ...(demographics?.ageBands.map((row) => row.count) ?? [1])),
    [demographics],
  )
  const maxGenderCount = useMemo(
    () => Math.max(1, ...(demographics?.genders.map((row) => row.count) ?? [1])),
    [demographics],
  )
  const maxNationalityCount = useMemo(
    () => Math.max(1, ...(demographics?.nationalities.map((row) => row.count) ?? [1])),
    [demographics],
  )
  const maxPlanTierCount = useMemo(
    () => Math.max(1, ...(demographics?.planTiers.map((row) => row.count) ?? [1])),
    [demographics],
  )

  const exportFunnelSteps = () =>
    downloadCsv(
      `funnel-steps-${period}.csv`,
      ['Event', 'Count', 'Unique users', 'Unique sessions'],
      (funnel?.steps ?? []).map((s) => [s.eventName, s.count, s.uniqueUsers, s.uniqueSessions]),
    )
  const exportClickstream = () =>
    downloadCsv(
      `cta-clickstream-${period}.csv`,
      ['Element', 'Impressions', 'Unique impressions', 'Clicks', 'Unique clicks', 'CTR %'],
      (clickstream?.ctas ?? []).map((c) => [c.elementId, c.impressions, c.uniqueImpressions, c.clicks, c.uniqueClicks, c.ctr ?? '']),
    )
  const exportGeoComparison = () =>
    downloadCsv(
      `declared-vs-access-geography-${period}.csv`,
      ['Declared country', 'Access country', 'Patients', 'Diaspora'],
      (geoComparison?.comparisons ?? []).map((c) => [c.declaredCountry, c.accessCountry, c.patients, c.matches ? 'No' : 'Yes']),
    )
  const exportDemographics = () =>
    downloadCsv(
      'demographics.csv',
      ['Dimension', 'Value', 'Patients'],
      [
        ...(demographics?.ageBands ?? []).map((r) => ['Age band', r.label, r.count]),
        ...(demographics?.genders ?? []).map((r) => ['Gender', r.label, r.count]),
        ...(demographics?.nationalities ?? []).map((r) => ['Nationality', r.label, r.count]),
        ...(demographics?.planTiers ?? []).map((r) => ['Plan tier', r.label, r.count]),
      ] as Array<[string, string, number]>,
    )
  const exportCampaigns = () =>
    downloadCsv(
      `campaign-performance-${period}.csv`,
      ['Campaign', 'Source', 'Medium', 'Registrations', 'Logins'],
      (marketing?.campaigns ?? []).map((c) => [c.campaign, c.source, c.medium, c.registrations, c.logins]),
    )
  const exportVisitorLocations = () =>
    downloadCsv(
      `visitor-locations-${period}.csv`,
      ['Country', 'Region', 'City', 'Visits'],
      (traffic?.locations ?? []).map((l) => [countryName(l.countryCode), l.region, l.city, l.visits]),
    )
  const exportTopErrors = () =>
    downloadCsv(
      `client-errors-${period}.csv`,
      ['Message', 'Occurrences'],
      (digitalExperience?.topErrors ?? []).map((e) => [e.message, e.count]),
    )
  const exportLocationAnomalies = () =>
    downloadCsv(
      `login-location-anomalies-${period}.csv`,
      ['Email', 'From country', 'To country', 'Occurred at'],
      (security?.locationAnomalies ?? []).map((a) => [a.email, a.fromCountry, a.toCountry, formatDateTime(a.occurredAt)]),
    )

  return (
    <div className="max-w-[1200px] pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Acquisition, funnels, geography, revenue, and service usage
          </p>
        </div>
        <FilterTabs tabs={PERIODS} active={period} onChange={setPeriod} />
      </div>

      <FilterTabs tabs={[...SECTIONS]} active={section} onChange={(s) => setSection(s as Section)} className="mb-5 w-fit" />

      {section === 'Overview' && (
        <>
          {loading && !marketing ? (
            <SkeletonBox height={88} className="rounded-xl mb-4" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 mb-4 border-y" style={{ borderColor: 'var(--color-border)' }}>
              <Metric label="Registrations" value={String(marketing?.totals.registrations ?? 0)} detail={`${verifiedRate}% verified`} />
              <Metric label="Activation rate" value={activationRate === null ? '—' : `${activationRate}%`} detail="Registered → took a meaningful action" />
              <Metric label="Site visits" value={String(traffic?.totalVisits ?? 0)} detail="Anonymous marketing-site pageviews" />
              <Metric label="Unique login users" value={String(marketing?.totals.uniqueLoginUsers ?? 0)} detail={`${marketing?.totals.logins ?? 0} sign-ins`} />
              <Metric label="Revenue" value={formatKoboToNaira(revenue.reduce((sum, row) => sum + row.amount, 0))} detail={`Across the last ${period}`} />
            </div>
          )}

          <Card className="mb-4">
            <CardTitle>Registrations and logins</CardTitle>
            {loading ? <SkeletonBox height={250} className="rounded-xl" /> : activityWindow.length === 0 ? (
              <Empty>No acquisition activity in this period. Numbers will appear once patients start registering.</Empty>
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

          <Card className="mb-6" padding={false}>
            <CardHeader
              title="Retention"
              subtitle={`Registered patients who returned N+ days later, out of ${retention?.cohortSize ?? 0} registered in the last ${retention?.lookbackDays ?? 120} days (cohort definition v${retention?.cohortDefinitionVersion ?? 1})`}
            />
            {!loading && !retention?.windows.some((w) => w.eligibleCohortSize > 0) ? (
              <Empty>No cohort has reached a retention window yet — check back once patients have been registered for a few days.</Empty>
            ) : (
              // grid-cols-2/md:5 rather than divide-x: 5 windows (D1/D7/D30/D60/D90)
              // don't all fit on one row below md, and divide-x's border-left
              // approach draws a stray line on whichever cell wraps to a new
              // row — Metric's own border-r per-cell doesn't have that problem.
              <div className="grid grid-cols-2 md:grid-cols-5 border-y" style={{ borderColor: 'var(--color-border)' }}>
                {(retention?.windows ?? []).map((w) => (
                  <Metric
                    key={w.days}
                    label={`D${w.days}`}
                    value={w.rate === null ? '—' : `${w.rate}%`}
                    detail={w.eligibleCohortSize === 0 ? 'No eligible cohort yet' : `${w.retainedUsers} of ${w.eligibleCohortSize}`}
                  />
                ))}
              </div>
            )}
          </Card>

          <div className="mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Revenue and service usage</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle>Revenue (₦)</CardTitle>
              {loading ? <SkeletonBox height={240} className="rounded-xl" /> : revenue.length === 0 ? (
                <Empty>No payments in this period.</Empty>
              ) : (
                <div style={{ height: 240 }}>
                  <Line data={{ labels: revenueLabels, datasets: [{ label: 'Revenue', data: revenueValues, borderColor: '#6DC43F', backgroundColor: 'rgba(109,196,63,0.08)', tension: 0.4, fill: true, pointRadius: 3 }] }} options={CHART_OPTIONS} />
                </div>
              )}
            </Card>
            <Card>
              <CardTitle>Service usage</CardTitle>
              {loading ? <SkeletonBox height={240} className="rounded-xl" /> : usage.length === 0 ? (
                <Empty>No service activity in this period.</Empty>
              ) : (
                <div style={{ height: 240 }}>
                  <Bar
                    data={{
                      labels: usageLabels,
                      datasets: USAGE_SERIES.filter((series) => usage.slice(-14).some((row) => row[series.key] > 0)).map((series) => ({
                        label: series.label,
                        data: usage.slice(-14).map((row) => row[series.key]),
                        backgroundColor: series.color,
                      })),
                    }}
                    options={STACKED_CHART_OPTIONS}
                  />
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {section === 'Funnels' && (
        <>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Funnels</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Step counts for the selected period, in funnel order</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={funnelContinent}
                onChange={(e) => setFunnelContinent(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by continent"
              >
                <option value="">All continents</option>
                {Array.from(new Set((traffic?.locations ?? []).map((l) => l.continent))).map((continent) => (
                  <option key={continent} value={continent}>{continent}</option>
                ))}
              </select>
              <select
                value={funnelCountry}
                onChange={(e) => setFunnelCountry(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by country"
              >
                <option value="">All countries</option>
                {Array.from(new Set((traffic?.locations ?? []).map((l) => l.countryCode))).map((code) => (
                  <option key={code} value={code}>{countryName(code)}</option>
                ))}
              </select>
              <select
                value={funnelDevice}
                onChange={(e) => setFunnelDevice(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by device"
              >
                <option value="">All devices</option>
                {Array.from(new Set((traffic?.devices ?? []).map((d) => d.device))).map((device) => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
              <select
                value={funnelAgeBand}
                onChange={(e) => setFunnelAgeBand(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by age band"
              >
                <option value="">All age bands</option>
                {(demographics?.ageBands ?? []).map((b) => (
                  <option key={b.label} value={b.label}>{b.label}</option>
                ))}
              </select>
              <select
                value={funnelPlanTier}
                onChange={(e) => setFunnelPlanTier(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by plan tier"
              >
                <option value="">All plan tiers</option>
                {(demographics?.planTiers ?? []).map((t) => (
                  <option key={t.label} value={t.label}>{t.label}</option>
                ))}
              </select>
              <select
                value={funnelGender}
                onChange={(e) => setFunnelGender(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by sex/gender"
              >
                <option value="">All genders</option>
                {(demographics?.genders ?? []).map((g) => (
                  <option key={g.label} value={g.label}>{g.label}</option>
                ))}
              </select>
              <select
                value={funnelNationality}
                onChange={(e) => setFunnelNationality(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by nationality"
              >
                <option value="">All nationalities</option>
                {(demographics?.nationalities ?? []).map((n) => (
                  <option key={n.label} value={n.label}>{n.label}</option>
                ))}
              </select>
              <select
                value={funnelBrowser}
                onChange={(e) => setFunnelBrowser(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by browser"
              >
                <option value="">All browsers</option>
                {(digitalExperience?.browsers ?? []).map((b) => (
                  <option key={b.browser} value={b.browser}>{b.browser}</option>
                ))}
              </select>
              <select
                value={funnelOs}
                onChange={(e) => setFunnelOs(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by operating system"
              >
                <option value="">All operating systems</option>
                {(digitalExperience?.operatingSystems ?? []).map((o) => (
                  <option key={o.os} value={o.os}>{o.os}</option>
                ))}
              </select>
              <select
                value={funnelFeatureArea}
                onChange={(e) => setFunnelFeatureArea(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by feature area"
              >
                <option value="">All feature areas</option>
                {(digitalExperience?.featureAreas ?? []).map((f) => (
                  <option key={f.featureArea} value={f.featureArea}>{f.featureArea}</option>
                ))}
              </select>
              <select
                value={funnelTimezone}
                onChange={(e) => setFunnelTimezone(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by timezone"
              >
                <option value="">All timezones</option>
                {(digitalExperience?.timezones ?? []).map((t) => (
                  <option key={t.timezone} value={t.timezone}>{t.timezone}</option>
                ))}
              </select>
              <select
                value={funnelAcquisitionSource}
                onChange={(e) => setFunnelAcquisitionSource(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by acquisition source"
              >
                <option value="">All acquisition sources</option>
                {(marketing?.acquisitionSources ?? []).map((s) => (
                  <option key={s.source} value={s.source}>{s.source}</option>
                ))}
              </select>
              <select
                value={funnelUtmCampaign}
                onChange={(e) => setFunnelUtmCampaign(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by UTM campaign"
              >
                <option value="">All campaigns</option>
                {Array.from(new Set((marketing?.campaigns ?? []).map((c) => c.campaign))).map((campaign) => (
                  <option key={campaign} value={campaign}>{campaign}</option>
                ))}
              </select>
              <select
                value={funnelLifecycleStage}
                onChange={(e) => setFunnelLifecycleStage(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Filter funnels by lifecycle stage"
              >
                <option value="">All lifecycle stages</option>
                {LIFECYCLE_STAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ExportButton onExport={exportFunnelSteps} />
            </div>
          </div>

          {!loading && !funnel?.steps.length ? (
            <Card className="mb-6"><Empty>No instrumented events yet for this filter combination.</Empty></Card>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {(funnel?.kpis ?? []).map((kpi) => (
                  <Card key={kpi.key}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{kpi.value === null ? '—' : `${kpi.value}%`}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                      {kpi.denominator === 0 ? 'No data yet' : `${kpi.numerator} of ${kpi.denominator}`}
                    </p>
                  </Card>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-4 mb-6">
                {Object.entries(FUNNEL_GROUPS).map(([groupName, eventNames]) => {
                  const firstStepCount = funnelCounts.get(eventNames[0]) ?? 0
                  return (
                    <Card key={groupName} padding={false}>
                      <div className="px-5 pt-5"><CardTitle>{groupName}</CardTitle></div>
                      {!loading && firstStepCount === 0 && eventNames.every((n) => !funnelCounts.get(n)) ? (
                        <Empty>No events yet.</Empty>
                      ) : (
                        <div className="px-5 pb-5 pt-2 flex flex-col gap-2">
                          {eventNames.map((eventName) => {
                            const count = funnelCounts.get(eventName) ?? 0
                            const pct = firstStepCount > 0 ? Math.round((count / firstStepCount) * 100) : 0
                            return (
                              <div key={eventName} className="flex items-center justify-between text-sm">
                                <span style={{ color: 'var(--color-text-muted)' }}>{eventName}</span>
                                <span className="tabular-nums font-medium" style={{ color: 'var(--color-text)' }}>
                                  {count}{firstStepCount > 0 && eventName !== eventNames[0] ? ` (${pct}%)` : ''}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>

              <Card className="mb-6" padding={false}>
                <CardHeader
                  title="Top CTAs — impressions, clicks & CTR"
                  subtitle="CTR = unique clickers ÷ unique viewers. Only elements wrapped in <TrackImpression> report impressions today."
                  onExport={clickstream?.ctas.length ? exportClickstream : undefined}
                />
                {!loading && !clickstream?.ctas.length ? (
                  <Empty>No instrumented CTAs have been seen yet.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                          <th className="px-5 py-2.5 font-semibold">Element</th>
                          <th className="px-5 py-2.5 font-semibold text-right">Impressions</th>
                          <th className="px-5 py-2.5 font-semibold text-right">Clicks</th>
                          <th className="px-5 py-2.5 font-semibold text-right">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(clickstream?.ctas ?? []).map((row) => (
                          <tr key={row.elementId} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                            <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{row.elementId}</td>
                            <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.uniqueImpressions}</td>
                            <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.uniqueClicks}</td>
                            <td className="px-5 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--color-text)' }}>
                              {row.ctr === null ? '—' : `${row.ctr}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {otherEvents.length > 0 && (
                <Card className="mb-6" padding={false}>
                  <div className="px-5 pt-5"><CardTitle>Other events</CardTitle></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                          <th className="px-5 py-2.5 font-semibold">Event</th>
                          <th className="px-5 py-2.5 font-semibold text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherEvents.map((row) => (
                          <tr key={row.eventName} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                            <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{row.eventName}</td>
                            <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {section === 'Acquisition' && (
        <>
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
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

            <Card>
              <CardTitle>Attribution rate</CardTitle>
              <div className="pt-2">
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{attributedRate}%</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {marketing?.totals.attributedRegistrations ?? 0} of {marketing?.totals.registrations ?? 0} registrations carry a UTM-tagged campaign
                </p>
              </div>
            </Card>
          </div>

          <Card className="mb-4" padding={false}>
            <CardHeader title="Campaign performance" onExport={marketing?.campaigns.length ? exportCampaigns : undefined} />
            {!loading && !marketing?.campaigns.length ? (
              <Empty>No UTM-tagged campaign activity yet. Add utm_source/utm_campaign to your links to see them here.</Empty>
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

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
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
              {loading ? <SkeletonBox height={140} className="rounded-xl" /> : !marketing?.devices.length ? (
                <Empty>No login-device data yet.</Empty>
              ) : (
                <div className="space-y-4">
                  {marketing.devices.map((row) => (
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
              )}
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
        </>
      )}

      {section === 'Geography' && (
        <>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Global portal map</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {mapBasis === 'access'
                  ? 'Where portal sessions connect from — approximate, IP-derived, aggregated by country. This is access geography, not where patients say they live.'
                  : "Where patients say they live — only patients who were actually asked (see Profile/onboarding) have a value, so this is likely sparse until adoption grows."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterTabs
                tabs={['Access', 'Declared']}
                active={mapBasis === 'access' ? 'Access' : 'Declared'}
                onChange={(t) => setMapBasis(t === 'Access' ? 'access' : 'declared')}
              />
              <select
                value={mapMetricKey}
                onChange={(e) => setMapMetricKey(e.target.value as keyof GeoMapCountry)}
                className="h-8 px-2 text-xs rounded-lg border outline-none cursor-pointer"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Map metric"
              >
                {MAP_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Card className="mb-6">
            {loading && !geoMap ? (
              <SkeletonBox height={360} className="rounded-xl" />
            ) : !geoMap?.countries.length ? (
              <Empty>
                {mapBasis === 'access'
                  ? 'No located portal activity in this period yet.'
                  : 'No patients have declared a country yet — add it from Profile or during onboarding.'}
              </Empty>
            ) : (
              <div className="grid lg:grid-cols-[1.8fr_1fr] gap-5">
                <WorldMap
                  countries={geoMap.countries.map((c) => ({ countryCode: c.countryCode, value: c[mapMetric.key] as number | null }))}
                  metricLabel={mapMetric.label}
                  kind={mapMetric.kind}
                  unit={mapMetric.unit}
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Top countries — {mapMetric.label}
                  </p>
                  <ol className="text-xs">
                    {topMapCountries.map((c) => (
                      <li key={c.countryCode} className="flex items-center justify-between py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                        <span style={{ color: 'var(--color-text)' }}>{countryName(c.countryCode)} <span style={{ color: 'var(--color-text-faint)' }}>· {c.continent}</span></span>
                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{(c[mapMetric.key] as number).toLocaleString()}{mapMetric.unit}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </Card>

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

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 mb-4">
            <Card padding={false}>
              <CardHeader title="Visitor locations" onExport={traffic?.locations.length ? exportVisitorLocations : undefined} />
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

          <Card className="mb-4" padding={false}>
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

          <Card className="mb-4" padding={false}>
            <div className="px-5 pt-5">
              <CardTitle>Geo hierarchy</CardTitle>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Country → region → city, drilled from the same visitor locations above. City is the finest level without a paid GeoIP vendor.
              </p>
            </div>
            {!loading && !traffic?.hierarchy.length ? (
              <Empty>No site visits recorded in this period.</Empty>
            ) : (
              <div className="pt-2">
                <GeoHierarchyTree hierarchy={traffic?.hierarchy ?? []} />
              </div>
            )}
          </Card>

          <Card padding={false}>
            <CardHeader
              title="Declared vs. access geography"
              subtitle={`Where patients say they live vs. where their sessions actually originate${geoComparison ? ` — ${geoComparison.diasporaPatients} of ${geoComparison.declaredPatients} patients who declared a country access from a different one (${geoComparison.undeclaredPatients} haven't declared one yet)` : ''}`}
              onExport={geoComparison?.comparisons.length ? exportGeoComparison : undefined}
            />
            {!loading && !geoComparison?.comparisons.length ? (
              <Empty>No authenticated sessions with geo data yet.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th className="px-5 py-2.5 font-semibold">Declared</th>
                      <th className="px-4 py-2.5 font-semibold">Accessing from</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Patients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(geoComparison?.comparisons ?? []).slice(0, 20).map((row) => (
                      <tr key={`${row.declaredCountry}-${row.accessCountry}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{row.declaredCountry}</td>
                        <td className="px-4 py-3" style={{ color: row.matches ? 'var(--color-text-muted)' : 'var(--color-warning, #E8930A)' }}>
                          {row.accessCountry}{!row.matches && ' (diaspora)'}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.patients}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {section === 'Demographics' && (
        <>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Demographics</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Age band, sex/gender, nationality, and plan tier — a population snapshot of the current active patient base, not time-windowed like the other tabs
              </p>
            </div>
            <ExportButton onExport={exportDemographics} />
          </div>

          {loading && !demographics ? (
            <SkeletonBox height={88} className="rounded-xl mb-4" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 mb-4 border-y" style={{ borderColor: 'var(--color-border)' }}>
              <Metric label="Active patients" value={String(demographics?.totalPatients ?? 0)} detail="Accounts, not soft-deleted" />
              <Metric label="Top age band" value={demographics?.ageBands.slice().sort((a, b) => b.count - a.count)[0]?.label ?? '—'} detail={demographics?.ageBands.length ? `${demographics.ageBands.length} bands represented` : 'No data yet'} />
              <Metric label="Top nationality" value={demographics?.nationalities[0]?.label ?? '—'} detail={demographics?.nationalities[0] ? `${demographics.nationalities[0].count} patients` : 'No data yet'} />
              <Metric label="Top plan" value={demographics?.planTiers[0]?.label ?? '—'} detail={demographics?.planTiers[0] ? `${demographics.planTiers[0].count} patients` : 'No data yet'} />
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardTitle>Age bands</CardTitle>
              {!loading && !demographics?.ageBands.length ? (
                <Empty>No patients yet.</Empty>
              ) : (
                <div className="space-y-4 pt-1">
                  {(demographics?.ageBands ?? []).map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.label}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{row.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full bg-[#6DC43F] transition-[width] duration-300" style={{ width: `${(row.count / maxAgeBandCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardTitle>Sex / gender (as collected)</CardTitle>
              {!loading && !demographics?.genders.length ? (
                <Empty>No patients yet.</Empty>
              ) : (
                <div className="space-y-4 pt-1">
                  {(demographics?.genders ?? []).map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.label}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{row.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-300" style={{ width: `${(row.count / maxGenderCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardTitle>Nationality</CardTitle>
              {!loading && !demographics?.nationalities.length ? (
                <Empty>No patients yet.</Empty>
              ) : (
                <div className="space-y-4 pt-1">
                  {(demographics?.nationalities ?? []).slice(0, 10).map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.label}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{row.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full bg-[#E8930A] transition-[width] duration-300" style={{ width: `${(row.count / maxNationalityCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardTitle>Subscription plan tier</CardTitle>
              {!loading && !demographics?.planTiers.length ? (
                <Empty>No patients yet.</Empty>
              ) : (
                <div className="space-y-4 pt-1">
                  {(demographics?.planTiers ?? []).map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.label}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{row.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full bg-[#C0392B] transition-[width] duration-300" style={{ width: `${(row.count / maxPlanTierCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {section === 'Digital Experience' && (
        <>
          <div className="mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Digital Experience</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Device/browser mix and client-side errors on the patient portal itself — distinct from the anonymous marketing-site traffic under Geography
            </p>
          </div>

          {loading && !digitalExperience ? (
            <SkeletonBox height={88} className="rounded-xl mb-4" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 mb-4 border-y" style={{ borderColor: 'var(--color-border)' }}>
              <Metric label="Portal events" value={String(digitalExperience?.totalEvents ?? 0)} detail={`Across the last ${period}`} />
              <Metric label="Top device" value={digitalExperience?.devices[0]?.device ?? '—'} detail={digitalExperience?.devices[0] ? `${digitalExperience.devices[0].count} events` : 'No data yet'} />
              <Metric label="Top browser" value={digitalExperience?.browsers[0]?.browser ?? '—'} detail={digitalExperience?.browsers[0] ? `${digitalExperience.browsers[0].count} events` : 'No data yet'} />
              <Metric label="Client error rate" value={digitalExperience?.errorRate === null || digitalExperience?.errorRate === undefined ? '—' : `${digitalExperience.errorRate}%`} detail={`${digitalExperience?.errorCount ?? 0} errors captured`} />
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardTitle>Portal devices</CardTitle>
              {!loading && !digitalExperience?.devices.length ? (
                <Empty>No device data yet.</Empty>
              ) : (
                <div className="space-y-4 pt-1">
                  {(digitalExperience?.devices ?? []).map((row) => (
                    <div key={row.device}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.device}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{row.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full bg-[#6DC43F] transition-[width] duration-300" style={{ width: `${(row.count / maxPortalDeviceCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardTitle>Portal browsers</CardTitle>
              {!loading && !digitalExperience?.browsers.length ? (
                <Empty>No browser data yet.</Empty>
              ) : (
                <div className="space-y-4 pt-1">
                  {(digitalExperience?.browsers ?? []).map((row) => (
                    <div key={row.browser}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.browser}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{row.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-300" style={{ width: `${(row.count / maxBrowserCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card padding={false}>
            <CardHeader title="Top client errors" subtitle="Captured via window error and unhandled-rejection listeners on the portal" onExport={digitalExperience?.topErrors.length ? exportTopErrors : undefined} />
            {!loading && !digitalExperience?.topErrors.length ? (
              <Empty>No client-side errors captured in this period. 🎉</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th className="px-5 py-2.5 font-semibold">Message</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Occurrences</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(digitalExperience?.topErrors ?? []).map((row) => (
                      <tr key={row.message} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--color-text)' }}>{row.message}</td>
                        <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {section === 'Security' && (
        <>
          <div className="mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Security</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Login failure trends and cross-country login anomalies, across every role — not just patients
            </p>
          </div>

          {loading && !security ? (
            <SkeletonBox height={88} className="rounded-xl mb-4" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 mb-4 border-y" style={{ borderColor: 'var(--color-border)' }}>
              <Metric label="Login attempts" value={String(security?.totalAttempts ?? 0)} detail={`Across the last ${period}`} />
              <Metric label="Failure rate" value={security?.failureRate === null || security?.failureRate === undefined ? '—' : `${security.failureRate}%`} detail={`${security?.failureCount ?? 0} failed attempts`} />
              <Metric label="Top failure location" value={security?.failedLoginLocations[0]?.countryCode ?? '—'} detail={security?.failedLoginLocations[0] ? `${security.failedLoginLocations[0].count} failures` : 'No failures yet'} />
              <Metric label="Location anomalies" value={String(security?.locationAnomalies.length ?? 0)} detail="Same account, different country back-to-back" />
            </div>
          )}

          <Card className="mb-4">
            <CardTitle>Failed login attempts over time</CardTitle>
            {loading ? <SkeletonBox height={220} className="rounded-xl" /> : !security?.failedAttemptsByDay.some((d) => d.count > 0) ? (
              <Empty>No failed login attempts in this period. 🎉</Empty>
            ) : (
              <div style={{ height: 220 }}>
                <Line
                  data={{
                    labels: (period === '90d' ? security.failedAttemptsByDay : security.failedAttemptsByDay.slice(-30)).map((row) =>
                      new Date(row.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
                    ),
                    datasets: [
                      { label: 'Failed attempts', data: (period === '90d' ? security.failedAttemptsByDay : security.failedAttemptsByDay.slice(-30)).map((row) => row.count), borderColor: '#C0392B', backgroundColor: 'rgba(192,57,43,0.08)', tension: 0.35, fill: true, pointRadius: 2 },
                    ],
                  }}
                  options={CHART_OPTIONS}
                />
              </div>
            )}
          </Card>

          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
            <Card padding={false}>
              <div className="px-5 pt-5"><CardTitle>Failed-login locations</CardTitle></div>
              {!loading && !security?.failedLoginLocations.length ? (
                <Empty>No failed login attempts in this period.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <th className="px-5 py-2.5 font-semibold">Country</th>
                        <th className="px-5 py-2.5 font-semibold text-right">Failures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(security?.failedLoginLocations ?? []).map((row) => (
                        <tr key={row.countryCode} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{countryName(row.countryCode)}</td>
                          <td className="px-5 py-3 text-right tabular-nums" style={{ color: 'var(--color-text)' }}>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card padding={false}>
              <CardHeader title="Location anomalies" subtitle="Same account's successive successful logins from different countries" onExport={security?.locationAnomalies.length ? exportLocationAnomalies : undefined} />
              {!loading && !security?.locationAnomalies.length ? (
                <Empty>No cross-country login anomalies in this period.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <th className="px-5 py-2.5 font-semibold">Account</th>
                        <th className="px-4 py-2.5 font-semibold">Country change</th>
                        <th className="px-5 py-2.5 font-semibold text-right">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(security?.locationAnomalies ?? []).map((row) => (
                        <tr key={`${row.userId}-${row.occurredAt}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-5 py-3 font-medium truncate max-w-[180px]" style={{ color: 'var(--color-text)' }}>{row.email}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-warning, #E8930A)' }}>{countryName(row.fromCountry)} → {countryName(row.toCountry)}</td>
                          <td className="px-5 py-3 text-right text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{formatDateTime(row.occurredAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
