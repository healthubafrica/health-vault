'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  adminApi,
  type ProviderSession,
  type LiveKitJoinInfo,
  type SessionNote,
} from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { Video, RefreshCw, Loader2 } from 'lucide-react'
import { IncomingCallBanner } from './components/IncomingCallBanner'
import { TransferModal } from './components/TransferModal'
import { SoapNotesModal } from './components/SoapNotesModal'
import { SessionCard } from './components/SessionCard'
import { MetricsGrid } from './components/MetricsGrid'
import { CallOverlay } from './components/CallOverlay'
import type { TelecareMetrics } from './components/helpers'

export default function ProviderTelecarePage() {
  const [sessions, setSessions] = useState<ProviderSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Availability toggle — initial state comes from the server so a page
  // reload doesn't silently show "Offline" while the provider is online.
  const [available, setAvailable] = useState(false)
  const [togglingAvail, setTogglingAvail] = useState(false)

  const [metrics, setMetrics] = useState<TelecareMetrics | null>(null)

  // Active call state
  const [joining, setJoining] = useState<string | null>(null)
  const [callInfo, setCallInfo] = useState<LiveKitJoinInfo | null>(null)
  const [activeSession, setActiveSession] = useState<ProviderSession | null>(null)
  const [callAudioOnly, setCallAudioOnly] = useState(false)
  const joinStartedAt = useRef<string | null>(null)

  const [documentingSession, setDocumentingSession] = useState<ProviderSession | null>(null)

  const [waitingSessions, setWaitingSessions] = useState<ProviderSession[]>([])
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)

  const [transferringSession, setTransferringSession] = useState<ProviderSession | null>(null)

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

  // Sync the availability pill with the server on mount.
  useEffect(() => {
    adminApi.providerTelecare.getAvailability()
      .then((res) => setAvailable(res.isAvailable))
      .catch(() => null)
  }, [])

  // Refresh sessions + metrics on focus/visibility and on a 15s interval so
  // status flips (accept, decline, transfer, complete) propagate without
  // the provider clicking Refresh.
  useEffect(() => {
    const refreshAll = () => {
      void load()
      adminApi.providerTelecare.metrics().then(setMetrics).catch(() => null)
    }
    refreshAll()

    let interval: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (interval || document.hidden) return
      interval = setInterval(() => {
        if (!document.hidden) refreshAll()
      }, 15_000)
    }
    const stop = () => {
      if (!interval) return
      clearInterval(interval)
      interval = null
    }
    const onFocus = () => { if (!document.hidden) refreshAll() }
    const onVis = () => {
      if (document.hidden) stop()
      else { refreshAll(); start() }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    start()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [load])

  // Poll for waiting sessions every 8 seconds (incoming calls — fastest tick).
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await adminApi.providerTelecare.waitingSessions()
        setWaitingSessions(res.data)
      } catch {
        // silent — don't disrupt main page
      }
    }
    poll()
    const interval = setInterval(poll, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleAvailability = useCallback(async () => {
    setTogglingAvail(true)
    try {
      const next = !available
      await adminApi.providerTelecare.setAvailability(next)
      setAvailable(next)
    } catch {
      // silently ignore — the toggle snaps back since we never set state on failure
    } finally {
      setTogglingAvail(false)
    }
  }, [available])

  const handleJoin = useCallback(async (session: ProviderSession, audioOnly: boolean) => {
    setJoining(session.id)
    try {
      const info = await adminApi.providerTelecare.joinToken(session.id)
      joinStartedAt.current = new Date().toISOString()
      await adminApi.providerTelecare.updateStatus(session.id, 'active', {
        startedAt: joinStartedAt.current,
      }).catch(() => null)
      setCallAudioOnly(audioOnly)
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
    await adminApi.providerTelecare.updateStatus(activeSession.id, 'completed', { endedAt }).catch(() => null)
    const completed = activeSession
    setCallInfo(null)
    setActiveSession(null)
    setCallAudioOnly(false)
    joinStartedAt.current = null
    await load()
    // Prompt to document immediately after call ends
    setDocumentingSession(completed)
  }, [activeSession, load])

  const handleNoteSaved = useCallback((note: SessionNote) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === note.sessionId
          ? { ...s, notes: [note, ...(s.notes ?? [])] }
          : s,
      ),
    )
    setDocumentingSession(null)
  }, [])

  const handleAccept = useCallback(async (session: ProviderSession) => {
    setAcceptingId(session.id)
    try {
      await adminApi.providerTelecare.acceptSession(session.id)
      setWaitingSessions((prev) => prev.filter((s) => s.id !== session.id))
      // Auto-join the call
      await handleJoin(session, false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept session')
    } finally {
      setAcceptingId(null)
    }
  }, [handleJoin])

  const handleDecline = useCallback(async (session: ProviderSession) => {
    setDecliningId(session.id)
    try {
      await adminApi.providerTelecare.declineSession(session.id)
      setWaitingSessions((prev) => prev.filter((s) => s.id !== session.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decline session')
    } finally {
      setDecliningId(null)
    }
  }, [])

  const handleTransferred = useCallback(async () => {
    const wasTransferred = transferringSession
    setTransferringSession(null)
    // If the transferred session was the one currently in call, leave
    if (wasTransferred && activeSession && wasTransferred.id === activeSession.id) {
      await handleLeave()
    } else {
      await load()
    }
  }, [transferringSession, activeSession, handleLeave, load])

  const upcoming = sessions.filter((s) => s.status === 'scheduled')
  const active = sessions.filter((s) => s.status === 'active' || s.status === 'in_progress')
  const past = sessions.filter((s) => ['completed', 'cancelled', 'missed'].includes(s.status))

  return (
    <>
      {callInfo && activeSession && (
        <CallOverlay
          session={activeSession}
          callInfo={callInfo}
          audioOnly={callAudioOnly}
          onLeave={handleLeave}
        />
      )}

      {documentingSession && (
        <SoapNotesModal
          session={documentingSession}
          onClose={() => setDocumentingSession(null)}
          onSaved={handleNoteSaved}
        />
      )}

      {transferringSession && (
        <TransferModal
          session={transferringSession}
          onClose={() => setTransferringSession(null)}
          onTransferred={handleTransferred}
        />
      )}

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAvailability}
              disabled={togglingAvail}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60"
              style={
                available
                  ? {
                      background: 'rgba(109,196,63,0.12)',
                      borderColor: '#6DC43F',
                      color: '#6DC43F',
                    }
                  : {
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-muted)',
                    }
              }
              aria-pressed={available}
              aria-label={available ? 'Go offline' : 'Go online'}
            >
              {togglingAvail ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: available ? '#6DC43F' : 'var(--color-text-faint)' }}
                />
              )}
              {available ? 'Online' : 'Offline'}
            </button>

            <Button variant="secondary" size="sm" onClick={load} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {metrics && <MetricsGrid metrics={metrics} />}

        {waitingSessions.length > 0 && (
          <IncomingCallBanner
            sessions={waitingSessions}
            acceptingId={acceptingId}
            decliningId={decliningId}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}

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
                      onJoin={(audioOnly) => handleJoin(s, audioOnly)}
                      onDocument={() => setDocumentingSession(s)}
                      onTransfer={() => setTransferringSession(s)}
                    />
                  ))}
                </div>
              </section>
            )}

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
                      onJoin={(audioOnly) => handleJoin(s, audioOnly)}
                      onDocument={() => setDocumentingSession(s)}
                    />
                  ))}
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Past Sessions
                </h2>
                <div className="space-y-2">
                  {past.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      joining={false}
                      onJoin={(audioOnly) => handleJoin(s, audioOnly)}
                      onDocument={() => setDocumentingSession(s)}
                    />
                  ))}
                </div>
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
