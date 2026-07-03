'use client'

import { useState } from 'react'
import { adminApi, type ProviderSession, type SessionNote } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import { X, FileText } from 'lucide-react'

interface SoapFormData {
  subjectiveNotes: string
  objectiveNotes: string
  assessment: string
  plan: string
  followUpInstructions: string
}

export function SoapNotesModal({
  session,
  onClose,
  onSaved,
}: {
  session: ProviderSession
  onClose: () => void
  onSaved: (note: SessionNote) => void
}) {
  const [form, setForm] = useState<SoapFormData>({
    subjectiveNotes: '',
    objectiveNotes: '',
    assessment: '',
    plan: '',
    followUpInstructions: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patientName = session.patient
    ? `${session.patient.firstName} ${session.patient.lastName}`
    : 'Patient'

  const set = (field: keyof SoapFormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.subjectiveNotes.trim()) {
      setError('Chief complaint / subjective notes are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const note = await adminApi.providerTelecare.createNote({
        sessionId: session.id,
        subjectiveNotes: form.subjectiveNotes,
        objectiveNotes: form.objectiveNotes || undefined,
        assessment: form.assessment || undefined,
        plan: form.plan || undefined,
        followUpInstructions: form.followUpInstructions || undefined,
      })
      onSaved(note)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              Document Encounter — {patientName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {session.hhaRef} · {formatDateTime(session.scheduledAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg)]">
            <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
              {error}
            </p>
          )}

          {[
            { label: 'S — Chief Complaint / Subjective', key: 'subjectiveNotes' as const, required: true, placeholder: "Patient's chief complaint and subjective symptoms..." },
            { label: 'O — Objective Findings', key: 'objectiveNotes' as const, required: false, placeholder: 'Vital signs, physical exam findings...' },
            { label: 'A — Assessment / Diagnosis', key: 'assessment' as const, required: false, placeholder: 'Clinical impression and differential diagnosis...' },
            { label: 'P — Plan', key: 'plan' as const, required: false, placeholder: 'Treatment plan, prescriptions, referrals...' },
            { label: 'Follow-up Instructions', key: 'followUpInstructions' as const, required: false, placeholder: 'Instructions for patient, follow-up timing...' },
          ].map(({ label, key, required, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <textarea
                rows={3}
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            <FileText className="w-3.5 h-3.5" />
            Save Note
          </Button>
        </div>
      </div>
    </div>
  )
}
