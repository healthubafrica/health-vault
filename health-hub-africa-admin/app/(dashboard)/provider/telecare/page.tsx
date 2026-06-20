'use client'

import '@livekit/components-styles'
import { useEffect, useState, useCallback, useRef } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import { adminApi, type ProviderSession, type LiveKitJoinInfo, type ProviderSessionStatus } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { Video, RefreshCw, PhoneOff, Clock, User } from 'lucide-react'

const STATUS_PILL: Record<ProviderSessionStatus, 'success' | 'warning' | 'neutral' | 'info' | 'emergency'> = {
  active: 'success',
  in_progress: 'success',
  scheduled: 'info',
  completed: 'neutral',
  cancelled: 'emergency',
  missed: 'warning',
}

function isJoinable(status: ProviderSessionStatus) {
  return status === 'scheduled' || status === 'active' || status === 'in_progress'
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function ProviderTelecarePage() {
  const [sessions, setSessions] = useState<ProviderSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Active call state
  const [joining, setJoining] = useState<string | null>(null) // session id being joined
  const [callInfo, setCallInfo] = useState<LiveKitJoinInfo | null>(null)
  const [activeSession, setActiveSession] = useState<ProviderSession | null>(null)
  const joinStartedAt = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.providerTelecare.sessions()
      setSessions(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleJoin = useCallback(async (session: ProviderSession) => {
    setJoining(session.id)
    try {
      const info = await adminApi.providerTelecare.joinToken(session.id)
      joinStartedAt.current = new Date().toISOString()
      // Mark session as active
      await adminApi.providerTelecare.updateStatus(session.id, 'active', {
        startedAt: joinStartedAt.current,
      }).catch(() => null)
      setActiveSession(session)
      setCallInfo(info)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join call')
    } finally {
      setJoining(null)
    }
  }, [])

  const handleLeave = useCallback(async () => {
    if (!activeSession) return
    const endedAt = new Date().toISOString()
    await adminApi.providerTelecare.updateStatus(activeSession.id, 'completed', {
      endedAt,
    }).catch(() => null)
    setCallInfo(null)
    setActiveSession(null)
    joinStartedAt.current = null
    load()
  }, [activeSession, load])

  const upcoming = sessions.filter((s) => s.status === 'scheduled')
  const active = sessions.filter((s) => s.status === 'active' || s.status === 'in_progress')
  const past = sessions.filter((s) => s.status === 'completed' || s.status === 'cancelled' || s.status === 'missed')

  return (
    <>
      {/* ── In-call overlay ──────────────────────────────────────────────── */}
      {callInfo && activeSession && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0a' }}>
          {/* Header bar */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: '#222', background: '#111' }}
          >
            <div>
              <p className="text-sm font-semibold text-white">
                {activeSession.patient
                  ? `${activeSession.patient.firstName} ${activeSession.patient.lastName}`
                  : activeSession.hhaRef}
              </p>
              <p className="text-xs text-gray-400">
                {activeSession.hhaRef} · {formatDateTime(activeSession.scheduledAt)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLeave}
              className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Leave Call
            </Button>
          </div>

          {/* LiveKit room */}
          <div className="flex-1 min-h-0">
            <LiveKitRoom
              token={callInfo.token}
              serverUrl={callInfo.serverUrl}
              connect
              video
              audio
              onDisconnected={handleLeave}
            >
              <VideoConference />
            </LiveKitRoom>
          </div>
        </div>
      )}

      {/* ── Main page ────────────────────────────────────────────────────── */}
      <div className="max-w-[900px]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              My TeleCare Sessions
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Scheduled and active calls with your patients
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBox key={i} height={80} className="rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Active calls */}
            {active.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Active Now
                </h2>
                <div className="space-y-2">
                  {active.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      joining={joining === s.id}
                      onJoin={() => handleJoin(s)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            <section className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <Card>
                  <p className="text-center text-sm py-6" style={{ color: 'var(--color-text-faint)' }}>
                    No upcoming sessions
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      joining={joining === s.id}
                      onJoin={() => handleJoin(s)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Past Sessions
                </h2>
                <Card padding={false}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                        {['Patient', 'Scheduled', 'Duration', 'Status'].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {past.map((s) => (
                        <tr key={s.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-4 py-2.5">
                            <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                              {s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : '—'}
                            </p>
                            <p className="text-xs font-mono" style={{ color: 'var(--color-text-faint)' }}>{s.hhaRef}</p>
                          </td>
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                            {formatDateTime(s.scheduledAt)}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {s.durationSeconds ? formatDuration(s.durationSeconds) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <Pill variant={STATUS_PILL[s.status] ?? 'neutral'}>{s.status}</Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </section>
            )}

            {sessions.length === 0 && (
              <Card>
                <div className="text-center py-12">
                  <Video className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>No telecare sessions yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>
                    Sessions booked by patients will appear here.
                  </p>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}

function SessionCard({
  session,
  joining,
  onJoin,
}: {
  session: ProviderSession
  joining: boolean
  onJoin: () => void
}) {
  const patientName = session.patient
    ? `${session.patient.firstName} ${session.patient.lastName}`
    : 'Patient'

  const minutesUntil = Math.round(
    (new Date(session.scheduledAt).getTime() - Date.now()) / 60000,
  )
  const isSoon = minutesUntil >= 0 && minutesUntil <= 15
  const isOverdue = minutesUntil < 0 && session.status === 'scheduled'

  return (
    <Card className="flex items-center gap-4">
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--color-border)' }}
      >
        <User className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            {patientName}
          </p>
          <Pill variant={STATUS_PILL[session.status] ?? 'neutral'}>{session.status}</Pill>
          {isSoon && (
            <span className="text-xs font-medium text-orange-500">Starting soon</span>
          )}
          {isOverdue && (
            <span className="text-xs font-medium text-red-500">Overdue</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <Clock className="w-3 h-3" />
            {formatDateTime(session.scheduledAt)}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-faint)' }}>
            {session.hhaRef}
          </span>
        </div>
      </div>

      {/* Join button */}
      {isJoinable(session.status) && (
        <Button variant="primary" size="sm" loading={joining} onClick={onJoin}>
          <Video className="w-3.5 h-3.5" />
          Join Call
        </Button>
      )}
    </Card>
  )
}
