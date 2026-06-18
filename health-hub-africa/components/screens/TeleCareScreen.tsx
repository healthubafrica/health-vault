'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { Video, PhoneOff, Clock, Loader2, AlertCircle } from 'lucide-react'
import { telecare, TelecareSession } from '@/lib/api'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'

export function TeleCareScreen() {
  const [sessions, setSessions] = useState<TelecareSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Call state
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

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

  const handleJoinSession = async (sessionId: string) => {
    setJoining(true)
    try {
      const res = await telecare.getToken(sessionId)
      if (res && res.token) {
        setActiveToken(res.token)
        setActiveRoom(res.roomName)
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

  const handleLeaveSession = () => {
    setActiveToken(null)
    setActiveRoom(null)
    fetchSessions()
  }

  // Live video room view
  if (activeToken && activeRoom) {
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!livekitUrl) {
      return (
        <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <p>LiveKit is not configured. Set NEXT_PUBLIC_LIVEKIT_URL to enable video consultations.</p>
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
          <Button variant="emergency-outline" className="gap-2" onClick={handleLeaveSession}>
            <PhoneOff size={16} /> Leave Call
          </Button>
        </div>

        <Card className="flex-1 overflow-hidden relative" padding="none">
          <LiveKitRoom
            video={true}
            audio={true}
            token={activeToken}
            serverUrl={livekitUrl}
            onDisconnected={handleLeaveSession}
            data-lk-theme="default"
            style={{ height: '100%' }}
          >
            <VideoConference />
          </LiveKitRoom>
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
