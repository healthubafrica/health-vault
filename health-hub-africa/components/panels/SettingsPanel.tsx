'use client'

import { toast } from 'sonner'
import { Pill } from '@/components/ui/Pill'
import { IdChip } from '@/components/ui/IdChip'
import { patients, subscriptions } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { useSettingsStore } from '@/lib/settingsStore'
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  MonitorSmartphone,
  Lock,
  BookOpen,
  LifeBuoy,
  ChevronRight,
} from 'lucide-react'

const QUICK_LINKS = [
  { icon: Lock, label: 'Change Password' },
  { icon: MonitorSmartphone, label: 'Manage Sessions' },
  { icon: BookOpen, label: 'Privacy Policy' },
  { icon: LifeBuoy, label: 'Help & Support' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </p>
  )
}

export function SettingsPanel() {
  const { twoFa, dataSharing, analyticsConsent, researchConsent, marketingEmails } = useSettingsStore()
  const { data: profileRes } = useApi(() => patients.getMyProfile())
  const { data: subRes } = useApi(() => subscriptions.getMy())

  const profile = profileRes?.data
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : ''
  const email = profile?.user?.email ?? ''
  const hhaId = profile?.hhaPatientId ?? ''
  const planName = subRes?.data?.plan?.name ?? 'Free'

  const securityItems = [
    { label: 'Two-Factor Auth', value: twoFa ? 'Enabled' : 'Not enabled', ok: twoFa },
    { label: 'Password', value: 'Last updated 30 days ago', ok: true },
    { label: 'Active Sessions', value: '3 devices', ok: true },
    { label: 'Login Alerts', value: 'Email enabled', ok: true },
  ]

  const privacyConsents = [
    { label: 'Data sharing with providers', granted: dataSharing },
    { label: 'Analytics & usage data', granted: analyticsConsent },
    { label: 'Medical research participation', granted: researchConsent },
    { label: 'Marketing communications', granted: marketingEmails },
  ]

  const securityScore = securityItems.filter(i => i.ok).length
  const securityMax = securityItems.length
  const securityPct = Math.round((securityScore / securityMax) * 100)
  const isSecure = securityScore === securityMax

  const consentsGranted = privacyConsents.filter(c => c.granted).length

  return (
    <div className="flex flex-col gap-5 p-4">

      {/* Account snapshot */}
      <div>
        <SectionLabel>Account</SectionLabel>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            {displayName}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{email}</p>
          <div className="flex items-center gap-2 mt-1">
            <IdChip>{hhaId}</IdChip>
            <Pill variant="success">{planName} Plan</Pill>
          </div>
        </div>
      </div>

      {/* Security score */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <SectionLabel>Security Score</SectionLabel>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-14 h-14 shrink-0">
            <svg width="56" height="56" viewBox="0 0 56 56" aria-label={`Security score ${securityPct}%`}>
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-border)" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24" fill="none"
                stroke={isSecure ? '#6DC43F' : '#E67E22'}
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 24}
                strokeDashoffset={2 * Math.PI * 24 * (1 - securityPct / 100)}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isSecure
                ? <ShieldCheck size={18} className="text-[#6DC43F]" />
                : <ShieldAlert size={18} className="text-[#E67E22]" />
              }
            </div>
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              {securityScore}/{securityMax} checks passed
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {isSecure ? 'Your account is secure' : 'Action recommended'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-0">
          {securityItems.map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 py-2.5 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{item.label}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.value}</span>
              </div>
              {item.ok
                ? <CheckCircle2 size={15} className="shrink-0 text-[#6DC43F]" />
                : <XCircle size={15} className="shrink-0 text-[#C0392B]" />
              }
            </div>
          ))}
        </div>
      </div>

      {/* Privacy consents */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Privacy Consents</SectionLabel>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          <span className="font-bold" style={{ color: 'var(--color-text)' }}>{consentsGranted} of {privacyConsents.length}</span> consents granted
        </p>
        <div className="flex flex-col gap-0">
          {privacyConsents.map(c => (
            <div
              key={c.label}
              className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.label}</span>
              {c.granted
                ? <Pill variant="success">On</Pill>
                : <Pill variant="neutral">Off</Pill>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Last activity */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <SectionLabel>Last Activity</SectionLabel>
        <div className="flex items-center gap-2">
          <Clock size={13} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Signed in <span className="font-semibold" style={{ color: 'var(--color-text)' }}>2 minutes ago</span>
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <MonitorSmartphone size={13} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Chrome on MacBook Pro · Lagos, NG
          </span>
        </div>
      </div>

      {/* Quick links */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <SectionLabel>Quick Links</SectionLabel>
        <div className="flex flex-col gap-0">
          {QUICK_LINKS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => toast.info(`${label} is coming soon`)}
              className="flex items-center justify-between gap-2 py-2.5 border-b last:border-b-0 text-left w-full group"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Icon size={13} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs font-medium group-hover:underline" style={{ color: 'var(--color-text)' }}>
                  {label}
                </span>
              </div>
              <ChevronRight size={13} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
