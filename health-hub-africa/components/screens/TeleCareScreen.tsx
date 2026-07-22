'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { Video, PhoneOff, Clock, Loader2, AlertCircle } from 'lucide-react'
import { telecare, TelecareSession } from '@/lib/api'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { useCallStore } from '@/lib/stores/callStore'

export function TeleCareScreen() {
  const [sessions, setSessions] = useState<TelecareSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Call state
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [activeServerUrl, setActiveServerUrl] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const setInCall = useCallStore((s) => s.setInCall)

  // A disconnect only means "the consultation ended" if the room ever
  // connected. Without this, a failed connect (blocked camera/mic, blocked
  // websocket) fires onDisconnected straight away and marks the session
  // completed, so the patient loses a session they never actually had.
  const hasConnected = useRef(false)
  const [callFailed, setCallFailed] = useState<string | null>(null)

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

  const handleJoinSession = async (sessionId: string) => {
    setJoining(true)
    hasConnected.current = false
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
    hasConnected.current = false
    setInCall(false)
    fetchSessions()
  }

  const handleLeaveSession = () => {
    // Fire-and-forget: advance the session to 'completed' on the server so
    // the row doesn't sit at 'active' forever. The LiveKit webhook will do
    // the same thing when the room finishes, but this gives an instant flip
    // for the patient-initiated case. Errors are intentionally swallowed —
    // the sweep cron is the final safety net.
    if (activeSessionId) {
      telecare.markCompleted(activeSessionId).catch(() => null)
    }
    setActiveToken(null)
    setActiveRoom(null)
    setActiveServerUrl(null)
    setActiveSessionId(null)
    setInCall(false)
    fetchSessions()
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
            <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle size={28} style={{ color: 'var(--color-emergency)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Couldn&apos;t connect to your consultation
              </p>
              <p className="text-xs max-w-sm" style={{ color: 'var(--color-text-muted)' }}>{callFailed}</p>
              <p className="text-xs max-w-sm" style={{ color: 'var(--color-text-faint)' }}>
                Kindly allow camera and microphone access for this site, then try joining again.
              </p>
              <Button variant="secondary" onClick={handleAbortCall}>Back to sessions</Button>
            </div>
          ) : (
            <LiveKitRoom
              video={true}
              audio={true}
              token={activeToken}
              serverUrl={livekitUrl}
              onConnected={() => { hasConnected.current = true }}
              onError={(err) => setCallFailed(err.message)}
              onDisconnected={() => {
                // Only a call that actually connected counts as completed.
                if (hasConnected.current) handleLeaveSession()
                else setCallFailed('The call ended before it connected.')
              }}
              data-lk-theme="default"
              style={{ height: '100%' }}
            >
              <VideoConference />
            </LiveKitRoom>
          )}
        </Card>
      </div>
    )
  }

  // Standard list & preview view
  const nextSession = sessions.find(s => s.status === 'scheduled' || s.status === 'active')

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
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

      {/* Video preview area */}
      <Card className="relative overflow-hidden" padding="none">
        <div
          className="h-[280px] flex flex-col items-center justify-center gap-4"
          style={{ background: '#0a1a0a' }}
          aria-label="Video consultation area"
        >
          <Avatar seed="Care Provider" size="lg" shape="circle" alt="Care provider" />
          <div className="text-center">
            <p className="text-white font-semibold text-sm">Your Care Provider</p>
            <p className="text-white/50 text-xs">Connects when your session starts</p>
          </div>
          {nextSession ? (
            <Pill variant="success">Session Ready</Pill>
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
              onClick={() => handleJoinSession(nextSession.id)}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Connecting...
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
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        Consultation {session.hhaRef}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(session.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill variant={session.status === 'active' ? 'success' : 'neutral'}>
                      {session.status}
                    </Pill>
                    <Button 
                      size="sm" 
                      onClick={() => handleJoinSession(session.id)}
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
              .map((session) => (
                <div key={session.id} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-bg)' }}>
                    <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      Consultation {session.hhaRef}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(session.scheduledAt).toLocaleDateString()} · {session.durationSeconds ? `${Math.floor(session.durationSeconds / 60)} mins` : 'Completed'}
                    </p>
                  </div>
                  <Pill variant="neutral">completed</Pill>
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  )
}
