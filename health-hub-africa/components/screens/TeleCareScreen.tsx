'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { Video, PhoneOff, Clock, Loader2, AlertCircle, CalendarPlus, ChevronDown, ChevronUp } from 'lucide-react'
import { telecare, TelecareSession } from '@/lib/api'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { useCallStore } from '@/lib/stores/callStore'
import { DeviceCheckScreen } from '@/components/telecare/DeviceCheckScreen'
import { CallRatingModal } from '@/components/telecare/CallRatingModal'
import { BackgroundBlurEffect } from '@/components/telecare/BackgroundBlurEffect'
import { InCallShareButton } from '@/components/telecare/InCallShareButton'
import { downloadTelecareInvite } from '@/components/telecare/icsUtils'

// LiveKit/getUserMedia surface a browser permission block as an error whose
// message mentions one of these — distinct from a network/server failure, and
// the one failure mode with a concrete, tellable fix (the others need a retry
// or support, not a "here's what to click" tooltip).
function isPermissionError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('permission') || m.includes('notallowederror') || m.includes('not allowed')
}

// A session more than this far past its scheduled time and still not
// started gets a "running late" notice instead of silently doing nothing.
const RUNNING_LATE_THRESHOLD_MS = 5 * 60_000

function providerLabel(session: TelecareSession | undefined): string | undefined {
  if (!session?.provider) return undefined
  return `${session.provider.title ?? 'Dr.'} ${session.provider.firstName} ${session.provider.lastName}`.trim()
}

export function TeleCareScreen() {
  const router = useRouter()
  const [sessions, setSessions] = useState<TelecareSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pre-call device check step — set when the patient requests to join a
  // session, cleared once they confirm (→ handleJoinSession) or cancel.
  const [precheckSession, setPrecheckSession] = useState<TelecareSession | null>(null)
  const [blurBackground, setBlurBackground] = useState(false)

  // Call state
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [activeServerUrl, setActiveServerUrl] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [connected, setConnected] = useState(false)
  const setInCall = useCallStore((s) => s.setInCall)

  // A disconnect only means "the consultation ended" if the room ever
  // connected. Without this, a failed connect (blocked camera/mic, blocked
  // websocket) fires onDisconnected straight away and marks the session
  // completed, so the patient loses a session they never actually had.
  const hasConnected = useRef(false)
  const [callFailed, setCallFailed] = useState<string | null>(null)

  // Post-call CSAT prompt — the just-ended session's id, only set when the
  // call actually connected (see handleLeaveSession).
  const [rateSessionId, setRateSessionId] = useState<string | null>(null)

  // Which completed session's visit summary is expanded.
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  // Self-healing safety net: setInCall(false) is normally set by
  // handleLeaveSession (Leave Call button or LiveKit's onDisconnected), but
  // if the patient navigates away mid-call via the sidebar/nav without
  // either firing, this unmount cleanup guarantees callStore doesn't stay
  // stuck "in call" — which would otherwise permanently suspend the
  // idle-timeout auto-logout for the rest of the session.
  useEffect(() => () => setInCall(false), [setInCall])

  const fetchSessions = () => {
    setLoading(true)
    telecare.list()
      .then((res) => {
        setSessions(res.data || [])
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load telecare sessions:', err)
        setError("We couldn't load your sessions. Kindly check your connection and try again.")
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // Live-refresh: pull the latest session list on tab focus / visibility
  // change and on a 20s tick while the tab is visible. Patients need this
  // because confirmations happen elsewhere — admin assigns a provider and
  // confirms, or a provider confirms from their own dashboard, and the
  // patient's "Upcoming Sessions" otherwise stays stale until manual
  // reload. Polling pauses on hidden tabs so we don't churn the API.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    const refresh = () => { if (!document.hidden) fetchSessions() }
    const start = () => {
      if (interval || document.hidden) return
      interval = setInterval(refresh, 20_000)
    }
    const stop = () => {
      if (!interval) return
      clearInterval(interval)
      interval = null
    }
    const onFocus = () => refresh()
    const onVis = () => {
      if (document.hidden) stop()
      else { refresh(); start() }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    start()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [])

  // Step 1 of joining: show the device check screen. The actual LiveKit
  // connect only happens once the patient confirms from there.
  const handleRequestJoin = (session: TelecareSession) => {
    setPrecheckSession(session)
  }

  const handleJoinSession = async (sessionId: string) => {
    setJoining(true)
    hasConnected.current = false
    setConnected(false)
    setCallFailed(null)
    try {
      const res = await telecare.getToken(sessionId)
      if (res && res.token) {
        setActiveToken(res.token)
        setActiveRoom(res.roomName)
        // The API returns the LiveKit server URL alongside the token — use it
        // so the call works even when NEXT_PUBLIC_LIVEKIT_URL isn't set on
        // this deployment. The env var remains as a fallback.
        setActiveServerUrl(res.serverUrl ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null)
        setActiveSessionId(sessionId)
        setInCall(true)
      } else {
        setError("We couldn't set up your call. Kindly try again in a moment.")
      }
    } catch (err: any) {
      console.error('Error joining session:', err)
      setError(err.message || "We had trouble connecting you to the session. Kindly try again.")
    } finally {
      setJoining(false)
    }
  }

  // Exit a call that never connected. Deliberately does NOT mark the session
  // completed — the consultation never happened, so it stays joinable.
  const handleAbortCall = () => {
    setActiveToken(null)
    setActiveRoom(null)
    setActiveServerUrl(null)
    setActiveSessionId(null)
    setCallFailed(null)
    setConnected(false)
    hasConnected.current = false
    setInCall(false)
    fetchSessions()
  }

  const handleLeaveSession = () => {
    const endedSessionId = activeSessionId
    const callActuallyHappened = hasConnected.current

    // Fire-and-forget: advance the session to 'completed' on the server so
    // the row doesn't sit at 'active' forever. The LiveKit webhook will do
    // the same thing when the room finishes, but this gives an instant flip
    // for the patient-initiated case. Errors are intentionally swallowed —
    // the sweep cron is the final safety net.
    if (endedSessionId) {
      telecare.markCompleted(endedSessionId).catch(() => null)
    }
    setActiveToken(null)
    setActiveRoom(null)
    setActiveServerUrl(null)
    setActiveSessionId(null)
    setConnected(false)
    setInCall(false)
    if (callActuallyHappened && endedSessionId) {
      setRateSessionId(endedSessionId)
    }
    fetchSessions()
  }

  // Standard list & preview view.
  // Prefer a genuinely active (in-progress) call over any scheduled one. If
  // none is active, pick the soonest *upcoming* scheduled session rather than
  // just the earliest row overall — a stale scheduled session that was never
  // cleaned up would otherwise sort first forever and look permanently
  // "stuck" on the same consultation.
  const now = Date.now()
  const activeSession = sessions.find(s => s.status === 'active')
  const upcoming = sessions
    .filter(s => s.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  const nextSession =
    activeSession ??
    upcoming.find(s => new Date(s.scheduledAt).getTime() >= now) ??
    upcoming[0]

  const isRunningLate =
    nextSession?.status === 'scheduled' &&
    now - new Date(nextSession.scheduledAt).getTime() > RUNNING_LATE_THRESHOLD_MS

  // Pre-call device check
  if (precheckSession) {
    return (
      <DeviceCheckScreen
        providerName={providerLabel(precheckSession)}
        onJoin={({ blurBackground: blur }) => {
          setBlurBackground(blur)
          const id = precheckSession.id
          setPrecheckSession(null)
          void handleJoinSession(id)
        }}
        onCancel={() => setPrecheckSession(null)}
      />
    )
  }

  // Live video room view
  if (activeToken && activeRoom) {
    const livekitUrl = activeServerUrl

    if (!livekitUrl) {
      return (
        <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <p>Video calling is not configured on the server. Kindly contact support.</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-5 pb-20 md:pb-5 h-[80vh] min-h-[500px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              Live Consultation
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Session Room: {activeRoom}
            </p>
          </div>
          <Button
            variant="emergency-outline"
            className="gap-2"
            onClick={callFailed ? handleAbortCall : handleLeaveSession}
          >
            <PhoneOff size={16} /> {callFailed ? 'Close' : 'Leave Call'}
          </Button>
        </div>

        <Card className="flex-1 overflow-hidden relative" padding="none">
          {callFailed ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center overflow-y-auto py-8">
              <AlertCircle size={28} style={{ color: 'var(--color-emergency)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Couldn&apos;t connect to your consultation
              </p>
              <p className="text-xs max-w-sm" style={{ color: 'var(--color-text-muted)' }}>{callFailed}</p>
              {isPermissionError(callFailed) ? (
                <div
                  role="tooltip"
                  className="max-w-sm text-left text-xs rounded-xl border p-4 flex flex-col gap-2"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
                >
                  <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    Your browser is blocking camera/microphone access. Here&apos;s the fix:
                  </p>
                  <p><strong>Chrome / Edge:</strong> click the padlock (or "ⓘ") icon left of the address bar → Site settings → set Camera and Microphone to &quot;Allow&quot; → reload this page.</p>
                  <p><strong>Safari:</strong> Safari menu → Settings → Websites → Camera / Microphone → set this site to &quot;Allow&quot; → reload this page.</p>
                  <p>If you already dismissed a permission prompt, reloading is required for a new prompt to appear.</p>
                </div>
              ) : (
                <p className="text-xs max-w-sm" style={{ color: 'var(--color-text-faint)' }}>
                  Kindly allow camera and microphone access for this site, then try joining again.
                </p>
              )}
              <Button variant="secondary" onClick={handleAbortCall}>Back to sessions</Button>
            </div>
          ) : (
            <LiveKitRoom
              video={true}
              audio={true}
              token={activeToken}
              serverUrl={livekitUrl}
              onConnected={() => { hasConnected.current = true; setConnected(true) }}
              onError={(err) => setCallFailed(err.message)}
              onDisconnected={() => {
                // Only a call that actually connected counts as completed.
                if (hasConnected.current) handleLeaveSession()
                else setCallFailed('The call ended before it connected.')
              }}
              data-lk-theme="default"
              style={{ height: '100%' }}
            >
              <BackgroundBlurEffect enabled={blurBackground} />
              <VideoConference />
              <div className="absolute top-3 left-3 z-10">
                <InCallShareButton />
              </div>
              {!connected && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
                  style={{ background: '#0a1a0a' }}
                >
                  <Loader2 size={28} className="animate-spin" style={{ color: '#6DC43F' }} />
                  <p className="text-sm font-semibold text-white">
                    Connecting you{providerLabel(sessions.find(s => s.id === activeSessionId)) ? ` to ${providerLabel(sessions.find(s => s.id === activeSessionId))}` : ''}…
                  </p>
                </div>
              )}
            </LiveKitRoom>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      {rateSessionId && (
        <CallRatingModal sessionId={rateSessionId} onDone={() => setRateSessionId(null)} />
      )}

      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          TeleCare™
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Virtual health consultations
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isRunningLate && (
        <div className="flex items-center gap-2 p-3 text-sm rounded-lg" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
          <Clock size={16} className="shrink-0" />
          <p>
            {providerLabel(nextSession) ?? 'Your provider'} is running a few minutes behind schedule —
            hang tight, we&apos;ll connect you as soon as they&apos;re ready.
          </p>
        </div>
      )}

      {/* Video preview area */}
      <Card className="relative overflow-hidden" padding="none">
        <div
          className="h-[280px] flex flex-col items-center justify-center gap-4"
          style={{ background: '#0a1a0a' }}
          aria-label="Video consultation area"
        >
          <Avatar seed={providerLabel(nextSession) ?? 'Care Provider'} size="lg" shape="circle" alt="Care provider" />
          <div className="text-center">
            <p className="text-white font-semibold text-sm">{providerLabel(nextSession) ?? 'Your Care Provider'}</p>
            <p className="text-white/50 text-xs">Connects when your session starts</p>
          </div>
          {nextSession?.status === 'active' ? (
            <Pill variant="success">Call in progress</Pill>
          ) : nextSession ? (
            <Pill variant="neutral">Coming up</Pill>
          ) : (
            <Pill variant="neutral">No active call</Pill>
          )}
        </div>
        {/* Controls */}
        <div
          className="flex items-center justify-center gap-4 p-4"
          style={{ background: 'var(--color-surface)' }}
        >
          {nextSession ? (
            <Button
              size="lg"
              className="px-6 gap-2"
              onClick={() => handleRequestJoin(nextSession)}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Connecting...
                </>
              ) : nextSession.status === 'active' ? (
                <>
                  <Video size={16} /> Join Active Call ({nextSession.hhaRef})
                </>
              ) : (
                <>
                  <Video size={16} /> Join Scheduled Session ({nextSession.hhaRef})
                </>
              )}
            </Button>
          ) : (
            <Button size="lg" className="px-6 gap-2" disabled={true}>
              <Video size={16} /> No Session Scheduled
            </Button>
          )}
        </div>
      </Card>

      {/* Scheduled/Active Sessions */}
      <Card>
        <CardTitle>Your Scheduled Consultations</CardTitle>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={24} className="animate-spin text-emerald-600" />
          </div>
        ) : sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No upcoming telecare consultations scheduled.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions
              .filter(s => s.status !== 'completed' && s.status !== 'cancelled')
              .map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-bg)' }}>
                      <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" title="Reference number for this session — use it if you contact support." style={{ color: 'var(--color-text)' }}>
                        Consultation {session.hhaRef}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(session.scheduledAt).toLocaleString()}
                        {providerLabel(session) ? ` · ${providerLabel(session)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => downloadTelecareInvite({
                          hhaRef: session.hhaRef,
                          scheduledAt: session.scheduledAt,
                          providerName: providerLabel(session),
                        })}
                        title="Add to calendar"
                        aria-label="Add to calendar"
                        className="p-2 -m-1 rounded-lg transition-colors hover:bg-[var(--color-bg)]"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <CalendarPlus size={16} />
                      </button>
                    )}
                    <Pill variant={session.status === 'active' ? 'success' : 'neutral'}>
                      {session.status}
                    </Pill>
                    <Button
                      size="sm"
                      onClick={() => handleRequestJoin(session)}
                      disabled={joining}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Session history */}
      <Card>
        <CardTitle>Completed Sessions</CardTitle>
        <div className="flex flex-col gap-0">
          {sessions.filter(s => s.status === 'completed').length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
              No completed sessions yet.
            </p>
          ) : (
            sessions
              .filter(s => s.status === 'completed')
              .map((session) => {
                const hasNotes = !!(session.notes?.assessment || session.notes?.plan || session.notes?.followUpDays)
                const isExpanded = expandedSessionId === session.id
                return (
                  <div key={session.id} className="py-3 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => hasNotes && setExpandedSessionId(isExpanded ? null : session.id)}
                      className="w-full flex items-center gap-3 text-left"
                      disabled={!hasNotes}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-bg)' }}>
                        <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" title="Reference number for this session — use it if you contact support." style={{ color: 'var(--color-text)' }}>
                          Consultation {session.hhaRef}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(session.scheduledAt).toLocaleDateString()} · {session.durationSeconds ? `${Math.floor(session.durationSeconds / 60)} mins` : 'Completed'}
                          {providerLabel(session) ? ` · ${providerLabel(session)}` : ''}
                        </p>
                      </div>
                      {session.patientRating && (
                        <Pill variant="success">{'★'.repeat(session.patientRating)}</Pill>
                      )}
                      <Pill variant="neutral">completed</Pill>
                      {hasNotes && (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </button>
                    {isExpanded && hasNotes && (
                      <div className="mt-3 ml-11 flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                        {session.notes?.assessment && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Assessment</p>
                            <p className="text-xs" style={{ color: 'var(--color-text)' }}>{session.notes.assessment}</p>
                          </div>
                        )}
                        {session.notes?.plan && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Plan</p>
                            <p className="text-xs" style={{ color: 'var(--color-text)' }}>{session.notes.plan}</p>
                          </div>
                        )}
                        {session.notes?.followUpDays && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Follow-up</p>
                            <p className="text-xs" style={{ color: 'var(--color-text)' }}>Recommended in {session.notes.followUpDays} day{session.notes.followUpDays === 1 ? '' : 's'}</p>
                          </div>
                        )}
                        <Button size="sm" className="self-start mt-1" onClick={() => router.push('/appointments')}>
                          Book Follow-up
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>
      </Card>
    </div>
  )
}
