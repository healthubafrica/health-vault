'use client'

import { Button } from '@/components/ui/Button'
import { DispatchTimeline } from '@/components/dispatch/DispatchTimeline'
import { Phone, Siren } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export function DispatchPanel() {
  const { closeMobilePanel } = useAppStore()

  function focusDispatchForm() {
    closeMobilePanel()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Dispatch Status
      </p>

      <DispatchTimeline />

      <div className="border-t pt-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)' }}>
        <Button variant="emergency" fullWidth size="md" onClick={focusDispatchForm}>
          <Siren size={14} />Request Dispatch
        </Button>
        <Button
          variant="emergency-outline"
          fullWidth
          size="md"
          onClick={() => { window.location.href = 'tel:0800442911' }}
        >
          <Phone size={14} />Call Emergency
        </Button>
      </div>

      <div
        className="p-3 rounded-xl border text-center"
        style={{ background: 'var(--color-error-bg)', borderColor: 'var(--color-emergency)' }}
      >
        <p className="text-xs font-semibold" style={{ color: 'var(--color-emergency)' }}>Emergency Hotline</p>
        <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--color-emergency)', fontFamily: 'var(--font-mono)' }}>0800-HHA-911</p>
      </div>
    </div>
  )
}
